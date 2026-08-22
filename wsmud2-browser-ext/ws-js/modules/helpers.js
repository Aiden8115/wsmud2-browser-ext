// ============================================================
// helpers.js —— 自命令函数库 TaskHelper（别名 T）+ ProConsole
// ------------------------------------------------------------
// TaskHelper 是被 WG.SendCmd 动态调用的"功能函数库"，
// 你在自命令里写 T.函数名 就会调到这里：
//   T.findItem / T.findPlayerByName  按名字找物品/玩家
//   T.wait / T.batwait               等待（含"等待某个条件"）
//   T.killw / T.eqw / T.usezml       杀怪/穿装备/用指令
//   T.waitpfm / T.startjk / T.roll / T.cls  等出招/开始监控/掷骰子/清屏
// 想加一个"自命令能用的新函数" → 在这里给 TaskHelper 加一个方法。
// ============================================================
// helpers.js
// T helper functions and ProConsole
'use strict';

//助手函数
const TaskHelper = {
    //private
    _recmd: function (cmds) {
        if (cmds) {
            cmds = cmds instanceof Array ? cmds : cmds.split(';');
            cmds.baoremove(0);
            cmds = cmds.join(";");
            return cmds;
        } else {
            return "";
        }
    },
    recmd: function (idx, cmds) {
        for (let i = 0; i < idx + 1; i++) {
            cmds = TaskHelper._recmd(cmds);
        }
        return cmds;
    },
    findhook: undefined,
    _findItem: async function (itemname, callback) {
        console.log("finditem" + itemname);
        TaskHelper.findhook = WG.add_hook("dialog", async function (data) {
            if (data.items) {
                for (let item of data.items) {
                    if (item.name == itemname) {
                        callback(item.id);
                        WG.remove_hook(TaskHelper.findhook);
                    }
                }
                callback("");
            }
            WG.remove_hook(TaskHelper.findhook);
        });

        WG.Send("pack");
    },
    //public
    pname: function (idx = 0, n, cmds) {
        TaskHelper.findPlayerByName(idx, n, cmds);
    },
    findPlayerByName: function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx - 1, cmds);
        if (cmds.indexOf(",") >= 0) {
            cmds = cmds.split(",");
        } else {
            cmds = cmds.split(";");
        }
        let p = cmds[0].split("$")[0];
        cmds = TaskHelper.recmd(0, cmds);
        p = p.replaceAll("-", " ");
        if (p[p.length - 1] == " ") {

            p = p.substring(0, p.length - 1)
        }
        console.log("findPlayerByName" + n);

        for (let i = 0; i < roomData.length; i++) {
            if (roomData[i].name && roomData[i].name.indexOf(n) >= 0) {
                WG.Send(p + " " + roomData[i].id);
            }
        }
        WG.SendCmd(cmds);
    },
    findItem: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx - 1, cmds);
        if (cmds.indexOf(",") >= 0) {
            cmds = cmds.split(",");
        } else {
            cmds = cmds.split(";");
        }
        let p = cmds[0].split(" ")[0];
        cmds = TaskHelper.recmd(0, cmds);
        console.log("finditem" + n);

        WG.Send("pack");
        // console.log(GameState.packs.items)
        for (let item of GameState.packs.items) {
            if (item.name == n) {
                if (p == "fenjie" || p == "drop") {
                    if (item.name.indexOf("★") >= 0) {
                        messageAppend("高级物品 ,不分解");
                        continue;
                    }
                }
                WG.SendCmd(p + " " + item.id);
            }
        }

        WG.SendCmd(cmds);
    },
    wait: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        console.log("延时:" + n + "ms,延时触发:" + cmds);
        await WG.sleep(parseInt(n));
        WG.SendCmd(cmds);
    },
    batwait: async function (idx = 0, n, cmds) {
        if (GameState.fight.in_fight) {
            cmds = TaskHelper.recmd(idx, cmds);
            console.log("延时:" + n + "ms,延时触发:" + cmds);
            await WG.sleep(parseInt(n));
            WG.SendCmd(cmds);
        }
    },

    gogzm: async function () {
        WG.SendCmd("jh fam 9 start;go enter;go up;")
        await WG.sleep(1000);
        var ltId = "";
        for (let i = 0; i < roomData.length; i++) {
            if (roomData[i].name && roomData[i].name.indexOf("疯癫的老头") >= 0) {
                ltId = roomData[i].id
            }
        }
        WG.SendCmd("ggdl " + ltId + ";go north;go north;go north;go north;$wait 250;go north;go north;$wait 250;look shi;tiao1 shi;tiao1 shi;tiao2 shi;$wait 250;jumpdown;")
    },
    godddb: async function () {
        WG.SendCmd("jh fam 9 start;go enter;go up;")
        await WG.sleep(1000);
        var ltId = "";
        for (let i = 0; i < roomData.length; i++) {
            if (roomData[i].name && roomData[i].name.indexOf("疯癫的老头") >= 0) {
                ltId = roomData[i].id
            }
        }
        WG.SendCmd("ggdl " + ltId + ";go north;go north;go north;go north;$wait 250;go north;go down;")
    },
    killall: async function (idx = 0, n = null, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.kill_all();
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    getall: async function (idx = 0, n = null, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.get_all();
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    to: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.go(n);
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    zdwk: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.zdwk();
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    rzdwk: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.zdwk("", false);
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    killhook: undefined,
    killw: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        var killid = "";
        for (let i = 0; i < roomData.length; i++) {
            if (roomData[i].name && roomData[i].name.indexOf(n) >= 0) {
                killid = roomData[i].id;
            }
        }
        TaskHelper.killhook = WG.add_hook('itemremove', function (data) {
            if (data.id == killid) {
                WG.SendCmd(cmds);
                WG.remove_hook(TaskHelper.killhook);
                TaskHelper.killhook = undefined;
            }
        });
        WG.SendCmd("kill " + killid);
    },
    eqhook: undefined,
    eqw: async function (idx = 0, n, cmds) {
        var pcmds = TaskHelper.recmd(idx, cmds);
        if (n.indexOf("<") >= 0) {
            TaskHelper._findItem(n, async function (id) {
                let p_itemid = id;
                let p_flag = true;
                if (p_itemid == "") {
                    p_flag = false;
                    WG.SendCmd(pcmds);
                    return;
                }
                TaskHelper.eqhook = WG.add_hook('dialog', function (data) {
                    if (data.eq == 0 && data.id == p_itemid) {
                        p_flag = false;
                        WG.SendCmd(pcmds);
                        WG.remove_hook(TaskHelper.eqhook);
                        TaskHelper.eqhook = undefined;
                    }
                });
                while (p_flag) {
                    WG.Send("pack");
                    WG.SendCmd('eq ' + p_itemid);
                    await WG.sleep(1000);
                }

            });
        } else {
            let p_itemid = n;
            let p_flag = true;
            if (p_itemid == "") {
                p_flag = false;
                WG.SendCmd(pcmds);
                return;
            }
            TaskHelper.eqhook = WG.add_hook(['text', 'dialog'], function (data) {
                if (data.type == 'dialog') {
                    if (data.eq == 0 && data.id == p_itemid) {
                        p_flag = false;
                        WG.SendCmd(pcmds);
                        WG.remove_hook(TaskHelper.eqhook);
                        TaskHelper.eqhook = undefined;
                    }
                }
                if (data.type == 'text') {
                    if (data.msg.indexOf("你要装备什么") >= 0) {
                        p_flag = false;
                        WG.SendCmd(pcmds);
                        WG.remove_hook(TaskHelper.eqhook);
                        TaskHelper.eqhook = undefined;
                    }
                }
            });
            while (p_flag) {
                WG.Send("pack");
                WG.SendCmd('eq ' + p_itemid);
                await WG.sleep(1000);
            }
        }
    },
    usezml: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        zml = GM_getValue(roleid + "_zml", zml);
        for (var zmlitem of zml) {
            if (zmlitem.name == n) {
                await WG.zmlfire(zmlitem);
            }
        }
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    usetz: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        let tz = GM_getValue("extends");
        for (var tzitem of tz) {
            if (tzitem.name == n) {
                await WG.sleep(100);
                let cmd = tzitem.content;
                SCRIPT.run(cmd);
            }
        }
    },
    waitpfm: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        let _flag = true;
        let attemptCount = 0;

        while (_flag) {
            if (!WG.gcd && !WG.cds.get(n)?.iscd) {
                WG.Send("perform " + n);
                attemptCount++;
                if (WG.cds.get(n)?.iscd && _flag) {
                    _flag = false;
                    WG.SendCmd(cmds);
                }
                if (!GameState.fight.in_fight && _flag) {
                    _flag = false;
                    WG.SendCmd(cmds);
                }
                if (attemptCount >= 1 && _flag) {
                    _flag = false;
                    WG.SendCmd(cmds);
                }
            }
            attemptCount++;
            await WG.sleep(350);
        }

    },
    startjk: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item);
        for (var item of ztjk_item) {
            if (item.name == n) {
                item.isactive = 1;
                GM_setValue(roleid + "_ztjk", ztjk_item);
                WG.ztjk_func();
                messageAppend("已注入" + item.name, 1);
                break;
            }
        }
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    stopjk: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item);
        for (var item of ztjk_item) {
            if (item.name == n) {
                item.isactive = 0;
                GM_setValue(roleid + "_ztjk", ztjk_item);
                WG.ztjk_func();
                messageAppend("已暂停" + item.name);
                break;
            }
        }
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    stoppfm: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        if (auto_pfmswitch == "开" || auto_pfmswitch === true || auto_pfmswitch === 'true') {
            auto_pfmswitch = "关";
            messageAppend("<hio>自动施法</hio>关闭");
            WG.auto_preform("stop");
            // 【2026-08-15】按钮文字同步开关状态
            WG.auto_perform_button();
        }
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    startpfm: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        if (auto_pfmswitch == "关" || auto_pfmswitch === false || auto_pfmswitch === 'false') {
            auto_pfmswitch = "开";
            messageAppend("<hio>自动施法</hio>开启");
            WG.auto_preform();
            // 【2026-08-15】按钮文字同步开关状态
            WG.auto_perform_button();
        }
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    stopautopfm: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        var dellist = n.split(",");
        for (let p of dellist) {
            if (!WG.inArray(p, blackpfm)) {
                blackpfm.push(p);
            }
        }
        console.log("当前自动施法黑名单为:" + blackpfm);
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },
    startautopfm: async function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        let dellist = n.split(",");
        for (var i = 0; i < blackpfm.length; i++) {
            for (var item of dellist) {
                if (item == blackpfm[i]) {
                    blackpfm.baoremove(i);
                }
            }
        }
        console.log("当前自动施法黑名单为:" + blackpfm);
        await WG.sleep(100);
        WG.SendCmd(cmds);
    },

    callcontextMenu: function (idx = 0, n, cmds) {
        $('.container').contextMenu({
            x: 1,
            y: 1
        })
    },
    stopallauto: function (idx = 0, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.stopAllAuto();
        messageAppend("暂停自动喜宴及自动BOSS", 1);
        WG.SendCmd(cmds);
    },
    startallauto: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.reSetAllAuto();
        messageAppend("暂停自动喜宴及自动BOSS", 1);
        WG.SendCmd(cmds);
    },
    roll: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        if (n == 1) {
            WG.SendCmd("pty " + Math.random() * 100);
        } else if (n == 2) {

            WG.SendCmd("chat " + Math.random() * 100);
        } else if (n == 3) {

            WG.SendCmd("say " + Math.random() * 100);
        }
        WG.SendCmd(cmds);
    },
    clsSakada: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.clean_dps();
        WG.SendCmd(cmds);
    },
    cls: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        messageClear();
        WG.SendCmd(cmds);
    },
    syso: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        messageAppend(n);
        WG.SendCmd(cmds);
    },
    stop: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        WG.timer_close();
        WG.SendCmd(cmds);
    },
    close: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        KEY.dialog_close();
        WG.SendCmd(cmds);
    },
    tts: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        FakerTTS.playtts(n);
        WG.SendCmd(cmds);
    },
    beep: async function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        Beep();
        WG.SendCmd(cmds);
    },
    music: function (idx, n, cmds) {
        cmds = TaskHelper.recmd(idx, cmds);
        var music = new MusicBox({
            loop: false, // 循环播放
            musicText: '6 - - 5 - 3 2 - 1 - - - 3 - - 2 1 - ·6 ·5 - - - ·5 - ·6 - ·5 - ·6 - 1 - - 2 - 3 5 6 - - 3 2 1 - 2',  // 绿色
            autoplay: 6, // 自动弹奏速度
            type: 'triangle',  // 音色类型  sine|square|triangle|sawtooth
            duration: 2  // 键音延长时间
        });
        WG.SendCmd(cmds);
    }
};
const T = TaskHelper;
