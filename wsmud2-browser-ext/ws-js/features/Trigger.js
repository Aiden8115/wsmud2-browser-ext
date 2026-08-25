// ============================================================
// Trigger.js —— 触发器系统
// ------------------------------------------------------------
// 把"游戏事件 → 条件 → 自动执行"做成可视化配置：
//   用户选一个事件模板（如"血低于 30%"、"收到某频道聊天"），
//   填过滤条件，再写要执行的 Raid 流程源码，
//   之后每次事件发生且条件满足，就会自动执行那段流程。
//
// 对外接口（挂在全局）：
//   TriggerCenter  触发器管理（create/modify/remove/activate/getAll 等）
//   TriggerUI      触发器管理界面
//   TriggerConfig  触发器配置导入导出
//
// 内部机制：NotificationCenter（发布/订阅）+ MonitorCenter
//   （每个事件类型注册一个 WG.add_hook 监听，游戏事件来了广播通知）。
//
// 支持的事件类型：Buff 变化、聊天信息、人物刷新、物品拾取、
//   新提示、社交消息、活动事件、战斗/死亡状态、时辰（定时）、
//   技能释放/冷却结束、气血内力变化、伤害 等 16 类。
//
// 想改：某事件的默认过滤条件、模板简介文字、触发时的提示语 → 在本文件搜索。
// ============================================================
(function () {
    'use strict';

    function CopyObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    function is_match(src, input) {
        if (src.length == 0 && input.length == 0) {
            return true;
        }
        if (src[0] == "*" && src.length == 1) {
            return true;
        }
        if (src.length == 0 || input.length == 0) {
            return false;
        }
        if (src[0] == "?") {
            return is_match(src.substring(1), input.substring(1));
        } else
            if (src[0] == "*") {
                return is_match(src.substring(1), input) || is_match(src.substring(1), input.substring(1)) || is_match(src, input.substring(1));
            } else
                if (src[0] == input[0]) {
                    return is_match(src.substring(1), input.substring(1));
                } else {
                    return false;
                }

    }

    /***********************************************************************************\
        Notification Center
    \***********************************************************************************/

    class Notification {
        constructor(name, params) {
            this.name = name;
            this.params = params;
        }
    }

    class NotificationObserver {
        constructor(targetName, action) {
            this.targetName = targetName;
            this.action = action;
        }
    }

    const NotificationCenter = {
        observe: function (notificationName, action) {
            const index = this._getOberverIndex();
            const observer = new NotificationObserver(notificationName, action);
            this._observers[index] = observer;
            return index;
        },
        removeOberver: function (index) {
            delete this._observers[index];
        },
        /**
         * @param {Notification} notification
         */
        post: function (notification) {
            for (const key in this._observers) {
                if (!this._observers.hasOwnProperty(key)) continue;
                const observer = this._observers[key];
                if (observer.targetName != notification.name) continue;
                // 【2026-08-11 隔离】单个触发器执行抛错不再中断同一通知的其他触发器
                try {
                    observer.action(notification.params);
                } catch (e) {
                    try { ExtLog.error('[触发] 触发器执行异常（已隔离）:', e && e.message); } catch (e2) { }
                }
            }
        },

        _observerCounter: 0,
        _observers: {},
        _getOberverIndex: function () {
            const index = this._observerCounter;
            this._observerCounter += 1;
            return index;
        }
    };

    /***********************************************************************************\
        Monitor Center
    \***********************************************************************************/

    class Monitor {
        constructor(run) {
            this.run = run;
        }
    }

    const MonitorCenter = {
        addMonitor: function (monitor) {
            this._monitors.push(monitor);
        },
        run: function () {
            for (const monitor of this._monitors) {
                monitor.run();
            }
        },

        _monitors: []
    };

    /***********************************************************************************\
        Trigger Template And Trigger
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  Trigger Template
    //---------------------------------------------------------------------------

    const EqualAssert = function (lh, rh) {
        return lh == rh;
    };

    const ContainAssert = function (lh, rh) {
        if (/^\s*\*?\s*$/.test(lh)) return true;
        const list = lh.split("|");
        return list.indexOf(rh) != -1;
    };
    const ContainReverseAssert = function (lh, rh) {
        // console.log(lh, rh);
        if (/^\s*\*?\s*$/.test(lh)) return true;
        const list = lh.split("|");
        return list.indexOf(rh) == -1;
    };

    const KeyAssert = function (lh, rh) {
        if (/^\s*\*?\s*$/.test(lh)) return true;
        
        // 辅助函数：检查单个关键字是否匹配
        function isKeyMatch(key) {
            return rh.indexOf(key.trim()) != -1;
        }
        
        // 辅助函数：解析表达式
        function parseExpression(expr) {
            // 处理括号
            while (expr.includes('(')) {
                const start = expr.lastIndexOf('(');
                const end = expr.indexOf(')', start);
                if (end === -1) break; // 括号不匹配，忽略
                
                const subExpr = expr.substring(start + 1, end);
                const subResult = evaluateOr(subExpr);
                expr = expr.substring(0, start) + (subResult ? 'MATCHED' : 'UNMATCHED') + expr.substring(end + 1);
            }
            
            return evaluateOr(expr);
        }
        
        // 处理OR操作（||）
        function evaluateOr(expr) {
            const orParts = expr.split('||');
            for (const part of orParts) {
                if (evaluateAnd(part.trim())) {
                    return true;
                }
            }
            return false;
        }
        
        // 处理AND操作（&&）
        function evaluateAnd(expr) {
            const andParts = expr.split('&&');
            for (const part of andParts) {
                const trimmed = part.trim();
                // 如果是前面括号处理后的结果，直接使用
                if (trimmed === 'MATCHED') continue;
                if (trimmed === 'UNMATCHED') return false;
                if (!isKeyMatch(trimmed)) {
                    return false;
                }
            }
            return true;
        }
        
        return parseExpression(lh);
    };

    class Filter {
        constructor(name, type, defaultValue, assert) {
            this.name = name;
            this.type = type;
            this.defaultValue = defaultValue;
            this.assert = assert == null ? EqualAssert : assert;
        }
        description(value) {
            if (value != null) {
                this._desc = value;
                return;
            }
            return this._desc == null ? this.name : this._desc;
        }
    }

    class SelectFilter extends Filter {
        constructor(name, options, defaultNumber, assert) {
            const defaultValue = options[defaultNumber];
            super(name, "select", defaultValue, assert);
            this.options = options;
        }
    }

    const InputFilterFormat = {
        number: "数字",
        text: "文本"
    };

    class InputFilter extends Filter {
        /**
         * @param {String} name
         * @param {InputFilterFormat} format
         * @param {*} defaultValue
         */
        constructor(name, format, defaultValue, assert) {
            super(name, "input", defaultValue, assert);
            this.format = format;
        }
    }

    class TriggerTemplate {
        constructor(event, filters, introdution) {
            this.event = event;
            this.filters = filters;
            this.introdution = `${introdution}\n// 如需更多信息，可以到论坛触发器版块发帖。`;
        }
        getFilter(name) {
            for (const filter of this.filters) {
                if (filter.name == name) return filter;
            }
            return null;
        }
    }

    const TriggerTemplateCenter = {
        add: function (template) {
            this._templates[template.event] = template;
        },
        getAll: function () {
            return Object.values(this._templates);
        },
        get: function (event) {
            return this._templates[event];
        },

        _templates: {},
    };

    //---------------------------------------------------------------------------
    //  Trigger
    //---------------------------------------------------------------------------

    class Trigger {
        constructor(name, template, conditions, source) {
            this.name = name;
            this.template = template;
            this.conditions = conditions;
            this.source = source;
            this._action = function (params) {
                let realParams = CopyObject(params);
                for (const key in conditions) {
                    if (!conditions.hasOwnProperty(key)) continue;
                    const filter = template.getFilter(key);
                    if (filter == null) return;   // 【2026-08-11】未知模板 filter 判空，避免执行时崩溃
                    const fromUser = conditions[key];
                    const fromGame = params[key];
                    if (!filter.assert(fromUser, fromGame)) return;
                    delete realParams[key];
                }
                let realSource = source;
                for (const key in realParams) {
                    realSource = `($${key}) = ${realParams[key]}\n${realSource}`;
                }
                if (/\/\/\s*~silent\s*\n/.test(source) == false) {
                    realSource = `@print 💡<hio>触发=>${name}</hio>\n${realSource}`;
                }
                ToRaid.perform(realSource, name, false);
            };
            this._observerIndex = null;
        }

        event() { return this.template.event; }
        active() { return this._observerIndex != null; }

        _activate() {
            if (this._observerIndex != null) return;
            if (this.template == null) return;
            this._observerIndex = NotificationCenter.observe(this.template.event, this._action);
        }
        _deactivate() {
            if (this._observerIndex == null) return;
            NotificationCenter.removeOberver(this._observerIndex);
            this._observerIndex = null;
        }
    }

    class TriggerData {
        constructor(name, event, conditions, source, active) {
            this.name = name;
            this.event = event;
            this.conditions = conditions;
            this.source = source;
            this.active = active;
        }
    }

    const TriggerCenter = {
        run: function () {
            const allData = GM_getValue(this._saveKey(), {});
            for (const name in allData) {
                this._loadTrigger(name);
            }
        },
        reload: function () {
            for (const name in this._triggers) {
                if (!this._triggers.hasOwnProperty(name)) continue;
                const trigger = this._triggers[name];
                trigger._deactivate();
                delete this._triggers[name];
            }
            this.run();
        },

        // for upload and download
        getAllData: function () {
            return GM_getValue(this._saveKey(), {});
        },
        corver: function (triggerDatas) {
            for (const old of this.getAll()) {
                this.remove(old.name);
            }
            for (const name in triggerDatas) {
                const trigger = triggerDatas[name];
                this.create(trigger.name, trigger.event, trigger.conditions, trigger.source, trigger.active);
            }
        },

        getAll: function () {
            return Object.values(this._triggers);
        },
        create: function (name, event, conditions, source, active) {
            const checkResult = this._checkName(name);
            if (checkResult != true) return checkResult;

            const theActive = active == null ? false : active;
            const data = new TriggerData(name, event, conditions, source, theActive);
            this._updateData(data);

            this._loadTrigger(name);
            return true;
        },
        modify: function (originalName, name, conditions, source) {
            const trigger = this._triggers[originalName];
            if (trigger == null) return "修改不存在的触发器？";

            const event = trigger.event();
            if (originalName == name) {
                const data = new TriggerData(name, event, conditions, source, trigger.active());
                this._updateData(data);
                this._reloadTrigger(name);
                return true;
            }

            const result = this.create(name, event, conditions, source);
            if (result == true) {
                this.remove(originalName);
                this._loadTrigger(name);
            }
            return result;
        },
        remove: function (name) {
            const trigger = this._triggers[name];
            if (trigger == null) return;

            trigger._deactivate();
            delete this._triggers[name];
            let allData = GM_getValue(this._saveKey(), {});
            delete allData[name];
            GM_setValue(this._saveKey(), allData);
        },

        activate: function (name) {
            for (let x in this._triggers) {
                if (is_match(name, x)) {
                    const trigger = this._triggers[x];
                    if (trigger == null) continue;
                    if (trigger.active()) continue;
                    trigger._activate();
                    let data = this._getData(x);
                    data.active = true;
                    this._updateData(data);
                }
            }
        },
        deactivate: function (name) {
            for (let x in this._triggers) {
                if (is_match(name, x)) {
                    const trigger = this._triggers[x];
                    if (trigger == null) continue;
                    if (!trigger.active()) continue;
                    trigger._deactivate();
                    let data = this._getData(x);
                    data.active = false;
                    this._updateData(data);
                }
            }
        },
        _triggers: {},

        _saveKey: function () {
            return `${Role.id}@triggers`;
        },
        _reloadTrigger: function (name) {
            const oldTrigger = this._triggers[name];
            if (oldTrigger != null) {
                oldTrigger._deactivate();
            }
            this._loadTrigger(name);
        },
        _loadTrigger: function (name) {
            const data = this._getData(name);
            if (data == null) return;
            // 【2026-08-11 数据健康】损坏数据不崩溃：非对象数据跳过并提示；字段缺失补默认（能打开/能删除）
            if (typeof data !== 'object') {
                try { ExtLog.warn('[触发] 数据损坏（非对象），已跳过加载: ' + name + '（可用设置→恢复备份 或手动删除该键）'); } catch (e) { }
                return;
            }
            if (typeof data.conditions !== 'object' || data.conditions == null) {
                data.conditions = {};
                try { ExtLog.warn('[触发] 数据不完整（conditions 缺失），已补默认: ' + name); } catch (e) { }
            }
            if (typeof data.source !== 'string') {
                data.source = '';
                try { ExtLog.warn('[触发] 数据不完整（source 缺失），已补默认: ' + name); } catch (e) { }
            }
            // 旧数据兼容：补全"忽略发言人"字段
            if (data['event'] === '新聊天信息' && data['conditions']['忽略发言人'] === undefined) {
                data['conditions']['忽略发言人'] = '';
            }
            const trigger = this._toTrigger(data);
            this._triggers[name] = trigger;
            if (data.active) {
                trigger._activate();
            }
        },
        _getData: function (name) {
            let allData = GM_getValue(this._saveKey(), {});
            return allData[name];
        },
        _updateData: function (data) {
            let allData = GM_getValue(this._saveKey(), {});
            allData[data.name] = data;
            GM_setValue(this._saveKey(), allData);
        },
        _toTrigger: function (data) {
            let template = TriggerTemplateCenter.get(data.event);
            if (template == null) {
                // 【2026-08-11 修复】未知事件兜底：老版本/导入的数据其事件模板可能不存在（template 为 null），
                // 原代码直接 new Trigger(name, null, ...) → 点「设置」时 template.filters 崩溃 → 触发打不开也删不掉。
                // 兜底模板：filters 为空、introdution 带提示，保证能打开编辑/删除。
                ExtLog.warn(`[Trigger] 触发「${data.name}」事件「${data.event}」模板不存在，已用兜底模板加载（建议删除或改用已知事件重建）`);
                template = new TriggerTemplate(data.event, [], `// ⚠️ 此触发的触发事件「${data.event}」在当前版本中不存在（老数据或导入损坏）。\n// 你可以查看下面的脚本内容，或直接删除此触发器。\n// 如需保留，请删除后改用「新建」选择正确的触发事件重建。`);
            }
            return new Trigger(data.name, template, data.conditions, data.source);
        },
        _checkName: function (name) {
            if (this._triggers[name] != null) return "无法修改名称，已经存在同名触发器！";
            if (!/\S+/.test(name)) return "触发器的名称不能为空。";
            if (!/^[_a-zA-Z0-9\u4e00-\u9fa5]+$/.test(name)) return "触发器的名称只能使用中文、英文和数字字符。";
            return true;
        }
    };

    /***********************************************************************************\
        WSMUD
    \***********************************************************************************/

    var WG = null;
    var messageAppend = null;
    var messageClear = null;
    var ToRaid = null;
    var Role = null;


    //---------------------------------------------------------------------------
    //  status
    //---------------------------------------------------------------------------

    (function () {
        const type = new SelectFilter("改变类型", ["新增", "移除", "层数刷新"], 0);
        const value = new InputFilter("BuffId", InputFilterFormat.text, "weapon", ContainAssert);
        const target = new SelectFilter("触发对象", ["自己", "他人"], 0);
        let filters = [type, value, target];
        const intro = `// Buff状态改变触发器
// 触发对象id：(id)
// buff的sid：(sid)
// buff层数：(count)
// duration持续时间：(duration);
// buff的名字：(name)
// ⚠ 填写提示：多个 BuffId 用单个 | 分隔，如 weapon|sword`;
        const t = new TriggerTemplate("Buff状态改变", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            const post = function (data, sid, type) {
                let params = {
                    "改变类型": type,
                    "BuffId": sid,
                    "触发对象": data.id == Role.id ? "自己" : "他人"
                };
                params["id"] = data.id;
                params["sid"] = sid;
                params["count"] = 0;
                params["duration"] = 0;
                params["name"] = data.name;
                if (data.count != null) params["count"] = data.count;
                if (data.duration != null) params["duration"] = data.duration;
                const n = new Notification("Buff状态改变", params);
                NotificationCenter.post(n);
            };
            WG.add_hook("status", data => {
                if (data.action == null || data.id == null || data.sid == null) return;
                const types = {
                    "add": "新增",
                    "remove": "移除",
                    "refresh": "层数刷新"
                };
                const type = types[data.action];
                if (type == null) return;
                if (data.sid instanceof Array) {
                    for (const s of data.sid) {
                        post(data, s, type);
                    }
                } else {
                    post(data, data.sid, type);
                }
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  msg
    //---------------------------------------------------------------------------

    (function () {
        const channel = new SelectFilter(
            "频道",
            ["全部", "世界", "队伍", "门派", "全区", "帮派", "谣言", "系统"],
            0,
            function (fromUser, fromGame) {
                if (fromUser == "全部") return true;
                return fromUser == fromGame;
            }
        );
        const talker = new InputFilter("发言人", InputFilterFormat.text, "", ContainAssert);
        const pass_talker = new InputFilter("忽略发言人", InputFilterFormat.text, "", ContainReverseAssert);
        const key = new InputFilter("关键字", InputFilterFormat.text, "", KeyAssert);
        let filters = [channel, talker, pass_talker, key];
        const intro = `// 新聊天信息触发器
// 聊天信息内容：(content)
// 发言人：(name)
// 发言人id：(id)
// 频道：(channel)
// ⚠ 填写提示：发言人/忽略发言人 多个用单个 | 分隔；关键字 用 || 或、&& 且、() 括号组合`;
        const t = new TriggerTemplate("新聊天信息", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("msg", data => {
                if (data.ch == null || data.content == null) return;
                const types = {
                    "chat": "世界",
                    "tm": "队伍",
                    "fam": "门派",
                    "es": "全区",
                    "pty": "帮派",
                    "rumor": "谣言",
                    "sys": "系统"
                };
                const channel = types[data.ch];
                if (channel == null) return;
                const name = data.name == null ? "无" : data.name;
                const id = data.uid == null ? null : data.uid;
                const datacontent = data.content.replace(/\n/g, "")
                let params = {
                    "频道": channel,
                    "发言人": name,
                    "关键字": data.content,
                    "忽略发言人": name
                };
                params["content"] = datacontent;
                params["name"] = name;
                params["id"] = id;
                params["channel"] = channel;
                const n = new Notification("新聊天信息", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  item add
    //---------------------------------------------------------------------------

    (function () {
        const name = new InputFilter("人物名称", InputFilterFormat.text, "", KeyAssert);
        name.description("人名关键字");
        let filters = [name];
        const intro = `// 人物刷新触发器
// 刷新人物id：(id)
// 刷新人物名称：(name)
// ⚠ 填写提示：人名关键字 用 || 或、&& 且、() 括号组合，如 张无忌 || 张三丰`;
        const t = new TriggerTemplate("人物刷新", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("itemadd", data => {
                if (data.name == null || data.id == null) return;
                let params = {
                    "人物名称": data.name,
                };
                params["id"] = data.id;
                params["name"] = data.name;
                const n = new Notification("人物刷新", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  dialog pack
    //---------------------------------------------------------------------------

    (function () {
        const name = new InputFilter("名称关键字", InputFilterFormat.text, "", KeyAssert);
        let filters = [name];
        const intro = `// 物品拾取触发器
// 拾取物品id：(id)
// 拾取物品名称：(name)
// 拾取物品数量：(count)
// 物品品质：(quality)  值：白、绿、蓝、黄、紫、橙、红、未知
// ⚠ 填写提示：名称关键字 用 || 或、&& 且、() 括号组合，如 玄铁剑 || 倚天剑`;
        const t = new TriggerTemplate("物品拾取", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("dialog", function (data) {
                if (data.dialog != "pack" || data.id == null || data.name == null || data.count == null || data.remove != null) return;
                let params = {
                    "名称关键字": data.name,
                };
                params["id"] = data.id;
                params["name"] = data.name;
                params["count"] = data.count;
                let quality = "未知";
                const tag = /<\w{3}>/.exec(data.name)[0];
                const tagMap = {
                    "<wht>": "白",
                    "<hig>": "绿",
                    "<hic>": "蓝",
                    "<hiy>": "黄",
                    "<HIZ>": "紫",
                    "<hio>": "橙",
                    "<ord>": "红"
                }
                quality = tagMap[tag];
                params["quality"] = quality;
                const n = new Notification("物品拾取", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  text
    //---------------------------------------------------------------------------

    (function () {
        const name = new InputFilter("关键字", InputFilterFormat.text, "", KeyAssert);
        let filters = [name];
        const intro = `// 新提示信息触发器
// 提示信息：(text)
// ⚠ 填写提示：关键字 用 || 或、&& 且、() 括号组合`;
        const t = new TriggerTemplate("新提示信息", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("text", data => {
                if (data.msg == null) return;
                let params = {
                    "关键字": data.msg,
                };
                params["text"] = data.msg.split('\n').join('');
                const n = new Notification("新提示信息", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

        //---------------------------------------------------------------------------
    //  message
    //---------------------------------------------------------------------------

    (function () {
        const name = new InputFilter("关键字", InputFilterFormat.text, "", KeyAssert);
        let filters = [name];
        const intro = `// 社交消息触发器
// 社交消息：(msg)
// ⚠ 填写提示：关键字 用 || 或、&& 且、() 括号组合`;
        const t = new TriggerTemplate("社交消息", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("dialog", data => {
                if (data.dialog != "message" ||data.id ||data.items) return;

                let params = {
                    "关键字": data.message.content,
                };
                params["msg"] = data.message.content;
                const n = new Notification("社交消息", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();
 //---------------------------------------------------------------------------
    //  auction
    //---------------------------------------------------------------------------
    (function () {
        const key = new InputFilter("关键字", InputFilterFormat.text, "", KeyAssert);
        const grade = new InputFilter("物品等级", InputFilterFormat.text, "", ContainAssert);
        let filters = [key, grade];
        const intro = `// 拍卖查询触发器
// 拍卖需要使用pm list来触发
// ⚠ 填写提示：关键字 用 || 或、&& 且、() 括号组合；物品等级 多个用单个 | 分隔，如 1|2|3`;
// 物品id：(id)
// 物品名字：(name)
// 物品等级：(grade)
// 价格：(price)
// 剩余时间：(time)`;
        const t = new TriggerTemplate("拍卖查询", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("dialog", data => {
                if (data.dialog != "pm" || !Array.isArray(data.list)) return;

                // 遍历拍卖列表中的所有物品
                for (let i = 0; i < data.list.length; i++) {
                    const item = data.list[i];

                    // 提取原始数据
                    const id = item[0];
                    const rawName = item[1];
                    const price = item[2];
                    const rawTime = item[3];

                    // 处理时间：转换为秒并取整
                    const time = Math.floor(rawTime / 1000);

                    // 处理物品名称和等级
                    let name = "未知物品";
                    let gradeNum = 0;
                    
                    // 从rawName中提取名称和等级
                    if (typeof rawName === 'string') {
                        // 处理物品名称
                        const nameMatch = rawName.match(/<\w{3}>([^<]+)<\/\w{3}>/) || rawName.match(/<\w{3}>([^<]+)/);
                        if (nameMatch && nameMatch[1]) {
                            name = nameMatch[1].trim();
                        } else {
                            // 如果没有找到标签，使用原始文本
                            name = rawName.replace(/^\d+份/, '').trim();
                        }

                        // 处理物品等级（颜色标签转数字）
                        const gradeMap = {
                            '<hig>': '1', // 绿色
                            '<hic>': '2', // 蓝色
                            '<hiy>': '3', // 黄色
                            '<HIZ>': '4', // 紫色
                            '<hio>': '5'  // 橙色
                        };

                        for (const [tag, num] of Object.entries(gradeMap)) {
                            if (rawName.includes(tag)) {
                                gradeNum = num;
                                break;
                            }
                        }
                    }

                    // 构建参数对象
                    let params = {
                        "关键字": name,
                        "物品等级": gradeNum
                    };
                    params["id"] = id;
                    params["name"] = name;
                    params["grade"] = gradeNum;
                    params["price"] = price;
                    params["time"] = time;

                    // 发送通知
                    const n = new Notification("拍卖查询", params);
                    NotificationCenter.post(n);
                }
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();
    

    //---------------------------------------------------------------------------
    //  dialog events
    //---------------------------------------------------------------------------
    (function () {
        const eventname = new SelectFilter(
            "名称",["挖矿指南", "门派战", "BOSS", "婚礼", "帮派战", "襄阳守城", "龙脉", "仙山"],0,
            function (fromUser, fromGame) {
                // 实现包含匹配逻辑，不要求完全相同
                if (!fromGame || typeof fromGame !== 'string') return false;
                return fromGame.toLowerCase().includes(fromUser.toLowerCase());
            }
        );
        const key = new InputFilter("关键字", InputFilterFormat.text, "", KeyAssert);
        let filters = [eventname, key];
        const intro = `// 活动事件触发器
// 活动类型代码：(type);
// 活动名称：(event);
// 活动关键词：(content);
// 活动等级：(grade);
// 活动持续时间：当日时间戳(times);值为：(小时)*3600+(分钟)*60+(秒)
// ⚠ 填写提示：关键字 用 || 或、&& 且、() 括号组合`;
        const t = new TriggerTemplate("活动事件", filters, intro);
        TriggerTemplateCenter.add(t);
        const run = function () {
            WG.add_hook("dialog", data => {
                if (data.dialog != "events" || !Array.isArray(data.items)) return;

                // 遍历所有活动项目
                for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];

                const activityName = item[1]; // 活动名称
                const activityKeyword = item[2]; // 活动关键词

                // 处理时间戳
                let timestampStr = "";
                if (activityName === "boss" && item[4] !== undefined && typeof item[4] !== "number" && item[5] !== undefined) {
                    const fullTimestamp = item[5]; // 原始毫秒时间戳
                    const date = new Date(fullTimestamp);
                    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    // 计算从当天0:00开始的时间差（毫秒），转换为秒并向下取整
                    const timeSinceMidnight = fullTimestamp - todayStart.getTime();
                    timestampStr = Math.floor(timeSinceMidnight / 1000).toString();
                } else if (item[4]) {
                    // 新的时间戳处理逻辑：计算从本日0:00开始的时间戳（毫秒），转换为秒并向下取整
                    const fullTimestamp = item[4]; // 原始毫秒时间戳
                    const date = new Date(fullTimestamp);
                    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    // 计算从当天0:00开始的时间差（毫秒），转换为秒并向下取整
                    const timeSinceMidnight = fullTimestamp - todayStart.getTime();
                    timestampStr = Math.floor(timeSinceMidnight / 1000).toString();
                }

                // 构建参数对象
                let params = {
                    "名称": activityName,
                    "关键字": activityKeyword,
                };

                // 添加类型ID（如果存在）
                params["type"] = item[0];
                params["grade"] = item[3];
                params["times"] = timestampStr;
                params["content"] = activityKeyword;
                params["event"] = activityName;
                // 创建并发送通知
                const n = new Notification("活动事件", params);
                NotificationCenter.post(n);

                }
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();
    
    //---------------------------------------------------------------------------
    //  combat
    //---------------------------------------------------------------------------

    (function () {
        const type = new SelectFilter("类型", ["进入战斗", "脱离战斗"], 0);
        let filters = [type];
        const intro = "// 战斗状态切换触发器";
        const t = new TriggerTemplate("战斗状态切换", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("combat", data => {
                let params = null;
                if (data.start != null && data.start == 1) {
                    params = { "类型": "进入战斗" };
                } else if (data.end != null && data.end == 1) {
                    params = { "类型": "脱离战斗" };
                }
                const n = new Notification("战斗状态切换", params);
                NotificationCenter.post(n);
            });
            WG.add_hook("text", function (data) {
                if (data.msg == null) return;
                if (data.msg.indexOf('只能在战斗中使用') != -1 || data.msg.indexOf('这里不允许战斗') != -1 || data.msg.indexOf('没时间这么做') != -1) {
                    const params = { "类型": "脱离战斗" };
                    const n = new Notification("战斗状态切换", params);
                    NotificationCenter.post(n);
                }
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();


    //---------------------------------------------------------------------------
    //  die
    //---------------------------------------------------------------------------

    (function () {
        const type = new SelectFilter("类型", ["已经死亡", "已经复活"], 0);
        let filters = [type];
        const intro = "// 死亡状态改变触发器";
        const t = new TriggerTemplate("死亡状态改变", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("die", data => {
                const value = data.relive == null ? "已经死亡" : "已经复活";
                let params = {
                    "类型": value
                };
                const n = new Notification("死亡状态改变", params);
                NotificationCenter.post(n);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  time
    //---------------------------------------------------------------------------

    (function () {
        // 【2026-08-22】时辰已到支持"任意/多选"自由输入：
        // 时/分/秒 改为文本输入框，填单个数字则精确匹配，填 1|2|3 多选，留空或填 * 表示"任意"。
        // 例：分=0、秒=0、时留空(*) → 每个整点触发一次，无需建 24 个触发器。
        const TimeReachedAssert = function (lh, rh) {
            if (lh == null || /^\s*$/.test(String(lh)) || /^\s*\*\s*$/.test(String(lh))) return true;
            return String(lh).split("|").indexOf(String(rh)) != -1;
        };
        const hour = new InputFilter("hour", InputFilterFormat.text, "", TimeReachedAssert);
        hour.description("时");
        const minute = new InputFilter("minute", InputFilterFormat.text, "", TimeReachedAssert);
        minute.description("分");
        const second = new InputFilter("second", InputFilterFormat.text, "", TimeReachedAssert);
        second.description("秒");
        let filters = [hour, minute, second];
        const intro = `// 时辰已到触发器
// ⚠ 填写提示：时/分/秒 留空或填 * = 任意；填 1|2|3 = 多个可选；填 5 = 仅 5；例（每个整点）：时留空、分=0、秒=0`;
        const t = new TriggerTemplate("时辰已到", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            // 【2026-08-24】"时辰已到"时钟改为【双源冗余】，确保服务器/后台/深度节流下到点绝不出错：
            //   ① Web Worker 时钟 —— worker 定时器后台不被节流，消息投递也不受节流；
            //   ② 主线程对齐定时器 —— 作为兜底基准（服务器前台常驻/无后台时同样精确）。
            //   两个来源都调用同一个 settle()：它按真实 wall-clock 去重投递 + 无条件回补漏秒，
            //   因此即便其中一路失效（如 worker 被 CSP/环境禁用，或主线程被节流），另一路仍保证不漏。
            let lastBoundary = null;   // 上一次已投递的整秒边界（epoch 毫秒）
            function postSecond(ms) {
                const d = new Date(ms);
                const n = new Notification("时辰已到", {
                    "hour": d.getHours(),
                    "minute": d.getMinutes(),
                    "second": d.getSeconds()
                });
                NotificationCenter.post(n);
            }
            function settle(nowMs) {
                const curBound = Math.floor(nowMs / 1000) * 1000;
                if (lastBoundary == null) {
                    lastBoundary = curBound;
                    postSecond(curBound);
                } else if (curBound > lastBoundary) {
                    // 无条件回补自上次投递以来漏掉的每个整秒，无论冻结/卡顿多久都不漏
                    for (let b = lastBoundary + 1000; b <= curBound; b += 1000) {
                        postSecond(b);
                    }
                    lastBoundary = curBound;
                }
            }
            // 来源②：主线程对齐定时器（兜底基准，始终运行）
            (function mainClock() {
                try { settle(Date.now()); } catch (e) { }
                const now = Date.now();
                const nextBoundary = (Math.floor(now / 1000) * 1000) + 1000;
                setTimeout(function () { mainClock(); }, nextBoundary + 1 - now);
            })();
            // 来源①：Web Worker 时钟（抗后台节流；失败不影响来源②）
            try {
                const url = URL.createObjectURL(new Blob(
                    ["setInterval(function(){postMessage(1);},250);"],
                    { type: "application/javascript" }
                ));
                const worker = new Worker(url);
                worker.onmessage = function () { try { settle(Date.now()); } catch (e) { } };
                window.__wsmud_time_worker = worker;   // 保活引用，防 worker 被 GC 回收
            } catch (e) { /* 忽略：主线程时钟已可独立工作 */ }
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  dispfm
    //---------------------------------------------------------------------------

    (function () {
        const sid = new InputFilter("技能id", InputFilterFormat.text, "", ContainAssert);
        let filters = [sid];
        const intro = `// 技能释放触发器
// 技能id：(id)
// 出招时间：(rtime)
// 冷却时间：(distime)
// ⚠ 填写提示：技能id 多个用单个 | 分隔，如 100|200`;
        const t = new TriggerTemplate("技能释放", filters, intro);
        TriggerTemplateCenter.add(t);

        const sid1 = new InputFilter("技能id", InputFilterFormat.text, "", ContainAssert);
        let filters1 = [sid1];
        const intro1 = `// 技能冷却结束触发器
// 技能id：(id)
// ⚠ 填写提示：技能id 多个用单个 | 分隔，如 100|200`;
        const t1 = new TriggerTemplate("技能冷却结束", filters1, intro1);
        TriggerTemplateCenter.add(t1);

        const run = function () {
            WG.add_hook("dispfm", data => {
                if (data.id == null || data.distime == null || data.rtime == null) return;
                let params = {
                    "技能id": data.id
                };
                params["id"] = data.id;
                params["rtime"] = data.rtime;
                params["distime"] = data.distime;
                const n = new Notification("技能释放", params);
                NotificationCenter.post(n);

                setTimeout(_ => {
                    let params = {
                        "技能id": data.id
                    };
                    params["id"] = data.id;
                    const n = new Notification("技能冷却结束", params);
                    NotificationCenter.post(n);
                }, data.distime);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  hp mp
    //---------------------------------------------------------------------------

    var RoomItems = {};

    (function () {
        const name = new InputFilter("人名关键字", InputFilterFormat.text, "", KeyAssert);
        const type = new SelectFilter("类型", ["气血", "内力"], 0, EqualAssert);
        const compare = new SelectFilter("当", ["低于", "高于"], 0, EqualAssert);
        const valueType = new SelectFilter("值类型", ["百分比", "数值"], 0, EqualAssert);
        const value = new InputFilter("值", InputFilterFormat.number, 0, function (fromUser, fromGame) {
            const parts = fromGame.split(";");
            const oldvalue = parseFloat(parts[0]);
            const newvalue = parseFloat(parts[1]);
            if (oldvalue >= fromUser && newvalue < fromUser) return true;
            if (oldvalue <= fromUser && newvalue > fromUser) return true;
            return false;
        });
        let filters = [name, type, compare, valueType, value];
        const intro = `// 气血内力改变触发器
// 人物id：(id)
// 人物当前气血：(hp)
// 人物最大气血：(maxHp)
// 人物当前内力：(mp)
// 人物最大内力：(maxMp)
// ⚠ 填写提示：人名关键字 用 || 或、&& 且、() 括号组合，如 张无忌 || 张三丰`;
        const t = new TriggerTemplate("气血内力改变", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            WG.add_hook("items", data => {
                if (data.items == null) return;
                RoomItems = {};
                for (const item of data.items) {
                    RoomItems[item.id] = CopyObject(item);
                }
            });
            WG.add_hook("itemadd", data => {
                RoomItems[data.id] = CopyObject(data);
            });
            const decorate = function (params, item) {
                params["id"] = item.id;
                params["hp"] = item.hp;
                params["maxHp"] = item.max_hp;
                params["mp"] = item.mp;
                params["maxMp"] = item.max_mp;
            };
            WG.add_hook("sc", data => {
                if (data.id == null) return;
                let item = RoomItems[data.id];
                if (item == null) return;
                if (data.hp != null) {
                    let compare = "低于";
                    if (data.hp > item.hp) compare = "高于";
                    const oldValue = item.hp;
                    const oldPer = (item.hp / item.max_hp * 100).toFixed(2);
                    item.hp = data.hp;
                    if (item.max_hp < item.hp) item.max_hp = item.hp;
                    if (data.max_hp != null) item.max_hp = data.max_hp;
                    const newValue = item.hp;
                    const newPer = (item.hp / item.max_hp * 100).toFixed(2);
                    let params1 = {
                        "人名关键字": item.name,
                        "类型": "气血",
                        "当": compare,
                        "值类型": "百分比",
                        "值": `${oldPer};${newPer}`
                    };
                    decorate(params1, item);
                    const n1 = new Notification("气血内力改变", params1);
                    NotificationCenter.post(n1);
                    let params2 = {
                        "人名关键字": item.name,
                        "类型": "气血",
                        "当": compare,
                        "值类型": "数值",
                        "值": `${oldValue};${newValue}`
                    };
                    decorate(params2, item);
                    const n2 = new Notification("气血内力改变", params2);
                    NotificationCenter.post(n2);
                }
                if (data.mp != null) {
                    let compare = "低于";
                    if (data.mp > item.mp) compare = "高于";
                    const oldValue = item.mp;
                    const oldPer = (item.mp / item.max_mp * 100).toFixed(2);
                    item.mp = data.mp;
                    if (item.max_mp < item.mp) item.max_mp = item.mp;
                    if (data.max_mp != null) item.max_mp = data.max_mp;
                    const newValue = item.mp;
                    const newPer = (item.mp / item.max_mp * 100).toFixed(2);
                    let params1 = {
                        "人名关键字": item.name,
                        "类型": "内力",
                        "当": compare,
                        "值类型": "百分比",
                        "值": `${oldPer};${newPer}`
                    };
                    decorate(params1, item);
                    const n1 = new Notification("气血内力改变", params1);
                    NotificationCenter.post(n1);
                    let params2 = {
                        "人名关键字": item.name,
                        "类型": "内力",
                        "当": compare,
                        "值类型": "数值",
                        "值": `${oldValue};${newValue}`
                    };
                    decorate(params2, item);
                    const n2 = new Notification("气血内力改变", params2);
                    NotificationCenter.post(n2);
                }
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    //---------------------------------------------------------------------------
    //  damage
    //---------------------------------------------------------------------------

    (function () {
        const name = new InputFilter("人名关键字", InputFilterFormat.text, "", KeyAssert);
        const valueType = new SelectFilter("值类型", ["百分比", "数值"], 0, EqualAssert);
        const value = new InputFilter("值", InputFilterFormat.number, 0, (fromUser, fromGame) => {
            const parts = fromGame.split(";");
            const oldvalue = parseFloat(parts[0]);
            const newvalue = parseFloat(parts[1]);
            if (oldvalue <= fromUser && newvalue > fromUser) return true;
            return false;
        });
        let filters = [name, valueType, value];
        const intro = `// 伤害已满触发器
// 备注：限制条件-值 不支持多条件
// 人物id：(id)
// 人物名称：(name)
// 伤害数值：(value)
// 伤害百分比：(percent)
// ⚠ 填写提示：人名关键字 用 || 或、&& 且、() 括号组合，如 张无忌 || 张三丰`;
        const t = new TriggerTemplate("伤害已满", filters, intro);
        TriggerTemplateCenter.add(t);

        const run = function () {
            const decorate = function (params, item, value, percent) {
                params["id"] = item.id;
                params["name"] = item.name;
                params["value"] = value;
                params["percent"] = percent;
            };
            WG.add_hook("sc", data => {
                if (data.id == null || data.damage == null) return;
                let item = RoomItems[data.id];
                if (item == null || item.id == null || item.name == null || item.max_hp == null) return;
                // 获取之前保存的伤害和伤害百分比
                const oldValue = item._damage == null ? 0 : item._damage;
                const oldPer = item._damagePer == null ? 0 : item._damagePer;
                const value = data.damage;
                const percent = (data.damage / item.max_hp * 100).toFixed(2);
                // 保存伤害和伤害百分比
                item._damage = value;
                item._damagePer = percent;
                let params1 = {
                    "人名关键字": item.name,
                    "值类型": "百分比",
                    "值": `${oldPer};${percent}`
                };
                decorate(params1, item, value, percent);
                const n1 = new Notification("伤害已满", params1);
                NotificationCenter.post(n1);
                let params2 = {
                    "人名关键字": item.name,
                    "值类型": "数值",
                    "值": `${oldValue};${value}`
                };
                decorate(params2, item, value, percent);
                const n2 = new Notification("伤害已满", params2);
                NotificationCenter.post(n2);
            });
        };
        const monitor = new Monitor(run);
        MonitorCenter.addMonitor(monitor);
    })();

    /***********************************************************************************\
        UI
    \***********************************************************************************/

    // 【2026-08-11 加固】Vue 单实例管理：弹窗每次 new Vue({el:'#app'}) 前销毁旧实例，
    // 避免连续开关弹窗累积 Vue 实例（内存泄漏 + 状态残留）
    let _triggerVue = null;

    const Message = {
        append: function (msg, area) {
            // 【2026-08-11 修复】同步插入：弹窗 HTML append 后立即 new Vue({el:'#app'})，异步批量会让 Vue 挂载失败 → 弹窗空白
            messageAppend(msg, area, null, true);
        },
        clean: function () {
            messageClear();
        },
    };

    const UI = {
        triggerHome: function () {
            const content = `
            <div>
                <div v-for="t in triggers">
                    <div style="height:1px;background-color:rgba(255,255,255,0.25);margin:0 -20px;"></div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 0 3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">{{ t.name }}</td>
                            <td style="width:40px;text-align:center;">
                                <span style="display:inline-block;width:99px;height:24px;line-height:24px;text-align:center;border-radius:12px;background-color:rgba(255,255,255,0.18);cursor:pointer;font-size:12px;" v-on:click="editTrigger(t)">设置</span>
                            </td>
                            <td style="width:54px;text-align:center;">
                                <span v-if="t.active()" style="display:inline-block;width:66px;height:24px;line-height:24px;text-align:center;border-radius:12px;background-color:#4caf50;color:#e8f5e9;font-size:12px;cursor:pointer;" v-on:click="switchStatus(t)">已开启</span>
                                <span v-else style="display:inline-block;width:66px;height:24px;line-height:24px;text-align:center;border-radius:12px;background-color:rgba(120,120,120,0.5);color:#dddddd;font-size:12px;cursor:pointer;" v-on:click="switchStatus(t)">已关闭</span>
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="height:1px;background-color:rgba(255,255,255,0.25);margin:0 -20px;" v-if="triggers.length"></div>
            </div>
            `;
            const rightText = "<span v-on:click='createTrigger()'><wht>新建</wht></span>";
            UI._appendHtml("🍟 <hio>触发器</hio>", content, rightText);
            if (_triggerVue) { _triggerVue.$destroy(); _triggerVue = null; }
            _triggerVue = new Vue({
                el: '#app',
                data: {
                    triggers: TriggerCenter.getAll()
                },
                methods: {
                    switchStatus: function (t) {
                        if (t.active()) {
                            TriggerCenter.deactivate(t.name);
                        } else {
                            TriggerCenter.activate(t.name);
                        }
                        UI.triggerHome();
                    },
                    editTrigger: UI.editTrigger,
                    createTrigger: UI.selectTriggerTemplate
                }
            });
        },
        selectTriggerTemplate: function () {
            const content = `
            <span class="zdy-item" style="width:120px" v-for="t in templates" v-on:click="select(t)">{{ t.event }}</span>
            `;
            const leftText = "<span v-on:click='back()'>< 返回</span>";
            UI._showModal("<wht>选择触发事件</wht>", content, null, leftText);
            if (_triggerVue) { _triggerVue.$destroy(); _triggerVue = null; }
            _triggerVue = new Vue({
                el: '#app',
                data: {
                    templates: TriggerTemplateCenter.getAll()
                },
                methods: {
                    select: UI.createTrigger,
                    back: function () { UI._closeModal(); UI.triggerHome(); }
                }
            });
        },
        createTrigger: function (template) {
            UI._updateTrigger(template);
        },
        editTrigger: function (trigger) {
            UI._updateTrigger(trigger.template, trigger);
        },
        _updateTrigger: function (template, trigger) {
            const content = `
            <div style="margin:0 2em 0 2em">
                <div style="float:left;width:120px">
                    <span class="zdy-item" style="width:90px" v-for="f in filters">
                    <p style="margin:0"><wht>{{ f.description() }}</wht></p>
                    <input v-if="f.type=='input'" style="width:80%" v-model="conditions[f.name]">
                    <select v-if="f.type=='select'" v-model="conditions[f.name]">
                        <option v-for="opt in f.options" :value="opt">{{ opt }}</option>
                    </select>
                    </span>
                </div>
                <div style="float:right;width:calc(100% - 125px)">
                    <textarea id="trigger-source-editor" class = "settingbox hide" spellcheck="false" style = "height:20rem;display:inline-block;font-size:14px;line-height:1.5;width:100%;font-family:'JetBrains Mono',monospace;" v-model="source"></textarea>
                    <span class="raid-item shareTrigger" v-if="canShared" v-on:click="share()">分享此触发器</span>
                </div>
            </div>
            `;
            const title = `<input style='width:110px' type="text" placeholder="输入触发器名称" v-model="name">`;
            let rightText = "<span v-on:click='save'><wht>保存</wht></span>";
            if (trigger) {
                rightText = "<span v-on:click='remove'>删除</span>"
            }
            let leftText = "<span v-on:click='back'>< 返回</span>";
            if (trigger) {
                leftText = "<span v-on:click='saveback'>< 保存&返回</span>"
            }
            UI._showModal(title, content, rightText, leftText);
            let conditions = {};
            if (trigger != null) {
                conditions = trigger.conditions;
            } else {
                for (const f of template.filters) {
                    conditions[f.name] = f.defaultValue;
                }
            }
            let source = template.introdution;
            if (trigger != null) source = trigger.source;
            if (_triggerVue) { _triggerVue.$destroy(); _triggerVue = null; }
            _triggerVue = new Vue({
                el: '#app',
                data: {
                    filters: template.filters,
                    name: trigger ? trigger.name : "",
                    conditions: conditions,
                    source: source,
                    canShared: trigger != null
                },
                methods: {
                    save: function () {
                        const result = TriggerCenter.create(this.name, template.event, this.conditions, this.source);
                        if (result == true) {
                            UI._closeModal();
                            UI.triggerHome();
                        } else {
                            alert(result);
                        }
                    },
                    remove: function () {
                        const verify = confirm("确认删除此触发器吗？");
                        if (verify) {
                            TriggerCenter.remove(trigger.name);
                            UI._closeModal();
                            UI.triggerHome();
                        }
                    },
                    back: function () {
                        UI.selectTriggerTemplate();
                    },
                    saveback: function () {
                        const result = TriggerCenter.modify(trigger.name, this.name, this.conditions, this.source);
                        if (result == true) {
                            UI._closeModal();
                            UI.triggerHome();
                        } else {
                            alert(result);
                        }
                    },

                    share: function () {
                        ToRaid.shareTrigger(TriggerCenter._getData(trigger.name));
                    }
                }
            })
            // 【2026-08-12 移植作者 f45137e】textarea（v-model 原生）+ Tab 缩进 + 语法高亮编辑器
            try {
                setTimeout(function () {
                    var _ta = _triggerVue && _triggerVue.$el ? _triggerVue.$el.querySelector('textarea') : null;
                    if (_ta) {
                        enableTabIndent(_ta);
                        // 【2026-08-13 移植作者 26.2】语法高亮编辑器（@js 行走 JS 高亮；v-model 靠 textarea 自身 input 事件，包装后不受影响）
                        try { createRaidEditor('trigger-source-editor', { height: '20rem', width: '100%' }); } catch (e2) { }
                    }
                }, 0);
            } catch (e) { }
        },

        _appendHtml: function (title, content, rightText, leftText) {
            var realLeftText = leftText == null ? "" : leftText;
            var realRightText = rightText == null ? "" : rightText;
            var html = `
            <div class = "item-commands" style="text-align:center" id="app">
                <div style="margin-top:0.5em">
                    <div style="width:6em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" id="wsmud_raid_left">${realLeftText}</div>
                    <div style="width:calc(100% - 16em);float:left;height:1.23em">${title}</div>
                    <div style="width:6em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em" id="wsmud_raid_right">${realRightText}</div>
                </div>
                <br><br>
                ${content}
            </div>`;
            Message.clean();
            Message.append(html, 2);
        },
        _closeModal: function () {
            // 【2026-08-11 加固】关闭弹窗时销毁 Vue 实例（防累积泄漏）
            if (_triggerVue) { _triggerVue.$destroy(); _triggerVue = null; }
            var el = document.getElementById('trigger-modal-overlay');
            if (el) el.remove();
        },
        _showModal: function (title, content, rightText, leftText) {
            UI._closeModal();
            // 移除可能残留的 #app 元素，避免 Vue 挂载到错误的位置
            var staleApp = document.getElementById('app');
            if (staleApp) staleApp.remove();
            var realLeftText = leftText ?? "";
            var realRightText = rightText ?? "";
            var overlay = document.createElement('div');
            overlay.id = 'trigger-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
            var modal = document.createElement('div');
            // 【2026-08-11 适配游戏本身】黑底 + 游戏灰边框(#666666) + 游戏小圆角(4px)
            modal.style.cssText = 'background:#000000;border:1px solid var(--ext-border, #666666);border-radius:4px;padding:24px;width:80vw;height:75vh;max-width:95%;max-height:85vh;overflow:auto;position:relative;box-shadow:none;';
            var html = `
            <div class="item-commands" style="text-align:center" id="app">
                <div style="margin-top:0.5em">
                    <div style="width:12em;float:left;text-align:left;padding:0px 0px 0px 2em;height:1.23em" id="wsmud_raid_left">${realLeftText}</div>
                    <div style="width:calc(100% - 16em);float:left;height:1.23em">${title}</div>
                    <div style="width:6em;float:right;text-align:right;padding:0px 2em 0px 0px;height:1.23em" id="wsmud_raid_right">${realRightText}</div>
                </div>
                <br><br>
                ${content}
            </div>`;
            modal.insertAdjacentHTML('beforeend', html);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        },
    };

    /***********************************************************************************\
        Trigger Config
    \***********************************************************************************/

    const TriggerConfig = {
        get: function () {
            let all = {};
            let keys = GM_listValues();
            keys.forEach(key => {
                if (key != "roles") {
                    all[key] = GM_getValue(key);
                }
            });
            return all;
        },
        set: function (config) {
            for (const key in config) {
                GM_setValue(key, config[key]);
            }
            TriggerCenter.reload();
        }
    };

    /***********************************************************************************\
        Ready
    \***********************************************************************************/

    let Running = false;

    $(document).ready(function () {
        __init__();
        if (WG == undefined || WG == null || ToRaid == undefined || ToRaid == null) {
            setTimeout(__init__, 300);
        }
    });

    function __init__() {
        WG = unsafeWindow.WG;

        messageAppend = unsafeWindow.messageAppend;
        messageClear = unsafeWindow.messageClear;
        ToRaid = unsafeWindow.ToRaid;

        if (WG == undefined || WG == null || ToRaid == undefined || ToRaid == null) {
            setTimeout(() => { __init__() }, 300);
            return;
        }
        Role = unsafeWindow.Role;

        unsafeWindow.TriggerUI = UI;
        unsafeWindow.TriggerConfig = TriggerConfig;
        unsafeWindow.TriggerCenter = TriggerCenter;

        WG.add_hook("login", function (data) {
            if (Running) return;
            Running = true;

            TriggerCenter.run();
            MonitorCenter.run();
        });
    }
})();
