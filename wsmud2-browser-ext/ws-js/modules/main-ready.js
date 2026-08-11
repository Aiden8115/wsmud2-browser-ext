// main-ready.js
// document.ready menu injection and init
'use strict';

var originWindow = {};
$(document).ready(function () {
    $('head').append('<link href="https://s4.zstatic.net/ajax/libs/jquery-contextmenu/3.0.0-beta.2/jquery.contextMenu.min.css" rel="stylesheet">');
    $('head').append('<link href="https://s4.zstatic.net/ajax/libs/layer/2.3/skin/layer.css" rel="stylesheet">');
    $('head').append('<link href="https://s4.zstatic.net/ajax/libs/font-awesome/4.7.0/css/font-awesome.css" rel="stylesheet">');
    $('body').append(UI.codeInput);



    KEY.init();
    WG.init();
    GlobalInit.init();
    // 暴露
    unsafeWindow.WG = WG;
    unsafeWindow.TaskHelper = TaskHelper;
    unsafeWindow.LayerHelper = LayerHelper;
    unsafeWindow.GameState = GameState;
    unsafeWindow.show_msg = show_msg;
    unsafeWindow.messageClear = messageClear;
    unsafeWindow.messageAppend = messageAppend;
    unsafeWindow.send_cmd = send_cmd;
    unsafeWindow.roomData = roomData;
    unsafeWindow.MusicBox = MusicBox;
    unsafeWindow.FakerTTS = FakerTTS;
    unsafeWindow.Push = Push;
    unsafeWindow.WSStore = store;
    unsafeWindow.imgShow = imgShow;


    window.addEventListener("message", receiveMessage, false);

    function receiveMessage(event) {
        originWindow = event;
        var origin = event.origin;
        var data = event.data;
        if (String(data).indexOf("denglu") >= 0) {
            if (role != undefined) {
                return;
            }
            let userName = data.split(" ")[1];
            let userList = $('#role_panel > ul > li.content > ul >li');
            for (let user of userList) {
                if (user.innerText.indexOf(userName) >= 0) {
                    $(user).addClass("select");
                } else {
                    $(user).removeClass("select");
                }
            }
            $("li[command=SelectRole]").click()
            return;
        }
        try {
            if (JSON.parse(data) instanceof Object) {
                return;
            }
        } catch (error) {
            console.log("Run at message");
        }
        if (typeof data == 'string') {
            //包含setImmediate 跳过
            if (data.indexOf("setImmediate") >= 0) {
                return;
            }
            if (data === '挖矿' || data === '修炼') {
                WG.zdwk();
            } else if (data === '挂机') {
                WG.SendCmd("stopstate");
            } else {
                if (data.split("\n")[0].indexOf("//") >= 0) {
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(data);
                    }
                } else if (data.split("\n")[0].indexOf("#js") >= 0) {
                    var jscode = data.split("\n");
                    jscode.baoremove(0)
                    eval(jscode.join(""));
                } else {
                    WG.SendCmd(data);
                }
            }
        }
    }

    $('.room-name').on('click', (e) => {
        e.preventDefault();
        $('.room-name').contextMenu({
            x: 1,
            y: 1
        });
    });

    function makeTp(mp = 0) {

        var mptp = {
            "豪宅": "$to 住房",
            "当铺": "$to 扬州城-当铺;list {r唐楠}",
            "挖矿": "$to 扬州城-挖矿",
            "武庙": "$to 扬州城-武庙",
            "木头人": "$to 少林派-西侧殿",
            "师父": "$to 师父",
            "后勤": "$to 后勤;$wait 500;ask1 {r后勤}",
            "鉴宝阁": "$to 药王谷-鉴宝阁;list {r拍卖师}",
            "衙门": ["$to 扬州城-衙门正厅"],
        }
        if (mp == 1) {
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

        for (let item in mptp) {
            subItems[item] = {
                name: item, callback: function () {
                    WG.SendCmd(mptp[item]);
                }
            }
        }
        var dfd = jQuery.Deferred();
        setTimeout(function () {
            dfd.resolve(subItems);
        }, 20);
        return dfd.promise();
    }

    function createRightClickMenu() {
        return {
            items: {
                "快捷传送": {
                    name: "常用地点",
                    "items": makeTp(0)
                },
                "门派战传送": {
                    name: "门派战传送",
                    "items": makeTp(1)
                },
                "打开仓库": {
                    name: "打开仓库",
                    callback: function (key, opt) {
                        WG.Send("store");
                    },
                },
                "关闭自动": {
                    name: "关闭自动",
                    visible: function (key, opt) {
                        return timer != 0;
                    },
                    callback: function (key, opt) {
                        WG.timer_close();
                    },
                },
                "自动": {
                    name: "自动",
                    visible: function (key, opt) {
                        return timer == 0;
                    },
                    "items": {
                        "自动比试": {
                            name: "自动比试",
                            visible: function (key, opt) {
                                return WG.fight_listener == undefined;
                            },
                            callback: function (key, opt) {
                                WG.auto_fight();
                            },
                        },
                        "关闭比试": {
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
                "切换菜单": {
                    name: "切换菜单",
                    callback: function (key, opt) {
                        let p = 'on'
                        if (inzdy_btn) {
                            p = 'off'
                        }
                        WG.zdy_btnshow(p);
                    },
                },
                "设置": {
                    name: "设置",
                    callback: function (key, opt) {
                        if (unsafeWindow.showExtSettings) {
                            unsafeWindow.showExtSettings();
                        } else {
                            WG.setting();
                        }
                    },
                },
                "打开快捷操作栏": {
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
