// internal-widget-company-wc.js
(function () {
    class LhChatWidget extends HTMLElement {
      connectedCallback() {
        // Leer configuración desde atributo data-config
        let configSource = {};
        const raw = this.getAttribute('data-config');
        if (raw) {
          try { configSource = JSON.parse(raw); } catch (e) { console.warn('lh-chat-widget: config JSON inválido', e); }
        }
  
        // Make host invisible to layout and not capture pointer events
        try {
          this.style.cssText = 'display:block; width:0; height:0; padding:0; margin:0; border:0; overflow:visible; pointer-events:none;';
          this.setAttribute('aria-hidden', 'true');
        } catch (e) {
          console.warn('lh-chat-widget: no se pudo setear estilo del host', e);
        }
  
        // Guard contra multiples montados
        if (window.widgetCoreLoaded) return;
        window.widgetCoreLoaded = true;
  
        // Exponer configSource para compatibilidad
        window.ChatWidgetConfig = configSource;
  
        // Construir config final
        const config = {
          webhookUrl: 'https://leadhookai-pre.up.railway.app/app-backend-api/v1/internal-widget-company/chat',
          title: configSource.title || 'Internal Support Assistant',
          welcomeMessage: configSource.welcomeMessage || "Hi! I'm your virtual assistant. How can i help you?",
          quickReplies: configSource.quickReplies || ['Option 1','Option 2'],
          fontFamily : configSource.fontFamily || "Arial",
          hintPosition : configSource.hintPosition === 'top' ? 'bottom: 90px; right: 20px;' : 'bottom: 20px; right: 90px;',
          hintMessage : configSource.hintMessage || 'Ask me anything I\'m here to help',
          apiKey : configSource.apiKey || '123',
          chatBackgroundColor : configSource.chatBackgroundColor || 'white',
          inputBorder : configSource.inputBorder || '#e5e7eb',
          inputBorderHover : configSource.inputBorderHover || "#4f46e5",
          headerColor : configSource.headerColor || '#4f46e5',
          messageColor : configSource.messageColor || '#4f46e5',
          messageTextColor : configSource.messageTextColor || 'white',
          botMessageColor : configSource.botMessageColor || '#e0e7ff',
          botMessageTextColor : configSource.botMessageTextColor || '#1f2937',
          sendButtonColor : configSource.sendButtonColor || '#4f46e5',
          sendButtonIconColor : configSource.sendButtonIconColor || 'white',
          sendButtonHooverColor: configSource.sendButtonHooverColor || "#4338ca",
          buttonIconColor : configSource.buttonIconColor || '#4f46e5',
        };
  
        // Helper robusto para inyectar estilos
        function safeAppendStyle(cssText) {
          const s = document.createElement('style');
          s.type = 'text/css';
          s.textContent = cssText;
          const target = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
          try {
            target.appendChild(s);
          } catch (e) {
            console.warn('lh-chat-widget: append style failed', e);
            try { document.documentElement.appendChild(s); } catch (_) { /* give up silently */ }
          }
          return s;
        }
  
        // Esperar DOM listo
        function onReady(fn) {
          if (document.readyState !== 'loading') fn();
          else document.addEventListener('DOMContentLoaded', fn);
        }
  
        onReady(() => {
          console.log('lh-chat-widget: connectedCallback, config=', config);
  
          // INYECCIÓN DE ESTILOS
          safeAppendStyle(`
            .lh-chat-launcher { position: fixed; bottom: 20px; right: 20px;
              width: 60px; height: 60px; background-color: ${config.buttonIconColor};
              border-radius: 50%; display: flex; align-items: center;
              justify-content: center; cursor: pointer;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              transition: transform 0.3s ease; z-index: 2147483647; pointer-events: auto !important; }
            .lh-chat-launcher .lh-chat-launcher-icon { font-size: 28px; }
            .lh-chat-launcher.unread::after { content: ''; position: absolute; top: 10px; right: 10px; width: 10px; height: 10px; background-color: red; border-radius: 50%; display: block; box-shadow: 0 0 2px #fff; }
            .lh-chat-launcher:hover { transform: scale(1.05); }
            #lh-chat-hint { position: fixed; ${config.hintPosition} max-width: 130px; white-space: normal; overflow-wrap: break-word; text-align: center; background-color:rgb(255, 255, 255); color:rgb(0, 0, 0); padding: 8px 12px; border-radius: 12px; font-family: ${config.fontFamily}; font-size: 14px; font-weight: bold; line-height: 1.3; box-shadow: 0 2px 6px rgba(0,0,0,0.15); z-index: 2147483647; animation: bounce 1.5s infinite; pointer-events: auto !important; }
            .lh-chat-hint-close { position: absolute; top: 6px; right: 6px; font-size: 12px; font-weight: normal; color: #666; background: transparent; border: none; cursor: pointer; z-index: 2147483648; padding: 0; line-height: 1; }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          `);
  
          safeAppendStyle(`
            .lh-chat-widget { --light-color: #e0e7ff; --text-color: #1f2937; --border-color: ${config.inputBorder}; --shadow: 0 4px 6px rgba(0, 0, 0, 0.1); --radius: 12px; --font-family: ${config.fontFamily}; font-family: var(--font-family); }
            .lh-chat-widget * { font-family: var(--font-family); }
            .lh-chat-window { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background-color: ${config.chatBackgroundColor}; border-radius: var(--radius); box-shadow: var(--shadow); display: none; flex-direction: column; overflow: hidden; z-index: 2147483646; transition: all 0.3s ease; pointer-events: auto !important; }
            .lh-chat-window.active { display: flex; }
            .lh-chat-header { background-color: ${config.headerColor}; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${config.inputBorder}; }
            .lh-chat-title { margin: 0; font-size: 18px; font-weight: 600; color: white; }
            .lh-chat-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; }
            .lh-chat-messages { flex: 1; padding: 15px; overflow-y: auto; display: none; flex-direction: column; gap: 10px; background: transparent; }
            .lh-chat-input-container { padding: 15px; border-top: 1px solid var(--border-color); display: none; gap: 10px; }
            .lh-chat-input { flex: 1; padding: 10px 15px; border: 1px solid ${config.inputBorder}; background-color: ${config.chatBackgroundColor}; border-radius: 20px; font-size: 14px; resize: none; max-height: 100px; overflow-y: auto; }
            .lh-chat-input:focus { outline: none; border-color: ${config.inputBorderHover}; }
            .lh-send-button, .lh-record-button { width: 40px; height: 40px; background-color: ${config.sendButtonColor}; color: ${config.sendButtonIconColor}; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.3s ease; }
            .lh-send-button:hover, .lh-record-button:hover { background-color: ${config.sendButtonHooverColor}; }
            .lh-typing-indicator { display: flex; align-items: center; gap: 5px; padding: 10px 15px; background-color: ${config.botMessageColor}; border-radius: 18px; border-bottom-left-radius: 5px; align-self: flex-start; margin-bottom: 5px; }
            .lh-typing-dot { width: 8px; height: 8px; background-color: ${config.botMessageTextColor}; border-radius: 50%; animation: typing 1.4s infinite ease-in-out; }
            .lh-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .lh-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
            .lh-quick-reply-container { display: flex; flex-direction: column; gap: 8px; margin: 10px 0; align-self: flex-start; max-width: 80%; align-items: flex-start; }
            .lh-quick-reply-button { background-color: #e0e0e0; color: #333; border: none; border-radius: 15px; padding: 8px 15px; cursor: pointer; font-size: 14px; transition: background-color 0.3s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .lh-quick-reply-button:hover { background-color: #d0d0d0; }
          `);
  
          // Critical overrides to avoid editor collisions
          safeAppendStyle(`
            .lh-chat-launcher { pointer-events: auto !important; z-index: 2147483647 !important; }
            .lh-chat-window { pointer-events: auto !important; z-index: 2147483646 !important; }
            .lh-chat-widget, lh-chat-widget { display: block !important; width: 0 !important; height: 0 !important; pointer-events: none !important; overflow: visible !important; }
          `);
  
          // Crear launcher
          const launcher = document.createElement('div');
          launcher.id = 'lh-chat-launcher';
          launcher.className = 'lh-chat-launcher';
          launcher.innerHTML = '<span class="lh-chat-launcher-icon">💬</span>';
          launcher.style.pointerEvents = 'auto';
          launcher.style.zIndex = '2147483647';
          launcher.style.position = 'fixed';
          launcher.style.bottom = '20px';
          launcher.style.right = '20px';
          launcher.style.width = '60px';
          launcher.style.height = '60px';
          launcher.style.display = 'flex';
          launcher.style.alignItems = 'center';
          launcher.style.justifyContent = 'center';
          document.body.appendChild(launcher);
  
          // Crear hint
          const chatHint = document.createElement('div');
          chatHint.id = 'lh-chat-hint';
          chatHint.innerHTML = `
            <button class="lh-chat-hint-close" aria-label="close hint">&times;</button>
            <span class="lh-chat-hint-text">${config.hintMessage}</span>
          `;
          document.body.appendChild(chatHint);
          const hintClose = chatHint.querySelector('.lh-chat-hint-close');
          if (hintClose) hintClose.addEventListener('click', () => { chatHint.style.display = 'none'; });
  
          // Plantilla del widget
          const html = `
            <div class="lh-chat-widget">
              <div class="lh-chat-window">
                <div class="lh-chat-header">
                  <h3 class="lh-chat-title">${config.title}</h3>
                  <button class="lh-chat-close" aria-label="close chat">&times;</button>
                </div>
                <div class="lh-chat-messages" style="display: none;"></div>
                <div class="lh-chat-input-container" style="display: none;">
                  <textarea class="lh-chat-input" placeholder="Type your message..."></textarea>
                  <button class="lh-record-button" aria-label="record">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-mic">
                      <path d="M12 1v11"></path><path d="M8 5a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0z"></path>
                      <line x1="19" y1="10" x2="19" y2="10"></line><line x1="5" y1="10" x2="5" y2="10"></line>
                      <path d="M12 15v4"></path><path d="M8 19h8"></path>
                    </svg>
                  </button>
                  <button class="lh-send-button" aria-label="send">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
          const temp = document.createElement('template');
          temp.innerHTML = html.trim();
          const widgetContainer = temp.content.firstElementChild;
          document.body.appendChild(widgetContainer);
  
          // Ensure DOM painted before manipulating
          requestAnimationFrame(() => {
            const titleEl = document.querySelector('.lh-chat-title');
            if (titleEl) titleEl.textContent = config.title || 'Soporte';
            else console.warn('lh-chat-widget: .lh-chat-title no encontrada in requestAnimationFrame');
          });
  
          // Inicialización (lógica adaptada)
          initializeChat(widgetContainer, config);
  
          // launcher click handler toggles chat
          launcher.addEventListener('click', () => {
            try {
              const w = document.querySelector('.lh-chat-window');
              if (w) {
                w.classList.toggle('active');
                const messages = w.querySelector('.lh-chat-messages');
                const inputContainer = w.querySelector('.lh-chat-input-container');
                if (w.classList.contains('active')) {
                  if (messages) messages.style.display = 'flex';
                  if (inputContainer) inputContainer.style.display = 'flex';
                } else {
                  if (messages) messages.style.display = 'none';
                  if (inputContainer) inputContainer.style.display = 'none';
                }
              }
            } catch (e) {
              console.error('lh-chat-widget: error en launcher click', e);
            }
          });
  
        }); // onReady
      } // end connectedCallback
  
      static get observedAttributes() { return ['data-config']; }
      attributeChangedCallback(name, oldVal, newVal) {
        if (name !== 'data-config' || !newVal) return;
        try {
          const newConfig = JSON.parse(newVal);
          const titleEl = document.querySelector('.lh-chat-title');
          if (titleEl && newConfig.title) titleEl.textContent = newConfig.title;
        } catch (e) {
          console.warn('lh-chat-widget: invalid JSON in attributeChangedCallback', e);
        }
      }
    }
  
    // initializeChat function
    function initializeChat(widgetContainer, config) {
      let sessionId = localStorage.getItem("sessionId") || null;
      let firstPing = false;
      let isWaitingForResponse = false;
      let messages = JSON.parse(localStorage.getItem('lh-chat-messages') || '[]');
      let recorder;
      let audioChunks = [];
  
      const chatLauncher = document.getElementById('lh-chat-launcher');
      const chatWindow = widgetContainer.querySelector('.lh-chat-window');
      const closeButton = chatWindow ? chatWindow.querySelector('.lh-chat-close') : null;
      const chatMessages = chatWindow ? chatWindow.querySelector('.lh-chat-messages') : null;
      const chatInputContainer = chatWindow ? chatWindow.querySelector('.lh-chat-input-container') : null;
      const chatInput = chatWindow ? chatWindow.querySelector('.lh-chat-input') : null;
      const sendButton = chatWindow ? chatWindow.querySelector('.lh-send-button') : null;
      const recordButton = chatWindow ? chatWindow.querySelector('.lh-record-button') : null;
  
      if (chatMessages) chatMessages.style.display = 'none';
      if (chatInputContainer) chatInputContainer.style.display = 'none';
  
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          if (chatWindow) chatWindow.classList.remove('active');
          if (chatMessages) chatMessages.style.display = 'none';
          if (chatInputContainer) chatInputContainer.style.display = 'none';
        });
      }
  
      if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });
      }
  
      if (sendButton) {
        sendButton.addEventListener('click', function(event) {
          event.preventDefault();
          sendMessage();
        });
      }
  
      if (recordButton) {
        recordButton.addEventListener('click', async () => {
          try {
            if (!recorder || recorder.state === 'inactive') {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              recorder = new MediaRecorder(stream);
              audioChunks = [];
              recorder.ondataavailable = e => audioChunks.push(e.data);
              recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToBackend(audioBlob);
                stopRecording();
              };
              recorder.start();
              recordButton.textContent = '⏹️';
            } else {
              stopRecording();
            }
          } catch (err) {
            console.error('lh-chat-widget: recorder error', err);
          }
        });
      }
  
      function sendMessage(message) {
        const messageText = message || (chatInput ? chatInput.value.trim() : '');
        if (!messageText || isWaitingForResponse) return;
        const quickReplyContainer = chatMessages ? chatMessages.querySelector('.lh-quick-reply-container') : null;
        if (quickReplyContainer) quickReplyContainer.remove();
        if (chatInput) chatInput.value = '';
        addUserMessage(messageText);
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'lh-typing-indicator';
        typingIndicator.innerHTML = `
          <div class="lh-typing-dot"></div>
          <div class="lh-typing-dot"></div>
          <div class="lh-typing-dot"></div>
        `;
        if (chatMessages) chatMessages.appendChild(typingIndicator);
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        isWaitingForResponse = true;
        fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'lh-session-id': sessionId,
            'lh-api-key': config.apiKey
          },
          body: JSON.stringify({ message: messageText })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(errorBody => { throw new Error(manageExceptions(errorBody)); });
          }
          return response.json();
        })
        .then(data => {
          if (chatMessages && typingIndicator && typingIndicator.parentNode) chatMessages.removeChild(typingIndicator);
          addBotMessage(data.output || 'Sorry, I didn\'t understand that.');
        })
        .catch(error => {
          console.error('Message error:', error);
          if (chatMessages && typingIndicator && typingIndicator.parentNode) chatMessages.removeChild(typingIndicator);
          addBotMessage(error.message || 'Sorry, there was an error processing your message. Please try again.');
        })
        .finally(() => { isWaitingForResponse = false; });
      }
  
      function addUserMessage(text) {
        printUserMessage(text);
        messages.push({ role: 'user', content: text });
        localStorage.setItem('lh-chat-messages', JSON.stringify(messages));
      }
  
      function addBotMessage(text) {
        printBotMessage(text);
        messages.push({ role: 'assistant', content: text });
        localStorage.setItem('lh-chat-messages', JSON.stringify(messages));
      }
  
      function printUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'lh-message lh-user-message';
        messageElement.textContent = text;
        if (chatMessages) chatMessages.appendChild(messageElement);
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
      }
  
      function printBotMessage(text) {
        text = text.replace(/\n/g, '<br>');
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        const messageElement = document.createElement('div');
        messageElement.className = 'lh-message lh-bot-message';
        messageElement.innerHTML = text;
        if (chatMessages) chatMessages.appendChild(messageElement);
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        if (chatWindow && !chatWindow.classList.contains('active')) {
          if (chatLauncher) chatLauncher.classList.add('unread');
        }
      }
  
      function reloadChat() {
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'flex';
        if (messages.length < 1) {
          addBotMessage(config.welcomeMessage);
          addQuickReplyButtons(config.quickReplies);
        } else {
          messages.forEach((message, index) => {
            if (message.role === 'user' && index != messages.length - 1) {
              printUserMessage(message.content);
            } else if (message.role === 'assistant') {
              printBotMessage(message.content);
            }
          });
          if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }
  
      function addQuickReplyButtons(options) {
        if (!chatMessages) return;
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.className = 'lh-quick-reply-container';
        options.forEach(option => {
          const button = document.createElement('button');
          button.className = 'lh-quick-reply-button';
          button.textContent = option;
          button.addEventListener('click', () => {
            sendMessage(option);
            quickReplyContainer.remove();
          });
          quickReplyContainer.appendChild(button);
        });
        chatMessages.appendChild(quickReplyContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
  
      function getAuthToken() {
        const headers = {};
        if (sessionId) headers["lh-session-id"] = sessionId;
        headers["lh-api-key"] = config.apiKey;
        fetch(config.webhookUrl + '/login', { method: 'POST', headers })
          .then(response => {
            if (!response.ok) {
              return response.json().then(errorBody => { throw new Error(manageExceptions(errorBody)); });
            }
            return response.json();
          })
          .then(data => {
            const authHeader = data.session_id;
            if (!authHeader) throw new Error('SessionId missing.');
            sessionId = authHeader;
            localStorage.setItem("sessionId", sessionId);
            reloadChat();
          })
          .catch(() => { console.log("Can't load chat."); });
      }
  
      function makePing() {
        const headers = {};
        if (sessionId) headers["lh-session-id"] = sessionId;
        headers["lh-api-key"] = config.apiKey;
        fetch(config.webhookUrl + '/login/ping', { method: 'GET', headers })
          .then(response => {
            if (!response.ok) {
              messages = [];
              localStorage.removeItem('lh-chat-messages');
              sessionId = null;
              localStorage.removeItem("sessionId");
              getAuthToken();
            } else {
              reloadChat();
            }
          })
          .catch(() => { /* reloadForm undefined in this context; ignore or implement if needed */ });
      }
  
      function sendAudioToBackend(blob) {
        if (chatInput) chatInput.value = '';
        addUserMessage('Audio sent');
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'lh-typing-indicator';
        typingIndicator.innerHTML = `
          <div class="lh-typing-dot"></div>
          <div class="lh-typing-dot"></div>
          <div class="lh-typing-dot"></div>
        `;
        if (chatMessages) chatMessages.appendChild(typingIndicator);
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        isWaitingForResponse = true;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          fetch(config.webhookUrl + "/voice", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'lh-session-id': sessionId,
              'lh-api-key': config.apiKey
            },
            body: JSON.stringify({ audio: base64Audio })
          })
            .then(response => {
              if (!response.ok) {
                return response.json().then(errorBody => { throw new Error(manageExceptions(errorBody)); });
              }
              return response.json();
            })
            .then(data => {
              if (chatMessages && typingIndicator && typingIndicator.parentNode) chatMessages.removeChild(typingIndicator);
              addBotMessage(data.output || 'Sorry, I didn\'t understand that.');
            })
            .catch(error => {
              console.error('Message error:', error);
              if (chatMessages && typingIndicator && typingIndicator.parentNode) chatMessages.removeChild(typingIndicator);
              addBotMessage(error.message || 'Sorry, there was an error processing your message. Please try again.');
              stopRecording();
            })
            .finally(() => {
              isWaitingForResponse = false;
              stopRecording();
            });
        };
        reader.readAsDataURL(blob);
      }
  
      function stopRecording() {
        try {
          if (recorder && recorder.state === 'recording') recorder.stop();
          if (recorder && recorder.stream) recorder.stream.getTracks().forEach(track => track.stop());
          const micIconSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-mic">
              <path d="M12 1v11"></path>
              <path d="M8 5a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0z"></path>
              <line x1="19" y1="10" x2="19" y2="10"></line>
              <line x1="5" y1="10" x2="5" y2="10"></line>
              <path d="M12 15v4"></path>
              <path d="M8 19h8"></path>
            </svg>
          `;
          if (recordButton) recordButton.innerHTML = micIconSVG;
        } catch (e) {
          console.warn('lh-chat-widget: stopRecording error', e);
        }
      }
  
      function manageExceptions(error) {
        let errorCode = error && error.code;
        switch (errorCode) {
          case 'SESSION_ID_NOT_FOUND': return 'Your session has ended. Please refresh the page to start a new one.';
          case 'MAX_SESSION_COUNT_REACHED': return 'Our system has reached its hourly limit. Please try again later.';
          case 'MAX_LIMIT_COUNT_REACHED': return 'Message limit reached! You’ll be able to send more messages in around 30 minutes.';
          default: return 'Sorry, there was an error processing your message. Please try again.';
        }
      }
    }
  
    customElements.define('lh-chat-widget', LhChatWidget);
  })();
  