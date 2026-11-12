import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/instagram': {
        target: process.env.DEV_AUTH_BACKEND_ORIGIN || 'http://127.0.0.1:8080',
        changeOrigin: false,
        configure(proxy) {
          proxy.on('proxyReq', (request) => {
            request.setHeader(
              'x-reelcoach-proxy-secret',
              process.env.AUTH_BACKEND_PROXY_SECRET || '',
            );
          });
          proxy.on('error', (_error, request, response) => {
            // Keep Demo Mode independent when no local backend is running.
            if ('writeHead' in response && !response.headersSent) {
              const login = request.url?.startsWith('/api/instagram/login');
              response.writeHead(login ? 303 : 503, {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
                ...(login ? { Location: '/instagram/connect?error=not_configured' } : {}),
              });
              response.end(JSON.stringify({ error: { code: 'not_configured' } }));
            }
          });
        },
      },
    },
  },
});
