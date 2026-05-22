// app.js — Punto de entrada de la aplicación

document.addEventListener('DOMContentLoaded', () => {
  // Registrar Service Worker para PWA (offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  UI.init();
});
