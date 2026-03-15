
export const safeToDate = (ts: any): Date => {
  if (!ts) return new Date(NaN);
  
  if (typeof ts === 'object' && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  
  if (typeof ts === 'number') {
    // If it's a small number, it's probably seconds (Firestore-like)
    // 1e12 is roughly year 2001 in milliseconds, so anything smaller is likely seconds
    return new Date(ts < 1e12 ? ts * 1000 : ts);
  }
  
  if (typeof ts === 'object' && ts._seconds !== undefined) {
    return new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1e6);
  }

  if (typeof ts === 'object' && ts.seconds !== undefined) {
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6);
  }
  
  const date = new Date(ts);
  return date;
};

export const formatTimestamp = (ts: any) => {
  const date = safeToDate(ts);
  
  // Check for invalid date OR date before 2000 (assuming 1970 is invalid)
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '-';
  
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
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '-';
  return date.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDateOnly = (ts: any) => {
  const date = safeToDate(ts);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '-';
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
};
