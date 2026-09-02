import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider';

// Global fetch override to retry on network errors (useful during dev server restarts)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        retries--;
        if (retries === 0) throw error;
        console.warn(`Network error, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Should not reach here");
};

// Unregister any old service workers to prevent stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('ServiceWorker unregistered to clear stale cache.');
    }
  }).catch(err => {
    console.error('Service worker unregistration failed:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
