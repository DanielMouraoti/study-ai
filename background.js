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
  lastUpdated: Date.now(),
  endTime: null // Timestamp absoluto de quando o timer deve acabar
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
    const currentCategory = data.currentCategory || 'Outros';
    const completed = (data.completedSessions || 0) + 1;

    // Incrementar contagem semanal
    weeklyStats[week] = weeklyStats[week] || { monday:0,tuesday:0,wednesday:0,thursday:0,friday:0,saturday:0,sunday:0 };
    weeklyStats[week][day] = (weeklyStats[week][day] || 0) + 1;

    // Calcular duração exata (do modo do timer)
    const duration = MODES[timerState.mode] || MODES.focus;

    // Registrar sessão com detalhes completos
    const session = {
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR'),
      duration: duration, // em segundos
      mode: timerState.mode,
      category: currentCategory,
      weekday: day,
      weekNumber: week
    };

    console.log('[BG] 💾 Salvando sessão completa:', session);
    studySessions.push(session);

    await chrome.storage.local.set({ weeklyStats, studySessions, currentWeek: week, completedSessions: completed });
    console.log('[BG] ✅ Sessão salva com sucesso! Total de sessões:', completed);
  } catch (e) {
    console.error('[BG] ❌ Falha ao registrar sessão:', e);
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
  if (!timerState.isRunning || !timerState.endTime) return;

  const now = Date.now();
  const remainingMs = timerState.endTime - now;
  
  // Calcular segundos restantes com Math.ceil para evitar "quebra" visual
  timerState.timeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
  timerState.lastUpdated = now;
  
  console.log('[BG] tick:', timerState.timeRemaining, 'segundos restantes');

  if (remainingMs <= 0) {
    // Registrar sessão concluída antes de resetar (apenas se for modo de foco)
    await recordSessionCompletion();
    timerState.isRunning = false;
    timerState.timeRemaining = MODES[timerState.mode] || MODES.focus;
    timerState.endTime = null;
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
  const now = Date.now();
  timerState.isRunning = true;
  timerState.lastUpdated = now;
  // Calcular timestamp absoluto de quando o timer deve acabar
  timerState.endTime = now + (timerState.timeRemaining * 1000);
  await saveState();
  ensureInterval();
}

async function pauseTimer() {
  // Atualizar timeRemaining antes de pausar (baseado em endTime)
  if (timerState.endTime) {
    const now = Date.now();
    const remainingMs = timerState.endTime - now;
    timerState.timeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
  }
  timerState.isRunning = false;
  timerState.endTime = null;
  await saveState();
  ensureInterval();
}

async function resetTimer(mode) {
  const newMode = mode || timerState.mode;
  timerState.mode = newMode;
  timerState.timeRemaining = MODES[newMode] || MODES.focus;
  timerState.isRunning = false;
  timerState.endTime = null;
  timerState.lastUpdated = Date.now();
  await saveState();
  ensureInterval();
}

async function setMode(mode) {
  await resetTimer(mode);
}

// ----- Audio Functions -----
async function ensureOffscreenDocument() {
  console.log('[BG] 🔍 Verificando offscreen document...');
  
  try {
    // Verificar se já existe
    const existingClients = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingClients.length > 0) {
      console.log('[BG] ✅ Offscreen document já existe');
      return true;
    }

    console.log('[BG] 📄 Criando offscreen document...');
    
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Reprodução de sons de notificação do timer'
    });

    console.log('[BG] ✅ Offscreen document criado com sucesso');
    return true;
    
  } catch (error) {
    // Erro esperado se já existe
    if (error.message?.includes('offscreen document already exists') || 
        error.message?.includes('Only a single offscreen')) {
      console.log('[BG] ✅ Offscreen já existe (erro esperado)');
      return true;
    }
    
    console.error('[BG] ❌ Erro ao criar offscreen:', error);
    return false;
  }
}

async function playTimerFinishedSound() {
  console.log('[BG] 🔔 Timer finalizado, iniciando som...');
  
  try {
    // Garantir offscreen existe
    const offscreenOk = await ensureOffscreenDocument();
    if (!offscreenOk) {
      console.error('[BG] ❌ Falha ao criar offscreen');
      return;
    }
    
    // Obter configurações
    const data = await chrome.storage.local.get(['soundType', 'volume']);
    const soundType = data.soundType || 'sparkle';
    const volume = data.volume !== undefined ? data.volume : 70;
    
    console.log(`[BG] 📤 Enviando mensagem: soundType=${soundType}, volume=${volume}`);
    
    // Enviar mensagem para offscreen
    const response = await chrome.runtime.sendMessage({
      action: 'playTimerFinishedSound',
      soundType,
      volume
    });
    
    if (response && response.success) {
      console.log('[BG] ✅ Som tocado com sucesso');
    } else {
      console.warn('[BG] ⚠️ Resposta indica falha:', response);
    }
    
  } catch (e) {
    console.error('[BG] ❌ Erro ao tocar som timer:', e);
  }
}

async function playTestSound(soundType, volume) {
  console.log(`[BG] 🧪 Teste de som: ${soundType}, volume: ${volume}`);
  
  try {
    // Garantir offscreen existe
    const offscreenOk = await ensureOffscreenDocument();
    if (!offscreenOk) {
      console.error('[BG] ❌ Falha ao criar offscreen');
      return;
    }
    
    console.log('[BG] 📤 Enviando mensagem de teste...');
    
    // Enviar mensagem para offscreen
    const response = await chrome.runtime.sendMessage({
      action: 'testSound',
      soundType: soundType || 'sparkle',
      volume: volume !== undefined ? volume : 70
    });
    
    if (response && response.success) {
      console.log('[BG] ✅ Teste de som concluído com sucesso');
    } else {
      console.warn('[BG] ⚠️ Teste falhou:', response);
    }
    
  } catch (e) {
    console.error('[BG] ❌ Erro no teste de som:', e);
  }
}

// ----- Spotify OAuth & API -----
const manifest = chrome.runtime.getManifest();
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
];
const SPOTIFY_TOKEN_SAFETY_WINDOW_MS = 60 * 1000;
const SPOTIFY_CLIENT_ID_PLACEHOLDERS = ['YOUR_SPOTIFY_CLIENT_ID_HERE', ''];
const SPOTIFY_RATE_LIMIT_WAIT_CAP_SECONDS = 5;

const SPOTIFY_CONFIG = {
  clientId: manifest?.oauth2?.client_id || 'YOUR_SPOTIFY_CLIENT_ID_HERE',
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  apiBase: 'https://api.spotify.com/v1'
};

const spotifyRuntimeState = {
  authState: null,
  codeVerifier: null,
  refreshInFlight: null,
  lastRateLimitRetryAfter: null
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSpotifyRedirectUrl() {
  return chrome.identity.getRedirectURL();
}

async function isSpotifyDebugEnabled() {
  const cfg = await chrome.storage.local.get(['spotifyDebug']);
  return !!cfg.spotifyDebug;
}

async function spotifyLog(level, ...args) {
  const enabled = await isSpotifyDebugEnabled();
  if (!enabled && level === 'debug') return;
  const fn = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.log);
  fn('[Spotify]', ...args);
}

function normalizeSpotifyClientId(value) {
  return String(value || '').trim();
}

function isValidSpotifyClientId(clientId) {
  const normalized = normalizeSpotifyClientId(clientId);
  return normalized.length > 0 && !SPOTIFY_CLIENT_ID_PLACEHOLDERS.includes(normalized);
}

function randomString(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Base64Url(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = new Uint8Array(digest);
  let binary = '';
  arr.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeSpotifyError(error, fallbackMessage = 'Erro desconhecido no Spotify') {
  const message = error?.userMessage || error?.message || fallbackMessage;
  return {
    message,
    code: error?.code || 'spotify_error',
    retryAfter: error?.retryAfter || null
  };
}

function createSpotifyError(message, code = 'spotify_error', extras = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extras);
  return err;
}

function buildSpotifyErrorResponse(error, fallbackMessage) {
  const normalized = normalizeSpotifyError(error, fallbackMessage);
  return {
    success: false,
    error: normalized.message,
    code: normalized.code,
    retryAfter: normalized.retryAfter
  };
}

async function getSpotifyClientId() {
  const localData = await chrome.storage.local.get(['spotifyClientId']);
  const localClientId = normalizeSpotifyClientId(localData.spotifyClientId);
  if (isValidSpotifyClientId(localClientId)) {
    return { clientId: localClientId, configured: true, source: 'storage' };
  }

  const manifestClientId = normalizeSpotifyClientId(SPOTIFY_CONFIG.clientId);
  if (isValidSpotifyClientId(manifestClientId)) {
    return { clientId: manifestClientId, configured: true, source: 'manifest' };
  }

  return { clientId: null, configured: false, source: 'none' };
}

async function setSpotifyClientId(clientId) {
  const normalized = normalizeSpotifyClientId(clientId);
  if (!normalized) {
    await chrome.storage.local.remove(['spotifyClientId']);
    await clearSpotifyAuth();
    return getSpotifyClientId();
  }

  if (!isValidSpotifyClientId(normalized)) {
    throw createSpotifyError('Client ID inválido. Verifique o valor no Spotify Dashboard.', 'invalid_client_id');
  }

  await chrome.storage.local.set({ spotifyClientId: normalized });
  await clearSpotifyAuth();
  return getSpotifyClientId();
}

async function clearSpotifyAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([
      'spotifyToken',
      'spotifyTokenExpires',
      'spotifyRefreshToken',
      'spotifyTokenScope',
      'spotifyTokenType'
    ], resolve);
  });
}

async function saveSpotifyTokens(tokenPayload) {
  const expiresIn = Number.parseInt(tokenPayload.expires_in || '3600', 10);
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  const expiresAt = Date.now() + (ttl * 1000);

  const current = await chrome.storage.local.get(['spotifyRefreshToken']);
  const refreshTokenToSave = tokenPayload.refresh_token || current.spotifyRefreshToken || null;

  await chrome.storage.local.set({
    spotifyToken: tokenPayload.access_token,
    spotifyTokenExpires: expiresAt,
    spotifyRefreshToken: refreshTokenToSave,
    spotifyTokenScope: tokenPayload.scope || null,
    spotifyTokenType: tokenPayload.token_type || 'Bearer'
  });

  return {
    accessToken: tokenPayload.access_token,
    expiresAt,
    refreshToken: refreshTokenToSave
  };
}

async function exchangeSpotifyCodeForToken({ code, clientId, redirectUri, codeVerifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = null;
  }

  if (!response.ok || !payload?.access_token) {
    const message = payload?.error_description || payload?.error || `Falha na troca de code por token (${response.status})`;
    throw createSpotifyError(message, 'token_exchange_failed');
  }

  return payload;
}

async function refreshSpotifyAccessToken() {
  if (spotifyRuntimeState.refreshInFlight) {
    return spotifyRuntimeState.refreshInFlight;
  }

  spotifyRuntimeState.refreshInFlight = (async () => {
    const cfg = await chrome.storage.local.get(['spotifyRefreshToken']);
    const refreshToken = cfg.spotifyRefreshToken;
    if (!refreshToken) {
      await clearSpotifyAuth();
      throw createSpotifyError('Sessão Spotify expirada. Conecte novamente.', 'token_expired');
    }

    const client = await getSpotifyClientId();
    if (!client.configured) {
      throw createSpotifyError('Spotify não configurado. Informe o Client ID nas configurações.', 'not_configured');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: client.clientId
    });

    const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_) {
      payload = null;
    }

    if (!response.ok || !payload?.access_token) {
      await clearSpotifyAuth();
      const message = payload?.error_description || payload?.error || 'Falha ao atualizar token Spotify.';
      throw createSpotifyError(message, 'token_refresh_failed');
    }

    await saveSpotifyTokens(payload);
    await spotifyLog('debug', 'Token Spotify atualizado via refresh token');
    return payload.access_token;
  })();

  try {
    return await spotifyRuntimeState.refreshInFlight;
  } finally {
    spotifyRuntimeState.refreshInFlight = null;
  }
}

async function getSpotifyToken() {
  const data = await chrome.storage.local.get(['spotifyToken', 'spotifyTokenExpires']);
  const token = data.spotifyToken || null;
  const expiresAt = data.spotifyTokenExpires || 0;

  if (!token) {
    return null;
  }

  const isExpiredOrNearExpiry = !expiresAt || (Date.now() + SPOTIFY_TOKEN_SAFETY_WINDOW_MS >= expiresAt);
  if (!isExpiredOrNearExpiry) {
    return token;
  }

  try {
    return await refreshSpotifyAccessToken();
  } catch (error) {
    await spotifyLog('warn', 'Falha ao atualizar token automaticamente:', normalizeSpotifyError(error));
    await clearSpotifyAuth();
    return null;
  }
}

async function getSpotifyAuthStatus() {
  const client = await getSpotifyClientId();
  const data = await chrome.storage.local.get(['spotifyToken', 'spotifyTokenExpires', 'spotifyRefreshToken']);

  const token = data.spotifyToken || null;
  const expiresAtRaw = data.spotifyTokenExpires || null;
  const refreshToken = data.spotifyRefreshToken || null;
  const tokenExpired = !!token && (!expiresAtRaw || (Date.now() + SPOTIFY_TOKEN_SAFETY_WINDOW_MS >= expiresAtRaw));

  if (tokenExpired) {
    if (refreshToken) {
      try {
        await refreshSpotifyAccessToken();
        const refreshed = await chrome.storage.local.get(['spotifyTokenExpires']);
        return {
          connected: true,
          expiresAt: refreshed.spotifyTokenExpires || null,
          configured: client.configured,
          clientIdSource: client.source,
          tokenExpired: false
        };
      } catch (_) {
        await clearSpotifyAuth();
      }
    } else {
      await clearSpotifyAuth();
    }
  }

  const expiresAt = tokenExpired ? null : (expiresAtRaw || null);

  return {
    connected: !!token && !tokenExpired,
    expiresAt,
    configured: client.configured,
    clientIdSource: client.source,
    tokenExpired
  };
}

function parseSpotifyAuthResponse(redirectUrl) {
  const callbackUrl = new URL(redirectUrl);
  const hash = callbackUrl.hash.startsWith('#') ? callbackUrl.hash.slice(1) : callbackUrl.hash;
  const queryParams = callbackUrl.searchParams;
  const hashParams = new URLSearchParams(hash);

  const authError = hashParams.get('error') || queryParams.get('error');
  const authErrorDescription = hashParams.get('error_description') || queryParams.get('error_description');

  if (authError) {
    throw createSpotifyError(authErrorDescription || `Falha na autenticação: ${authError}`, authError);
  }

  const code = queryParams.get('code') || hashParams.get('code');
  const state = hashParams.get('state') || queryParams.get('state');

  if (!code) {
    throw createSpotifyError('Resposta de autenticação sem code.', 'missing_code');
  }

  return {
    code,
    state
  };
}

async function authenticateSpotify() {
  return new Promise((resolve, reject) => {
    (async () => {
      const client = await getSpotifyClientId();
      if (!client.configured) {
        throw createSpotifyError('Spotify não configurado. Informe o Client ID em Configurações.', 'not_configured');
      }

      const state = randomString(16);
      const codeVerifier = randomString(64);
      const codeChallenge = await sha256Base64Url(codeVerifier);

      spotifyRuntimeState.authState = { value: state, createdAt: Date.now() };
      spotifyRuntimeState.codeVerifier = codeVerifier;

      const authUrl = new URL(SPOTIFY_CONFIG.authEndpoint);
      authUrl.searchParams.append('client_id', client.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', getSpotifyRedirectUrl());
      authUrl.searchParams.append('scope', SPOTIFY_SCOPES.join(' '));
      authUrl.searchParams.append('show_dialog', 'true');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('code_challenge', codeChallenge);

      chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, async (redirectUrl) => {
        try {
          if (chrome.runtime.lastError) {
            throw createSpotifyError(chrome.runtime.lastError.message || 'Falha ao abrir autenticação Spotify.', 'auth_flow_error');
          }

          if (!redirectUrl) {
            throw createSpotifyError('Nenhuma URL de retorno recebida do Spotify.', 'missing_redirect_url');
          }

          const parsed = parseSpotifyAuthResponse(redirectUrl);
          const expectedState = spotifyRuntimeState.authState?.value;
          const expectedVerifier = spotifyRuntimeState.codeVerifier;
          spotifyRuntimeState.authState = null;
          spotifyRuntimeState.codeVerifier = null;

          if (!expectedState || parsed.state !== expectedState) {
            throw createSpotifyError('Falha de segurança na autenticação (state inválido). Tente novamente.', 'invalid_state');
          }

          if (!expectedVerifier) {
            throw createSpotifyError('Falha de segurança na autenticação (code_verifier ausente).', 'missing_code_verifier');
          }

          const tokenPayload = await exchangeSpotifyCodeForToken({
            code: parsed.code,
            clientId: client.clientId,
            redirectUri: getSpotifyRedirectUrl(),
            codeVerifier: expectedVerifier
          });

          await saveSpotifyTokens(tokenPayload);
          const status = await getSpotifyAuthStatus();
          await spotifyLog('info', '✅ Token autenticado e salvo com sucesso');
          resolve({ success: true, ...status });
        } catch (callbackError) {
          const normalized = normalizeSpotifyError(callbackError);
          await spotifyLog('warn', '❌ Falha no callback OAuth:', normalized);
          reject(createSpotifyError(normalized.message, normalized.code, { retryAfter: normalized.retryAfter }));
        }
      });
    })().catch(reject);
  });
}

async function spotifyApiCall(endpoint, options = {}) {
  const token = await getSpotifyToken();
  if (!token) {
    throw createSpotifyError('Spotify não autenticado. Clique em "Conectar Spotify".', 'not_connected');
  }

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
    let apiMessage = '';
    try {
      const errorBody = await response.json();
      apiMessage = errorBody?.error?.message || '';
    } catch (_) {
      apiMessage = '';
    }

    if (response.status === 401) {
      await clearSpotifyAuth();
      throw createSpotifyError('Sessão Spotify expirada. Conecte novamente.', 'token_expired');
    }

    if (response.status === 403) {
      throw createSpotifyError(apiMessage || 'Permissão negada pelo Spotify. Verifique os escopos da aplicação.', 'insufficient_scope');
    }

    if (response.status === 404 && endpoint.startsWith('/me/player')) {
      throw createSpotifyError('Nenhum dispositivo ativo no Spotify. Abra o Spotify em um dispositivo e tente novamente.', 'no_active_device');
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '1', 10);
      const safeRetryAfter = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1;
      spotifyRuntimeState.lastRateLimitRetryAfter = safeRetryAfter;
      await wait(Math.min(safeRetryAfter, SPOTIFY_RATE_LIMIT_WAIT_CAP_SECONDS) * 1000);
      throw createSpotifyError(
        `Spotify temporariamente limitou as requisições. Tente novamente em ${safeRetryAfter}s.`,
        'rate_limited',
        { retryAfter: safeRetryAfter }
      );
    }

    throw createSpotifyError(apiMessage || `Spotify API error: ${response.status}`, 'spotify_api_error');
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function getSpotifyPlaybackState() {
  const authStatus = await getSpotifyAuthStatus();

  if (!authStatus.configured) {
    return {
      success: true,
      configured: false,
      connected: false,
      hasActiveDevice: false,
      track: null,
      message: 'Spotify não configurado.'
    };
  }

  if (!authStatus.connected) {
    return {
      success: true,
      configured: true,
      connected: false,
      hasActiveDevice: false,
      track: null,
      message: authStatus.tokenExpired ? 'Token expirado. Conecte novamente.' : 'Não conectado ao Spotify.'
    };
  }

  try {
    // Fallback solicitado: tenta currently-playing primeiro, depois /me/player
    let data = null;
    try {
      data = await spotifyApiCall('/me/player/currently-playing');
    } catch (firstError) {
      const normalized = normalizeSpotifyError(firstError);
      if (!['no_active_device', 'spotify_api_error'].includes(normalized.code)) {
        throw firstError;
      }
    }

    if (!data || !data.item) {
      data = await spotifyApiCall('/me/player');
    }

    if (!data) {
      return {
        success: true,
        configured: true,
        connected: true,
        hasActiveDevice: false,
        track: null,
        message: 'Abra o Spotify em um dispositivo para controlar a reprodução.'
      };
    }

    const track = data.item ? {
      name: data.item.name,
      artist: data.item.artists?.[0]?.name || 'Unknown',
      isPlaying: !!data.is_playing,
      progress: data.progress_ms,
      duration: data.item.duration_ms
    } : null;

    return {
      success: true,
      configured: true,
      connected: true,
      hasActiveDevice: !!data.device,
      track,
      message: track ? '' : 'Abra uma música no Spotify para exibir informações.'
    };
  } catch (error) {
    const normalized = normalizeSpotifyError(error);
    if (normalized.code === 'no_active_device') {
      return {
        success: true,
        configured: true,
        connected: true,
        hasActiveDevice: false,
        track: null,
        message: 'Abra o Spotify em um dispositivo para controlar a reprodução.'
      };
    }

    return {
      success: false,
      configured: authStatus.configured,
      connected: authStatus.connected,
      hasActiveDevice: false,
      track: null,
      ...buildSpotifyErrorResponse(error, 'Falha ao consultar estado de reprodução do Spotify.')
    };
  }
}

async function getCurrentTrack() {
  const playback = await getSpotifyPlaybackState();
  if (!playback.success) {
    throw createSpotifyError(playback.error || 'Falha ao obter música atual.', playback.code || 'spotify_playback_error');
  }
  return playback.track;
}

async function ensureSpotifyReadyForControl() {
  const status = await getSpotifyAuthStatus();
  if (!status.configured) {
    throw createSpotifyError('Spotify não configurado. Informe o Client ID nas configurações.', 'not_configured');
  }

  if (!status.connected) {
    throw createSpotifyError(status.tokenExpired ? 'Token expirado. Conecte novamente.' : 'Spotify não conectado.', 'not_connected');
  }

  try {
    const player = await spotifyApiCall('/me/player');
    if (!player || !player.device) {
      throw createSpotifyError('Nenhum dispositivo ativo no Spotify.', 'no_active_device');
    }
    return player;
  } catch (error) {
    const normalized = normalizeSpotifyError(error);
    if (normalized.code === 'no_active_device') {
      throw createSpotifyError('Nenhum dispositivo ativo no Spotify.', 'no_active_device');
    }
    throw createSpotifyError(normalized.message, normalized.code, { retryAfter: normalized.retryAfter });
  }
}

async function getSpotifyConfig() {
  const client = await getSpotifyClientId();
  const status = await getSpotifyAuthStatus();
  const cfg = await chrome.storage.local.get(['spotifyDebug']);
  return {
    configured: client.configured,
    clientIdSource: client.source,
    redirectUrl: getSpotifyRedirectUrl(),
    connected: status.connected,
    expiresAt: status.expiresAt,
    debug: !!cfg.spotifyDebug
  };
}

async function disconnectSpotify() {
  await clearSpotifyAuth();
  return { success: true };
}

async function setSpotifyDebug(enabled) {
  await chrome.storage.local.set({ spotifyDebug: !!enabled });
  return { success: true, debug: !!enabled };
}

async function openSpotifyWeb() {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: 'https://open.spotify.com' }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(createSpotifyError(chrome.runtime.lastError.message || 'Falha ao abrir Spotify Web.', 'open_spotify_failed'));
        return;
      }
      resolve({ success: true, tabId: tab?.id || null });
    });
  });
}

async function playPause() {
  try {
    const current = await ensureSpotifyReadyForControl();

    if (current.is_playing) {
      await spotifyApiCall('/me/player/pause', { method: 'PUT' });
    } else {
      await spotifyApiCall('/me/player/play', { method: 'PUT' });
    }
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Play/Pause error:', e);
    return buildSpotifyErrorResponse(e, 'Falha ao alternar reprodução no Spotify.');
  }
}

async function nextTrack() {
  try {
    await ensureSpotifyReadyForControl();
    await spotifyApiCall('/me/player/next', { method: 'POST' });
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Next error:', e);
    return buildSpotifyErrorResponse(e, 'Falha ao avançar faixa no Spotify.');
  }
}

async function prevTrack() {
  try {
    await ensureSpotifyReadyForControl();
    await spotifyApiCall('/me/player/previous', { method: 'POST' });
    return { success: true };
  } catch (e) {
    console.error('[Spotify] Previous error:', e);
    return buildSpotifyErrorResponse(e, 'Falha ao voltar faixa no Spotify.');
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
      sendResponse({ success: true, message: 'Spotify autenticado com sucesso!', ...result });
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha na autenticação Spotify.'));
    });
    return true;
  }

  if (message.action === 'getSpotifyConfig') {
    getSpotifyConfig().then(config => {
      sendResponse({ success: true, ...config });
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao carregar configuração Spotify.'));
    });
    return true;
  }

  if (message.action === 'setSpotifyClientId') {
    setSpotifyClientId(message.clientId).then(config => {
      sendResponse({ success: true, configured: config.configured, clientIdSource: config.source });
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao salvar Client ID do Spotify.'));
    });
    return true;
  }

  if (message.action === 'setSpotifyDebug') {
    setSpotifyDebug(message.enabled).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao alterar modo debug Spotify.'));
    });
    return true;
  }

  if (message.action === 'openSpotifyWeb') {
    openSpotifyWeb().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao abrir Spotify Web.'));
    });
    return true;
  }

  if (message.action === 'spotifyDisconnect') {
    disconnectSpotify().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao desconectar Spotify.'));
    });
    return true;
  }

  if (message.action === 'spotifyStatus') {
    getSpotifyAuthStatus().then(status => {
      sendResponse({ success: true, ...status });
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao obter status Spotify.'));
    });
    return true;
  }

  if (message.action === 'getSpotifyPlaybackState') {
    getSpotifyPlaybackState().then(state => {
      sendResponse(state);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao obter estado de reprodução Spotify.'));
    });
    return true;
  }

  if (message.action === 'getCurrentTrack') {
    getCurrentTrack().then(track => {
      sendResponse({ success: true, track });
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao obter faixa atual do Spotify.'));
    });
    return true;
  }

  if (message.action === 'playPause') {
    playPause().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao alternar reprodução no Spotify.'));
    });
    return true;
  }

  if (message.action === 'nextTrack') {
    nextTrack().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao avançar faixa no Spotify.'));
    });
    return true;
  }

  if (message.action === 'prevTrack') {
    prevTrack().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse(buildSpotifyErrorResponse(err, 'Falha ao voltar faixa no Spotify.'));
    });
    return true;
  }

  console.warn('[BG] Ação desconhecida:', message.action);
  sendResponse({ success: false, error: 'unknown_action' });
  return true;
});
