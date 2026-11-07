// Zero-dependency static server for the hub, for running it on this
// computer. The camera needs a secure page: localhost counts, so does the
// GitHub Pages copy. Nothing here talks to any device.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 5176;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  const file = path.normalize(path.join(root, url === '/' ? 'index.html' : url));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Universal Control Hub: http://127.0.0.1:${PORT}/`));
