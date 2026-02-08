/**
 * Chat Widget Golden - Self-contained widget loader
 * Usage: <script src="https://lhai-chat-widget-pre.up.railway.app/chat-widget-golden.js"></script>
 */
(function() {
    // Configuration controlled by you
    window.ChatWidgetConfig = {
        title: 'Chat with Text',
        welcomeMessage: "Howdy! I'm Tex. Looking for tractors, mowers, or side-by-sides?",
        quickReplies: ['Show me zero-turn mowers', 'Do you have tractors in stock?', 'How does financing work?'],
        fontFamily: "Arial",
        hintPosition: 'top' ? 'bottom: 90px; right: 20px;' : 'bottom: 20px; right: 90px;',
        hintMessage: 'Need help? Chat with Tex!',
        chatBackgroundColor: '#f8f8f8',
        inputBorder: '#d1d5db',
        inputBorderHover: '#c8102e',
        inputBackgroundColor: '#ffffff',
        headerColor: '#000000',
        messageColor: '#000000',
        messageTextColor: '#ffffff',
        botMessageColor: '#f0f4f8',
        botMessageTextColor: '#1f2937',
        sendButtonColor: '#000000',
        sendButtonIconColor: '#ffffff',
        sendButtonHooverColor: '#e53935',
        buttonIconColor: '#000000',
        activateMic: 'false',
        inputMessagePlaceHolder: 'Ask me anything...',
        launcherImage: 'https://lhai-chat-widget-pre.up.railway.app/assets/tex.png',
        launcherImageSize: '90px',
    };

    // Load the main widget script
    var script = document.createElement('script');
    script.src = 'https://lhai-chat-widget-pre.up.railway.app/chat-widget.js';
    script.async = true;
    document.head.appendChild(script);
})();
