# CHANGELOG — 武神传说扩展 v26.1.x

## 26.3.11（2026-08-24）
- 🎒 **`@tidyBag` 增强为一键整理包裹**（`Raid.js`/`wg-combat.js`）：固定顺序
  `stopstate → 自动使用(autoUseList) → 分解(fenjieList，含随从) → 清单售卖(autoSellList) → 卖光剩余 sell all → 存仓 store all`，
  使用/分解/清单售卖均**阻塞**（轮询物品用尽/角色空闲/文本完成信号），每步给出分步进度提示（含具体物品名，清单为空提示"当前无需XX"）
- 🐛 **随从分解修复**（`wg-combat.js`）：原批量连发 `give;fenjie;give;fenjie...` 会在随从忙于上一件分解/挖矿时被打断，
  出现"你要给XX什么东西？/王语嫣要分解什么装备？/没时间这么做"等悬空提示；改为**逐件分解**，靠文本信号确认上一件完成/被拒后再发下一件
- 🎯 **自定义按钮支持 `@` 语句**（`wg-misc.js`）：按钮发送内容统一走 Raid 引擎（`ToRaid.perform`），
  既能发普通游戏命令，也能触发 `@tidyBag` 等流程/自命令（无需再手写拼接命令）
- ⏰ **「时辰已到」时钟加固为双源冗余**（`Trigger.js`）：原"精确对齐下一整秒"的 setTimeout 一旦被延迟/节流超过 1s 会**整秒跳过、到点不触发**；
  改为 **Web Worker 时钟 + 主线程对齐定时器 双源同时运行**（都调用同一去重+无条件漏秒回补函数），
  即使其中一路失效（worker 被 CSP 禁用 / 主线程被后台节流），另一路仍保证到点不漏，适合服务器长期挂机
- ⚡ **自动出招后台标签页修复**（`wg-combat.js`）：原以主线程 setInterval 驱动出招，多开时非选中窗口的定时器被浏览器节流导致**自动出招卡住**；
  改为**单 Web Worker 计时源**驱动（出招开启才创建、关闭即回收，内存开销极小，不支持 Worker 时自动回退）

## 26.3.10（2026-08-23）
- 🔒 **配置上传/下载安全修复**（`wg-auto.js`）：
  - 上传 `make_config`：由 `key.indexOf(rid)` 子串匹配改为 `_isKeyOfRole` 精确判定（`rid@`/`rid_`/`rid-` 前缀
    及 `flow_store@rid`/`global_params@rid`/`###CodeTranslator@rid`），不再因角色ID是子串而误把其他账号配置传上去
  - 下载 `load_config`：写回前用 `_isRoleKey && !_isKeyOfRole(key, rid)` 过滤，非当前角色的专属键一律跳过
  - **排除登录器账号密码库**：新增 `_isSensitiveLsKey`（cookie/session/`mud_game_account_data`/`login_name`），
    上传的 `__LS__` 打包、下载的 `__LS__` 写回两端都过滤——彻底杜绝可还原账号密码上传/还原
  - 移除失效的"清空云端"功能（服务器 `/User/Backup` 不支持覆盖，属无用按钮，已连同 `clear_config`/`clearbak` 清理）
- 🗑 **一键登录器新增「删除账号」**（`wslogin.js`）：选中账号 → 删除该账号下所有区服所有角色的全部配置
  （自命令/触发器/流程/持久变量/角色设置/游戏设置）、并移除账号库记录（`clear_role_data` 支持 silent 批量）
- 🎨 **触发器分隔符提示统一 + 「时辰已到」变量改英文**（`Trigger.js`）：
  - 所有触发器的填充提示统一为 `⚠ 填写提示：…`：多选枚举用单个 `|`，关键字/逻辑用 `||` 或/`&&` 且/`()` 括号
  - 「时辰已到」时/分/秒字段名由中文改 `hour/minute/second`（面板仍显示中文），消除中文变量名隐患
- ⚡ **Raid 新增 `@eventsall` 命令**（`Raid.js`）：同一 `dialog:events` 回包内支持 `|` 分隔的多个独立匹配分支，
  **每个分支各自对全部事件条目扫描并捕获变量、互不干扰**，一次可提取多个不同活动的数值
  （原 `@events` 遇第一条命中即 break，只能取一个）；`@events` 命令匹配改为精确（避免拦截 `@eventsall`）

## 26.3.9（2026-08-23）
- 🐛 **修复多开账号相互顶号后无法自动抢回**（`websocket-proxy.js`/`wslogin.js`）：
  - **顶号抢回机制按 roleid 隔离**：短冷却键、目标角色键由全局共享改为按角色独立，解决"两账号互切顶号时互相干扰"
    （顶 A 记的冷却挡住 B、目标键互写覆盖导致跳号）；并修正 `ext_this_window_role` 写 `sessionStorage`/读
    `localStorage` 的不一致（读不到导致抢回目标失效）
  - **移除顶号抢回的 24h 次数上限**（应要求），仅保留 30 秒短冷却防止当刻双端瞬间互相挤下线死循环
  - **根治卡死在角色/区服选择界面**：`ensureLoginScreen` 由"点一次按钮 + 硬等面板"改为"循环逐步退回登录
    界面，最多 12 秒，全程不抛错"；`handleAutoLogin` 中区服/角色面板改用新增的 `waitForElementVisibleSoft`
    （超时不中断流程，交给 `selectServerByName`/`selectRoleById` 自带轮询+校验兜底）
    —— 解决自动重登时 `操作超时: 等待 #slist_panel 失败` 导致的登录中断、角色属性为 0 卡住问题
- ⚡ **「时辰已到」触发器支持"任意/多选"自由输入**（`Trigger.js`）：时/分/秒由下拉框改为文本输入框，
  填单个数字精确匹配、`1|2|3` 多选、留空或 `*` 表示任意。例：分=0、秒=0、时留空 → **每个整点触发**，
  无需再建 24 个触发器

## 26.3.8（2026-08-22）
- 🐛 **修复 `@events` 反向捕获失效、匹配不到不置 null**（`Raid.js`）：原用 `AtCmdExecutor` 会在执行前
  `CmdPrehandleCenter` 把 `($BossName)` 提前替换成变量当前值，反向捕获占位符被吞掉 → 匹配命中也取不到值，
  且整轮匹配不上时沿用旧值（如之前的 `111`/`张无忌`）。
  **修复**：改为普通 `CmdExecutor` 自行解析参数，新增 `smartReplace`（先把 `($...)` 换成哨兵符、仅对其余
  `(Var)`/`(:预设)` 做变量替换、再还原占位符）；严格匹配事件文本，`($Name)` 作为反向捕获占位符——
  **匹配到**捕获实际文本写回变量，**匹配不到**将该变量置 `null`（走全局/临时变量原生语义）。
- ⚡ **新增后台省电模式（多开挂机降 CPU）**（`funny2.js`/`ws.js`）：
  - `funny2.js` 监听真实交互（mousedown/keydown/wheel/touchstart，**不含** keep-alive 模拟的 mousemove），
    连续 60s 无真实交互判定为后台挂机标签，暴露 `window._extLowPower()`
  - 战斗动画 `ANI_PFM`/`ANI_OBJ` 在低功耗时**跳过血条/技能条 DOM 写入**（保留状态推进与调度链，恢复交互即续播）；
    出招命令 `auto_preform`、自动帮战/触发、事件轮询、发呆检测、保活等**完全不受影响**
  - funny2 的 DOM 守护轮询改自调度动态间隔：后台 3000ms / 前台 500ms
  - 效果：战斗中后台标签 CPU 显著下降（动画重绘是最大消耗源），逻辑类功能原样保留

## 26.3.7（2026-08-22）
- 🎨 **funny2 左/中/右三栏可拖拽调整宽度**（`funny2.js`）：在 `.left` 与 `.container` 之间新增
  `.left-col-resizer`、`.container` 与 `.right` 之间新增 `.right-col-resizer`，鼠标拖拽即可调整左右栏宽度
  （200~600px，值写入 localStorage 持久化），并同步 `confirmWidth()`；hover/拖动时高亮。
  - 修复 resizer 初始位置堆叠、被 CSS `!important` 覆盖导致拖不动（改用 JS `setProperty(...,'important')`）
  - 修复切换左右两侧（`toggleLeftRight`）后两个 resizer 不再位于三栏之间、以及拖拽方向反逻辑
    （按 `_lrSwapped` 状态对 `delta` 取反，拖动方向随左右栏互换自动反转）
- 🐛 **修复给随从多件物品时数量选择框无法弹出**（`dialog-panels.js`）：交易对话框点击数量>1的物品走
  `right_click → return Confirm.Show_trade_add()`，该分支返回 `undefined`（非 `false`），jQuery 不会
  `stopPropagation` → 事件继续冒泡到 `.container`，触发 `ContainerCommand()` 末尾的 `Confirm.Close()`，
  把刚 `Show()` 出来的数量确认框瞬间再次隐藏（`display:none`）。单件物品因走 `return false` 正常。
  **修复**：用捕获阶段原生监听（`addEventListener(..., true)`）绑稳定容器 `.dialog-list`，命中
  `.obj-item` 后立即 `preventDefault()` + `stopImmediatePropagation()`，拦截冒泡到 `.container`，
  按所在列表（左/右）路由到 `left_click`/`right_click`。

## 26.3.4（2026-08-18）
- 🎨 **修复收益推送大写颜色标签不转换**（`Raid.js` `_richContent`）：实测服务器返回的颜色标签大小写不固定
  （遇到 `<HIZ>东方不败的绣花针</HIZ>`），原 `_colorMap` split/join 只匹配小写标签，
  大写标签原样输出到推送。已改为**不区分大小写的正则替换**（`/<(\/?)(hig|hir|...)>/gi`），
  `<HIZ>`/`<HiZ>`/`<hiz>` 统一转 `[紫]`，其余颜色同理。
- 🐛 **修复 events 轮查卫语句 bug**（`global-init.js`）：`data.dialog=="events"` 处理中，原代码
  `if (data.update || data.finish) { WG.SendCmd("events") } else if (data.items && Array.isArray(data.items)) { ... }`
  **卫语句顺序错误**——服务器返回带 `update`/`finish` 标记且同时携带完整 `items` 的活动数据时，
  卫语句把数据拦截，`GameState.events` 永不更新，喜宴/BOSS 检测也不执行（「组织好的逻辑没生效」）。
  **修复**：items 数据优先处理，`update`/`finish` 仅在无 items 时触发重新请求。
- 🧹 **Raid.js 拆分 + 清理**：副本数据移至 `raid-dungeons.js`（Raid.js 7082→6171 行，-13%），
  清理 `ext-26.1-temp/`、`.bak`、`_metadata`、`ws.js.formatted.js` 等冗余文件；清理 `codemirror/` 目录（未加载）、`tailwind.min.css`（2.8MB 未引用）、`JetBrainsMono-Regular.ttf`（冗余）。
- 🛡️ **NPE 安全加固**（`wg-combat.js`/`Raid.js`/`main-ready.js`）：修复 `patt.exec()` 和 `/exec/` 结果未做 null 检查导致的 4 处潜在崩溃，加强 `data.split()` 入参保护。
- 🎨 **快速使用按钮与技能按钮样式统一**（`wg-core.js`）：`.act-item.act-item-zdy` 的 `min-width`/`padding` 改为与 `.pfm-item` 一致，去掉 `line-height: unset` 消除高度差异，`.zdy-commands` 容器添加 `style="font-size:0.9em"` 与游戏底部栏一致。

## 26.3.5（2026-08-19）
- ✨ **新增发呆检测功能**（`config-vars.js`/`ui.js`/`wg-auto.js`/`global-init.js`/`Raid.js`）：右键设置新增发呆检测区域，可设置秒数阈值和自定义命令，超时自动执行或推送提醒；支持 `@idle_cmd` 命令（开/关/状态/设置）。
- 🎨 **`(:eqFind)` 品质筛选优化**（`Raid.js`）：搜索装备时只返回 grade 5+ 的物品，排除低品质同名物品干扰；未来 grade6 自动兼容。
- 🎨 **funny2 左侧按钮布局重排**（`funny2.js`）：改为 4行×6列布局，新增回家（含花园/练功房等子菜单）、帮派（含仓库/聚义堂等子菜单）按钮。
- 🎨 **字体继承与房间地图居中**（`funny2.js`/`extension-manager.js`）：`.left, .right` 继承 `.container` 字体，`MutationObserver` 同步；`room_exits` 内 SVG 居中显示。
- 🐛 **修复企业微信推送不换行**（`audio-push.js`）：字面 `\n` 转真正换行符，`<br>` 转 `\n`，改用 `markdown` 消息类型，实现企业微信消息换行。

## 26.3.6（2026-08-21）
- 🐛 **修复右键换装装备技能不生效**（`wg-equip.js`）：装备换装判断条件`myEqs.indexOf(id)<0`写反，改用`Set.has()`修正；背包ID字符串拼接无分隔符导致子串误匹配，改用`Set`精确匹配；技能换装`ski.type`属性不存在导致命令不生成，改为直接通过`enableSkills[key]`对比技能ID。
- 🐛 **修复自定义按钮保存后不显示**（`wg-auto.js`/`wg-misc.js`）：新角色`inzdy_btn`默认为`false`，保存后调用`zdy_btnListInit()`重新读取默认值导致按钮被隐藏，改为保存后直接设置`inzdy_btn=true`并调用`WG.zdy_btnshow()`。
- 🐛 **修复代码编辑器双倍Tab缩进**（`utils.js`/`main-ready.js`）：`createRaidEditor`和`enableTabIndent`两个keydown监听器各插入4空格，导致按Tab得到8空格。`createRaidEditor`中Tab只处理自动补全选中，缩进统一交给`enableTabIndent`；`#testmain`补上缺失的`enableTabIndent`调用。
- 🐛 **修复自定义按钮空值显示**（`ui.js`）：`zdybtnui()`渲染时过滤掉name为"无"或send为空的按钮，仅显示有实际值的按钮。
- 🎨 **自定义按钮添加键盘快捷键**（`keyboard.js`）：Q/W/E/R/T/Y直接触发对应自定义按钮，仅在`inzdy_btn=true`且按钮存在时生效，不干扰聊天/输入框/对话框的正常按键。
- 🧹 **清理`(:eqAttr)`预设变量残留**（`Raid.js`）：移除`eqAttrPattern`解析循环及所有注释/日志中的`eqAttr`引用，`(:eqHas)`功能不受影响。
- 🎨 **三种模式字体与布局统一**（`funny2.js`）：修复原版/flat/色弱模式下`<div class="channel">`字体大小不一致、raidToolbar文本不居中及颜色丢失问题。
- 🎨 **funny2配色统一边距优化**（`funny2.js`）：统一三个界面配色时左右边距变大，调整`.left, .right`的`margin: 0 5px`修复。
- 🛡️ **XSS安全加固**（`funny2.js`）：`Str2Obj()`改用`JSON.parse`替代`new Function()`；`DeepCopy()`支持数组类型。
- 🧹 **清理冗余文件**：移除`codemirror`目录、`tailwind.min.css`、TTF字体，减少扩展体积约3.2MB。

## 未发布改动（manifest 仍为 26.3.2）
- ✨ **流程/触发代码编辑器升级**（`utils.js`，移植作者 26.2.4 提交 a32bf5d）：
  - **自动补全**：内置 Raid 词典（35+ `@` 命令、`#` 指令、`[if]/[while]` 控制流、`(:变量)` 与触发变量），
    输入 `@`/`#`/`[`/`(` 或 2 字符弹出，`Ctrl+Space` 手动触发，↑↓/Enter/Tab/点击/悬浮选择，Esc 关闭
  - **行号**：左侧行号栏，按真实行高精确计数（支持自动换行折行），滚动与编辑区同步
  - **智能编辑**：Enter 自动缩进（块头 +4）、Tab=4 空格、自动补全括号/引号、退格删配对、**括号配对高亮**
  - 保留原有语法高亮（`RaidScriptColors`/`highlightRaidSyntax` 不变），`createRaidEditor(textareaId, options)`
    接口不变 → 触发/流程编辑框自动生效
- ✨ **新增 Raid 阻塞自命令 `@zmlwait 自命令名`**（`Raid.js`/`websocket-proxy.js`）：
  流程/触发源码里用 `@zmlwait 名称` 替代非阻塞的 `$usezml 名称`，会等自命令**执行完再继续**，
  无需手动传变量 + `@until`。
  - 类型0（命令串）：发给 `WG.SendCmd`，轮询命令队列清空 + 400ms 稳定（覆盖 `$wait` 连锁补发，60s 兜底）
  - 类型1（Raid流程）：启动子流程并等它跑完；**【2026-08-17 修复】改用裸 Performer 静默运行，
    不进「运行中流程」面板，面板只保留主流程一条**
  - 类型2（JS）：同步执行，若返回 Promise 则等它
  - `websocket-proxy.js` 新增暴露 `unsafeWindow.__extCmdQueueIdle()`；新增测试 `zmlwait-test.js`（10 项）
- 🐛 **已知问题：`.channel` 字体大小在切换配色时变化**（`extension-manager.js`/`funny2.js`）：已在 `fontsize` 分支加入 `.channel` 同步，但问题未完全修复，待进一步排查

## 26.3.3（2026-08-17）
- 🐛 **修复收益推送颜色问题**（`Raid.js`）：
  1. **去掉数量部分的无关 `[灰]` 前缀**：原来 `<wht>1046块</wht>` 被转为 `[灰]1046块`，现在数量和单位不带颜色标签，保持纯文本。
  2. **修正颜色映射**：原来 `<hic>` 青色、`<hiz>` 蓝色的映射有误。修正为 `<hic>` → `[蓝]`、`<hiz>` → `[紫]`（服务器只返回小写标签，无大写）。
- 🔧 **统一版本号来源**（`content.js`/`GM_API.js`）：content.js 最先将版本号写入 `localStorage`（`wsmud_version`），GM_API.js 从此处读取。不再依赖服务器返回的旧版本（0.0.32.301）。升级时只需改 manifest.json 的 version 字段，无需修改代码。



## 26.3.2（2026-08-16）
- 🎨 **收益推送保留颜色信息**（`Raid.js`）：新增 `_richContent`，将收益内容中的游戏颜色标签（`<hir>`红/`<hig>`绿/`<hiy>`黄/`<hic>`青/`<hiz>`蓝/`<hio>`橙/`<wht>`灰 等）转为 `[颜色]` 前缀纯文本（如 `[黄]七伤拳残页 24200文`），推送到企业微信时直接显示为 `[黄]七伤拳残页` 等格式，无需额外格式转换；推送内容仍使用 `msgtype: "text"` 发纯文本，`_plain` 及持久变量 `_lastGains` / `(:gains)` 仍为无标签纯文本，流程引用不受影响。

## 26.3.1（2026-08-16）
- 🎨 **企业微信推送收益保留颜色**（`Raid.js`/`audio-push.js`）：新增 `_richContent` 富文本版本，将游戏颜色标签（`<hig>`绿色 / `<hic>`蓝色 / `<hiy>`黄色 / `<HIZ>`紫色 / `<hio>`橙色 / `<wht>`灰色）转为 `<font color>` 标签；`audio-push.js` 企业微信渠道（case "6"）检测内容含 `<font` 时自动切换为 `msgtype: "markdown"` 推送，其余渠道保持纯文本不变。`_plain` 及持久变量 `_lastGains` / `(:gains)` 仍为无标签纯文本，流程引用不受影响。

## 26.3.0（2026-08-16）
- ✨ **新增 wsmud2.cn 域名支持**（`manifest.json`/`rules.json`）：`host_permissions`、`content_scripts.matches`、`web_accessible_resources.matches` 三处同步增加 `*://*.wsmud2.cn/*`；`rules.json` 的 `/dist/ws.js` 拦截规则增加 `wsmud2.cn` 到 `requestDomains`，屏蔽旧版 ws.js 的 DNR 规则覆盖到新域名。

## 26.2.3（2026-08-15）
- 🐛 **修复「快速使用」按钮边框丢失**（`wg-core.js`）：上一版 CSS 覆盖中 `border: unset` 误删了按钮的灰色边框线，去掉该属性后边框恢复正常，尺寸与技能按钮一致。

## 26.2.2（2026-08-15）
- 🐛 **修复「快速使用」自命令按钮尺寸异常**（`wg-core.js`）：
  `.act-item.act-item-zdy` 按钮因继承 `.zdy-item` 的大尺寸（`min-width:2.5em`/`padding:0.4em`/`line-height:24px`），
  与游戏原生房间命令按钮 `.act-item`（如「挖矿」「修炼」）及技能按钮 `.pfm-item` 大小不一致。
  新增更具体的覆盖规则，让 `act-item-zdy` 回退到游戏原生 `.act-item` 尺寸。

## 26.2.1（2026-08-15）
- 🎛️ **「自动攻击」按钮显示开关状态**（`wg-combat.js`/`wg-misc.js`/`helpers.js`/`wg-auto.js`）：
  按钮文字从固定「自动攻击」改为「自动攻击：开 / 自动攻击：关」，与「代码：开/关」按钮一致。
  点击按钮、自命令 `T.stoppfm`/`T.startpfm`、设置面板切换时都会实时刷新。

## 26.2.0（2026-08-15）
- ✨ **新增发呆计时预设变量**（`Raid.js` / `wg-combat.js`）：
  - `(:idle)` —— 当前是否处于「发呆且不在战斗」（`(:state)==发呆 && (:combating)==false`），true/false
  - `(:idle_time)` —— 该状态**连续持续秒数**，引用时实时计算
  - 自动维护：离开发呆（如开始挖矿/修炼/打坐）或进入战斗 → 归 0；回到发呆 → 从此刻重新计时
  - **开始挂机自动重置**：调用挖矿/修炼/钓鱼（`WG.zdwk`）时自动 `Role.resetIdleTime()`
  - 流程/触发中可手动重置：`@js Role.resetIdleTime()`
  - 触发器的「执行源码」本质就是 Raid 流程，所以 `(:idle)` / `(:idle_time)` 在**流程和触发中都能直接用**
  - 示例：`@until (:idle_time) >= 60`（发呆满 1 分钟再继续）、`[if] (:idle_time) > 300` 时推送提醒

## 26.1.27（2026-08-15）
- 🔧 **开关设置兼容布尔值**（`audio-push.js`/`chat-display.js`/`global-init.js`/`helpers.js`/
  `skill-timers.js`/`websocket-proxy.js`/`wg-auto.js`/`wg-combat.js`/`wg-core.js`/`wg-misc.js`/`keep-alive.js`）：
  所有「开/关」设置从只认 `"开"` 扩展为同时接受 `"开" / true / 'true'`（关闭为 `"关" / false / 'false'`），
  修复旧配置/导入数据存成布尔值时功能被误判为关闭的问题。涉及：pushSwitch、rainbow_name、getitemShow、
  zdyskills、addr、automarry、autoBoss、busy_info、auto_pfmswitch、auto_pfm_mode、dpssakada、
  onekey_fenjie、follower_fenjie、funnycalc、ext_sync_global、skillCD、buffCD、auto_relogin、
  auto_recover、shieldswitch、saveAddr、_keepalive。
- 🐛 **修复「设置 → 扩展 → 导入」必失败**（`dialog-panels.js`）：导入回调调用混淆解码函数 `_t1040(...)`，
  该函数只存在于被 rules.json 屏蔽的游戏原版 dist/ws.js，扩展自带 ws.js 无此函数 → 点击导入直接
  ReferenceError。已反混淆为等价普通代码（JSON.parse / setting / refresh_list / save_extend），
  `武神扩展.json` 可正常导入。
- 🧭 **快捷面板位置统一到左侧 `.WG_log`**（`wg-combat.js`/`wg-misc.js`）：定时任务、清空数据、自定义按钮
  三个配置面板原渲染到右侧 `.WG_log_log` 或走异步队列导致按钮绑定不上；现统一为
  `messageAppend(html, 2, null, true)` 同步渲染到左侧，按钮/任务列表正常可用。
- 🐛 **修复两处 `!typeof x instanceof Array` 恒为 false**（`wg-auto.js` L262/L1048）：存储损坏时
  `zml`/`zdyskilllist` 不会重置为数组，后续 `for..of` 抛错；改用 `Array.isArray`。
- 🛡️ **收包口容错**（`wg-misc.js`）：`receive_message` 解析服务器 JSON 加 try/catch，损坏/截断数据
  降级为文本消息并记录，不再中断整条消息管线。
- 🔒 **安全加固**（`content.js`）：`openHtmlFile` 桥监听补 `event.source === window` 校验，
  防止第三方 iframe 伪造桥消息触发开页。
- ✉️ **推送修复**（`audio-push.js`）：Server酱/Qmsg 消息文本 URL 编码（含 `&`/`#`/中文不再截断）；
  Raid 引擎缺失提示 URL 去掉末尾空格与多余 `.location`（`websocket-proxy.js`）。
- 💬 **popup 体验**（`popup.js`）：`sendMessageToActiveTab` 统一处理 `chrome.runtime.lastError`，
  非游戏页点导出/导入时提示"请先打开游戏页面"而非"未知错误"。
- 🧹 **清理扩展目录垃圾文件**：所有 `*.bak*`、`.idea/`、`_metadata/` 移出扩展目录，
  归档到项目根 `_ext_backup_2026-08-15/`（未物理删除，确认无需回滚后可整目录删除）。
- 📏 **版本规则启用**：自本版起，任何功能新增（次版本 +1）或 bug 修复（修订号 +1）都必须同步升级版本号，
  并在 CHANGELOG 记录。

## 26.1.26（2026-08-14）
- 🛡️ **稳定性加固（A 组）**：
  - **`{r` 未闭合命令防空引用**（`wg-combat.js`）：自命令里写 `{r木头`（缺 `}`）时 `rep` 为 null，
    原代码 `rep[1]` 直接抛错中断 SendCmd；加 `if (rep && rep[1])` 守卫后原样发送不崩溃。
  - **Raid.js `patt.exec` 空值审计**（`Raid.js`）：全量核查 21 处 `patt.exec` —— 19 处已有
    `while (r != null)` / `if (result)` 保护；修复 2 处真实缺口：① 条件断言 L845（文本经
    `<tag>` 替换后可能不再匹配）→ exec 为 null 时按"条件不满足"返回 false；② 变量赋值执行器 L1311
    （`handle()` 解析占位符可能改变命令文本使 exec 失配）→ null 时直接返回。杜绝流程文本异常导致崩溃。
  - **脚本加载失败游戏内提示**（`content.js`）：某个 ws-js 脚本加载失败时，除了控制台报错，
    全部加载完会在**游戏日志区**打出 `<hir>⚠️ 插件脚本加载失败：xxx，相关功能可能缺失，建议刷新页面重试</hir>`，
    挂机十几开也能一眼发现问题。
- 🛠️ **一键打包脚本**（新增 `package.cmd` + `package.ps1`，位于工作区根目录）：双击 package.cmd 即可——
  语法检查（有 node 才跑）→ 读 manifest 版本号 → 打包 zip（排除 .bak*/.idea/_metadata，正斜杠条目跨平台可解压）
  → 打印 SHA256。下次分享一行命令搞定。
- 🗑️ **取消 popup 的三项功能（用户决定）**：批量登录、多开窗口、快捷入口整体移除——
  `popup.html`/`popup.js` 恢复为「插件控制 + 数据管理」两个卡片；`content.js` 移除
  `getAccounts`/`getGameInfo`/`callPageFunction` 消息处理与桥函数；`wslogin.js` 移除
  `handleBatchUrl`（`?ext_batch=` URL 入口）与 `wsAutoLogin` 外部暴露。
  **保留**：对一键登录有实际价值的选服/选角稳健性修复（`selectServerByName`/`selectRoleById`，
  修的是手动一键登录"只登录账号不选角色"的 bug，非批量登录功能）；`loginToRole` 仍被断线自动重登复用。
- ⚡ **脚本并行加载**（`content.js`）：30+ 脚本从"串行 Promise 链（一个下载完才下一个）"改为
  **一次性按原顺序插入 + `async=false`**（浏览器并行抓取、按插入顺序执行，依赖顺序完全不变），冷启动明显变快。
- 🎨 **CDN 样式本地化**（`content.js`/`main-ready.js`/`manifest.json`）：右键菜单（jquery.contextMenu）、
  layer、font-awesome 样式不再依赖第三方 CDN，全部改为扩展本地文件
  （`ws-js/lib/skin/` + 新目录 `ws-js/lib/fonts/`，字体已一并内置），CDN 挂掉不再丢界面样式。
- 🗑️ **取消一键登录主密码保护功能（用户决定）**：AES-GCM 加密方案整体回退（`wslogin.js`/`content.js`/`background.js`），
  恢复原 base64 编码。若本地残留旧 v2 密文数据，解密时会提示"重新登录一次以重新保存密码"。
- 🧭 **popup 快捷入口**（`popup.html`/`popup.js`/`content.js`）：新增"综合工具网页版"（一键开内置工具页）、
  "游戏内设置"（经桥调用 `WG.setting` 打开游戏内插件设置面板）两个按钮。
- 📚 **新增 `ws-js/features/Raid-指令清单.md`**：Raid.js 6928 行的"命令地图"
  （预编译/编译器指令、全部 @ 命令、# 配置命令、变量系统，均带行号），后续改 Raid 前先查它。
- 📚 **新增 `ws-js/core/ws.js.formatted.js`**：ws.js 的 prettier 格式化副本（仅参考，不加载），便于 diff 排查。
- 🔒 **安全加固：postMessage 消息来源校验**（`main-ready.js`）：游戏页接收的 window 消息现在只信任——
  本窗口自身脚本（`event.source === window`）、外部登录器（`event.source === window.opener`）、
  同源 iframe（`event.origin === location.origin`）。第三方 iframe / 陌生窗口的注入命令一律忽略；
  `#js` 任意代码执行进一步收紧为**仅本窗口自身消息**可用。防止页面内嵌广告/统计 iframe 盗号或操作角色。
- 🔒 **安全优化：自命令 $ 指令去掉 eval**（`wg-combat.js`）：`SendCmd` 原实现把命令文本拼进
  `eval("T.xxx(...)")` 执行（命令里含单引号/换行会语法错误甚至注入代码）。改为 `TaskHelper_call`
  直接函数分发（hasOwnProperty 校验防原型链污染），行为完全一致。
- ⚠️ **导出配置安全提示**（`content.js`/`popup.js`）：备份文件含一键登录账号数据（可还原的密码）时，
  导出前弹出警示确认，提醒妥善保管。
- ⚡ **性能：物品/角色名剥标签改正则**（`global-init.js`）：原 `$('<body>'+name+'</body>').text()`
  每次造 DOM 节点剥 HTML 标签，改为 `_plainName()` 正则 + 实体单遍解码（`&nbsp;` 保留为 `\u00a0`，
  与 jQuery .text() 语义一致），进房间/刷物品高频路径不再反复创建 DOM。
- ⚡ **性能：CD/Buff 倒计时合并为单一主时钟**（`skill-timers.js`）：原每个技能/Buff 各开一条递归
  setTimeout 链（200ms~1s 一 tick，每 tick 全页查询），改为一个 200ms 主时钟统一推进所有登记项；
  显示文本无变化时不再重写 DOM（长 CD 从 5 次/秒降到 1 次/秒）。对外函数签名不变。
- 🐛 **修复：`SettingsStore.GetJson` 永远返回空字符串的死代码**（`audio-push.js`）：改为 Promise 风格。
- 🐛 **修复：推送接口 `$.ajaxSetup` 污染全局 ajax 配置**（`audio-push.js`）：PushPlus/飞书改单请求配置。
- 🐛 **修复：`KEY.dialog_confirm` 使用已废弃的全局 `window.event`**（`keyboard.js`）：event 由 KEY.e 传入。
- 🐛 **修复：日志错误限频计数从不显示**（`logger.js`）：10 秒窗口过期后输出累计次数 (xN)。
- 🧹 **剪贴板 API 现代化**（`GM_API.js`）：优先 `navigator.clipboard.writeText`，失败回退老方案。
- 🧹 **popup 版本号自动读取**（`popup.html`/`popup.js`）：不再手写 26.1.x，从 manifest.json 自动读取。
- 🐛 **修复：武道塔提醒文案重复**（`global-init.js`）："武道塔累积X天" 原来说了两遍，改为单句。
- 🐛 **修复：获得经验统计的 id 拼写**（`global-init.js`）：`#total`/`#totla` 不一致（typo），统一为 `#totla`。
- 💬 **popup 开关关闭提示**（`popup.js`）：关闭总开关/funny2 时明确提示"需刷新游戏页才完全生效"（原实现静默，用户会误以为立即生效）。
- 🔗 **PushPlus 推送升级 https**（`audio-push.js`）：原 http 在游戏站将来上 https 后被混合内容拦截。
- 🐛 **修复：Buff 倒计时到期丢失 shadow 星标**（`skill-timers.js`）：到期恢复"名字 + shadow"，与 clear 路径一致。
- 👤 **popup 显示当前角色**（`popup.html`/`popup.js`/`content.js`）：多开十几窗时点开 popup 立刻知道当前标签页是哪个号（新增 `getGameInfo` 桥）。
- 📣 **设置面板新增"测试推送"按钮**（`ui.js`/`wg-auto.js`）：一键验证 Server酱/企业微信等渠道通不通。
- 🖥️ **popup 新增"打开游戏页面"按钮**（`popup.html`/`popup.js`）。
- ⚠️ **Raid 云端导入安全警示**（`Raid.js`）：下载/导入云端分享的流程、触发器时，若源码含可执行任意代码的 `@js`/`#js` 指令，弹窗确认信任来源后再导入。
- 🔑 **去掉 manifest 的 `tabs` 权限**（`manifest.json`）：popup 的 query/sendMessage 靠 host_permissions 即可，权限提示更收敛。
- 🔒 **版本接口升级 https + 超时**（`GM_API.js`）：`http://` → `https://`（实测可用）+ 3 秒超时 + JSON 解析保护。
- 🧹 **死代码清理**：`chat-display.js` 注释掉的 AutoScroll 旧实现、`audio-push.js` 无人调用的 `GetJson` 已删除。
- 📚 **新增文档**：`ws-js/modules/dialog-panels-面板清单.md`（25 个弹窗面板地图）、
  `ws-js/features/Trigger-模板清单.md`（15 个触发器模板）；`00-必读-扩展说明.md` 同步更新（路径/新文件）。
- 🛠️ **新增 `check-syntax.js`**：一键 `node check-syntax.js` 语法检查全部 43 个 js（改完代码先跑它再刷新插件）。
- 🖥️ **popup 多开窗口总览**（`popup.html`/`popup.js`）：列出所有游戏标签页的 角色@房间，点击切换过去，多开十几窗一眼全览（原"当前角色"单行显示升级为列表）。
- ⚠️ **导入配置安全警示**（`content.js`/`popup.js`）：导入的配置文件若含"可执行/自动操作"项（登录后执行命令、自命令、触发器、定时任务、扩展脚本、Raid 持久变量等），先弹窗确认来源再写入。
- ⚡ **funny2 角色信息 DOM 节流**（`funny2.js`）：hp/mp 等高频属性写入合并到同一宏任务批量刷新，不再每次 set 都操作 DOM。
- 🔗 **websocket-proxy 多连接防御**（`websocket-proxy.js`）：每个替身实例绑定自己的真实连接（this._ws），多连接时 send/close 不再错发到"最后一个连接"；单连接行为完全不变。
- 🔄 **跨窗口全局设置同步**（`GM_API.js`/`content.js`/`ui.js`/`wg-auto.js`/`config-vars.js`/`global-init.js`）：设置→杂项配置 新增"跨窗口同步全局设置"开关（默认关）；开启后屏蔽/推送/保活等 `_` 开头全局设置变更自动广播到所有游戏窗口（带抑制标记防循环，同步后即时刷新全局变量无需刷新页面）。
- 🔍 **游戏内设置面板搜索框**（`wg-auto.js`）：设置面板顶部新增搜索条，输入关键词即时过滤设置项与分组。
- 📣 **多开批量操作**（`popup.html`/`popup.js`）：popup 新增红色"全部停止挂机"按钮，一键给所有游戏窗口发 `stopstate`。
- 🐲 **BOSS 刷新推送**（`global-init.js`）：检测到设置的目标 BOSS 已刷新可领取 → 自动推送到手机（15 分钟防重复）。
- 📚 **新增文档**：`ws-js/modules/TaskHelper-函数清单.md`（35 个自命令 T.函数 的完整清单）、
  `ws-js/modules/设置项清单.md`（全部设置项/存储键/默认值/面板位置对照表）。
- 🚀 **批量登录**（`popup.html`/`popup.js`/`content.js`/`wslogin.js`）：popup 新增「批量登录」卡片——
  选账号 → 选区服 → 多选角色 → 一键为每个角色开新窗口并自动登录。
  实现：popup 经 content 桥读取一键登录账号列表（**密码绝不带出页面**）→ 打开 `?ext_batch=账号|区服|角色ID`
  的新窗口 → 页面加载后 wslogin 自动走完整登录流程（`loginToRole`，同时重构了 autoRecoverLogin 复用同一逻辑；
  对外暴露 `wsAutoLogin(账号,区服,角色ID)`，登录成功后自动清理 URL 参数防重复登录）。
- 🖥️ **多开窗口状态区分修复**（`popup.js`）：原来"通信失败"（改扩展后旧窗口没有重新注入 content 脚本）
  会被误显示为"未登录"。现在分三种状态：`角色@房间`（已登录）/ `未登录`（有脚本没登录）/ `未响应·点击刷新`
  （点一下自动刷新该窗口重新注入插件脚本，并自动补查一次）。
- 🐛 **修复：批量登录/一键登录只登录账号、不选角色**（`wslogin.js`）：
  - 根因① 游戏服务器列表项文本是「武神传说2 + 服务器名」（ws.js L1405），原逻辑用 `text() === server`
    精确匹配**永远匹配不上**（手动登录没暴露是因为单服用户默认选中第一个服务器）；
  - 根因② 角色列表是**异步渲染**的，原逻辑"面板可见后固定等 500ms 就点"在全新窗口/慢网络下角色还没渲染出来，
    点击落空 → 卡在选角界面；
  - 修复：新增 `selectServerByName`（包含匹配+点击后校验选中，轮询重试 10s）与
    `selectRoleById`（等目标角色项渲染出来+点击+校验 `.select` 确为目标的 roleid，轮询重试 15s），
    两条登录路径（完整流程 + 直接选角）都改用稳健选服/选角；登录前先等 `#login_name` 表单出现。
  - 顺手：popup 与登录弹窗的区服下拉显示去掉「武神传说2」前缀（值保持完整键用于匹配）。
  - 配套 `login-flow-test.js`：8 项模拟测试验证选服/选角逻辑（含复现旧 bug、异步渲染、找不到目标的边界）。

## 26.1.25（2026-08-13）
- 🏷️ **推送前缀只留角色名**（`audio-push.js`）：去掉 ID，只显示「【张三】」。
- 🧩 **收益数据存入流程变量**（`Raid.js`）：`recordGains->` 结算时收益转纯文本，同时存两处供流程引用——
  - `:gains` 预设变量（= `Role.profitInfo`，改为纯文本）；
  - **持久变量 `(_lastGains)`**（`PersistentVariables.save`，存 localStorage，刷新后仍在）。
  - 流程里可直接拼用，例如：`@push 本次收益：(_lastGains)` 或聊天里贴 `(:gains)`。
  - 自动推送保留（10 分钟防重复），内容同样用纯文本。

## 26.1.24（2026-08-13）
- 🏷️ **自动推送带角色标识**（`audio-push.js`）：所有自动推送（收益统计/掉线/死亡/长时间无消息）自动在消息前加「角色名(角色ID)」，十几开挂机时一眼分辨是哪个号的推送。
  - 例：「【张三(123456)】💰 收益统计(12:30)：* 木材 5 ...」
  - 角色名取 `Role.name`（登录时从角色列表读取），取不到则用角色 ID；手动 `@push` 不受影响（走 Push 不走 PushAlert）。

## 26.1.23（2026-08-13）
- 💰 **收益统计推送到手机**（`Raid.js`/`audio-push.js`）：`recordGains->` 结算战利品时，除了游戏内显示，同步把收益明细推到手机（企业微信等，推送总开关未开则静默）。
  - 收益文本自动去 HTML 标签转纯文本，带时间戳（如「💰 收益统计(12:30)：* 木材 5 * 银两 1000」）。
  - `recordGains->silent` / `recordGains->nopopup` 模式同样推送（适合"游戏内静默统计 + 手机看收益"的挂机场景）。
  - `PushAlert(tag, text, interval)` 新增第三参数自定义防重复间隔；收益类用 10 分钟（比默认 15 分钟宽松，避免连续副本吞掉统计）。

## 26.1.22（2026-08-13）
- 🐛 **修复企业微信推送不生效（CORS 跨域拦截）**（`audio-push.js`）：企业微信 webhook 接口**不支持浏览器跨域**——原 `$.post` + `application/json` 会触发浏览器 OPTIONS 预检，被企业微信 403 拒绝，请求根本没发出去（服务器 curl 直连却能成功，这就是"webhook 有效但扩展推送没反应"的原因）。
  - 修复：改用 `fetch` + `mode:'no-cors'` + `Content-Type: text/plain`（简单请求不发预检），body 仍为标准 JSON，**已验证企业微信接受 text/plain 格式**（errcode:0）。
  - 影响：仅企业微信渠道；Server酱/Bark/Qmsg 为 GET 简单请求不受影响。

## 26.1.21（2026-08-13）
- 🏢 **新增推送渠道：企业微信机器人**（`audio-push.js`/`ui.js`）：免费、量大、国内快，适合服务器无人值守推送。
  - 设置 → 推送配置 → 方式选「企业微信机器人」，Token 填机器人 Webhook 地址 `key=` 后面那串（如 `aaaa-bbbb-cccc`）。
  - 实现：POST `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<Token>`，JSON `{"msgtype":"text","text":{"content":消息}}`。

## 26.1.20（2026-08-13）
- 📱 **无人值守推送**（`audio-push.js`/`config-vars.js`/`wg-misc.js`/`websocket-proxy.js`/`wslogin.js`/`global-init.js`/`ui.js`）：服务器无人值守场景，关键事件自动推送到手机——
  - **掉线重连失败**（约 13 分钟 / 20 次后）→ 推送「掉线且重连失败，正在尝试自动刷新重登」；
  - **自动重登失败**（无已保存账号 / 登录流程出错）→ 推送失败原因；
  - **角色死亡 / 复活**（`die` 消息 `data.relive` 判断）→ 推送「角色死亡」/「已复活」；
  - **长时间无消息**（默认 15 分钟收不到任何服务器消息，`receive_message` 记时间戳 + 每分钟检查）→ 推送「疑似卡死或断线」，恢复后推送「已恢复」。
  - 复用现有推送渠道（Server酱/Bark/PushPlus/飞书/Qmsg）；新增 `PushAlert(tag,text)` 防刷屏：**同类事件 15 分钟最多 1 次**，推送总开关未开时完全静默（不打扰）；无消息检测靠全局消息入口时间戳，不误伤。

## 26.1.19（2026-08-13）
- 🔄 **自动恢复增强**（`websocket-proxy.js`/`wslogin.js`/`config-vars.js`/`ui.js`/`wg-auto.js`/`global-init.js`）：服务器无人值守场景，自动重连仍失败（约 13 分钟 / 20 次）后不再干等——
  - 自动刷新游戏页面，刷新前写 `ext_auto_recover_flag` 标记；
  - 页面加载后登录器检测到标记，自动按**上次登录的账号/区服/角色**重新登录（无上次记录则取第一个账号/区服/角色），登录完即删标记；
  - 防循环：距上次刷新至少 10 分钟、24 小时内最多 5 次，超限停止等手动；无已保存账号时停在登录界面不循环；
  - 设置 → 「重连失败后自动刷新重登」开关（默认开，仅影响重连失败后的恢复行为，正常登录不受影响）。

## 26.1.18（2026-08-13）
- 🩺 **挂机健康自检**（`config-vars.js`/`wg-misc.js`/`ui.js`/`wg-auto.js`/`global-init.js`）：设置 → 「挂机健康自检」开关（默认开），每 5 分钟兜底检查：
  - 消息队列积压 > 500 条 → 强制渲染（防内存堆积）；
  - 日志超长 → 主动裁剪（超 8000 行裁最旧，追加路径之外再兜底一次）；
  - 页面 DOM 节点超 2.5 万 → 提示一次建议刷新（不自动删游戏节点，避免误伤；降到 1.5 万以下可再次提示）；
  - 配置存储超 5MB 的 85% → 提示用「扫描孤儿键」清理。
  - 开关关闭时立即停掉定时器；提示均带"首次/恢复"防刷屏机制。

## 26.1.17（2026-08-13）
- 🧹 **存储孤儿键扫描与清理**（`GM_API.js`/`ui.js`/`wg-auto.js`）：设置 → 系统 新增「扫描孤儿键」「备份并清理」两个按钮。
  - 孤儿键 = 角色删除/改名后残留的扩展配置键（角色ID前缀、`flow_store@`、`global_params@`、`###CodeTranslator@`），只处理扩展写入的键，绝不碰游戏自身键。
  - 判定基于「已知角色白名单」（一键登录保存过的所有角色 + 当前登录角色）；白名单为空（从未用一键登录且未登录）时拒绝扫描，避免误删。
  - 清理前自动备份孤儿键到 `ext_orphan_backup_<时间戳>`，确认备份写成功才删除；清理后刷新顶部存储占用显示。

## 26.1.16（2026-08-13）
- 🗑️ **取消挂机看门狗功能（用户决定，意义不大）**：移除 26.1.15 新增的「流程无进展自动暂停」全部代码（`config-vars.js` 4 个变量、`wg-misc.js` 3 个函数 + 9 处消息 kick、`Raid.js` 每步 kick、`ui.js`「挂机保护」分组、`wg-auto.js` 绑定/回显、`global-init.js` 读取/启动）。
- 其余功能不变：编辑器高亮、自动买符、活动轮询间隔、物品合并、CD 颜色、配置备份等。

## 26.1.15（2026-08-13）
- ✏️ **代码编辑器语法高亮（作者 26.2 增强版）**：@js 行走 JS 高亮（关键字粉色/模板字符串），10 色板；三个代码框启用。
- 🛒 **自动买符开关** + **活动轮询间隔可配置**（作者 26.2）：设置面板「自动买符与活动轮询」分组；自动买符默认关；轮询间隔默认 1 分钟、改后立即生效。
- 🗑️ **取消物品日志双页菜单**（显示有问题，用户决定）；保留物品/金钱刷屏合并。
- 🐕 **挂机看门狗：流程无进展自动暂停**（`config-vars.js`/`wg-misc.js`/`Raid.js`/`ui.js`/`wg-auto.js`/`global-init.js`）：
  - 防白挂：流程运行中若**长时间无任何进展**（游戏消息 / 流程每步执行都不算数）→ 自动**暂停**全部运行流程并提示（可恢复）。
  - 「进展」信号：游戏消息（9 处消息入口）+ 流程每执行一步（_perform）；看门狗每 10 秒检查。
  - 设置面板「挂机保护」分组：「流程无进展自动暂停」开关（默认开）+「无进展判定时间（分钟）」（默认 5，最小 1）。
  - 安全设计：仅流程运行时才计时；暂停而非停止（流程列表可恢复）；防重复提示。


## 26.1.14（2026-08-12）
- ⛔ **取消代码编辑器语法高亮（用户决定）**：移除 `utils.js` 的 createRaidEditor/highlightRaidSyntax/RaidScriptColors 三件套及 Raid/Trigger 三处调用（overlay 高亮在部分环境不显示，彻底放弃）。
- 代码框最终形态：**原生 textarea + 黑底灰字 + Tab 缩进（enableTabIndent）+ 14px 等宽 + spellcheck 关闭**（保留，不依赖任何编辑器库）。
- 保留 26.1.13 其余功能：物品/金钱合并、聊天点击玩家名修复、物品日志双页菜单、CD 颜色配置、弹窗 sync 修复。


## 26.1.13（2026-08-12）
- 📥 **移植作者 f45137e**：
  - **物品/金钱刷屏合并**（`wg-misc.js`）：「你获得了」500ms 聚合（中文数字转换 + 铜板/银两/黄金进制换算），扫副本刷屏压成一条。
  - **聊天点击玩家名修复**（`chat-display.js`）：`cmd='look3 <uid>'` 事件委托，点玩家名看玩家恢复。
  - **代码编辑器语法高亮**（`utils.js`/`Raid.js`/`Trigger.js`）：作者 overlay 方案（textarea 透明层 + pre 高亮层，两层同排版 pre-wrap 对齐）三件套，三个代码框启用。
- 🗂️ **右侧日志区双页菜单**（`ui.js`/`funny2.js`/`wg-misc.js`）：普通日志/物品日志 tab 切换（当前页金色高亮）；物品日志 = 「你获得了」流水（纯文本、上限 500 条、自动滚底）；清除日志连物品日志一起清。
- 🎨 **技能CD/BuffCD 颜色可配置**（`config-vars.js`/`skill-timers.js`/`ui.js`/`wg-auto.js`/`global-init.js`）：设置面板 7 色下拉，BuffCD 内文 + 技能浮层上色。
- 🐛 **修复弹窗类 messageAppend 漏传 sync**（`wg-auto.js`/`wg-combat.js`/`wg-misc.js`/`global-init.js`）：26.1.11 批量渲染回归漏网之鱼——自命令/自命令编辑/自定义监控编辑/清空数据/自定义按钮/屏蔽/喜宴/BOSS 共 7 处弹窗「异步插入 + 同步初始化」失效，全部加 sync=true 恢复。


## 26.1.12（2026-08-12）
- ✏️ **代码编辑器定版**：流程/触发代码框增强并最终收敛为最稳方案——
  - **Tab 缩进**（Tab 插 4 空格/选中块缩进/Shift+Tab 反缩进）+ **spellcheck 关闭**（消除命令名红波浪）+ **14px 等宽字体** + **黑底灰字**（防游戏 CSS 覆盖成全绿）。
  - 语法高亮经四条路线（overlay 对齐/页面内 CodeMirror/Shadow DOM/iframe 隔离）在本游戏环境均失败，**按用户决定取消**；行号也按用户要求取消。`lib/codemirror/` 保留但不加载。
- 🧹 **本轮已撤功能**：设置搜索、设置分组折叠、命令历史（用户确认不需要）。
- 📦 **重建压缩版**：包含全天改动（配置备份/重连退避/消息容错/弹窗委托/Vue 单实例/日志保护/编辑器定版等）。
- 🔍 **代码审查 + 简化**（Simplify + Code Review 技能）：
  - 死代码清理：`utils.js` 遗留 6 个不再调用的函数（enableLineNumbers/enableSyntaxHighlight/hlFlowText/cmForceTab/cmCreateShadow/createCodeEditor，均为已取消的行号/高亮/CodeMirror/iframe 方案遗留）**334 行全部删除**，文件 455→117 行（-74%）。
  - 修复：`messageClear()` 原来只清弹窗队列 `_msgQ['2']`，日志/频道排队消息残留可能混入 → 改为清空全部队列。
  - 审查确认健康：重连退避（wasConnected 区分/20 次上限/60s 封顶）、消息批量渲染（sync 参数/裁剪计数）、配置备份/恢复（confirm 保护/存储诊断）、触发器逐条隔离、Raid 24 处事件委托 + Vue 单实例、ws.js 消息三层容错。
- 📥 **移植作者 f45137e 三个功能**（用户指定 1/3/4）：
  - **物品/金钱刷屏合并**（`wg-misc.js`）：「你获得了」消息 500ms 聚合——扫荡副本大量重复提示合并为一条（含中文数字↔整数转换、铜板/银两/黄金进制换算）；跳过原始显示但保留 funny API。
  - **聊天点击玩家名修复**（`chat-display.js`）：事件委托处理 `cmd='look3 <uid>'` 的玩家名点击（`.container/.WG_log_log/.WG_log/.channel [cmd]`），`SendCommand(cmd)` 执行 + 阻止冒泡——聊天区点玩家名看玩家恢复正常。
  - **修复：弹窗类 messageAppend 未传 sync 导致面板损坏（26.1.11 批量渲染回归的漏网之鱼）**（`wg-auto.js`/`wg-combat.js`/`wg-misc.js`/`global-init.js`）：
    - 根因：批量渲染把无 sync 的 messageAppend 改为异步插入，但这些弹窗在插入后**同步**执行 `new Vue({el:...})`/`$().on('click')` 初始化 → 元素未入 DOM 绑定全失效。
    - 波及：自命令面板（zmlztjk）、自命令编辑、自定义监控编辑、清空数据、自定义按钮设置、屏蔽按钮、喜宴/BOSS 领取按钮（共 7 处函数 9 个调用点）。
    - 修复：全部加 `sync=true`（`messageAppend(html, 0/2, null, true)`）→ 弹窗 HTML 同步插入，初始化命中。纯文本提示消息不受影响（继续走批量）。
  - **右侧日志区双页菜单：普通日志 / 物品日志**（`ui.js`/`funny2.js`/`wg-misc.js`）：
    - 日志标题栏改为 tab 切换（日志=原日志，物品日志=获得物品流水，当前页金色高亮）。
    - 物品日志：每条「你获得了」消息追加一条纯文本记录（自动滚底、上限 500 条防膨胀、textContent 防注入）。
    - 「清除日志」按钮同时清空普通日志和物品日志；普通日志行为不变。
  - **代码编辑器语法高亮（移植作者 26.2 增强版，用户决定恢复）**（`utils.js`/`Raid.js`/`Trigger.js`）：
    - 26.2 版三件套：`RaidScriptColors`（10 色，新增 jsKeyword #f48fb1）+ `highlightJavaScript`（JS 高亮：注释/字符串/模板字符串/数字/JS 关键字）+ `highlightRaidSyntax`（逐行处理：**@js 开头行 → @js 蓝 + 剩余 JS 高亮**；普通行 → 流程高亮）+ `createRaidEditor`（overlay 结构同前）。
    - 三个代码框启用（Raid 新建/修改流程 + Trigger 触发脚本）；Tab 缩进/v-model/保存不变。
  - **移植作者 26.2 两个功能**：
    - **自动买符开关**（`config-vars.js`/`global-init.js`/`ui.js`/`wg-auto.js`）：设置面板「自动买符与活动轮询」分组新增「进游戏自动买符」开关（默认关，开启且财产>100 时每日自动买一次商店）。
    - **活动轮询间隔可配置**：设置面板新增「定时轮询活动间隔（分钟）」输入（默认 1，最小 1）；`GlobalInit.restartEventPolling()` 管理定时器（configInit 登录后启动 + 设置改动立即重启）；每间隔自动 `WG.SendCmd("events")`。
    - 作者 26.2 编辑器实现（@js 行 JS 高亮）已存档 `_work/_author-study/e608f34/` 参考，未移植。
  - **取消物品日志双页菜单（用户决定，显示有问题）**：回退 ui.js 标题栏（去掉 tab + .ext-items-log）、funny2.js（tab CSS/切换绑定/clear 联清）、wg-misc.js（物品日志追加块）。**保留**：物品/金钱刷屏合并（500ms 聚合，普通日志区）。
  - **代码编辑器语法高亮（移植作者 f45137e 已验证方案）**（`utils.js`/`Raid.js`/`Trigger.js`）：
    - 三件套移植：`RaidScriptColors`（9 色板）+ `highlightRaidSyntax`（单 alternation 正则着色：注释灰/变量黄青/指令蓝/方向绿/控制橙/字符串粉/运算符紫/数字绿）+ `createRaidEditor`（textarea overlay：pre 高亮层 + textarea 透明输入层，两层 padding/font/line-height/box-sizing 完全一致 + pre-wrap 双换行对齐）。
    - 三个代码框全部启用：新建/修改流程（Raid.js，height 20rem）、触发脚本（Trigger.js，textarea 加 id=trigger-source-editor，Vue 渲染后调用）。
    - 保留：Tab 缩进（enableTabIndent）、v-model 同步（textarea 自身 input 事件不受包装影响）、保存读取不变（读 textarea.value）。
  - **技能CD/BuffCD 颜色可配置**（`config-vars.js`/`skill-timers.js`/`ui.js`/`wg-auto.js`/`global-init.js`）：设置面板新增两个 7 色下拉（红/绿/黄/青/蓝/橙/白）；BuffCD 内文用 `<colorTag>` 上色，技能CD 浮层映射 CSS 色值；即时保存+回显。


## 26.1.11（2026-08-11）
- 🧱 **结构改进（参考大佬项目）**：
  - `global.d.ts` 补全核心全局类型（WG/ToRaid/Dialog/Process/GM_*/SendCommand/messageAppend 等，22→60 行，纯声明零风险）。
  - 新增 `ws-js/core/logger.js` 统一日志工具（参考 uBlock console.js）：`ExtLog.log/warn/error`，带 `[HH:MM:SS] [WSMUD]` 前缀，`setEnabled(false)` 可静默 log/warn（error 永远输出）；已加入 content.js 注入清单（GM_API 之后，无依赖），关键位置（频道兜底、技能CD元素查找）已切换。控制台过滤 `[WSMUD]` 即可查看插件日志。
  - **集中色板（参考 Dark Reader 主题管理）**：`funny2.js` 定义 `:root` CSS 变量色板（`--ext-border`/`--ext-text`/`--ext-text-bright`/`--ext-hover`/`--ext-gold`/`--ext-dim`），21 处硬编码色值改为 `var(--xxx)`——**以后调主题只改色板一处，全局生效**。
  - **GM 层健壮性（参考 Violentmonkey GM 标准）**：`GM_setValue` undefined→null（防脏数据）+ 存储满（QuotaExceededError）提示导出备份；`GM_deleteValue` try 包裹。
  - **弹窗色值变量化**：Raid/Trigger 弹窗边框、wg-auto 设置弹窗配色全部改用 `var(--ext-xxx, 回退值)`（fallback 防 funny2 关闭时色板缺失）。
  - **安全加固（Chrome 官方消息安全指南）**：`content.js`/`background.js` 的 `onMessage` 开头校验 `sender.id === chrome.runtime.id`，拒绝外部扩展伪装的调用（防被恶意控制插件）。权限审查：storage/DNR/tabs 均在用，已是最小集。
  - **性能优化（挂机场景，十几开）**：频道 tab 持续监控轮询 200ms → 500ms（防重绑/防移走无需毫秒级，轮询开销减 60%）；扫描确认彩虹名字为 CSS 动画（无 JS 轮询）、日志裁剪 60s、其余 interval 均合理。
  - **错误监控**（`logger.js`）：页面级 `error` + `unhandledrejection` 捕获 → 输出 `[WSMUD-ERR]`，10 秒限频防刷屏；挂机十几开时控制台过滤 `[WSMUD-ERR]` 一眼看全部异常。
  - **存储用量显示**（`wg-auto.js`）：右键设置弹窗标题显示「配置 N 项 · 占用 X KB/MB / 约5MB」（配合 GM_setValue 超限提示，配置接近上限时提醒导出备份）。
  - **block 规则确认必要 + 压缩版重建**：查明游戏  与扩展拆分版（/）都声明 /——同时加载会 SyntaxError 崩溃，故 DNR block 是防冲突的正确设计，**保留不删**；真正关键是扩展脚本必须注入成功接管。已重建压缩版（34 文件，含 logger.js，注入清单完整）。
  - **resizer 未登录隐藏**（`funny2.js`）：未登录时不显示频道/日志分隔条（避免未进游戏时悬空一条杠），登录后由监控自动显示。
  - **聊天区未登录隐藏**（`funny2.js`）：未登录时不显示右侧聊天区（`.right-channel` 空框描边突兀），登录后自动显示。
  - **修复上传/下载配置 + 未知事件触发器打不开**：
    - （`wg-auto.js`）上传键收集改用页面全局 `Role.id` 兜底（登录 DOM 读取的 `roleid` 可能失效 → 角色设置键全部漏传 → 下载后"没有"）；空 ID 拦截提示；下载侧兼容服务器返回对象/字符串。
    - （`Trigger.js`）未知触发事件（老数据/导入损坏）加载时给兜底模板（filters 空 + 提示注释），点「设置」不再崩溃，能查看/删除；执行时 filter 判空。
    - ⚠️ 云端接口 `wsmud.ii74.com/User/Backup|Load` 对无效 ID 返回 false/空，服务器是否仍可用待用户实测确认。
  - **Code Review + Simplify 清理**（simplify/code-review 技能）：
    - Review 结论：重连退避（20 次上限/真断线区分）、消息容错（解析降级+处理器隔离）、日志裁剪（NodeList 快照安全）、备份恢复（PersistentCache 无内存缓存→恢复流程无需额外刷新）逻辑全部正确，无 CRITICAL/MAJOR。
    - Simplify：确认 utils.js 死代码（enableLineNumbers/enableSyntaxHighlight/cmForceTab/cmCreateShadow/createCodeEditor/hlFlowText 等 CodeMirror 残留）已清理且 0 残留引用；修正 3 处过时注释（"+ 行号"→实际状态）；utils.js 头部注释三个→四个函数。
  - **取消行号**（`Raid.js`/`Trigger.js`，用户确认不需要）：三个代码框移除 `enableLineNumbers` 调用（函数保留无害）。最终编辑器 = 纯 textarea（黑底灰字 + Tab 缩进 + 14px 等宽 + spellcheck 关闭）。
  - **代码编辑器最终定版：textarea 方案（用户确认取消语法高亮）**：
    - 语法高亮四条技术路线（overlay 对齐 / 页面内 CodeMirror / Shadow DOM / iframe 隔离）在本游戏环境全部失败（深层样式干扰 / 代码框消失等），**用户决定取消代码颜色高亮**，恢复最稳的 textarea 方案。
    - 三个编辑器（Raid 新建/修改流程、Trigger 触发脚本）最终形态：**原生 textarea + 黑底灰字（inline important）+ 行号 + Tab 缩进（Tab 插 4 空格/选中块缩进/Shift+Tab 反缩进）+ 14px 等宽字体 + spellcheck 关闭（无红波浪）**。
    - `lib/codemirror/` 目录与 utils.js 的 createCodeEditor 等函数保留但不加载/不调用（无害，未来在独立页面可复用）；content.js 无任何 CodeMirror 注入（FUNNY2_INSERT_INDEX=28）。
  - **iframe 编辑器"看不到代码框"修复**（`utils.js`）：
    - 根因：`createCodeEditor` 提取扩展 URL 的正则 `/^(chrome-extension://////[^///]+)////` **丢了捕获组括号** → `m[1]` 恒为 undefined → `extBase` 为空 → 函数提前 return 空 api，**iframe 从未创建** → 容器空白 → 看不到代码框。
    - 修复：恢复捕获组 `(/^(chrome-extension://////[^///]+)///)/`；并加**绝对兜底** `fallbackTextarea()`——extBase 提取失败或创建异常时，直接在容器内放原生 textarea（黑底灰字 + 行号 + Tab 缩进），api 指向它（保存不丢）——**任何情况下代码框必现**。
  - **代码编辑器 iframe 隔离方案**（`utils.js`/`Raid.js`/`Trigger.js`）：
    - 语法高亮最后一搏：CodeMirror 装进**独立 iframe**（srcdoc）——浏览器级文档隔离，游戏页面的 CSS/JS 完全进不去，行高/间距/颜色/竖线/Tab 全部由我们控制（之前页面内 4 套方案失败的根治）。
    - `createCodeEditor(hostEl, initialValue, onChange)`（utils.js）：从页面已注入脚本 src 提取 chrome-extension:// base → 构建 srcdoc（主题样式 + 原生 textarea + 依次加载 codemirror.min.js/flow-mode.js + 初始化）→ 返回 {getValue, setValue} 跨 iframe 读写；onChange 支持 Vue data 同步。
    - **textarea 永驻兜底**：iframe 内原生 textarea 一直存在，CodeMirror 加载失败只是普通文本框（可编辑），编辑器绝不消失；保存走 cm.getValue() 或 textarea.value 双保险。
    - 三个编辑器（Raid 新建/修改流程 + Trigger 触发脚本）全部接入；Trigger 的 onChange 同步 `_triggerVue.source`（保存逻辑不变）。
  - **代码框全绿修复 + CodeMirror 回退复盘**：
    - 回退 textarea 方案后文字全绿——游戏全局 CSS 给 textarea 设置了绿色文字。已修复：`enableTabIndent` 统一强制黑底灰字（color/background/字体/行高/边框全 inline !important），三个编辑器（新建/修改流程 + 触发脚本）自动生效。
    - CodeMirror 页面内方案（overlay 对齐 → grid → Shadow DOM → 样式全量 !important）均无法对抗游戏环境的深层样式/交互干扰，已回退 textarea + Tab 缩进 + 行号；`lib/codemirror/` 保留不再注入（170KB 体积节省）。
  - **编辑器升级 CodeMirror 5.65**（彻底解决高亮错位）：
    - 裸 textarea 的 overlay 高亮在浏览器渲染下无法逐字对齐（textarea 与普通元素文本渲染存在固有差异，三套方案均失败），改为引入 **CodeMirror 5.65.16**（成熟编辑器，自带语法高亮/行号/Tab 缩进/自动换行）。
    - 新增 `ws-js/lib/codemirror/`（不压缩进 dist）：`codemirror.min.js` + `codemirror-css.js`（原 css + 深色主题适配，GM_addStyle 注入）+ `flow-mode.js`（自定义流程语法模式：#指令蓝/@执行金/{变量}金/(:条件)紫/数字橙/注释灰）。
    - content.js 注入清单新增 3 个文件；FUNNY2_INSERT_INDEX 28→31。
    - 三个代码框（Raid 新建/修改流程、Trigger 触发脚本）替换为 CodeMirror 实例（lineNumbers/tabSize 4/lineWrapping/vue 集成 onChange→data.source）；保存读取改用 getValue()。
    - 旧 enableTabIndent/enableLineNumbers/enableSyntaxHighlight 调用点已移除（函数保留在 utils.js 无副作用）。
  - **代码编辑器增强**（`utils.js`/`Raid.js`/`Trigger.js`，流程新建/修改 + 触发脚本三个代码框）：
    - **Tab 缩进**：Tab 光标插 4 空格/选中块缩进，Shift+Tab 整块反缩进。
    - **回车自动缩进（已按用户要求移除）**：曾加回车延续缩进，用户不需要后移除。
    - **行号**：左侧行号栏（滚动同步、行数自动更新）。
    - **语法高亮**（overlay 方案）：wrap="off" + 底层 pre 着色（指令蓝/执行金/变量金/条件紫/数字橙/注释灰），textarea 文字透明 caret 可见，scroll 同步、input 节流 120ms。
    - **字体**：代码框 0.8em → 14px + 行高 1.55（更易读）。
    - **spellcheck="false"**：关闭浏览器拼写检查（消除命令名红波浪）。
  - **命令历史（已按用户要求移除）**：曾给命令弹窗加 ↑/↓ 翻历史，用户反馈无实际作用后整体撤回，恢复原样。
  - **流程/触发运行时保护**：
    - **流程执行错误信息增强**（`Raid.js`）：Performer 异常链审查结论——编译错误/运行时错误/未知命令/hook 回调异常都已有 try 处理（流程出错会 stop 清理状态，不卡死）。改进：错误提示带**流程名 + 出错命令片段**（截 60 字符），排障时一眼定位是哪条流程哪条命令。
    - **触发执行隔离**（`Trigger.js`）：`NotificationCenter.post` 原为逐 observer 直接调用——**一个触发器抛错会中断同一通知的其他触发器**。已加逐条 try 隔离（ExtLog.error 记录）。
    - **触发数据健康**（`Trigger.js`）：`_loadTrigger` 加载时校验——非对象数据跳过加载并提示（可用备份恢复）；conditions/source 字段缺失补默认（{} / ''），不再崩溃，且能正常打开/删除。
  - **WS 消息解析容错 + 内存泄漏扫描**：
    - **消息解析容错**（`ws.js`）：服务器消息为单引号 JSON（new Function 解析，正确做法）但原代码无 try——损坏/截断数据会让解析抛错中断该消息处理。已加三层防御：`OnReceived` 解析失败降级为文本消息显示（ExtLog.warn 记录）；`ReceiveData`/`ReceiveMessage` 处理器异常隔离（ExtLog.error 记录），单条坏消息不再影响后续消息链。
    - **内存泄漏扫描（结论：健康）**：setInterval 仅 2 处常驻守护（60s 日志裁剪/1s 自动战斗）用途明确；递归 setTimeout 只在第三方 lib；游戏原插件初始化绑定一次性不累积；我们自己的绑定全部 off+on 命名空间管理（Raid 委托/resize 拖拽/频道防重绑）或随弹窗元素销毁。无真实泄漏点，无需修改。
  - **挂机稳定性三件套（配置备份/重连退避/存储诊断）**：
    - **本地配置自动备份**（`wg-auto.js`/`global-init.js`/`ui.js`）：登录后每天自动备份一次当前角色配置（设置/触发器/流程/持久变量，不依赖云端服务器）到 `ext_config_backup`；设置弹窗「系统」区新增「立即备份」「恢复备份」按钮 + 显示最近备份时间。数据损坏时（如之前的"打不开的触发"）可一键恢复。
    - **自动重连指数退避**（`websocket-proxy.js`）：原固定 500ms 无限重试（服务器宕机时十几开窗口每秒几十次连接请求，可能被限流/封 IP）→ 改为退避序列 0.5s→2s→5s→10s→30s→60s（封顶）+ 连续失败 20 次停止 + 连上即停；区分"真断线"（从头退避）与"重连失败"（间隔递增）。
    - **存储只读诊断**（`GM_API.js`/`wg-auto.js`）：`GM_storageReport()` 统计键数/占用/角色分布/疑似孤儿键（只报告不删除）；每日备份时顺带检查：占用超 5MB 的 85% 或发现孤儿键 → 控制台提示。
    - **GM 缓存评估（未做）**：121 处 GM_getValue 全为低频事件驱动，localStorage 同步读取微秒级，加内存缓存有跨 tab 不同步风险（多开场景）→ 判定无必要。
  - **「代码」按钮显示开关状态**（`wg-combat.js`/`wg-misc.js`）：命令代码显示按钮（`.cmd_echo`）原固定文字「代码」，现点击切换后同步为「代码：开/关」，页面加载时也按当前状态初始化显示。
  - **频道监控查询缓存**（`funny2.js`）：自建元素 `.right-channel`/`.right-resizer`（游戏不会替换）创建时缓存引用 `_extChannel`/`_extResizer`，500ms 监控每 tick 复用（原每 tick 重复 `$()` 查询 4-6 次）；`ensureTabBar` 支持传参复用；拖拽逻辑同步用缓存。游戏元素 `.channel` 保持实时查询（会被重绘替换）。
  - **日志超长保护 + 设置面板搜索**：
    - （`message-display.js`）日志超过 8000 行自动裁剪最旧 2000 行（保留至少 1000 行）——不恢复自动清空（尊重手动清除的选择），仅防挂机十几开 + 刷屏时 `.WG_log_log pre` DOM 无限膨胀拖垮浏览器；裁剪时控制台提示一次。
    - （`wg-auto.js`）设置面板搜索（已按用户要求移除）：曾加搜索框过滤设置项，用户确认不需要后整体撤回，恢复原样。
  - **Vue 弹窗单实例管理**（`Trigger.js`/`Raid.js`）：触发/副本/流程弹窗的 `new Vue` 原本从不销毁旧实例（连续开关弹窗累积 Vue 实例 → 内存泄漏 + 状态残留）。现加模块级单实例管理：每次创建前 `$destroy()` 旧实例、`_closeModal` 时销毁（Trigger 3 处 + Raid 3 处 ContentModel + 两个 `_closeModal`）。
  - **弹窗按钮事件委托化**（`Raid.js`，24 处）：快捷/功能/触发/副本/命令等弹窗内的按钮绑定从「append 后立即 `$.on`」改为 **document 事件委托 + 命名空间防重复**（`$(document).off('click.wd-xxx').on('click.wd-xxx', '.cls', fn)`）——按钮响应不再依赖插入时序，即使渲染再异步化也不失效（上一轮批量渲染回归的根治方案，jQuery 动态内容最佳实践）；命令输入框 handler 改为点击时直接取 `#cmdline-input`，不依赖闭包。Trigger.js 走 Vue v-on 自身管理、funny2 已委托，无需改。
  - **popup 快捷入口（已移除）**：曾新增「综合工具网页」「游戏内设置」两个按钮，用户确认无实际价值后整体撤回（popup.html/popup.js/content.js 三处恢复原样，语法验证通过）。
  - **消息渲染批量优化**（`message-display.js`）：普通消息追加改为微任务批量合并（同一 tick 多条消息一次  插入，替代每消息一次 jQuery append），游戏消息密集时减少 DOM 重排；id 更新/滚动跟随/计数行为不变。
  - **设置面板分组折叠（已按用户要求移除）**：曾给设置弹窗 h3 分组加点击折叠/展开，用户确认不需要后整体撤回，恢复为长滚动页。
- 🛠 **全项目审查**：全量语法/JSON/资源引用/注入清单/版本一致性/已知 bug 模式扫描。
  - ✅ 35+ JS 全过语法、manifest/rules/jsconfig 有效、注入清单 35 引用全存在、skin 完整、版本一致。
  - 🔧 修复 funny2.js `room.str.match` 无 null 保护（房间名不含 `-` 时 `x[1]` 崩溃）→ 加 `|| ['','','']` 兜底。
  - ⚠️ 待观察：Raid.js 流程解析器 19 处 `patt.exec` 无保护（游戏原插件代码，流程文本格式异常时可能崩溃，改动风险大，暂不动）。
- 🎨 **字体继承游戏页面体系**（`funny2.js`/`wg-auto.js`）
  - 游戏页面字体为 `Microsoft YaHei UI`（14px），且游戏自身规则 `pre { font-family: inherit }`（连日志区都明确继承页面字体）。
  - 插件原硬编码 `JetBrains Mono` 等宽字体 → 与页面风格不统一；现改为：**左侧日志区、右侧日志区、角色信息数值区全部 `font-family: inherit`**（继承页面微软雅黑体系）；设置弹窗字体也改为 `Microsoft YaHei UI` 系。
  - **保留等宽字体的场景**：流程/触发器编辑器、测试命令输入框（`#create-flow-source`/`#modify-flow-source`/`.runtest textarea`/`settingbox` 等）——代码编辑等宽是刚需，且为游戏原插件设定。
  - 涉及文件：`funny2.js`、`wg-auto.js`、`manifest.json`、`popup.html`（26.1.10 → 26.1.11）
- 🔧 **重构拼接 HTML**（`funny2.js`）：引入统一构建函数 `mkBtn`（快捷按钮）/`mkRow`（按钮行）/`mkT`（标签格）/`mkI`（数值格）/`mkInfoRow`（信息行），重写左侧快捷按钮区（21 个按钮）和角色信息区（9 行），消除重复拼接。**渲染结果与原来完全一致**（class/文字/点击行为逐一核对，role_xxx 更新锚点全保留）。
  - **修复重构引入的回归**：helper 初版定义在 `{}` 块内，`"use strict"` 下块内 function 为块级作用域，属性面板构建块访问不到 → ReferenceError → 属性面板不渲染。已把 5 个 helper 提升到 IIFE 顶层（`"use strict"` 之后），属性面板恢复正常。
- 🎨 **整体 UI 配色切到游戏原生风格**（`funny2.js`/`Raid.js`/`Trigger.js`/`wg-auto.js`）：
  - **第一轮**：游戏页面为黑底 + MUD 绿 `#008000` 体系，插件墨绿主题全部替换为游戏绿（边框 `rgba(0,128,0,*)`、文字绿系、弹窗纯黑底）。
  - **第二轮（按游戏颜色标签表调整）**：避免"全绿"，按牛牛自定义颜色标签体系重新调配——**基色中性**（主文字/日志/数值 `wht #c0c0c0`、次级 `hik #808080`），**绿色只做边框与 hover**（`hig #00ff00`），**重要状态用金色品质**（频道选中、流程运行中、角色名 `hij #FFD700`）；气血/内力/财产语义色保留；设置弹窗安卓绿统一为游戏绿。可用色值：blk/blu/cyn/gre/hib/hic/hig/hij/hik/him/hio/hir/hiw/hiy/hiz/mag/nor/ora/ord/red/wht/yel。
  - **移除无用的「背包」「活动」快捷按钮**（`funny2.js`）。
  - **按钮样式适配游戏本身**（`funny2.js`）：快捷按钮、Raid 工具栏按钮、日志标题按钮、频道 tab 全部改为游戏按钮风格——**黑底 `#000000` + 灰字 `#999999` + 灰边框 `#666666`，hover 反转（灰底黑字，同游戏 `.panel_item`）**；频道选中/流程运行中保持金色品质。
  - **流程/触发弹窗适配游戏本身**（`Raid.js`/`Trigger.js`）：`raid-modal-overlay`/`trigger-modal-overlay` 弹窗边框由绿色改**游戏灰边框 `#666666`**、圆角 12px → 游戏小圆角 4px，黑底不变；内容区按钮（`.zdy-item`）本为游戏风格无需改。
  - **右键设置弹窗适配游戏本身**（`wg-auto.js`）：`#ext-setting-dialog` 背景 `#0d0f12` → 纯黑 `#000000`、边框游戏灰 `#666666`、圆角 10px → 4px、文字 `#c0c0c0`；标题分隔线深灰、去绿色渐变；标题文字改**金色品质 `#FFD700`**；关闭按钮改游戏按钮风格（灰边灰字、hover 灰底黑字反转）。

## 26.1.10（2026-08-11）
- 🎨 **左侧信息区 + 日志标题栏按钮**（`funny2.js` / `ui.js` / `message-display.js`）
  - **content-title 两行布局**：左列第一行门派·身份、第二行 uid；右列名字跨两行竖排（金色加粗更醒目）。三行压两行，左侧更紧凑。
  - **长数值不截断 + 占满整行**：气血/内力/财产数值很长时不再省略号截断，自动换行完整显示；且数值格跨到最后一列占满整行（原 4 列 grid 布局下这三行只有两个格子，右侧留空列）。
  - **日志标题栏两个按钮**（右侧日志区标题「日志」旁，靠右摆放）：
    - `清除日志`：清空右侧日志区文本；
    - `重置统计`：战斗 DPS + 经验/潜能 + 获得物品统计全部归零。
    - 按钮为墨绿描边小按钮，与整体 UI 一致。
  - **左侧控制台风格统一**（`.left-console`）：Raid 工具栏按钮去黑底灰边 → 墨绿描边无填充、文字墨绿 `#a8c9bc`（按钮内花色 hi 标签统一）；左侧日志字体统一 JetBrains Mono 等宽。
  - **Raid 工具栏强制一行**：快捷/功能/触发等按钮宽度自适应内容（不再等宽平分截断 3 字按钮），字号/内边距压缩后 7 个按钮一行放得下；窗口过窄时工具栏横向滚动，内容完整不截断。
  - **修复「流程」按钮运行状态不恢复**（`Raid.js`）：原代码运行时直接设 `border-color:#00FF00`、结束时设 `inherit`——inline 样式优先级最高，`inherit` 取父元素颜色导致按钮回不到墨绿描边。改为 class 控制（`addClass/removeClass("raid-running")`），结束移除 class 必然恢复原样；运行态样式为墨绿亮边框+文字（原亮绿刺眼）。
  - **频道 tab 行固定 + 取消双击弹窗**（`funny2.js`）：右侧聊天消息区下方新增固定 tab 行「全部/世界/队伍/门派/全区/帮派/系统」，点击即可切换频道显示（复用游戏原过滤逻辑，历史+新消息都按频道过滤）；同时解除 `.channel` 的 click 绑定，双击聊天文字不再弹出屏幕中间的聊天界面。
  - **频道 tab 持续监控**（`funny2.js`，参考作者 8d70d93）：改为 200ms 轮询——`.channel` 被游戏挪走时自动移回右侧容器、持续解除 click（防游戏重新绑定双击弹窗）、登录后才显示 tab 栏，切场景/重连也不失效。
  - **修复频道切换失效（根因）**（`funny2.js`）：诊断数据（`select_item=undefined datas=-1 容器可见=undefined`）证实根因——**`Dialog`/`Process` 是 `const` 全局词法变量，不会挂到 `window` 上**（`dialog-base.js:9 const Dialog`），tab 点击判断用了 `window.Dialog`（永远 undefined）导致 `footerChanged` 从未被调用。改为作者版写法 `typeof Dialog !== 'undefined'` 直接变量访问（5 处：点击调用/兜底重绘/诊断）。已移除临时诊断输出。
  - **新增「切换」按钮**（`funny2.js`）：左侧快捷按钮区第三组新增「切换」按钮，点击将左右侧栏对调（`.left`/`.right` 的 flex order 互换，中间游戏区不变），再点恢复。
  - **去掉右侧日志区嵌套**（`funny2.js`）：`.WG_log_log` 不再套在 `.right-console` 里，直接作为 `.right` 子元素（自身承担描边框/圆角/padding，样式与原来一致），减少一层 DOM 嵌套。
  - **收起工具栏不再联动右侧日志区**（`Raid.js`/`wg-combat.js`）：原版 `hideToolbar`/`showhideborad` 收起时会把 `.WG_log`（左）和 `.WG_log_log`（右）一起隐藏；改为只影响左侧（工具栏 + WG_log），右侧日志区保持显示（三栏布局下两者独立）。
  - **技能CD改为浮层显示（方案B）**（`skill-timers.js`/`funny2.js`）：原实现倒计时把技能行改成「技能名<br>秒数」两行（行高变高、冷却结束也不缩回）；改为技能行**右上角浮层小字**显示剩余秒数（`position:absolute`，不占文档流）——技能行内容/行高全程不变，冷却结束移除浮层即恢复，无任何跳动。BUFF 计时保持内文追加（结束恢复原文本）。
  - 另修复：tab 点击不再用 try-catch 吞异常；持续监控的 `$channel.off('click')` 会误伤 `ContainerCommand`（消息点击命令）改为移除后重绑。
  - **修复 layer.css 加载失败**（`ws-js/lib/skin/` + `manifest.json`）：`ws-js/lib/layer.js` 加载时自执行 `f.use("skin/layer.css")` 加载 layer 2.3 皮肤 CSS，但 `ws-js/lib/skin/` 目录在工作目录里缺失（**桌面板包里也没有**——layer.css 一直就没被打包进来，旧 Chrome 静默 404，CentBrowser 5.2 升级 web_accessible_resources 检查才暴露）：下载官方 layer.css + 5 个 default/* 皮肤图，并在 `web_accessible_resources` 加 `"ws-js/lib/skin/**"`（用 `**` 覆盖子目录 default/*）。
  - **设置入口统一**（`Raid.js`）：Raid 工具栏「参数设置」按钮改为优先打开插件设置弹窗（与右键菜单「设置」同一弹窗），妖塔参数流程作为回退。
  - **左侧信息区高度压缩**：`.left-content` margin/内边距/行高整体收紧，略微缩小整体高度。
  - **取消日志自动清空**：右侧日志区原来超过 100 行自动清空的设定已移除，日志持续保留，由「清除日志」按钮手动清理。
  - 涉及文件：`funny2.js`、`ui.js`、`message-display.js`、`manifest.json`、`popup.html`（26.1.9 → 26.1.10）

## 26.1.9（2026-08-10）
- 🎨 **Trigger / Raid 弹窗 UI 统一**（`Trigger.js` / `Raid.js`）
  - `trigger-modal-overlay` 与 `raid-modal-overlay` 的弹窗容器统一为墨绿描边风格：背景 `#1a1a2e`（蓝黑）→ `#101310`（墨绿 surface-raised），边框 `#555` → 墨绿 `rgba(96,168,138,.18)`，去掉 `box-shadow`。
  - 涉及文件：`Trigger.js`、`Raid.js`、`manifest.json`、`popup.html`（26.1.8 → 26.1.9）

## 26.1.8（2026-08-10）
- 🎨 **去除卡片底色填充**（`ws-js/features/funny2.js`）
  - 参考 wsmud-server WebUI（`app.css`：`--bg:#050605` 深底 + `--line:#2b312b` 细线描边，主界面无独立卡片底色）：
    - `.content-message` / `.WG_log` / `.right-channel` / `.room-commands` / `.right-console` / `.content-title` 全部改为 `background: transparent`，仅保留墨绿描边边框（`rgba(96,168,138,.16)`）。
  - 涉及文件：`funny2.js`、`manifest.json`、`popup.html`（26.1.7 → 26.1.8）

## 26.1.7（2026-08-10）
- 🎨 **按钮宽度统一 + 描边风格**（`ws-js/features/funny2.js`）
  - `.left-hotkeys` 每组按钮改 `grid-template-columns: repeat(8, 1fr)`：所有按钮跨行统一等宽（第三行 4 个也按 8 等分占前 4 列，宽度与其他行一致），缩放自适应。
  - `.span-btn` 全局改为描边风格（参考 wsmud-server WebUI）：墨绿描边 `rgba(96,168,138,.5)` + 无填充底色 + 墨绿淡文字 `#a8c9bc`；hover 时变亮墨绿 `#7fbf9c` + 极浅填充 `rgba(127,191,156,.08)`。
  - 涉及文件：`funny2.js`、`manifest.json`、`popup.html`（26.1.6 → 26.1.7）

## 26.1.6（2026-08-10）
- 🎨 **UI 三项调整：hotkeys 固定三行 / right-console 补卡片 / 整体墨绿基调**（`ws-js/features/funny2.js`）
  - `.left-hotkeys`：每组按钮改 `flex-wrap: nowrap` + `flex: 1 1 0` 平分宽度 → 无论浏览器缩放，恰好三行（三组按钮各一行）。
  - `.right-console`：补卡片背景/边框（与 right-channel 一致），不再是"漏底的白色"。
  - 整体墨绿基调：卡片面 `#141a17`、聊天深底 `#0d1412`、边框/分隔线 `rgba(96,168,138,…)` 墨绿系；按钮 hover 蓝 `#4db8ff` → 墨绿亮 `#7fbf9c`；名字/财产保留金色强调（墨绿配金）。
  - 涉及文件：`funny2.js`、`manifest.json`、`popup.html`（26.1.5 → 26.1.6）

## 26.1.5（2026-08-10）
- 🎨 **左侧 UI 扁平化 + 数值颜色降饱和**（`ws-js/features/funny2.js`）
  - `.left` 去掉卡片底色/边框（去卡片套卡片，扁平化）
  - 数值指示色降饱和（去霓虹撞色感）：气血 `#e85555` → `#b85450`、内力 `#5bc5d8` → `#6a9aa8`、财产 `#e8c66a` → `#b5a070`、名字 `#e8c66a` → `#c9a84d`
  - 边框统一改 `rgba(.06)`（更柔）
  - 涉及文件：`funny2.js`、`manifest.json`、`popup.html`（26.1.4 → 26.1.5）

## 26.1.4（2026-08-10）
- 🎨 **左侧角色面板重新排版 + 右侧栏去卡片化**（`ws-js/features/funny2.js`）
  - 左侧：`content-title` 分段（门派·身份 / 名字 / UID 三行），`info-row` 改 `display:grid` 严格两列对齐（标签 52px + 数值占 1fr），去掉 `<hiy>` `<hig>` 等花色标签（只保留气血红/内力青/财产金三个指示色），等宽字体统一，行间分隔线。
  - 右侧：去掉卡片底色/边框（让游戏原生【宗派】贡献排行等不再突兀），仅保留圆角和内边距；插件自身元素（WG_log/频道/工具栏）仍卡片化。
  - 涉及文件：`ws-js/features/funny2.js`、`manifest.json`、`popup.html`（26.1.3 → 26.1.4）。

## 26.1.3（2026-08-10）
- 🎨 **脱战整体 UI 全面优化（降渲染 + 增美观）**（`ws-js/features/funny2.js`）
  - **日志自动裁剪**：聊天/日志区各保留最近 2000 行（防抖批量删旧 + 60s 兜底），挂机越久浏览器负担恒定——多角色挂机渲染负担最大头解决。
  - **卡片化美化**：三栏统一深色卡片（圆角 12px、细边框、统一配色），聊天区独立深色底 + 更好的行距字体；无阴影减少渲染。
  - **侧栏状态记忆**：隐藏/显示侧栏（全部隐藏等快捷按钮）刷新后保持（`_ui_sidebar`）。
- 涉及文件：`ws-js/features/funny2.js`、`manifest.json`、`popup.html`（版本号 26.1.2 → 26.1.3）。

## 26.1.2（2026-08-10）
- ⚡ **优化：右键设置弹窗性能**
  - 样式注入去重：改为固定 id（`#ext-setting-style`）先移除旧样式再插入，避免每次打开累积 `<style>` 标签（样式表膨胀）。
  - 去掉遮罩 `backdrop-filter: blur(2px)` 全屏模糊（主要卡顿源，大范围 GPU 滤镜），改纯色半透明背景；弹窗动画 0.2s → 0.15s。
  - 涉及文件：`ws-js/modules/wg-auto.js`、`manifest.json`、`popup.html`（版本号 26.1.1 → 26.1.2）。

## 26.1.1（2026-08-10）
- 🐛 **修复：聊天误屏蔽表情/动作消息**
  - 根因：屏蔽名单判断 `shield.indexOf(data.name)` 在 `name` 为空字符串时永远命中（空串是任何字符串的子串），只要屏蔽名单非空，所有 `name` 为空的 emote 表情消息（如"公孙霞打了暗淡一记响亮的耳光"）都被自动屏蔽。
  - 修复：`wg-misc.js` 屏蔽判断加空值保护——`name`/`uid` 为空时不参与匹配。
  - 涉及文件：`ws-js/modules/wg-misc.js`、`manifest.json`、`popup.html`（版本号同步 26.1 → 26.1.1）。
