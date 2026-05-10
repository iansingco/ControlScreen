import { Monitor, Screenshot } from 'node-screenshots';
import { EventEmitter } from 'events';

export interface CaptureFrame {
  data: Buffer;
  width: number;
  height: number;
  timestamp: number;
}

/**
 * Captures frames from the virtual display monitor.
 * The virtual display is identified by being the monitor that is NOT the primary display.
 * Falls back to the last monitor in the list if heuristics are ambiguous.
 */
export class CaptureService extends EventEmitter {
  private monitor: Monitor | null = null;
  private captureLoop: NodeJS.Timeout | null = null;
  private frameInterval = 33; // ~30fps default; reduce to 16 for 60fps
  private active = false;

  async init(): Promise<void> {
    const monitors = Monitor.all();
    if (monitors.length === 0) throw new Error('No monitors detected');

    // Prefer the non-primary monitor (the virtual display)
    this.monitor = monitors.find((m) => !m.isPrimary) ?? monitors[monitors.length - 1];

    console.log(
      `[capture] targeting monitor: ${this.monitor.name} ` +
        `(${this.monitor.width}x${this.monitor.height}) isPrimary=${this.monitor.isPrimary}`
    );
  }

  getResolution(): { width: number; height: number } {
    if (!this.monitor) throw new Error('CaptureService not initialized');
    return { width: this.monitor.width, height: this.monitor.height };
  }

  start(): void {
    if (this.active || !this.monitor) return;
    this.active = true;
    this.scheduleCapture();
    console.log('[capture] started');
  }

  stop(): void {
    this.active = false;
    if (this.captureLoop) {
      clearTimeout(this.captureLoop);
      this.captureLoop = null;
    }
    console.log('[capture] stopped');
  }

  setFrameRate(fps: number): void {
    this.frameInterval = Math.round(1000 / fps);
  }

  private scheduleCapture(): void {
    if (!this.active) return;
    const start = Date.now();

    this.captureFrame()
      .then((frame) => {
        if (frame) this.emit('frame', frame);
      })
      .catch((err) => console.error('[capture] frame error:', err))
      .finally(() => {
        const elapsed = Date.now() - start;
        const delay = Math.max(0, this.frameInterval - elapsed);
        if (this.active) {
          this.captureLoop = setTimeout(() => this.scheduleCapture(), delay);
        }
      });
  }

  private async captureFrame(): Promise<CaptureFrame | null> {
    if (!this.monitor) return null;
    const screenshot: Screenshot = await this.monitor.captureImage();
    const raw = screenshot.toRaw();
    return {
      data: raw,
      width: this.monitor.width,
      height: this.monitor.height,
      timestamp: Date.now(),
    };
  }
}
