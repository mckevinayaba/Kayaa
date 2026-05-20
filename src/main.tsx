import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';
import { CountryProvider } from './contexts/CountryContext.tsx';
import { startAutoSync } from './services/offlineSync';
import { registerSW } from './lib/push';

// Global safety net — catches any uncaught error that fires before or outside
// the React tree (module init failures, promise rejections, etc.) and shows a
// visible message instead of a blank dark screen.
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0D1117;font-family:Inter,sans-serif;padding:32px;box-sizing:border-box;';
    root.innerHTML = `
      <div style="max-width:380px;text-align:center">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <h2 style="color:#F87171;font-size:18px;font-weight:700;margin:0 0 12px">App failed to start</h2>
        <code style="display:block;color:rgba(255,255,255,0.6);font-size:12px;word-break:break-all;margin-bottom:16px">${e.message}</code>
        <button onclick="location.reload()" style="background:#39D98A;color:#0D1117;border:none;border-radius:12px;padding:12px 28px;font-family:Inter,sans-serif;font-weight:700;font-size:14px;cursor:pointer">Retry</button>
      </div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Kayaa] Unhandled promise rejection:', e.reason);
});

// Flush any offline check-ins queued while the device was without data
startAutoSync();

// Boot the service worker (push notifications + future offline support)
// Fire-and-forget — the SW registration is lazy and won't block rendering
registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CountryProvider>
      <App />
    </CountryProvider>
  </StrictMode>,
);
