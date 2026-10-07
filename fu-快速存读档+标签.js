//@AutoLoad @Evalv8
// 快速存读档 最终安全版 | 存档原子性+完成后提示+防误操作
// 内置标签持久化 + 星级管理 + Backspace返回标题 + 循环提示堆叠
// 修复：快速存档后正常存档页面光标定位 & 截图重复
// 新增：Shift+= / Shift+- 调整当前槽位标签星级
// 新增：Shift+Backspace 显示当前槽位信息
// 新增：自定义按键支持（需配合 KeyMapper 脚本）
// 可配置参数见顶部 CONFIG

(function() {
    'use strict';

    // ================== 可配置参数 ==================
    var CONFIG = {
        maxSlots: 1000,            // 最大存档槽位数
        color: '#4a9eff',          // 提示/界面主色调
        timeout: 3000,             // 二次确认超时 (ms)
        key: 'QuickSaveSystem_slot', // localStorage 键名（后备）
        slotFileName: 'quickslot.json', // 槽位本地文件名
        debug: true,               // 是否输出调试日志
        notifyMaxStack: 10,        // 提示窗最大堆叠数量
        windowMinW: 300,           // 标签管理器最小宽度
        windowMinH: 250,           // 标签管理器最小高度
        windowMaxW: 1000,          // 标签管理器最大宽度
        windowMaxH: 800,           // 标签管理器最大高度
        windowDefW: 700,           // 标签管理器默认宽度
        windowDefH: 550            // 标签管理器默认高度
    };

    var DBG = CONFIG.debug;

    // ============ 自定义按键支持 ============
    var SCRIPT_NAME = '快速存读档系统';
    var DEFAULT_KEYS = {
        'slot_next': 'Equal',           // 下一个槽位 ( = )
        'slot_prev': 'Minus',           // 上一个槽位 ( - )
        'slot_info': 'Digit0',          // 显示槽位信息 ( 0 )
        'quick_save': 'BracketLeft',    // 快速存档 ( [ )
        'quick_load': 'BracketRight',   // 快速读档 ( ] )
        'tag_manage': 'Backslash',      // 标签管理 ( \ )
        'return_title': 'Backspace',    // 返回标题
        'star_up': 'Equal',             // 星级+ (Shift+=)
        'star_down': 'Minus'            // 星级- (Shift+-)
    };

    function getKey(action) {
        if (window.KeyMapper && typeof window.KeyMapper.getKey === 'function') {
            return window.KeyMapper.getKey(SCRIPT_NAME, action) || DEFAULT_KEYS[action];
        }
        return DEFAULT_KEYS[action];
    }

    // ================================================

    if (typeof window.$lastScreenshot === 'undefined') window.$lastScreenshot = null;

    var C = CONFIG;
    var qs = 1,
        ps = false, pl = false, pt = null,
        pta = false, pti = null, ptn = '',
        ism = false, smi = [], smsi = 0, smd = null, smm = null,
        smw = C.windowDefW, smh = C.windowDefH, bgi = false,
        isL = false, isS = false,
        pb = false, ptb = null;

    // ========== 内置标签系统 ==========
    var _internalTagData = null;
    var _fs = null, _path = null;
    var _tagFileName = 'tags.json';

    try { _fs = require('fs'); _path = require('path'); } catch(e) {}

    function _loadInternalTags() {
        if (_internalTagData) return;
        _internalTagData = { tags: [] };
        if (_fs && _path) {
            try {
                var filePath = _path.join(process.cwd(), _tagFileName);
                if (_fs.existsSync(filePath)) {
                    _internalTagData = JSON.parse(_fs.readFileSync(filePath, 'utf8'));
                }
            } catch(e) {}
        } else {
            try { var s = localStorage.getItem('QuickSave_Tags'); if (s) _internalTagData = JSON.parse(s); } catch(e) {}
        }
    }

    function _saveInternalTags() {
        if (!_internalTagData) return;
        if (_fs && _path) {
            try { _fs.writeFileSync(_path.join(process.cwd(), _tagFileName), JSON.stringify(_internalTagData, null, 2), 'utf8'); } catch(e) {}
        } else {
            try { localStorage.setItem('QuickSave_Tags', JSON.stringify(_internalTagData)); } catch(e) {}
        }
    }

    function gtd() {
        if (window.TagSystem && typeof window.TagSystem.getData === 'function') return window.TagSystem.getData();
        if (!_internalTagData) _loadInternalTags();
        return _internalTagData;
    }

    function std() {
        if (window.TagSystem && typeof window.TagSystem.saveData === 'function') window.TagSystem.saveData();
        else _saveInternalTags();
    }

    // ==================================

    function lsws() {
        try {
            var s = localStorage.getItem('STWS');
            if (s) {
                var p = JSON.parse(s);
                smw = Math.min(Math.max(p.w, C.windowMinW), C.windowMaxW);
                smh = Math.min(Math.max(p.h, C.windowMinH), C.windowMaxH);
            }
        } catch(e) {}
    }

    function ssws() { try { localStorage.setItem('STWS', JSON.stringify({w: smw, h: smh})); } catch(e) {} }
    lsws();

    function lqs() {
        try {
            if (_fs && _path) {
                var filePath = _path.join(process.cwd(), C.slotFileName);
                if (_fs.existsSync(filePath)) {
                    var n = parseInt(_fs.readFileSync(filePath, 'utf8'), 10);
                    if (!isNaN(n) && n >= 1 && n <= C.maxSlots) {
                        qs = n;
                        return;
                    }
                }
            }
            var s = localStorage.getItem(C.key);
            if (s) {
                var n2 = parseInt(s, 10);
                if (!isNaN(n2) && n2 >= 1 && n2 <= C.maxSlots) qs = n2;
            }
        } catch(e) {}
    }

    function sqs() {
        try {
            if (_fs && _path) {
                _fs.writeFileSync(_path.join(process.cwd(), C.slotFileName), qs.toString(), 'utf8');
            } else {
                localStorage.setItem(C.key, qs.toString());
            }
        } catch(e) {}
    }
    lqs();

    function gtfs(s) {
        var d = gtd();
        for (var i = 0; i < d.tags.length; i++) {
            if (d.tags[i].savefileId === s) return d.tags[i];
        }
        return null;
    }

    function egi() {
        if (window.DataManager && !DataManager._globalInfo) {
            try { DataManager.loadGlobalInfo(); } catch(e) {}
        }
    }

    function isse(s) {
        egi();
        if (DataManager._globalInfo) return DataManager._globalInfo[s] == null;
        if (window.StorageManager && typeof StorageManager.exists === 'function') {
            try { return !StorageManager.exists(s); } catch(e) {}
        }
        return false;
    }

    // ========== 循环堆叠提示窗（最新在顶部，向下推，最多10条） ==========
    var _notifyItems = [];

    function _removeNotifyItem(index) {
        var el = _notifyItems[index];
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        _notifyItems.splice(index, 1);
        for (var i = index; i < _notifyItems.length; i++) {
            var item = _notifyItems[i];
            var currentTop = parseInt(item.style.top, 10) || 0;
            item.style.top = (currentTop - 35) + 'px';
        }
    }

    function n(m, c) {
        if (!c) c = C.color;

        if (_notifyItems.length >= C.notifyMaxStack) {
            _removeNotifyItem(_notifyItems.length - 1);
        }

        for (var i = 0; i < _notifyItems.length; i++) {
            var item = _notifyItems[i];
            var currentTop = parseInt(item.style.top, 10) || 10;
            item.style.top = (currentTop + 35) + 'px';
        }

        var d = document.createElement('div');
        d.className = 'qs-n';
        d.textContent = m;
        d.style.cssText = 'position:fixed;right:10px;background:rgba(0,0,0,0.85);color:'+c+';padding:6px 12px;border-radius:6px;font:13px Arial bold;z-index:10002;border:2px solid '+c+';opacity:1;transition:opacity 0.3s;top:10px;';
        document.body.appendChild(d);

        _notifyItems.unshift(d);

        (function(el) {
            setTimeout(function() {
                el.style.opacity = '0';
                setTimeout(function() {
                    var idx = _notifyItems.indexOf(el);
                    if (idx !== -1) {
                        _removeNotifyItem(idx);
                    }
                }, 300);
            }, 2000);
        })(d);
    }

    // ====================================

    function gsst(s) { return isse(s) ? '空' : '有存档'; }

    function gsit(s) {
        var t = gtfs(s);
        return '槽位 '+s+' ['+gsst(s)+']' + (t ? ' 标签: '+t.name : '');
    }

    function cqs(d) {
        qs += d;
        if (qs < 1) qs = C.maxSlots;
        if (qs > C.maxSlots) qs = 1;
        var m = '快速存档位: '+qs+' ('+gsst(qs)+')';
        var t = gtfs(qs);
        if (t) m += ' [标签: '+t.name+']';
        n(m);
        sqs();
    }

    function scsi() {
        n(gsit(qs));
    }

    function fra() {
        if (!AudioManager) return;
        if (AudioManager.stopAll) AudioManager.stopAll();
        else {
            if (AudioManager.stopBgm) AudioManager.stopBgm();
            if (AudioManager.stopBgs) AudioManager.stopBgs();
            if (AudioManager.stopMe) AudioManager.stopMe();
            if (AudioManager.stopSe) AudioManager.stopSe();
        }
        AudioManager._bgmBuffer = AudioManager._bgsBuffer = AudioManager._meBuffer = null;
        AudioManager._seBuffers = [];
    }

    // ========== 劫持 loadGame ==========
    var _origLoadGame = null;

    function setupLoadGamePatch() {
        if (_origLoadGame) return;
        _origLoadGame = DataManager.loadGame;
        DataManager.loadGame = function(savefileId) {
            try {
                var result = _origLoadGame.call(this, savefileId);
                if (result && typeof result.then === 'function') {
                    return result.then(function() {
                        return true;
                    }).catch(function(e) {
                        console.error('读档失败:', e);
                        return false;
                    });
                } else {
                    return result ? true : false;
                }
            } catch(e) {
                console.error('读档异常:', e);
                if (SoundManager && SoundManager.playBuzzer) SoundManager.playBuzzer();
                return typeof Promise !== 'undefined' ? Promise.resolve(false) : false;
            }
        };
        if (DBG) console.log('[QS] DataManager.loadGame 已劫持');
    }

    // ========== 劫持 Scene_Save 光标定位 ==========
    function setupSaveScenePatch() {
        if (!window.Scene_Save) return;
        var _Scene_Save_create = Scene_Save.prototype.create;
        Scene_Save.prototype.create = function() {
            _Scene_Save_create.call(this);
            requestAnimationFrame(() => {
                if (this._listWindow) {
                    var index = qs - 1;
                    if (index >= 0 && index < C.maxSlots) {
                        this._listWindow.select(index);
                    }
                }
            });
        };
        if (DBG) console.log('[QS] Scene_Save 光标已劫持');
    }

    // 快速存档
    function qsav() {
        if (isS || isL) { n('正在操作中...', '#FFA500'); return; }
        if (!DataManager || !DataManager.saveGame) { n('存档不可用', '#f00'); return; }
        isS = true;
        n('⏳ 正在存档中...', C.color);
        if (DBG) console.log('[QS] 开始存档，槽位', qs);

        if (SceneManager.snapForSave) {
            SceneManager.snapForSave();
        }
        try {
            var result = DataManager.saveGame(qs);
            if (result && typeof result.then === 'function') {
                result.then(function() {
                    if (DBG) console.log('[QS] 存档 Promise resolved');
                    n('✓ 快速存档成功 (槽位'+qs+')', C.color);
                    isS = false;
                }).catch(function(err) {
                    if (DBG) console.error('[QS] 存档异步错误:', err);
                    n('存档失败', '#f00');
                    isS = false;
                });
            } else {
                if (DBG) console.log('[QS] 存档同步结果:', result);
                n(result ? '✓ 快速存档成功 (槽位'+qs+')' : '存档失败', result ? C.color : '#f00');
                isS = false;
            }
        } catch(e) {
            if (DBG) console.error('[QS] 存档异常:', e);
            n('存档失败', '#f00');
            isS = false;
        }
    }

    // 快速读档（只使用方法1：模拟读档成功）
    function qld() {
        if (isS || isL) { n('正在操作中...', '#FFA500'); return; }
        if (!DataManager || !SceneManager || !Scene_Map) { n('读档不可用', '#f00'); return; }
        if (isse(qs)) { n('槽位 '+qs+' 为空', '#ffa500'); return; }

        isL = true;
        n('⏳ 快速读档中... (槽位'+qs+')', C.color);
        if (DBG) console.log('[QS] qld 开始，槽位', qs);

        // 停止音频和清理战斗
        fra();
        if (BattleManager) {
            BattleManager._phase = '';
            BattleManager._actionList = [];
            BattleManager._targets = [];
        }

        // 彻底重置场景管理器
        try {
            if (SceneManager._scene) {
                SceneManager._scene.stop();
            }
            SceneManager._scene = null;
            SceneManager._stack = [];
            if (DBG) console.log('[QS] 场景已完全重置');
        } catch(e) {
            if (DBG) console.error('[QS] 重置场景失败:', e);
        }

        // 切换到标题场景
        SceneManager.goto(Scene_Title);

        // 等待标题场景稳定后加载存档
        setTimeout(function() {
            performLoadFromTitle();
        }, 500);
    }

    function performLoadFromTitle() {
        try {
            var result = DataManager.loadGame(qs);
            if (DBG) console.log('[QS] loadGame 返回:', result);
            if (result && typeof result.then === 'function') {
                result.then(function(success) {
                    if (DBG) console.log('[QS] loadGame Promise resolved:', success);
                    if (success) {
                        simulateSceneLoadSuccess();
                    } else {
                        n('读档失败', '#f00');
                        isL = false;
                    }
                }).catch(function(err) {
                    if (DBG) console.error('[QS] loadGame 异步错误:', err);
                    n('读档失败', '#f00');
                    isL = false;
                });
            } else {
                if (DBG) console.log('[QS] loadGame 同步结果:', result);
                if (result) {
                    simulateSceneLoadSuccess();
                } else {
                    n('读档失败', '#f00');
                    isL = false;
                }
            }
        } catch(e) {
            if (DBG) console.error('[QS] qld 异常:', e);
            n('读档错误: '+e.message, '#f00');
            isL = false;
        }
    }

    // 方法1核心：创建真实的 Scene_Load 实例并调用其 onLoadSuccess
    function simulateSceneLoadSuccess() {
        if (DBG) console.log('[QS] 模拟 Scene_Load.onLoadSuccess');
        try {
            // 创建真实的 Scene_Load 实例，但不加入场景管理器
            var loadScene = new Scene_Load();
            loadScene.create();
            loadScene.start();
            // 隐藏整个场景，防止用户看到
            loadScene.visible = false;
            // 调用 onLoadSuccess（this 是 loadScene，保证插件别名正确执行）
            if (typeof loadScene.onLoadSuccess === 'function') {
                loadScene.onLoadSuccess();
                if (DBG) console.log('[QS] 已调用 Scene_Load 实例的 onLoadSuccess');
            } else {
                fallbackLoadSuccess();
            }
            // onLoadSuccess 内部会调用 SceneManager.goto(Scene_Map)，无需手动处理
        } catch(e) {
            if (DBG) console.error('[QS] 模拟 Scene_Load.onLoadSuccess 失败:', e);
            fallbackLoadSuccess();
        }

        // 延迟触发额外刷新事件
        setTimeout(function() {
            try {
                if ($gameMap && typeof $gameMap.setupEvents === 'function') {
                    $gameMap.setupEvents();
                }
                if ($gameMap && typeof $gameMap.refresh === 'function') {
                    $gameMap.refresh();
                }
                if ($gamePlayer && typeof $gamePlayer.refresh === 'function') {
                    $gamePlayer.refresh();
                }
                window.dispatchEvent(new CustomEvent('quickload'));
                if (window.QuickSaveRefreshCallbacks) {
                    window.QuickSaveRefreshCallbacks.forEach(function(fn) {
                        try { fn(); } catch(e) { console.error('[QS] 刷新回调错误:', e); }
                    });
                }
                if (DBG) console.log('[QS] quickload 事件和刷新回调已触发');
            } catch(e) {
                if (DBG) console.error('[QS] 地图刷新失败:', e);
            }
        }, 100);

        isL = false;
    }

    // 备用读档成功处理（仅当 Scene_Load 不可用时使用）
    function fallbackLoadSuccess() {
        if (DBG) console.log('[QS] 使用备用读档成功处理');
        if (SoundManager && SoundManager.playLoad) SoundManager.playLoad();
        if ($gameSystem && typeof $gameSystem.onAfterLoad === 'function') {
            $gameSystem.onAfterLoad();
        }
        SceneManager.goto(Scene_Map);
        setTimeout(function() {
            try {
                if ($gameSystem && $gameSystem._saveBgm) {
                    AudioManager.playBgm($gameSystem._saveBgm);
                } else if ($gameSystem && $gameSystem._bgm) {
                    AudioManager.playBgm($gameSystem._bgm);
                } else if ($gameMap && $gameMap._bgm) {
                    AudioManager.playBgm($gameMap._bgm);
                } else if ($gameMap && typeof $gameMap.autoplay === 'function') {
                    $gameMap.autoplay();
                } else if ($dataMap && $dataMap.bgm) {
                    AudioManager.playBgm($dataMap.bgm);
                }
            } catch(e) {
                if (DBG) console.error('[QS] 恢复 BGM 错误:', e);
            }
        }, 16);
    }

    function goTitle() {
        fra();
        SceneManager.goto(Scene_Title);
    }

    function resetPb() {
        pb = false;
        if (ptb) { clearTimeout(ptb); ptb = null; }
    }

    // ========== 调整当前槽位标签星级 ==========
    function adjustStar(delta) {
        var d = gtd();
        var tag = null;
        for (var i = 0; i < d.tags.length; i++) {
            if (d.tags[i].savefileId === qs) {
                tag = d.tags[i];
                break;
            }
        }
        if (!tag) {
            n('槽位 ' + qs + ' 暂无标签', '#FFA500');
            return;
        }
        var cur = tag.star || 0;
        var newStar = cur + delta;
        if (newStar < 0) newStar = 0;
        if (newStar > 5) newStar = 5;
        if (newStar === cur) {
            n('星级已达上限', '#FFA500');
            return;
        }
        tag.star = newStar;
        std();
        var starStr = '';
        for (var j = 1; j <= 5; j++) starStr += j <= newStar ? '★' : '☆';
        n('标签 ' + tag.name + ' 星级: ' + starStr, C.color);
    }

    // ========== 标签管理 ==========
    var smSearch = '', smSort = 'id';
    var smFilterStars = [0,1,2,3,4,5];
    var _styleAdded = false;

    function addGlobalStyle() {
        if (_styleAdded) return;
        var style = document.createElement('style');
        style.textContent = `
            .qs-tag-select, .qs-tag-select option {
                background: #1e2a38 !important;
                color: #fff !important;
                border: 1px solid #4a6b8a;
                border-radius: 4px;
            }
            .qs-star-filter {
                display: inline-flex;
                gap: 2px;
                margin-left: 10px;
                user-select: none;
            }
            .qs-star-filter span {
                cursor: pointer;
                font-size: 16px;
                opacity: 0.4;
                transition: 0.2s;
            }
            .qs-star-filter span.active { opacity: 1; color: #FFD700; }
        `;
        document.head.appendChild(style);
        _styleAdded = true;
    }

    function osm() {
        if (ism) return;
        rap();
        addGlobalStyle();

        var d = gtd();
        for (var i = 0; i < d.tags.length; i++) {
            if (d.tags[i].star === undefined) d.tags[i].star = 0;
        }
        smSearch = ''; smSort = 'id'; smFilterStars = [0,1,2,3,4,5];
        rebuildSmi();
        if (smi.length === 0) { n('暂无标签', '#ffa500'); return; }

        ism = true;
        smm = document.createElement('div');
        smm.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;';
        document.body.appendChild(smm);

        smd = document.createElement('div');
        smd.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:'+smw+'px;height:'+smh+'px;background:rgba(20,25,35,0.97);border:3px solid '+C.color+';border-radius:10px;box-shadow:0 0 30px rgba(74,158,255,0.6);z-index:10002;padding:0;color:white;font:14px "Microsoft YaHei";display:flex;flex-direction:column;';

        var header = document.createElement('div');
        header.style.cssText = 'height:45px;background:linear-gradient(135deg,rgba(40,50,70,0.95),rgba(60,80,100,0.95));border-bottom:2px solid '+C.color+';padding:0 15px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = '📌 标签管理';
        smd.appendChild(header);

        var toolbar = document.createElement('div');
        toolbar.style.cssText = 'padding:8px 10px;display:flex;gap:10px;align-items:center;flex-shrink:0;background:rgba(0,0,0,0.2);flex-wrap:wrap;';

        var searchInput = document.createElement('input');
        searchInput.type = 'text'; searchInput.placeholder = '搜索名称或槽位...';
        searchInput.value = smSearch;
        searchInput.style.cssText = 'flex:1;min-width:120px;padding:5px 8px;background:rgba(255,255,255,0.1);border:1px solid #4a6b8a;border-radius:4px;color:#fff;font-size:13px;outline:none;';
        searchInput.addEventListener('input', function() { smSearch = this.value; rebuildSmi(); rsml(); });
        toolbar.appendChild(searchInput);

        var starFilterDiv = document.createElement('div');
        starFilterDiv.className = 'qs-star-filter';
        starFilterDiv.title = '点击切换星级筛选';
        for (var star = 0; star <= 5; star++) {
            var starSpan = document.createElement('span');
            starSpan.textContent = star === 0 ? '☆' : '★';
            starSpan.dataset.star = star;
            starSpan.classList.toggle('active', smFilterStars.includes(star));
            starSpan.onclick = function(e) {
                var sVal = parseInt(this.dataset.star);
                var idx = smFilterStars.indexOf(sVal);
                if (idx > -1) smFilterStars.splice(idx, 1);
                else smFilterStars.push(sVal);
                smFilterStars.sort();
                var spans = starFilterDiv.querySelectorAll('span');
                spans.forEach(function(sp) { sp.classList.toggle('active', smFilterStars.includes(parseInt(sp.dataset.star))); });
                rebuildSmi();
                rsml();
            };
            starFilterDiv.appendChild(starSpan);
        }
        toolbar.appendChild(starFilterDiv);

        var sortSelect = document.createElement('select');
        sortSelect.className = 'qs-tag-select';
        sortSelect.style.cssText = 'padding:5px;font-size:13px;';
        var sortOpts = [['id','槽位'],['name','名称'],['star','星级']];
        for (var i=0;i<sortOpts.length;i++) {
            var opt = document.createElement('option');
            opt.value = sortOpts[i][0]; opt.textContent = sortOpts[i][1];
            if (opt.value === smSort) opt.selected = true;
            sortSelect.appendChild(opt);
        }
        sortSelect.addEventListener('change', function() { smSort = this.value; rebuildSmi(); rsml(); });
        toolbar.appendChild(sortSelect);
        smd.appendChild(toolbar);

        var lc = document.createElement('div');
        lc.style.cssText = 'flex:1;overflow-y:auto;margin:8px;background:rgba(0,0,0,0.3);border-radius:5px;padding:5px;';
        lc.addEventListener('wheel', function(e){ e.stopPropagation(); });
        smd.appendChild(lc);

        var bb = document.createElement('div');
        bb.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 15px;background:rgba(0,0,0,0.3);flex-shrink:0;';
        var zc = document.createElement('div'); zc.style.cssText = 'display:flex;gap:5px;';
        var zo = document.createElement('button'); zo.innerHTML = '🔽 缩小(O)'; zo.style.cssText = 'padding:4px 8px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;'; zo.onclick = function(){ asws(false); };
        var zi = document.createElement('button'); zi.innerHTML = '🔼 放大(I)'; zi.style.cssText = 'padding:4px 8px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;'; zi.onclick = function(){ asws(true); };
        zc.appendChild(zo); zc.appendChild(zi);
        var h = document.createElement('div'); h.style.cssText = 'font-size:12px;color:#aaa;text-align:right;';
        h.innerHTML = 'Z/双击：跳转并读档 X：关闭 ↑↓选择 ←降星 →升星 Delete删除';
        bb.appendChild(zc); bb.appendChild(h);
        smd.appendChild(bb);

        document.body.appendChild(smd);
        rsml(lc);

        smm.addEventListener('click', csmClose);
        bgi = true;

        try { if (SceneManager._scene && SceneManager._scene.update) { window._qsu = SceneManager._scene.update; SceneManager._scene.update = function(){}; } } catch(e) {}
        window._qsk = function(e) { if (!ism) return; e.preventDefault(); };
        document.addEventListener('keydown', window._qsk, {capture: true});
    }

    function rebuildSmi() {
        var d = gtd();
        var all = d.tags.slice();
        var filter = smSearch.toLowerCase();
        if (filter) {
            all = all.filter(function(t) { return t.name.toLowerCase().indexOf(filter) !== -1 || t.savefileId.toString().indexOf(filter) !== -1; });
        }
        if (smFilterStars.length < 6) {
            all = all.filter(function(t) { return smFilterStars.includes(t.star || 0); });
        }
        if (smSort === 'name') {
            all.sort(function(a,b) { return a.name.localeCompare(b.name); });
        } else if (smSort === 'star') {
            all.sort(function(a,b) { return (b.star||0) - (a.star||0) || a.savefileId - b.savefileId; });
        } else {
            all.sort(function(a,b) { return a.savefileId - b.savefileId; });
        }
        smi = all;
        smsi = Math.min(smsi, smi.length-1);
        if (smsi < 0) smsi = 0;
    }

    function rsml(c) {
        if (!c) c = smd.querySelector('div:nth-child(3)');
        if (!c) return;
        c.innerHTML = '';
        for (let i = 0; i < smi.length; i++) {
            const t = smi[i];
            const r = document.createElement('div');
            const isSelected = (i === smsi);
            r.dataset.index = i;
            r.style.cssText = 'display:flex;align-items:center;padding:6px 10px;margin:3px 0;border-radius:4px;cursor:pointer;background:'+(isSelected?'rgba(74,158,255,0.4)':'transparent')+';border-left:3px solid '+(isSelected?C.color:'transparent')+';transition:0.1s;';
            r.addEventListener('click', function(ev) { smsi = parseInt(this.dataset.index, 10); rsml(); ev.stopPropagation(); });
            r.addEventListener('dblclick', function(ev) { ev.stopPropagation(); const idx = parseInt(this.dataset.index, 10); loadTagSlot(smi[idx]); });
            const starDiv = document.createElement('span');
            starDiv.style.cssText = 'margin-right:8px;font-size:16px;user-select:none;pointer-events:none;';
            starDiv.textContent = getStarDisplay(t.star||0);
            r.appendChild(starDiv);
            const nameSpan = document.createElement('span');
            nameSpan.textContent = t.name + ' (存档'+t.savefileId+')';
            nameSpan.style.cssText = 'flex:1;';
            r.appendChild(nameSpan);
            c.appendChild(r);
        }
        const selectedEl = c.querySelector('[data-index="'+smsi+'"]');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }

    function getStarDisplay(star) {
        var s = '';
        for (var i=1;i<=5;i++) s += i<=star ? '★' : '☆';
        return s;
    }

    function loadTagSlot(tag) {
        if (!tag) return;
        if (isse(tag.savefileId)) { n('槽位 '+tag.savefileId+' 为空，无法读档', '#ffa500'); return; }
        if (!confirm('确定跳转到标签 " '+tag.name+' " 并读取存档 ' + tag.savefileId + ' 吗？')) return;
        qs = tag.savefileId;
        sqs();
        clsm();
        qld();
    }

    function hsmk(e) {
        if (!ism) return;
        e.preventDefault();
        var k = e.key;
        if (k === 'Escape' || k === 'x' || k === 'X') { clsm(); }
        else if (k === 'ArrowUp') { if (smi.length === 0) return; smsi = (smsi - 1 + smi.length) % smi.length; rsml(); }
        else if (k === 'ArrowDown') { if (smi.length === 0) return; smsi = (smsi + 1) % smi.length; rsml(); }
        else if (k === 'ArrowLeft') { if (smi.length === 0) return; var t = smi[smsi]; if ((t.star || 0) > 0) { t.star = (t.star || 0) - 1; std(); rebuildSmi(); if (smsi >= smi.length) smsi = Math.max(0, smi.length - 1); rsml(); } }
        else if (k === 'ArrowRight') { if (smi.length === 0) return; var t = smi[smsi]; if ((t.star || 0) < 5) { t.star = (t.star || 0) + 1; std(); rebuildSmi(); if (smsi >= smi.length) smsi = Math.max(0, smi.length - 1); rsml(); } }
        else if (k === 'Enter' || k === 'z' || k === 'Z') { if (smi.length === 0) return; loadTagSlot(smi[smsi]); }
        else if (k === 'Delete' || k === 'Del') { if (smi.length === 0) return; var t = smi[smsi]; if (confirm('确定删除标签 "'+t.name+'" 吗？')) { var d = gtd(); for (var i=0;i<d.tags.length;i++) if (d.tags[i].id === t.id) { d.tags.splice(i,1); break; } std(); n('标签已删除', '#ffa500'); rebuildSmi(); if (smsi >= smi.length) smsi = Math.max(0, smi.length-1); if (smi.length === 0) { clsm(); return; } rsml(); } }
        else if (k === 'i' || k === 'I') asws(true);
        else if (k === 'o' || k === 'O') asws(false);
    }

    function csmClose() { clsm(); }
    function clsm() {
        if (smd) smd.remove();
        if (smm) smm.remove();
        smd = smm = null; ism = false; smi = []; bgi = false;
        try { if (window._qsu && SceneManager._scene) { SceneManager._scene.update = window._qsu; delete window._qsu; } } catch(e) {}
        if (window._qsk) { document.removeEventListener('keydown', window._qsk, {capture: true}); delete window._qsk; }
    }

    function asws(i) {
        var s = 30;
        smw = Math.min(Math.max(smw + (i ? s : -s), C.windowMinW), C.windowMaxW);
        smh = Math.min(Math.max(smh + (i ? s : -s), C.windowMinH), C.windowMaxH);
        if (smd) { smd.style.width = smw+'px'; smd.style.height = smh+'px'; }
        ssws();
    }

    // ==================================

    var _oe = window.onerror;
    window.onerror = function(m) {
        if (m && m.indexOf('$lastScreenshot') !== -1) return true;
        return _oe ? _oe.apply(this, arguments) : false;
    };

    function okd(e) {
        var t = e.target;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        if (ism) { hsmk(e); return; }
        if (isS || isL) { e.preventDefault(); e.stopPropagation(); return; }

        var c = e.code, s = e.shiftKey;

        var key_next = getKey('slot_next');
        var key_prev = getKey('slot_prev');
        var key_info = getKey('slot_info');
        var key_save = getKey('quick_save');
        var key_load = getKey('quick_load');
        var key_tag = getKey('tag_manage');
        var key_title = getKey('return_title');
        var key_star_up = getKey('star_up');
        var key_star_down = getKey('star_down');

        if (c === key_title && s) { e.preventDefault(); scsi(); rsp(); return; }
        if (c === key_title && !s) {
            e.preventDefault();
            if (pb) { resetPb(); goTitle(); }
            else { pb = true; n('再按 Backspace 确认返回标题', '#FFA500'); ptb = setTimeout(resetPb, C.timeout); }
            return;
        }
        if (c === key_next) { e.preventDefault(); if (s) adjustStar(1); else cqs(1); rsp(); return; }
        if (c === key_prev) { e.preventDefault(); if (s) adjustStar(-1); else cqs(-1); rsp(); return; }
        if (c === key_info && !s) { e.preventDefault(); scsi(); rsp(); return; }
        if (c === key_save) { e.preventDefault(); if (ps) { rsp(); qsav(); } else { ps = true; n('再按一次 [ 确认存档 ('+gsit(qs)+')', '#ffa500'); pt = setTimeout(rsp, C.timeout); } return; }
        if (c === key_load) { e.preventDefault(); if (pl) { rsp(); qld(); } else { pl = true; n('再按一次 ] 确认读档 ('+gsit(qs)+')', '#ffa500'); pt = setTimeout(rsp, C.timeout); } return; }
        if (c === key_tag) { e.preventDefault(); rsp(); if (s) osm(); else htk(); return; }

        rsp();
    }

    function htk() {
        var s = qs, t = gtfs(s);
        if (pta) {
            var nn = prompt('重命名（空=删除）', ptn);
            if (nn !== null) {
                var d = gtd();
                if (!nn.trim()) {
                    for (var i = 0; i < d.tags.length; i++) if (d.tags[i].id === pti) { d.tags.splice(i,1); break; }
                    n('标签已删除', '#ffa500');
                } else {
                    for (var i = 0; i < d.tags.length; i++) if (d.tags[i].id === pti) { d.tags[i].name = nn.trim(); break; }
                    n('已重命名: '+nn, C.color);
                }
                std();
            }
            pta = false; pti = null; ptn = '';
        } else {
            if (t) {
                pta = true; pti = t.id; ptn = t.name;
                n('再按一次修改/删除', '#ffa500');
                if (pt) clearTimeout(pt); pt = setTimeout(function(){ pta = false; pti = null; ptn = ''; }, C.timeout);
            } else {
                var name = prompt('标签名:', '存档'+s);
                if (name && name.trim()) {
                    var d = gtd();
                    d.tags.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2), name: name.trim(), savefileId: s, star: 0});
                    std(); n('已添加标签: '+name, C.color);
                }
            }
        }
    }

    function rsp() {
        ps = false; pl = false;
        if (pt) { clearTimeout(pt); pt = null; }
        resetPb();
    }

    function rap() {
        rsp();
        pta = false; pti = null; ptn = '';
    }

    // ==================================

    function init() {
        if (!window.TagSystem) _loadInternalTags();
        setupLoadGamePatch();
        setupSaveScenePatch();
        document.addEventListener('keydown', okd, {capture: true});
        if (DBG) console.log('✅ 快速存读档 最终安全版 加载完成（标签系统：' + (window.TagSystem ? '外部' : '内置') + '，槽位上限：' + C.maxSlots + '）');

        // ============ 注册到 KeyMapper（Pub/Sub + 暂存表） ============
        var QS_ACTION_NAMES = {
            'slot_next':    '下一个存档槽',
            'slot_prev':    '上一个存档槽',
            'slot_info':    '查看槽位信息',
            'quick_save':   '快速存档',
            'quick_load':   '快速读档',
            'tag_manage':   '标签管理',
            'return_title': '返回标题',
            'star_up':      '标签升星 (Shift+槽位+)',
            'star_down':    '标签降星 (Shift+槽位-)'
        };

        var QS_PAYLOAD = {
            name:  SCRIPT_NAME,
            keys:  DEFAULT_KEYS,
            names: QS_ACTION_NAMES
        };

        // 真正执行注册（KeyMapper 在则直接调用）
        function commitRegister() {
            if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
                window.KeyMapper.registerScript(QS_PAYLOAD.name, QS_PAYLOAD.keys, QS_PAYLOAD.names);
                return true;
            }
            return false;
        }

        // —— 分支 1：KeyMapper 已就绪，直接注册 ——
        if (commitRegister()) {
            if (DBG) console.log('[QS] 已注册到自定义按键管理器');
        } else {
            // —— 分支 2：KeyMapper 未加载，自己创建/追加暂存表 ——
            // KeyMapper 加载时会在 initManager() 里自动读取这张表
            window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
            var exists = window.__keyMapperPendingScripts.some(function(r) {
                return r.name === SCRIPT_NAME;
            });
            if (!exists) {
                window.__keyMapperPendingScripts.push(QS_PAYLOAD);
                if (DBG) console.log('[QS] KeyMapper 未就绪，已写入 __keyMapperPendingScripts 暂存表');
            }

            // —— 分支 3：订阅就绪事件，KeyMapper 上线后自动确认 ——
            // 使用具名引用，避免重复绑定
            if (!window.__qs_keymapperReadyHandler) {
                window.__qs_keymapperReadyHandler = function() {
                    if (commitRegister()) {
                        if (DBG) console.log('[QS] 收到 keymapper:ready，已完成注册');
                    }
                    // 清理暂存表里属于自己的条目（KeyMapper 已经读过就没剩了）
                    if (window.__keyMapperPendingScripts) {
                        window.__keyMapperPendingScripts = window.__keyMapperPendingScripts.filter(function(r) {
                            return r.name !== SCRIPT_NAME;
                        });
                    }
                    window.removeEventListener('keymapper:ready', window.__qs_keymapperReadyHandler);
                    delete window.__qs_keymapperReadyHandler;
                };
                window.addEventListener('keymapper:ready', window.__qs_keymapperReadyHandler);
            }
        }

        // ============ 对外接口 ============
        window.QuickSaveSystem = {
            getQuickSlot: function(){ return qs; },
            setQuickSlot: function(s){ qs = Math.min(Math.max(s,1), C.maxSlots); sqs(); },
            quickSave: qsav,
            quickLoad: qld,
            openSimpleManager: osm,
            getScriptName: function(){ return SCRIPT_NAME; },
            getDefaultKeys: function(){ return DEFAULT_KEYS; },
            getActionNames: function(){ return QS_ACTION_NAMES; }
        };
    }

    function wfi() {
        if (window.DataManager && window.SceneManager && window.Scene_Map && window.Scene_Battle) init();
        else {
            var a = 0, i = setInterval(function() {
                a++;
                if (window.DataManager && window.SceneManager && window.Scene_Map && window.Scene_Battle) { clearInterval(i); init(); }
                else if (a >= 100) { clearInterval(i); init(); }
            }, 100);
        }
    }
    wfi();

    // 允许插件注册快速读档后的刷新回调
    window.QuickSaveRefreshCallbacks = window.QuickSaveRefreshCallbacks || [];

})();