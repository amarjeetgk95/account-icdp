import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/core/query-client';
import { isChunkLoadError, reloadForChunkUpdate } from '@/shared/utilities';
import App from './App';
import './index.css';

if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
}

// Recover from stale cached chunks after a deploy
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForChunkUpdate();
});

window.addEventListener('unhandledrejection', (event) => {
  if (isChunkLoadError(event.reason)) {
    event.preventDefault();
    reloadForChunkUpdate();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Service worker removed: previous sw.js never populated its cache and could
// pin stale js/css via immutable headers. One-shot cleanup for existing clients.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister().catch(() => {}));
  }).catch(() => {});
  if (typeof caches !== 'undefined' && caches.keys) {
    caches.keys().then((keys) => {
      keys.filter((k) => k.startsWith('icdp-cache-')).forEach((k) => caches.delete(k).catch(() => {}));
    }).catch(() => {});
  }
}
