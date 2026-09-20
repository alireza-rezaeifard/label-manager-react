/**
 * DEV-ONLY CORS proxy helper. NEVER deploy to production or expose to a
 * network: it forwards any URL with the caller's Authorization header
 * (open relay / SSRF). Local development use only — it binds to
 * 127.0.0.1 for that reason. Prefer configuring the AI provider's
 * endpoint directly instead of routing through this proxy.
 */
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3002;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // Forward to OpenRouter
    const targetUrl = req.url.slice(1); // remove leading /
    const parsed = new URL(targetUrl);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
    };

    const transport = parsed.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error('Proxy error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

// Bound to loopback only: this helper must never listen on a public interface.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  CORS Proxy running at http://localhost:${PORT}\n`);
  console.log(`  Usage in app settings:`);
  console.log(`    API URL: http://localhost:${PORT}/https://openrouter.ai/api/v1/chat/completions`);
  console.log(`    Or:      http://localhost:${PORT}/https://api.openai.com/v1/chat/completions\n`);
});
