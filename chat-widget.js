(function() {
    const configSource = window.ChatWidgetConfig || {}
    const config = {
        // webhookUrl: 'https://leadhookai-pre.up.railway.app/app-backend-api/v1/chat',
        webhookUrl: 'http://localhost:8080/app-backend-api/v1/chat',
        title: configSource.title || 'DealerPRO Support Assistant',
        welcomeMessage: configSource.welcomeMessage || "Hi! I'm your virtual assistant. How can i help you?",
        recaptchaSiteKey: configSource.recaptchaSiteKey || '6LcZP20rAAAAAERBTJc5DFZGGyU7RJuoOqWEC5xf',
        quickReplies: configSource.quickReplies || ['Browse Newest Inventory','Apply for Financing','Schedule a Test Ride'],
        primaryColor: configSource.primaryColor || "#4f46e5",
        secondaryColor: configSource.secondaryColor || "#4338ca",
        buttonIconColor : configSource.buttonIconColor || '#4f46e5',
        fontFamily : configSource.fontFamily || "Arial",
        hintPosition : configSource.hintPosition === 'top' ? 'bottom: 90px; right: 20px;' : 'bottom: 20px; right: 90px;',
    }

  function onReady(fn) {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }
  console.log('Font family:', config.fontFamily);
  onReady(() => {
    const loaderCSS = document.createElement('style')
    loaderCSS.textContent = `
      .lh-chat-launcher { position: fixed; bottom: 20px; right: 20px;
        width: 60px; height: 60px; background-color: ${config.buttonIconColor};
        border-radius: 50%; display: flex; align-items: center;
        justify-content: center; cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease; z-index: 9999;
      }
      .lh-chat-launcher .lh-chat-launcher-icon { font-size: 28px; }
      .lh-chat-launcher::after { content: '';
        position: absolute; top: 10px; right: 10px;
        width: 10px; height: 10px; background-color: red;
        border-radius: 50%; display: none; box-shadow: 0 0 2px #fff;
      }
      .lh-chat-launcher.unread::after { display: block; }
      .lh-chat-launcher:hover { transform: scale(1.05); }
      #lh-chat-hint {
        position: fixed;
        ${config.hintPosition}
        max-width: 130px;
        white-space: normal;
        overflow-wrap: break-word;
        text-align: center;
        background-color:rgb(255, 255, 255);
        color:rgb(0, 0, 0);
        padding: 8px 12px;
        border-radius: 12px;
        font-family: ${config.fontFamily};
        font-size: 14px;
        font-weight: bold;
        line-height: 1.3;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: bounce 1.5s infinite;
    }

    .lh-chat-hint-close {
        position: absolute;
        top: 6px;
        right: 6px;
        font-size: 14px;
        font-weight: normal;
        color: #666;
        background: transparent;
        border: none;
        cursor: pointer;
        z-index: 10000;
        padding: 0;
        line-height: 1;
    }

    .lh-chat-hint-close:hover {
        color: #000;
    }

    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    `
    document.head.appendChild(loaderCSS)

    const launcher = document.createElement('div')
    launcher.id = 'lh-chat-launcher'
    launcher.className = 'lh-chat-launcher'
    launcher.innerHTML = '<span class="lh-chat-launcher-icon">💬</span>'
    document.body.appendChild(launcher)

    const chatHint = document.createElement('div')
    chatHint.id = 'lh-chat-hint'
    chatHint.innerHTML = `
        <span class="lh-chat-hint-close">&times;</span>
        <span class="lh-chat-hint-text">Ask me anything I'm here to help</span>
    `
    document.body.appendChild(chatHint)
    chatHint.querySelector('.lh-chat-hint-close').addEventListener('click', () => {
        chatHint.style.display = 'none';
      });

    function loadWidgetCore() {
      if (window.widgetCoreLoaded) return
      window.widgetCoreLoaded = true

      const recaptchaScript = document.createElement('script')
      recaptchaScript.src   = 'https://www.google.com/recaptcha/api.js'
      recaptchaScript.async = true
      recaptchaScript.defer = true
      document.head.appendChild(recaptchaScript)

      const completeStyle = document.createElement('style')
      completeStyle.textContent = `
        .lh-chat-widget {
            --primary-color: ${config.primaryColor};
            --secondary-color: ${config.secondaryColor};
            --light-color: #e0e7ff;
            --text-color: #1f2937;
            --border-color: #e5e7eb;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --radius: 12px;
            --font-family: ${config.fontFamily};
            font-family: var(--font-family);
        }

        .lh-chat-widget * {
            font-family: var(--font-family);
        }

        .lh-chat-window {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 350px;
            height: 500px;
            background-color: white;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 9999;
            transition: all 0.3s ease;
        }

        .lh-chat-window.active {
            display: flex;
        }

        .lh-chat-header {
            background-color: var(--primary-color);
            color: white;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .lh-chat-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .lh-chat-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
        }

        .lh-registration-form {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            overflow-y: auto;
        }

        .lh-form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .lh-form-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color);
        }

        .lh-form-input {
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 14px;
        }

        .lh-form-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        .lh-error-message {
            color: #ef4444;
            font-size: 12px;
            margin-top: 3px;
            display: none;
        }

        .lh-submit-button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 10px;
            transition: background-color 0.3s ease;
        }

        .lh-submit-button:hover {
            background-color: var(--secondary-color);
        }

        .lh-chat-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            display: none;
        }

        .lh-message {
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 18px;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .lh-bot-message {
            align-self: flex-start;
            background-color: var(--light-color);
            color: var(--text-color);
            border-bottom-left-radius: 5px;
        }

        .lh-user-message {
            align-self: flex-end;
            background-color: var(--primary-color);
            color: white;
            border-bottom-right-radius: 5px;
        }

        .lh-chat-input-container {
            padding: 15px;
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 10px;
            display: none;
        }

        .lh-chat-input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid var(--border-color);
            border-radius: 20px;
            font-size: 14px;
            resize: none;
            max-height: 100px;
            overflow-y: auto;
        }

        .lh-chat-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        .lh-send-button {
            width: 40px;
            height: 40px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .lh-send-button:hover {
            background-color: var(--secondary-color);
        }

        .lh-typing-indicator {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 10px 15px;
            background-color: var(--light-color);
            border-radius: 18px;
            border-bottom-left-radius: 5px;
            align-self: flex-start;
            margin-bottom: 5px;
        }

        .lh-typing-dot {
            width: 8px;
            height: 8px;
            background-color: #6b7280;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }

        .lh-typing-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .lh-typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .lh-typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-5px);
            }
        }

        .lh-quick-reply-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
            margin-bottom: 10px;
            /* Removed justify-content: center; */
            align-self: flex-start;
            max-width: 80%; /* Keep max-width for the container */
            align-items: flex-start; /* Align items to the start (left) */
        }

        .lh-quick-reply-button {
            background-color: #e0e0e0;
            color: #333;
            border: none;
            border-radius: 15px;
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .lh-quick-reply-button:hover {
            background-color: #d0d0d0;
        }

        .lh-quick-reply-button:active {
            background-color: #c0c0c0;
            transform: translateY(1px);
        }
        `
        document.head.appendChild(completeStyle)

        const html = `
        <div class="lh-chat-widget">
            <div class="lh-chat-window">
                <div class="lh-chat-header">
                    <h3 class="lh-chat-title">AI Support Assistant</h3>
                    <button class="lh-chat-close">&times;</button>
                </div>
                <div class="lh-registration-form">
                    <div class="lh-form-group">
                        <label class="lh-form-label" for="name">Name</label>
                        <input type="text" id="name" class="lh-form-input" placeholder="Enter your name">
                        <div class="lh-error-message" id="name-error">Please enter your name</div>
                    </div>
                    <div class="lh-form-group">
                        <label class="lh-form-label" for="email">Email</label>
                        <input type="email" id="email" class="lh-form-input" placeholder="Enter your email">
                        <div class="lh-error-message" id="email-error">Please enter a valid email</div>
                    </div>
                    <div class="lh-form-group">
                        <label class="lh-form-label" for="phone">Phone Number</label>
                        <input type="tel" id="phone" class="lh-form-input" placeholder="Enter your phone number">
                        <div class="lh-error-message" id="phone-error">Please enter a valid phone number</div>
                    </div>
                    <div class="g-recaptcha" data-sitekey=""></div>
                    <div class="lh-error-message" id="recaptcha-error">Please complete the reCAPTCHA</div>
                    <button type="button" class="lh-submit-button" id="submit-registration">Start Chat</button>
                </div>
                <div class="lh-chat-messages" style="display: none;"></div>
                <div class="lh-chat-input-container" style="display: none;">
                    <textarea class="lh-chat-input" placeholder="Type your message..."></textarea>
                    <button class="lh-send-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        `
        const temp = document.createElement('template')
        temp.innerHTML = html.trim()
        const widgetContainer = temp.content.firstElementChild
        document.body.appendChild(widgetContainer)

        widgetContainer
            .querySelector('.g-recaptcha')
            .setAttribute('data-sitekey', config.recaptchaSiteKey)
        widgetContainer
            .querySelector('.lh-chat-title')
            .textContent = config.title


        initializeChat(widgetContainer, config)

        function initializeChat(widgetContainer, config) {

            // State variables
            let sessionId = localStorage.getItem("sessionId") || null;
            let firstPing = false;
            let isWaitingForResponse = false;
            let messages = JSON.parse(localStorage.getItem('lh-chat-messages') || '[]')
            
            // Get DOM elements
            const chatLauncher = document.getElementById('lh-chat-launcher');
            const chatWindow = widgetContainer.querySelector('.lh-chat-window');
            const closeButton = chatWindow.querySelector('.lh-chat-close');
            const registrationForm = chatWindow.querySelector('.lh-registration-form');
            const chatMessages = chatWindow.querySelector('.lh-chat-messages');
            const chatInputContainer = chatWindow.querySelector('.lh-chat-input-container');
            const submitButton = chatWindow.querySelector('#submit-registration');
            const chatInput = chatWindow.querySelector('.lh-chat-input');
            const sendButton = chatWindow.querySelector('.lh-send-button');
    
            // When click on chatLuncher, sopen chat and make ping if first time
            chatLauncher.addEventListener('click', function() {
                chatWindow.classList.add('active');
                chatLauncher.classList.remove('unread');
                if (!firstPing) {
                    makePing();
                    firstPing = true;
                }
            });
    
            // When click closeButton, close chat
            closeButton.addEventListener('click', function() {
                chatWindow.classList.remove('active');
            });
            
            // When click submitButton, register
            submitButton.addEventListener('click', handleRegistration);
            
            // When press Enter, send message
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // When click sendButton, send message
            sendButton.addEventListener('click', function(event) {
                event.preventDefault();
                sendMessage();
            });
            
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
                
                // Validate all fields
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
                })
                .then(data => {
                    const authHeader = data.session_id;
                    
                    if (!authHeader) {
                        throw new Error('SessionId missing.');
                    }
                    // Save auth token
                    sessionId = authHeader;
                    localStorage.setItem("sessionId", sessionId);
                    reloadChat();
                    
                    submitButton.disabled = false;
                    submitButton.textContent = 'Start Chat';
                })
                .catch(error => {
                    console.error('Error trying to sing in: ', error);
                    // Show message
                    recaptchaError.textContent = 'Error trying to sign in. Please try again.';
                    recaptchaError.style.display = 'block';
                    
                    // Reset button state
                    submitButton.disabled = false;
                    submitButton.textContent = 'Start Chat';
                    
                    // If needed reload reCAPTCHA
                    if (grecaptcha) {
                        grecaptcha.reset();
                    }
                });
            }
            
            function sendMessage(message) {
                const messageText = message || chatInput.value.trim();
                if (!messageText || isWaitingForResponse) return;
                const quickReplyContainer = chatMessages.querySelector('.lh-quick-reply-container');
                if (quickReplyContainer) {
                    quickReplyContainer.remove();
                }
                // Clear input
                chatInput.value = '';
                // Add user message to chat
                addUserMessage(messageText);
                // Show typing indicator
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'lh-typing-indicator';
                typingIndicator.innerHTML = `
                    <div class="lh-typing-dot"></div>
                    <div class="lh-typing-dot"></div>
                    <div class="lh-typing-dot"></div>
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
                printUserMessage(text)
                messages.push({
                    role: 'user',
                    content: text
                });
                localStorage.setItem('lh-chat-messages', JSON.stringify(messages));
            }
            
            function addBotMessage(text) {
                printBotMessage(text)
                messages.push({
                    role: 'assistant',
                    content: text
                });
                localStorage.setItem('lh-chat-messages', JSON.stringify(messages));
            }

            function printUserMessage(text) {
                const messageElement = document.createElement('div');
                messageElement.className = 'lh-message lh-user-message';
                messageElement.textContent = text;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            function printBotMessage(text) {
                // Replace line break for <br>
                text = text.replace(/\n/g, '<br>');
                // Replace Markdown-style links with <a> tags
                text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
                const messageElement = document.createElement('div');
                messageElement.className = 'lh-message lh-bot-message';
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
                messages = [];
                localStorage.removeItem('lh-chat-messages');
                localStorage.removeItem("sessionId")
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
                if(messages.length < 1) {
                    addBotMessage(config.welcomeMessage);
                    addQuickReplyButtons(config.quickReplies);
                } else {
                    messages.forEach((message, index) => {
                        if (message.role === 'user' && index != messages.length - 1) { // Print everyone except last
                            printUserMessage(message.content);
                        } else if (message.role === 'assistant') {
                            printBotMessage(message.content);
                        }
                    });
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
    
            function addQuickReplyButtons(options) {
                const quickReplyContainer = document.createElement('div');
                quickReplyContainer.className = 'lh-quick-reply-container';
    
                options.forEach(option => {
                    const button = document.createElement('button');
                    button.className = 'lh-quick-reply-button';
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

            function manageExceptions(error) {
                let errorCode = error.code;
                switch (errorCode) {
                    case 'SESSION_ID_NOT_FOUND': return 'Your session has ended. Please refresh the page to start a new one.';
                    case 'MAX_SESSION_COUNT_REACHED': return 'Our system has reached its hourly limit. Please try again later.';
                    case 'MAX_LIMIT_COUNT_REACHED': return 'Message limit reached! You’ll be able to send more messages in around 30 minutes.';
                    default: return 'Sorry, there was an error processing your message. Please try again.';
                }
            }
        }
        setTimeout(() => launcher.click(), 0)
    }

    launcher.addEventListener('click', loadWidgetCore)
  })
})()
