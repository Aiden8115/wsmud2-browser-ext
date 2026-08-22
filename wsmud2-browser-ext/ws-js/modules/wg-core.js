// ============================================================
// wg-core.js —— 插件主框架（WG 对象的核心）
// ------------------------------------------------------------
// 定义全局 WG 对象的基础部分：
//   WG.deserializePackData  把服务器打包的数据（数组）转成对象
//   WG.smartClone           深拷贝对象
//   WG.add_hook / WG.hook   注册/触发"消息钩子"（各模块监听游戏消息的机制）
//   WG.init                 插件初始化（登录前）
//   WG.login                登录后的启动（注入界面、读配置、启动各监控）
//   WG.customDock           自定义快捷栏
//   WG.wsdelaytest          网络延迟测试
// 登录成功后它会调用：UI.wgui（界面）、GlobalInit.configInit（读设置）、
//   KEY.do_command（触发命令），并启动 ztjk_func/zml_showp/dsj_func/ytjk_func 等监控。
// ============================================================
// wg-core.js
// WG core: deserialize, hooks, init, login
'use strict';

var WG = window.WG = window.WG || {};
Object.assign(WG, {
      online: false,
      deserializePackData: function (data) {
          if (data.items) {
              data.items = data.items.map(arr => {
                  const item = {};
                 itemKeys.forEach((key, i) => {
                      item[key] = arr[i];
                  });
                  return item;
              });
          }

          if (data.eqs) {
              data.eqs = data.eqs.map(arr => {
                  if (!arr) return null;
                  const eq = {};
                  eqKeys.forEach((key, i) => {
                      eq[key] = arr[i];
                  });
                  return eq;
              });
          }
          
          if (data.selllist) {
              if (data.dialog == "shop") {
                  data.selllist = data.selllist.map(arr => {
                  if (!arr) return null;
                  const selllist = {};
                  shopKeys.forEach((key, i) => {
                      selllist[key] = arr[i];
                  });
                  return selllist;
              });
              } else {
              data.selllist = data.selllist.map(arr => {
                  if (!arr) return null;
                  const selllist = {};
                  selllistKeys.forEach((key, i) => {
                      selllist[key] = arr[i];
                  });
                  return selllist;
              });
          }
          }
          
          if (data.stores) {
              data.stores = data.stores.map(arr => {
                  if (!arr) return null;
                  const store = {};
                  storeKeys.forEach((key, i) => {
                      store[key] = arr[i];
                  });
                  return store;
              });
          }

          return data;
      },
      // 深拷贝判断函数，支持structuredClone就用structuredClone
      smartClone: function (obj) {
        if (typeof structuredClone !== 'undefined') {
          try {
            return structuredClone(obj);
          } catch (e) {
            console.warn('structuredClone failed, fallback to JSON method');
          };
        };

        try {
          return JSON.parse(JSON.stringify(obj));
        } catch (e) {
          console.error('JSON clone failed', e);
          return null;
        };
      },
      customDock: function (num) {
          // 1. 为要创建的元素设置一个唯一的ID，防止冲突
          const barId = 'pure-black-raised-bar';
          const styleId = 'pure-black-raised-bar-style'; // 为样式标签也设置一个ID
          // 2. 设置黑色条块的高度 (单位: 像素)
          const barHeight = 0; // 例如，20像素高
          // 3. 设置条块抬高的高度，即距离页面最底部的间距 (单位: 像素)
          const raiseAmount = num; // 例如，从底部抬高20像素
          const oldBar = document.getElementById(barId);
          if (oldBar) {
              oldBar.remove();
          }
          const oldStyle = document.getElementById(styleId);
          if (oldStyle) {
              oldStyle.remove();
          }
          // 计算body需要增加的底部内边距，为黑色条块腾出空间
          const requiredBodyPadding = barHeight + raiseAmount;
          // 创建<style>标签，并定义所有需要的CSS样式
          const styleElement = document.createElement('style');
          styleElement.id = styleId; // 设置ID以便下次运行时能找到并移除它
          styleElement.textContent = `
              /* 确保body是定位的参考，并为其底部留出空间 */
              body {
                  position: relative !important;
                  padding-bottom: ${requiredBodyPadding}px !important;
                  box-sizing: border-box !important;
              }
              /* 黑色条块的样式 */
              #${barId} {
                  position: absolute;
                  bottom: ${raiseAmount}px;
                  left: 0;
                  width: 100%;
                  height: ${barHeight}px;
                  background-color: #000000; /* 纯黑色 */
                  z-index: 9999; /* 确保它在多数元素之上 */
                  border: none; /* 移除任何可能的边框 */
              }
          `;
          // 将<style>标签添加到页面的<head>中
          document.head.appendChild(styleElement);
          // 创建黑色的<div>元素
          const barElement = document.createElement('div');
          barElement.id = barId;
          // 将创建的元素添加到<body>的末尾
          document.body.appendChild(barElement);
      },
      init: function () {
          $("li[command=SelectRole]").on("click", function () {
              WG.login();
          });
      },
      // 检查值是否在数组中，支持精确匹配和包含匹配
      inArray: function (val, arr) {
          for (let i = 0; i < arr.length; i++) {
              let item = arr[i];
              if (item[0] == "<") {
                  if (item == val) return true;

              } else {
                  if (item != "") {
                      if (val.indexOf(item) >= 0) return true;
                  }
              }
          }
          return false;
      },
      // 检查值是否存在于数组或对象中
      hasStr: function (val, arr) {
          if (arr.length == null) {
              for (let item in arr) {
                  for (let i of arr[item]) {
                      if (i == val) return true;
                  }
              }
          } else {
              for (let i = 0; i < arr.length; i++) {
                  let item = arr[i];
                  if (item == val) return true;
              }
          }
          return false;
      },
      login: function () {
          role = $('.role-list .select').text().split(/[\s\n]/).pop();
          roleid = $('.role-list .select').attr('roleid')
          GM_listValues().map(function (key) {
              if (key.indexOf(role + "_") == 0) {
                  var tmpVal = key.split(role + "_")[1];
                  console.log(tmpVal)
                  GM_setValue(roleid + "_" + tmpVal, GM_getValue(key, null))
                  GM_deleteValue(key)
              }
          });

          $(".bottom-bar").append("<span class='item-commands' style='display:none'><span WG='WG' cmd=''></span></span>"); //命令行模块
          var html = UI.wgui();
          $(".content-message").after(html);
          $('.content-bottom').after("<div class='zdy-commands' style='font-size:0.9em'></div>");
          const css = `.zdy-item{
              display: inline-block;
              border: solid 1px gray;
              color: gray;
              background-color: black;
              text-align: center;
              cursor: pointer;
              border-radius: 0.25em;
              min-width: 2.5em;
              min-height: 0.5em;
              margin-right: 0em;
              margin-left: 0.4em;
              position: relative;
              padding-left: 0.4em;
              padding-right: 0.4em;
              line-height: 24px;
                  transition: background-size 0.2s linear;
                  background: linear-gradient(to top, rgba(128, 128, 128, 0.5) 0%, rgba(128, 128, 128, 0.5) 100%);
                  background-size: 0% 100%;
                  background-position: 100% 100%;
                  background-repeat: no-repeat;
              }
              /* 【2026-08-18 修复】快速使用按钮（.act-item.act-item-zdy）与游戏原生 .pfm-item 尺寸/行高一致 */
              .zdy-commands .act-item.act-item-zdy,
              .item-commands .act-item.act-item-zdy {
                  min-width: 2.5em;
                  padding-left: 0.4em;
                  padding-right: 0.4em;
              }
              .zdy-commands {
                  white-space: nowrap;
                  overflow-x: auto;
                  display: block;
                  line-height: 2em;
                  margin-bottom: 0.25em;
              }
              .zdy-commands>.act-item {
                  display: inline-block;
                  border: solid 1px gray;
                  color: gray;
                  background-color: black;
                  text-align: center;
                  cursor: pointer;
                  border-radius: 4px;
                  min-width: 2.5em;
                  margin-right: 0.5em;
                  position: relative;
                  padding-left: 0.4em;
                  padding-right: 0.4em;
                  margin-bottom: 2px;
                  /* transition: background-size 0.2s linear; */
                  background: linear-gradient(to top, rgba(128, 128, 128, 0.5) 0%, rgba(128, 128, 128, 0.5) 100%);
                  background-size: 0% 100%;
                  background-position: 100% 100%;
                  background-repeat: no-repeat;
              }
              .WG_log{
                flex: 1;
                overflow-y: auto;
                border: 1px solid #404040;
                max-height: 10em;
                width: calc(100% - 10px);
                border-radius: 0.5em;
              }
              .WG_log > pre {
                margin: 0px;
                white-space: pre-line;
              }
              .WG_log_log {
                flex: 1;
                overflow-y: auto;
                border: 1px solid #303030;
                max-height: 25em;
                width: calc(100% - 10px);
                border-radius: 0.5em;
                margin-top: 4px;
                background-color: rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
              }
              .WG_log_log_title {
                color: #ffffff;
                font-size: 14px;
                font-weight: bold;
                padding: 4px 10px;
                border-bottom: 1px solid rgba(255,255,255,0.25);
                flex-shrink: 0;
              }
              .WG_log_log > pre {
              margin: 0px;
              white-space: pre-line;
              flex: 1;
              overflow-y: auto;
              padding: 4px 10px;
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              }
              .WG_button {
                 width: calc(100% - 40px); 
                 overflow-x: auto;
                 display: block;
                 line-height:2em;
                 justify-content: flex-start;
                 padding: 10px 0;
              }
              .WG_button > .zdy-item:active {background-color: gray;color:black;}
              .item-plushp{display: inline-block;float: right;width: 100px;}
              .item-dps{display: inline-block;float: right;width: 100px;}
              .settingbox {margin-left: 0.625 em;border: 1px solid gray;background-color: transparent;color: unset;resize: none;width: 80% ;height: 3rem;}
              .runtest textarea{display:block;width:300px;height:160px;border:10px solid #F8F8F8;border-top-width:0;padding:10px;line-height:20px;overflow:auto;background-color:#3F3F3F;color:#eee;font-size:12px;font-family:'JetBrains Mono',monospace}
              .layui-btn,.layui-input,.layui-select,.layui-textarea,.layui-upload-button{outline:0;-webkit-appearance:none;transition:all .3s;-webkit-transition:all .3s;box-sizing:border-box}
              .layui-btn{display:inline-block;height:38px;line-height:38px;padding:0 18px;background-color:#009688;color:#fff;white-space:nowrap;text-align:center;font-size:14px;border:none;border-radius:2px;cursor:pointer}
              .layui-btn-normal{background-color:#1E9FFF}
              .layui-layer-moves{background-color:transparent}
              .switch2 {display: inline-block;position: relative;height: 1.25em;width: 3.125em;line-height: 1.25em;
              border-radius: 0.875em;background: #dedede;cursor: pointer;-ms-user-select: none;-moz-user-select: none;
              -webkit-user-select: none;user-select: none;vertical-align: middle;text-align: center;}
              .switch2 > .switch-button {position: absolute;left: 0px;height: 1.25em;width: 1.25em;
              border-radius: 0.875em;background: #fff;box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
              transition: 0.3s;-webkit-transition: 0.3s;left: 0px;}
              .switch2 > .switch-text {color:#898989;margin-left: 0.625em;}
              .on>.switch-button {right:0px;left:auto;}
              .on>.switch-text {color:#ffffff;margin-right: 0.625em;    margin-left: 0px;}
              .on {background-color:#008000;}
              .crit{
                  height:24px;
                  position:relative;
                  animation:myfirst 1s;
                  -webkit-animation:myfirst 0.4s; /* Safari and Chrome */
              }
                  @keyframes myfirst
              {
                  0%   {background:red; left:0px; top:0px;}
                  33% {background:red; left:0px; top:-14px;}
                  66% {background:red; left:0px; top:14px;}
                  100% {background:red; left:0px; top:0px;}
              }

              @-webkit-keyframes myfirst /* Safari and Chrome */
              {
                  0%   {background:red; left:0px; top:0px;}
                  33% {background:red; left:0px; top:-30px;}
                  100% {background:red; left:0px; top:0px;}
              }
              .rainbow-text{
                  color:red;
                  background-image: repeating-linear-gradient(45deg, violet, indigo, blue, green, yellow, orange, red, violet);
                  background-size:800% 800%;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  animation: rainbow 8s ease infinite;
                  -webkit-animation: rainbow 8s ease infinite;
                  font-weight: bold;
              }
              @keyframes rainbow
              {
                  0%{background-position:0% 50%}
                  50%{background-position:100% 25%}
                  100%{background-position:0% 50%}
              }
              @keyframes highlight-gradient {
                  0% {
                      background-position: 0% 50%;
                  }
                  100% {
                      background-position: 100% 50%;
                  }
              }
              
              .high-light-name {
                  animation:  highlight-gradient 5s infinite;
                  background: linear-gradient(90deg, #f0f, #0ff, #ff0, #f0f);
                  background-size: 200% 200%;
                  -webkit-background-clip: text;
                  background-clip: text;
                  -webkit-text-fill-color: transparent;
                  font-weight: bold;
              }
              #raidToolbar,
              #raidToolbar * {
                  box-sizing: content-box;
              }
              .WG_log,
              .WG_log * {
                  box-sizing: content-box;
              }
              /* 超新星特效的CSS样式 */
              .supernova-text {
                  position: relative !important; /* 使用!important提高优先级 */
                  font-weight: bold;
                  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
                  color: transparent !important; /* 确保文字本体透明 */
                      
                  /* [核心修改] 将这些不参与动画的属性移到这里 */
                  background: linear-gradient(90deg, #f0f, #0ff, #ff0, #f0f);
                  background-size: 300% 300%;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  -webkit-background-clip: text;

                  /* [核心修改] 动画现在只负责一件事：移动背景位置 */
                  animation: text-flow 6s linear infinite;
                  }

                  /* --- 动画关键帧定义 --- */

                  /* 动画1: 文字本体的流动彩虹效果 (简化且更稳定) */
                  @keyframes text-flow {
                      0% {
                          /* 动画开始时背景的位置 */
                          background-position: 0% 50%;
                      }
                      100% {
                          /* 动画结束时背景的位置 */
                          background-position: 300% 50%;
                      }
                  }`;
          GM_addStyle(css);

          GM_addStyle(`
              /* 代码输入框字体：只针对真正写代码的输入框 */
              #testmain,
              .runtest textarea,
              #create-flow-source,
              #modify-flow-source,
              #loginhml {
                  font-family: 'JetBrains Mono', monospace !important;
              }
              /* Trigger.js / Raid.js 编辑页面中高度较大的settingbox是代码输入框 */
              textarea.settingbox[style*="height:10rem"],
              textarea.settingbox[style*="height:5rem"],
              textarea.settingbox[style*="height: 10rem"],
              textarea.settingbox[style*="height: 5rem"] {
                  font-family: 'JetBrains Mono', monospace !important;
              }
          `);
          //初始化角色配置
          GlobalInit.configInit();
          //【2026-08-09 恢复】界面配色读取（删除背景图功能时被连带误删，现恢复）
          color_select = GM_getValue("color_select", color_select);
          let link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = diff_colors[color_select];
          let head = document.getElementsByTagName("head")[0];
          head.appendChild(link);
          setTimeout(() => {
              try {
                  if (GM_registerMenuCommand) {
                      GM_registerMenuCommand("设  置", WG.setting)
                      GM_registerMenuCommand("调  试", WG.cmd_echo_button)
                  }
              }
              catch (e) {
              }
              role = role;
              roleid = roleid;
              var logintext = '';
              document.title = role + "-MUD游戏-武神传说";
              LayerHelper.msg(`欢迎使用，版本号${GM_info.script.version || ''}`);
              // 自动打开栏目
              KEY.do_command("showtool")
              KEY.do_command("showcombat");
              // 获得必要信息
              setTimeout(() => {
                  KEY.do_command("pack");
                  KEY.do_command("score");
                  WG.SendCmd("score2");
              }, 1000);

              let keys = GM_getValue('keys');
              if (!keys){
                  console.log('已自动设置快捷键，使用W A S D Q E Z C 控制快捷移动')
                  GM_setValue('keys',{"KeyA":"0_0","KeyD":"0_1","KeyW":"0_2","KeyS":"0_3","KeyQ":"0_4","KeyE":"0_5","KeyZ":"0_6","KeyC":"0_7"})
              }

              WG.customDock(custom_dock);
              setTimeout(() => {
                  //bind settingbox
                  var rolep = role;
                  if (GameState.score.level) {
                      rolep = GameState.score.level + role;
                  }
                  if (CanUse) {
                      if (shieldswitch == "开" || shieldswitch === true || shieldswitch === 'true') {
                          messageAppend('已注入屏蔽系统', 1);
                      }

                      let tmp = `<hiy>欢迎${rolep},插件已加载！</hiy>`;
                      messageAppend(tmp);
                      
                      WG.ztjk_func();
                      WG.zml_showp();
                      WG.dsj_func();
                      setTimeout(() => {
                          WG.SendCmd("info");
                          WG.SendCmd("events");
                      }, 1500)
                      setTimeout(() => {
                          WG.SendCmd("relation");
                          WG.wsdelaytest();
                      }, 5000)
                      if (GameState.score.level && GameState.score.isGod) {
                          WG.ytjk_func()
                      }
                  } else {
                      logintext = `
                          <hiy>欢迎${role},插件未正常加载！
                          当前浏览器不支持自动喜宴,请使用centbrowser浏览器
                          谷歌系浏览器,请在network中勾选disable cache,多刷新几次,直至提示已加载!
                          多次刷新无法仍然出现本提示，请打开tampermonkey 插件设置
                          开启高级设置，在最下方实验 设置 “注入模式：即时”“严格模式：禁用”
                          插件版本: ${GM_info.script.version || ''}
                          </hiy>`;
                  }
                  messageAppend(logintext);
              }, 500);
              //执行记忆面板
              var closeBorad = localStorage.getItem("closeBorad");
              if (closeBorad === "true") {
                  WG.showhideborad()
              }
              WG.runLoginhml();
              //开启定时器
              var systime = setInterval(() => {
                  var myDate = new Date();
                  let timeTips = {
                      data: JSON.stringify({
                          type: "time",
                          h: myDate.getHours(),
                          m: myDate.getMinutes(),
                          s: myDate.getSeconds(),
                          time: myDate.toTimeString()
                      })
                  };
                  WG.receive_message(timeTips);
              }, 1000);
          }, 1000);
      },
      wsdelaytest: async function () {
          GameState.wsdelay.SetTime = new Date().getTime();
          GameState.wsdelay.SetCount = 1;
          GameState.wsdelay.delay = undefined;
          WG.SendCmd("test");
      }
});
