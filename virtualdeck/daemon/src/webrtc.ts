import {
  RTCPeerConnection,
  RTCSessionDescription,
  nonstandard,
} from '@roamhq/wrtc';
import { CaptureService, CaptureFrame } from './capture';

const { RTCVideoSource, i420ToRgba, rgbaToI420 } = nonstandard;

interface SDP {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
}

/**
 * Manages a single WebRTC peer connection to the tablet.
 * Feeds raw frames from CaptureService into an RTCVideoSource.
 * Signaling is handled via HTTP (offer/answer SDP exchange in index.ts).
 */
export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private videoSource: InstanceType<typeof RTCVideoSource> | null = null;
  private frameListener: ((frame: CaptureFrame) => void) | null = null;

  constructor(private readonly capture: CaptureService) {}

  async createOffer(): Promise<SDP> {
    this.teardown();

    this.videoSource = new RTCVideoSource();
    const track = this.videoSource.createTrack();

    const pc = new RTCPeerConnection({
      // LAN-only: no STUN/TURN needed
      iceServers: [],
      iceTransportPolicy: 'all',
    });
    this.pc = pc;

    pc.addTrack(track);

    pc.oniceconnectionstatechange = () => {
      console.log(`[webrtc] ICE state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'connected') {
        this.startStreaming();
      } else if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed'
      ) {
        this.stopStreaming();
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete before returning offer
    await this.waitForIceGathering(pc);

    return pc.localDescription as SDP;
  }

  async acceptAnswer(answer: SDP): Promise<void> {
    if (!this.pc) throw new Error('No active peer connection — call createOffer first');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private startStreaming(): void {
    if (this.frameListener) return;

    this.capture.start();
    const source = this.videoSource!;
    const { width, height } = this.capture.getResolution();

    this.frameListener = (frame: CaptureFrame) => {
      try {
        const i420 = new Uint8ClampedArray(
          (width * height * 3) / 2
        );
        // node-screenshots returns RGBA; convert to I420 for WebRTC
        const rgba = new Uint8ClampedArray(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
        rgbaToI420({ width, height, data: rgba }, { width, height, data: i420 });
        source.onFrame({ width, height, data: i420 });
      } catch (err) {
        console.error('[webrtc] frame conversion error:', err);
      }
    };

    this.capture.on('frame', this.frameListener);
    console.log('[webrtc] streaming started');
  }

  private stopStreaming(): void {
    if (this.frameListener) {
      this.capture.removeListener('frame', this.frameListener);
      this.frameListener = null;
    }
    this.capture.stop();
    console.log('[webrtc] streaming stopped');
  }

  private teardown(): void {
    this.stopStreaming();
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.videoSource = null;
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      // Timeout fallback: proceed after 3s even if not fully gathered (LAN = fast)
      setTimeout(resolve, 3000);
    });
  }
}
