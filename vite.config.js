import { defineConfig } from 'vite';

// Deploy a GitHub Pages bajo el path /taller-imis-pedidos/
export default defineConfig({
  base: '/taller-imis-pedidos/',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
});
