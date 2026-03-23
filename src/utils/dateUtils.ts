
export const safeToDate = (ts: any): Date => {
  if (!ts) return new Date(NaN);
  
  if (ts instanceof Date) return ts;

  // Handle Firestore Timestamp objects
  if (typeof ts === 'object' && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  
  // Handle Firestore Timestamp-like objects (e.g., from JSON serialization)
  if (typeof ts === 'object' && (ts.seconds !== undefined || ts._seconds !== undefined)) {
    const seconds = ts.seconds !== undefined ? ts.seconds : ts._seconds;
    const nanoseconds = ts.nanoseconds !== undefined ? ts.nanoseconds : (ts._nanoseconds || 0);
    return new Date(seconds * 1000 + nanoseconds / 1e6);
  }
  
  // Handle numbers (milliseconds or seconds)
  if (typeof ts === 'number') {
    return new Date(ts < 1e12 ? ts * 1000 : ts);
  }
  
  return new Date(ts);
};

export const formatTimestamp = (ts: any) => {
  const date = safeToDate(ts);
  
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('id-ID', { 
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatTimeOnly = (ts: any) => {
  const date = safeToDate(ts);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDateOnly = (ts: any) => {
  const date = safeToDate(ts);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
};
