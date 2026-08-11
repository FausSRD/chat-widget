const express = require('express');
const path = require('path');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;

// Gzip on-the-fly de TODAS las respuestas según el Accept-Encoding del navegador.
// Reemplaza el pre-generado `.gz` manual: ya no hace falta versionar archivos .gz.
app.use(compression());

// Widgets de producción (compression los sirve gzipeados solo). Rutas explícitas para
// NO exponer el resto del repo (server.js, package.json, node_modules, .git).
const WIDGETS = [
  'chat-widget.js',
  'internal-widget-company.js',
  'internal-widget-company-wix.js',
  'chat-widget-golden.js',
];
WIDGETS.forEach((file) => {
  app.get('/' + file, (req, res) => res.sendFile(path.join(__dirname, file)));
});

// Assets (imágenes) con cache largo.
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*'); // o tu dominio si querés restringir
    }
  },
}));

// v1 (widget nuevo + demos index.html/index2.html). compression ya lo gzipea.
//   http://localhost:3000/v1/chat-widget.js
//   http://localhost:3000/v1/index2.html
app.use('/v1', express.static(path.join(__dirname, 'v1')));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
