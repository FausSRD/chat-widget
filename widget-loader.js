(function() {
  function onReady(fn) {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }

  onReady(() => {
    const loaderCSS = document.createElement('style')
    loaderCSS.textContent = `
      .chat-launcher {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: #4f46e5;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
        z-index: 999;
      }
      
      .chat-launcher .chat-launcher-icon {
        font-size: 28px;
        line-height: 1;
      }

      .chat-launcher::after {
        content: '';
        position: absolute;
        top: 10px;
        right: 10px;
        width: 10px;
        height: 10px;
        background-color: red;
        border-radius: 50%;
        display: none;
        box-shadow: 0 0 2px #fff;
      }

      .chat-launcher.unread::after {
        display: block;
      }

      .chat-launcher:hover {
        transform: scale(1.05);
      }
    `
    document.head.appendChild(loaderCSS)

    const launcher = document.createElement('div')
    launcher.id = 'chat-launcher'
    launcher.className = 'chat-launcher'
    launcher.innerHTML = '<span class="chat-launcher-icon">💬</span>'
    document.body.appendChild(launcher)

    function onFirstClick() {
      if (document.getElementById('widget-core-script')) return
      launcher.removeEventListener('click', onFirstClick)

      const script = document.createElement('script')
      script.id = 'widget-core-script'
      script.src = './widget-core.js'
      script.onload = () => {
        launcher.click()
      }
      script.onerror = () => console.error('Error loading widget-core')
      document.body.appendChild(script)
    }

    launcher.addEventListener('click', onFirstClick)
  })
})()