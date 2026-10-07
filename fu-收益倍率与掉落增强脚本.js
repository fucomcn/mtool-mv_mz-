//@AutoLoad @Evalv8
// 收益倍率与掉落增强 | 可配置版本
// 默认全部不启用，需在 F7 → "自定义配置" 标签页中逐项开启
// 未启用时完全保持游戏原始行为
(function() {
    'use strict';

    var SCRIPT_NAME = '收益倍率与掉落增强';

    // ========== 配置定义 ==========
    var CONFIG_DEFS = {
        gold_rate: {
            type: 'number',
            label: '金币获取倍率（默认 5）',
            defaultValue: 5,
            min: 1, max: 1000, step: 1
        },
        exp_rate: {
            type: 'number',
            label: '经验获取倍率（默认 10）',
            defaultValue: 10,
            min: 1, max: 1000, step: 1
        },
        item_rate: {
            type: 'number',
            label: '普通物品获取倍率（默认 7）',
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

    // ========== 配置读取 ==========
    function isEnabled(key) {
        if (window.KeyMapper && typeof window.KeyMapper.isConfigEnabled === 'function') {
            return window.KeyMapper.isConfigEnabled(SCRIPT_NAME, key);
        }
        return false;
    }

    function getVal(key, fallback) {
        if (window.KeyMapper && typeof window.KeyMapper.getConfigValue === 'function') {
            var v = window.KeyMapper.getConfigValue(SCRIPT_NAME, key);
            if (v !== undefined) return v;
        }
        return fallback;
    }

    // ========== 注册到配置系统（Pub/Sub + 暂存表） ==========
    var CONFIG_PAYLOAD = { name: SCRIPT_NAME, defs: CONFIG_DEFS };

    function commitRegisterConfig() {
        if (window.KeyMapper && typeof window.KeyMapper.registerConfig === 'function') {
            window.KeyMapper.registerConfig(CONFIG_PAYLOAD.name, CONFIG_PAYLOAD.defs);
            return true;
        }
        return false;
    }

    if (commitRegisterConfig()) {
        console.log('[收益倍率] 已注册配置');
    } else {
        window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
        if (!window.__keyMapperPendingConfigs.some(function(r) { return r.name === SCRIPT_NAME; })) {
            window.__keyMapperPendingConfigs.push(CONFIG_PAYLOAD);
            console.log('[收益倍率] KeyMapper 未就绪，已写入暂存表');
        }

        if (!window.__mult_readyHandler) {
            window.__mult_readyHandler = function() {
                if (commitRegisterConfig()) {
                    console.log('[收益倍率] 收到 keymapper:ready，已完成注册');
                }
                if (window.__keyMapperPendingConfigs) {
                    window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs.filter(function(r) {
                        return r.name !== SCRIPT_NAME;
                    });
                }
                window.removeEventListener('keymapper:ready', window.__mult_readyHandler);
                delete window.__mult_readyHandler;
            };
            window.addEventListener('keymapper:ready', window.__mult_readyHandler);
        }
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
    var _origGainExp = Game_Actor.prototype.gainExp;
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
        // 兜底：确保非负
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
                if (drop.dataId > 0) {
                    items.push(this.itemObject(drop.kind, drop.dataId));
                }
            } else if (drop.kind > 0) {
                if (Math.random() < drop.probability) {
                    items.push(this.itemObject(drop.kind, drop.dataId));
                }
            }
        }, this);
        return items;
    };

    console.log('✅ 收益倍率与掉落增强 已加载（默认全部不启用，按 F7 进入"自定义配置"开启）');
})();