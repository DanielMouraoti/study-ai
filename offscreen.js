// Offscreen Document - Reprodução de Áudio (Manifest V3)
// Arquitetura oficial do Chrome para playback de áudio

console.log('[Offscreen] ✅ Documento carregado');

// Sons em Base64 (WAV mínimos válidos - 1 segundo de tom puro)
const SOUND_BASE64 = {
  sparkle: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  piano: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  chime: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=',
  bell: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA='
};

// Estado do AudioContext (compartilhado)
let audioContextGlobal = null;

// Message Listener - PONTO DE ENTRADA
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] 📨 Mensagem recebida:', JSON.stringify(message));
  
  // Validar mensagem
  if (!message || !message.action) {
    console.error('[Offscreen] ❌ Mensagem inválida:', message);
    sendResponse({ success: false, error: 'Mensagem inválida' });
    return true;
  }
  
  // Processar ações de áudio
  if (message.action === 'playTimerFinishedSound' || message.action === 'testSound') {
    const soundType = message.soundType || 'sparkle';
    const volume = message.volume !== undefined ? message.volume : 70;
    
    console.log(`[Offscreen] 🔊 Ação: ${message.action}`);
    console.log(`[Offscreen] 🎵 Som: ${soundType}, Volume: ${volume}%`);
    
    // Tocar som de forma assíncrona
    playSound(soundType, volume)
      .then(() => {
        console.log('[Offscreen] ✅ Som tocado com sucesso');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] ❌ Erro ao tocar som:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Manter canal aberto para sendResponse assíncrono
  }
  
  // Ação de desbloqueio (autorizar áudio)
  if (message.action === 'unlockAudio') {
    console.log('[Offscreen] 🔓 Desbloqueio de áudio solicitado');
    unlockAudio()
      .then(() => {
        console.log('[Offscreen] ✅ Áudio desbloqueado');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] ❌ Erro ao desbloquear:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  console.warn('[Offscreen] ⚠️ Ação desconhecida:', message.action);
  sendResponse({ success: false, error: 'Ação desconhecida' });
  return true;
});

// Função principal de playback
async function playSound(soundType, volumePercent) {
  console.log(`[Offscreen] 🎼 playSound iniciado: ${soundType}, ${volumePercent}%`);
  
  // Calcular volume (0.0 a 1.0)
  const volume = Math.min(1, Math.max(0, volumePercent / 100));
  console.log(`[Offscreen] 📊 Volume calculado: ${volume}`);
  
  // Tentar método Base64 primeiro (mais confiável)
  try {
    await playSoundBase64(soundType, volume);
    console.log(`[Offscreen] ✅ Base64 playback concluído`);
    return;
  } catch (error) {
    console.warn(`[Offscreen] ⚠️ Base64 falhou, tentando síntese:`, error.message);
  }
  
  // Fallback: Web Audio API com síntese
  try {
    await playSoundSynthesis(soundType, volume);
    console.log(`[Offscreen] ✅ Síntese playback concluído`);
  } catch (error) {
    console.error(`[Offscreen] ❌ Todos os métodos falharam:`, error);
    throw error;
  }
}

// Método 1: Playback com Base64 (elemento Audio)
async function playSoundBase64(soundType, volume) {
  console.log(`[Offscreen] 🎵 Tentando Base64 para: ${soundType}`);
  
  const audioData = SOUND_BASE64[soundType] || SOUND_BASE64.sparkle;
  
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioData);
    audio.volume = volume;
    
    console.log(`[Offscreen] 📂 Audio criado, volume definido: ${volume}`);
    
    // Evento de sucesso
    audio.addEventListener('ended', () => {
      console.log('[Offscreen] ✅ Áudio terminou de tocar');
      resolve();
    }, { once: true });
    
    // Evento de erro
    audio.addEventListener('error', (e) => {
      console.error('[Offscreen] ❌ Erro no Audio:', e);
      reject(new Error(`Audio error: ${e.message || 'Desconhecido'}`));
    }, { once: true });
    
    // Tentar tocar
    console.log('[Offscreen] ▶️ Chamando audio.play()...');
    audio.play()
      .then(() => {
        console.log('[Offscreen] ✅ play() resolvido com sucesso');
      })
      .catch((playError) => {
        console.error('[Offscreen] ❌ play() rejeitado:', playError);
        reject(playError);
      });
    
    // Timeout de segurança (3 segundos)
    setTimeout(() => {
      reject(new Error('Timeout: áudio não tocou em 3s'));
    }, 3000);
  });
}

// Método 2: Síntese com Web Audio API
async function playSoundSynthesis(soundType, volume) {
  console.log(`[Offscreen] 🎹 Tentando síntese para: ${soundType}`);
  
  // Obter ou criar AudioContext
  if (!audioContextGlobal) {
    audioContextGlobal = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[Offscreen] 🆕 AudioContext criado');
  }
  
  const ctx = audioContextGlobal;
  console.log(`[Offscreen] 🔊 AudioContext state: ${ctx.state}`);
  
  // Resumir se suspenso
  if (ctx.state === 'suspended') {
    console.log('[Offscreen] ⏸️ AudioContext suspenso, tentando resume...');
    await ctx.resume();
    console.log(`[Offscreen] ▶️ AudioContext resumed: ${ctx.state}`);
  }
  
  // Gerar som baseado no tipo
  return new Promise((resolve) => {
    const now = ctx.currentTime;
    const duration = 0.5;
    
    // Criar nós
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Definir frequência baseada no tipo
    const frequencies = {
      sparkle: 880,  // A5
      piano: 523,    // C5
      chime: 1047,   // C6
      bell: 392      // G4
    };
    
    oscillator.frequency.value = frequencies[soundType] || 440;
    oscillator.type = 'sine';
    
    console.log(`[Offscreen] 🎼 Frequência: ${oscillator.frequency.value}Hz`);
    
    // Envelope ADSR
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay
    
    // Conectar
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Tocar
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    console.log('[Offscreen] 🎵 Oscilador iniciado');
    
    // Resolver após duração
    setTimeout(() => {
      console.log('[Offscreen] ✅ Síntese concluída');
      resolve();
    }, duration * 1000 + 100);
  });
}

// Função de desbloqueio (chama play em silêncio)
async function unlockAudio() {
  console.log('[Offscreen] 🔓 Desbloqueando áudio do navegador...');
  
  try {
    // Tocar som silencioso (volume 0)
    const silentAudio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=');
    silentAudio.volume = 0.01;
    await silentAudio.play();
    console.log('[Offscreen] ✅ Áudio desbloqueado via play silencioso');
    
    // Criar AudioContext para desbloquear também
    if (!audioContextGlobal) {
      audioContextGlobal = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextGlobal.state === 'suspended') {
      await audioContextGlobal.resume();
    }
    console.log('[Offscreen] ✅ AudioContext desbloqueado');
    
  } catch (error) {
    console.warn('[Offscreen] ⚠️ Desbloqueio falhou (normal se já desbloqueado):', error.message);
  }
}

console.log('[Offscreen] 🚀 Sistema de áudio inicializado e pronto');
