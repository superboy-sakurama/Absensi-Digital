let serverTimeAtSync = Date.now(); // Fallback initial
let localTimeAtSync = performance.now();
export let isTimeSynced = false;

export async function syncServerTime(): Promise<boolean> {
  try {
    const start = performance.now();
    const res = await fetch('/api/time');
    if (res.ok) {
      const data = await res.json();
      const end = performance.now();
      const roundtripDelay = (end - start) / 2;
      
      serverTimeAtSync = data.timestamp + roundtripDelay;
      localTimeAtSync = performance.now();
      isTimeSynced = true;
      
      console.log('Server time synced securely. Diff:', serverTimeAtSync - Date.now());
      return true;
    }
  } catch (err) {
    console.error('Failed to sync server time', err);
  }
  return false;
}

export function getServerTime() {
  // Use performance.now() to ensure clock tampering while app is open doesn't affect time measurement
  const elapsed = performance.now() - localTimeAtSync;
  return new Date(serverTimeAtSync + elapsed);
}
