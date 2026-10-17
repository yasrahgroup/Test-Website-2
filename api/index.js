import handler from '../server.js';

export default async function (req, res) {
  try {
    let requestUrl = req.url;
    try {
      const check = new URL(requestUrl, 'http://localhost');
      const forwarded = check.searchParams.get('__url') || check.searchParams.get('url');
      if (forwarded) {
        check.searchParams.delete('__url');
        check.searchParams.delete('url');
        const rest = check.searchParams.toString();
        requestUrl = forwarded + (rest ? '?' + rest : '');
      }
    } catch {}
    req.url = requestUrl;
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
