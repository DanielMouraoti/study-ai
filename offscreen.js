// Offscreen Document - Reprodução de Áudio (Manifest V3)
// Este script roda em um documento offscreen para reproduzir áudio

console.log('[Offscreen] Documento carregado');

// Sound Library (Data URIs for minimal audio samples)
const SOUND_LIBRARY = {
  sparkle: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  piano: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  chime: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  bell: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA='
};

// Message Handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playTimerFinishedSound' || message.action === 'testSound') {
    const soundType = message.soundType || 'sparkle';
    const volume = message.volume !== undefined ? message.volume : 70;
    console.log(`[Offscreen] ${message.action === 'testSound' ? 'Teste de som' : 'Timer finalizado'}: ${soundType} (volume: ${volume}%)`);
    playNotificationSound(soundType, volume);
    sendResponse({ success: true });
  }
  return true;
});

// Audio Playback with Web Audio API
function playNotificationSound(soundType, volumePercent) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const volume = Math.min(1, Math.max(0, volumePercent / 100));

    generateAndPlaySound(audioContext, soundType, volume);
    
    console.log('[Offscreen] Som tocado com sucesso');
  } catch (error) {
    console.error('[Offscreen] Erro ao tocar som:', error);
    // Fallback: tentar usar beep simples
    playFallbackBeep();
  }
}

// Sintetizar e tocar som baseado no tipo
function generateAndPlaySound(audioContext, soundType, volume) {
  const now = audioContext.currentTime;
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(volume, now);

  switch (soundType) {
    case 'sparkle':
      playSparkle(audioContext, gainNode, now);
      break;
    case 'piano':
      playPiano(audioContext, gainNode, now);
      break;
    case 'chime':
      playChime(audioContext, gainNode, now);
      break;
    case 'bell':
      playBell(audioContext, gainNode, now);
      break;
    default:
      playSparkle(audioContext, gainNode, now);
  }

  // Fade out no final
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
}

// Sparkle: 4 beeps ascendentes rápidos
function playSparkle(audioContext, gainNode, startTime) {
  const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
  frequencies.forEach((freq, i) => {
    playTone(audioContext, gainNode, startTime + i * 0.12, freq, 0.15, 0.5);
  });
}

// Piano: acorde Dó maior arpejado
function playPiano(audioContext, gainNode, startTime) {
  const frequencies = [262, 330, 392]; // C4, E4, G4
  frequencies.forEach((freq, i) => {
    playTone(audioContext, gainNode, startTime + i * 0.2, freq, 0.4, 0.8);
  });
}

// Chime: 3 sinos em F5
function playChime(audioContext, gainNode, startTime) {
  for (let i = 0; i < 3; i++) {
    playTone(audioContext, gainNode, startTime + i * 0.4, 880, 0.35, 0.6);
  }
}

// Bell: tom baixo sustentado (sol grave)
function playBell(audioContext, gainNode, startTime) {
  playTone(audioContext, gainNode, startTime, 392, 1.5, 0.9);
}

// Toca um tom simples
function playTone(audioContext, gainNode, startTime, frequency, duration, volumeScale) {
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);
  
  const envGain = audioContext.createGain();
  envGain.gain.setValueAtTime(0, startTime);
  envGain.gain.linearRampToValueAtTime(volumeScale, startTime + 0.01); // Attack
  envGain.gain.exponentialRampToValueAtTime(0.1, startTime + duration); // Decay
  
  osc.connect(envGain);
  envGain.connect(gainNode);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Fallback: beep bem simples caso contexto de áudio falhe
function playFallbackBeep() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.error('[Offscreen] Fallback também falhou:', e);
  }
}
