/* =============================================================================
 *  Mock de n8n — endpoint local para probar el chat end-to-end del widget-gateway.
 * -----------------------------------------------------------------------------
 *  El gateway rutea los mensajes del chat al `n8n_webhook` del client. Este server
 *  simula ese webhook: recibe el POST del gateway y devuelve una respuesta que vos
 *  configurás desde un panel HTML.
 *
 *  CONTRATO (widget-gateway):
 *   - Gateway → webhook:  POST JSON { session_id, message | audio, contact_name, email, phone_number }
 *   - webhook → gateway (2 formas, el gateway soporta ambas):
 *       a) TEXTO PLANO            → se vuelve el `output` (sin cards).
 *       b) JSON { output, vehicles } → output = texto, vehicles = cards (passthrough al widget).
 *     El toggle "Mandar vehicles" del panel elige entre (a) y (b).
 *
 *  USO:
 *   1. node mock-n8n.js              → escucha en http://localhost:4000
 *   2. client.n8n_webhook = http://localhost:4000/webhook
 *   3. Abrí http://localhost:4000/   → panel para setear la respuesta, las cards y el delay.
 * ========================================================================== */
const express = require('express');
const app = express();
const PORT = process.env.MOCK_PORT || 4000;

app.use(express.json({ limit: '10mb' })); // el audio base64 puede pesar

// ---- vehículos de ejemplo (shape que espera el widget) ----------------------
const SAMPLE_VEHICLES = [
  {
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    vin: '2HKRS4H56TH111234', stock: 'CR2T49',
    title: 'Honda CR-V EX-L Hybrid 2026', price: '$47,021', url: '#',
    specs: { 'Year': '2026', 'Body type': 'Sport utility', 'Mileage': '6 km', 'Exterior color': 'Canyon river blue', 'Interior color': 'Black', 'Transmission': 'Automatic', 'Fuel type': 'Hybrid' },
    ctaPrimary: { label: 'Quiero visitarlos', url: '#' },
    ctaSecondary: { label: 'Ver ficha', url: '#' },
  },
  {
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    vin: '2HGFE1F50N9001122', stock: 'HI812',
    title: 'Honda Civic Sport 2024', price: '$31,480', url: '#',
    specs: { 'Year': '2024', 'Body type': 'Sedan', 'Mileage': '18.400 km', 'Exterior color': 'Sonic gray', 'Interior color': 'Black', 'Transmission': 'CVT', 'Fuel type': 'Gasoline' },
    ctaPrimary: { label: 'Quiero visitarlos', url: '#' },
    ctaSecondary: { label: 'Ver ficha', url: '#' },
  },
  {
    image: 'https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=600&q=80',
    vin: '5FNYF6H01NB005566', stock: 'PL329',
    title: 'Honda Pilot TrailSport 2026', price: '$52,346', url: '#',
    specs: { 'Year': '2026', 'Body type': 'SUV', 'Mileage': '12 km', 'Exterior color': 'Diffused sky blue', 'Interior color': 'Gray leather', 'Transmission': 'Automatic', 'Fuel type': 'Gasoline' },
    ctaPrimary: { label: 'Quiero visitarlos', url: '#' },
    ctaSecondary: { label: 'Ver ficha', url: '#' },
  },
];

// ---- estado en memoria ------------------------------------------------------
let responseText = '¡Hola! Soy la respuesta mockeada de n8n. Escribí lo que quieras probar 👋';
let delayMs = 0;
let sendVehicles = false;                              // toggle: mandar cards o no
let vehiclesJson = JSON.stringify(SAMPLE_VEHICLES, null, 2);
let lastRequest = null;
let history = [];

// ---- el webhook que consume el gateway --------------------------------------
app.post('/webhook', async (req, res) => {
  lastRequest = { at: new Date().toISOString(), body: req.body };
  console.log('\n[mock-n8n] ← request del gateway:', JSON.stringify(req.body).slice(0, 300));

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  let logReply = responseText;
  if (sendVehicles) {
    let vehicles = [];
    try { vehicles = JSON.parse(vehiclesJson); } catch (e) { console.warn('[mock-n8n] vehiclesJson inválido, mando []'); }
    logReply = responseText + '  +[' + (Array.isArray(vehicles) ? vehicles.length : 0) + ' cards]';
    res.json({ output: responseText, vehicles }); // JSON → el gateway separa output/vehicles
  } else {
    res.type('text/plain').send(responseText);      // texto plano → solo output
  }

  history.unshift({ message: (req.body && (req.body.message || (req.body.audio ? '🎤 audio' : ''))) || '', reply: logReply });
  history = history.slice(0, 20);
  console.log('[mock-n8n] → respondo:', logReply);
});

// ---- API del panel ----------------------------------------------------------
app.post('/set', (req, res) => {
  if (typeof req.body.responseText === 'string') responseText = req.body.responseText;
  if (req.body.delayMs != null) delayMs = Math.max(0, parseInt(req.body.delayMs, 10) || 0);
  if (typeof req.body.sendVehicles === 'boolean') sendVehicles = req.body.sendVehicles;
  if (typeof req.body.vehiclesJson === 'string') vehiclesJson = req.body.vehiclesJson;
  res.json({ ok: true });
});

app.get('/state', (req, res) => res.json({ responseText, delayMs, sendVehicles, vehiclesJson, lastRequest, history }));

// ---- panel HTML -------------------------------------------------------------
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock n8n · widget-gateway</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 28px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; } h1 span { color: #38bdf8; }
  .sub { color: #94a3b8; font-size: 13px; margin-bottom: 22px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 18px; margin-bottom: 16px; }
  label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; margin-bottom: 8px; }
  textarea { width: 100%; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; }
  textarea#resp { min-height: 80px; } textarea#veh { min-height: 150px; font-family: ui-monospace, monospace; font-size: 12px; }
  input[type=number] { width: 120px; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; padding: 8px 10px; }
  .row { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
  button { background: #38bdf8; color: #0f172a; border: none; border-radius: 9px; padding: 11px 20px; font-weight: 700; font-size: 14px; cursor: pointer; }
  button:hover { filter: brightness(1.08); }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .presets button { background: #334155; color: #e2e8f0; font-weight: 500; font-size: 12.5px; padding: 7px 12px; }
  .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
  .toggle input { width: 18px; height: 18px; accent-color: #38bdf8; }
  .toggle label { margin: 0; text-transform: none; letter-spacing: 0; font-size: 14px; color: #e2e8f0; }
  .mono { font-family: ui-monospace, monospace; font-size: 12.5px; }
  .last { background: #0f172a; border-radius: 8px; padding: 12px; white-space: pre-wrap; word-break: break-word; color: #7dd3fc; min-height: 40px; max-height: 160px; overflow: auto; }
  .ok { color: #4ade80; font-size: 12.5px; height: 16px; margin-top: 8px; }
  .hist { max-height: 200px; overflow-y: auto; }
  .hist div { border-bottom: 1px solid #263449; padding: 8px 0; font-size: 13px; }
  .hist .u { color: #fbbf24; } .hist .b { color: #7dd3fc; }
  .hidden { display: none; }
</style></head>
<body>
  <h1>Mock <span>n8n</span> · widget-gateway</h1>
  <div class="sub">Endpoint: <b class="mono">POST http://localhost:${PORT}/webhook</b> — poné esto en <span class="mono">client.n8n_webhook</span></div>

  <div class="card">
    <label>Respuesta del bot (texto → el <span class="mono">output</span>)</label>
    <textarea id="resp"></textarea>
    <div class="row" style="margin-top:12px">
      <div><label>Delay (ms)</label><input type="number" id="delay" min="0" step="100"></div>
      <button onclick="save()">Guardar</button>
    </div>
    <div class="presets" id="presets"></div>
    <div class="ok" id="ok"></div>
  </div>

  <div class="card">
    <div class="toggle" onclick="toggleVeh(event)">
      <input type="checkbox" id="sv"><label for="sv">Mandar vehicles (cards) junto al texto</label>
    </div>
    <div id="vehBox" class="hidden" style="margin-top:14px">
      <label>JSON de vehicles (array)</label>
      <textarea id="veh"></textarea>
    </div>
  </div>

  <div class="card">
    <label>Último request recibido del gateway</label>
    <div class="last mono" id="last">— esperando… —</div>
  </div>

  <div class="card">
    <label>Historial</label>
    <div class="hist" id="hist"></div>
  </div>

<script>
  const PRESETS = [
    'Claro, te ayudo con eso. ¿Qué modelo tenés en mente?',
    'Encontré algunas opciones que te pueden interesar 👇',
    'Perfecto, un asesor se va a contactar con vos. ¡Gracias!',
  ];
  function renderPresets() {
    document.getElementById('presets').innerHTML = PRESETS
      .map((p, i) => '<button onclick="usePreset(' + i + ')">' + p.slice(0, 34) + '…</button>').join('');
  }
  function usePreset(i) { document.getElementById('resp').value = PRESETS[i]; save(); }
  function toggleVeh(e) {
    if (e.target.id !== 'sv') document.getElementById('sv').checked = !document.getElementById('sv').checked;
    document.getElementById('vehBox').classList.toggle('hidden', !document.getElementById('sv').checked);
    save();
  }
  async function save() {
    const payload = {
      responseText: document.getElementById('resp').value,
      delayMs: document.getElementById('delay').value,
      sendVehicles: document.getElementById('sv').checked,
      vehiclesJson: document.getElementById('veh').value,
    };
    await fetch('/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const ok = document.getElementById('ok'); ok.textContent = '✓ guardado ' + new Date().toLocaleTimeString();
    setTimeout(() => ok.textContent = '', 2000);
  }
  async function poll() {
    const s = await (await fetch('/state')).json();
    const active = document.activeElement.id;
    if (active !== 'resp') document.getElementById('resp').value = s.responseText;
    if (active !== 'delay') document.getElementById('delay').value = s.delayMs;
    if (active !== 'veh') document.getElementById('veh').value = s.vehiclesJson;
    document.getElementById('sv').checked = s.sendVehicles;
    document.getElementById('vehBox').classList.toggle('hidden', !s.sendVehicles);
    document.getElementById('last').textContent = s.lastRequest ? JSON.stringify(s.lastRequest.body, null, 2) : '— esperando… —';
    document.getElementById('hist').innerHTML = s.history.map(hh =>
      '<div><span class="u">▸ ' + (hh.message || '(sin mensaje)') + '</span><br><span class="b">↳ ' + hh.reply + '</span></div>').join('') || '<div style="color:#64748b">sin mensajes aún</div>';
  }
  renderPresets(); poll(); setInterval(poll, 1500);
</script>
</body></html>`);
});

app.listen(PORT, () => {
  console.log('[mock-n8n] escuchando en http://localhost:' + PORT);
  console.log('[mock-n8n] webhook para el client: http://localhost:' + PORT + '/webhook');
  console.log('[mock-n8n] panel: http://localhost:' + PORT + '/');
});
