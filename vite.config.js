import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Commit SHA corto inyectado como __APP_VERSION__ — se usa en reportes de error
// para correlacionar una excepción con la versión exacta del bundle. Si por
// alguna razón git no responde (build sin .git, sandbox raro), cae a "dev".
const APP_VERSION = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
})();

// Deploy a GitHub Pages bajo el path /taller-imis-pedidos/
export default defineConfig({
  base: '/taller-imis-pedidos/',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  // React viene de npm. Usamos el JSX runtime automático — esbuild auto-importa
  // jsx-runtime para los archivos .jsx sin necesidad de `import React from 'react'`
  // en cada archivo. Solo hay que importar lo que usás (`useState`, `Component`, etc.).
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      // 'prompt' = el SW nuevo se instala pero NO se activa solo.
      // En lugar de eso, src/lib/sw.js dispara un callback para que el
      // usuario pueda decidir cuándo recargar (evita pisar trabajo en curso).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'Taller IMIS — Sistema de Pedidos',
        short_name: 'Taller IMIS',
        description: 'Sistema de gestión de pedidos del taller IMIS — confección, bordados y cuellos.',
        theme_color: '#2C1654',
        background_color: '#F7F4FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/taller-imis-pedidos/',
        scope: '/taller-imis-pedidos/',
        lang: 'es-SV',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
        navigateFallback: '/taller-imis-pedidos/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://cdn.sheetjs.com' ||
              url.origin === 'https://cdnjs.cloudflare.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-libs',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'api.anthropic.com',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
