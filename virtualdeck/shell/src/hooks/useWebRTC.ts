import { useEffect, useRef, useState } from 'react';

type RTCStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebRTCResult {
  stream: MediaStream | null;
  status: RTCStatus;
}

/**
 * Establishes a WebRTC connection to the daemon.
 * 1. Fetches the SDP offer from GET /stream/offer
 * 2. Creates a local RTCPeerConnection and sets the remote description
 * 3. Creates an answer and posts it to POST /stream/answer
 * 4. Collects ICE candidates (trickle disabled for LAN simplicity — candidates are bundled in the offer)
 * 5. Returns the resulting MediaStream once the connection is established
 */
export function useWebRTC(): UseWebRTCResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<RTCStatus>('connecting');
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        // 1. Get offer from daemon
        const offerRes = await fetch('/stream/offer');
        if (!offerRes.ok) throw new Error('Failed to fetch offer');
        const offer: RTCSessionDescriptionInit = await offerRes.json();

        if (cancelled) return;

        // 2. Create peer connection
        const pc = new RTCPeerConnection({ iceServers: [] });
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setStatus('connected');
          } else if (
            pc.iceConnectionState === 'disconnected' ||
            pc.iceConnectionState === 'closed'
          ) {
            setStatus('disconnected');
          } else if (pc.iceConnectionState === 'failed') {
            setStatus('error');
          }
        };

        pc.ontrack = (e) => {
          if (cancelled) return;
          setStream(e.streams[0] ?? null);
        };

        // 3. Set remote description (offer from daemon)
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // 4. Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 5. Send answer to daemon
        await fetch('/stream/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pc.localDescription),
        });
      } catch (err) {
        if (!cancelled) {
          console.error('[useWebRTC]', err);
          setStatus('error');
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      setStream(null);
      setStatus('disconnected');
    };
  }, []);

  return { stream, status };
}
