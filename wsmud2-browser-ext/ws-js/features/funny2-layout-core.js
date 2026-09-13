// funny2-layout-core.js
// 武神传说 MUD 界面布局 —— 核心布局初始化（三栏布局、样式、频道标签、角色信息面板结构）
"use strict";

window.__funny2_layout = window.__funny2_layout || {};

(function () {
    var layout = window.__funny2_layout;

    // ========== 三栏布局（BODY） ==========
    layout.initLayoutBody = function () {
        /********************BODY********************/
        GM_addStyle([
            'body { width: 100%; display: flex; flex-flow: row nowrap; }',
            '.container, .login-content { width: 400px; flex: 1 0 auto; margin: 0; }',
            '.left, .right { width:390px; height:100%; flex: 0 0 auto; margin: 0 10px; }',
        ].join('\n'));

        $("body").append(
            $('<div class="left"></div>'),
            $('<div class="right"></div>')
        );

        // 同步游戏主界面(.container)的字体设置到左右侧栏
        (function syncContainerFont() {
            function applyFont() {
                var container = document.querySelector('.container');
                if (!container) return;
                var style = getComputedStyle(container);
                // 左右栏及两侧日志统一继承游戏主界面字体（不受第三方脚本/fork主题的字号干扰）
                $('.left, .right, .WG_left_log, .WG_right_log').css({
                    'font-family': style.fontFamily,
                    'font-size': style.fontSize
                });
            }
            var timer = setInterval(function () {
                if (!document.querySelector('.container')) return;
                clearInterval(timer);
                applyFont();
                // 游戏内修改字体(font/fontsize)时同步生效
                var observer = new MutationObserver(function () { applyFont(); });
                observer.observe(document.querySelector('.container'), {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }, 300);
        })();

        function confirmWight() {
            // 【2026-09-06 修复】游戏本体把 dialog-confirm append 到 body（包含块为 body），
            // 三栏布局下用「视口宽-左右栏宽」估算 left/width 既不准确也易受 margin 干扰。
            // 改为把 dialog-confirm 移到 .container 内：container 是 position:relative，
            // 游戏原版 CSS（position:absolute; left:0; bottom:0; width:100%）即自动贴合 container。
            var d = document.querySelector('.dialog-confirm');
            var c = document.querySelector('.container');
            if (!d || !c) return;
            if (!c.contains(d)) {
                c.appendChild(d);
            }
        }

        (function moveAndStyleToolbar() {
            function getElement(selector) { return document.querySelector(selector); }
            function moveElementIfNeeded(sourceSelector, targetSelector) {
                var sourceElement = getElement(sourceSelector);
                var targetContainer = getElement(targetSelector);
                if (sourceElement && targetContainer && !targetContainer.contains(sourceElement)) {
                    targetContainer.appendChild(sourceElement);
                }
            }
            function attemptMove() {
                var moveTasks = [
                    { source: '#raidToolbar', target: 'body > div.left > div.left-hotkeys' },
                    { source: '.WG_left_log', target: 'body > div.left > div.left-hotkeys' },
                    { source: '.WG_right_log', target: 'body > div.right' },
                    { source: '.channel', target: 'body > div.right > div.right-channel' }
                ];
                moveTasks.forEach(function (task) {
                    moveElementIfNeeded(task.source, task.target);
                });
            }
            attemptMove();
            var observer = new MutationObserver(function () { attemptMove(); });
            observer.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
            window.__toolbarObserver__ = observer;
        })();

        confirmWight();
        window.addEventListener('resize', function () { confirmWight(); });
        // 【2026-09-06 兜底】dialog-confirm 是游戏登录时 Confirm.Init() 才创建，扩展注入时可能尚不存在；
        // 监视 body 变化，一旦出现即移入 .container
        if (!confirmWight()) {
            var _cfObserver = new MutationObserver(function () {
                if (confirmWight() && _cfObserver) {
                    _cfObserver.disconnect();
                    _cfObserver = null;
                }
            });
            _cfObserver.observe(document.body, { childList: true, subtree: true });
            window.__cfObserver__ = _cfObserver;
        }
    };

    // ========== 右侧栏（RIGHT） ==========
    layout.initRightColumn = function () {
        /********************RIGHT********************/
        GM_addStyle([
            '.right{ order: 1; display: flex; flex-direction: column; flex-wrap: nowrap; }',
            '.right-channel { width: 100%; flex: 0 0 50%; margin: 8px; overflow: auto; display: flex; flex-direction: column; position: relative; min-height: 0; background: var(--ws-card); }',
            '.channel { max-height: 90% !important; flex: 1; overflow: auto;}',
            '.right .channel > pre { font-family: inherit !important; font-size: inherit !important; }',
            '.right-channel-tabs { flex-shrink: 0; display: flex; gap: 2px; padding: 4px 6px; background: var(--ws-card); border-top: 1px solid var(--ws-border); }',
            '.right-channel-tabs > span { cursor: pointer; padding: 2px 8px; border-radius: 3px; color: var(--ws-text-dim); }',
            '.right-channel-tabs > span:hover { background: var(--ws-card-hover); color: var(--ws-text); }',
            '.right-channel-tabs > span.selected { background: rgba(65,217,183,.18); color: var(--ws-cyan); }',
            '.WG_right_log { width: 100%; flex: 1; margin: 8px; overflow: auto; min-height: 0; max-height: none !important; display: flex; flex-direction: column; }',
            '.WG_right_log_title { color: var(--ws-cyan); font-weight: bold; padding: 4px 10px; border-bottom: 1px solid var(--ws-border); flex-shrink: 0; }',
            '.WG_right_log > pre { flex: 1; overflow-y: auto; font-family: "JetBrains Mono", monospace; }',
            '.right-divider { height: 5px; cursor: row-resize; background: var(--ws-border); flex-shrink: 0; position: relative; z-index: 1; display: none; }',
            '.right-divider:hover, .right-divider.active { background: var(--ws-cyan); }',
        ].join('\n'));

        $(".right").append(
            $('<div class="right-channel"></div>'),
            $('<div class="right-divider"></div>')
        );

        // 可拖拽分割线
        (function () {
            var rightDivider = document.querySelector('.right-divider');
            var rightChannel = document.querySelector('.right-channel');
            var isDragging = false;
            rightDivider.addEventListener('mousedown', function (e) {
                isDragging = true;
                rightDivider.classList.add('active');
                e.preventDefault();
            });
            document.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                var rightEl = document.querySelector('.right');
                var rect = rightEl.getBoundingClientRect();
                var offsetY = e.clientY - rect.top;
                var percent = Math.max(10, Math.min(90, (offsetY / rect.height) * 100));
                rightChannel.style.flex = '0 0 ' + percent + '%';
            });
            document.addEventListener('mouseup', function () {
                if (isDragging) {
                    isDragging = false;
                    rightDivider.classList.remove('active');
                }
            });
        })();

        // 创建右侧频道标签栏
        var _channelTabData = [['全部', ''], ['世界', 'chat'], ['队伍', 'tm'], ['门派', 'fam'], ['全区', 'es'], ['帮派', 'pty'], ['系统', 'sys']];
        var _channelTabBar = $('<div class="right-channel-tabs" style="display:none;"></div>');
        _channelTabData.forEach(function (item, idx) {
            var tab = $('<span for="' + item[1] + '">' + item[0] + '</span>');
            if (idx === 0) tab.addClass('selected');
            tab.on('click', function () {
                _channelTabBar.find('span').removeClass('selected');
                $(this).addClass('selected');
                var channel = $(this).attr('for') || '';
                if (typeof Dialog !== 'undefined' && Dialog.channel && Dialog.channel.footerChanged) {
                    Dialog.channel.footerChanged(channel);
                }
            });
            _channelTabBar.append(tab);
        });

        // 持续监控：确保 .channel 在 .right-channel 内，且排在频道标签栏之前
        // 双击 .channel 时游戏会把它移进弹窗，若用 appendTo 放回末尾会把标签栏挤到上方
        setInterval(function () {
            var $channel = $('.channel');
            var $rightChannel = $('.right-channel');
            if ($channel.length > 0 && $rightChannel.length > 0) {
                if (!$rightChannel.is($channel.parent())) {
                    $rightChannel.prepend($channel);
                } else {
                    var $tabs = $rightChannel.children('.right-channel-tabs');
                    if ($tabs.length && $tabs.index() < $channel.index()) {
                        $rightChannel.prepend($channel);
                    }
                }
                $channel.off('click');
                if (typeof GameState !== 'undefined' && GameState.id) {
                    if (_channelTabBar.parent().length === 0) {
                        $rightChannel.append(_channelTabBar);
                    }
                    _channelTabBar.show();
                    $('.right-divider').show();
                } else {
                    _channelTabBar.hide();
                    $('.right-divider').hide();
                }
            }
        }, 200);
    };

    // ========== 左侧栏（LEFT） ==========
    layout.initLeftColumn = function () {
        /********************LEFT********************/
        GM_addStyle([
            '.left { height: calc(100vh - 20px); order: -1; display: flex; flex-direction: column; flex-wrap: nowrap; }',
            '.left-content { width: 100%; height: auto; flex: 0 0 auto;}',
            '.left-hotkeys { width: 100%; flex: 1; padding-left: 5px; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }',
            /* 【2026-09-08 修复】主题1(master)下 WG_left_log 也正确撑满左栏：flex 列布局 + pre 撑满并滚动
               与右侧 WG_right_log 同模式；与 主题2(fork) 对齐，切换主题时内部排版一致 */
            '.WG_left_log { display: flex !important; flex-direction: column; width: 100%; flex: 1 1 auto; max-height: none !important; min-height: 0; overflow: hidden; box-sizing: border-box; }',
            '.left-hotkeys > .WG_left_log { width: 100% !important; flex: 1 1 auto !important; min-height: 0 !important; box-sizing: border-box !important; }',
            '.WG_left_log, .WG_left_log * { box-sizing: border-box !important; }',
            '.WG_left_log > pre { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; margin: 0; font-family: "JetBrains Mono", monospace; }',
            '.WG_left_log .item-commands { padding-bottom: 0 !important; margin: 0 !important; }',
            '.map-panel { display: flex; justify-content: center; overflow-x: auto; }',
            '.map-panel svg.map { flex-shrink: 0; }',
        ].join('\n'));

        $(".left").append(
            $('<div class="left-content"></div>'),
            $('<div class="left-hotkeys"></div>')
        );
    };

    // ========== 左侧角色信息面板（LEFT-CONTENT） ==========
    layout.initLeftContent = function () {
        /********************LEFT-CONTENT********************/
        GM_addStyle([
            '.left-content { margin: 10px 0; overflow: auto; }',
            '.left-content { display: flex; flex-direction: column; flex-wrap: nowrap; }',
            '.content-title { flex: 0 0 auto; border: var(--ws-border) solid 1px; border-radius: 8px; display: flex; background: var(--ws-card); }',
            '.content-info { flex: 0 1 auto; border: var(--ws-border) solid 1px; border-radius: 8px; margin-top: 5px; overflow: auto; background: var(--ws-card); }',
            '.info-row { display: flex; }',
            '.info-item { flex: 0 1 999px; dispaly: inline-block; text-align: center; }',
            '.info-title { flex: 0 0 65px; dispaly: inline-block; text-align: center; }',
            '.item-row { display: flex; border-bottom: var(--ws-line) dotted 0.5px; }',
            '.item-name { cursor: pointer; }',
            '.item-count { dispaly: inline-block; text-align: right; flex: 1 0 auto; }',
        ].join('\n'));

        $(".left-content").append(
            $('<div class="content-title"></div>'),
            $('<div class="content-info"></div>')
        );
        $(".content-info").show();
        $(".content-title").append(
            $('<span>　</span>'), $('<hiy class="role_family">门派</hiy>'), $('<span>　</span>'),
            $('<span class="role_level">LEVEL</span>'), $('<span>　</span>'),
            $('<hic class="role_name">NAME</hic>'), $('<span>　</span>'),
            $('<hiw class="role_id">ID</hiw>')
        );

        $(".content-info").append(
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">经验<span>'),
                $('<span class="info-item role_exp">999999<span>'),
                $('<span class="info-title">潜能<span>'),
                $('<span class="info-item role_pot">999999<span>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">气血<span>'),
                $('<span class="info-item"><hir class="role_hp">0</hir> / <span class="role_max_hp">999999</span><span>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">内力<span>'),
                $('<span class="info-item"><hic class="role_mp">0</hic> / <span class="role_max_mp">999999</span><span>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">臂力<span>'),
                $('<span class="info-item"><hiy class="role_str">15</hiy> + <span class="role_str_add">999</span><span>'),
                $('<span class="info-title">根骨<span>'),
                $('<span class="info-item"><hiy class="role_con">15</hiy> + <span class="role_con_add">999</span><span>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">身法<span>'),
                $('<span class="info-item"><hiy class="role_dex">15</hiy> + <span class="role_dex_add">999</span><span>'),
                $('<span class="info-title">悟性<span>'),
                $('<span class="info-item"><hiy class="role_int">15</hiy> + <span class="role_int_add">999</span><span>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">攻击<span>'),
                $('<hig class="info-item role_gj">99999<hig>'),
                $('<span class="info-title">命中<span>'),
                $('<hig class="info-item role_mz">99999<hig>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">防御<span>'),
                $('<hig class="info-item role_fy">99999<hig>'),
                $('<span class="info-title">招架<span>'),
                $('<hig class="info-item role_zj">99999<hig>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">躲闪<span>'),
                $('<hig class="info-item role_ds">99999<hig>'),
                $('<span class="info-title">攻速<span>'),
                $('<hig class="info-item role_gjsd">99999<hig>')
            ),
            $('<div class="info-row"></div>').append(
                $('<span class="info-title">财产<span>'),
                $('<span class="info-item role_money">999999两<hiy>黄金</hiy><span>')
            )
        );
    };
})();