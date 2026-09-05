/**
 * Dev-only: proxy agent bridge so the React app never embeds secrets.
 * Requires `npm run agent:bridge` on port 8787.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = process.env.AGENT_BRIDGE_URL || 'http://127.0.0.1:8787';

  app.use(
    '/api/agent',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'silent',
      onError(err, _req, res) {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(
          JSON.stringify({
            ok: false,
            error: {
              message: 'Agent bridge unavailable. Run: npm run agent:bridge',
              code: 'bridge_unavailable',
              detail: err.message,
            },
          })
        );
      },
    })
  );
};
