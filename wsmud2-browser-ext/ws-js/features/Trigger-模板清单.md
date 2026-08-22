# Trigger.js 模板清单（v26.3.3 对照版）

> 本文档是 `ws-js/features/Trigger.js`（1559 行）的"触发器模板地图"。
> 结构：**NotificationCenter**（事件发布/订阅）→ **TriggerTemplateCenter**（16 个事件模板）
> → **Trigger**（用户建的触发器：事件+条件+动作源码）→ 触发时 `ToRaid.perform(动作源码)` 执行。
> 每个模板注册处都带行号；条件过滤字段（Filter）和动作源码里可用的参数（`(xxx)` 占位符）见下表。

---

## 模板总表

| 模板名 | 注册行 | 过滤字段（Filter） | 动作源码可用参数 |
|---|---|---|---|
| **Buff状态改变** | L527 | 改变类型（新增/移除/层数刷新）、BuffId（包含）、触发对象（自己/他人） | `(id)` `(sid)` `(count)` `(duration)` `(name)` |
| **新聊天信息** | L592 | 频道（全部/世界/队伍/门派/全区/帮派/谣言/系统）、发言人（包含）、忽略发言人、关键字 | `(content)` `(name)` `(id)` `(channel)` |
| **人物刷新** | L641 | 人名关键字 | `(id)` `(name)` |
| **物品拾取** | L672 | 名称关键字 | `(id)` `(name)` `(count)` `(quality)` 品质：白/绿/蓝/黄/紫/橙/红/未知 |
| **新提示信息** | L714 | 关键字 | `(text)` |
| **社交消息** | L741 | 关键字 | `(msg)` |
| **拍卖查询** | L773 | 关键字、物品等级 | `(id)` `(name)` `(grade)` `(price)` `(time)`；需 `pm list` 触发 |
| **活动事件** | L867 | 名称、关键字 | `(type)` `(event)` `(content)` `(grade)` `(times)` 当日时间戳 |
| **战斗状态切换** | L930 | 类型（进入战斗/脱离战斗） | 无（仅类型判断） |
| **死亡状态改变** | L966 | 类型（已经死亡/已经复活） | 无（仅类型判断） |
| **时辰已到** | L1006 | 时（0-23）、分（0-59）、秒（0-59） | 无（定时器，每秒检测） |
| **技能释放** | L1044 | 技能id（包含） | `(id)` `(rtime)` `(distime)` |
| **技能冷却结束** | L1051 | 技能id（包含） | `(id)`（技能冷却结束后触发） |
| **气血内力改变** | L1106 | 人名关键字、类型（气血/内力）、当（低于/高于）、值类型（百分比/数值）、值（跨越阈值触发） | `(id)` `(hp)` `(maxHp)` `(mp)` `(maxMp)` |
| **伤害已满** | L1220 | 人名关键字、值类型（百分比/数值）、值（跨越阈值触发） | `(id)` `(name)` `(value)` `(percent)` |

> 说明：共 15 个模板（文件头注释"16 类"为历史笔误，以本表为准）。

## 过滤器类型

- **SelectFilter**（下拉选择）：`new SelectFilter(名称, 选项数组, 默认项下标, [断言函数])`，如 L517。
- **InputFilter**（文本/数字输入）：`new InputFilter(名称, format, 默认值, [断言函数])`，format 为 `number`/`text`（L231-246）。
- **常用断言**：`EqualAssert`（相等）、`ContainAssert`（包含）、`ContainReverseAssert`（不包含）、`KeyAssert`（关键字匹配）。
- **跨越阈值断言**（L1091-1098）：气血/伤害类专用——值格式 `旧值;新值`，从一侧跨过阈值才触发。

## 触发器运行机制

- **Trigger._action**（L286-305）：条件全部满足 → 把未消费的参数字段注入动作源码开头（`($xxx) = 值`）→ 执行 `ToRaid.perform(realSource, 触发器名)`；源码含 `//~silent` 则静默执行（不打印"触发=>xxx"）。
- **保存键**：`GM_getValue(roleid + "_TriggerData", {})`（`_saveKey` 在 L437 附近）。
- **事件监听**：每个模板注册一个 `Monitor`（`MonitorCenter.addMonitor`），内部 `WG.add_hook(...)` 挂游戏消息钩子 → 组参 → `NotificationCenter.post` 广播。
- **导入/分享**：`TriggerConfig`（L1503 附近）负责导入导出；`Server` 分享码（·触发）导入走 `Raid.js` 的 `importTrigger`（含 @js 安全警示，见 Raid-指令清单.md）。

---

*对照版本：26.2.3 · 行号以当前 Trigger.js 为准*
