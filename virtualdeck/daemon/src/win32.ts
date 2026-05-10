import ffi from 'ffi-napi';
import ref from 'ref-napi';

// Win32 constants
const WS_VISIBLE = 0x10000000;
const GWL_STYLE = -16;

const user32 = ffi.Library('user32', {
  EnumWindows: [ref.types.int32, ['pointer', 'pointer']],
  GetWindowThreadProcessId: [ref.types.uint32, ['pointer', 'pointer']],
  IsWindowVisible: [ref.types.int32, ['pointer']],
  GetWindow: ['pointer', ['pointer', ref.types.uint32]],
  GetWindowLongW: [ref.types.int32, ['pointer', ref.types.int32]],
});

// GW_OWNER — returns the owner window
const GW_OWNER = 4;

/**
 * Finds the main visible top-level window for the given process ID.
 * Returns the HWND as a number, or null if not found.
 *
 * Criteria: visible, no owner (top-level), owned by the target PID.
 */
export function findMainWindow(targetPid: number): number | null {
  let found: number | null = null;

  const pidBuf = ref.alloc(ref.types.uint32);

  const callback = ffi.Callback(
    ref.types.int32,
    ['pointer', 'pointer'],
    (hwnd: Buffer) => {
      // Skip invisible windows
      if (!user32.IsWindowVisible(hwnd)) return 1;

      // Skip owned windows (dialogs etc.)
      const owner = user32.GetWindow(hwnd, GW_OWNER);
      if (owner && !ref.isNull(owner as unknown as ref.Pointer<unknown>)) return 1;

      // Check PID
      ref.writeUInt32LE(pidBuf, 0, 0);
      user32.GetWindowThreadProcessId(hwnd, pidBuf);
      const pid = ref.readUInt32LE(pidBuf, 0);

      if (pid === targetPid) {
        // Use the HWND pointer value as a number
        found = (hwnd as unknown as { address: () => number }).address();
        return 0; // stop enumeration
      }

      return 1; // continue
    }
  );

  user32.EnumWindows(callback, ref.NULL as unknown as Buffer);

  return found;
}
