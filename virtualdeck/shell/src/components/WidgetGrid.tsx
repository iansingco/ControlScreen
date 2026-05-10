import { ComponentType } from 'react';
import { WIDGET_REGISTRY } from './widgets';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetDef {
  id: string;
  component: string;
  size: WidgetSize;
  col: number; // 1-based grid column
  row: number; // 1-based grid row
}

export interface WidgetConfig {
  columns: number;
  rows: number;
  gap: number;
  widgets: WidgetDef[];
}

// CSS grid col/row spans for each named size
const SIZE_SPANS: Record<WidgetSize, { colSpan: number; rowSpan: number }> = {
  small:  { colSpan: 1, rowSpan: 1 },
  medium: { colSpan: 2, rowSpan: 1 },
  large:  { colSpan: 2, rowSpan: 2 },
};

interface WidgetCardProps {
  def: WidgetDef;
  Component: ComponentType;
}

function WidgetCard({ def, Component }: WidgetCardProps) {
  const { colSpan, rowSpan } = SIZE_SPANS[def.size];
  return (
    <div
      className="rounded-2xl bg-card p-4 overflow-hidden"
      style={{
        gridColumnStart: def.col,
        gridColumnEnd: `span ${colSpan}`,
        gridRowStart: def.row,
        gridRowEnd: `span ${rowSpan}`,
      }}
    >
      <Component />
    </div>
  );
}

interface WidgetGridProps {
  config: WidgetConfig;
}

export default function WidgetGrid({ config }: WidgetGridProps) {
  return (
    <div
      className="w-full h-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
        gap: config.gap,
      }}
    >
      {config.widgets.map((def) => {
        const Component = WIDGET_REGISTRY[def.component];
        if (!Component) {
          console.warn(`[WidgetGrid] unknown component: ${def.component}`);
          return null;
        }
        return <WidgetCard key={def.id} def={def} Component={Component} />;
      })}
    </div>
  );
}
