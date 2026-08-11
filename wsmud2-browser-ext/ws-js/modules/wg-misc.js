// wg-misc.js
// WG misc: custom buttons, settings, login HTML
'use strict';

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
              $(".WG_log").after(html);
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

              $(".WG_log").after(html);

              $(".go_wumiao").on("click", WG.go_wumiao);
              $(".go_home").on("click", WG.go_home);
              $(".auto_perform").on("click", WG.auto_preform_switch);
              $(".cmd_echo").on("click", WG.cmd_echo_button);
              if (GameState.score.isGod) {
                  $('.zdy-item.zdwk').html("修炼(Y)");
              }
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
                  if (listener.types == data.type || (listener.types instanceof Array && $
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
          var data;
          var deepCopy = function (source) {
              var result = {};
              for (var key in source) {
                  result[key] = typeof source[key] === 'object' ? deepCopy(source[key]) : source[key];
              }
              return result;
          }
          if (msg.data[0] == '{' || msg.data[0] == '[') {
              var func = new Function("return " + msg.data + ";");
              data = func();
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
              data.desc += UI.fbui(fb_path[data.index], data.is_multi, data.is_diffi)
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
          WG.run_hook(data.type, data);
          ws_on_message.apply(this, arguments);

          if (unsafeWindow.funny) {
              if (unsafeWindow.funny.API != null) { unsafeWindow.funny.API.onmessage(msg); }
          }
      },

});
