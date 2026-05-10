import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { WindowManager, Layout } from './windowManager';

export interface AppConfig {
  id: string;
  name: string;
  exe: string;
  args: string[];
  icon: string;
  defaultLayout: Layout;
}

interface RunningApp {
  config: AppConfig;
  process: ChildProcess;
  hwnd: number | null;
}

const APPS_PATH = path.join(__dirname, '../../apps.json');
const WINDOW_POLL_INTERVAL = 200;  // ms between HWND discovery attempts
const WINDOW_POLL_TIMEOUT = 10_000; // ms before giving up on finding the window

/**
 * Manages app definitions (from apps.json) and the lifecycle of running apps.
 * After launching a process, polls for its main window HWND so it can be
 * repositioned onto the virtual display via WindowManager.
 */
export class LauncherService {
  private apps: AppConfig[] = [];
  private running: Map<string, RunningApp> = new Map();

  constructor(private readonly windowManager: WindowManager) {
    this.loadApps();
    this.windowManager.discoverVirtualDisplay();
  }

  listApps(): AppConfig[] {
    return this.apps;
  }

  getApp(id: string): AppConfig | undefined {
    return this.apps.find((a) => a.id === id);
  }

  async launch(id: string): Promise<void> {
    if (this.running.has(id)) {
      console.log(`[launcher] ${id} already running`);
      return;
    }

    const config = this.getApp(id);
    if (!config) throw new Error(`Unknown app: ${id}`);

    console.log(`[launcher] launching ${config.name}`);
    const proc = spawn(config.exe, config.args, {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();

    const entry: RunningApp = { config, process: proc, hwnd: null };
    this.running.set(id, entry);

    proc.on('exit', (code) => {
      console.log(`[launcher] ${config.name} exited (code=${code})`);
      this.running.delete(id);
    });

    // Discover the new window and move it to the virtual display
    try {
      const hwnd = await this.waitForWindow(proc.pid!, config.name);
      entry.hwnd = hwnd;
      this.windowManager.placeWindow(hwnd, config.defaultLayout);
      console.log(`[launcher] ${config.name} placed on virtual display (hwnd=${hwnd})`);
    } catch (err) {
      console.warn(`[launcher] could not place ${config.name}: ${err}`);
    }
  }

  async close(id: string): Promise<void> {
    const entry = this.running.get(id);
    if (!entry) return;
    entry.process.kill();
    this.running.delete(id);
  }

  getRunningIds(): string[] {
    return Array.from(this.running.keys());
  }

  private loadApps(): void {
    try {
      this.apps = JSON.parse(readFileSync(APPS_PATH, 'utf-8')) as AppConfig[];
      console.log(`[launcher] loaded ${this.apps.length} app(s) from apps.json`);
    } catch (err) {
      console.error('[launcher] failed to load apps.json:', err);
      this.apps = [];
    }
  }

  /**
   * Polls for the main window of the process identified by pid.
   * Uses a small native helper via ffi-napi / EnumWindows to find the HWND
   * whose owner PID matches and which has WS_VISIBLE set.
   */
  private waitForWindow(pid: number, appName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Lazy-load the win32 helper to avoid requiring ffi-napi at module load time
      // if not on Windows.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { findMainWindow } = require('./win32') as {
        findMainWindow: (pid: number) => number | null;
      };

      const started = Date.now();
      const poll = () => {
        const hwnd = findMainWindow(pid);
        if (hwnd !== null && hwnd !== 0) {
          resolve(hwnd);
          return;
        }
        if (Date.now() - started > WINDOW_POLL_TIMEOUT) {
          reject(new Error(`Timed out waiting for window of ${appName} (pid=${pid})`));
          return;
        }
        setTimeout(poll, WINDOW_POLL_INTERVAL);
      };

      poll();
    });
  }
}
