// wg-misc.js
// WG misc: custom buttons, settings, login HTML
'use strict';

// 中文数字转整数
function chineseNumToInt(cn) {
    var numMap = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
    var unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
    var result = 0, current = 0;
    for (var i = 0; i < cn.length; i++) {
        var char = cn[i];
        if (unitMap[char] !== undefined) {
            if (current === 0) current = 1;
            result += current * unitMap[char];
            current = 0;
        } else if (numMap[char] !== undefined) {
            if (i + 1 < cn.length && unitMap[cn[i + 1]] !== undefined) {
                current = numMap[char];
            } else {
                result += numMap[char];
            }
        }
    }
    return result + current;
}
// 整数转中文数字
function intToChineseNum(n) {
    var cn = ['零','一','二','三','四','五','六','七','八','九'];
    var units = ['', '十', '百', '千', '万'];
    if (n === 0) return '零';
    var numStr = String(n);
    var result = '';
    var len = numStr.length;
    var lastWasZero = false;
    var hasNonZero = false;
    for (var i = 0; i < len; i++) {
        var digit = parseInt(numStr[i]);
        var pos = len - 1 - i;
        if (digit === 0) {
            if (hasNonZero) lastWasZero = true;
        } else {
            if (lastWasZero) { result += '零'; lastWasZero = false; }
            if (pos === 1 && digit === 1 && !hasNonZero) {
                result += '十';
            } else {
                result += cn[digit] + (pos > 0 ? units[pos] : '');
            }
            hasNonZero = true;
        }
    }
    return result;
}

Object.assign(WG, {
      zdybtnfunc: function (type) {
          WG.SendCmd(zdy_btnlist[type].send);
      },
      zdy_btnset: function () {
          zdy_btnlist = GM_getValue(roleid + "_zdy_btnlist", zdy_btnlist);
          messageClear();
          let html = UI.zdyBtnsetui();
          messageAppend(html);
          var keyitem = ["Q", "W", "E", "R", "T", "Y"];
          let i = 0;
          for (let item of keyitem) {
              $(`#name${item}`).val(zdy_btnlist[i].name);
              $(`#send${item}`).val(zdy_btnlist[i].send);
              i = i + 1;
          }
          $(".savebtn").off('click');
          $(".savebtn").on("click", function () {
              let tmp = [];
              for (let item of keyitem) {
                  let zdybtnitem = {
                      name: '无',
                      send: ''
                  };
                  let pname = $(`#name${item}`).val();
                  let psend = $(`#send${item}`).val();
                  if (pname != '') {
                      zdybtnitem.name = pname;
                      zdybtnitem.send = psend;
                  }

                  tmp.push(zdybtnitem);
              }
              zdy_btnlist = tmp;
              GM_setValue(roleid + "_zdy_btnlist", zdy_btnlist);
              messageAppend("保存成功");
              WG.zdy_btnListInit();
          });
      },
      zdy_btnListInit: function () {
          zdy_btnlist = GM_getValue(roleid + "_zdy_btnlist", zdy_btnlist);
          inzdy_btn = GM_getValue(roleid + "_inzdy_btn", inzdy_btn);
          if (zdy_btnlist.length == 0) {
              for (var i = 0; i < 6; i++) {
                  zdy_btnlist.push({
                      "name": "无",
                      "send": ""
                  });
              }
              GM_setValue(roleid + "_zdy_btnlist", zdy_btnlist);
          }
          if (inzdy_btn) {
              WG.zdy_btnshow();
          } else {
              WG.zdy_btnshow('off');
          }
      },
      zdy_btnshow: function (type = 'on') {
          if (type == 'on') {
              inzdy_btn = true;
              var html = UI.zdybtnui();
              $('.WG_button').remove();
              $(".content-message").after(html);
              let keyitem = ["Q", "W", "E", "R", "T", "Y"];

              for (let i = 0; i < keyitem.length; i++) {
                  $(`#keyin${keyitem[i]}`).on('click', function () {
                      WG.zdybtnfunc(i);
                  });
              }
              $(".auto_perform").on("click", WG.auto_preform_switch);
              $(".cmd_echo").on("click", WG.cmd_echo_button);
          } else if (type == 'off') {
              inzdy_btn = false;
              var html = UI.btnui();
              $('.WG_button').remove();
              $(".content-message").after(html);

              $(".go_wumiao").on("click", WG.go_wumiao);
              $(".go_home").on("click", WG.go_home);
              $(".auto_perform").on("click", WG.auto_preform_switch);
              $(".cmd_echo").on("click", WG.cmd_echo_button);
              if (GameState.score.isGod) {
                  $('.zdy-item.zdwk').html("修炼(Y)");
              }
          }

          // 初始化命令代码按钮文本
          if (cmd_echo) {
              $(".cmd_echo").html('<hig>命令代码：显示</hig>');
          } else {
              $(".cmd_echo").html('<hir>命令代码：隐藏</hir>');
          }

          GM_setValue(roleid + "_inzdy_btn", inzdy_btn);
      },
      runLoginhml: function () {
          WG.SendCmd(loginhml);
      },
      hooks: [],
      hook_index: 0,
      add_hook: function (types, fn) {
          var hook = {
              'index': WG.hook_index++,
              'types': types,
              'fn': fn
          };
          WG.hooks.push(hook);
          return hook.index;
      },
      remove_hook: function (hookindex) {
          var that = this;
          for (var i = 0; i < that.hooks.length; i++) {
              if (that.hooks[i].index == hookindex) {
                  that.hooks.baoremove(i);
              }
          }
      },
      run_hook: function (type, data) {
          for (var i = 0; i < this.hooks.length; i++) {
              // if (this.hooks[i] !== undefined && this.hooks[i].type == type) {
              //     this.hooks[i].fn(data);
              // }
              try {
                  var listener = this.hooks[i];

                  // 新增：检查通配符 '*'
                  if (listener.types === '*') {
                      listener.fn(data); // 如果是通配符，直接执行
                      continue; // 继续检查下一个hook
                  }

                  // 原始逻辑：检查具体类型匹配
                  if (listener.types == data.type || (Array.isArray(listener.types) && $
                                                      .inArray(data.type, listener.types) >= 0)) {
                      listener.fn(data);
                  }
              }
              catch (e) {
                  console.error('hook error', e);
              }
          }
      },
      receive_message: function (msg) {
          if (!msg || !msg.data) return;
          try {
              var data;
              var deepCopy = function (source) {
                  var result = {};
                  for (var key in source) {
                      result[key] = typeof source[key] === 'object' ? deepCopy(source[key]) : source[key];
                  }
                  return result;
              }
              if (msg.data[0] == '{' || msg.data[0] == '[') {
                  try {
                      var func = new Function("return " + msg.data + ";");
                      data = func();
                  } catch (e) {
                      // 第一层：解析降级 — JSON.parse 失败时降级为文本处理
                      console.error('JSON 解析失败，降级为文本处理', e);
                      data = {
                          type: 'text',
                          msg: msg.data
                      };
                  }
              } else {
                  data = {
                      type: 'text',
                      msg: msg.data
                  };
              }
          // 开启代码显示功能后，打印所有Data
          // "状态(status)","exits","地图名与房间人物(room)","items","人物刷新(itemadd)","人物移除(itemremove)","血量状态(sc)","文本(text) ","聊天(msg) ","战斗状态(combat)","技能监控(dispfm),"死亡(die)","冷却结束(clearDistime)","技能可用(enapfm)""
          if (Coding && data.type != 'time'){
              console.log(data);
          } else if (cmd_echo && data.type != 'time') {
              console.log(data);
          }

          if (GameState.yaota.Flag && typeof (data.msg) == 'string') {
              let ytdata = data.msg;
              if (ytdata.indexOf("一股奇异的能量涌入你的体内，你获得") >= 0) {
                  GameState.yaoyuan = GameState.yaoyuan + parseInt(ytdata.replace(/[^0-9]/ig, ""))
                  $('#yt_prog').html("<hiy>目前已获得 " + GameState.yaoyuan + " 妖元</hiy>")
                  if (GameState.yaoyuan == 261) {
                      $('#yt_prog').html("<hiy>目前已获得 " + GameState.yaoyuan + " 妖元，boss出现！</hiy>")
                  }
              }
          }
          if (data.type == 'state') {
              if (data.silence == undefined && data.desc != []) {
                  data.desc = [];
                  data.silence = 1;
                  let p = deepCopy(msg);
                  p.data = JSON.stringify(data);
                  WG.run_hook(data.type, data);
                  ws_on_message.apply(this, [p]);
                  return;
              }
          }
          if (data.type == 'msg') {
              if (shieldswitch == '开' || shieldswitch === true || shieldswitch === 'true') {
                  if (shield != undefined &&
                      (shield.indexOf(data.name) >= 0 ||
                       shield.indexOf(data.uid) >= 0))
                      return;
                  var skey = shieldkey.split(",");
                  for (let keyword of skey) {
                      if (keyword != "" && data.content.indexOf(keyword) >= 0) {
                          return;
                      }
                  }
              }

              // 个人需求：远程操控重连
              if (data.ch=="tm" && data.content=="关闭重连"){
                  auto_relogin=false;
                  GM_setValue(roleid + "_auto_relogin", auto_relogin);
                  let check_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin)
                  WG.SendCmd(`tm 当前重连为${check_relogin}`)
              }
              if (data.content=="开启重连"){
                  auto_relogin=true;
                  GM_setValue(roleid + "_auto_relogin", auto_relogin);
                  let check_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin)
                  WG.SendCmd(`tm 当前重连为${check_relogin}`)
              }
          }
          if (data.type == 'text') {
              if (shieldswitch == '开' || shieldswitch === true || shieldswitch === 'true') {
                  var skey = shieldkey.split(",");
                  for (let keyword of skey) {
                      if (keyword != "" && data.msg.indexOf(keyword) >= 0) {
                          return;
                      }
                  }
              }
          }

          if (data.type == 'dialog' && data.t == 'fam' && data.k == undefined) {
              if (UI.toui[data.index] != undefined) {
                  data.desc += "\n";
                  data.desc += UI.toui[data.index];
                  data.k = 'knva';
                  let p = deepCopy(msg);
                  p.data = JSON.stringify(data);
                  WG.run_hook(data.type, data);
                  ws_on_message.apply(this, [p]);
                  return;
              }
          }

          if (data.type == 'text' && data.msg == '什么？' && GameState.wsdelay.SetTime != undefined) {
              const time = new Date().getTime();
              if (GameState.wsdelay.SetCount <= 2) {
                  GameState.wsdelay.SetCount += 1;
                  if (GameState.wsdelay.delay == undefined) {
                      GameState.wsdelay.delay = time - GameState.wsdelay.SetTime;
                  } else {
                      GameState.wsdelay.delay = (time - GameState.wsdelay.SetTime + GameState.wsdelay.delay) / 2;
                  }
                  GameState.wsdelay.SetTime = time;
                  WG.SendCmd("test");
              } else {

                  GameState.wsdelay.delay = (time - GameState.wsdelay.SetTime + GameState.wsdelay.delay) / 2;
                  WG.SendCmd("state info");
                  messageAppend(`<hig>服务器到本地来回延迟约 ${GameState.wsdelay.delay} 毫秒</hig>`);
                  GameState.wsdelay.SetTime = undefined;
                  GameState.wsdelay.SetCount = undefined;
                  setTimeout(() => {
                      let content = $(".content-message pre").html();
                      content = content.replaceAll('什么？\n', '');
                      $(".content-message pre").html(content);
                  }, 10);
              }
          }

          if (data.type == 'dialog' && data.t == 'fb' && data.k == undefined) {
              data.desc += "\n";
              // 从 Dialog.jh_fb.items 获取副本名称（游戏已正确解析 data.fbs）
              var dungeonName = null;
              if (typeof Dialog !== 'undefined' && Dialog.jh_fb && Dialog.jh_fb.items && Dialog.jh_fb.items[data.index]) {
                  dungeonName = Dialog.jh_fb.items[data.index].name;
              }
              // 备选：从 fb_path 获取
              if (!dungeonName) {
                  dungeonName = fb_path[data.index];
              }
              data.desc += UI.fbui(dungeonName, data.is_multi, data.is_diffi)
              data.k = 'knva';
              let p = deepCopy(msg);
              p.data = JSON.stringify(data);
              WG.run_hook(data.type, data);
              ws_on_message.apply(this, [p]);
              return;
          }
          if (data.type == 'dialog' && data.dialog == 'pack' && data.from == 'item' && data.k == undefined) {
              let itemname = data.desc.split("\n")[0];
              data.desc += "\n";
              data.desc += UI.itemui(itemname);
              data.k = 'knva';
              let p = deepCopy(msg);
              p.data = JSON.stringify(data);
              WG.run_hook(data.type, data);
              ws_on_message.apply(this, [p]);
              return;
          }

          // 添加精炼选项
          if (data.type == 'dialog' && data.dialog == 'pack' && data.k == undefined && data.jldesc ) {
              let jlname = data.jldesc.split("<br/>")[0];
              let jlid = data.id;
              data.jldesc += UI.jinglianui(jlid);
              
              const observer = new MutationObserver(() => {
                  if (document.getElementById("fastjinglian")) {
                      observer.disconnect();
                      fastjinglian(jlname, jlid);
                  }
              });
              observer.observe(document.body, { childList: true, subtree: true });

              data.k = 'knva';
              let p = deepCopy(msg);
              p.data = JSON.stringify(data);
              WG.run_hook(data.type, data);
              ws_on_message.apply(this, [p]);
              return;
          }
          // 添加镶嵌选项
          if (data.type == 'dialog' && data.dialog == 'pack' && data.k == undefined && data.xqdesc ) {
              let xqid = data.id;
              data.xqdesc += UI.xiangqianui(xqid);
              data.k = 'knva';
              let p = deepCopy(msg);
              p.data = JSON.stringify(data);
              WG.run_hook(data.type, data);
              ws_on_message.apply(this, [p]);
              return;
          }
          if (data.type == "perform") {
              if (zdyskills == "开" || zdyskills === true || zdyskills === 'true') {
                  zdyskilllist = GM_getValue(roleid + "_zdyskilllist", zdyskilllist);
                  data.skills = JSON.parse(zdyskilllist);
                  let p = deepCopy(msg);
                  p.data = JSON.stringify(data);
                  WG.run_hook(data.type, data);
                  ws_on_message.apply(this, [p]);
                  return;
              }
          }
          if (data.type == 'cmds') {
              if (unsafeWindow && unsafeWindow.ToRaid) {
                  if (JSON.stringify(data.items).indexOf('进入副本') >= 0) {
                      let cr_path = data.items[0].cmd
                      let sd_path = ''
                      if (cr_path.indexOf("1 0") >= 0) {
                          sd_path = cr_path.replaceAll('1 0', '1')
                      } else {
                          sd_path = cr_path + " 0"
                      }
                      let cp = {}
                      cp.name = '扫荡指定次数';
                      cp.cmd = `@js ($sdnum) =prompt("请输入次数,注意:若副本掉落物品过多,请不要输入超过50次,否则可能号没了","10")
                                  [if] (sdnum)!=null
                                    ${sd_path} (sdnum)`;
                      data.items.push(cp);
                      let toudu = {}
                      toudu.name = '偷渡指定次数';
                      toudu.cmd = `@js ($sdnum) =prompt("请输入次数","10")
                                  [if] (sdnum)!=null
                                    [while] (sdnum) !=0
                                      ($sdnum) = (sdnum)-1
                                      ${cr_path}
                                      cr over`;
                      data.items.push(toudu);
                      let p = deepCopy(msg);
                      p.data = JSON.stringify(data);
                      WG.run_hook(data.type, data);
                      ws_on_message.apply(this, [p]);
                      return;
                  }
              }
          }
          // 直接处理events数据
          if (data.type == 'dialog' && data.dialog == 'events' && data.items && Array.isArray(data.items)) {
              GameState.events = data.items;
              // 输出当前活动列表
              let eventNames = data.items.map(item => item[1]).filter(Boolean);
              if (eventNames.length > 0) {
                  messageAppend(`<hic>当前活动：${eventNames.join('、')}</hic>`);
              } else {
                  messageAppend(`<hic>当前活动：无</hic>`);
              }
              // 检测喜宴和BOSS活动
              for (let n = 0; n < data.items.length; n++) {
                  if (data.items[n] && data.items[n][0] === "marry") {
                      var automarry = GM_getValue(roleid + "_automarry", automarry);
                      if ((automarry == "开" || automarry === true || automarry === 'true') && GameState.fight.in_fight == false) {
                          if (stopauto || WG.at('副本')) {
                              messageAppend("<hiy>已自动领取喜宴</hiy>");
                              WG.xiyan();
                          } else {
                              WG.xiyan();
                          }
                      } else if ((automarry == "关" || automarry === false || automarry === 'false') || GameState.fight.in_fight == true) {
                          let b = "<div class=\"item-commands\"><span id = 'onekeyjh'>参加喜宴</span></div>"
                          messageAppend("<hiy>点击参加喜宴</hiy>");
                          messageAppend(b);
                          $('#onekeyjh').on('click', function () {
                              WG.xiyan();
                          });
                      }
                  } else if (data.items[n] && data.items[n][0].includes("boss")) {
                      var boss_name = data.items[n][2].match(/(.*?)被击败了/)?.[1];
                      BossName = GM_getValue(roleid + "_BossName", BossName);
                      autoBoss = GM_getValue(roleid + "_autoBoss", autoBoss);
                      if (boss_name == null || BossName == '') {
                          continue;
                      }
                      if (boss_name && boss_name.includes("<hi")) {
                          boss_name = boss_name.match(/<hi([^>]+)>(.*?)<\/hi\1>/)[2]
                      }
                      if (boss_name != BossName) {
                          continue;
                      }
                      if ((autoBoss == "开" || autoBoss === true || autoBoss === 'true') && GameState.fight.in_fight == false) {
                          if (stopauto || WG.at('副本')) {
                              let b = "<div class=\"item-commands\"><span  id = 'onekeyboss'>领取BOSS</span></div>"
                              messageClear();
                              messageAppend("<hiy>自动领取boss</hiy>");
                              messageAppend(b);
                              $('#onekeyboss').on('click', function () {
                                  WG.collBoss(data.items[n]);
                              });
                          } else {
                              WG.collBoss(data.items[n]);
                          }
                      } else if (GameState.fight.in_fight == true) {
                          let b = "<div class=\"item-commands\"><span  id = 'onekeyboss'>领取BOSS</span></div>"
                          messageClear();
                          messageAppend("<hiy>点击参加领取BOSS,由于未开启自动领取,或者在战斗中,需要手动领取</hiy>");
                          messageAppend(b);
                          $('#onekeyboss').on('click', function () {
                              WG.collBoss(data.items[n]);
                          });
                      }
                  }
              }
          }

          WG.run_hook(data.type, data);

          // 合并"你获得了"物品消息（扫荡副本时会有大量重复提示）
          if (merge_item_display && data.type == 'text' && typeof data.msg == 'string' &&
              data.msg.indexOf('你获得了') === 0 &&
              data.msg.indexOf('点经验') === -1 &&
              data.msg.indexOf('点潜能') === -1) {
              var itemName = data.msg.replace(/^你获得了/, '').replace(/[。，,.\s]/g, '').trim();
              if (itemName) {
                  if (!window._obtainedItems) {
                      window._obtainedItems = [];
                      window._obtainedMoney = { gold: 0, silver: 0, copper: 0 };
                  }
                  // 检测是否为金钱物品（先剥离颜色标签）
                  var cleanName = itemName.replace(/<[^>]+>/g, '');
                  var moneyAmount = null, moneyType = null;
                  var goldMatch = cleanName.match(/^(.+?)两黄金$/);
                  var silverMatch = cleanName.match(/^(.+?)两银子$/);
                  var copperMatch = cleanName.match(/^(.+?)文铜板$/) || cleanName.match(/^(.+?)铜板$/);
                  if (goldMatch) { moneyAmount = chineseNumToInt(goldMatch[1]); moneyType = 'gold'; }
                  else if (silverMatch) { moneyAmount = chineseNumToInt(silverMatch[1]); moneyType = 'silver'; }
                  else if (copperMatch) { moneyAmount = chineseNumToInt(copperMatch[1]); moneyType = 'copper'; }

                  if (moneyType) {
                      window._obtainedMoney[moneyType] += moneyAmount;
                  } else {
                      window._obtainedItems.push(itemName);
                  }
                  clearTimeout(window._obtainedTimer);
                  window._obtainedTimer = setTimeout(function() {
                      var parts = [];
                      // 先加入非金钱物品
                      if (window._obtainedItems && window._obtainedItems.length > 0) {
                          parts = window._obtainedItems.slice();
                      }
                      // 换算金钱：100铜板=1两银子，100两银子=1两黄金
                      var money = window._obtainedMoney;
                      if (money.copper >= 100) {
                          money.silver += Math.floor(money.copper / 100);
                          money.copper = money.copper % 100;
                      }
                      if (money.silver >= 100) {
                          money.gold += Math.floor(money.silver / 100);
                          money.silver = money.silver % 100;
                      }
                      // 将换算后的金钱追加到末尾
                      if (money.gold > 0) parts.push(intToChineseNum(money.gold) + '两黄金');
                      if (money.silver > 0) parts.push(intToChineseNum(money.silver) + '两银子');
                      if (money.copper > 0) parts.push(intToChineseNum(money.copper) + '文铜板');

                      if (parts.length > 0) {
                          var merged = '你获得了' + parts.join('、') + '。';
                          messageAppend('<hiw>' + merged + '</hiw>', 1);
                      }
                      window._obtainedItems = [];
                      window._obtainedMoney = { gold: 0, silver: 0, copper: 0 };
                  }, 500);
              }
              // 跳过原始消息显示，但保留 funny API
              if (unsafeWindow.funny && unsafeWindow.funny.API) {
                  unsafeWindow.funny.API.onmessage(msg);
              }
              return;
          }

          ws_on_message.apply(this, arguments);

          if (unsafeWindow.funny) {
              if (unsafeWindow.funny.API != null) { unsafeWindow.funny.API.onmessage(msg); }
          }
          } catch (e) {
              // 第三层：收包口整体 try/catch — 异常不影响后续处理
              console.error('[receive_message] 消息处理异常', e);
              if (typeof Push !== 'undefined') {
                  Push('[wsmud插件] 消息处理异常：' + e.message);
              }
          }
      },
});
