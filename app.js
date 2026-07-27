/**
 * APLICATIVO: Hora da Água
 * Lógica de Controle de Estado, UI, Simulação de AdMob e Notificações Locais
 */

// Configurações reais do Google AdMob (Cordova Plugin)
const ADMOB_CONFIG = {
  bannerId: 'ca-app-pub-5547281029987620/8931728523',       // Bloco de Banner Real do AdMob
  interstitialId: 'ca-app-pub-5547281029987620/7831354137', // Bloco de Interstitial Real do AdMob
  isTesting: false                                           // Desativar anúncios de teste para rodar em produção
};

const STORAGE_KEYS = {
  META: 'hora_agua_meta_diaria',
  CONSUMO: 'hora_agua_consumo_diario',
  PESO: 'hora_agua_peso_usuario',
  ULTIMA_DATA: 'hora_agua_ultima_data',
  INTERSTITIAL_HOJE: 'hora_agua_interstitial_hoje',
  INTERVALO: 'hora_agua_lembrete_intervalo',
  INTERVALO_MINS: 'hora_agua_lembrete_intervalo_mins',
  ULTIMO_LEMBRETE: 'hora_agua_ultimo_lembrete_time',
  TEMA: 'hora_agua_tema_visual',
  BOTAO_1: 'hora_agua_botao_1_medida',
  BOTAO_2: 'hora_agua_botao_2_medida',
  GENERO: 'hora_agua_genero_usuario',
  PREMIUM: 'hora_agua_pro_premium',
  BOTAO_1_MODELO: 'hora_agua_botao_1_modelo',
  BOTAO_2_MODELO: 'hora_agua_botao_2_modelo',
  SOM_LEMBRETE: 'hora_agua_som_lembrete',
  HISTORICO: 'hora_agua_historico_consumo',
  EXERCICIO: 'hora_agua_exercicio_hoje',
  CLIMA_QUENTE: 'hora_agua_clima_quente_hoje'
};

let state = {
  metaDiaria: 2000,       // em ml
  consumoDiario: 0,       // em ml
  pesoUsuario: null,      // em kg
  ultimaData: '',         // YYYY-MM-DD
  interstitialHoje: false, // se já mostrou interstitial hoje
  lembreteIntervalo: '120', // "disabled", "30", "60", "120", "180", "custom"
  lembreteIntervaloMins: 120, // valor efetivo em minutos
  ultimoLembreteTime: 0,   // timestamp do último alerta/ação
  temaVisual: 'dark',      // 'dark', 'light', 'cyberpunk', 'oceano'
  medidaBotao1: 250,       // em ml
  medidaBotao2: 500,       // em ml
  generoUsuario: 'masculino', // 'masculino' ou 'feminino'
  isPremium: false,        // licença PRO
  modeloBotao1: 'copo',    // 'copo', 'garrafa', 'squeeze', 'stanley', 'galao', 'coco'
  modeloBotao2: 'garrafa',  // recipiente do botão 2
  somLembrete: 'gota',     // 'gota', 'gelo', 'bolhas', 'cachoeira'
  exercicioHoje: false,    // se praticou exercícios hoje (+500ml)
  climaQuenteHoje: false,  // se o clima está muito quente hoje (+300ml)
  historicoDias: []        // lista de registros de dias anteriores
};

// Mock de anúncios para o AdMob Banner
const ADS_DATABASE = [
  {
    title: "Mantenha-se Saudável!",
    desc: "Beba água regularmente para mais energia.",
    action: "Ver Mais",
    icon: "sparkles"
  },
  {
    title: "Hora da Água Premium",
    desc: "Remova todos os anúncios por apenas R$ 4,90.",
    action: "Remover Anúncios",
    icon: "shield-check"
  },
  {
    title: "Desafio 30 Dias Fitness",
    desc: "Melhore seu estilo de vida com treinos rápidos.",
    action: "Baixar Grátis",
    icon: "activity"
  },
  {
    title: "Garrafa Inteligente SmartGlow",
    desc: "A garrafa que brilha para lembrar você de beber água.",
    action: "Comprar",
    icon: "shopping-bag"
  }
];

// ==========================================================================
// INICIALIZAÇÃO DO APLICATIVO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Carregar dados salvos
  loadStateFromLocalStorage();

  // Inicializar dados de histórico mockados
  initHistoryData();

  // Configurar visualização e restrições do plano Pro
  renderProStatus();

  // Aplicar tema carregado
  applyTheme();

  // Verificar reset diário de meia-noite
  checkMidnightReset();

  // Renderizar ícones do Lucide
  lucide.createIcons();

  // Registrar Event Listeners
  setupEventListeners();

  // Verificar qual tela abrir
  checkInitialScreen();

  // Renderizar a interface com os dados atuais
  renderUI();

  // Solicitar permissão de notificação nativa
  requestNotificationPermission();

  // Iniciar temporizador de lembretes
  startReminderTimer();

  // Iniciar rotação de anúncios do Banner AdMob
  startBannerAdRotation();
  
  // Registrar evento deviceready para carregar o AdMob real no APK
  document.addEventListener('deviceready', initRealAdMob, false);
}

// Carregar variáveis do localStorage
function loadStateFromLocalStorage() {
  state.metaDiaria = parseInt(localStorage.getItem(STORAGE_KEYS.META)) || 2000;
  state.consumoDiario = parseInt(localStorage.getItem(STORAGE_KEYS.CONSUMO)) || 0;
  state.pesoUsuario = localStorage.getItem(STORAGE_KEYS.PESO) ? parseFloat(localStorage.getItem(STORAGE_KEYS.PESO)) : null;
  state.ultimaData = localStorage.getItem(STORAGE_KEYS.ULTIMA_DATA) || '';
  state.interstitialHoje = localStorage.getItem(STORAGE_KEYS.INTERSTITIAL_HOJE) === 'true';

  state.lembreteIntervalo = localStorage.getItem(STORAGE_KEYS.INTERVALO) || '120';
  state.lembreteIntervaloMins = parseInt(localStorage.getItem(STORAGE_KEYS.INTERVALO_MINS)) || 120;
  state.ultimoLembreteTime = parseInt(localStorage.getItem(STORAGE_KEYS.ULTIMO_LEMBRETE)) || Date.now();
  state.temaVisual = localStorage.getItem(STORAGE_KEYS.TEMA) || 'dark';

  state.medidaBotao1 = parseInt(localStorage.getItem(STORAGE_KEYS.BOTAO_1)) || 250;
  state.medidaBotao2 = parseInt(localStorage.getItem(STORAGE_KEYS.BOTAO_2)) || 500;
  state.generoUsuario = localStorage.getItem(STORAGE_KEYS.GENERO) || 'masculino';

  state.isPremium = false; // Forçar sempre gratuito
  state.modeloBotao1 = 'copo'; // Apenas copo padrão
  state.modeloBotao2 = 'garrafa'; // Apenas garrafa padrão
  state.somLembrete = 'gota'; // Apenas som de gota
  state.exercicioHoje = localStorage.getItem(STORAGE_KEYS.EXERCICIO) === 'true';
  state.climaQuenteHoje = localStorage.getItem(STORAGE_KEYS.CLIMA_QUENTE) === 'true';
  state.baseMetaDiaria = parseInt(localStorage.getItem('hora_agua_base_meta_diaria')) || state.metaDiaria;
  state.modeloCopoVisual = 'copo'; // Apenas copo padrão no visual central
  
  // Forçar tema comum se estiver usando tema premium
  if (state.temaVisual !== 'dark' && state.temaVisual !== 'light') {
    state.temaVisual = 'dark';
  }
  
  try {
    state.historicoDias = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO)) || [];
  } catch (e) {
    state.historicoDias = [];
  }
}

// Salvar estado atual no localStorage
function saveStateToLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.META, state.metaDiaria.toString());
  localStorage.setItem(STORAGE_KEYS.CONSUMO, state.consumoDiario.toString());
  if (state.pesoUsuario) {
    localStorage.setItem(STORAGE_KEYS.PESO, state.pesoUsuario.toString());
  } else {
    localStorage.removeItem(STORAGE_KEYS.PESO);
  }
  localStorage.setItem(STORAGE_KEYS.ULTIMA_DATA, state.ultimaData);
  localStorage.setItem(STORAGE_KEYS.INTERSTITIAL_HOJE, state.interstitialHoje.toString());

  localStorage.setItem(STORAGE_KEYS.INTERVALO, state.lembreteIntervalo);
  localStorage.setItem(STORAGE_KEYS.INTERVALO_MINS, state.lembreteIntervaloMins.toString());
  localStorage.setItem(STORAGE_KEYS.ULTIMO_LEMBRETE, state.ultimoLembreteTime.toString());
  localStorage.setItem(STORAGE_KEYS.TEMA, state.temaVisual);

  localStorage.setItem(STORAGE_KEYS.BOTAO_1, state.medidaBotao1.toString());
  localStorage.setItem(STORAGE_KEYS.BOTAO_2, state.medidaBotao2.toString());
  localStorage.setItem(STORAGE_KEYS.GENERO, state.generoUsuario);

  localStorage.setItem(STORAGE_KEYS.PREMIUM, state.isPremium.toString());
  localStorage.setItem(STORAGE_KEYS.BOTAO_1_MODELO, state.modeloBotao1);
  localStorage.setItem(STORAGE_KEYS.BOTAO_2_MODELO, state.modeloBotao2);
  localStorage.setItem(STORAGE_KEYS.SOM_LEMBRETE, state.somLembrete);
  localStorage.setItem(STORAGE_KEYS.EXERCICIO, state.exercicioHoje.toString());
  localStorage.setItem(STORAGE_KEYS.CLIMA_QUENTE, state.climaQuenteHoje.toString());
  localStorage.setItem('hora_agua_base_meta_diaria', state.baseMetaDiaria.toString());
  localStorage.setItem('hora_agua_modelo_copo_visual', state.modeloCopoVisual || 'copo');
  localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(state.historicoDias));
}

// Lógica de reset diário de meia-noite
function checkMidnightReset() {
  const dataHojeStr = new Date().toDateString(); // Ex: "Fri Jun 26 2026"
  
  if (state.ultimaData && state.ultimaData !== dataHojeStr) {
    // Salvar o dia que terminou no histórico de consumo
    try {
      const dataAnteriorISO = new Date(state.ultimaData).toISOString().split('T')[0];
      const jaExiste = state.historicoDias.some(d => d.data === dataAnteriorISO);
      
      if (!jaExiste) {
        state.historicoDias.push({
          data: dataAnteriorISO,
          consumo: state.consumoDiario,
          meta: state.metaDiaria
        });
        
        // Manter apenas os últimos 30 registros
        if (state.historicoDias.length > 30) {
          state.historicoDias.shift();
        }
      }
    } catch (e) {
      console.warn("Erro ao registrar histórico no reset diário:", e);
    }

    // O dia mudou! Zera o consumo e as metas inteligentes diárias
    state.consumoDiario = 0;
    state.interstitialHoje = false;
    state.exercicioHoje = false;
    state.climaQuenteHoje = false;
    
    // Resetar metaDiaria para a meta base sem os offsets do dia anterior
    state.metaDiaria = state.baseMetaDiaria;
    
    showToast("Novo dia! Seu progresso de água foi reiniciado.", "info", "clock");
  }
  
  // Atualiza a última data ativa
  state.ultimaData = dataHojeStr;
  saveStateToLocalStorage();
}

// Inicializar histórico fictício para fins de teste
function initHistoryData() {
  if (!state.historicoDias || state.historicoDias.length === 0) {
    const historicoMock = [];
    const dataAtual = new Date();
    const metaBase = state.baseMetaDiaria || 2000;
    
    // Percentuais de sucesso simulados para os últimos 6 dias
    const mockPcts = [0.90, 1.05, 0.75, 1.10, 0.95, 1.02];
    
    for (let i = 6; i >= 1; i--) {
      const d = new Date();
      d.setDate(dataAtual.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      const pct = mockPcts[6 - i];
      
      historicoMock.push({
        data: dataStr,
        consumo: Math.round(metaBase * pct),
        meta: metaBase
      });
    }
    
    state.historicoDias = historicoMock;
    saveStateToLocalStorage();
  }
}

// Histórico Modal Actions
function openHistoryModal() {
  const modal = document.getElementById('modal-history');
  if (!modal) return;
  
  // Assegura histórico populado
  initHistoryData();
  
  // Desenha os gráficos
  renderHistoryChart();
  
  modal.classList.add('active');
}

function closeHistoryModal() {
  const modal = document.getElementById('modal-history');
  if (modal) {
    modal.classList.remove('active');
  }
}

function renderHistoryChart() {
  const chartWrapper = document.getElementById('chart-bars-wrapper');
  if (!chartWrapper) return;
  
  const hojeISO = new Date().toISOString().split('T')[0];
  const hojeEntry = {
    data: hojeISO,
    consumo: state.consumoDiario,
    meta: state.metaDiaria
  };
  
  // Captura os últimos 6 dias do histórico + hoje
  const ultimosDias = [...state.historicoDias].slice(-6);
  ultimosDias.push(hojeEntry);
  
  // Fallback de dias vazios (caso histórico corrompa)
  while (ultimosDias.length < 7) {
    const d = new Date();
    d.setDate(d.getDate() - (7 - ultimosDias.length));
    const dataStr = d.toISOString().split('T')[0];
    ultimosDias.unshift({
      data: dataStr,
      consumo: 0,
      meta: 2000
    });
  }
  
  // Calcular métricas
  let totalConsumido = 0;
  let diasMetaBatida = 0;
  let streak = 0;
  let streakAtivo = true;
  
  ultimosDias.forEach(d => {
    totalConsumido += d.consumo;
    if (d.consumo >= d.meta) {
      diasMetaBatida++;
    }
  });
  
  const mediaDiaria = Math.round(totalConsumido / ultimosDias.length);
  
  // Calcular sequências (streaks) de metas batidas retroativamente a partir de hoje/ontem
  const ultimosDiasReverso = [...ultimosDias].reverse();
  ultimosDiasReverso.forEach((d, idx) => {
    if (d.consumo >= d.meta) {
      if (streakAtivo) streak++;
    } else {
      // Se falhou hoje, o streak ainda não quebra formalmente até o dia acabar,
      // mas se falhou ontem ou antes, quebra o streak ativo.
      if (idx > 0) {
        streakAtivo = false;
      }
    }
  });
  
  // Injetar valores estatísticos no modal
  document.getElementById('stats-average').textContent = `${mediaDiaria} ml`;
  document.getElementById('stats-completed').textContent = `${diasMetaBatida} ${diasMetaBatida === 1 ? 'dia' : 'dias'}`;
  document.getElementById('stats-streak').textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;
  
  // Renderizar gráfico de barras verticais
  chartWrapper.innerHTML = '';
  const diasDaSemanaAbreviados = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  
  ultimosDias.forEach(entry => {
    const dataObj = new Date(entry.data + 'T12:00:00'); // Evita bug de timezone
    const diaSemanaLabel = diasDaSemanaAbreviados[dataObj.getDay()];
    
    const pct = entry.meta > 0 ? Math.min(Math.round((entry.consumo / entry.meta) * 100), 100) : 0;
    
    // Determinar a tonalidade de azul (classe do nível de hidratação)
    let levelClass = 'level-1'; // Até 30%
    if (pct > 30 && pct <= 60) {
      levelClass = 'level-2';   // Até 60%
    } else if (pct > 60 && pct < 90) {
      levelClass = 'level-3';   // Intermediário (61% a 89%)
    } else if (pct >= 90) {
      levelClass = 'level-4';   // Meta alcançada / excelente (90% a 100%+)
    }
    
    const column = document.createElement('div');
    column.className = 'chart-bar-column';
    
    column.innerHTML = `
      <span class="chart-value-label">${entry.consumo}ml</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill ${levelClass}" style="height: ${pct}%;"></div>
      </div>
      <span class="chart-day-label">${diaSemanaLabel}</span>
    `;
    
    chartWrapper.appendChild(column);
  });
}

// Controla exibição de Tela 1 vs Tela 2
function checkInitialScreen() {
  const setupScreen = document.getElementById('screen-setup');
  const mainScreen = document.getElementById('screen-main');
  
  // Se o usuário já possui uma meta salva anteriormente (não é primeiro acesso)
  if (localStorage.getItem(STORAGE_KEYS.META)) {
    setupScreen.classList.remove('active');
    mainScreen.classList.add('active');
  } else {
    setupScreen.classList.add('active');
    mainScreen.classList.remove('active');
  }
}

// ==========================================================================
// CONFIGURAÇÃO DOS EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // Tela 1: Envio do Formulário de Peso
  const formSetup = document.getElementById('form-setup');
  if (formSetup) {
    formSetup.addEventListener('submit', (e) => {
      e.preventDefault();
      handleWeightSubmit();
    });
  }

  // Tela 1: Pular e usar meta padrão
  const btnSkip = document.getElementById('btn-skip-weight');
  if (btnSkip) {
    btnSkip.addEventListener('click', () => {
      handleSkipSetup();
    });
  }

  // Tela 2: Botões de Adicionar Água
  document.getElementById('btn-add-250').addEventListener('click', () => {
    state.modeloCopoVisual = state.modeloBotao1;
    saveStateToLocalStorage();
    addWater(state.medidaBotao1, 'Botão 1');
  });
  document.getElementById('btn-add-500').addEventListener('click', () => {
    state.modeloCopoVisual = state.modeloBotao2;
    saveStateToLocalStorage();
    addWater(state.medidaBotao2, 'Botão 2');
  });

  // Modais e Configurações
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('modal-settings');
  const settingsOverlay = document.getElementById('settings-overlay');

  btnSettings.addEventListener('click', () => {
    openSettingsModal();
  });

  const closeSettings = () => {
    modalSettings.classList.remove('active');
  };
  btnCloseSettings.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', closeSettings);

  // Ações do Modal de Ajustes
  document.getElementById('btn-recalculate-meta').addEventListener('click', recalculateMetaFromSettings);
  document.getElementById('btn-save-manual-meta').addEventListener('click', saveManualMetaFromSettings);
  document.getElementById('btn-reset-today').addEventListener('click', resetTodayProgress);
  document.getElementById('btn-reset-all').addEventListener('click', resetAllData);
  document.getElementById('btn-simulate-notification').addEventListener('click', triggerSimulatedNotification);

  // Lógica do seletor de lembrete
  const selectInterval = document.getElementById('settings-interval');
  const customIntervalWrapper = document.getElementById('custom-interval-wrapper');
  if (selectInterval) {
    selectInterval.addEventListener('change', () => {
      if (selectInterval.value === 'custom') {
        customIntervalWrapper.classList.remove('hidden');
        document.getElementById('settings-custom-interval-mins').focus();
      } else {
        customIntervalWrapper.classList.add('hidden');
      }
    });
  }

  // Ação de Salvar Lembrete
  const btnSaveInterval = document.getElementById('btn-save-interval');
  if (btnSaveInterval) {
    btnSaveInterval.addEventListener('click', saveReminderIntervalFromSettings);
  }

  // Ação de Salvar Atalhos de Adição
  const btnSaveShortcuts = document.getElementById('btn-save-shortcuts');
  if (btnSaveShortcuts) {
    btnSaveShortcuts.addEventListener('click', saveCustomShortcutsFromSettings);
  }

  // Alternar temas
  const btnThemeDark = document.getElementById('btn-theme-dark');
  const btnThemeLight = document.getElementById('btn-theme-light');
  const btnThemeCyberpunk = document.getElementById('btn-theme-cyberpunk');
  const btnThemeOceano = document.getElementById('btn-theme-oceano');
  if (btnThemeDark) btnThemeDark.addEventListener('click', () => setTheme('dark'));
  if (btnThemeLight) btnThemeLight.addEventListener('click', () => setTheme('light'));
  if (btnThemeCyberpunk) btnThemeCyberpunk.addEventListener('click', () => setTheme('cyberpunk'));
  if (btnThemeOceano) btnThemeOceano.addEventListener('click', () => setTheme('oceano'));

  // Switches de Meta Inteligente
  const switchExercise = document.getElementById('switch-exercise');
  const switchWeather = document.getElementById('switch-weather');
  if (switchExercise) switchExercise.addEventListener('change', toggleSmartMeta);
  if (switchWeather) switchWeather.addEventListener('change', toggleSmartMeta);

  // Ações do Modal de Histórico
  const btnHistory = document.getElementById('btn-history');
  const btnCloseHistory = document.getElementById('btn-close-history');
  const historyOverlay = document.getElementById('history-overlay');
  if (btnHistory) btnHistory.addEventListener('click', openHistoryModal);
  if (btnCloseHistory) btnCloseHistory.addEventListener('click', closeHistoryModal);
  if (historyOverlay) historyOverlay.addEventListener('click', closeHistoryModal);

  // Ações de Adição Rápida Personalizada da Tela Principal
  const btnQuickCustomAdd = document.getElementById('btn-quick-custom-add');
  if (btnQuickCustomAdd) {
    btnQuickCustomAdd.addEventListener('click', addQuickCustomWater);
  }

  const btnQuickEditShortcuts = document.getElementById('btn-quick-edit-shortcuts');
  if (btnQuickEditShortcuts) {
    btnQuickEditShortcuts.addEventListener('click', openSettingsModal);
  }

  // Alternar Gênero no Setup (Tela 1)
  const btnGenderMasSetup = document.getElementById('btn-gender-masculino');
  const btnGenderFemSetup = document.getElementById('btn-gender-feminino');
  if (btnGenderMasSetup && btnGenderFemSetup) {
    btnGenderMasSetup.addEventListener('click', () => {
      btnGenderMasSetup.classList.add('active');
      btnGenderFemSetup.classList.remove('active');
    });
    btnGenderFemSetup.addEventListener('click', () => {
      btnGenderFemSetup.classList.add('active');
      btnGenderMasSetup.classList.remove('active');
    });
  }

  // Alternar Gênero nas Configurações (Tela 2)
  const btnGenderMasSettings = document.getElementById('settings-gender-masculino');
  const btnGenderFemSettings = document.getElementById('settings-gender-feminino');
  if (btnGenderMasSettings && btnGenderFemSettings) {
    btnGenderMasSettings.addEventListener('click', () => {
      btnGenderMasSettings.classList.add('active');
      btnGenderFemSettings.classList.remove('active');
    });
    btnGenderFemSettings.addEventListener('click', () => {
      btnGenderFemSettings.classList.add('active');
      btnGenderMasSettings.classList.remove('active');
    });
  }

  // Close Reminder Alert Modal
  const btnCloseReminderAlert = document.getElementById('btn-close-reminder-alert');
  if (btnCloseReminderAlert) {
    btnCloseReminderAlert.addEventListener('click', () => {
      document.getElementById('modal-reminder-alert').classList.remove('active');
    });
  }

  // Close Interstitial
  document.getElementById('btn-close-interstitial').addEventListener('click', closeInterstitialAd);
}

// ==========================================================================
// TELA 1: FUNÇÕES DE CONFIGURAÇÃO INICIAL
// ==========================================================================
function handleWeightSubmit() {
  const inputWeight = document.getElementById('input-weight');
  const errorMsg = document.getElementById('setup-error-msg');
  const peso = parseFloat(inputWeight.value);

  if (isNaN(peso) || peso < 10 || peso > 300) {
    errorMsg.textContent = "Por favor, insira um peso válido entre 10kg e 300kg.";
    return;
  }

  errorMsg.textContent = "";
  
  // Obter gênero ativo no setup
  const activeGenderBtn = document.querySelector('.setup-card .btn-gender.active');
  const genero = activeGenderBtn ? activeGenderBtn.dataset.gender : 'masculino';
  
  // Calcular Meta: Masculino (Peso * 35) vs Feminino (Peso * 30)
  const fatorMl = genero === 'feminino' ? 30 : 35;
  const metaCalculada = Math.round(peso * fatorMl);
  
  state.pesoUsuario = peso;
  state.generoUsuario = genero;
  state.metaDiaria = metaCalculada;
  state.baseMetaDiaria = metaCalculada;
  state.consumoDiario = 0;
  state.ultimaData = new Date().toDateString();
  state.interstitialHoje = false;
  
  saveStateToLocalStorage();
  
  // Ir para a Tela Principal
  transitionToScreen('screen-setup', 'screen-main');
  renderUI();
  showToast(`Bem-vindo! Meta de ${metaCalculada} ml calculada com sucesso.`, "success", "check-circle");
}

function handleSkipSetup() {
  state.pesoUsuario = null;
  state.metaDiaria = 2000; // Meta padrão: 2 Litros
  state.baseMetaDiaria = 2000;
  state.consumoDiario = 0;
  state.ultimaData = new Date().toDateString();
  state.interstitialHoje = false;

  saveStateToLocalStorage();

  transitionToScreen('screen-setup', 'screen-main');
  renderUI();
  showToast("Meta padrão de 2000 ml definida.", "info", "info");
}

// Transição animada entre telas
function transitionToScreen(fromId, toId) {
  const fromScreen = document.getElementById(fromId);
  const toScreen = document.getElementById(toId);
  
  fromScreen.style.opacity = '0';
  fromScreen.style.transform = 'translateY(-20px)';
  
  setTimeout(() => {
    fromScreen.classList.remove('active');
    toScreen.classList.add('active');
    
    // Pequeno delay para acionar a transição CSS de fade-in
    setTimeout(() => {
      toScreen.style.opacity = '1';
      toScreen.style.transform = 'translateY(0)';
    }, 50);
  }, 400);
}

// ==========================================================================
// TELA 2: RENDERIZAÇÃO DA UI E AÇÕES PRINCIPAIS
// ==========================================================================
function renderUI() {
  // 1. Data Atual formatada em Português
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR', options);
  // Capitalizar a primeira letra do dia da semana
  const dataCapitalizada = dataHojeFormatada.charAt(0).toUpperCase() + dataHojeFormatada.slice(1);
  document.getElementById('current-date').textContent = dataCapitalizada;

  // 2. Progresso de Texto
  document.getElementById('display-consumed').textContent = `${state.consumoDiario} ml`;
  document.getElementById('display-goal').textContent = `/ ${state.metaDiaria} ml`;

  // 3. Porcentagem
  const porcentagem = state.metaDiaria > 0 ? Math.min(Math.round((state.consumoDiario / state.metaDiaria) * 100), 999) : 0;
  document.getElementById('display-percentage').textContent = `${porcentagem}%`;

  // 4. Copo/Água Animação
  const waterFill = document.getElementById('water-fill');
  const glassContainer = document.querySelector('.glass-container');
  
  if (glassContainer) {
    // Limpar formatos anteriores
    glassContainer.classList.remove('shape-copo', 'shape-garrafa', 'shape-squeeze', 'shape-termico', 'shape-galao', 'shape-coco');
    
    // Aplicar formato ativo
    const formatoAtivo = state.modeloCopoVisual || 'copo';
    glassContainer.classList.add(`shape-${formatoAtivo}`);
    
    // Estilo brilhante especial caso atinja a meta
    if (state.consumoDiario >= state.metaDiaria) {
      glassContainer.classList.add('goal-reached');
    } else {
      glassContainer.classList.remove('goal-reached');
    }
  }
  
  // Limita a altura física da água entre 0 e 100% da taça
  const alturaAgua = Math.min(porcentagem, 100);
  if (waterFill) {
    waterFill.style.height = `${alturaAgua}%`;
  }

  // 5. Atualizar atalhos dos botões de água (Volume, Ícone e Rótulo)
  const MODEL_METADATA = {
    copo: { icon: 'cup-soda', label: 'Copo' },
    garrafa: { icon: 'bottle-plastic', label: 'Garrafa' },
    squeeze: { icon: 'dumbbell', label: 'Squeeze' },
    termico: { icon: 'glass-water', label: 'Copo Térmico' },
    galao: { icon: 'milk', label: 'Galão' }
  };

  // String HTML do ícone de garrafinha personalizado (garantindo renderização imediata e correta)
  const BOTTLE_SVG_HTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide-custom-bottle" style="width:20px; height:20px;">
      <path d="M10 2h4v3h-4z" />
      <path d="M9 5h6c.6 0 1 .4 1 1v2c0 .9-.5 1.7-1.3 2.1L14 11v8c0 1.1-.9 2-2 2s-2-.9-2-2v-8l-.7-.9C8.5 9.7 8 8.9 8 8V6c0-.6.4-1 1-1z" />
      <path d="M9 15h6" />
    </svg>
  `;

  const btn1 = document.getElementById('btn-add-250');
  const btn2 = document.getElementById('btn-add-500');
  
  if (btn1) {
    const meta1 = MODEL_METADATA[state.modeloBotao1] || MODEL_METADATA.copo;
    const iconWrapper = btn1.querySelector('.btn-icon-wrapper');
    const labelSpan = btn1.querySelector('.add-label');
    const amountSpan = btn1.querySelector('.add-amount');
    
    if (iconWrapper) {
      if (state.modeloBotao1 === 'garrafa') {
        iconWrapper.innerHTML = BOTTLE_SVG_HTML;
      } else {
        iconWrapper.innerHTML = `<i data-lucide="${meta1.icon}"></i>`;
      }
    }
    if (labelSpan) labelSpan.textContent = meta1.label;
    if (amountSpan) amountSpan.textContent = `+ ${state.medidaBotao1} ml`;
  }
  
  if (btn2) {
    const meta2 = MODEL_METADATA[state.modeloBotao2] || MODEL_METADATA.garrafa;
    const iconWrapper = btn2.querySelector('.btn-icon-wrapper');
    const labelSpan = btn2.querySelector('.add-label');
    const amountSpan = btn2.querySelector('.add-amount');
    
    if (iconWrapper) {
      if (state.modeloBotao2 === 'garrafa') {
        iconWrapper.innerHTML = BOTTLE_SVG_HTML;
      } else {
        iconWrapper.innerHTML = `<i data-lucide="${meta2.icon}"></i>`;
      }
    }
    if (labelSpan) labelSpan.textContent = meta2.label;
    if (amountSpan) amountSpan.textContent = `+ ${state.medidaBotao2} ml`;
  }
  
  // Recriar os ícones Lucide para refletir as mudanças
  lucide.createIcons();
}

// Aumentar o consumo de água
function addWater(quantidade, tipo) {
  const antigoConsumo = state.consumoDiario;
  state.consumoDiario += quantidade;
  
  // Reseta o tempo da última atividade/lembrete (evita receber lembrete logo após beber água)
  state.ultimoLembreteTime = Date.now();
  
  // Sincronizar lembrete de segundo plano
  scheduleBackgroundNotification(state.lembreteIntervaloMins);
  
  saveStateToLocalStorage();
  renderUI();
  
  showToast(`+${quantidade} ml adicionados! (${tipo})`, "success", "droplets");

  // Verificar se acabou de bater ou ultrapassar 100% da meta diária
  if (state.consumoDiario >= state.metaDiaria && antigoConsumo < state.metaDiaria) {
    triggerGoalCelebration();
  }
}

// Toast Notifications In-App
function showToast(mensagem, tipo = 'success', icone = 'check-circle') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  
  toast.innerHTML = `
    <i data-lucide="${icone}" class="toast-icon"></i>
    <div class="toast-content">${mensagem}</div>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // O toast remove a si mesmo após 3 segundos (de acordo com as animações de CSS)
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==========================================================================
// ANIMAÇÃO DE CONQUISTA E ANÚNCIO INTERSTITIAL
// ==========================================================================
function triggerGoalCelebration() {
  // 1. Iniciar partículas/confetes na tela
  const canvasContainer = document.getElementById('celebration-canvas-container');
  canvasContainer.innerHTML = '';
  
  const cores = ['#00f2fe', '#4facfe', '#ffd700', '#00ff87', '#ff007f'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
    confetti.style.animationDelay = `${Math.random() * 1.5}s`;
    confetti.style.transform = `scale(${0.5 + Math.random()})`;
    canvasContainer.appendChild(confetti);
  }

  // Mostrar uma notificação de parabéns
  showToast("Meta atingida! Parabéns por se manter saudável hoje! 🎉", "info", "award");

  // 2. Abrir anúncio interstitial do AdMob após 1.5 segundos da celebração (apenas se NÃO for Pro/Premium)
  if (!state.isPremium) {
    setTimeout(() => {
      if (window.cordova && window.admob) {
        showRealAdMobInterstitial();
      } else {
        showInterstitialAd();
      }
    }, 1500);
  }
}

function showInterstitialAd() {
  const modal = document.getElementById('admob-interstitial');
  const closeBtn = document.getElementById('btn-close-interstitial');
  const timerSpan = document.getElementById('interstitial-timer');
  const closeIcon = closeBtn.querySelector('i');

  modal.classList.add('active');
  
  // Configuração inicial do botão de fechar (desabilitado com contador)
  closeBtn.disabled = true;
  closeIcon.classList.add('hidden');
  timerSpan.classList.remove('hidden');

  let segundosRestantes = 5;
  timerSpan.textContent = `${segundosRestantes}s`;

  // Countdown do anúncio
  const countdownInterval = setInterval(() => {
    segundosRestantes--;
    if (segundosRestantes > 0) {
      timerSpan.textContent = `${segundosRestantes}s`;
    } else {
      clearInterval(countdownInterval);
      // Habilitar fechar anúncio
      closeBtn.disabled = false;
      timerSpan.classList.add('hidden');
      closeIcon.classList.remove('hidden');
      
      // Atualizar o Lucide no ícone que acabou de ficar visível
      lucide.createIcons();
    }
  }, 1000);
}

function closeInterstitialAd() {
  const modal = document.getElementById('admob-interstitial');
  modal.classList.remove('active');
  
  // Limpar os confetes após o anúncio fechar
  const canvasContainer = document.getElementById('celebration-canvas-container');
  canvasContainer.innerHTML = '';

  // Salvar que o interstitial já foi exibido hoje
  state.interstitialHoje = true;
  saveStateToLocalStorage();
}

// ==========================================================================
// INTEGRAÇÃO REAL DO GOOGLE ADMOB (MOBILE NATIVO VIA CORDOVA PLUGIN)
// ==========================================================================
function initRealAdMob() {
  if (window.admob) {
    console.log("AdMob nativo detectado! Inicializando...");
    
    // Configurar listener para resetar interstitial após fechamento
    document.addEventListener('admob.interstitial.events.CLOSE', () => {
      state.interstitialHoje = true;
      saveStateToLocalStorage();
    });

    // Se não for premium, exibe o banner inicial automaticamente no rodapé
    if (!state.isPremium) {
      showRealAdMobBanner();
    }
  } else {
    console.log("Plugin AdMob não encontrado. Executando em modo de simulação.");
  }
}

function showRealAdMobBanner() {
  if (state.isPremium) return;
  if (window.admob) {
    admob.banner.config({
      id: ADMOB_CONFIG.bannerId,
      isTesting: ADMOB_CONFIG.isTesting,
      autoShow: true,
      overlap: false // Empurra o conteúdo do app para cima, evitando que botões virtuais do Android fiquem por cima
    });
    admob.banner.prepare();
  }
}

function hideRealAdMobBanner() {
  if (window.admob) {
    admob.banner.remove();
  }
}

function showRealAdMobInterstitial() {
  if (state.isPremium) return;
  if (window.admob) {
    admob.interstitial.config({
      id: ADMOB_CONFIG.interstitialId,
      isTesting: ADMOB_CONFIG.isTesting,
      autoShow: true
    });
    admob.interstitial.prepare();
  }
}

// ==========================================================================
// SIMULAÇÃO DE BANNER ADMOB ROTATIVO
// ==========================================================================
function startBannerAdRotation() {
  const adBanner = document.getElementById('admob-banner');
  const footer = document.querySelector('.app-footer');
  if (!adBanner) return;

  // Se já for Pro, oculta no início e sai
  if (state.isPremium) {
    if (footer) footer.style.display = 'none';
    const mainScreen = document.getElementById('screen-main');
    if (mainScreen) mainScreen.style.paddingBottom = '24px';
    return;
  }

  // Se estiver rodando em dispositivo móvel (celular) ou como APK nativo (Cordova),
  // oculta a área do banner simulado imediatamente e sai.
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (window.cordova || isMobileDevice) {
    if (footer) footer.style.display = 'none';
    const mainScreen = document.getElementById('screen-main');
    if (mainScreen) mainScreen.style.paddingBottom = '24px';
    return;
  }

  let indexAtual = 0;

  setInterval(() => {
    // Se tornou-se Pro durante o uso do app
    if (state.isPremium) {
      if (footer) footer.style.display = 'none';
      const mainScreen = document.getElementById('screen-main');
      if (mainScreen) mainScreen.style.paddingBottom = '24px';
      return;
    }

    indexAtual = (indexAtual + 1) % ADS_DATABASE.length;
    const adData = ADS_DATABASE[indexAtual];
    
    // Atualizar o conteúdo do banner simulado
    adBanner.innerHTML = `
      <div class="admob-badge">Anúncio AdMob</div>
      <div class="admob-content">
        <i data-lucide="${adData.icon}" class="ad-icon"></i>
        <div class="ad-text">
          <span class="ad-title">${adData.title}</span>
          <span class="ad-desc">${adData.desc}</span>
        </div>
        <button class="ad-action-btn">${adData.action}</button>
      </div>
    `;

    // Recriar ícones do Lucide para o novo anúncio
    lucide.createIcons();
  }, 15000); // Rotaciona a cada 15 segundos
}

// ==========================================================================
// SISTEMA DE MONETIZAÇÃO E SIMULAÇÃO DO PLANO PRO (PREMIUM)
// ==========================================================================
function renderProStatus() {
  const container = document.getElementById('pro-status-container');
  if (container) {
    container.style.display = 'none';
  }
}

function unlockProVersion() {
  // Desativado nesta versão sem Pro
}

function triggerGoalCelebrationConfettiOnly() {
  const canvasContainer = document.getElementById('celebration-canvas-container');
  if (!canvasContainer) return;
  canvasContainer.innerHTML = '';
  
  const cores = ['#00f2fe', '#4facfe', '#ffd700', '#00ff87', '#ff007f'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
    confetti.style.animationDelay = `${Math.random() * 1.5}s`;
    confetti.style.transform = `scale(${0.5 + Math.random()})`;
    canvasContainer.appendChild(confetti);
  }
  
  setTimeout(() => {
    canvasContainer.innerHTML = '';
  }, 4000);
}

function checkPremiumAccess(onSuccess, featureName) {
  if (state.isPremium) {
    onSuccess();
  } else {
    // Abrir o modal de configurações se não estiver aberto
    const settingsModal = document.getElementById('modal-settings');
    if (!settingsModal.classList.contains('active')) {
      openSettingsModal();
    }
    
    // Rolar até o topo do modal (onde fica o banner PRO)
    const modalContent = settingsModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
    
    // Fazer piscar o card de promoção do Pro
    const proContainer = document.getElementById('pro-status-container');
    if (proContainer) {
      proContainer.style.outline = '3px solid var(--accent-cyan)';
      proContainer.style.borderRadius = 'var(--radius-md)';
      proContainer.style.transition = 'outline 0.3s ease';
      setTimeout(() => {
        proContainer.style.outline = 'none';
      }, 1500);
    }
    
    showToast(`${featureName} é exclusivo do Plano Pro!`, "warning", "lock");
  }
}

// ==========================================================================
// DIÁLOGO DE CONFIGURAÇÕES (MODAL)
// ==========================================================================
function openSettingsModal() {
  const modal = document.getElementById('modal-settings');
  const inputWeight = document.getElementById('settings-weight');
  const inputManualMeta = document.getElementById('settings-manual-meta');
  const statusDiv = document.getElementById('notification-status');

  // Preencher os campos com valores atuais
  inputWeight.value = state.pesoUsuario || '';
  inputManualMeta.value = state.metaDiaria;
  statusDiv.textContent = "";

  // Preencher Meta Inteligente (Switches)
  const switchExercise = document.getElementById('switch-exercise');
  const switchWeather = document.getElementById('switch-weather');
  if (switchExercise) switchExercise.checked = state.exercicioHoje;
  if (switchWeather) switchWeather.checked = state.climaQuenteHoje;

  // Preencher modelo de recipiente dos atalhos
  const selectBtn1Model = document.getElementById('settings-btn1-model');
  const selectBtn2Model = document.getElementById('settings-btn2-model');
  if (selectBtn1Model) selectBtn1Model.value = state.modeloBotao1;
  if (selectBtn2Model) selectBtn2Model.value = state.modeloBotao2;

  // Preencher som do lembrete
  const selectSound = document.getElementById('settings-sound');
  if (selectSound) selectSound.value = state.somLembrete;

  // Preencher campos de lembretes
  const selectInterval = document.getElementById('settings-interval');
  const customIntervalWrapper = document.getElementById('custom-interval-wrapper');
  const inputCustomInterval = document.getElementById('settings-custom-interval-mins');

  if (selectInterval) {
    selectInterval.value = state.lembreteIntervalo;
    if (state.lembreteIntervalo === 'custom') {
      customIntervalWrapper.classList.remove('hidden');
      inputCustomInterval.value = state.lembreteIntervaloMins;
    } else {
      customIntervalWrapper.classList.add('hidden');
      inputCustomInterval.value = '';
    }
  }

  // Preencher atalhos de medidas
  const inputBtn1 = document.getElementById('settings-btn1-val');
  const inputBtn2 = document.getElementById('settings-btn2-val');
  if (inputBtn1) inputBtn1.value = state.medidaBotao1;
  if (inputBtn2) inputBtn2.value = state.medidaBotao2;

  // Preencher gênero nas configurações
  const btnGenderMasSettings = document.getElementById('settings-gender-masculino');
  const btnGenderFemSettings = document.getElementById('settings-gender-feminino');
  if (btnGenderMasSettings && btnGenderFemSettings) {
    if (state.generoUsuario === 'feminino') {
      btnGenderFemSettings.classList.add('active');
      btnGenderMasSettings.classList.remove('active');
    } else {
      btnGenderMasSettings.classList.add('active');
      btnGenderFemSettings.classList.remove('active');
    }
  }

  // Atualizar exibição inicial da contagem regressiva
  updateReminderCountdownDisplay();

  modal.classList.add('active');
}

// Ajuste: Recalcular meta usando o peso digitado e gênero
function recalculateMetaFromSettings() {
  const inputWeight = document.getElementById('settings-weight');
  const peso = parseFloat(inputWeight.value);

  if (isNaN(peso) || peso < 10 || peso > 300) {
    showToast("Peso inválido para cálculo.", "warning", "alert-triangle");
    return;
  }

  // Obter gênero ativo nas configurações
  const activeGenderBtn = document.querySelector('.settings-section .btn-gender.active');
  const genero = activeGenderBtn ? activeGenderBtn.dataset.gender : 'masculino';
  
  // Calcular Meta: Masculino (Peso * 35) vs Feminino (Peso * 30)
  const fatorMl = genero === 'feminino' ? 30 : 35;
  const novaMeta = Math.round(peso * fatorMl);
  
  state.pesoUsuario = peso;
  state.generoUsuario = genero;
  state.baseMetaDiaria = novaMeta;
  state.metaDiaria = state.baseMetaDiaria + (state.exercicioHoje ? 500 : 0) + (state.climaQuenteHoje ? 300 : 0);
  
  saveStateToLocalStorage();
  renderUI();
  
  // Atualizar input da meta manual no formulário
  document.getElementById('settings-manual-meta').value = state.metaDiaria;
  
  showToast(`Meta recalculada para ${state.metaDiaria} ml (${genero === 'feminino' ? 'Feminino' : 'Masculino'})!`, "success", "target");
}

// Ajuste: Salvar uma meta digitada manualmente
function saveManualMetaFromSettings() {
  const inputManualMeta = document.getElementById('settings-manual-meta');
  const novaMeta = parseInt(inputManualMeta.value);

  if (isNaN(novaMeta) || novaMeta < 500 || novaMeta > 10000) {
    showToast("Insira uma meta entre 500ml e 10L.", "warning", "alert-triangle");
    return;
  }

  state.baseMetaDiaria = novaMeta;
  state.metaDiaria = state.baseMetaDiaria + (state.exercicioHoje ? 500 : 0) + (state.climaQuenteHoje ? 300 : 0);
  saveStateToLocalStorage();
  renderUI();

  showToast(`Meta diária alterada para ${novaMeta} ml!`, "success", "target");
}

// Ajuste: Zerar o consumo do dia atual
function resetTodayProgress() {
  if (confirm("Deseja realmente zerar o progresso de água de hoje?")) {
    state.consumoDiario = 0;
    state.interstitialHoje = false;
    saveStateToLocalStorage();
    renderUI();
    
    // Fechar modal
    document.getElementById('modal-settings').classList.remove('active');
    
    showToast("O consumo de água de hoje foi resetado.", "info", "rotate-ccw");
  }
}

// Ajuste: Limpar memória e redefinir app para o início
function resetAllData() {
  if (confirm("ATENÇÃO: Isso apagará todos os dados salvos e reiniciará o aplicativo. Deseja continuar?")) {
    localStorage.clear();
    location.reload();
  }
}

// Lógica de Meta Inteligente (Switches)
function toggleSmartMeta() {
  const switchExercise = document.getElementById('switch-exercise');
  const switchWeather = document.getElementById('switch-weather');
  if (!switchExercise || !switchWeather) return;
  
  state.exercicioHoje = switchExercise.checked;
  state.climaQuenteHoje = switchWeather.checked;
  
  // Recalcular metaDiaria baseada nos offsets Pro
  state.metaDiaria = state.baseMetaDiaria + (state.exercicioHoje ? 500 : 0) + (state.climaQuenteHoje ? 300 : 0);
  
  saveStateToLocalStorage();
  renderUI();
  
  // Atualizar o campo de input de meta manual se ele estiver presente
  const inputManualMeta = document.getElementById('settings-manual-meta');
  if (inputManualMeta) {
    inputManualMeta.value = state.metaDiaria;
  }
}

// Limpeza concluída

// ==========================================================================
// SISTEMA DE NOTIFICAÇÕES (BROWSER NOTIFICATION API & MOCKS)
// ==========================================================================
function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

function triggerSimulatedNotification() {
  const statusDiv = document.getElementById('notification-status');
  const titulo = "Hora da Água 💧";
  const mensagem = "Que tal um copo d'água agora? Mantenha-se hidratado e saudável!";

  // 1. Toca som de gota de água
  playWaterDropSound();

  // 2. Abre o modal visual in-app
  showInAppReminderAlert();

  // 3. Tenta disparar notificação real do navegador (se tiver permissão)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(titulo, {
        body: mensagem,
        icon: './favicon.ico' // fallback de ícone do projeto
      });
      statusDiv.textContent = "Notificação nativa do sistema disparada!";
      statusDiv.style.color = "var(--color-success)";
    } catch (e) {
      console.warn("Falha ao abrir notificação do sistema: ", e);
      triggerInAppNotificationFallback(titulo, mensagem, statusDiv);
    }
  } else {
    // 4. Fallback: Disparar notificação elegante in-app (Toast)
    triggerInAppNotificationFallback(titulo, mensagem, statusDiv);
  }
}

function triggerInAppNotificationFallback(titulo, mensagem, statusDiv) {
  // Mostra um toast elegante simulando a notificação
  showToast(`Notificação: Beba Água! 💧`, "info", "bell");
  
  statusDiv.innerHTML = `Notificação simulada na tela com som (permita notificações do navegador para alertas em segundo plano).`;
  statusDiv.style.color = "var(--color-warning)";
}

function showInAppReminderAlert() {
  const alertModal = document.getElementById('modal-reminder-alert');
  if (alertModal) {
    alertModal.classList.add('active');
  }
}

// Síntese de Som Offline usando Web Audio API (Roteador de Sons)
function playWaterDropSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    switch (state.somLembrete) {
      case 'gelo':
        playGeloSound(audioCtx, now);
        break;
      case 'bolhas':
        playBolhasSound(audioCtx, now);
        break;
      case 'cachoeira':
        playCachoeiraSound(audioCtx, now);
        break;
      case 'gota':
      default:
        playGotaSound(audioCtx, now);
        break;
    }
  } catch (e) {
    console.error("Erro ao reproduzir som sintetizado:", e);
  }
}

// 1. Som de Gota Clássico
function playGotaSound(ctx, now) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(1000, now + 0.12);
  
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  
  osc.start(now);
  osc.stop(now + 0.25);
}

// 2. Som de Tintilar de Gelo no Copo
function playGeloSound(ctx, now) {
  const delays = [0, 0.07, 0.14];
  const freqs = [2600, 2200, 2900];
  
  delays.forEach((delay, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle'; // Timbre oco/metálico parecido com vidro/cristal
    osc.frequency.setValueAtTime(freqs[index], now + delay);
    
    gain.gain.setValueAtTime(0.12, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.07);
  });
}

// 3. Som de Bolhas Subindo na Água
function playBolhasSound(ctx, now) {
  const delays = [0, 0.05, 0.11, 0.17, 0.23];
  const freqs = [350, 420, 390, 470, 410];
  
  delays.forEach((delay, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[index], now + delay);
    osc.frequency.exponentialRampToValueAtTime(freqs[index] * 1.8, now + delay + 0.04);
    
    gain.gain.setValueAtTime(0.2, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.08);
  });
}

// 4. Som de Cachoeira / Ondas de Água (Ruído Branco Filtrado)
function playCachoeiraSound(ctx, now) {
  const bufferSize = ctx.sampleRate * 1.5; // 1.5 segundos de som
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Preencher buffer com números aleatórios (Ruído Branco)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  
  // Filtro Passa-Banda para simular o som abafado de água se movendo
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(3.0, now);
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
  filter.frequency.exponentialRampToValueAtTime(400, now + 1.3);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  
  noiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseNode.start(now);
  noiseNode.stop(now + 1.5);
}

// Agendamento de Notificação em Segundo Plano (Celular / Cordova / APK)
function scheduleBackgroundNotification(mins) {
  if (window.cordova && cordova.plugins && cordova.plugins.notification) {
    cordova.plugins.notification.local.cancelAll(() => {
      if (mins > 0) {
        const triggerTime = new Date(Date.now() + mins * 60 * 1000);
        cordova.plugins.notification.local.schedule({
          id: 1,
          title: "Hora da Água! 💧",
          text: "Seu corpo precisa de hidratação agora. Que tal beber um copo d'água?",
          trigger: { at: triggerTime },
          foreground: true,
          sound: true,
          vibrate: true,
          priority: 2
        });
        console.log(`Lembrete de segundo plano (APK) agendado para daqui a ${mins} minutos.`);
      } else {
        console.log("Lembretes de segundo plano cancelados (frequência desativada).");
      }
    });
  }
}

// ==========================================================================
// CONTROLE DE AGENDAMENTO E EXIBIÇÃO DE LEMBRETES DE INTERVALO
// ==========================================================================
function saveReminderIntervalFromSettings() {
  const selectInterval = document.getElementById('settings-interval');
  const inputCustomInterval = document.getElementById('settings-custom-interval-mins');
  const selectSound = document.getElementById('settings-sound');
  
  if (!selectInterval || !selectSound) return;
  
  const selectedValue = selectInterval.value;
  let targetMins = 0;
  let lembreteVal = selectedValue;
  
  if (selectedValue === 'disabled') {
    targetMins = 0;
  } else if (selectedValue === 'custom') {
    const customVal = parseInt(inputCustomInterval.value);
    if (isNaN(customVal) || customVal < 5 || customVal > 1440) {
      showToast("Insira um intervalo entre 5 e 1440 minutos.", "warning", "alert-triangle");
      return;
    }
    targetMins = customVal;
  } else {
    targetMins = parseInt(selectedValue);
  }
  
  const soundValue = selectSound.value;
  const PRO_SOUNDS = ['gelo', 'bolhas', 'cachoeira'];
  const isSoundPro = PRO_SOUNDS.includes(soundValue);
  
  const executeSave = () => {
    state.lembreteIntervalo = lembreteVal;
    state.lembreteIntervaloMins = targetMins;
    state.somLembrete = soundValue;
    
    // Reinicia o tempo para o instante atual
    state.ultimoLembreteTime = Date.now();

    // Sincronizar com o agendador de segundo plano (PWA/APK)
    scheduleBackgroundNotification(state.lembreteIntervaloMins);
    
    saveStateToLocalStorage();
    
    if (state.lembreteIntervalo === 'disabled') {
      showToast("Lembretes de hidratação desativados.", "info", "bell-off");
    } else {
      showToast(`Configurações de alerta e som atualizadas!`, "success", "bell");
    }
    
    updateReminderCountdownDisplay();
  };
  
  if (isSoundPro) {
    const soundName = selectSound.options[selectSound.selectedIndex].text;
    checkPremiumAccess(executeSave, `Som: ${soundName}`);
  } else {
    executeSave();
  }
}

let reminderIntervalId = null;

function startReminderTimer() {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
  }
  
  // Checa a cada segundo para atualizar o countdown e disparar no tempo exato
  reminderIntervalId = setInterval(() => {
    checkAndTriggerReminder();
  }, 1000);
}

function checkAndTriggerReminder() {
  if (state.lembreteIntervalo === 'disabled' || !state.lembreteIntervaloMins) {
    updateReminderCountdownDisplay();
    return;
  }
  
  const agora = Date.now();
  const proximoAlertaTime = state.ultimoLembreteTime + (state.lembreteIntervaloMins * 60 * 1000);
  
  if (agora >= proximoAlertaTime) {
    // Disparar
    triggerReminderNotification();
    state.ultimoLembreteTime = agora;

    // Re-agendar próximo lembrete no segundo plano
    scheduleBackgroundNotification(state.lembreteIntervaloMins);

    saveStateToLocalStorage();
  }
  
  updateReminderCountdownDisplay();
}

function triggerReminderNotification() {
  const titulo = "Hora de beber água! 💧";
  const mensagem = "O seu corpo precisa de hidratação agora. Beba um copo de água!";
  
  // 1. Toca som de gota de água
  playWaterDropSound();

  // 2. Abre o modal visual in-app
  showInAppReminderAlert();

  // 3. Notificação nativa do sistema (se tiver permissão)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(titulo, {
        body: mensagem,
        icon: './favicon.ico'
      });
    } catch (e) {
      console.warn("Erro ao emitir notificação nativa do navegador: ", e);
    }
  }
  
  showToast("Lembrete: beba água! 💧", "info", "bell");
}

function updateReminderCountdownDisplay() {
  const display = document.getElementById('display-reminder-countdown');
  if (!display) return;
  
  if (state.lembreteIntervalo === 'disabled' || !state.lembreteIntervaloMins) {
    display.textContent = "🔕 Lembretes desativados";
    display.style.color = "var(--color-text-secondary)";
    display.style.background = "rgba(255, 255, 255, 0.02)";
    display.style.borderColor = "var(--border-color)";
    return;
  }
  
  const agora = Date.now();
  const proximoAlertaTime = state.ultimoLembreteTime + (state.lembreteIntervaloMins * 60 * 1000);
  const milissegundosRestantes = proximoAlertaTime - agora;
  
  if (milissegundosRestantes <= 0) {
    display.textContent = "⏱️ Disparando alerta...";
    return;
  }
  
  const segundosTotais = Math.ceil(milissegundosRestantes / 1000);
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.floor((segundosTotais % 3600) / 60);
  const segundos = segundosTotais % 60;
  
  let tempoStr = "";
  if (horas > 0) {
    tempoStr += `${horas.toString().padStart(2, '0')}:`;
  }
  tempoStr += `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  
  display.textContent = `⏱️ Próximo lembrete em: ${tempoStr}`;
  display.style.color = "var(--accent-cyan)";
  display.style.background = "rgba(0, 242, 254, 0.05)";
  display.style.borderColor = "rgba(0, 242, 254, 0.2)";
}

// ==========================================================================
// CONTROLE DE APARÊNCIA E TEMAS (LIGHT / DARK)
// ==========================================================================
function setTheme(theme) {
  const executeSet = () => {
    state.temaVisual = theme;
    saveStateToLocalStorage();
    applyTheme();
    
    let nomeTema = 'Escuro';
    if (theme === 'light') nomeTema = 'Claro';
    else if (theme === 'cyberpunk') nomeTema = 'Cyberpunk';
    else if (theme === 'oceano') nomeTema = 'Oceano';
    
    showToast(`Tema ${nomeTema} ativado!`, "info", "palette");
  };
  
  if (theme === 'cyberpunk' || theme === 'oceano') {
    checkPremiumAccess(executeSet, `Tema ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
  } else {
    executeSet();
  }
}

function applyTheme() {
  const container = document.querySelector('.app-container');
  if (!container) return;
  
  // Limpar todas as classes de temas anteriores
  container.classList.remove('light-theme', 'theme-cyberpunk', 'theme-oceano');
  
  // Aplicar a classe correspondente ao tema atual
  if (state.temaVisual === 'light') {
    container.classList.add('light-theme');
  } else if (state.temaVisual === 'cyberpunk') {
    container.classList.add('theme-cyberpunk');
  } else if (state.temaVisual === 'oceano') {
    container.classList.add('theme-oceano');
  }
  
  // Atualizar visual dos botões de controle no modal de configurações
  const btnDark = document.getElementById('btn-theme-dark');
  const btnLight = document.getElementById('btn-theme-light');
  const btnCyberpunk = document.getElementById('btn-theme-cyberpunk');
  const btnOceano = document.getElementById('btn-theme-oceano');
  
  const buttons = [
    { btn: btnDark, themeName: 'dark' },
    { btn: btnLight, themeName: 'light' },
    { btn: btnCyberpunk, themeName: 'cyberpunk' },
    { btn: btnOceano, themeName: 'oceano' }
  ];
  
  buttons.forEach(item => {
    if (item.btn) {
      if (state.temaVisual === item.themeName) {
        item.btn.classList.add('active');
      } else {
        item.btn.classList.remove('active');
      }
    }
  });
}

// ==========================================================================
// CONFIGURAÇÃO DE ATALHOS DE MEDIDAS PERSONALIZADAS
// ==========================================================================
function saveCustomShortcutsFromSettings() {
  const inputBtn1 = document.getElementById('settings-btn1-val');
  const inputBtn2 = document.getElementById('settings-btn2-val');
  const selectBtn1Model = document.getElementById('settings-btn1-model');
  const selectBtn2Model = document.getElementById('settings-btn2-model');
  
  if (!inputBtn1 || !inputBtn2 || !selectBtn1Model || !selectBtn2Model) return;
  
  const val1 = parseInt(inputBtn1.value);
  const val2 = parseInt(inputBtn2.value);
  
  if (isNaN(val1) || val1 < 50 || val1 > 2000) {
    showToast("O volume do Botão 1 deve ser entre 50ml e 2000ml.", "warning", "alert-triangle");
    return;
  }
  
  if (isNaN(val2) || val2 < 50 || val2 > 2000) {
    showToast("O volume do Botão 2 deve ser entre 50ml e 2000ml.", "warning", "alert-triangle");
    return;
  }
  
  const model1 = selectBtn1Model.value;
  const model2 = selectBtn2Model.value;
  
  // Modelos Pro
  const PRO_MODELS = ['squeeze', 'termico', 'galao'];
  const isModel1Pro = PRO_MODELS.includes(model1);
  const isModel2Pro = PRO_MODELS.includes(model2);
  
  const executeSave = () => {
    state.medidaBotao1 = val1;
    state.medidaBotao2 = val2;
    state.modeloBotao1 = model1;
    state.modeloBotao2 = model2;
    state.modeloCopoVisual = model1; // Atualiza o visual central para o modelo do Botão 1
    
    saveStateToLocalStorage();
    renderUI();
    
    // Fechar modal de configurações
    document.getElementById('modal-settings').classList.remove('active');
    
    showToast("Atalhos rápidos e recipientes atualizados!", "success", "sliders");
  };
  
  if (isModel1Pro || isModel2Pro) {
    const proFeatureName = isModel1Pro && isModel2Pro 
      ? "Recipientes Premium" 
      : `Recipiente Premium (${isModel1Pro ? selectBtn1Model.options[selectBtn1Model.selectedIndex].text : selectBtn2Model.options[selectBtn2Model.selectedIndex].text})`;
    
    checkPremiumAccess(executeSave, proFeatureName);
  } else {
    executeSave();
  }
}

// ==========================================================================
// ADIÇÃO RÁPIDA DE MEDIDA PERSONALIZADA NA TELA PRINCIPAL
// ==========================================================================
function addQuickCustomWater() {
  const inputCustom = document.getElementById('input-quick-custom-ml');
  if (!inputCustom) return;
  
  const quantidade = parseInt(inputCustom.value);
  
  if (isNaN(quantidade) || quantidade < 10 || quantidade > 3000) {
    showToast("Insira um volume válido entre 10 ml e 3000 ml.", "warning", "alert-triangle");
    return;
  }
  
  // Adiciona a quantidade de água diretamente
  addWater(quantidade, 'Personalizado');
  
  // Limpa o campo e remove o foco
  inputCustom.value = '';
  inputCustom.blur();
}
