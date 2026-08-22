# TaskHelper 自命令函数清单（v26.3.3 对照版）

> 本文档是 `ws-js/modules/helpers.js`（456 行）的函数地图。
> 自命令/`$` 指令里写 `T.函数名(参数...)` 就会调到这里（`const T = TaskHelper`，L456）。
> 通用签名：`T.方法(idx, n, cmds)` —— `idx` 当前命令序号、`n` 参数（命令里 `$方法 参数` 传的值）、
> `cmds` 剩余命令串（内部会用 `recmd` 去掉已执行部分后继续跑）。
> 所有方法末尾都会 `WG.SendCmd(剩余命令)` 继续执行流程。

---

## 基础工具

| 函数 | 作用 | 参数 n |
|---|---|---|
| `T.recmd(idx, cmds)` | 去掉前 idx 条命令，返回剩余命令串（内部用，一般不需要直接调） | — |
| `T.findItem(idx, n, cmds)` | 按名字在背包找物品并对其执行命令（`p` = 第一个词，如 `use`/`fenjie`） | 物品名 |
| `T.findPlayerByName` / `T.pname` | 按名字在房间找人物并对其执行命令 | 人物名 |
| `T.wait(idx, n, cmds)` | 等待 n 毫秒 | 毫秒数 |
| `T.batwait(idx, n, cmds)` | 仅在战斗中等待 n 毫秒（非战斗直接跳过） | 毫秒数 |

## 战斗 / 状态

| 函数 | 作用 | 参数 n |
|---|---|---|
| `T.killall` | 杀光房间所有怪（`WG.kill_all`） | — |
| `T.getall` | 捡光房间所有尸体（`WG.get_all`） | — |
| `T.killw(idx, n, cmds)` | 按名字杀怪，**怪死（itemremove）后才继续** | 怪名 |
| `T.eqw(idx, n, cmds)` | 按名字/ID 穿装备，**穿上（eq 回包）后才继续** | 装备名（`<` 开头=按名字找）/ID |
| `T.waitpfm(idx, n, cmds)` | 放指定技能，**技能生效或脱离战斗后才继续**（最多重试约 1 次） | 技能名 |
| `T.stoppfm` / `T.startpfm` | 关闭/开启自动施法 | — |
| `T.stopautopfm(idx, n, cmds)` | 把技能加入自动施法黑名单 | 技能名（逗号分隔多个） |
| `T.startautopfm(idx, n, cmds)` | 把技能移出自动施法黑名单 | 技能名（逗号分隔多个） |
| `T.stopallauto` / `T.startallauto` | 暂停/恢复自动喜宴与自动 BOSS | — |
| `T.clsSakada` | 清空 DPS 统计 | — |

## 移动 / 挂机

| 函数 | 作用 | 参数 n |
|---|---|---|
| `T.to(idx, n, cmds)` | 走到指定地点（`WG.go`，支持 place 表/函数） | 地点名，如 `扬州城-钱庄` |
| `T.zdwk` | 按设置开始挖矿/修炼/钓鱼（`WG.zdwk`） | — |
| `T.rzdwk` | 重置挂机（`WG.zdwk("", false)`） | — |
| `T.gogzm` | 一键去武道塔谷摘蘑菇（自动找"疯癫的老头"） | — |
| `T.godddb` | 一键去武道塔打打宝（自动找"疯癫的老头"） | — |

## 自命令 / 触发器 / 监控

| 函数 | 作用 | 参数 n |
|---|---|---|
| `T.usezml(idx, n, cmds)` | 执行指定自命令（按名字匹配 zml 列表）**非阻塞** | 自命令名 |
| `@zmlwait 自命令名` | Raid 阻塞自命令：等自命令执行完再继续（替代非阻塞的 `T.usezml`/`$usezml`） | 自命令名 |
| `T.usetz(idx, n, cmds)` | 执行指定扩展脚本（按名字匹配 `extends` 配置） | 扩展名 |
| `T.startjk(idx, n, cmds)` | 启用指定状态监控（按名字匹配 ztjk 列表） | 监控名 |
| `T.stopjk(idx, n, cmds)` | 停用指定状态监控 | 监控名 |
| `T.callcontextMenu` | 弹出右键菜单（等价右键页面） | — |

## 交互 / 输出

| 函数 | 作用 | 参数 n |
|---|---|---|
| `T.roll(idx, n, cmds)` | 掷骰子：1=帮派频道、2=世界频道、3=say 随机数 | 1/2/3 |
| `T.cls` | 清空日志区 | — |
| `T.syso(idx, n, cmds)` | 往日志区输出一条文字 | 文字 |
| `T.tts(idx, n, cmds)` | 语音朗读（TTS） | 文字 |
| `T.beep` | 播放提示音 | — |
| `T.music` | 播放内置八音盒音乐（《绿》音轨） | — |
| `T.stop(idx, n, cmds)` | 停止所有自动（`WG.timer_close`） | — |
| `T.close(idx, n, cmds)` | 关闭当前对话框（Esc） | — |

---

*对照版本：26.2.3 · 行号以当前 helpers.js 为准 · 自命令里 `$` 用法示例：`$wait 500;score` → 等 0.5 秒后发 score*
