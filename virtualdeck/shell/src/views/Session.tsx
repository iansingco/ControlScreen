import { useRef, useEffect, useState } from 'react';
import VideoFeed from '../components/VideoFeed';
import TouchOverlay from '../components/TouchOverlay';
import { useWebRTC } from '../hooks/useWebRTC';
import { useInputBridge } from '../hooks/useInputBridge';
import { AppId } from '../App';

interface SessionProps {
  appId: AppId;
  onBack: () => void;
}

export default function Session({ appId, onBack }: SessionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);

  const { stream, status: rtcStatus } = useWebRTC();
  const { sendEvent } = useInputBridge();

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-hide controls after 3s
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  function handleBack() {
    fetch(`/apps/${appId}/close`, { method: 'POST' }).catch(() => {});
    onBack();
  }

  return (
    <div
      className="relative h-full w-full bg-black"
      onPointerDown={() => setShowControls(true)}
    >
      {/* Video stream */}
      <VideoFeed ref={videoRef} status={rtcStatus} />

      {/* Touch overlay — sits on top of video, captures all gestures */}
      <TouchOverlay onEvent={sendEvent} />

      {/* Controls bar — auto-hides */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center gap-4 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm font-medium touch-manipulation"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleBack();
          }}
        >
          ← Home
        </button>

        <span className="text-xs text-white/50 ml-auto">
          {rtcStatus === 'connected' ? 'Live' : rtcStatus}
        </span>
      </div>
    </div>
  );
}
