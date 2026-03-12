import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Sistem Absensi Online',
          short_name: 'SiAbon',
          description: 'Sistem Absensi Online Berbasis Lokasi',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYy0wLjA2Mi0yLjY5My0xLjE2My01LjI0NS0zLjE0Mi03LjIyMkM0LjY0NS0uODk0LjQ2NCAxLjY0Ny4wMjQgNS44NDcuMDI0IDUuODQ3IDAgNi4wMjEgMCA2LjI1YzAgMS43MzEgMS40MDYgMy4xMzYgMy4xMzYgMy4xMzZzMy4xMzYtMS40MDYgMy4xMzYtMy4xMzZjMC0uMjI5LS4wMjQtLjQwMy0uMDI0LS40MDMuNDQtNC4yIDQuNjIxLTYuNzQxIDguODMzLTMuOTI1IDEuOTc4IDEuOTc4IDMuMDggNC41MyAzLjE0MiA3LjIyMi0uMDYyIDIuNjkzLTEuMTYzIDUuMjQ1LTMuMTQy Ny4yMjItNC4yMTMgNC4yMTMtMTAuOTkxIDMuNzQ2LTE0LjY0MS0xLjA0M20tMS40NTMtMS40NTNjMy42NS00Ljc4OSAxMC40MjgtNS4yNTYgMTQuNjQxLTEuMDQzIDEuOTc4IDEuOTc4IDMuMDggNC41MyAzLjE0MiA3LjIyMiIvPjwvc3ZnPg==',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYy0wLjA2Mi0yLjY5My0xLjE2My01LjI0NS0zLjE0Mi03LjIyMkM0LjY0NS0uODk0LjQ2NCAxLjY0Ny4wMjQgNS44NDcuMDI0IDUuODQ3IDAgNi4wMjEgMCA2LjI1YzAgMS43MzEgMS40MDYgMy4xMzYgMy4xMzYgMy4xMzZzMy4xMzYtMS40MDYgMy4xMzYtMy4xMzZjMC0uMjI5LS4wMjQtLjQwMy0uMDI0LS40MDMuNDQtNC4yIDQuNjIxLTYuNzQxIDguODMzLTMuOTI1IDEuOTc4IDEuOTc4IDMuMDggNC41MyAzLjE0MiA3LjIyMi0uMDYyIDIuNjkzLTEuMTYzIDUuMjQ1LTMuMTQy Ny4yMjItNC4yMTMgNC4yMTMtMTAuOTkxIDMuNzQ2LTE0LjY0MS0xLjA0M20tMS40NTMtMS40NTNjMy42NS00Ljc4OSAxMC40MjgtNS4yNTYgMTQuNjQxLTEuMDQzIDEuOTc4IDEuOTc4IDMuMDggNC41MyAzLjE0MiA3LjIyMiIvPjwvc3ZnPg==',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
