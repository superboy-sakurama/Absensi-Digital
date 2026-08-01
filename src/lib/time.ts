// time.ts
export async function syncServerTime(): Promise<boolean> {
  try {
    const res = await fetch('/api/time');
    if (res.ok) {
      const data = await res.json();
      const offset = data.timestamp - Date.now();
      localStorage.setItem('serverTimeOffset', offset.toString());
      return true;
    }
  } catch (error) {
    console.error('Failed to sync server time:', error);
  }
  return false;
}

export function getServerTime(): number {
  const offset = parseInt(localStorage.getItem('serverTimeOffset') || '0', 10);
  return Date.now() + offset;
}
