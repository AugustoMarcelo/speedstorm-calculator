import { createServer } from 'node:http';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';

// Serve two generated releases at a Pages-style subdirectory for update tests.
const root = resolve('.test-build');
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp('dist', `${root}/v1`, { recursive: true, force: true });
await cp('dist', `${root}/v2`, { recursive: true, force: true });
const index = await readFile(`${root}/v2/index.html`, 'utf8');
await writeFile(`${root}/v2/index.html`, index.replace('</head>', '<meta name="test-release" content="2" /></head>'));
execFileSync(process.execPath, ['scripts/build-sw.mjs', `${root}/v2`]);
let version = 'v1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/__test/v1' || path === '/__test/v2') {
    version = path.endsWith('v2') ? 'v2' : 'v1';
    response.end(version);
    return;
  }
  if (!path.startsWith('/speedstorm-calculator/')) {
    response.writeHead(404).end();
    return;
  }
  const directory = `${root}/${version}`;
  const file = resolve(directory, decodeURIComponent(path.slice('/speedstorm-calculator/'.length)) || 'index.html');
  if (!file.startsWith(`${directory}${sep}`)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, '127.0.0.1');
