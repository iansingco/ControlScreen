import { useWidgetChannel } from '../../hooks/useWidgetData';

interface ClockData {
  iso: string;
}

export default function Clock() {
  const data = useWidgetChannel<ClockData>('clock');

  const date = data ? new Date(data.iso) : null;

  const time = date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const dayDate = date
    ? date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-4xl font-light tabular-nums tracking-tight">{time}</span>
      <span className="text-xs text-white/50 uppercase tracking-widest">{dayDate}</span>
    </div>
  );
}
