// websocket-proxy.js
// WebSocket interception and message dispatch
'use strict';

var show_msg;
var CanUse = false;
// 指数退避重连相关变量
var reconnectAttempts = 0;
var reconnectDelay = 500;
var MAX_RECONNECT_ATTEMPTS = 20;
var MAX_RECONNECT_DELAY = 60000;
// 自动重登开关（从 config 读取）
var autoReloadOnReconnectFail = true;

if (WebSocket) {
    CanUse = true;
    show_msg = function(msg) {
        ws_on_message({
            type: "text",
            data: msg
        });
    }
    var _ws = WebSocket,
        ws, ws_on_message;

    // 指数退避延迟序列（单位 ms）
    var RECONNECT_DELAYS = [500, 2000, 5000, 10000, 30000, 60000];

    // 指数退避重连函数
    function scheduleReconnect() {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            // 重连失败流程
            console.error('[websocket-proxy] 重连次数超过上限（20次），停止重连');
            if (typeof Push !== 'undefined') {
                Push('[wsmud插件] WebSocket重连失败，已尝试20次约13分钟，停止重连');
            }
            // 如果启用了自动重登，则刷新页面
            if (autoReloadOnReconnectFail === true || autoReloadOnReconnectFail === 'true' || autoReloadOnReconnectFail === '开') {
                console.log('[websocket-proxy] 触发自动刷新重登');
                if (typeof Push !== 'undefined') {
                    Push('[wsmud插件] 正在自动刷新页面重新登录...');
                }
                setTimeout(function () {
                    location.reload();
                }, 1000);
            }
            return;
        }
        var delayIndex = Math.min(reconnectAttempts, RECONNECT_DELAYS.length - 1);
        var delay = RECONNECT_DELAYS[delayIndex];
        reconnectAttempts++;
        console.log('[websocket-proxy] 第 ' + reconnectAttempts + '/' + MAX_RECONNECT_ATTEMPTS + ' 次重连，等待 ' + (delay / 1000) + 's');
        if (typeof Push !== 'undefined') {
            Push('[wsmud插件] 连接断开，' + (delay / 1000) + '秒后第 ' + reconnectAttempts + ' 次重连');
        }
        setTimeout(function () {
            // 检查连接是否已恢复（游戏可能已自行重连）
            if (ws && ws.readyState == ws.OPEN) {
                console.log('[websocket-proxy] 连接已恢复，重置重连状态');
                reconnectAttempts = 0;
                reconnectDelay = 500;
                return;
            }
            // 发送心跳命令检查连接状态
            if (typeof KEY !== 'undefined' && KEY.do_command) {
                KEY.do_command("score");
            }
            // 继续下次重连
            scheduleReconnect();
        }, delay);
    }

    // 重置重连状态（连接成功时调用）
    function resetReconnectState() {
        reconnectAttempts = 0;
        reconnectDelay = 500;
    }
    unsafeWindow.WebSocket = function (uri) {
        ws = new _ws(uri);
        //document.getElementsByClassName("signinfo")[0].innerHTML = "<HIR>武神传说2插件正常运行</HIR>"
        //$('.signinfo').on('click', function () {
        //    ProConsole.init();
        //});
    };
    unsafeWindow.WebSocket.prototype = {
        CONNECTING: _ws.CONNECTING,
        OPEN: _ws.OPEN,
        CLOSING: _ws.CLOSING,
        CLOSED: _ws.CLOSED,
        get url() {
            return ws.url;
        },
        get protocol() {
            return ws.protocol;
        },
        get readyState() {
            return ws.readyState;
        },
        get bufferedAmount() {
            return ws.bufferedAmount;
        },
        get extensions() {
            return ws.extensions;
        },
        get binaryType() {
            return ws.binaryType;
        },
        set binaryType(t) {
            ws.binaryType = t;
        },
        get onopen() {
            return ws.onopen;
        },
        set onopen(fn) {
            ws.onopen = function (e) {
                resetReconnectState();
                autoReloadOnReconnectFail = GM_getValue(roleid + "_auto_relogin_page", autoReloadOnReconnectFail);
                fn(e);
            };
        },
        get onmessage() {
            return ws.onmessage;
        },
        set onmessage(fn) {
            ws_on_message = fn;
            ws.onmessage = WG.receive_message;
        },
        get onclose() {
            return ws.onclose;
        },
        set onclose(fn) {
            ws.onclose = (e) => {
                WG.online = false;
                GameState.connected = false;
                auto_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin);
                autoReloadOnReconnectFail = GM_getValue(roleid + "_auto_relogin_page", autoReloadOnReconnectFail);
                fn(e);
                if (auto_relogin == "开" || auto_relogin === true || auto_relogin === 'true') {
                    // 使用指数退避替代固定定时重连
                    reconnectAttempts = 0;
                    reconnectDelay = 500;
                    scheduleReconnect();
                }
            }

        },
        get onerror() {
            return ws.onerror;
        },
        set onerror(fn) {
            ws.onerror = fn;
        },
        send: function (text) {
            if (GameState.cookie == undefined) {
                GameState.cookie = text;
            }
            if (text.indexOf(GameState.id) > -1 && !GameState.connected) {
                text = GameState.cookie + ' ' + GameState.id
            }
            if (cmd_echo) {
                const time = new Date().toLocaleTimeString();
                show_msg('<hic>' + time + '</hic> <hiy>' + text + '</hiy>');
            }
            if (text[0] == "$") {
                WG.SendCmd(text);
                return;
            }
            if (text[0] == '@') {
                if (unsafeWindow && unsafeWindow.ToRaid) {
                    ToRaid.perform(text);
                    return;
                } else {
                    messageAppend("插件未安装,请访问 https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid 下载并安装");
                    window.open("https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid ", '_blank').location;
                }
            }

            switch (text) {

                case 'wk':
                    WG.zdwk();
                    break;
                case 'backup':
                    WG.make_config();
                    break;
                case 'load':
                    WG.load_config();
                    break;
                default:
                    ws.send(text);
                    break;
            }
        },
        close: function () {
            ws.close();
        }
    };

    var cmd_queue = [],
        cmd_busy = false,
        echo = false;
    // 暴露命令队列供健康检查使用
    window._getCmdQueue = function () { return cmd_queue; };
    window._getCmdBusy = function () { return cmd_busy; };
    // 命令队列处理函数
    var _send_cmd = function () {
        if (!ws || ws.readyState != 1) {
            cmd_busy = false;
            cmd_queue = []
        } else if (cmd_queue.length > 0) {
            cmd_busy = true;
            var t = new Date().getTime();
            for (var i = 0; i < cmd_queue.length; i++) {
                if (!cmd_queue[i].timestamp || cmd_queue[i].timestamp >= t - 1300) {
                    cmd_queue.splice(0, i);
                    break
                }
            }
            for (i = 0; i < Math.min(cmd_queue.length, 5); i++) {
                if (!cmd_queue[i].timestamp) {
                    try {
                        ws.send(cmd_queue[i].cmd);
                        cmd_queue[i].timestamp = t
                    } catch (e) {
                        cmd_busy = false;
                        cmd_queue = [];
                        return
                    }
                }
            }
            if (!cmd_queue[cmd_queue.length - 1].timestamp) {
                setTimeout(_send_cmd, 100)
            } else {
                cmd_busy = false
            }
        } else {
            cmd_busy = false
        }
    };
    // 发送命令函数
    var send_cmd = function (cmd, no_queue) {
        if (ws && ws.readyState == 1) {
            cmd = Array.isArray(cmd) ? cmd : cmd.split(';');
            if (no_queue) {
                for (var i = 0; i < cmd.length; i++) {
                    if (cmd_echo || Coding) {
                        const time = new Date().toLocaleTimeString();
                        show_msg('<hic>' + time + '</hic> <hiy>' + cmd[i] + '</hiy>');
                    }
                    ws.send(cmd[i])
                }
            } else {
                for (i = 0; i < cmd.length; i++) {
                    cmd_queue.push({
                        cmd: cmd[i],
                        timestamp: 0
                    })
                }
                if (!cmd_busy) {
                    _send_cmd()
                }
            }
        }
    };

} else {
    console.log("插件不可运行，请访问: https://greasyfork.org/zh-CN/forum/discussion/41547/x");
}
