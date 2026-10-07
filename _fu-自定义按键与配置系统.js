//@AutoLoad @Evalv8
// 自定义按键与配置系统 | 仅游戏本地配置 | 可视化配置界面
// 默认打开键：F7（可在管理器中修改） | 支持窗口缩放 | 自动注册兼容脚本
// 所有配置存储于游戏目录 keybinds_game.json
(function() {
    'use strict';

    var CONFIG = {
        color: '#4a9eff',
        windowMinW: 400,
        windowMinH: 300,
        windowMaxW: 1200,
        windowMaxH: 900,
        windowDefW: 1000,
        windowDefH: 750,
        openKey: 'F7',
        fileName: 'keybinds_game.json',
        managerName: '自定义按键与配置系统',
        managerAction: 'open_manager'
    };

    var C = CONFIG;

    // ========== 内部状态 ==========
    var _scripts = {};           // 按键: { scriptName: { defaultKeys, actionNames } }
    var _configDefs = {};        // 配置定义: { scriptName: { key: { type, label, defaultValue, ... } } }
    var _config = {
        windowSize: { w: C.windowDefW, h: C.windowDefH },
        scripts: {},           // 按键保存值
        configScripts: {}      // 配置保存值: { scriptName: { key: { value, enabled } } }
    };
    var _isOpen = false;
    var _modal = null;
    var _window = null;
    var _sidebarEl = null;
    var _listEl = null;
    var _currentScriptName = null;
    var _currentConfigScriptName = null;
    var _currentTab = 'keys';    // 'keys' | 'config' | 'settings'
    var _editingKey = null;
    var _winW = C.windowDefW;
    var _winH = C.windowDefH;
    var _initialized = false;
    var _globalKeydownHandler = null;

    // ========== 文件系统 ==========
    var _fs = null, _path = null;
    try { _fs = require('fs'); _path = require('path'); } catch(e) {}

    function readJsonFile(filePath, fallback) {
        if (_fs && _path) {
            try {
                if (_fs.existsSync(filePath)) return JSON.parse(_fs.readFileSync(filePath, 'utf8'));
            } catch(e) {}
        } else {
            try {
                var s = localStorage.getItem('KeyBind_' + filePath);
                if (s) return JSON.parse(s);
            } catch(e) {}
        }
        return fallback;
    }

    function writeJsonFile(filePath, data) {
        if (_fs && _path) {
            try {
                _fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            } catch(e) {}
        } else {
            try { localStorage.setItem('KeyBind_' + filePath, JSON.stringify(data)); } catch(e) {}
        }
    }

    function loadConfig() {
        var filePath = _path ? _path.join(process.cwd(), C.fileName) : C.fileName;
        var data = readJsonFile(filePath, null);
        if (data && typeof data === 'object') {
            _config = data;
            if (!_config.windowSize) _config.windowSize = { w: C.windowDefW, h: C.windowDefH };
            if (!_config.scripts) _config.scripts = {};
            if (!_config.configScripts) _config.configScripts = {};
        } else {
            _config = {
                windowSize: { w: C.windowDefW, h: C.windowDefH },
                scripts: {},
                configScripts: {}
            };
            saveConfig();
        }
        _winW = Math.min(Math.max(_config.windowSize.w || C.windowDefW, C.windowMinW), C.windowMaxW);
        _winH = Math.min(Math.max(_config.windowSize.h || C.windowDefH, C.windowMinH), C.windowMaxH);
    }

    function saveConfig() {
        _config.windowSize = { w: _winW, h: _winH };
        var filePath = _path ? _path.join(process.cwd(), C.fileName) : C.fileName;
        writeJsonFile(filePath, _config);
    }

    // ========== 按键注册接口 ==========
    function registerScript(scriptName, defaultKeys, actionNames) {
        if (_initialized) {
            if (!_scripts[scriptName]) {
                _scripts[scriptName] = { defaultKeys: defaultKeys, actionNames: actionNames || {} };
                console.log('[KeyBind] 已注册按键脚本:', scriptName);
            }
        } else {
            window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
            window.__keyMapperPendingScripts.push({ name: scriptName, keys: defaultKeys, names: actionNames || {} });
        }
    }

    function getEffectiveBindings(scriptName) {
        var script = _scripts[scriptName];
        if (!script) return {};
        var def = Object.assign({}, script.defaultKeys);
        var saved = _config.scripts[scriptName] || {};
        return Object.assign(def, saved);
    }

    function getKey(scriptName, action) {
        return getEffectiveBindings(scriptName)[action];
    }

    // ========== 配置注册接口 ==========
    function registerConfig(scriptName, configDefs) {
        if (_initialized) {
            if (!_configDefs[scriptName]) {
                _configDefs[scriptName] = configDefs;
                console.log('[KeyBind] 已注册配置脚本:', scriptName);
            }
        } else {
            window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
            window.__keyMapperPendingConfigs.push({ name: scriptName, defs: configDefs });
        }
    }

    function getConfigValue(scriptName, key) {
        var saved = (_config.configScripts[scriptName] || {})[key];
        if (saved && saved.value !== undefined) return saved.value;
        var defs = _configDefs[scriptName] || {};
        return defs[key] ? defs[key].defaultValue : undefined;
    }

    function isConfigEnabled(scriptName, key) {
        var saved = (_config.configScripts[scriptName] || {})[key];
        return !!(saved && saved.enabled);
    }

    function setConfigValue(scriptName, key, value) {
        if (!_config.configScripts[scriptName]) _config.configScripts[scriptName] = {};
        if (!_config.configScripts[scriptName][key]) _config.configScripts[scriptName][key] = {};
        _config.configScripts[scriptName][key].value = value;
        saveConfig();
    }

    function setConfigEnabled(scriptName, key, enabled) {
        if (!_config.configScripts[scriptName]) _config.configScripts[scriptName] = {};
        if (!_config.configScripts[scriptName][key]) _config.configScripts[scriptName][key] = {};
        _config.configScripts[scriptName][key].enabled = !!enabled;
        saveConfig();
    }

    // ========== 提前创建 window.KeyMapper ==========
    if (!window.KeyMapper) {
        window.KeyMapper = {
            registerScript: registerScript,
            registerConfig: registerConfig,
            getKey: getKey,
            getConfigValue: getConfigValue,
            isConfigEnabled: isConfigEnabled,
            setConfigValue: setConfigValue,
            setConfigEnabled: setConfigEnabled,
            openManager: function() { openManager(); },
            closeManager: function() { closeManager(); }
        };
    }

    function initManager() {
        if (_initialized) return;
        _initialized = true;
        loadConfig();

        // 注册管理器自身
        if (!_scripts[C.managerName]) {
            _scripts[C.managerName] = {
                defaultKeys: { [C.managerAction]: C.openKey },
                actionNames: { [C.managerAction]: '打开/关闭管理器' }
            };
        }

        // 处理暂存按键脚本
        if (window.__keyMapperPendingScripts) {
            window.__keyMapperPendingScripts.forEach(function(reg) {
                if (!_scripts[reg.name]) {
                    _scripts[reg.name] = { defaultKeys: reg.keys, actionNames: reg.names || {} };
                    console.log('[KeyBind] 已注册按键脚本（暂存）:', reg.name);
                }
            });
            delete window.__keyMapperPendingScripts;
        }

        // 处理暂存配置脚本
        if (window.__keyMapperPendingConfigs) {
            window.__keyMapperPendingConfigs.forEach(function(reg) {
                if (!_configDefs[reg.name]) {
                    _configDefs[reg.name] = reg.defs;
                    console.log('[KeyBind] 已注册配置脚本（暂存）:', reg.name);
                }
            });
            delete window.__keyMapperPendingConfigs;
        }

        updateGlobalOpenListener();

        // ★ 派发就绪事件，通知晚到的脚本
        try {
            window.dispatchEvent(new CustomEvent('keymapper:ready'));
        } catch(e) {}
    }

    function updateGlobalOpenListener() {
        if (_globalKeydownHandler) {
            document.removeEventListener('keydown', _globalKeydownHandler, true);
        }
        _globalKeydownHandler = function(e) {
            if (_isOpen) return;
            var currentOpenKey = getEffectiveBindings(C.managerName)[C.managerAction] || C.openKey;
            if (e.code === currentOpenKey) {
                e.preventDefault();
                openManager();
            }
        };
        document.addEventListener('keydown', _globalKeydownHandler, true);
    }

    initManager();

    // ========== 界面样式 ==========
    function addStyles() {
        if (document.getElementById('keybind-style')) return;
        var style = document.createElement('style');
        style.id = 'keybind-style';
        style.textContent = `
            .kb-script-item { padding: 8px 12px; margin: 2px 0; border-radius: 4px; cursor: pointer; transition: 0.1s; border-left: 3px solid transparent; }
            .kb-script-item:hover { background: rgba(74,158,255,0.2); }
            .kb-script-item.active { background: rgba(74,158,255,0.4); border-left-color: ${C.color}; }
            .kb-key-row { display: flex; align-items: center; padding: 8px 10px; margin: 3px 0; background: rgba(0,0,0,0.2); border-radius: 4px; }
            .kb-key-name { flex: 1; font-size: 13px; }
            .kb-key-value { padding: 4px 10px; background: #2a3a4f; border: 1px solid #4a6b8a; border-radius: 4px; min-width: 120px; text-align: center; font-size: 12px; cursor: pointer; transition: 0.2s; }
            .kb-key-value:hover { border-color: ${C.color}; }
            .kb-key-value.editing { border-color: #ff9500; background: #3a2a1f; animation: kb-pulse 1s infinite; }
            @keyframes kb-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,149,0,0.4); } 50% { box-shadow: 0 0 0 4px rgba(255,149,0,0); } }
            .kb-sidebar { width: 180px; border-right: 1px solid #3a4a5f; overflow-y: auto; flex-shrink: 0; }
            .kb-main { flex: 1; overflow-y: auto; padding: 10px; }
            .kb-reset-btn { padding: 4px 10px; background: #c0392b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
            .kb-tab { padding: 10px 20px; cursor: pointer; font-size: 14px; user-select: none; transition: 0.2s; color: #aaa; }
            .kb-tab:hover { color: #fff; }
            .kb-tab.active { color: #fff; background: rgba(74,158,255,0.25); border-bottom: 3px solid ${C.color}; }
            .kb-num-btn { width: 26px; height: 26px; padding: 0; background: #3a4a5f; border: 1px solid #4a6b8a; color: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1; }
            .kb-num-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    // ========== 打开管理器 ==========
    function openManager() {
        if (_isOpen) return;
        _isOpen = true;
        addStyles();
        loadConfig();

        _modal = document.createElement('div');
        _modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:20000;';
        document.body.appendChild(_modal);

        _window = document.createElement('div');
        _window.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            width:${_winW}px;height:${_winH}px;
            background:rgba(20,25,35,0.97);
            border:3px solid ${C.color};
            border-radius:10px;
            box-shadow:0 0 40px rgba(74,158,255,0.5);
            z-index:20001;
            color:white;
            font:14px "Microsoft YaHei";
            display:flex;
            flex-direction:column;
            overflow:hidden;
        `;

        // 标题栏
        var header = document.createElement('div');
        header.style.cssText = 'height:45px;background:linear-gradient(135deg,rgba(40,50,70,0.95),rgba(60,80,100,0.95));border-bottom:2px solid '+C.color+';padding:0 15px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = '<span>🛠️ 自定义按键与配置系统</span><span id="kb-close-hint" style="font-size:12px;opacity:0.7">按 ' + (getEffectiveBindings(C.managerName)[C.managerAction] || C.openKey) + ' 或 Esc 关闭</span>';
        _window.appendChild(header);

        // 标签栏
        var tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex;background:rgba(30,40,55,0.95);border-bottom:1px solid #3a4a5f;flex-shrink:0;';

        var tabKeys = document.createElement('div');
        tabKeys.className = 'kb-tab';
        tabKeys.textContent = '⌨️ 自定义按键';

        var tabConfig = document.createElement('div');
        tabConfig.className = 'kb-tab';
        tabConfig.textContent = '⚙️ 自定义配置';

        var tabSettings = document.createElement('div');
        tabSettings.className = 'kb-tab';
        tabSettings.textContent = '🔧 设置';

        function updateTabStyles() {
            tabKeys.classList.toggle('active', _currentTab === 'keys');
            tabConfig.classList.toggle('active', _currentTab === 'config');
            tabSettings.classList.toggle('active', _currentTab === 'settings');
        }
        updateTabStyles();

        function switchTab(tabName) {
            if (_currentTab === tabName) return;
            _currentTab = tabName;
            updateTabStyles();
            rebuildSidebar();
            refreshMainArea();
            updateResetBtn();
        }

        tabKeys.onclick = function() { switchTab('keys'); };
        tabConfig.onclick = function() { switchTab('config'); };
        tabSettings.onclick = function() { switchTab('settings'); };

        tabBar.appendChild(tabKeys);
        tabBar.appendChild(tabConfig);
        tabBar.appendChild(tabSettings);
        _window.appendChild(tabBar);

        // 主体
        var body = document.createElement('div');
        body.style.cssText = 'flex:1;display:flex;overflow:hidden;';

        _sidebarEl = document.createElement('div');
        _sidebarEl.className = 'kb-sidebar';
        _sidebarEl.style.cssText = 'padding:8px 5px;';
        body.appendChild(_sidebarEl);

        _listEl = document.createElement('div');
        _listEl.className = 'kb-main';
        body.appendChild(_listEl);
        _window.appendChild(body);

        // 页脚
        var footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 15px;background:rgba(0,0,0,0.3);flex-shrink:0;font-size:12px;color:#aaa;';

        var zoomDiv = document.createElement('div');
        zoomDiv.style.cssText = 'display:flex;gap:5px;';
        var zoomOut = document.createElement('button');
        zoomOut.textContent = '🔽 缩小(O)';
        zoomOut.style.cssText = 'padding:4px 8px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
        zoomOut.onclick = function() { resizeWindow(false); };
        var zoomIn = document.createElement('button');
        zoomIn.textContent = '🔼 放大(I)';
        zoomIn.style.cssText = zoomOut.style.cssText;
        zoomIn.onclick = function() { resizeWindow(true); };
        zoomDiv.appendChild(zoomOut); zoomDiv.appendChild(zoomIn);

        var resetBtn = document.createElement('button');
        resetBtn.className = 'kb-reset-btn';
        resetBtn.onclick = function() {
            if (_currentTab === 'keys') {
                if (!_currentScriptName) return;
                if (!confirm('确定重置当前脚本的按键为默认值吗？')) return;
                delete _config.scripts[_currentScriptName];
                saveConfig();
                renderKeyList();
                if (_currentScriptName === C.managerName) updateGlobalOpenListener();
            } else if (_currentTab === 'config') {
                if (!_currentConfigScriptName) return;
                if (!confirm('确定重置当前脚本的所有配置为默认值吗？')) return;
                delete _config.configScripts[_currentConfigScriptName];
                saveConfig();
                renderConfigList();
            }
        };

        function updateResetBtn() {
            if (_currentTab === 'settings') {
                resetBtn.style.display = 'none';
            } else {
                resetBtn.style.display = '';
                resetBtn.textContent = _currentTab === 'keys' ? '重置当前脚本按键' : '重置当前脚本配置';
            }
        }
        updateResetBtn();

        footer.appendChild(zoomDiv);
        footer.appendChild(resetBtn);
        _window.appendChild(footer);

        document.body.appendChild(_window);

        rebuildSidebar();
        refreshMainArea();

        // ★ 滚轮支持：手动处理，避免被游戏层的 wheel 拦截
        function bindWheelScroll(el) {
            if (!el) return;
            el.addEventListener('wheel', function(e) {
                e.stopPropagation();
                // 兼容不同设备的 deltaMode（0=像素 1=行 2=页）
                var delta = e.deltaY;
                if (e.deltaMode === 1) delta *= 20;
                else if (e.deltaMode === 2) delta *= 100;
                el.scrollTop += delta;
                e.preventDefault();
            }, { passive: false });
        }
        bindWheelScroll(_listEl);
        bindWheelScroll(_sidebarEl);

        _modal.addEventListener('click', closeManager);
        blockGameInput();
    }

    // ========== 侧边栏构建 ==========
    function rebuildSidebar() {
        if (!_sidebarEl) return;

        // 设置页：隐藏侧边栏
        if (_currentTab === 'settings') {
            _sidebarEl.style.display = 'none';
            _sidebarEl.innerHTML = '';
            return;
        } else {
            _sidebarEl.style.display = '';
        }

        _sidebarEl.innerHTML = '';

        var scripts;
        if (_currentTab === 'keys') {
            scripts = Object.keys(_scripts);
            if (!_currentScriptName || !_scripts[_currentScriptName]) {
                _currentScriptName = scripts[0] || null;
            }
        } else {
            scripts = Object.keys(_configDefs);
            if (!_currentConfigScriptName || !_configDefs[_currentConfigScriptName]) {
                _currentConfigScriptName = scripts[0] || null;
            }
        }

        if (scripts.length === 0) {
            _sidebarEl.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.6;font-size:12px">' + (_currentTab === 'keys' ? '暂无注册脚本' : '暂无注册配置') + '</div>';
            return;
        }

        var currentName = _currentTab === 'keys' ? _currentScriptName : _currentConfigScriptName;

        scripts.forEach(function(name) {
            var item = document.createElement('div');
            item.className = 'kb-script-item' + (name === currentName ? ' active' : '');
            item.textContent = name;
            item.dataset.name = name;
            item.onclick = function() {
                if (_currentTab === 'keys') {
                    _currentScriptName = name;
                } else {
                    _currentConfigScriptName = name;
                }
                _sidebarEl.querySelectorAll('.kb-script-item').forEach(function(i) { i.classList.remove('active'); });
                item.classList.add('active');
                refreshMainArea();
            };
            _sidebarEl.appendChild(item);
        });
    }

    function refreshMainArea() {
        if (_currentTab === 'keys') {
            renderKeyList();
        } else if (_currentTab === 'config') {
            renderConfigList();
        } else if (_currentTab === 'settings') {
            renderSettings();
        }
    }

    // ========== 按键列表渲染 ==========
    function getActionDisplayName(action, scriptName) {
        var script = _scripts[scriptName];
        if (script && script.actionNames && script.actionNames[action]) {
            return script.actionNames[action];
        }
        var defaultNames = {
            'open_manager': '打开/关闭管理器'
        };
        return defaultNames[action] || action;
    }

    function renderKeyList() {
        if (!_listEl || !_currentScriptName) return;
        _listEl.style.cssText = 'flex:1;overflow-y:auto;padding:10px;';
        var script = _scripts[_currentScriptName];
        if (!script) return;

        var effective = getEffectiveBindings(_currentScriptName);
        var saved = _config.scripts[_currentScriptName] || {};

        _listEl.innerHTML = '';

        var tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:10px;padding:5px 8px;background:rgba(0,0,0,0.2);border-radius:4px;';
        tip.textContent = '点击按键值可修改，按下新组合键确认，Esc取消';
        _listEl.appendChild(tip);

        Object.keys(script.defaultKeys).forEach(function(action) {
            var row = document.createElement('div');
            row.className = 'kb-key-row';
            var name = document.createElement('div');
            name.className = 'kb-key-name';
            name.textContent = getActionDisplayName(action, _currentScriptName);
            row.appendChild(name);
            var value = document.createElement('div');
            value.className = 'kb-key-value';
            value.textContent = formatKeyDisplay(saved[action] || effective[action]);
            value.dataset.action = action;
            value.onclick = function() { startEditKey(value, action); };
            row.appendChild(value);
            _listEl.appendChild(row);
        });
    }

    // ========== 配置列表渲染 ==========
    function renderConfigList() {
        if (!_listEl || !_currentConfigScriptName) return;
        _listEl.style.cssText = 'flex:1;overflow-y:auto;padding:10px;';
        var defs = _configDefs[_currentConfigScriptName];
        if (!defs) return;

        _listEl.innerHTML = '';

        var tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:10px;padding:5px 8px;background:rgba(0,0,0,0.2);border-radius:4px;';
        tip.textContent = '勾选"启用"后自定义值才会生效，未勾选时保持游戏原始行为';
        _listEl.appendChild(tip);

        Object.keys(defs).forEach(function(key) {
            var def = defs[key];
            var saved = (_config.configScripts[_currentConfigScriptName] || {})[key] || {};
            var enabled = !!saved.enabled;
            var value = saved.value !== undefined ? saved.value : def.defaultValue;
            var isMultiline = (def.type === 'textarea');

            var row = document.createElement('div');
            row.className = 'kb-key-row';

            // —— 头部行（checkbox + name） ——
            var headerLine = document.createElement('div');
            headerLine.style.cssText = 'display:flex;align-items:center;' + (isMultiline ? 'width:100%;' : 'flex:1;');

            var check = document.createElement('input');
            check.type = 'checkbox';
            check.checked = enabled;
            check.style.cssText = 'margin-right:10px;cursor:pointer;width:16px;height:16px;accent-color:' + C.color + ';flex-shrink:0;';
            check.onchange = function() {
                setConfigEnabled(_currentConfigScriptName, key, this.checked);
                renderConfigList();
            };
            headerLine.appendChild(check);

            var name = document.createElement('div');
            name.className = 'kb-key-name';
            name.textContent = def.label || key;
            name.style.opacity = enabled ? '1' : '0.5';
            headerLine.appendChild(name);

            if (isMultiline) {
                row.style.flexDirection = 'column';
                row.style.alignItems = 'stretch';
                row.appendChild(headerLine);

                var ta = document.createElement('textarea');
                ta.value = value;
                ta.rows = def.rows || 4;
                ta.placeholder = def.placeholder || '';
                ta.style.cssText = 'margin-top:6px;width:100%;padding:6px 8px;background:#1e2a38;color:#fff;border:1px solid #4a6b8a;border-radius:4px;font-size:12px;font-family:Consolas,monospace;resize:vertical;box-sizing:border-box;' + (enabled ? '' : 'opacity:0.5;');
                ta.disabled = !enabled;
                ta.onchange = function() {
                    setConfigValue(_currentConfigScriptName, key, this.value);
                };
                row.appendChild(ta);
                _listEl.appendChild(row);
                return;
            }

            row.appendChild(headerLine);

            // ====== 数字类型 ======
            if (def.type === 'number') {
                var valueWrap = document.createElement('div');
                valueWrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';

                var minusBtn = document.createElement('button');
                minusBtn.textContent = '−';
                minusBtn.className = 'kb-num-btn';
                minusBtn.disabled = !enabled;
                minusBtn.onclick = function() {
                    var newVal = value - (def.step || 1);
                    if (def.min !== undefined) newVal = Math.max(def.min, newVal);
                    setConfigValue(_currentConfigScriptName, key, newVal);
                    renderConfigList();
                };
                valueWrap.appendChild(minusBtn);

                var valueBox = document.createElement('div');
                valueBox.className = 'kb-key-value';
                valueBox.textContent = value;
                valueBox.style.cssText = 'min-width:60px;' + (enabled ? 'cursor:pointer;' : 'opacity:0.5;cursor:not-allowed;');
                valueBox.onclick = function() {
                    if (!enabled) return;
                    var range = '';
                    if (def.min !== undefined || def.max !== undefined) {
                        range = ' (' + (def.min !== undefined ? def.min : '-∞') + ' ~ ' + (def.max !== undefined ? def.max : '∞') + ')';
                    }
                    var v = prompt('输入新值' + range + ':', value);
                    if (v === null) return;
                    var num = parseFloat(v);
                    if (isNaN(num)) { alert('请输入有效数字'); return; }
                    if (def.min !== undefined) num = Math.max(def.min, num);
                    if (def.max !== undefined) num = Math.min(def.max, num);
                    setConfigValue(_currentConfigScriptName, key, num);
                    renderConfigList();
                };
                valueWrap.appendChild(valueBox);

                var plusBtn = document.createElement('button');
                plusBtn.textContent = '+';
                plusBtn.className = 'kb-num-btn';
                plusBtn.disabled = !enabled;
                plusBtn.onclick = function() {
                    var newVal = value + (def.step || 1);
                    if (def.max !== undefined) newVal = Math.min(def.max, newVal);
                    setConfigValue(_currentConfigScriptName, key, newVal);
                    renderConfigList();
                };
                valueWrap.appendChild(plusBtn);

                row.appendChild(valueWrap);

            // ====== 布尔类型 ======
            } else if (def.type === 'bool') {
                var boolBtn = document.createElement('button');
                boolBtn.textContent = value ? '是' : '否';
                boolBtn.style.cssText = 'min-width:70px;padding:4px 10px;background:#2a3a4f;color:' +
                    (value ? '#7FE07F' : '#FF8888') + ';border:1px solid #4a6b8a;border-radius:4px;font-size:13px;cursor:pointer;' +
                    (enabled ? '' : 'opacity:0.5;cursor:not-allowed;');
                boolBtn.disabled = !enabled;
                boolBtn.onclick = function() {
                    setConfigValue(_currentConfigScriptName, key, !value);
                    renderConfigList();
                };
                row.appendChild(boolBtn);

            // ====== 下拉选择 + 输入框 ======
            } else if (def.type === 'select') {
                var selWrap = document.createElement('div');
                selWrap.style.cssText = 'display:flex;gap:6px;align-items:center;flex-shrink:0;';

                var sel = document.createElement('select');
                sel.style.cssText = 'min-width:130px;padding:4px 6px;background:#1e2a38;color:#fff;border:1px solid #4a6b8a;border-radius:4px;font-size:12px;' +
                    (enabled ? 'cursor:pointer;' : 'opacity:0.5;cursor:not-allowed;');
                sel.disabled = !enabled;
                (def.options || []).forEach(function(opt) {
                    var o = document.createElement('option');
                    o.value = typeof opt === 'string' ? opt : (opt.value !== undefined ? opt.value : opt);
                    o.textContent = typeof opt === 'string' ? opt : (opt.label !== undefined ? opt.label : opt.value);
                    sel.appendChild(o);
                });
                Array.prototype.forEach.call(sel.options, function(o) {
                    if (o.value === String(value)) o.selected = true;
                });
                sel.onchange = function() {
                    setConfigValue(_currentConfigScriptName, key, this.value);
                    renderConfigList();
                };
                selWrap.appendChild(sel);

                var inp = document.createElement('input');
                inp.type = 'text';
                inp.value = value;
                inp.style.cssText = 'min-width:160px;padding:4px 6px;background:#2a3a4f;color:#fff;border:1px solid #4a6b8a;border-radius:4px;font-size:12px;text-align:left;' +
                    (enabled ? '' : 'opacity:0.5;cursor:not-allowed;');
                inp.disabled = !enabled;
                inp.onchange = function() {
                    setConfigValue(_currentConfigScriptName, key, this.value);
                };
                selWrap.appendChild(inp);

                row.appendChild(selWrap);

            // ====== 颜色类型（color picker + hex 输入）======
            } else if (def.type === 'color') {
                var colorWrap = document.createElement('div');
                colorWrap.style.cssText = 'display:flex;gap:6px;align-items:center;flex-shrink:0;';

                var hexStr;
                if (typeof value === 'number') {
                    hexStr = '#' + value.toString(16).padStart(6, '0');
                } else if (typeof value === 'string' && value.charAt(0) === '#') {
                    hexStr = value;
                } else if (typeof value === 'string') {
                    hexStr = '#' + value.padStart(6, '0');
                } else {
                    hexStr = '#000000';
                }

                var picker = document.createElement('input');
                picker.type = 'color';
                picker.value = hexStr;
                picker.style.cssText = 'width:44px;height:28px;padding:0;border:1px solid #4a6b8a;border-radius:4px;background:transparent;cursor:pointer;' +
                    (enabled ? '' : 'opacity:0.5;cursor:not-allowed;');
                picker.disabled = !enabled;

                var hexInput = document.createElement('input');
                hexInput.type = 'text';
                hexInput.value = hexStr;
                hexInput.style.cssText = 'min-width:90px;padding:4px 6px;background:#2a3a4f;color:#fff;border:1px solid #4a6b8a;border-radius:4px;font-size:12px;text-align:left;font-family:Consolas,monospace;' +
                    (enabled ? '' : 'opacity:0.5;cursor:not-allowed;');
                hexInput.disabled = !enabled;

                picker.onchange = function() {
                    var num = parseInt(this.value.replace('#', ''), 16);
                    setConfigValue(_currentConfigScriptName, key, num);
                    hexInput.value = this.value;
                };
                hexInput.onchange = function() {
                    var v = this.value.trim();
                    if (v.charAt(0) !== '#') v = '#' + v;
                    var num = parseInt(v.replace('#', ''), 16);
                    if (isNaN(num)) { alert('无效的颜色值，请使用 #RRGGBB 格式'); return; }
                    setConfigValue(_currentConfigScriptName, key, num);
                    picker.value = '#' + num.toString(16).padStart(6, '0');
                };

                colorWrap.appendChild(picker);
                colorWrap.appendChild(hexInput);
                row.appendChild(colorWrap);
            }

            _listEl.appendChild(row);
        });
    }

    // ========== 按键编辑 ==========
    function formatKeyDisplay(keyDef) {
        if (Array.isArray(keyDef)) keyDef = keyDef[0];
        if (!keyDef) return '未设置';
        return keyDef.replace(/\+/g, ' + ').replace('Numpad', '小键盘');
    }

    function startEditKey(el, action) {
        if (_editingKey) _editingKey.el.classList.remove('editing');
        _editingKey = { el: el, action: action };
        el.classList.add('editing');
        el.textContent = '按下按键...';
    }

    function finishEditKey(e) {
        if (!_editingKey) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        var code = e.code;
        if (['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(code)) return;

        var parts = [];
        if (e.shiftKey) parts.push('Shift');
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        parts.push(code);
        var keyStr = parts.join('+');

        if (!_config.scripts[_currentScriptName]) {
            _config.scripts[_currentScriptName] = {};
        }
        _config.scripts[_currentScriptName][_editingKey.action] = keyStr;
        saveConfig();

        if (_currentScriptName === C.managerName && _editingKey.action === C.managerAction) {
            updateGlobalOpenListener();
            var span = document.getElementById('kb-close-hint');
            if (span) span.textContent = '按 ' + formatKeyDisplay(getEffectiveBindings(C.managerName)[C.managerAction]) + ' 或 Esc 关闭';
        }

        _editingKey.el.classList.remove('editing');
        _editingKey.el.textContent = formatKeyDisplay(keyStr);
        _editingKey = null;
    }

    // ========== 窗口缩放 ==========
    function resizeWindow(zoomIn) {
        var step = 30;
        _winW = Math.min(Math.max(_winW + (zoomIn ? step : -step), C.windowMinW), C.windowMaxW);
        _winH = Math.min(Math.max(_winH + (zoomIn ? step : -step), C.windowMinH), C.windowMaxH);
        if (_window) {
            _window.style.width = _winW + 'px';
            _window.style.height = _winH + 'px';
        }
        saveConfig();
    }

    // ========== 设置页：导出 / 导入 ==========
    function renderSettings() {
        if (!_listEl) return;
        _listEl.innerHTML = '';
        _listEl.style.cssText = 'flex:1;overflow-y:auto;padding:24px 40px;';

        var title = document.createElement('div');
        title.textContent = '🔧 配置管理';
        title.style.cssText = 'font-size:22px;font-weight:bold;color:' + C.color + ';margin-bottom:6px;';
        _listEl.appendChild(title);

        var desc = document.createElement('div');
        desc.textContent = '在此可以导出当前按键与配置数据、或从文件导入并覆盖当前数据。';
        desc.style.cssText = 'font-size:13px;color:#99AABB;margin-bottom:24px;';
        _listEl.appendChild(desc);

        // —— 导出区 ——
        var exportBox = document.createElement('div');
        exportBox.style.cssText = 'background:rgba(0,0,0,0.25);border:1px solid #3a4a5f;border-radius:8px;padding:18px 20px;margin-bottom:18px;';

        var exportTitle = document.createElement('div');
        exportTitle.textContent = '📤 导出配置';
        exportTitle.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:8px;color:#88BBFF;';
        exportBox.appendChild(exportTitle);

        var exportDesc = document.createElement('div');
        exportDesc.textContent = '将当前的按键绑定与自定义配置保存为 JSON 文件下载到本地。';
        exportDesc.style.cssText = 'font-size:12px;color:#99AABB;margin-bottom:12px;';
        exportBox.appendChild(exportDesc);

        var exportBtn = document.createElement('button');
        exportBtn.textContent = '💾 导出为 JSON 文件';
        exportBtn.style.cssText = 'padding:8px 18px;background:linear-gradient(135deg,#2A7A5A,#1A5A3A);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;';
        exportBtn.onmouseover = function() { this.style.transform = 'translateY(-2px)'; };
        exportBtn.onmouseout  = function() { this.style.transform = 'translateY(0)'; };
        exportBtn.onclick = exportConfig;
        exportBox.appendChild(exportBtn);

        var preview = document.createElement('div');
        preview.style.cssText = 'margin-top:12px;font-size:11px;color:#778899;';
        var scriptCount = Object.keys(_scripts).length;
        var configCount = Object.keys(_configDefs).length;
        var savedKeyCount = Object.keys(_config.scripts || {}).length;
        var savedCfgCount = Object.keys(_config.configScripts || {}).length;
        preview.textContent = '当前数据：按键脚本 ' + scriptCount + ' 个（已保存自定义 ' + savedKeyCount + ' 个） | 配置脚本 ' + configCount + ' 个（已保存自定义 ' + savedCfgCount + ' 个）';
        exportBox.appendChild(preview);

        _listEl.appendChild(exportBox);

        // —— 导入区 ——
        var importBox = document.createElement('div');
        importBox.style.cssText = 'background:rgba(0,0,0,0.25);border:1px solid #3a4a5f;border-radius:8px;padding:18px 20px;';

        var importTitle = document.createElement('div');
        importTitle.textContent = '📥 导入配置';
        importTitle.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:8px;color:#FFAA88;';
        importBox.appendChild(importTitle);

        var importDesc = document.createElement('div');
        importDesc.textContent = '选择一份之前导出的 JSON 文件，导入后将覆盖当前所有按键与配置数据。';
        importDesc.style.cssText = 'font-size:12px;color:#99AABB;margin-bottom:12px;';
        importBox.appendChild(importDesc);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.cssText = 'display:none;';
        fileInput.onchange = function(e) {
            var f = e.target.files && e.target.files[0];
            if (f) importConfig(f);
            fileInput.value = '';
        };
        importBox.appendChild(fileInput);

        var importBtn = document.createElement('button');
        importBtn.textContent = '📂 选择 JSON 文件';
        importBtn.style.cssText = 'padding:8px 18px;background:linear-gradient(135deg,#3A5F8A,#2A4A6A);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;';
        importBtn.onmouseover = function() { this.style.transform = 'translateY(-2px)'; };
        importBtn.onmouseout  = function() { this.style.transform = 'translateY(0)'; };
        importBtn.onclick = function() { fileInput.click(); };
        importBox.appendChild(importBtn);

        var warn = document.createElement('div');
        warn.textContent = '⚠️ 导入会覆盖当前配置，请先确认已导出备份。';
        warn.style.cssText = 'margin-top:12px;font-size:11px;color:#FF8888;';
        importBox.appendChild(warn);

        _listEl.appendChild(importBox);

        // —— 危险操作区 ——
        var dangerBox = document.createElement('div');
        dangerBox.style.cssText = 'background:rgba(60,20,20,0.25);border:1px solid #6a3a3a;border-radius:8px;padding:18px 20px;margin-top:18px;';

        var dangerTitle = document.createElement('div');
        dangerTitle.textContent = '⚠️ 危险操作';
        dangerTitle.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:8px;color:#FF8888;';
        dangerBox.appendChild(dangerTitle);

        var dangerDesc = document.createElement('div');
        dangerDesc.textContent = '清空全部自定义按键与配置数据，恢复到所有脚本的默认状态。';
        dangerDesc.style.cssText = 'font-size:12px;color:#99AABB;margin-bottom:12px;';
        dangerBox.appendChild(dangerDesc);

        var clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ 清空全部自定义配置';
        clearBtn.style.cssText = 'padding:8px 18px;background:linear-gradient(135deg,#7A2A2A,#5A1A1A);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;';
        clearBtn.onclick = function() {
            if (!confirm('确定清空全部自定义按键与配置吗？此操作不可撤销。')) return;
            _config.scripts = {};
            _config.configScripts = {};
            saveConfig();
            updateGlobalOpenListener();
            alert('已清空全部自定义配置');
            renderSettings();
        };
        dangerBox.appendChild(clearBtn);

        _listEl.appendChild(dangerBox);
    }

    function exportConfig() {
        try {
            var data = {
                _meta: {
                    exportedAt: new Date().toISOString(),
                    version: 'KeyMapper-1.0',
                    manager: C.managerName
                },
                config: _config
            };
            var dataStr = JSON.stringify(data, null, 2);
            var blob = new Blob([dataStr], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = 'keybinds_export_' + ts + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        } catch(e) {
            alert('导出失败：' + e.message);
        }
    }

    function importConfig(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var raw = JSON.parse(e.target.result);
                // 兼容两种格式：直接 { scripts, configScripts, ... } 或 { _meta, config }
                var data = (raw && raw.config) ? raw.config : raw;
                if (!data || typeof data !== 'object') throw new Error('无效的配置格式');

                if (!confirm('确定用导入的配置覆盖当前配置吗？')) return;

                _config = data;
                if (!_config.scripts) _config.scripts = {};
                if (!_config.configScripts) _config.configScripts = {};
                if (!_config.windowSize) _config.windowSize = { w: C.windowDefW, h: C.windowDefH };

                _winW = Math.min(Math.max(_config.windowSize.w || C.windowDefW, C.windowMinW), C.windowMaxW);
                _winH = Math.min(Math.max(_config.windowSize.h || C.windowDefH, C.windowMinH), C.windowMaxH);
                if (_window) {
                    _window.style.width = _winW + 'px';
                    _window.style.height = _winH + 'px';
                }

                saveConfig();
                updateGlobalOpenListener();

                rebuildSidebar();
                refreshMainArea();

                alert('配置导入成功！');
            } catch(err) {
                alert('导入失败：' + err.message);
            }
        };
        reader.onerror = function() { alert('读取文件失败'); };
        reader.readAsText(file);
    }

    function closeManager() {
        if (!_isOpen) return;
        _isOpen = false;
        if (_modal) { _modal.remove(); _modal = null; }
        if (_window) { _window.remove(); _window = null; }
        _sidebarEl = null;
        _listEl = null;
        _editingKey = null;
        unblockGameInput();
        saveConfig();
    }

    // ========== 输入屏蔽 ==========
    function blockGameInput() {
        try {
            if (SceneManager._scene && SceneManager._scene.update) {
                window._kb_oldUpdate = SceneManager._scene.update;
                SceneManager._scene.update = function(){};
            }
        } catch(e) {}
        window._kb_keyHandler = function(e) {
            if (!_isOpen) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            if (_editingKey) {
                if (e.code === 'Escape') {
                    _editingKey.el.classList.remove('editing');
                    _editingKey.el.textContent = formatKeyDisplay(getEffectiveBindings(_currentScriptName)[_editingKey.action]);
                    _editingKey = null;
                    return;
                }
                finishEditKey(e);
                return;
            }
            if (e.code === 'Escape') {
                closeManager();
            } else if (e.code === 'KeyI') {
                resizeWindow(true);
            } else if (e.code === 'KeyO') {
                resizeWindow(false);
            }
        };
        window.addEventListener('keydown', window._kb_keyHandler, { capture: true });
    }

    function unblockGameInput() {
        try {
            if (window._kb_oldUpdate && SceneManager._scene) {
                SceneManager._scene.update = window._kb_oldUpdate;
                delete window._kb_oldUpdate;
            }
        } catch(e) {}
        if (window._kb_keyHandler) {
            window.removeEventListener('keydown', window._kb_keyHandler, { capture: true });
            delete window._kb_keyHandler;
        }
    }

    console.log('✅ 自定义按键与配置系统已加载，按 F7 打开配置界面');
})();