// ============================================================
// config-vars.js —— 全局配置与常量中心（个性化修改的第一站！）
// ------------------------------------------------------------
// 插件的各种"默认设置"几乎都在这里：
//   place / mpz_path / needfind  各地点的寻路命令表（可改坐标）
//   autowork       挂机模式（0挖矿/1修炼/2钓鱼）
//   auto_pfmswitch / auto_pfm_mode  自动施法开关 / 智能或顺序模式
//   unauto_pfm     自动施法黑名单（哪些招不自动放）
//   automarry      自动喜宴
//   autoBoss / BossName / auto_command  自动打 BOSS
//   skillCD / buffCD / busy_info / getitemShow  显示开关
//   autoBuyList    自动购买清单（自动买药等）
//   onekey_fenjie / fj_sc / fenjieList  一键分解装备
//   shieldswitch / shield / shieldkey  聊天屏蔽
//   pushSwitch / pushType / pushToken  远程推送设置
//   die_str / custom_dock / backimageurl / color_select  外观杂项
//   zdyskills / zdyskilllist  自定义技能顺序
//   saveAddr       存仓地点
//   timequestion   定时任务
//   zdy_btnlist    自定义按钮
// 注意：这里是"默认值"，游戏里设置面板改过的值会覆盖它们（存 GM 配置里）。
// ============================================================
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
// 【2026-08-13 自动恢复】重连失败达上限后自动刷新页面重新登录（服务器无人值守场景）
var auto_recover = '开';
//dps统计信息
var normalHitCount = 0;       // 普通攻击次数
var normalDamageTotal = 0;    // 普通伤害总和
var dpssakada = '开'          // DPS统计开关
var critDamageTotal = 0;      // 暴击伤害总和
var critHitCount = 0;         // 暴击次数
var dpsLocked = 0;            // DPS统计锁定标志
var battleStartTime = 0;      // 战斗开始时间
var lastCritDamage = 0, lastNormalDamage = 0;  // 上次暴击/普通伤害
//funny计算
var funnycalc = '关';
//后台保活（全局键 _keepalive，防多开挂机被浏览器节流）
var keepalive = '开';
// 【2026-08-14 跨窗口同步】全局设置同步开关（全局键 _ext_sync_global，默认关）
var ext_sync_global = '关';
var expGained = 0;            // 获得经验
var potGained = 0;            // 获得潜能
//彩虹名字
var rainbow_name = null;
//登录后执行
var loginhml = '';

//【2026-08-09 移植v1.0.0】自动售卖清单 / 自动使用清单（物品名称，半角逗号分隔，模糊匹配）
var autoSellList = "";
var autoUseList = "";

//挂机选项
var autowork = '0';
//显示昏迷信息
var busy_info = "开";
//显示CD信息
var skillCD = "关";
var buffCD = "开";
// 【2026-08-12 移植作者 f45137e】CD 显示颜色（游戏颜色标签：hir红/hig绿/hiy黄/hic青/hiz蓝/hio橙/wht白）
var skillCDColor = 'hir';
var buffCDColor = 'hig';
// 【2026-08-13 移植作者 26.2】自动买符开关 + 活动轮询间隔
var auto_buy_talisman = false;
var event_poll_interval = 1;
var _eventPollTimer = null;
// 【2026-08-13 挂机健康自检】定时检查页面卡顿隐患（消息积压/日志膨胀/DOM节点/存储占用），默认开
var healthcheck_enabled = true;
var _healthTimer = null;
var _hcWarnedDom = false;        // DOM 超限是否已提示（防止每 5 分钟刷屏）
var _hcWarnedStorage = false;    // 存储超限是否已提示
// 获得物品展示设置
var getitemShow = "开";
var itemTotalCount = {};
var zmlshowsetting = 0;

// 自动喜宴
var automarry = '开';
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
var auto_pfmswitch = "关";
// 自动施法模式 开：智能施法，关：顺序施法
var auto_pfm_mode = "开";
var can_auto = true;

//自动购买
var autoBuyList = "";

//一键分解
var onekey_fenjie = "关";
var follower_fenjie = "关";
var fj_sc = "";
var fenjieList = "";

//死亡提示
var die_str = "";
var custom_dock = 0;
//配色
var color_select = "normal";

//屏蔽开关
var shieldswitch = "关"
//屏蔽列表
var shield = '';
//屏蔽关键字列表
var shieldkey = '';

//通知推送开关、方式、Token、Url
var pushSwitch = "关";
var pushType = "0";
var pushToken = "";
var _pushDeath = "开";          // 角色死亡/复活自动推送开关
// var pushUrl = "https://";
// 【2026-08-13 无人值守推送】关键事件（掉线/死亡/长时间无消息）自动推送到手机，依赖上面 pushSwitch 总开关
var _lastMsgTime = 0;          // 最后收到服务器消息的时间
var _idleWarned = false;       // 是否已推送过"长时间无消息"（收到消息后重置）
var _PUSH_IDLE_MINUTES = 15;   // 无消息超过此分钟数 → 推送"疑似卡死/断线"
var _pushIdleTimer = null;     // 无消息检测定时器

// 【发呆检测】角色长时间发呆（状态=none且不在战斗）时自动执行指定命令
var _idleCmdSwitch = "关";     // 发呆检测总开关
var _idleCmdSeconds = 120;     // 发呆多少秒后触发（默认2分钟）
var _idleCmdContent = "";      // 发呆时执行的命令（如 "@liaoshang"）
var _idleCmdFired = false;     // 本次发呆周期是否已触发过（恢复后重置）
var _idleCmdTimer = null;      // 发呆检测定时器

//自命令数组  type 0 原生 1 自命令 2js
//[{"name":"name","zmlRun":"zzzz","zmlShow":"1","zmlType":"0"}]
var zml = [];
//状态监控 type 类型  ishave  0 =其他任何人 1= 本人  2 仅npc  send 命令数组
//[{"name":"","type":"status","action":"remove","keyword":"busy","ishave":"0","send":"","isactive":"1","maxcount":10,"pname":"宋远桥","istip":"1"}]
var ztjk_item = [];
//  自定义技能开关
var zdyskills = "关";
var zdyskilllist = "";

//仓库位置
var saveAddr = "关";
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

