const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;

// URL del widget-gateway, definida POR DEPLOY vía env var. El server la inyecta en el widget
// (window.__CW_GATEWAY_URL__) para que cada client solo defina su clientId, no el gatewayUrl.
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://widget-gateway-production-596d.up.railway.app';

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

// El widget lee window.__CW_GATEWAY_URL__ como default: lo inyectamos desde la env GATEWAY_URL
// (por-deploy), así el client solo define su clientId. Va ANTES del static de /v1 para tener prioridad.
app.get('/v1/chat-widget.js', (req, res) => {
  const js = fs.readFileSync(path.join(__dirname, 'v1', 'chat-widget.js'), 'utf8');
  res.type('application/javascript').send(`window.__CW_GATEWAY_URL__=${JSON.stringify(GATEWAY_URL)};\n${js}`);
});

// v1 (demos index.html/index2.html + estáticos). compression ya lo gzipea.
//   http://localhost:3000/v1/index2.html
app.use('/v1', express.static(path.join(__dirname, 'v1')));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
