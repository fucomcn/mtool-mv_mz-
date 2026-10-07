// @AutoLoad @Evalv8
(function () {
  console.log("文本历史记录脚本开始加载... (最终修复版 | 颜色控制符完美支持 | 显示说话人)");

  // ========== 自定义按键支持 ==========
  const SCRIPT_NAME = '文本历史记录';
  const DEFAULT_KEYS = {
    toggle:    'KeyQ',
    enlarge:   'KeyI',
    reduce:    'KeyO',
    prev_page: 'KeyA',
    next_page: 'KeyS'
  };
  const ACTION_NAMES = {
    toggle:    '打开/关闭历史记录',
    enlarge:   '放大窗口',
    reduce:    '缩小窗口',
    prev_page: '上一页（↑ 亦可）',
    next_page: '下一页（↓ 亦可）'
  };

  function getKey(action) {
    if (window.KeyMapper && typeof window.KeyMapper.getKey === 'function') {
      const k = window.KeyMapper.getKey(SCRIPT_NAME, action);
      if (k) return k;
    }
    return DEFAULT_KEYS[action];
  }

  function matchKey(e, keyStr) {
    if (!keyStr) return false;
    const parts = String(keyStr).split('+');
    return e.code === parts[parts.length - 1];
  }

  // ========== 自定义配置支持 ==========
  const CONFIG_DEFS = {
    max_records: {
      type: 'number',
      label: '最大记录条数（默认 1000）',
      defaultValue: 1000,
      min: 50, max: 99999, step: 50
    },
    records_per_page: {
      type: 'number',
      label: '每页显示条数（默认 21）',
      defaultValue: 21,
      min: 5, max: 200, step: 1
    },
    show_speaker: {
      type: 'bool',
      label: '显示说话人名字（默认 是）',
      defaultValue: true
    },
    auto_wrap: {
      type: 'bool',
      label: '过长文本自动换行（默认 否）',
      defaultValue: false
    },
    wrap_length: {
      type: 'number',
      label: '换行字符长度上限（默认 60）',
      defaultValue: 60,
      min: 10, max: 500, step: 5
    },
    font_family: {
      type: 'select',
      label: '字体（下拉选择或输入框自定义）',
      defaultValue: 'Arial, sans-serif',
      options: [
        { value: 'Arial, sans-serif',                    label: 'Arial（默认）' },
        { value: '"Microsoft YaHei", sans-serif',        label: '微软雅黑' },
        { value: '"SimSun", serif',                      label: '宋体' },
        { value: '"SimHei", sans-serif',                 label: '黑体' },
        { value: '"KaiTi", serif',                       label: '楷体' },
        { value: '"Noto Sans CJK SC", sans-serif',       label: '思源黑体' },
        { value: 'sans-serif',                           label: '无衬线' },
        { value: 'serif',                                label: '衬线' },
        { value: 'monospace',                            label: '等宽' }
      ]
    },
    font_size: {
      type: 'number',
      label: '字号 px（默认 18）',
      defaultValue: 18,
      min: 8, max: 72, step: 1
    }
  };

  function isConfigEnabled(key) {
    if (window.KeyMapper && typeof window.KeyMapper.isConfigEnabled === 'function') {
      return window.KeyMapper.isConfigEnabled(SCRIPT_NAME, key);
    }
    return false;
  }
  function getConfigValue(key, fallback) {
    if (window.KeyMapper && typeof window.KeyMapper.getConfigValue === 'function') {
      var v = window.KeyMapper.getConfigValue(SCRIPT_NAME, key);
      if (v !== undefined) return v;
    }
    return fallback;
  }
  function getCfg(key) {
    if (isConfigEnabled(key)) return getConfigValue(key, CONFIG_DEFS[key].defaultValue);
    return CONFIG_DEFS[key].defaultValue;
  }

  // ========== 注册到 KeyMapper ==========
  const KB_PAYLOAD  = { name: SCRIPT_NAME, keys: DEFAULT_KEYS,  names: ACTION_NAMES };
  const CFG_PAYLOAD = { name: SCRIPT_NAME, defs: CONFIG_DEFS };

  function commitKB() {
    if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
      window.KeyMapper.registerScript(KB_PAYLOAD.name, KB_PAYLOAD.keys, KB_PAYLOAD.names);
      return true;
    }
    return false;
  }
  function commitCfg() {
    if (window.KeyMapper && typeof window.KeyMapper.registerConfig === 'function') {
      window.KeyMapper.registerConfig(CFG_PAYLOAD.name, CFG_PAYLOAD.defs);
      return true;
    }
    return false;
  }

  if (commitKB() && commitCfg()) {
    console.log('[文本历史] 已注册到自定义按键与配置系统');
  } else {
    window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
    if (!window.__keyMapperPendingScripts.some(r => r.name === SCRIPT_NAME)) {
      window.__keyMapperPendingScripts.push(KB_PAYLOAD);
    }
    window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
    if (!window.__keyMapperPendingConfigs.some(r => r.name === SCRIPT_NAME)) {
      window.__keyMapperPendingConfigs.push(CFG_PAYLOAD);
    }
    console.log('[文本历史] KeyMapper 未就绪，已写入暂存表');
    if (!window.__textHistoryReady) {
      window.__textHistoryReady = function() {
        commitKB();
        commitCfg();
        if (window.__keyMapperPendingScripts) {
          window.__keyMapperPendingScripts = window.__keyMapperPendingScripts.filter(r => r.name !== SCRIPT_NAME);
        }
        if (window.__keyMapperPendingConfigs) {
          window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs.filter(r => r.name !== SCRIPT_NAME);
        }
        window.removeEventListener('keymapper:ready', window.__textHistoryReady);
        delete window.__textHistoryReady;
        console.log('[文本历史] 收到 keymapper:ready，已完成注册');
      };
      window.addEventListener('keymapper:ready', window.__textHistoryReady);
    }
  }

  // ====================== 全局配置 ======================
  const CONFIG = {
    WINDOW_SIZE: {
      MIN_WIDTH: 400, MAX_WIDTH: 1600,
      MIN_HEIGHT: 300, MAX_HEIGHT: 900,
      DEFAULT_WIDTH: 1200, DEFAULT_HEIGHT: 900,
      STEP: 100
    },
    WINDOW: {
      POSITION: 'fixed', TOP: '50%', LEFT: '50%',
      TRANSFORM: 'translate(-50%, -50%)',
      WIDTH: '1200px', HEIGHT: '900px',
      BACKGROUND: 'rgba(10, 10, 20, 0.98)',
      BORDER: '2px solid #3A5F8A', BORDER_RADIUS: '6px',
      BOX_SHADOW: '0 0 30px rgba(0, 0, 0, 0.8)',
      OPACITY: '0.95', Z_INDEX: '99999',
      DISPLAY: 'none', OVERFLOW: 'hidden', BOX_SIZING: 'border-box',
      MARGIN: '0', PADDING: '0',
      FONT_FAMILY: 'Arial, sans-serif',
      WEBKIT_FONT_SMOOTHING: 'antialiased',
      TEXT_RENDERING: 'optimizeLegibility'
    },
    HEADER: {
      DISPLAY: 'flex', FLEX_DIRECTION: 'row', ALIGN_ITEMS: 'center',
      HEIGHT: '40px', MIN_HEIGHT: '40px', MAX_HEIGHT: '40px',
      WIDTH: '100%',
      BACKGROUND: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(50, 50, 70, 0.95))',
      COLOR: '#FFFFFF', FONT_SIZE: '18px', FONT_WEIGHT: 'bold',
      LINE_HEIGHT: '40px', PADDING: '0 15px',
      BOX_SIZING: 'border-box', USER_SELECT: 'none'
    },
    CONTENT_CONTAINER: {
      DISPLAY: 'block', HEIGHT: 'calc(100% - 80px)', WIDTH: '100%',
      BACKGROUND: 'transparent',
      OVERFLOW_X: 'hidden', OVERFLOW_Y: 'auto',
      PADDING: '0', MARGIN: '0',
      BOX_SIZING: 'border-box', POSITION: 'relative'
    },
    RECORD_CARD: {
      DISPLAY: 'flex', FLEX_DIRECTION: 'row', FLEX_WRAP: 'nowrap',
      JUSTIFY_CONTENT: 'flex-start', ALIGN_ITEMS: 'center',
      GAP: '0', POSITION: 'relative', BOX_SIZING: 'border-box',
      WIDTH: '100%', MIN_HEIGHT: '32px', HEIGHT: 'auto',
      MARGIN: '0 0 2px 0', PADDING: '6px 6px',
      BACKGROUND: 'rgba(25, 25, 35, 0.9)',
      BORDER: 'none', BORDER_LEFT: '2px solid rgba(80, 130, 200, 0.7)',
      BORDER_RADIUS: '4px',
      BOX_SHADOW: '0 1px 3px rgba(0, 0, 0, 0.2)',
      OVERFLOW: 'visible', TRANSITION: 'all 0.15s',
      HOVER_BACKGROUND: 'rgba(35, 35, 45, 0.95)',
      HOVER_TRANSFORM: 'translateX(2px)',
      HOVER_BOX_SHADOW: '0 2px 5px rgba(0, 0, 0, 0.3)'
    },
    RECORD_INDEX: {
      DISPLAY: 'inline-flex', ALIGN_ITEMS: 'center',
      BOX_SIZING: 'border-box', WIDTH: 'auto', MIN_WIDTH: 'auto',
      MARGIN: '0 8px 0 0', PADDING: '0',
      COLOR: '#8899AA', FONT_SIZE: '11px', FONT_WEIGHT: 'normal',
      LINE_HEIGHT: '1.2', TEXT_ALIGN: 'left',
      FLEX_GROW: '0', FLEX_SHRINK: '0', WHITE_SPACE: 'nowrap'
    },
    RECORD_SPEAKER: {
      DISPLAY: 'inline-flex', ALIGN_ITEMS: 'center',
      BOX_SIZING: 'border-box', WIDTH: 'auto',
      MIN_WIDTH: '50px', MAX_WIDTH: '150px',
      MARGIN: '0 10px 0 0', PADDING: '2px 8px',
      COLOR: '#FFD700', BACKGROUND: 'rgba(50, 50, 80, 0.8)',
      BORDER_RADIUS: '10px', FONT_SIZE: '12px', FONT_WEIGHT: 'bold',
      LINE_HEIGHT: '1.2', TEXT_ALIGN: 'center',
      FLEX_GROW: '0', FLEX_SHRINK: '0', WHITE_SPACE: 'nowrap',
      OVERFLOW: 'hidden', TEXT_OVERFLOW: 'ellipsis'
    },
    RECORD_TEXT: {
      DISPLAY: 'block', BOX_SIZING: 'border-box',
      WIDTH: 'auto', HEIGHT: 'auto', MAX_HEIGHT: 'none',
      FLEX_GROW: '1', FLEX_SHRINK: '1', FLEX_BASIS: '0%',
      MARGIN: '0', PADDING: '0',
      COLOR: '#D0D0D0', FONT_SIZE: '18px', FONT_WEIGHT: 'normal',
      LINE_HEIGHT: '1.4', LETTER_SPACING: 'normal',
      TEXT_ALIGN: 'left',
      WHITE_SPACE: 'nowrap', OVERFLOW: 'hidden', TEXT_OVERFLOW: 'ellipsis',
      WORD_BREAK: 'break-all',
      USER_SELECT: 'text', CURSOR: 'text'
    },
    RECORD_TIME: {
      DISPLAY: 'inline-flex', ALIGN_ITEMS: 'center',
      JUSTIFY_CONTENT: 'flex-end', BOX_SIZING: 'border-box',
      WIDTH: 'auto', MIN_WIDTH: '45px', MARGIN: '0 0 0 auto', PADDING: '0',
      COLOR: '#667788', FONT_SIZE: '10px', LINE_HEIGHT: '1.2',
      TEXT_ALIGN: 'right', FLEX_GROW: '0', FLEX_SHRINK: '0', WHITE_SPACE: 'nowrap'
    },
    FOOTER: {
      DISPLAY: 'flex', FLEX_DIRECTION: 'row', JUSTIFY_CONTENT: 'space-between',
      ALIGN_ITEMS: 'center', HEIGHT: '40px', WIDTH: '100%',
      BOX_SIZING: 'border-box',
      BACKGROUND: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(50, 50, 70, 0.95))',
      COLOR: '#AACCDD', FONT_SIZE: '13px', LINE_HEIGHT: '40px',
      PADDING: '0 15px', BORDER_TOP: '1px solid rgba(255, 255, 255, 0.1)',
      USER_SELECT: 'none'
    },
    SCROLLBAR: {
      WIDTH: '8px',
      TRACK_BACKGROUND: 'rgba(255, 255, 255, 0.03)',
      THUMB_BACKGROUND: 'rgba(80, 100, 150, 0.6)',
      THUMB_HOVER_BACKGROUND: 'rgba(100, 120, 170, 0.8)',
      BORDER_RADIUS: '4px'
    }
  };

  const TEXT_COLORS = [
    '#ffffff', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff',
    '#c0c0c0', '#808080', '#800000', '#008000', '#808000', '#000080', '#800080',
    '#008080', '#ffa500', '#ffc0cb', '#a52a2a', '#40e0d0', '#ffd700', '#ee82ee',
    '#d2b48c', '#f5f5dc', '#f0f8ff'
  ];

  // ====================== 辅助函数 ======================
  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function getActorName(actorId) {
    try {
      if (typeof $gameActors !== 'undefined' && $gameActors.actor) {
        const actor = $gameActors.actor(actorId);
        if (actor && actor.name) return actor.name;
      }
      if (typeof $dataActors !== 'undefined' && $dataActors[actorId]) {
        return $dataActors[actorId].name || '';
      }
    } catch (e) {}
    return '';
  }

  function getVariableValue(varId) {
    try {
      if (typeof $gameVariables !== 'undefined' && $gameVariables.value) {
        return $gameVariables.value(varId);
      }
    } catch (e) {}
    return 0;
  }

  function parseRpgMakerText(raw) {
    if (!raw) return '';
    let result = '';
    let currentColor = null;
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === '\\') {
        const colorMatch = raw.substring(i).match(/^\\([cC])\[(\d+)\]/);
        if (colorMatch) {
          const idx = parseInt(colorMatch[2], 10);
          currentColor = TEXT_COLORS[idx] || TEXT_COLORS[0];
          i += colorMatch[0].length;
          continue;
        }
        const nameMatch = raw.substring(i).match(/^\\[Nn]\[(\d+)\]/);
        if (nameMatch) {
          const actorId = parseInt(nameMatch[1], 10);
          const name = getActorName(actorId);
          const escapedName = escapeHtml(name);
          if (currentColor !== null) {
            result += `<span style="color: ${currentColor};">${escapedName}</span>`;
          } else {
            result += escapedName;
          }
          i += nameMatch[0].length;
          continue;
        }
        const varMatch = raw.substring(i).match(/^\\[Vv]\[(\d+)\]/);
        if (varMatch) {
          const varId = parseInt(varMatch[1], 10);
          const value = getVariableValue(varId);
          const escapedValue = escapeHtml(String(value));
          if (currentColor !== null) {
            result += `<span style="color: ${currentColor};">${escapedValue}</span>`;
          } else {
            result += escapedValue;
          }
          i += varMatch[0].length;
          continue;
        }
        const iconMatch = raw.substring(i).match(/^\\[Ii]\[(\d+)\]/);
        if (iconMatch) {
          i += iconMatch[0].length;
          continue;
        }
        i += 2;
        continue;
      } else {
        let j = i;
        while (j < raw.length && raw[j] !== '\\') j++;
        const text = raw.substring(i, j);
        const escapedText = escapeHtml(text);
        if (currentColor !== null) {
          result += `<span style="color: ${currentColor};">${escapedText}</span>`;
        } else {
          result += escapedText;
        }
        i = j;
      }
    }
    return result;
  }

  // ====================== 主体 ======================
  let state = {
    window: null,
    visible: false,
    currentPage: 1,
    history: [],
    windowWidth: parseInt(CONFIG.WINDOW.WIDTH),
    windowHeight: parseInt(CONFIG.WINDOW.HEIGHT),
    lastKeyPress: 0,
    blockGameInput: false,
    originalUpdateFunctions: {},
    originalInputFunctions: {},
    inputOverlay: null
  };

  function applyStyle(element, styleConfig) {
    for (const key in styleConfig) {
      if (styleConfig.hasOwnProperty(key) && !key.startsWith('HOVER_')) {
        const cssKey = key.toLowerCase().replace(/_/g, '-');
        element.style[cssKey] = styleConfig[key];
      }
    }
  }

  function createWindow() {
    console.log("创建历史记录窗口...");
    if (state.window) try { document.body.removeChild(state.window); } catch(e) {}
    state.window = document.createElement('div');
    state.window.id = 'text-history-window';
    applyStyle(state.window, CONFIG.WINDOW);
    state.window.style.width = state.windowWidth + 'px';
    state.window.style.height = state.windowHeight + 'px';

    const header = document.createElement('div');
    applyStyle(header, CONFIG.HEADER);
    header.innerHTML = `<span>📜 文本历史记录</span>`;

    const content = document.createElement('div');
    content.id = 'history-content';
    applyStyle(content, CONFIG.CONTENT_CONTAINER);

    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = `
      #history-content::-webkit-scrollbar { width: ${CONFIG.SCROLLBAR.WIDTH}; }
      #history-content::-webkit-scrollbar-track { background: ${CONFIG.SCROLLBAR.TRACK_BACKGROUND}; border-radius: ${CONFIG.SCROLLBAR.BORDER_RADIUS}; }
      #history-content::-webkit-scrollbar-thumb { background: ${CONFIG.SCROLLBAR.THUMB_BACKGROUND}; border-radius: ${CONFIG.SCROLLBAR.BORDER_RADIUS}; }
      #history-content::-webkit-scrollbar-thumb:hover { background: ${CONFIG.SCROLLBAR.THUMB_HOVER_BACKGROUND}; }
    `;
    document.head.appendChild(scrollbarStyle);

    const footer = document.createElement('div');
    applyStyle(footer, CONFIG.FOOTER);
    const _dispKey = k => String(k).replace('Key','').replace('Digit','').replace(/\+/g,' + ');
    footer.innerHTML = `
      <div>
        <span style="color: #88AAFF;">${_dispKey(getKey('toggle'))}</span>开关 
        <span style="color: #88AAFF;">${_dispKey(getKey('enlarge'))}</span>放大 
        <span style="color: #88AAFF;">${_dispKey(getKey('reduce'))}</span>缩小 
        <span style="color: #88AAFF;">${_dispKey(getKey('prev_page'))}/↑</span>上页 
        <span style="color: #88AAFF;">${_dispKey(getKey('next_page'))}/↓</span>下页
        <span style="color: #88AAFF; margin-left: 10px;">ESC</span>关闭
      </div>
      <div id="page-info">记录: 0 | 第 1/1 页</div>
    `;

    state.window.appendChild(header);
    state.window.appendChild(content);
    state.window.appendChild(footer);
    document.body.appendChild(state.window);

    state.window.addEventListener('keydown', e => {
      if (e.keyCode === 27) {
        e.preventDefault(); e.stopPropagation();
        toggleWindow();
      }
    });
    state.window.addEventListener('click', e => e.stopPropagation());
    state.window.addEventListener('wheel', e => e.stopPropagation());
    console.log("历史记录窗口创建完成");
    return state.window;
  }

  function calculatePages() {
    return Math.max(1, Math.ceil(state.history.length / getCfg('records_per_page')));
  }

  function toggleWindow() {
    if (!state.window) createWindow();
    state.visible = !state.visible;
    if (state.visible) {
      state.window.style.display = 'block';
      blockGameInputs();
      const totalPages = calculatePages();
      state.currentPage = totalPages;
      renderHistory();
      state.window.focus();
      console.log("历史记录窗口已打开");
    } else {
      state.window.style.display = 'none';
      restoreGameInputs();
      console.log("历史记录窗口已关闭");
    }
  }

  function renderHistory() {
    if (!state.visible || !state.window) return;
    const content = document.getElementById('history-content');
    const pageInfo = document.getElementById('page-info');
    if (!content || !pageInfo) return;
    content.innerHTML = '';
    const totalPages = calculatePages();
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;
    pageInfo.textContent = `记录: ${state.history.length} | 第 ${state.currentPage}/${totalPages} 页`;
    if (state.history.length === 0) {
      content.innerHTML = `<div style="text-align:center;padding:40px 0;color:#778899;font-size:14px;">暂无历史记录</div>`;
      return;
    }

    // —— 读取一次性配置，避免每条记录都重复读 ——
    const cfgShowSpeaker = getCfg('show_speaker');
    const cfgAutoWrap    = getCfg('auto_wrap');
    const cfgWrapLen     = getCfg('wrap_length');
    const cfgFontFamily  = getCfg('font_family');
    const cfgFontSize    = getCfg('font_size');

    const rpp = getCfg('records_per_page');
    const startIndex = (state.currentPage - 1) * rpp;
    const endIndex = Math.min(startIndex + rpp, state.history.length);
    const currentRecords = state.history.slice(startIndex, endIndex);

    currentRecords.forEach((record, idx) => {
      const globalIndex = startIndex + idx + 1;
      const card = document.createElement('div');
      applyStyle(card, CONFIG.RECORD_CARD);

      card.onmouseover = () => {
        card.style.background = CONFIG.RECORD_CARD.HOVER_BACKGROUND;
        card.style.transform = CONFIG.RECORD_CARD.HOVER_TRANSFORM;
        card.style.boxShadow = CONFIG.RECORD_CARD.HOVER_BOX_SHADOW;
      };
      card.onmouseout = () => {
        card.style.background = CONFIG.RECORD_CARD.BACKGROUND;
        card.style.transform = 'none';
        card.style.boxShadow = CONFIG.RECORD_CARD.BOX_SHADOW;
      };

      const indexSpan = document.createElement('span');
      applyStyle(indexSpan, CONFIG.RECORD_INDEX);
      indexSpan.textContent = `#${globalIndex}`;
      card.appendChild(indexSpan);

      // —— 说话人（根据配置决定是否显示） ——
      if (cfgShowSpeaker) {
        const speakerSpan = document.createElement('span');
        applyStyle(speakerSpan, CONFIG.RECORD_SPEAKER);
        speakerSpan.textContent = record.speaker || '???';
        card.appendChild(speakerSpan);
      }

      // —— 正文 ——
      const textDiv = document.createElement('div');
      applyStyle(textDiv, CONFIG.RECORD_TEXT);

      // 字体 & 字号
      if (cfgFontFamily) textDiv.style.fontFamily = cfgFontFamily;
      if (cfgFontSize)   textDiv.style.fontSize = cfgFontSize + 'px';

      // 换行控制
      if (cfgAutoWrap) {
        textDiv.style.whiteSpace = 'normal';
        textDiv.style.wordBreak = 'break-all';
        textDiv.style.overflow = 'visible';
        textDiv.style.textOverflow = 'clip';
        if (cfgWrapLen > 0) {
          // 用 ch 单位近似"每行最多 N 个字符"
          textDiv.style.maxWidth = cfgWrapLen + 'ch';
        }
      } else {
        textDiv.style.whiteSpace = 'nowrap';
        textDiv.style.overflow = 'hidden';
        textDiv.style.textOverflow = 'ellipsis';
        textDiv.style.maxWidth = '';
      }

      textDiv.innerHTML = parseRpgMakerText(record.text);
      card.appendChild(textDiv);

      // —— 时间戳 ——
      const timeSpan = document.createElement('span');
      applyStyle(timeSpan, CONFIG.RECORD_TIME);
      timeSpan.textContent = new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      card.appendChild(timeSpan);

      // 长文本点击查看完整内容
      if (record.text.length > 500) {
        card.style.cursor = 'pointer';
        card.title = record.text;
        card.addEventListener('click', e => {
          e.stopPropagation();
          prompt('完整内容（可按 Ctrl+A 全选，Ctrl+C 复制）', record.text);
        });
      }
      content.appendChild(card);
    });
  }

  function adjustWindowSize(increase) {
    if (!state.visible || !state.window) return;
    const step = CONFIG.WINDOW_SIZE.STEP;
    let newWidth = state.windowWidth;
    let newHeight = state.windowHeight;
    if (increase) {
      newWidth = Math.min(newWidth + step, CONFIG.WINDOW_SIZE.MAX_WIDTH);
      newHeight = Math.min(newHeight + step, CONFIG.WINDOW_SIZE.MAX_HEIGHT);
    } else {
      newWidth = Math.max(newWidth - step, CONFIG.WINDOW_SIZE.MIN_WIDTH);
      newHeight = Math.max(newHeight - step, CONFIG.WINDOW_SIZE.MIN_HEIGHT);
    }
    if (newWidth !== state.windowWidth || newHeight !== state.windowHeight) {
      state.windowWidth = newWidth;
      state.windowHeight = newHeight;
      state.window.style.width = newWidth + 'px';
      state.window.style.height = newHeight + 'px';
      renderHistory();
    }
  }

  function navigatePage(direction) {
    if (!state.visible) return;
    const totalPages = calculatePages();
    if (direction === 'prev' && state.currentPage > 1) {
      state.currentPage--;
      renderHistory();
    } else if (direction === 'next' && state.currentPage < totalPages) {
      state.currentPage++;
      renderHistory();
    }
  }

  function addTextRecord(rawText, speaker) {
    if (!rawText) return;
    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    for (let line of lines) {
      if (state.history.length > 0 && state.history[state.history.length - 1].text === line) {
        continue;
      }
      state.history.push({
        text: line,
        speaker: speaker || '',
        timestamp: Date.now()
      });
      if (state.history.length > getCfg('max_records')) {
        state.history.shift();
      }
    }
    if (state.visible) {
      const totalPages = calculatePages();
      if (state.currentPage === totalPages - 1 || state.currentPage === totalPages) {
        state.currentPage = totalPages;
        renderHistory();
      }
    }
  }

  function hijackGameText() {
    console.log("劫持游戏文本（使用 Window_Message.startMessage 方法）...");
    if (typeof Window_Message !== 'undefined' && Window_Message.prototype.startMessage) {
      const originalStartMessage = Window_Message.prototype.startMessage;
      Window_Message.prototype.startMessage = function() {
        originalStartMessage.call(this);
        let text = this._textState ? this._textState.text : "";
        let speaker = '';
        if (this._speakerName) speaker = this._speakerName;
        else if (this._name) speaker = this._name;
        else if (typeof $gameMessage !== 'undefined' && $gameMessage._speakerName) speaker = $gameMessage._speakerName;
        if (!speaker && text) {
          const match = text.match(/^([^：:]+)[：:]/);
          if (match) speaker = match[1].trim();
        }
        if (text) addTextRecord(text + '\n', speaker);
      };
      console.log("劫持成功：Window_Message.startMessage");
    } else {
      console.warn("未找到 Window_Message.startMessage，文本劫持失败！");
    }
  }

  function createInputOverlay() {
    if (state.inputOverlay) return;
    state.inputOverlay = document.createElement('div');
    state.inputOverlay.id = 'text-history-input-blocker';
    state.inputOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.01);
      z-index: ${CONFIG.WINDOW.Z_INDEX - 1};
      display: none;
    `;
    document.body.appendChild(state.inputOverlay);
  }

  function blockGameInputs() {
    if (state.blockGameInput) return;
    state.blockGameInput = true;
    if (state.inputOverlay) state.inputOverlay.style.display = 'block';

    if (SceneManager && SceneManager._scene && SceneManager._scene.update) {
      state.originalUpdateFunctions.scene = SceneManager._scene.update;
      SceneManager._scene.update = function() {
        if (Input.isTriggered('escape') && state.visible) toggleWindow();
      };
    }

    if (Input && Input._onKeyDown) {
      state.originalInputFunctions.onKeyDown = Input._onKeyDown;
      Input._onKeyDown = function(event) {
        if (state.visible) {
          if (event.keyCode === 27) {
            event.preventDefault(); event.stopPropagation();
            toggleWindow();
            return;
          }
          handleKeyDown(event);
          event.preventDefault(); event.stopPropagation();
          return;
        }
        if (state.originalInputFunctions.onKeyDown) {
          state.originalInputFunctions.onKeyDown.call(this, event);
        }
      };
    }

    if (Input && Input._onMouseDown) {
      state.originalInputFunctions.onMouseDown = Input._onMouseDown;
      Input._onMouseDown = function(event) {
        if (state.visible && state.window) {
          const rect = state.window.getBoundingClientRect();
          const x = event.pageX, y = event.pageY;
          const isInside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
          if (!isInside) { event.preventDefault(); event.stopPropagation(); return; }
        }
        if (state.originalInputFunctions.onMouseDown) {
          state.originalInputFunctions.onMouseDown.call(this, event);
        }
      };
    }
  }

  function restoreGameInputs() {
    if (!state.blockGameInput) return;
    state.blockGameInput = false;
    if (state.inputOverlay) state.inputOverlay.style.display = 'none';

    if (state.originalUpdateFunctions.scene && SceneManager && SceneManager._scene) {
      SceneManager._scene.update = state.originalUpdateFunctions.scene;
      delete state.originalUpdateFunctions.scene;
    }
    if (state.originalInputFunctions.onKeyDown && Input) {
      Input._onKeyDown = state.originalInputFunctions.onKeyDown;
      delete state.originalInputFunctions.onKeyDown;
    }
    if (state.originalInputFunctions.onMouseDown && Input) {
      Input._onMouseDown = state.originalInputFunctions.onMouseDown;
      delete state.originalInputFunctions.onMouseDown;
    }
  }

  function handleKeyDown(event) {
    const now = Date.now();
    if (now - state.lastKeyPress < 200) return;
    const code = event.code;

    if (matchKey(event, getKey('toggle'))) {
      event.preventDefault(); event.stopPropagation();
      toggleWindow();
      state.lastKeyPress = now;
      return;
    }

    if (state.visible) {
      if (matchKey(event, getKey('enlarge'))) {
        event.preventDefault(); adjustWindowSize(true);  state.lastKeyPress = now; return;
      }
      if (matchKey(event, getKey('reduce'))) {
        event.preventDefault(); adjustWindowSize(false); state.lastKeyPress = now; return;
      }
      if (matchKey(event, getKey('prev_page')) || code === 'ArrowUp') {
        event.preventDefault(); navigatePage('prev');    state.lastKeyPress = now; return;
      }
      if (matchKey(event, getKey('next_page')) || code === 'ArrowDown') {
        event.preventDefault(); navigatePage('next');    state.lastKeyPress = now; return;
      }
      if (code === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        toggleWindow();
        state.lastKeyPress = now;
        return;
      }
    }
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    createInputOverlay();
    createWindow();
    document.addEventListener('keydown', handleKeyDown, true);
    if (state.window) {
      state.window.addEventListener('wheel', e => {
        if (state.visible) {
          e.preventDefault();
          navigatePage(e.deltaY < 0 ? 'prev' : 'next');
        }
      }, { passive: false });
    }
    hijackGameText();
    console.log("✅ 文本历史记录脚本初始化完成！");
    console.log("📌 快捷键可在 F7 管理器中修改 | 设置也可在 F7 → 自定义配置中修改");
  }

  init();
})();