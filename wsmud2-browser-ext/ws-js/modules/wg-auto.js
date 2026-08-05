// wg-auto.js
// WG auto commands and state monitor (zml/ztjk/ytjk)
'use strict';

Object.assign(WG, {
      zmlztjk: function () {
          zml = GM_getValue(roleid + "_zml", zml);
          if (! typeof zml instanceof Array) {
              zml = [];
          }
          messageClear();
          var a = UI.zmlandztjkui;
          messageAppend(a);
          const zmlvue = new Vue({
              el: "#zmlandztjk",
              data: {
              },
              created() {
                  this.zmldata = zml;
              },
              methods: {
                  run: function (v) {
                      WG.zmlfire(v);
                  },
                  zml: function () {
                      WG.zml_edit();
                  },
                  ztjk: function () {
                      WG.ztjk_edit();
                  },
                  startjk: function () {
                      WG.ztjk_func();
                  },
                  stopjk: function () {
                      if (WG.ztjk_hook) {
                          WG.remove_hook(WG.ztjk_hook);
                          WG.ztjk_hook = undefined;
                          messageAppend("<hig>已取消注入");
                          return;
                      }
                      messageAppend("<hig>未注入");
                  }

              }
          })
          },
      zml_edit: function () {
          zml = GM_getValue(roleid + "_zml", zml);
          if (! typeof zml instanceof Array) {
              zml = [];
          }
          messageClear();
          var edithtml = UI.zmlsetting;
          messageAppend(edithtml);
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
          messageAppend(edithtml);
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
          let _config = {};
          let keys = GM_listValues();
          keys.forEach(key => {
              if (key.indexOf(roleid) >= 0) {
                  _config[key] = GM_getValue(key);
              }
          });
          _config._shieldswitch = GM_getValue("_shieldswitch", shieldswitch);
          _config._shield = GM_getValue("_shield", shield);
          _config._shieldkey = GM_getValue("_shieldkey", shieldkey);
          _config._pushSwitch = GM_getValue("_pushSwitch", pushSwitch);
          _config._pushType = GM_getValue("_pushType", pushType);
          _config._pushToken = GM_getValue("_pushToken", pushToken);
          // _config._pushUrl = GM_getValue("_pushUrl", pushUrl);
          console.log(_config)
          SettingsStore.uploadUserConfig(GameState.id, _config, (res) => {
              if (res == "true") {
                  LayerHelper.msg("已成功上传");
              }
          });
      },
      load_config: async function () {
          SettingsStore.getUserConfig(GameState.id, (res) => {
              if (res != "") {
                  let _config = JSON.parse(res);
                  for (const key in _config) {
                      GM_setValue(key, _config[key]);
                  }


                  GlobalInit.configInit();

                  WG.setting();
                  WG.ztjk_func();
                  WG.zml_showp();
                  WG.dsj_func();
                  LayerHelper.msg("已成功加载");
              }
          });
      }, //设置
      setting: function () {
          KEY.do_command("setting");

          $('.footer-item')[$('.footer-item').length - 1].click();
          // GI.configInit();

          if ($('.dialog-extend .zdy_dialog').length == 0) {
              var a = UI.syssetting();
              $(".dialog-extend").prepend(a);

          }
          $(".dialog-extend").off('click');
          $("#family").off('change');
          $('#autorelogin').off('click')
          $('#dpssakada').off('click')
          $('.clean_dps').off('click')

          $('#funnycalc').off('click')

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
          $('#autoBuy').off('change')
          $('#backimageurl').off('change')
          $('#shieldkey').off('focusout');
          $('#shield').off('focusout');
          $('#zdyskilllist').off('change')
          $('#zdyskillsswitch').off('click')
          $('#shieldswitch').off('click')
          $('#die_str').off('focusout');
          $('#custom_dock').off('focusout');
          $('#unauto_pfm').off('change')
          $("pushSwitch").off('click');
          $("pushType").off('change');
          $("pushToken").off('change');
          // $("pushUrl").off('change');
          $('#autorewardgoto').off('click')
          $('#autopfmswitch').off('click')
          $('#auto_eq').off('change')

          $('#fj_onekey').off('click')
          $('#fj_follower').off('click')
          $('#fj_sc').off('change')
          $('#fjList').off('change')


          $(".dialog-extend").on("click", ".switch2", UI.switchClick);
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
          $('#autorelogin').click(function () {
              auto_relogin = WG.switchReversal($(this));
              GM_setValue(roleid + "_auto_relogin", auto_relogin);
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
              GM_setValue("_pushSwitch", pushSwitch);
          });
          $("#pushType").change(function () {
              pushType = $('#pushType').val();
              GM_setValue("_pushType", pushType);
          });
          $("#pushToken").focusout(function () {
              pushToken = $('#pushToken').val();
              GM_setValue("_pushToken", pushToken);
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
              if (shieldswitch == "开") {
                  messageAppend('已注入屏蔽系统', 1);
              }
          });
          $('#zdyskillsswitch').click(function () {

              zdyskills = WG.switchReversal($(this));
              GM_setValue(roleid + "_zdyskills", zdyskills);
              if (zdyskills == "开") {
                  messageAppend('已开启自定义技能顺序，填写顺序后，请刷新游戏生效', 1);
              }
          });

          $('#zdyskilllist').change(function () {

              let x = JSON.parse($("#zdyskilllist").val());
              if (!typeof x instanceof Array) {
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
              if (dpssakada == "开") {
                  messageAppend('已开启战斗统计', 1);
              }
          });
          $('#funnycalc').click(function () {

              funnycalc = WG.switchReversal($(this));
              GM_setValue(roleid + "_funnycalc", funnycalc);
              if (funnycalc == "开") {
                  messageAppend('已开启FUNNY计算', 1);
              }
          });
          $('#shield').focusout(function () {
              shield = $('#shield').val();
              GM_setValue("_shield", shield);
          });
          $('#shieldkey').focusout(function () {
              shieldkey = $('#shieldkey').val();
              GM_setValue("_shieldkey", shieldkey);
          });
          $('#backimageurl').change(function () {
              backimageurl = $('#backimageurl').val();
              GM_setValue(roleid + "_backimageurl", backimageurl);
              if (backimageurl != '') {
                  WG.SendCmd("setting backcolor none");
                  GM_addStyle(`body{
            background-color:rgb(0,0,0,.25)
              }
              div{
                  opacity:1;
              }
              html{
              background:rgba(255,255,255,0.25);
              background-image:url('${backimageurl}');
              background-repeat:no-repeat;
              background-size:100% 100%;
              -moz-background-size:100% 100%;
          }
          `);
              }
          });
          $('#loginhml').change(function () {
              loginhml = $('#loginhml').val();
              GM_setValue(roleid + "_loginhml", loginhml);
          });
          $('#autoBuy').change(function () {
              autoBuyList = $('#autoBuy').val();
              GM_setValue(roleid + "_autoBuyList", autoBuyList);
          });
          $('.backup_btn').on('click', WG.make_config);
          $('.load_btn').on('click', WG.load_config);
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
              WG.zdy_btnListInit();
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
          $('#autorelogin').val(auto_relogin);
          $('#rainbowname').val(rainbow_name);
          $("#zmlshowsetting").val(zmlshowsetting);
          $("#pushSwitch").val(pushSwitch);
          $("#pushType").val(pushType);
          $("#pushToken").val(pushToken);
          // $("#pushUrl").val(pushUrl);

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
          $("#backimageurl").val(backimageurl);
          $("#loginhml").val(loginhml);
          $("#autowork").val(autowork);
          $("#autoBuy").val(autoBuyList);
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
          for (let w = $(".setting>.setting-item2"), t = 0; t < w.length; t++) {
              var s = $(w[t]),
                  i = s.attr("for");
              if (i) {
                  var n = eval(i);
                  switch (i) {
                      default:
                          "开" == n && (s.find(".switch2").addClass("on"), s.find(".switch-text").html("开"))
                  }
              }
          }
      }
});
