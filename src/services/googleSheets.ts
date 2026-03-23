import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
// Replace literal \n with actual newlines, remove carriage returns
let formattedKey = rawKey.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

// Only wrap if it doesn't already have a PEM header
if (!formattedKey.includes('-----BEGIN')) {
  formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
}

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formattedKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID!, serviceAccountAuth);

export async function getSheetData(sheetTitle: string) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[sheetTitle];
  const rows = await sheet.getRows();
  return rows.map(row => row.toObject());
}

export async function getSettings() {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Settings'];
  const rows = await sheet.getRows();
  // Assuming Settings has columns like 'key' and 'value'
  const settings: any = {};
  rows.forEach(row => {
    const obj = row.toObject();
    settings[obj.key] = obj.value;
  });
  return settings;
}

export async function addRow(sheetTitle: string, data: any) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[sheetTitle];
  await sheet.addRow(data);
}
