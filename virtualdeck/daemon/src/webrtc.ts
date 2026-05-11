import { CaptureService } from './capture';

interface SDP {
  type: string;
  sdp: string;
}

/**
 * WebRTC streaming — stubbed for POC.
 * Re-enable once a compatible wrtc package is confirmed for Node 24.
 * For now, streaming goes via Sunshine/Artemis instead.
 */
export class WebRTCService {
  constructor(private readonly _capture: CaptureService) {}

  async createOffer(): Promise<SDP> {
    throw new Error('WebRTC streaming not available in this build. Use Sunshine/Artemis for streaming.');
  }

  async acceptAnswer(_answer: SDP): Promise<void> {
    throw new Error('WebRTC streaming not available in this build.');
  }
}
