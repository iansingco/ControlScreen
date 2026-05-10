import { mouse, keyboard, Point, Button, Key } from '@nut-tree-fork/nut-js';
import { WindowManager } from './windowManager';

export interface TouchEvent {
  type: 'down' | 'move' | 'up';
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  pointerId: number;
}

export interface KeyEvent {
  type: 'keydown' | 'keyup';
  key: string; // key name matching @nut-tree-fork/nut-js Key enum
}

type InputEvent = TouchEvent | KeyEvent;

/**
 * Receives pointer and key events from the tablet, maps them to virtual display
 * coordinates, and injects them via nut-js (which calls Win32 SendInput internally).
 *
 * Touch coordinates arrive normalized (0–1 relative to the virtual display).
 * They are mapped to absolute screen coordinates of the virtual display before injection.
 */
export class InputService {
  constructor(private readonly windowManager: WindowManager) {}

  async init(): Promise<void> {
    // nut-js doesn't activate target windows on injection — no extra config needed.
    // Mouse speed 0 = instant (no interpolation delay)
    mouse.config.mouseSpeed = 0;
    console.log('[input] ready');
  }

  handleEvent(event: InputEvent): void {
    if ('key' in event) {
      this.handleKey(event);
    } else {
      this.handleTouch(event);
    }
  }

  private handleTouch(event: TouchEvent): void {
    const display = this.windowManager.getVirtualDisplay();
    if (!display) return;

    const absX = Math.round(display.x + event.x * display.width);
    const absY = Math.round(display.y + event.y * display.height);

    const point = new Point(absX, absY);

    switch (event.type) {
      case 'down':
        mouse.move([point]).then(() => mouse.pressButton(Button.LEFT));
        break;
      case 'move':
        mouse.move([point]);
        break;
      case 'up':
        mouse.move([point]).then(() => mouse.releaseButton(Button.LEFT));
        break;
    }
  }

  private handleKey(event: KeyEvent): void {
    const key = Key[event.key as keyof typeof Key];
    if (key === undefined) return;

    if (event.type === 'keydown') {
      keyboard.pressKey(key);
    } else {
      keyboard.releaseKey(key);
    }
  }
}
