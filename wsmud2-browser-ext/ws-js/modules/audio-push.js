// ============================================================
// audio-push.js —— 声音与远程推送
// ------------------------------------------------------------
//   SettingsStore   分享/配置云存储（把配置存到云端再拉回来）
//   Push            远程推送（Server酱/Bark/钉钉等，把游戏消息推送到手机）
//   FakerTTS        语音朗读（把文字读出来）
//   MusicBox        八音盒（播放音乐）
//   Beep            提示音
// 想改推送的接口/文案 → 在本文件搜索对应对象。
// ============================================================
// audio-push.js
// S config, FakerTTS, Beep, Push, MusicBox
'use strict';


var SettingsStore = {
    serverUrl: "https://wsmud.ii74.com",
    // 【2026-08-14 清理】原 GetJson（同步返回空字符串的死代码）已删除；需要取 JSON 时直接用 $.post 回调即可
    shareJson: function (usernaem, json) {
        $.post(SettingsStore.serverUrl + "/sharejk", {
            username: usernaem,
            json: JSON.stringify(json)
        }, (res) => {
            if (res && res.code == 0) {
                GM_setClipboard(res.shareid);
                messageAppend("复制成功" + res.msg + ":" + res.shareid);
            } else {
                messageAppend("失败了" + res.msg);
            }
        })
    },
    getShareJson: function (id, callback) {
        $.post(SettingsStore.serverUrl + "/getjk", {
            shareid: id
        }, (res) => {
            if (res && res.code == 0) {
                callback(res);
            } else {
                messageAppend("失败了" + res.msg);
            }
        });
    },
    getUserConfig: function (id, callback) {
        $.get(SettingsStore.serverUrl + "/User/Load?id=" + id, (res) => {
            if (res && res != "") {
                callback(res);
            } else {
                messageAppend("失败了");
            }
        });
    },
    uploadUserConfig: function (id, data, callback) {
        $.post(SettingsStore.serverUrl + "/User/Backup", {
            id: id,
            data: JSON.stringify(data)
        }, (res) => {
            if (res && res == "true") {
                callback(res);
            } else {
                messageAppend("失败了,或配置已存在");
            }
        });
    }

};
var FakerTTS = {

    playtts: function (text) {
        try {
            var msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'zh';
            msg.voice = speechSynthesis.getVoices().filter(function (voice) {
                return voice.name == 'Whisper';
            })[0];
            speechSynthesis.speak(msg);
        } catch (e) {
            try {
                android.speak(text);
            } catch (ex) {
                console.log('这个真没有.')
            }

        }
    }
};
function Beep() {
    NotSound()
};
function Push(text) {
    if (text) {
        if ((pushSwitch != '开' && pushSwitch !== true && pushSwitch !== 'true') || pushType == null || pushToken == null) {
            messageAppend("<hiy>通知功能未开启或设置不完整，请在 右键菜单-设置 中设置开启。");
            return;
        }
        switch (String(pushType)) {
                //Server酱
            case "0":
                // 【2026-08-15 修复】消息文本作为 query 参数必须 encodeURIComponent，
                // 否则含 & / # / 中文 等字符会截断或破坏推送内容
                $.post(`https://sctapi.ftqq.com/${pushToken}.send?title=${encodeURIComponent(text)}`);
                break;
                //Bark iOS
            case "1":
                $.post(`https://api.day.app/${pushToken}/武神传说/${encodeURIComponent(text)}`);
                break;
                //PushPlus
            case "2":
                var pushJosn = { "token": pushToken, "title": "武神传说", "content": text };
                // 【2026-08-14 修复】原 $.ajaxSetup 会改全局 ajax 默认配置（污染页面其它请求），改为单请求配置
                // 【2026-08-14 修复】升级为 https（原 http 在游戏站将来上 https 后会被混合内容拦截）
                $.ajax({
                    url: `https://www.pushplus.plus/send/`,
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify(pushJosn)
                });
                break;
                //飞书机器人
            case "3":
                var pushJosn = { "msg_type": "text", "content": { "text": text } };
                // 【2026-08-14 修复】同上，去掉全局 ajaxSetup
                $.ajax({
                    url: `https://open.feishu.cn/open-apis/bot/v2/hook/${pushToken}`,
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify(pushJosn)
                });
                break;
                //Qmsg私聊
            case "4":
                // 【2026-08-15 修复】同上，query 参数 URL 编码
                $.post(`https://qmsg.zendee.cn/send/${pushToken}?msg=${encodeURIComponent(text)}`);
                break;
                //Qmsg群聊
            case "5":
                // 【2026-08-15 修复】同上，query 参数 URL 编码
                $.post(`https://qmsg.zendee.cn/group/${pushToken}?msg=${encodeURIComponent(text)}`);
                break;
                //企业微信机器人（免费、量大、国内快；webhook 的 key= 后面那串即 Token）
                // 【2026-08-13 26.1.22 修复】企业微信接口不支持浏览器跨域：application/json 会触发 OPTIONS 预检被 403 拦截
                // → 改用 fetch no-cors + text/plain（简单请求不发预检，消息能送达；text/plain 企业微信已验证接受）
                // 【2026-08-16】推送内容中的 [颜色] 前缀（如 [黄]狂风快刀）是纯文本，企业微信直接渲染，无需额外转换
                // 【2026-08-19】修复：字面 \n 转真正换行符，<br> 转 \n，实现企业微信消息换行
                // 【2026-08-19】cors + application/json 触发 CORS 预检被拒，退回 no-cors + text/plain
                // 【2026-08-19】改用 markdown 消息类型，\n 换行支持更稳定
            case "6":
                var _wxContent = String(text).replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n');
                var pushBody = JSON.stringify({ "msgtype": "markdown", "markdown": { "content": _wxContent } });
                try {
                    fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${pushToken}`, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'text/plain' },
                        body: pushBody
                    });
                } catch (e) { }
                break;
        }
    }
};

// 【2026-08-13 无人值守推送】关键事件自动推送（掉线/死亡/卡死等），带防重复
// 与手动 @push 共用同一推送渠道；总开关未开时静默跳过（不弹提示不打扰）
// 第三个参数 interval 可自定义同类防重复间隔（毫秒），默认 15 分钟
// 【2026-08-13 26.1.24】自动在消息前加当前角色标识，十几开时能分辨是哪个号的推送
var _pushAlertLog = {};                  // tag -> 上次推送时间
var _PUSH_ALERT_INTERVAL = 15 * 60 * 1000;   // 同类事件 15 分钟最多推一次（防刷屏）
// 获取当前角色名（26.1.25：只留名字，ID 不需要；未登录或取不到则空串）
function _pushRoleTag() {
    try {
        if (typeof Role !== 'undefined' && Role && Role.name) return String(Role.name).trim();
        return '';
    } catch (e) { return ''; }
}
function PushAlert(tag, text, interval) {
    try {
        if (typeof pushSwitch === 'undefined' || (pushSwitch != '开' && pushSwitch !== true && pushSwitch !== 'true')) return;   // 推送总开关没开 → 静默
        if (!text) return;
        var now = Date.now();
        var last = _pushAlertLog[tag] || 0;
        var minGap = (typeof interval === 'number' && interval > 0) ? interval : _PUSH_ALERT_INTERVAL;
        if (now - last < minGap) return;   // 防刷屏
        _pushAlertLog[tag] = now;
        // 自动加角色标识（十几开分辨哪个号）
        var _tag2 = _pushRoleTag();
        if (_tag2) text = '【' + _tag2 + '】' + text;
        try { ExtLog.warn('[推送] ' + text); } catch (e) { }
        Push(text);
    } catch (e) { }
}
class MusicBox {
    constructor(options) {
        let defaults = {
            loop: false,
            musicText: '',
            autoplay: false,
            type: 'sine',
            duration: 2
        };
        this.arrFrequency = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760, 1967];
        this.arrNotes = ['·1', '·2', '·3', '·4', '·5', '·6', '·7', '1', '2', '3', '4', '5', '6', '7', '1·', '2·', '3·', '4·', '5·', '6·', '7·'];
        this.opts = Object.assign(defaults, options);
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.opts.autoplay && this.playMusic(this.opts.musicText, this.opts.autoplay)
    }
    createSound(freq) {
        let oscillator = this.audioCtx.createOscillator();
        let gainNode = this.audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.type = this.opts.type;
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, this.audioCtx.currentTime + 0.01);
        oscillator.start(this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + this.opts.duration);
        oscillator.stop(this.audioCtx.currentTime + this.opts.duration)
    }
    createMusic(note) {
        let index = this.arrNotes.indexOf(note);
        if (index !== -1) {
            this.createSound(this.arrFrequency[index])
        }
    }
    pressBtn(i) {
        this.createSound(this.arrFrequency[i])
    }
    playMusic(musicText, speed = 2) {
        let i = 0,
            musicArr = musicText.split(' ');
        let timer = setInterval(() => {
            try {
                let n = this.arrNotes.indexOf(musicArr[i]);
                if (musicArr[i] !== '-' && musicArr[i] !== '0') {
                    this.pressBtn(n)
                }
                i++;
                if (i >= musicArr.length) {
                    this.opts.loop ? i = 0 : clearInterval(timer)
                }
            } catch (e) {
                alert('请输入正确的乐谱！');
                clearInterval(timer)
            }
        }, 1000 / speed);
        return timer
    }
};
