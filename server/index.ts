import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

try {
  const config = loadConfig(process.env);
  const app = createApp(config);
  const server = createServer({ maxHeaderSize: 16_384 }, (req, res) => {
    void app.handler(req, res).catch(() => {
      // Deliberately do not log request URLs, headers, cookies, bodies, tokens, or exceptions.
      if (!res.headersSent)
        res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end('{"error":{"code":"unavailable"}}');
    });
  });
  server.requestTimeout = 90_000;
  server.headersTimeout = 15_000;
  const sweep = setInterval(() => app.sessions.sweep(), 10_000);
  sweep.unref();
  const stop = () => {
    clearInterval(sweep);
    app.sessions.close();
    server.close();
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  server.listen(Number(process.env.PORT || '8080'), '0.0.0.0', () =>
    console.info('ReelCoach RAM backend ready. No request logging enabled.'),
  );
} catch {
  console.error('ReelCoach backend configuration is incomplete. Follow docs/instagram-setup.md.');
  process.exitCode = 1;
}
