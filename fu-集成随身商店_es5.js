//@AutoLoad @Evalv8
// 随身商店（整合版） - 按 J 打开商店，Shift+J 打开管理器
// 功能：
//   - 自动记录普通商店价格（历史最低价）
//   - 管理器：左侧所有记录（可隐藏、设置优先级），右侧自定义列表（拖拽排序、优先级）
//   - 随身商店：按 J 打开，显示管理器保存的右侧列表（按优先级排序）
//   - 快捷键互斥：打开管理器时按 J 无效，打开商店时按 Shift+J 无效

(function () {
  "use strict";

  console.log("[随身商店] 整合版加载中...");

  // ========== 自定义按键支持 ==========
  const SCRIPT_NAME = '随身商店';
  const DEFAULT_KEYS = {
    toggle_shop: 'KeyJ',
    enlarge:     'KeyI',
    reduce:      'KeyO'
  };
  const ACTION_NAMES = {
    toggle_shop: '打开随身商店（Shift + 该键打开管理器）',
    enlarge:     '放大管理器窗口',
    reduce:      '缩小管理器窗口'
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

  const KB_PAYLOAD = { name: SCRIPT_NAME, keys: DEFAULT_KEYS, names: ACTION_NAMES };
  function commitRegisterKB() {
    if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
      window.KeyMapper.registerScript(KB_PAYLOAD.name, KB_PAYLOAD.keys, KB_PAYLOAD.names);
      return true;
    }
    return false;
  }

  if (commitRegisterKB()) {
    console.log('[随身商店] 已注册到自定义按键管理器');
  } else {
    window.__keyMapperPendingScripts = window.__keyMapperPendingScripts || [];
    if (!window.__keyMapperPendingScripts.some(r => r.name === SCRIPT_NAME)) {
      window.__keyMapperPendingScripts.push(KB_PAYLOAD);
      console.log('[随身商店] KeyMapper 未就绪，已写入暂存表');
    }
    if (!window.__portableShopKbReady) {
      window.__portableShopKbReady = function () {
        if (commitRegisterKB()) console.log('[随身商店] 收到 keymapper:ready，已完成注册');
        if (window.__keyMapperPendingScripts) {
          window.__keyMapperPendingScripts = window.__keyMapperPendingScripts.filter(r => r.name !== SCRIPT_NAME);
        }
        window.removeEventListener('keymapper:ready', window.__portableShopKbReady);
        delete window.__portableShopKbReady;
      };
      window.addEventListener('keymapper:ready', window.__portableShopKbReady);
    }
  }

  // ============================================================================
  // 配置区
  // ============================================================================
  const CONFIG = {
    DEBUG: true,
    SHOP_KEY: 74,
    // J 键
    MANAGER_KEY: 75,
    // K 键（与Shift组合，实际监听Shift+J）
    ENABLE_WEAPON: true,
    ENABLE_ARMOR: true,
    // 窗口尺寸
    WINDOW_SIZE: {
      MIN_WIDTH: 800,
      MAX_WIDTH: 1400,
      MIN_HEIGHT: 600,
      MAX_HEIGHT: 900,
      DEFAULT_WIDTH: 1000,
      DEFAULT_HEIGHT: 700
    },
    ITEM_DISPLAY: {
      ITEMS_PER_PAGE: 20,
      SHOW_ICON_SIZE: 32
    },
    // 窗口样式
    WINDOW_STYLE: {
      BACKGROUND: 'rgba(20, 25, 35, 0.97)',
      BORDER_COLOR: '#4A6B8A',
      BORDER_WIDTH: 2,
      BORDER_RADIUS: 8,
      BOX_SHADOW: '0 0 30px rgba(0, 0, 0, 0.9)',
      OPACITY: 0.98,
      HEADER_HEIGHT: 45,
      HEADER_BACKGROUND: 'linear-gradient(135deg, rgba(40, 50, 70, 0.95), rgba(60, 80, 100, 0.95))',
      HEADER_TEXT_COLOR: '#FFFFFF',
      HEADER_FONT_SIZE: 20,
      HEADER_FONT_FAMILY: 'Arial, sans-serif',
      COLUMN_WIDTH: '49%',
      COLUMN_GAP: '2%',
      COLUMN_BACKGROUND: 'rgba(25, 30, 40, 0.7)',
      COLUMN_BORDER_RADIUS: 6,
      COLUMN_BORDER: '1px solid rgba(80, 100, 130, 0.5)',
      ITEM_BACKGROUND: 'rgba(35, 40, 55, 0.8)',
      ITEM_HOVER_BACKGROUND: 'rgba(45, 55, 75, 0.9)',
      ITEM_SELECTED_BACKGROUND: 'rgba(60, 80, 120, 0.95)',
      ITEM_SELECTED_BORDER: '2px solid #88AAFF',
      ITEM_BORDER: '1px solid rgba(70, 90, 120, 0.4)',
      ITEM_BORDER_RADIUS: 4,
      ITEM_MARGIN: '3px',
      ITEM_PADDING: '6px 8px',
      BUTTON_BACKGROUND: 'linear-gradient(135deg, #3A5F8A, #2A4A6A)',
      BUTTON_HOVER_BACKGROUND: 'linear-gradient(135deg, #4A6F9A, #3A5A7A)',
      BUTTON_COLOR: '#FFFFFF',
      BUTTON_BORDER_RADIUS: 4,
      BUTTON_PADDING: '6px 12px',
      BUTTON_MARGIN: '4px',
      FOOTER_HEIGHT: 45,
      FOOTER_BACKGROUND: 'rgba(30, 40, 55, 0.95)',
      FOOTER_TEXT_COLOR: '#AACCDD',
      FOOTER_FONT_SIZE: 14,
      SCROLLBAR_WIDTH: 8,
      SCROLLBAR_TRACK_COLOR: 'rgba(255, 255, 255, 0.05)',
      SCROLLBAR_THUMB_COLOR: 'rgba(80, 110, 150, 0.6)',
      Z_INDEX: 99999
    },
    TEXT_STYLE: {
      TITLE_FONT_SIZE: 24,
      TITLE_COLOR: '#88BBFF',
      ITEM_NAME_COLOR: '#D0D8E0',
      ITEM_NAME_FONT_SIZE: 16,
      ITEM_PRICE_COLOR: '#88AAFF',
      ITEM_PRICE_FONT_SIZE: 14,
      DESCRIPTION_COLOR: '#99AABB',
      DESCRIPTION_FONT_SIZE: 12,
      BUTTON_FONT_SIZE: 14
    }
  };

  // ============================================================================
  // 全局状态
  // ============================================================================
  let state = {
    // 管理器相关
    managerWindow: null,
    managerVisible: false,
    leftItems: [],
    // 左侧所有记录（已隐藏过滤）
    rightItems: [],
    // 右侧物品（从临时列表构建）
    tempRightList: [],
    // 临时右侧列表，每个元素 { type, id, priority }
    showHidden: false,
    // 是否显示隐藏商品（左侧）
    currentPage: {
      left: 1,
      right: 1
    },
    searchText: {
      left: '',
      right: ''
    },
    filterCategory: {
      left: 0,
      right: 0
    },
    sortType: {
      left: 'name',
      right: 'custom'
    },
    selectedItem: {
      left: null,
      right: null
    },
    windowWidth: CONFIG.WINDOW_SIZE.DEFAULT_WIDTH,
    windowHeight: CONFIG.WINDOW_SIZE.DEFAULT_HEIGHT,
    dragIndex: -1,
    // 游戏操作屏蔽
    blockGameInput: false,
    originalUpdateFunctions: {},
    isTypingInSearch: false,
    initialized: false
  };

  // ============================================================================
  // 扩展 Game_System：价格记录、隐藏、左侧优先级、右侧列表
  // ============================================================================
  const _GameSystem_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function () {
    _GameSystem_initialize.call(this);
    this._portableShopLowest = this._portableShopLowest || {}; // 价格记录
    this._portableShopHidden = this._portableShopHidden || []; // 隐藏商品 ["type-id"]
    this._portableShopLeftPriorities = this._portableShopLeftPriorities || {}; // 左侧优先级 { "type-id": priority }
    this._portableShopRightList = this._portableShopRightList || []; // 右侧列表 [{ type, id, priority }]
  };

  // ---------- 价格记录 ----------
  Game_System.prototype.psUpdateLowest = function (typePrefix, id, price) {
    const key = typePrefix + id;
    const data = this._portableShopLowest || {};
    if (!data[key] || price < data[key]) {
      data[key] = price;
      this._portableShopLowest = data;
      if (CONFIG.DEBUG) console.log(`[随身商店] 记录最低价: ${key} = ${price} G`);
      return true;
    }
    return false;
  };
  Game_System.prototype.psGetLowest = function (typePrefix, id) {
    const data = this._portableShopLowest || {};
    const key = typePrefix + id;
    return data[key] !== undefined ? data[key] : null;
  };

  // ---------- 隐藏 ----------
  Game_System.prototype.psAddHidden = function (type, id) {
    const key = type + '-' + id;
    let arr = this._portableShopHidden || [];
    if (!arr.includes(key)) {
      arr.push(key);
      this._portableShopHidden = arr;
    }
  };
  Game_System.prototype.psRemoveHidden = function (type, id) {
    const key = type + '-' + id;
    let arr = this._portableShopHidden || [];
    const idx = arr.indexOf(key);
    if (idx !== -1) {
      arr.splice(idx, 1);
      this._portableShopHidden = arr;
    }
  };
  Game_System.prototype.psIsHidden = function (type, id) {
    const key = type + '-' + id;
    return (this._portableShopHidden || []).includes(key);
  };

  // ---------- 左侧优先级 ----------
  Game_System.prototype.psGetLeftPriority = function (type, id) {
    const key = type + '-' + id;
    const data = this._portableShopLeftPriorities || {};
    return data[key] !== undefined ? data[key] : 0;
  };
  Game_System.prototype.psSetLeftPriority = function (type, id, priority) {
    const key = type + '-' + id;
    let data = this._portableShopLeftPriorities || {};
    priority = Math.max(-1000, Math.min(1000, priority));
    data[key] = priority;
    this._portableShopLeftPriorities = data;
  };

  // ---------- 右侧列表 ----------
  Game_System.prototype.psGetRightList = function () {
    this._portableShopRightList = this._portableShopRightList || [];
    return this._portableShopRightList;
  };
  Game_System.prototype.psSetRightList = function (list) {
    this._portableShopRightList = list.slice();
  };
  Game_System.prototype.psAddRightItem = function (type, id, priority = 0) {
    const list = this.psGetRightList();
    if (!list.some(item => item.type === type && item.id === id)) {
      list.push({
        type,
        id,
        priority
      });
      this.psSetRightList(list);
      return true;
    }
    return false;
  };
  Game_System.prototype.psRemoveRightItem = function (type, id) {
    const list = this.psGetRightList();
    const newList = list.filter(item => !(item.type === type && item.id === id));
    this.psSetRightList(newList);
    return newList.length !== list.length;
  };
  Game_System.prototype.psUpdateRightPriority = function (type, id, priority) {
    const list = this.psGetRightList();
    const item = list.find(it => it.type === type && it.id === id);
    if (item) {
      item.priority = Math.max(-1000, Math.min(1000, priority));
      this.psSetRightList(list);
      return true;
    }
    return false;
  };
  Game_System.prototype.psSwapRightItems = function (index1, index2) {
    const list = this.psGetRightList();
    if (index1 >= 0 && index1 < list.length && index2 >= 0 && index2 < list.length) {
      [list[index1], list[index2]] = [list[index2], list[index1]];
      this.psSetRightList(list);
    }
  };

  // ============================================================================
  // 物品辅助函数
  // ============================================================================
  function getItemFromData(type, id) {
    if (type === 0) return $dataItems[id];
    if (type === 1) return $dataWeapons[id];
    if (type === 2) return $dataArmors[id];
    return null;
  }
  function getTypePrefix(type) {
    return type === 0 ? 'i' : type === 1 ? 'w' : 'a';
  }
  function getItemCategory(item) {
    if (!item) return 1;
    if (item === $dataItems[item.id]) {
      if (item.itypeId === 2) return 4;
      if (item.consumable) return 5;
      return 1;
    } else if (item === $dataWeapons[item.id]) return 2;else if (item === $dataArmors[item.id]) return 3;
    return 1;
  }
  function getCategoryName(category) {
    switch (category) {
      case 0:
        return '全部';
      case 1:
        return '普通物品';
      case 2:
        return '武器';
      case 3:
        return '防具';
      case 4:
        return '关键物品';
      case 5:
        return '消耗品';
      default:
        return '其他';
    }
  }

  // 获取左侧所有记录（应用隐藏过滤 + 左侧优先级）
  function getAllRecordItems() {
    const items = [];
    const data = $gameSystem._portableShopLowest || {};
    for (const key in data) {
      if (!data.hasOwnProperty(key)) continue;
      const typeChar = key.charAt(0);
      const id = parseInt(key.slice(1));
      if (isNaN(id) || id <= 0) continue;
      let type;
      if (typeChar === 'i') type = 0;else if (typeChar === 'w' && CONFIG.ENABLE_WEAPON) type = 1;else if (typeChar === 'a' && CONFIG.ENABLE_ARMOR) type = 2;else continue;
      const item = getItemFromData(type, id);
      if (item) {
        const hidden = $gameSystem.psIsHidden(type, id);
        if (!state.showHidden && hidden) continue;
        items.push({
          type,
          id,
          item,
          price: data[key],
          category: getItemCategory(item),
          hidden: hidden,
          priority: $gameSystem.psGetLeftPriority(type, id)
        });
      }
    }
    return items;
  }

  // 从临时列表构建右侧物品列表（带优先级）
  function getRightListItemsFromTemp(tempList) {
    const items = [];
    tempList.forEach((entry, index) => {
      const item = getItemFromData(entry.type, entry.id);
      if (item) {
        const price = $gameSystem.psGetLowest(getTypePrefix(entry.type), entry.id);
        if (price !== null) {
          items.push({
            type: entry.type,
            id: entry.id,
            item,
            price,
            category: getItemCategory(item),
            priority: entry.priority !== undefined ? entry.priority : 0,
            originalIndex: index
          });
        }
      }
    });
    return items;
  }

  // 过滤和排序（右侧按优先级）
  function filterAndSortItems(items, side) {
    let result = items.slice();
    const search = state.searchText[side];
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(it => it.item.name.toLowerCase().includes(lower) || it.item.description && it.item.description.toLowerCase().includes(lower));
    }
    const cat = state.filterCategory[side];
    if (cat > 0) {
      result = result.filter(it => it.category === cat);
    }
    const sort = state.sortType[side];
    if (side === 'right') {
      result.sort((a, b) => {
        if (a.priority !== b.priority) return (b.priority || 0) - (a.priority || 0);
        if (sort === 'custom') return (a.originalIndex || 0) - (b.originalIndex || 0);
        if (sort === 'name') return a.item.name.localeCompare(b.item.name);
        if (sort === 'price') return a.price - b.price;
        if (sort === 'id') return a.id - b.id;
        if (sort === 'type') {
          if (a.type !== b.type) return a.type - b.type;
          return a.item.name.localeCompare(b.item.name);
        }
        return 0;
      });
    } else {
      result.sort((a, b) => {
        if (sort === 'name') return a.item.name.localeCompare(b.item.name);
        if (sort === 'price') return a.price - b.price;
        if (sort === 'id') return a.id - b.id;
        if (sort === 'type') {
          if (a.type !== b.type) return a.type - b.type;
          return a.item.name.localeCompare(b.item.name);
        }
        return 0;
      });
    }
    return result;
  }

  // ============================================================================
  // 价格记录劫持（普通商店）
  // ============================================================================
  const _Window_ShopBuy_drawItem = Window_ShopBuy.prototype.drawItem;
  Window_ShopBuy.prototype.drawItem = function (index) {
    _Window_ShopBuy_drawItem.call(this, index);
    const scene = SceneManager._scene;
    if (scene && (scene.constructor === Scene_PortableShop || scene._isPortableShop)) return;
    const item = this._data[index];
    if (!item) return;
    const price = this.price(item);
    let typePrefix = null;
    if (DataManager.isItem(item)) typePrefix = 'i';else if (DataManager.isWeapon(item) && CONFIG.ENABLE_WEAPON) typePrefix = 'w';else if (DataManager.isArmor(item) && CONFIG.ENABLE_ARMOR) typePrefix = 'a';else return;
    $gameSystem.psUpdateLowest(typePrefix, item.id, price);
  };

  // ============================================================================
  // 随身商店场景定义
  // ============================================================================
  let Scene_PortableShop = null;
  Scene_PortableShop = function () {
    this.initialize(...arguments);
  };
  Scene_PortableShop.prototype = Object.create(Scene_Shop.prototype);
  Scene_PortableShop.prototype.constructor = Scene_PortableShop;
  Scene_PortableShop.prototype.create = function () {
    console.log("[随身商店] 打开商店");
    const rightList = $gameSystem.psGetRightList();
    // 构建 goods 数组
    const goods = [];
    rightList.forEach(entry => {
      const price = $gameSystem.psGetLowest(getTypePrefix(entry.type), entry.id);
      if (price !== null) {
        goods.push([entry.type, entry.id, price, 1]);
      }
    });
    if (goods.length === 0) {
      $gameMessage.add("当前没有可购买的商品。");
      setTimeout(() => {
        if (SceneManager._scene === this) SceneManager.pop();
      }, 10);
      return;
    }
    this._goods = goods;
    Scene_Shop.prototype.create.call(this);
    if (this._buyWindow) {
      this._buyWindow._goods = this._goods;
      this._buyWindow._data = [];
      this._buyWindow._price = [];
      for (let i = 0; i < this._goods.length; i++) {
        const g = this._goods[i];
        const item = g[0] === 0 ? $dataItems[g[1]] : g[0] === 1 ? $dataWeapons[g[1]] : $dataArmors[g[1]];
        if (item) {
          this._buyWindow._data.push(item);
          this._buyWindow._price.push(g[2]);
        }
      }
      const buyWindow = this._buyWindow;
      Object.defineProperty(buyWindow, 'price', {
        value: function (item) {
          let typePrefix = null;
          if (DataManager.isItem(item)) typePrefix = 'i';else if (DataManager.isWeapon(item)) typePrefix = 'w';else if (DataManager.isArmor(item)) typePrefix = 'a';
          if (!typePrefix) return 0;
          const price = $gameSystem.psGetLowest(typePrefix, item.id);
          return price !== null ? price : 0;
        },
        writable: false,
        configurable: false
      });
      buyWindow.refresh();
    }
    if (this._helpWindow) {
      this._helpWindow.setText("随身商店（自定义列表）");
    }
    this._isPortableShop = true;
  };

  // ============================================================================
  // 管理器窗口 UI 创建（复用之前的 createWindow 等函数，但重命名以避免冲突）
  // ============================================================================
  function createManagerWindow() {
    if (state.managerWindow) {
      try {
        document.body.removeChild(state.managerWindow);
      } catch (e) {}
      state.managerWindow = null;
    }
    state.managerWindow = document.createElement('div');
    state.managerWindow.id = 'portable-shop-manager';
    state.managerWindow.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${state.windowWidth}px;
            height: ${state.windowHeight}px;
            background: ${CONFIG.WINDOW_STYLE.BACKGROUND};
            border: ${CONFIG.WINDOW_STYLE.BORDER_WIDTH}px solid ${CONFIG.WINDOW_STYLE.BORDER_COLOR};
            border-radius: ${CONFIG.WINDOW_STYLE.BORDER_RADIUS}px;
            box-shadow: ${CONFIG.WINDOW_STYLE.BOX_SHADOW};
            z-index: ${CONFIG.WINDOW_STYLE.Z_INDEX};
            display: none;
            opacity: ${CONFIG.WINDOW_STYLE.OPACITY};
            overflow: hidden;
            box-sizing: border-box;
            flex-direction: column;
        `;

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText = `
            height: ${CONFIG.WINDOW_STYLE.HEADER_HEIGHT}px;
            background: ${CONFIG.WINDOW_STYLE.HEADER_BACKGROUND};
            color: ${CONFIG.WINDOW_STYLE.HEADER_TEXT_COLOR};
            font-size: ${CONFIG.WINDOW_STYLE.HEADER_FONT_SIZE}px;
            font-family: ${CONFIG.WINDOW_STYLE.HEADER_FONT_FAMILY};
            padding: 0 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            flex-shrink: 0;
        `;
    header.innerHTML = `
            <span style="color: ${CONFIG.TEXT_STYLE.TITLE_COLOR}; font-size: ${CONFIG.TEXT_STYLE.TITLE_FONT_SIZE}px; font-weight: bold;">
                🛒 随身商店管理器
            </span>
            <span id="manager-stats" style="font-size: 14px;"></span>
        `;

    // 内容区双栏
    const content = document.createElement('div');
    content.id = 'manager-content';
    content.style.cssText = `
            flex: 1;
            display: flex;
            padding: 10px;
            gap: ${CONFIG.WINDOW_STYLE.COLUMN_GAP};
            box-sizing: border-box;
            overflow: hidden;
        `;
    const leftColumn = createManagerColumn('left', '📋 所有记录');
    const rightColumn = createManagerColumn('right', '🛍️ 随身商店');
    content.appendChild(leftColumn);
    content.appendChild(rightColumn);

    // 底部栏
    const footer = document.createElement('div');
    footer.style.cssText = `
            height: ${CONFIG.WINDOW_STYLE.FOOTER_HEIGHT}px;
            background: ${CONFIG.WINDOW_STYLE.FOOTER_BACKGROUND};
            color: ${CONFIG.WINDOW_STYLE.FOOTER_TEXT_COLOR};
            font-size: ${CONFIG.WINDOW_STYLE.FOOTER_FONT_SIZE}px;
            padding: 0 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            flex-shrink: 0;
            border-top: 1px solid rgba(255,255,255,0.1);
        `;
    const _dispKey = k => String(k).replace('Key','').replace('Digit','').replace(/\+/g,' + ');
    footer.innerHTML = `
            <div>
                <span style="color:#88AAFF;">Shift+${_dispKey(getKey('toggle_shop'))}</span> 打开/关闭管理器 
                <span style="color:#88AAFF;">${_dispKey(getKey('enlarge'))}</span>放大 
                <span style="color:#88AAFF;">${_dispKey(getKey('reduce'))}</span>缩小 
                <span style="color:#88AAFF;">ESC</span>关闭
                <span style="color:#88DDBB; margin-left:15px;">💾 保存后生效</span>
            </div>
            <div id="manager-footer-info"></div>
        `;
    state.managerWindow.appendChild(header);
    state.managerWindow.appendChild(content);
    state.managerWindow.appendChild(footer);
    document.body.appendChild(state.managerWindow);
  }

  // 创建分栏（管理器）
  function createManagerColumn(side, title) {
    const column = document.createElement('div');
    column.id = `manager-${side}-column`;
    column.style.cssText = `
            width: ${CONFIG.WINDOW_STYLE.COLUMN_WIDTH};
            background: ${CONFIG.WINDOW_STYLE.COLUMN_BACKGROUND};
            border-radius: ${CONFIG.WINDOW_STYLE.COLUMN_BORDER_RADIUS}px;
            border: ${CONFIG.WINDOW_STYLE.COLUMN_BORDER};
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
    const header = document.createElement('div');
    header.style.cssText = `
            padding: 8px 12px;
            background: rgba(40,50,70,0.8);
            border-bottom: 1px solid rgba(80,100,130,0.5);
            font-weight: bold;
            color: ${side === 'left' ? '#88BBFF' : '#88DDBB'};
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        `;
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 8px; font-size: 12px; align-items: center;';

    // 搜索框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '搜索...';
    searchInput.style.cssText = `
            padding: 4px 8px;
            border: 1px solid rgba(100,130,160,0.5);
            border-radius: 4px;
            background: rgba(20,25,35,0.8);
            color: #CCDDFF;
            width: 120px;
            font-size: 12px;
        `;
    searchInput.value = state.searchText[side] || '';
    searchInput.addEventListener('input', function () {
      state.searchText[side] = this.value;
      renderManagerColumn(side);
    });
    searchInput.addEventListener('keydown', e => e.stopPropagation());
    searchInput.addEventListener('focus', () => state.isTypingInSearch = true);
    searchInput.addEventListener('blur', () => state.isTypingInSearch = false);
    controls.appendChild(searchInput);

    // 分类筛选
    const categorySelect = document.createElement('select');
    categorySelect.style.cssText = `
            padding: 4px 8px;
            border: 1px solid rgba(100,130,160,0.5);
            border-radius: 4px;
            background: rgba(20,25,35,0.8);
            color: #CCDDFF;
            font-size: 12px;
        `;
    const categories = [{
      val: 0,
      txt: '全部分类'
    }, {
      val: 1,
      txt: '普通物品'
    }, {
      val: 2,
      txt: '武器'
    }, {
      val: 3,
      txt: '防具'
    }, {
      val: 4,
      txt: '关键物品'
    }, {
      val: 5,
      txt: '消耗品'
    }];
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.val;
      opt.textContent = c.txt;
      categorySelect.appendChild(opt);
    });
    categorySelect.value = state.filterCategory[side];
    categorySelect.addEventListener('change', function () {
      state.filterCategory[side] = parseInt(this.value);
      renderManagerColumn(side);
    });
    controls.appendChild(categorySelect);

    // 排序选择
    const sortSelect = document.createElement('select');
    sortSelect.style.cssText = categorySelect.style.cssText;
    let sortOptions;
    if (side === 'left') {
      sortOptions = [{
        val: 'name',
        txt: '按名称'
      }, {
        val: 'price',
        txt: '按价格'
      }, {
        val: 'id',
        txt: '按ID'
      }, {
        val: 'type',
        txt: '按类型'
      }];
    } else {
      sortOptions = [{
        val: 'custom',
        txt: '自定义顺序'
      }, {
        val: 'name',
        txt: '按名称'
      }, {
        val: 'price',
        txt: '按价格'
      }, {
        val: 'id',
        txt: '按ID'
      }, {
        val: 'type',
        txt: '按类型'
      }];
    }
    sortOptions.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.val;
      opt.textContent = o.txt;
      sortSelect.appendChild(opt);
    });
    sortSelect.value = state.sortType[side];
    sortSelect.addEventListener('change', function () {
      state.sortType[side] = this.value;
      renderManagerColumn(side);
    });
    controls.appendChild(sortSelect);

    // 左侧显示隐藏复选框
    if (side === 'left') {
      const showHiddenLabel = document.createElement('label');
      showHiddenLabel.style.cssText = 'display: flex; align-items: center; gap: 4px; color: #CCDDFF;';
      const showHiddenCheck = document.createElement('input');
      showHiddenCheck.type = 'checkbox';
      showHiddenCheck.checked = state.showHidden;
      showHiddenCheck.style.cursor = 'pointer';
      showHiddenCheck.addEventListener('change', function () {
        state.showHidden = this.checked;
        refreshManagerData();
        renderManagerColumn(side);
      });
      showHiddenLabel.appendChild(showHiddenCheck);
      showHiddenLabel.appendChild(document.createTextNode('显示隐藏'));
      controls.appendChild(showHiddenLabel);
    }
    header.appendChild(titleSpan);
    header.appendChild(controls);

    // 物品列表容器
    const itemsContainer = document.createElement('div');
    itemsContainer.id = `manager-${side}-items`;
    itemsContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 5px;
        `;
    itemsContainer.addEventListener('wheel', e => e.stopPropagation(), {
      passive: true
    });

    // 操作按钮区域
    const actionsDiv = document.createElement('div');
    actionsDiv.id = `manager-${side}-actions`;
    actionsDiv.style.cssText = `
            padding: 10px;
            border-top: 1px solid rgba(80,100,130,0.5);
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
            flex-shrink: 0;
        `;
    if (side === 'left') {
      const addBtn = createManagerButton('➕ 添加到右侧', '#88BBFF');
      addBtn.onclick = function () {
        if (state.selectedItem.left) {
          const sel = state.selectedItem.left;
          const priority = sel.priority !== undefined ? sel.priority : 0;
          if (!state.tempRightList.some(item => item.type === sel.type && item.id === sel.id)) {
            state.tempRightList.push({
              type: sel.type,
              id: sel.id,
              priority
            });
            refreshManagerData();
            renderAllManager();
            showMessage(`已添加 ${sel.item.name} 到右侧（未保存）`);
          } else {
            showMessage('该物品已在右侧列表中');
          }
        } else {
          showMessage('请先选择要添加的物品');
        }
      };
      actionsDiv.appendChild(addBtn);
      const importBtn = createManagerButton('📥 全部导入', '#88DDBB');
      importBtn.onclick = showImportDialog;
      actionsDiv.appendChild(importBtn);
      const hideBtn = createManagerButton('👁️ 隐藏', '#FFAA88');
      hideBtn.onclick = function () {
        if (state.selectedItem.left) {
          const sel = state.selectedItem.left;
          if ($gameSystem.psIsHidden(sel.type, sel.id)) {
            $gameSystem.psRemoveHidden(sel.type, sel.id);
            showMessage(`已取消隐藏 ${sel.item.name}`);
          } else {
            $gameSystem.psAddHidden(sel.type, sel.id);
            showMessage(`已隐藏 ${sel.item.name}`);
          }
          refreshManagerData();
          renderManagerColumn('left');
        } else {
          showMessage('请先选择要操作的商品');
        }
      };
      actionsDiv.appendChild(hideBtn);
      const priorityBtn = createManagerButton('🎯 设置优先级', '#FFAA00');
      priorityBtn.onclick = function () {
        if (state.selectedItem.right) {
          var _state$tempRightList$;
          const sel = state.selectedItem.right;
          const current = ((_state$tempRightList$ = state.tempRightList.find(it => it.type === sel.type && it.id === sel.id)) === null || _state$tempRightList$ === void 0 ? void 0 : _state$tempRightList$.priority) || 0;
          const input = prompt(`为【${sel.item.name}】设置优先级（-1000 ~ 1000）`, current);
          if (input !== null) {
            const prio = parseInt(input);
            if (!isNaN(prio) && prio >= -1000 && prio <= 1000) {
              const item = state.tempRightList.find(it => it.type === sel.type && it.id === sel.id);
              if (item) item.priority = prio;
              refreshManagerData();
              renderAllManager();
              showMessage(`已设置优先级 ${prio}`);
            } else {
              showMessage('请输入-1000~1000之间的整数');
            }
          }
        } else {
          showMessage('请先选择要设置优先级的物品');
        }
      };
      actionsDiv.appendChild(priorityBtn);
    } else {
      const removeBtn = createManagerButton('🗑️ 删除选中', '#FF8888');
      removeBtn.onclick = function () {
        if (state.selectedItem.right) {
          const sel = state.selectedItem.right;
          const idx = state.tempRightList.findIndex(it => it.type === sel.type && it.id === sel.id);
          if (idx !== -1) {
            state.tempRightList.splice(idx, 1);
            refreshManagerData();
            renderAllManager();
            showMessage(`已从右侧删除 ${sel.item.name}（未保存）`);
          }
        } else {
          showMessage('请先选择要删除的物品');
        }
      };
      actionsDiv.appendChild(removeBtn);
      const clearBtn = createManagerButton('🧹 清空列表', '#FFAA88');
      clearBtn.onclick = function () {
        if (confirm('确定清空整个右侧列表吗？')) {
          state.tempRightList = [];
          refreshManagerData();
          renderAllManager();
          showMessage('右侧列表已清空（未保存）');
        }
      };
      actionsDiv.appendChild(clearBtn);
      const moveUpBtn = createManagerButton('⬆️ 上移', '#88AAFF');
      moveUpBtn.onclick = function () {
        if (state.selectedItem.right) {
          const idx = state.tempRightList.findIndex(it => it.type === state.selectedItem.right.type && it.id === state.selectedItem.right.id);
          if (idx > 0) {
            [state.tempRightList[idx], state.tempRightList[idx - 1]] = [state.tempRightList[idx - 1], state.tempRightList[idx]];
            refreshManagerData();
            renderAllManager();
            state.selectedItem.right = state.rightItems[idx - 1];
          }
        } else {
          showMessage('请先选择要移动的物品');
        }
      };
      actionsDiv.appendChild(moveUpBtn);
      const moveDownBtn = createManagerButton('⬇️ 下移', '#88AAFF');
      moveDownBtn.onclick = function () {
        if (state.selectedItem.right) {
          const idx = state.tempRightList.findIndex(it => it.type === state.selectedItem.right.type && it.id === state.selectedItem.right.id);
          if (idx < state.tempRightList.length - 1) {
            [state.tempRightList[idx], state.tempRightList[idx + 1]] = [state.tempRightList[idx + 1], state.tempRightList[idx]];
            refreshManagerData();
            renderAllManager();
            state.selectedItem.right = state.rightItems[idx + 1];
          }
        } else {
          showMessage('请先选择要移动的物品');
        }
      };
      actionsDiv.appendChild(moveDownBtn);
      const saveBtn = createManagerButton('💾 保存', '#28a745');
      saveBtn.onclick = function () {
        $gameSystem.psSetRightList(state.tempRightList);
        showMessage('右侧列表已保存，随身商店下次打开将生效');
      };
      actionsDiv.appendChild(saveBtn);
    }
    column.appendChild(header);
    column.appendChild(itemsContainer);
    column.appendChild(actionsDiv);
    return column;
  }
  function createManagerButton(text, color) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
            padding: ${CONFIG.WINDOW_STYLE.BUTTON_PADDING};
            background: ${CONFIG.WINDOW_STYLE.BUTTON_BACKGROUND};
            color: ${CONFIG.WINDOW_STYLE.BUTTON_COLOR};
            border: none;
            border-radius: ${CONFIG.WINDOW_STYLE.BUTTON_BORDER_RADIUS}px;
            cursor: pointer;
            font-size: ${CONFIG.TEXT_STYLE.BUTTON_FONT_SIZE}px;
            font-weight: bold;
            transition: all 0.2s;
            min-width: 100px;
        `;
    btn.onmouseover = function () {
      this.style.background = CONFIG.WINDOW_STYLE.BUTTON_HOVER_BACKGROUND;
      this.style.transform = 'translateY(-2px)';
    };
    btn.onmouseout = function () {
      this.style.background = CONFIG.WINDOW_STYLE.BUTTON_BACKGROUND;
      this.style.transform = 'translateY(0)';
    };
    btn.addEventListener('click', e => e.stopPropagation());
    return btn;
  }

  // 渲染管理器列
  function renderManagerColumn(side) {
    const container = document.getElementById(`manager-${side}-items`);
    if (!container) return;
    container.innerHTML = '';
    let sourceItems = side === 'left' ? state.leftItems : state.rightItems;
    let items = filterAndSortItems(sourceItems, side);
    const perPage = CONFIG.ITEM_DISPLAY.ITEMS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    if (state.currentPage[side] > totalPages) state.currentPage[side] = totalPages;
    if (state.currentPage[side] < 1) state.currentPage[side] = 1;
    const start = (state.currentPage[side] - 1) * perPage;
    const end = Math.min(start + perPage, items.length);
    const pageItems = items.slice(start, end);
    pageItems.forEach((itemData, idx) => {
      const row = document.createElement('div');
      row.className = 'manager-item';
      row.dataset.type = itemData.type;
      row.dataset.id = itemData.id;
      const isSelected = state.selectedItem[side] && state.selectedItem[side].type === itemData.type && state.selectedItem[side].id === itemData.id;
      row.style.cssText = `
                background: ${isSelected ? CONFIG.WINDOW_STYLE.ITEM_SELECTED_BACKGROUND : CONFIG.WINDOW_STYLE.ITEM_BACKGROUND};
                border: ${isSelected ? CONFIG.WINDOW_STYLE.ITEM_SELECTED_BORDER : CONFIG.WINDOW_STYLE.ITEM_BORDER};
                border-radius: ${CONFIG.WINDOW_STYLE.ITEM_BORDER_RADIUS}px;
                margin: ${CONFIG.WINDOW_STYLE.ITEM_MARGIN};
                padding: ${CONFIG.WINDOW_STYLE.ITEM_PADDING};
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

      // 右侧拖拽
      if (side === 'right') {
        row.draggable = true;
        row.addEventListener('dragstart', e => {
          state.dragIndex = start + idx;
          e.dataTransfer.setData('text/plain', `${itemData.type},${itemData.id}`);
          row.style.opacity = '0.5';
        });
        row.addEventListener('dragend', e => {
          row.style.opacity = '1';
          state.dragIndex = -1;
        });
        row.addEventListener('dragover', e => e.preventDefault());
        row.addEventListener('drop', e => {
          e.preventDefault();
          e.stopPropagation();
          if (state.dragIndex === -1) return;
          const targetIndex = start + idx;
          if (state.dragIndex === targetIndex) return;
          // 交换临时列表中的两个元素
          const idx1 = state.dragIndex;
          const idx2 = targetIndex;
          [state.tempRightList[idx1], state.tempRightList[idx2]] = [state.tempRightList[idx2], state.tempRightList[idx1]];
          refreshManagerData();
          renderAllManager();
          state.dragIndex = -1;
          showMessage('顺序已调整（未保存）');
        });
      }
      row.onmouseover = function () {
        if (!isSelected) {
          this.style.background = CONFIG.WINDOW_STYLE.ITEM_HOVER_BACKGROUND;
          this.style.transform = 'translateX(3px)';
        }
      };
      row.onmouseout = function () {
        if (!isSelected) {
          this.style.background = CONFIG.WINDOW_STYLE.ITEM_BACKGROUND;
          this.style.transform = 'translateX(0)';
        }
      };
      row.onclick = e => {
        e.stopPropagation();
        const prev = container.querySelector('.selected');
        if (prev) {
          prev.style.background = CONFIG.WINDOW_STYLE.ITEM_BACKGROUND;
          prev.style.border = CONFIG.WINDOW_STYLE.ITEM_BORDER;
          prev.classList.remove('selected');
        }
        row.style.background = CONFIG.WINDOW_STYLE.ITEM_SELECTED_BACKGROUND;
        row.style.border = CONFIG.WINDOW_STYLE.ITEM_SELECTED_BORDER;
        row.classList.add('selected');
        state.selectedItem[side] = itemData;
        showManagerDetail(itemData);
        if (SoundManager) SoundManager.playCursor();
      };

      // 图标
      const iconDiv = getItemIcon(itemData.item, itemData.type === 0 ? 'item' : itemData.type === 1 ? 'weapon' : 'armor');

      // 信息区域
      const infoDiv = document.createElement('div');
      infoDiv.style.flex = '1';
      infoDiv.style.display = 'flex';
      infoDiv.style.flexDirection = 'column';
      infoDiv.style.gap = '2px';
      const line1 = document.createElement('div');
      line1.style.display = 'flex';
      line1.style.justifyContent = 'space-between';
      line1.style.alignItems = 'center';
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `color: ${CONFIG.TEXT_STYLE.ITEM_NAME_COLOR}; font-size: ${CONFIG.TEXT_STYLE.ITEM_NAME_FONT_SIZE}px; font-weight: bold;`;
      nameSpan.textContent = itemData.item.name;
      line1.appendChild(nameSpan);
      const badgeSpan = document.createElement('span');
      badgeSpan.style.cssText = `color: #AACCDD; font-size: 12px; display: flex; gap: 6px; align-items: center;`;
      if (side === 'left') {
        if (itemData.hidden) {
          const hiddenSpan = document.createElement('span');
          hiddenSpan.style.cssText = 'background:#666; padding:2px 6px; border-radius:4px;';
          hiddenSpan.textContent = '已隐藏';
          badgeSpan.appendChild(hiddenSpan);
        }
        const prioSpan = document.createElement('span');
        prioSpan.style.cssText = 'background: #FFAA00; padding:2px 6px; border-radius:4px; cursor:pointer;';
        prioSpan.textContent = `P:${itemData.priority}`;
        prioSpan.title = '点击设置优先级';
        prioSpan.onclick = e => {
          e.stopPropagation();
          const input = prompt(`为【${itemData.item.name}】设置优先级（-1000 ~ 1000）`, itemData.priority);
          if (input !== null) {
            const prio = parseInt(input);
            if (!isNaN(prio) && prio >= -1000 && prio <= 1000) {
              $gameSystem.psSetLeftPriority(itemData.type, itemData.id, prio);
              refreshManagerData();
              renderManagerColumn('left');
              showMessage(`已设置优先级 ${prio}`);
            } else {
              showMessage('请输入-1000~1000之间的整数');
            }
          }
        };
        badgeSpan.appendChild(prioSpan);
      } else {
        const prioSpan = document.createElement('span');
        prioSpan.style.cssText = 'background: #FFAA00; padding:2px 6px; border-radius:4px; cursor:pointer;';
        prioSpan.textContent = `P:${itemData.priority}`;
        prioSpan.title = '点击设置优先级';
        prioSpan.onclick = e => {
          e.stopPropagation();
          const input = prompt(`为【${itemData.item.name}】设置优先级（-1000 ~ 1000）`, itemData.priority);
          if (input !== null) {
            const prio = parseInt(input);
            if (!isNaN(prio) && prio >= -1000 && prio <= 1000) {
              const idx = state.tempRightList.findIndex(it => it.type === itemData.type && it.id === itemData.id);
              if (idx !== -1) state.tempRightList[idx].priority = prio;
              refreshManagerData();
              renderAllManager();
              showMessage(`已设置优先级 ${prio}`);
            } else {
              showMessage('请输入-1000~1000之间的整数');
            }
          }
        };
        badgeSpan.appendChild(prioSpan);
      }
      line1.appendChild(badgeSpan);
      const line2 = document.createElement('div');
      line2.style.cssText = `color: ${CONFIG.TEXT_STYLE.ITEM_PRICE_COLOR}; font-size: ${CONFIG.TEXT_STYLE.ITEM_PRICE_FONT_SIZE}px;`;
      line2.textContent = `价格: ${itemData.price} G`;
      const line3 = document.createElement('div');
      line3.style.cssText = `color: ${CONFIG.TEXT_STYLE.DESCRIPTION_COLOR}; font-size: ${CONFIG.TEXT_STYLE.DESCRIPTION_FONT_SIZE}px;`;
      line3.textContent = `ID: ${itemData.id} | ${getCategoryName(itemData.category)}`;
      infoDiv.appendChild(line1);
      infoDiv.appendChild(line2);
      infoDiv.appendChild(line3);
      row.appendChild(iconDiv);
      row.appendChild(infoDiv);
      container.appendChild(row);
    });

    // 分页控件
    if (totalPages > 1) {
      const pagination = document.createElement('div');
      pagination.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 10px;
                gap: 10px;
                color: #99AABB;
                font-size: 12px;
            `;
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '上一页';
      prevBtn.disabled = state.currentPage[side] <= 1;
      prevBtn.style.cssText = `
                padding: 4px 8px;
                background: rgba(60,80,100,0.8);
                color: ${prevBtn.disabled ? '#666' : '#CCDDFF'};
                border: none;
                border-radius: 4px;
                cursor: ${prevBtn.disabled ? 'not-allowed' : 'pointer'};
            `;
      if (!prevBtn.disabled) {
        prevBtn.onclick = e => {
          e.stopPropagation();
          state.currentPage[side]--;
          renderManagerColumn(side);
        };
      }
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '下一页';
      nextBtn.disabled = state.currentPage[side] >= totalPages;
      nextBtn.style.cssText = prevBtn.style.cssText;
      if (!nextBtn.disabled) {
        nextBtn.onclick = e => {
          e.stopPropagation();
          state.currentPage[side]++;
          renderManagerColumn(side);
        };
      }
      const pageInfo = document.createElement('span');
      pageInfo.textContent = `第 ${state.currentPage[side]}/${totalPages} 页`;
      pagination.appendChild(prevBtn);
      pagination.appendChild(pageInfo);
      pagination.appendChild(nextBtn);
      container.appendChild(pagination);
    }
    updateManagerStats();
  }
  function showManagerDetail(itemData) {
    let detail = document.getElementById('manager-item-detail');
    if (!detail) {
      detail = document.createElement('div');
      detail.id = 'manager-item-detail';
      detail.style.cssText = `
                position: fixed;
                bottom: 60px;
                right: 20px;
                width: 250px;
                height: 140px;
                background: rgba(20,25,35,0.9);
                border: 1px solid rgba(80,110,150,0.7);
                border-radius: 6px;
                padding: 10px;
                color: #CCDDFF;
                font-size: 13px;
                z-index: ${CONFIG.WINDOW_STYLE.Z_INDEX + 1};
                display: none;
                box-shadow: 0 0 15px rgba(0,0,0,0.5);
            `;
      document.body.appendChild(detail);
    }
    let extra = '';
    if (itemData.priority !== undefined) {
      extra += `<div style="color:#FFAA00; font-size:11px; margin-top:2px;">优先级: ${itemData.priority}</div>`;
    }
    if (itemData.hidden) {
      extra += `<div style="color:#FF8888; font-size:11px; margin-top:2px;">状态: 已隐藏</div>`;
    }
    detail.innerHTML = `
            <div style="margin-bottom:5px;"><strong style="color:#88BBFF;">${itemData.item.name}</strong></div>
            <div style="color:#AACCFF; margin-bottom:5px;">价格: ${itemData.price} G</div>
            <div style="color:#99AABB; font-size:12px; line-height:1.3;">${itemData.item.description || '暂无描述'}</div>
            <div style="color:#8899AA; font-size:11px; margin-top:5px;">类型: ${getCategoryName(itemData.category)} | ID: ${itemData.id}</div>
            ${extra}
        `;
    detail.style.display = 'block';
  }
  function updateManagerStats() {
    const stats = document.getElementById('manager-stats');
    if (stats) {
      stats.innerHTML = `左侧: ${state.leftItems.length}种 | 右侧: ${state.tempRightList.length}种${state.tempRightList.length !== $gameSystem.psGetRightList().length ? ' (未保存)' : ''}`;
    }
    const footerInfo = document.getElementById('manager-footer-info');
    if (footerInfo) {
      footerInfo.textContent = `左侧 ${state.leftItems.length} 种商品，右侧 ${state.tempRightList.length} 种${state.tempRightList.length !== $gameSystem.psGetRightList().length ? ' (未保存)' : ''}`;
    }
  }
  function refreshManagerData() {
    state.leftItems = getAllRecordItems();
    state.rightItems = getRightListItemsFromTemp(state.tempRightList);
  }
  function renderAllManager() {
    renderManagerColumn('left');
    renderManagerColumn('right');
    updateManagerStats();
  }

  // 导入对话框
  function showImportDialog() {
    let leftFiltered = filterAndSortItems(state.leftItems, 'left');
    if (leftFiltered.length === 0) {
      showMessage('左侧没有可导入的物品');
      return;
    }
    const dialog = document.createElement('div');
    dialog.id = 'import-dialog';
    dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            background: rgba(30,35,45,0.95);
            border: 2px solid #4A6B8A;
            border-radius: 8px;
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            z-index: ${CONFIG.WINDOW_STYLE.Z_INDEX + 10};
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            color: white;
        `;
    const title = document.createElement('div');
    title.textContent = '📦 导入左侧列表到右侧';
    title.style.cssText = 'font-size:18px; font-weight:bold; color:#88BBFF; text-align:center; margin-bottom:10px;';
    const desc = document.createElement('div');
    desc.textContent = `左侧当前有 ${leftFiltered.length} 种商品，将使用它们的当前优先级。请选择导入方式：`;
    desc.style.cssText = 'color:#CCDDFF; font-size:14px; text-align:center; margin-bottom:5px;';
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex; justify-content:space-around; margin-top:10px;';
    const btnYes = document.createElement('button');
    btnYes.textContent = '✅ 是 (覆盖)';
    btnYes.style.cssText = 'padding:10px 20px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;';
    btnYes.onclick = function () {
      const newList = leftFiltered.map(it => ({
        type: it.type,
        id: it.id,
        priority: it.priority || 0
      }));
      state.tempRightList = newList;
      refreshManagerData();
      renderAllManager();
      showMessage('已用左侧列表覆盖右侧（未保存）');
      document.body.removeChild(dialog);
    };
    const btnNo = document.createElement('button');
    btnNo.textContent = '❌ 否 (追加)';
    btnNo.style.cssText = 'padding:10px 20px; background:#ffc107; color:black; border:none; border-radius:6px; cursor:pointer; font-weight:bold;';
    btnNo.onclick = function () {
      const itemsToAdd = leftFiltered.map(it => ({
        type: it.type,
        id: it.id,
        priority: it.priority || 0
      }));
      itemsToAdd.forEach(item => {
        if (!state.tempRightList.some(ex => ex.type === item.type && ex.id === item.id)) {
          state.tempRightList.push(item);
        }
      });
      refreshManagerData();
      renderAllManager();
      showMessage('已将左侧列表追加到右侧（未保存）');
      document.body.removeChild(dialog);
    };
    const btnCancel = document.createElement('button');
    btnCancel.textContent = '✖ 取消';
    btnCancel.style.cssText = 'padding:10px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;';
    btnCancel.onclick = function () {
      document.body.removeChild(dialog);
    };
    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);
    btnContainer.appendChild(btnCancel);
    dialog.appendChild(title);
    dialog.appendChild(desc);
    dialog.appendChild(btnContainer);
    document.body.appendChild(dialog);
  }

  // 游戏操作屏蔽（管理器用）
  function blockGameInputs() {
    if (!state.blockGameInput) {
      state.blockGameInput = true;
      if (SceneManager._scene && SceneManager._scene.update) {
        state.originalUpdateFunctions.scene = SceneManager._scene.update;
        SceneManager._scene.update = function () {};
      }
      if (Input._onKeyDown) {
        state.originalUpdateFunctions.onKeyDown = Input._onKeyDown;
        Input._onKeyDown = function (event) {
          if (event.keyCode === 27) toggleManagerWindow();
          event.preventDefault();
          event.stopPropagation();
        };
      }
      if (Input._onMouseDown) {
        state.originalUpdateFunctions.onMouseDown = Input._onMouseDown;
        Input._onMouseDown = function (event) {};
      }
    }
  }
  function restoreGameInputs() {
    if (state.blockGameInput) {
      state.blockGameInput = false;
      if (state.originalUpdateFunctions.scene && SceneManager._scene) {
        SceneManager._scene.update = state.originalUpdateFunctions.scene;
        delete state.originalUpdateFunctions.scene;
      }
      if (state.originalUpdateFunctions.onKeyDown) {
        Input._onKeyDown = state.originalUpdateFunctions.onKeyDown;
        delete state.originalUpdateFunctions.onKeyDown;
      }
      if (state.originalUpdateFunctions.onMouseDown) {
        Input._onMouseDown = state.originalUpdateFunctions.onMouseDown;
        delete state.originalUpdateFunctions.onMouseDown;
      }
    }
  }

  // 管理器开关
  function toggleManagerWindow() {
    if (!state.managerWindow) createManagerWindow();
    state.managerVisible = !state.managerVisible;
    if (state.managerVisible) {
      state.tempRightList = $gameSystem.psGetRightList().map(item => ({
        ...item
      }));
      state.showHidden = false;
      refreshManagerData();
      state.selectedItem = {
        left: null,
        right: null
      };
      state.searchText = {
        left: '',
        right: ''
      };
      state.filterCategory = {
        left: 0,
        right: 0
      };
      state.sortType = {
        left: 'name',
        right: 'custom'
      };
      state.currentPage = {
        left: 1,
        right: 1
      };
      state.managerWindow.style.display = 'flex';
      renderAllManager();
      blockGameInputs();
      const detail = document.getElementById('manager-item-detail');
      if (detail) detail.style.display = 'block';
    } else {
      state.managerWindow.style.display = 'none';
      restoreGameInputs();
      const detail = document.getElementById('manager-item-detail');
      if (detail) detail.style.display = 'none';
    }
  }

  // 管理器窗口缩放
  function adjustManagerSize(increase) {
    if (!state.managerVisible || !state.managerWindow) return;
    const step = 50;
    let w = state.windowWidth,
      h = state.windowHeight;
    if (increase) {
      w = Math.min(w + step, CONFIG.WINDOW_SIZE.MAX_WIDTH);
      h = Math.min(h + step, CONFIG.WINDOW_SIZE.MAX_HEIGHT);
    } else {
      w = Math.max(w - step, CONFIG.WINDOW_SIZE.MIN_WIDTH);
      h = Math.max(h - step, CONFIG.WINDOW_SIZE.MIN_HEIGHT);
    }
    if (w !== state.windowWidth || h !== state.windowHeight) {
      state.windowWidth = w;
      state.windowHeight = h;
      state.managerWindow.style.width = w + 'px';
      state.managerWindow.style.height = h + 'px';
      renderAllManager();
    }
  }

  // 消息提示
  function showMessage(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `
            position: fixed; top: 70px; right: 10px;
            background: rgba(0,0,0,0.85); color: #88AAFF;
            padding: 6px 12px; border-radius: 6px;
            font-family: Arial; font-size: 13px; font-weight: bold;
            z-index: 10002; border: 2px solid #88AAFF;
            opacity: 1; transition: opacity 0.3s;
        `;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 2000);
  }

  // 获取图标
  function getItemIcon(item, type) {
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = `
            width: ${CONFIG.ITEM_DISPLAY.SHOW_ICON_SIZE}px;
            height: ${CONFIG.ITEM_DISPLAY.SHOW_ICON_SIZE}px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background-size: 100%;
        `;
    try {
      if (item.iconIndex !== undefined) {
        const idx = item.iconIndex;
        const iconSet = ImageManager.loadSystem('IconSet');
        if (iconSet) {
          const bitmap = new Bitmap(32, 32);
          const sx = idx % 16 * 32;
          const sy = Math.floor(idx / 16) * 32;
          bitmap.blt(iconSet, sx, sy, 32, 32, 0, 0);
          const dataURL = bitmap.canvas.toDataURL('image/png');
          iconDiv.style.backgroundImage = `url('${dataURL}')`;
          iconDiv.style.backgroundSize = '100%';
          return iconDiv;
        }
      }
    } catch (e) {}
    let fallback = '📦';
    if (type === 'weapon') fallback = '⚔️';else if (type === 'armor') fallback = '🛡️';else if (type === 'item') {
      if (item.itypeId === 2) fallback = '🔑';else if (item.consumable) fallback = '🧪';
    }
    iconDiv.innerHTML = `<span style="font-size:20px;">${fallback}</span>`;
    return iconDiv;
  }

  // ============================================================================
  // 快捷键处理（核心互斥逻辑）
  // ============================================================================
  function openPortableShop() {
    var _SceneManager$_scene;
    const scene = SceneManager._scene;
    if (!scene) return;
    if (!(scene instanceof Scene_Map) && scene.constructor.name !== 'Scene_Map') return;
    if ($gameMap.isEventRunning()) return;
    if (SceneManager._scene instanceof Scene_PortableShop || (_SceneManager$_scene = SceneManager._scene) !== null && _SceneManager$_scene !== void 0 && _SceneManager$_scene._isPortableShop) return;
    console.log("[随身商店] 打开商店");
    SceneManager.push(Scene_PortableShop);
  }
  function handleKeyDown(e) {
    var _SceneManager$_scene2;
    const isShift = e.shiftKey;
    const key = e.keyCode;

    // 首先检查是否在商店场景中
    const inShopScene = SceneManager._scene instanceof Scene_PortableShop || ((_SceneManager$_scene2 = SceneManager._scene) === null || _SceneManager$_scene2 === void 0 ? void 0 : _SceneManager$_scene2._isPortableShop);

    // 如果在商店场景中，忽略所有快捷键（让游戏内商店正常操作）
    if (inShopScene) {
      return;
    }

    // 如果在管理器中，管理器已屏蔽游戏输入，但我们仍需处理管理器内部快捷键（ESC/I/O）
    // 管理器自己的快捷键已经在 blockGameInputs 中通过 Input._onKeyDown 处理了一部分（ESC），
    // 但我们需要在全局监听中捕获 I/O 缩放，因为 blockGameInputs 替换了 Input._onKeyDown，
    // 而全局监听仍然有效。为了避免重复，我们在这里判断 managerVisible。
    const kToggle  = getKey('toggle_shop');
    const kEnlarge = getKey('enlarge');
    const kReduce  = getKey('reduce');

    if (state.managerVisible) {
      if (key === 27) {
        // ESC
        e.preventDefault();
        toggleManagerWindow();
      } else if (matchKey(e, kEnlarge)) {
        // 放大
        e.preventDefault();
        adjustManagerSize(true);
      } else if (matchKey(e, kReduce)) {
        // 缩小
        e.preventDefault();
        adjustManagerSize(false);
      }
      // 阻止其他键
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 不在商店场景且管理器关闭时，响应 toggle_shop 键
    if (matchKey(e, kToggle)) {
      e.preventDefault();
      e.stopPropagation();
      if (isShift) {
        toggleManagerWindow();
      } else {
        openPortableShop();
      }
    }
  }

  // ============================================================================
  // 存档/读档兼容
  // ============================================================================
  const _DataManager_makeSaveContents = DataManager.makeSaveContents;
  DataManager.makeSaveContents = function () {
    const contents = _DataManager_makeSaveContents.call(this);
    contents.portableShopLowest = $gameSystem._portableShopLowest;
    contents.portableShopRightList = $gameSystem._portableShopRightList;
    contents.portableShopHidden = $gameSystem._portableShopHidden;
    contents.portableShopLeftPriorities = $gameSystem._portableShopLeftPriorities;
    return contents;
  };
  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function (contents) {
    _DataManager_extractSaveContents.call(this, contents);
    if (contents.portableShopLowest !== undefined) $gameSystem._portableShopLowest = contents.portableShopLowest;
    if (contents.portableShopRightList !== undefined) $gameSystem._portableShopRightList = contents.portableShopRightList;
    if (contents.portableShopHidden !== undefined) $gameSystem._portableShopHidden = contents.portableShopHidden;
    if (contents.portableShopLeftPriorities !== undefined) $gameSystem._portableShopLeftPriorities = contents.portableShopLeftPriorities;
  };

  // ============================================================================
  // 初始化
  // ============================================================================
  function init() {
    if (state.initialized) return;
    if (!$gameSystem || !SceneManager || !Window_ShopBuy) {
      setTimeout(init, 100);
      return;
    }
    console.log("[随身商店] 整合版初始化...");
    document.addEventListener('keydown', handleKeyDown, true);
    Input.keyMapper[CONFIG.SHOP_KEY] = 'j';
    // 备用：Scene_Map更新轮询（确保响应，但主要靠全局监听）
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
      _Scene_Map_update.call(this);
      // 不再使用 Input.isTriggered，以免与全局冲突
    };
    state.initialized = true;
    console.log("[随身商店] 整合版初始化完成！");
    console.log("[随身商店] 按 J 键打开商店，Shift+J 打开管理器");
    console.log("[随身商店] 打开管理器时游戏操作自动屏蔽");
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();