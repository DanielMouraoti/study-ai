/**
 * Study AI - Popup Interface
 * Manifest V3 compatible with robust error handling
 */
(function() {
  // ----- Cores Fixas por Matéria -----
  const MATERIA_COLORS = {
    'Python': '#3776ab',
    'JavaScript': '#f7df1e',
    'Cloud': '#ff9900',
    'DevOps': '#00add8',
    'Infra': '#2496ed',
    'Idiomas': '#8b5cf6',
    'Músicas': '#ec4899',
    'Musicas': '#ec4899',
    'Musica': '#ec4899',
    'Música': '#ec4899',
    'Sem Categoria': '#a0a8c1',
    'Default': '#8b5cf6'
  };

  function getSubjectColor(subject) {
    return MATERIA_COLORS[subject] || MATERIA_COLORS['Default'];
  }

  // ----- Traduções Completas (PT-BR e EN) -----
  const TRANSLATIONS = {
    'pt-BR': {
      // Abas
      focusTab: 'Foco',
      statsTab: 'Estatísticas',
      settingsTab: 'Configurações',
      
      // Botões principais
      startBtn: 'Iniciar',
      pauseBtn: 'Pausar',
      resetBtn: 'Resetar',
      
      // Labels da aba Foco
      timerMode: 'Modo do Timer',
      studyTheme: 'Tema de Estudo',
      focus25m: 'Foco (25m)',
      shortBreak5m: 'Pausa Curta (5m)',
      longBreak15m: 'Pausa Longa (15m)',
      currentTheme: 'Tema atual:',
      customThemePlaceholder: 'Digite seu tema personalizado...',
      pressEnter: 'Pressione Enter para salvar',
      customize: 'Personalizar…',
      
      // Temas de Estudo (categorias)
      'Programação': 'Programação',
      'Concursos': 'Concursos',
      'Idiomas': 'Idiomas',
      'Matemática': 'Matemática',
      'Leitura': 'Leitura',
      
      // Aba Estatísticas
      dashboard: '📊 Dashboard',
      productivityTitle: '📊 Produtividade',
      week: 'Semana',
      month: 'Mês',
      year: 'Ano',
      importJson: 'Importar JSON',
      exportJson: 'Exportar JSON',
      
      // Aba Configurações
      soundType: 'Som de Conclusão',
      volume: 'Volume:',
      language: 'Idioma',
      theme: 'Tema:',
      darkMode: 'Escuro',
      lightMode: 'Claro',
      spotifyConnect: 'Conectar Spotify',
      spotifyDisconnected: 'Não conectado',
      spotifyConnected: '✅ Conectado'
    },
    'en': {
      // Tabs
      focusTab: 'Focus',
      statsTab: 'Stats',
      settingsTab: 'Settings',
      
      // Main buttons
      startBtn: 'Start',
      pauseBtn: 'Pause',
      resetBtn: 'Reset',
      
      // Focus tab labels
      timerMode: 'Timer Mode',
      studyTheme: 'Study Theme',
      focus25m: 'Focus (25m)',
      shortBreak5m: 'Short Break (5m)',
      longBreak15m: 'Long Break (15m)',
      currentTheme: 'Current theme:',
      customThemePlaceholder: 'Enter your custom theme...',
      pressEnter: 'Press Enter to save',
      customize: 'Customize…',
      
      // Study Themes (categories)
      'Programação': 'Programming',
      'Concursos': 'Competitive Exams',
      'Idiomas': 'Languages',
      'Matemática': 'Mathematics',
      'Leitura': 'Reading',
      
      // Stats tab
      dashboard: '📊 Dashboard',
      productivityTitle: '📊 Productivity',
      week: 'Week',
      month: 'Month',
      year: 'Year',
      importJson: 'Import JSON',
      exportJson: 'Export JSON',
      
      // Settings tab
      soundType: 'Completion Sound',
      volume: 'Volume:',
      language: 'Language',
      theme: 'Theme:',
      darkMode: 'Dark',
      lightMode: 'Light',
      spotifyConnect: 'Connect Spotify',
      spotifyDisconnected: 'Not connected',
      spotifyConnected: '✅ Connected'
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

  // Labels i18n para dias da semana - sempre chamada dinamicamente
  function getDayLabelsI18n() {
    const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (chrome?.i18n) {
      const translated = keys.map(key => chrome.i18n.getMessage(key));
      if (translated.every(Boolean)) {
        console.log('[getDayLabelsI18n] 🌍 Dias traduzidos:', translated);
        return translated;
      }
    }
    // Fallback neutro em inglês para evitar prender no PT
    const fallback = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    console.log('[getDayLabelsI18n] ⚠️ Usando fallback em EN:', fallback);
    return fallback;
  }

  // Traduz nomes de matérias se existir chave em messages.json
  function translateSubjectName(subject) {
    return chrome?.i18n?.getMessage(subject) || subject;
  }

  // Traduz nomes de categorias armazenadas para keys i18n
  function translateCategoryName(categoryName) {
    // Mapeamento de categorias do banco de dados para chaves i18n
    const categoryMap = {
      'Sem Categoria': 'noCategory',
      'Idiomas': 'languages',
      'Programação': 'Programação',
      'Concursos': 'Concursos',
      'Matemática': 'Matemática',
      'Leitura': 'Leitura',
      'Outros': 'noCategory'
    };
    
    const i18nKey = categoryMap[categoryName] || categoryName;
    const translated = chrome?.i18n?.getMessage(i18nKey);
    
    if (translated) {
      console.log(`[translateCategoryName] ✅ "${categoryName}" → "${translated}" (key: ${i18nKey})`);
      return translated;
    }
    
    // Fallback para tradução existente
    const fallback = translateSubjectName(categoryName);
    console.log(`[translateCategoryName] ⚠️ "${categoryName}" → "${fallback}" (fallback)`);
    return fallback;
  }

  // Tab Navigation
  function setActiveTab(tab) {
    State.activeTab = tab;
    chrome.storage.local.set({ activeTab: tab });
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
    
    // Quando aba Stats for ativada, renderizar métricas de estudo
    if (tab === 'stats') {
      console.log('[setActiveTab] 📈 Aba stats ativada, preparando renderização das métricas');
      // Aguardar aba ficar visível antes de renderizar
      setTimeout(() => {
        renderStudyMetrics();
      }, 50); // 50ms para aba ficar visível
    }
  }

  // 🎨 FUNÇÃO PREMIUM: Renderizar Métricas de Estudo com barras empilhadas
  async function renderStudyMetrics() {
    console.log('[renderStudyMetrics] 📊 Iniciando renderização das métricas de estudo | Idioma:', State.language);

    // Tradução manual robusta do título
    const isEnglish = State.language === 'en';
    const titleEl = document.getElementById('productivity-title') || document.querySelector('[data-i18n="productivityTitle"]');
    if (titleEl) {
      titleEl.innerText = isEnglish ? '📊 Productivity' : '📊 Produtividade';
      console.log('[renderStudyMetrics] 📋 Título atualizado:', titleEl.innerText);
    }
    
    const container = document.getElementById('chart-container');
    const legendContainer = document.getElementById('legend-container');
    if (!container) {
      console.error('[renderStudyMetrics] ❌ Container #chart-container não encontrado');
      return;
    }

    try {
      // Ler dados do storage
      const data = await chrome.storage.local.get(['studySessions']);
      const sessions = data.studySessions || [];
      
      console.log('[renderStudyMetrics] 📚 Sessões encontradas:', sessions.length);

      // Agrupar por dia da semana e matéria
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Domingo da semana atual
      weekStart.setHours(0, 0, 0, 0);

      // Tradução manual robusta dos dias da semana
      const isEnglish = State.language === 'en';
      const labels = isEnglish 
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      console.log('[renderStudyMetrics] 📅 Labels de dias gerados:', labels, '| Idioma atual:', State.language);
      const weekData = Array(7).fill(null).map(() => ({})); // Array de objetos {matéria: minutos}
      const subjectsUsed = new Set();

      // Processar sessões da última semana
      sessions.forEach(session => {
        const sessionDate = new Date(session.timestamp);
        if (sessionDate >= weekStart) {
          const dayIndex = sessionDate.getDay();
          const subject = session.category || 'Outros';
          const minutes = Math.floor((session.duration || 0) / 60);
          
          if (!weekData[dayIndex][subject]) {
            weekData[dayIndex][subject] = 0;
          }
          weekData[dayIndex][subject] += minutes;
          subjectsUsed.add(subject);
        }
      });

      console.log('[renderStudyMetrics] 📈 Dados processados:', weekData);

      // Calcular altura máxima para escala
      const maxMinutes = Math.max(
        ...weekData.map(day => Object.values(day).reduce((sum, mins) => sum + mins, 0)),
        60 // Mínimo de 60 minutos (1h) para escala
      );

      // Limpar containers
      container.innerHTML = '';
      if (legendContainer) legendContainer.innerHTML = '';

      // Criar colunas empilhadas para cada dia
      weekData.forEach((dayData, dayIndex) => {
        const dayTotal = Object.values(dayData).reduce((sum, mins) => sum + mins, 0);
        
        // Wrapper da coluna
        const columnWrapper = document.createElement('div');
        columnWrapper.style.cssText = `
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          position: relative;
        `;

        // Container da barra empilhada
        const stackedBar = document.createElement('div');
        stackedBar.style.cssText = `
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: stretch;
          min-height: 5px;
          cursor: pointer;
          transition: all 200ms ease;
          position: relative;
        `;

        // Tooltip ao passar o mouse (criamos antes para ligar eventos dos segmentos)
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 26, 46, 0.95);
          color: #e9edf5;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 200ms ease;
          z-index: 10;
          border: 1px solid rgba(138, 43, 226, 0.5);
          margin-bottom: 5px;
          max-width: 200px;
          white-space: pre-line;
        `;

        // Se não há dados, mostrar barra vazia
        if (dayTotal === 0) {
          const emptyBar = document.createElement('div');
          emptyBar.style.cssText = `
            height: 5px;
            background: rgba(100, 100, 100, 0.2);
            border-radius: 4px;
          `;
          stackedBar.appendChild(emptyBar);
          tooltip.textContent = 'Sem estudos';
        } else {
          // Criar segmentos empilhados
          const maxHeight = 180;
          const totalHeight = (dayTotal / maxMinutes) * maxHeight;
          
          let currentHeight = 0;
          Object.entries(dayData).forEach(([subject, minutes], index) => {
            const segmentHeight = (minutes / dayTotal) * totalHeight;
            const color = getSubjectColor(subject);
            
            const segment = document.createElement('div');
            segment.style.cssText = `
              height: ${segmentHeight}px;
              background: ${color};
              ${index === 0 ? 'border-radius: 8px 8px 0 0;' : ''}
              transition: all 200ms ease;
              position: relative;
            `;
            segment.dataset.subject = subject;
            segment.dataset.minutes = minutes;

            // Tooltip por segmento: mostra minutos exatos daquela matéria
            segment.addEventListener('mouseenter', () => {
              // Tradução manual robusta
              const isEnglish = State.language === 'en';
              let translatedSubject = subject;
              if (subject === 'Sem Categoria') {
                translatedSubject = isEnglish ? 'No category' : 'Sem Categoria';
              } else if (subject === 'Idiomas') {
                translatedSubject = isEnglish ? 'Languages' : 'Idiomas';
              } else if (subject === 'Músicas' || subject === 'Musicas' || subject === 'Musica' || subject === 'Música') {
                translatedSubject = isEnglish ? 'Music' : subject;
              }
              tooltip.textContent = `${translatedSubject}: ${minutes}m`;
              tooltip.style.opacity = '1';
              stackedBar.style.transform = 'scaleY(1.05)';
              stackedBar.style.filter = 'brightness(1.1)';
            });

            segment.addEventListener('mouseleave', () => {
              // não ocultamos aqui para permitir transição entre segmentos sem flicker
            });
            
            stackedBar.appendChild(segment);
            currentHeight += segmentHeight;
          });
        }

        stackedBar.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
          stackedBar.style.transform = 'scaleY(1)';
          stackedBar.style.filter = 'brightness(1)';
        });

        stackedBar.appendChild(tooltip);

        // Label do dia
        const label = document.createElement('div');
        label.style.cssText = `
          color: var(--text);
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          margin-top: 2px;
        `;
        label.textContent = labels[dayIndex];

        // Efeitos de hover
        stackedBar.addEventListener('mouseenter', () => {
          stackedBar.style.transform = 'scaleY(1.05)';
          tooltip.style.opacity = '1';
          stackedBar.style.filter = 'brightness(1.1)';
        });

        stackedBar.addEventListener('mouseleave', () => {
          stackedBar.style.transform = 'scaleY(1)';
          tooltip.style.opacity = '0';
          stackedBar.style.filter = 'brightness(1)';
        });

        columnWrapper.appendChild(stackedBar);
        columnWrapper.appendChild(label);
        container.appendChild(columnWrapper);
      });

      // Criar legenda
      if (legendContainer && subjectsUsed.size > 0) {
        Array.from(subjectsUsed).forEach(subject => {
          const legendItem = document.createElement('div');
          legendItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 5px;
          `;
          
          const colorBox = document.createElement('div');
          colorBox.style.cssText = `
            width: 12px;
            height: 12px;
            background: ${getSubjectColor(subject)};
            border-radius: 2px;
          `;
          
          const subjectLabel = document.createElement('span');
          // Tradução manual robusta de categorias especiais
          const isEnglish = State.language === 'en';
          let translated = subject;
          if (subject === 'Sem Categoria') {
            translated = isEnglish ? 'No category' : 'Sem Categoria';
          } else if (subject === 'Idiomas') {
            translated = isEnglish ? 'Languages' : 'Idiomas';
          } else if (subject === 'Músicas' || subject === 'Musicas' || subject === 'Musica' || subject === 'Música') {
            translated = isEnglish ? 'Music' : subject;
          }
          subjectLabel.textContent = translated;
          subjectLabel.style.cssText = `
            color: var(--text);
            font-weight: 500;
          `;
          
          legendItem.appendChild(colorBox);
          legendItem.appendChild(subjectLabel);
          legendContainer.appendChild(legendItem);
        });
      }

      console.log('[renderStudyMetrics] ✅ Métricas de estudo renderizadas com sucesso!');
    } catch (error) {
      console.error('[renderStudyMetrics] ❌ ERRO ao criar métricas:', error);
    }
  }

  // ----- Sistema de Idiomas (Profissional - 100% Cobertura) -----
  async function updateLanguage(lang) {
    State.language = lang;
    await chrome.storage.local.set({ language: lang });
    
    // 1. Atualizar todos os elementos com data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = TRANSLATIONS[lang]?.[key];
      
      if (!translation) return;
      
      // Para tabs, atualizar apenas o span interno
      if (element.classList.contains('tab')) {
        const span = element.querySelector('span');
        if (span) span.textContent = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // 2. Atualizar placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = TRANSLATIONS[lang]?.[key];
      if (translation) element.placeholder = translation;
    });
    
    // 3. Atualizar opções dos selects (Timer Mode)
    const modeSelect = $('modeSelect');
    if (modeSelect) {
      modeSelect.querySelectorAll('option').forEach(opt => {
        const key = opt.getAttribute('data-i18n');
        if (key && TRANSLATIONS[lang]?.[key]) {
          opt.textContent = TRANSLATIONS[lang][key];
        }
      });
    }
    
    // 4. Atualizar opções do filtro de tempo (Stats)
    const timeFilter = $('timeFilter');
    if (timeFilter) {
      timeFilter.querySelectorAll('option').forEach(opt => {
        const key = opt.getAttribute('data-i18n');
        if (key && TRANSLATIONS[lang]?.[key]) {
          opt.textContent = TRANSLATIONS[lang][key];
        }
      });
    }
    
    // 5. Atualizar label do tema (Dark/Light) baseado no estado atual
    const themeLabel = $('themeLabel');
    if (themeLabel) {
      themeLabel.textContent = State.theme === 'dark' 
        ? TRANSLATIONS[lang].darkMode 
        : TRANSLATIONS[lang].lightMode;
    }
    
    // 6. IMPORTANTE: Atualizar botão Start/Pause baseado no estado do timer
    const btnStartPause = $('btn-start-pause');
    if (btnStartPause) {
      btnStartPause.textContent = State.isRunning 
        ? TRANSLATIONS[lang].pauseBtn 
        : TRANSLATIONS[lang].startBtn;
    }
    
    // 7. Atualizar nome do tema atual exibido
    const currentThemeElement = $('currentTheme');
    if (currentThemeElement && State.currentCategory) {
      currentThemeElement.textContent = translateThemeName(State.currentCategory);
    }
    
    // 8. Recarregar categorias para atualizar opções do select
    await loadCategories();
  }

  function setupLanguageListener() {
    const languageSelect = $('languageSelect');
    if (!languageSelect) {
      console.warn('[setupLanguageListener] ⚠️ Seletor de idioma não encontrado');
      return;
    }
    
    // Definir valor atual
    languageSelect.value = State.language;
    console.log('[setupLanguageListener] ✅ Listener de idioma configurado. Idioma atual:', State.language);
    
    // Listener de mudança - sempre re-renderizar métricas e gráfico
    languageSelect.addEventListener('change', async (e) => {
      const newLang = e.target.value;
      console.log('[setupLanguageListener] 🌐 MUDANÇA DE IDIOMA DETECTADA:', State.language, '→', newLang);
      await updateLanguage(newLang);
      // Aguardar um tick para garantir que State.language foi atualizado
      await new Promise(r => setTimeout(r, 50));
      // Re-renderizar métricas para atualizar dias, legendas e título instantaneamente
      console.log('[setupLanguageListener] 🎨 Renderizando gráfico com novo idioma:', newLang);
      renderStudyMetrics();
    });
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

  // Função auxiliar para atualizar texto do botão Start/Pause com tradução
  function updateStartPauseButton(isRunning) {
    const btnStartPause = $('btn-start-pause');
    if (btnStartPause) {
      btnStartPause.textContent = isRunning 
        ? TRANSLATIONS[State.language].pauseBtn 
        : TRANSLATIONS[State.language].startBtn;
    }
  }
  // Função auxiliar para traduzir nome de tema
  function translateThemeName(themeName) {
    return TRANSLATIONS[State.language]?.[themeName] || themeName;
  }
  async function fullSync() {
    const resp = await sendMessage({ action: 'getTimerState' });
    if (resp && resp.data) {
      const { timeRemaining, isRunning, mode } = resp.data;
      State.isRunning = isRunning;
      State.currentMode = mode;
      $('timer-display').textContent = fmtTime(timeRemaining);
      updateStartPauseButton(isRunning);
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
        updateStartPauseButton(isRunning);
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
    
    // Adicionar opções traduzidas
    all.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = translateThemeName(cat); // Traduzir nome do tema
      themeSelect.appendChild(opt);
    });
    
    // Opção 'Personalizar' traduzida
    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = TRANSLATIONS[State.language].customize;
    themeSelect.appendChild(customOpt);

    if (all.includes(State.currentCategory)) themeSelect.value = State.currentCategory;
    else themeSelect.value = State.categoriesDefault[0];
    
    // Atualizar texto do tema atual traduzido
    $('currentTheme').textContent = translateThemeName(themeSelect.value);
  }

  async function saveCategory(cat) {
    State.currentCategory = cat;
    $('currentTheme').textContent = translateThemeName(cat); // Traduzir nome exibido
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
  function destroyCharts() {
    // Destruir instâncias antigas para evitar erro 'Canvas is already in use'
    if (State.charts.weekly && typeof State.charts.weekly.destroy === 'function') {
      try {
        State.charts.weekly.destroy();
        console.log('[Charts] Gráfico semanal destruído');
      } catch (e) {
        console.error('[Charts] Erro ao destruir gráfico semanal:', e);
      }
      State.charts.weekly = null;
    }
    if (State.charts.category && typeof State.charts.category.destroy === 'function') {
      try {
        State.charts.category.destroy();
        console.log('[Charts] Gráfico de categorias destruído');
      } catch (e) {
        console.error('[Charts] Erro ao destruir gráfico de categorias:', e);
      }
      State.charts.category = null;
    }
  }

  function ensureCharts() {
    const weeklyCanvas = $('weeklyChart');
    const catCanvas = $('categoryChart');
    if (!weeklyCanvas || !catCanvas) {
      return false;
    }
    const weeklyCtx = weeklyCanvas.getContext('2d');
    const catCtx = catCanvas.getContext('2d');
    if (!weeklyCtx || !catCtx) {
      return false;
    }

    // Destruir gráficos antigos se existirem
    destroyCharts();

    try {
      State.charts.weekly = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{ label: 'Sessões', data: [0,0,0,0,0,0,0], backgroundColor: '#63b0ff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });

      State.charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#63b0ff','#8bd0ff','#2a7ef5','#f59e0b','#10b981','#ef4444','#a78bfa'] }] },
        options: { responsive: true, maintainAspectRatio: false }
      });

      console.log('[Charts] Gráficos criados com sucesso');
      return true;
    } catch (error) {
      console.error('[Charts] Erro ao criar gráficos:', error);
      return false;
    }
  }

  // ----- Renderizar Gráfico Premium Flocus Style -----
  function renderChart(data) {
    try {
      const weeklyCanvas = $('weeklyChart');
      const catCanvas = $('categoryChart');
      if (!weeklyCanvas && !catCanvas) {
        console.warn('[renderChart] ⚠️ Canvas não encontrado');
        return;
      }

      const sessions = Array.isArray(data) ? data : [];
      const isDark = State.theme === 'dark';
      const textColor = isDark ? '#e9edf5' : '#2c3e50';
      
      // Verificar idioma atual para tradução manual robusta
      const isEnglish = State.language === 'en';
      console.log('[renderChart] 🎨 Renderizando com idioma:', isEnglish ? 'EN' : 'PT-BR');

      // Função auxiliar para traduzir categorias especiais de forma robusta
      function translateCategory(category) {
        try {
          if (category === 'Sem Categoria') {
            return isEnglish ? 'No category' : 'Sem Categoria';
          }
          if (category === 'Idiomas') {
            return isEnglish ? 'Languages' : 'Idiomas';
          }
          // Aceitar todas as variações de Música (com/sem acento, singular/plural)
          if (category === 'Músicas' || category === 'Musicas' || category === 'Musica' || category === 'Música') {
            return isEnglish ? 'Music' : category; // Mantém a forma original em PT
          }
          return category; // Mantém categorias de usuário como estão
        } catch (error) {
          console.error('[translateCategory] Erro ao traduzir categoria:', error);
          return category; // Fallback seguro
        }
      }

    // ===== GRÁFICO SEMANAL: LINE CHART COM DESIGN PREMIUM =====
    if (weeklyCanvas) {
      // Destruir instância antiga
      if (State.charts.weekly && typeof State.charts.weekly.destroy === 'function') {
        State.charts.weekly.destroy();
      }

      // Gerar dados: 7 dias com mock se vazio
      const today = new Date();
      const dayLabels = [];
      let weeklyData = [];

      // Arrays fixos de dias traduzidos manualmente
      const translatedDays = isEnglish 
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      if (sessions.length === 0) {
        // Mock data: 7 dias com horas aleatórias entre 2h e 9h
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dayOfWeek = d.getDay();
          dayLabels.push(translatedDays[dayOfWeek]);
          weeklyData.push(Math.floor(Math.random() * 7) + 2); // 2-9 horas
        }
      } else {
        // Usar dados reais: últimos 7 dias
        const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const agg = { sunday: 0, monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0 };
        sessions.forEach(s => {
          const d = new Date(s.date);
          const key = dayKey(d);
          agg[key] = (agg[key] || 0) + 1;
        });
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dayOfWeek = d.getDay();
          dayLabels.push(translatedDays[dayOfWeek]);
          const key = dayOrder[d.getDay()];
          weeklyData.push(agg[key] || 0);
        }
      }

      // Criar gradiente para preenchimento
      const ctx = weeklyCanvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, weeklyCanvas.height);
      gradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)');
      gradient.addColorStop(1, 'rgba(138, 43, 226, 0.01)');

      State.charts.weekly = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Horas de Estudo',
            data: weeklyData,
            borderColor: 'rgba(138, 43, 226, 1)',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(138, 43, 226, 1)',
            pointBorderColor: isDark ? '#1a1a2e' : '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              titleColor: textColor,
              bodyColor: textColor,
              borderColor: 'rgba(138, 43, 226, 0.5)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (ctx) => `${ctx.parsed.y}h de estudo`
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: { color: textColor, font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              display: true,
              beginAtZero: true,
              ticks: { color: textColor, font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });
    }

    // ===== GRÁFICO DE CATEGORIAS: DOUGHNUT PREMIUM =====
    if (catCanvas) {
      if (State.charts.category && typeof State.charts.category.destroy === 'function') {
        State.charts.category.destroy();
      }

      const stats = { byTheme: {} };
      sessions.forEach(s => {
        const theme = s.theme || 'Sem Categoria';
        stats.byTheme[theme] = (stats.byTheme[theme] || 0) + 1;
      });

      const themes = Object.keys(stats.byTheme);
      const themeCounts = themes.map(t => stats.byTheme[t]);
      // Traduzir labels das categorias especiais
      const labels = themes.length > 0 ? themes.map(t => translateCategory(t)) : ['Sem dados'];
      const values = themes.length > 0 ? themeCounts : [1];
      const colors = ['rgba(138, 43, 226, 0.8)', 'rgba(99, 176, 255, 0.8)', 'rgba(42, 126, 245, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(167, 139, 250, 0.8)'];

      State.charts.category = new Chart(catCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: isDark ? '#1a1a2e' : '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textColor, font: { size: 11 }, padding: 12 },
              position: 'bottom'
            },
            tooltip: {
              backgroundColor: isDark ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              titleColor: textColor,
              bodyColor: textColor,
              borderColor: 'rgba(138, 43, 226, 0.5)',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => {
                  const value = ctx.parsed || 0;
                  return `${ctx.label}: ${value} sessão${value !== 1 ? 'ões' : ''}`;
                }
              }
            }
          }
        }
      });
    }
    } catch (error) {
      console.error('[renderChart] ❌ Erro ao renderizar gráfico:', error);
      // Não propagar o erro para não quebrar a interface
    }
  }

  async function refreshCharts() {
    const { stats } = await chrome.storage.local.get(['stats']);
    renderChart(Array.isArray(stats) ? stats : []);
  }

  // ===== RENDERIZAÇÃO DE GRÁFICO CSS PURO =====
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
        const isEnglish = State.language === 'en';
        $('spotify-track-name').textContent = track.name || (isEnglish ? 'No music' : 'Nenhuma música');
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

  // ----- Carregar Estatísticas de Estudo -----
  async function loadStudyStats() {
    try {
      const result = await chrome.storage.local.get(['stats']);
      let sessions = Array.isArray(result.stats) ? result.stats : [];
      console.log('Dados recuperados do storage:', sessions);

      // Se vazio, adicionar dados fictícios para demonstração
      if (sessions.length === 0) {
        const hasInitialData = await getValueFromStorage('hasInitialDemoData');
        if (!hasInitialData) {
          sessions = generateDemoSessions();
          await chrome.storage.local.set({ 
            stats: sessions,
            hasInitialDemoData: true 
          });
        }
      }

      // Renderizar gráfico com os dados
      renderChart(sessions);
      
      console.log('[Popup] Estatísticas carregadas:', sessions.length, 'sessões');
    } catch (error) {
      console.error('[Popup] Erro ao carregar estatísticas:', error);
    }
  }

  // ----- Gerar Dados Fictícios de Demonstração -----
  function generateDemoSessions() {
    const demos = [];
    const themes = ['Python', 'JavaScript', 'Programação', 'Idiomas', 'Matemática'];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Criar 15 sessões fictícias distribuídas nos últimos 15 dias
    for (let i = 0; i < 15; i++) {
      const timestamp = now - (i * oneDayMs) + Math.random() * 60000;
      demos.push({
        date: new Date(timestamp).toISOString(),
        duration: 25,
        theme: themes[Math.floor(Math.random() * themes.length)],
        mode: 'focus'
      });
    }

    return demos;
  }

  // ----- Processar Sessões para Gráficos -----
  function processSessions(sessions) {
    const stats = {
      byDay: { sunday: 0, monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0 },
      byTheme: {},
      total: 0,
      totalMinutes: 0
    };

    sessions.forEach(session => {
      const date = new Date(session.date);
      const day = dayKey(date);
      
      stats.byDay[day] += 1;
      stats.byTheme[session.theme] = (stats.byTheme[session.theme] || 0) + 1;
      stats.total += 1;
      stats.totalMinutes += session.duration;
    });

    return stats;
  }

  // ----- Atualizar Gráficos com Dados -----
  function updateChartsWithData(stats) {
    try {
      const weeklyCanvas = $('weeklyChart');
      const catCanvas = $('categoryChart');
      
      if (!weeklyCanvas || !catCanvas) return;

      // Atualizar gráfico semanal
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const weeklyData = dayOrder.map(day => stats.byDay[day] || 0);
      
      if (State.charts.weekly) {
        State.charts.weekly.data.datasets[0].data = weeklyData;
        State.charts.weekly.update();
      }

      // Atualizar gráfico de categorias
      const themes = Object.keys(stats.byTheme);
      const themeCounts = themes.map(t => stats.byTheme[t]);
      
      if (State.charts.category) {
        State.charts.category.data.labels = themes;
        State.charts.category.data.datasets[0].data = themeCounts;
        State.charts.category.update();
      }
    } catch (error) {
      console.error('[Popup] Erro ao atualizar gráficos:', error);
    }
  }

  // ----- Auxiliar para obter valor do storage -----
  async function getValueFromStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (data) => {
        resolve(data[key]);
      });
    });
  }

  // ----- Função de Teste: Salvar 5 Sessões Fake -----
  // ----- Configurações -----
  async function loadSettings() {
    const data = await chrome.storage.local.get(['soundType','volume','language','theme','activeTab']);
    State.soundType = data.soundType || State.soundType;
    State.volume = data.volume ?? State.volume;
    State.language = data.language || State.language;
    State.theme = data.theme || State.theme;
    State.activeTab = data.activeTab || State.activeTab;

    if ($('soundSelect')) $('soundSelect').value = State.soundType;
    $('volumeSlider').value = State.volume; $('volumeValue').textContent = State.volume;
    $('languageSelect').value = State.language;
    const isDark = State.theme === 'dark'; $('themeToggle').checked = isDark; $('themeLabel').textContent = isDark ? 'Escuro' : 'Claro';
    document.body.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    setActiveTab(State.activeTab);
  }

  function setupListeners() {
    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    // Timer controls - COM SEGURANÇA
    if ($('btn-start-pause')) {
      $('btn-start-pause').addEventListener('click', async () => {
        const action = State.isRunning ? 'pauseTimer' : 'startTimer';
        await sendMessage({ action });
        setTimeout(pollTimer, 100);
      });
    }

    if ($('btn-reset')) {
      $('btn-reset').addEventListener('click', async () => {
        await sendMessage({ action: 'resetTimer', mode: State.currentMode });
        setTimeout(pollTimer, 100);
      });
    }

    if ($('modeSelect')) {
      $('modeSelect').addEventListener('change', async (e) => {
        const mode = e.target.value; State.currentMode = mode;
        await sendMessage({ action: 'setMode', mode });
        setTimeout(pollTimer, 100);
      });
    }

    // Theme select
    if ($('themeSelect')) {
      $('themeSelect').addEventListener('change', async (e) => {
        if (e.target.value === '__custom__') {
          if ($('customThemeRow')) $('customThemeRow').style.display = 'block';
          if ($('customThemeInput')) $('customThemeInput').focus();
        } else {
          if ($('customThemeRow')) $('customThemeRow').style.display = 'none';
          await saveCategory(e.target.value);
        }
      });
    }

    if ($('customThemeInput')) {
      $('customThemeInput').addEventListener('keypress', async (ev) => {
        if (ev.key === 'Enter') {
          await addCustomCategory(ev.target.value.trim());
          if ($('customThemeRow')) $('customThemeRow').style.display = 'none';
        }
      });
    }

    // Sound select
    if ($('soundSelect')) {
      $('soundSelect').addEventListener('change', async (e) => {
        State.soundType = e.target.value;
        await chrome.storage.local.set({ soundType: State.soundType });
        const volume = parseInt($('volumeSlider')?.value || 70, 10);
        await sendMessage({ action: 'testSound', soundType: State.soundType, volume });
      });
    }

    // Volume slider
    if ($('volumeSlider')) {
      $('volumeSlider').addEventListener('input', (e) => {
        if ($('volumeValue')) $('volumeValue').textContent = e.target.value;
      });

      let volumeDebounceTimer = null;
      $('volumeSlider').addEventListener('input', async (e) => {
        clearTimeout(volumeDebounceTimer);
        volumeDebounceTimer = setTimeout(async () => {
          const volume = parseInt(e.target.value, 10);
          await sendMessage({ action: 'testSound', soundType: State.soundType, volume });
        }, 300);
      });

      $('volumeSlider').addEventListener('change', async (e) => {
        State.volume = parseInt(e.target.value, 10);
        await chrome.storage.local.set({ volume: State.volume });
        await sendMessage({ action: 'testSound', soundType: State.soundType, volume: State.volume });
      });
    }

    // Language select
    if ($('languageSelect')) {
      $('languageSelect').addEventListener('change', async (e) => {
        const newLang = e.target.value;
        State.language = newLang;
        await chrome.storage.local.set({ language: State.language });
        
        // Atualizar título imediatamente se estiver na aba Stats
        const titleEl = document.getElementById('productivity-title');
        if (titleEl) {
          const isEnglish = newLang === 'en';
          titleEl.innerText = isEnglish ? '📊 Productivity' : '📊 Produtividade';
        }
        
        // Re-renderizar gráfico se estiver na aba Stats
        if (State.activeTab === 'stats') {
          await new Promise(r => setTimeout(r, 50));
          renderStudyMetrics();
        }
      });
    }

    // Spotify listeners - COM SEGURANÇA
    if ($('btn-spotify-connect')) {
      $('btn-spotify-connect').addEventListener('click', async () => {
        const response = await sendMessage({ action: 'spotifyAuth' });
        if (response && response.success) {
          if ($('spotify-status')) {
            $('spotify-status').textContent = '✅ Conectado';
            $('spotify-status').style.color = '#10b981';
          }
          if ($('spotify-panel')) $('spotify-panel').style.display = 'block';
        } else {
          if ($('spotify-status')) {
            $('spotify-status').textContent = '❌ Erro: ' + (response?.error || 'desconhecido');
            $('spotify-status').style.color = '#ef4444';
          }
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

    // Theme toggle
    if ($('themeToggle')) {
      $('themeToggle').addEventListener('change', async (e) => {
        const dark = e.target.checked;
        State.theme = dark ? 'dark' : 'light';
        if ($('themeLabel')) $('themeLabel').textContent = dark ? 'Escuro' : 'Claro';
        document.body.classList.toggle('light', !dark);
        document.body.classList.toggle('dark', dark);
        await chrome.storage.local.set({ theme: State.theme });
      });
    }

    // Export/Import - COM SEGURANÇA
    if ($('btn-export')) {
      $('btn-export').addEventListener('click', exportJson);
    }

    if ($('btn-import')) {
      $('btn-import').addEventListener('click', () => {
        if ($('file-import')) $('file-import').click();
      });
    }

    if ($('file-import')) {
      $('file-import').addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) await importJson(file);
        e.target.value = '';
      });
    }

    // Storage listener
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local') return;
      if (changes.weeklyStats || changes.studySessions || changes.currentWeek || changes.stats) {
        // Métricas foram atualizadas, renderizar novamente se estiver na aba stats
        if (State.activeTab === 'stats') {
          renderStudyMetrics();
        }
      }
      if (changes.customCategories || changes.currentCategory) await loadCategories();
      if (changes.timerState) pollTimer();
    });
  }

  // ----- Sistema de Desbloqueio de Áudio -----
  let audioUnlocked = false;

  async function unlockAudio() {
    if (audioUnlocked) return;
    
    try {
      // Enviar comando de desbloqueio para offscreen
      const response = await sendMessage({ action: 'unlockAudio' });
      if (response && response.success) {
        audioUnlocked = true;
      }
    } catch (e) {
      // Silenciar erro - será tentado novamente se necessário
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
  }

  // ----- Bootstrap -----
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DOMContentLoaded] 🚀 Inicializando popup');
    
    // 🔴 PRIORIDADE 1: Sincronizar estado do Timer do background
    await fullSync();
    
    // PRIORIDADE 2: Iniciar polling do Timer (mantém sincronizado)
    setInterval(pollTimer, 200);
    
    // Carregar idioma armazenado
    const savedLang = await chrome.storage.local.get('language');
    if (savedLang.language) {
      State.language = savedLang.language;
    }
    
    // Setup e listeners
    setupAudioUnlock();
    setupLanguageListener();
    await loadSettings();
    await loadCategories();
    setupListeners();
    
    // Traduções e UI
    await updateLanguage(State.language);
    await updateSpotifyPanel();
    setInterval(updateSpotifyPanel, 5000);
    
    console.log('[DOMContentLoaded] ✅ Popup inicializado');
  });

})();