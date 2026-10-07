//@AutoLoad @Evalv8
// 收益倍率与掉落增强 | 默认全部启用（首次运行自动启用，可在 F7 关闭）
(function() {
    'use strict';

    var SCRIPT_NAME = '收益倍率与掉落增强';

    var CONFIG_DEFS = {
        gold_rate: {
            type: 'number',
            label: '金币获取倍率',
            defaultValue: 5,
            min: 1, max: 1000, step: 1
        },
        exp_rate: {
            type: 'number',
            label: '经验获取倍率',
            defaultValue: 10,
            min: 1, max: 1000, step: 1
        },
        item_rate: {
            type: 'number',
            label: '普通物品获取倍率',
            defaultValue: 7,
            min: 1, max: 1000, step: 1
        },
        item_uncap: {
            type: 'bool',
            label: '解除普通物品数量上限',
            defaultValue: true
        },
        drop_all: {
            type: 'bool',
            label: '战斗物品必定掉落',
            defaultValue: true
        }
    };

    function isEnabled(key) {
        if (window.KeyMapper && typeof window.KeyMapper.isConfigEnabled === 'function') {
            return window.KeyMapper.isConfigEnabled(SCRIPT_NAME, key);
        }
        return true;  // 默认启用
    }
    function getVal(key, fallback) {
        if (window.KeyMapper && typeof window.KeyMapper.getConfigValue === 'function') {
            var v = window.KeyMapper.getConfigValue(SCRIPT_NAME, key);
            if (v !== undefined) return v;
        }
        return fallback;
    }

    // ========== 注册 + 默认启用 ==========
    var CFG_PAYLOAD = { name: SCRIPT_NAME, defs: CONFIG_DEFS };
    var INIT_FLAG = 'mult_default_enabled_v1';

    function commitRegister() {
        if (window.KeyMapper && typeof window.KeyMapper.registerConfig === 'function') {
            window.KeyMapper.registerConfig(CFG_PAYLOAD.name, CFG_PAYLOAD.defs);
            return true;
        }
        return false;
    }

    function applyDefaultsOnce() {
        var alreadyInited = false;
        try { alreadyInited = !!localStorage.getItem(INIT_FLAG); } catch(e) {}
        if (alreadyInited) return true;
        if (!window.KeyMapper || typeof window.KeyMapper.setConfigEnabled !== 'function') return false;
        Object.keys(CONFIG_DEFS).forEach(function(k) {
            window.KeyMapper.setConfigEnabled(SCRIPT_NAME, k, true);
            window.KeyMapper.setConfigValue(SCRIPT_NAME, k, CONFIG_DEFS[k].defaultValue);
        });
        try { localStorage.setItem(INIT_FLAG, '1'); } catch(e) {}
        console.log('[收益倍率] 首次运行，已默认启用所有配置项');
        return true;
    }

    var _registered = commitRegister();
    var _inited = applyDefaultsOnce();

    if (!_registered || !_inited) {
        window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
        if (!_registered && !window.__keyMapperPendingConfigs.some(function(r) { return r.name === SCRIPT_NAME; })) {
            window.__keyMapperPendingConfigs.push(CFG_PAYLOAD);
        }
        if (!window.__multReady) {
            window.__multReady = function() {
                commitRegister();
                applyDefaultsOnce();
                if (window.__keyMapperPendingConfigs) {
                    window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs.filter(function(r) { return r.name !== SCRIPT_NAME; });
                }
                window.removeEventListener('keymapper:ready', window.__multReady);
                delete window.__multReady;
            };
            window.addEventListener('keymapper:ready', window.__multReady);
        }
    } else {
        console.log('[收益倍率] 已注册并启用默认配置');
    }

    // ========== 补丁 1：金币倍率 ==========
    var _origGainGold = Game_Party.prototype.gainGold;
    Game_Party.prototype.gainGold = function(amount) {
        if (amount >= 1 && isEnabled('gold_rate')) {
            amount *= getVal('gold_rate', 5);
        }
        _origGainGold.call(this, amount);
        if (this._gold < 0) this._gold = 0;
    };

    // ========== 补丁 2：经验倍率 ==========
    Game_Actor.prototype.gainExp = function(exp) {
        var mult = isEnabled('exp_rate') ? getVal('exp_rate', 10) : 1;
        var newExp = this.currentExp() + Math.round(exp * this.finalExpRate() * mult);
        this.changeExp(newExp, this.shouldDisplayLevelUp());
    };

    // ========== 补丁 3：物品上限解除 ==========
    var _origMaxItems = Game_Party.prototype.maxItems;
    Game_Party.prototype.maxItems = function(item) {
        if (isEnabled('item_uncap') && item && DataManager.isItem(item) && item.itypeId === 1) {
            return Number.MAX_SAFE_INTEGER;
        }
        return _origMaxItems.call(this, item);
    };

    // ========== 补丁 4：物品获取倍率 ==========
    var _origGainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        var finalAmount = amount;
        var isNormalItem = item && DataManager.isItem(item) && item.itypeId === 1;
        if (isNormalItem && amount > 0 && !includeEquip && isEnabled('item_rate')) {
            finalAmount = amount * getVal('item_rate', 7);
        }
        _origGainItem.call(this, item, finalAmount, includeEquip);
        var container = this.itemContainer(item);
        if (container && container[item.id]) {
            container[item.id] = Math.max(container[item.id], 0);
        }
    };

    // ========== 补丁 5：战斗物品必定掉落 ==========
    var _origMakeDropItems = Game_Enemy.prototype.makeDropItems;
    Game_Enemy.prototype.makeDropItems = function() {
        if (!isEnabled('drop_all')) {
            return _origMakeDropItems.call(this);
        }
        var items = [];
        this.enemy().dropItems.forEach(function(drop) {
            if (drop.kind === 1) {
                if (drop.dataId > 0) items.push(this.itemObject(drop.kind, drop.dataId));
            } else if (drop.kind > 0) {
                if (Math.random() < drop.probability) items.push(this.itemObject(drop.kind, drop.dataId));
            }
        }, this);
        return items;
    };

    console.log('✅ 收益倍率与掉落增强 已加载（默认全部启用，可在 F7 → 自定义配置 关闭）');
})();