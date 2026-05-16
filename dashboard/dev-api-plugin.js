// Dev-only Vite plugin that serves files in /api as Vercel-style serverless handlers.
// Each module default-exports `async function handler(req, res)` with Vercel's
// Node Runtime req/res contract. We adapt Node's IncomingMessage/ServerResponse
// by adding: req.body (parsed JSON), req.query, res.status(), res.json(), res.redirect().
//
// Production on Vercel runs the same files natively — this plugin is skipped there.

import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        const ct = req.headers['content-type'] ?? '';
        if (ct.includes('application/json')) resolve(JSON.parse(raw));
        else if (ct.includes('application/x-www-form-urlencoded')) resolve(Object.fromEntries(new URLSearchParams(raw)));
        else resolve(raw);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function attachResHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (body) => { res.end(body); return res; };
  res.redirect = (location) => {
    res.statusCode = 302;
    res.setHeader('location', location);
    res.end();
    return res;
  };
  return res;
}

export default function devApiPlugin({ apiDir = 'api' } = {}) {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      const root = server.config.root;
      const apiRoot = path.join(root, apiDir);
      if (!existsSync(apiRoot)) return;

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        // Map /api/foo -> api/foo.js  (or api/foo/index.js)
        let handlerPath = path.join(apiRoot, `${pathname}.js`);
        if (!existsSync(handlerPath)) handlerPath = path.join(apiRoot, pathname, 'index.js');
        if (!existsSync(handlerPath)) return next();

        try {
          const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await parseBody(req) : {};
          req.body = body;
          req.query = Object.fromEntries(url.searchParams);

          // Bust module cache so edits hot-reload
          const fileUrl = pathToFileURL(handlerPath).href + `?t=${Date.now()}`;
          const mod = await import(fileUrl);
          const handler = mod.default;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`No default export function in ${handlerPath}`);
            return;
          }

          attachResHelpers(res);
          await handler(req, res);
          if (!res.writableEnded) res.end();
        } catch (err) {
          console.error(`[dev-api] ${req.url} error:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: err.message, stack: err.stack }));
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      });
    },
  };
}
