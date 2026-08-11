# Chat Widget v1 — LEAD (público)

Widget de captación de leads con **cuestionario + chat**, embebible en cualquier sitio
(WordPress, Wix, Elementor, HTML plano). Reescritura moderna del widget viejo, con la
**config servida desde el backend** y **cards de vehículos**.

> Este es el chat **normal / público** (producto `LEAD`). El **internal** (empresa, con api-key)
> es un widget aparte.

## Archivos

| Archivo | Qué es |
|---|---|
| `chat-widget.js` | El widget (IIFE autocontenido). Es lo que se embebe en el sitio del cliente. |
| `index.html` | Demo con selector de temas (aplica `overrides`). Necesita el gateway levantado. |
| `index2.html` | Ejemplo de embed real (snippet tal cual lo pega un cliente). |
| `widget-config.default.json` | **Template completo** con TODAS las claves y sus defaults — copiá y editá al dar de alta un client. |
| `README.md` | Esto. |

## Previsualizar (local)

Serví la carpeta y abrí `index.html` o `index2.html`. **Necesitan el widget-gateway levantado**
(`localhost:8080`) y el client `clientTest` activo. Completá el cuestionario y chateá contra el backend
real. El selector de temas de `index.html` aplica `overrides` sobre la config del backend, para ver el
nivel de customización.

## Embed en producción

El snippet solo aporta la **conexión** (`clientId` + `gatewayUrl`). El resto (estilos, textos, colores,
avatar, quick replies, etc.) lo trae el widget desde `GET /api/v2/config/{clientId}`.

```html
<script>
  window.ChatWidgetConfig = {
    clientId: 'clientTest',                 // slug del client (data-client-id)
    gatewayUrl: 'https://tu-gateway.up.railway.app'
  };
</script>
<script src="https://tu-cdn/chat-widget/v1/chat-widget.js" defer></script>
```

El header `Origin` lo pone el navegador solo; el gateway resuelve el client por ese Origin, así que
el sitio donde se embebe tiene que coincidir con el `host` del client en la DB.

### Parámetros de conexión (`window.ChatWidgetConfig`)

| Campo | Req. | Descripción |
|---|---|---|
| `clientId` | sí | Slug del client. Se usa para pedir la config y como namespace de `localStorage`. |
| `gatewayUrl` | sí | URL base del widget-gateway (sin barra final). |
| `overrides` | no | Objeto que pisa la config del backend (dev/preview). En prod no se usa. |

Merge de config: `DEFAULTS < widget_config (backend) < overrides (embed)`.

## `widget_config` (lo que sirve el backend)

Es el JSONB de la columna `widget_config` del client. **Todo es opcional** (hay defaults). Es **público**
(no metas secretos acá).

> 🚀 **Dar de alta un client:** copiá [`widget-config.default.json`](widget-config.default.json) (tiene
> TODAS las claves con sus defaults), editá lo que cambie para ese client, y pegalo en su `widget_config`.
> Como el widget mergea `DEFAULTS < backend`, en la práctica **solo hace falta guardar lo que difiere** del
> default — pero tener el template completo a mano hace el onboarding trivial.

| Campo | Default | Descripción |
|---|---|---|
| `title` | `"Asistente virtual"` | Título interno. |
| `agentName` | `"Asistente"` | Nombre del agente en el header. |
| `agentAvatar` | `null` | URL de la foto del agente (círculo). Si es null, muestra la inicial. |
| `agentStatus` | `"Online"` | `"Online"` \| `"Offline"` (color del punto). |
| `brandColor` | `#4f46e5` | Color principal (header, botones, acentos). |
| `brandColorDark` | `#4338ca` | Variante oscura (gradiente/hover). |
| `launcherImage` | `null` | Imagen custom del botón flotante (si no, ícono default). |
| `launcherImageSize` | `64px` | Tamaño de la imagen del launcher. |
| `hintMessage` | `"Escribime…"` | Burbuja de invitación al lado del launcher. |
| `hintEnabled` | `true` | Muestra/oculta la burbuja. |
| `welcomeMessage` | `"¡Hola!…"` | Primer mensaje del bot. |
| `formIntro` | `"Antes de empezar…"` | Texto arriba del cuestionario. |
| `inputPlaceholder` | `"Escribí tu mensaje..."` | Placeholder del input. |
| `quickReplies` | `["Ver inventario",…]` | Botones de respuesta rápida iniciales. |
| `startButtonText` | `"Empezar chat"` | Texto del botón del form. |
| `poweredByText` | `"Powered by FullGrowth"` | Texto del footer. |
| `poweredByUrl` | `null` | Si está, el footer es un link. |
| `chatBackgroundColor` | `#ffffff` | Fondo del panel. |
| `headerTextColor` | `#ffffff` | Color del texto del header. |
| `userMessageColor` | `brandColor` | Fondo de las burbujas del usuario. |
| `userMessageTextColor` | `#ffffff` | Texto de las burbujas del usuario. |
| `botMessageColor` | `#f1f5f9` | Fondo de las burbujas del bot. |
| `botMessageTextColor` | `#0f172a` | Texto de las burbujas del bot. |
| `sendButtonColor` | `brandColor` | Fondo del botón enviar. |
| `sendButtonIconColor` | `#ffffff` | Ícono del botón enviar. |
| `inputBorder` | `#e5e7eb` | Borde de los inputs. |
| `inputBorderFocus` | `brandColor` | Borde de los inputs en foco. |
| `fontFamily` | `Inter, …` | Fuente del widget. |
| `recaptchaSiteKey` | `null` | **Site key pública** de reCAPTCHA (si el client requiere captcha). |
| `activateMic` | `false` | Muestra el botón de audio (voz). |
| `vehicleCards` | `true` | Habilita el render de cards de vehículos. |
| `text` | (ver abajo) | Objeto con **todos** los textos de UI ("chrome") para i18n. |

### Textos / i18n — objeto `text`

Todo el "chrome" del widget (labels del cuestionario, errores, botones de las cards, aria-labels)
sale del objeto `text`, así que el widget funciona en **cualquier idioma** (es/en/pt/de/…). El backend
puede mandar un `text` **parcial**: se mergea con los defaults (no hace falta mandar todas las claves).

```jsonc
"text": {
  "nameLabel": "Name", "namePlaceholder": "Your name",
  "emailLabel": "Email", "emailPlaceholder": "you@email.com",
  "phoneLabel": "Phone", "phonePlaceholder": "+1 555 555 5555",
  "nameError": "Enter your name", "emailError": "Enter a valid email",
  "phoneError": "Enter a valid phone", "captchaError": "Complete the reCAPTCHA",
  "privacy": "By continuing you agree to be contacted.",
  "recaptchaNotice": "Protected by reCAPTCHA.",   // solo se muestra si el client usa captcha
  "starting": "Starting...",
  "minimizeAria": "Minimize", "sendAria": "Send", "micAria": "Record",
  "vinLabel": "VIN", "stockLabel": "Stock #", "priceLabel": "Price",
  "vDetail": "View details", "vSelect": "I'm interested",
  "vInterested": "I'm interested in the",
  "ctaPrimary": "Visit us in person", "ctaSecondary": "Go to vehicle page",
  "errSession": "Your session ended. Refresh the page to start again.",
  "errLimit": "You hit the message limit. Try again shortly.",
  "errOrigin": "This site is not enabled for chat.",
  "errCaptcha": "reCAPTCHA failed. Please try again.",
  "errGeneric": "There was an error. Please try again.",
  "loginFail": "We couldn't start the chat. Please try again.",
  "noSession": "No session received.",
  "botFallback": "Sorry, I didn't get that.",
  "audioDisabled": "Audio isn't enabled in this version yet.",
  "audioSent": "🎤 Audio sent"
}
```

> El **contenido** (welcomeMessage, formIntro, quickReplies, inputPlaceholder, startButtonText,
> poweredByText, hintMessage) también es configurable, pero vive en el nivel superior del config,
> no dentro de `text` (chrome vs contenido).

## Contrato con el gateway (producto LEAD)

| Método | Endpoint | Headers | Body | Respuesta |
|---|---|---|---|---|
| `GET` | `/api/v2/config/{clientId}` | — | — | `widget_config` (JSON) |
| `POST` | `/api/v2/widget/lead/login` | `x-captcha-token` | `{contact_name, email, phone_number}` | `{session_id}` |
| `POST` | `/api/v2/widget/lead/chat` | `x-session-id` | `{message}` | `{output, vehicles?}` |
| `POST` | `/api/v2/widget/lead/voice` | `x-session-id` | `{audio}` (base64) | `{output}` |
| `GET` | `/api/v2/widget/lead/login/ping` | `x-session-id` | — | `200` \| `403` |

Errores: `{code, message, status}`. Códigos mapeados a mensajes de usuario: `SESSION_NOT_FOUND`,
`SESSION_CLIENT_INVALID`, `MAX_SESSION_COUNT_REACHED`, `ORIGIN_NOT_ALLOWED`, `CAPTCHA_INVALID`.

### Cards de vehículos (contrato)

> ✅ **Implementado end-to-end.** Si n8n devuelve JSON `{output, vehicles}`, el gateway lo parsea
> (`ChatResponseConverter`) y reenvía `vehicles` tal cual (passthrough, no modela el schema); si devuelve
> texto plano → solo `output`, sin cards (compat). El widget renderiza el carousel y el detalle solos.
> Falta solo que el n8n **real** arme ese JSON (probable en modo mock con el toggle de `mock-n8n.js`).

```jsonc
// Respuesta esperada de POST /lead/chat cuando aplique:
{
  "output": "Encontré algunas opciones 👇",
  "vehicles": [
    {
      "image": "https://.../car.jpg",
      "vin": "2HKRS4H56TH111234",
      "stock": "CR2T49",
      "title": "New 2026 Honda CR-V EX-L Hybrid",
      "price": "$47,021",
      "url": "https://dealer.com/vehiculo/123",
      "specs": {                         // se muestran en el detalle; la card surfacea un subset
        "Year": "2026",
        "Body type": "Sport utility",
        "Mileage": "6 km",
        "Exterior color": "Canyon river blue",
        "Interior color": "Black w/ orange stitching",
        "Transmission": "Automatic",
        "Fuel type": "Hybrid"
      },
      "ctaPrimary":   { "label": "Quiero visitarlos", "url": "https://..." },
      "ctaSecondary": { "label": "Ver ficha",         "url": "https://..." }
    }
  ]
}
```

Las claves de `specs` matchean íconos (Year, Body type, Mileage/Kilometraje, Exterior/Interior color,
Transmission, Fuel type — en inglés o español); las que no matchean usan un ícono default. **La card del
carousel muestra hasta 3** de esos specs por prioridad (km → año → combustible → transmisión); **el detalle
muestra todos**.

## Notas

- **Aislamiento CSS**: se resetea solo la raíz con `all: initial` para cortar la herencia del sitio;
  las reglas por-clase le ganan a las reglas por-elemento del host. (No usamos Shadow DOM para no
  romper el render de reCAPTCHA v2.)
- **Persistencia**: `sessionId` y mensajes se guardan en `localStorage` namespaceados por `clientId`
  (`lh:{clientId}:session`, `lh:{clientId}:messages`).
- **reCAPTCHA**: se renderiza solo si `recaptchaSiteKey` está seteado. La verificación real la hace
  el `CaptchaFilter` del gateway (que ahora soporta secret por-client, con fallback al global).
- **Prod**: el archivo servido puede ir gzip (`.gz`) como los widgets viejos.
