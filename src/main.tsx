import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Versi baru tersedia. Muat ulang aplikasi?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Aplikasi siap digunakan secara offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
