import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'RootFacts - Fakta Unik Sayuran AI',
        short_name: 'RootFacts',
        description: 'Kenali berbagai jenis sayuran melalui kamera dan temukan fakta menarik secara instan dengan bantuan kecerdasan buatan.',
        theme_color: '#10b981',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,json,bin}']
      }
    })
  ],
  server: {
    port: 3001,
    host: true
  }
});
