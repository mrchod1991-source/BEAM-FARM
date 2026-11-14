import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cleans up any legacy /sw.js Service Worker left over in browsers from older builds
 * during Vite dev mode so stale Cache-First HTML never causes a white screen.
 */
function legacySwCleanupDevPlugin(): Plugin {
  const selfDestructSw = `
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('realistic-fishing-3d') || k.startsWith('workbox-precache'))
          .map((k) => caches.delete(k))
      );
      await self.registration.unregister();
    } catch {}
  })());
});
`.trim();

  return {
    name: 'legacy-sw-cleanup-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0];
        if (cleanUrl === '/sw.js') {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.statusCode = 200;
          res.end(selfDestructSw);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      legacySwCleanupDevPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'inline',
        includeAssets: [
          'apple-touch-icon.png',
          'favicon-32x32.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-192x192.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Beam Farm 3D - โลกฟาร์ม 3 มิติ',
          short_name: 'BeamFarm',
          description:
            'เกมจำลองฟาร์ม 3 มิติครบวงจร ปลูกผัก เลี้ยงสัตว์ ขี่ม้า ใช้โดรนเก็บเกี่ยว ตกปลา และสำรวจชนบท',
          theme_color: '#1c1917',
          background_color: '#120c09',
          display: 'standalone',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'any',
          categories: ['games', 'simulation'],
          prefer_related_applications: false,
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//,
            /\.(?:glb|gltf|png|jpg|jpeg|svg|webp|js|css|json)$/i,
          ],
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2,json}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\.glb$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'beam-farm-3d-glb-models',
                networkTimeoutSeconds: 4,
                cacheableResponse: {
                  statuses: [200],
                },
                expiration: {
                  maxEntries: 35,
                  maxAgeSeconds: 60 * 60 * 24 * 60,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // ✅ เพิ่มจุดนี้: ทำให้ import 'three/addons/...' ทำงานได้
        'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: [
        'localhost',
        '192.168.1.33',
        '169.254.83.107',
      ],
    },
  };
});