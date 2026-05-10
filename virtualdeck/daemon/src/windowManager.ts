import ffi from 'ffi-napi';
import ref from 'ref-napi';
import Struct from 'ref-struct-napi';

// Win32 types
const HWND = ref.types.ulong;
const DWORD = ref.types.uint32;
const BOOL = ref.types.int32;
const INT = ref.types.int32;
const UINT = ref.types.uint32;
const LONG = ref.types.int32;

const RECT = Struct({
  left: LONG,
  top: LONG,
  right: LONG,
  bottom: LONG,
});

const MONITORINFO = Struct({
  cbSize: DWORD,
  rcMonitor: RECT,
  rcWork: RECT,
  dwFlags: DWORD,
});

// SWP flags
const SWP_NOZORDER = 0x0004;
const SWP_SHOWWINDOW = 0x0040;
const SWP_NOACTIVATE = 0x0010; // Don't steal focus from main display

// GetMonitorInfo dwFlags
const MONITOR_DEFAULTTONEAREST = 0x00000002;
const MONITORINFOF_PRIMARY = 0x00000001;

const user32 = ffi.Library('user32', {
  SetWindowPos: [BOOL, [HWND, HWND, INT, INT, INT, INT, UINT]],
  GetMonitorInfo: [BOOL, ['pointer', 'pointer']],
  MonitorFromPoint: ['pointer', [LONG, LONG, DWORD]],
  EnumDisplayMonitors: [BOOL, ['pointer', 'pointer', 'pointer', 'pointer']],
  GetSystemMetrics: [INT, [INT]],
});

// SM_CXVIRTUALSCREEN / SM_CYVIRTUALSCREEN
const SM_XVIRTUALSCREEN = 76;
const SM_YVIRTUALSCREEN = 77;
const SM_CXVIRTUALSCREEN = 78;
const SM_CYVIRTUALSCREEN = 79;

export type Layout = 'fullscreen' | 'half-left' | 'half-right' | 'two-thirds';

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Wraps Win32 monitor and window APIs via ffi-napi.
 * Discovers the virtual display at startup and exposes helpers
 * for placing windows onto it without activating/focusing them.
 */
export class WindowManager {
  private virtualDisplay: DisplayBounds | null = null;

  /**
   * Discovers the virtual (non-primary) display.
   * Call this once at startup before using other methods.
   */
  discoverVirtualDisplay(): DisplayBounds {
    const monitors: DisplayBounds[] = [];

    const enumCallback = ffi.Callback(
      BOOL,
      ['pointer', 'pointer', 'pointer', 'pointer'],
      (hMonitor: Buffer, _hdc: Buffer, _lprcClip: Buffer, _dwData: Buffer) => {
        const info = new MONITORINFO();
        info.cbSize = MONITORINFO.size;
        const ok = user32.GetMonitorInfo(hMonitor, info.ref() as unknown as Buffer);
        if (ok) {
          monitors.push({
            x: info.rcMonitor.left,
            y: info.rcMonitor.top,
            width: info.rcMonitor.right - info.rcMonitor.left,
            height: info.rcMonitor.bottom - info.rcMonitor.top,
          });
        }
        return 1; // continue enumeration
      }
    );

    user32.EnumDisplayMonitors(
      ref.NULL as unknown as Buffer,
      ref.NULL as unknown as Buffer,
      enumCallback,
      ref.NULL as unknown as Buffer
    );

    // Primary monitor has x=0, y=0 (by Windows convention)
    const virtual = monitors.find((m) => !(m.x === 0 && m.y === 0)) ?? monitors[monitors.length - 1];
    this.virtualDisplay = virtual;

    console.log(
      `[windowManager] virtual display: ${virtual.width}x${virtual.height} @ (${virtual.x}, ${virtual.y})`
    );
    return virtual;
  }

  getVirtualDisplay(): DisplayBounds | null {
    return this.virtualDisplay;
  }

  /**
   * Moves and resizes an HWND onto the virtual display using the specified layout.
   * Uses SWP_NOACTIVATE so the main display's focus is never stolen.
   */
  placeWindow(hwnd: number, layout: Layout = 'fullscreen'): void {
    if (!this.virtualDisplay) throw new Error('Virtual display not discovered yet');

    const { x, y, width, height } = this.layoutBounds(layout);
    const flags = SWP_NOZORDER | SWP_SHOWWINDOW | SWP_NOACTIVATE;

    const ok = user32.SetWindowPos(hwnd, 0, x, y, width, height, flags);
    if (!ok) {
      console.warn(`[windowManager] SetWindowPos failed for HWND ${hwnd}`);
    }
  }

  private layoutBounds(layout: Layout): DisplayBounds {
    const d = this.virtualDisplay!;
    switch (layout) {
      case 'fullscreen':
        return { x: d.x, y: d.y, width: d.width, height: d.height };
      case 'half-left':
        return { x: d.x, y: d.y, width: Math.floor(d.width / 2), height: d.height };
      case 'half-right':
        return {
          x: d.x + Math.floor(d.width / 2),
          y: d.y,
          width: Math.ceil(d.width / 2),
          height: d.height,
        };
      case 'two-thirds':
        return { x: d.x, y: d.y, width: Math.round((d.width * 2) / 3), height: d.height };
    }
  }
}
