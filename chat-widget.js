// Immediately-invoked function expression to avoid polluting global scope
(function() {
    // Hardcoded configuration
    const config = {
        webhookUrl: 'https://leadhookai-pre.up.railway.app/app-backend-api/v1/chat',
        title: window.ChatWidgetConfig.title || 'AI Support Assistant',
        welcomeMessage: window.ChatWidgetConfig.welcomeMessage || 'Please provide your information to start chatting.',
        recaptchaSiteKey: window.ChatWidgetConfig.recaptchaSiteKey || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
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
    cssLink.href = 'chat-widget.css';
    document.head.appendChild(cssLink);
    
    // Load HTML template
    fetch('chat-template.html')
        .then(response => response.text())
        .then(html => {
            // Insert the HTML into the document
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const widgetContainer = tempDiv.firstChild;
            document.body.appendChild(widgetContainer);
            
            // Set reCAPTCHA site key
            const recaptchaDiv = widgetContainer.querySelector('.g-recaptcha');
            recaptchaDiv.setAttribute('data-sitekey', config.recaptchaSiteKey);
            
            // Set title
            const titleElement = widgetContainer.querySelector('.chat-title');
            titleElement.textContent = config.title;
            
            // Initialize event listeners and functionality
            initializeChat(widgetContainer, config);
        })
        .catch(error => {
            console.error('Error loading chat template:', error);
        });
    
    function initializeChat(widgetContainer, config) {

        // State variables
        let sessionId = localStorage.getItem("sessionId") || null;
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
        
        sendButton.addEventListener('click', debounce(sendMessage, 500));

        makePing();

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
        
        function sendMessage() {
            const messageText = chatInput.value.trim();
            if (!messageText || isWaitingForResponse) return;
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
                    throw new Error('Message sending failed');
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
                addBotMessage('Sorry, there was an error processing your message. Please try again.');
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
            const messageElement = document.createElement('div');
            messageElement.className = 'message bot-message';
            messageElement.innerHTML =text.replace(/\n/g, '<br>');
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
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
        }

        function makePing() {
            const headers = {};
            if (sessionId) {
                headers["lh-session-id"] = sessionId;
              }
            fetch('https://example.com', {        
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

    // Not allow multiple clicks
    function debounce(func, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }
})();