// Audio notification utility for order ready alerts

let audioPermissionGranted = false;

export const requestAudioPermission = async (): Promise<boolean> => {
  try {
    // Create a silent audio to test permission
    const audio = new Audio();
    audio.volume = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      await playPromise;
      audio.pause();
    }
    
    audioPermissionGranted = true;
    console.log('✅ Audio permission granted');
    return true;
  } catch (error) {
    console.log('❌ Audio permission denied:', error);
    return false;
  }
};

export const playOrderReadyBeep = async (): Promise<void> => {
  try {
    console.log('🔔 Attempting to play order ready beep...');
    
    // Try to play the beep sound
    const audio = new Audio('/sounds/order-ready-beep.mp3');
    audio.volume = 0.8; // 80% volume
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log('✅ Order ready beep played successfully');
    }
  } catch (error) {
    console.warn('⚠️ Failed to play beep sound, trying fallback:', error);
    // Fallback: try to generate beep with Web Audio API
    try {
      generateBeep();
      console.log('✅ Fallback beep played');
    } catch (fallbackError) {
      console.error('❌ Both beep methods failed:', fallbackError);
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
