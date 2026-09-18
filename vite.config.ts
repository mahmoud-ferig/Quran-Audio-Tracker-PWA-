import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Quran Audio Tracker',
        short_name: 'QuranTracker',
        description: 'Lightweight Quran audio player with cross-device timestamp synchronization and offline listening',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/server\d+\.mp3quran\.net\/.+\.mp3(\?.*)?$/i,
            // NetworkFirst (not CacheFirst) on purpose:
            //  - Online users always get a fresh copy, so a single bad/partial cached
            //    entry can never permanently break playback with
            //    MEDIA_ERR_SRC_NOT_SUPPORTED ("Audio source not found").
            //  - Offline users still fall back to the cache (explicit downloads).
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-audio-cache',
              expiration: {
                // Was 114; downloads live in this cache too, so keep headroom
                // for explicitly downloaded surahs.
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 Days
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                // ONLY complete 200 responses may be stored.
                //  - 206 partial responses must never be cached: replaying a
                //    truncated/partial body makes the browser reject the whole
                //    file (this was the root cause of the random error banner).
                //  - 0 (opaque) responses have an unreadable body, so range
                //    slicing cannot work on them either.
                statuses: [200]
              },
              rangeRequests: true,
              matchOptions: {
                // Audio hosts send "Vary: accept-encoding"; matching must not
                // depend on it or an offline cache lookup can miss.
                ignoreVary: true,
                ignoreSearch: true
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
