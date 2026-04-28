import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';
import { CountryProvider } from './contexts/CountryContext.tsx';
import { startAutoSync } from './services/offlineSync';

// Flush any offline check-ins queued while the device was without data
startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CountryProvider>
      <App />
    </CountryProvider>
  </StrictMode>,
);
