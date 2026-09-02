// time.ts
export async function syncServerTime(): Promise<boolean> {
  // We no longer sync server time on the frontend.
  // We just use the device's local time for UI purposes.
  // Actual validation will happen on the backend.
  return true;
}

export function getServerTime(): number {
  return Date.now();
}
