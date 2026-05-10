import { forwardRef } from 'react';

type RTCStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface VideoFeedProps {
  status: RTCStatus;
}

const VideoFeed = forwardRef<HTMLVideoElement, VideoFeedProps>(({ status }, ref) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      {status !== 'connected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
          {status === 'connecting' && (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Connecting to display…</p>
            </>
          )}
          {status === 'disconnected' && (
            <p className="text-white/60 text-sm">Stream disconnected</p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm">Stream error — check daemon</p>
          )}
        </div>
      )}
    </div>
  );
});

VideoFeed.displayName = 'VideoFeed';

export default VideoFeed;
