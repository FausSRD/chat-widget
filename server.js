const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Ruta para servir el widget comprimido con Gzip si el navegador lo acepta
app.get('/chat-widget.js', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const basePath = path.join(__dirname, 'chat-widget.js');

  if (acceptEncoding.includes('gzip') && fs.existsSync(basePath + '.gz')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath + '.gz').pipe(res);
  } else {
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath).pipe(res);
  }
});

app.get('/internal-widget-company.js', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const basePath = path.join(__dirname, 'internal-widget-company.js');

  if (acceptEncoding.includes('gzip') && fs.existsSync(basePath + '.gz')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath + '.gz').pipe(res);
  } else {
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath).pipe(res);
  }
});

app.get('/internal-widget-company-wix.js', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const basePath = path.join(__dirname, 'internal-widget-company-wix.js');

  if (acceptEncoding.includes('gzip') && fs.existsSync(basePath + '.gz')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath + '.gz').pipe(res);
  } else {
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(basePath).pipe(res);
  }
});

app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*'); // o tu dominio si querés restringir
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
