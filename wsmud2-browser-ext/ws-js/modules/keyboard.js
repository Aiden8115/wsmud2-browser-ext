// keyboard.js
// KEY keyboard shortcuts manager
'use strict';

// 键盘快捷键管理
var KEY = {
    keys: [],
    roomItemSelectIndex: -1,
    // 初始化键盘快捷键
    init: function () {
        $(document).on("keydown", this.e);
        // ESC关闭面板
        this.add(27, function () {
            KEY.dialog_close();
        });
        // ·打开房间地图
        this.add(192, function () {
            $(".map-icon").click();
        });
        // 空格
        this.add(32, function () {
            KEY.dialog_confirm();
        });
        // Tab选择房间内人物
        this.add(9, function () {
            KEY.onRoomItemSelect();
            return false;
        });

        //alt+数字键，人物下方选项
        this.add(49 + 512, function () {
            KEY.onRoomItemAction(0);
        });
        this.add(50 + 512, function () {
            KEY.onRoomItemAction(1);
        });
        this.add(51 + 512, function () {
            KEY.onRoomItemAction(2);
        });
        this.add(52 + 512, function () {
            KEY.onRoomItemAction(3);
        });
        this.add(53 + 512, function () {
            KEY.onRoomItemAction(4);
        });
        this.add(54 + 512, function () {
            KEY.onRoomItemAction(5);
        });
    },
    add: function (k, c) {
        var tmp = {
            key: k,
            callback: c,
        };
        this.keys.push(tmp);
    },
    e: function (event) {
        if ($(".channel-box").is(":visible")) {
            KEY.chatModeKeyEvent(event);
            return;
        }
        if ($(".dialog-confirm").is(":visible") &&
            ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)))
            return;
        if ($('input').is(':focus') || $('textarea').is(':focus')) {
            return;
        }
        var kk = (event.ctrlKey || event.metaKey ? 1024 : 0) + (event.altKey ? 512 : 0) + event.keyCode;
        for (var k of KEY.keys) {
            if (k.key == kk)
                return k.callback();
        }
    },
    isallow: true,
    dialog_close: function () {
        $(".dialog-close").click();
    },
    dialog_confirm: function () {
        if ($(".dialog-confirm").is(":visible")) {
            event.preventDefault();
            if (this.isallow) {
                this.isallow = false
                $(".dialog-btn.btn-ok").click();
                setTimeout(() => {
                    this.isallow = true;
                }, 500);
            }
        }
    },
    do_command: function (name) {
        $("span[command=" + name + "]").click();
    },

    chatModeKeyEvent: function (event) {
        if (event.keyCode == 27) {
            KEY.dialog_close();
        } else if (event.keyCode == 13) {
            if ($(".sender-box").val().length) $(".sender-btn").click();
            else KEY.dialog_close();
        }
    },
    onChangeRoom: function () {
        KEY.roomItemSelectIndex = -1;
    },
    onRoomItemSelect: function () {
        if (KEY.roomItemSelectIndex != -1) {
            $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")").css("background", "#000");
        }
        KEY.roomItemSelectIndex = (KEY.roomItemSelectIndex + 1) % $(".room_items div.room-item").length;
        var curItem = $(".room_items div.room-item:eq(" + KEY.roomItemSelectIndex + ")");
        curItem.css("background", "#444");
        curItem.click();
    },
    onRoomItemAction: function (index) {
        //NPC下方按键
        $(".room_items .item-commands span:eq(" + index + ")").click();
    },
}
