//@AutoLoad @Evalv8
(function() {
    console.log("加载增强版仓库系统...");

    // ====================== 全局配置 ======================
    const CONFIG = {
        DEFAULT_KEYS: {
            toggle: 'KeyP',            // 打开/关闭仓库
            enlarge: 'KeyI',           // 放大窗口
            reduce: 'KeyO',            // 缩小窗口
            transferAll: 'KeyT',       // 全部转移
            focusToggle: 'Tab',        // 切换焦点列
            moveUp: 'ArrowUp',         // 上移选择
            moveDown: 'ArrowDown',     // 下移选择
            moveLeft: 'ArrowLeft',     // 向左转移（背包→仓库）
            moveRight: 'ArrowRight',   // 向右转移（仓库→背包）
            filterNext: 'KeyW',        // 切换分类筛选（原为KeyE，已修正）
            sortNext: 'KeyE',          // 切换排序方式（原为KeyW，已修正）
            pageUp: 'PageUp',          // 上一页
            pageDown: 'PageDown'       // 下一页
        },
        WINDOW_SIZE: {
            MIN_WIDTH: 800, MAX_WIDTH: 1400, MIN_HEIGHT: 600, MAX_HEIGHT: 900,
            DEFAULT_WIDTH: 1000, DEFAULT_HEIGHT: 700
        },
        ITEM_DISPLAY: { ITEMS_PER_PAGE: 100, MAX_STACK: 99999, SHOW_ICON_SIZE: 32 },
        WINDOW_STYLE: {
            BACKGROUND: 'rgba(20,25,35,0.97)', BORDER_COLOR: '#4A6B8A', BORDER_WIDTH: 2,
            BORDER_RADIUS: 8, BOX_SHADOW: '0 0 30px rgba(0,0,0,0.9)', OPACITY: 0.98,
            HEADER_HEIGHT: 45, HEADER_BACKGROUND: 'linear-gradient(135deg, rgba(40,50,70,0.95), rgba(60,80,100,0.95))',
            HEADER_TEXT_COLOR: '#FFFFFF', HEADER_FONT_SIZE: 20, HEADER_FONT_FAMILY: 'Arial, sans-serif',
            COLUMN_WIDTH: '49%', COLUMN_GAP: '2%', COLUMN_BACKGROUND: 'rgba(25,30,40,0.7)',
            COLUMN_BORDER_RADIUS: 6, COLUMN_BORDER: '1px solid rgba(80,100,130,0.5)',
            ITEM_BACKGROUND: 'rgba(35,40,55,0.8)', ITEM_HOVER_BACKGROUND: 'rgba(45,55,75,0.9)',
            ITEM_SELECTED_BACKGROUND: 'rgba(60,80,120,0.95)', ITEM_SELECTED_BORDER: '2px solid #88AAFF',
            ITEM_BORDER: '1px solid rgba(70,90,120,0.4)', ITEM_BORDER_RADIUS: 4, ITEM_MARGIN: '3px',
            ITEM_PADDING: '6px 8px', BUTTON_BACKGROUND: 'linear-gradient(135deg, #3A5F8A, #2A4A6A)',
            BUTTON_HOVER_BACKGROUND: 'linear-gradient(135deg, #4A6F9A, #3A5A7A)', BUTTON_COLOR: '#FFFFFF',
            BUTTON_BORDER_RADIUS: 4, BUTTON_PADDING: '6px 12px', BUTTON_MARGIN: '4px',
            FOOTER_HEIGHT: 45, FOOTER_BACKGROUND: 'rgba(30,40,55,0.95)', FOOTER_TEXT_COLOR: '#AACCDD',
            FOOTER_FONT_SIZE: 14, SCROLLBAR_WIDTH: 8, SCROLLBAR_TRACK_COLOR: 'rgba(255,255,255,0.05)',
            SCROLLBAR_THUMB_COLOR: 'rgba(80,110,150,0.6)', Z_INDEX: 99999
        },
        TEXT_STYLE: {
            TITLE_FONT_SIZE: 24, TITLE_COLOR: '#88BBFF', ITEM_NAME_COLOR: '#D0D8E0',
            ITEM_NAME_FONT_SIZE: 16, ITEM_COUNT_COLOR: '#88AAFF', ITEM_COUNT_FONT_SIZE: 14,
            DESCRIPTION_COLOR: '#99AABB', DESCRIPTION_FONT_SIZE: 12, BUTTON_FONT_SIZE: 14
        }
    };

    // 获取按键（支持 KeyMapper）
    function getKey(action) {
        if (window.KeyMapper && typeof window.KeyMapper.getKey === 'function') {
            return window.KeyMapper.getKey('仓库系统', action) || CONFIG.DEFAULT_KEYS[action];
        }
        return CONFIG.DEFAULT_KEYS[action];
    }

    // 全局状态
    let state = {
        window: null,
        visible: false,
        warehouse: $gameSystem._warehouse || {},
        currentPage: { left: 1, right: 1 },
        searchText: { left: '', right: '' },
        filterCategory: { left: 0, right: 0 },
        sortType: { left: 'name', right: 'name' },
        selectedItem: { left: null, right: null },
        selectedIndex: { left: 0, right: 0 },
        focusSide: 'left',
        windowWidth: CONFIG.WINDOW_SIZE.DEFAULT_WIDTH,
        windowHeight: CONFIG.WINDOW_SIZE.DEFAULT_HEIGHT,
        blockGameInput: false,
        originalUpdateFunctions: {},
        isTypingInSearch: false
    };

    // 初始化仓库数据结构
    if (!$gameSystem._warehouse) $gameSystem._warehouse = {};
    if (!$gameSystem._warehouse.items) $gameSystem._warehouse.items = {};
    if (!$gameSystem._warehouse.weapons) $gameSystem._warehouse.weapons = {};
    if (!$gameSystem._warehouse.armors) $gameSystem._warehouse.armors = {};
    state.warehouse = $gameSystem._warehouse;

    // ========== 本地文件存储 ==========
    let _fs = null, _path = null;
    try { _fs = require('fs'); _path = require('path'); } catch(e) {}
    const warehouseFileName = 'warehouse_data.json';

    function loadWarehouseFromFile() {
        if (_fs && _path) {
            try {
                const filePath = _path.join(process.cwd(), warehouseFileName);
                if (_fs.existsSync(filePath)) {
                    const data = JSON.parse(_fs.readFileSync(filePath, 'utf8'));
                    if (data && typeof data === 'object') {
                        state.warehouse = data;
                        $gameSystem._warehouse = data;
                        console.log('从本地文件加载仓库数据成功');
                        return;
                    }
                }
            } catch(e) { console.warn('读取仓库文件失败:', e); }
        }
        saveWarehouseToFile();
    }

    function saveWarehouseToFile() {
        if (_fs && _path) {
            try {
                const filePath = _path.join(process.cwd(), warehouseFileName);
                _fs.writeFileSync(filePath, JSON.stringify(state.warehouse, null, 2), 'utf8');
            } catch(e) { console.warn('保存仓库文件失败:', e); }
        }
    }

    loadWarehouseFromFile();

    function updateWarehouseAndSave() {
        $gameSystem._warehouse = state.warehouse;
        saveWarehouseToFile();
    }

    // ====================== 游戏输入屏蔽 ======================
    function blockGameInputs() {
        if (!state.blockGameInput) {
            state.blockGameInput = true;
            if (SceneManager._scene && SceneManager._scene.update) {
                state.originalUpdateFunctions.scene = SceneManager._scene.update;
                SceneManager._scene.update = function() {};
            }
            if (Input._onKeyDown) {
                state.originalUpdateFunctions.onKeyDown = Input._onKeyDown;
                Input._onKeyDown = function(event) {
                    if (event.keyCode === 27) toggleWindow();
                    event.preventDefault();
                    event.stopPropagation();
                };
            }
            if (Input._onMouseDown) {
                state.originalUpdateFunctions.onMouseDown = Input._onMouseDown;
                Input._onMouseDown = function(event) {};
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

    // ====================== 物品管理函数 ======================
    function getWarehouseItems() {
        const items = [];
        for (const id in state.warehouse.items) {
            if (state.warehouse.items[id] > 0) {
                const item = $dataItems[id];
                if (item) items.push({ id: parseInt(id), item: item, count: state.warehouse.items[id], category: getItemCategory(item), type: 'item' });
            }
        }
        for (const id in state.warehouse.weapons) {
            if (state.warehouse.weapons[id] > 0) {
                const item = $dataWeapons[id];
                if (item) items.push({ id: parseInt(id), item: item, count: state.warehouse.weapons[id], category: getItemCategory(item), type: 'weapon' });
            }
        }
        for (const id in state.warehouse.armors) {
            if (state.warehouse.armors[id] > 0) {
                const item = $dataArmors[id];
                if (item) items.push({ id: parseInt(id), item: item, count: state.warehouse.armors[id], category: getItemCategory(item), type: 'armor' });
            }
        }
        if (state.searchText.left) {
            const searchLower = state.searchText.left.toLowerCase();
            return items.filter(item => item.item.name.toLowerCase().includes(searchLower) || (item.item.description && item.item.description.toLowerCase().includes(searchLower)));
        }
        if (state.filterCategory.left > 0) {
            return items.filter(item => item.category === state.filterCategory.left);
        }
        return sortItems(items, state.sortType.left);
    }

    function getInventoryItems() {
        const items = [];
        for (let i = 1; i < $dataItems.length; i++) {
            const item = $dataItems[i];
            if (item) {
                const count = $gameParty.numItems(item);
                if (count > 0) items.push({ id: i, item: item, count: count, category: getItemCategory(item), type: 'item' });
            }
        }
        for (let i = 1; i < $dataWeapons.length; i++) {
            const item = $dataWeapons[i];
            if (item) {
                const count = $gameParty.numItems(item);
                if (count > 0) items.push({ id: i, item: item, count: count, category: getItemCategory(item), type: 'weapon' });
            }
        }
        for (let i = 1; i < $dataArmors.length; i++) {
            const item = $dataArmors[i];
            if (item) {
                const count = $gameParty.numItems(item);
                if (count > 0) items.push({ id: i, item: item, count: count, category: getItemCategory(item), type: 'armor' });
            }
        }
        if (state.searchText.right) {
            const searchLower = state.searchText.right.toLowerCase();
            return items.filter(item => item.item.name.toLowerCase().includes(searchLower) || (item.item.description && item.item.description.toLowerCase().includes(searchLower)));
        }
        if (state.filterCategory.right > 0) {
            return items.filter(item => item.category === state.filterCategory.right);
        }
        return sortItems(items, state.sortType.right);
    }

    function getItemCategory(item) {
        if (!item) return 1;
        if (item === $dataItems[item.id]) {
            if (item.itypeId === 2) return 4;
            if (item.consumable) return 5;
            return 1;
        } else if (item === $dataWeapons[item.id]) return 2;
        else if (item === $dataArmors[item.id]) return 3;
        return 1;
    }

    function getCategoryName(category) {
        switch(category) {
            case 0: return '全部'; case 1: return '普通物品'; case 2: return '武器'; case 3: return '防具';
            case 4: return '关键物品'; case 5: return '消耗品'; default: return '其他';
        }
    }

    function sortItems(items, sortType) {
        if (!items || items.length === 0) return items || [];
        try {
            const sortedItems = items.slice();
            switch(sortType) {
                case 'id': sortedItems.sort((a, b) => (a.id || 0) - (b.id || 0)); break;
                case 'count': sortedItems.sort((a, b) => (b.count || 0) - (a.count || 0)); break;
                case 'name':
                default:
                    sortedItems.sort((a, b) => (a.item?.name || '').localeCompare(b.item?.name || ''));
            }
            return sortedItems;
        } catch (error) {
            console.error('排序出错:', error);
            return items || [];
        }
    }

    function depositItem(itemId, amount, type) {
        if (!amount || amount <= 0) return false;
        let item, inventoryCount;
        switch(type) {
            case 'item': item = $dataItems[itemId]; if (!item) return false; inventoryCount = $gameParty.numItems(item); break;
            case 'weapon': item = $dataWeapons[itemId]; if (!item) return false; inventoryCount = $gameParty.numItems(item); break;
            case 'armor': item = $dataArmors[itemId]; if (!item) return false; inventoryCount = $gameParty.numItems(item); break;
            default: return false;
        }
        const actualAmount = Math.min(amount, inventoryCount, CONFIG.ITEM_DISPLAY.MAX_STACK);
        if (actualAmount <= 0) return false;
        $gameParty.gainItem(item, -actualAmount);
        const warehouseType = state.warehouse[type + 's'];
        if (!warehouseType[itemId]) warehouseType[itemId] = 0;
        warehouseType[itemId] += actualAmount;
        if (warehouseType[itemId] > CONFIG.ITEM_DISPLAY.MAX_STACK) warehouseType[itemId] = CONFIG.ITEM_DISPLAY.MAX_STACK;
        updateWarehouseAndSave();
        return true;
    }

    function withdrawItem(itemId, amount, type) {
        if (!amount || amount <= 0) return false;
        let item, warehouseCount;
        switch(type) {
            case 'item': item = $dataItems[itemId]; if (!item) return false; warehouseCount = state.warehouse.items[itemId] || 0; break;
            case 'weapon': item = $dataWeapons[itemId]; if (!item) return false; warehouseCount = state.warehouse.weapons[itemId] || 0; break;
            case 'armor': item = $dataArmors[itemId]; if (!item) return false; warehouseCount = state.warehouse.armors[itemId] || 0; break;
            default: return false;
        }
        const actualAmount = Math.min(amount, warehouseCount);
        if (actualAmount <= 0) return false;
        const warehouseType = state.warehouse[type + 's'];
        warehouseType[itemId] -= actualAmount;
        if (warehouseType[itemId] <= 0) delete warehouseType[itemId];
        $gameParty.gainItem(item, actualAmount);
        updateWarehouseAndSave();
        return true;
    }

    function getItemIcon(item, type) {
        const iconElement = document.createElement('div');
        iconElement.style.cssText = `width: ${CONFIG.ITEM_DISPLAY.SHOW_ICON_SIZE}px;height: ${CONFIG.ITEM_DISPLAY.SHOW_ICON_SIZE}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background-size:100%;`;
        try {
            if (item.iconIndex !== undefined) {
                const iconIndex = item.iconIndex;
                const iconSet = ImageManager.loadSystem('IconSet');
                if (iconSet) {
                    const bitmap = new Bitmap(32, 32);
                    const sx = (iconIndex % 16) * 32;
                    const sy = Math.floor(iconIndex / 16) * 32;
                    bitmap.blt(iconSet, sx, sy, 32, 32, 0, 0);
                    const dataURL = bitmap.canvas.toDataURL('image/png');
                    iconElement.style.backgroundImage = `url('${dataURL}')`;
                    iconElement.style.backgroundSize = '100%';
                    return iconElement;
                }
            }
        } catch(e) { console.warn('图标加载失败:', e); }
        let fallbackIcon = '📦';
        switch(type) {
            case 'weapon': fallbackIcon = '⚔️'; break;
            case 'armor': fallbackIcon = '🛡️'; break;
            case 'item':
                if (item && item.itypeId === 2) fallbackIcon = '🔑';
                else if (item && item.consumable) fallbackIcon = '🧪';
                else fallbackIcon = '📦';
                break;
        }
        iconElement.innerHTML = `<span style="font-size: 20px;">${fallbackIcon}</span>`;
        return iconElement;
    }

    // ====================== UI 创建函数 ======================
    function createWindow() {
        if (state.window) { try { document.body.removeChild(state.window); } catch(e) {} }
        state.window = document.createElement('div');
        state.window.id = 'warehouse-window';
        state.window.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${state.windowWidth}px; height: ${state.windowHeight}px; background: ${CONFIG.WINDOW_STYLE.BACKGROUND}; border: ${CONFIG.WINDOW_STYLE.BORDER_WIDTH}px solid ${CONFIG.WINDOW_STYLE.BORDER_COLOR}; border-radius: ${CONFIG.WINDOW_STYLE.BORDER_RADIUS}px; box-shadow: ${CONFIG.WINDOW_STYLE.BOX_SHADOW}; z-index: ${CONFIG.WINDOW_STYLE.Z_INDEX}; display: none; opacity: ${CONFIG.WINDOW_STYLE.OPACITY}; overflow: hidden; box-sizing: border-box; flex-direction: column;`;
        const header = document.createElement('div');
        header.style.cssText = `height: ${CONFIG.WINDOW_STYLE.HEADER_HEIGHT}px; background: ${CONFIG.WINDOW_STYLE.HEADER_BACKGROUND}; color: ${CONFIG.WINDOW_STYLE.HEADER_TEXT_COLOR}; font-size: ${CONFIG.WINDOW_STYLE.HEADER_FONT_SIZE}px; font-family: ${CONFIG.WINDOW_STYLE.HEADER_FONT_FAMILY}; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; flex-shrink: 0;`;
        const headerLeft = document.createElement('div');
        headerLeft.innerHTML = `<span style="color: ${CONFIG.TEXT_STYLE.TITLE_COLOR}; font-size: ${CONFIG.TEXT_STYLE.TITLE_FONT_SIZE}px; font-weight: bold;">📦 仓库管理</span>`;
        const headerRight = document.createElement('div');
        headerRight.style.cssText = 'font-size: 14px; display: flex; gap: 20px; align-items: center;';
        headerRight.id = 'warehouse-stats';
        header.appendChild(headerLeft); header.appendChild(headerRight);
        const content = document.createElement('div');
        content.id = 'warehouse-content';
        content.style.cssText = `flex: 1; display: flex; padding: 10px; gap: ${CONFIG.WINDOW_STYLE.COLUMN_GAP}; box-sizing: border-box; overflow: hidden;`;
        const leftColumn = createColumn('left', '仓库物品');
        const rightColumn = createColumn('right', '背包物品');
        content.appendChild(leftColumn); content.appendChild(rightColumn);
        const footer = document.createElement('div');
        footer.style.cssText = `height: ${CONFIG.WINDOW_STYLE.FOOTER_HEIGHT}px; background: ${CONFIG.WINDOW_STYLE.FOOTER_BACKGROUND}; color: ${CONFIG.WINDOW_STYLE.FOOTER_TEXT_COLOR}; font-size: ${CONFIG.WINDOW_STYLE.FOOTER_FONT_SIZE}px; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.1);`;
        const footerLeft = document.createElement('div');
        footerLeft.innerHTML = `<span style="color:#88AAFF;">${getKey('toggle')}</span>开关 <span style="color:#88AAFF;">${getKey('enlarge')}</span>放大 <span style="color:#88AAFF;">${getKey('reduce')}</span>缩小 <span style="color:#88AAFF;">${getKey('transferAll')}</span>全部转移 <span style="color:#88AAFF;">Tab</span>切换列 <span style="color:#88AAFF;">↑↓</span>选择 <span style="color:#88AAFF;">←→</span>转移 <span style="color:#88AAFF;">Shift+←→</span>全部 <span style="color:#88AAFF;">W/E</span>筛选/排序 <span style="color:#88AAFF;">PgUp/PgDn</span>翻页`;
        const footerRight = document.createElement('div');
        footerRight.id = 'warehouse-footer-info';
        footer.appendChild(footerLeft); footer.appendChild(footerRight);
        state.window.appendChild(header); state.window.appendChild(content); state.window.appendChild(footer);
        document.body.appendChild(state.window);
    }

    function createColumn(side, title) {
        const column = document.createElement('div');
        column.id = `warehouse-${side}-column`;
        column.style.cssText = `width: ${CONFIG.WINDOW_STYLE.COLUMN_WIDTH}; background: ${CONFIG.WINDOW_STYLE.COLUMN_BACKGROUND}; border-radius: ${CONFIG.WINDOW_STYLE.COLUMN_BORDER_RADIUS}px; border: ${CONFIG.WINDOW_STYLE.COLUMN_BORDER}; display: flex; flex-direction: column; overflow: hidden;`;
        if (state.focusSide === side) column.style.borderColor = '#88AAFF';
        const columnHeader = document.createElement('div');
        columnHeader.style.cssText = `padding: 8px 12px; background: rgba(40,50,70,0.8); border-bottom: 1px solid rgba(80,100,130,0.5); font-weight: bold; color: ${side === 'left' ? '#88BBFF' : '#88DDBB'}; font-size: 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;`;
        const titleSpan = document.createElement('span'); titleSpan.textContent = title;
        const controlsDiv = document.createElement('div'); controlsDiv.style.display = 'flex'; controlsDiv.style.gap = '8px'; controlsDiv.style.fontSize = '12px';
        const searchInput = document.createElement('input');
        searchInput.type = 'text'; searchInput.placeholder = '搜索...';
        searchInput.style.cssText = `padding: 4px 8px; border: 1px solid rgba(100,130,160,0.5); border-radius: 4px; background: rgba(20,25,35,0.8); color: #CCDDFF; width: 120px; font-size: 12px;`;
        searchInput.value = state.searchText[side] || '';
        searchInput.addEventListener('input', function() { state.searchText[side] = this.value; renderColumn(side); });
        searchInput.addEventListener('keydown', e => e.stopPropagation());
        searchInput.addEventListener('focus', () => state.isTypingInSearch = true);
        searchInput.addEventListener('blur', () => state.isTypingInSearch = false);
        const categorySelect = document.createElement('select');
        categorySelect.style.cssText = `padding: 4px 8px; border: 1px solid rgba(100,130,160,0.5); border-radius: 4px; background: rgba(20,25,35,0.8); color: #CCDDFF; font-size: 12px;`;
        const categories = [0,1,2,3,4,5];
        categories.forEach(cat => {
            const option = document.createElement('option'); option.value = cat; option.textContent = getCategoryName(cat); categorySelect.appendChild(option);
        });
        categorySelect.value = state.filterCategory[side];
        categorySelect.addEventListener('change', function() { state.filterCategory[side] = parseInt(this.value); renderColumn(side); });
        const sortSelect = document.createElement('select');
        sortSelect.style.cssText = categorySelect.style.cssText;
        const sortOptions = [['name','按名称'],['id','按ID'],['count','按数量']];
        sortOptions.forEach(opt => {
            const option = document.createElement('option'); option.value = opt[0]; option.textContent = opt[1]; sortSelect.appendChild(option);
        });
        sortSelect.value = state.sortType[side];
        sortSelect.addEventListener('change', function() { state.sortType[side] = this.value; renderColumn(side); });
        controlsDiv.appendChild(searchInput); controlsDiv.appendChild(categorySelect); controlsDiv.appendChild(sortSelect);
        columnHeader.appendChild(titleSpan); columnHeader.appendChild(controlsDiv);
        const itemsContainer = document.createElement('div');
        itemsContainer.id = `warehouse-${side}-items`;
        itemsContainer.style.cssText = `flex: 1; overflow-y: auto; padding: 5px;`;
        itemsContainer.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
        const style = document.createElement('style');
        style.textContent = `#warehouse-${side}-items::-webkit-scrollbar { width: ${CONFIG.WINDOW_STYLE.SCROLLBAR_WIDTH}px; } #warehouse-${side}-items::-webkit-scrollbar-track { background: ${CONFIG.WINDOW_STYLE.SCROLLBAR_TRACK_COLOR}; border-radius: 4px; } #warehouse-${side}-items::-webkit-scrollbar-thumb { background: ${CONFIG.WINDOW_STYLE.SCROLLBAR_THUMB_COLOR}; border-radius: 4px; }`;
        document.head.appendChild(style);
        const actionsDiv = document.createElement('div');
        actionsDiv.id = `warehouse-${side}-actions`;
        actionsDiv.style.cssText = `padding: 10px; border-top: 1px solid rgba(80,100,130,0.5); display: flex; justify-content: center; gap: 10px; flex-shrink: 0;`;
        if (side === 'left') {
            const withdrawBtn = createButton('取出一个', '#88BBFF');
            withdrawBtn.onclick = function() {
                if (state.selectedItem.left) {
                    if (withdrawItem(state.selectedItem.left.id, 1, state.selectedItem.left.type)) { SoundManager.playOk(); renderAll(); }
                }
            };
            const withdrawAllBtn = createButton('全部取出', '#88BBFF');
            withdrawAllBtn.onclick = function() {
                if (state.selectedItem.left) {
                    const itemData = state.selectedItem.left;
                    if (withdrawItem(itemData.id, itemData.count, itemData.type)) { SoundManager.playOk(); renderAll(); }
                }
            };
            actionsDiv.appendChild(withdrawBtn); actionsDiv.appendChild(withdrawAllBtn);
        } else {
            const depositBtn = createButton('存入一个', '#88DDBB');
            depositBtn.onclick = function() {
                if (state.selectedItem.right) {
                    if (depositItem(state.selectedItem.right.id, 1, state.selectedItem.right.type)) { SoundManager.playOk(); renderAll(); }
                }
            };
            const depositAllBtn = createButton('全部存入', '#88DDBB');
            depositAllBtn.onclick = function() {
                if (state.selectedItem.right) {
                    const itemData = state.selectedItem.right;
                    if (depositItem(itemData.id, itemData.count, itemData.type)) { SoundManager.playOk(); renderAll(); }
                }
            };
            actionsDiv.appendChild(depositBtn); actionsDiv.appendChild(depositAllBtn);
        }
        column.appendChild(columnHeader); column.appendChild(itemsContainer); column.appendChild(actionsDiv);
        return column;
    }

    function createButton(text, color) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `padding: ${CONFIG.WINDOW_STYLE.BUTTON_PADDING}; background: ${CONFIG.WINDOW_STYLE.BUTTON_BACKGROUND}; color: ${CONFIG.WINDOW_STYLE.BUTTON_COLOR}; border: none; border-radius: ${CONFIG.WINDOW_STYLE.BUTTON_BORDER_RADIUS}px; cursor: pointer; font-size: ${CONFIG.TEXT_STYLE.BUTTON_FONT_SIZE}px; font-weight: bold; transition: all 0.2s; min-width: 100px;`;
        button.onmouseover = function() { this.style.background = CONFIG.WINDOW_STYLE.BUTTON_HOVER_BACKGROUND; this.style.transform = 'translateY(-2px)'; };
        button.onmouseout = function() { this.style.background = CONFIG.WINDOW_STYLE.BUTTON_BACKGROUND; this.style.transform = 'translateY(0)'; };
        button.addEventListener('click', e => e.stopPropagation());
        return button;
    }

    function renderColumn(side) {
        if (!state.visible || !state.window) return;
        const itemsContainer = document.getElementById(`warehouse-${side}-items`);
        if (!itemsContainer) return;
        itemsContainer.innerHTML = '';
        const items = side === 'left' ? getWarehouseItems() : getInventoryItems();
        // 确保 selectedIndex 在有效范围内
        if (state.selectedIndex[side] >= items.length) state.selectedIndex[side] = Math.max(0, items.length - 1);
        if (state.selectedIndex[side] < 0) state.selectedIndex[side] = 0;
        if (!items || items.length === 0) {
            itemsContainer.innerHTML = `<div style="text-align:center;padding:40px 0;color:#778899;font-size:14px;">${side === 'left' ? '仓库为空' : '背包为空'}</div>`;
            state.selectedItem[side] = null;
            updateColumnFocusBorder();
            updateHeaderStats();
            return;
        }
        const itemsPerPage = CONFIG.ITEM_DISPLAY.ITEMS_PER_PAGE;
        const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
        if (state.currentPage[side] > totalPages) state.currentPage[side] = totalPages;
        if (state.currentPage[side] < 1) state.currentPage[side] = 1;
        const startIndex = (state.currentPage[side] - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, items.length);
        const pageItems = items.slice(startIndex, endIndex);
        pageItems.forEach((itemData, index) => {
            const globalIndex = startIndex + index;
            const itemDiv = document.createElement('div');
            const isSelected = state.selectedIndex[side] === globalIndex;
            itemDiv.style.cssText = `background: ${isSelected ? CONFIG.WINDOW_STYLE.ITEM_SELECTED_BACKGROUND : CONFIG.WINDOW_STYLE.ITEM_BACKGROUND}; border: ${isSelected ? CONFIG.WINDOW_STYLE.ITEM_SELECTED_BORDER : CONFIG.WINDOW_STYLE.ITEM_BORDER}; border-radius: ${CONFIG.WINDOW_STYLE.ITEM_BORDER_RADIUS}px; margin: ${CONFIG.WINDOW_STYLE.ITEM_MARGIN}; padding: ${CONFIG.WINDOW_STYLE.ITEM_PADDING}; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px;`;
            itemDiv.dataset.index = globalIndex;
            itemDiv.onmouseover = function() { if (!isSelected) { this.style.background = CONFIG.WINDOW_STYLE.ITEM_HOVER_BACKGROUND; this.style.transform = 'translateX(3px)'; } };
            itemDiv.onmouseout = function() { if (!isSelected) { this.style.background = CONFIG.WINDOW_STYLE.ITEM_BACKGROUND; this.style.transform = 'translateX(0)'; } };
            itemDiv.onclick = function(e) {
                e.stopPropagation();
                state.selectedIndex[side] = globalIndex;
                state.selectedItem[side] = itemData;
                renderColumn(side);
                showItemDetail(itemData);
                SoundManager.playCursor();
            };
            const iconDiv = getItemIcon(itemData.item, itemData.type);
            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = `color: ${CONFIG.TEXT_STYLE.ITEM_NAME_COLOR}; font-size: ${CONFIG.TEXT_STYLE.ITEM_NAME_FONT_SIZE}px; font-weight: bold; margin-bottom: 2px;`;
            nameDiv.textContent = itemData.item.name || '未知物品';
            const countDiv = document.createElement('div');
            countDiv.style.cssText = `color: ${CONFIG.TEXT_STYLE.ITEM_COUNT_COLOR}; font-size: ${CONFIG.TEXT_STYLE.ITEM_COUNT_FONT_SIZE}px;`;
            countDiv.textContent = `数量: ${itemData.count || 0}`;
            const metaDiv = document.createElement('div');
            metaDiv.style.cssText = `color: ${CONFIG.TEXT_STYLE.DESCRIPTION_COLOR}; font-size: ${CONFIG.TEXT_STYLE.DESCRIPTION_FONT_SIZE}px; margin-top: 2px;`;
            metaDiv.textContent = `ID: ${itemData.id} | ${getCategoryName(itemData.category)}`;
            infoDiv.appendChild(nameDiv); infoDiv.appendChild(countDiv); infoDiv.appendChild(metaDiv);
            itemDiv.appendChild(iconDiv); itemDiv.appendChild(infoDiv);
            itemsContainer.appendChild(itemDiv);
        });
        // 滚动到选中项
        if (state.selectedItem[side]) {
            const selectedEl = itemsContainer.querySelector(`[data-index="${state.selectedIndex[side]}"]`);
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
        if (totalPages > 1) {
            const paginationDiv = document.createElement('div');
            paginationDiv.style.cssText = `display:flex;justify-content:center;align-items:center;margin-top:10px;gap:10px;color:#99AABB;font-size:12px;`;
            const prevBtn = document.createElement('button'); prevBtn.textContent = '上一页'; prevBtn.disabled = state.currentPage[side] <= 1;
            prevBtn.style.cssText = `padding:4px 8px;background:rgba(60,80,100,0.8);color:${prevBtn.disabled ? '#666' : '#CCDDFF'};border:none;border-radius:4px;cursor:${prevBtn.disabled ? 'not-allowed' : 'pointer'};`;
            if (!prevBtn.disabled) prevBtn.onclick = e => { e.stopPropagation(); state.currentPage[side]--; renderColumn(side); };
            const nextBtn = document.createElement('button'); nextBtn.textContent = '下一页'; nextBtn.disabled = state.currentPage[side] >= totalPages;
            nextBtn.style.cssText = prevBtn.style.cssText;
            if (!nextBtn.disabled) nextBtn.onclick = e => { e.stopPropagation(); state.currentPage[side]++; renderColumn(side); };
            const pageInfo = document.createElement('span'); pageInfo.textContent = `第 ${state.currentPage[side]}/${totalPages} 页`;
            paginationDiv.appendChild(prevBtn); paginationDiv.appendChild(pageInfo); paginationDiv.appendChild(nextBtn);
            itemsContainer.appendChild(paginationDiv);
        }
        updateColumnFocusBorder();
        updateHeaderStats();
    }

    function updateColumnFocusBorder() {
        const leftCol = document.getElementById('warehouse-left-column');
        const rightCol = document.getElementById('warehouse-right-column');
        if (leftCol && rightCol) {
            leftCol.style.borderColor = state.focusSide === 'left' ? '#88AAFF' : CONFIG.WINDOW_STYLE.BORDER_COLOR;
            rightCol.style.borderColor = state.focusSide === 'right' ? '#88AAFF' : CONFIG.WINDOW_STYLE.BORDER_COLOR;
        }
    }

    function updateHeaderStats() {
        const stats = document.getElementById('warehouse-stats');
        if (!stats) return;
        const leftFilter = getCategoryName(state.filterCategory.left);
        const leftSort = state.sortType.left === 'name' ? '名称' : state.sortType.left === 'id' ? 'ID' : '数量';
        const rightFilter = getCategoryName(state.filterCategory.right);
        const rightSort = state.sortType.right === 'name' ? '名称' : state.sortType.right === 'id' ? 'ID' : '数量';
        stats.innerHTML = `
            <span style="color:#88BBFF;">仓库: 筛选[${leftFilter}] 排序[${leftSort}]</span>
            <span style="color:#88DDBB;">背包: 筛选[${rightFilter}] 排序[${rightSort}]</span>
        `;
    }

    function showItemDetail(itemData) {
        const detailDiv = document.getElementById('item-detail');
        if (!detailDiv) return;
        detailDiv.innerHTML = `<div style="margin-bottom:5px;"><strong style="color:#88BBFF;">${itemData.item.name || '未知物品'}</strong></div><div style="color:#AACCFF;margin-bottom:5px;">数量: ${itemData.count || 0}</div><div style="color:#99AABB;font-size:12px;line-height:1.3;">${itemData.item.description || '暂无描述'}</div><div style="color:#8899AA;font-size:11px;margin-top:5px;">类型: ${getCategoryName(itemData.category)} | ID: ${itemData.id}</div>`;
    }

    function showMessage(text) {
        console.log(text);
    }

    function updateFooterInfo() {
        const warehouseItems = getWarehouseItems();
        const inventoryItems = getInventoryItems();
        const warehouseCount = warehouseItems.reduce((sum, item) => sum + item.count, 0);
        const inventoryCount = inventoryItems.reduce((sum, item) => sum + item.count, 0);
        const footerInfo = document.getElementById('warehouse-footer-info');
        if (footerInfo) footerInfo.textContent = `仓库: ${warehouseItems.length}种/${warehouseCount}个 | 背包: ${inventoryItems.length}种/${inventoryCount}个`;
        updateHeaderStats(); // 同时更新右上角
    }

    function renderAll() {
        renderColumn('left');
        renderColumn('right');
        updateFooterInfo();
    }

    function toggleWindow() {
        if (!state.window) createWindow();
        state.visible = !state.visible;
        if (state.visible) {
            state.window.style.display = 'flex';
            blockGameInputs();
            state.selectedItem = { left: null, right: null };
            state.selectedIndex = { left: 0, right: 0 };
            state.searchText = { left: '', right: '' };
            state.focusSide = 'left';
            renderAll();
            const detailDiv = document.getElementById('item-detail');
            if (detailDiv) detailDiv.style.display = 'block';
        } else {
            state.window.style.display = 'none';
            restoreGameInputs();
            const detailDiv = document.getElementById('item-detail');
            if (detailDiv) detailDiv.style.display = 'none';
        }
    }

    function adjustWindowSize(increase) {
        if (!state.visible || !state.window) return;
        const step = 50;
        let newWidth = state.windowWidth;
        let newHeight = state.windowHeight;
        if (increase) {
            newWidth = Math.min(state.windowWidth + step, CONFIG.WINDOW_SIZE.MAX_WIDTH);
            newHeight = Math.min(state.windowHeight + step, CONFIG.WINDOW_SIZE.MAX_HEIGHT);
        } else {
            newWidth = Math.max(state.windowWidth - step, CONFIG.WINDOW_SIZE.MIN_WIDTH);
            newHeight = Math.max(state.windowHeight - step, CONFIG.WINDOW_SIZE.MIN_HEIGHT);
        }
        if (newWidth !== state.windowWidth || newHeight !== state.windowHeight) {
            state.windowWidth = newWidth; state.windowHeight = newHeight;
            state.window.style.width = `${state.windowWidth}px`; state.window.style.height = `${state.windowHeight}px`;
            renderAll();
        }
    }

    function transferAllItems() {
        const dialog = document.createElement('div');
        dialog.id = 'transfer-all-dialog';
        dialog.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:350px;background:rgba(30,35,45,0.95);border:2px solid #4A6B8A;border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,0.8);z-index:${CONFIG.WINDOW_STYLE.Z_INDEX + 10};padding:20px;display:flex;flex-direction:column;gap:15px;`;
        const title = document.createElement('div'); title.textContent = '全部转移操作'; title.style.cssText = `color:#88BBFF;font-size:18px;font-weight:bold;text-align:center;margin-bottom:10px;`;
        const desc = document.createElement('div'); desc.textContent = '请选择转移方向：'; desc.style.cssText = `color:#CCDDFF;font-size:14px;text-align:center;margin-bottom:10px;`;
        const buttonsDiv = document.createElement('div'); buttonsDiv.style.cssText = `display:flex;flex-direction:column;gap:10px;`;
        const buttonStyle = `padding:12px;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;transition:all 0.2s;`;
        const depositAllBtn = document.createElement('button'); depositAllBtn.textContent = '全部存入：将所有背包物品存入仓库'; depositAllBtn.style.cssText = buttonStyle + `background:linear-gradient(135deg,#2A7A5A,#1A5A3A);color:#FFFFFF;`;
        depositAllBtn.onclick = function() {
            let transferred = 0, totalCount = 0;
            for (let i = 1; i < $dataItems.length; i++) { const item = $dataItems[i]; if (item) { const count = $gameParty.numItems(item); if (count > 0 && depositItem(i, count, 'item')) { transferred++; totalCount += count; } } }
            for (let i = 1; i < $dataWeapons.length; i++) { const item = $dataWeapons[i]; if (item) { const count = $gameParty.numItems(item); if (count > 0 && depositItem(i, count, 'weapon')) { transferred++; totalCount += count; } } }
            for (let i = 1; i < $dataArmors.length; i++) { const item = $dataArmors[i]; if (item) { const count = $gameParty.numItems(item); if (count > 0 && depositItem(i, count, 'armor')) { transferred++; totalCount += count; } } }
            if (transferred > 0) showMessage(`已将 ${transferred} 种物品存入仓库，共计 ${totalCount} 个`); else showMessage('背包中没有可存入的物品');
            renderAll(); document.body.removeChild(dialog);
        };
        const withdrawAllBtn = document.createElement('button'); withdrawAllBtn.textContent = '全部取出：将所有仓库物品取出到背包'; withdrawAllBtn.style.cssText = buttonStyle + `background:linear-gradient(135deg,#3A5F8A,#2A4A6A);color:#FFFFFF;`;
        withdrawAllBtn.onclick = function() {
            let transferred = 0, totalCount = 0;
            for (const id in state.warehouse.items) { const count = state.warehouse.items[id]; if (count > 0 && withdrawItem(parseInt(id), count, 'item')) { transferred++; totalCount += count; } }
            for (const id in state.warehouse.weapons) { const count = state.warehouse.weapons[id]; if (count > 0 && withdrawItem(parseInt(id), count, 'weapon')) { transferred++; totalCount += count; } }
            for (const id in state.warehouse.armors) { const count = state.warehouse.armors[id]; if (count > 0 && withdrawItem(parseInt(id), count, 'armor')) { transferred++; totalCount += count; } }
            if (transferred > 0) showMessage(`已将 ${transferred} 种物品取出到背包，共计 ${totalCount} 个`); else showMessage('仓库中没有物品');
            renderAll(); document.body.removeChild(dialog);
        };
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = '取消'; cancelBtn.style.cssText = buttonStyle + `background:linear-gradient(135deg,#6A3A3A,#4A2A2A);color:#FFFFFF;margin-top:10px;`;
        cancelBtn.onclick = function() { document.body.removeChild(dialog); };
        dialog.appendChild(title); dialog.appendChild(desc); buttonsDiv.appendChild(depositAllBtn); buttonsDiv.appendChild(withdrawAllBtn); buttonsDiv.appendChild(cancelBtn); dialog.appendChild(buttonsDiv);
        dialog.tabIndex = 0;
        dialog.addEventListener('keydown', e => { if (e.keyCode === 27) document.body.removeChild(dialog); e.stopPropagation(); });
        dialog.addEventListener('click', e => e.stopPropagation());
        document.body.appendChild(dialog); dialog.focus();
    }

    // ====================== 键盘处理 ======================
    function handleKeyDown(event) {
        if (state.isTypingInSearch) return;
        if (!state.visible) {
            if (event.code === getKey('toggle')) {
                event.preventDefault(); toggleWindow();
            }
            return;
        }
        const code = event.code;
        if (code === getKey('toggle')) { event.preventDefault(); toggleWindow(); return; }
        if (code === getKey('enlarge')) { event.preventDefault(); adjustWindowSize(true); return; }
        if (code === getKey('reduce')) { event.preventDefault(); adjustWindowSize(false); return; }
        if (code === getKey('transferAll')) { event.preventDefault(); transferAllItems(); return; }
        if (code === 'Escape') { event.preventDefault(); toggleWindow(); return; }
        if (code === getKey('focusToggle')) {
            event.preventDefault();
            state.focusSide = state.focusSide === 'left' ? 'right' : 'left';
            updateColumnFocusBorder();
            SoundManager.playCursor();
            return;
        }
        const side = state.focusSide;
        if (code === getKey('moveUp')) {
            event.preventDefault();
            const items = side === 'left' ? getWarehouseItems() : getInventoryItems();
            if (items.length > 0) {
                if (state.selectedIndex[side] > 0) state.selectedIndex[side]--;
                else state.selectedIndex[side] = items.length - 1;
                state.selectedItem[side] = items[state.selectedIndex[side]] || null;
                renderColumn(side);
                SoundManager.playCursor();
            }
            return;
        }
        if (code === getKey('moveDown')) {
            event.preventDefault();
            const items = side === 'left' ? getWarehouseItems() : getInventoryItems();
            if (items.length > 0) {
                if (state.selectedIndex[side] < items.length - 1) state.selectedIndex[side]++;
                else state.selectedIndex[side] = 0;
                state.selectedItem[side] = items[state.selectedIndex[side]] || null;
                renderColumn(side);
                SoundManager.playCursor();
            }
            return;
        }
        if (code === getKey('moveLeft') || code === getKey('moveRight')) {
            event.preventDefault();
            const isLeft = code === getKey('moveLeft');
            const items = side === 'left' ? getWarehouseItems() : getInventoryItems();
            if (items.length === 0 || !state.selectedItem[side]) return;
            const itemData = state.selectedItem[side];
            const amount = event.shiftKey ? itemData.count : 1;
            let success = false;
            if (isLeft) {
                if (side === 'right') success = depositItem(itemData.id, amount, itemData.type);
            } else {
                if (side === 'left') success = withdrawItem(itemData.id, amount, itemData.type);
            }
            if (success) {
                SoundManager.playOk();
                renderAll();
            } else {
                SoundManager.playBuzzer();
            }
            return;
        }
        if (code === getKey('filterNext')) {
            event.preventDefault();
            state.filterCategory[side] = (state.filterCategory[side] + 1) % 6;
            renderColumn(side);
            SoundManager.playCursor();
            return;
        }
        if (code === getKey('sortNext')) {
            event.preventDefault();
            const sorts = ['name', 'id', 'count'];
            const idx = sorts.indexOf(state.sortType[side]);
            state.sortType[side] = sorts[(idx + 1) % sorts.length];
            renderColumn(side);
            SoundManager.playCursor();
            return;
        }
        if (code === getKey('pageUp')) {
            event.preventDefault();
            if (state.currentPage[side] > 1) { state.currentPage[side]--; renderColumn(side); SoundManager.playCursor(); }
            return;
        }
        if (code === getKey('pageDown')) {
            event.preventDefault();
            const items = side === 'left' ? getWarehouseItems() : getInventoryItems();
            const totalPages = Math.max(1, Math.ceil(items.length / CONFIG.ITEM_DISPLAY.ITEMS_PER_PAGE));
            if (state.currentPage[side] < totalPages) { state.currentPage[side]++; renderColumn(side); SoundManager.playCursor(); }
            return;
        }
    }

    // ====================== 初始化 ======================
    function init() {
        console.log("初始化增强版仓库系统...");
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); return; }
        createWindow();
        document.addEventListener('keydown', handleKeyDown, true);
        if (state.window) {
            state.window.addEventListener('keydown', e => e.stopPropagation());
            state.window.addEventListener('click', e => e.stopPropagation());
            state.window.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
        }
        const detailDiv = document.createElement('div');
        detailDiv.id = 'item-detail';
        detailDiv.style.cssText = `position:fixed;bottom:60px;right:20px;width:250px;height:120px;background:rgba(20,25,35,0.9);border:1px solid rgba(80,110,150,0.7);border-radius:6px;padding:10px;color:#CCDDFF;font-size:13px;z-index:${CONFIG.WINDOW_STYLE.Z_INDEX + 1};display:none;box-shadow:0 0 15px rgba(0,0,0,0.5);`;
        document.body.appendChild(detailDiv);
        if (DataManager.makeSaveContents) {
            const originalMakeSaveContents = DataManager.makeSaveContents;
            DataManager.makeSaveContents = function() { const contents = originalMakeSaveContents.call(this); contents.warehouse = state.warehouse; return contents; };
        }
        if (DataManager.extractSaveContents) {
            const originalExtractSaveContents = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function(contents) { originalExtractSaveContents.call(this, contents); state.warehouse = contents.warehouse || { items: {}, weapons: {}, armors: {} }; $gameSystem._warehouse = state.warehouse; };
        }
        console.log("增强版仓库系统初始化完成！");
    }

    // 注册到 KeyMapper（不依赖 init，立即尝试）
    function tryRegisterToKeyMapper() {
        if (window.KeyMapper && typeof window.KeyMapper.registerScript === 'function') {
            window.KeyMapper.registerScript('仓库系统', CONFIG.DEFAULT_KEYS, {
                toggle: '打开/关闭仓库',
                enlarge: '放大窗口',
                reduce: '缩小窗口',
                transferAll: '全部转移',
                focusToggle: '切换焦点列',
                moveUp: '上移选择',
                moveDown: '下移选择',
                moveLeft: '向左转移（背包→仓库）',
                moveRight: '向右转移（仓库→背包）',
                filterNext: '切换分类筛选',
                sortNext: '切换排序方式',
                pageUp: '上一页',
                pageDown: '下一页'
            });
            return true;
        }
        return false;
    }

    if (!tryRegisterToKeyMapper()) {
        let attempts = 0;
        const timer = setInterval(function() {
            if (tryRegisterToKeyMapper() || ++attempts > 20) clearInterval(timer);
        }, 100);
    }

    // 启动初始化
    init();
})();