// time.ts
export async function syncServerTime(): Promise<boolean> {
  try {
    const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta');
    if (res.ok) {
      const data = await res.json();
      const timestamp = new Date(data.dateTime).getTime();
      const offset = timestamp - Date.now();
      localStorage.setItem('serverTimeOffset', offset.toString());
      return true;
    }
  } catch (error) {
    console.error('Failed to sync server time from timeapi.io:', error);
  }

  // Graceful fallback to client time so the app doesn't hang
  localStorage.setItem('serverTimeOffset', '0');
  return true;
}

export function getServerTime(): number {
  const offset = parseInt(localStorage.getItem('serverTimeOffset') || '0', 10);
  return Date.now() + offset;
}
