// ============================================================
// wg-auto.js —— 自动任务与状态监控
// ------------------------------------------------------------
//   zml_edit / zml_showp   自命令编辑 / 快捷操作栏
//   ztjk_func              自定义状态监控脚本引擎（可写 JS 条件，出错自动禁用）
//   ytjk_func              妖塔监控
//   dsj_func               定时任务（到点自动执行）
//   setting                设置面板：所有控件的绑定与保存（改设置面板逻辑在这）
//   make_config / load_config  配置备份到云端 / 从云端恢复
// 想改"设置面板"里某个选项 → 在本文件搜 setting 相关的代码。
// ============================================================
// wg-auto.js
// WG auto commands and state monitor (zml/ztjk/ytjk)
'use strict';

Object.assign(WG, {
      _zmlLayerIndex: null,
      _zmlVue: null,
      _zmlCleanup: function () {
          if (WG._zmlVue) {
              WG._zmlVue.$destroy();
              WG._zmlVue = null;
          }
      },
      _zmlClosePanel: function () {
          // 【2026-08-08 回退】关闭自命令面板：清空 .WG_log 日志区（同 Raid 弹窗行为）
          WG._zmlLayerIndex = null;
          WG._zmlCleanup();
          messageClear();
      },
      _zmlOpenView: function (view) {
          // 关闭旧面板 & 清理 Vue
          WG._zmlClosePanel();

          var html = '';
          if (view === 'main') {
              html = UI.zmlandztjkui;
          } else if (view === 'zmlEdit') {
              zml = GM_getValue(roleid + "_zml", zml);
              html = UI.zmlsetting
                  + '<div class="item-commands" style="margin-top:8px;border-top:1px solid #555;padding-top:8px;">'
                  + '<span class="zml-back-btn" style="cursor:pointer;color:#aaa;">← 返回</span>'
                  + '</div>';
          } else if (view === 'ztjkEdit') {
              ztjk_item = GM_getValue(roleid + "_ztjk", []);
              html = UI.ztjksetting
                  + '<div class="item-commands" style="margin-top:8px;border-top:1px solid #555;padding-top:8px;">'
                  + '<span class="zml-back-btn" style="cursor:pointer;color:#aaa;">← 返回</span>'
                  + '</div>';
          }

          // 【2026-08-08 回退】自命令面板以 item-commands 形式写进 .WG_log 日志区（同 Raid 引擎弹窗）
          messageAppend(html, 2, null, true);   // 【2026-08-12 修复】sync：面板 HTML 同步插入，Vue 挂载 #zmlandztjk 才能命中

          WG._zmlLayerIndex = true;   // 标记"面板已打开"

          if (view === 'main') WG._zmlInitMain();
          else if (view === 'zmlEdit') WG._zmlInitZmlEdit();
          else if (view === 'ztjkEdit') WG._zmlInitZtjkEdit();
      },
      _zmlInitMain: function () {
          var self = WG;
          WG._zmlVue = new Vue({
              el: '#zmlandztjk',
              data: {},
              created() {
                  this.zmldata = zml;
              },
              methods: {
                  run: function (v) {
                      WG.zmlfire(v);
                  },
                  zml: function () {
                      self._zmlOpenView('zmlEdit');
                  },
                  ztjk: function () {
                      self._zmlOpenView('ztjkEdit');
                  },
                  startjk: function () {
                      WG.ztjk_func();
                  },
                  stopjk: function () {
                      if (WG.ztjk_hook) {
                          WG.remove_hook(WG.ztjk_hook);
                          WG.ztjk_hook = undefined;
                          LayerHelper.msg('已取消注入');
                      } else {
                          LayerHelper.msg('未注入');
                      }
                  }
              }
          });
      },
      _zmlInitZmlEdit: function () {
          var self = WG;
          WG._zmlVue = new Vue({
              el: '#zmldialog',
              data: {
                  singnalzml: { name: '', zmlType: '0', zmlRun: '' },
                  zmldata: zml
              },
              created() {
                  this.zmldata = zml;
              },
              methods: {
                  add: function () {
                      var zmljson = {
                          name: this.singnalzml.name,
                          zmlRun: this.singnalzml.zmlRun,
                          zmlShow: 0,
                          zmlType: this.singnalzml.zmlType
                      };
                      var _flag = true;
                      for (var item of this.zmldata) {
                          if (item.name == zmljson.name) {
                              zmljson.zmlShow = item.zmlShow;
                              item = zmljson;
                              _flag = false;
                          }
                      }
                      if (_flag) this.zmldata.push(zmljson);
                      GM_setValue(roleid + '_zml', this.zmldata);
                      LayerHelper.msg('保存成功');
                  },
                  del: function () {
                      this.zmldata.forEach(function (v, k) {
                          if (v.name == this.singnalzml.name) {
                              this.zmldata.baoremove(k);
                              GM_setValue(roleid + '_zml', this.zmldata);
                              LayerHelper.msg('删除成功');
                          }
                      }, this);
                  },
                  getShare: function () {
                      var id = prompt('请输入分享码');
                      SettingsStore.getShareJson(id, function (res) {
                          var v = JSON.parse(res.json);
                          if (v.zmlRun != undefined) {
                              this.singnalzml = v;
                          } else {
                              LayerHelper.msg('不合法');
                          }
                      }.bind(this));
                  },
                  edit: function (v) {
                      this.singnalzml = v;
                  },
                  showp: function (v) {
                      zmlshowsetting = GM_getValue(roleid + '_zmlshowsetting', zmlshowsetting);
                      var a = $('.room-commands');
                      if (zmlshowsetting == 1) a = $('.zdy-commands');
                      for (var item of a.children()) {
                          if (item.textContent == v.name.replace(/<[a-zA-Z]+>/g, '')) {
                              item.remove();
                              v.zmlShow = 0;
                              GM_setValue(roleid + '_zml', zml);
                              LayerHelper.msg('删除快速使用' + v.name);
                              return;
                          }
                      }
                      a.append('<span class="act-item act-item-zdy">' + v.name + '</span>');
                      v.zmlShow = 1;
                      GM_setValue(roleid + '_zml', zml);
                      LayerHelper.msg('设置快速使用' + v.name);
                      $('.act-item-zdy').off('click');
                      $('.act-item-zdy').on('click', function () {
                          TaskHelper.usezml(0, this.textContent, '');
                      });
                  },
                  share: function (v) {
                      SettingsStore.shareJson(GameState.id, v);
                  }
              }
          });
          $('.zml-back-btn').off('click').on('click', function () {
              self._zmlOpenView('main');
          });
      },
      _zmlInitZtjkEdit: function () {
          var self = WG;
          ztjk_item = GM_getValue(roleid + '_ztjk', []);
          $('.ztjk_sharedfind').off('click').on('click', function () {
              var id = prompt('请输入分享码');
              SettingsStore.getShareJson(id, function (res) {
                  var v = JSON.parse(res.json);
                  if (v.script !== undefined) {
                      $('#ztjk_name').val(v.name);
                      $('#ztjk_script').val(v.script);
                  } else {
                      LayerHelper.msg('不合法的分享码');
                  }
              });
          });
          $('.ztjk_editadd').off('click').on('click', function () {
              var ztjk = {
                  name: $('#ztjk_name').val(),
                  script: $('#ztjk_script').val(),
                  isactive: 1
              };
              if (!ztjk.name || !ztjk.script) {
                  LayerHelper.msg('名称和脚本不能为空！');
                  return;
              }
              var _flag = true;
              ztjk_item.forEach(function (v, k) {
                  if (v.name == ztjk.name) {
                      ztjk_item[k] = ztjk;
                      _flag = false;
                  }
              });
              if (_flag) ztjk_item.push(ztjk);
              GM_setValue(roleid + '_ztjk', ztjk_item);
              self._zmlOpenView('ztjkEdit');
              LayerHelper.msg('保存成功');
              WG.ztjk_func();
          });
          $('.ztjk_editdel').off('click').on('click', function () {
              var name = $('#ztjk_name').val();
              for (var i = ztjk_item.length - 1; i >= 0; i--) {
                  if (ztjk_item[i].name === name) {
                      ztjk_item.splice(i, 1);
                      GM_setValue(roleid + '_ztjk', ztjk_item);
                      self._zmlOpenView('ztjkEdit');
                      LayerHelper.msg('删除成功');
                      WG.ztjk_func();
                      return;
                  }
              }
          });
          $('#ztjk_show').empty();
          $('#ztjk_set').empty();
          ztjk_item.forEach(function (v, k) {
              var btn = $("<span class='zdy-item'>编辑: " + v.name + "</span>").on('click', function () {
                  $('#ztjk_name').val(v.name);
                  $('#ztjk_script').val(v.script);
              });
              $('#ztjk_show').append(btn);
              var tmptext = v.isactive ? '暂停' : '启用';
              var setbtn = $("<span class='zdy-item'>" + tmptext + ': ' + v.name + "</span>").on('click', function () {
                  ztjk_item[k].isactive = v.isactive ? 0 : 1;
                  GM_setValue(roleid + '_ztjk', ztjk_item);
                  WG.ztjk_func();
                  self._zmlOpenView('ztjkEdit');
              });
              $('#ztjk_set').append(setbtn);
              var btn3 = $("<span class='zdy-item'>分享: " + v.name + "</span>").on('click', function () {
                  SettingsStore.shareJson(GameState.id, v);
              });
              $('#ztjk_show').append(btn3);
          });
          $('.zml-back-btn').off('click').on('click', function () {
              self._zmlOpenView('main');
          });
      },
      zmlztjk: function () {
          // 【2026-08-08 调整】点击"自命令"= 打开/刷新面板（同 Raid 工具栏"触发"按钮行为，
          // 只切换显示，不做"再点一次关闭"）
          WG._zmlOpenView('main');
      },
      zml_edit: function () {
          zml = GM_getValue(roleid + "_zml", zml);
          // 【2026-08-15 修复】原 `! typeof zml instanceof Array` 优先级错误恒为 false
          // （typeof 结果是字符串，! 后为 false，false instanceof Array 永远 false），
          // 导致存储损坏时不会重置为数组，后续 for..of 直接抛错；改用 Array.isArray。
          if (!Array.isArray(zml)) {
              zml = [];
          }
          messageClear();
          var edithtml = UI.zmlsetting;
          messageAppend(edithtml, 0, null, true);   // 【2026-08-12 修复】sync：zml 编辑面板同步插入，Vue 挂载 #zmldialog 才能命中
          const zmlvue = new Vue({
              el: "#zmldialog",
              data: {
                  singnalzml: {
                      name: "",
                      zmlType: "0",
                      zmlRun: ""
                  },
                  zmldata: zml
              },
              created() {
                  this.zmldata = zml;
              },
              methods: {
                  add: function () {
                      let zmljson = {
                          "name": this.singnalzml.name,
                          "zmlRun": this.singnalzml.zmlRun,
                          "zmlShow": 0,
                          "zmlType": this.singnalzml.zmlType
                      };
                      let _flag = true;
                      for (let item of this.zmldata) {
                          if (item.name == zmljson.name) {
                              zmljson.zmlShow = item.zmlShow;
                              item = zmljson;
                              _flag = false;
                          }
                      }

                      if (_flag) {
                          this.zmldata.push(zmljson);
                      }
                      GM_setValue(roleid + "_zml", this.zmldata);
                      LayerHelper.msg("保存成功");
                  },
                  del: function () {
                      this.zmldata.forEach((v, k) => {
                          if (v.name == this.singnalzml.name) {
                              this.zmldata.baoremove(k);
                              GM_setValue(roleid + "_zml", this.zmldata);
                              LayerHelper.msg("删除成功");
                          }
                      });
                  },
                  getShare: function () {
                      var id = prompt("请输入分享码");
                      SettingsStore.getShareJson(id, (res) => {
                          let v = JSON.parse(res.json);
                          if (v.zmlRun != undefined) {
                              this.singnalzml = v;
                          } else {
                              LayerHelper.msg("不合法")
                          }
                      });
                  },
                  edit: function (v) {
                      this.singnalzml = v;
                  },
                  showp: function (v) {
                      zmlshowsetting = GM_getValue(roleid + "_zmlshowsetting", zmlshowsetting);
                      let a = $(".room-commands");

                      if (zmlshowsetting == 1) {
                          a = $(".zdy-commands");
                      }

                      for (let item of a.children()) {
                          if (item.textContent == v.name.replace(/<[a-zA-Z]+>/g, '')) {
                              item.remove();
                              v.zmlShow = 0;
                              GM_setValue(roleid + "_zml", zml);
                              messageAppend("<hiy>删除快速使用" + v.name);
                              return;
                          }
                      }
                      a.append("<span class=\"act-item act-item-zdy\">" + v.name + "</span>")
                      v.zmlShow = 1;
                      GM_setValue(roleid + "_zml", zml);
                      messageAppend("设置快速使用" + v.name, 1);
                      //绑定事件
                      $('.act-item-zdy').off('click');
                      $(".act-item-zdy").on('click', function () {
                          TaskHelper.usezml(0, this.textContent, "");
                      });
                  },
                  share: function (v) {
                      SettingsStore.shareJson(GameState.id, v);
                  }
              }
          })

          },
      isseted: false,
      zml_showp: function () {
          $(".zdy-commands").empty();
          $('.act-item-zdy').remove();
          zmlshowsetting = GM_getValue(roleid + "_zmlshowsetting", zmlshowsetting);

          for (let zmlitem of zml) {
              let a = $(".room-commands");
              if (zmlshowsetting == 1) {
                  for (let item of a.children()) {
                      if (item.textContent == zmlitem.name) {
                          item.remove();
                      }
                  }
                  a = $(".zdy-commands");
                  if (!WG.isseted) {
                      let px = $('.tool-bar.right-bar').css("bottom");
                      px.replace("px", "");
                      px = parseInt(px);
                      px = px + 24;
                      $('.tool-bar.right-bar').css("bottom", px + "px");
                      WG.isseted = true;
                  }

              } else {
                  for (let item of $(".zdy-commands").children()) {
                      if (item.textContent == zmlitem.name) {
                          item.remove();
                      }
                  }
              }

              if (zmlitem.zmlShow == 1) {

                  a.append("<span class=\"act-item act-item-zdy\">" + zmlitem.name + "</span>")
                  messageAppend("设置快速使用" + zmlitem.name, 0, 1);
                  //绑定事件
                  $('.act-item-zdy').off('click');
                  $(".act-item-zdy").on('click', function () {
                      TaskHelper.usezml(0, this.textContent, "");
                  });
              }
          }
      },
      ztjk_edit: function () {

          //[{"name":"","script":"","isactive":1}]

          ztjk_item = GM_getValue(roleid + "_ztjk", []);
          messageClear();
          var edithtml = UI.ztjksetting;
          messageAppend(edithtml, 0, null, true);   // 【2026-08-12 修复】sync：ztjk 编辑面板同步插入，按钮绑定才能命中
          $(".ztjk_sharedfind").on('click', () => {
              var id = prompt("请输入分享码");
              SettingsStore.getShareJson(id, (res) => {
                  let v = JSON.parse(res.json);
                  if (v.script !== undefined) {
                      $('#ztjk_name').val(v.name);
                      $('#ztjk_script').val(v.script);
                  } else {
                      LayerHelper.msg("不合法的分享码")
                  }
              });
          });
          $('.ztjk_editadd').on("click", function () {
              var ztjk = {
                  name: $('#ztjk_name').val(),
                  script: $('#ztjk_script').val(),
                  isactive: 1
              };
              if (!ztjk.name || !ztjk.script) {
                  LayerHelper.msg("名称和脚本不能为空！");
                  return;
              }
              let _flag = true;
              ztjk_item.forEach(function (v, k) {
                  if (v.name == ztjk.name) {
                      ztjk_item[k] = ztjk;
                      _flag = false;
                  }
              });
              if (_flag) {
                  ztjk_item.push(ztjk);
              }
              GM_setValue(roleid + "_ztjk", ztjk_item);

              WG.ztjk_edit();
              messageAppend("<hig>保存成功");
              WG.ztjk_func();
          });
          $(".ztjk_editdel").on('click', function () {
              let name = $('#ztjk_name').val();
              let found = false;
              for (let i = ztjk_item.length - 1; i >= 0; i--) {
                  if (ztjk_item[i].name === name) {
                      ztjk_item.splice(i, 1);
                      found = true;
                      break;
                  }
              }
              if(found) {
                      GM_setValue(roleid + "_ztjk", ztjk_item);
                      WG.ztjk_edit();
                      messageAppend("<hig>删除成功");
                      WG.ztjk_func();
                  }
              });
          ztjk_item.forEach(function (v, k) {
              var btn = $("<span class='zdy-item'>编辑: " + v.name + "</span>").on("click", function () {
                  $('#ztjk_name').val(v.name);
                  $('#ztjk_script').val(v.script);
              });
              $('#ztjk_show').append(btn);

              var tmptext = v.isactive ? "暂停" : "启用";
              var setbtn = $("<span class='zdy-item'>" + tmptext + ": " + v.name + "</span>").on('click', function () {
                  ztjk_item[k].isactive = v.isactive ? 0 : 1;
                  GM_setValue(roleid + "_ztjk", ztjk_item);
                  WG.ztjk_func();
                  WG.ztjk_edit();
              });
              $('#ztjk_set').append(setbtn);

              var btn3 = $("<span class='zdy-item'>分享: " + v.name + "</span>").on('click', function () {
                  SettingsStore.shareJson(GameState.id, v);
              });
              $('#ztjk_show').append(btn3);
          });
      },
      ytjk_func: function () {
          WG.add_hook("room", async function (data) {
              if (GameState.yaota.Flag && data.path != 'zc/mu/shishenta') {
                  $('.channel pre').append("<hig>【插件】" + "第 " + GameState.yaota.Count + " 次妖塔共获得 " + GameState.yaoyuan + " 点妖元，结束时间: " + dateFormat("YYYY-mm-dd HH:MM", new Date()) + "。<br><hig>")
                  $('.tm').append("<hig>【插件】" + "第 " + GameState.yaota.Count + " 次妖塔共获得 " + GameState.yaoyuan + " 点妖元，结束时间: " + dateFormat("YYYY-mm-dd HH:MM", new Date()) + "。<br><hig>")
                  setTimeout(async function () {
                      while (!WG.is_free()) {
                          await WG.sleep(1000)
                      }
                      if (GameState.yaoyuan == 261) {
                          WG.SendCmd("tm 第 " + GameState.yaota.Count + " 次妖塔圆满完成，撒花~~~~~")
                      } else {
                          WG.SendCmd("tm 第 " + GameState.yaota.Count + " 次妖塔遗憾收场，撒花~~~~~")
                      }
                      $('#yt_prog').remove()
                      GameState.yaota.Flag = false;
                      GameState.yaoyuan = 0;

                  }, 0)
              }
              if (data.path == 'zc/mu/shishenta') {
                  $(`.state-bar`).before(`<div id=yt_prog>开始攻略妖塔</div>`)
                  GameState.yaota.Count = GameState.yaota.Count + 1;
                  $('.channel pre').append("<hig>【插件】" + "开始第 " + GameState.yaota.Count + " 次攻略妖塔，现在时间是:" + dateFormat("YYYY-mm-dd HH:MM", new Date()) + "。<br><hig>")
                  $('.tm').append("<hig>【插件】" + "开始第 " + GameState.yaota.Count + " 次攻略妖塔，现在时间是:" + dateFormat("YYYY-mm-dd HH:MM", new Date()) + "。<br><hig>")
                  GameState.yaoyuan = 0;
                  GameState.yaota.Flag = true;
              }
          })
      },
      ztjk_hook: undefined,
      ztjk_func: function () {
          // 如果存在旧的hook，先移除，防止重复注册
          if (WG.ztjk_hook) {
              WG.remove_hook(WG.ztjk_hook);
              WG.ztjk_hook = undefined;
          }
          
          ztjk_item = GM_getValue(roleid + "_ztjk", []);
          
          // 使用通配符 '*' 注册一个新的、唯一的hook来处理所有事件
          WG.ztjk_hook = WG.add_hook("*", function (data) {
              // 遍历所有已定义的监控脚本
              ztjk_item.forEach(function (monitor) {
                  // 如果监控未激活或脚本为空，则跳过
                  if (!monitor.isactive || !monitor.script) {
                      return;
                  }

                  try {
                      // 使用 Function 构造函数创建一个函数来执行脚本
                      // 这是比 eval 更安全的方式，可以显式传入作用域内的变量
                      const userScript = new Function('data', 'WG', 'G', 'T', 'Push', 'window',monitor.script);
                      
                      // 执行用户脚本，并传入核心对象
                      userScript(data, WG, GameState, TaskHelper, Push, unsafeWindow);

                  } catch (e) {
                      // 如果用户脚本出错，捕获异常并打印错误信息
                      // 这样可以防止一个错误的监控脚本导致整个插件崩溃
                      console.error(`监控脚本 [${monitor.name}] 执行出错:`, e);
                      messageAppend(`<hir>监控脚本 [${monitor.name}] 执行出错，请检查代码！</hir>`, 1);
                      
                      // 自动禁用出错的脚本，防止反复报错
                      monitor.isactive = 0;
                      GM_setValue(roleid + "_ztjk", ztjk_item);
                      messageAppend(`<hir>已自动禁用监控 [${monitor.name}]。</hir>`, 1);
                  }
              });
          });
          
          messageAppend("<hig>自定义监控已重新注入。", 1);
      },
      make_config: async function () {
          // 【2026-08-09 移植v1.0.0】上传配置：当前角色 GM 配置 + 全局设置 + 游戏自带 localStorage 设置（__LS__ 前缀）
          // 【2026-08-11 修复】角色 ID 优先用页面全局 Role.id（登录 DOM 读取的 roleid 可能失效 → indexOf 匹配不到 → 角色设置键漏传）
          var rid = (unsafeWindow && unsafeWindow.Role && unsafeWindow.Role.id) || roleid;
          if (!rid) {
              LayerHelper.msg("上传失败：未获取到角色 ID，请重新登录后重试");
              return;
          }
          let _config = {};
          let keys = GM_listValues();
          keys.forEach(key => {
              if (key.indexOf(rid) >= 0) {
                  _config[key] = GM_getValue(key);
              }
          });
          _config._shieldswitch = GM_getValue("_shieldswitch", shieldswitch);
          _config._shield = GM_getValue("_shield", shield);
          _config._shieldkey = GM_getValue("_shieldkey", shieldkey);
          _config._pushSwitch = GM_getValue(rid + "_pushSwitch", pushSwitch);
          _config._pushType = GM_getValue(rid + "_pushType", pushType);
          _config._pushToken = GM_getValue(rid + "_pushToken", pushToken);
          _config._pushDeath = GM_getValue(rid + "_pushDeath", _pushDeath);
          _config._idleCmdSwitch = GM_getValue("_idleCmdSwitch", _idleCmdSwitch);
          _config._idleCmdSeconds = GM_getValue("_idleCmdSeconds", _idleCmdSeconds);
          _config._idleCmdContent = GM_getValue("_idleCmdContent", _idleCmdContent);
          // 【2026-08-09 修复】显式包含 触发器/流程/持久变量：
          // 键名是 "角色ID@triggers" / "flow_store@角色ID" / "global_params@角色ID"（用 Role.id，不匹配 roleid 前缀会漏掉）
          try {
              var trigKey = rid + "@triggers";
              var trigVal = GM_getValue(trigKey, null);
              if (trigVal != null) _config[trigKey] = trigVal;
              var flowKey = "flow_store@" + rid;
              var flowVal = GM_getValue(flowKey, null);
              if (flowVal != null) _config[flowKey] = flowVal;
              var gparamKey = "global_params@" + rid;
              var gpVal = GM_getValue(gparamKey, null);
              if (gpVal != null) _config[gparamKey] = gpVal;
          } catch (e) { }
          // 附带游戏自带的 localStorage 设置（含游戏自带拓展设置，排除 cookie/session 敏感项）
          try {
              for (var li = 0; li < window.localStorage.length; li++) {
                  var lsKey = window.localStorage.key(li);
                  if (lsKey && lsKey.indexOf("cookie") < 0 && lsKey.indexOf("session") < 0) {
                      _config["__LS__" + lsKey] = window.localStorage.getItem(lsKey);
                  }
              }
          } catch (e) { }
          console.log(_config)
          SettingsStore.uploadUserConfig(GameState.id, _config, (res) => {
              if (res == "true") {
                  LayerHelper.msg("已成功上传");
              }
          });
      },
      // 【2026-08-11 本地自动备份】备份当前角色配置（含触发器/流程/持久变量），不依赖云端服务器
      // silent=true 为每日自动备份（不弹提示）；false 为手动点击（弹提示）
      backup_config: function (silent) {
          var rid = (unsafeWindow && unsafeWindow.Role && unsafeWindow.Role.id) || roleid;
          if (!rid) {
              if (!silent) LayerHelper.msg("备份失败：未获取到角色 ID，请重新登录后重试");
              return false;
          }
          var data = {};
          var keys = GM_listValues();
          keys.forEach(function (key) {
              if (key.indexOf(rid) >= 0) data[key] = GM_getValue(key);
          });
          // 全局设置
          ['_shieldswitch', '_shield', '_shieldkey', '_idleCmdSwitch', '_idleCmdSeconds', '_idleCmdContent'].forEach(function (k) {
              try { data[k] = GM_getValue(k, null); } catch (e) { }
          });
          // 触发器/流程/持久变量（键名：角色ID@triggers / flow_store@角色ID / global_params@角色ID）
          try {
              var trigVal = GM_getValue(rid + "@triggers", null);
              if (trigVal != null) data[rid + "@triggers"] = trigVal;
              var flowVal = GM_getValue("flow_store@" + rid, null);
              if (flowVal != null) data["flow_store@" + rid] = flowVal;
              var gpVal = GM_getValue("global_params@" + rid, null);
              if (gpVal != null) data["global_params@" + rid] = gpVal;
          } catch (e) { }
          try {
              GM_setValue("ext_config_backup", { time: Date.now(), data: data });
              // 【2026-08-11 存储诊断】备份后顺带只读检查：接近上限或疑似孤儿键 → 控制台报告（不删任何数据）
              try {
                  if (typeof GM_storageReport === 'function') {
                      var rep = GM_storageReport();
                      var MB = 5 * 1024 * 1024;
                      if (rep.totalBytes > MB * 0.85) {
                          ExtLog.warn('[存储] 配置占用 ' + (rep.totalBytes / 1024 / 1024).toFixed(2) + 'MB（约 5MB 上限 85%），建议清理或导出备份');
                      }
                      if (rep.orphans.length > 0) {
                          ExtLog.warn('[存储] 发现 ' + rep.orphans.length + ' 个疑似孤儿键（可能含游戏自身键，未删除）：' + rep.orphans.slice(0, 10).map(function (o) { return o.key; }).join(', '));
                      }
                  }
              } catch (e3) { }
              if (!silent) LayerHelper.msg("已备份配置");
              return true;
          } catch (e) {
              ExtLog.error("配置备份失败:", e);
              if (!silent) LayerHelper.msg("备份失败：存储空间不足，请先导出配置清理");
              return false;
          }
      },
      // 【2026-08-11 恢复本地备份】从 ext_config_backup 写回全部配置并刷新
      restore_config: function () {
          var backup = GM_getValue("ext_config_backup", null);
          if (!backup || !backup.data) {
              LayerHelper.msg("没有可恢复的备份");
              return;
          }
          var t = backup.time ? new Date(backup.time).toLocaleString() : "未知时间";
          if (!confirm("确定从备份恢复配置吗？\n备份时间：" + t + "\n将覆盖当前角色设置、触发器和流程。")) return;
          var data = backup.data;
          for (var k in data) {
              GM_setValue(k, data[k]);
          }
          // 刷新内存缓存（触发器需 reload 重新加载）
          try {
              if (unsafeWindow && unsafeWindow.TriggerCenter && unsafeWindow.TriggerCenter.reload) {
                  unsafeWindow.TriggerCenter.reload();
              }
          } catch (e) { }
          try { GlobalInit.configInit(); } catch (e) { }
          LayerHelper.msg("已从备份恢复（" + t + "）");
      },
      load_config: async function () {
          // 【2026-08-09 移植v1.0.0】下载配置：支持把 __LS__ 前缀项写回游戏 localStorage
          SettingsStore.getUserConfig(GameState.id, (res) => {
              if (res != "") {
                  // 【2026-08-11 容错】res 可能是对象（jQuery 已解析）或字符串
                  let _config = res;
                  try {
                      if (typeof res === "string") _config = JSON.parse(res);
                  } catch (e) {
                      LayerHelper.msg("下载失败：服务器返回的数据格式异常");
                      return;
                  }
                  for (const key in _config) {
                      if (key.indexOf("__LS__") === 0) {
                          try { window.localStorage.setItem(key.substring(6), _config[key]); } catch (e) { }
                      } else {
                          GM_setValue(key, _config[key]);
                      }
                  }
                  // 【2026-08-09 修复】下载后刷新触发器内存缓存（Raid 流程 FlowStore 每次动态读 GM，无需刷新）
                  try {
                      if (unsafeWindow && unsafeWindow.TriggerCenter && unsafeWindow.TriggerCenter.reload) {
                          unsafeWindow.TriggerCenter.reload();
                      }
                  } catch (e) { }


                  GlobalInit.configInit();

                  WG.setting();
                  WG.ztjk_func();
                  WG.zml_showp();
                  WG.dsj_func();
                  LayerHelper.msg("已成功加载");
              }
          });
      }, //设置
      reset_default: function () {
          // 【2026-08-09 移植v1.0.0】恢复默认：仅重置当前角色设置，保留自命令/自定义监控/Raid流程/触发器
          if (!confirm("确定恢复当前角色的所有设置到默认值？\n此操作不会删除自命令、触发器和Raid流程。")) return;
          let keys = GM_listValues();
          let count = 0;
          keys.forEach(key => {
              // 只处理当前角色前缀的键
              if (key.indexOf(roleid) !== 0) return;
              // 保留自命令（roleid_zml）、自定义监控（roleid_ztjk）
              if (key.indexOf(roleid + "_zml") === 0) return;
              if (key.indexOf(roleid + "_ztjk") === 0) return;
              GM_deleteValue(key);
              count++;
          });
          GlobalInit.configInit();
          LayerHelper.msg("已恢复默认（清除 " + count + " 项），部分设置刷新后生效");
      },
      setting: function () {
          // 【2026-08-09 改造】独立弹窗：不再打开游戏自带设置对话框、不再塞进 .dialog-extend
          if ($("#ext-setting-mask").length) return;   // 已打开则不重复
          $("#ext-setting-mask").remove();
          // 【2026-08-10 优化】样式用固定 id 注入（先移除旧的再插入，避免每次打开累积 <style> 标签）；
          // 去掉遮罩 backdrop-filter 全屏模糊（性能杀手），改纯色背景
          $("#ext-setting-style").remove();
          // 【2026-08-11 适配游戏本身】弹窗：黑底 + 游戏灰边框 + 游戏小圆角；按钮灰边灰字、hover 反转；标题保留金色品质
          $('<style id="ext-setting-style">' +
          '#ext-setting-mask{position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;font-family:"Microsoft YaHei UI","Microsoft YaHei",sans-serif;}' +
          '#ext-setting-dialog{width:580px;max-width:94vw;max-height:86vh;display:flex;flex-direction:column;background:#000000;border:1px solid var(--ext-border, #666666);border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:var(--ext-text-bright, #c0c0c0);overflow:hidden;animation:extDlgIn .15s ease;}' +
          '@keyframes extDlgIn{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}' +
          '#ext-setting-title{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #333333;background:transparent;}' +
          '#ext-setting-title .ext-setting-title-text{font-size:14px;font-weight:600;color:var(--ext-gold, #FFD700);letter-spacing:.03em;}' +
          '#ext-setting-close{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1px solid var(--ext-border, #666666);color:var(--ext-text, #999999);font-size:18px;line-height:1;cursor:pointer;background:#000000;user-select:none;font-family:Arial;transition:background .2s,border-color .2s,transform .15s;}' +
          '#ext-setting-close:hover{background:var(--ext-text, #999999);border-color:var(--ext-text, #999999);color:#000000;transform:rotate(90deg);}' +
          '#ext-setting-body{padding:10px 14px;overflow-y:auto;flex:1 1 auto;}'
          + '</style>').appendTo('head');
          var shell = '<div id="ext-setting-mask">'
              + '<div id="ext-setting-dialog">'
              + '<div id="ext-setting-title"><span class="ext-setting-title-text">武神传说插件设置 <span id="ext-storage-usage" style="font-size:11px;color:var(--ext-dim, #808080);font-weight:normal;"></span></span><span id="ext-setting-close" title="关闭">×</span></div>'
              // 【2026-08-14 设置搜索】搜索条：输入关键词即时过滤设置项与分组
              + '<div id="ext-setting-search" style="padding:6px 14px;border-bottom:1px solid #2a2a2a;">'
              + '<input id="ext-setting-search-input" type="text" placeholder="🔍 搜索设置项（如：推送、屏蔽、技能、保活）…" style="width:100%;box-sizing:border-box;padding:6px 10px;background:#0a0a0a;color:var(--ext-text-bright,#c0c0c0);border:1px solid var(--ext-border,#666666);border-radius:3px;outline:none;font-size:12px;">'
              + '</div>'
              + '<div id="ext-setting-body">' + UI.syssetting() + '</div>'
              + '</div></div>';
          $("body").append(shell);
          // 【2026-08-11 存储管理】显示配置占用（localStorage 约 5MB 配额，超限时 GM_setValue 已会提示）
          try {
              var _usage = 0, _cnt = 0, _klist = GM_listValues();
              for (var _i = 0; _i < _klist.length; _i++) { _usage += (localStorage.getItem(_klist[_i]) || '').length; _cnt++; }
              var _usageText = _usage > 1048576 ? (_usage / 1048576).toFixed(2) + 'MB' : Math.ceil(_usage / 1024) + 'KB';
              $("#ext-storage-usage").text('（配置 ' + _cnt + ' 项 · 占用 ' + _usageText + ' / 约5MB）');
          } catch (e) { }
          // 关闭：× 按钮 / 点遮罩空白处 / ESC
          $("#ext-setting-close").off('click').on('click', function () { $("#ext-setting-mask").remove(); });
          $("#ext-setting-mask").off('click').on('click', function (e) {
              if (e.target && e.target.id == "ext-setting-mask") $("#ext-setting-mask").remove();
          });
          $(document).off('keydown.extSetting').on('keydown.extSetting', function (e) {
              if (e.keyCode == 27 && $("#ext-setting-mask").length) {
                  $("#ext-setting-mask").remove();
                  $(document).off('keydown.extSetting');
              }
          });

          // 【2026-08-14 设置搜索】输入即时过滤设置项，空关键词恢复全部；保留元素原始 display 防止布局错乱
          $("#ext-setting-search-input").off('input').on('input', function () {
              var kw = $.trim($(this).val()).toLowerCase();
              var $body = $("#ext-setting-body");
              if (!kw) {
                  $body.find("h3").css('display', '');
                  $body.find(".setting-item").each(function () {
                      var $it = $(this);
                      $it.css('display', $it.data('extOrigDisplay') || '');
                  });
                  return;
              }
              $body.find("h3").each(function () {
                  var $h3 = $(this);
                  var $items = $h3.nextUntil("h3").filter(".setting-item");
                  var any = false;
                  $items.each(function () {
                      var $it = $(this);
                      if (!$it.data('extOrigDisplay')) $it.data('extOrigDisplay', $it.css('display') === 'none' ? '' : $it.css('display'));
                      var hit = $it.text().toLowerCase().indexOf(kw) >= 0;
                      $it.css('display', hit ? $it.data('extOrigDisplay') : 'none');
                      if (hit) any = true;
                  });
                  $h3.css('display', any ? '' : 'none');
              });
          });

          // 以下控件绑定沿用原逻辑（弹窗内选择器不变）
          $("#family").off('change');
          $('#autorelogin').off('click')
          $('#autorecover').off('click')
          $('#dpssakada').off('click')
          $('.clean_dps').off('click')

          $('#funnycalc').off('click')
          $('#keepalive').off('click')

          $('#loginhml').off('change')
          $("autowork").off('change');
          $('#getitemShow').off('click')
          $("#zmlshowsetting").off('change')

          $('#marry_kiss').off('click')
          $('#autoBoss').off('click')
          $('#BossName').off('change')
          $('#auto_command').off('change')


          $(".savebtn").off('click')
          $('.clear_skillJson').off('click')
          $('.backup_btn').off('click')
          $('.load_btn').off('click')
          $('.reset_default_btn').off('click')
          $('#autoBuy').off('change')
          $('#shieldkey').off('focusout');
          $('#shield').off('focusout');
          $('#zdyskilllist').off('change')
          $('#zdyskillsswitch').off('click')
          $('#shieldswitch').off('click')
          $('#die_str').off('focusout');
          $('#custom_dock').off('focusout');
          $('#unauto_pfm').off('change')
          $("pushSwitch").off('click');
          $("pushDeath").off('click');
          $("pushType").off('change');
          $("pushToken").off('change');
          // $("pushUrl").off('change');
          $("#idleCmdSwitch").off('click');
          $("#idleCmdSeconds").off('focusout');
          $("#idleCmdContent").off('focusout');
          $('#autorewardgoto').off('click')
          $('#autopfmswitch').off('click')
          $('#auto_eq').off('change')

          $('#fj_onekey').off('click')
          $('#fj_follower').off('click')
          $('#fj_sc').off('change')
          $('#fjList').off('change')
          $('#autoSell').off('change')
          $('#autoUse').off('change')
          $('.scan_orphan_btn').off('click')
          $('.clean_orphan_btn').off('click')
          $('#healthcheck').off('click')


          // 【2026-08-09 修复】开关视觉切换绑定：原来挂在 .dialog-extend（游戏对话框），独立弹窗后失效
          $("#ext-setting-mask").on("click", ".switch2", UI.switchClick);
          $("#family").change(function () {
              family = $("#family").val();
              GM_setValue(roleid + "_family", family);
          });
          $("#autowork").change(function () {
              autowork = $('#autowork').val();
              GM_setValue(roleid + "_autowork", autowork);
          });
          $('#marry_kiss').click(function () {
              automarry = WG.switchReversal($(this));
              GM_setValue(roleid + "_automarry", automarry);
          });
          $('#autoBoss').click(function () {
              autoBoss = WG.switchReversal($(this));
              GM_setValue(roleid + "_autoBoss", autoBoss);
          });
          $('#BossName').change(function () {
              BossName = $('#BossName').val();
              GM_setValue(roleid + "_BossName", BossName);
          });
          $('#fj_onekey').click(function () {
              onekey_fenjie = WG.switchReversal($(this));
              GM_setValue(roleid + "_onekey_fenjie", onekey_fenjie);
          });
          $('#fj_follower').click(function () {
              follower_fenjie = WG.switchReversal($(this));
              GM_setValue(roleid + "_follower_fenjie", follower_fenjie);
          });
          $('#fj_sc').change(function () {
              fj_sc = $('#fj_sc').val();
              GM_setValue(roleid + "_fj_sc", fj_sc);
          });
          $('#fjList').change(function () {
              fenjieList = $('#fjList').val();
              GM_setValue(roleid + "_fenjieList", fenjieList);
          });
          $('#autopfmswitch').click(function () {
              auto_pfmswitch = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_pfmswitch", auto_pfmswitch);
              // 【2026-08-15】按钮文字同步开关状态
              try { WG.auto_perform_button(); } catch (e) { }
          });
          $('#autopfmmode').click(function () {
              auto_pfm_mode = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_pfm_mode", auto_pfm_mode);
          });
          $('#busyinfo').click(function () {
              busy_info = WG.switchReversal($(this));
              GM_setValue(roleid + "_busy_info", busy_info);
          });
           $('#skillCD').click(function () {
              skillCD = WG.switchReversal($(this));
              GM_setValue(roleid + "_skillCD", skillCD);
          });
           $('#buffCD').click(function () {
              buffCD = WG.switchReversal($(this));
              GM_setValue(roleid + "_buffCD", buffCD);
          });
          // 【2026-08-12 移植作者 f45137e】CD 颜色下拉即时保存
          $('#skillCDColor').change(function () {
              skillCDColor = $(this).val();
              GM_setValue(roleid + "_skillCDColor", skillCDColor);
          });
          $('#buffCDColor').change(function () {
              buffCDColor = $(this).val();
              GM_setValue(roleid + "_buffCDColor", buffCDColor);
          });
          // 【2026-08-13 移植作者 26.2】自动买符开关 + 活动轮询间隔
          $('#autobuytalisman').click(function () {
              auto_buy_talisman = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_buy_talisman", auto_buy_talisman);
          });
          $('#event_poll_interval').change(function () {
              var v = parseInt($(this).val()) || 1;
              if (v < 1) v = 1;
              event_poll_interval = v;
              GM_setValue(roleid + "_event_poll_interval", v);
              try { if (GlobalInit.restartEventPolling) GlobalInit.restartEventPolling(); } catch (e) { }
          });
          $('#autorelogin').click(function () {
              auto_relogin = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_relogin", auto_relogin);
          });
          // 【2026-08-13 自动恢复】重连失败后自动刷新重登开关
          $('#autorecover').click(function () {
              auto_recover = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_recover", auto_recover);
          });
          $('#rainbowname').click(function () {
              rainbow_name = WG.switchReversal($(this));
              GM_setValue(roleid + "_rainbow_name", rainbow_name);
              rainbowplayer();
          });
          $("#zmlshowsetting").change(function () {
              zmlshowsetting = $('#zmlshowsetting').val();
              GM_setValue(roleid + "_zmlshowsetting", zmlshowsetting);
              WG.zml_showp();
          });
          $("#pushSwitch").click(function () {
              pushSwitch = WG.switchReversal($(this));
              GM_setValue(rid + "_pushSwitch", pushSwitch);
          });
          $("#pushDeath").click(function () {
              _pushDeath = WG.switchReversal($(this));
              GM_setValue(rid + "_pushDeath", _pushDeath);
          });
          $("#idleCmdSwitch").click(function () {
              _idleCmdSwitch = WG.switchReversal($(this));
              GM_setValue("_idleCmdSwitch", _idleCmdSwitch);
              idleCmdStart();
          });
          $("#idleCmdSeconds").focusout(function () {
              _idleCmdSeconds = parseInt($('#idleCmdSeconds').val()) || 120;
              GM_setValue("_idleCmdSeconds", _idleCmdSeconds);
          });
          $("#idleCmdContent").focusout(function () {
              _idleCmdContent = $('#idleCmdContent').val();
              GM_setValue("_idleCmdContent", _idleCmdContent);
          });
          $("#pushType").change(function () {
              pushType = $('#pushType').val();
              GM_setValue(rid + "_pushType", pushType);
          });
          $("#pushToken").focusout(function () {
              pushToken = $('#pushToken').val();
              GM_setValue(rid + "_pushToken", pushToken);
          });
          // 【2026-08-14 测试推送按钮】点击时先落库（blur 已触发 focusout），再用当前配置发一条测试
          $(".push_test_btn").off('click');
          $(".push_test_btn").on('click', function () {
              pushSwitch = GM_getValue(rid + "_pushSwitch", pushSwitch);
              pushType = GM_getValue(rid + "_pushType", pushType);
              pushToken = GM_getValue(rid + "_pushToken", pushToken);
              if (pushSwitch != '开' && pushSwitch !== true && pushSwitch !== 'true') {
                  messageAppend("<hiy>请先打开推送开关再测试</hiy>");
                  return;
              }
              messageAppend("<hiy>正在发送测试推送…</hiy>");
              Push("✅ 测试：这是一条来自 WSMUD 插件的测试推送，收到即表示配置正常");
              messageAppend("<hiy>已发送，请查看手机是否收到（当前渠道编号：" + pushType + "）</hiy>");
          });
          // $("#pushUrl").focusout(function () {
          //     pushUrl = $('#pushUrl').val();
          //     GM_setValue("_pushUrl", pushUrl);
          // });
          $("#color_select").change(function () {
              color_select = $('#color_select').val();
              GM_setValue("color_select", color_select);
          });
          $('#getitemShow').click(function () {
              getitemShow = WG.switchReversal($(this));
              GM_setValue(roleid + "_getitemShow", getitemShow);
          });
          $('#unauto_pfm').change(function () {
              unauto_pfm = $('#unauto_pfm').val();
              GM_setValue(roleid + "_unauto_pfm", unauto_pfm);
              var unpfm = unauto_pfm.split(',');
              blackpfm = [];
              for (var pfmname of unpfm) {
                  if (pfmname)
                      blackpfm.push(pfmname);
              }
          });
          $('#auto_command').change(function () {
              auto_command = $('#auto_command').val();
              GM_setValue(roleid + "_auto_command", auto_command);
          });
          $('#die_str').focusout(function () {
              die_str = $('#die_str').val();
              GM_setValue(roleid + "_die_str", die_str);
          });
          $('#custom_dock').focusout(function () {
              custom_dock = $('#custom_dock').val();
              GM_setValue(roleid + "_custom_dock", custom_dock);
              WG.customDock(custom_dock);
          });
          $('#shieldswitch').click(function () {

              shieldswitch = WG.switchReversal($(this));
              GM_setValue("_shieldswitch", shieldswitch);
              if (shieldswitch == "开" || shieldswitch === true || shieldswitch === 'true') {
                  messageAppend('已注入屏蔽系统', 1);
              }
          });
          $('#zdyskillsswitch').click(function () {

              zdyskills = WG.switchReversal($(this));
              GM_setValue(roleid + "_zdyskills", zdyskills);
              if (zdyskills == "开" || zdyskills === true || zdyskills === 'true') {
                  messageAppend('已开启自定义技能顺序，填写顺序后，请刷新游戏生效', 1);
              }
          });

          $('#zdyskilllist').change(function () {

              let x = JSON.parse($("#zdyskilllist").val());
              // 【2026-08-15 修复】同 L262：`!typeof x instanceof Array` 恒为 false，改用 Array.isArray
              if (!Array.isArray(x)) {
                  alert("无效的输入")
                  return false;
              } else {
                  zdyskilllist = $("#zdyskilllist").val();
                  GM_setValue(roleid + "_zdyskilllist", zdyskilllist);
              }
          });
          $('#dpssakada').click(function () {

              dpssakada = WG.switchReversal($(this));
              GM_setValue(roleid + "_dpssakada", dpssakada);
              if (dpssakada == "开" || dpssakada === true || dpssakada === 'true') {
                  messageAppend('已开启战斗统计', 1);
              }
          });
          $('#funnycalc').click(function () {

              funnycalc = WG.switchReversal($(this));
              GM_setValue(roleid + "_funnycalc", funnycalc);
              if (funnycalc == "开" || funnycalc === true || funnycalc === 'true') {
                  messageAppend('已开启FUNNY计算', 1);
              }
          });
          // 【2026-08-10 新增】后台保活开关（全局键，即时生效）
          $('#keepalive').click(function () {
              keepalive = WG.switchReversal($(this));
              GM_setValue("_keepalive", keepalive);
              try {
                  if (keepalive == "开") { window._extKeepAlive && window._extKeepAlive.start(); }
                  else { window._extKeepAlive && window._extKeepAlive.stop(); }
              } catch (e) { }
              messageAppend(keepalive == "开" ? '已开启后台保活' : '已关闭后台保活', 1);
          });
          // 【2026-08-14 跨窗口同步】全局设置同步开关（默认关，开启后 _ 开头/color_select 设置广播到所有游戏窗口）
          $('#ext_sync_global').off('click');
          $('#ext_sync_global').click(function () {
              var v = WG.switchReversal($(this));
              ext_sync_global = v;
              window.__extConfigSyncOn = (v == "开");
              GM_setValue("_ext_sync_global", v);
              messageAppend(v == "开"
                  ? '已开启跨窗口同步（屏蔽/推送/保活等全局设置将自动同步到所有游戏窗口）'
                  : '已关闭跨窗口同步', 1);
          });
          $('#shield').focusout(function () {
              shield = $('#shield').val();
              GM_setValue("_shield", shield);
          });
          $('#shieldkey').focusout(function () {
              shieldkey = $('#shieldkey').val();
              GM_setValue("_shieldkey", shieldkey);
          });
          $('#loginhml').change(function () {
              loginhml = $('#loginhml').val();
              GM_setValue(roleid + "_loginhml", loginhml);
          });
          $('#autoBuy').change(function () {
              autoBuyList = $('#autoBuy').val();
              GM_setValue(roleid + "_autoBuyList", autoBuyList);
          });
          // 【2026-08-09 移植v1.0.0】自动售卖/自动使用：输入框保存 + 执行按钮
          $('#autoSell').change(function () {
              autoSellList = $('#autoSell').val();
              GM_setValue(roleid + "_autoSellList", autoSellList);
          });
          $('#autoUse').change(function () {
              autoUseList = $('#autoUse').val();
              GM_setValue(roleid + "_autoUseList", autoUseList);
          });
          $('.backup_btn').on('click', WG.make_config);
          $('.load_btn').on('click', WG.load_config);
          $('.reset_default_btn').on('click', WG.reset_default);
          // 【2026-08-11 本地自动备份】立即备份 / 恢复备份按钮 + 显示最近备份时间
          $('.backup_now_btn').on('click', function () {
              if (WG.backup_config(false)) {
                  var bk = GM_getValue("ext_config_backup", null);
                  if (bk && bk.time && $('#ext-backup-info').length) {
                      $('#ext-backup-info').text('最近备份：' + new Date(bk.time).toLocaleString());
                  }
              }
          });
          $('.restore_backup_btn').on('click', WG.restore_config);
          // 【2026-08-13 存储孤儿键清理】扫描（只读）+ 备份并清理（删除前自动备份）
          $('.scan_orphan_btn').on('click', function () {
              try {
                  if (typeof GM_scanOrphanKeys !== 'function') { LayerHelper.msg('扫描函数不可用'); return; }
                  var rep = GM_scanOrphanKeys();
                  if (!rep.ok) { LayerHelper.msg(rep.message || '无法扫描'); return; }
                  if (rep.orphans.length === 0) {
                      if ($('#ext-orphan-info').length) $('#ext-orphan-info').text('未发现孤儿键，存储干净');
                      LayerHelper.msg('未发现孤儿键');
                      return;
                  }
                  var preview = rep.orphans.slice(0, 6).map(function (o) { return o.key; }).join('、');
                  var more = rep.orphans.length > 6 ? (' 等 ' + rep.orphans.length + ' 项') : '';
                  if ($('#ext-orphan-info').length) $('#ext-orphan-info').text('发现 ' + rep.orphans.length + ' 个孤儿键（约 ' + Math.ceil(rep.totalBytes / 1024) + 'KB）：' + preview + more);
                  LayerHelper.msg('发现 ' + rep.orphans.length + ' 个孤儿键，可点「备份并清理」删除');
              } catch (e) { LayerHelper.msg('扫描出错：' + (e && e.message)); }
          });
          $('.clean_orphan_btn').on('click', function () {
              try {
                  if (typeof GM_scanOrphanKeys !== 'function' || typeof GM_cleanOrphanKeys !== 'function') { LayerHelper.msg('清理函数不可用'); return; }
                  var rep = GM_scanOrphanKeys();
                  if (!rep.ok) { LayerHelper.msg(rep.message || '无法判定角色列表，暂不清理'); return; }
                  if (rep.orphans.length === 0) { LayerHelper.msg('没有孤儿键，无需清理'); return; }
                  layer.confirm('将备份并删除 ' + rep.orphans.length + ' 个孤儿键（约 ' + Math.ceil(rep.totalBytes / 1024) + 'KB）\n删除前会自动备份到本地，可随时恢复。确认继续？', {
                      title: "<red>! 警告</red>",
                      btn: ['取消', '备份并删除'],
                      shift: 2,
                  }, function (index) {
                      layer.close(index);
                  }, function () {
                      layer.close(index);
                      try {
                          var res = GM_cleanOrphanKeys();
                          if (res && res.removed > 0) {
                              LayerHelper.msg('已备份并清理 ' + res.removed + ' 个孤儿键（备份：' + res.backupKey + '）');
                              if ($('#ext-orphan-info').length) $('#ext-orphan-info').text('已清理 ' + res.removed + ' 个孤儿键，备份在：' + res.backupKey);
                              // 刷新顶部存储占用
                              try {
                                  var _usage = 0, _cnt = 0, _klist = GM_listValues();
                                  for (var _i = 0; _i < _klist.length; _i++) { _usage += (localStorage.getItem(_klist[_i]) || '').length; _cnt++; }
                                  var _usageText = _usage > 1048576 ? (_usage / 1048576).toFixed(2) + 'MB' : Math.ceil(_usage / 1024) + 'KB';
                                  $("#ext-storage-usage").text('（配置 ' + _cnt + ' 项 · 占用 ' + _usageText + ' / 约5MB）');
                              } catch (e2) { }
                          } else {
                              LayerHelper.msg((res && res.message) || '清理失败');
                          }
                      } catch (e3) { LayerHelper.msg('清理出错：' + (e3 && e3.message)); }
                  });
              } catch (e) { LayerHelper.msg('清理出错：' + (e && e.message)); }
          });
          // 【2026-08-13 挂机健康自检】开关：即时启停定时器
          $('#healthcheck').click(function () {
              healthcheck_enabled = WG.switchReversal($(this));
              GM_setValue(roleid + "_healthcheck_enabled", healthcheck_enabled);
              try {
                  if (healthcheck_enabled) { if (typeof extHealthStart === 'function') extHealthStart(); }
                  else { if (typeof extHealthStop === 'function') extHealthStop(); }
              } catch (e) { }
          });
          try {
              var _bk = GM_getValue("ext_config_backup", null);
              if (_bk && _bk.time && $('#ext-backup-info').length) {
                  $('#ext-backup-info').text('最近备份：' + new Date(_bk.time).toLocaleString());
              }
          } catch (e) { }
          $('.clear_skillJson').on('click', () => {
              zdyskilllist == "";
              messageAppend("已关闭自定义，请刷新重新获取技能数据!");
              zdyskills = "关";
              GM_setValue(roleid + "_zdyskilllist", "");
              GM_setValue(roleid + "_zdyskills", zdyskills);
          });


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
              messageAppend("保存自定义按钮成功");
              inzdy_btn = true;
              GM_setValue(roleid + "_inzdy_btn", true);
              WG.zdy_btnshow();
          });


          $('#family').val(family);
          $('#marry_kiss').val(automarry);
          $('#autoBoss').val(autoBoss);
          $('#BossName').val(BossName);
          $('#fj_onekey').val(onekey_fenjie);
          $('#fj_follower').val(follower_fenjie);
          $('#fj_sc').val(fj_sc);
          $("#fjList").val(fenjieList);
          $('#autopfmswitch').val(auto_pfmswitch);
          $('#autopfmmode').val(auto_pfm_mode);
          $('#busyinfo').val(busy_info);
          $('#skillCD').val(skillCD);
          $('#buffCD').val(buffCD);
          // 【2026-08-12 移植作者 f45137e】CD 颜色回显
          $('#skillCDColor').val(skillCDColor);
          $('#buffCDColor').val(buffCDColor);
          // 【2026-08-13 移植作者 26.2】自动买符 + 活动轮询间隔回显
          $('#autobuytalisman').val(auto_buy_talisman);
          $('#event_poll_interval').val(event_poll_interval);
          // 【2026-08-13 挂机健康自检】回显
          $('#healthcheck').val(healthcheck_enabled);
          $('#autorelogin').val(auto_relogin);
          $('#autorecover').val(auto_recover);
          $('#rainbowname').val(rainbow_name);
          $("#zmlshowsetting").val(zmlshowsetting);
          $("#pushSwitch").val(pushSwitch);
          $("#pushType").val(pushType);
          $("#pushToken").val(pushToken);
          // $("#pushUrl").val(pushUrl);
          $("#idleCmdSwitch").val(_idleCmdSwitch);
          $("#idleCmdSeconds").val(_idleCmdSeconds);
          $("#idleCmdContent").val(_idleCmdContent);

          $("#color_select").val(color_select);
          $('#getitemShow').val(getitemShow);
          $('#unauto_pfm').val(unauto_pfm);
          $('#auto_command').val(auto_command);
          $('#die_str').val(die_str);
          $('#custom_dock').val(custom_dock);
          $('#shieldswitch').val(shieldswitch);
          $('#dpssakada').val(dpssakada);
          $('#funnycalc').val(funnycalc);
          $('#shield').val(shield);
          $('#shieldkey').val(shieldkey);
          $("#loginhml").val(loginhml);
          $("#autowork").val(autowork);
          $("#autoBuy").val(autoBuyList);
          $("#autoSell").val(autoSellList);
          $("#autoUse").val(autoUseList);
          $("#zdyskillsswitch").val(zdyskills);
          $("#zdyskilllist").val(zdyskilllist);
          //自定义按钮刷新
          var keyitem = ["Q", "W", "E", "R", "T", "Y"];
          let zdybtni = 0;
          for (let item of keyitem) {
              $(`#name${item}`).val(zdy_btnlist[zdybtni].name);
              $(`#send${item}`).val(zdy_btnlist[zdybtni].send);
              zdybtni = zdybtni + 1;
          }
          // 【2026-08-09 修复】开关回显：原选择器 .setting>.setting-item2 在独立弹窗里匹配不到（syssetting 无 .setting 父容器）
          for (let w = $("#ext-setting-body .setting-item2"), t = 0; t < w.length; t++) {
              var s = $(w[t]),
                  i = s.attr("for");
              if (i) {
                  // 【2026-08-15 优化】原 eval(i) 仅用于按全局变量名取值（i 来自设置项
                  // for="变量名" 属性），改用 window[i] 读取，行为一致且避免 eval。
                  // 这些设置项都是 config-vars.js 里的 var 全局变量，挂在 window 上。
                  var n = window[i];
                  switch (i) {
                      default:
                          "开" == n && (s.find(".switch2").addClass("on"), s.find(".switch-text").html("开"))
                  }
              }
          }
      }
});
// 【发呆检测】定时检查角色发呆状态，超过阈值时执行自定义命令
function idleCmdStart() {
    if (_idleCmdTimer) { clearInterval(_idleCmdTimer); _idleCmdTimer = null; }
    if (_idleCmdSwitch != '开' && _idleCmdSwitch !== true && _idleCmdSwitch !== 'true') return;
    _idleCmdTimer = setInterval(function () {
        try {
            if (typeof Role === 'undefined' || !Role.isIdle) return;
            if (!Role.isIdle()) { _idleCmdFired = false; return; }
            var idleSec = Role.getIdleTime();
            if (idleSec >= _idleCmdSeconds && !_idleCmdFired) {
                _idleCmdFired = true;
                if (_idleCmdContent && _idleCmdContent.trim()) {
                    if (typeof ToRaid !== 'undefined' && ToRaid.perform) {
                        ToRaid.perform(_idleCmdContent.trim(), "发呆触发");
                    } else if (typeof SendCommand === 'function') {
                        SendCommand(_idleCmdContent.trim());
                    }
                } else {
                    try { if (typeof PushAlert === 'function') PushAlert('idle_cmd', '⏰ 角色已发呆', 60 * 1000); } catch (e) { }
                }
            }
        } catch (e) { console.error("[idleCmd]", e); }
    }, 5000);
}
