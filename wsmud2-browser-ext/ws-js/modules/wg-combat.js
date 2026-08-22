// ============================================================
// wg-combat.js —— 战斗执行核心
// ------------------------------------------------------------
// 插件"打架"的全部逻辑都在这里：
//   WG.Send / WG.SendCmd   指令解析与发送（支持 $等待、{r物品名}、T.函数 等语法）
//   auto_preform           自动施法循环：按技能表放招，用 cds 记冷却、
//                          黑名单过滤、is_free 判断空闲状态（两种模式）
//   auto_fight             自动比试：打坐疗伤 → 满血再战
//   recover                血蓝自动回复
//   clean_dps              DPS 统计
//   go / place             寻路（走去某个地点）
//   kill_all / get_all / zdwk  杀怪 / 捡尸 / 挖矿钓鱼
//   collBoss / xiyan       领 BOSS / 喜宴
// 想改自动战斗的节奏、技能选择逻辑 → 在本文件搜索对应函数。
// ============================================================
// wg-combat.js
// WG combat: auto fight, recover, loot, DPS
'use strict';

// 【2026-08-14 安全优化】自命令 T.xxx 直接函数分发（替代 eval，防注入）
// 原实现把命令文本拼进 eval("T.xxx(...)") 执行：命令里含单引号/换行会语法错误甚至注入代码。
// 现在改为按函数名直接调用 TaskHelper 的方法（hasOwnProperty 校验，防原型链污染），行为完全一致。
function TaskHelper_call(fnName, idx, arg, cmds) {
    try {
        if (!fnName ||
            !Object.prototype.hasOwnProperty.call(TaskHelper, fnName) ||
            typeof TaskHelper[fnName] !== 'function') {
            console.warn('[WSMUD] SendCmd 未知的自命令函数 T.' + fnName + '，已跳过');
            return;
        }
        TaskHelper[fnName](idx, arg, cmds);
    } catch (e) {
        console.error('[WSMUD] SendCmd T.' + fnName + ' 执行出错:', e);
    }
}

Object.assign(WG, {
      clean_data: function () {
          messageClear();
          let html = UI.cleandataui();
          // 【2026-08-15 修改】清空数据面板属于快捷面板一类，与定时任务/自命令一致渲染到左侧 .WG_log
          // （原 area=0 渲染到右侧 .WG_log_log）
          messageAppend(html, 2, null, true);
          $(".dps").off('click');
          $(".getjy").off('click');
          $(".getitem").off('click');
          $(".dps").on("click", function () {
              WG.clean_dps();
              messageAppend("清空成功");
          });
          $(".getjy").on("click", function () {
              expGained = 0;
              potGained = 0;
              messageAppend("清空成功");
          });
          $(".getitem").on("click", function () {
              for(let key in itemTotalCount){
                  delete itemTotalCount[key];
              }
              messageAppend("清空成功");
          });
      },
      clean_dps: function () {
          if (dpsLocked && battleStartTime != 0) {
              let allpfmnum = normalHitCount + critHitCount;
              let alldps = normalDamageTotal + critDamageTotal;
              let battle_t = (new Date().getTime() - battleStartTime.getTime()) / 1000;

              let real_dps = Math.ceil(alldps / battle_t);
              let real_act = allpfmnum / battle_t;
              if (battle_t < 1) {
                  real_dps = Math.ceil(alldps);
                  real_act = allpfmnum;
              }
              setTimeout(() => {
                  messageAppend(`<hiw>⚔️战斗过程分析:
                  ⏱️战斗时长:<hir>${battle_t}秒</hir>
                  ⚔️普通攻击:<hir>${normalHitCount}次</hir>
                  ⚔️普通伤害:<hir>${addChineseUnit(normalDamageTotal)}</hir>
                  🌟暴击攻击:<hir>${critHitCount}次</hir>
                  🌟暴击伤害:<hir>${addChineseUnit(critDamageTotal)}</hir>
                  ⚔️总计攻击:<hir>${(allpfmnum)}次</hir>
                  ⚔️总计伤害:<hir>${addChineseUnit(alldps)}</hir>
                  ⏱️每秒伤害:<hir>${addChineseUnit(real_dps)}</hir>
                  ⏱️每秒攻击:<hir>${Math.round(real_act)}</hir></hiw>`, 0, "dps");
                  normalDamageTotal = 0;
                  normalHitCount = 0;
                  critDamageTotal = 0;
                  critHitCount = 0;
                  dpsLocked = 0;
              }, 100);
          }
      },
      Send: async function (cmd) {
          if (CanUse) {
              send_cmd(cmd, true);
          } else {
              if (cmd) {
                  cmd = cmd instanceof Array ? cmd : cmd.split(';');
                  for (var c of cmd) {
                      $("span[WG='WG']").attr("cmd", c).click();
                  }
              }
          }
      },
      SendStep: async function (cmd) {
          if (cmd) {
              cmd = cmd instanceof Array ? cmd : cmd.split(';');
              for (var c of cmd) {
                  WG.SendCmd(c);
                  await WG.sleep(12000);
              };
          }
      },
      SendCmd: async function (cmd) {
          if (cmd) {
              if (cmd.indexOf(",") >= 0) {
                  if (cmd instanceof Array) {
                      cmd = cmd;
                  } else {
                      if (cmd.indexOf(";") >= 0) {
                          cmd = cmd.split(";");
                      } else {
                          cmd = cmd.split(",");
                      }
                  }
              } else {
                  cmd = cmd instanceof Array ? cmd : cmd.split(';');
              }
              let idx = 0;
              let cmds = '';
              for (var c of cmd) {
                  if (c.indexOf("$") >= 0) {
                      if (c[0] == "$") {
                          c = c.replace("$", "");
                          let p0 = c.split(" ")[0];
                          let p1 = c.split(" ")[1];
                          cmds = cmd.join(";");
                          TaskHelper_call(p0, idx, p1, cmds);
                          return;
                      } else {
                          var p_c = c.split(" ");
                          p_c = p_c[p_c.length - 1];
                          // buy $sitem from $snpc
                          if (p_c) {
                              if (p_c[0] == "$") {
                                  p_c = p_c.replace("$", "");
                                  let patt = new RegExp(/\".*?\"/);
                                  var m1 = patt.exec(p_c);
                                  var result = m1 ? m1[0] : '';
                                  cmds = cmd.join(";");
                                  // 【2026-08-14 安全优化】原 eval 传的是字符串字面量，JSON.parse 还原成真实字符串
                                  TaskHelper_call(p_c.split('(')[0], idx, result ? JSON.parse(result) : '', cmds);
                                  return;
                              } else {
                                  p_c = c.split(" ");
                                  if (p_c[1].indexOf('$') >= 0) {
                                      p_c = p_c[1].replace("$", "");
                                      let patt = new RegExp(/\".*?\"/);
                                      var m2 = patt.exec(p_c);
                                      var result2 = m2 ? m2[0] : '';
                                      cmds = cmd.join(";");
                                      // 【2026-08-14 安全优化】同上，直接函数分发
                                      TaskHelper_call(p_c.split('(')[0], idx, result2 ? JSON.parse(result2) : '', cmds);
                                      return;
                                  }
                              }
                          } else {

                              return;
                          }
                      }
                  }
                  //npc id解析
                  if (c.indexOf("{r") >= 0) {
                      var rep = c.match("\{r([^}]+)\}");
                      // 【2026-08-14 修复】{r 未闭合（如 "{r木头"）时 rep 为 null，原代码 rep[1] 空引用抛错；加守卫
                      if (rep && rep[1]) {
                          for (let [id, item] of GameState.items) {
                              if (item.name.indexOf(rep[1]) >= 0) {
                                  var subStr = new RegExp('\{r([^}]+)\}');
                                  c = c.replace(subStr, id);
                                  break;
                              }
                          }
                      }
                      
                  }
                  WG.Send(c);
                  idx = idx + 1;
              };
          }
      },
        sleep: function (time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        },
        stopAllAuto: function () {
            stopauto = true;
        },
        reSetAllAuto: function () {
            stopauto = false;
        },
        go: async function (p) {
            if ((saveAddr == '开' || saveAddr === true || saveAddr === 'true') && p == '扬州城-钱庄') {
                p = '住房-卧室'
            }
            if (needfind[p] == undefined) {
                if (WG.at(p)) {
                    return;
                }
            }
            if (place[p] != undefined) {
                GameState.ingo = true;
                // 检查place[p]是否为函数，如果是则执行获取返回值
                let cmd = typeof place[p] === 'function' ? place[p]() : place[p];
                await WG.SendCmd(cmd);
                GameState.ingo = false;
            }
        },
        at: function (p) {
            if ((saveAddr == '开' || saveAddr === true || saveAddr === 'true') && p == '扬州城-钱庄') {
                p = '住房-卧室'
            }
            var w = $(".room-name").html();
            return w.indexOf(p) != -1;
        },

        getIdByName: function (n) {
            for (let i = 0; i < roomData.length; i++) {
                if (roomData[i].name && roomData[i].name.indexOf(n) >= 0) {
                    return roomData[i].id;
                }
            }
            return null;
        },
        ythook: undefined,
        ungetStore: false,
        kala_count: 0,
        eq: function (e) {
            WG.Send("eq " + e);
        },
        go_home: function () {
            WG.Send('goto home');
        },
        go_wumiao: function() {
            WG.go('扬州城-武庙');
        },
        kill_all: function () {
            for (let [id, item] of GameState.items) {
                if (item.p != 1) {
                    WG.Send("kill " + id);
                }
            }
        },
        get_all: function () {
            for (let [id, item] of GameState.items) {
                if (item.name.indexOf("尸体") != -1) {
                    WG.Send("get all from " + id);
                }
            }
        },
        // 【2026-08-15】自动攻击按钮文字同步当前开关状态（同 cmd_echo 按钮"代码：开/关"）
        auto_perform_button: function () {
            var on = (auto_pfmswitch == "开" || auto_pfmswitch === true || auto_pfmswitch === 'true');
            $(".auto_perform").text(on ? "自动攻击：开" : "自动攻击：关");
        },
        cmd_echo_button: function () {
            if (cmd_echo) {
                cmd_echo = false;
                messageAppend("<hio>命令代码关闭</hio>");
            } else {
                cmd_echo = true;
                messageAppend("<hio>命令代码显示</hio>");
            }
            // 【2026-08-11】按钮文字同步显示当前开关状态
            $(".cmd_echo").text("代码：" + (cmd_echo ? "开" : "关"));
        },
        getItemNameByid: (id, callback) => {
            GameState.packs.items.forEach(function (item) {
                if (item != 0) {
                    if (item.id == id) {
                        callback(item.name);
                        return;
                    }
                }
            })
        },
        zdwk: async function () {
            // 【2026-08-15】开始挂机（挖矿/修炼/钓鱼）→ 重置发呆计时，供 (:idle_time) 预设变量使用
            try { if (unsafeWindow.Role && typeof unsafeWindow.Role.resetIdleTime === 'function') unsafeWindow.Role.resetIdleTime(); } catch (e) { }
            switch (String(autowork)) {
                case "0":
                    WG.Send("goto kuang;");
                    break;
                case "1":
                    WG.Send("goto home;go west;xiulian;");
                    break;
                case "2":
                    ToRaid.perform("goto home;go northeast;eq {b钓鱼竿}?;diao;");
                    break;
            }
        },
        // 【2026-08-09 移植v1.0.0】自动售卖：按 autoSellList 清单生成 Raid 流程批量 sell
        zdsell: async function () {
            if (!autoSellList) { messageAppend("<hig>自动售卖清单为空，请先在设置中填写物品名称</hig>"); return; }
            let names = autoSellList.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
            if (names.length === 0) { messageAppend("<hig>自动售卖清单为空</hig>"); return; }
            let summary = [];
            try {
                let Role = unsafeWindow.Role;
                if (Role && Role.items) {
                    let items = Object.values(Role.items);
                    names.forEach(function (name) {
                        let groups = {};
                        let patt = new RegExp(name);
                        items.forEach(function (item) {
                            if (item && item.name && patt.test(item.name)) {
                                let fullName = item.name.replace(/<[^>]+>/g, "").trim();
                                groups[fullName] = (groups[fullName] || 0) + parseInt(item.count || 0);
                            }
                        });
                        for (let fullName in groups) {
                            if (groups[fullName] > 0) summary.push(fullName + groups[fullName] + "个");
                        }
                    });
                }
            } catch (e) { summary = []; }
            if (summary.length === 0) { messageAppend("<hig>背包中没有要售卖的物品</hig>"); return; }
            let source = "//~silent\n@cmdDelay 0\npack\n";
            names.forEach(function (name) {
                source += "[while] {b(" + name + ")}? != null\n";
                source += "    sell {b(" + name + ")}\n";
                source += "    @await 100\n";
            });
            if (unsafeWindow && unsafeWindow.ToRaid && unsafeWindow.ToRaid.perform) {
                unsafeWindow.ToRaid.perform(source, "自动售卖", false);
                messageAppend("<hig>自动售卖" + summary.join("、") + "</hig>");
            } else {
                messageAppend("<hig>未找到 Raid 引擎，无法执行自动售卖</hig>");
            }
        },
        // 【2026-08-09 移植v1.0.0】自动使用：按 autoUseList 清单生成 Raid 流程批量 use
        zduse: async function () {
            if (!autoUseList) { messageAppend("<hig>自动使用清单为空，请先在设置中填写物品名称</hig>"); return; }
            let names = autoUseList.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
            if (names.length === 0) { messageAppend("<hig>自动使用清单为空</hig>"); return; }
            let summary = [];
            try {
                let Role = unsafeWindow.Role;
                if (Role && Role.items) {
                    let items = Object.values(Role.items);
                    names.forEach(function (name) {
                        let groups = {};
                        let patt = new RegExp(name);
                        items.forEach(function (item) {
                            if (item && item.name && patt.test(item.name)) {
                                let fullName = item.name.replace(/<[^>]+>/g, "").trim();
                                groups[fullName] = (groups[fullName] || 0) + parseInt(item.count || 0);
                            }
                        });
                        for (let fullName in groups) {
                            if (groups[fullName] > 0) summary.push(fullName + groups[fullName] + "个");
                        }
                    });
                }
            } catch (e) { summary = []; }
            if (summary.length === 0) { messageAppend("<hig>背包中没有要使用的物品</hig>"); return; }
            let source = "//~silent\n@cmdDelay 0\npack\n";
            names.forEach(function (name) {
                source += "[while] {b(" + name + ")}? != null\n";
                source += "    use {b(" + name + ")}\n";
                source += "    @await 100\n";
            });
            if (unsafeWindow && unsafeWindow.ToRaid && unsafeWindow.ToRaid.perform) {
                unsafeWindow.ToRaid.perform(source, "自动使用", false);
                messageAppend("<hig>自动使用" + summary.join("、") + "</hig>");
            } else {
                messageAppend("<hig>未找到 Raid 引擎，无法执行自动使用</hig>");
            }
        },
        timer_close: function () {
            if (timer) {
                clearInterval(timer);
                timer = 0;
            }
        },
        xue_auto: function () {
            var t = $(".room_items .room-item:first .item-name").text();
            t = t.indexOf("<打坐") != -1 || t.indexOf("<学习") != -1 || t.indexOf("<练习") != -1;
            //创建定时器
            if (timer == 0) {
                if (t == false) {
                    messageAppend("当前不在打坐或学技能");
                    return;
                }
                timer = setInterval(WG.xue_auto, 1000);
            }
            if (t == false) {
                //学习状态中止，自动去挖矿
                WG.timer_close();
                WG.zdwk();
            } else {
                messageAppend("自动打坐学技能");
            }
        },
        showhideborad: function () {
            // 【2026-08-11】收起/展开只影响左侧 WG_log，不再联动右侧 WG_log_log
            if ($('.WG_log').css('display') == 'none') {
                window.localStorage.setItem("closeBorad", "false")
                $('.WG_log').show();
            } else {
                window.localStorage.setItem("closeBorad", "true")
                $('.WG_log').hide();
            }
        },
        showhidebtn: function () {
            if ($('.WG_button').css('display') == 'none') {
                window.localStorage.setItem("closeBtn", "false")
                $('.WG_button').show();
            } else {
                window.localStorage.setItem("closeBtn", "true")
                $('.WG_button').hide();
            }
        },
        dsj_hook: undefined,
        dsj_func: function () {
            if (WG.dsj_hook) {
                WG.remove_hook(WG.dsj_hook);
            }
            messageAppend("已注入定时任务", 1);
            timequestion = GM_getValue(roleid + "_timequestion", timequestion);
            WG.dsj_hook = WG.add_hook("time", (data) => {
                if (data.type == 'time') {
                    let i = 0;
                    for (let p of timequestion) {
                        if ((p.h == data.h && p.m == data.m && p.s == data.s) ||
                            (p.h == "" && p.m == data.m && p.s == data.s) ||
                            (p.h == "" && p.m == "" && p.s == data.s)) {
                            messageAppend("<hiy>已触发计划" + p.name, 0);
                            WG.SendCmd(p.send);
                            if (p.type == 1) {
                                messageAppend("<hiy>一次性任务,已移除" + p.name, 0);
                                timequestion.baoremove(i);
                                GM_setValue(roleid + "_timequestion", timequestion);
                            }
                        }
                        i = i + 1;
                    }
                }
            })
        },
        dsj: function () {
            WG.dsj_func();
            messageClear();
            var html = UI.timeoutui;
            // 【2026-08-15 修复】定时任务面板属于"快捷面板"一类，应与「自命令/自定义监控」
            // （_zmlOpenView 用 area=2）一致：渲染到【左侧 .WG_log】并同步插入。
            // 原 messageAppend(html) 未传 sync：面板走批量异步队列，下面 $(".startQuest") /
            // $('.questlist').append 等在 DOM 插入前执行 → 按钮绑定不上、任务列表不渲染。
            messageAppend(html, 2, null, true);
            $(".startQuest").off('click');
            $(".removeQuest").off('click');
            //[{"name":"","type":"0","send":"","h":"","s":"","m":""}]
            timequestion = GM_getValue(roleid + "_timequestion", timequestion);
            for (let q of timequestion) {
                let phtml = `<span class='addrun${q.name}'>编辑${q.name}</span>
                <span class='stoprun${q.name}'>删除${q.name}</span>
             <br/>
                `
                $('.questlist').append(phtml);
                $("." + `addrun${q.name}`).on("click", () => {
                    $("#questname").val(q.name);
                    $("#rtype").val(q.type);
                    $("#ht").val(q.h);
                    $("#mt").val(q.m);
                    $("#st").val(q.s);
                    $("#zml_info").val(q.send);
                });
                $("." + `stoprun${q.name}`).on("click", () => {
                    let questname = q.name;
                    let i = 0
                    for (let p of timequestion) {
                        if (p.name == questname) {
                            timequestion.baoremove(i);
                        }
                        i = i + 1;
                    }
                    GM_setValue(roleid + "_timequestion", timequestion);
                    WG.dsj();
                });
            }
            $(".startQuest").on("click", () => {
                let questname = $("#questname").val();
                let type = $("#rtype").val();
                let h = $("#ht").val();
                let m = $("#mt").val();
                let s = $("#st").val();
                let send = $("#zml_info").val();
                questname = questname.replaceAll(" ", "_");
                let item = {
                    "name": questname,
                    "type": type,
                    "send": send,
                    "h": h,
                    "m": m,
                    "s": s
                };
                let i = 0;
                for (let p of timequestion) {
                    if (questname == p.name) {
                        timequestion[i] = item;
                        GM_setValue(roleid + "_timequestion", timequestion);
                        WG.dsj();
                        return;
                    }
                    i = i + 1;
                }

                timequestion.push(item);
                GM_setValue(roleid + "_timequestion", timequestion);
                WG.dsj();
            });
            $(".removeQuest").on("click", () => {
                let questname = $("#questname").val();
                let i = 0
                for (let p of timequestion) {
                    if (p.name == questname) {
                        timequestion.baoremove(i);
                        return;
                    }
                    i = i + 1;
                }
                GM_setValue(roleid + "_timequestion", timequestion);
                WG.dsj();
            });


        },
        switchReversal: function (e) {
            let p = e.hasClass("on");
            if (!p) {
                return "开";
            }
            return "关";
        },

        auto_preform_switch: function () {
            if (auto_pfmswitch == "开" || auto_pfmswitch === true || auto_pfmswitch === 'true') {
                auto_pfmswitch = "关";
                messageAppend("<hio>自动施法</hio>关闭");

                WG.auto_preform("stop");
            } else {
                auto_pfmswitch = "开";
                messageAppend("<hio>自动施法</hio>开启");
                WG.auto_preform();
            }
            // 【2026-08-15】按钮文字同步当前开关状态
            WG.auto_perform_button();
        },
        forcebufskil: '',
        bufskill: {},
        xubuf: null,
        pfmskill: null,
        cds: new Map(),
        preform_timer: undefined,
        is_free: function () {
            if (WG.hasStr("faint", GameState.selfStatus) || WG.hasStr("busy", GameState.selfStatus) || WG.hasStr("rash", GameState.selfStatus) || WG.hasStr("bss", GameState.selfStatus)) {
                return false;
            } else {
                return true;
            }
        },
        auto_preform: function (v) {
            if (v == "stop") {
                GameState.selfStatus = [];
                WG.xubuf = null;
                WG.pfmskill = null;
                if (WG.preform_timer) {
                    clearInterval(WG.preform_timer);
                    WG.preform_timer = undefined;
                    $(".auto_perform").css("background", "");
                    WG.forcebufskil = ''
                    WG.bufskill = {}
                }
                return;
            }
            if (WG.preform_timer || auto_pfmswitch == "关" || auto_pfmswitch === false || auto_pfmswitch === 'false') return;
            $(".auto_perform").css("background", "#3E0000");
            //出招时重新获取黑名单
            unauto_pfm = GM_getValue(roleid + "_unauto_pfm", unauto_pfm);
            var unpfm = unauto_pfm.split(',');
            for (var pfmname of unpfm) {
                if (!WG.hasStr(pfmname, blackpfm))
                    blackpfm.push(pfmname);
            }
            // if (family.indexOf("逍遥") >= 0) {
            //     if (!WG.hasStr("force.duo", blackpfm)) {
            //         blackpfm.push('force.duo');
            //     }
            // }
            if (!WG.hasStr("force.tuoli", blackpfm)) {
                blackpfm.push('force.tuoli');
            }
            // 如果 auto_pfm_mode 等于 true 则使用智能施法
            if (auto_pfm_mode == "开" || auto_pfm_mode === true || auto_pfm_mode === 'true') {
                let force_buff_skill = ['force.cui', 'force.power', 'force.xi',
                                        'force.xin', 'force.chu', 'force.ztd', 'force.zhen', 'force.busi', 'force.wang'];
                let buff_skill_dict = {
                    "weapon": ['sword.wu', 'blade.shi', 'sword.yu'],
                    "ztd": ["force.ztd"],
                    "mingyu": ["force.wang"],
                    "force": ["*"],
                    "dodge": ["dodge.power", "dodge.fo", "dodge.gui", "dodge.lingbo", "dodge.zhui"]
                }
                WG.xubuf = null;
                WG.pfmskill = null
                WG.preform_timer = setInterval(() => {
                    if (GameState.fight.in_fight == false) { WG.auto_preform("stop"); return; }
                    var alreay_pfm = [];
                    if (WG.xubuf == null) {
                        WG.xubuf = setTimeout(async () => {
                            for (var skill of GameState.skills.perform) {
                                if (WG.hasStr(skill.id, blackpfm)) {
                                    continue;
                                }
                                for (let buf in buff_skill_dict) {
                                    for (let ski of buff_skill_dict[buf]) {
                                        if (ski == skill.id) {
                                            if (!WG.gcd && !WG.cds.get(skill.id)?.iscd && !WG.hasStr(buf, GameState.selfStatus)) {
                                                WG.Send("perform " + skill.id);
                                                setTimeout(function () {
                                                    var _c = WG.cds.get(skill.id);
                                                    if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                                }, 750);
                                                // break;
                                                await WG.sleep(200);
                                                while (!WG.cds.get(skill.id)?.iscd) {
                                                    if (GameState.fight.in_fight == false) { WG.auto_preform("stop"); return; }
                                                    if (!WG.is_free()) break;
                                                    WG.Send("perform " + skill.id);
                                                    setTimeout(function () {
                                                        var _c = WG.cds.get(skill.id);
                                                        if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                                    }, 750);
                                                    await WG.sleep(200);
                                                }
                                                if (WG.hasStr(buf, GameState.selfStatus)) {
                                                    console.log('buff技能' + skill.id)
                                                    WG.bufskill[buf] = skill.id;
                                                }
                                                // alreay_pfm.push(skill.id)
                                            }
                                            // alreay_pfm.push(skill.id)
                                            break;
                                        }
                                    }
                                }
                                if (WG.hasStr(skill.id, force_buff_skill)) {
                                    if (!WG.gcd && !WG.cds.get(skill.id)?.iscd && !WG.hasStr("force", GameState.selfStatus)) {
                                        WG.Send("perform " + skill.id);
                                        setTimeout(function () {
                                            var _c = WG.cds.get(skill.id);
                                            if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                        }, 750);
                                        // break;
                                        await WG.sleep(200);
                                        while (!WG.cds.get(skill.id)?.iscd && !WG.hasStr("force", GameState.selfStatus)) {
                                            if (GameState.fight.in_fight == false) { WG.auto_preform("stop"); return; }
                                            if (!WG.is_free()) break;
                                            WG.Send("perform " + skill.id);
                                            setTimeout(function () {
                                                var _c = WG.cds.get(skill.id);
                                                if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                            }, 750);
                                            await WG.sleep(200);

                                        }
                                        if (WG.hasStr("force", GameState.selfStatus)) {
                                            console.log('内功buff技能' + skill.id)
                                            WG.forcebufskil = skill.id;
                                        }
                                        alreay_pfm.push(skill.id)
                                    }
                                    // alreay_pfm.push(skill.id)
                                }
                            }
                            WG.xubuf = null;
                        }, 10);
                    }
                    if (WG.pfmskill == null) {
                        WG.pfmskill = setTimeout(async () => {
                            for (var skill of GameState.skills.perform) {
                                if (WG.hasStr(skill.id, blackpfm)) {
                                    continue;
                                }
                                if (WG.gcd) break;
                                // console.log(skill);
                                if (!WG.gcd && !WG.cds.get(skill.id)?.iscd && !(WG.hasStr(skill.id, force_buff_skill) || WG.hasStr(skill.id, buff_skill_dict))) {
                                    WG.Send("perform " + skill.id);
                                    setTimeout(function () {
                                        var _c = WG.cds.get(skill.id);
                                        if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                    }, 750);
                                    break; 
                                }
                                if (WG.forcebufskil != '') {
                                    if (!WG.gcd && !WG.cds.get(skill.id)?.iscd && WG.hasStr(skill.id, force_buff_skill) && skill.id != WG.forcebufskil &&
                                        !WG.hasStr(skill.id, buff_skill_dict['mingyu']) && !WG.hasStr(skill.id, buff_skill_dict['ztd'])) {
                                        console.log('使用无buff的内功技能' + skill.id)
                                        WG.Send("perform " + skill.id);
                                        setTimeout(function () {
                                            var _c = WG.cds.get(skill.id);
                                            if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                        }, 750);
                                        if (!WG.is_free()) break;
                                    }
                                }
                                // if (WG.bufskill.hasOwnProperty('weapon') && WG.bufskill['weapon'] != '') {
                                //     if (!WG.gcd && !WG.cds.get(skill.id) && WG.hasStr(skill.id, buff_skill_dict) && skill.id != WG.bufskill['weapon'] &&
                                //         !WG.hasStr(skill.id, buff_skill_dict['mingyu']) && !WG.hasStr(skill.id, buff_skill_dict['ztd'])) {
                                //         console.log('使用无buff的武器技能' + skill.id)
                                //         WG.Send("perform " + skill.id);
                                setTimeout(function () {
                                    var _c = WG.cds.get(skill.id);
                                    if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                                }, 750);
                                //         if (!WG.is_free()) break;
                                //     }
                                // }
                            }

                            WG.pfmskill = null
                        }, 10);
                    }
                }, 300);
            }
            else {
                WG.preform_timer = setInterval(() => {

                    if (GameState.fight.in_fight == false) WG.auto_preform("stop");
                    for (var skill of GameState.skills.perform) {

                        if (WG.inArray(skill.id, blackpfm)) {
                            continue;
                        }
                        if (!WG.gcd && !WG.cds.get(skill.id)?.iscd) {
                            WG.Send("perform " + skill.id);
                            setTimeout(function () {
                                var _c = WG.cds.get(skill.id);
                                if (_c && _c.iscd && _c.distime === 601) { WG.cds.set(skill.id, { iscd: false, distime: 0 }); }
                            }, 750);
                            break;
                        }
                    }
                }, 350);
            }
        },

        formatCurrencyTenThou: function (num) {
            num = num.toString().replace(/\$|\,/g, '');
            if (isNaN(num)) num = "0";
            var sign = (num == (num = Math.abs(num)));
            num = Math.floor(num * 10 + 0.50000000001); //cents = num%10;
            num = Math.floor(num / 10).toString();
            for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++) {
                num = num.substring(0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3));
            }
            return (((sign) ? '' : '-') + num);
        },
        gen: function (nl, xg, hg) {
            var jg = nl / 100 + xg * hg / 10;
            var sd = this.formatCurrencyTenThou(jg);
            return sd;
        },
        collBoss: function (data) {
            var c = "<div class=\"item-commands\"><span id = 'closeauto'>关闭自动执行后命令</span></div>";
            messageAppend("自动领取BOSS " + c);
            $('#closeauto').off('click');
            $('#closeauto').on('click', () => {
                if (timer != 0) {
                    clearTimeout(timer); 
                    timer = 0; 
                    messageAppend("已停止后命令");
                } else {
                    messageAppend("已经停止");
                }
            });

            WG.SendCmd("stopstate");
            WG.SendCmd("$wait 3000");

            let commands = Array.from({length: 5}, () => `events ${data[0]} ok`).join(';');
            WG.SendCmd(commands);
            messageAppend(`<hig>已自动领取boss</hig>`);

            autoBoss = "关"
            GM_setValue(roleid + "_autoBoss", autoBoss);
            messageAppend(`<hiy>已关闭自动领取boss，下次领取前请重新开启</hiy>`)

            timer = setTimeout(() => {
                if (auto_command && auto_command != "" && auto_command != "null") {
                    WG.SendCmd(auto_command);
                } else {
                    WG.zdwk();
                }
                next = 0;
            }, 3000);
        },
        xiyan: async function () {
            var c = "<div class=\"item-commands\"><span id = 'closeauto'>关闭自动执行后命令</span></div>";
            messageAppend("自动喜宴 " + c);
            $('#closeauto').off('click');
            $('#closeauto').on('click', () => {
                if (timer != 0) {
                    clearTimeout(timer); 
                    timer = 0; 
                    messageAppend("已停止后命令");
                } else {
                    messageAppend("已经停止");
                }
            });
            WG.SendCmd("stopstate");
            WG.SendCmd("$wait 1000");
            WG.SendCmd("events marry ok");
            timer = setTimeout(() => {
                if (auto_command && auto_command != "" && auto_command != "null") {
                    WG.SendCmd(auto_command);
                } else {
                    WG.zdwk();
                }
                next = 0;
            }, 3000);
        },

        saveRoomstate(data) {
            roomData = data.items;
        },
        haspack: function (name, callback) {
            WG.Send('pack');
            for (let item of GameState.packs.items) {
                if (item.name.indexOf(name) >= 0) {
                    callback(item.id);
                    return;
                }
            }
            callback('');
        },
        
        fight_listener: undefined,
        auto_fight: function () {

            if (WG.fight_listener) {
                messageAppend("<hio>自动比试</hio>结束");
                WG.remove_hook(WG.fight_listener);
                WG.fight_listener = undefined;
                return;
            }
            let name = prompt("请输入NPC名称,例如:\"高根明\"");
            let id = WG.find_item(name);
            if (id == null) {
                messageAppend("没有找到"+ name);
                return;
            }
            WG.fight_listener = WG.add_hook(["text", "sc", "combat"], async function (data) {
                if (data.type == "combat" && data.end) {
                    let item = GameState.items.get(GameState.id);
                    if (item.mp / item.max_mp < 0.8) {
                        WG.SendCmd("dazuo");
                    }
                    WG.SendCmd("liaoshang");
                } else if (data.type == "sc" && data.id == id) {
                    let item = GameState.items.get(id);
                    if (item.hp >= item.max_hp) {
                        WG.Send("stopstate;fight " + id);
                    }
                } else if (data.type == 'sc' && data.id == GameState.id) {
                    if (data.hp >= data.max_hp) {
                        WG.Send("stopstate;fight " + id);
                    }
                } else if (data.type == 'text') {
                    if (data.msg.indexOf("你先调整好自己的状态再来找别人比试吧") >= 0) {
                        WG.SendCmd("liaoshang");
                    }
                    if (data.msg.indexOf("你想趁人之危吗") >= 0) {
                        WG.SendCmd("dazuo");
                    }
                    if (data.msg.indexOf(">你疗伤完毕，深深吸了口气") >= 0) {
                        WG.Send("stopstate;fight " + id);
                    }
                }

            });
            WG.Send("stopstate;fight " + id);
            messageAppend("<hio>自动比试</hio>开始");
        },
        find_item: function (name) {
            for (let [k, v] of GameState.items) {
                if (v.name == name) {
                    return k;
                }
            }
            return null;
        },
        recover: function (hp, mp, cd, callback) {
            //返回定时器
            if (hp == 0) {
                if (WG.recover_timer) {
                    clearTimeout(WG.recover_timer);
                    WG.recover_timer = undefined;
                }
                return;
            }
            WG.Send("dazuo");
            WG.recover_timer = setInterval(function () {
                //检查状态
                let item = GameState.items.get(GameState.id);
                if (item.mp / item.max_mp < mp) { //内力控制
                    if (item.state != "打坐") {
                        WG.Send("stopstate;dazuo");
                    }
                    return;
                }
                if (item.hp / item.max_hp < hp) {
                    //血满
                    if (item.state != "疗伤") {
                        WG.Send("stopstate;liaoshang");
                    }
                    return;
                }
                if (item.state) WG.Send("stopstate");
                if (cd) {
                    for (let [k, v] of WG.cds) {
                        if (k == "force.tu") continue;
                        if (v?.iscd) return;
                    }
                }
                clearInterval(WG.recover_timer);
                callback();
            }, 1000);
        },
        zmlfire: async function (zml) {
            if (zml) {

                messageAppend("<hig>运行" + zml.name);
                if (zml.zmlType == 0 || zml.zmlType == "" || zml.zmlType == undefined) {
                    await WG.SendCmd(zml.zmlRun);
                } else if (zml.zmlType == 1) {
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(zml.zmlRun);
                    }
                } else if (zml.zmlType == 2) {
                    eval(zml.zmlRun);
                }

            }
        }
});
