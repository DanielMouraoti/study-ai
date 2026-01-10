console.log('[Background] Service Worker inicializado');

// Configuração dos modos de timer (em segundos)
const MODES = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

let timerState = {
  timeRemaining: MODES.focus,
  isRunning: false,
  mode: 'focus',
  lastUpdated: Date.now()
};

let timerInterval = null;

// Estatísticas - Helpers
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function dayKey(date) {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
}

async function recordSessionCompletion() {
  try {
    const now = new Date();
    const week = getISOWeek(now);
    const day = dayKey(now);

    const data = await chrome.storage.local.get(['weeklyStats','studySessions','currentCategory','completedSessions']);
    const weeklyStats = data.weeklyStats || {};
    const studySessions = Array.isArray(data.studySessions) ? data.studySessions : [];
    const currentCategory = data.currentCategory || 'Sem Categoria';
    const completed = (data.completedSessions || 0) + 1;

    // Incrementar contagem semanal
    weeklyStats[week] = weeklyStats[week] || { monday:0,tuesday:0,wednesday:0,thursday:0,friday:0,saturday:0,sunday:0 };
    weeklyStats[week][day] = (weeklyStats[week][day] || 0) + 1;

    // Registrar sessão
    studySessions.push({
      timestamp: now.toISOString(),
      duration: MODES[timerState.mode] || MODES.focus,
      mode: timerState.mode,
      category: currentCategory
    });

    await chrome.storage.local.set({ weeklyStats, studySessions, currentWeek: week, completedSessions: completed });
  } catch (e) {
    console.warn('[BG] Falha ao registrar sessão:', e);
  }
}

// ----- Persistência -----
async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['timerState'], (data) => {
      if (data.timerState) {
        timerState = { ...timerState, ...data.timerState };
      }
      resolve();
    });
  });
}

async function saveState() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ timerState }, () => resolve());
  });
}

// ----- Loop do timer -----
function stopInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function tick() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - timerState.lastUpdated) / 1000);
  if (elapsedSeconds <= 0) return;

  timerState.timeRemaining = Math.max(0, timerState.timeRemaining - elapsedSeconds);
  timerState.lastUpdated = now;
  
  console.log('[BG] tick:', timerState.timeRemaining, 'segundos');

  if (timerState.timeRemaining <= 0) {
    // Registrar sessão concluída antes de resetar (apenas se for modo de foco)
    await recordSessionCompletion();
    timerState.isRunning = false;
    timerState.timeRemaining = MODES[timerState.mode] || MODES.focus;
    stopInterval();
    // Tocar som de conclusão
    await playTimerFinishedSound();
  }

  await saveState();
}

function ensureInterval() {
  if (timerState.isRunning && !timerInterval) {
    timerInterval = setInterval(tick, 1000);
  }
  if (!timerState.isRunning) {
    stopInterval();
  }
}

// ----- Ações -----
async function startTimer() {
  timerState.isRunning = true;
  timerState.lastUpdated = Date.now();
  await saveState();
  ensureInterval();
}

async function pauseTimer() {
  timerState.isRunning = false;
  await saveState();
  ensureInterval();
}

async function resetTimer(mode) {
  const newMode = mode || timerState.mode;
  timerState.mode = newMode;
  timerState.timeRemaining = MODES[newMode] || MODES.focus;
  timerState.isRunning = false;
  timerState.lastUpdated = Date.now();
  await saveState();
  ensureInterval();
}

async function setMode(mode) {
  await resetTimer(mode);
}

// ----- Audio Functions -----
async function ensureOffscreenDocument() {
  try {
    const existingClients = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingClients.length > 0) {
      return true;
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK']
    });

    console.log('[BG] Offscreen document criado');
    return true;
  } catch (error) {
    if (error.message?.includes('offscreen document already exists')) {
      return true;
    }
    console.warn('[BG] Erro ao criar offscreen:', error);
    return false;
  }
}

async function playTimerFinishedSound() {
  try {
    await ensureOffscreenDocument();
    const data = await chrome.storage.local.get(['soundType', 'volume']);
    const soundType = data.soundType || 'sparkle';
    const volume = data.volume !== undefined ? data.volume : 70;
    
    // Enviar mensagem para offscreen document tocar o som
    chrome.runtime.sendMessage({
      action: 'playTimerFinishedSound',
      soundType,
      volume
    }).catch(err => {
      console.warn('[BG] Erro ao enviar mensagem de som:', err);
    });
  } catch (e) {
    console.warn('[BG] Erro ao tocar som:', e);
  }
}

async function playTestSound(soundType, volume) {
  try {
    await ensureOffscreenDocument();
    // Enviar mensagem para offscreen document tocar o som
    chrome.runtime.sendMessage({
      action: 'testSound',
      soundType: soundType || 'sparkle',
      volume: volume !== undefined ? volume : 70
    }).catch(err => {
      console.warn('[BG] Erro ao enviar mensagem de som de teste:', err);
    });
  } catch (e) {
    console.warn('[BG] Erro ao tocar som de teste:', e);
  }
}

// ----- Spotify OAuth & API -----
const SPOTIFY_CONFIG = {
  clientId: 'YOUR_SPOTIFY_CLIENT_ID_HERE',
  redirectUrl: chrome.identity.getRedirectURL(''),
  authEndpoint: 'https://accounts.spotify.com/authorize',
  apiBase: 'https://api.spotify.com/v1'
};

async function getSpotifyToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('spotifyToken', (data) => {
      resolve(data.spotifyToken || null);
    });
  });
}

async function saveSpotifyToken(token, expiresIn = 3600) {
  const expiresAt = Date.now() + (expiresIn * 1000);
  return new Promise((resolve) => {
    chrome.storage.local.set({ spotifyToken: token, spotifyTokenExpires: expiresAt }, resolve);
  });
}

async function authenticateSpotify() {
  return new Promise((resolve, reject) => {
    const scopes = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];
    const authUrl = new URL(SPOTIFY_CONFIG.authEndpoint);
    authUrl.searchParams.append('client_id', SPOTIFY_CONFIG.clientId);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('redirect_uri', SPOTIFY_CONFIG.redirectUrl);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('show_dialog', 'true');

    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Spotify] Auth error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      if (!redirectUrl) {
        reject(new Error('No redirect URL received'));
        return;
      }

      const url = new URL(redirectUrl);
      const token = url.hash.match(/access_token=([^&]+)/)?.[1];
      const expiresIn = url.hash.match(/expires_in=([^&]+)/)?.[1];

      if (!token) {
        reject(new Error('No access token in response'));
        return;
      }

      saveSpotifyToken(token, parseInt(expiresIn) || 3600).then(() => {
        console.log('[Spotify] Token autenticado e salvo');
        resolve({ success: true, token });
      });
    });
  });
}

async function spotifyApiCall(endpoint, options = {}) {
  const token = await getSpotifyToken();
  if (!token) throw new Error('Spotify not authenticated');

  const response = await fetch(`${SPOTIFY_CONFIG.apiBase}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    if (response.status === 401) {
      chrome.storage.local.remove('spotifyToken');
      throw new Error('Token expirado');
    }
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

async function getCurrentTrack() {
  try {
    const data = await spotifyApiCall('/me/player/currently-playing');
    if (!data.item) return null;
    return {
      name: data.item.name,
      artist: data.item.artists?.[0]?.name || 'Unknown',
      isPlaying: data.is_playing,
      progress: data.progress_ms,
      duration: data.item.duration_ms
    };
  } catch (e) {
    console.warn('[Spotify] Erro ao obter música atual:', e);
    return null;
  }
}

async function playPause() {
  try {
    const current = await spotifyApiCall('/me/player');
    if (current.is_playing) {
      await spotifyApiCall('/me/player/pause', { method: 'PUT' });
    } else {
      await spotifyApiCall('/me/player/play', { method: 'PUT' });
    }
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Play/Pause error:', e);
    return { success: false, error: e.message };
  }
}

async function nextTrack() {
  try {
    await spotifyApiCall('/me/player/next', { method: 'POST' });
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Next error:', e);
    return { success: false, error: e.message };
  }
}

async function prevTrack() {
  try {
    await spotifyApiCall('/me/player/previous', { method: 'POST' });
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Previous error:', e);
    return { success: false, error: e.message };
  }
}

// ----- Inicialização -----
(async function init() {
  await loadState();
  ensureInterval();
  console.log('[BG] Estado inicial:', timerState);
})();

// ----- Listener de mensagens -----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BG] Recebi comando:', message.action);

  if (message.action === 'ping') {
    sendResponse({ success: true, pong: true });
    return true;
  }
  
  if (message.action === 'getTimerState') {
    console.log('[BG] Respondendo getTimerState com:', timerState);
    sendResponse({ success: true, data: timerState });
    return true;
  }

  if (message.action === 'startTimer') {
    startTimer().then(() => {
      console.log('[BG] Timer iniciado');
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'pauseTimer') {
    pauseTimer().then(() => {
      console.log('[BG] Timer pausado');
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'resetTimer') {
    resetTimer(message.mode).then(() => {
      console.log('[BG] Timer resetado');
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'setMode') {
    setMode(message.mode).then(() => {
      console.log('[BG] Modo alterado');
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'testSound') {
    playTestSound(message.soundType, message.volume).then(() => {
      console.log('[BG] Som de teste tocado');
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'spotifyAuth') {
    authenticateSpotify().then(result => {
      sendResponse({ success: true, message: 'Spotify autenticado com sucesso!' });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'getCurrentTrack') {
    getCurrentTrack().then(track => {
      sendResponse({ success: true, track });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'playPause') {
    playPause().then(result => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'nextTrack') {
    nextTrack().then(result => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'prevTrack') {
    prevTrack().then(result => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  console.warn('[BG] Ação desconhecida:', message.action);
  sendResponse({ success: false, error: 'unknown_action' });
  return true;
});
