(function () {
  'use strict';

  if (window.top === window.self) return;

  function blockFramedRender() {
    const renderBlocked = () => {
      document.documentElement.classList.add('wde-frame-blocked');
      if (!document.body) return;
      document.body.innerHTML = '';
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.style.maxWidth = '680px';
      main.style.margin = '10vh auto';
      main.style.padding = '1.5rem';
      main.style.fontFamily = 'Segoe UI, sans-serif';
      main.style.lineHeight = '1.5';
      main.style.color = '#0f172a';
      main.innerHTML = [
        '<h1 style="margin-bottom:0.5rem">Embedding blocked</h1>',
        '<p>This application cannot run inside an iframe on this host.</p>',
        '<p>Open it directly in a browser tab to continue.</p>'
      ].join('');
      document.body.appendChild(main);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderBlocked, { once: true });
      return;
    }
    renderBlocked();
  }

  try {
    window.top.location = window.self.location.href;
  } catch (_) {
    blockFramedRender();
  }
})();
