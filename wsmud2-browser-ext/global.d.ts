// 全局类型声明 - 为浏览器扩展提供全局变量类型
// 【2026-08-11 结构参考】补充游戏/插件核心全局声明（参考作者仓库 global.d.ts 结构，
// 便于 IDE 提示与未来 checkJs 类型检查；纯声明文件零运行影响）

declare var $: any;
declare var jQuery: any;
declare var window: any;
declare var document: any;
declare var setTimeout: (callback: Function, delay?: number) => number;
declare var clearTimeout: (id: number) => void;
declare var setInterval: (callback: Function, delay?: number) => number;
declare var clearInterval: (id: number) => void;
declare var localStorage: any;
declare var sessionStorage: any;
declare var Blob: any;
declare var URL: any;
declare var Date: any;
declare var Map: any;
declare var Set: any;

// ---- 油猴 API（GM_API.js 提供） ----
declare var GM_getValue: (key: string, def?: any) => any;
declare var GM_setValue: (key: string, val: any) => void;
declare var GM_deleteValue: (key: string) => void;
declare var GM_listValues: () => string[];
declare var GM_addStyle: (css: string) => HTMLElement;
declare var GM_registerMenuCommand: (name: string, fn: Function) => void;
declare var GM_unregisterMenuCommand: (id: number) => void;

// ---- 游戏核心全局（页面词法全局，const 声明不挂 window，须直接访问） ----
declare var Process: any;        // 游戏消息处理/频道/主循环（ws.js）
declare var Dialog: any;         // 游戏面板/聊天/频道对象（dialog-base.js const Dialog）
declare var Combat: any;         // 战斗系统
declare var MAP: any;            // 地图
declare var Login: any;          // 登录
declare var Setting: any;        // 游戏外观/频道设置
declare var ReceiveData: any;    // 数据接收入口
declare var ReceiveMessage: any; // 主聊天区消息显示
declare var SendChatMessage: any;// 聊天发送
declare var ContainerCommand: any;// 频道/容器消息点击命令（ws.js 全局函数）
declare var unsafeWindow: any;   // 页面 window

// ---- 插件核心全局（模块间共享，经 content.js 顺序注入） ----
declare var WG: any;             // 插件主命名空间（wg-core.js）
declare var ToRaid: any;         // Raid 流程引擎
declare var UI: any;             // UI 工具（syssetting 等）
declare var TriggerUI: any;      // 触发器 UI
declare var GlobalInit: any;     // 全局初始化
declare var EventBus: any;       // 事件总线
declare var role: any;           // 当前角色信息
declare var roleid: string;      // 当前角色 ID
declare var room: any;           // 当前房间（funny2 维护）
declare var funny: any;          // funny2 暴露对象（unsafeWindow.funny）

// ---- 全局函数 ----
declare function SendCommand(cmd: string): void;           // 发游戏命令
declare function messageAppend(text: string, area?: number): void; // 日志输出
declare function receive_message(msg: any): void;          // 消息接收钩子
declare function ws_on_message(msg: any): void;            // WebSocket 消息处理
declare function textBecomeImg(text: string, fontsize: number, fontcolor: string): string;
