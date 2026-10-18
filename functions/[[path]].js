// Cloudflare Pages Functions Edge Handler
// Bridges Cloudflare Pages edge requests to Node.js backend handler
import handler from '../server.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // If this is a static asset request, let Cloudflare Pages static asset handler process it
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/media/') && /\.[a-z0-9]+$/i.test(url.pathname)) {
    return context.next();
  }

  // Handle request through unified server handler
  try {
    return await new Promise(async (resolve, reject) => {
      let responseBody = [];
      let statusCode = 200;
      let headers = {};

      const reqMock = {
        method: request.method,
        url: url.pathname + url.search,
        headers: Object.fromEntries(request.headers.entries()),
        socket: { remoteAddress: request.headers.get('cf-connecting-ip') || '127.0.0.1' },
        async *[Symbol.asyncIterator]() {
          if (request.body) {
            const reader = request.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield Buffer.from(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
        }
      };

      const resMock = {
        statusCode: 200,
        headersSent: false,
        setHeader(k, v) { headers[k.toLowerCase()] = v; },
        getHeader(k) { return headers[k.toLowerCase()]; },
        writeHead(status, hdrs = {}) {
          statusCode = status;
          for (const [k, v] of Object.entries(hdrs)) {
            headers[k.toLowerCase()] = v;
          }
        },
        write(chunk) {
          responseBody.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        },
        end(data) {
          if (data) responseBody.push(typeof data === 'string' ? Buffer.from(data) : data);
          const bodyBuffer = Buffer.concat(responseBody);
          resolve(new Response(bodyBuffer, {
            status: statusCode,
            headers: new Headers(headers)
          }));
        }
      };

      try {
        await handler(reqMock, resMock);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Cloudflare Pages Worker error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
