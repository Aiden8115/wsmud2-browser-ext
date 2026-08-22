// ============================================================
// main-ready.js —— 页面就绪后的启动动作
// ------------------------------------------------------------
// 游戏页面加载完成后（document ready）执行：
//   1. 引入几个外部样式（右键菜单样式、layer 弹窗样式、图标字体）
//   2. 挂上输入框（UI.codeInput —— 游戏内命令行）
//   3. 初始化 KEY（快捷键）、WG（主框架）、GlobalInit（数据同步）
//   4. 把一堆功能对象暴露到全局（unsafeWindow.xxx），方便游戏内调用
//   5. 注册右键菜单：常用地点传送、自动、设置等
//   6. 处理从其它地方（比如游戏内 iframe）postMessage 过来的命令
// ============================================================
'use strict';

var originWindow = {};
$(document).ready(function () {
    // 【2026-08-14 CDN 样式本地化】右键菜单 / layer / font-awesome 样式原走第三方 CDN
    // （CDN 挂掉界面样式即丢失）。已改为 content.js 在 document_start 注入扩展本地文件
    // （ws-js/lib/skin/ 下的 jquery.contextMenu.min.css、layer.css、font-awesome.css），此处不再引用 CDN。
    // 挂上游戏内命令行输入框（UI.codeInput 在 ui.js 里定义）
    $('body').append(UI.codeInput);
    // 【2026-08-20】游戏内命令行输入框支持 Tab 缩进
    try { enableTabIndent(document.getElementById('testmain')); } catch (e) { }

    // ---- 初始化三大核心 ----
    KEY.init();              // 快捷键
    WG.init();               // 插件主框架（wg-core.js）
    GlobalInit.init();       // 数据同步中枢（global-init.js）

    // ---- 暴露到全局：让游戏页面任何地方都能直接用这些对象 ----
    unsafeWindow.WG = WG;                 // 插件主接口（SendCmd、setting 等）
    unsafeWindow.TaskHelper = TaskHelper; // 自命令函数库（别名 T）
    unsafeWindow.LayerHelper = LayerHelper; // 弹窗助手
    unsafeWindow.GameState = GameState;   // 全局状态
    unsafeWindow.show_msg = show_msg;     // 显示消息
    unsafeWindow.messageClear = messageClear; // 清空日志
    unsafeWindow.messageAppend = messageAppend; // 追加日志
    unsafeWindow.send_cmd = send_cmd;     // 发命令（走队列）
    unsafeWindow.roomData = roomData;     // 房间数据
    unsafeWindow.MusicBox = MusicBox;     // 八音盒（音乐播放）
    unsafeWindow.FakerTTS = FakerTTS;     // 语音朗读
    unsafeWindow.Push = Push;             // 远程推送（Server酱等）
    unsafeWindow.WSStore = store;         // 存储封装
    unsafeWindow.imgShow = imgShow;       // 图片显示

    // ---- 监听其它窗口 postMessage 发来的命令 ----
    // （游戏内嵌 iframe 或用户粘贴命令时会走到这里）
    window.addEventListener("message", receiveMessage, false);

    function receiveMessage(event) {
        // 【2026-08-14 安全加固】校验 postMessage 来源，防止第三方 iframe / 陌生窗口注入命令：
        //   ✓ event.source === window            —— 本窗口自身脚本（游戏本体 / 扩展注入脚本）
        //   ✓ event.source === window.opener     —— 通过 window.open 打开本页的外部登录器
        //   ✓ event.origin === location.origin   —— 游戏站自己的 iframe
        //   其余来源一律忽略（尤其阻止跨站 iframe 触发 #js 任意代码执行 / denglu 自动登录）
        if (event.source !== window && event.source !== window.opener &&
            event.origin !== location.origin) {
            return;
        }
        originWindow = event;
        var origin = event.origin;
        var data = event.data;
        // 自动登录辅助：收到 "denglu 用户名" 时自动选择对应角色
        if (String(data).indexOf("denglu") >= 0) {
            if (role != undefined) {   // 已经登录了就不用
                return;
            }
            let userName = String(data).split(" ")[1];   // 取出用户名
            let userList = $('#role_panel > ul > li.content > ul >li');  // 角色列表
            for (let user of userList) {
                // 高亮匹配的角色
                if (user.innerText.indexOf(userName) >= 0) {
                    $(user).addClass("select");
                } else {
                    $(user).removeClass("select");
                }
            }
            $("li[command=SelectRole]").click()   // 点"选择角色"
            return;
        }
        // 是 JSON 数据就忽略（游戏协议消息不走这里）
        try {
            if (JSON.parse(data) instanceof Object) {
                return;
            }
        } catch (error) {
            console.log("Run at message");
        }
        // 文本命令处理
        if (typeof data == 'string') {
            //包含setImmediate 跳过
            if (data.indexOf("setImmediate") >= 0) {
                return;
            }
            if (data === '挖矿' || data === '修炼') {   // 快捷词：挖矿/修炼
                WG.zdwk();
            } else if (data === '挂机') {                // 快捷词：挂机 = 停止挂机
                WG.SendCmd("stopstate");
            } else {
                if (data.split("\n")[0].indexOf("//") >= 0) {   // // 开头 = Raid 流程
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(data);
                    }
                } else if (data.split("\n")[0].indexOf("#js") >= 0) {  // #js 开头 = 直接执行 JS
                    // 【2026-08-14 安全加固】#js 可执行任意代码，只接受"本窗口自身脚本"发来的消息
                    // （外部登录器 / iframe 发来的 #js 一律拒绝，防止被注入执行）
                    if (event.source !== window) {
                        console.warn("[WSMUD] 已阻止非本窗口来源的 #js 命令");
                        return;
                    }
                    var jscode = data.split("\n");
                    jscode.baoremove(0)
                    eval(jscode.join(""));
                } else {   // 其它 → 当作普通游戏命令发给服务器
                    WG.SendCmd(data);
                }
            }
        }
    }

    // 点击房间名 → 弹出右键菜单
    $('.room-name').on('click', (e) => {
        e.preventDefault();
        $('.room-name').contextMenu({
            x: 1,
            y: 1
        });
    });

    // ---- 右键菜单子项：常用地点传送表 ----
    // 想加传送点？在这里加一行："名字": "去那里的命令"
    function makeTp(mp = 0) {

        var mptp = {
            "豪宅": "$to 住房",                    // 传送去住房
            "当铺": "$to 扬州城-当铺;list {r唐楠}",  // 去当铺并列出当铺老板
            "挖矿": "$to 扬州城-挖矿",
            "武庙": "$to 扬州城-武庙",
            "木头人": "$to 少林派-西侧殿",          // 练功木桩
            "师父": "$to 师父",
            "后勤": "$to 后勤;$wait 500;ask1 {r后勤}",
            "鉴宝阁": "$to 药王谷-鉴宝阁;list {r拍卖师}",
            "衙门": ["$to 扬州城-衙门正厅"],
        }
        if (mp == 1) {   // 门派战传送表（另一组）
            mptp = {
                "逍遥": "$to 门派橙-逍遥",
                "丐帮": "$to 门派橙-丐帮",
                "峨眉": "$to 门派橙-峨眉",
                "华山": "$to 门派橙-华山",
                "武当": "$to 门派橙-武当",
                "少林": "$to 门派橙-少林",
                "领取奖励": "events WUDANG_settle",
            }
        }
        var subItems = {};

        // 把传送表转成右键菜单的格式（每项 = 一个可点击的传送按钮）
        for (let item in mptp) {
            subItems[item] = {
                name: item, callback: function () {
                    WG.SendCmd(mptp[item]);   // 点击 → 执行传送命令
                }
            }
        }
        var dfd = jQuery.Deferred();
        setTimeout(function () {
            dfd.resolve(subItems);
        }, 20);
        return dfd.promise();
    }

    // ---- 组装整个右键菜单 ----
    function createRightClickMenu() {
        return {
            items: {
                "快捷传送": {              // 常用地点传送
                    name: "常用地点",
                    "items": makeTp(0)
                },
                "门派战传送": {            // 门派战传送
                    name: "门派战传送",
                    "items": makeTp(1)
                },
                "打开仓库": {
                    name: "打开仓库",
                    callback: function (key, opt) {
                        WG.Send("store");
                    },
                },
                "关闭自动": {              // 有自动在跑时显示
                    name: "关闭自动",
                    visible: function (key, opt) {
                        return timer != 0;
                    },
                    callback: function (key, opt) {
                        WG.timer_close();
                    },
                },
                "自动": {                  // 没自动在跑时显示
                    name: "自动",
                    visible: function (key, opt) {
                        return timer == 0;
                    },
                    "items": {
                        "自动比试": {       // 开自动比试
                            name: "自动比试",
                            visible: function (key, opt) {
                                return WG.fight_listener == undefined;
                            },
                            callback: function (key, opt) {
                                WG.auto_fight();
                            },
                        },
                        "关闭比试": {       // 关自动比试
                            name: "关闭比试",
                            visible: function (key, opt) {
                                return WG.fight_listener != undefined;
                            },
                            callback: function (key, opt) {
                                WG.auto_fight();
                            },
                        },
                    },
                },
                "自命令、自定义监控": {
                    name: "自命令、自定义监控",
                    callback: function (key, opt) {
                        WG.zmlztjk();
                    },
                },
                "换装设置": {
                    name: "换装设置",
                    callback: function (key, opt) {
                        $('.context-menu-list').hide();
                        $('.context-menu-icon').hide();
                        $('.context-menu-active').removeClass('context-menu-active');
                        WG.eqhelperui();
                    },
                },
                "换装": {
                    name: "换装",
                    items: WG.eqloader()
                },
                "设置": {                  // 打开插件设置面板
                    name: "设置",
                    callback: function (key, opt) {
                        // 【2026-08-08 调整】打开设置前先隐藏右键菜单（用 hide 而非 remove，
                        // 避免破坏 jquery-contextMenu 内部状态导致页面卡住）
                        $('.context-menu-list').hide();
                        $('.context-menu-icon').hide();
                        $('.context-menu-active').removeClass('context-menu-active');
                        WG.setting();
                    },
                },
                "打开快捷操作栏": {         // 显示/隐藏快捷操作栏
                    name: "打开快捷操作栏",
                    visible: function (key, opt) {
                        return $('.WG_button').css('display') == 'none';
                    },
                    callback: function (key, opt) {
                        WG.showhidebtn();
                    },
                },
                "关闭快捷操作栏": {
                    name: "关闭快捷操作栏",
                    visible: function (key, opt) {
                        return $('.WG_button').css('display') != 'none';
                    },
                    callback: function (key, opt) {
                        WG.showhidebtn();
                    },
                }
            }
        }
    }

    // 判断是不是手机/平板（移动端右键菜单挂的位置不一样）
    function isMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/android|iphone|ipod|ipad|blackberry|iemobile|opera mini/i.test(userAgent)) {
            return true;
        }
        if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) {
            return window.innerWidth <= 1024;
        }
        return false;
    }

    // 注册右键菜单（移动端挂在房间名上，电脑端挂在游戏界面上）
    if (isMobile()) {
        $.contextMenu({
            selector: ".room-name",
            build: function ($trigger, e) {
                return createRightClickMenu()
            }
        })
    } else {
        $.contextMenu({
            selector: '.container',
            build: function ($trigger, e) {
                return createRightClickMenu();
            }
        });
    }
});
