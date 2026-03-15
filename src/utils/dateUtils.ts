
export const safeToDate = (ts: any): Date => {
  if (!ts) return new Date(NaN);
  
  if (ts instanceof Date) return ts;

  if (typeof ts === 'object' && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  
  if (typeof ts === 'number') {
    return new Date(ts < 1e12 ? ts * 1000 : ts);
  }
  
  if (typeof ts === 'object') {
    const seconds = ts._seconds !== undefined ? ts._seconds : ts.seconds;
    const nanoseconds = ts._nanoseconds !== undefined ? ts._nanoseconds : (ts.nanoseconds || 0);
    if (seconds !== undefined) {
      return new Date(seconds * 1000 + nanoseconds / 1e6);
    }
  }
  
  return new Date(ts);
};

export const formatTimestamp = (ts: any) => {
  const date = safeToDate(ts);
  
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
    console.warn('Invalid timestamp:', ts);
    return '-';
  }
  
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
