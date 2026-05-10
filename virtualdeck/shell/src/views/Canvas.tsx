import { useEffect, useState } from 'react';
import { WidgetDataProvider } from '../hooks/useWidgetData';
import WidgetGrid, { WidgetConfig } from '../components/WidgetGrid';

/**
 * Fullscreen widget canvas — intended for always-on secondary displays, phones,
 * or tablets that just navigate directly to /canvas.
 *
 * Fetches layout config from the daemon's /widget-config endpoint then renders
 * the grid. All live data flows through WidgetDataProvider (WebSocket /widget-data).
 */
export default function Canvas() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/widget-config')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<WidgetConfig>;
      })
      .then(setConfig)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400 text-sm text-center">
          Failed to load widget config:<br />{error}
        </p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WidgetDataProvider>
      <div className="h-full w-full p-6">
        <WidgetGrid config={config} />
      </div>
    </WidgetDataProvider>
  );
}
