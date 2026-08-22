// ============================================================
// state.js —— 全局状态记录 GameState（插件的大脑记忆）
// ------------------------------------------------------------
// 游戏服务器的每条消息都会被 global-init.js 解析，
// 然后把"当前状态"填进这个 GameState 对象里。
// 其它所有模块（自动战斗、Raid、监控等）都是读它来决定下一步做什么的。
//
// 通俗理解：这就是插件对游戏的"实时认知"——我现在在哪个房间、
// 背包里有什么、技能学了哪些、是不是在打架……全记在这里。
// ============================================================
'use strict';

// 全局变量：插件对游戏状态的统一记录
var GameState = {
    id: undefined,          // 角色 ID
    state: undefined,       // 角色当前状态（如 idle/战斗中等）
    room: {                 // 当前房间信息
        type: undefined,    //   房间类型
        path: undefined,    //   房间路径（地图坐标）
        name: undefined     //   房间名字
    },
    items: new Map(),       // 房间里的物品（key=物品id，value=物品信息）
    events: [],             // 当前可参与的事件列表（活动等）
    status: new Map(),      // 角色身上的状态/Buff（中毒、busy 等）
    score: {},              // 角色属性数据（服务器 score 命令返回的）
    relation:{              // 社交关系
        team: null,         //   队伍
        follower: null,     //   随从
        party: undefined,   //   帮派
    },
    skills: {               // 技能信息
        enable_skills: {    //   已学会的武功（每种武功一个位置）
            "unarmed": {name:null,id:null},   // 拳脚
            "force": {name:null,id:null},     // 内功
            "parry": {name:null,id:null},     // 招架
            "dodge": {name:null,id:null},     // 轻功
            "sword": {name:null,id:null},     // 剑法
            "throwing": {name:null,id:null},  // 暗器
            "blade": {name:null,id:null},     // 刀法
            "whip": {name:null,id:null},      // 鞭法
            "club": {name:null,id:null},      // 棍法
            "staff": {name:null,id:null},     // 杖法
            },
        perform:null,       // 当前装备的出招（perform）
        items: null,        // 武功物品（秘籍等）
        limit: undefined,   // 学习上限相关
        sk_group: undefined,// 技能分组
        books:null          // 书
    },
    store:{                 // 仓库信息
        max_store_count: undefined,  // 仓库格子上限
        sum: undefined,              // 仓库总重量/数量
        stores: []                   // 仓库物品列表
    },
    packs:{                 // 背包信息
        items:[],           //   背包物品列表
        eqs: [],            //   装备列表
        eq_group: undefined,//   装备分组
        max_item_count: undefined,  // 背包格子上限
        money: undefined    //   银两
    },
    yaota:{                 // 妖塔相关信息
        yaoyuan: 0,         //   妖元数量
        Flag: false,        //   是否在妖塔
        Count: 0,           //   层数
    },
    wsdelay: {              // 网络延迟统计（用来判断服务器卡没卡）
        delay:undefined,    //   延迟毫秒数
        SetTime: undefined, //   记录时间
        SetCount: undefined //   统计次数
    },
    selfStatus: [],         // 自己的状态列表
    fight:{                 // 战斗信息
        in_fight: false,    //   是否在战斗中
        fight_id: ""        //   战斗编号
    },
    cookie: undefined,      // 登录凭证（连接服务器用的 cookie）
    connected: false        // 是否已连接服务器
};
