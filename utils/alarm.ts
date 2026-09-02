import { toast } from 'sonner';

export const checkAndFireAlarm = (title: string, body: string, alarmId: string) => {
  const alarmEnabled = localStorage.getItem('alarmEnabled') !== 'false';
  if (!alarmEnabled) return;

  const lastFired = localStorage.getItem(`alarm_${alarmId}_fired`);
  const todayDate = new Date().toDateString();

  if (lastFired === todayDate) return;

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play 3 short beeps
      for (let i = 0; i < 3; i++) {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + (i * 0.3)); // A5
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + (i * 0.3));
        gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + (i * 0.3) + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (i * 0.3) + 0.25);
        
        oscillator.start(audioCtx.currentTime + (i * 0.3));
        oscillator.stop(audioCtx.currentTime + (i * 0.3) + 0.3);
      }
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const notifyUser = () => {
    playBeep();
    toast(title, {
      description: body,
      duration: 10000,
    });
  };

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192x192.svg' });
    notifyUser();
    localStorage.setItem(`alarm_${alarmId}_fired`, todayDate);
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/pwa-192x192.svg' });
      }
      notifyUser();
      localStorage.setItem(`alarm_${alarmId}_fired`, todayDate);
    });
  } else {
    // If notifications are denied or unsupported, still show toast and play sound
    notifyUser();
    localStorage.setItem(`alarm_${alarmId}_fired`, todayDate);
  }
};
