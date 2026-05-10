import { createContext, useContext, useEffect, useRef, useState, ReactNode, createElement } from 'react';

export type WidgetChannel = 'clock' | 'system' | 'nowPlaying';

type ChannelData = Record<WidgetChannel, unknown>;

const RECONNECT_DELAY = 2000;

const WidgetDataContext = createContext<ChannelData>({
  clock: null,
  system: null,
  nowPlaying: null,
});

export function WidgetDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ChannelData>({ clock: null, system: null, nowPlaying: null });
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/widget-data`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const { channel, data: payload } = JSON.parse(e.data) as { channel: WidgetChannel; data: unknown };
        setData((prev) => ({ ...prev, [channel]: payload }));
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      timerRef.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => ws.close();
  }

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return createElement(WidgetDataContext.Provider, { value: data }, children);
}

export function useWidgetChannel<T>(channel: WidgetChannel): T | null {
  const ctx = useContext(WidgetDataContext);
  return (ctx[channel] as T) ?? null;
}
