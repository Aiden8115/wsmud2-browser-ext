// ============================================================
// wg-misc.js —— 杂项功能
// ------------------------------------------------------------
// WG 对象的其它零散功能：
//   自定义按钮（zdybtnfunc 等）、部分设置、登录界面 HTML、
//   自动合成/分解、屏蔽功能、外观相关等。
// 想改某个"说不清归哪类"的小功能，先来这里搜关键词。
// ============================================================
// wg-misc.js
// WG misc: custom buttons, settings, login HTML
'use strict';


// 【2026-08-12 移植作者 f45137e】中文数字转整数（用于"你获得了"物品/金钱合并显示）
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

// 【2026-08-13 挂机健康自检】每 5 分钟兜底检查页面卡顿隐患（不干预游戏本身，只处理扩展可控项）
// ① 消息队列积压 > 500 条 → 强制渲染（防内存堆积）② 日志超长 → 主动裁剪（追加路径也会触发，这里兜底）
// ③ 页面 DOM 节点超 25000 → 首次提示建议刷新（不自动删游戏节点，避免误伤）
// ④ 配置存储超 5MB 的 85% → 首次提示用「扫描孤儿键」清理
var _HEALTH_INTERVAL = 300000;   // 5 分钟
var _DOM_WARN = 25000;           // DOM 节点告警阈值
var _DOM_RECOVER = 15000;        // 低于此值才允许再次告警
var _Q_WARN = 500;               // 消息队列积压告警阈值
function extHealthCheck() {
    try {
        // ① 消息队列积压 → 强制 flush
        var qTotal = 0;
        if (typeof _msgQ === 'object' && _msgQ) {
            for (var a in _msgQ) qTotal += (_msgQ[a] ? _msgQ[a].length : 0);
            if (qTotal > _Q_WARN) { try { _flushMsgQ(); } catch (e) { } }
        }
        // ② 日志超长 → 主动裁剪（_trimLogIfNeeded 本身有阈值判断）
        try { if (typeof _trimLogIfNeeded === 'function') _trimLogIfNeeded(); } catch (e) { }
        // ③ DOM 节点总量超限 → 首次提示
        try {
            var domCount = document.querySelectorAll('*').length;
            if (domCount > _DOM_WARN) {
                if (!_hcWarnedDom) {
                    _hcWarnedDom = true;
                    messageAppend("<hiy>⚠️ 页面节点已达 " + domCount + " 个，浏览器可能开始变卡。建议刷新游戏页面，或点日志区「清除日志」减少占用</hiy>");
                    try { ExtLog.warn('[健康] DOM 节点 ' + domCount + ' 超限，建议刷新页面'); } catch (e) { }
                }
            } else if (domCount < _DOM_RECOVER) {
                _hcWarnedDom = false;   // 恢复后可再次告警
            }
        } catch (e) { }
        // ④ 存储占用超限 → 首次提示
        try {
            if (typeof GM_storageReport === 'function') {
                var rep = GM_storageReport();
                var MB = 5 * 1024 * 1024;
                if (rep.totalBytes > MB * 0.85) {
                    if (!_hcWarnedStorage) {
                        _hcWarnedStorage = true;
                        messageAppend("<hiy>⚠️ 配置存储占用 " + (rep.totalBytes / 1024 / 1024).toFixed(2) + "MB，接近 5MB 上限。建议设置→系统→「扫描孤儿键」清理残留</hiy>");
                        try { ExtLog.warn('[健康] 存储占用 ' + (rep.totalBytes / 1024 / 1024).toFixed(2) + 'MB 超限'); } catch (e) { }
                    }
                } else {
                    _hcWarnedStorage = false;
                }
            }
        } catch (e) { }
    } catch (e) { }
}
// 启动健康自检（幂等）
function extHealthStart() {
    if (_healthTimer) return;
    _healthTimer = setInterval(extHealthCheck, _HEALTH_INTERVAL);
}
// 停止健康自检（关开关时调用）
function extHealthStop() {
    if (_healthTimer) { clearInterval(_healthTimer); _healthTimer = null; }
}

// 【2026-08-13 无人值守推送】定时检查：长时间收不到任何游戏消息 → 推送"疑似卡死/断线"
// 恢复后（重新有消息）推送"已恢复"。依赖 PushAlert（推送总开关未开则静默）。
function extIdleMonitor() {
    try {
        if (typeof pushSwitch === 'undefined' || (pushSwitch != '开' && pushSwitch !== true && pushSwitch !== 'true')) return;
        if (!_lastMsgTime) { _lastMsgTime = Date.now(); return; }   // 还没收到过消息（登录中）→ 忽略
        var idleMin = (Date.now() - _lastMsgTime) / 60000;
        if (idleMin >= _PUSH_IDLE_MINUTES) {
            if (!_idleWarned) {
                _idleWarned = true;
                try { if (typeof PushAlert === 'function') PushAlert('idle', '⚠️ 已 ' + Math.floor(idleMin) + ' 分钟未收到任何游戏消息，疑似卡死或断线'); } catch (e) { }
            }
        } else if (_idleWarned && idleMin <= _PUSH_IDLE_MINUTES / 2) {
            _idleWarned = false;
            try { if (typeof PushAlert === 'function') PushAlert('idle_recover', '✅ 游戏消息已恢复，挂机正常'); } catch (e) { }
        }
    } catch (e) { }
}
// 启动无消息监控（幂等，每分钟检查一次）
function extIdleStart() {
    if (_pushIdleTimer) return;
    _pushIdleTimer = setInterval(extIdleMonitor, 60000);
}

// 整数转中文数字
function intToChineseNum(n) {
    var cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
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
          const item = (zdy_btnlist && zdy_btnlist[type]) ? zdy_btnlist[type] : null;
          const send = (item && item.send) || "";
          const name = (item && item.name) || ("自定义按钮" + (type + 1));
          const content = String(send).trim();
          if (!content) return;
          // 【2026-08-24】自定义按钮统一走 Raid 引擎：既能执行普通游戏命令，也能执行 @ 语句/流程（如 @tidyBag）。
          // Raid 引擎不可用时回退为直接发送游戏命令。
          if (unsafeWindow && unsafeWindow.ToRaid && unsafeWindow.ToRaid.perform) {
              unsafeWindow.ToRaid.perform(content, name, false);
          } else {
              WG.SendCmd(content);
          }
      },
      zdy_btnset: function () {
          zdy_btnlist = GM_getValue(roleid + "_zdy_btnlist", zdy_btnlist);
          messageClear();
          let html = UI.zdyBtnsetui();
          // 【2026-08-15 修改】自定义按钮面板属于快捷面板一类，与定时任务/自命令一致渲染到左侧 .WG_log
          // （原 area=0 渲染到右侧 .WG_log_log）
          messageAppend(html, 2, null, true);
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
              inzdy_btn = true;
              GM_setValue(roleid + "_inzdy_btn", true);
              WG.zdy_btnshow();
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
              $(".content-message").after(html);   // 【2026-08-09 修复】锚点改 .content-message：.WG_log 已被 funny2 搬到左侧，用它做锚点会导致保存后按钮栏位置漂移
              let keyitem = ["Q", "W", "E", "R", "T", "Y"];

              for (let i = 0; i < keyitem.length; i++) {
                  $(`#keyin${keyitem[i]}`).on('click', function () {
                      WG.zdybtnfunc(i);
                  });
              }
              $(".auto_perform").on("click", WG.auto_preform_switch);
              $(".cmd_echo").on("click", WG.cmd_echo_button);
              $(".cmd_echo").text("代码：" + (cmd_echo ? "开" : "关"));   // 【2026-08-11】按钮显示开关状态
              $(".auto_perform").text((auto_pfmswitch == "开" || auto_pfmswitch === true || auto_pfmswitch === 'true') ? "自动攻击：开" : "自动攻击：关");   // 【2026-08-15】自动攻击按钮显示开关状态
          } else if (type == 'off') {
              inzdy_btn = false;

              var html = UI.btnui();
              $('.WG_button').remove();
              $(".content-message").after(html);   // 【2026-08-09 修复】锚点改 .content-message：.WG_log 已被 funny2 搬到左侧，用它做锚点会导致保存后按钮栏位置漂移

              $(".go_wumiao").on("click", WG.go_wumiao);
              $(".go_home").on("click", WG.go_home);
              $(".auto_perform").on("click", WG.auto_preform_switch);
              $(".cmd_echo").on("click", WG.cmd_echo_button);
              $(".cmd_echo").text("代码：" + (cmd_echo ? "开" : "关"));   // 【2026-08-11】按钮显示开关状态
              $(".auto_perform").text((auto_pfmswitch == "开" || auto_pfmswitch === true || auto_pfmswitch === 'true') ? "自动攻击：开" : "自动攻击：关");   // 【2026-08-15】自动攻击按钮显示开关状态
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
          // 【2026-08-13 无人值守推送】任何服务器消息都算"角色活着"，刷新最后消息时间
          try { _lastMsgTime = Date.now(); } catch (e) { }
          var data;
          var deepCopy = function (source) {
              var result = {};
              for (var key in source) {
                  result[key] = typeof source[key] === 'object' ? deepCopy(source[key]) : source[key];
              }
              return result;
          }
          if (msg.data[0] == '{' || msg.data[0] == '[') {
              // 【2026-08-15 健壮性】服务器消息为单引号 JSON（标准 JSON.parse 会挂，故用 new Function）。
              // 原实现无 try：损坏/截断数据会让 new Function 构造抛错，直接中断整条消息管线
              // （本函数是 websocket-proxy 劫持后的第一个收包口）。现在与 ws.js OnReceived 同款处理：
              // 解析失败降级为文本消息显示并记录，不中断挂机。
              try {
                  var func = new Function("return " + msg.data + ";");
                  data = func();
              } catch (e) {
                  try { ExtLog.warn('[WS] 消息解析失败，已忽略损坏数据:', e && e.message); } catch (e2) { }
                  data = { type: 'text', msg: msg.data };
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
                      ((data.name && shield.indexOf(data.name) >= 0) ||   // 【2026-08-10 修复】name/uid 为空时跳过匹配，否则空字符串会命中 indexOf("") 误屏蔽表情/动作消息
                       (data.uid && shield.indexOf(data.uid) >= 0)))
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
                  auto_relogin="关";
                  GM_setValue(roleid + "_auto_relogin", auto_relogin);
                  let check_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin)
                  WG.SendCmd(`tm 当前重连为${check_relogin}`)
              }
              if (data.content=="开启重连"){
                  auto_relogin="开";
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

          // 【2026-08-22 修复】被其他设备登录踢下线：服务器返回 loginerror（"登陆凭证和角色不一致"）。
          // 此时 socket 虽连上但凭证已作废，重连/刷新都不能自动恢复 → 收到即触发自动刷新重登抢回账号。
          if (data.type == 'loginerror') {
              var _lerr = (data && (data.msg || '')) + '';
              if (_lerr.indexOf('凭证') >= 0 || _lerr.indexOf('不一致') >= 0) {
                  try {
                      if (typeof __extForceRelogin === 'function') {
                          try { ExtLog.warn('[恢复] 检测到账号在其他设备登录，自动刷新重新登录抢回'); } catch (e2) { }
                          __extForceRelogin((typeof roleid !== 'undefined') ? roleid : undefined);   // 传入被顶的事件角色，抢回时不跳号
                      }
                  } catch (e) { }
              }
          }

          // 【2026-08-12 移植作者 f45137e】合并"你获得了"物品消息（扫荡副本时大量重复提示聚合为一条）
          if (data.type == 'text' && typeof data.msg == 'string' &&
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
                  window._obtainedTimer = setTimeout(function () {
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
      },

});
