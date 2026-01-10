/**
 * Study AI - Popup Interface
 * Manifest V3 compatible with robust error handling
 */
(function() {
  // ----- Traduções (PT-BR e EN) -----
  const TRANSLATIONS = {
    'pt-BR': {
      appTitle: 'Study AI',
      focusTab: '🧠 Foco',
      statsTab: '📈 Estatísticas',
      settingsTab: '⚙️ Configurações',
      startBtn: 'Iniciar',
      pauseBtn: 'Pausar',
      resetBtn: 'Resetar',
      timerMode: 'Modo do Timer',
      studyTheme: 'Tema de Estudo',
      focus25m: 'Foco (25m)',
      shortBreak5m: 'Pausa Curta (5m)',
      longBreak15m: 'Pausa Longa (15m)',
      currentTheme: 'Tema atual:',
      customizeTheme: 'Digite seu tema personalizado...',
      pressEnter: 'Pressione Enter para salvar',
      settings: 'Configurações',
      soundType: 'Tipo de Som',
      volume: 'Volume',
      testSound: '🔊 Testar',
      theme: 'Tema',
      darkMode: 'Escuro',
      lightMode: 'Claro',
      language: 'Idioma',
      portuguese: 'Português',
      english: 'English',
      weeklyStats: 'Estatísticas Semanais',
      sessionsByCategory: 'Sessões por Categoria'
    },
    'en': {
      appTitle: 'Study AI',
      focusTab: '🧠 Focus',
      statsTab: '📈 Stats',
      settingsTab: '⚙️ Settings',
      startBtn: 'Start',
      pauseBtn: 'Pause',
      resetBtn: 'Reset',
      timerMode: 'Timer Mode',
      studyTheme: 'Study Theme',
      focus25m: 'Focus (25m)',
      shortBreak5m: 'Short Break (5m)',
      longBreak15m: 'Long Break (15m)',
      currentTheme: 'Current theme:',
      customizeTheme: 'Enter your custom theme...',
      pressEnter: 'Press Enter to save',
      settings: 'Settings',
      soundType: 'Sound Type',
      volume: 'Volume',
      testSound: '🔊 Test',
      theme: 'Theme',
      darkMode: 'Dark',
      lightMode: 'Light',
      language: 'Language',
      portuguese: 'Português',
      english: 'English',
      weeklyStats: 'Weekly Statistics',
      sessionsByCategory: 'Sessions by Category'
    }
  };

  // ----- Estado -----
  const State = {
    currentMode: 'focus',
    isRunning: false,
    activeTab: 'focus',
    theme: 'dark',
    language: 'pt-BR',
    soundType: 'sparkle',
    volume: 70,
    categoriesDefault: ['Programação', 'Concursos', 'Idiomas', 'Matemática', 'Leitura'],
    customCategories: [],
    currentCategory: 'Programação',
    charts: { weekly: null, category: null },
  };

  // Tradução auxiliar
  const t = (key) => {
    const translations = TRANSLATIONS[State.language] || TRANSLATIONS['pt-BR'];
    return translations[key] || key;
  };

  // Utilities
  const $ = (id) => document.getElementById(id);
  const fmtTime = (s) => {
    const totalSeconds = Math.ceil(s); // Arredondar para cima para evitar "quebra" visual
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  const getISOWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };
  const dayKey = (date) => ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];

  // Tab Navigation
  function setActiveTab(tab) {
    State.activeTab = tab;
    chrome.storage.local.set({ activeTab: tab });
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  }

  // ----- Sistema de Idiomas -----
  async function updateLanguage(lang) {
    console.log(`[Popup] 🌐 Atualizando idioma para: ${lang}`);
    
    State.language = lang;
    await chrome.storage.local.set({ language: lang });
    
    // Atualizar abas
    const tabButtons = document.querySelectorAll('.tab');
    const tabNames = {
      'focus': t('focusTab'),
      'stats': t('statsTab'),
      'settings': t('settingsTab')
    };
    
    tabButtons.forEach(btn => {
      const tabName = btn.dataset.tab;
      if (tabNames[tabName]) {
        const span = btn.querySelector('span');
        if (span) span.textContent = tabNames[tabName].split(' ').slice(1).join(' ');
      }
    });
    
    // Atualizar botões
    const btnStartPause = $('btn-start-pause');
    if (btnStartPause) btnStartPause.textContent = State.isRunning ? t('pauseBtn') : t('startBtn');
    
    const btnReset = $('btn-reset');
    if (btnReset) btnReset.textContent = t('resetBtn');
    
    const testBtn = document.querySelector('[id*="test"]') || document.querySelector('button:contains("🔊")');
    // Atualizar labels
    document.querySelectorAll('.hint').forEach(hint => {
      const text = hint.textContent;
      if (text.includes('Modo')) hint.textContent = t('timerMode');
      if (text.includes('Tema')) hint.textContent = t('studyTheme');
      if (text.includes('Som')) hint.textContent = t('soundType');
      if (text.includes('Volume')) hint.textContent = t('volume');
    });
    
    console.log(`[Popup] ✅ Idioma atualizado: ${lang}`);
  }

  function setupLanguageButtons() {
    console.log('[Popup] 🌐 Configurando botões de idioma');
    
    // Procurar por botões de bandeira (PT e EN)
    const langBtns = document.querySelectorAll('[data-lang]');
    if (langBtns.length === 0) {
      console.warn('[Popup] ⚠️ Nenhum botão de idioma encontrado');
      return;
    }
    
    // Marcar botão ativo
    langBtns.forEach(btn => {
      if (btn.dataset.lang === State.language) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      
      btn.addEventListener('click', async () => {
        const lang = btn.dataset.lang;
        
        // Atualizar botões ativos
        langBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        await updateLanguage(lang);
      });
    });
    
    console.log(`[Popup] ✅ ${langBtns.length} botões de idioma configurados`);
  }

  // Background Communication (with retry logic)
  async function sendMessage(message, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await Promise.race([
          chrome.runtime.sendMessage(message),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
        if (response && response.success) return response;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 100 * attempt));
      } catch (err) {
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 100 * attempt));
        if (attempt >= maxRetries) return null;
      }
    }
    return null;
  }

  async function fullSync() {
    const resp = await sendMessage({ action: 'getTimerState' });
    if (resp && resp.data) {
      const { timeRemaining, isRunning, mode } = resp.data;
      State.isRunning = isRunning;
      State.currentMode = mode;
      $('timer-display').textContent = fmtTime(timeRemaining);
      $('btn-start-pause').textContent = isRunning ? 'Pausar' : 'Iniciar';
      $('modeSelect').value = mode;
    }
  }

  function pollTimer() {
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
      if (!response) return;
      if (response && response.data) {
        const { timeRemaining, isRunning, mode } = response.data;
        State.isRunning = isRunning; State.currentMode = mode;
        $('timer-display').textContent = fmtTime(timeRemaining);
        $('btn-start-pause').textContent = isRunning ? 'Pausar' : 'Iniciar';
        $('modeSelect').value = mode;
      }
    });
  }

  // ----- Categorias (Tema de estudo) -----
  async function loadCategories() {
    const data = await chrome.storage.local.get(['customCategories', 'currentCategory']);
    State.customCategories = Array.isArray(data.customCategories) ? data.customCategories : [];
    State.currentCategory = data.currentCategory || State.currentCategory;

    const themeSelect = $('themeSelect');
    themeSelect.innerHTML = '';
    const all = [...State.categoriesDefault, ...State.customCategories];
    all.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat; themeSelect.appendChild(opt);
    });
    const customOpt = document.createElement('option');
    customOpt.value = '__custom__'; customOpt.textContent = 'Personalizar…';
    themeSelect.appendChild(customOpt);

    if (all.includes(State.currentCategory)) themeSelect.value = State.currentCategory;
    else themeSelect.value = State.categoriesDefault[0];
    $('currentTheme').textContent = themeSelect.value;
  }

  async function saveCategory(cat) {
    State.currentCategory = cat;
    $('currentTheme').textContent = cat;
    await chrome.storage.local.set({ currentCategory: cat });
  }

  async function addCustomCategory(cat) {
    if (!cat.trim()) return;
    const set = new Set([...(State.customCategories || []), cat.trim()]);
    State.customCategories = [...set];
    await chrome.storage.local.set({ customCategories: State.customCategories });
    await saveCategory(cat.trim());
    await loadCategories();
  }

  // ----- Charts (Chart.js) -----
  function ensureCharts() {
    const weeklyCanvas = $('weeklyChart');
    const catCanvas = $('categoryChart');
    if (!weeklyCanvas || !catCanvas) return; // DOM ainda não pronto
    const weeklyCtx = weeklyCanvas.getContext('2d');
    const catCtx = catCanvas.getContext('2d');
    if (!weeklyCtx || !catCtx) return; // contexto indisponível

    if (!State.charts.weekly) {
      State.charts.weekly = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{ label: 'Sessões', data: [0,0,0,0,0,0,0], backgroundColor: '#63b0ff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }

    if (!State.charts.category) {
      State.charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#63b0ff','#8bd0ff','#2a7ef5','#f59e0b','#10b981','#ef4444','#a78bfa'] }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  async function refreshCharts() {
    try {
      ensureCharts();
      if (!State.charts.weekly || !State.charts.weekly.data || !State.charts.weekly.data.datasets) return;
      if (!State.charts.category || !State.charts.category.data || !State.charts.category.data.datasets) return;

      const { weeklyStats, currentWeek, studySessions } = await chrome.storage.local.get(['weeklyStats','currentWeek','studySessions']);
    const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const filter = document.getElementById('timeFilter').value || 'week';

    let weeklyData;
    if (filter === 'week') {
      const weekKey = currentWeek || getISOWeek(new Date());
      const stats = weeklyStats && weeklyStats[weekKey] ? weeklyStats[weekKey] : { monday:0,tuesday:0,wednesday:0,thursday:0,friday:0,saturday:0,sunday:0 };
      weeklyData = order.map(k => stats[k] || 0);
    } else {
      const sessions = Array.isArray(studySessions) ? studySessions : [];
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const agg = { monday:0,tuesday:0,wednesday:0,thursday:0,friday:0,saturday:0,sunday:0 };
      sessions.forEach(s => {
        const d = new Date(s.timestamp);
        if (filter === 'year' ? d.getFullYear() === year : (d.getFullYear() === year && d.getMonth() === month)) {
          const key = dayKey(d); agg[key] = (agg[key] || 0) + 1;
        }
      });
      weeklyData = order.map(k => agg[k] || 0);
    }
      State.charts.weekly.data.datasets[0].data = weeklyData;
      State.charts.weekly.update();

      const sessions = Array.isArray(studySessions) ? studySessions : [];
      const counts = {};
      sessions.forEach(s => { const c = s.category || 'Sem Categoria'; counts[c] = (counts[c] || 0) + 1; });
      const labels = Object.keys(counts);
      const values = labels.map(l => counts[l]);
      State.charts.category.data.labels = labels;
      State.charts.category.data.datasets[0].data = values;
      State.charts.category.update();
    } catch (e) {
      console.warn('[Popup] Falha ao atualizar charts:', e);
    }
  }

  // ----- Import/Export -----
  async function exportJson() {
    const data = await chrome.storage.local.get(['studySessions','weeklyStats','currentWeek','completedSessions','soundType','volume','currentCategory','theme','language','customCategories']);
    const exportObj = {
      exportDate: new Date().toISOString(),
      version: '3.0',
      summary: {
        totalSessions: data.completedSessions || 0,
        currentWeek: data.currentWeek || 'N/A',
        currentCategory: data.currentCategory || 'Sem Categoria'
      },
      settings: {
        soundType: data.soundType || 'sparkle',
        volume: data.volume ?? 70,
        theme: data.theme || 'dark',
        language: data.language || 'pt-BR'
      },
      customCategories: data.customCategories || [],
      weeklyStats: data.weeklyStats || {},
      sessions: data.studySessions || []
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const a = document.createElement('a'); a.href = url; a.download = `study-ai-export-${ts}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function importJson(file) {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const payload = {};
      if (obj.sessions) payload.studySessions = obj.sessions;
      if (obj.weeklyStats) payload.weeklyStats = obj.weeklyStats;
      if (obj.summary?.currentWeek) payload.currentWeek = obj.summary.currentWeek;
      if (obj.settings?.soundType) payload.soundType = obj.settings.soundType;
      if (typeof obj.settings?.volume === 'number') payload.volume = obj.settings.volume;
      if (obj.settings?.theme) payload.theme = obj.settings.theme;
      if (obj.settings?.language) payload.language = obj.settings.language;
      if (Array.isArray(obj.customCategories)) payload.customCategories = obj.customCategories;
      if (obj.summary?.currentCategory) payload.currentCategory = obj.summary.currentCategory;
      await chrome.storage.local.set(payload);
      await loadCategories();
      await refreshCharts();
    } catch (err) {
      console.warn('Erro ao importar JSON:', err);
    }
  }

  // ----- Spotify Panel -----
  async function updateSpotifyPanel() {
    try {
      const response = await sendMessage({ action: 'getCurrentTrack' });
      if (response && response.track) {
        const track = response.track;
        $('spotify-track-name').textContent = track.name || 'Nenhuma música';
        $('spotify-artist-name').textContent = track.artist || 'Unknown';
        $('spotify-panel').style.display = 'block';
        $('spotify-play').textContent = track.isPlaying ? '⏸️' : '▶️';
      } else {
        $('spotify-panel').style.display = 'none';
      }
    } catch (e) {
      console.warn('[Popup] Falha ao atualizar painel Spotify:', e);
    }
  }

  // ----- Configurações -----
  async function loadSettings() {
    const data = await chrome.storage.local.get(['soundType','volume','language','theme','activeTab']);
    State.soundType = data.soundType || State.soundType;
    State.volume = data.volume ?? State.volume;
    State.language = data.language || State.language;
    State.theme = data.theme || State.theme;
    State.activeTab = data.activeTab || State.activeTab;

    $('soundSelect').value = State.soundType;
    $('volumeSlider').value = State.volume; $('volumeValue').textContent = State.volume;
    $('languageSelect').value = State.language;
    const isDark = State.theme === 'dark'; $('themeToggle').checked = isDark; $('themeLabel').textContent = isDark ? 'Escuro' : 'Claro';
    document.body.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    setActiveTab(State.activeTab);
  }

  function setupListeners() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    $('btn-start-pause').addEventListener('click', async () => {
      const action = State.isRunning ? 'pauseTimer' : 'startTimer';
      await sendMessage({ action });
      setTimeout(pollTimer, 100);
    });

    $('btn-reset').addEventListener('click', async () => {
      await sendMessage({ action: 'resetTimer', mode: State.currentMode });
      setTimeout(pollTimer, 100);
    });

    $('modeSelect').addEventListener('change', async (e) => {
      const mode = e.target.value; State.currentMode = mode;
      await sendMessage({ action: 'setMode', mode });
      setTimeout(pollTimer, 100);
    });

    $('themeSelect').addEventListener('change', async (e) => {
      if (e.target.value === '__custom__') {
        $('customThemeRow').style.display = 'block'; $('customThemeInput').focus();
      } else {
        $('customThemeRow').style.display = 'none'; await saveCategory(e.target.value);
      }
    });

    $('customThemeInput').addEventListener('keypress', async (ev) => {
      if (ev.key === 'Enter') { await addCustomCategory(ev.target.value.trim()); $('customThemeRow').style.display = 'none'; }
    });

    $('soundSelect').addEventListener('change', async (e) => {
      State.soundType = e.target.value; await chrome.storage.local.set({ soundType: State.soundType });
    });
    
    // Test sound button
    if ($('btn-test-sound')) {
      $('btn-test-sound').addEventListener('click', async () => {
        const soundType = $('soundSelect').value;
        const volume = parseInt($('volumeSlider').value, 10);
        await sendMessage({ action: 'testSound', soundType, volume });
      });
    }

    $('volumeSlider').addEventListener('input', (e) => { $('volumeValue').textContent = e.target.value; });
    $('volumeSlider').addEventListener('change', async (e) => {
      State.volume = parseInt(e.target.value, 10); 
      await chrome.storage.local.set({ volume: State.volume });
      // Auto-test sound when volume slider is released
      const soundType = $('soundSelect').value;
      await sendMessage({ action: 'testSound', soundType, volume: State.volume });
    });
    $('languageSelect').addEventListener('change', async (e) => {
      State.language = e.target.value; await chrome.storage.local.set({ language: State.language });
    });
    
    // Spotify listeners
    if ($('btn-spotify-connect')) {
      $('btn-spotify-connect').addEventListener('click', async () => {
        const response = await sendMessage({ action: 'spotifyAuth' });
        if (response && response.success) {
          $('spotify-status').textContent = '✅ Conectado';
          $('spotify-status').style.color = '#10b981';
          $('spotify-panel').style.display = 'block';
        } else {
          $('spotify-status').textContent = '❌ Erro: ' + (response?.error || 'desconhecido');
          $('spotify-status').style.color = '#ef4444';
        }
      });
    }

    if ($('btn-spotify-play')) {
      $('btn-spotify-play').addEventListener('click', async () => {
        await sendMessage({ action: 'playPause' });
        updateSpotifyPanel();
      });
    }

    if ($('btn-spotify-next')) {
      $('btn-spotify-next').addEventListener('click', async () => {
        await sendMessage({ action: 'nextTrack' });
        updateSpotifyPanel();
      });
    }

    if ($('btn-spotify-prev')) {
      $('btn-spotify-prev').addEventListener('click', async () => {
        await sendMessage({ action: 'prevTrack' });
        updateSpotifyPanel();
      });
    }

    $('themeToggle').addEventListener('change', async (e) => {
      const dark = e.target.checked; State.theme = dark ? 'dark' : 'light';
      $('themeLabel').textContent = dark ? 'Escuro' : 'Claro';
      document.body.classList.toggle('light', !dark); document.body.classList.toggle('dark', dark);
      await chrome.storage.local.set({ theme: State.theme });
    });

    $('btn-export').addEventListener('click', exportJson);
    $('btn-import').addEventListener('click', () => $('file-import').click());
    $('file-import').addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; if (file) await importJson(file);
      e.target.value = '';
    });

    document.getElementById('timeFilter').addEventListener('change', refreshCharts);

    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local') return;
      if (changes.weeklyStats || changes.studySessions || changes.currentWeek) await refreshCharts();
      if (changes.customCategories || changes.currentCategory) await loadCategories();
      if (changes.timerState) pollTimer();
    });
  }

  // ----- Sistema de Desbloqueio de Áudio -----
  let audioUnlocked = false;

  async function unlockAudio() {
    if (audioUnlocked) return;
    
    console.log('[Popup] 🔓 Desbloqueando áudio...');
    
    try {
      // Enviar comando de desbloqueio para offscreen
      const response = await sendMessage({ action: 'unlockAudio' });
      if (response && response.success) {
        audioUnlocked = true;
        console.log('[Popup] ✅ Áudio desbloqueado com sucesso');
      }
    } catch (e) {
      console.warn('[Popup] ⚠️ Falha ao desbloquear (será tentado novamente):', e);
    }
  }

  // Adicionar listener global para desbloquear no primeiro clique
  function setupAudioUnlock() {
    const unlockOnInteraction = () => {
      unlockAudio();
      // Remover listener após primeira interação
      document.removeEventListener('click', unlockOnInteraction);
      document.removeEventListener('keydown', unlockOnInteraction);
    };
    
    document.addEventListener('click', unlockOnInteraction);
    document.addEventListener('keydown', unlockOnInteraction);
    
    console.log('[Popup] 🎧 Sistema de desbloqueio configurado');
  }

  // ----- Bootstrap -----
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] 🚀 Inicializando...');
    
    // Carregar idioma armazenado
    const savedLang = await chrome.storage.local.get('language');
    if (savedLang.language) {
      State.language = savedLang.language;
    }
    
    setupAudioUnlock(); // Configurar desbloqueio de áudio
    setupLanguageButtons(); // Configurar botões de idioma
    await loadSettings();
    await loadCategories();
    setupListeners();
    await fullSync();
    await updateSpotifyPanel();
    try { await refreshCharts(); } catch(e) { console.warn('[Popup] refreshCharts falhou no bootstrap:', e); }
    setInterval(pollTimer, 200); // 200ms para transição visual suave e sem delay
    setInterval(updateSpotifyPanel, 5000); // Atualizar painel Spotify a cada 5s
    console.log('[Popup] ✅ Inicialização completa');
  });

})();