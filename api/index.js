import handler from '../server.js';

export default async function (req, res) {
  try {
    const originalPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-url'] || req.originalUrl;
    if (originalPath) {
      req.url = originalPath;
    }
    return await handler(req, res);
  } catch (err) {
    console.error('[Vercel Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Server failed',
        message: err.message
      }));
    }
  }
}
