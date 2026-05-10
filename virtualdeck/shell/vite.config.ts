import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VirtualDeck',
        short_name: 'VirtualDeck',
        description: 'Tablet shell for your PC virtual display',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/apps': 'http://localhost:4321',
      '/stream': 'http://localhost:4321',
      '/input': { target: 'ws://localhost:4321', ws: true },
      '/events': { target: 'ws://localhost:4321', ws: true },
    },
  },
});
