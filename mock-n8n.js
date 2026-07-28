/* =============================================================================
 *  Mock de n8n — endpoint local para probar el chat end-to-end del widget-gateway.
 * -----------------------------------------------------------------------------
 *  El gateway rutea los mensajes del chat al `n8n_webhook` del client. Este server
 *  simula ese webhook: recibe el POST del gateway y devuelve una respuesta que vos
 *  configurás desde un panel HTML.
 *
 *  CONTRATO (widget-gateway):
 *   - Gateway → webhook:  POST JSON { session_id, message, contact_name, email, phone_number }
 *   - webhook → gateway:  TEXTO PLANO (ese string se convierte en el `output` del chat)
 *     (el gateway lee la respuesta como String; por eso NO se puede devolver `vehicles`
 *      todavía — eso necesita un cambio en el backend. Hoy: solo texto.)
 *
 *  USO:
 *   1. node mock-n8n.js              → escucha en http://localhost:4000
 *   2. Poné el webhook del client:   update client set n8n_webhook='http://localhost:4000/webhook'
 *                                     where client_id='clientTest';
 *   3. Abrí http://localhost:4000/   → panel para setear la respuesta y ver lo que llega.
 * ========================================================================== */
const express = require('express');
const app = express();
const PORT = process.env.MOCK_PORT || 4000;

app.use(express.json());

// ---- estado en memoria ------------------------------------------------------
let responseText = '¡Hola! Soy la respuesta mockeada de n8n. Escribí lo que quieras probar 👋';
let delayMs = 0;                 // simular latencia del LLM
let lastRequest = null;          // último payload que mandó el gateway
let history = [];                // últimos intercambios (para el panel)

// ---- el webhook que consume el gateway --------------------------------------
app.post('/webhook', async (req, res) => {
  lastRequest = { at: new Date().toISOString(), body: req.body };
  console.log('\n[mock-n8n] ← request del gateway:', JSON.stringify(req.body));

  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  const reply = responseText;
  history.unshift({ message: req.body && req.body.message, reply });
  history = history.slice(0, 20);
  console.log('[mock-n8n] → respondo:', reply);

  res.type('text/plain').send(reply); // TEXTO PLANO (lo que espera el gateway)
});

// ---- API del panel ----------------------------------------------------------
app.post('/set', (req, res) => {
  if (typeof req.body.responseText === 'string') responseText = req.body.responseText;
  if (req.body.delayMs != null) delayMs = Math.max(0, parseInt(req.body.delayMs, 10) || 0);
  res.json({ ok: true, responseText, delayMs });
});

app.get('/state', (req, res) => res.json({ responseText, delayMs, lastRequest, history }));

// ---- panel HTML -------------------------------------------------------------
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock n8n · widget-gateway</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 28px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; } h1 span { color: #38bdf8; }
  .sub { color: #94a3b8; font-size: 13px; margin-bottom: 22px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 18px; margin-bottom: 16px; }
  label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; margin-bottom: 8px; }
  textarea { width: 100%; min-height: 90px; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; }
  input[type=number] { width: 120px; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; padding: 8px 10px; }
  .row { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
  button { background: #38bdf8; color: #0f172a; border: none; border-radius: 9px; padding: 11px 20px; font-weight: 700; font-size: 14px; cursor: pointer; }
  button:hover { filter: brightness(1.08); }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .presets button { background: #334155; color: #e2e8f0; font-weight: 500; font-size: 12.5px; padding: 7px 12px; }
  .mono { font-family: ui-monospace, monospace; font-size: 12.5px; }
  .last { background: #0f172a; border-radius: 8px; padding: 12px; white-space: pre-wrap; word-break: break-word; color: #7dd3fc; min-height: 40px; }
  .ok { color: #4ade80; font-size: 12.5px; height: 16px; margin-top: 8px; }
  .hist { max-height: 220px; overflow-y: auto; }
  .hist div { border-bottom: 1px solid #263449; padding: 8px 0; font-size: 13px; }
  .hist .u { color: #fbbf24; } .hist .b { color: #7dd3fc; }
</style></head>
<body>
  <h1>Mock <span>n8n</span> · widget-gateway</h1>
  <div class="sub">Endpoint: <b class="mono">POST http://localhost:${PORT}/webhook</b> — poné esto en <span class="mono">client.n8n_webhook</span></div>

  <div class="card">
    <label>Respuesta del bot (texto plano → se vuelve el <span class="mono">output</span>)</label>
    <textarea id="resp"></textarea>
    <div class="row" style="margin-top:12px">
      <div><label>Delay (ms)</label><input type="number" id="delay" min="0" step="100"></div>
      <button onclick="save()">Guardar respuesta</button>
    </div>
    <div class="presets" id="presets"></div>
    <div class="ok" id="ok"></div>
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
    'Tenemos varias opciones disponibles. ¿Buscás nuevo o usado?',
    'Perfecto, un asesor se va a contactar con vos a la brevedad. ¡Gracias!',
    'El horario de atención es de lunes a viernes de 9 a 18hs.',
  ];
  function renderPresets() {
    document.getElementById('presets').innerHTML = PRESETS
      .map((p, i) => '<button onclick="usePreset(' + i + ')">' + p.slice(0, 32) + '…</button>').join('');
  }
  function usePreset(i) { document.getElementById('resp').value = PRESETS[i]; save(); }
  async function save() {
    const responseText = document.getElementById('resp').value;
    const delayMs = document.getElementById('delay').value;
    await fetch('/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responseText, delayMs }) });
    const ok = document.getElementById('ok'); ok.textContent = '✓ guardado ' + new Date().toLocaleTimeString();
    setTimeout(() => ok.textContent = '', 2000);
  }
  async function poll() {
    const s = await (await fetch('/state')).json();
    if (document.activeElement.id !== 'resp') document.getElementById('resp').value = s.responseText;
    if (document.activeElement.id !== 'delay') document.getElementById('delay').value = s.delayMs;
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
