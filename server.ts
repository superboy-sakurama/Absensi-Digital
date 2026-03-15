import express from 'express';
import { getSheetData, addRow, getSettings } from './src/services/googleSheets';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/users', async (req, res) => {
    const users = await getSheetData('Users');
    res.json(users);
  });

  app.get('/api/settings', async (req, res) => {
    const settings = await getSettings();
    res.json(settings);
  });

  app.get('/api/presensi', async (req, res) => {
    const presensi = await getSheetData('Presensi');
    res.json(presensi);
  });

  app.post('/api/presensi', async (req, res) => {
    await addRow('Presensi', req.body);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
