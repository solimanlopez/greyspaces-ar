/* Servidor estático mínimo, por si el ordenador no tiene python3.
   Uso: node tools/servidor.js [puerto]     (desde la raíz del proyecto) */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = Number(process.argv[2]) || 8123;
const RAIZ = process.cwd();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.mind': 'application/octet-stream',
};

function listar(dir, url, res) {
  const filas = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => {
      const n = e.name + (e.isDirectory() ? '/' : '');
      return `<li><a href="${encodeURIComponent(e.name)}${e.isDirectory() ? '/' : ''}">${n}</a></li>`;
    }).join('');
  res.writeHead(200, { 'Content-Type': TIPOS['.html'] });
  res.end(`<meta charset="utf-8"><style>body{font:15px/1.7 system-ui;background:#0b0d0f;
    color:#c9ced2;padding:32px}a{color:#3de8a0}ul{list-style:none;padding:0}</style>
    <h1>${url}</h1><ul><li><a href="../">../</a></li>${filas}</ul>`);
}

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.normalize(path.join(RAIZ, url));
  if (!destino.startsWith(RAIZ)) { res.writeHead(403); return res.end('403'); }

  fs.stat(destino, (err, st) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    if (st.isDirectory()) {
      const indice = path.join(destino, 'index.html');
      if (fs.existsSync(indice)) return enviar(indice, res);
      return listar(destino, url, res);
    }
    enviar(destino, res);
  });
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`http://localhost:${PUERTO}/inicio.html`);
});

function enviar(archivo, res) {
  const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
  fs.createReadStream(archivo).pipe(res);
}
