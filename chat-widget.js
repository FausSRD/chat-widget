(function() {
    const config = {
        // webhookUrl: 'https://leadhookai-pre.up.railway.app/app-backend-api/v1/chat',
        webhookUrl: 'http://localhost:8080/app-backend-api/v1/chat',
        title: window.ChatWidgetConfig.title || 'LeadhookAi Support Assistant',
        welcomeMessage: window.ChatWidgetConfig.welcomeMessage || 'Hello stranger, welcome to the demo.',
        recaptchaSiteKey: window.ChatWidgetConfig.recaptchaSiteKey || '6LcZP20rAAAAAERBTJc5DFZGGyU7RJuoOqWEC5xf'
    };
    
    // Load reCAPTCHA script
    const recaptchaScript = document.createElement('script');
    recaptchaScript.src = 'https://www.google.com/recaptcha/api.js';
    recaptchaScript.async = true;
    recaptchaScript.defer = true;
    document.head.appendChild(recaptchaScript);
    
    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://lhai-chat-widget-pre.up.railway.app/chat-widget.css';
    // cssLink.href = './chat-widget.css';
    document.head.appendChild(cssLink);

    const html = `
    <div class="chat-widget">
        <div class="chat-launcher">
            <span class="chat-launcher-icon">💬</span>
        </div>
        <div class="chat-window">
            <div class="chat-header">
                <h3 class="chat-title">AI Support Assistant</h3>
                <button class="chat-close">&times;</button>
            </div>
            <div class="registration-form">
                <div class="form-group">
                    <label class="form-label" for="name">Name</label>
                    <input type="text" id="name" class="form-input" placeholder="Enter your name">
                    <div class="error-message" id="name-error">Please enter your name</div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="email">Email</label>
                    <input type="email" id="email" class="form-input" placeholder="Enter your email">
                    <div class="error-message" id="email-error">Please enter a valid email</div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="phone">Phone Number</label>
                    <input type="tel" id="phone" class="form-input" placeholder="Enter your phone number">
                    <div class="error-message" id="phone-error">Please enter a valid phone number</div>
                </div>
                <div class="g-recaptcha" data-sitekey=""></div>
                <div class="error-message" id="recaptcha-error">Please complete the reCAPTCHA</div>
                <button type="button" class="submit-button" id="submit-registration">Start Chat</button>
            </div>
            <div class="chat-messages" style="display: none;"></div>
            <div class="chat-input-container" style="display: none;">
                <textarea class="chat-input" placeholder="Type your message..."></textarea>
                <button class="send-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const widgetContainer = tempDiv.querySelector('.chat-widget');
    document.body.appendChild(widgetContainer);
    
    // Set reCAPTCHA site key
    const recaptchaDiv = widgetContainer.querySelector('.g-recaptcha');
    recaptchaDiv.setAttribute('data-sitekey', config.recaptchaSiteKey);
    
    // Set title
    const titleElement = widgetContainer.querySelector('.chat-title');
    titleElement.textContent = config.title;
    
    // Initialize event listeners and functionality
    initializeChat(widgetContainer, config);
    
    function initializeChat(widgetContainer, config) {

        // State variables
        let sessionId = localStorage.getItem("sessionId") || null;
        let firstPing = false;
        let userData = null;
        let isWaitingForResponse = false;
        
        // Get DOM elements
        const chatLauncher = widgetContainer.querySelector('.chat-launcher');
        const chatWindow = widgetContainer.querySelector('.chat-window');
        const closeButton = chatWindow.querySelector('.chat-close');
        const registrationForm = chatWindow.querySelector('.registration-form');
        const chatMessages = chatWindow.querySelector('.chat-messages');
        const chatInputContainer = chatWindow.querySelector('.chat-input-container');
        const submitButton = chatWindow.querySelector('#submit-registration');
        const chatInput = chatWindow.querySelector('.chat-input');
        const sendButton = chatWindow.querySelector('.send-button');

        // Event listeners for every action
        chatLauncher.addEventListener('click', function() {
            chatWindow.classList.add('active');
            chatLauncher.classList.remove('unread');
            // Solo hacer ping la primera vez que se abre el chat
            if (!firstPing) {
                makePing();
                firstPing = true;
            }
        });

        closeButton.addEventListener('click', function() {
            chatWindow.classList.remove('active');
        });
        
        submitButton.addEventListener('click', handleRegistration);
        
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        sendButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevenir comportamiento por defecto
            sendMessage(); // Llamar a sendMessage sin parámetros
        });
        
        // Eliminar esta línea que está fuera del evento
        // makePing();

        // Functions
        function handleRegistration() {
            const nameInput = chatWindow.querySelector('#name');
            const emailInput = chatWindow.querySelector('#email');
            const phoneInput = chatWindow.querySelector('#phone');
            const nameError = chatWindow.querySelector('#name-error');
            const emailError = chatWindow.querySelector('#email-error');
            const phoneError = chatWindow.querySelector('#phone-error');
            const recaptchaError = chatWindow.querySelector('#recaptcha-error');
            
            // Reset error messages
            nameError.style.display = 'none';
            emailError.style.display = 'none';
            phoneError.style.display = 'none';
            recaptchaError.style.display = 'none';
            
            // Get values
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const recaptchaResponse = grecaptcha ? grecaptcha.getResponse() : '';
            
            // Validate
            let isValid = true;
            
            if (!name) {
                nameError.style.display = 'block';
                isValid = false;
            }
            
            if (!email || !isValidEmail(email)) {
                emailError.style.display = 'block';
                isValid = false;
            }
            
            if (!phone) {
                phoneError.style.display = 'block';
                isValid = false;
            }
            
            if (config.recaptchaSiteKey && !recaptchaResponse) {
                recaptchaError.style.display = 'block';
                isValid = false;
            }
            
            if (!isValid) return;
            
            // Generate session ID
            userData = { name, email, phone };
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Starting chat...';
            
            // Send registration data to webhook without waiting for response
            fetch(config.webhookUrl + "/login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Captcha-Token': recaptchaResponse
                },
                body: JSON.stringify({
                    action: 'register',
                    contact_name: name,
                    email: email,
                    phone_number: phone
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Message sending failed');
                }
                return response.json();
                // Verificar si el header de autenticación existe
            })
            .then(data => {
                const authHeader = data.session_id;
                
                if (!authHeader) {
                    throw new Error('Falta el header de autenticación');
                }
                // Guardar el token de autenticación para futuras solicitudes
                sessionId = authHeader;
                localStorage.setItem("sessionId", sessionId);
                reloadChat();
                
                submitButton.disabled = false;
                submitButton.textContent = 'Start Chat';
            })
            .catch(error => {
                console.error('Error de inicio de sesión:', error);
                // Mostrar mensaje de error
                recaptchaError.textContent = 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
                recaptchaError.style.display = 'block';
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = 'Start Chat';
                
                // Si es necesario, reiniciar reCAPTCHA
                if (grecaptcha) {
                    grecaptcha.reset();
                }
            });
        }
        
        function sendMessage(message) {
            const messageText = message || chatInput.value.trim();
            if (!messageText || isWaitingForResponse) return;
            const quickReplyContainer = chatMessages.querySelector('.quick-reply-container');
            if (quickReplyContainer) {
                quickReplyContainer.remove();
            }
            // Clear input
            chatInput.value = '';
            // Add user message to chat
            addUserMessage(messageText);
            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            isWaitingForResponse = true;
            // Send message to webhook
            fetch(config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lh-session-id': sessionId
                },
                body: JSON.stringify({
                    message: messageText,
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorBody => {
                        throw new Error(manageExceptions(errorBody));
                    });
                }
                return response.json();
            })
            .then(data => {
                // Remove typing indicator
                chatMessages.removeChild(typingIndicator);
                
                // Add bot response
                addBotMessage(data.output || 'Sorry, I didn\'t understand that.');
            })
            .catch(error => {
                console.error('Message error:', error);
                // Remove typing indicator
                chatMessages.removeChild(typingIndicator);
                // Add error message
                addBotMessage(error.message || 'Sorry, there was an error processing your message. Please try again.');
            })
            .finally(() => {
                isWaitingForResponse = false;
            });
        }
        
        function addUserMessage(text) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message user-message';
            messageElement.textContent = text;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        function addBotMessage(text) {
            // Reemplazar saltos de línea por <br>
            text = text.replace(/\n/g, '<br>');
            // Reemplazar enlaces estilo Markdown por <a>
            text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
            const messageElement = document.createElement('div');
            messageElement.className = 'message bot-message';
            messageElement.innerHTML = text;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            if (!chatWindow.classList.contains('active')) {
                chatLauncher.classList.add('unread');
            }
        }
        
        function isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        function reloadForm() {
            localStorage.removeItem("sessionId")
            userData = null;
            isWaitingForResponse = false;
            registrationForm.style.display = 'flex';
            chatMessages.style.display = 'none';
            chatInputContainer.style.display = 'none';
        }

        function reloadChat() {
            registrationForm.style.display = 'none';
            chatMessages.style.display = 'flex';
            chatInputContainer.style.display = 'flex';
            // Add welcome message
            addBotMessage(config.welcomeMessage);
            addQuickReplyButtons([
                'Browse Newest Inventory',
                'Apply for Financing',
                'Schedule a Test Ride'
            ]);
        }

        function addQuickReplyButtons(options) {
            const quickReplyContainer = document.createElement('div');
            quickReplyContainer.className = 'quick-reply-container';

            options.forEach(option => {
                const button = document.createElement('button');
                button.className = 'quick-reply-button';
                button.textContent = option;
                button.addEventListener('click', () => {
                    sendMessage(option);
                    quickReplyContainer.remove(); // Remove buttons after one is clicked
                });
                quickReplyContainer.appendChild(button);
            });
            chatMessages.appendChild(quickReplyContainer);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function makePing() {
            const headers = {};
            if (sessionId) {
                headers["lh-session-id"] = sessionId;
              }
            fetch(config.webhookUrl + '/login/still-alive', {        
                method: 'GET',
                headers: headers
            })
                .then(response => {
                    if (response.ok) {
                        reloadChat();
                    } else {
                        reloadForm();
                    }
                })
                .catch(error => {
                    reloadForm();
                });
        }
    }

    function manageExceptions(error) {
        let errorCode = error.code;
        switch (errorCode) {
            case 'SESSION_ID_NOT_FOUND': return 'Your session has ended. Please refresh the page to start a new one.';
            case 'MAX_SESSION_COUNT_REACHED': return 'Our system has reached its hourly limit. Please try again later.';
            case 'MAX_LIMIT_COUNT_REACHED': return 'Message limit reached! You’ll be able to send more messages in around 30 minutes.';
            default: return 'Sorry, there was an error processing your message. Please try again.';
        }
    }
})();