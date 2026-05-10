import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';
import { CountryProvider } from './contexts/CountryContext.tsx';
import { startAutoSync } from './services/offlineSync';
import { registerSW } from './lib/push';

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
