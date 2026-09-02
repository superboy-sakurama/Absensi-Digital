console.log("Service worker registration is now disabled. A cleanup worker will be installed to clear stale caches.");
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}
