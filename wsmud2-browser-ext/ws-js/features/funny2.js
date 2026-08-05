// funny2.js
// 武神传说 MUD 综合增强脚本：监控游戏事件、布局调整、快捷按钮、自动拾取等。
(function () {
  "use strict";
  /********************变量********************/

  // 注意：变量名 isMoblie 为历史拼写，保持不变以兼容外部引用
  let isMoblie = false;
  let test = true;

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

  // 角色代理：写入非 name 字段时同步更新对应 DOM；name 字段一旦存在就不再覆盖
  let role = new Proxy({}, {
    set: function (role, key, value) {
      if (!isMoblie) {
        if (key === "name" && role.name) return true; // name 不变
        $(".role_" + key).html(value);
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
    let x = room.str.match(/(.*)-(.*)/);
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

  // 活动事件对话框：筛选感兴趣的活动并渲染到右侧栏
  window.WG.add_hook("dialog", function (data) {
    if (data.dialog != "events" || data.update || data.finish) return;
    const toshow = ["挖矿指南", "BOSS", "门派战争", "婚礼"];
    const events = [];
    console.log(data);
    data.items.forEach(event => {
      if (toshow.some(item => event[1].includes(item))) {
        const date = new Date(event[4]);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const dur = event[4] == 0 ? "" : `持续到${hours}:${minutes}:${seconds}`;
        const cmd = "events " + event[0] + " ok";
        events.push({ "tit": event[1], "des": event[2], "dur": dur, "cmd": cmd });
      }
    });

    const eventElements = events.map(event =>
      $(`<div class="events-event"></div>`).append(
        $(`<div class="events-box-left"></div>`).append(
          $(`<div class="events-header"></div>`).append(
            $(`<div class="tit">${event.tit}</div>`),
            $(`<div class="dur">${event.dur}</div>`)
          ),
          $(`<div class="des">${event.des}</div>`)
        ),
        $(`<div class="events-box-right"></div>`).append(
          $(`<div class="cmd">前往</div>`).on('click', function () { SendCommand(event.cmd); })
        )
      )
    );

    if ($(".right-events").length === 0) {
      $(".right-events").append(
        $(`<div class="events-box"></div>`)
      );
    }

    $(".events-box").empty().append(eventElements);
  });


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
    GM_addStyle(`
      .span-btn { border: gray solid 1px; border-radius: 3px; display: inline-block; padding: 5px; font-size: 15px; margin: 0 5px 5px 0; }
      .span-btn { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; cursor: pointer; }
      .span-btn:hover { color: #00ff00; }
      .span-btn:active { transform: translateY(1px); }
      `);
    if (isMoblie) return;
    $(".signinfo").addClass("hide");
    $(".room_items")[0].style.maxHeight = "240px";
    $(".state-bar")[0].style.overflow = "hidden";
    $(".combat-commands")[0].style.overflow = "hidden";
    $(".dialog-content")[0].style.overflowX = "hidden";

    GM_addStyle(`.content-bottom { -webkit-user-select: none, -moz-user-select: none, -ms-user-select: none }
  .room-commands > .act-item { min-width: 1em;}
  .content-message { padding-right: 3.5em; }
  .dialog-stats > .top-item > .top-sc,
  .dialog-stats > .top-item > .top-title,
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
      // AddContent($("<div></div>").append(
      //   $(`<span class="span-btn"></span>`).append("游戏清屏").click(() => $(".content-message pre").html(""))
      // ));
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
        $(`<span class="span-btn"></span>`).append(`<hic>${GameState.score.family}</hic>`).click(() => SendCommand("$to 后勤;$wait 500;ask1 {r门派后勤管理员}")),
        $(`<span class="span-btn"></span>`).append("武当").click(() => SendCommand("goto fam2 WUDANG")),
        $(`<span class="span-btn"></span>`).append("少林").click(() => SendCommand("goto fam2 SHAOLIN")),
        $(`<span class="span-btn"></span>`).append("华山").click(() => SendCommand("goto fam2 HUASHAN")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("峨眉").click(() => SendCommand("goto fam2 EMEI")),
        $(`<span class="span-btn"></span>`).append("逍遥").click(() => SendCommand("goto fam2 XIAOYAO")),
        $(`<span class="span-btn"></span>`).append("丐帮").click(() => SendCommand("goto fam2 GAOBANG")),
        $(`<span class="span-btn"></span>`).append("杀手").click(() => SendCommand("goto fam2 SHASHOU")),
        $(`<br>`),
      ));
    };
    let toSchoolMPZ = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("逍遥").click(() => SendCommand("$to 门派橙-逍遥")),
        $(`<span class="span-btn"></span>`).append("华山").click(() => SendCommand("$to 门派橙-华山")),
        $(`<span class="span-btn"></span>`).append("武当").click(() => SendCommand("$to 门派橙-武当")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("峨眉").click(() => SendCommand("$to 门派橙-峨眉")),
        $(`<span class="span-btn"></span>`).append("丐帮").click(() => SendCommand("$to 门派橙-丐帮")),
        $(`<span class="span-btn"></span>`).append("少林").click(() => SendCommand("$to 门派橙-少林")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("<hig>领取奖励").click(() => SendCommand("events WUDANG_settle")),
      ));
    };
    let toSchoolJD = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("蓬莱-观海台").click(() => SendCommand("$to 蓬莱岛-观海台")),
        $(`<span class="span-btn"></span>`).append("蓬莱-石碑").click(() => SendCommand("$to 蓬莱岛-石碑")),
        $(`<span class="span-btn"></span>`).append("蓬莱-姜卫").click(() => SendCommand("$to 蓬莱岛-姜卫")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("药王谷-鉴宝阁").click(() => SendCommand("$to 药王谷-鉴宝阁;$wait 500;list {r拍卖师}")),
        $(`<span class="span-btn"></span>`).append("药王谷-炼丹房").click(() => SendCommand("$to 药王谷-炼丹房")),
        $(`<span class="span-btn"></span>`).append("药王谷-藏书楼").click(() => SendCommand("$to 药王谷-藏书楼")),
        $(`<br>`),
        $(`<span class="span-btn"></span>`).append("蜀山-祖师殿").click(() => SendCommand("$to 蜀山-祖师殿")),
      ));
    };
    let toQiTa = function () {
      AddContent($("<div></div>").append(
        $(`<span class="span-btn"></span>`).append("提示音").click(() => Tips()),
        $(`<span class="span-btn"></span>`).append("攻略网站").click(() => window.open("https://ucn595zz2fou.feishu.cn/wiki/JvEZw8bEiiIpf3kQiFJcAwbanji", "_blank")),
      ));
    };

    /********************BODY********************/
    GM_addStyle(`
      body { width: 100%; display: flex; flex-flow: row nowrap; }
      .container, .login-content { width: 400px; flex: 1 0 auto; margin: 0; }
      .left, .right { width:390px; height:100%; flex: 0 0 auto; margin: 0 10px; }
      `);
      
    $("body").append(
      $(`<div class="left"></div>`),
      $(`<div class="right"></div>`),
    );
    function confirmWight() {
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
            target: 'body > div.left > div.left-console',
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
    confirmWight();
    // 监听窗口大小变化
    window.addEventListener('resize', function() {
    confirmWight();
    });

    /********************RIGHT********************/
    {
      GM_addStyle(`
      .right{ order: 1; display: flex; flex-direction: column; flex-wrap: nowrap; }
      .right-channel { width: 100%; flex: 0 0 60%; overflow: auto; margin-top: 10px; }
      .right-events { width: 100%; height: auto; flex: 0 0 40%; padding-left: 5px; overflow-y: auto; margin-bottom: 10px; }
      .channel { max-height: 90% !important; flex: 1; overflow: auto;}
      `
      );
      $(".right").append(
        $(`<div class="right-channel"></div>`),
        $(`<div class="right-events"></div>`),
      );
    }
    /********************LEFT********************/
    GM_addStyle(`
      .left { height: 100%; order: -1; display: flex; flex-direction: column; flex-wrap: nowrap; }
      .left-content { width: 100%; height: auto; flex: 0 0 auto;}
      .left-hotkeys { width: 100%; height: auto; flex: 0 0 120px; padding-left: 5px; }
      .left-console { width: 100%; flex: 1 1 auto; overflow: auto; margin: 8px; display: flex; flex-direction: column; }
      .WG_log { width: 100%;height: 100%; flex: 1; overflow: auto; max-height: none !important; }
      .WG_log_log { width: 100%;height: 100%; flex: 1; overflow: hidden; max-height: none !important; display: flex; flex-direction: column; }
      .WG_log_log_title { color: #ffffff; font-size: 14px; font-weight: bold; padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.25); flex-shrink: 0; }
      .WG_log_log > pre { flex: 1; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
      `);
    $(".left").append(
      $(`<div class="left-content"></div>`),
      $(`<div class="left-hotkeys"></div>`),
      $(`<div class="left-console"></div>`),
    );
    {
      $(".left-hotkeys").append(
        $("<div></div>").append(
          $(`<span class="span-btn"></span>`).append("属性").click(clickInfo),
          $(`<span class="span-btn"></span>`).append("背包").click(clickPack),
          $(`<span class="span-btn"></span>`).append("换组").click(checkEq),
          $(`<span class="span-btn"></span>`).append("扩展").click(openExtend),
          $(`<span class="span-btn"></span>`).append("活动").click(() => SendCommand("events")),
          $(`<span class="span-btn"></span>`).append("统计").click(() => SendCommand("info")),
          $(`<span class="span-btn"></span>`).append("回复").click(() => ToRaid.perform("@renew")),
          $(`<span class="span-btn"></span>`).append("挂机").click(() => WG.zdwk()),
        ),
        $("<div></div>").append(
          $(`<span class="span-btn"></span>`).append("师父").click(() => SendCommand("goto fam1 WUDANG")),
          $(`<span class="span-btn"></span>`).append("木人").click(() => SendCommand("$to 少林派-西侧殿")),
          $(`<span class="span-btn"></span>`).append("随从").click(dzsc),
          $(`<span class="span-btn"></span>`).append("门战").click(toSchoolMPZ),
          $(`<span class="span-btn"></span>`).append("后勤").click(toSchoolHQ),
          $(`<span class="span-btn"></span>`).append("当铺").click(() => SendCommand("$to 扬州城-当铺;$wait 200;list {r唐楠};")),
          $(`<span class="span-btn"></span>`).append("仓库").click(() => SendCommand("$to 扬州城-钱庄")),
          $(`<span class="span-btn"></span>`).append("回家").click(() => SendCommand("$to 住房")),
        ),
        $("<div></div>").append(
          $(`<span class="span-btn"></span>`).append("其他").click(toQiTa),
          $(`<span class="span-btn"></span>`).append("隐藏").click(hideLeftRight),
          $(`<span class="span-btn"></span>`).append("清屏").click(clearRightMsg),
          $(`<span class="span-btn"></span>`).append("工具").click(() => openExtensionHtml()),
          $(`<span class="span-btn"></span>`).append("禁地").click(toSchoolJD),
          $(`<span class="span-btn"></span>`).append("武道").click(() => SendCommand("jh fam 9 start;go enter")),
        ),
        $("<div></div>").append(

        ),
      );
    };

    /********************LEFT-CONTENT********************/
    {
      GM_addStyle(`
      .left-content { margin: 10px 0; font-size: 16px; overflow: auto; }
      .left-content { display: flex; flex-direction: column; flex-wrap: nowrap; }
      .content-title { flex: 0 0 auto; border: gray solid 1px; border-radius: 3px; display: flex; }

      .content-info { flex: 0 1 auto; border: gray solid 1px; border-radius: 3px; margin-top: 5px; overflow: auto; }
      .info-row { display: flex; }
      .info-item { flex: 0 1 999px; dispaly: inline-block; text-align: center; }
      .info-title { flex: 0 0 65px; dispaly: inline-block; text-align: center; }

      .item-row { display: flex; border-bottom: gray dotted 0.5px; }
      .item-name { cursor: pointer; }
      .item-count { dispaly: inline-block; text-align: right; flex: 1 0 auto; }
      `);
      $(".left-content").append(
        $(`<div class="content-title"></div>`),
        $(`<div class="content-info"></div>`),
      );
      $(".content-info").show();
      $(".content-title").append(
        $(`<span>　</span>`), $(`<hiy class="role_family">门派</hiy>`), $(`<span>　</span>`),
        $(`<span class="role_level">LEVEL</span>`), $(`<span>　</span>`),
        $(`<hic class="role_name">NAME</hic>`), $(`<span>　</span>`),
        $(`<hiw class="role_id">ID</hiw>`),
      );
    };
    {
      $(".content-info").append(
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">经验<span>`),
          $(`<span class="info-item role_exp">999999<span>`),
          $(`<span class="info-title">潜能<span>`),
          $(`<span class="info-item role_pot">999999<span>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">气血<span>`),
          $(`<span class="info-item"><hir class="role_hp">0</hir>　/　<span class="role_max_hp">999999</span><span>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">内力<span>`),
          $(`<span class="info-item"><hic class="role_mp">0</hic>　/　<span class="role_max_mp">999999</span><span>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">臂力<span>`),
          $(`<span class="info-item"><hiy class="role_str">15</hiy>＋<span class="role_str_add">999</span><span>`),
          $(`<span class="info-title">根骨<span>`),
          $(`<span class="info-item"><hiy class="role_con">15</hiy>＋<span class="role_con_add">999</span><span>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">身法<span>`),
          $(`<span class="info-item"><hiy class="role_dex">15</hiy>＋<span class="role_dex_add">999</span><span>`),
          $(`<span class="info-title">悟性<span>`),
          $(`<span class="info-item"><hiy class="role_int">15</hiy>＋<span class="role_int_add">999</span><span>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">攻击<span>`),
          $(`<hig class="info-item role_gj">99999<hig>`),
          $(`<span class="info-title">命中<span>`),
          $(`<hig class="info-item role_mz">99999<hig>`),
          
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">防御<span>`),
          $(`<hig class="info-item role_fy">99999<hig>`),
          $(`<span class="info-title">招架<span>`),
          $(`<hig class="info-item role_zj">99999<hig>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">躲闪<span>`),
          $(`<hig class="info-item role_ds">99999<hig>`),
          $(`<span class="info-title">攻速<span>`),
          $(`<hig class="info-item role_gjsd">99999<hig>`),
        ),
        $(`<div class="info-row"></div>`).append(
          $(`<span class="info-title">财产<span>`),
          $(`<span class="info-item role_money">999999两<hiy>黄金</hiy><span>`),
        ),
      );
    };
    /********************LEFT-EVENTS********************/
    {
      GM_addStyle(`
        .right-events {
            font-size: 14px;
            overflow: auto;
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
        }
        .events-box {
            flex: 0 1 auto;
            overflow: auto;
            display: flex;
            flex-direction: column;
        }
        .events-event {
            border-radius: 6px;
            background-color: #111111;
            border-left-width: 4px;
            border-left-style: solid;
            margin-bottom: 0.5em;
            padding-left: 0.5em;
            display: flex;
            flex-direction: row;
        }
        .events-box-left {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .events-box-right {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .events-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .events-event .tit {
            margin: 0px;
            color: var(--border-color);
            font-weight: bold;
        }
        .events-event .des {
            white-space: pre-wrap;
            margin: 0;
            padding-top: 0.5em;
        }
        .events-event .dur {
            margin: 0px;
            color: gray;
        }
        .events-event .cmd {
            font-size: 16px;
            width: 2.0em;
            border-left: 1px solid var(--border-color);
            text-align: center;
            font-weight: bold;
            background-color: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--border-color);
            flex-direction: column;
            writing-mode: vertical-rl;
        }
       `);
      $(".right-events").append(
        $(`<div class="events-box"></div>`).append(
          $(`<div class="events-event"></div>`).append(
            $(`<div class="events-box-left"></div>`).append(
              $(`<div class="events-header"></div>`).append(
                $(`<div class="tit">挖矿指南</div>`),
                $(`<div class="dur">持续到00:00</div>`)
              ),
              $(`<div class="des">funny学会了新的挖矿技巧，所有人的挖矿效率都提高了，获得经验+50。</div>`)
            ),
            $(`<div class="events-box-right"></div>`).append(
              $(`<div class="cmd">前往</div>`)
            )
          )
        )
      );
    };
    
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

  // 将字符串解析为对象：以 { 开头视为对象字面量，否则包装为 {type:"text", text:str}
  function Str2Obj(str) {
    if (str[0] === "{") {
      return (new Function("return " + str))();
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

  /*
  function AutoScroll(name) {
    if (name) {
      let scrollTop = $(name)[0].scrollTop;
      let scrollHeight = $(name)[0].scrollHeight;
      let height = Math.ceil($(name).height());
      if (scrollTop < scrollHeight - height) {
        let add = (scrollHeight - height < 120) ? 1 : Math.ceil((scrollHeight - height) / 120);
        $(name)[0].scrollTop = scrollTop + add;
        setTimeout(function () {
          AutoScroll(name);
        }, 1000 / 120);
      }
    }
  }//滚动
  */

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

  // 深拷贝（仅适用于普通对象，不处理数组与循环引用）
  function DeepCopy(object) {
    let result = {};
    for (const key in object) {
      result[key] = (typeof object[key] === "object") ? DeepCopy(object[key]) : object[key];
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
      // if (!isMoblie) {
      //   $(".left-console-show").append(`<div> >> ${command}</div>`);
      //   AutoScroll(".left-console-show");
      // }
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