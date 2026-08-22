// ============================================================
// websocket-proxy.js —— 劫持 WebSocket（扩展的核心机关）
// ------------------------------------------------------------
// 游戏和服务器之间靠 WebSocket 长连接通信（每一条指令/每一条消息都走它）。
// 本文件做的事：
//   1. 把浏览器的 WebSocket 换成一个"自己写的替身"
//   2. 替身收到服务器的消息 → 先给插件看（交给 WG.receive_message 分发）
//   3. 替身发送消息时 → 先检查：
//        - $ 开头   → 走插件命令引擎 WG.SendCmd（比如 $to 扬州城）
//        - @ 开头   → 走 Raid 引擎 ToRaid.perform（比如 @kill 木头人）
//        - wk / backup / load → 特殊快捷指令
//        - 其它     → 原样发给服务器
//   4. 自带"命令排队"功能：一下子发很多命令时，自动限速（防刷屏被服务器踢）
//
// 通俗理解：插件在游戏门口装了个"安检门"，所有进出消息都要过一遍。
// ============================================================
'use strict';

var show_msg;        // 在游戏里显示一条文字消息（往聊天区打印）
var CanUse = false;  // 当前浏览器是否支持 WebSocket
if (WebSocket) {
    CanUse = true;
    // 在游戏里显示一条消息（模拟服务器发来的文字消息）
    show_msg = function(msg) {
        ws_on_message({
            type: "text",
            data: msg
        });
    }
    var _ws = WebSocket,    // 保存"真 WebSocket"构造函数
        ws,                 // 当前真正的 WebSocket 连接对象
        ws_on_message;      // 游戏自己的"收到消息"处理函数

    // 【2026-08-11 重连退避】自动重连从"固定 500ms 无限轰炸"改为"指数退避 + 重试上限"：
    // 服务器宕机/网络中断时，十几开窗口若 500ms 一次疯狂连接请求，可能被服务器限流甚至封 IP。
    // 退避序列 0.5s→2s→5s→10s→30s→60s（封顶），连续失败 20 次（约 13 分钟）后停止，等下次断线或手动。
    var _reloginTry = 0;
    var _reloginTimer = null;
    var _reloginDelay = [500, 2000, 5000, 10000, 30000, 60000];

    // 【2026-08-13 自动恢复】重连失败达上限 → 自动刷新页面重新登录（服务器无人值守场景）
    // 防循环：距上次刷新至少 10 分钟；24 小时内最多 5 次；刷新前打标记供登录器自动重登
    var _recoverFlagKey = 'ext_auto_recover_flag';
    var _recoverTimeKey = 'ext_last_recover_ts';
    var _recoverCountKey = 'ext_recover_count';
    function _autoRecoverReload() {
        try {
            if (typeof auto_recover === 'undefined' || (auto_recover !== '开' && auto_recover !== true && auto_recover !== 'true')) return;   // 开关未开
            var now = Date.now();
            var last = parseInt(localStorage.getItem(_recoverTimeKey) || '0', 10);
            if (now - last < 10 * 60 * 1000) return;     // 距上次刷新不足 10 分钟 → 跳过
            var count = parseInt(localStorage.getItem(_recoverCountKey) || '0', 10);
            if (count >= 5) return;                       // 24 小时内已刷新 5 次 → 停止等手动
            localStorage.setItem(_recoverTimeKey, String(now));
            localStorage.setItem(_recoverCountKey, String(count + 1));
            localStorage.setItem(_recoverFlagKey, '1');   // 登录器读到此标记后自动重登
            try { ExtLog.warn('[恢复] 重连失败达上限，自动刷新页面重新登录'); } catch (e) { }
            location.reload();
        } catch (e) { }
    }

    function _scheduleRelogin() {
        clearTimeout(_reloginTimer);
        if (GameState.connected) { _reloginTry = 0; return; }        // 已连上 → 停止并复位
        if (_reloginTry >= 20) {
            _reloginTry = 0;
            // 【2026-08-13 无人值守推送】重连彻底失败 → 推送到手机
            try { if (typeof PushAlert === 'function') PushAlert('relogin_fail', '⚠️ 角色掉线且自动重连失败，正在尝试自动刷新重登'); } catch (e) { }
            _autoRecoverReload();
            return;
        }   // 达上限 → 自动刷新重登（等下次断线或手动）
        var idx = Math.min(_reloginTry, _reloginDelay.length - 1);
        _reloginTimer = setTimeout(function () {
            if (GameState.connected) { _reloginTry = 0; return; }
            try { KEY.do_command("score"); } catch (e) { }            // 模拟点"刷新状态"触发重连
            _reloginTry++;
            _scheduleRelogin();                                       // 递归安排下一次（间隔递增）
        }, _reloginDelay[idx]);
    }

    // 把全局 WebSocket 换成我们的替身（游戏 new WebSocket(...) 时会走到这里）
    // 【2026-08-14 多连接防御】每个替身实例记住自己的真实连接（this._ws），
    // 避免游戏创建多个连接时所有 send/close 都错发到"最后一个连接"；
    // 全局 ws 仍指向最后创建的连接（插件内部 send_cmd 等逻辑不变）。
    unsafeWindow.WebSocket = function (uri) {
        var _inst = new _ws(uri);   // 替身内部其实还是用真的 WebSocket 连服务器
        this._ws = _inst;
        ws = _inst;
    };

    // 替身的"原型"：把真的 WebSocket 的所有属性/方法都转发过去，只对关键的两个做手脚
    unsafeWindow.WebSocket.prototype = {
        // 以下都是"转发"：游戏读这些属性时，返回真连接的值
        CONNECTING: _ws.CONNECTING,
        OPEN: _ws.OPEN,
        CLOSING: _ws.CLOSING,
        CLOSED: _ws.CLOSED,
        get url() { return (this._ws || ws).url; },
        get protocol() { return (this._ws || ws).protocol; },
        get readyState() { return (this._ws || ws).readyState; },
        get bufferedAmount() { return (this._ws || ws).bufferedAmount; },
        get extensions() { return (this._ws || ws).extensions; },
        get binaryType() { return (this._ws || ws).binaryType; },
        set binaryType(t) { (this._ws || ws).binaryType = t; },
        get onopen() { return (this._ws || ws).onopen; },
        set onopen(fn) { (this._ws || ws).onopen = fn; },

        // ★ 关键点①：游戏给 WebSocket 设置"收到消息"处理函数时
        //   我们把它偷偷换成 WG.receive_message，让插件先看消息
        get onmessage() { return (this._ws || ws).onmessage; },
        set onmessage(fn) {
            ws_on_message = fn;              // 记下游戏自己的处理函数
            (this._ws || ws).onmessage = WG.receive_message;  // 但真正处理换成插件的
        },

        // ★ 关键点②：断线时（onclose）做额外处理：
        //   标记离线状态 + 如果开了"自动重连"，按指数退避自动重连（对齐 v1.0.0，
        //   原版 10 秒+30 分钟两次定时器：重连太慢；现改为退避重试，避免固定 500ms 轰炸服务器）
        get onclose() { return (this._ws || ws).onclose; },
        set onclose(fn) {
            (this._ws || ws).onclose = (e) => {
                var wasConnected = GameState.connected;      // 断线前的状态（区分真断线 vs 重连失败）
                WG.online = false;                           // 标记：离线了
                GameState.connected = false;
                auto_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin);  // 读自动重连设置
                if (typeof fn === "function") fn(e);   // 先执行游戏自己的关闭处理
                if (auto_relogin == "开" || auto_relogin === true || auto_relogin === 'true') {      // 开了自动重连 → 退避重试
                    if (wasConnected) _reloginTry = 0;   // 真断线：从头开始退避；重连失败：间隔继续递增
                    _scheduleRelogin();
                }
            }

        },
        get onerror() { return (this._ws || ws).onerror; },
        set onerror(fn) { (this._ws || ws).onerror = fn; },

        // ★ 关键点③：游戏给服务器发消息时，先过插件这一关
        send: function (text) {
            // 第一次发送时记录登录凭证（cookie）
            if (GameState.cookie == undefined) {
                GameState.cookie = text;
            }
            // 断线重连后，自动把凭证补回去（防止需要重新登录）
            if (text.indexOf(GameState.id) > -1 && !GameState.connected) {
                text = GameState.cookie + ' ' + GameState.id
            }
            // 开了"命令回显"时，把发出的命令打印到游戏聊天区（方便看发了啥）
            if (cmd_echo) {
                const time = new Date().toLocaleTimeString();
                show_msg('<hic>' + time + '</hic> <hiy>' + text + '</hiy>');
            }
            // $ 开头 = 插件命令（如 $to 扬州城-武庙）→ 走 WG.SendCmd
            if (text[0] == "$") {
                WG.SendCmd(text);
                return;
            }
            // @ 开头 = Raid 命令（如 @kill 木头人）→ 走 Raid 引擎
            if (text[0] == '@') {
                if (unsafeWindow && unsafeWindow.ToRaid) {
                    ToRaid.perform(text);
                    return;
                } else {
                    // Raid 引擎没装上（不应该发生，因为本扩展自带）
                    messageAppend("插件未安装,请访问 https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid 下载并安装");
                    // 【2026-08-15 修复】原 URL 末尾多一个空格、且多余 .location 链（无实际作用）
                    window.open("https://greasyfork.org/zh-CN/scripts/375851-wsmud-raid", '_blank');
                }
            }

            // 几个特殊的快捷指令
            switch (text) {
                case 'wk':          // 输入 wk = 自动挖矿/修炼
                    WG.zdwk();
                    break;
                case 'backup':      // 输入 backup = 配置备份到云端
                    WG.make_config();
                    break;
                case 'load':        // 输入 load = 从云端恢复配置
                    WG.load_config();
                    break;
                default:            // 其它一律原样发给服务器
                    (this._ws || ws).send(text);
                    break;
            }
        },
        close: function () {
            (this._ws || ws).close();
        }
    };

    // ---- 命令队列（限速防刷）----
    // 自动脚本可能一瞬间发很多命令（比如连续打坐、连续走动），
    // 全部马上发给服务器会被当成刷屏踢下线，所以排队慢慢发。
    var cmd_queue = [],   // 待发送的命令队列
        cmd_busy = false, // 是否正在处理队列
        echo = false;
    // 队列处理函数：一次最多发 5 条，每条之间隔 1.3 秒
    var _send_cmd = function () {
        if (!ws || ws.readyState != 1) {   // 连接没了 → 清空队列
            cmd_busy = false;
            cmd_queue = []
        } else if (cmd_queue.length > 0) {
            cmd_busy = true;
            var t = new Date().getTime();
            // 把排队超过 1.3 秒还没发的命令清理掉（太旧了就不发了）
            for (var i = 0; i < cmd_queue.length; i++) {
                if (!cmd_queue[i].timestamp || cmd_queue[i].timestamp >= t - 1300) {
                    cmd_queue.splice(0, i);
                    break
                }
            }
            // 发前 5 条
            for (i = 0; i < Math.min(cmd_queue.length, 5); i++) {
                if (!cmd_queue[i].timestamp) {
                    try {
                        ws.send(cmd_queue[i].cmd);
                        cmd_queue[i].timestamp = t   // 打上发送时间戳
                    } catch (e) {
                        cmd_busy = false;
                        cmd_queue = [];
                        return
                    }
                }
            }
            // 还有没发完的 → 100 毫秒后再来一轮；发完了 → 解锁
            if (!cmd_queue[cmd_queue.length - 1].timestamp) {
                setTimeout(_send_cmd, 100)
            } else {
                cmd_busy = false
            }
        } else {
            cmd_busy = false
        }
    };
    // 发送命令函数（插件内部都用它发指令）
    // cmd：可以是字符串（用 ; 分隔多条）或数组；no_queue=true 表示不等队直接发
    var send_cmd = function (cmd, no_queue) {
        if (ws && ws.readyState == 1) {   // 连接正常才发
            cmd = cmd instanceof Array ? cmd : cmd.split(';');
            if (no_queue) {               // 直接发模式
                for (var i = 0; i < cmd.length; i++) {
                    if (cmd_echo || Coding) {   // 回显
                        const time = new Date().toLocaleTimeString();
                        show_msg('<hic>' + time + '</hic> <hiy>' + cmd[i] + '</hiy>');
                    }
                    ws.send(cmd[i])
                }
            } else {                      // 排队模式（默认）
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

    // 【2026-08-16】暴露"命令队列是否空闲"，供 Raid @zmlwait 阻塞自命令使用
    // （自命令为命令串时，@zmlwait 会等队列清空再继续下一行流程）
    unsafeWindow.__extCmdQueueIdle = function () {
        return cmd_queue.length === 0 && !cmd_busy;
    };

} else {
    console.log("插件不可运行，请访问: https://greasyfork.org/zh-CN/forum/discussion/41547/x");
}
