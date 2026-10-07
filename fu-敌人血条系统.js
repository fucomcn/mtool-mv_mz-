//@AutoLoad @Evalv8

// 可配置的敌人血条系统 - 增强版
// 所有配置通过 F7 → ⚙️ 自定义配置 → 敌人血条系统 修改
// 已移除：Ctrl+数字切换预设、F2 快捷切换、debug 输出

(function() {
    'use strict';

    // ========== 自定义配置支持 ==========
    var SCRIPT_NAME = '敌人血条系统';

    var CONFIG_DEFS = {
        enabled: {
            type: 'bool',
            label: '启用血条系统（勾选后修改下方"是/否"生效）',
            defaultValue: true
        },
        preset: {
            type: 'select',
            label: '血条预设（未勾选时使用默认 modern）',
            defaultValue: 'modern',
            options: [
                { value: 'simple',  label: '简约风格' },
                { value: 'classic', label: '经典 RPG' },
                { value: 'modern',  label: '现代风格' },
                { value: 'pixel',   label: '像素风格' },
                { value: 'fantasy', label: '幻想风格' },
                { value: 'custom',  label: '自定义' }
            ]
        },
        blacklist: {
            type: 'textarea',
            label: '黑名单（每行一个敌人名，支持部分匹配；未勾选时使用脚本内置默认）',
            defaultValue: '死徒波瑠卡\n安吉优\n萨拉飒\n卡琳卡\n杀手莉莉\n纳杰吉塔\n残滓魅比亚斯\n戴安娜',
            rows: 8
        },
        custom_barWidth:  { type: 'number', label: '自定义-血条宽度',     defaultValue: 120, min: 20, max: 500, step: 5 },
        custom_barHeight: { type: 'number', label: '自定义-血条高度',     defaultValue: 10,  min: 2,  max: 100, step: 1 },
        custom_xOffset:   { type: 'number', label: '自定义-水平偏移',     defaultValue: 0,   min: -300, max: 300, step: 5 },
        custom_yOffset:   { type: 'number', label: '自定义-垂直偏移',     defaultValue: -55, min: -500, max: 100, step: 5 },
        custom_borderWidth: { type: 'number', label: '自定义-边框宽度',   defaultValue: 1, min: 0, max: 10, step: 1 },
        custom_borderColor: { type: 'color',  label: '自定义-边框颜色',   defaultValue: 0x000000 },
        custom_borderAlpha: { type: 'number', label: '自定义-边框透明度 (0-1)', defaultValue: 0.8, min: 0, max: 1, step: 0.05 },
        custom_bgColor:     { type: 'color',  label: '自定义-背景颜色',   defaultValue: 0x000000 },
        custom_bgAlpha:     { type: 'number', label: '自定义-背景透明度 (0-1)', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        custom_hpBgColor:   { type: 'color',  label: '自定义-血底颜色',   defaultValue: 0x8B0000 },
        custom_hpBgAlpha:   { type: 'number', label: '自定义-血底透明度 (0-1)', defaultValue: 0.8, min: 0, max: 1, step: 0.05 },
        custom_hpAlpha:     { type: 'number', label: '自定义-血量条透明度 (0-1)', defaultValue: 0.9, min: 0, max: 1, step: 0.05 },
        custom_textFontSize: { type: 'number', label: '自定义-字号', defaultValue: 11, min: 5, max: 48, step: 1 },
        custom_textFontFamily: {
            type: 'select',
            label: '自定义-字体',
            defaultValue: 'Arial',
            options: ['Arial', 'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'Consolas', 'sans-serif', 'serif', 'monospace']
        },
        custom_textFill:  { type: 'color',  label: '自定义-文字颜色', defaultValue: 0xFFFFFF },
        custom_textStroke: { type: 'color', label: '自定义-文字描边颜色', defaultValue: 0x000000 },
        custom_textStrokeThickness: { type: 'number', label: '自定义-文字描边粗细', defaultValue: 2, min: 0, max: 10, step: 1 },
        custom_textYOffset: { type: 'number', label: '自定义-文字垂直偏移', defaultValue: 0, min: -100, max: 100, step: 1 }
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
    function getCfg(key) {
        if (isCfgOn(key)) return getCfgVal(key, CONFIG_DEFS[key].defaultValue);
        return CONFIG_DEFS[key].defaultValue;
    }

    // 综合：血条系统是否启用
    function isEnabled() {
        if (isCfgOn('enabled')) {
            return getCfgVal('enabled', true) !== false;
        }
        return true;
    }

    // 读取当前预设名
    function getPresetName() {
        return getCfg('preset');
    }

    // 读取黑名单（从多行文本解析）
    function getBlacklist() {
        var txt;
        if (isCfgOn('blacklist')) {
            txt = String(getCfgVal('blacklist', CONFIG_DEFS.blacklist.defaultValue));
        } else {
            txt = CONFIG_DEFS.blacklist.defaultValue;
        }
        return txt.split(/\r?\n/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    }

    // 构建自定义配置
    function buildCustomConfig() {
        return {
            barWidth:    getCfg('custom_barWidth'),
            barHeight:   getCfg('custom_barHeight'),
            yOffset:     getCfg('custom_yOffset'),
            xOffset:     getCfg('custom_xOffset'),
            borderWidth: getCfg('custom_borderWidth'),
            borderColor: getCfg('custom_borderColor'),
            borderAlpha: getCfg('custom_borderAlpha'),
            bgColor:     getCfg('custom_bgColor'),
            bgAlpha:     getCfg('custom_bgAlpha'),
            hpBgColor:   getCfg('custom_hpBgColor'),
            hpBgAlpha:   getCfg('custom_hpBgAlpha'),
            hpColors: [
                { rate: 0.6, color: 0x00FF00 },
                { rate: 0.3, color: 0xFFFF00 },
                { rate: 0.0, color: 0xFF0000 }
            ],
            hpAlpha: getCfg('custom_hpAlpha'),
            textStyle: {
                fontSize: getCfg('custom_textFontSize'),
                fontFamily: getCfg('custom_textFontFamily'),
                fill: getCfg('custom_textFill'),
                stroke: getCfg('custom_textStroke'),
                strokeThickness: getCfg('custom_textStrokeThickness'),
                align: 'center'
            },
            textYOffset: getCfg('custom_textYOffset')
        };
    }

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
        console.log('[敌人血条] 已注册到自定义配置系统');
    } else {
        window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs || [];
        if (!window.__keyMapperPendingConfigs.some(function(r) { return r.name === SCRIPT_NAME; })) {
            window.__keyMapperPendingConfigs.push(CFG_PAYLOAD);
            console.log('[敌人血条] KeyMapper 未就绪，已写入暂存表');
        }
        if (!window.__enemyHpBarReady) {
            window.__enemyHpBarReady = function() {
                commitRegister();
                if (window.__keyMapperPendingConfigs) {
                    window.__keyMapperPendingConfigs = window.__keyMapperPendingConfigs.filter(function(r) { return r.name !== SCRIPT_NAME; });
                }
                window.removeEventListener('keymapper:ready', window.__enemyHpBarReady);
                delete window.__enemyHpBarReady;
                console.log('[敌人血条] 收到 keymapper:ready，已完成注册');
            };
            window.addEventListener('keymapper:ready', window.__enemyHpBarReady);
        }
    }

    // ==================== 预设样式数据 ====================
    const PRESETS = {
        simple: {
            barWidth: 90, barHeight: 6, yOffset: -45, xOffset: 0,
            borderWidth: 1, borderColor: 0x000000, borderAlpha: 0.8,
            bgColor: 0x000000, bgAlpha: 0.5,
            hpBgColor: 0x8B0000, hpBgAlpha: 0.8,
            hpColors: [
                { rate: 0.5, color: 0x00FF00 },
                { rate: 0.2, color: 0xFFFF00 },
                { rate: 0.0, color: 0xFF0000 }
            ],
            hpAlpha: 0.9,
            textStyle: { fontSize: 9, fontFamily: 'Arial', fill: 0xFFFFFF, stroke: 0x000000, strokeThickness: 1, align: 'center' },
            textYOffset: 0
        },
        classic: {
            barWidth: 110, barHeight: 10, yOffset: -60, xOffset: 0,
            borderWidth: 2, borderColor: 0x8B4513, borderAlpha: 0.9,
            bgColor: 0x000000, bgAlpha: 0.7,
            hpBgColor: 0x800000, hpBgAlpha: 0.8,
            hpColors: [
                { rate: 0.7, color: 0x32CD32 },
                { rate: 0.4, color: 0xFFD700 },
                { rate: 0.2, color: 0xFF8C00 },
                { rate: 0.0, color: 0xDC143C }
            ],
            hpAlpha: 0.95,
            textStyle: { fontSize: 11, fontFamily: 'Microsoft YaHei', fill: 0xFFFFFF, stroke: 0x000000, strokeThickness: 2, align: 'center', fontWeight: 'bold' },
            textYOffset: 0
        },
        modern: {
            barWidth: 130, barHeight: 12, yOffset: -24, xOffset: 0,
            borderWidth: 1, borderColor: 0x2F4F4F, borderAlpha: 0.7,
            bgColor: 0x1A1A1A, bgAlpha: 0.6,
            hpBgColor: 0x4B0082, hpBgAlpha: 0.8,
            hpColors: [
                { rate: 0.8, color: 0x00CED1 },
                { rate: 0.6, color: 0x4682B4 },
                { rate: 0.4, color: 0xFF69B4 },
                { rate: 0.2, color: 0xFF4500 },
                { rate: 0.0, color: 0x8B0000 }
            ],
            hpAlpha: 0.9,
            textStyle: { fontSize: 16, fontFamily: 'Segoe UI', fill: 0xF0F8FF, stroke: 0x2F4F4F, strokeThickness: 1, align: 'center', fontWeight: 'normal' },
            textYOffset: 0
        },
        pixel: {
            barWidth: 96, barHeight: 8, yOffset: -48, xOffset: 0,
            borderWidth: 1, borderColor: 0x000000, borderAlpha: 1.0,
            bgColor: 0x000000, bgAlpha: 1.0,
            hpBgColor: 0x808080, hpBgAlpha: 1.0,
            hpColors: [
                { rate: 0.6, color: 0x00FF00 },
                { rate: 0.3, color: 0xFFFF00 },
                { rate: 0.0, color: 0xFF0000 }
            ],
            hpAlpha: 1.0,
            textStyle: { fontSize: 8, fontFamily: 'Courier New', fill: 0xFFFFFF, stroke: 0x000000, strokeThickness: 2, align: 'center', fontWeight: 'bold' },
            textYOffset: 0
        },
        fantasy: {
            barWidth: 140, barHeight: 14, yOffset: -70, xOffset: 0,
            borderWidth: 3, borderColor: 0xDAA520, borderAlpha: 0.9,
            bgColor: 0x4B0082, bgAlpha: 0.6,
            hpBgColor: 0x2E0854, hpBgAlpha: 0.8,
            hpColors: [
                { rate: 0.75, color: 0x7CFC00 },
                { rate: 0.5,  color: 0xFFD700 },
                { rate: 0.25, color: 0xFF8C00 },
                { rate: 0.0,  color: 0x8B0000 }
            ],
            hpAlpha: 0.95,
            textStyle: { fontSize: 13, fontFamily: 'Palatino Linotype', fill: 0xFFD700, stroke: 0x8B4513, strokeThickness: 3, align: 'center', fontWeight: 'bold' },
            textYOffset: 0
        }
    };

    // 获取当前生效的样式配置
    function getCurrentStyle() {
        var presetName = getPresetName();
        if (presetName === 'custom') return buildCustomConfig();
        return PRESETS[presetName] || PRESETS.modern;
    }

    // 检查名字是否在黑名单
    function isNameBlacklisted(name) {
        if (!name) return false;
        var list = getBlacklist();
        for (var i = 0; i < list.length; i++) {
            if (name.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    // ==================== 主程序 ====================
    const init = function() {
        if (typeof Sprite_Enemy === 'undefined') {
            setTimeout(init, 100);
            return;
        }

        const originalUpdate = Sprite_Enemy.prototype.update;

        Sprite_Enemy.prototype.update = function() {
            if (originalUpdate) originalUpdate.call(this);

            if (!isEnabled() || !this._battler) return;

            if (this.isInBlacklist()) {
                if (this._hpBar) this.removeEnemyHpBar();
                return;
            }

            if (this._hpBar === undefined) {
                this._hpBar = null;
                this._hpText = null;
            }

            if (this._battler.isAlive()) {
                if (!this._hpBar && this.visible) this.createEnemyHpBar();
                if (this._hpBar) this.updateEnemyHpBar();
            } else {
                if (this._hpBar) this.removeEnemyHpBar();
            }
        };

        Sprite_Enemy.prototype.isInBlacklist = function() {
            if (!this._battler) return false;
            try {
                var enemy = this._battler.enemy();
                if (!enemy) return false;
                return isNameBlacklisted(enemy.name);
            } catch(e) { return false; }
        };

        Sprite_Enemy.prototype.getCurrentConfig = function() {
            return getCurrentStyle();
        };

        Sprite_Enemy.prototype.createEnemyHpBar = function() {
            if (this.isInBlacklist()) return;

            if (this._hpBar && this._hpBar.parent === this) this.removeChild(this._hpBar);
            if (this._hpText && this._hpText.parent === this) this.removeChild(this._hpText);

            var cfg = this.getCurrentConfig();
            this._hpBar = new PIXI.Graphics();
            this._hpBar.name = 'enemyHpBar';
            this._hpText = new PIXI.Text('', cfg.textStyle);
            this._hpText.anchor.set(0.5, 0.5);
            this._hpText.name = 'enemyHpText';
            this.addChild(this._hpBar);
            this.addChild(this._hpText);
            this.updateEnemyHpBar();
        };

        Sprite_Enemy.prototype.getHpColor = function(hpRate) {
            var cfg = this.getCurrentConfig();
            for (var i = 0; i < cfg.hpColors.length; i++) {
                if (hpRate > cfg.hpColors[i].rate) return cfg.hpColors[i].color;
            }
            return 0xFF0000;
        };

        Sprite_Enemy.prototype.updateEnemyHpBar = function() {
            if (!this._battler || !this._hpBar || !this._hpText) return;

            var battler = this._battler;
            var hpRate = Math.max(0, battler.hp / battler.mhp);
            var cfg = this.getCurrentConfig();
            var currentWidth = (cfg.barWidth - 2 * cfg.borderWidth) * hpRate;
            var color = this.getHpColor(hpRate);

            this._hpBar.clear();
            this._hpBar.lineStyle(cfg.borderWidth, cfg.borderColor, cfg.borderAlpha);
            this._hpBar.beginFill(cfg.bgColor, cfg.bgAlpha);
            this._hpBar.drawRect(0, 0, cfg.barWidth, cfg.barHeight);
            this._hpBar.endFill();

            this._hpBar.beginFill(cfg.hpBgColor, cfg.hpBgAlpha);
            this._hpBar.drawRect(cfg.borderWidth, cfg.borderWidth, cfg.barWidth - 2 * cfg.borderWidth, cfg.barHeight - 2 * cfg.borderWidth);
            this._hpBar.endFill();

            var isFlipped = this.scale && this.scale.x < 0;
            this._hpBar.beginFill(color, cfg.hpAlpha);
            if (isFlipped) {
                var startX = cfg.barWidth - cfg.borderWidth - currentWidth;
                this._hpBar.drawRect(startX, cfg.borderWidth, currentWidth, cfg.barHeight - 2 * cfg.borderWidth);
            } else {
                this._hpBar.drawRect(cfg.borderWidth, cfg.borderWidth, currentWidth, cfg.barHeight - 2 * cfg.borderWidth);
            }
            this._hpBar.endFill();

            this._hpText.text = Math.floor(battler.hp) + '/' + Math.floor(battler.mhp);

            this._hpBar.x = cfg.xOffset - cfg.barWidth / 2;
            this._hpBar.y = cfg.yOffset;
            this._hpText.x = cfg.xOffset;
            this._hpText.y = cfg.yOffset + cfg.barHeight / 2 + cfg.textYOffset;
            this._hpText.scale.x = isFlipped ? -1 : 1;

            if (this._hpBar && this.children.indexOf(this._hpBar) < this.children.length - 1) {
                this.setChildIndex(this._hpBar, this.children.length - 1);
            }
            if (this._hpText && this.children.indexOf(this._hpText) < this.children.length - 1) {
                this.setChildIndex(this._hpText, this.children.length - 1);
            }
        };

        Sprite_Enemy.prototype.removeEnemyHpBar = function() {
            if (this._hpBar && this._hpBar.parent === this) this.removeChild(this._hpBar);
            if (this._hpText && this._hpText.parent === this) this.removeChild(this._hpText);
            this._hpBar = null;
            this._hpText = null;
        };

        // ★ 已移除所有按键切换逻辑（Ctrl+数字切预设、F2 开关）与 debug 输出
        // 所有设置请通过 F7 → 自定义配置 修改

        console.log('✅ 增强版敌人血条系统加载成功');
        console.log('📌 请在 F7 → 自定义配置 → 敌人血条系统 中调整设置');
    };

    setTimeout(init, 2000);
})();