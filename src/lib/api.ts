// Ganti URL ini dengan Web App URL dari Google Apps Script Anda
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsKYCdxF9iFchvtFBc__iNRaQBRtZ8FRg4fSB2MGmosXhVnHszv49WDkMdZrToH7zJ/exec';

export const callApi = async (action: string, payload: any) => {
  let webhookUrl = localStorage.getItem('webhookUrl') || SCRIPT_URL;
  
  // Fix accidental concatenation of placeholder and real URL
  if (webhookUrl.includes('AKfycbw.../exechttps://')) {
    webhookUrl = webhookUrl.replace('https://script.google.com/macros/s/AKfycbw.../exec', '');
    localStorage.setItem('webhookUrl', webhookUrl);
  }
  
  // If localStorage has the placeholder, use SCRIPT_URL instead
  if (webhookUrl === 'https://script.google.com/macros/s/AKfycbw.../exec') {
    webhookUrl = SCRIPT_URL;
    localStorage.removeItem('webhookUrl');
  }
  
  if (!webhookUrl || webhookUrl === 'https://script.google.com/macros/s/AKfycbw.../exec') {
    throw new Error('Google Apps Script Webhook URL belum diatur. Silakan masukkan URL di src/lib/api.ts atau di halaman pengaturan.');
  }
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload })
  });
  
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};
