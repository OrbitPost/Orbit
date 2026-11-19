import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'orbit-desktop-policy',
    transformIndexHtml(_html, context) {
      if (context.server) return [];
      return [{ tag: 'meta', injectTo: 'head-prepend', attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'",
      } }];
    },
  }],
  server: { host: '127.0.0.1' },
  build: { target: 'chrome156' },
});
