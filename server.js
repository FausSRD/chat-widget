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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
