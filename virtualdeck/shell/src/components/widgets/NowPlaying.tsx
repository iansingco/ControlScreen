import { useWidgetChannel } from '../../hooks/useWidgetData';

interface NowPlayingData {
  title: string | null;
  artist: string | null;
  playing: boolean;
}

export default function NowPlaying() {
  const data = useWidgetChannel<NowPlayingData>('nowPlaying');

  const idle = !data?.title;

  return (
    <div className="flex items-center gap-4 h-full px-1">
      {/* Album art placeholder */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
        {idle ? (
          <span className="text-white/20 text-lg">♪</span>
        ) : (
          <span className="text-white/60 text-lg">{data?.playing ? '▶' : '⏸'}</span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Now Playing
        </span>
        {idle ? (
          <span className="text-sm text-white/30">Nothing playing</span>
        ) : (
          <>
            <span className="text-sm font-medium truncate">{data?.title}</span>
            <span className="text-xs text-white/50 truncate">{data?.artist}</span>
          </>
        )}
      </div>
    </div>
  );
}
