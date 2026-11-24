// A tiny static server for dist/ (no downloads). node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
createServer((req, res) => {
  let p = join('dist', new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(Number(process.argv[2] ?? 8123), () => console.log('serving dist/'));
