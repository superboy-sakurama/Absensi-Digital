import express from 'express';
import { getSheetData, addRow, getSettings } from './src/services/googleSheets';

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

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:3000');
});
