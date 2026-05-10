import si from 'systeminformation';
import { WebSocket } from 'ws';

export type WidgetChannel = 'clock' | 'system' | 'nowPlaying';

export interface WidgetMessage<T = unknown> {
  channel: WidgetChannel;
  data: T;
}

export interface SystemData {
  cpuLoad: number;       // 0–100
  ramUsedGb: number;
  ramTotalGb: number;
  ramPct: number;        // 0–100
}

export interface NowPlayingData {
  title: string | null;
  artist: string | null;
  playing: boolean;
}

export interface ClockData {
  iso: string;
}

/**
 * Polls system metrics and broadcasts live data to connected widget canvas clients.
 * Each channel fires on its own interval:
 *   clock      — every 1 s
 *   system     — every 2 s
 *   nowPlaying — every 3 s (stub; extend with Windows Media Session API or SMTC)
 */
export class WidgetServer {
  private clients = new Set<WebSocket>();
  private timers: NodeJS.Timeout[] = [];

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
  }

  start(): void {
    this.timers.push(
      setInterval(() => this.tickClock(), 1_000),
      setInterval(() => this.tickSystem(), 2_000),
      setInterval(() => this.tickNowPlaying(), 3_000)
    );
    // Fire immediately so the canvas has data on first render
    this.tickClock();
    this.tickSystem();
    this.tickNowPlaying();
    console.log('[widgets] data broadcast started');
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  private broadcast<T>(channel: WidgetChannel, data: T): void {
    const payload = JSON.stringify({ channel, data } satisfies WidgetMessage<T>);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }

  private tickClock(): void {
    this.broadcast<ClockData>('clock', { iso: new Date().toISOString() });
  }

  private async tickSystem(): Promise<void> {
    try {
      const [load, mem] = await Promise.all([
        si.currentLoad(),
        si.mem(),
      ]);
      const ramTotalGb = mem.total / 1024 ** 3;
      const ramUsedGb = (mem.total - mem.available) / 1024 ** 3;
      this.broadcast<SystemData>('system', {
        cpuLoad: Math.round(load.currentLoad * 10) / 10,
        ramUsedGb: Math.round(ramUsedGb * 10) / 10,
        ramTotalGb: Math.round(ramTotalGb * 10) / 10,
        ramPct: Math.round((ramUsedGb / ramTotalGb) * 100),
      });
    } catch (err) {
      console.warn('[widgets] system poll error:', err);
    }
  }

  private tickNowPlaying(): void {
    // Stub — returns empty state. To wire real playback data, integrate with:
    //   - Windows System Media Transport Controls (SMTC) via a native addon
    //   - Spotify Web API (polling /me/player with OAuth token)
    //   - Any other source that pushes to this method
    this.broadcast<NowPlayingData>('nowPlaying', {
      title: null,
      artist: null,
      playing: false,
    });
  }
}
