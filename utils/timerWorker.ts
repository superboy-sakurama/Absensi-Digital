export const createTimerWorker = () => {
  const workerCode = `
    let intervalId = null;

    self.onmessage = function(e) {
      if (e.data.command === 'start') {
        if (intervalId) return;
        intervalId = setInterval(() => {
          self.postMessage('tick');
        }, e.data.interval || 30000);
      } else if (e.data.command === 'stop') {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
