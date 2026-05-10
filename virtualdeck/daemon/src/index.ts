import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { CaptureService } from './capture';
import { WebRTCService } from './webrtc';
import { InputService } from './input';
import { LauncherService } from './launcher';
import { WindowManager } from './windowManager';

const PORT = 4321;

const app = express();
app.use(cors());
app.use(express.json());

// Serve shell PWA static files
app.use(express.static(path.join(__dirname, '../../shell/dist')));

const httpServer = createServer(app);

// WebSocket servers
const inputWss = new WebSocketServer({ noServer: true });
const eventsWss = new WebSocketServer({ noServer: true });

// Services
const windowManager = new WindowManager();
const captureService = new CaptureService();
const webrtcService = new WebRTCService(captureService);
const inputService = new InputService(windowManager);
const launcher = new LauncherService(windowManager);

// Broadcast app state to all event subscribers
function broadcast(event: object) {
  const payload = JSON.stringify(event);
  eventsWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// --- REST API ---

app.get('/apps', (_req, res) => {
  res.json(launcher.listApps());
});

app.post('/apps/:id/launch', async (req, res) => {
  const app = launcher.getApp(req.params.id);
  if (!app) {
    res.status(404).json({ error: 'App not found' });
    return;
  }
  try {
    await launcher.launch(req.params.id);
    broadcast({ type: 'app:launched', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/apps/:id/close', async (req, res) => {
  try {
    await launcher.close(req.params.id);
    broadcast({ type: 'app:closed', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// WebRTC signaling
app.get('/stream/offer', async (_req, res) => {
  try {
    const offer = await webrtcService.createOffer();
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/stream/answer', async (req, res) => {
  try {
    await webrtcService.acceptAnswer(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// --- WebSocket upgrade routing ---

httpServer.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url!, `http://localhost`);

  if (pathname === '/input') {
    inputWss.handleUpgrade(request, socket, head, (ws) => {
      inputWss.emit('connection', ws, request);
    });
  } else if (pathname === '/events') {
    eventsWss.handleUpgrade(request, socket, head, (ws) => {
      eventsWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Input events from tablet
inputWss.on('connection', (ws) => {
  console.log('[input] tablet connected');
  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      inputService.handleEvent(event);
    } catch {
      // ignore malformed
    }
  });
  ws.on('close', () => console.log('[input] tablet disconnected'));
});

// Events channel — just track connections, broadcast is pushed from REST handlers
eventsWss.on('connection', (_ws) => {
  console.log('[events] subscriber connected');
});

async function main() {
  await captureService.init();
  await inputService.init();

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`VirtualDeck daemon running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
