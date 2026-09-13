// ============================================================
// theme-fork.js —— Fork 分支界面主题（主题2）
// ------------------------------------------------------------
// 在 Master DOM 结构上，用 CSS 模拟 Fork 的视觉风格。
// 关键约束：Master 把 #raidToolbar + .WG_left_log 都塞进了 .left-hotkeys，
// 右侧则是 .WG_right_log 直接放在 .right 栏内。
// 我们不改变 DOM，只用 CSS 让各元素各司其职。
// ============================================================
(function () {
    "use strict";

    // 防重复加载：动态切换时 loadScript 可能重复调用
    if (window.__wsmudThemeApplied) return;
    window.__wsmudThemeApplied = true;

    var _injectedStyles = [];

    function addThemeStyle(css) {
        var style = document.createElement("style");
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        _injectedStyles.push(style);
    }

    // ===== Fork 主题 CSS 变量 =====
    addThemeStyle(`
      :root {
        --ext-border: #666666;
        --ext-text: #999999;
        --ext-text-bright: #c0c0c0;
        --ext-hover: #00ff00;
        --ext-gold: #FFD700;
        --ext-dim: #808080;
      }
    `);

    // ===== 三栏宽度 + 间距（Fork 风格） =====
    addThemeStyle(`
      body > div.left, body > div.right {
        flex: 0 0 390px !important;
        min-width: 390px !important;
        max-width: 390px !important;
        margin: 0 5px !important;
        padding: 4px !important;
        box-sizing: border-box !important;
      }
    `);

    // ===== 左侧角色信息面板（精确还原 Fork 原版 26.1.11） =====
    // Master 的 content-title DOM 是**扁平的**（hiy.role_family, span.role_level, hic.role_name, hiw.role_id
    // 直接作为 .content-title 子元素，中间还有空白 span 加间距），
    // 而 Fork 原版是 div.role-family / div.role-name / div.role-id 三层包裹。
    // 我们用 CSS 让 Master 的扁平 DOM 模拟 Fork 的 grid 布局。
    addThemeStyle(`
      .left-content { margin: 6px 0 !important; flex: 0 0 auto !important; }

      /* content-title：Fork 原版效果，但适配 Master 的扁平 DOM */
      /* 用 flexbox 而非 grid 避免重叠问题（Master 的 role_family 和 role_level 是兄弟元素，
         grid 同一个 cell 会重叠） */
      .content-title {
        flex: 0 0 auto !important;
        border: 1px solid rgba(0,128,0,.12) !important;
        border-radius: 6px !important;
        background: transparent !important;
        padding: 4px 8px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: baseline !important;
        gap: 2px 8px !important;
      }

      /* 隐藏 Master 用来加间距的空白 span（全角空格） */
      .content-title > span:empty,
      .content-title > span:not([class]):not(.info-title):not(.info-item) { display: none !important; }

      /* 门派 + 等级：左上同行 */
      .content-title > .role_family, .content-title > .role_level {
        display: inline !important; font-size: 12px !important; color: #808080 !important;
      }
      .content-title > .role_level { margin-left: 4px !important; }

      /* 名字：右上，margin-left:auto 推到右边 */
      .content-title > .role_name {
        margin-left: auto !important; white-space: nowrap !important;
        font-size: 14px !important; color: #FFD700 !important; font-weight: 600 !important;
      }

      /* UID：左下，独占一行 */
      .content-title > .role_id {
        flex: 0 0 100% !important;
        display: inline !important; font-size: 11px !important; color: #666666 !important;
      }

      /* content-info：Fork 原版精确值 */
      .content-info {
        flex: 1 1 auto !important;
        border: 1px solid rgba(0,128,0,.12) !important;
        border-radius: 6px !important;
        background: transparent !important;
        padding: 2px 4px !important;
        margin-top: 4px !important;
        overflow: auto !important;
      }

      /* info-row：Fork 原版精确值（grid 4 列对齐） */
      .info-row {
        display: grid !important;
        grid-template-columns: 52px 1fr 52px 1fr !important;
        align-items: center !important;
        gap: 2px 10px !important;
        padding: 2px 4px !important;
        border-bottom: 1px solid rgba(0,128,0,.07) !important;
      }
      .info-row:last-child { border-bottom: none !important; }
      .info-title { font-size: 13px !important; color: #808080 !important; text-align: left !important; }
      .info-item { font-family: inherit !important; font-size: 13px !important; color: #c0c0c0 !important; text-align: left !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

      /* Fork 26.1.10 规则：气血/内力/财产三行跨列占满（数值长需要换行） */
      .info-row:has(.role_hp) .info-item,
      .info-row:has(.role_mp) .info-item,
      .info-row:has(.role_money) .info-item {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        word-break: break-all !important;
        grid-column: 2 / -1 !important;
      }

      /* 数值指示色降饱和（融入深底色不撞色） */
      .role_hp { color: #b85450 !important; }
      .role_mp { color: #6a9aa8 !important; }
      .role_money { color: #b5a070 !important; }
    `);

    // ===== left-hotkeys 内部 flex 分配 =====
    // Master 把所有东西都塞进 left-hotkeys，右侧日志 .WG_right_log 直接在 .right 栏内
    // 方案：让按钮行和 #raidToolbar 不贪心，.WG_left_log 贪心吃剩余
    addThemeStyle(`
      /* left-hotkeys 整体：保留 Master 的 flex-direction:column + flex:1（才能让内部 WG_left_log 撑开），
         但覆盖 padding 和 box-sizing 为 Fork 风格 */
      .left-hotkeys {
        flex: 1 1 auto !important;
        overflow: hidden !important;
        padding: 5px !important;
        box-sizing: border-box !important;
      }

      /* 按钮行 div：不贪心，用 Master 的天然 inline 流式换行（每行约 8 个按钮），
         不用 grid 约束（Fork 的 6 列 grid 会在 Master 8 按钮布局下触发自动换行） */
      .left-hotkeys > div:not(#raidToolbar):not(.WG_left_log) {
        flex: 0 0 auto !important;
        margin-bottom: 4px !important;
      }

      /* #raidToolbar：横排 flex，作为 left-hotkeys 子元素时不贪心 */
      .left-hotkeys > #raidToolbar {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        flex: 0 0 auto !important;
        width: 100% !important;
        overflow-x: auto !important;
        grid-template-columns: none !important;
      }
      .left-hotkeys > #raidToolbar > .raidToolbar {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        width: 100% !important;
        margin: 5px 0 !important;
        overflow-x: auto !important;
      }

      /* .WG_left_log：Fork 原版两层规则合并
         第一层（funny2-layout）：width:100%; height:100%; flex:1; overflow:auto; max-height:none
         第二层（GM_addStyle 追加）：border + padding + border-radius + box-sizing: border-box + background */
      .WG_left_log {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        flex: 1 1 auto !important;
        max-height: none !important;
        min-height: 0 !important;
        overflow: auto !important;
        border: 1px solid rgba(0,128,0,.16) !important;
        border-radius: 10px !important;
        padding: 6px 8px !important;
        box-sizing: border-box !important;
        background: transparent !important;
        margin: 0 !important;
      }
      .WG_left_log * { box-sizing: border-box !important; }
      /* Fork 原版：WG_left_log pre 只改字体继承，**不加 display:flex/white-space**，
         因为 pre 内部混合了 inline span 和 block div，
         浏览器会自动修复非法嵌套（block 变兄弟元素），按默认 pre 渲染即可 */
      .WG_left_log > pre { margin: 0 !important; }
      /* 覆盖游戏原生 .item-commands 的 padding-bottom
         （游戏给它加了 padding-bottom: 0.315em 导致额外空白/下沉感） */
      .WG_left_log .item-commands { padding-bottom: 0 !important; margin: 0 !important; }
      /* 确保 WG_left_log 作为 left-hotkeys 子元素时也正确撑满 */
      .left-hotkeys > .WG_left_log {
        width: 100% !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        margin-top: 0 !important;
      }
      /* WG_left_log 内部 pre 继承 Fork 样式 */
      .WG_left_log pre {
        font-family: inherit !important;
        font-size: inherit !important;
        color: #c0c0c0 !important;
        line-height: 1.65 !important;
      }
    `);

    // ===== .span-btn（左栏快捷按钮）Fork 风格 =====
    // Fork 原版精确尺寸：padding:4px 6px, font-size:12px, margin:0 4px 4px 0
    // 关键覆盖：left-hotkeys 内的按钮 margin 归零（grid gap 接管），字号继承父级 0.9em
    addThemeStyle(`
      .span-btn,
      .hic.span-btn, .hig.span-btn, .hiz.span-btn, .hio.span-btn,
      .hir.span-btn, .hiy.span-btn, .hip.span-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        border: 1px solid #666666 !important;
        border-radius: 3px !important;
        padding: 4px 10px !important;
        font-size: 12px !important;
        margin: 0 !important;
        background: #000000 !important;
        color: #999999 !important;
        transition: color .15s ease, border-color .15s ease, background .15s ease !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      .span-btn:hover,
      .hic.span-btn:hover, .hig.span-btn:hover, .hiz.span-btn:hover,
      .hio.span-btn:hover, .hir.span-btn:hover, .hiy.span-btn:hover, .hip.span-btn:hover {
        color: #000000 !important;
        border-color: #999999 !important;
        background: #999999 !important;
      }
      .span-btn:active { background: #666666 !important; color: #000000 !important; }
    `);

    // ===== Raid 工具栏 Fork 风格（统一灰色，无 tab 颜色区分） =====
    addThemeStyle(`
      .raidToolbar {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        overflow-x: auto !important;
      }
      #raidToolbar .raid-item {
        border: 1px solid #666666 !important;
        color: #999999 !important;
        background: #000000 !important;
        border-radius: 3px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 0.9em !important;
        margin: 2px 3px 2px 0 !important;
        padding: 0 6px !important;
        flex: 0 1 auto !important;
        min-width: 0 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }
      /* 强制 raid-item 内所有 hi* 子元素统一灰色（去掉 tab 颜色区分） */
      #raidToolbar .raid-item hiy, #raidToolbar .raid-item hig,
      #raidToolbar .raid-item hiz, #raidToolbar .raid-item hio,
      #raidToolbar .raid-item hic, #raidToolbar .raid-item hir,
      #raidToolbar .raid-item hip, #raidToolbar .raid-item hij { color: #999999 !important; }
      #raidToolbar .raid-item:hover {
        color: #00ff00 !important;
        border-color: rgba(0,255,0,.6) !important;
      }
      #raidToolbar .raid-item:hover hiy, #raidToolbar .raid-item:hover hig,
      #raidToolbar .raid-item:hover hiz, #raidToolbar .raid-item:hover hio,
      #raidToolbar .raid-item:hover hic, #raidToolbar .raid-item:hover hir,
      #raidToolbar .raid-item:hover hip, #raidToolbar .raid-item:hover hij { color: #00ff00 !important; }
    `);

    // ===== 右侧频道标签 Fork 风格 =====
    // 【2026-09-08 移除】多频道切换改与 主题1(master) 一致，删除 fork 专属标签样式，走 wg-core 公共 channel-tabs 规则

    // ===== 可拖拽分隔条 Fork 风格 =====
    addThemeStyle(`
      .left-col-resizer, .right-col-resizer { background: rgba(0,128,0,.14) !important; }
      .left-col-resizer:hover, .left-col-resizer.dragging, .right-col-resizer:hover, .right-col-resizer.dragging { background: rgba(0,128,0,.4) !important; }
      .right-divider { background: rgba(0,128,0,.14) !important; }
      .right-divider:hover, .right-divider.active { background: rgba(0,128,0,.4) !important; }
    `);

    // ===== 卡片描边 Fork 风格 =====
    // Fork 原版只有 WG_right_log 和 content-message 有描边，WG_left_log 本身没有
    addThemeStyle(`
      .content-message {
        border: 1px solid rgba(0,128,0,.16) !important;
        border-radius: 12px !important;
      }
      .WG_right_log {
        padding: 6px 8px !important;
        width: 100% !important;
        max-height: none !important;
        box-sizing: border-box !important;
        background: transparent !important;
      }
    `);

    // ===== Master 额外清掉的污染样式 =====
    addThemeStyle(`
      /* WG_right_log 字体：JetBrains Mono，缺失时回退等宽字体 */
      .WG_right_log > pre { font-family: 'JetBrains Mono', monospace !important; font-size: inherit !important; }
      /* 日志区 WG_right_log 内部 pre 同样使用 JetBrains Mono（不设 line-height，与主题1的默认紧凑行距保持一致） */
      .right > .WG_right_log pre { font-family: 'JetBrains Mono', monospace !important; font-size: inherit !important; color: #c0c0c0 !important; }
      .content-message pre { font-family: inherit !important; font-size: inherit !important; line-height: 1.65 !important; }
    `);

    // ===== 注册清理函数 =====
    window.__wsmudThemeCleanup = function () {
        _injectedStyles.forEach(function (style) {
            if (style.parentNode) style.parentNode.removeChild(style);
        });
        _injectedStyles = [];
        window.__wsmudThemeApplied = false;
    };

    // ===== 监听主题切换消息 =====
    // content.js 在 popup 切换主题时发 postMessage({ __EXT_BRIDGE__: true, action: 'themeChanged', theme: ... })
    // 这里监听消息，当切回 Master 时自动清理，比 content.js 的 rmScript 方式更可靠
    window.addEventListener('message', function _onThemeChange(e) {
        if (e.data && e.data.__EXT_BRIDGE__ && e.data.action === 'themeChanged') {
            if (e.data.theme !== 'fork') {
                // 切回 Master：清理自己注入的样式
                window.__wsmudThemeCleanup();
                window.removeEventListener('message', _onThemeChange);
            }
        }
    });

    console.log('[WSMUD] 主题2 (Fork) 已应用');
})();
