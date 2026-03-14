// Offscreen Document - Reprodução de Áudio (Manifest V3)
// Sistema de Alerta Sintético com Web Audio API

console.log('[Offscreen] ✅ Documento carregado - Sistema de Alerta Sintético');

// Estado do AudioContext (compartilhado)
let audioContextGlobal = null;

// Obter ou criar AudioContext
function getAudioContext() {
  if (!audioContextGlobal) {
    audioContextGlobal = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[Offscreen] 🆕 AudioContext criado');
  }
  
  // Resumir se suspenso
  if (audioContextGlobal.state === 'suspended') {
    console.log('[Offscreen] ⏸️ AudioContext suspenso, tentando resume...');
    audioContextGlobal.resume();
  }
  
  return audioContextGlobal;
}

// 🎵 SONS SINTÉTICOS PREMIUM (3 segundos cada)

// ✨ Sparkle: Sequência rápida de 3 tons agudos (tri-plim)
async function playSynthSparkle(ctx, volume) {
  console.log('[Offscreen] ✨ Tocando Sparkle sintético');
  
  const frequencies = [1047, 1319, 1568]; // C6, E6, G6
  const startTime = ctx.currentTime;
  
  frequencies.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    
    const time = startTime + (index * 0.15);
    
    // Envelope suave
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume * 0.4, time + 0.02); // Attack suave
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.4); // Decay suave
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(time);
    oscillator.stop(time + 0.4);
  });
}

// 🎹 Piano: Acorde C-Major (Dó Maior) suave por 2 segundos
async function playSynthPiano(ctx, volume) {
  console.log('[Offscreen] 🎹 Tocando Piano sintético');
  
  const frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4 (Dó Maior)
  const startTime = ctx.currentTime;
  const duration = 2;
  
  frequencies.forEach((freq) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = freq;
    oscillator.type = 'triangle'; // Som mais suave que square
    
    // Envelope ADSR suave
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.05); // Attack
    gainNode.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.2); // Decay
    gainNode.gain.setValueAtTime(volume * 0.25, startTime + duration - 0.5); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Release
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

// 🔔 Bell: Tom de sino clássico com decay longo
async function playSynthBell(ctx, volume) {
  console.log('[Offscreen] 🔔 Tocando Bell sintético');
  
  const fundamentalFreq = 523.25; // C5
  const harmonics = [1, 2, 3, 4.2, 5.4]; // Harmônicos de sino
  const startTime = ctx.currentTime;
  const duration = 3;
  
  harmonics.forEach((harmonic, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = fundamentalFreq * harmonic;
    oscillator.type = 'sine';
    
    const amplitude = volume * 0.2 * (1 / (index + 1)); // Harmônicos mais fracos
    
    // Envelope com decay longo (característico de sino)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(amplitude, startTime + 0.01); // Attack rápido
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay longo
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

// 🎵 Chime: Dois tons alternados (alto/baixo) suaves
async function playSynthChime(ctx, volume) {
  console.log('[Offscreen] 🎵 Tocando Chime sintético');
  
  const frequencies = [880, 659.25]; // A5, E5
  const startTime = ctx.currentTime;
  
  frequencies.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    
    const time = startTime + (index * 0.6);
    
    // Envelope suave
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume * 0.35, time + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(time);
    oscillator.stop(time + 1.2);
  });
}

// 🎼 Função principal: Tocar som sintético por tipo
async function playSyntheticSound(soundType, volumePercent) {
  console.log(`[Offscreen] 🎼 Iniciando som sintético: ${soundType} (${volumePercent}%)`);
  
  const ctx = getAudioContext();
  const volume = Math.min(1, Math.max(0, volumePercent / 100));
  
  return new Promise((resolve) => {
    // Selecionar função baseada no tipo
    switch(soundType) {
      case 'sparkle':
        playSynthSparkle(ctx, volume);
        break;
      case 'piano':
        playSynthPiano(ctx, volume);
        break;
      case 'bell':
        playSynthBell(ctx, volume);
        break;
      case 'chime':
        playSynthChime(ctx, volume);
        break;
      default:
        console.warn(`[Offscreen] ⚠️ Tipo desconhecido: ${soundType}, usando sparkle`);
        playSynthSparkle(ctx, volume);
    }
    
    // Resolver após 3 segundos
    setTimeout(() => {
      console.log('[Offscreen] ✅ Som sintético concluído');
      resolve();
    }, 3000);
  });
}

// Message Listener - PONTO DE ENTRADA
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Filtro: Ignorar silenciosamente ações que não são de áudio
  if (!message || !message.action) {
    return false; // Não processar
  }
  
  // Ações filtradas (não geram log/erro - são tratadas por outros componentes)
  const ignoredActions = ['getCurrentTrack', 'getTimerState', 'pollTimer'];
  if (ignoredActions.includes(message.action)) {
    return false; // Ignorar silenciosamente
  }
  
  console.log('[Offscreen] 📨 Mensagem recebida:', JSON.stringify(message));
  
  // Processar ações de áudio
  if (message.action === 'playTimerFinishedSound' || message.action === 'testSound') {
    const soundType = message.soundType || 'sparkle';
    const volume = message.volume !== undefined ? message.volume : 70;
    
    console.log(`[Offscreen] 🔊 Ação: ${message.action}, Som: ${soundType}, Volume: ${volume}%`);
    
    // Tocar som sintético
    playSyntheticSound(soundType, volume)
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
    try {
      const ctx = getAudioContext();
      // Criar silêncio de 1ms para desbloquear
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.001;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.001);
      
      console.log('[Offscreen] ✅ Áudio desbloqueado');
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Offscreen] ❌ Erro ao desbloquear:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  console.warn('[Offscreen] ⚠️ Ação desconhecida:', message.action);
  sendResponse({ success: false, error: 'Ação desconhecida' });
  return true;
});

console.log('[Offscreen] 🚀 Sistema de alerta sintético inicializado e pronto');
