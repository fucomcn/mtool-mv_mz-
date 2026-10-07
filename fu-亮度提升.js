//@AutoLoad @Evalv8
// MV游戏亮度调整脚本 - 6档亮度 + 多种实现方式（含组合提亮）

(async function() {
    // ========== 自定义按键支持 ==========
    const SCRIPT_NAME = '亮度调整';
    const DEFAULT_KEYS = {
        level_key: 'KeyL',   // 单独按：切换等级；Shift+按：切换修改方式
        reset_key: 'KeyZ'    // 按住此键 + 按 level_key：恢复"不修改"
    };
    const ACTION_NAMES = {
        level_key: '亮度键（单独按切等级，Shift+按切方式）',
        reset_key: '恢复键（按住此键+亮度键=恢复不修改）'
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

    // —— 注册到 KeyMapper（Pub/Sub + 暂存表） ——
    const KB_PAYLOAD = { name: SCRIPT_NAME, keys: DEFAULT_KEYS, names: ACTION_NAMES };
    function commitRegisterKB() {
        if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
            window.KeyMapper.registerScript(KB_PAYLOAD.name, KB_PAYLOAD.keys, KB_PAYLOAD.names);
            return true;
        }
        return false;
    }

    if (commitRegisterKB()) {
        console.log('[亮度调整] 已注册到自定义按键系统');
    } else {
        window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
        if (!window.__keyMapperPendingScripts.some(r => r.name === SCRIPT_NAME)) {
            window.__keyMapperPendingScripts.push(KB_PAYLOAD);
            console.log('[亮度调整] KeyMapper 未就绪，已写入暂存表');
        }
        if (!window.__brightnessKbReady) {
            window.__brightnessKbReady = function() {
                if (commitRegisterKB()) console.log('[亮度调整] 收到 keymapper:ready，已完成注册');
                if (window.__keyMapperPendingScripts) {
                    window.__keyMapperPendingScripts = window.__keyMapperPendingScripts.filter(r => r.name !== SCRIPT_NAME);
                }
                window.removeEventListener('keymapper:ready', window.__brightnessKbReady);
                delete window.__brightnessKbReady;
            };
            window.addEventListener('keymapper:ready', window.__brightnessKbReady);
        }
    }

    // 六档亮度等级（统一使用 toneFactor 和 darknessFactor）
    const brightnessLevels = [
        { name: "不修改", color: "#FFFFFF", css: { brightness: 1.0, contrast: 1.0, saturate: 1.0 }, toneFactor: 1.0, darknessFactor: 1.0 },
        { name: "减轻15%", color: "#00FF00", css: { brightness: 1.15, contrast: 1.05, saturate: 1.0 }, toneFactor: 0.85, darknessFactor: 0.85 },
        { name: "减轻25%", color: "#00CCFF", css: { brightness: 1.25, contrast: 1.08, saturate: 1.0 }, toneFactor: 0.75, darknessFactor: 0.75 },
        { name: "减轻50%", color: "#FFAA00", css: { brightness: 1.5, contrast: 1.1, saturate: 1.0 }, toneFactor: 0.5, darknessFactor: 0.5 },
        { name: "减轻75%", color: "#FF6600", css: { brightness: 1.75, contrast: 1.15, saturate: 1.0 }, toneFactor: 0.25, darknessFactor: 0.25 },
        { name: "全亮", color: "#FF0000", css: { brightness: 2.0, contrast: 1.2, saturate: 1.0 }, toneFactor: 0.0, darknessFactor: 0.0 }
    ];

    let currentLevelIndex = 0;

    const config = {
        debug: false,
        indicatorDisplayTime: 2000,
        showShortcutHint: true,
        autoApplyInScenes: true,
        mapBindingEnabled: true,
        firstNotificationMoved: false
    };

    // ------------------------------------------------------------
    // 亮度修改方式定义（五种）
    // ------------------------------------------------------------
    const brightnessMethodDefs = [
        // 0. CSS滤镜
        {
            id: "css-filter",
            name: "CSS滤镜",
            checkAvailability: function() { return true; },
            create: function() {
                return {
                    id: this.id,
                    name: this.name,
                    apply: function(levelIndex) {
                        if (!Graphics._canvas) return;
                        const level = brightnessLevels[levelIndex];
                        const filter = `brightness(${level.css.brightness}) contrast(${level.css.contrast}) saturate(${level.css.saturate})`;
                        Graphics._canvas.style.filter = filter;
                        Graphics._canvas.style.webkitFilter = filter;
                    },
                    reset: function() {
                        if (Graphics._canvas) {
                            Graphics._canvas.style.filter = 'none';
                            Graphics._canvas.style.webkitFilter = 'none';
                        }
                    },
                    destroy: function() { this.reset(); }
                };
            }
        },
        // 1. 色调灰度（仅调整灰度分量）
        {
            id: "tone-gray",
            name: "色调灰度",
            checkAvailability: function() {
                return typeof $gameScreen !== 'undefined' && $gameScreen.startTint;
            },
            create: function() {
                let savedTone = null;
                return {
                    id: this.id,
                    name: this.name,
                    apply: function(levelIndex) {
                        if (!$gameScreen) return;
                        const level = brightnessLevels[levelIndex];
                        if (levelIndex === 0) {
                            if (savedTone) $gameScreen.startTint(savedTone, 0);
                            return;
                        }
                        if (!savedTone) {
                            savedTone = $gameScreen._tone ? $gameScreen._tone.slice() : [0,0,0,0];
                        }
                        const newGray = Math.round(savedTone[3] * level.toneFactor);
                        $gameScreen.startTint([savedTone[0], savedTone[1], savedTone[2], newGray], 0);
                    },
                    reset: function() {
                        if (savedTone) $gameScreen.startTint(savedTone, 0);
                    },
                    destroy: function() { this.reset(); }
                };
            }
        },
        // 2. 画面色调（全分量等比例调整）
        {
            id: "tone-full",
            name: "画面色调",
            checkAvailability: function() {
                return typeof $gameScreen !== 'undefined' && $gameScreen.startTint;
            },
            create: function() {
                let savedTone = null;
                return {
                    id: this.id,
                    name: this.name,
                    apply: function(levelIndex) {
                        if (!$gameScreen) return;
                        const level = brightnessLevels[levelIndex];
                        if (levelIndex === 0) {
                            if (savedTone) $gameScreen.startTint(savedTone, 0);
                            return;
                        }
                        if (!savedTone) {
                            savedTone = $gameScreen._tone ? $gameScreen._tone.slice() : [0,0,0,0];
                        }
                        const newTone = savedTone.map(v => Math.round(v * level.toneFactor));
                        $gameScreen.startTint(newTone, 0);
                    },
                    reset: function() {
                        if (savedTone) $gameScreen.startTint(savedTone, 0);
                    },
                    destroy: function() { this.reset(); }
                };
            }
        },
        // 3. 暗部提亮（光影）—— 控制MPP_MapLight的暗度
        {
            id: "darkness-boost",
            name: "暗部提亮(光影)",
            description: "调整MPP_MapLight插件的暗度，直接提亮暗部",
            checkAvailability: function() {
                return typeof $gameMap !== 'undefined' && typeof $gameMap.setDarkness === 'function';
            },
            create: function() {
                let savedDarkness = null;
                return {
                    id: this.id,
                    name: this.name,
                    apply: function(levelIndex) {
                        if (!$gameMap) return;
                        const level = brightnessLevels[levelIndex];
                        if (levelIndex === 0) {
                            if (savedDarkness !== null) $gameMap.setDarkness(savedDarkness);
                            return;
                        }
                        if (savedDarkness === null) {
                            savedDarkness = $gameMap._darkness !== undefined ? $gameMap._darkness : 0;
                        }
                        const newDarkness = Math.round(savedDarkness * level.darknessFactor);
                        $gameMap.setDarkness(newDarkness);
                    },
                    reset: function() {
                        if (savedDarkness !== null) $gameMap.setDarkness(savedDarkness);
                    },
                    destroy: function() { this.reset(); }
                };
            }
        },
        // 4. 组合提亮（画面色调 + 暗部提亮）
        {
            id: "combo-tone-darkness",
            name: "组合提亮(色调+光影)",
            description: "同时应用画面色调与暗部提亮，全面增强",
            checkAvailability: function() {
                return typeof $gameScreen !== 'undefined' && $gameScreen.startTint &&
                       typeof $gameMap !== 'undefined' && typeof $gameMap.setDarkness === 'function';
            },
            create: function() {
                let savedTone = null;
                let savedDarkness = null;
                return {
                    id: this.id,
                    name: this.name,
                    apply: function(levelIndex) {
                        if (!$gameScreen || !$gameMap) return;
                        const level = brightnessLevels[levelIndex];
                        if (levelIndex === 0) {
                            if (savedTone) $gameScreen.startTint(savedTone, 0);
                            if (savedDarkness !== null) $gameMap.setDarkness(savedDarkness);
                            return;
                        }
                        // 保存原始值
                        if (!savedTone) {
                            savedTone = $gameScreen._tone ? $gameScreen._tone.slice() : [0,0,0,0];
                        }
                        if (savedDarkness === null) {
                            savedDarkness = $gameMap._darkness !== undefined ? $gameMap._darkness : 0;
                        }
                        // 应用色调
                        const newTone = savedTone.map(v => Math.round(v * level.toneFactor));
                        $gameScreen.startTint(newTone, 0);
                        // 应用暗度
                        const newDarkness = Math.round(savedDarkness * level.darknessFactor);
                        $gameMap.setDarkness(newDarkness);
                    },
                    reset: function() {
                        if (savedTone) $gameScreen.startTint(savedTone, 0);
                        if (savedDarkness !== null) $gameMap.setDarkness(savedDarkness);
                    },
                    destroy: function() { this.reset(); }
                };
            }
        }
    ];

    // 当前使用方法实例及索引
    let currentMethod = null;
    let currentMethodDefIndex = 0;

    // 地图亮度绑定
    let mapBrightnessBindings = {};

    // ------------------------------------------------------------
    // 视觉指示器
    // ------------------------------------------------------------
    function createVisualIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'brightness-level-indicator';
        indicator.style.cssText = `
            position: fixed; top: 10px; right: 10px;
            background: rgba(0,0,0,0.8); color: white;
            padding: 5px 10px; border-radius: 5px;
            font-family: Arial; font-size: 12px;
            z-index: 9999; display: none;
            border: 2px solid; transition: opacity 0.3s ease;
        `;
        document.body.appendChild(indicator);
        window.currentBrightnessIndicator = indicator;

        if (config.showShortcutHint) {
            const hint = document.createElement('div');
            hint.id = 'brightness-shortcut-hint';
            hint.style.cssText = `
                position: fixed; top: 100px; right: 10px;
                background: rgba(0,0,0,0.7); color: #AAA;
                padding: 3px 8px; border-radius: 3px;
                font-family: Arial; font-size: 10px;
                z-index: 9998; display: block; opacity: 1;
                transition: opacity 0.5s ease;
            `;
            hint.textContent = 'L:切换等级 Z+L:恢复不修改 Shift+L:切换修改方式';
            document.body.appendChild(hint);
            setTimeout(() => {
                if (hint) {
                    hint.style.opacity = '0';
                    setTimeout(() => { if (hint.style.opacity === '0') hint.style.display = 'none'; }, 500);
                }
            }, 3000);
        }
    }

    // 存储/加载
    function saveMapBrightnessSettings() {
        try {
            localStorage.setItem('mvMapBrightnessSettings', JSON.stringify(mapBrightnessBindings));
            if (config.debug) console.log('地图绑定已保存:', mapBrightnessBindings);
        } catch (e) {}
    }

    function loadMapBrightnessSettings() {
        try {
            const saved = localStorage.getItem('mvMapBrightnessSettings');
            if (saved) {
                mapBrightnessBindings = JSON.parse(saved);
                if (config.debug) console.log('地图绑定已加载:', mapBrightnessBindings);
            }
        } catch (e) {}
    }

    function saveCurrentMapBrightness() {
        if (!config.mapBindingEnabled || !$gameMap) return;
        const mapId = $gameMap.mapId();
        if (mapId) {
            mapBrightnessBindings[mapId] = currentLevelIndex;
            saveMapBrightnessSettings();
        }
    }

    function loadCurrentMapBrightness() {
        if (!config.mapBindingEnabled || !$gameMap) return 0;
        const mapId = $gameMap.mapId();
        if (mapId && mapBrightnessBindings[mapId] !== undefined) {
            const savedLevel = mapBrightnessBindings[mapId];
            if (savedLevel >= 0 && savedLevel < brightnessLevels.length) {
                return savedLevel;
            }
        }
        return 0;
    }

    // 显示通知
    function showNotification(text, color) {
        const level = brightnessLevels[currentLevelIndex];
        const methodName = currentMethod ? currentMethod.name : '';
        const displayText = text || `亮度: ${level.name} (${methodName})`;
        const displayColor = color || level.color;

        const indicator = window.currentBrightnessIndicator;
        if (indicator) {
            indicator.textContent = displayText;
            indicator.style.color = displayColor;
            indicator.style.borderColor = displayColor;
            indicator.style.opacity = '1';
            indicator.style.display = 'block';
            if (!config.firstNotificationMoved) {
                indicator.style.top = '70px';
                config.firstNotificationMoved = true;
            } else {
                indicator.style.top = '10px';
            }
            clearTimeout(indicator._hideTimeout);
            indicator._hideTimeout = setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator && indicator.style.opacity === '0') indicator.style.display = 'none';
                }, 300);
            }, config.indicatorDisplayTime);
        }
        if (config.debug) console.log(displayText);
    }

    // 方法切换（跳过不可用）
    function switchToMethod(targetIndex) {
        const def = brightnessMethodDefs[targetIndex];
        if (!def.checkAvailability()) {
            showNotification(`方法 ${def.name} 不可用，已跳过`, "#FF4444");
            if (config.debug) console.log(`方法 ${def.name} 不可用，跳过`);
            for (let i = 1; i < brightnessMethodDefs.length; i++) {
                const nextIdx = (targetIndex + i) % brightnessMethodDefs.length;
                const nextDef = brightnessMethodDefs[nextIdx];
                if (nextDef.checkAvailability()) {
                    doSwitchToMethod(nextIdx);
                    return;
                }
            }
            return;
        }
        doSwitchToMethod(targetIndex);
    }

    function doSwitchToMethod(defIndex) {
        if (currentMethod && currentMethod.destroy) {
            currentMethod.destroy();
        }
        const def = brightnessMethodDefs[defIndex];
        currentMethod = def.create();
        currentMethodDefIndex = defIndex;
        applyCurrentBrightnessLevel();
        showNotification();
    }

    function switchToNextMethod() {
        const startIndex = currentMethodDefIndex;
        for (let i = 1; i <= brightnessMethodDefs.length; i++) {
            const nextIdx = (startIndex + i) % brightnessMethodDefs.length;
            const def = brightnessMethodDefs[nextIdx];
            if (def.checkAvailability()) {
                for (let j = 1; j < i; j++) {
                    const skippedIdx = (startIndex + j) % brightnessMethodDefs.length;
                    const skippedDef = brightnessMethodDefs[skippedIdx];
                    if (!skippedDef.checkAvailability()) {
                        showNotification(`方法 ${skippedDef.name} 不可用，已跳过`, "#FF4444");
                    }
                }
                doSwitchToMethod(nextIdx);
                return;
            }
        }
        showNotification("无可用亮度修改方法", "#FF0000");
    }

    // 应用当前等级
    function applyCurrentBrightnessLevel() {
        if (!currentMethod || !currentMethod.apply) return;
        currentMethod.apply(currentLevelIndex);
        saveCurrentMapBrightness();
    }

    function switchBrightnessLevel() {
        currentLevelIndex = (currentLevelIndex + 1) % brightnessLevels.length;
        applyCurrentBrightnessLevel();
        showNotification();
    }

    function reapplyCurrentBrightnessLevel() {
        applyCurrentBrightnessLevel();
        showNotification(`已重新应用: ${brightnessLevels[currentLevelIndex].name}`);
    }

    function resetToDefaultBrightness() {
        const prev = currentLevelIndex;
        currentLevelIndex = 0;
        if (currentMethod && currentMethod.reset) currentMethod.reset();
        applyCurrentBrightnessLevel();
        showNotification("已恢复: 不修改亮度", "#FFFFFF");
        if (config.debug) console.log(`从等级${prev}恢复为不修改`);
    }

    // 劫持输入（按键通过 KeyMapper 动态读取）
    function hijackInputSystem() {
        let shiftPressed = false;
        let resetKeyPressed = false;
        let levelKeyPressed = false;

        function isLevelKey(e) {
            return matchKey(e, getKey('level_key'));
        }
        function isResetKey(e) {
            return matchKey(e, getKey('reset_key'));
        }

        document.addEventListener('keydown', function(event) {
            if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shiftPressed = true;

            if (isResetKey(event)) {
                resetKeyPressed = true;
                return;
            }

            if (isLevelKey(event)) {
                levelKeyPressed = true;
                if (resetKeyPressed) {
                    resetToDefaultBrightness();
                    event.preventDefault();
                } else if (shiftPressed) {
                    switchToNextMethod();
                    event.preventDefault();
                } else if (!event.ctrlKey && !event.altKey) {
                    switchBrightnessLevel();
                    event.preventDefault();
                }
            }
        });

        document.addEventListener('keyup', function(event) {
            if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shiftPressed = false;
            if (isResetKey(event)) resetKeyPressed = false;
            if (isLevelKey(event)) levelKeyPressed = false;
        });

        window.addEventListener('blur', function() {
            shiftPressed = false;
            resetKeyPressed = false;
            levelKeyPressed = false;
        });
    }

    // 渲染劫持（CSS滤镜每帧应用）
    function hijackGameRendering() {
        if (window.Graphics && Graphics._render) {
            const originalRender = Graphics._render;
            Graphics._render = function() {
                originalRender.call(this);
                if (config.autoApplyInScenes && currentMethod && currentMethod.id === "css-filter") {
                    const canvas = Graphics._canvas;
                    if (canvas) {
                        const level = brightnessLevels[currentLevelIndex];
                        canvas.style.filter = `brightness(${level.css.brightness}) contrast(${level.css.contrast}) saturate(${level.css.saturate})`;
                        canvas.style.webkitFilter = canvas.style.filter;
                    }
                }
            };
        }

        if (window.SceneManager && SceneManager._scene) {
            const originalUpdate = SceneManager.update;
            let lastScene = null;
            SceneManager.update = function() {
                originalUpdate.call(this);
                if (this._scene !== lastScene) {
                    lastScene = this._scene;
                    setTimeout(() => {
                        if (config.autoApplyInScenes) {
                            if (this._scene.constructor.name === 'Scene_Map' && $gameMap) {
                                const mapLevel = loadCurrentMapBrightness();
                                if (mapLevel !== currentLevelIndex) {
                                    currentLevelIndex = mapLevel;
                                    if (config.debug) console.log(`场景切换：地图 ${$gameMap.mapId()} 等级 ${currentLevelIndex}`);
                                }
                            }
                            applyCurrentBrightnessLevel();
                        }
                    }, 100);
                }
            };
        }
    }

    // 初始化
    async function initialize() {
        console.log("亮度调整脚本初始化中...");
        let attempts = 0;
        const checkGameObjects = setInterval(() => {
            attempts++;
            if (document.body && window.Graphics) {
                clearInterval(checkGameObjects);

                loadMapBrightnessSettings();

                let firstAvailable = -1;
                for (let i = 0; i < brightnessMethodDefs.length; i++) {
                    if (brightnessMethodDefs[i].checkAvailability()) {
                        firstAvailable = i;
                        break;
                    }
                }
                if (firstAvailable === -1) firstAvailable = 0;
                doSwitchToMethod(firstAvailable);

                createVisualIndicator();
                hijackGameRendering();
                hijackInputSystem();

                console.log("脚本初始化完成");
                console.log("快捷键: L切换等级 | Z+L恢复不修改 | Shift+L切换方式");
                console.log(`当前方式: ${currentMethod ? currentMethod.name : '无'} | 亮度: ${brightnessLevels[currentLevelIndex].name}`);

                setTimeout(() => {
                    if (SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_Map' && $gameMap) {
                        const mapLevel = loadCurrentMapBrightness();
                        currentLevelIndex = mapLevel;
                    }
                    applyCurrentBrightnessLevel();
                    showNotification();
                }, 1500);
            } else if (attempts >= 100) {
                clearInterval(checkGameObjects);
                console.error("初始化失败: 游戏对象未找到");
            }
        }, 100);
    }

    // 控制台接口
    window.BrightnessControl = {
        switchLevel: switchBrightnessLevel,
        reapplyLevel: reapplyCurrentBrightnessLevel,
        resetToDefault: resetToDefaultBrightness,
        setLevel: function(index) {
            if (index >= 0 && index < brightnessLevels.length) {
                currentLevelIndex = index;
                applyCurrentBrightnessLevel();
                showNotification();
            }
        },
        getCurrentLevel: function() {
            return {
                index: currentLevelIndex,
                ...brightnessLevels[currentLevelIndex],
                method: currentMethod ? currentMethod.name : '无'
            };
        },
        getAllLevels: function() { return brightnessLevels.map((l, i) => ({ index: i, ...l })); },
        switchMethod: switchToNextMethod,
        setMethod: function(index) { if (index >= 0 && index < brightnessMethodDefs.length) switchToMethod(index); },
        getCurrentMethod: function() {
            return currentMethod ? {
                index: currentMethodDefIndex,
                name: currentMethod.name,
                id: currentMethod.id
            } : null;
        },
        getAvailableMethods: function() {
            return brightnessMethodDefs.map((def, i) => ({
                index: i,
                name: def.name,
                id: def.id,
                available: def.checkAvailability()
            }));
        },
        mapBindings: {
            getCurrentMapBinding: function() {
                if (!$gameMap) return null;
                const mapId = $gameMap.mapId();
                return {
                    mapId: mapId,
                    level: mapBrightnessBindings[mapId] !== undefined ? mapBrightnessBindings[mapId] : '无绑定',
                    levelName: mapBrightnessBindings[mapId] !== undefined ? brightnessLevels[mapBrightnessBindings[mapId]].name : '无绑定'
                };
            },
            getAllBindings: function() {
                return Object.keys(mapBrightnessBindings).map(mapId => ({
                    mapId: mapId,
                    level: mapBrightnessBindings[mapId],
                    levelName: brightnessLevels[mapBrightnessBindings[mapId]].name
                }));
            },
            clearCurrentMapBinding: function() {
                if (!$gameMap) return false;
                const mapId = $gameMap.mapId();
                if (mapBrightnessBindings[mapId] !== undefined) {
                    delete mapBrightnessBindings[mapId];
                    saveMapBrightnessSettings();
                    console.log(`地图 ${mapId} 绑定已清除`);
                    return true;
                }
                return false;
            },
            clearAllBindings: function() {
                mapBrightnessBindings = {};
                saveMapBrightnessSettings();
                console.log("所有地图绑定已清除");
            },
            setMapBinding: function(mapId, level) {
                if (level >= 0 && level < brightnessLevels.length) {
                    mapBrightnessBindings[mapId] = level;
                    saveMapBrightnessSettings();
                    console.log(`地图 ${mapId} 绑定等级: ${level}`);
                    return true;
                }
                return false;
            }
        },
        showNotification: showNotification,
        setDebug: function(enable) { config.debug = enable; }
    };

    initialize();
})();