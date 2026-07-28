/* =============================================================================
 *  FullGrowth — Chat Widget (LEAD / público)  ·  v1
 * -----------------------------------------------------------------------------
 *  Widget de captación de leads con cuestionario + chat, embebible en cualquier
 *  sitio (WordPress, Wix, Elementor, HTML plano).
 *
 *  Novedades v1 respecto al viejo:
 *   - La CONFIG (estilos/textos) se sirve desde el backend: GET /api/v2/config/{clientId}.
 *     El snippet de embed solo aporta la CONEXIÓN (clientId + gatewayUrl).
 *   - Diseño moderno: header con avatar/estado del agente, burbujas animadas,
 *     footer "powered by", responsive full-screen en mobile.
 *   - CARDS DE VEHÍCULOS: carousel + card expandida con specs y CTAs. La UI está
 *     lista; se alimenta de `vehicles` que el backend devolverá junto a `output`
 *     (todavía no lo hace → hoy se ve vía mock).
 *   - Aislamiento de estilos con escudo `all: initial` (probado con reCAPTCHA).
 *
 *  API del gateway (widget-gateway):
 *   - GET  {gw}/api/v2/config/{clientId}          → widget_config (público)
 *   - POST {gw}/api/v2/widget/lead/login          → { session_id }   (x-captcha-token)
 *   - POST {gw}/api/v2/widget/lead/chat           → { output, vehicles? }  (x-session-id)
 *   - GET  {gw}/api/v2/widget/lead/login/ping     → 200 | 403        (x-session-id)
 *   El header Origin lo pone el navegador solo; el gateway resuelve el client por ahí.
 * ========================================================================== */
(function () {
  'use strict';

  // ---- Conexión + overrides que vienen del snippet de embed -----------------
  const embed = (typeof window !== 'undefined' && window.ChatWidgetConfig) || {};
  const CLIENT_ID = embed.clientId || 'clientTest';
  const GATEWAY_URL = (embed.gatewayUrl || 'http://localhost:8080').replace(/\/$/, '');
  const MOCK = embed.mock === true; // demo/preview sin backend

  const API = {
    config: `${GATEWAY_URL}/api/v2/config/${encodeURIComponent(CLIENT_ID)}`,
    login: `${GATEWAY_URL}/api/v2/widget/lead/login`,
    chat: `${GATEWAY_URL}/api/v2/widget/lead/chat`,
    ping: `${GATEWAY_URL}/api/v2/widget/lead/login/ping`,
  };

  const LS_SESSION = `lh:${CLIENT_ID}:session`;
  const LS_MESSAGES = `lh:${CLIENT_ID}:messages`;

  // ---- Defaults (se sobreescriben con el widget_config del backend) ---------
  const DEFAULTS = {
    // Identidad / branding
    title: 'Asistente virtual',
    agentName: 'Asistente',
    agentAvatar: null,               // URL de la foto del agente (círculo en el header)
    agentStatus: 'Online',           // 'Online' | 'Offline'
    brandColor: '#4f46e5',
    brandColorDark: '#4338ca',       // hover / gradiente
    // Launcher
    launcherImage: null,
    launcherImageSize: '64px',
    hintMessage: 'Escribime, estoy para ayudarte',
    hintEnabled: true,
    // Textos
    welcomeMessage: '¡Hola! Soy tu asistente virtual. ¿En qué te puedo ayudar?',
    formIntro: 'Antes de empezar, dejanos tus datos para poder ayudarte mejor.',
    inputPlaceholder: 'Escribí tu mensaje...',
    quickReplies: ['Ver inventario', 'Financiación', 'Agendar visita'],
    startButtonText: 'Empezar chat',
    poweredByText: 'Powered by FullGrowth',
    poweredByUrl: null,
    // Colores granulares (compat con customización vieja)
    chatBackgroundColor: '#ffffff',
    headerTextColor: '#ffffff',
    userMessageColor: null,          // null = usa brandColor
    userMessageTextColor: '#ffffff',
    botMessageColor: '#f1f5f9',
    botMessageTextColor: '#0f172a',
    sendButtonColor: null,           // null = usa brandColor
    sendButtonIconColor: '#ffffff',
    inputBorder: '#e5e7eb',
    inputBorderFocus: null,          // null = usa brandColor
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    // Comportamiento
    recaptchaSiteKey: null,          // site key PÚBLICA del client (si el client requiere captcha)
    activateMic: true,
    vehicleCards: true,              // habilita el render de cards de vehículos
    // Textos de UI ("chrome"): TODO configurable por el backend para i18n
    // (es/en/pt/de/…). El backend puede mandar un `text` parcial y se mergea
    // con estos defaults. El contenido (welcomeMessage, quickReplies, etc.) va arriba.
    text: {
      // cuestionario
      nameLabel: 'Nombre', namePlaceholder: 'Tu nombre',
      emailLabel: 'Email', emailPlaceholder: 'tu@email.com',
      phoneLabel: 'Teléfono', phonePlaceholder: '+54 11 5555 5555',
      nameError: 'Ingresá tu nombre',
      emailError: 'Ingresá un email válido',
      phoneError: 'Ingresá un teléfono válido',
      captchaError: 'Completá el reCAPTCHA',
      privacy: 'Al continuar aceptás ser contactado. Protegido por reCAPTCHA.',
      starting: 'Iniciando...',
      // aria-labels
      minimizeAria: 'Minimizar', sendAria: 'Enviar', micAria: 'Grabar',
      // cards de vehículos
      vinLabel: 'VIN', stockLabel: 'Stock #', priceLabel: 'Precio',
      vDetail: 'Ver detalle', vSelect: 'Me interesa',
      vInterested: 'Me interesa el',        // + título del vehículo
      ctaPrimary: 'Quiero visitarlos', ctaSecondary: 'Ver ficha del vehículo',
      // errores / estados
      errSession: 'Tu sesión terminó. Refrescá la página para empezar de nuevo.',
      errLimit: 'Llegaste al límite de mensajes. Vas a poder seguir en un rato.',
      errOrigin: 'Este sitio no está habilitado para el chat.',
      errCaptcha: 'El reCAPTCHA no se validó. Probá de nuevo.',
      errGeneric: 'Hubo un error procesando tu mensaje. Probá de nuevo.',
      loginFail: 'No pudimos iniciar el chat. Probá de nuevo.',
      noSession: 'No se recibió la sesión.',
      botFallback: 'No entendí, ¿podés reformular?',
      audioDisabled: 'El audio todavía no está habilitado en esta versión.',
      audioSent: '🎤 Audio enviado',
    },
  };

  /* ------------------------------------------------------------------ utils */
  const h = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const onReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  /* --------------------------------------------------------------- iconos */
  const ICONS = {
    send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    chevronR: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    chevronL: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    // specs de la card expandida
    body: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h11l3 4h1a2 2 0 0 1 2 2v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l3-3"/><path d="M3.5 18a9 9 0 1 1 17 0"/></svg>',
    palette: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8z"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 6.5 8a7 7 0 1 0 11 0z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7a2 2 0 0 0 2 2h7"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M3 10h12"/></svg>',
  };
  const SPEC_ICON = {
    'body type': ICONS.body, 'tipo': ICONS.body,
    'mileage': ICONS.gauge, 'kilometraje': ICONS.gauge,
    'exterior color': ICONS.palette, 'color exterior': ICONS.palette,
    'interior color': ICONS.droplet, 'color interior': ICONS.droplet,
    'transmission': ICONS.gear, 'transmisión': ICONS.gear,
    'fuel type': ICONS.fuel, 'combustible': ICONS.fuel,
  };

  /* ---------------------------------------------------------- mock backend */
  const MOCK_VEHICLES = [
    {
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
      vin: '2HKRS4H56TH111234', stock: 'CR2T49',
      title: 'New 2026 Honda CR-V EX-L Hybrid', price: '$47,021',
      url: '#',
      specs: { 'Body type': 'Sport utility', 'Mileage': '6 km', 'Exterior color': 'Canyon river blue', 'Interior color': 'Black w/ orange stitching', 'Transmission': 'Automatic', 'Fuel type': 'Hybrid' },
    },
    {
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
      vin: '2HGFE1F50N9001122', stock: 'HI812',
      title: 'Used 2024 Honda Civic Sport', price: '$31,480',
      url: '#',
      specs: { 'Body type': 'Sedan', 'Mileage': '18.400 km', 'Exterior color': 'Sonic gray', 'Interior color': 'Black', 'Transmission': 'CVT', 'Fuel type': 'Gasoline' },
    },
    {
      image: 'https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=600&q=80',
      vin: '5FNYF6H01NB005566', stock: 'PL329',
      title: 'New 2026 Honda Pilot TrailSport', price: '$52,346',
      url: '#',
      specs: { 'Body type': 'SUV', 'Mileage': '12 km', 'Exterior color': 'Diffused sky blue', 'Interior color': 'Gray leather', 'Transmission': 'Automatic', 'Fuel type': 'Gasoline' },
    },
  ];
  const mockReply = (text) => new Promise((res) => setTimeout(() => {
    const t = text.toLowerCase();
    if (/invent|veh|auto|car|camion|suv|modelo|comprar|ver/.test(t)) {
      res({ output: 'Encontré algunas opciones que te pueden interesar 👇', vehicles: MOCK_VEHICLES });
    } else {
      res({ output: 'Gracias por tu mensaje. Un asesor puede ayudarte con eso — ¿querés que te muestre el inventario disponible?' });
    }
  }, 650 + Math.random() * 500));

  /* ============================================================== BOOT ==== */
  onReady(async () => {
    // 1) Traer config del backend y mergear: DEFAULTS < backend < embed
    let backendConfig = {};
    if (!MOCK) {
      try {
        const r = await fetch(API.config, { method: 'GET' });
        if (r.ok) backendConfig = await r.json();
      } catch (_) { /* sin config → defaults */ }
    }
    const cfg = Object.assign({}, DEFAULTS, backendConfig, embed.overrides || {});
    // el objeto `text` se mergea aparte (Object.assign es shallow → si no, un `text`
    // parcial del backend borraría los demás labels).
    cfg.text = Object.assign({}, DEFAULTS.text, backendConfig.text, (embed.overrides || {}).text);
    // resolver colores derivados
    cfg.userMessageColor = cfg.userMessageColor || cfg.brandColor;
    cfg.sendButtonColor = cfg.sendButtonColor || cfg.brandColor;
    cfg.inputBorderFocus = cfg.inputBorderFocus || cfg.brandColor;

    injectStyles(cfg);
    const els = buildDOM(cfg);
    new Widget(cfg, els).init();
  });

  /* ============================================================= STYLES === */
  function injectStyles(cfg) {
    const css = `
    /* ---- escudo de aislamiento: reseteamos SOLO las raíces (launcher/hint/panel)
       con all:initial para cortar la herencia del sitio; los hijos conservan sus
       defaults del navegador (div=block, etc.) y solo normalizamos box-sizing/fuente.
       Nuestras reglas por-clase (0,1,0) le ganan a las reglas por-elemento del sitio. */
    .lhw { all: initial; box-sizing: border-box; font-family: ${cfg.fontFamily}; }
    .lhw *, .lhw *::before, .lhw *::after { box-sizing: border-box; font-family: inherit; }
    .lhw svg { display: block; }
    /* reset de elementos con :where() (especificidad 0) → neutraliza al sitio pero
       nuestras clases .lhw-* (0,1,0), declaradas más abajo, siempre le ganan. */
    .lhw :where(button) { background: none; border: none; color: inherit; cursor: pointer; font: inherit; }
    .lhw :where(a) { color: inherit; text-decoration: none; }
    .lhw :where(input, textarea) { background: none; border: none; color: inherit; font: inherit; outline: none; }

    .lhw {
      --brand: ${cfg.brandColor};
      --brand-dark: ${cfg.brandColorDark};
      --bg: ${cfg.chatBackgroundColor};
      --bot-bg: ${cfg.botMessageColor};
      --bot-fg: ${cfg.botMessageTextColor};
      --user-bg: ${cfg.userMessageColor};
      --user-fg: ${cfg.userMessageTextColor};
      --header-fg: ${cfg.headerTextColor};
      --send-bg: ${cfg.sendButtonColor};
      --send-fg: ${cfg.sendButtonIconColor};
      --input-border: ${cfg.inputBorder};
      --input-focus: ${cfg.inputBorderFocus};
      --radius: 20px;
      --shadow: 0 12px 40px -8px rgba(0,0,0,.28), 0 4px 12px -4px rgba(0,0,0,.14);
      position: fixed; z-index: 2147483000;
    }

    /* ----------------------------------------------------------- launcher */
    .lhw-launcher {
      position: fixed; bottom: 22px; right: 22px; width: 62px; height: 62px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      color: #fff; background: linear-gradient(140deg, var(--brand), var(--brand-dark));
      box-shadow: 0 8px 24px -6px rgba(0,0,0,.4); transition: transform .25s ease, box-shadow .25s ease;
      z-index: 2147483000;
    }
    .lhw-launcher:hover { transform: scale(1.07); box-shadow: 0 12px 30px -6px rgba(0,0,0,.45); }
    .lhw-launcher:active { transform: scale(.98); }
    .lhw-launcher.custom { background: transparent; box-shadow: none; width: auto; height: auto; }
    .lhw-launcher.custom img { width: ${cfg.launcherImageSize}; height: auto; display: block; }
    .lhw-launcher .lhw-pulse {
      position: absolute; inset: 0; border-radius: 50%;
      box-shadow: 0 0 0 0 var(--brand); animation: lhw-pulse 2.4s infinite;
    }
    .lhw-launcher.custom .lhw-pulse { display: none; }
    @keyframes lhw-pulse { 0% { box-shadow: 0 0 0 0 rgba(79,70,229,.45); } 70% { box-shadow: 0 0 0 16px rgba(79,70,229,0); } 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); } }
    .lhw-launcher .lhw-badge {
      position: absolute; top: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid #fff; display: none;
    }
    .lhw-launcher.unread .lhw-badge { display: block; }

    /* --------------------------------------------------------------- hint */
    .lhw-hint {
      position: fixed; bottom: 30px; right: 96px; max-width: 190px;
      background: #fff; color: #0f172a; padding: 10px 30px 10px 14px; border-radius: 14px;
      font-size: 13.5px; font-weight: 600; line-height: 1.35; box-shadow: 0 6px 20px -4px rgba(0,0,0,.25);
      z-index: 2147483000; animation: lhw-float 2.6s ease-in-out infinite;
    }
    .lhw-hint::after { content:''; position:absolute; right:-6px; bottom:16px; width:12px; height:12px; background:#fff; transform:rotate(45deg); border-radius:2px; }
    .lhw-hint-close { position:absolute; top:6px; right:8px; font-size:14px; color:#94a3b8; line-height:1; }
    .lhw-hint-close:hover { color:#0f172a; }
    @keyframes lhw-float { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-5px);} }

    /* ------------------------------------------------------------- panel */
    .lhw-panel {
      position: fixed; bottom: 96px; right: 22px; width: 384px; height: min(620px, calc(100vh - 120px));
      background: var(--bg); border-radius: var(--radius); box-shadow: var(--shadow);
      display: flex; flex-direction: column; overflow: hidden; opacity: 0;
      transform: translateY(16px) scale(.98); transform-origin: bottom right; pointer-events: none;
      transition: opacity .28s cubic-bezier(.16,1,.3,1), transform .28s cubic-bezier(.16,1,.3,1);
    }
    .lhw-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

    /* ------------------------------------------------------------ header */
    .lhw-header {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: var(--header-fg);
      background: linear-gradient(135deg, var(--brand), var(--brand-dark)); flex-shrink: 0;
    }
    .lhw-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; background: rgba(255,255,255,.2);
      border: 2px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
    .lhw-hmeta { flex: 1; min-width: 0; }
    .lhw-hname { font-size: 16px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lhw-hstatus { font-size: 12.5px; opacity: .9; display: flex; align-items: center; gap: 6px; margin-top: 1px; }
    .lhw-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.3); }
    .lhw-dot.off { background: #cbd5e1; box-shadow: none; }
    .lhw-hbtn { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      color: var(--header-fg); opacity: .85; transition: background .2s, opacity .2s; }
    .lhw-hbtn:hover { background: rgba(255,255,255,.18); opacity: 1; }

    /* ------------------------------------------------------------- body */
    .lhw-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
    .lhw-body::-webkit-scrollbar { width: 7px; }
    .lhw-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); border-radius: 4px; }

    /* -------------------------------------------------------------- form */
    .lhw-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .lhw-form-intro { font-size: 14px; color: #475569; line-height: 1.45; }
    .lhw-field { display: flex; flex-direction: column; gap: 6px; }
    .lhw-label { font-size: 13px; font-weight: 600; color: #334155; }
    .lhw-input { padding: 11px 13px; border: 1.5px solid var(--input-border); border-radius: 11px; font-size: 14px; color: #0f172a; background: #fff; transition: border-color .18s, box-shadow .18s; width: 100%; }
    .lhw-input::placeholder { color: #94a3b8; }
    .lhw-input:focus { border-color: var(--input-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent); }
    .lhw-input.err { border-color: #ef4444; }
    .lhw-err { color: #ef4444; font-size: 12px; display: none; }
    .lhw-err.show { display: block; }
    .lhw-submit { margin-top: 4px; padding: 13px; border-radius: 12px; font-size: 15px; font-weight: 700; color: #fff;
      background: linear-gradient(135deg, var(--brand), var(--brand-dark)); transition: filter .2s, transform .1s; text-align: center; }
    .lhw-submit:hover { filter: brightness(1.05); }
    .lhw-submit:active { transform: translateY(1px); }
    .lhw-submit[disabled] { opacity: .6; cursor: default; }
    .lhw-privacy { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4; }

    /* ---------------------------------------------------------- messages */
    .lhw-msgs { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .lhw-msg { max-width: 82%; padding: 10px 14px; font-size: 14px; line-height: 1.45; border-radius: 16px; word-wrap: break-word; animation: lhw-in .25s ease; }
    .lhw-msg a { color: inherit; text-decoration: underline; }
    .lhw-bot { align-self: flex-start; background: var(--bot-bg); color: var(--bot-fg); border-bottom-left-radius: 5px; }
    .lhw-user { align-self: flex-end; background: var(--user-bg); color: var(--user-fg); border-bottom-right-radius: 5px; }
    @keyframes lhw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .lhw-typing { align-self: flex-start; display: flex; gap: 4px; padding: 12px 15px; background: var(--bot-bg); border-radius: 16px; border-bottom-left-radius: 5px; }
    .lhw-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--bot-fg); opacity: .5; animation: lhw-bounce 1.4s infinite; }
    .lhw-typing span:nth-child(2){ animation-delay:.2s; } .lhw-typing span:nth-child(3){ animation-delay:.4s; }
    @keyframes lhw-bounce { 0%,60%,100%{ transform: translateY(0);} 30%{ transform: translateY(-5px);} }

    .lhw-quick { display: flex; flex-wrap: wrap; gap: 8px; align-self: flex-start; max-width: 100%; margin-top: 2px; }
    .lhw-quick button { padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; color: var(--brand);
      background: color-mix(in srgb, var(--brand) 10%, #fff); border: 1.5px solid color-mix(in srgb, var(--brand) 22%, transparent); transition: background .2s; }
    .lhw-quick button:hover { background: color-mix(in srgb, var(--brand) 18%, #fff); }

    /* ------------------------------------------------- cards de vehículos */
    .lhw-vcards { align-self: stretch; margin: 2px 0; }
    .lhw-vscroll { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 2px 8px; scrollbar-width: none; }
    .lhw-vscroll::-webkit-scrollbar { display: none; }
    .lhw-vcard { flex: 0 0 200px; scroll-snap-align: start; background: #fff; border: 1px solid #e9edf3; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 8px -2px rgba(0,0,0,.08); display: flex; flex-direction: column; }
    .lhw-vimg { width: 100%; height: 116px; object-fit: cover; background: #eef2f7; }
    .lhw-vbody { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .lhw-vmeta { font-size: 11px; color: #94a3b8; line-height: 1.5; }
    .lhw-vtitle { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.25; margin: 3px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .lhw-vprice { font-size: 17px; font-weight: 800; color: var(--brand); }
    .lhw-vbtns { display: flex; flex-direction: column; border-top: 1px solid #eef2f7; }
    .lhw-vbtn { padding: 10px; font-size: 13px; font-weight: 700; text-align: center; color: var(--brand); transition: background .15s; }
    .lhw-vbtn:hover { background: color-mix(in srgb, var(--brand) 8%, #fff); }
    .lhw-vbtn.sel { border-top: 1px solid #eef2f7; }

    /* ----------------------------------------- card expandida de vehículo */
    .lhw-vdetail { align-self: stretch; background: #fff; border: 1px solid #e9edf3; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 16px -4px rgba(0,0,0,.12); animation: lhw-in .3s ease; }
    .lhw-vdetail img { width: 100%; height: 150px; object-fit: cover; }
    .lhw-vd-body { padding: 14px 16px 16px; }
    .lhw-vd-meta { font-size: 11.5px; color: #94a3b8; text-align: center; line-height: 1.6; }
    .lhw-vd-title { font-size: 17px; font-weight: 800; color: #0f172a; text-align: center; margin: 6px 0 12px; }
    .lhw-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 10px; margin-bottom: 12px; }
    .lhw-spec { display: flex; gap: 8px; align-items: flex-start; }
    .lhw-spec .ic { color: var(--brand); flex-shrink: 0; margin-top: 1px; }
    .lhw-spec-l { font-size: 10.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .02em; }
    .lhw-spec-v { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.25; }
    .lhw-vd-price { text-align: center; font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0 12px; }
    .lhw-vd-price small { display:block; font-size: 11px; color:#94a3b8; font-weight: 600; text-transform: uppercase; }
    .lhw-cta { display: block; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; text-align: center; margin-top: 8px; }
    .lhw-cta.primary { color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-dark)); }
    .lhw-cta.ghost { color: var(--brand); border: 1.5px solid color-mix(in srgb, var(--brand) 40%, transparent); }

    /* ---------------------------------------------------- nota de voz */
    .lhw-voice { align-self: flex-end; display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--user-bg); color: var(--user-fg); border-radius: 16px; border-bottom-right-radius: 5px; max-width: 82%; animation: lhw-in .25s ease; }
    .lhw-voice .pp { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,.25); color: inherit; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lhw-voice .pp:hover { background: rgba(255,255,255,.4); }
    .lhw-voice .bar { flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,.35); position: relative; min-width: 64px; }
    .lhw-voice .bar i { position: absolute; left: 0; top: 0; height: 100%; width: 0; background: currentColor; border-radius: 2px; }
    .lhw-voice .t { font-size: 11px; opacity: .9; min-width: 32px; text-align: right; font-variant-numeric: tabular-nums; }

    /* ------------------------------------------------------------- input */
    .lhw-inputbar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-top: 1px solid #eef2f7; flex-shrink: 0; background: var(--bg); }
    .lhw-ta { flex: 1; padding: 11px 15px; border: 1.5px solid var(--input-border); border-radius: 22px; font-size: 14px; resize: none; max-height: 96px; line-height: 1.4; color: #0f172a; background: #fff; transition: border-color .18s; }
    .lhw-ta:focus { border-color: var(--input-focus); }
    .lhw-circle { width: 42px; height: 42px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--send-fg); background: linear-gradient(135deg, var(--brand), var(--brand-dark)); transition: filter .2s, transform .1s; }
    .lhw-circle:hover { filter: brightness(1.06); } .lhw-circle:active { transform: scale(.94); }
    .lhw-circle.rec { animation: lhw-rec 1.2s infinite; }
    @keyframes lhw-rec { 0%,100%{ box-shadow: 0 0 0 0 rgba(239,68,68,.5);} 50%{ box-shadow: 0 0 0 8px rgba(239,68,68,0);} }

    /* ------------------------------------------------------------ footer */
    .lhw-footer { padding: 7px 14px 9px; text-align: center; font-size: 10.5px; color: #b0b8c4; line-height: 1.5; background: var(--bg); flex-shrink: 0; }
    .lhw-footer a { color: #94a3b8; text-decoration: underline; }

    /* ------------------------------------------------------------ mobile */
    @media (max-width: 480px) {
      .lhw-panel { width: 100vw; height: 100dvh; bottom: 0; right: 0; border-radius: 0; }
      .lhw-hint { display: none; }
    }
    `;
    const style = h('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* =============================================================== DOM ==== */
  function buildDOM(cfg) {
    const t = cfg.text;
    // launcher
    const launcher = h('div', cfg.launcherImage ? 'lhw-launcher custom' : 'lhw-launcher');
    launcher.innerHTML = (cfg.launcherImage
      ? `<img src="${esc(cfg.launcherImage)}" alt="chat">`
      : `<span class="lhw-pulse"></span>${ICONS.chat}`) + '<span class="lhw-badge"></span>';

    // hint
    let hint = null;
    if (cfg.hintEnabled && cfg.hintMessage) {
      hint = h('div', 'lhw-hint', `<span class="lhw-hint-close">${ICONS.close.replace(/width="20" height="20"/, 'width="12" height="12"')}</span><span>${esc(cfg.hintMessage)}</span>`);
    }

    const initials = (cfg.agentName || 'A').trim().charAt(0).toUpperCase();
    const avatar = cfg.agentAvatar
      ? `<img class="lhw-avatar" src="${esc(cfg.agentAvatar)}" alt="${esc(cfg.agentName)}">`
      : `<div class="lhw-avatar">${esc(initials)}</div>`;
    const offline = cfg.agentStatus && cfg.agentStatus.toLowerCase() === 'offline';

    // panel
    const panel = h('div', 'lhw-panel');
    panel.innerHTML = `
      <div class="lhw-header">
        ${avatar}
        <div class="lhw-hmeta">
          <div class="lhw-hname">${esc(cfg.agentName)}</div>
          <div class="lhw-hstatus"><span class="lhw-dot ${offline ? 'off' : ''}"></span>${esc(cfg.agentStatus || '')}</div>
        </div>
        <button class="lhw-hbtn lhw-min" aria-label="${esc(t.minimizeAria)}">${ICONS.minimize}</button>
      </div>
      <div class="lhw-body">
        <form class="lhw-form" novalidate>
          <div class="lhw-form-intro">${esc(cfg.formIntro)}</div>
          <div class="lhw-field">
            <label class="lhw-label" for="lhw-name">${esc(t.nameLabel)}</label>
            <input class="lhw-input" id="lhw-name" type="text" placeholder="${esc(t.namePlaceholder)}" autocomplete="name">
            <div class="lhw-err" data-for="name">${esc(t.nameError)}</div>
          </div>
          <div class="lhw-field">
            <label class="lhw-label" for="lhw-email">${esc(t.emailLabel)}</label>
            <input class="lhw-input" id="lhw-email" type="email" placeholder="${esc(t.emailPlaceholder)}" autocomplete="email">
            <div class="lhw-err" data-for="email">${esc(t.emailError)}</div>
          </div>
          <div class="lhw-field">
            <label class="lhw-label" for="lhw-phone">${esc(t.phoneLabel)}</label>
            <input class="lhw-input" id="lhw-phone" type="tel" placeholder="${esc(t.phonePlaceholder)}" autocomplete="tel">
            <div class="lhw-err" data-for="phone">${esc(t.phoneError)}</div>
          </div>
          <div class="lhw-recaptcha"></div>
          <div class="lhw-err" data-for="form"></div>
          <button type="submit" class="lhw-submit">${esc(cfg.startButtonText)}</button>
          <div class="lhw-privacy">${esc(t.privacy)}</div>
        </form>
        <div class="lhw-msgs" style="display:none"></div>
      </div>
      <div class="lhw-inputbar" style="display:none">
        <textarea class="lhw-ta" rows="1" placeholder="${esc(cfg.inputPlaceholder)}"></textarea>
        ${cfg.activateMic ? `<button class="lhw-circle lhw-mic" aria-label="${esc(t.micAria)}">${ICONS.mic}</button>` : ''}
        <button class="lhw-circle lhw-send" aria-label="${esc(t.sendAria)}">${ICONS.send}</button>
      </div>
      <div class="lhw-footer">
        ${cfg.poweredByUrl ? `<a href="${esc(cfg.poweredByUrl)}" target="_blank" rel="noopener">${esc(cfg.poweredByText)}</a>` : esc(cfg.poweredByText)}
      </div>
    `;

    document.body.appendChild(launcher);
    if (hint) document.body.appendChild(hint);
    document.body.appendChild(panel);
    // las 3 raíces llevan .lhw para heredar el escudo de aislamiento y las CSS vars
    launcher.classList.add('lhw'); panel.classList.add('lhw'); if (hint) hint.classList.add('lhw');

    return {
      launcher, hint, panel,
      minBtn: panel.querySelector('.lhw-min'),
      body: panel.querySelector('.lhw-body'),
      form: panel.querySelector('.lhw-form'),
      recaptcha: panel.querySelector('.lhw-recaptcha'),
      msgs: panel.querySelector('.lhw-msgs'),
      inputbar: panel.querySelector('.lhw-inputbar'),
      ta: panel.querySelector('.lhw-ta'),
      send: panel.querySelector('.lhw-send'),
      mic: panel.querySelector('.lhw-mic'),
      badge: launcher.querySelector('.lhw-badge'),
    };
  }

  /* ============================================================ WIDGET ==== */
  function Widget(cfg, els) {
    this.cfg = cfg; this.els = els;
    this.sessionId = localStorage.getItem(LS_SESSION) || null;
    this.messages = JSON.parse(localStorage.getItem(LS_MESSAGES) || '[]');
    this.busy = false;
    this.opened = false;
    this.recorder = null;
    this.chunks = [];
  }

  Widget.prototype.init = function () {
    const { els } = this;

    els.launcher.addEventListener('click', () => this.toggle());
    els.minBtn.addEventListener('click', () => this.close());
    if (els.hint) {
      els.hint.querySelector('.lhw-hint-close').addEventListener('click', (e) => { e.stopPropagation(); els.hint.style.display = 'none'; });
      els.hint.addEventListener('click', () => this.toggle());
    }

    els.form.addEventListener('submit', (e) => { e.preventDefault(); this.register(); });
    els.send.addEventListener('click', () => this.sendCurrent());
    els.ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendCurrent(); }
    });
    els.ta.addEventListener('input', () => { els.ta.style.height = 'auto'; els.ta.style.height = Math.min(els.ta.scrollHeight, 96) + 'px'; });
    if (els.mic) els.mic.addEventListener('click', () => this.toggleMic());

    // reCAPTCHA (si el client tiene site key). Se renderiza cuando cargue el script de Google.
    if (this.cfg.recaptchaSiteKey && !MOCK) this.loadRecaptcha();
  };

  /* ---- abrir / cerrar --------------------------------------------------- */
  Widget.prototype.toggle = function () { this.els.panel.classList.contains('open') ? this.close() : this.open(); };
  Widget.prototype.open = function () {
    this.els.panel.classList.add('open');
    this.els.launcher.classList.remove('unread');
    if (this.els.hint) this.els.hint.style.display = 'none';
    if (!this.opened) { this.opened = true; this.ping(); }
  };
  Widget.prototype.close = function () { this.els.panel.classList.remove('open'); };

  /* ---- sesión: ping para saber si seguimos logueados -------------------- */
  Widget.prototype.ping = function () {
    if (MOCK) { if (this.sessionId) this.showChat(); else this.showForm(); return; }
    if (!this.sessionId) { this.showForm(); return; }
    fetch(API.ping, { method: 'GET', headers: { 'x-session-id': this.sessionId } })
      .then((r) => { r.ok ? this.showChat() : this.resetSession(); })
      .catch(() => this.resetSession());
  };

  Widget.prototype.resetSession = function () {
    this.sessionId = null; this.messages = [];
    localStorage.removeItem(LS_SESSION); localStorage.removeItem(LS_MESSAGES);
    this.showForm();
  };

  /* ---- vistas ----------------------------------------------------------- */
  Widget.prototype.showForm = function () {
    this.els.form.style.display = 'flex';
    this.els.msgs.style.display = 'none';
    this.els.inputbar.style.display = 'none';
  };
  Widget.prototype.showChat = function () {
    this.els.form.style.display = 'none';
    this.els.msgs.style.display = 'flex';
    this.els.inputbar.style.display = 'flex';
    if (this.messages.length === 0) {
      this.printBot(this.cfg.welcomeMessage);
      this.printQuickReplies(this.cfg.quickReplies);
    } else {
      this.messages.forEach((m) => m.role === 'user' ? this.printUser(m.content) : this.printBot(m.content, m.vehicles));
      this.scroll();
    }
  };

  /* ---- registro (cuestionario → lead/login) ----------------------------- */
  Widget.prototype.register = function () {
    const { els, cfg } = this;
    const t = cfg.text;
    const name = els.panel.querySelector('#lhw-name');
    const email = els.panel.querySelector('#lhw-email');
    const phone = els.panel.querySelector('#lhw-phone');
    const errs = els.panel.querySelectorAll('.lhw-err');
    errs.forEach((e) => e.classList.remove('show'));
    [name, email, phone].forEach((i) => i.classList.remove('err'));

    const showErr = (key, msg) => {
      const el = els.panel.querySelector(`.lhw-err[data-for="${key}"]`);
      if (msg) el.textContent = msg;
      el.classList.add('show');
    };
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    const captcha = (window.grecaptcha && this._captchaId != null) ? window.grecaptcha.getResponse(this._captchaId) : '';

    let ok = true;
    if (!name.value.trim()) { showErr('name'); name.classList.add('err'); ok = false; }
    if (!emailOk) { showErr('email'); email.classList.add('err'); ok = false; }
    if (!phone.value.trim()) { showErr('phone'); phone.classList.add('err'); ok = false; }
    if (cfg.recaptchaSiteKey && !captcha && !MOCK) { showErr('form', t.captchaError); ok = false; }
    if (!ok) return;

    const btn = els.form.querySelector('.lhw-submit');
    btn.disabled = true; btn.textContent = t.starting;
    const restore = () => { btn.disabled = false; btn.textContent = cfg.startButtonText; };

    const payload = { contact_name: name.value.trim(), email: email.value.trim(), phone_number: phone.value.trim() };

    if (MOCK) { this.sessionId = 'mock-session'; localStorage.setItem(LS_SESSION, this.sessionId); restore(); this.showChat(); return; }

    fetch(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-captcha-token': captcha || '' },
      body: JSON.stringify(payload),
    })
      .then((r) => { if (!r.ok) return r.json().then((b) => { throw new Error(mapError(b, t)); }); return r.json(); })
      .then((data) => {
        if (!data.session_id) throw new Error(t.noSession);
        this.sessionId = data.session_id;
        localStorage.setItem(LS_SESSION, this.sessionId);
        restore();
        this.showChat();
      })
      .catch((err) => {
        showErr('form', err.message || t.loginFail);
        restore();
        if (window.grecaptcha && this._captchaId != null) window.grecaptcha.reset(this._captchaId);
      });
  };

  /* ---- mensajes --------------------------------------------------------- */
  Widget.prototype.sendCurrent = function () { this.send(this.els.ta.value.trim()); };
  Widget.prototype.send = function (text) {
    if (!text || this.busy) return;
    const tx = this.cfg.text;
    const quick = this.els.msgs.querySelector('.lhw-quick');
    if (quick) quick.remove();
    this.els.ta.value = ''; this.els.ta.style.height = 'auto';
    this.addUser(text);
    const typing = this.showTyping();
    this.busy = true;

    const done = () => { this.busy = false; };
    const req = MOCK
      ? mockReply(text)
      : fetch(API.chat, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': this.sessionId },
          body: JSON.stringify({ message: text }),
        }).then((r) => { if (!r.ok) return r.json().then((b) => { throw new Error(mapError(b, tx)); }); return r.json(); });

    req
      .then((data) => { typing.remove(); this.addBot(data.output || tx.botFallback, data.vehicles); })
      .catch((err) => { typing.remove(); this.addBot(err.message || tx.errGeneric); })
      .finally(done);
  };

  Widget.prototype.addUser = function (text) {
    this.printUser(text);
    this.messages.push({ role: 'user', content: text });
    this.persist();
  };
  Widget.prototype.addBot = function (text, vehicles) {
    this.printBot(text, vehicles);
    this.messages.push({ role: 'assistant', content: text, vehicles: vehicles || null });
    this.persist();
    if (!this.els.panel.classList.contains('open')) this.els.launcher.classList.add('unread');
  };
  Widget.prototype.persist = function () { localStorage.setItem(LS_MESSAGES, JSON.stringify(this.messages)); };

  Widget.prototype.printUser = function (text) {
    const el = h('div', 'lhw-msg lhw-user'); el.textContent = text;
    this.els.msgs.appendChild(el); this.scroll();
  };
  Widget.prototype.printBot = function (text, vehicles) {
    let html = esc(text).replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const el = h('div', 'lhw-msg lhw-bot', html);
    this.els.msgs.appendChild(el);
    if (vehicles && vehicles.length && this.cfg.vehicleCards) this.printVehicles(vehicles);
    this.scroll();
  };

  Widget.prototype.printQuickReplies = function (options) {
    if (!options || !options.length) return;
    const box = h('div', 'lhw-quick');
    options.forEach((opt) => {
      const b = h('button'); b.textContent = opt;
      b.addEventListener('click', () => { box.remove(); this.send(opt); });
      box.appendChild(b);
    });
    this.els.msgs.appendChild(box); this.scroll();
  };

  /* ---- cards de vehículos (carousel + expandida) ------------------------ */
  Widget.prototype.printVehicles = function (vehicles) {
    const t = this.cfg.text;
    const wrap = h('div', 'lhw-vcards');
    const scroll = h('div', 'lhw-vscroll');
    vehicles.forEach((v) => {
      const card = h('div', 'lhw-vcard');
      card.innerHTML = `
        <img class="lhw-vimg" src="${esc(v.image || '')}" alt="${esc(v.title || '')}" loading="lazy">
        <div class="lhw-vbody">
          <div class="lhw-vmeta">${v.vin ? esc(t.vinLabel) + ': ' + esc(String(v.vin).slice(0, 12)) + '…' : ''}${v.stock ? '<br>' + esc(t.stockLabel) + ': ' + esc(v.stock) : ''}</div>
          <div class="lhw-vtitle">${esc(v.title || '')}</div>
          <div class="lhw-vprice">${esc(v.price || '')}</div>
        </div>
        <div class="lhw-vbtns">
          <div class="lhw-vbtn det">${esc(t.vDetail)}</div>
          <div class="lhw-vbtn sel">${esc(t.vSelect)}</div>
        </div>`;
      card.querySelector('.det').addEventListener('click', () => this.printVehicleDetail(v));
      card.querySelector('.sel').addEventListener('click', () => this.send(`${t.vInterested} ${v.title}`));
      scroll.appendChild(card);
    });
    wrap.appendChild(scroll);
    this.els.msgs.appendChild(wrap);
    this.scroll();
  };

  Widget.prototype.printVehicleDetail = function (v) {
    const t = this.cfg.text;
    const specs = v.specs || {};
    const rows = Object.keys(specs).map((k) => {
      const ic = SPEC_ICON[k.toLowerCase()] || ICONS.body;
      return `<div class="lhw-spec"><span class="ic">${ic}</span><span><span class="lhw-spec-l">${esc(k)}</span><br><span class="lhw-spec-v">${esc(specs[k])}</span></span></div>`;
    }).join('');
    const card = h('div', 'lhw-vdetail');
    card.innerHTML = `
      <img src="${esc(v.image || '')}" alt="${esc(v.title || '')}">
      <div class="lhw-vd-body">
        <div class="lhw-vd-meta">${v.vin ? esc(t.vinLabel) + ': ' + esc(v.vin) : ''}${v.stock ? ' · ' + esc(t.stockLabel) + ': ' + esc(v.stock) : ''}</div>
        <div class="lhw-vd-title">${esc(v.title || '')}</div>
        <div class="lhw-specs">${rows}</div>
        <div class="lhw-vd-price"><small>${esc(t.priceLabel)}</small>${esc(v.price || '')}</div>
        <a class="lhw-cta primary" href="${esc((v.ctaPrimary && v.ctaPrimary.url) || v.url || '#')}" target="_blank" rel="noopener">${esc((v.ctaPrimary && v.ctaPrimary.label) || t.ctaPrimary)}</a>
        <a class="lhw-cta ghost" href="${esc((v.ctaSecondary && v.ctaSecondary.url) || v.url || '#')}" target="_blank" rel="noopener">${esc((v.ctaSecondary && v.ctaSecondary.label) || t.ctaSecondary)}</a>
      </div>`;
    this.els.msgs.appendChild(card);
    this.scroll();
  };

  /* ---- nota de voz reproducible (in-session) ---------------------------- */
  Widget.prototype.printAudio = function (url) {
    const wrap = h('div', 'lhw-voice');
    wrap.innerHTML = `<button class="pp" aria-label="Reproducir">${ICONS.play}</button><span class="bar"><i></i></span><span class="t">0:00</span>`;
    const audio = new Audio(url);
    const pp = wrap.querySelector('.pp');
    const fill = wrap.querySelector('.bar i');
    const time = wrap.querySelector('.t');
    const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    pp.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });
    audio.addEventListener('play', () => { pp.innerHTML = ICONS.pause; });
    audio.addEventListener('pause', () => { pp.innerHTML = ICONS.play; });
    audio.addEventListener('ended', () => { pp.innerHTML = ICONS.play; fill.style.width = '0'; time.textContent = '0:00'; });
    audio.addEventListener('timeupdate', () => {
      const d = isFinite(audio.duration) ? audio.duration : 0;
      fill.style.width = (d ? (audio.currentTime / d * 100) : 0) + '%';
      time.textContent = fmt(audio.currentTime);
    });
    this.els.msgs.appendChild(wrap);
    this.scroll();
  };

  /* ---- typing / scroll -------------------------------------------------- */
  Widget.prototype.showTyping = function () {
    const el = h('div', 'lhw-typing', '<span></span><span></span><span></span>');
    this.els.msgs.appendChild(el); this.scroll();
    return el;
  };
  Widget.prototype.scroll = function () { this.els.body.scrollTop = this.els.body.scrollHeight; };

  /* ---- reCAPTCHA -------------------------------------------------------- */
  Widget.prototype.loadRecaptcha = function () {
    const render = () => {
      if (!window.grecaptcha || !window.grecaptcha.render) return setTimeout(render, 300);
      try { this._captchaId = window.grecaptcha.render(this.els.recaptcha, { sitekey: this.cfg.recaptchaSiteKey }); } catch (_) {}
    };
    if (!document.querySelector('script[data-lhw-recaptcha]')) {
      const s = h('script'); s.src = 'https://www.google.com/recaptcha/api.js'; s.async = true; s.defer = true;
      s.setAttribute('data-lhw-recaptcha', '1'); document.head.appendChild(s);
    }
    render();
  };

  /* ---- mic (audio → /voice, opcional) ----------------------------------- */
  Widget.prototype.toggleMic = function () {
    const btn = this.els.mic;
    if (this.recorder && this.recorder.state === 'recording') { this.recorder.stop(); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.recorder = new MediaRecorder(stream); this.chunks = [];
      this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
      this.recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        btn.classList.remove('rec'); btn.innerHTML = ICONS.mic;
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.printAudio(URL.createObjectURL(blob)); // burbuja de voz reproducible (in-session)
        // TODO: POST /voice cuando el gateway soporte audio (transcribir/responder)
      };
      this.recorder.start(); btn.classList.add('rec');
    }).catch(() => {});
  };

  /* ---- mapeo de errores del gateway ------------------------------------- */
  function mapError(body, t) {
    switch (body && body.code) {
      case 'SESSION_NOT_FOUND':
      case 'SESSION_CLIENT_INVALID': return t.errSession;
      case 'MAX_SESSION_COUNT_REACHED': return t.errLimit;
      case 'ORIGIN_NOT_ALLOWED': return t.errOrigin;
      case 'CAPTCHA_INVALID': return t.errCaptcha;
      default: return t.errGeneric;
    }
  }
})();
