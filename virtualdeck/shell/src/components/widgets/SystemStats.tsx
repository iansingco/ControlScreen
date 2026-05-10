import { useWidgetChannel } from '../../hooks/useWidgetData';

interface SystemData {
  cpuLoad: number;
  ramUsedGb: number;
  ramTotalGb: number;
  ramPct: number;
}

function Bar({ label, pct, value }: { label: string; pct: number; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function SystemStats() {
  const data = useWidgetChannel<SystemData>('system');

  return (
    <div className="flex flex-col justify-center h-full gap-4 px-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/40">System</span>
      <Bar
        label="CPU"
        pct={data?.cpuLoad ?? 0}
        value={data ? `${data.cpuLoad.toFixed(1)}%` : '…'}
      />
      <Bar
        label="RAM"
        pct={data?.ramPct ?? 0}
        value={
          data
            ? `${data.ramUsedGb.toFixed(1)} / ${data.ramTotalGb.toFixed(0)} GB`
            : '…'
        }
      />
    </div>
  );
}
