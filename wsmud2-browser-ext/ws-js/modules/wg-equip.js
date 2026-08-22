// ============================================================
// wg-equip.js —— 自动换装功能
// ------------------------------------------------------------
// 提供右键菜单中的「换装设置」和「换装」功能：
//   保存/读取装备套装、一键换装、一键切换技能、复制换装命令
// 数据存储于 GM_setValue(roleid + "_eqlist") 和 GM_setValue(roleid + "_skilllist")
// ============================================================
'use strict';

// 装备列表和技能列表（全局变量，与 WG.eqhelper 共享）
var eqlist = {};
var skilllist = {};

// 换装相关 hook 句柄
if (typeof WG.eqx === 'undefined') WG.eqx = null;
if (typeof WG.eqxp === 'undefined') WG.eqxp = null;

Object.assign(WG, {

    // ---- 核心：保存/换装 ----
    eqhelper: function (type, enaskill, realy) {
        if (enaskill === undefined) enaskill = 0;
        if (realy === undefined) realy = false;

        if (type == undefined || type == 0 || type > eqlist.length) {
            return;
        }

        // 从存储读取
        eqlist = GM_getValue(roleid + "_eqlist", {});
        skilllist = GM_getValue(roleid + "_skilllist", {});

        if (eqlist == null || eqlist[type] == null || eqlist[type] == "") {
            // -- 套装不存在，保存当前装备 --
            if (enaskill == 1) {
                return;
            }
            messageAppend("套装未保存,保存当前装备作为套装" + type + "!", 1);
            WG.eqx = WG.add_hook("dialog", function (data) {
                if (data.dialog == "pack" && data.eqs != undefined) {
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    eqlist = GM_getValue(roleid + "_eqlist", {});
                    eqlist[type] = JSON.parse(JSON.stringify(data.eqs));
                    GM_setValue(roleid + "_eqlist", eqlist);
                    messageAppend("套装" + type + "保存成功!", 1);
                    if (WG.eqx) { WG.remove_hook(WG.eqx); WG.eqx = null; }
                }
            });
            WG.eqxp = WG.add_hook("dialog", function (data) {
                if (data.dialog == 'skills' && data.items != null) {
                    var nowskill = { 'throwing': '', 'unarmed': '', 'force': '', 'dodge': '', 'sword': '', 'blade': '', 'club': '', 'staff': '', 'whip': '', 'parry': '' };
                    for (let item of data.items) {
                        if (nowskill[item.id] != null) {
                            nowskill[item.id] = item.enable_skill || 'none';
                        }
                    }
                    skilllist = GM_getValue(roleid + "_skilllist", {});
                    skilllist[type] = nowskill;
                    GM_setValue(roleid + "_skilllist", skilllist);
                    messageAppend("技能" + type + "保存成功!", 1);
                    if (WG.eqxp) { WG.remove_hook(WG.eqxp); WG.eqxp = null; }
                }
            });
            WG.Send("cha");
            WG.Send("pack");
        } else {
            // -- 套装已存在，执行换装 --
            if (WG.eqx != null || WG.eqxp != null) {
                if (WG.eqx) { WG.remove_hook(WG.eqx); WG.eqx = null; }
                if (WG.eqxp) { WG.remove_hook(WG.eqxp); WG.eqxp = null; }
            }
            eqlist = GM_getValue(roleid + "_eqlist", {});
            skilllist = GM_getValue(roleid + "_skilllist", {});

            if (realy) {
                // 复制命令到剪贴板
                var eqdata = "";
                if (enaskill == 0) {
                    for (let i = 1; i < 11; i++) {
                        if (eqlist[type][i] != null && eqlist[type][i] != "") {
                            eqdata += "eq " + eqlist[type][i].id + ";";
                        }
                    }
                    eqdata += "eq " + eqlist[type][0].id + ";";
                } else {
                    for (let i in skilllist[type]) {
                        if (skilllist[type][i] != null && skilllist[type][i] != "") {
                            eqdata += "enable " + i + " " + skilllist[type][i] + ";";
                        }
                    }
                }
                copyToClipboard(eqdata);
                messageAppend(type + "已复制到剪贴板!", 1);
                return;
            }

            var p_cmds = "";
            let mySkills = [];
            let myEqs = new Set();

            if (GameState && GameState.packs && GameState.packs.eqs) {
                for (let ski of GameState.packs.eqs) {
                    if (ski) {
                        myEqs.add(ski.id);
                    }
                }
            }
            let tsMsg = "套装";
            if (enaskill === 0) {
                for (let i = 1; i < 11; i++) {
                    if (eqlist[type][i] != null && !myEqs.has(eqlist[type][i].id)) {
                        p_cmds += ("$wait 20;eq " + eqlist[type][i].id + ";");
                    }
                }
                if (eqlist[type][0] != null && !myEqs.has(eqlist[type][0].id)) {
                    p_cmds += ("$wait 40;eq " + eqlist[type][0].id + ";");
                }
            }
            if (enaskill === 1) {
                var enableSkills = (GameState && GameState.skills && GameState.skills.enable_skills) ? GameState.skills.enable_skills : {};
                for (var key in skilllist[type]) {
                    if (enableSkills[key] && enableSkills[key].id != skilllist[type][key]) {
                        p_cmds += ("$wait 40;enable " + key + " " + skilllist[type][key] + ";");
                    }
                }
                tsMsg = "技能";
                $("span[command=skills]").click();
            }

            p_cmds = p_cmds + '$wait 40;cha;look3 1';

            WG.eqx = WG.add_hook('text', function (data) {
                if (data.type == 'text') {
                    if (data.msg.indexOf('没有这个玩家') >= 0) {
                        messageAppend(tsMsg + "装备成功" + type + "!", 1);
                        if (enaskill == 1) {
                            $("span[command=skills]").click();
                        }
                        if (WG.eqx) { WG.remove_hook(WG.eqx); WG.eqx = null; }
                    }
                }
            });

            WG.SendCmd(p_cmds);
        }
    },

    // ---- 删除套装 ----
    eqhelperdel: function (type) {
        eqlist = GM_getValue(roleid + "_eqlist", {});
        skilllist = GM_getValue(roleid + "_skilllist", {});
        delete eqlist[type];
        delete skilllist[type];
        GM_setValue(roleid + "_eqlist", eqlist);
        GM_setValue(roleid + "_skilllist", skilllist);
        messageAppend("清除套装 技能" + type + "设置成功!", 1);
    },

    // ---- 脱光装备 ----
    uneqall: function (isskill) {
        if (isskill === undefined) isskill = "0";
        if (isskill == "0") {
            var _eqx = WG.add_hook("dialog", function (data) {
                if (data.dialog == "pack" && data.eqs != undefined) {
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    for (let i = 0; i < data.eqs.length; i++) {
                        if (data.eqs[i] != null) {
                            WG.Send("uneq " + data.eqs[i].id);
                        }
                    }
                    WG.remove_hook(_eqx);
                }
            });
            WG.Send("pack");
            messageAppend("取消所有装备成功!", 1);
        } else {
            var enaNone = "enable unarmed none;enable blade none;enable force none;enable parry none;enable dodge none;enable sword none;enable throwing none;enable whip none;enable club none;enable staff none";
            var enalist = enaNone.split(";");
            for (let i = 0; i < enalist.length; i++) {
                if (enalist[i]) {
                    WG.sleep(10);
                    WG.Send(enalist[i]);
                }
            }
            messageAppend("取消所有技能成功!", 1);
        }
    },

    // ---- 生成右键菜单子项（动态） ----
    eqloader: function () {
        let tmp_eqlist = GM_getValue(roleid + "_eqlist", null);
        var subItems = {};
        if (tmp_eqlist) {
            for (let item in tmp_eqlist) {
                subItems[item] = { name: "装备" + item, icon: "fa-compress", callback: function () { WG.eqhelper(item, 0); } };
                subItems[item + "sk"] = { name: "技能" + item, icon: "fa-magic", callback: function () { WG.eqhelper(item, 1); } };
                subItems[item + "del"] = { name: "删除组" + item, icon: "fa-remove", callback: function () { WG.eqhelperdel(item); } };
            }
        }
        subItems['setting'] = { name: "套装管理", icon: "edit", callback: function () { WG.eqhelperui(); } };
        var dfd = jQuery.Deferred();
        setTimeout(function () {
            dfd.resolve(subItems);
        }, 20);
        return dfd.promise();
    },

    // ---- 套装管理界面（Vue） ----
    eqhelperui: function () {
        messageClear();
        var a = [
            '<div class="item-commands" style="text-align:center" id="skillsPanelUI">',
            '  <div style="margin-top:0.5em">',
            '    <div style="width:8em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" @click="show"><wht>{{role}}</wht></div>',
            '    <div style="width:calc(100% - 16em);float:left;height:1.23em"><hig>套装列表</hig></div>',
            '    <div style="width:8em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em">',
            '      <select style="width:80px" id="eqskills-opts" @change="eqskills_opts_change(eqskills_id)" v-model="eqskills_id">',
            '        <option value="none">选择操作</option>',
            '        <option value="save">新建套装</option>',
            '        <option value="covereq">覆盖套装</option>',
            '        <option value="copyeq">复制命令</option>',
            '        <option value="delete">删除套装</option>',
            '        <option value="uneqall">脱光装备</option>',
            '      </select>',
            '    </div>',
            '  </div>',
            '  <br><br>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in eqlistdel" @click="deleq(index)" style="width:120px">',
            '      <div style="width:100%">删除{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in eqlist" @click="eq(index)" style="width:120px">',
            '      <div style="width:100%">装备套装:{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in covereqlist" @click="covereq(index)" style="width:120px">',
            '      <div style="width:100%">覆盖套装:{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <br>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in eqlist" @click="eqs(index)" style="width:120px">',
            '      <div style="width:100%">装备技能:{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in cpeqlist" @click="copyeq(index)" style="width:120px">',
            '      <div style="width:100%">复制装备套装:{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <br>',
            '  <div class="item-commands">',
            '    <span class="zdy-item" v-for="(item, index) in cpeqlist" @click="copyeqs(index)" style="width:120px">',
            '      <div style="width:100%">复制装备技能:{{index}}</div>',
            '    </span>',
            '  </div>',
            '  <br>',
            '</div>'
        ].join('\n');
        messageAppend(a, 2, null, true);
        new Vue({
            el: "#skillsPanelUI",
            data: {
                role: role,
                roleid: roleid,
                eqlist: {},
                cpeqlist: {},
                eqlistdel: {},
                covereqlist: {},
                eqskills_id: "none"
            },
            mounted: function () {
                this.eqlist = GM_getValue(this.roleid + "_eqlist", {});
            },
            methods: {
                eq: function (name) { WG.eqhelper(name, 0); },
                eqs: function (name) { WG.eqhelper(name, 1); },
                copyeq: function (name) { WG.eqhelper(name, 0, true); },
                copyeqs: function (name) { WG.eqhelper(name, 1, true); },
                save: function (name) {
                    WG.eqhelper(name);
                    var that = this;
                    setTimeout(function () {
                        that.eqlist = GM_getValue(that.roleid + "_eqlist", {});
                        WG.eqhelperui();
                    }, 300);
                },
                covereq: function (name) {
                    this.deleq(name);
                    this.save(name);
                },
                deleq: function (name) {
                    WG.eqhelperdel(name);
                    var that = this;
                    setTimeout(function () {
                        WG.eqhelperui();
                    }, 200);
                },
                show: function () { WG.eqhelperui(); },
                saveUI: function () {
                    var that = this;
                    layer.prompt({ title: '请输入套装名...', formType: 2 }, function (text, index) {
                        layer.close(index);
                        if (text != null) {
                            that.save(text);
                        }
                    });
                },
                eqskills_opts_change: function (eqskills_id) {
                    switch (eqskills_id) {
                        case "save":
                            this.saveUI();
                            break;
                        case "copyeq":
                            this.covereqlist = {};
                            this.eqlist = {};
                            this.eqlistdel = {};
                            this.cpeqlist = GM_getValue(this.roleid + "_eqlist", {});
                            this.role = "<< 返回";
                            break;
                        case "delete":
                            this.cpeqlist = {};
                            this.eqlist = {};
                            this.covereqlist = {};
                            this.eqlistdel = GM_getValue(this.roleid + "_eqlist", {});
                            this.role = "<< 返回";
                            break;
                        case "covereq":
                            this.cpeqlist = {};
                            this.eqlist = {};
                            this.eqlistdel = {};
                            this.covereqlist = GM_getValue(this.roleid + "_eqlist", {});
                            this.role = "<< 返回";
                            break;
                        case "uneqall":
                            WG.uneqall();
                            break;
                        case "none":
                        default:
                            break;
                    }
                }
            }
        });
    }

});