# dialog-panels.js 面板清单（v26.3.3 对照版）

> 本文档是 `ws-js/modules/dialog-panels.js`（4573 行）的"面板地图"。
> 所有弹窗面板都是 `Dialog.xxx = { onData / show / hide / footerChanged / ... }` 结构：
> 服务器 `dialog` 消息 → `Dialog.xxx.onData(data)` 渲染；按钮用 `cmd="..."` 属性回发游戏指令。
> 想改某个面板的文字/按钮/逻辑 → 按本表跳到对应行号。

---

## 面板总表

| 面板 | 起始行 | 用途 | 关键方法/要点 |
|---|---|---|---|
| `Dialog.skills` | L35 | 自身技能（武功/内功/轻功/书架） | `showdesc` 技能说明、`eq_group_click` 技能组切换、`showBooks` 书架；**技能等级称号表 `skill_levels` 约 L366** |
| `Dialog.master` | L438 | 师父/随从技能 | `showBooks` 随从书架、`item_click` 学习 |
| `Dialog.pack` | L586 | 背包（含整理/存仓/清理） | `formatPackItem` 物品渲染、`cleanup`/`cleanup_item` 清理、`create_item_command` 快捷使用按钮、`footerChanged` 底部标签（装备/道具/杂物） |
| `Dialog.pack2` | L1061 | 他人背包（看别人身上装备） | `onData`/`item_click`/`eqitem_click` |
| `Dialog.trade` | L1164 | 交易 | `add_trade`/`cancle_trade`/`confirm` 交易流程 |
| `Dialog.list` | L1310 | 商店/仓库买卖 | `otype_click` 类型切换、`find_item` 搜索、`item_click` 买入/卖出 |
| `Dialog.channel` | L1615 | 聊天频道 | **频道列表 `footer` 约 L1582**（发言频道切换）、`scrollBottom` 自动滚动 |
| `Dialog.setting` | L1722 | 游戏设置 | `select_color`/`colorClick` 配色、`save_custom` 保存、`helpClick` 帮助 |
| `Dialog.tasks` | L1988 | 任务列表 | `onData`/`create_items` |
| `Dialog.stats` | L2062 | 六大排行榜 | `create_weapons` 兵器榜、`create_tops`、`silderClick` 滑动条 |
| `Dialog.jh_fam` | L2332 | 江湖-门派 | `onDetail`/`showDetail` 门派详情、`select` 选门派 |
| `Dialog.jh_fb` | L2426 | 江湖-副本 | `append_status` 副本进度、`update_unlock` 解锁 |
| `Dialog.jh_ar` | L2531 | 江湖-禁地（妖塔等） | `onDetail`/`showDetail` |
| `Dialog.jh` | L2608 | 江湖主面板 | `item_click` 进入子页、`update_lock` 解锁状态 |
| `Dialog.shop` | L2711 | 商城 | `format_items`/`show_items`/`create_items` |
| `Dialog.message` | L2886 | 站内信（含子页） | `showMessageDetail` 详情、`showUnread` 未读、`addMessage` 新消息 |
| `Dialog.relation` | L3148 | 夫妻/师徒/家人 | `inner_show`/`onData` |
| `Dialog.party` | L3240 | 帮派 | `command` 帮派指令、`show_list` 成员列表 |
| `Dialog.team` | L3362 | 队伍 | `createItems`/`clickItem` 组队/退队 |
| `Dialog.events` | L3437 | 活动 | `create_items`/`format_time`/`format_num` |
| `Dialog.pm` | L3528 | 拍卖行 | `select_item`/`update_item`/`create_items`/`format_num` |
| `Dialog.keys` | L3615 | 快捷键设置 | **默认键位表 `default_keys` 约 L3755**、`record_press` 录键、`keypress` |
| `Dialog.extend` | L3894 | 自定义扩展/触发器 | `create_item` 扩展项渲染、`start_record`/`stop_record` 录制操作、`switchClick` 开关；**预置扩展 `default_extend` 约 L4214** |
| `Dialog.friend` | L4555 | 好友 | 简短面板 |
| `Dialog.pay` | L4562 | 充值/支付 | 简短面板 |

## 面板通用约定

- **数据流**：服务器 `dialog` 消息 → `Dialog.show(名字)` 定位到 `Dialog.xxx` → `onData(data)` 渲染内容到 `.dialog-content`。
- **底部标签**：`footerChanged(index)` 负责切换底部 tab（如背包的 装备/道具/杂物），`create_footer()` 生成 tab HTML。
- **按钮回发**：面板内按钮统一用 `<span cmd="游戏指令">` 或 `.click()` 绑定 → 最终走游戏 `SendCommand`。
- **关闭/隐藏**：`hide()` 移除面板 DOM，`close()` 关闭对话框容器。
- **已知遗留**：`Dialog.extend` 的 `cmd_import` 附近有一段被混淆的索引调用（原版残留），功能正常但难读（文件头 L32-33 有说明）。
- **记录功能**：`Dialog.extend.start_record/stop_record` 可以把你的操作录成 Raid 流程源码（排除名单 `excluded` 在 L4069）。

---

*对照版本：26.2.3 · 行号以当前 dialog-panels.js 为准*
