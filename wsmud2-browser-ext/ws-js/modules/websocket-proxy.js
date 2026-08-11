// websocket-proxy.js
// WebSocket interception and message dispatch
'use strict';

var show_msg;
var CanUse = false;
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
            ws.onopen = fn;
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
                fn(e);
                if (auto_relogin == "开" || auto_relogin === true || auto_relogin === 'true') {
                    setTimeout(() => {
                        console.log(new Date());
                        KEY.do_command("score");
                    }, 10000);
                    setTimeout(() => {
                        console.log(new Date());
                        KEY.do_command("score");
                    }, 1800000);
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
            cmd = cmd instanceof Array ? cmd : cmd.split(';');
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
