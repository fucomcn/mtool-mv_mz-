//@AutoLoad @Evalv8
// RPG Maker MV 等级&属性上限突破增强版（接入 F7 → 自定义配置）
(function() {
    'use strict';

    // ===================== 自定义配置支持 =====================
    var SCRIPT_NAME = '等级&属性上限突破';

    var CONFIG_DEFS = {
        switch_level: {
            type: 'bool',
            label: '等级上限突破 & 经验复利',
            defaultValue: true
        },
        switch_params: {
            type: 'bool',
            label: '基本属性突破（力量/敏捷等，HP/MP 除外）',
            defaultValue: true
        },
        switch_xparams: {
            type: 'bool',
            label: '额外属性突破（命中率/回避率/暴击率等）',
            defaultValue: true
        },
        switch_sparams: {
            type: 'bool',
            label: '特殊属性突破（防御效果率/恢复效果率等）',
            defaultValue: true
        },
        new_max_level: {
            type: 'number',
            label: '突破后等级上限（默认 999999）',
            defaultValue: 999999,
            min: 100, max: 99999999, step: 1000
        },
        new_param_max: {
            type: 'number',
            label: '基本属性上限（默认 999999999）',
            defaultValue: 999999999,
            min: 1000, max: 999999999, step: 1000000
        },
        new_xparam_max: {
            type: 'number',
            label: '额外属性上限（默认 999999）',
            defaultValue: 999999,
            min: 100, max: 999999999, step: 1000
        },
        new_sparam_max: {
            type: 'number',
            label: '特殊属性上限（默认 999999）',
            defaultValue: 999999,
            min: 100, max: 999999999, step: 1000
        },
        hp_mp_max: {
            type: 'number',
            label: 'HP/MP 上限（默认 9999）',
            defaultValue: 9999,
            min: 9999, max: 99999999, step: 10000
        },
        compound_rate: {
            type: 'number',
            label: '复利系数（默认 1.072，建议 1.01~1.5）',
            defaultValue: 1.072,
            min: 1.001, max: 2, step: 0.001
        }
    };

    function isCfgOn(key) {
        if (window.KeyMapper && typeof window.KeyMapper.isConfigEnabled === 'function') {
            return window.KeyMapper.isConfigEnabled(SCRIPT_NAME, key);
        }
        return false;
    }
    function getCfgVal(key, fallback) {
        if (window.KeyMapper && typeof window.KeyMapper.getConfigValue === 'function') {
            var v = window.KeyMapper.getConfigValue(SCRIPT_NAME, key);
            if (v !== undefined) return v;
        }
        return fallback;
    }
    // 用户未勾选 → 使用脚本默认值；勾选后 → 使用用户值
    function getCfgBool(key) {
        if (isCfgOn(key)) {
            var v = getCfgVal(key, CONFIG_DEFS[key].defaultValue);
            return v === true || v === 'true';
        }
        return CONFIG_DEFS[key].defaultValue;
    }
    function getCfgNum(key) {
        if (isCfgOn(key)) {
            var v = parseFloat(getCfgVal(key, CONFIG_DEFS[key].defaultValue));
            if (!isNaN(v)) return v;
        }
        return CONFIG_DEFS[key].defaultValue;
    }

    function isLevelEnabled()   { return getCfgBool('switch_level'); }
    function isParamsEnabled()  { return getCfgBool('switch_params'); }
    function isXParamsEnabled() { return getCfgBool('switch_xparams'); }
    function isSParamsEnabled() { return getCfgBool('switch_sparams'); }

    function getNewMaxLevel()   { return Math.max(ORIG_MAX_LEVEL, Math.floor(getCfgNum('new_max_level'))); }
    function getNewParamMax()   { return Math.floor(getCfgNum('new_param_max')); }
    function getNewXParamMax()  { return Math.floor(getCfgNum('new_xparam_max')); }
    function getNewSParamMax()  { return Math.floor(getCfgNum('new_sparam_max')); }
    function getHpMpMax()       { return Math.floor(getCfgNum('hp_mp_max')); }
    function getCompoundRate()  { return Math.max(1.001, getCfgNum('compound_rate')); }

    // ========== 注册到 KeyMapper（Pub/Sub + 暂存表） ==========
    var CFG_PAYLOAD = { name: SCRIPT_NAME, defs: CONFIG_DEFS };

    function commitRegister() {
        if (window.KeyMapper && typeof window.KeyMapper.registerConfig === 'function') {
            window.KeyMapper.registerConfig(CFG_PAYLOAD.name, CFG_PAYLOAD.defs);
            return true;
        }
        return false;
    }

    if (commitRegister()) {
        console.log('[等级突破] 已注册到自定义配置系统');
    } else {
        window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
        if (!window.__keyMapperPendingConfigs.some(function(r) { return r.name === SCRIPT_NAME; })) {
            window.__keyMapperPendingConfigs.push(CFG_PAYLOAD);
            console.log('[等级突破] KeyMapper 未就绪，已写入暂存表');
        }
        if (!window.__levelBreakReady) {
            window.__levelBreakReady = function() {
                commitRegister();
                if (window.__keyMapperPendingConfigs) {
                    window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs.filter(function(r) { return r.name !== SCRIPT_NAME; });
                }
                window.removeEventListener('keymapper:ready', window.__levelBreakReady);
                delete window.__levelBreakReady;
                console.log('[等级突破] 收到 keymapper:ready，已完成注册');
            };
            window.addEventListener('keymapper:ready', window.__levelBreakReady);
        }
    }

    // ===================== 原始等级上限（自动检测） =====================
    let ORIG_MAX_LEVEL = 99;

    function detectOriginalMaxLevel() {
        if (typeof _Game_Actor_maxLevel === 'function') {
            try {
                const tempActor = new Game_Actor(1);
                const ml = _Game_Actor_maxLevel.call(tempActor);
                if (ml && ml > 0) return ml;
            } catch (e) {}
        }
        if ($dataClasses) {
            let max = 1;
            for (let i = 1; i < $dataClasses.length; i++) {
                const cls = $dataClasses[i];
                if (cls && cls.expParams) {
                    const level = cls.expParams.length - 1;
                    if (level > max) max = level;
                }
            }
            return max || 99;
        }
        return 99;
    }

    // ===================== 解析职业备注配置 =====================
    const getClassConfig = function(classId) {
        const classData = $dataClasses[classId];
        if (!classData || !classData.note) {
            return { maxLevel: getNewMaxLevel(), compoundRate: getCompoundRate() };
        }
        const note = classData.note;
        const config = {
            maxLevel: getNewMaxLevel(),
            compoundRate: getCompoundRate()
        };
        const levelMatch = note.match(/MaxLevel:(\d+)/);
        if (levelMatch && levelMatch[1]) {
            config.maxLevel = Math.max(ORIG_MAX_LEVEL, parseInt(levelMatch[1]));
        }
        const rateMatch = note.match(/CompoundRate:(\d+\.?\d*)/);
        if (rateMatch && rateMatch[1]) {
            config.compoundRate = Math.max(1.01, parseFloat(rateMatch[1]));
        }
        return config;
    };

    // ===================== 原始上限时的基准值存储 =====================
    const originalLevel99Values = {};

    function getLv99Param(actorId, paramId) {
        return originalLevel99Values[actorId]?.params?.[paramId];
    }
    function setLv99Param(actorId, paramId, value) {
        if (!originalLevel99Values[actorId]) {
            originalLevel99Values[actorId] = { params: {}, xparams: {}, sparams: {} };
        }
        originalLevel99Values[actorId].params[paramId] = value;
    }
    function getLv99Xparam(actorId, xparamId) {
        return originalLevel99Values[actorId]?.xparams?.[xparamId];
    }
    function setLv99Xparam(actorId, xparamId, value) {
        if (!originalLevel99Values[actorId]) {
            originalLevel99Values[actorId] = { params: {}, xparams: {}, sparams: {} };
        }
        originalLevel99Values[actorId].xparams[xparamId] = value;
    }
    function getLv99Sparam(actorId, sparamId) {
        return originalLevel99Values[actorId]?.sparams?.[sparamId];
    }
    function setLv99Sparam(actorId, sparamId, value) {
        if (!originalLevel99Values[actorId]) {
            originalLevel99Values[actorId] = { params: {}, xparams: {}, sparams: {} };
        }
        originalLevel99Values[actorId].sparams[sparamId] = value;
    }

    // ===================== 保存原始方法 =====================
    const _Game_Actor_paramBase  = Game_Actor.prototype.paramBase;
    const _Game_Actor_maxLevel   = Game_Actor.prototype.maxLevel;
    const _Game_Actor_levelUp    = Game_Actor.prototype.levelUp;
    const _Game_Actor_expForLevel= Game_Actor.prototype.expForLevel;
    const _Game_BattlerBase_paramMax = Game_BattlerBase.prototype.paramMax;
    const _Game_BattlerBase_xparam   = Game_BattlerBase.prototype.xparam;
    const _Game_BattlerBase_sparam   = Game_BattlerBase.prototype.sparam;

    // ===================== 核心：基本属性复利增长 =====================
    Game_Actor.prototype.paramBase = function(paramId) {
        const useNew = isParamsEnabled() && this._level > ORIG_MAX_LEVEL;
        if (!useNew) {
            return _Game_Actor_paramBase.call(this, paramId);
        }

        const config = getClassConfig(this._classId);
        let lv99Val = getLv99Param(this.actorId(), paramId);
        if (lv99Val === undefined) {
            const savedLevel = this._level;
            this._level = ORIG_MAX_LEVEL;
            lv99Val = _Game_Actor_paramBase.call(this, paramId);
            this._level = savedLevel;
            setLv99Param(this.actorId(), paramId, lv99Val);
        }

        const compounded = Math.floor(lv99Val * Math.pow(config.compoundRate, this._level - ORIG_MAX_LEVEL));
        if (paramId === 0 || paramId === 1) {
            return Math.min(compounded, getHpMpMax());
        }
        return Math.min(compounded, getNewParamMax());
    };

    // ===================== 核心：额外属性复利增长 =====================
    Game_Actor.prototype.xparam = function(xparamId) {
        const useNew = isXParamsEnabled() && this._level > ORIG_MAX_LEVEL;
        if (!useNew) {
            return _Game_BattlerBase_xparam.call(this, xparamId);
        }

        const config = getClassConfig(this._classId);
        let lv99Val = getLv99Xparam(this.actorId(), xparamId);
        if (lv99Val === undefined) {
            const savedLevel = this._level;
            this._level = ORIG_MAX_LEVEL;
            lv99Val = _Game_BattlerBase_xparam.call(this, xparamId);
            this._level = savedLevel;
            setLv99Xparam(this.actorId(), xparamId, lv99Val);
        }

        const compounded = lv99Val * Math.pow(config.compoundRate, this._level - ORIG_MAX_LEVEL);
        return Math.min(compounded, getNewXParamMax());
    };

    // ===================== 核心：特殊属性复利增长 =====================
    Game_Actor.prototype.sparam = function(sparamId) {
        const useNew = isSParamsEnabled() && this._level > ORIG_MAX_LEVEL;
        if (!useNew) {
            return _Game_BattlerBase_sparam.call(this, sparamId);
        }

        const config = getClassConfig(this._classId);
        let lv99Val = getLv99Sparam(this.actorId(), sparamId);
        if (lv99Val === undefined) {
            const savedLevel = this._level;
            this._level = ORIG_MAX_LEVEL;
            lv99Val = _Game_BattlerBase_sparam.call(this, sparamId);
            this._level = savedLevel;
            setLv99Sparam(this.actorId(), sparamId, lv99Val);
        }

        const compounded = lv99Val * Math.pow(config.compoundRate, this._level - ORIG_MAX_LEVEL);
        return Math.min(compounded, getNewSParamMax());
    };

    // ===================== 等级上限突破 =====================
    Game_Actor.prototype.maxLevel = function() {
        if (!isLevelEnabled()) return _Game_Actor_maxLevel.call(this);
        const config = getClassConfig(this._classId);
        return config.maxLevel;
    };

    // ===================== 基本属性上限突破 =====================
    Game_Actor.prototype.paramMax = function(paramId) {
        if (!isParamsEnabled()) return _Game_BattlerBase_paramMax.call(this, paramId);
        if (paramId === 0 || paramId === 1) return getHpMpMax();
        return getNewParamMax();
    };

    // ===================== 升级时记录原始上限基准值 =====================
    Game_Actor.prototype.levelUp = function() {
        const oldLevel = this._level;
        _Game_Actor_levelUp.call(this);

        if (oldLevel <= ORIG_MAX_LEVEL && this._level > ORIG_MAX_LEVEL) {
            const savedLevel = this._level;
            this._level = ORIG_MAX_LEVEL;

            for (let i = 0; i < 8; i++) {
                setLv99Param(this.actorId(), i, _Game_Actor_paramBase.call(this, i));
            }
            for (let i = 0; i < 10; i++) {
                setLv99Xparam(this.actorId(), i, _Game_BattlerBase_xparam.call(this, i));
                setLv99Sparam(this.actorId(), i, _Game_BattlerBase_sparam.call(this, i));
            }

            this._level = savedLevel;
            console.log(`角色 ${this.name()} 的原始等级(${ORIG_MAX_LEVEL})基准属性已记录。`);
        }
    };

    // ===================== 复利式经验需求 =====================
    Game_Actor.prototype.expForLevel = function(level) {
        if (!isLevelEnabled() || level <= ORIG_MAX_LEVEL + 1) {
            return _Game_Actor_expForLevel.call(this, level);
        }
        const config = getClassConfig(this._classId);
        const baseExp = _Game_Actor_expForLevel.call(this, ORIG_MAX_LEVEL + 1);
        return Math.floor(baseExp * Math.pow(config.compoundRate, level - ORIG_MAX_LEVEL - 1));
    };

    // ===================== 初始化存储 =====================
    const _Game_Actor_initialize = Game_Actor.prototype.initialize;
    Game_Actor.prototype.initialize = function(actorId) {
        _Game_Actor_initialize.call(this, actorId);
        if (!originalLevel99Values[actorId]) {
            originalLevel99Values[actorId] = { params: {}, xparams: {}, sparams: {} };
        }
    };

    // ===================== 数据加载完成：更新原始等级上限并提示 =====================
    const _DataManager_loadDataFile = DataManager.loadDataFile;
    DataManager.loadDataFile = function(name, src) {
        _DataManager_loadDataFile.call(this, name, src);
        if (name === '$dataClasses') {
            ORIG_MAX_LEVEL = detectOriginalMaxLevel();
            console.log('职业配置加载完成，增强版复利脚本已生效');
            console.log(`检测到原始等级上限：${ORIG_MAX_LEVEL}`);
            console.log('📌 所有开关与数值可在 F7 → 自定义配置 → 等级&属性上限突破 中修改');
        }
    };

})();