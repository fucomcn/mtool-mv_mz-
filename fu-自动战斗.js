//@AutoLoad @Evalv8
(async function() {
    if (window.__battleHijackInstalled) return;
    window.__battleHijackInstalled = true;

    // ========== 自定义按键支持 ==========
    var SCRIPT_NAME = '战斗模式切换';
    var DEFAULT_KEYS = {
        switch_mode: 'F8',   // 单独按：切换战斗模式；按住下方"显示键"再按：显示当前模式
        show_mode:   'KeyZ'  // 按住此键 + 切换键 = 仅显示当前模式（不切换）
    };
    var ACTION_NAMES = {
        switch_mode: '切换战斗模式（配合"显示键"可只显示）',
        show_mode:   '显示模式键（按住此键+切换键=仅显示）'
    };

    function getKey(action) {
        if (window.KeyMapper && typeof window.KeyMapper.getKey === 'function') {
            var k = window.KeyMapper.getKey(SCRIPT_NAME, action);
            if (k) return k;
        }
        return DEFAULT_KEYS[action];
    }

    function matchKey(e, keyStr) {
        if (!keyStr) return false;
        var parts = String(keyStr).split('+');
        return e.code === parts[parts.length - 1];
    }

    // —— 注册到 KeyMapper（Pub/Sub + 暂存表） ——
    var KB_PAYLOAD = { name: SCRIPT_NAME, keys: DEFAULT_KEYS, names: ACTION_NAMES };
    function commitRegisterKB() {
        if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
            window.KeyMapper.registerScript(KB_PAYLOAD.name, KB_PAYLOAD.keys, KB_PAYLOAD.names);
            return true;
        }
        return false;
    }

    if (commitRegisterKB()) {
        console.log('[战斗模式] 已注册到自定义按键系统');
    } else {
        window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
        if (!window.__keyMapperPendingScripts.some(function(r) { return r.name === SCRIPT_NAME; })) {
            window.__keyMapperPendingScripts.push(KB_PAYLOAD);
            console.log('[战斗模式] KeyMapper 未就绪，已写入暂存表');
        }
        if (!window.__battleModeKbReady) {
            window.__battleModeKbReady = function() {
                if (commitRegisterKB()) console.log('[战斗模式] 收到 keymapper:ready，已完成注册');
                if (window.__keyMapperPendingScripts) {
                    window.__keyMapperPendingScripts = window.__keyMapperPendingScripts.filter(function(r) { return r.name !== SCRIPT_NAME; });
                }
                window.removeEventListener('keymapper:ready', window.__battleModeKbReady);
                delete window.__battleModeKbReady;
            };
            window.addEventListener('keymapper:ready', window.__battleModeKbReady);
        }
    }

    var MODE = { NORMAL: 0, AUTO_WIN: 1, FORCE_WIN: 2, FORCE_ESCAPE: 3, DIRECT_WIN: 4 };
    var cur = MODE.NORMAL, zDown = false, battleFrames = 0, inBattle = false, BM = null;
    var autoWinBusy = false, fwTimer, feTimer, awTimer;
    var origDispVM, origUpdate, hijacked = false;
    var names = ["正常战斗","自动胜利","强制胜利","强制逃走","直接胜利"];
    var colors = ["#FFF","#0F0","#0CF","#F90","#F44"];

    var origPush = null;

    function cleanup() {
        if (fwTimer) { clearTimeout(fwTimer); fwTimer = null; }
        if (feTimer) { clearTimeout(feTimer); feTimer = null; }
        if (awTimer) { clearTimeout(awTimer); awTimer = null; }
        autoWinBusy = false;
        if (origDispVM && BM) { BM.displayVictoryMessage = origDispVM; origDispVM = null; }
    }

    function notify() {
        var el = window.currentModeIndicator;
        if (!el) return;
        el.textContent = "模式: " + names[cur];
        el.style.color = colors[cur];
        el.style.borderColor = colors[cur];
        el.style.display = 'block';
        clearTimeout(el._hide);
        el._hide = setTimeout(function() { el.style.display = 'none'; }, 2000);
    }

    function enableHijack() {
        if (hijacked || !BM) return;
        if (!origUpdate) origUpdate = BM.update;
        BM.update = hijackedUpdate;
        hijacked = true;
    }
    function disableHijack() {
        if (!hijacked || !BM) return;
        BM.update = origUpdate;
        hijacked = false;
        cleanup();
    }

    function hijackedUpdate() {
        origUpdate.call(this);
        var isBattle = SceneManager._scene && SceneManager._scene.constructor && SceneManager._scene.constructor.name === 'Scene_Battle';
        if (isBattle) {
            if (!inBattle) { cleanup(); inBattle = true; battleFrames = 0; }
            battleFrames++;
            if (battleFrames >= 5 && cur !== MODE.NORMAL) {
                if (!this.isBattleEnd()) {
                    switch (cur) {
                        case MODE.AUTO_WIN:
                            if ((this._phase === 'turn' || this._phase === 'input') && this._phase !== 'victory' && !autoWinBusy) autoWin();
                            break;
                        case MODE.FORCE_WIN:
                            if ((this._phase === 'turn' || this._phase === 'input') && this._phase !== 'victory') forceWin();
                            break;
                        case MODE.FORCE_ESCAPE:
                            if ((this._phase === 'turn' || this._phase === 'input') && this._phase !== 'escape') forceEscape();
                            break;
                    }
                }
            }
        } else {
            if (inBattle) { cleanup(); inBattle = false; battleFrames = 0; }
        }
    }

    function forceWin() {
        if (!$gameTroop || !BM) return;
        $gameTroop.members().forEach(function(e) { if (e && e.isAlive()) { e._hp = 0; if (e.die) e.die(); if (e.performCollapse) e.performCollapse(); e.refresh(); } });
        if ($gameTroop.update) $gameTroop.update();
        if ($gameTroop.members().every(function(e) { return !e.isAlive(); }) && BM._phase !== 'victory') {
            if (fwTimer) clearTimeout(fwTimer);
            fwTimer = setTimeout(function() {
                fwTimer = null;
                if (BM && BM._phase !== 'victory') {
                    BM._phase = 'victory';
                    if (BM.processVictory) BM.processVictory();
                }
            }, 50);
        }
    }
    function forceEscape() {
        if (!BM) return;
        BM._success = true;
        if (BM.processEscape) BM.processEscape();
        BM._phase = 'escape';
        if (feTimer) clearTimeout(feTimer);
        feTimer = setTimeout(function() { feTimer = null; if (BM && BM.endBattle) BM.endBattle(1); }, 100);
    }
    function autoWin() {
        if (!BM || autoWinBusy) return;
        autoWinBusy = true;
        if (!origDispVM) origDispVM = BM.displayVictoryMessage;
        var shown = false;
        BM.displayVictoryMessage = function() { if (!shown) { origDispVM.call(this); shown = true; } };
        BM._phase = 'victory';
        if (BM.processVictory) BM.processVictory();
        if (awTimer) clearTimeout(awTimer);
        awTimer = setTimeout(function() {
            awTimer = null;
            if (origDispVM && BM) BM.displayVictoryMessage = origDispVM;
            autoWinBusy = false;
        }, 100);
    }

    // 直接胜利：跳过场景，触发胜利回调
    function directWin() {
        var cb = BattleManager._eventCallback;
        BattleManager._phase = '';
        BattleManager._eventCallback = null;
        $gameParty.removeBattleStates();
        $gameParty.onBattleEnd();
        if ($gameTroop) $gameTroop.onBattleEnd();
        if (cb) cb(0);
    }

    // 安装拦截
    function installPushGuard() {
        origPush = SceneManager.push;
        SceneManager.push = function(sceneClass) {
            if (cur === MODE.DIRECT_WIN && sceneClass === Scene_Battle) {
                directWin();
                return;
            }
            origPush.call(SceneManager, sceneClass);
        };
    }
    function removePushGuard() {
        if (origPush) { SceneManager.push = origPush; origPush = null; }
    }

    function toggle() {
        var prev = cur;
        cur = (cur + 1) % 5;
        if (cur === MODE.NORMAL || cur === MODE.DIRECT_WIN) {
            disableHijack();
            if (cur === MODE.DIRECT_WIN) installPushGuard();
            else removePushGuard();
        } else {
            if (!hijacked) enableHijack();
            removePushGuard();
        }
        notify();
    }

    function show() { notify(); }

    // ★ 按键处理：动态读取 KeyMapper 键位
    function onKey(ev) {
        if (matchKey(ev, getKey('switch_mode'))) {
            if (zDown) show(); else toggle();
            ev.preventDefault();
        }
    }

    function initInput() {
        document.addEventListener('keydown', function(ev) {
            if (matchKey(ev, getKey('show_mode'))) zDown = true;
            onKey(ev);
        });
        document.addEventListener('keyup', function(ev) {
            if (matchKey(ev, getKey('show_mode'))) zDown = false;
        });
        window.addEventListener('blur', function() { zDown = false; });
    }

    function addUI() {
        var el = document.createElement('div');
        el.id = 'battle-mode-indicator';
        el.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:5px 10px;border-radius:5px;font:12px Arial;z-index:9999;display:none;border:2px solid;';
        document.body.appendChild(el);
        window.currentModeIndicator = el;

        var _dk = function(k) { return String(k).replace('Key','').replace('Digit','').replace(/\+/g,'+'); };
        var hint = document.createElement('div');
        hint.textContent = _dk(getKey('switch_mode')) + ':切换模式  ' +
                           _dk(getKey('show_mode')) + '+' + _dk(getKey('switch_mode')) + ':显示模式';
        hint.style.cssText = 'position:fixed;top:40px;right:10px;background:rgba(0,0,0,0.7);color:#AAA;padding:3px 8px;border-radius:3px;font:10px Arial;z-index:9998;opacity:1;transition:opacity 0.5s;';
        document.body.appendChild(hint);
        setTimeout(function() { hint.style.opacity = '0'; setTimeout(function() { hint.remove(); }, 500); }, 3000);
    }

    async function init() {
        var tries = 0;
        var id = setInterval(function() {
            tries++;
            if (window.BattleManager && window.SceneManager) {
                clearInterval(id);
                BM = window.BattleManager;
                origUpdate = BM.update;
                initInput();
                addUI();
                console.log("初始化完成");
                show();
            } else if (tries >= 50) {
                clearInterval(id);
                console.error("初始化失败");
            }
        }, 200);
    }
    init();
})();