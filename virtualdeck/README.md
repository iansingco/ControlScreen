# VirtualDeck

Turn a tablet into a dedicated second workspace for your Windows PC — without disrupting the main display or stealing focus. The tablet acts as a touch shell: launching apps, controlling them, and displaying their windows via a low-latency WebRTC stream over LAN.

**Core principle:** The PC does all the work. The tablet is just a window into a dedicated virtual display on that PC.

---

## Architecture

```
[Windows PC]
  ├── Virtual Display Driver (fake "Screen 2" — no physical monitor)
  ├── Apps launched onto virtual display (Spotify, browser, etc.)
  ├── VirtualDeck Daemon (Node.js)
  │     ├── Manages app launching + window placement on virtual display
  │     ├── Captures virtual display via node-screenshots (Windows Graphics Capture API)
  │     ├── Streams it to tablet via WebRTC (LAN only)
  │     └── Receives touch/input events from tablet via WebSocket → injects via nut-js
  └── Audio output stays on PC's default audio device (untouched)

[Tablet]
  └── Browser (kiosk mode) running VirtualDeck Shell (React PWA)
        ├── Shell/launcher UI (home screen, app grid)
        ├── WebRTC video feed of virtual display (when an app is open)
        └── Touch input forwarded back to PC daemon via WebSocket
```

---

## Repo Structure

```
virtualdeck/
├── daemon/                  # PC-side Node.js daemon
│   ├── src/
│   │   ├── index.ts         # Entry point, HTTP + WebSocket server
│   │   ├── capture.ts       # Virtual display capture (node-screenshots)
│   │   ├── webrtc.ts        # WebRTC peer + signaling
│   │   ├── input.ts         # Touch/key injection via nut-js
│   │   ├── launcher.ts      # App launching + window placement
│   │   ├── windowManager.ts # Win32 SetWindowPos / monitor discovery
│   │   └── win32.ts         # Win32 EnumWindows / HWND helpers
│   ├── apps.json            # Registered app definitions
│   ├── package.json
│   └── tsconfig.json
│
├── shell/                   # Tablet-side React PWA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── views/
│   │   │   ├── Home.tsx     # App launcher grid
│   │   │   └── Session.tsx  # Active app: WebRTC feed + touch overlay
│   │   ├── components/
│   │   │   ├── AppTile.tsx
│   │   │   ├── VideoFeed.tsx
│   │   │   └── TouchOverlay.tsx
│   │   └── hooks/
│   │       ├── useWebRTC.ts
│   │       └── useInputBridge.ts
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Setup

### On the PC

1. **Install a virtual display driver**
   - Recommended: [Virtual Display Driver by itsmikethetech](https://github.com/itsmikethetech/Virtual-Display-Driver)
   - Set resolution to match your tablet's aspect ratio (e.g. 1920×1200 for 16:10)
   - Confirm it appears in Windows Display Settings as a secondary monitor

2. **Install Node.js 20+**

3. **Build and start the daemon**
   ```bat
   cd daemon
   npm install
   npm run build
   npm start
   ```
   The daemon serves the shell PWA and all WebSocket/WebRTC signaling on port **4321**.

4. **Edit `daemon/apps.json`** to register your apps (exe paths, icons, launch args).

### On the tablet

1. Open a browser and navigate to `http://<PC-local-IP>:4321`
2. Add to home screen as a PWA (prompted automatically)
3. For dedicated use, enable kiosk mode in your browser settings

### Audio

No configuration needed. Audio plays through the PC's default output device. VirtualDeck does not redirect or stream audio.

---

## API Reference

```
GET  /apps              → list registered apps (from apps.json)
POST /apps/:id/launch   → launch app onto virtual display
POST /apps/:id/close    → close app
GET  /stream/offer      → WebRTC SDP offer
POST /stream/answer     → WebRTC SDP answer
WS   /input             → touch/key event stream (tablet → daemon)
WS   /events            → app state updates (daemon → tablet)
```

### Touch event format (`/input` WebSocket)

```json
{ "type": "down" | "move" | "up", "x": 0.5, "y": 0.3, "pointerId": 0 }
```

`x` and `y` are normalized 0–1 relative to the virtual display bounds.

### Key event format

```json
{ "type": "keydown" | "keyup", "key": "Space" }
```

`key` must match a key name from the [`@nut-tree-fork/nut-js` `Key` enum](https://github.com/nut-tree/nut.js).

---

## apps.json

Located at `daemon/apps.json`. Edit manually to register apps:

```json
[
  {
    "id": "spotify",
    "name": "Spotify",
    "exe": "C:\\Users\\Ian\\AppData\\Roaming\\Spotify\\Spotify.exe",
    "args": [],
    "icon": "/icons/spotify.png",
    "defaultLayout": "fullscreen"
  },
  {
    "id": "chrome",
    "name": "Chrome",
    "exe": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "args": ["--new-window"],
    "icon": "/icons/chrome.png",
    "defaultLayout": "fullscreen"
  }
]
```

**Layout values:** `fullscreen` | `half-left` | `half-right` | `two-thirds`

Place app icons in `shell/public/icons/` so they're served at `/icons/<name>.png`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Daemon runtime | Node.js 20+ / TypeScript |
| Display capture | `node-screenshots` (Windows Graphics Capture API) |
| Streaming | WebRTC (`@roamhq/wrtc` on daemon, browser-native on tablet) |
| Input injection | `nut-js` (wraps Win32 SendInput) |
| Window management | `ffi-napi` → Win32 SetWindowPos / EnumWindows |
| Shell framework | React 18 + Vite (PWA via `vite-plugin-pwa`) |
| Shell styling | Tailwind CSS |
| Transport | WebSocket (`ws` package) |

---

## Open Decisions

- **Capture latency:** `node-screenshots` is the starting point. If latency is unacceptable, evaluate Electron's `desktopCapturer` or a custom N-API addon wrapping WGC directly.
- **Input package:** `nut-js` is actively maintained and has good TypeScript support. `robotjs` is an alternative but unmaintained.
- **Multi-app layout:** v1 is one app at a time, fullscreen. Split layouts are implemented in `WindowManager` but not yet exposed in the shell UI.
- **Admin UI:** Out of scope for v1. `apps.json` is edited manually.

---

## Non-Goals

- Internet / remote access (LAN only)
- Multi-user or multi-tablet
- Audio streaming to tablet
- Modifying Sunshine, Moonlight, or any third-party streaming project
- Game streaming / high-framerate use cases
- DRM content (capture APIs intentionally don't capture protected content)
