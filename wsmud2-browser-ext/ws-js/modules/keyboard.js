// ============================================================
// keyboard.js —— 快捷键管理 KEY
// ------------------------------------------------------------
// 定义游戏里的键盘快捷键：
//   Esc            关闭当前对话框
//   ` (数字1左边)   打开/关闭房间地图
//   空格           确认对话框（确定按钮）
//   Tab            在房间人物之间切换选择
//   Alt+1~6        触发当前人物的第 1~6 个选项（人物下方的按钮）
//
// 想加/改快捷键？在 init() 函数里按格式加一行 this.add(...) 即可。
// 按键编号(keyCode)是浏览器定义的：27=Esc 32=空格 9=Tab 192=` 48~57=数字
// ============================================================
'use strict';

// 键盘快捷键管理对象
var KEY = {
    keys: [],                          // 已注册的快捷键列表
    roomItemSelectIndex: -1,           // Tab 选人时当前选中的是第几个（-1=没选）
    // 初始化：注册所有快捷键
    init: function () {
        $(document).on("keydown", this.e);   // 监听整个页面的按键事件

        // Esc 关闭面板（27 = Esc 键）
        this.add(27, function () {
            KEY.dialog_close();
        });
        // ` 打开房间地图（192 = 反引号键）
        this.add(192, function () {
            $(".map-icon").click();
        });
        // 空格 确认对话框（32 = 空格键）
        this.add(32, function () {
            KEY.dialog_confirm();
        });
        // Tab 选择房间内人物（9 = Tab 键）
        this.add(9, function () {
            KEY.onRoomItemSelect();
            return false;   // 阻止 Tab 默认行为（跳到下一个输入框）
        });

        // Alt+数字键，触发人物下方的选项
        // 按键编号 = 数字键编号 + 512（512 表示"按了 Alt"）
        this.add(49 + 512, function () {   // Alt+1
            KEY.onRoomItemAction(0);
        });
        this.add(50 + 512, function () {   // Alt+2
            KEY.onRoomItemAction(1);
        });
        this.add(51 + 512, function () {   // Alt+3
            KEY.onRoomItemAction(2);
        });
        this.add(52 + 512, function () {   // Alt+4
            KEY.onRoomItemAction(3);
        });
        this.add(53 + 512, function () {   // Alt+5
            KEY.onRoomItemAction(4);
        });
        this.add(54 + 512, function () {   // Alt+6
            KEY.onRoomItemAction(5);
        });

        // Q/W/E/R/T/Y - 自定义按钮快捷键（仅按钮显示时生效）
        this.add(81, function () {   // Q
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinQ").length) {
                WG.zdybtnfunc(0);
                return false;
            }
        });
        this.add(87, function () {   // W
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinW").length) {
                WG.zdybtnfunc(1);
                return false;
            }
        });
        this.add(69, function () {   // E
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinE").length) {
                WG.zdybtnfunc(2);
                return false;
            }
        });
        this.add(82, function () {   // R
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinR").length) {
                WG.zdybtnfunc(3);
                return false;
            }
        });
        this.add(84, function () {   // T
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinT").length) {
                WG.zdybtnfunc(4);
                return false;
            }
        });
        this.add(89, function () {   // Y
            if (typeof inzdy_btn !== 'undefined' && inzdy_btn && $("#keyinY").length) {
                WG.zdybtnfunc(5);
                return false;
            }
        });
    },
    // 注册一个快捷键：k = 按键编号，c = 按下时要执行的函数
    add: function (k, c) {
        var tmp = {
            key: k,
            callback: c,
        };
        this.keys.push(tmp);
    },
    // 按键事件的统一入口（每次按键都会走到这里）
    e: function (event) {
        // 聊天框开着时 → 按键交给聊天模式处理（不冲突）
        if ($(".channel-box").is(":visible")) {
            KEY.chatModeKeyEvent(event);
            return;
        }
        // 对话框上出现数字选项、且按的是数字键 → 不拦截（让游戏自己处理）
        if ($(".dialog-confirm").is(":visible") &&
            ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)))
            return;
        // 正在输入框里打字时 → 快捷键全部让路（不然打字会触发游戏指令）
        if ($('input').is(':focus') || $('textarea').is(':focus')) {
            return;
        }
        // 计算"组合按键编号"：Ctrl=1024，Alt=512，再加普通键码
        var kk = (event.ctrlKey || event.metaKey ? 1024 : 0) + (event.altKey ? 512 : 0) + event.keyCode;
        // 遍历已注册的快捷键，匹配到就执行（把 event 传给回调，供 preventDefault 等使用）
        for (var k of KEY.keys) {
            if (k.key == kk)
                return k.callback(event);
        }
    },
    isallow: true,   // 防止空格连点（防抖开关）
    // Esc：模拟点击对话框的关闭按钮
    dialog_close: function () {
        $(".dialog-close").click();
    },
    // 空格：模拟点击对话框的"确定"按钮（带 500ms 防抖，防止误连点）
    // 【2026-08-14 修复】event 由 KEY.e 传入（原实现用已废弃的全局 window.event）
    dialog_confirm: function (event) {
        if ($(".dialog-confirm").is(":visible")) {
            if (event && event.preventDefault) event.preventDefault();
            if (this.isallow) {
                this.isallow = false
                $(".dialog-btn.btn-ok").click();
                setTimeout(() => {
                    this.isallow = true;
                }, 500);
            }
        }
    },
    // 按名字触发页面上的某个命令按钮（如 "score"）
    do_command: function (name) {
        $("span[command=" + name + "]").click();
    },

    // 聊天框模式下的按键处理：Esc 关闭，回车发送（没字就关闭）
    chatModeKeyEvent: function (event) {
        if (event.keyCode == 27) {           // Esc
            KEY.dialog_close();
        } else if (event.keyCode == 13) {    // 回车
            if ($(".sender-box").val().length) $(".sender-btn").click();
            else KEY.dialog_close();
        }
    },
    // 切换房间时重置选中索引
    onChangeRoom: function () {
        KEY.roomItemSelectIndex = -1;
    },
    // Tab：循环选中房间里的下一个人物（高亮 + 模拟点击）
    onRoomItemSelect: function () {
        if (KEY.roomItemSelectIndex != -1) {
            $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")").css("background", "#000");
        }
        KEY.roomItemSelectIndex = (KEY.roomItemSelectIndex + 1) % $(".room_items div.room-item").length;
        var curItem = $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")");
        curItem.css("background", "#444");
        curItem.click();
    },
    // Alt+数字：点击当前选中人物的第 index 个选项按钮
    onRoomItemAction: function (index) {
        //NPC下方按键
        $(".room_items .item-commands span:eq(" + index + ")").click();
    },
}
