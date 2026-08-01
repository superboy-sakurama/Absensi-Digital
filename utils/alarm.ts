import { toast } from 'sonner';

let audioContext: AudioContext | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;

// Initialize an empty audio element to keep the context alive and potentially prevent deep throttling
// on mobile devices when tab is in background
export const initBackgroundAudio = () => {
  if (keepAliveAudio) return;
  try {
    // 1 second of silent base64 mp3
    const silentMp3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIAD+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+AAAAAExhdmM1OC4xMzQAAAAAAAAAAAAAAAAkAMUAAAAAAAAgAQAAAADZ2Q8HAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZBAAAAHkAAAAAAAAA0gAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZDgAAAHkAAAAAAAAA0gAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZEgAAAHkAAAAAAAAA0gAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MUZFAAAAHkAAAAAAAAA0gAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    
    keepAliveAudio = new Audio(silentMp3);
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0; // silent
    
    // Attempt to play it. Will be auto-resumed on any user interaction in the app if it fails.
    keepAliveAudio.play().catch((e) => {
      console.warn("Background audio suppressed until user interaction.", e);
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !audioContext) {
      audioContext = new AudioContextClass();
    }
  } catch (e) {
    console.warn("Background audio init error", e);
  }
};

// Play a beautiful synthesized sound using Web Audio API
export const playAlarmSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    // Create audio context lazy
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const playBeep = (timeOffset: number, frequency: number, duration: number, volume: number = 0.2) => {
      if (!audioContext) return;
      
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Use clean triangle waves for warmer chime / alert sounds
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, audioContext.currentTime + timeOffset);
      
      // Volume envelope filter
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + timeOffset + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      osc.start(audioContext.currentTime + timeOffset);
      osc.stop(audioContext.currentTime + timeOffset + duration);
    };

    // A beautiful double-tone chime sequence (e.g., Westminster-style pleasant warning)
    playBeep(0.0, 523.25, 0.25); // C5
    playBeep(0.15, 659.25, 0.25); // E5
    playBeep(0.3, 783.99, 0.35); // G5
    
    // Repeat slightly higher tone after small pause for confirmation
    playBeep(0.7, 783.99, 0.2); // G5
    playBeep(0.85, 987.77, 0.3); // B5
  } catch (e) {
    console.warn("Failed to play alarm sound via Web Audio API:", e);
  }
};

export const checkAndFireAlarm = (title: string, body: string, alarmId: string) => {
  const alarmEnabled = localStorage.getItem('alarmEnabled') !== 'false';
  if (!alarmEnabled) return;

  const lastFired = localStorage.getItem(`alarm_${alarmId}_fired`);
  const todayDate = new Date().toDateString();

  if (lastFired === todayDate) return;

  // 1. Play the synthesized chime sound
  playAlarmSound();

  // 2. Display an in-app visual toast warning - highly noticeable
  toast.warning(title, {
    description: body,
    duration: 15000, // Show for 15 seconds so they don't miss it
    action: {
      label: 'Tutup',
      onClick: () => {}
    }
  });

  // 3. Mark as fired for today
  localStorage.setItem(`alarm_${alarmId}_fired`, todayDate);

  // 4. Try browser system notification as progressive enhancement
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/pwa-192x192.svg' });
      } catch (e) {
        console.warn("System Notification builder error:", e);
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          try {
            new Notification(title, { body, icon: '/pwa-192x192.svg' });
          } catch (e) {
            console.warn("System Notification promise error:", e);
          }
        }
      });
    }
  }
};
