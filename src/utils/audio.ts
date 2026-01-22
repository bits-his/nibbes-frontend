// Audio notification utility for order ready alerts

let audioPermissionGranted = false;

export const requestAudioPermission = async (): Promise<boolean> => {
  try {
    // Test if audio can be played (requires user interaction)
    const audio = new Audio();
    await audio.play();
    audio.pause();
    audioPermissionGranted = true;
    return true;
  } catch (error) {
    console.log('Audio permission not granted yet');
    return false;
  }
};

export const playOrderReadyBeep = async (): Promise<void> => {
  try {
    const audio = new Audio('/sounds/order-ready-beep.mp3');
    audio.volume = 0.7; // 70% volume
    await audio.play();
    console.log('🔔 Order ready beep played');
  } catch (error) {
    console.error('Failed to play order ready beep:', error);
    // Fallback: try to generate beep with Web Audio API
    try {
      generateBeep();
    } catch (fallbackError) {
      console.error('Fallback beep also failed:', fallbackError);
    }
  }
};

// Fallback: Generate beep sound programmatically
const generateBeep = (): void => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800; // 800Hz beep
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export const isAudioPermissionGranted = (): boolean => {
  return audioPermissionGranted;
};
