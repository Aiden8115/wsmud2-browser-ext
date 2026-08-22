// ============================================================
// funny2.js —— 界面增强脚本（可选加载，popup 里可关）
// ------------------------------------------------------------
// 功能：
//   1. 把游戏界面改成三栏布局（左：角色属性 / 中：游戏 / 右：频道）
//   2. 自动拾取地上物品（发 get 命令）
//   3. 辅助"领悟石壁"答题（内置《侠客行》诗句表）
//   4. 随从收菜/售卖、快捷按钮、门派传送按钮、装备/技能组一键切换
//
// 对外接口：unsafeWindow.funny（角色/房间/随从状态等）、SendCommand（发命令）
//
// 想改：
//   侠客行诗句表 → 搜 xkx
//   随从收菜白名单 → 搜 scpack
//   自动拾取黑名单（"尸体"不捡）→ 搜 尸体
//   快捷按钮文字和对应命令 → 搜按钮相关代码
//
// 【2026-08-08 已删除】右侧"活动提示"功能（用户要求彻底删除）：
//   原 198~248 行（监听 events 消息动态渲染活动列表）、776~866 行（静态"挖矿指南"卡片+样式）
//   均已删除，原位置留了标记注释。文件头说明同步更新。
// ============================================================
// funny2.js
// 武神传说 MUD 综合增强脚本：监控游戏事件、布局调整、快捷按钮、自动拾取等。
(function () {
  "use strict";
  /********************变量********************/

  // 【2026-08-11 26.1.11】统一构建函数：消除重复拼接。
  // 注意：必须定义在 IIFE 顶层（use strict 下块内 function 是块级作用域，块外访问不到会 ReferenceError）
  function mkBtn(text, fn) {
    return $('<span class="span-btn"></span>').text(text).on('click', fn);
  }
  function mkRow() {
    return $('<div></div>').append.apply($('<div></div>'), arguments);
  }
  function mkT(text) {
    return $('<span class="info-title"></span>').text(text);
  }
  function mkI(html, extraCls) {
    return $('<span class="info-item' + (extraCls ? ' ' + extraCls : '') + '"></span>').html(html);
  }
  function mkInfoRow() {
    return $('<div class="info-row"></div>').append.apply($('<div class="info-row"></div>'), arguments);
  }

  // 注意：变量名 isMoblie 为历史拼写，保持不变以兼容外部引用
  let isMoblie = false;
  let test = true;

  // 【2026-08-22 后台省电】低功耗检测：记录最后一次【真实用户交互】时间。
  // 只监听 mousedown/keydown/wheel/touchstart（keep-alive 只模拟 mousemove，不会被误判为活跃）。
  // 连续 60s 无真实交互 → 判定为后台挂机标签（_extLowPower() 返回 true）。
  // 战斗动画（ws.js ANI_PFM/ANI_OBJ）据此跳过 DOM 写入、守护轮询据此降频；逻辑类（触发/帮战/出招）不受影响。
  var _lastActive = Date.now();
  function _trackActive() { _lastActive = Date.now(); }
  ['mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
    document.addEventListener(t, _trackActive, true);
  });
  window._extLowPower = function () {
    return Date.now() - _lastActive > 60000;
  };

  // 【2026-08-14 性能优化】角色信息 DOM 批量刷新：
  // 战斗/房间刷新时 hp/mp 等高频写入，原实现每 set 一次就 $(".role_x").html() 一次；
  // 现在合并到同一宏任务（rAF/16ms）一次性更新所有脏键，DOM 写入量大幅下降。
  let _roleDirty = {};
  let _roleFlushPending = false;
  function _roleFlush() {
    _roleFlushPending = false;
    for (const key in _roleDirty) {
      $(".role_" + key).html(_roleDirty[key]);
    }
    _roleDirty = {};
  }
  function _roleSet(key, value) {
    _roleDirty[key] = value;
    if (!_roleFlushPending) {
      _roleFlushPending = true;
      (window.requestAnimationFrame || function (cb) { setTimeout(cb, 16); })(_roleFlush);
    }
  }

  // 标题代理：写入时同步更新 document.title
  let title = new Proxy({ name: "RoleName", state: "<STATE>" }, {
    set: function (title, key, value) {
      title[key] = value;
      $("head title").html(title.name + title.state);
      return true;
    },
    get: function (title, key) {
      return title[key];
    }
  });
  let roles = {};
  let id = "";
  let login = false;

  // 角色代理：写入非 name 字段时同步更新对应 DOM（节流批量）；name 字段一旦存在就不再覆盖
  let role = new Proxy({}, {
    set: function (role, key, value) {
      if (!isMoblie) {
        if (key === "name" && role.name) return true; // name 不变
        _roleSet(key, value);   // 【2026-08-14】节流批量刷新
      }
      role[key] = value;
      return true;
    },
    get: function (role, key) {
      return role[key];
    }
  });
  let skills = new Proxy({}, {
    set: function (skills, key, value) {
      skills[key] = value;
      return true;
    },
    get: function (skills, key) {
      return skills[key];
    }
  });
  let room = new Proxy({ str: "a-b", name1: "a", name2: "b", path: "a/b/c", items: [] }, {
    set: function (room, key, value) {
      room[key] = value;
      return true;
    },
    get: function (room, key) {
      return room[key];
    }
  });
  let exits = {};

  // 内容代理：写入时若存在 .remove_<key> 元素则先移除，避免重复堆叠
  let content = new Proxy({ task: "任务", lwsb: "领悟石壁" }, {
    set: function (content, key, value) {
      if ($(".remove_" + key)[0]) {
        $(".remove_" + key).remove();
      }
      content[key] = value;
      return true;
    },
    get: function (content, key) {
      return content[key];
    }
  });

  // 检查判断
  {
    if (!test) {
      // 非测试模式：屏蔽 console.log
      console.log = () => {
        return;
      };
    }
    if (navigator.userAgent) {
      // 判断设备是否为移动端
      let agent = navigator.userAgent.toLowerCase();
      if (/ipad|iphone|android|mobile/.test(agent)) {
        isMoblie = true;
      }
      console.log(agent);
    }
  }

  /********************监控********************/

  window.WG.add_hook(['roles','login'], function (data) {
    if (data.type === "roles") {
      data.roles.forEach(role => {
        let id = role.id;
        let name = role.name;
        roles[id] = name;
      });
    } else if (data.type === "login") {
      id = data.id;
      title.name = roles[id];
      title.state = "<已登录>";
      role.name = roles[id];
    }
  });
  window.WG.add_hook('room', function (data) {
    room.str = data.name.replace("(副本区域)", "");
    // 【2026-08-11 审查修复】match 可能返回 null（房间名不含 '-' 时），加保护
    let x = room.str.match(/(.*)-(.*)/) || ['', '', ''];
    room.name1 = x[1];
    room.name2 = x[2];
    room.path = data.path;
    room.desc = data.desc;
    if (room.desc.length > 20) {
      let desc0 = room.desc.replace(/<([^<]+)>/g, "");
      let desc1 = desc0.substr(0, 20);
      let desc2 = desc0.substr(20);
      data.desc = `${desc1}<span id="show"> <hic>»»»</hic></span><span id="more" style="display:none">${desc2}</span><span id="hide" style="display:none"> <hic>«««</hic></span>`;
    }
    $("#show").click(() => {
      $("#more").show();
      $("#show").hide();
      $("#hide").show();
    });
    $("#hide").click(() => {
      $("#more").hide();
      $("#show").show();
      $("#hide").hide();
    });
  });
  window.WG.add_hook('exits', function (data) {
    for (const key in exits) delete exits[key]; // 先清空
    for (const key in data.items) {
      exits[key] = data.items[key];
      exits[data.items[key]] = "go " + key;
    }
  });
  window.WG.add_hook(['items','itemadd','itemremove'], function (data) {
    if (data.type === "items") {
      room.items = [];
      data.items.forEach(item => {
        if (item === 0) {
        } else if (item.id && item.name && Object.entries(item).length === 2) {//只有id和name的是物品或者尸体
          if (!item.name.includes("尸体")) {
            SendCommand(`get ${item.id}`);//自动拾取不是尸体的物品
          }
        } else if (item.p !== 1) {//不是玩家的NPC保存起来
          room.items.push(item);
        }
      });
    }
    if (data.type === "itemadd" && data.p !== 1) {
      room.items.push(data);
    }
    if (data.type === "itemremove") {
      let index = room.items.findIndex(item => {
        return item.id === data.id;
      });
      if (index !== -1) room.items.splice(index, 1);//删除
    }
  });
  window.WG.add_hook(['state','combat'], function (data) {
    if (data.type === "state") {
      if (data.state) {
        title.state = `<${data.state.replace("你正在", "")}>`;
      } else {
        title.state = `<闲逛中>`;
      }
    } else if (data.type === "combat") {
      if (data.start === 1) {
        title.state = "<战斗中>";
      } else if (data.end === 1) {
        title.state = "<闲逛中>";
      }
    }
  });

  // 【2026-08-08 已删除】右侧活动提示-动态渲染（原 198~248 行）：监听 events 消息把活动列表画到右侧栏


  let pack = new Proxy({ items: [], moneyStr: "", }, {
    set: function (pack, key, value) {
      if (key === "moneyStr") $(".role_money").html(value);
      pack[key] = value;
      return true;
    },
    get: function (pack, key) {
      return pack[key];
    }
  });
  let follower = new Proxy({}, {
    set: function (follower, key, value) {
      follower[key] = value;
      return true;
    },
    get: function (follower, key) {
      return follower[key];
    }
  });

  window.WG.add_hook('dialog', function (data) {
    if (data.dialog == 'score') { // 属性
      for (const key in data) {
        if (key == 'name') {
          const n1 = data[key].startsWith('<') ? data[key].split('</')[0] : data[key];
          const n2 = n1.includes(' ') ? n1.split(' ').pop() : n1;
          role[key] = n2.includes('<') ? n2.split('<')[0] : n2;
          continue;
        }
        role[key] = data[key];
      }
    } else if (data.dialog == "skills") {
      if (data.items) { // 所有技能数据
        role.skill_limit = data.limit;
        role.pot = data.pot;
        role.skill_count = data.items.length;
        role.skills = data.items;
        data.items.forEach(skill => {
          let color = ["/", "wht", "hig", "hic", "hiy", "hiz", "hio", "ord"];
          for (let i = 1; i < color.length; i++) {
            if (skill.name.includes(color[i])) {
              skill.color = i;
              break;
            }
          }
          skills[skill.id] = skill;
        });
      } else if (data.item) { // 学会新技能
        let color = ["/", "wht", "hig", "hic", "hiy", "hiz", "hio", "ord"];
        for (let i = 1; i < color.length; i++) {
          if (data.item.name.includes(color[i])) {
            data.item.color = i; // 新学的技能也要添加上颜色
            break;
          }
        }
        skills[data.item.id] = data.item;
      } else if (data.enable) { // 装备上一个技能
        skills[data.id].enable_skill = data.enable;
      } else if (data.exp) { // 单个技能经验变动
        let skill = skills[data.id];
        if (!skill) return true; // 防错
        if (data.level) {
          skill.level = data.level;
        }
      }
    } else if (data.dialog == 'pack' && data.money) { // 背包
      let money = Money2Str(data.money);
      $(".role_money").html(money);
    } else if (data.dialog == 'relation') { // 随从信息
      data = window.WG.smartClone(data);
      data = window.WG.deserializePackData(data);
      // 清空 follower
      Object.keys(follower).forEach(key => delete follower[key]);

      var fls = data.fls;
      for (let i = 0; i < fls.length; i++) {
        let item = fls[i];
        if (!item) continue;

        let name = item[0].match(/^(?=.+?[\u4e00-\u9fa5])(?:(.+?)\s)?([\u4e00-\u9fa5]+)(?:\s?<hig>.*)?$/)?.[2];
        let id = item[1];
        let work = item[2] || "采药";

        follower[name] = {};
        follower[name].id = id;
        follower[name].work = work;
        // 检查是否达到数量上限 3 个
        if (Object.keys(follower).length >= 3) break;
      }
    } else {
      return;
    }
  });

  /*****内力计算*****/
  window.WG.add_hook('sc', function (data) {
    if (data.id === id) {
      role.hp = data.hp;
      role.mp = data.mp;
      role.max_hp = data.max_hp;
      role.max_mp = data.max_mp;
    }
  });

  /*****侠客岛领悟石壁辅助*****/
  window.WG.add_hook('text', function (data) {
    if (/石破天对你说到：你知道(.*)是什么意思吗？/.test(data.text)) {
      let xkx = [//侠客行诗句 救赵挥金槌
        ["赵客缦胡缨", "吴钩霜雪明", "银鞍照白马", "飒沓如流星"],
        ["十步杀一人", "千里不留行", "事了拂衣去", "深藏身与名"],
        ["闲过信陵饮", "脱剑膝前横", "将炙啖朱亥", "持觞劝侯嬴"],
        ["三杯吐然诺", "五岳倒为轻", "眼花耳热后", "意气素霓生"],
        ["救赵挥金槌", "邯郸先震惊", "千秋二壮士", "煊赫大梁城"],
        ["纵死侠骨香", "不惭世上英", "谁能书阁下", "白首太玄经"],
      ];
      let go = ["go east", "go south", "go west", "go north"];
      let x = data.text.match(/石破天对你说到：你知道(.*)是什么意思吗？/);
      for (let i = 0; i < xkx.length; i++) {
        for (let j = 0; j < xkx[i].length; j++) {
          if (xkx[i][j] === x[1]) {
            AddContent(`<hig>检测到诗句<hiw>${x[1]}</hiw>，苏轻将帮你寻找石室。\n</hig>`);
            SendCommand(["stopstate", "go enter", go[j], "lingwu bi"]);
            break;
          }
        }
      }
    }
    if (data.type === "skills" && title.state === "<领悟石壁>") {
      let skill = skills[data.id];
      if (!skill) return;
      let x = skill.name.match(/<wht>基本(.*)<\/wht>/);
      content.lwsb = "是" + x[1];
      if (data.level) {
        AddContent(`<hig>领悟石壁完成，苏轻将帮你寻找石破天。\n</hig>`);
        let go = exits["山洞"];
        let say = `say ${content.lwsb}`;
        SendCommand(["stopstate", go, "go out", say, "cr"]);
        setTimeout(() => Tips(), 1000);//提示音
      }
      AddContent(`由于领悟石壁，你的技能${skill.name}提升到了<hig>${data.exp}%</hig>！\n`);
      if (data.exp < 90) {
        $(".remove_exp_90").remove();
        AddContent(`<hir class="remove_exp_90">建议将技能熟练度练习到90%以上再继续领悟石壁！\n</hir>`);
      }
    }

  });


  /********************READY********************/
  $(document).ready(function () {
   GM_addStyle(`.content-bottom {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
      }`);
    // 【2026-08-08 UI优化B/D】快捷按钮样式升级：深色主题统一配色（边框/背景半透明、hover 淡青色高亮）
    // 用户反馈"单个按钮单独一行" → 缩小 padding/font 让 8 个按钮能在一行放下不换行
    // 【2026-08-11 26.1.11】按钮样式适配游戏本身：黑底 + 灰字 + 灰边框，hover 反转（同游戏 .panel_item）
    // 【2026-08-11 集中色板（参考 Dark Reader 主题管理）】配色统一用 CSS 变量，改 :root 一处 → 全局生效
    GM_addStyle(`
      :root {
        --ext-border: #666666;       /* 边框灰（游戏灰） */
        --ext-text: #999999;         /* 按钮/常规文字灰 */
        --ext-text-bright: #c0c0c0;  /* 亮白字（日志/数值） */
        --ext-hover: #00ff00;        /* hover 高亮绿（hig 高亮绿） */
        --ext-gold: #FFD700;         /* 金色品质（hij 高亮金：选中/运行/名字） */
        --ext-dim: #808080;          /* 次级灰（hik 高亮灰） */
      }
      .span-btn { border: 1px solid var(--ext-border); border-radius: 3px; display: inline-block; padding: 4px 6px; font-size: 12px !important; margin: 0 4px 4px 0; background: #000000; color: var(--ext-text); transition: color .15s ease, border-color .15s ease, background .15s ease; text-align: center; white-space: nowrap; }
      .span-btn { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; cursor: pointer; }
      .span-btn:hover { color: #000000; border-color: var(--ext-text); background: var(--ext-text); }
      .span-btn:active { background: var(--ext-border); color: #000000; }
      `);
    if (isMoblie) return;
    $(".signinfo").addClass("hide");
    $(".room_items")[0].style.maxHeight = "240px";
    $(".state-bar")[0].style.overflow = "hidden";
    $(".combat-commands")[0].style.overflow = "hidden";
    $(".dialog-content")[0].style.overflowX = "hidden";

    // 【2026-08-08 UI优化A】修复原版残缺 CSS：原规则用逗号连接（应为分号）且末尾悬空逗号，
    // 导致浏览器整段丢弃。已修正为完整合法规则；残缺的 .dialog-stats 悬空选择器按原意图补全。
    GM_addStyle(`
  .content-bottom { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; }
  .room-commands > .act-item { min-width: 1em; }
  .content-message { padding-right: 3.5em; }
  .dialog-stats > .top-item > .top-sc,
  .dialog-stats > .top-item > .top-title { display: inline-block; }
  `);

    /********************FN********************/
    let hideLeftRight = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("全部隐藏").click(() => {$(".left").hide();$(".right").hide()}),
        $(`<span class="span-btn"></span>`).append("全部显示").click(() => {$(".left").show();$(".right").show()}),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("隐藏左边栏").click(() => $(".left").hide()),
        $(`<span class="span-btn"></span>`).append("显示左边栏").click(() => $(".left").show()),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("隐藏右边栏").click(() => $(".right").hide()),
        $(`<span class="span-btn"></span>`).append("显示右边栏").click(() => $(".right").show()),
      ));
    };
    let clearRightMsg = function () {
       $(".content-message pre").html("")
      
    };
    const scpack = [
    "玄晶","红宝石", "绿宝石", "蓝宝石", "黄宝石",
    "鲤鱼", "草鱼", "鲢鱼", "鲮鱼", "鳊鱼", "鲂鱼", "黄金鳉", "黄颡鱼", "太湖银鱼", "虹鳟", "孔雀鱼", "反天刀",
    "银龙鱼", "黑龙鱼", "罗汉鱼", "巨骨舌鱼", "七星刀鱼", "帝王老虎魟",
    "当归", "芦荟", "山楂叶", "柴胡", "金银花", "石楠叶", "茯苓", "沉香", "熟地黄", "九香虫", "络石藤", "冬虫夏草",
    "人参", "何首乌", "凌霄花", "灵芝", "天仙藤", "盘龙参",]
    
    let takesc = function(sc,is_sell=0){
      var sid = sc.id
      var work = sc.work
      const workMap = {'挖矿': 'wk', '钓鱼': 'diao', '采药': 'cai'};
      const workAbbr = workMap[work]
      if (room.str !="住房-小花园"){
        SendCommand(['goto home','go northeast']);
      }
      SendCommand([`dc ${sid} stopstate`,`pack ${sid}`]);
      let pack2_hook = window.WG.add_hook('dialog',function(data){
        var command = []
        for (let i = 0; i < data.items.length; i++) {
          if (!scpack.some(item => data.items[i][0].includes(item))) { continue; }
          const pid = data.items[i][1];
          const pcount = data.items[i][2];
          command.push(is_sell ? `dc ${sid} sell ${pid}` : `dc ${sid} give ${role.id} ${pcount} ${pid}`);
          command.push(500);
        }
        command.push(`dc ${sid} ${workAbbr}`);
        command.push("$close");
        SendCommand(command);
        window.WG.remove_hook(pack2_hook);
      });
    }
    let dzsc = function () {
      let container = $("<div></div>");
      for (const name in follower) {
        if (follower.hasOwnProperty(name)) {
          let sc = follower[name];
          container.append(
            $(`<span class="span-btn"></span>`).append(`${name}：拿`).click(() => takesc(sc,0)),
            $(`<span class="span-btn"></span>`).append(`${name}：卖`).click(() => takesc(sc,1)),
            $(`<br>`)
          );
        }
      }
      AddContent(container);

    };
    let toSchoolHQ = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append(`<hic>${GameState.score.family}</hic>`).click(() => SendCommand("stopstate;$to 后勤;$wait 500;ask1 {r门派后勤管理员}")),
        $(`<span class="span-btn"></span>`).append("武当").click(() => SendCommand("stopstate;goto fam2 WUDANG")),
        $(`<span class="span-btn"></span>`).append("少林").click(() => SendCommand("stopstate;goto fam2 SHAOLIN")),
        $(`<span class="span-btn"></span>`).append("华山").click(() => SendCommand("stopstate;goto fam2 HUASHAN")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("峨眉").click(() => SendCommand("stopstate;goto fam2 EMEI")),
        $(`<span class="span-btn"></span>`).append("逍遥").click(() => SendCommand("stopstate;goto fam2 XIAOYAO")),
        $(`<span class="span-btn"></span>`).append("丐帮").click(() => SendCommand("stopstate;goto fam2 GAOBANG")),
        $(`<span class="span-btn"></span>`).append("杀手").click(() => SendCommand("stopstate;goto fam2 SHASHOU")),
        $(`<br>`),
      ));
    };
    let toSchoolMPZ = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("逍遥").click(() => SendCommand("stopstate;$to 门派橙-逍遥")),
        $(`<span class="span-btn"></span>`).append("华山").click(() => SendCommand("stopstate;$to 门派橙-华山")),
        $(`<span class="span-btn"></span>`).append("武当").click(() => SendCommand("stopstate;$to 门派橙-武当")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("峨眉").click(() => SendCommand("stopstate;$to 门派橙-峨眉")),
        $(`<span class="span-btn"></span>`).append("丐帮").click(() => SendCommand("stopstate;$to 门派橙-丐帮")),
        $(`<span class="span-btn"></span>`).append("少林").click(() => SendCommand("stopstate;$to 门派橙-少林")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("<hig>领取奖励").click(() => SendCommand("events WUDANG_settle")),
      ));
    };
    let toSchoolJD = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("蓬莱-观海台").click(() => SendCommand("stopstate;$to 蓬莱岛-观海台")),
        $(`<span class="span-btn"></span>`).append("蓬莱-石碑").click(() => SendCommand("stopstate;$to 蓬莱岛-石碑")),
        $(`<span class="span-btn"></span>`).append("蓬莱-姜卫").click(() => SendCommand("stopstate;$to 蓬莱岛-姜卫")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("药王谷-鉴宝阁").click(() => SendCommand("stopstate;$to 药王谷-鉴宝阁;$wait 500;list {r拍卖师}")),
        $(`<span class="span-btn"></span>`).append("药王谷-炼丹房").click(() => SendCommand("stopstate;$to 药王谷-炼丹房;lianyao")),
        $(`<span class="span-btn"></span>`).append("药王谷-藏书楼").click(() => SendCommand("stopstate;$to 药王谷-藏书楼")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("蜀山-祖师殿").click(() => SendCommand("stopstate;$to 蜀山-祖师殿")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("古大陆-守墓老人").click(() => SendCommand("stopstate;jh ar 9 start")),
        $(`<span class="span-btn"></span>`).append("古大陆-妖族营地(1)").click(() => SendCommand("stopstate;jh ar 9 start;go south;go down;go south;go south;go west")),
      ));
    };
    let toQiTa = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("提示音").click(() => Tips()),
        $(`<span class="span-btn"></span>`).append("攻略网站").click(() => window.open("https://ucn595zz2fou.feishu.cn/wiki/JvEZw8bEiiIpf3kQiFJcAwbanji", "_blank")),
      ));
    };
    let toHome = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("住房-小花园").click(() => SendCommand("stopstate;$to 住房-小花园")),
        $(`<span class="span-btn"></span>`).append("住房-练功房").click(() => SendCommand("stopstate;$to 住房-练功房")),
        $(`<br>`),
      ));
    };
    let toBangHui = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("帮派-大院").click(() => SendCommand("stopstate;goto bp")),
        $(`<span class="span-btn"></span>`).append("帮派-仓库").click(() => SendCommand("stopstate;goto bp;go east;go north")),
        $(`<span class="span-btn"></span>`).append("帮派-聚义堂").click(() => SendCommand("stopstate;goto bp;go east")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("帮派-练功房").click(() => SendCommand("stopstate;goto bp;go north")),
        $(`<span class="span-btn"></span>`).append("帮派-炼药房").click(() => SendCommand("stopstate;goto bp;go south;lianyao")),
        $(`<br>`),
      ));
    };

    /********************BODY********************/
    GM_addStyle(`
      body { width: 100%; display: flex; flex-flow: row nowrap; }
      .container, .login-content { width: 400px; flex: 1 0 auto; margin: 0; }
      .left, .right { height:100%; flex: 0 0 390px !important; margin: 0 5px; }
      .left-col-resizer { width: 6px; flex: 0 0 6px; cursor: col-resize; background: rgba(0,128,0,.14); border-radius: 3px; align-self: stretch; margin: 2px 0; order: -1; }
      .right-col-resizer { width: 6px; flex: 0 0 6px; cursor: col-resize; background: rgba(0,128,0,.14); border-radius: 3px; align-self: stretch; margin: 2px 0; order: 1; }
      .left-col-resizer:hover, .left-col-resizer.dragging, .right-col-resizer:hover, .right-col-resizer.dragging { background: rgba(0,128,0,.4); }
      `);
      
    $("body").append(
      $(`<div class="left"></div>`),
      $(`<div class="right"></div>`),
    );
    // 继承 container 的字体设置
    try {
      var _cFont = $(".container").css("font-family");
      var _cSize = $(".container").css("font-size");
      if (_cFont) $(".left, .right").css("font-family", _cFont);
      if (_cSize) $(".left, .right").css("font-size", _cSize);
      // 监听 container 字体变化（用户改设置时同步更新）
      var _cEl = document.querySelector(".container");
      if (_cEl) {
        new MutationObserver(function() {
          var _f = $(".container").css("font-family");
          var _s = $(".container").css("font-size");
          if (_f) $(".left, .right").css("font-family", _f);
          if (_s) $(".left, .right").css("font-size", _s);
        }).observe(_cEl, { attributes: true, attributeFilter: ["style"] });
      }
    } catch (e) {}
    function confirmWidth() {
      const d = document.querySelector('.dialog-confirm');
      const l = document.querySelector('.left') || { offsetWidth: 0 };
      const r = document.querySelector('.right') || { offsetWidth: 0 };

      if (!d) return;

      const total = l.offsetWidth + r.offsetWidth;
      const width = window.innerWidth - total;
      // 调整对话框宽度
      d.style.width = width + 'px';
      d.style.left = l.offsetWidth + 'px';
      d.style.right = r.offsetWidth + 'px';
    }
    (function moveAndStyleToolbar() {
      const getElement = (selector) => document.querySelector(selector);
        const moveElementIfNeeded = (sourceSelector, targetSelector) => {
        const sourceElement = getElement(sourceSelector);
        const targetContainer = getElement(targetSelector);

        // 检查源元素和目标容器是否都存在，并且源元素不在目标容器内
        if (sourceElement && targetContainer && !targetContainer.contains(sourceElement)) {
          targetContainer.appendChild(sourceElement);
        }
      };

      // 移动并应用样式的主逻辑
        function attemptMove() {
        // 定义一个任务列表，描述所有需要执行的移动操作
        const moveTasks = [
          {
            source: '#raidToolbar',
            target: 'body > div.left > div.left-console',
          },
          {
            source: '.WG_log',
            target: 'body > div.left > div.left-console',
          },
          {
            source: '.WG_log_log',
            target: 'body > div.right',
          },
          {
            source: '.channel',
            target: 'body > div.right > div.right-channel',
          }
        ];

        // 遍历任务列表，对每个任务执行移动操作
        moveTasks.forEach(task => {
          moveElementIfNeeded(task.source, task.target);
        });
      }

      // 初次尝试（可能元素已存在）
      attemptMove();

      // 使用 MutationObserver 监听 DOM 变化，等待元素出现
      const observer = new MutationObserver(() => {
        attemptMove();
      });

      // 开始观察整个 body 的子树变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });

      // 暴露 observer 便于手动关闭（可选）
      window.__toolbarObserver__ = observer;
    })();
    confirmWidth();
    // 监听窗口大小变化
    window.addEventListener('resize', function() {
    confirmWidth();
    });

    /********************RIGHT********************/
    {
      // 【2026-08-08 UI优化C】频道/日志之间加可拖拽分隔条（.right-resizer），比例可调并记忆
      GM_addStyle(`
      .right{ order: 1; display: flex; flex-direction: column; flex-wrap: nowrap; }
      /* 【2026-08-11 26.1.10】频道区改纵向 flex：消息在上、tab 行固定底部（不再弹中间聊天界面） */
      .right-channel { width: 100%; flex: 0 0 60%; margin-top: 10px; display: flex; flex-direction: column; overflow: hidden; }
      .right-resizer { height: 6px; flex: 0 0 6px; cursor: row-resize; background: rgba(0,128,0,.14); border-radius: 3px; margin: 2px 0; }
      .right-resizer:hover, .right-resizer.dragging { background: rgba(0,128,0,.4); }
      .channel { max-height: 90% !important; flex: 1; overflow: auto; font-size: 1em !important;}
      /* 【2026-08-11 26.1.10】频道 tab 行：固定于聊天消息区下方，等宽墨绿描边，选中高亮 */
      .right-channel .channel { flex: 1; min-height: 0; max-height: none !important; font-size: 1em !important; }
      .channel pre { font-size: inherit !important; }
      .channel-tabs { flex: 0 0 auto; display: flex; gap: 3px; padding: 4px 2px 2px; border-top: 1px solid rgba(0,128,0,.16); }
      .channel-tab { flex: 1 1 0; min-width: 0; text-align: center; font-size: 0.9em; color: var(--ext-text); border: 1px solid var(--ext-border); border-radius: 3px; padding: 2px 0; cursor: pointer; user-select: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #000000; }
      .channel-tab:hover { color: var(--ext-hover); border-color: rgba(0,255,0,.6); }
      /* 【2026-08-11 26.1.11】频道选中 → 金色品质（hij 高亮金） */
      .channel-tab.select { color: var(--ext-gold); border-color: var(--ext-gold); background: rgba(255,215,0,.1); }
      `
      );
      // 【2026-08-11 性能】缓存自建元素引用（.right-channel/.right-resizer 不会被游戏替换，跨 tick 复用避免重复 DOM 查询）
      var _extChannel = null, _extResizer = null;
      _extChannel = $(`<div class="right-channel"></div>`);
      _extResizer = $(`<div class="right-resizer" title="拖动调整频道/日志高度"></div>`);
      $(".right").append(_extChannel, _extResizer);
      // 【2026-08-11 26.1.11】未登录时隐藏聊天区（.right-channel 空框突兀），登录后由下方监控显示
      if (!(typeof GameState !== 'undefined' && GameState.id)) _extChannel.hide();
      // 【2026-08-11 26.1.10】频道 tab 行：全部/世界/队伍/门派/全区/帮派/系统，点击切换频道显示（复用 Dialog.channel.footerChanged 过滤逻辑）
      // 【2026-08-11 26.1.10】持续监控（200ms，参考作者 8d70d93 实现）：
      //   - .channel 不在 .right-channel 内就移回（防 Dialog.channel.hide 等把它挪走）
      //   - 持续 off('click')（防 Process.init 重新绑定"双击弹聊天界面"）
      //   - 登录后（GameState.id）才显示 tab 栏
      (function () {
        var CHANNEL_TABS = [['全部', ''], ['世界', 'chat'], ['队伍', 'tm'], ['门派', 'fam'], ['全区', 'es'], ['帮派', 'pty'], ['系统', 'sys']];
        var _tabBar = null;
        function ensureTabBar($rightChannel) {
          var $rightChannel = $rightChannel || _extChannel;
          if (!$rightChannel.length) return null;
          if (!_tabBar) {
            _tabBar = $('<div class="channel-tabs" style="display:none;"></div>');
            CHANNEL_TABS.forEach(function (t, i) {
              var el = $('<span class="channel-tab' + (i === 0 ? ' select' : '') + '" data-ch="' + t[1] + '"></span>').text(t[0]);
              el.on('click', function () {
                _tabBar.find('.channel-tab').removeClass('select');
                el.addClass('select');
                var ch = t[1];
                // 【2026-08-11 修复】Dialog/Process 是 const 全局词法变量，不挂 window → 必须用 typeof 直接访问（作者版写法）
                if (typeof Dialog !== 'undefined' && Dialog.channel && Dialog.channel.footerChanged) {
                  Dialog.channel.footerChanged(ch);
                }
                // 【2026-08-11 兜底重绘】原版 footerChanged 在某些情况（datas 暂空、容器临时脱 DOM）会清空后没 push；
                // 100ms 后若 .channel 仍空且 datas 有数据，手动强制重绘（不依赖 footerChanged 内部状态）
                setTimeout(function () {
                  try {
                    var chEl = document.querySelector('.right-channel .channel');
                    var empty = chEl && chEl.querySelectorAll('pre').length === 0;
                    var hasData = typeof Dialog !== 'undefined' && Dialog.channel && Dialog.channel.datas && Dialog.channel.datas.length > 0;
                    if (empty && hasData) {
                      Dialog.channel.select_item = ch;
                      var pc = (typeof Process !== 'undefined') && Process.channel;
                      if (pc && pc.clear) {
                        pc.clear();
                        for (var i = 0; i < Dialog.channel.datas.length; i++) {
                          var d = Dialog.channel.datas[i];
                          if (!ch || d[0] === ch) pc.push(d[1]);
                        }
                        if (pc.scroll2end) pc.scroll2end();
                      }
                    }
                  } catch (e2) { ExtLog.error('[频道] 兜底重绘失败:', e2); }
                }, 100);
              });
              _tabBar.append(el);
            });
          }
          if (_tabBar.parent().length === 0) $rightChannel.append(_tabBar);
          return _tabBar;
        }
        (function guardian() {
          // 【2026-08-22 后台省电】自调度动态间隔：后台挂机 3000ms，前台 500ms。
          // 纯 UI 兜底（防重绑/防移走），降频不影响任何逻辑。
          setTimeout(guardian, (window._extLowPower && _extLowPower()) ? 3000 : 500);
          // 【2026-08-20】确保列resizer在正确的DOM位置（游戏更新可能替换.container导致顺序错乱）
          var _l = document.querySelector('.left'), _lr = document.querySelector('.left-col-resizer');
          if (_l && _lr && _lr.previousElementSibling !== _l) {
            _l.parentNode.insertBefore(_lr, _l.nextSibling);
          }
          var _r = document.querySelector('.right'), _rr = document.querySelector('.right-col-resizer'), _c = document.querySelector('.container');
          if (_rr && _c && _r) {
            // 始终确保 _rr 在 _c 之后、_r 之前
            _c.parentNode.insertBefore(_rr, _c.nextSibling);
            _r.parentNode.insertBefore(_rr, _r);
          }
          var $channel = $('.channel');   // 游戏元素不缓存（会被重绘替换）
          var $rightChannel = _extChannel;
          if (!$channel.length || !$rightChannel.length) return;
          // 1. channel 必须待在 right-channel 内
          if (!$channel.parent().hasClass('right-channel')) {
            $channel.appendTo($rightChannel);
          }
          // 2. 持续解除双击弹窗（游戏可能重新绑定），但保留 ContainerCommand（频道消息点击命令，ws.js 1319 绑定）
          try {
            if (window.ContainerCommand) {
              $channel.off('click').on('click', window.ContainerCommand);
            } else {
              $channel.off('click');
            }
          } catch (e) { }
          // 3. 登录后才显示 tab 栏 / 分隔条 / 聊天区（未登录隐藏，避免空框突兀）
          var loggedIn = typeof GameState !== 'undefined' && GameState.id;
          if (loggedIn) {
            var bar = ensureTabBar($rightChannel);
            if (bar) bar.show();
            if (_extResizer.length && !_extResizer.is(':visible')) _extResizer.show();
            if (_extChannel.length && !_extChannel.is(':visible')) _extChannel.show();
          } else {
            if (_tabBar) _tabBar.hide();
            if (_extResizer.length && _extResizer.is(':visible')) _extResizer.hide();
            if (_extChannel.length && _extChannel.is(':visible')) _extChannel.hide();
          }
        })();   // 【2026-08-11 性能】200ms→500ms：防重绑/防移走无需毫秒级；【2026-08-22 后台省电】改为自调度动态间隔
      })();
      // 拖拽逻辑：按下分隔条 → 移动时改频道高度（占整体百分比）→ 松开保存到 localStorage
      (function () {
        var $resizer = _extResizer;
        var $channel = _extChannel;
        var saved = GM_getValue("funny2_right_channel_pct", null);
        if (saved != null && saved >= 20 && saved <= 80) {
          $channel.css("flex-basis", saved + "%");
        }
        // 【2026-08-11 26.1.11】未登录不显示分隔条（避免未进游戏时右侧悬空一条杠），登录后由下方监控显示
        var loggedInNow = typeof GameState !== 'undefined' && GameState.id;
        if (!loggedInNow) $resizer.hide();
        $resizer.on("mousedown", function (e) {
          e.preventDefault();
          $resizer.addClass("dragging");
          var startY = e.clientY;
          var startPct = parseFloat($channel.css("flex-basis")) || 60;
          var total = $(".right").height();
          $(document).on("mousemove.rightResize", function (ev) {
            if (!total) return;
            var pct = startPct + (ev.clientY - startY) / total * 100;
            pct = Math.max(20, Math.min(80, pct));
            $channel.css("flex-basis", pct + "%");
          });
          $(document).on("mouseup.rightResize", function () {
            $resizer.removeClass("dragging");
            $(document).off("mousemove.rightResize mouseup.rightResize");
            var pct = parseFloat($channel.css("flex-basis")) || 60;
            GM_setValue("funny2_right_channel_pct", pct);
          });
        });
      })();
    }
    /********************COLUMN RESIZERS********************/
    // 【2026-08-20】左右列宽度可拖拽调整（水平分隔条），记忆宽度到 localStorage
    (function () {
      var _leftResizer = $('<div class="left-col-resizer" title="拖动调整左侧栏宽度"></div>');
      var _rightColResizer = $('<div class="right-col-resizer" title="拖动调整右侧栏宽度"></div>');
      $(".left").after(_leftResizer);
      $(".right").before(_rightColResizer);
      // 恢复保存的宽度（!important 覆盖 CSS 默认值）
      var savedLeft = GM_getValue("funny2_left_width", null);
      var savedRight = GM_getValue("funny2_right_width", null);
      if (savedLeft != null && savedLeft >= 200 && savedLeft <= 600) {
        document.querySelector(".left").style.setProperty("flex-basis", savedLeft + "px", "important");
      }
      if (savedRight != null && savedRight >= 200 && savedRight <= 600) {
        document.querySelector(".right").style.setProperty("flex-basis", savedRight + "px", "important");
      }
      // 左列拖拽
      _leftResizer.on("mousedown", function (e) {
        e.preventDefault();
        _leftResizer.addClass("dragging");
        var startX = e.clientX;
        var $left = $(".left");
        var leftEl = $left[0];
        var startWidth = $left.outerWidth();
        $(document).on("mousemove.leftColResize", function (ev) {
          var delta = (ev.clientX - startX) * (_lrSwapped ? -1 : 1);
          var w = startWidth + delta;
          w = Math.max(200, Math.min(600, w));
          leftEl.style.setProperty("flex-basis", w + "px", "important");
          confirmWidth();
        });
        $(document).on("mouseup.leftColResize", function () {
          _leftResizer.removeClass("dragging");
          $(document).off("mousemove.leftColResize mouseup.leftColResize");
          GM_setValue("funny2_left_width", $left.outerWidth());
        });
      });
      // 右列拖拽
      _rightColResizer.on("mousedown", function (e) {
        e.preventDefault();
        _rightColResizer.addClass("dragging");
        var startX = e.clientX;
        var $right = $(".right");
        var rightEl = $right[0];
        var startWidth = $right.outerWidth();
        $(document).on("mousemove.rightColResize", function (ev) {
          var delta = (ev.clientX - startX) * (_lrSwapped ? -1 : 1);
          var w = startWidth - delta;
          w = Math.max(200, Math.min(600, w));
          rightEl.style.setProperty("flex-basis", w + "px", "important");
          confirmWidth();
        });
        $(document).on("mouseup.rightColResize", function () {
          _rightColResizer.removeClass("dragging");
          $(document).off("mousemove.rightColResize mouseup.rightColResize");
          GM_setValue("funny2_right_width", $right.outerWidth());
        });
      });
    })();
    /********************LEFT********************/
    // 【2026-08-08 UI优化C】快捷按钮区高度自适应（原固定120px会裁切换行按钮）；
    // left-console 边距统一用 padding（原 margin 与滚动条/工具栏混排不齐）
    GM_addStyle(`
      .left { height: 100%; order: -1; display: flex; flex-direction: column; flex-wrap: nowrap; }
      .left-content { width: 100%; height: auto; flex: 0 0 auto;}
      /* 【2026-08-10 优化】left-hotkeys 固定 4 行 × 6 列 + 快捷键区域 */
      .left-hotkeys { width: 100%; height: auto; flex: 0 0 auto; padding: 5px; box-sizing: border-box; display: flex; flex-direction: column; font-size: 0.9em; }
      .left-hotkeys > div { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-bottom: 4px; }
      .left-hotkeys > div > .span-btn { margin: 0; min-width: 0; font-size: inherit !important; }
      .room_exits { display: flex; justify-content: center; text-indent: 0 !important; }
      .room_exits svg { margin-left: 0; }
      .left-console { width: 100%; flex: 1 1 auto; overflow: auto; padding: 0 8px 8px 8px; box-sizing: border-box; display: flex; flex-direction: column; }
      .WG_log { width: 100%;height: 100%; flex: 1; overflow: auto; max-height: none !important; }
      /* 【2026-08-11 26.1.10】WG_log_log 直接作为 .right 子元素（去 right-console 嵌套）：自身承担描边框/圆角/padding */
      .WG_log_log { width: 100%; flex: 1; overflow: hidden; max-height: none !important; display: flex; flex-direction: column; box-sizing: border-box; background: transparent; border: 1px solid rgba(0,128,0,.16); border-radius: 10px; padding: 6px 8px; font-family: inherit; }
      .WG_log_log_title { color: #ffffff; font-size: 0.9em; font-weight: bold; padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.25); flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
      /* 【2026-08-11 26.1.10】「日志」标题占左侧，清除日志/重置统计按钮靠右 */
      .WG_log_log_title > span:first-child { margin-right: auto; }
      /* 【2026-08-11 26.1.11】日志标题栏按钮：适配游戏按钮风格（黑底灰字灰边，hover 反转） */
      .WG_log_log_title .wlg-btn { font-size: inherit; font-weight: normal; color: var(--ext-text); border: 1px solid var(--ext-border); border-radius: 3px; padding: 1px 6px; cursor: pointer; user-select: none; background: #000000; }
      .WG_log_log_title .wlg-btn:hover { color: #000000; background: var(--ext-text); border-color: var(--ext-text); }
      /* 【2026-08-11 26.1.10】左侧控制台（Raid 工具栏 + 日志）统一墨绿描边风格：去黑底灰边，按钮改描边+墨绿文字 */
      /* Raid 工具栏强制一行：flex nowrap + 按钮宽度自适应内容（等宽平分会截断3字按钮），字号/内边距压缩保证 7 个按钮一行放得下，
         窗口过窄时容器横向滚动（内容永远完整不截断） */
      .raidToolbar { display: flex; flex-wrap: nowrap; align-items: center; overflow-x: auto; }
      /* 【2026-08-11 26.1.11】raid-item 适配游戏按钮风格：黑底灰字灰边，hover 反转 */
      #raidToolbar .raid-item { border: 1px solid var(--ext-border); color: var(--ext-text); background: #000000; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.9em; margin: 2px 3px 2px 0; padding: 0 6px; flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: visible; text-overflow: clip; }
      #raidToolbar .raid-item:hover { color: #000000; border-color: var(--ext-text); background: var(--ext-text); }
      #raidToolbar .raid-item:hover hiy,
      #raidToolbar .raid-item:hover hiz,
      #raidToolbar .raid-item:hover hio,
      #raidToolbar .raid-item:hover hig,
      #raidToolbar .raid-item:hover hic,
      #raidToolbar .raid-item:hover hir,
      #raidToolbar .raid-item:hover hip { color: #000000; }
      /* 【2026-08-11 26.1.11】「流程」按钮运行中状态 → 金色品质（hij 高亮金，重要状态醒目） */
      #raidToolbar .raid-item.raid-running { border-color: var(--ext-gold); color: var(--ext-gold); }
      #raidToolbar .raid-item.raid-running hiy,
      #raidToolbar .raid-item.raid-running hiz,
      #raidToolbar .raid-item.raid-running hio,
      #raidToolbar .raid-item.raid-running hig,
      #raidToolbar .raid-item.raid-running hic,
      #raidToolbar .raid-item.raid-running hir,
      #raidToolbar .raid-item.raid-running hip { color: var(--ext-gold); }
      #raidToolbar .raid-item.hideRaidToolbar { flex: 0 0 14px; padding: 0; }
      #raidToolbar .raid-item hiy { color: #FFFF00; }  /* 黄色-快捷 */
      #raidToolbar .raid-item hiz { color: #0000FF; }  /* 蓝色-功能 */
      #raidToolbar .raid-item hio { color: #FF8000; }  /* 橙色-触发 */
      #raidToolbar .raid-item hig { color: #00FF00; }  /* 绿色-流程 */
      #raidToolbar .raid-item hic { color: #00FFFF; }  /* 青色-副本 */
      #raidToolbar .raid-item hir { color: #FF0000; }  /* 红色-命令 */
      #raidToolbar .raid-item hip { color: #FF00FF; }  /* 紫色-自命令 */
      /* 【2026-08-11 26.1.10】字体继承游戏页面（游戏 pre 均为 inherit，微软雅黑体系），不再硬编码 JetBrains Mono */
      .left-console .WG_log pre { font-family: inherit !important; font-size: inherit; color: var(--ext-text-bright); line-height: 1.65; }
      .WG_log_log > pre { flex: 1; overflow-y: auto; font-family: inherit !important; font-size: inherit; }
      /* 【2026-08-11 26.1.10】技能CD浮层（方案B）：技能行右上角显示剩余秒数，不改变技能行内容/行高 */
      .pfm-item { position: relative; }
      .skill-cd-float { position: absolute; right: 2px; top: 1px; font-size: 10px; line-height: 1; color: #b85450; background: rgba(16,19,16,.65); border-radius: 2px; padding: 0 2px; pointer-events: none; z-index: 5; }
      `);
    $(".left").append(
      $(`<div class="left-content"></div>`),
      $(`<div class="left-hotkeys"></div>`),
      $(`<div class="left-console"></div>`),
    );
    {
      $(".left-hotkeys").append(
        // 4 行 × 6 列
        mkRow(
          mkBtn("属性", clickInfo),
          mkBtn("统计", () => SendCommand("info")),
          mkBtn("拓展", openExtend),
          mkBtn("换组", checkEq),
          mkBtn("回复", () => ToRaid.perform("@renew")),
          mkBtn("挂机", () => WG.zdwk()),
        ),
        mkRow(
          mkBtn("当铺", () => SendCommand("stopstate;$to 扬州城-当铺;$wait 200;list {r唐楠}")),
          mkBtn("衙门", () => SendCommand("stopstate;$to 扬州城-衙门正厅")),
          mkBtn("赌场", () => SendCommand("stopstate;$to 扬州城-赌场;$wait 200;ask3 {r易直非}")),
          mkBtn("仓库", () => SendCommand("stopstate;store")),
          mkBtn("回家", toHome),
          mkBtn("帮派", toBangHui),
        ),
        mkRow(
          mkBtn("随从", dzsc),
          mkBtn("师父", () => SendCommand("stopstate;goto fam1")),
          mkBtn("木人", () => SendCommand("stopstate;$to 少林派-西侧殿")),
          mkBtn("后勤", toSchoolHQ),
          mkBtn("门战", toSchoolMPZ),
          mkBtn("禁地", toSchoolJD),
        ),
        mkRow(
          mkBtn("隐藏", hideLeftRight),
          mkBtn("清屏", clearRightMsg),
          mkBtn("工具", () => openExtensionHtml()),
          mkBtn("攻略", () => window.open("https://ucn595zz2fou.feishu.cn/wiki/JvEZw8bEiiIpf3kQiFJcAwbanji", "_blank")),
          mkBtn("切换", toggleLeftRight),
          mkBtn("武道", () => SendCommand("stopstate;jh fam 9 start;go enter")),
        ),
      );
    };
    // 【2026-08-11 26.1.10】左右侧栏对调：.left/.right 的 flex order 互换（容器是 flex，DOM 顺序不变，靠 order 排序），再点恢复
    var _lrSwapped = false;
    function toggleLeftRight() {
      _lrSwapped = !_lrSwapped;
      try {
        $('.left').css('order', _lrSwapped ? '2' : '-2');
        $('.left-col-resizer').css('order', _lrSwapped ? '1' : '-1');
        $('.right-col-resizer').css('order', _lrSwapped ? '-1' : '1');
        $('.right').css('order', _lrSwapped ? '-2' : '2');
      } catch (e) { }
    }

    /********************LEFT-CONTENT********************/
    {
      // 【2026-08-08 UI优化A/B】修复 dispaly→display 拼写错误（3处），
      // 并统一深色主题：边框用半透明白、背景半透明、数值用等宽字体对齐
      GM_addStyle(`
      /* 【2026-08-11 26.1.10】left-content 整体压缩：margin/内边距/行高收紧，略微缩小高度 */
      .left-content { margin: 6px 0; font-size: 14px !important; overflow: auto; }
      .left-content { display: flex; flex-direction: column; flex-wrap: nowrap; }
      /* 【2026-08-11 26.1.10】content-title 改两行两列：左列 门派·身份(行1) + uid(行2)，右列 名字 跨两行（grid 定位） */
      .content-title { flex: 0 0 auto; border: 1px solid rgba(0,128,0,.12); border-radius: 6px; display: grid; grid-template-columns: minmax(0,1fr) auto; grid-template-rows: auto auto; gap: 2px 8px; align-items: center; background: transparent; padding: 4px 8px; }
      .content-title .role-family { grid-column: 1; grid-row: 1; display: flex; align-items: baseline; }
      .content-title .role-name { grid-column: 2; grid-row: 1 / span 2; justify-self: end; white-space: nowrap; }
      .content-title .role-id { grid-column: 1; grid-row: 2; }
      .content-title .role_family, .content-title .role_level { font-size: 12px; color: var(--ext-dim); }
      .content-title .role_name { font-size: 14px; color: var(--ext-gold); font-weight: 600; }
      .content-title .role_id { font-size: 11px; color: var(--ext-border); }
      .content-info { flex: 1 1 auto; border: 1px solid rgba(0,128,0,.12); border-radius: 6px; margin-top: 4px; overflow: auto; background: transparent; padding: 2px 4px; }
      /* 【2026-08-10】info-row 改 grid 严格两列对齐（标签52px固定 + 数值占1fr）；【2026-08-11】行高收紧 */
      .info-row { display: grid; grid-template-columns: 52px 1fr 52px 1fr; align-items: center; gap: 2px 10px; padding: 2px 4px; border-bottom: 1px solid rgba(0,128,0,.07); }
      .info-row:last-child { border-bottom: none; }
      .info-item { font-family: inherit; font-size: 13px; color: var(--ext-text-bright); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      /* 【2026-08-11 26.1.10】气血/内力/财产数值可能很长（几千万/上亿），允许换行完整显示，不再省略号截断；
         且这三行只有 标签+数值 两个格子，grid 4 列布局下数值只占第2列，右侧留空 → 数值格跨到最后一列占满整行 */
      .info-row:has(.role_hp) .info-item, .info-row:has(.role_mp) .info-item, .info-row:has(.role_money) .info-item { white-space: normal; overflow: visible; text-overflow: clip; word-break: break-all; grid-column: 2 / -1; }
      .info-title { font-size: 13px; color: var(--ext-dim); text-align: left; }
      /* 【2026-08-10】数值指示色降饱和（去霓虹感）：气血暗红/内力暗青/财产暗金，融入深底色不撞色 */
      .role_hp { color: #b85450; }
      .role_mp { color: #6a9aa8; }
      .role_money { color: #b5a070; }

      .item-row { display: flex; border-bottom: 1px dotted rgba(255,255,255,0.25); }
      .item-name { cursor: pointer; }
      .item-count { display: inline-block; text-align: right; flex: 1 0 auto; }
      `);
      $(".left-content").append(
        $(`<div class="content-title"></div>`),
        $(`<div class="content-info"></div>`),
      );
      $(".content-info").show();
      /* 【2026-08-10】顶部信息分段（门派·身份一行、名字单独一行、UID 一行小灰） */
      $(".content-title").append(
        $(`<div class="role-family"></div>`).append(
          $(`<span class="role_family">门派</span>`),
          $(`<span> · </span>`),
          $(`<span class="role_level">身份</span>`),
        ),
        $(`<div class="role-name"><span class="role_name">名字</span></div>`),
        $(`<div class="role-id"><span class="role_id">uid</span></div>`),
      );
    };
    {
      /* 【2026-08-10】重写 content-info 排版：grid 严格对齐，去掉 hiy/hig/hic 花色标签，保留 role_xxx class 让 Proxy 仍能更新 */
      /* 【2026-08-11 26.1.11】改用 mkT/mkI/mkInfoRow 构建，消除重复拼接 */
      $(".content-info").append(
        mkInfoRow(mkT("经验"), mkI("0", "role_exp"), mkT("潜能"), mkI("0", "role_pot")),
        mkInfoRow(mkT("气血"), mkI('<span class="role_hp">0</span> / <span class="role_max_hp">0</span>')),
        mkInfoRow(mkT("内力"), mkI('<span class="role_mp">0</span> / <span class="role_max_mp">0</span>')),
        mkInfoRow(mkT("臂力"), mkI('<span class="role_str">0</span>+<span class="role_str_add">0</span>'), mkT("根骨"), mkI('<span class="role_con">0</span>+<span class="role_con_add">0</span>')),
        mkInfoRow(mkT("身法"), mkI('<span class="role_dex">0</span>+<span class="role_dex_add">0</span>'), mkT("悟性"), mkI('<span class="role_int">0</span>+<span class="role_int_add">0</span>')),
        mkInfoRow(mkT("攻击"), mkI("0", "role_gj"), mkT("命中"), mkI("0", "role_mz")),
        mkInfoRow(mkT("防御"), mkI("0", "role_fy"), mkT("招架"), mkI("0", "role_zj")),
        mkInfoRow(mkT("躲闪"), mkI("0", "role_ds"), mkT("攻速"), mkI("0", "role_gjsd")),
        mkInfoRow(mkT("财产"), mkI("0", "role_money")),
      );
    };
    // 【2026-08-08 已删除】右侧活动提示-静态卡片与样式（原 776~866 行）：写死的"挖矿指南"提示框 + 活动栏 CSS
    
    function checkEq() {
      SendCommand(["pack", "cha"]);
      const eqgroup = localStorage.getItem(id + "_eqgroup");
      const skgroup = localStorage.getItem(id + "_skgroup");
      AddContent(
        $(`<div></div>`).append(
          $(`<span class="span-btn" eq="0"></span>`).append("组一").click(loadEq),
          $(`<span class="span-btn" eq="1"></span>`).append("组二").click(loadEq),
          $(`<span class="span-btn" eq="2"></span>`).append("组三").click(loadEq),
          $(`<br>`),
          $(`<span class="span-btn" eq="0"></span>`).append("查看组一").click(check),
          $(`<span class="span-btn" eq="1"></span>`).append("查看组二").click(check),
          $(`<span class="span-btn" eq="2"></span>`).append("查看组三").click(check),
          $(`<br>`),
          $(`<hiy>如无反应，请设置为对应组后重新点击\n</hiy>`),
        )
      );

      // 注意：loadEq / check 在 AddContent 调用中使用，依赖函数声明提升
      function loadEq() {
        let index = $(this).attr("eq");
        let name = ["技能装备组一", "技能装备组二", "技能装备组三"];
        SendCommand([`eqgroup ${index}`, `skgroup ${index}`]);
        AddContent(`<hir>已一键更换<hiw>${name[index]}</hiw>！</hir>\n`);
      }

      function check() {
        let index = $(this).attr("eq");
        let name = ["组一", "组二", "组三"];
        let str = `<hir>${name[index]}</hir><hiw>配置为：</hiw>\n`;
        str += "<hiw>------技能组------</hiw>\n";
        let base_s = JSON.parse(skgroup)[index];
        const key_s = Object.keys(base_s);
        if (key_s.length == 0) {
          str += "技能组为空，请设置后通过组查获取" + "\n";
        } else {
          key_s.forEach(key => {
            if (base_s[key] == null || base_s[key].name == null) return;
            str += base_s[key].name + "\n";
          });
        }

        str += "<hiw>--------背包组--------</hiw>\n";
        let base_e = JSON.parse(eqgroup)[index];
        if (base_e.length == 0) {
          str += "装备组为空，请设置后通过组查获取" + "\n";
        } else {
          base_e.forEach(eq => {
            if (eq == null) return;
            str += eq.name + "\n";
          });
        }
        AddContent(str);
      }
    }

    function openExtend() {
      $("span[command=setting]").click();
      $('span.footer-item[for="extend"]').click();
    }
    /****************************************/

    function clickInfo() {
      $(".content-info").show();
      SendCommand(["score2", "score"]);
      setTimeout(() => $(".dialog-close").click(), 500);
      AddContent(`<hic>属性数据已刷新！\n</hic>`);
    }

    function clickPack() {
      $("span[command=pack]").click();
      SendCommand("pack");
      AddContent(`<hic>背包数据已刷新！\n</hic>`);
    }
  });
  function AddContent1(content) {
    unsafeWindow.AddMsg(content);
  }

  /********************全局可用的方法********************/

  // 将字符串解析为对象：以 { 开头视为 JSON 对象，否则包装为 {type:"text", text:str}
  function Str2Obj(str) {
    if (str[0] === "{") {
      try { return JSON.parse(str); } catch (e) { return { "type": "text", "text": str }; }
    } else {
      return { "type": "text", "text": str };
    }
  }

  // 当前时间字符串（HH:MM）
  function Time2Str() {
    let date = new Date();
    let str = date.toString().substr(16, 5);
    return str;
  }

  // 金额数字转中文描述：黄金/白银/铜板
  function Money2Str(number) {
    if (number == 0 || isNaN(number)) return 0;
    let str = "" + number;
    let c = str.substring(str.length - 2, str.length);
    if (c && c !== "00") {
      c = parseInt(c) + "个<yel>铜板</yel>";
    } else {
      c = "";
    }
    let b = str.substring(str.length - 4, str.length - 2);
    if (b && b !== "00") {
      b = parseInt(b) + "两<wht>白银</wht>";
    } else {
      b = "";
    }
    let a = str.substring(0, str.length - 4);
    if (a) a = a + "两<hiy>黄金</hiy>";
    return a + b + c;
  }

  // 自动滚动到底部：仅在内容超出可视区时触发
  function AutoScroll(selector) {
    const container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!container) {
      console.warn(`[AutoScroll] 找不到元素: ${selector}`);
      return;
    }

    // 确保内容超过可视区才滚动
    if (container.scrollHeight > container.clientHeight) {
      try {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      } catch (e) {
        container.scrollTop = container.scrollHeight; // 兜底
      }
    }
  }

  // 深拷贝（支持普通对象和数组，不处理循环引用）
  function DeepCopy(object) {
    if (Array.isArray(object)) return object.map(item => (typeof item === "object" && item !== null) ? DeepCopy(item) : item);
    let result = {};
    for (const key in object) {
      result[key] = (typeof object[key] === "object" && object[key] !== null) ? DeepCopy(object[key]) : object[key];
    }
    return result;
  }

  // 发送命令：支持字符串或数组（数组首项为数字时作为延迟毫秒）
  function SendCommand(command) {
    if (command instanceof Array) {
      if (command.length === 0) return;
      let cmd1 = command[0];
      let cmd2 = command.slice(1);
      if (typeof cmd1 === "number") {
        setTimeout(() => SendCommand(cmd2), cmd1);
      } else if (cmd1) {
        SendCommand(cmd1);
        SendCommand(cmd2);
      }
    } else if (typeof command === "string") {
      window.WG.SendCmd(command);
    }
  }

  // 追加内容到主消息区并自动滚动
  function AddContent(element) {
    $(".content-message pre").append(element);
    AutoScroll(".content-message");
    return false;
  }

  // 播放提示音并提示用户检查音量
  function Tips() {
    NotSound();
    AddContent($(`<span></span>`).append(`<hiy>如无声音，请检查音量\n</hiy>`));
  }

  /********************2026-08-10 脱战UI优化（卡片美化 / 日志裁剪 / 侧栏记忆）********************/
  // B. 卡片化美化：深色卡片、圆角、细边框、统一配色（无阴影 → 减少渲染）
  // 【2026-08-10】.left / .right 去掉卡片底色/边框（去卡片套卡片，扁平化以匹配游戏原生风格），仅保留内边距
  // 【2026-08-10 墨绿基调】背景/边框统一墨绿系（#141a17 卡片面 / #0d1412 聊天深底 / 墨绿细边框）
  // 【2026-08-10 去底色】参考 wsmud-server WebUI（app.css --bg 深底 + --line 描边）：所有区域去掉卡片底色填充，仅保留墨绿描边边框
  GM_addStyle(`
  .left{box-sizing:border-box;padding:4px;}
  .right{box-sizing:border-box;padding:4px;}
  .left > *, .right > *{box-sizing:border-box;}
  .content-message{box-sizing:border-box;background:transparent;border:1px solid rgba(0,128,0,.16);border-radius:12px;}
  /* 【2026-08-11 26.1.11】文字色改 inherit：不再硬编码，跟随游戏"正常字体颜色"设置（extension-manager fontcolor → body color） */
  .content-message pre{line-height:1.65;font-size:13px;color:inherit;}
  .WG_log,.right-channel,.room-commands{box-sizing:border-box;background:transparent;border:1px solid rgba(0,128,0,.16);border-radius:10px;padding:6px 8px;}
  `);
  // A. 日志自动裁剪：挂机日志无限累积是渲染负担大头，超上限自动删旧（防抖批量）
  var LOG_MAX = 2000;
  var _trimTimer = null;
  function _trimLog(el) {
      if (!el) return;
      while (el.childNodes.length > LOG_MAX) { el.removeChild(el.firstChild); }
  }
  function _trimAllLog() {
      [".content-message pre", ".WG_log pre"].forEach(function (sel) {
          _trimLog(document.querySelector(sel));
      });
  }
  var _logObs = new MutationObserver(function () {
      if (_trimTimer) return;
      _trimTimer = setTimeout(function () { _trimTimer = null; _trimAllLog(); }, 800);
  });
  (function _bindLogObs() {
      var found = false;
      [".content-message pre", ".WG_log pre"].forEach(function (sel) {
          var el = document.querySelector(sel);
          if (el) { _logObs.observe(el, { childList: true }); found = true; }
      });
      if (!found) setTimeout(_bindLogObs, 2000);
  })();
  setInterval(_trimAllLog, 60000);   // 兜底：元素重建后也会被裁剪
  // C. 侧栏显示状态记忆（刷新后保持隐藏/显示）
  var _sideKey = '_ui_sidebar';
  function _saveSide() {
      var s = '';
      if ($('.left').is(':visible')) s += 'l';
      if ($('.right').is(':visible')) s += 'r';
      try { GM_setValue(_sideKey, s); } catch (e) { }
  }
  function _restoreSide() {
      try {
          var s = GM_getValue(_sideKey, 'lr');
          if (s.indexOf('l') < 0) $('.left').hide();
          if (s.indexOf('r') < 0) $('.right').hide();
      } catch (e) { }
  }
  $(document).on('click', '.span-btn', function () { setTimeout(_saveSide, 50); });
  setTimeout(_restoreSide, 1000);

  // 【2026-08-11 26.1.10】日志标题栏三个按钮（事件委托，动态注入的标题栏也能命中）
  $(document).on('click', '.WG_log_log_title .wlg-btn', function () {
      var act = $(this).attr('data-act');
      if (act === 'clear') {          // 清除日志：清空右侧日志区
          $('.WG_log_log pre').empty();
          log_log_line = 0;
      } else if (act === 'reset') {   // 重置统计：战斗DPS + 经验/潜能 + 获得物品 全部归零
          try { WG.clean_dps(); } catch (e) { }
          expGained = 0; potGained = 0;
          for (var k in itemTotalCount) delete itemTotalCount[k];
      }
  });

  /********************暴露********************/
  unsafeWindow.funny = {
    role: role,
    follower: follower,
    title: title,
    room: room,
    exits: exits,

    SendCommand: SendCommand,
  };
})();