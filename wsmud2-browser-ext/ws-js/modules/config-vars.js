// config-vars.js
// L helper and global config variables
'use strict';

// 工具函数集合
var LayerHelper = {
    msg: function (msg) {
        if (layer) {
            layer.msg(msg, {
                offset: '50%',
                shift: 5
            })
        } else {
            messageAppend(msg);
        }
    },
    // 检测是否为移动设备
    isMobile: function () {
        var ua = navigator.userAgent;
        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
            isIphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
            isAndroid = ua.match(/(Android)\s+([\d.]+)/),
            isMobile = isIphone || isAndroid;
        return isMobile;
    }
};

// 房间物品选择索引
var roomItemSelectIndex = -1;
var itemKeys = [
"name", "id", "count", "grade", "unit",
"value", "can_eq", "can_use", "can_study",
"can_open", "can_combine", "locked"
];
var eqKeys = [
"name", "id", "grade", "can_use", "locked"
];
var selllistKeys = [
"name", "id", "count", "locked", "unit", "value"
];
var storeKeys = [
"name", "id", "count", "grade", "unit",
"value", "can_eq", "can_use", "can_study", 
"can_open", "can_combine"
];
var shopKeys = [
"id", "name", "desc", "price", "off", "max", "count", "buy"
];

// 计时器变量
var timer = 0;
// 计数器变量
var cnt = 0;
// 装备NPC变量
var zb_npc;
// 装备地点变量
var zb_place;
// 下一步操作标识
var next = 0;
// 房间数据数组
var roomData = [];
// 仓库数据数组
var storeData = [];
// 仓库物品列表
var store_list = [];
// 锁定物品列表
// 需要寻找的路径配置
var needfind = {
    "武当派-林间小径": ["go south"],
    "峨眉派-走廊": ["go north", "go south;go south", "go north;go east;go east"],
    "丐帮-暗道": ["go east", "go east;go east", "go east"],
    "逍遥派-林间小道": ["go west;go north", "go south;go south", "go north;go west"],
    "少林派-竹林": ["go north"],
    "逍遥派-地下石室": ["go up"],
    "逍遥派-木屋": ["go south;go south;go south;go south"]
};

// 地点路径配置
var place = {
    "住房": "goto home",
    "住房-卧室": "goto home;go north;store",
    "住房-小花园": "goto home;go northeast",
    "住房-炼药房": "goto home;go east",
    "住房-练功房": "goto home;go west",
    "扬州城-钱庄": "jh fam 0 start;go north;go west;store",
    "扬州城-广场": "jh fam 0 start",
    "扬州城-书院": "jh fam 0 start;go east;go north",
    "扬州城-醉仙楼": "jh fam 0 start;go north;go north;go east",
    "扬州城-杂货铺": "jh fam 0 start;go east;go south",
    "扬州城-打铁铺": "jh fam 0 start;go east;go east;go south",
    "扬州城-药铺": "jh fam 0 start;go east;go east;go north",
    "扬州城-衙门正厅": "jh fam 0 start;go west;go north;go north",
    "扬州城-镖局正厅": "jh fam 0 start;go west;go west;go south;go south",
    "扬州城-矿山": "jh fam 0 start;go west;go west;go west;go west",
    "扬州城-挖矿": "goto kuang",
    "扬州城-喜宴": "jh fam 0 start;go north;go north;go east;go up",
    "扬州城-擂台": "jh fam 0 start;go west;go south",
    "扬州城-当铺": "jh fam 0 start;go south;go east",
    "扬州城-帮派": "jh fam 0 start;go south;go south;go east",
    "扬州城-有间客栈": "jh fam 0 start;go north;go east",
    "扬州城-赌场": "jh fam 0 start;go south;go west",
    "帮会-大门": "goto bp;go west",
    "帮会-大院": "goto bp",
    "帮会-练功房": "goto bp;go north",
    "帮会-聚义堂": "goto bp;go east",
    "帮会-仓库": "goto bp;go east;go north",
    "帮会-炼药房": "goto bp;go south",
    "扬州城-扬州武馆": "jh fam 0 start;go south;go south;go west",
    "扬州城-武庙": "jh fam 0 start;go north;go north;go west",
    "武当派-广场": "jh fam 1 start;",
    "武当派-三清殿": "jh fam 1 start;go north",
    "武当派-石阶": "jh fam 1 start;go west",
    "武当派-练功房": "jh fam 1 start;go west;go west",
    "武当派-太子岩": "jh fam 1 start;go west;go northup",
    "武当派-桃园小路": "jh fam 1 start;go west;go northup;go north",
    "武当派-舍身崖": "jh fam 1 start;go west;go northup;go north;go east",
    "武当派-南岩峰": "jh fam 1 start;go west;go northup;go north;go west",
    "武当派-乌鸦岭": "jh fam 1 start;go west;go northup;go north;go west;go northup",
    "武当派-五老峰": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup",
    "武当派-虎头岩": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup",
    "武当派-朝天宫": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north",
    "武当派-三天门": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north",
    "武当派-紫金城": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north",
    "武当派-林间小径": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
    "武当派-后山小院": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north;go north",
    "少林派-广场": "jh fam 2 start;",
    "少林派-山门殿": "jh fam 2 start;go north",
    "少林派-东侧殿": "jh fam 2 start;go north;go east",
    "少林派-西侧殿": "jh fam 2 start;go north;go west",
    "少林派-天王殿": "jh fam 2 start;go north;go north",
    "少林派-大雄宝殿": "jh fam 2 start;go north;go north;go northup",
    "少林派-钟楼": "jh fam 2 start;go north;go north;go northeast",
    "少林派-鼓楼": "jh fam 2 start;go north;go north;go northwest",
    "少林派-后殿": "jh fam 2 start;go north;go north;go northwest;go northeast",
    "少林派-练武场": "jh fam 2 start;go north;go north;go northwest;go northeast;go north",
    "少林派-罗汉堂": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go east",
    "少林派-般若堂": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go west",
    "少林派-方丈楼": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north",
    "少林派-戒律院": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go east",
    "少林派-达摩院": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go west",
    "少林派-竹林": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north",
    "少林派-藏经阁": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go west",
    "少林派-达摩洞": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north;go north;go north;go north",
    "华山派-镇岳宫": "jh fam 3 start;",
    "华山派-苍龙岭": "jh fam 3 start;go eastup",
    "华山派-舍身崖": "jh fam 3 start;go eastup;go southup",
    "华山派-峭壁": "jh fam 3 start;go eastup;go southup;jumpdown",
    "华山派-山谷": "jh fam 3 start;go eastup;go southup;jumpdown;go southup",
    "华山派-山间平地": "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south",
    "华山派-林间小屋": "jh fam 3 start;go eastup;go southup;jumpdown;go southup;go south;go east",
    "华山派-玉女峰": "jh fam 3 start;go westup;go north",
    "华山派-玉女祠": "jh fam 3 start;go westup;go north;go west",
    "华山派-练武场": "jh fam 3 start;go westup;go north;go north",
    "华山派-练功房": "jh fam 3 start;go westup;go north;go north;go east",
    "华山派-客厅": "jh fam 3 start;go westup;go north;go north;go north",
    "华山派-偏厅": "jh fam 3 start;go westup;go north;go north;go north;go east",
    "华山派-寝室": "jh fam 3 start;go westup;go north;go north;go north;go north",
    "华山派-玉女峰山路": "jh fam 3 start;go westup",
    "华山派-玉女峰小径": "jh fam 3 start;go westup;go southup",
    "华山派-思过崖": "jh fam 3 start;go westup;go southup;go southup",
    "华山派-山洞": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter",
    "华山派-长空栈道": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup",
    "华山派-落雁峰": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup",
    "华山派-华山绝顶": "jh fam 3 start;go westup;go south;go southup;go southup;break bi;go enter;go westup;go westup;jumpup",
    "峨眉派-金顶": "jh fam 4 start",
    "峨眉派-庙门": "jh fam 4 start;go west",
    "峨眉派-广场": "jh fam 4 start;go west;go south",
    "峨眉派-走廊": "jh fam 4 start;go west;go south;go west",
    "峨眉派-休息室": "jh fam 4 start;go west;go south;go east;go south",
    "峨眉派-厨房": "jh fam 4 start;go west;go south;go east;go east",
    "峨眉派-练功房": "jh fam 4 start;go west;go south;go west;go west",
    "峨眉派-小屋": "jh fam 4 start;go west;go south;go west;go north;go north",
    "峨眉派-清修洞": "jh fam 4 start;go west;go south;go west;go south;go south",
    "峨眉派-大殿": "jh fam 4 start;go west;go south;go south",
    "峨眉派-睹光台": "jh fam 4 start;go northup",
    "峨眉派-华藏庵": "jh fam 4 start;go northup;go east",
    "逍遥派-青草坪": "jh fam 5 start",
    "逍遥派-林间小道": "jh fam 5 start;go east",
    "逍遥派-练功房": "jh fam 5 start;go east;go north",
    "逍遥派-木板路": "jh fam 5 start;go east;go south",
    "逍遥派-工匠屋": "jh fam 5 start;go east;go south;go south",
    "逍遥派-休息室": "jh fam 5 start;go west;go south",
    "逍遥派-木屋": "jh fam 5 start;go north;go north",
    "逍遥派-地下石室": "jh fam 5 start;go down;go down",
    "丐帮-树洞内部": "jh fam 6 start",
    "丐帮-树洞下": "jh fam 6 start;go down",
    "丐帮-暗道": "jh fam 6 start;go down;go east",
    "丐帮-破庙密室": "jh fam 6 start;go down;go east;go east;go east",
    "丐帮-土地庙": "jh fam 6 start;go down;go east;go east;go east;go up",
    "丐帮-林间小屋": "jh fam 6 start;go down;go east;go east;go east;go east;go east;go up",
    "杀手楼-大门": "jh fam 7 start",
    "杀手楼-大厅": "jh fam 7 start;go north",
    "杀手楼-暗阁": "jh fam 7 start;go north;go up",
    "杀手楼-铜楼": "jh fam 7 start;go north;go up;go up",
    "杀手楼-休息室": "jh fam 7 start;go north;go up;go up;go east",
    "杀手楼-银楼": "jh fam 7 start;go north;go up;go up;go up;go up",
    "杀手楼-练功房": "jh fam 7 start;go north;go up;go up;go up;go up;go east",
    "杀手楼-金楼": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up",
    "杀手楼-书房": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go west",
    "杀手楼-平台": "jh fam 7 start;go north;go up;go up;go up;go up;go up;go up;go up",
    "襄阳城-广场": "jh fam 8 start",
    "襄阳城-南城门": "jh fam 8 start;go south;go south;go south;go south",
    "襄阳城-北城门": "jh fam 8 start;go north;go north;go north;go north;",
    "襄阳城-西城门": "jh fam 8 start;go west;go west;go west;go west",
    "襄阳城-东城门": "jh fam 8 start;go east;go eastgo east;go east",
    "武道塔": "jh fam 9 start",
    "蓬莱岛-观海台": "jh ar 3 start;go east;go east;go south",
    "蓬莱岛-石碑": "jh ar 3 start;go east;go north;go northeast;go northeast;$wait 500;go north;go northeast;go northeast;go north;tiao valley;$wait 500;go south;search tools;go south;look shanbei",
    "蓬莱岛-姜卫": "jh ar 3 start;go east;go north;go northeast;go northeast;$wait 500;go north;go northwest;go north;go north;go north;$wait 500;go north;go north;go west;go south",
    "药王谷-鉴宝阁": "jh ar 6 start;go north;go north;go west;go up",
    "药王谷-炼丹房": "jh ar 6 start;go north;go north;go north;go east;$wait 500;go east;go east;go east;go north;go north;$wait 500;go north;go north;go west",
    "药王谷-藏书楼": "jh ar 6 start;go north;go north;go north;go east;$wait 500;go east;go east;go east;go north;go north;$wait 500;go north;go north;go north;go east",
    "蜀山-祖师殿": "jh ar 8 start;go northup;go northup;go northup;go northup;$wait 500;go northup;go north;go north",
    "门派橙-武当": "goto fam3 WUDANG;go west;go northup;go north;go west;$wait 500;go northup;go northup;go northup;go north;go north;$wait 500;go north;go north;go north;go north",
    "门派橙-少林": "goto fam3 SHAOLIN;go down;go down;",
    "门派橙-华山": "goto fam3 HUASHAN;go westup;go north;go north;go north;",
    "门派橙-峨眉": "goto fam3 EMEI;go west;go south;go west;go south;go south;",
    "门派橙-逍遥": "goto fam3 XIAOYAO;go down;go down;",
    "门派橙-丐帮": "goto fam3 GAIBANG;go down;go east;go east;go east;go east;go east;go up;",
    "后勤-武当": "goto fam2 WUDANG",
    "后勤-少林": "goto fam2 SHAOLIN",
    "后勤-华山": "goto fam2 HUASHAN",
    "后勤-峨眉": "goto fam2 EMEI",
    "后勤-逍遥": "goto fam2 XIAOYAO",
    "后勤-丐帮": "goto fam2 GAIBANG",
    "后勤-杀手": "goto fam2 SHASHOU",
    "后勤": function() { return "goto fam2 " + GameState.score.family_py},
    "师父": function() { return "goto fam1 " + GameState.score.family_py},
};
// 门派掌门配置
var mpz_path = {
    "武当派": "jh fam 1 start;go west;go northup;go north;go west;go northup;go northup;go northup;go north;go north;go north;go north;go north",
    "华山派": "jh fam 3 start;go westup;go north",
    "少林派": "jh fam 2 start;go north;go north;go northwest;go northeast;go north;go north",
    "峨眉派": "jh fam 4 start;go west;go south;go west;go south",
    "逍遥派": "jh fam 5 start;go west;go east;go down",
    "丐帮": "jh fam 6 start;go down;go east;go east;go east;go east;go east",
};
// 不同颜色主题配置
var diff_colors = {
    'normal': '',
    'access': 'https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/plugins/wsmud_color_accessibility.css',
    'flat': 'https://cdn.jsdelivr.net/gh/mapleobserver/wsmud-script/plugins/wsmud_color_flat.css'
};
// 当前角色
var role;
// 角色ID
var roleid;
// 玩家门派
var family = null;
// 副本路径配置
var fb_path = [];

//自动重连
var auto_relogin = null;
//dps统计信息
var normalHitCount = 0;       // 普通攻击次数
var normalDamageTotal = 0;    // 普通伤害总和
var dpssakada = true          // DPS统计开关
var critDamageTotal = 0;      // 暴击伤害总和
var critHitCount = 0;         // 暴击次数
var dpsLocked = 0;            // DPS统计锁定标志
var battleStartTime = 0;      // 战斗开始时间
var lastCritDamage = 0, lastNormalDamage = 0;  // 上次暴击/普通伤害
//funny计算
var funnycalc = false;
var expGained = 0;            // 获得经验
var potGained = 0;            // 获得潜能
//彩虹名字
var rainbow_name = null;
//登录后执行
var loginhml = '';

//挂机选项
var autowork = '0';
//显示昏迷信息
var busy_info = true;
//显示CD信息
var skillCD = false;
var buffCD = true;
var skillCDColor = 'hir';
var buffCDColor = 'hig';
// 获得物品展示设置
var getitemShow = true;
var itemTotalCount = {};
var raidItemData = {};
// 集中显示获得物品（合并重复的"你获得了"消息）
var merge_item_display = true;
var zmlshowsetting = 0;

// 自动喜宴
var automarry = true;
// 自动boss
var autoBoss = null;
var BossName = null;
//停止后动作
var auto_command = null;

// 技能黑名单
var blackpfm = [];
//自动施法黑名单
var unauto_pfm = '';
//自动施法开关
var auto_pfmswitch = false;
// 自动施法模式 开：智能施法，关：顺序施法
var auto_pfm_mode = true;
var can_auto = true;

//自动购买
var autoBuyList = "";

//自动买符
var auto_buy_talisman = false;
//活动轮询间隔（分钟）
var event_poll_interval = 1;
//活动轮询定时器ID
var _eventPollTimer = null;

//一键分解
var onekey_fenjie = false;
var follower_fenjie = false;
var fj_sc = "";
var fenjieList = "";

//死亡提示
var die_str = "";
var custom_dock = 0;
//配色
var color_select = "normal";
//背景图片
var backimageurl = '';

//屏蔽开关
var shieldswitch = false
//屏蔽列表
var shield = '';
//屏蔽关键字列表
var shieldkey = '';

//通知推送开关、方式、Token、Url
var pushSwitch = false;
var pushType = "0";
var pushToken = "";
// var pushUrl = "https://";


//自命令数组  type 0 原生 1 自命令 2js
//[{"name":"name","zmlRun":"zzzz","zmlShow":"1","zmlType":"0"}]
var zml = [];
//状态监控 type 类型  ishave  0 =其他任何人 1= 本人  2 仅npc  send 命令数组
//[{"name":"","type":"status","action":"remove","keyword":"busy","ishave":"0","send":"","isactive":"1","maxcount":10,"pname":"宋远桥","istip":"1"}]
var ztjk_item = [];
//  自定义技能开关
var zdyskills = false;
var zdyskilllist = "";

//仓库位置
var saveAddr = false;
//定时任务
//名称   类型 一次 1 每天 0 发送命令  触发时间 24小时制
//[{"name":"","type":"0","send":"","h":"","s":"","m":""}]
var timequestion = [];
//自定义btn
//[{"name":名称,"send":""},]
var inzdy_btn = false;
var zdy_btnlist = [];
// 系列自动开关
var stopauto = false;
//组列表
var eqgroup = [];
var skgroup = [];
// 命令代码显示
var cmd_echo = false;
var Coding = 0;

