import { useEffect, useRef, useCallback } from 'react';
import { PointerPayload } from '../components/TouchOverlay';

type AnyEvent = PointerPayload | { type: 'keydown' | 'keyup'; key: string };

interface UseInputBridgeResult {
  sendEvent: (event: AnyEvent) => void;
}

const RECONNECT_DELAY = 2000;

/**
 * Opens a WebSocket connection to /input on the daemon and provides
 * a stable `sendEvent` callback. Reconnects automatically if the
 * connection drops.
 */
export function useInputBridge(): UseInputBridgeResult {
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<AnyEvent[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/input`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Flush any queued events
      const pending = queueRef.current.splice(0);
      pending.forEach((e) => ws.send(JSON.stringify(e)));
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const sendEvent = useCallback((event: AnyEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      // Buffer up to 10 events while reconnecting to avoid stale gesture trails
      if (queueRef.current.length < 10) {
        queueRef.current.push(event);
      }
    }
  }, []);

  return { sendEvent };
}
