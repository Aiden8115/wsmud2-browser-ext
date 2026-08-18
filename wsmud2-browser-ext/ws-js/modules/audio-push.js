// audio-push.js
// S config, FakerTTS, Beep, Push, MusicBox
'use strict';


var SettingsStore = {
    serverUrl: "https://wsmud.ii74.com",
    GetJson: function (path, data) {
        let res = '';
        $.post(SettingsStore.serverUrl + path, data, (data) => {
            res = data;
        });
        return res;
    },
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
                messageAppend("失败了，或配置已存在");
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
                $.post(`https://sctapi.ftqq.com/${pushToken}.send?title=${text}`);
                break;
                //Bark iOS
            case "1":
                $.post(`https://api.day.app/${pushToken}/武神传说/${encodeURIComponent(text)}`);
                break;
                //PushPlus
            case "2":
                var pushJosn = { "token": pushToken, "title": "武神传说", "content": text };
                $.ajaxSetup({ contentType: "application/json; charset=utf-8" });
                $.post(`http://www.pushplus.plus/send/`, JSON.stringify(pushJosn));
                break;
                //飞书机器人
            case "3":
                var pushJosn = { "msg_type": "text", "content": { "text": text } };
                $.ajaxSetup({ contentType: "application/json; charset=utf-8" });
                $.post(`https://open.feishu.cn/open-apis/bot/v2/hook/${pushToken}`, JSON.stringify(pushJosn));
                break;
                //Qmsg私聊
            case "4":
                $.post(`https://qmsg.zendee.cn/send/${pushToken}?msg=${text}`);
                break;
                //Qmsg群聊
            case "5":
                $.post(`https://qmsg.zendee.cn/group/${pushToken}?msg=${text}`);
                break;
                //企业微信机器人（使用 fetch no-cors 避免 CORS 拦截）
            case "6":
                var pushData = { msgtype: "text", text: { content: text } };
                fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${pushToken}`, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pushData)
                });
                break;
        }
    }
};
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
