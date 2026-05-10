import { useRef } from 'react';

export interface PointerPayload {
  type: 'down' | 'move' | 'up';
  x: number;       // normalized 0–1
  y: number;       // normalized 0–1
  pointerId: number;
}

interface TouchOverlayProps {
  onEvent: (event: PointerPayload) => void;
}

/**
 * Full-screen transparent layer that sits above the video feed.
 * Captures pointer events and forwards normalized coordinates to the daemon.
 * Uses the Pointer Events API so it handles both touch and stylus input.
 */
export default function TouchOverlay({ onEvent }: TouchOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  function normalize(clientX: number, clientY: number): { x: number; y: number } {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = normalize(e.clientX, e.clientY);
    onEvent({ type: 'down', x, y, pointerId: e.pointerId });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.buttons === 0) return; // no button held — ignore hover
    const { x, y } = normalize(e.clientX, e.clientY);
    onEvent({ type: 'move', x, y, pointerId: e.pointerId });
  }

  function onPointerUp(e: React.PointerEvent) {
    const { x, y } = normalize(e.clientX, e.clientY);
    onEvent({ type: 'up', x, y, pointerId: e.pointerId });
  }

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
