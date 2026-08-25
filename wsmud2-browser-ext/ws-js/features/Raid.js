// ============================================================
// Raid.js —— Raid 脚本引擎（整个扩展最大的文件，6.5K+ 行）
// ------------------------------------------------------------
// 功能：一套"流程脚本"的编译器 + 解释器。
//   你在游戏里输入 // 开头或 @ 开头的命令（如 kill 木头人），
//   它会把命令/脚本编译成内部指令，然后逐条执行（战斗、寻路、等状态…）。
//
// 对外主要接口（挂在全局）：
//   ToRaid.perform(源码, 名称)  —— 执行一段 Raid 流程脚本（万能入口）
//   ToRaid.menu                 —— 显示 Raid 工具栏
//   Role                        —— 角色状态（hp/mp/物品/武功，findItem/renew/cleanBag 等）
//   内部类：Performer（执行器）、CmdExecuteCenter（命令分派表）、
//           WorkflowConfig（流程管理）、Server（云端分享）、
//           DungeonsShortcuts（一键妖塔/扫荡）
//
// 常用命令（游戏里输入）：@kill 名字 自动杀怪、@perform 自动放技能、
//   @liaoshang 疗伤、@dazuo 打坐、@renew 恢复、@cleanBag 清背包、
//   @fb 自动副本、@wait 等待、@until 直到、@print 输出、@js 执行JS、
//   @stop 停止、@toolbar 工具栏 等几十个。
//
// 想改：内置副本流程文案（Dungeons）、系统命令间隔（__systemCmdDelay=1500）、
//   恢复流程（Role.renew：回武庙→疗伤→打坐）、妖塔扫荡默认参数 → 在本文件搜索。
// 注意：本文件为大文件（6.5K+ 行），重构时仅做安全格式化，不改变变量名与逻辑行为。
// ============================================================
// Raid.js
// 武神传说 MUD 副本/任务自动化核心：源码编译器、命令执行器、副本快捷脚本、
// 角色与房间状态、对话框/任务/事件列表、襄阳战等模块。
// 注意：本文件为大文件（6.5K+ 行），重构时仅做安全格式化，不改变变量名与逻辑行为。
(function () {

    'use strict';

    /***********************************************************************************\
        工具层
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  Message Output
    //---------------------------------------------------------------------------

    var Message = {
        append: function (msg) {
            console.log(msg);
        },
        clean: function () { },
        cmdLog: function (title, cmd) {
            let msg = `&nbsp;&nbsp;<hic>${title}</hic>`
            if (cmd != null) {
                msg += `: ${cmd}`;
            }
            this.append(msg);
        }
    };

    function CopyObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * @param {Array} list
     * @param {*} value
     * @param {Function} assert function(previous, current)
     */
    const SortInsert = function (list, value, assert) {
        let index = list.length;
        while (index >= 0) {
            if (index == 0) {
                list.splice(index, 0, value);
                break;
            }
            const previous = list[index - 1];
            if (assert(previous, value)) {
                list.splice(index, 0, value);
                break;
            }
            index -= 1;
        }
    };

    //---------------------------------------------------------------------------
    //  Source Split Helper
    //---------------------------------------------------------------------------

    const SourceCodeHelper = {
        split: function (source) {
            var cmds = source.split(/\s*\n+/g);
            var first = cmds[0];
            if (first != null && /\S/.test(first) == false) {
                cmds.splice(0, 1);
            }
            var last = cmds[cmds.length - 1];
            if (last != null && /\S/.test(last) == false) {
                cmds.splice(cmds.length - 1, 1);
            }
            return cmds;
        },
        appendHeader: function (header, text) {
            let result = `\n${text}`;
            result = result.replace(/(\n)/g, `$1${header}`);
            result = result.replace(/\n\s*\n/g, "\n");
            result = result.replace(/^\s*\n/, "");
            return result;
        }
    };

    //---------------------------------------------------------------------------
    //  Persistent Cache Interface
    //---------------------------------------------------------------------------

    class PersistentCache {
        constructor(save, getAll, remove) {
            this._save = save;
            this._getAll = getAll;
            this._remove = remove;
        }
        save(key, value) {
            this._save(key, value);
        }
        get(key) {
            return this.getAll()[key];
        }
        getAll() {
            return this._getAll();
        }
        remove(key) {
            this._remove(key);
        }
    }

    /***********************************************************************************\
        控制逻辑编译层
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  Precompiler
    //---------------------------------------------------------------------------

    class PrecompileRule {
        constructor(handle, priority) {
            this._handle = handle;
            this.priority = priority;
        }
        handle(cmds) {
            return this._handle(cmds);
        }
    }

    class PrecompileRuleCenter extends PrecompileRule {
        constructor() {
            const handle = function (cmds) {
                var result = cmds;
                for (const rule of this._rules) {
                    result = rule.handle(result);
                }
                return result;
            };
            super(handle, -1);
            this._rules = [];
            this.instance = this;
        }
        static shared() {
            if (!this.instance) {
                this.instance = new PrecompileRuleCenter();
            }
            return this.instance;
        }
        addRule(rule) {
            SortInsert(this._rules, rule, (p, c) => {
                return p.priority >= c.priority;
            });
        }
    };

    class Precompiler {
        precompile(source) {
            var cmds = SourceCodeHelper.split(source);
            if (cmds.length <= 0) return cmds;

            var result = PrecompileRuleCenter.shared().handle(cmds);

            // console.log("<<<============================");
            // console.log("预编译最终代码:");
            // for (let k = 0; k < result.length; k++) {
            //     console.log(k + " " + result[k]);
            // }
            // console.log("============================>>>");
            return result;
        }
    }

    //---------------------------------------------------------------------------
    //  Compiler
    //---------------------------------------------------------------------------

    const ControlKeys = {
        while: "while",
        continue: "continue",
        break: "break",
        if: "if",
        elseif: "elseif",
        else: "else",
        exit: "exit",
    };

    class Compiler {
        constructor() {
            this._cc = "CC";
            this._pc = "PC";
            this._breakStacks = [];
        }

        compile(source) {
            if (source == null) return [];

            var precompiler = new Precompiler();
            var cmds = precompiler.precompile(source);

            var blockCmds = ["[if] true"];
            cmds.forEach(cmd => {
                blockCmds.push("  " + cmd);
            });
            var result = this._handleBlock(blockCmds, 0).cmds;
            result.push("%exit");

            // console.log("<<<============================");
            // console.log("编译最终代码:");
            // for (let k = 0; k < result.length; k++) {
            //     console.log(k + " " + result[k]);
            // }
            // console.log("============================>>>");
            return result;
        }

        /**
         * @param {string[]} cmds
         * @param {number} start block 首句在的 index
         * @param {number} loopStart 最邻近的 while 的首句索引
         */
        _handleBlock(cmds, start, loopStart) {
            var realLoopStart = loopStart;

            var result = [];
            var r = this._handleCondition(cmds[0]);
            var callback = function () { };
            var self = this;
            switch (r.type) {
                case ControlKeys.while:
                    this._breakStacks.push([]);
                    result.push(r.cmd);
                    result.push(null);
                    callback = function () {
                        result.push(`%${self._pc}=${start}`);
                        var truePC = start + 2;
                        var falsePC = result.length + start;
                        result[1] = `%${self._pc}=${self._cc}?${truePC}:${falsePC}`;
                        var breakStack = self._breakStacks.pop();
                        breakStack.forEach(index => {
                            result[index - start] = `%${self._pc}=${falsePC}`;
                        });
                    };
                    realLoopStart = start;
                    break;
                case ControlKeys.if:
                    result.push(r.cmd);
                    result.push(null);
                    callback = function () {
                        result.push("%pass");
                        var truePC = start + 2;
                        var falsePC = result.length + start;
                        result[1] = `%${self._pc}=${self._cc}?${truePC}:${falsePC}`;
                    };
                    break;
                case ControlKeys.elseif:
                    result.push(r.cmd);
                    result.push(null);
                    callback = function () {
                        result.push("%pass");
                        var truePC = start + 2;
                        var falsePC = result.length + start;
                        result[1] = `%${self._pc}=${self._cc}?${truePC}:${falsePC}`;
                    };
                    break;
                case ControlKeys.else:
                    result.push(null);
                    callback = function () {
                        var truePC = start + 1;
                        var falsePC = result.length + start;
                        result[0] = `%${self._pc}=${self._cc}?${falsePC}:${truePC}`;
                    };
                    break;
                case ControlKeys.continue:
                    result.push(`%${self._pc}=${loopStart}`);
                    return { type: "continue", cmds: result };
                case ControlKeys.break:
                    result.push(null);
                    var breakStack = this._breakStacks[this._breakStacks.length - 1];
                    breakStack.push(start);
                    return { type: "break", cmds: result };
                case ControlKeys.exit:
                    result.push("%exit");
                    return { type: "exit", cmds: result };
                default:
                    throw "未知的控制关键字: " + r.type;
            }

            var cmdsLength = cmds.length;
            var i = 1;
            while (i < cmdsLength) {
                var cmd = cmds[i];
                var header = /^\s*/g.exec(cmd)[0];
                var headerLength = header.length;
                if (cmd[headerLength] == "[") {
                    var blockCmds = [cmd];
                    var j = i + 1;
                    while (j < cmdsLength) {
                        var next = cmds[j];
                        if (next[headerLength] != " ") break;
                        blockCmds.push(next);
                        j += 1;
                    }
                    var lastCmdIndex = result.length - 1;
                    var blockStart = result.length + start;
                    var k = this._handleBlock(blockCmds, blockStart, realLoopStart);
                    k.cmds.forEach(cmd1 => {
                        result.push(cmd1);
                    });
                    if (k.type == "elseif") {
                        result[lastCmdIndex] = `%${this._pc}=${result.length + start - 1}`;
                    } else if (k.type == "else") {
                        result[lastCmdIndex] = `%${this._pc}=${result.length + start}`;
                    }
                    i = j;
                } else {
                    result.push(cmd.substring(headerLength));
                    i += 1;
                }
            }

            callback();
            return { type: r.type, cmds: result };
        }
        _handleCondition(condition) {
            var type = null;
            var cmd = null;
            var formats = [
                { type: ControlKeys.while, regexp: /^\s*\[while\]/g },
                { type: ControlKeys.if, regexp: /^\s*\[if\]/g },
                { type: ControlKeys.elseif, regexp: /^\s*\[else\s?if\]/g },
                { type: ControlKeys.else, regexp: /^\s*\[else\]/g },
                { type: ControlKeys.continue, regexp: /^\s*\[continue\]/g },
                { type: ControlKeys.break, regexp: /^\s*\[break\]/g },
                { type: ControlKeys.exit, regexp: /^\s*\[exit\]/g },
            ];
            for (const format of formats) {
                var r = format.regexp.exec(condition);
                if (r) {
                    type = format.type;
                    var exp = condition.substring(r[0].length);
                    cmd = `%${this._cc}=${exp}`
                    break;
                }
            }
            if (type == null) {
                throw "编译失败: " + condition;
            }
            return { type: type, cmd: cmd };
        }
    }

    /***********************************************************************************\
        预编译实现层
    \***********************************************************************************/

    const PrecompileRulePriority = {
        subflow: 100,
        call: 90,
        annatition: 80,
        compatible: 70,
        guard: 60,
        emptyLine: 50,

        // 层外使用
        high: 30,
        ordinary: 20,
        low: 10
    };

    //---------------------------------------------------------------------------
    //  Precompile Annatitions
    //---------------------------------------------------------------------------

    (function () {
        const handle = function (cmds) {
            var result = [];
            for (const cmd of cmds) {
                if (/^\s*\/\//.test(cmd)) continue;
                result.push(cmd);
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.annatition);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    (function () {
        const handle = function (cmds) {
            var result = [];
            var ignore = false;
            for (const cmd of cmds) {
                if (/^\s*\/\*/.test(cmd)) {
                    ignore = true;
                    continue;
                }
                if (ignore && /\*\/\s*$/.test(cmd)) {
                    ignore = false;
                    continue;
                }
                if (!ignore) {
                    result.push(cmd);
                }
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.annatition);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  Precompile Subflows
    //---------------------------------------------------------------------------

    (function () {
        const handle = function (cmds) {
            let result = [];
            let collecting = false;
            let subflowCmd = null;
            for (const cmd of cmds) {
                var r = /^(\s*)<===+\s*$/.exec(cmd);
                if (r != null) {
                    collecting = true;
                    subflowCmd = "<===";
                    continue;
                }
                if (collecting) {
                    var r2 = /^\s*=+==>\s*$/.exec(cmd);
                    if (r2 != null) {
                        collecting = false;
                        subflowCmd += "===>";
                        result.push(subflowCmd);
                    } else {
                        subflowCmd += `\n${cmd}`;
                    }
                    continue;
                }
                result.push(cmd);
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.subflow);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  Precompile Guards
    //---------------------------------------------------------------------------

    (function () {
        const handle = function (cmds) {
            var result = [];
            // {headerLength: Number, cmds: [String]}
            var guards = [];
            var guarding = false;
            for (const cmd of cmds) {
                var r = /^(\s*)<---+/.exec(cmd);
                if (r != null) {
                    guarding = true;
                    const guard = {
                        headerLength: r[1].length,
                        cmds: []
                    }
                    guards.push(guard);
                    continue;
                }
                if (guarding) {
                    var r2 = /^\s*-+-->/.exec(cmd);
                    if (r2 == null) {
                        const guard = guards[guards.length - 1];
                        guard.cmds.push(cmd.substring(guard.headerLength));
                    } else {
                        guarding = false;
                    }
                    continue;
                }
                result.push(cmd);
                var r3 = /^(\s*)[^\[\s]/.exec(cmd);
                if (r3 != null) {
                    var header = r3[1];
                    var hasGuard = false;
                    for (let j = guards.length; j > 0; j--) {
                        const guard = guards[j - 1];
                        if (header.length < guard.headerLength) {
                            guards.pop();
                            continue;
                        }
                        if (!hasGuard) {
                            result.push(`${header}%guardStart`);
                            hasGuard = true;
                        }
                        guard.cmds.forEach(cmd1 => {
                            result.push(`${header}${cmd1}`);
                        });
                    }
                    if (hasGuard) result.push(`${header}%guardEnd`);
                }
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.guard);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  Precompile Calls
    //---------------------------------------------------------------------------

    var __CallCounter = 0;
    var FlowStore = null; // PersistentCache

    // TODO: 尚不支持嵌套调用
    // @call 函数名 参数1,参数2,参数3,...
    (function () {
        const handle = function (cmds) {
            let result = [];
            cmds.forEach(cmd => {
                var r = /^(\s*)@call\s(\S+)(\s*(\S.*)+\s*|\s*)$/.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                const paramsField = r[4];
                let args = "";
                if (paramsField != null && paramsField.length > 0) {
                    const params = paramsField.split(",");
                    for (let i = 0; i < params.length; i++) {
                        const param = params[i];
                        args += `($arg${i})=${param}\n`;
                    }
                }
                const flowName = r[2];
                let source = FlowStore.get(flowName);
                if (source == null) {
                    Message.append(`<ord>未找到调用的流程 ${flowName}</ord>`);
                    //throw `未找到调用的流程 ${flowName}`;
                }
                let callSource = `[if] true\n` + SourceCodeHelper.appendHeader("    ", `${args}\n${source}`);
                const callId = __CallCounter; __CallCounter += 1;
                callSource = callSource.replace(/\(\$([_a-z][a-zA-Z0-9_]*?)\)/g, `($__x${callId}_$1)`);
                callSource = callSource.replace(/\(([_a-z][a-zA-Z0-9_]*?)\)/g, `(__x${callId}_$1)`);
                const callCmds = SourceCodeHelper.split(callSource);
                const header = r[1];
                for (const callCmd of callCmds) {
                    if (/^\s*#/.test(callCmd)) continue;
                    result.push(`${header}${callCmd}`);
                }
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.call);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  Precompile Empty Line
    //---------------------------------------------------------------------------

    (function () {
        const handle = function (cmds) {
            var result = [];
            for (const cmd of cmds) {
                if (!/\S+/.test(cmd)) continue;
                result.push(cmd);
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.emptyLine);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  Precompile Raid 1.x.x
    //---------------------------------------------------------------------------

    (function addCompatibleGuardRule() {
        const handle = function (cmds) {
            var result = [];
            cmds.forEach(cmd => {
                var r = /^\s*#(\[.*)$/.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                var c1 = `<---`;
                var c2 = r[1];
                var c3 = `--->`;
                result.push(c1, c2, c3);
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    function CompatibleOperator(exp) {
        var result = exp;
        result = result.replace(/([^&])[&]([^&])/g, "$1&&$2");
        result = result.replace(/([^\|])[\|]([^\|])/g, "$1||$2");
        result = result.replace(/([^=<>!])[=]([^=])/g, "$1==$2");
        return result;
    }

    (function addCompatibleUntilRule() {
        const handle = function (cmds) {
            var result = [];
            cmds.forEach(cmd => {
                var r = /^(\s*)\[=(.+?)\](.*)$/.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                var header = r[1];
                var condition = r[2];
                condition = CompatibleOperator(condition);
                var command = r[3];
                var c1 = `${header}@until ${condition}`;
                result.push(c1);
                if (!/\S/.test(command)) return;
                var c2 = `${header}${command}`;
                result.push(c2);
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    (function addCompatibleIfRule() {
        const handle = function (cmds) {
            var result = [];
            cmds.forEach(cmd => {
                var r = /^(\s*)\[(.*?[=<>].*?|true|false)\](.*)$/i.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                var command = r[3];
                if (!/\S/.test(command)) return;
                var header = r[1];
                var condition = r[2];
                condition = CompatibleOperator(condition);
                var c1 = `${header}[if] ${condition}`;
                var c2 = `${header}    ${command}`;
                result.push(c1, c2);
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    (function addCompatibleNextRule() {
        const handle = function (cmds) {
            var result = [];
            cmds.forEach(cmd => {
                var r = /^(\s*)@next(.*)$/i.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                var header = r[1];
                result.push(`${header}[continue]`);
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    (function addCompatibleExitRule() {
        const handle = function (cmds) {
            var result = [];
            cmds.forEach(cmd => {
                var r = /^(\s*)@exit(.*)$/i.exec(cmd);
                if (r == null) {
                    result.push(cmd);
                    return;
                }
                var header = r[1];
                result.push(`${header}[break]`);
            });
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.compatible);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    /***********************************************************************************\
        代码执行器层
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  Handle Condition
    //---------------------------------------------------------------------------

    var AssertLeftMarkHandlerCenter = {
        /**
         * @param {Function} handler function(leftMark)->{handle: Bool, value: string}
         */
        addHandler: function (handler) {
            this._leftMarkHandlers.push(handler);
        },
        getValue(leftMark) {
            for (let i = 0; i < this._leftMarkHandlers.length; i++) {
                const handler = this._leftMarkHandlers[i];
                var result = handler.handle(leftMark);
                if (!result.handle) continue;
                return result.value;
            }
            return leftMark;
        },
        _leftMarkHandlers: []
    };

    class AssertWrapper {
        /**
         * @param {Function} assert1 function(string)->Bool
         * @param {string} text
         */
        constructor(assert1) {
            var theSelf = this;
            this.assert = function () {
                return assert1(theSelf.text);
            };
        }
        setText(text) {
            this.text = text;
        }
    }

    class AssertHolder {
        /**
         * @param {Function} match function(expression)->Bool
         * @param {Function} getAssertWrapper function()->AssertWrapper
         */
        constructor(match, getAssertWrapper) {
            this.match = match;
            this._getAssertWrapper = getAssertWrapper;
        }
        getAssertWrapper() {
            return this._getAssertWrapper();
        }
    }

    var AssertHolderCenter = {
        /**
         * @param {AssertHolder} holder
         */
        addAssertHolder: function (holder) {
            this._assertHolders.push(holder);
        },
        /**
         * @param {string} expression
         * @returns {Function} assert: function()
         */
        get: function (expression) {
            var exp = expression.replace(/^\s*|\s*$/g, "");
            var theSelf = this;
            var relationIndex = exp.search(/&&|\|\|/g);
            if (relationIndex != -1) {
                var relation = exp.substring(relationIndex, relationIndex + 2);
                var left = exp.substring(0, relationIndex);
                var right = exp.substring(relationIndex + 2);
                var assert = function () {
                    var leftAssert = theSelf.get(left);
                    var rightAssert = theSelf.get(right);
                    switch (relation) {
                        case "&&":
                            return leftAssert() && rightAssert();
                        case "||":
                            return leftAssert() || rightAssert();
                    }
                };
                return assert;
            }
            var not = exp[0];
            if (not == "!") {
                var assert = function () {
                    return !theSelf.get(exp.substring(1))();
                }
                return assert;
            }
            for (let i = 0; i < this._assertHolders.length; i++) {
                const holder = this._assertHolders[i];
                if (holder.match(exp)) {
                    var wrapper = holder.getAssertWrapper();
                    wrapper.setText(exp);
                    return wrapper.assert;
                }
            }
            return null;
        },
        _assertHolders: []
    };

    (function addTureAssertHolder() {
        var match = function (text) {
            return text == "true";
        };
        var assert = function (text) {
            return true;
        };
        var holder = new AssertHolder(match, function () { return new AssertWrapper(assert); });
        AssertHolderCenter.addAssertHolder(holder);
    })();

    (function addFalseAssertHolder() {
        var match = function (text) {
            return text == "false";
        };
        var assert = function (text) {
            return false;
        };
        var holder = new AssertHolder(match, function () { return new AssertWrapper(assert); });
        AssertHolderCenter.addAssertHolder(holder);
    })();

    (function addPresetConfigAssertHolder() {
        var patt = new RegExp(">=?|<=?|!=|==?");
        var match = function (text) {
            return patt.test(text);
        };
        var assert = function (text) {
            let validText = text;
            validText = validText.replace(/<(\w+)>/g, "「$1」");
            validText = validText.replace(/<(\/\w+)>/g, "「¿$1」");
            var result = patt.exec(validText);
            // 【2026-08-14 修复】文本经标签替换后可能不再匹配（如原文本含 < > 干扰），exec 返回 null 时防空引用，按"条件不满足"处理
            if (result == null) return false;
            var opt = result[0];
            var parts = validText.split(opt);
            var left = parts[0].replace(/^\s*|\s*$/g, "");
            var lvalue = AssertLeftMarkHandlerCenter.getValue(left);
            var rvalue = parts[1].replace(/^\s*|\s*$/g, "");;
            var lfloat = parseFloat(lvalue);
            var rfloat = parseFloat(rvalue);
            var byDigit = false;
            if (!isNaN(lfloat) && !isNaN(rfloat)) {
                lvalue = lfloat;
                rvalue = rfloat;
                byDigit = true;
            }
            switch (opt) {
                case "=":
                case "==":
                    if (byDigit) {
                        return Math.abs(lvalue - rvalue) < 0.001;
                    } else {
                        return lvalue == rvalue;
                    }
                case ">":
                    return lvalue > rvalue;
                case "<":
                    return lvalue < rvalue;
                case ">=":
                    return lvalue >= rvalue;
                case "<=":
                    return lvalue <= rvalue;
                case "!=":
                    if (byDigit) {
                        return Math.abs(lvalue - rvalue) > 0.001;
                    } else {
                        return lvalue != rvalue;
                    }
                default:
                    return false;
            }
        };
        var holder = new AssertHolder(match, function () { return new AssertWrapper(assert); });
        AssertHolderCenter.addAssertHolder(holder);
    })();

    //---------------------------------------------------------------------------
    //  Cmd Prehandler
    //---------------------------------------------------------------------------

    const CmdPrehandlerPriority = {
        ordinary: 50,
    };

    class CmdPrehandler {
        /**
         * @param {Function} handle function(performer: Performer, cmd: String) -> String
         * @param {Number} [priority]
         */
        constructor(handle, priority) {
            this._handle = handle;
            this.priority = priority ? priority : CmdPrehandlerPriority.ordinary;
        }
        handle(performer, cmd) {
            return this._handle(performer, cmd);
        }
    }

    class CmdPrehandleCenter extends CmdPrehandler {
        constructor() {
            const handle = function (performer, cmd) {
                var result = cmd;
                for (const handler of this._handlers) {
                    result = handler.handle(performer, result);
                }
                return result;
            };
            super(handle, -1);
            this._handlers = [];
            this.instance = this;
        }
        static shared() {
            if (!this.instance) {
                this.instance = new CmdPrehandleCenter();
            }
            return this.instance;
        }
        addHandler(handler) {
            SortInsert(this._handlers, handler, (p, c) => {
                return p.priority >= c.priority;
            });
        }
    }

    //---------------------------------------------------------------------------
    //  Cmd Executor
    //---------------------------------------------------------------------------

    const CmdExecutorPriority = {
        compiler: 90,

        // 层外使用
        high: 30,
        ordinary: 20,
        low: 10
    };

    class CmdExecutor {
        /**
         * @param {Function} appropriate function(cmd: String) -> Boolean
         * @param {Function} execute function(performer: Performer, cmd: String)
         * @param {Number} priority
         */
        constructor(appropriate, execute, priority) {
            this._appropriate = appropriate;
            this._execute = execute;
            this.priority = priority ? priority : CmdExecutorPriority.ordinary;
        }
        appropriate(cmd) {
            return this._appropriate(cmd);
        }
        execute(performer, cmd) {
            return this._execute(performer, cmd);
        }
    }

    var CmdExecuteCenter = {
        addExecutor: function (executor) {
            SortInsert(this._executors, executor, (p, c) => {
                return p.priority >= c.priority;
            });
        },
        //【2026-08-09 移植v1.0.0 + 强化】execute 改 async：预扫描 (:eqHas) 词条用法。
        // 每次使用都强制重新 checkobj 查看装备（词条可被替换/洗练，不能用缓存），等待回包（最大 3 秒）
        execute: async function (performer, cmd) {
            var eqHasPattern = /\(:eqHas\s+([^,]+?),\s*[^)]+\)/g;
            var match;
            var fetchIds = [];
            var allParam = {};
            Object.assign(allParam, VariableStore.getAll(), performer.tempParams || {});
            while ((match = eqHasPattern.exec(cmd)) !== null) {
                var hasId = (match || ["", "", "", ""])[1].trim();
                if (hasId.indexOf("(") == 0 && hasId.lastIndexOf(")") == hasId.length - 1) {
                    var hasVar = hasId.substring(1, hasId.length - 1);
                    hasId = allParam[hasVar] || "";
                }
                if (hasId && fetchIds.indexOf(hasId) < 0) {
                    fetchIds.push(hasId);
                }
            }
            if (fetchIds.length > 0) {
                for (var fi = 0; fi < fetchIds.length; fi++) {
                    var eqId = fetchIds[fi];
                    // 【2026-08-09 优化】智能定位：本地数据能确定位置就只发一条，避免无脑发两条
                    var locate = null; // 'eq' | 'item' | null(未知)
                    if (Role.equipments && Role.equipments.eqs) {
                        for (var ei = 0; ei < Role.equipments.eqs.length; ei++) {
                            if (Role.equipments.eqs[ei] && Role.equipments.eqs[ei].id == eqId) {
                                locate = "eq";
                                break;
                            }
                        }
                    }
                    if (locate == null && Role.items && Role.items[eqId] != null) {
                        locate = "item";
                    }
                    var tries = locate == null ? ["eq", "item"] : [locate];
                    for (var ti = 0; ti < tries.length; ti++) {
                        Role._pendingEqFetch = eqId;
                        WG.SendCmd("checkobj " + eqId + " from " + tries[ti]);
                        console.log("[Raid] (:eqHas) 自动查看装备: checkobj " + eqId + " from " + tries[ti]);
                        // 非最后位置只等 1 秒就切换下一个位置；最后位置等 3 秒
                        var waitMax = (ti < tries.length - 1) ? 10 : 30;
                        await new Promise(function (resolve) {
                            var waitCount = 0;
                            var timer = setInterval(function () {
                                waitCount++;
                                if (Role._pendingEqFetch === "done") {
                                    clearInterval(timer);
                                    Role._pendingEqFetch = null;
                                    resolve();
                                } else if (waitCount > waitMax) {
                                    clearInterval(timer);
                                    Role._pendingEqFetch = null;
                                    resolve();
                                }
                            }, 100);
                        });
                        if (Role.itemDescs[eqId] != null) break; // 已拉到描述，不再试下一个位置
                    }
                    if (Role.itemDescs[eqId] == null) {
                        console.warn("[Raid] 自动查看装备超时/无返回，词条数据未就绪: checkobj " + eqId);
                    }
                }
            }
            var valid = null;
            for (const executor of this._executors) {
                if (executor.appropriate(cmd)) {
                    valid = executor;
                    break;
                }
            }
            if (valid == null) {
                throw `无法处理此命令: ${cmd}`;
            }
            return valid.execute(performer, cmd);
        },
        _executors: []
    };

    //---------------------------------------------------------------------------
    //  Performer
    //---------------------------------------------------------------------------

    class Performer {
        /**
         * @param {String} source
         */
        constructor(name, source) {
            this._name = name;
            this._source = source;
            this._log = false;
            this._running = false;
            this._pausing = false;
        }

        name() {
            return this._name;
        }
        runing() {
            return this._running;
        }
        pausing() {
            return this._pausing;
        }
        log(value) {
            if (value == null) return this._log;
            if (/\/\/\s*~silent\s*\n/.test(this._source) == true) return this._log;
            this._log = value;
        }

        start(callback) {
            if (this._running) return;

            try {
                var compiler = new Compiler();
                var start = new Date().getTime();
                this._cmds = compiler.compile(this._source);
                var end = new Date().getTime();
                console.log(`编译总耗时: ${end - start} 毫秒`);
            } catch (err) {
                // 【2026-08-11】错误信息带流程名，方便排障定位
                Message.append(`<ord>流程「${this._name}」编译错误</ord>: ${err}`);
                return;
            }

            if (this._log) Message.append(`<hiy>开始执行，流程: ${this._name}...</hiy>`);
            this._running = true;
            this._pausing = false;

            this._callback = callback;

            this._pc = 0;
            this._cc = true;

            this._guarding = false;
            this._subflows = [];

            this._perform();
        }
        stop() {
            if (!this._running) return;
            this._running = false;
            for (const subflow of this._subflows) {
                subflow.stop();
            }
            if (this._log) Message.append(`<hiy>执行完毕，流程: ${this._name}。</hiy>`);
            if (this._callback) this._callback();
        }
        pause() {
            if (!this._running) return;
            if (this._log) Message.append(`<hiy>暂停执行，流程: ${this._name}...</hiy>`);
            this._pausing = true;
            for (const subflow of this._subflows) {
                subflow.pause();
            }
        }
        resume() {
            if (!this._running || !this._pausing) return;
            if (this._log) Message.append(`<hiy>恢复执行，流程: ${this._name}。</hiy>`);
            this._pausing = false;
            for (const subflow of this._subflows) {
                subflow.resume();
            }
            this._perform();
        }

        guarding() {
            return this._guarding;
        }
        timeSeries(timestamp) {
            if (timestamp != null) {
                if (!this.guarding()) this._systemCmdTimeSeries = timestamp;
                return;
            }
            return this._systemCmdTimeSeries;
        }

        async _perform() {
            if (!this._running || this._pausing) return;
            if (this._doing) return;

            var cmd = this._cmds[this._pc];
            // console.log(`>>> ${this._name}, ${this._pc}, ${this._cc}, ${cmd}`);
            this._pc += 1;

            try {
                this._doing = true;
                await CmdExecuteCenter.execute(this, cmd);
            } catch (err) {
                // 【2026-08-11】错误信息带流程名（+出错命令片段，便于定位哪条命令）
                var _errCmd = (cmd && typeof cmd === 'string' && cmd.length > 60) ? cmd.substring(0, 60).replace(/[\r\n]/g, ' ') + '…' : (cmd || '');
                Message.append(`<ord>流程「${this._name}」执行错误</ord>: ${err}${_errCmd ? '（命令：' + _errCmd + '）' : ''}`);
                this.stop();
                return;
            } finally {
                this._doing = false;
            }
            this._perform();
        }
    }

    // Compile Cmd Executor

    (function () {
        const appropriate = function (cmd) {
            return cmd == "%exit";
        };
        const execute = function (performer, cmd) {
            performer.stop();
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd == "%pass";
        };
        const execute = function (performer, cmd) { };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("%PC=CC") == 0;
        };
        const execute = function (performer, cmd) {
            performer._pc = eval(`performer._cc${cmd.substring(6)}`);
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("%PC=") == 0;
        };
        const execute = function (performer, cmd) {
            performer._pc = eval(cmd.substring(4));
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("%CC=") == 0;
        };
        const execute = function (performer, cmd) {
            const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            var assert = AssertHolderCenter.get(validCmd.substring(4));
            performer._cc = assert();
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd == "%guardStart";
        };
        const execute = function (performer, cmd) {
            performer._guarding = true;
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd == "%guardEnd";
        };
        const execute = function (performer, cmd) {
            performer._guarding = false;
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return /^<===[^爫]*===>$/.test(cmd);
        };
        const execute = function (performer, cmd) {
            const source = cmd.slice(4, -4);
            const p = new Performer("subflow", source);
            performer._subflows.push(p);
            p.start();
        };
        const executor = new CmdExecutor(appropriate, execute, CmdExecutorPriority.compiler);
        CmdExecuteCenter.addExecutor(executor);
    })();

    //---------------------------------------------------------------------------
    //  Variable
    //---------------------------------------------------------------------------

    function TryCalculate(expression) {
        if (/^[0-9\+\-\*\/% ]*$/g.test(expression)) {
            return eval(expression);
        }
        return expression;
    }

    var PersistentVariables = null; // PersistentCache

    function UpdateVariable(performer, name, exp) {
        if (/^_*[A-Z][a-zA-Z0-9_]*$/.test(name)) {
            PersistentVariables.save(name, TryCalculate(exp));
        } else if (/^_*[a-z][a-zA-Z0-9_]*$/.test(name)) {
            if (performer.tempParams == null) {
                performer.tempParams = {};
            }
            performer.tempParams[name] = TryCalculate(exp);
        }
    }

    (function () {
        var patt = /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*(.+)\s*/;
        const appropriate = function (cmd) {
            return patt.test(cmd);
        };
        const execute = function (performer, cmd) {
            const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            var result = patt.exec(validCmd);
            // 【2026-08-14 修复】handle() 会解析 {r}/{b} 占位符等改变命令文本，可能使 exec 不再匹配 → 防空引用
            if (result == null) return;
            var name = result[1];
            var exp = result[2];
            UpdateVariable(performer, name, exp);
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    var VariableStore = {
        register: function (getAll) {
            this._allGetAll.push(getAll);
        },
        getAll: function () {
            var result = {};
            for (const getAll of this._allGetAll) {
                const all = getAll();
                for (const key in all) {
                    if (!all.hasOwnProperty(key)) continue;
                    result[key] = all[key];
                }
            }
            return result;
        },
        _allGetAll: []
    };

    (function () {
        const _assignVariables = function (expression, params) {
            var placeholders = [];
            var patt = /\([:a-zA-Z0-9_]+?\)/g;
            var result = patt.exec(expression);
            while (result != null) {
                placeholders.push(result[0]);
                result = patt.exec(expression);
            }
            let assignedExp = expression;
            for (let i = 0; i < placeholders.length; i++) {
                const placeholder = placeholders[i];
                var key = placeholder.substring(1, placeholder.length - 1);
                var value = params[key];
                if (value == null) value = "null";
                assignedExp = assignedExp.replace(placeholder, value);
            }

            let placeholders2 = [];
            let patt2 = /\((:[a-zA-Z0-9_]+?)\s+([^\(\)\s][^\(\)]*?)\s*\)/g;
            let r2 = patt2.exec(assignedExp);
            while (r2 != null) {
                placeholders2.push({ value: r2[0], key: `${r2[1]} `, params: r2[2] });
                r2 = patt2.exec(assignedExp);
            }
            for (const p of placeholders2) {
                const func = params[p.key];
                let value = "null";
                if (func != null && typeof func == "function") {
                    value = func(p.params);
                }
                assignedExp = assignedExp.replace(p.value, value);
            }

            return assignedExp;
        };
        const assignVariables = function (expression, params) {
            let result = expression;
            while (true) {
                const assigned = _assignVariables(result, params);
                if (assigned == result) return result;
                result = assigned;
            }
        };
        const handle = function (performer, cmd) {
            let allParam = {};
            Object.assign(allParam, VariableStore.getAll(), performer.tempParams);
            const result = assignVariables(cmd, allParam);
            return result;
        };
        const handler = new CmdPrehandler(handle)
        CmdPrehandleCenter.shared().addHandler(handler);
    })();

    /***********************************************************************************\
        System Library
    \***********************************************************************************/

    class AtCmdExecutor extends CmdExecutor {
        constructor(key, execute, priority) {
            const appropriate = function (cmd) {
                return cmd.indexOf(`@${key}`) == 0;
            };
            const superExecute = function (performer, cmd) {
                const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
                let param = /^\s*(.*)\s*$/.exec(validCmd.substring(key.length + 1))[1];
                if (param && param.length == 0) param = null;
                return execute(performer, param);
            };
            super(appropriate, superExecute, priority);
        }
    }

    (function () {
        const executor = new AtCmdExecutor("wait", function (performer, param) {
            if (performer.log()) Message.cmdLog(`等待 ${(param / 1000).toFixed(2)} 秒`);
            return new Promise(resolve => {
                setTimeout(() => resolve(), param);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("await", function (performer, param) {
            function createWorker(f) {
                var blob = new Blob(['(function(){' + f.toString() + '})()']);
                var url = window.URL.createObjectURL(blob);
                var worker = new Worker(url);
                return worker;
            }
            return new Promise(resolve => {
                var wa = createWorker("setTimeout(() =>  postMessage('0'), " + param + ")")
                wa.onmessage = function (event) {
                    wa.terminate();
                    resolve();
                };
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("debug", function (performer, param) {
            let text = param;
            if (text[0] == ">") {
                text = JSON.stringify(eval(text.substring(1)));
            }
            var message = `&nbsp;&nbsp;[debug]: <hiz>${text}</hiz>`;
            Message.append(message);
            // console.log(message);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("print", function (performer, param) {
            Message.append(param,0);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();
    (function () {
        const executor = new AtCmdExecutor("show", function (performer, param) {
            Message.append(param,1);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();
    // 【2026-08-09 新增】@zdsell / @zduse：自动售卖 / 自动使用（清单在设置里配置，调用 WG 方法）
    (function () {
        const executor = new AtCmdExecutor("zdsell", function (performer, param) {
            return WG.zdsell();
        });
        CmdExecuteCenter.addExecutor(executor);
        const executor2 = new AtCmdExecutor("zduse", function (performer, param) {
            return WG.zduse();
        });
        CmdExecuteCenter.addExecutor(executor2);
    })();

    // 【2026-08-16】@zmlwait 自命令名 —— 阻塞执行自命令
    // 用法：流程/触发源码里写 `@zmlwait 武道回血`（替代非阻塞的 `$usezml 武道回血`），
    //       会等自命令真正执行完再继续，无需手动传变量 + @until。
    // 按自命令类型处理：
    //   类型0（命令串）→ 发给 WG.SendCmd，等命令队列清空 + 400ms 稳定（含 $wait 连锁补发，60s 兜底）
    //   类型1（Raid流程）→ 启动该流程并等它跑完
    //   类型2（JS）→ 同步执行；若返回 Promise 则等它
    (function () {
        function _runZmlBlocking(item, name) {
            var type = String(item.zmlType);
            if (type === '2') {
                // JS 类型：同步执行；若返回 Promise 则阻塞等待
                return Promise.resolve(eval(item.zmlRun));
            }
            if (type === '1') {
                // Raid 流程类型：启动子流程并等它跑完。
                // 【2026-08-17 修复】不用 ManagedPerformerCenter.start（会注册到"运行中流程"面板，
                // 导致 @zmlwait 多出一条「自命令-名称」条目）；改用裸 Performer 静默运行，面板只留主流程一条。
                return new Promise(function (resolve) {
                    try {
                        const p = new Performer('', item.zmlRun);
                        p.start(resolve);
                    } catch (e) {
                        console.error('[Raid] @zmlwait 子流程启动失败:', e);
                        resolve();
                    }
                });
            }
            // 类型 0（默认）：命令串 → 轮询命令队列清空 + 400ms 稳定
            return new Promise(function (resolve) {
                try { WG.SendCmd(item.zmlRun); } catch (e) { resolve(); return; }
                var lastBusy = Date.now();
                var timer = setInterval(function () {
                    try {
                        var idle = (typeof unsafeWindow.__extCmdQueueIdle === 'function') ? unsafeWindow.__extCmdQueueIdle() : true;
                        if (idle) {
                            if (Date.now() - lastBusy >= 400) {
                                clearInterval(timer);
                                resolve();
                            }
                        } else {
                            lastBusy = Date.now();
                        }
                    } catch (e) { clearInterval(timer); resolve(); }
                }, 150);
                setTimeout(function () { clearInterval(timer); resolve(); }, 60000); // 60s 兜底，防卡死流程
            });
        }

        const executor = new AtCmdExecutor("zmlwait", function (performer, param) {
            const name = String(param || '').trim();
            if (!name) return Promise.resolve();
            try {
                const list = GM_getValue(roleid + "_zml", zml);
                const item = (Array.isArray(list) ? list : []).find(function (z) { return z && z.name == name; });
                if (!item) {
                    if (performer.log()) Message.append(`<hir>自命令「${name}」不存在，@zmlwait 已跳过</hir>`, 0);
                    return Promise.resolve();
                }
                if (performer.log()) Message.cmdLog(`执行自命令「${name}」（阻塞等待完成）`);
                return _runZmlBlocking(item, name);
            } catch (e) {
                console.error('[Raid] @zmlwait 执行失败:', e);
                return Promise.resolve();
            }
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    class UntilAtCmdExecutor extends CmdExecutor {
        constructor(key, assert, priority, tryAgain, timeout) {
            const appropriate = function (cmd) {
                return cmd.indexOf(`@${key}`) == 0;
            };
            const superExecute = function (performer, cmd) {
                const tryExecute = function (callback) {
                    const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
                    let param = /^\s*(.*)\s*$/.exec(validCmd.substring(key.length + 1))[1];
                    if (param != null && param.length == 0) param = null;
                    const result = assert(performer, param);
                    if (result == true) {
                        if (timeout != null) {
                            setTimeout(_ => { callback(); }, timeout);
                        } else {
                            callback();
                        }
                    } else {
                        setTimeout(_ => { tryExecute(callback); }, tryAgain != null ? tryAgain : 500);
                    }
                };
                if (performer.log()) Message.cmdLog("等待，直至符合条件", cmd);
                return new Promise(resolve => {
                    tryExecute(resolve);
                });
            };
            super(appropriate, superExecute, priority);
            this._key = key;
            this._assert = assert;
        }
    }

    (function () {
        const executor = new UntilAtCmdExecutor("until", function (performer, param) {
            const assert = AssertHolderCenter.get(param);
            return assert();
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("@js ") == 0;
        };
        const execute = function (performer, cmd) {
            const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            let exp = validCmd.substring(4);
            console.log(performer);
            if (performer.log()) Message.cmdLog("调用 js", exp);
            const result = /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*/.exec(exp);
            if (result == null) {
                eval(exp);
                return;
            }
            const name = result[1];
            exp = exp.substring(result[0].length);
            UpdateVariable(performer, name, eval(exp));
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("@stop ") == 0;
        };
        const execute = function (performer, cmd) {
            const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            let exp = validCmd.substring(6);
            if (performer.log()) Message.cmdLog("停止流程", exp);
            const result = /^\(\$([A-Za-z_][a-zA-Z0-9_]*?)\)\s*=\s*/.exec(exp);
            if (result == null) {
                ManagedPerformerCenter.getAll().filter(x => x.name() == exp).forEach(x => x.stop())
                return;
            }
            const name = result[1];
            exp = exp.substring(result[0].length);
            UpdateVariable(performer, name, ManagedPerformerCenter.getAll().filter(x => x.name() == exp).forEach(x => x.stop()));
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    // 【发呆检测】@idle_cmd 命令：开/关/状态/设置
    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("@idle_cmd ") == 0;
        };
        const execute = function (performer, cmd) {
            const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            let exp = validCmd.substring(10).trim();
            if (performer.log()) Message.cmdLog("发呆检测", exp);
            if (exp == "开" || exp == "关") {
                _idleCmdSwitch = exp;
                GM_setValue("_idleCmdSwitch", _idleCmdSwitch);
                idleCmdStart();
                Message.append("<hio>发呆检测已" + (exp == "开" ? "开启" : "关闭") + "</hio>");
            } else if (exp == "状态") {
                var status = _idleCmdSwitch == "开" ? "开启" : "关闭";
                var isIdle = (typeof Role !== 'undefined' && Role.isIdle) ? Role.isIdle() : false;
                var idleSec = isIdle ? Role.getIdleTime() : 0;
                Message.append("<hio>发呆检测：" + status + "，阈值：" + _idleCmdSeconds + "秒" + (isIdle ? "，当前已发呆：" + idleSec + "秒" : "") + "，命令：" + (_idleCmdContent || "无") + "</hio>");
            } else {
                var parts = exp.split(/\s+/);
                if (parts.length >= 1 && !isNaN(parseInt(parts[0]))) {
                    _idleCmdSeconds = parseInt(parts[0]);
                    _idleCmdContent = parts.slice(1).join(" ") || _idleCmdContent;
                    GM_setValue("_idleCmdSeconds", _idleCmdSeconds);
                    GM_setValue("_idleCmdContent", _idleCmdContent);
                    Message.append("<hio>发呆检测已设置：阈值 " + _idleCmdSeconds + "秒，命令：" + (_idleCmdContent || "无") + "</hio>");
                }
            }
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    /***********************************************************************************\
        Time Variables
    \***********************************************************************************/

    VariableStore.register(_ => {
        return {
            ":date": new Date().getDate(),
            ":day": new Date().getDay(),
            ":hour": new Date().getHours(),
            ":minute": new Date().getMinutes(),
            ":second": new Date().getSeconds(),
            ':mSec': new Date().getMilliseconds()
        }
    });

    /***********************************************************************************\
        Compatible With wsmud_pluginss
    \***********************************************************************************/

    /**
     * @param {String} source
     * @param {Function} callback function(resolve)->void
     */
    function PerformerPromise(source, callback, log) {
        return new Promise(resolve => {
            const p = new Performer("", source);
            if (log) p.log(log);
            p.start(_ => {
                if (callback) {
                    callback(resolve);
                } else {
                    resolve();
                }
            });
        });
    }

    (function () {
        const appropriate = function (cmd) {
            return cmd.indexOf("$wait ") == 0;
        };
        const execute = function (performer, cmd) {
            return PerformerPromise(`@wait ${cmd.substring(6)}`, null, performer.log());
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    /***********************************************************************************\
        User Config Param
    \***********************************************************************************/

    var __ConfigDomIdCounter = 0;
    function GetConfigDomId() {
        const id = __ConfigDomIdCounter;
        __ConfigDomIdCounter += 1;
        return `wsmud_raid_config_dom_id_${id}`;
    }

    var __ConfigPanelHtml = "";
    var __ConfigPanelInits = [];
    var __ConfigPanelActions = [];

    class HashCmdExecutor extends CmdExecutor {
        constructor(key, handle) {
            const appropriate = function (cmd) {
                return cmd.indexOf(`#${key}`) == 0;
            };
            const superHandle = function (performer, cmd) {
                const validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
                const param = validCmd.substring(this._key.length + 2);
                const result = handle(performer, cmd, param);
                if (result == null) return;
                if (result.html) __ConfigPanelHtml += result.html;
                if (result.init) __ConfigPanelInits.push(result.init);
                if (result.action) __ConfigPanelActions.push(result.action);
            };
            super(appropriate, superHandle);
            this._key = key;
        }
    }

    (function () {
        const executor = new HashCmdExecutor("input", function (performer, cmd, param) {
            const result = /^\(\$([a-zA-Z0-9_]+)\)\s?=\s?([^,]+?),(.*)\s*$/.exec(param);
            if (result == null) {
                throw `错误的格式: ${cmd}`;
            }
            const variableName = result[1];
            const desc = result[2];
            const defaultValue = result[3] == null ? "" : result[3];
            const id = GetConfigDomId();
            const html = `
            <p>
                <label for="${id}">&nbsp;* ${desc}:&nbsp;</label><input style='width:80px' id ="${id}" type="text">
            </p>`;
            const init = function () {
                $(`#${id}`).val(defaultValue);
            };
            const action = function () {
                let result = {};
                result[variableName] = $(`#${id}`).val();
                return result;
            };
            return { html: html, init: init, action: action };
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new HashCmdExecutor("select", function (performer, cmd, param) {
            const result = /^\(\$([a-zA-Z0-9_]+)\)\s?=\s?([^,]+?),([^,]+?),([^,]+?)\s*$/.exec(param);
            if (result == null) {
                throw `错误的格式: ${cmd}`;
            }
            const variableName = result[1];
            const desc = result[2];
            const options = result[3].split("|");
            const defaultValue = result[4];
            const id = GetConfigDomId();
            let optionsHtml = "";
            options.forEach(option => {
                optionsHtml += `<option value="${option}">${option}</option>`;
            });
            const html = `
            <p>
                <label for="${id}">&nbsp;* ${desc}:&nbsp;</label><select style='width:80px' id="${id}">
                    ${optionsHtml}
                </select>
            </p>`;
            const init = function () {
                $(`#${id}`).val(defaultValue);
            };
            const action = function () {
                let result = {};
                result[variableName] = $(`#${id}`).val();
                return result;
            };
            return { html: html, init: init, action: action };
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const appropriate = function (cmd) {
            return /^#config\s*$/.test(cmd);
        };
        const execute = function (performer, cmd) {
            return new Promise(resolve => {
                var index = layer.open({
                    type: 1,
                    skin: "layui-layer-rim", //加上边框
                    area: "350px",
                    title: "配置参数",
                    content: __ConfigPanelHtml,
                    offset: "auto",
                    shift: 2,
                    move: false,
                    closeBtn: 0,
                    success: function (layero, index) {
                        __ConfigPanelInits.forEach(init => { init(); });
                        for (const node of layero[0].children) {
                            if (node.className != "layui-layer-content") continue;
                            node.setAttribute("style", "max-height: 370px;color: rgb(0, 128, 0);");
                        }
                    },
                    end: function () {
                        __ConfigPanelHtml = "";
                        __ConfigPanelInits = [];
                        __ConfigPanelActions = [];
                    },
                    btn: ['运行流程', '取消'],
                    yes: function () {
                        __ConfigPanelActions.forEach(action => {
                            const params = action();
                            for (const key in params) {
                                if (!params.hasOwnProperty(key)) continue;
                                UpdateVariable(performer, key, params[key]);
                            }
                        });
                        layer.close(index);
                        resolve();
                    },
                    btn2: function () {
                        performer.stop();
                        resolve();
                    }
                });
            });
        };
        const executor = new CmdExecutor(appropriate, execute);
        CmdExecuteCenter.addExecutor(executor);
    })();

    /***********************************************************************************\
        WSMUD
    \***********************************************************************************/

    var WG = null;
    var messageAppend = null;
    var messageClear = null;
    var TaskHelper = null;
    var LayerHelper = null;

    Message.append = function (msg,area) {
        // 【2026-08-11 修复】同步插入：弹窗内容 append 后立即绑定事件（.on('click')），异步批量会错过绑定 → 弹窗按钮失效
        messageAppend(msg,area,null,true);
    };
    Message.clean = function () {
        messageClear();
    };

    const RoleState = {
        none: "发呆",
        liaoshang: "疗伤",
        dazuo: "打坐",
        wakuang: "挖矿",
        gongzuo: "工作",
        lianxi: "练习",
        xuexi: "学习",
        biguan: "闭关",
        lianyao: "炼药",
        lingwu: "领悟",
        dushu: "读书",
        juhun: "聚魂",
        tuiyan: "推演",
        // 【2026-08-09 补全】采药 / 钓鱼（v1.0.0 有，v26.1 缺失）
        caiyao: "采药",
        diaoyu: "钓鱼",
        // 【2026-08-09 新增】双修
        shuangxiu: "双修"
    };

    /**
     * @param {string} itemName
     * @param {Boolean} blurry
     * @param {string} [quality] white(w), green(g), blue(b), yellow(y), purple(p), orange(o), red(r)
     */
    function FindItem(list, itemName, blurry, quality, filterExp) {
        var pattStr = blurry ? itemName : "^" + itemName + "$";
        if (/<[a-zA-Z]{3}>.+<\/[a-zA-Z]{3}>/g.test(itemName)) {
            pattStr = "^" + itemName + "$";
        } else if (quality != null) {
            var map = {
                "white": "wht",
                "w": "wht",
                "green": "hig",
                "g": "hig",
                "blue": "hic",
                "b": "hic",
                "yellow": "hiy",
                "y": "hiy",
                "purple": "HIZ",
                "p": "HIZ",
                "orange": "hio",
                "o": "hio",
                "red": "ord",
                "r": "ord"
            };
            var tag = map[quality];
            if (tag != null) {
                if (blurry) {
                    pattStr = "<" + tag + ">.*" + itemName + ".*</" + tag + ">";
                } else {
                    pattStr = "<" + tag + ">" + itemName + "</" + tag + ">";
                }
            }
        }
        var patt = new RegExp(pattStr);
        for (const item of list) {
            if (patt.test(item.name) && !FilterCenter.filter(filterExp, item)) {
                return item;
            }
        }
        return null;
    }

    var Role = {
        id: null,
        name: null,
        grade: null,
        family: null,
        energy: 0,
        money: 0,

        hp: 0,
        maxHp: 0,
        mp: 0,
        maxMp: 0,

        status: {},
        equipments: {
            eqs: null,
            eq_group: null
        },
        items: {}, // {id: object}
        stores: {}, // {id: object}
        itemDescs: {}, // 【2026-08-09 移植v1.0.0】装备描述缓存 {id: {name, desc, attrs:[{name,value}]}}，供 (:eqHas) 词条判断
        _pendingEqFetch: null, // 词条拉取等待标记（fetch 用）
        _weaponType: '',
        skills: {},
        profitInfo: null,
        kongfu: {
            quan: null,
            nei: null,
            zhao: null,
            qing: null,
            jian: null,
            dao: null,
            gun: null,
            zhang: null,
            bian: null,
            an: null
        },

        init: function () {
            WG.add_hook("login", function (data) {
                Role.id = data.id;
                Role.status = [];
                setTimeout(function () {
                    $("span[command=skills]").click();
                    setTimeout(_ => { $(".glyphicon-remove-circle").click(); }, 500);
                }, 2000); // 查看装备技能
                // if (GM_getValue(`###CodeTranslator@${Role.id}`, null) != "did") {
                //     CodeTranslator.run();
                //     GM_setValue(`###CodeTranslator@${Role.id}`, "did");
                // }
                UI.showToolbar();
                // 【2026-08-08 新增】登录后自动打开"触发"面板（模拟点击 Raid 工具栏的"触发"按钮）
                setTimeout(function () {
                    var $trigger = $(".raid-item.trigger");
                    if ($trigger.length > 0) {
                        $trigger.trigger('click');
                    }
                }, 500);
                // setTimeout(_ => { Server.getNotice(); }, 3000);
            });
            $("li[command=SelectRole]").on("click", function () {
                Role.name = $('.role-list .select').text().split(/\s+/).pop();
                //Role.grade = $('.role-list .select').text().split(/\s+/).slice(-2)[0];
            });
            Role._monitorHpMp();
            Role._monitorStatus();
            Role._monitorState();
            Role._monitorDeath();
            Role._monitorSkillCD();
            Role._monitorSkills();
            Role._monitorGains();
            Role._monitorItems();
            Role._monitorCombat();
            Role._monitorInfo();
            Role._monitorWeapon();
        },

        hasStatus: function (s) {
            var stamp = Role.status[s];
            if (stamp == null) return false;
            if (stamp < new Date().getTime()) return false;
            return true;
        },
        isFree: function () {
            return !Role.hasStatus("busy") && !Role.hasStatus("faint") && !Role.hasStatus("rash");
        },

        gains(from, to) {
            var theGains = Role._gains.slice();
            var start = -1;
            var end = -1;
            for (let i = 0; i < theGains.length; i++) {
                const gain = theGains[i];
                if (gain.timestamp >= from) { start = i; break; }
            }
            for (let j = theGains.length - 1; j >= 0; j--) {
                const gain = theGains[j];
                if (gain.timestamp <= to) { end = j; break; }
            }
            if (start == -1 || end == -1) return [];
            return theGains.slice(start, end + 1);
        },

        state: RoleState.none,

        // 【2026-08-15】发呆计时：统计 (:state)==发呆 且 (:combating)==false 的连续秒数
        // 供 Raid 流程 / 触发器源码通过预设变量 (:idle) / (:idle_time) 使用。
        idleStart: null,          // 本次"发呆且不在战斗"的起始时间戳（ms）；非发呆为 null
        idleTime: 0,              // 缓存：最近一次计算得到的发呆秒数
        isIdle: function () {     // 当前是否处于"发呆且不在战斗"
            return this.idleStart != null;
        },
        getIdleTime: function () { // 当前"发呆且不在战斗"连续秒数（引用时实时计算）
            if (this.idleStart == null) { this.idleTime = 0; return 0; }
            this.idleTime = Math.floor((Date.now() - this.idleStart) / 1000);
            return this.idleTime;
        },
        resetIdleTime: function () { // 开始挂机/手动重置：正发呆则从此刻重新计时
            if (this.idleStart != null) this.idleStart = Date.now();
        },
        _syncIdle: function () {   // state / combating 变化后调用，维护 idleStart
            var idle = this.state === RoleState.none && !this.combating;
            if (idle && this.idleStart == null) this.idleStart = Date.now();
            if (!idle) this.idleStart = null;
        },

        wearing: function (eqId) {
            for (const eq of this.equipments.eqs) {
                if (eq != null && eq.id == eqId) return true;
            }
            return false;
        },

        getEqId: function (index) {
            const eq = this.equipments.eqs[index];
            if (eq == null) return null;
            return eq.id;
        },

        living: true,

        combating: false,

        rtime: false,


        atPath: function (p) {
            switch (arguments.length) {
                case 0:
                    return Room.path;
                case 1:
                    return p == Room.path;
            }
        },
        inRoom: function (n) {
            switch (arguments.length) {
                case 0:
                    return Room.name;
                case 1:
                    return n == Room.name;
            }
        },

        findItem: function (itemName, blurry, quality, filterExp) {
            return FindItem(Object.values(Role.items), itemName, blurry, quality, filterExp);
        },

        renew: function (callback) {
            const source = `
            stopstate;$to 扬州城-武庙
            @liaoshang
            [if] (:mpPer)<0.8
                @dazuo
                stopstate
            `;
            const p = new Performer("", source);
            p.start(callback);
        },

        cleanBag: function (callback) {
            WG.Send("sell all");
        },

        tidyBag: function (callback) {
            WG.Send("sell all;store all");
        },

        hasCoolingSkill: function () {
            return Role._coolingSkills.length > 0;
        },
        coolingSkills: function () {
            var result = [];
            for (const mark of Role._coolingSkills) {
                result.push(mark.split("_")[0]);
            }
            return result;
        },
        coolingSkill: function (skill) {
            return this.coolingSkills().indexOf(skill) != -1
        },
        hasSkill: function (skill) {
            var combatStr = $('.combat-commands').html()
            if (combatStr.indexOf(skill) != -1) {
                return true;
            } else {
                return false;
            }
        },
        weapon: function () {
            return Role._weaponType
        },

        _renewHookIndex: null,
        _renewStatus: "resting",

        _coolingSkills: [],
        _gains: [], // [{timestamp: number, name: string, count: number, unit: string}]

        _monitorHpMp: function () {
            WG.add_hook(["items", "sc", "itemadd"], function (data) {
                switch (data.type) {
                    case "items":
                        if (data.items == null) break;
                        for (var i = data.items.length - 1; i >= 0; i--) {
                            var item = data.items[i];
                            if (item.id == Role.id) {
                                Role.hp = item.hp;
                                Role.maxHp = item.max_hp;
                                Role.mp = item.mp;
                                Role.maxMp = item.max_mp;
                                break;
                            }
                        }
                        break;
                    case "itemadd":
                    case "sc":
                        if (data.id != Role.id) break;
                        if (data.hp != null) Role.hp = data.hp;
                        if (data.max_hp != null) Role.maxHp = data.max_hp;
                        if (data.mp != null) Role.mp = data.mp;
                        if (data.max_mp != null) Role.maxMp = data.max_mp;
                        break;
                }
            });
        },
        _monitorStatus: function () {
            WG.add_hook(["items", "status", "itemadd"], function (data) {
                switch (data.type) {
                    case "items":
                        if (data.items == null) break;
                        for (var i = data.items.length - 1; i >= 0; i--) {
                            var item = data.items[i];
                            if (item.id != Role.id) continue;
                            if (item.status == null) break;
                            Role.status = {};
                            var timestamp = new Date().getTime();
                            for (var j = item.status.length - 1; j >= 0; j--) {
                                var s = item.status[j];
                                Role.status[s.sid] = timestamp + s.duration - s.overtime;
                            }
                            break;
                        }
                        break;
                    case "status":
                        if (data.id != Role.id) break;
                        var timestamp1 = new Date().getTime();
                        if (data.action == "add") {
                            Role.status[data.sid] = timestamp1 + data.duration;
                        } else if (data.action == "remove") {
                            delete Role.status[data.sid];
                        }
                        break;
                    case "itemadd":
                        if (data.id != Role.id) break;
                        if (data.status == null) break;
                        Role.status = {};
                        var timestamp2 = new Date().getTime();
                        for (var k = data.status.length - 1; k >= 0; k--) {
                            var s1 = data.status[k];
                            Role.status[s1.sid] = timestamp2 + s1.duration - s1.overtime;
                        }
                        break;
                }
            });
        },
        _monitorState: function () {
            WG.add_hook("state", function (data) {
                var text = data.state;
                if (text == null) {
                    Role.state = RoleState.none;
                    Role._syncIdle();
                    return;
                }
                for (const key in RoleState) {
                    if (!RoleState.hasOwnProperty(key)) continue;
                    const keyword = RoleState[key];
                    if (text.indexOf(keyword) != -1) {
                        Role.state = keyword;
                        Role._syncIdle();
                        return;
                    }
                }
                Role.state = RoleState.none;
                Role._syncIdle();
            });
        },
        _monitorDeath: function () {
            WG.add_hook("die", function (data) {
                if (data.relive == true) {
                    Role.living = true;
                } else {
                    Role.living = false;
                }
            });
        },
        _monitorInfo: function () {
            WG.add_hook("dialog", function (data) {
                if (data.dialog == "score" && data.id == Role.id) {
                    if (data.level != null) {
                        var dd = data.level.replace(/<\/?.+?>/g, "");
                        Role.grade = dd.replace(/ /g, "");
                    }
                    if (data.family != null) {
                        Role.family = data.family;
                    }
                    if (data.jingli != null) {
                        var dd = data.jingli.split("/");
                        Role.energy = dd[0];
                    }
                    if (data.pot != null) {
                        Role.pot = data.pot
                    }
                }
            });
        },
        _monitorItems: function () {
            WG.add_hook("dialog", function (data) {
                if (data.dialog == null) return;
                if (data.dialog == "pack") {
                    // 【2026-08-09 移植v1.0.0】checkobj 返回的装备描述 → 解析词条存 itemDescs，供 (:eqHas) 使用
                    if (data.from == "item" || data.from == "eq") {
                        if (data.id != null && data.desc != null) {
                            if (Role._pendingEqFetch === data.id) {
                                Role._pendingEqFetch = "done";
                            }
                            var descText = data.desc.replace(/<[^>]+>/g, "");
                            var itemName = descText.split("\n")[0].trim();
                            var attrs = [];
                            var lines = descText.split("\n");
                            for (var li = 0; li < lines.length; li++) {
                                var line = lines[li].trim();
                                if (!line) continue;
                                var m = line.match(/^(.+?)\s*[+×\-]\s*(.+)$/);
                                if (m) {
                                    var sign = line.match(/[+×\-]/);
                                    var val = m[2].trim();
                                    if (sign && sign[0] == "-") val = "-" + val;
                                    attrs.push({ name: m[1].trim(), value: val });
                                }
                            }
                            Role.itemDescs[data.id] = { name: itemName, desc: descText, attrs: attrs, rawDesc: data.desc };
                            var _ids = Object.keys(Role.itemDescs);
                            if (_ids.length > 200) {
                                for (var _i = 0; _i < _ids.length - 200; _i++) delete Role.itemDescs[_ids[_i]];
                            }
                        }
                    }
                    if (data.items != null) {
                        Role.items = {};
                        data = WG.smartClone(data);
                        data = WG.deserializePackData(data);
                        for (const item of data.items) {
                            if (item.id) Role.items[item.id] = item;
                        }
                    } else if (data.id != null) {
                        if (data.remove == null && data.count != null) {
                            Role.items[data.id] = data;
                            return;
                        } else if (data.remove != null) {
                            var item = Role.items[data.id];
                            if (item == null) return; // 从随从那里那回东西
                            if (item.count != null) {
                                item.count -= data.remove;
                            } else {
                                item.count = 0;
                            }
                            if (item.count == 0) delete Role.items[data.id];
                        }
                    }
                    if (data.eqs != null) {
                        Role.equipments.eqs = CopyObject(data.eqs);
                        Role.equipments.eq_group = data.eq_group;
                    } else if (data.uneq != null && data.id != null) {
                        let item = Role.equipments.eqs[data.uneq];
                        item.count = 1;
                        item.id = data.id;
                        Role.items[item.id] = item;
                        Role.equipments.eqs[data.uneq] = null;
                    } else if (data.eq != null && data.id != null) {
                        let item = Role.items[data.id];
                        Role.equipments.eqs[data.eq] = item;
                        delete Role.items[data.id];
                    }
                    if (data.money != null) {
                        Role.money = data.money;
                    }
                }
                if (data.dialog == "list") {
                    if (data.stores != null) {
                        Role.stores = {};
                        data = WG.smartClone(data);
                        data = WG.deserializePackData(data);
                        for (const item of data.stores) {
                            if (item.id) Role.stores[item.id] = item;
                        }
                    } else if (data.id != null && data.storeid != null && data.store != null) {
                        var item = Role.items[data.id];
                        var store = Role.stores[data.storeid];
                        if (item == null) {
                            item = Object.assign({}, store, { count: 0 });
                            item.id = data.id;
                            Role.items[item.id] = item;
                        }
                        if (store == null) {
                            store = Object.assign({}, item, { count: 0 });
                            Role.stores[store.id] = store;
                        }
                        item.count -= data.store;
                        store.count += data.store;
                        if (item.count <= 0) delete Role.items[data.id];
                        if (store.count <= 0) delete Role.stores[data.storeid];
                    }
                }
            });
        },
        _monitorGains: function () {
            WG.add_hook("dialog", function (data) {
                if (data.dialog != "pack" || data.id == null || data.name == null || data.unit == null || data.count == null || data.remove != null) return;
                var timestamp = new Date().getTime();
                // [{timestamp: number, name: string, count: number, unit: string}]
                var old = Role.items[data.id];
                var count = data.count;
                if (old != null && old.count != null) {
                    count -= old.count;
                }
                var gain = { timestamp: timestamp, name: data.name, count: count, unit: data.unit };
                Role._gains.push(gain);
            });
        },
        _monitorSkillCD: function () {
            WG.add_hook("dispfm", function (data) {
                var timestamp = Date.parse(new Date());
                var mark = data.id + "_" + timestamp;
                Role._coolingSkills.push(mark);
                window.setTimeout(function () {
                    var index = Role._coolingSkills.indexOf(mark);
                    if (index != -1) Role._coolingSkills.splice(index, 1);
                }, data.distime);
                if (data.rtime != null && data.rtime != 0) {
                    if (Role._rtimer != null) clearTimeout(Role._rtimer);
                    Role.rtime = true;
                    Role._rtimer = setTimeout(_ => {
                        Role.rtime = false;
                    }, data.rtime);
                }
            });
        },
        _monitorSkills: function () {
            var action = function (id, value, s_name) {
                switch (id) {
                    case "unarmed":
                        Role.kongfu.quan = value; Role.kongfu.quan_c = s_name; break;
                    case "force":
                        Role.kongfu.nei = value; Role.kongfu.nei_c = s_name; break;
                    case "parry":
                        Role.kongfu.zhao = value; Role.kongfu.zhao_c = s_name; break;
                    case "dodge":
                        Role.kongfu.qing = value; Role.kongfu.qing_c = s_name; break;
                    case "sword":
                        Role.kongfu.jian = value; Role.kongfu.jian_c = s_name; break;
                    case "blade":
                        Role.kongfu.dao = value; Role.kongfu.dao_c = s_name; break;
                    case "club":
                        Role.kongfu.gun = value; Role.kongfu.gun_c = s_name; break;
                    case "staff":
                        Role.kongfu.zhang = value; Role.kongfu.zhang_c = s_name; break;
                    case "whip":
                        Role.kongfu.bian = value; Role.kongfu.bian_c = s_name; break;
                    case "throwing":
                        Role.kongfu.an = value; Role.kongfu.an_c = s_name; break;
                    default:
                        break;
                }
            };
            WG.add_hook("dialog", function (data) {
                if (data.dialog == null || data.dialog != "skills") return;
                if (data.items != null) {
                    for (const item of data.items) {
                        var value = item.enable_skill ? item.enable_skill : null;
                        var s_name = "";
                        Role.skills = data.items;
                        for (const sklii_item of data.items) {
                            if (sklii_item.id == value) {
                                var mName = /<([^<>]*)>/.exec(sklii_item.name);
                                s_name = mName ? mName[1] : sklii_item.name;
                            }
                        }
                        action(item.id, value, s_name ? s_name.toLocaleLowerCase() : '');
                    }
                }
                if (data.id != null && data.enable != null) {
                    var value = data.enable;
                    if (value == false) value = "none";
                    var s_name = ""
                    for (const sklii_item of Role.skills) {
                        if (sklii_item.id == value) {
                            var mName2 = /<([^<>]*)>/.exec(sklii_item.name);
                            s_name = mName2 ? mName2[1] : sklii_item.name;
                        }
                    }
                    action(data.id, value, s_name ? s_name.toLocaleLowerCase() : '');
                }
            });
        },
        _monitorCombat: function () {
            WG.add_hook("combat", function (data) {
                if (data.start != null && data.start == 1) {
                    Role.combating = true;
                    Role._syncIdle();
                } else if (data.end != null && data.end == 1) {
                    Role.combating = false;
                    Role._syncIdle();
                }
            });
            WG.add_hook("text", function (data) {
                if (data.msg == null) return;
                if (data.msg.indexOf('只能在战斗中使用') != -1 || data.msg.indexOf('这里不允许战斗') != -1 || data.msg.indexOf('没时间这么做') != -1) {
                    Role.combating = false;
                    Role._syncIdle();
                }
                if (data.msg.indexOf('战斗中打坐，你找死吗？') != -1 || data.msg.indexOf('你正在战斗') != -1) {
                    Role.combating = true;
                    Role._syncIdle();
                }
            });

        },
        _monitorWeapon: function () {
            WG.add_hook("perform", function (data) {
                if (data.skills != null) {
                    if (JSON.stringify(data.skills).indexOf("sword") != -1) {
                        Role._weaponType = 'sword'
                    } else if (JSON.stringify(data.skills).indexOf("blade") != -1) {
                        Role._weaponType = 'blade'
                    } else {
                        Role._weaponType = ''
                    }
                }

            });

        }
    };

    var Room = {
        name: null,
        path: null,

        updateTimestamp: null,

        init: function () {
            this._monitorLocation();
            this._monitorItemsInRoom();
            this._monitorDeath();
        },
        getItem: function (id) {
            return this._itemsInRoom[id];
        },
        getItemId: function (name, blurry, living, filterExp) {
            for (const item of Object.values(this._itemsInRoom)) {
                if (blurry == true) {
                    if (item.name.indexOf(name) != -1) {
                        if (living == true && item.name.indexOf("的尸体") != -1) {
                            continue;
                        }
                        if (FilterCenter.filter(filterExp, item)) {
                            continue;
                        }
                        return item.id;
                    }
                } else {
                    if (item.name == name && !FilterCenter.filter(filterExp, item)) {
                        return item.id;
                    }
                }
            }
            return null;
        },
        /**
         * @param {{name: string, blurry: Boolean}[]} itemNameInfos
         * @returns {Boolean}
         */
        didKillItemsInRoom: function (itemNameInfos) {
            var deadItems = this._deadItemsInRoom.slice();
            for (const info of itemNameInfos) {
                var found = false;
                for (let j = 0; j < deadItems.length; j++) {
                    const deadItem = deadItems[j];
                    if (info.blurry == true) {
                        if (deadItem.name.indexOf(info.name) != -1) found = true;
                    } else {
                        if (deadItem.name == info.name) found = true;
                    }
                    if (found) {
                        deadItems.splice(j, 1);
                        break;
                    }
                }
                if (!found) return false;
            }
            return true;
        },

        _itemsInRoom: {},
        _deadItemsInRoom: [],

        _monitorLocation: function () {
            WG.add_hook("room", function (data) {
                Room.name = data.name;
                Room.path = data.path;
                Room.updateTimestamp = new Date().getTime();
                Room._itemsInRoom = {};
                Room._deadItemsInRoom = [];
            });
        },

        _monitorItemsInRoom: function () {
            WG.add_hook(["items", "itemadd", "itemremove", "sc", "status"], function (data) {
                switch (data.type) {
                    case "items":
                        if (data.items == null) break;
                        for (const item of data.items) {
                            if (item.name == null || item.id == null) continue;
                            Room._itemsInRoom[item.id] = item;
                        }
                        break;
                    case "itemadd":
                        if (data.name == null || data.id == null) break;
                        Room._itemsInRoom[data.id] = data;
                        break;
                    case "itemremove":
                        if (data.id == null) break;
                        delete Room._itemsInRoom[data.id];
                        break;
                    case "sc": {
                        if (data.id == null) break;
                        const item = Room._itemsInRoom[data.id];
                        if (item == null) break;
                        if (data.hp != null) item.hp = data.hp;
                        if (data.max_hp != null) item.max_hp = data.max_hp;
                        if (data.mp != null) item.mp = data.mp;
                        if (data.max_mp != null) item.max_mp = data.max_mp;
                        break;
                    }
                    // 此处与原生插件冲突，去除后不影响功能
                    // case "status": {
                    //     if (data.action == null || data.id == null || data.sid == null) return;
                    //     const item = Room._itemsInRoom[data.id];
                    //     if (item == null) break;
                    //     if (data.action == "add") {
                    //         if (item.status == null) item.status = [];
                    //         item.status.push({ sid: data.sid, name: data.name, duration: data.duration, overtime: 0 });
                    //     } else if (data.action == "remove") {
                    //         for (let i = 0; i < item.status.length; i++) {
                    //             const s = item.status[i];
                    //             if (s.sid == data.sid) {
                    //                 item.status.splice(i, 1);
                    //                 break;
                    //             }
                    //         }
                    //     }
                    //     break;
                    // }
                }
            });
        },
        _monitorDeath: function () {
            WG.add_hook("sc", function (data) {
                if (data.id == null || data.hp == null || data.hp != 0) return;
                for (const item of Object.values(Room._itemsInRoom)) {
                    if (item.id == data.id) {
                        Room._deadItemsInRoom.push(item);
                        return;
                    }
                }
            });
        }
    };

    class SystemTip {
        constructor(text) {
            this.timestamp = new Date().getTime();
            this.text = text;
        }
    }

    var SystemTips = {
        init: function () {
            this._monitorSystemTips();
        },
        search: function (regex, from) {
            var patt = new RegExp(regex);
            var tips = this._tips.slice();
            for (let index = tips.length - 1; index >= 0; index--) {
                const tip = tips[index];
                if (tip.timestamp < from) break;
                var result = patt.exec(tip.text);
                if (result) return result;
            }
            return null;
        },
        clean: function (to) {
            while (true) {
                if (this._tips.length <= 0) break;
                var tip = this._tips[0];
                if (tip.timestamp > to) break;
                this._tips.shift();
            }
        },
        rejectTimestamp: null,

        _monitorSystemTips: function () {
            var theSelf = this;
            WG.add_hook("text", function (data) {
                var tip = new SystemTip(data.msg);
                theSelf._push(tip);

                if (data.msg == "不要急，慢慢来。") {
                    theSelf.rejectTimestamp = new Date().getTime();
                }
            });
            WG.add_hook("item", function (data) {
                var desc = data.desc;
                if (desc == null) return;
                var tip = new SystemTip(desc);
                theSelf._push(tip);
            });
        },
        _push: function (tip) {
            if (this._tips.length >= this._maxCapacity) {
                this._tips.shift();
            }
            this._tips.push(tip);
        },
        _tips: [],
        _maxCapacity: 100,
    };
    class MsgTip {
        constructor(content, ch, name, uid) {
            this.timestamp = new Date().getTime();
            this.content = content;
            this.ch = ch;
            this.name = name;
            this.uid = uid;
        }
    }

    var MsgTips = {
        init: function () {
            this._monitorSystemTips();
        },
        search: function (regex, from) {
            var patt = new RegExp(regex);
            var tips = this._tips.slice();
            for (let index = tips.length - 1; index >= 0; index--) {
                const tip = tips[index];
                if (tip.timestamp < from) break;
                var result = patt.exec(tip.content);
                if (result) return result;
            }
            return null;
        },
        clean: function (to) {
            while (true) {
                if (this._tips.length <= 0) break;
                var tip = this._tips[0];
                if (tip.timestamp > to) break;
                this._tips.shift();
            }
        },
        rejectTimestamp: null,

        _monitorSystemTips: function () {
            var theSelf = this;
            WG.add_hook("msg", function (data) {
                // console.log(data)
                var tip = new MsgTip(data.content, data.ch, data.name, data.uid);
                theSelf._push(tip);
            });
        },
        _push: function (tip) {
            if (this._tips.length >= this._maxCapacity) {
                this._tips.shift();
            }
            this._tips.push(tip);
        },
        _tips: [],
        _maxCapacity: 100,
    };

    var DialogList = {
        init: function () {
            this._monitorDialogList();
        },
        timestamp: null,
        findItem: function (itemName, blurry, quality, filterExp) {
            return FindItem(this._list, itemName, blurry, quality, filterExp);
        },

        _list: [],
        _monitorDialogList: function () {
            const self = this;
            WG.add_hook("dialog", function (data) {
                let list = null;
                if (data.selllist != null) {
                    data = WG.smartClone(data);
                    if (data.dialog == "shop") {
                        data.selllist = data.selllist[0];
                    }
                    data = WG.deserializePackData(data);
                    list = data.selllist;
                    } else if (data.stores != null) {
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    list = data.stores;
                    } else if (data.dialog == "pack2" && data.items != null) {
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    list = data.items;
                }
                if (list == null) return;
                self.timestamp = new Date().getTime();
                self._list = list;
            });
        },
    };

    var TaskList = {
        init: function () {
            this._monitorTasksList();
        },
        search: function (regex, from) {
            if (this._timestamp < from) return null;
            var patt = new RegExp(regex);
            for (const task of this._list) {
                const result = patt.exec(task);
                if (result) return result;
            }
            return null;
        },

        _timestamp: null,
        _list: [],
        _monitorTasksList: function () {
            const self = this;
            WG.add_hook("dialog", function (data) {
                if (data.dialog == null || data.dialog != "tasks" || data.items == null) return;
                let list = [];
                for (const item of data.items) {
                    list.push(item.desc);
                }
                self._timestamp = new Date().getTime();
                self._list = list;
            });
        }
    };
    var EventList = {
        init: function () {
            this._monitorEventsList();
        },
        search: function (regex, from) {
            if (this._timestamp < from) return null;
            var patt = new RegExp(regex);
            for (const eventText of this._list) {
                const result = patt.exec(eventText);
                if (result) return result;
            }
            return null;
        },
        _timestamp: null,
        _list: [],
        _monitorEventsList: function () {
            const self = this;
            WG.add_hook("dialog", function (data) {
                if (data.dialog == null || data.dialog != "events" || data.items == null) return;
                let list = [];
                for (const item of data.items) {
                    if (item.length > 2) {
                        const searchableText = item[1] + " " + item[2];
                        list.push(searchableText);
                    }
                }
                self._timestamp = new Date().getTime();
                self._list = list;
            });
        }
    };
    var Xiangyang = {
        init: function () {
            this._monitorXiangyang();
        },
        search: function (regex, from) {
            if (this._timestamp < from) return null;
            var patt = new RegExp(regex);
            const result = patt.exec(this._desc);
            if (result) return result;
            return null;
        },

        _timestamp: null,
        _desc: '',
        _monitorXiangyang: function () {
            const self = this;
            WG.add_hook('dialog', function (data) {
                if (data.dialog == null || data.t != 'fam' || data.index != 8 || data.desc == null) return;
                self._timestamp = new Date().getTime();
                self._desc = data.desc;
            });
        }
    };

    /***********************************************************************************\
        Persistent Cache
    \***********************************************************************************/

    (function () {
        const FlowStoreKey = function () { return `flow_store@${Role.id}`; };
        const getMap = function () {
            let map = GM_getValue(FlowStoreKey(), null);
            if (map == null) {
                // 之前 FlowStoreKey 会错误地一只返回 flow_store@null
                map = GM_getValue("flow_store@null", {});
            }
            return map;
        };
        FlowStore = new PersistentCache((key, value) => {
            let map = getMap();
            map[key] = value;
            GM_setValue(FlowStoreKey(), map);
        }, _ => {
            return getMap();
        }, key => {
            let map = getMap();
            delete map[key];
            GM_setValue(FlowStoreKey(), map);
        });
        FlowStore.corver = function (value) {
            GM_setValue(FlowStoreKey(), value);
        };
    })();

    (function () {
        const PersistentVariablesKey = function () { return `global_params@${Role.id}`; };
        const getMap = function () {
            let map = GM_getValue(PersistentVariablesKey(), null);
            if (map == null) {
                // 之前 PersistentVariablesKey 会错误地一只返回 global_params@null
                map = GM_getValue("global_params@null", {});
            }
            return map;
        };
        PersistentVariables = new PersistentCache((key, value) => {
            let map = getMap();
            map[key] = value;
            GM_setValue(PersistentVariablesKey(), map);
        }, _ => {
            return getMap();
        }, key => {
            let map = getMap();
            delete map[key];
            GM_setValue(PersistentVariablesKey(), map);
        });
        VariableStore.register(_ => { return PersistentVariables.getAll(); });
    })();

    VariableStore.register(_ => {
        var vars = {
            ":online": WG.online,
            ":id": Role.id,
            ":name": Role.name,
            ":grade": Role.grade,
            ":family": Role.family,
            ":energy": Role.energy,
            ":pot": Role.pot,
            ":money": Role.money,
            ":hp": Role.hp,
            ":maxHp": Role.maxHp,
            ":hpPer": Role.hp / Role.maxHp,    // 0-1
            ":mp": Role.mp,
            ":maxMp": Role.maxMp,
            ":mpPer": Role.mp / Role.maxMp,    // 0-1
            ":living": Role.living,          // true/false
            ":state": Role.state,            // RoleState
            ":combating": Role.combating,    // true/false
            ":idle": Role.isIdle(),          // 【2026-08-15】是否"发呆且不在战斗"
            ":idle_time": Role.getIdleTime(),// 【2026-08-15】"发呆且不在战斗"连续秒数
            ":free": Role.isFree,
            ":gains": Role.profitInfo,

            ":room": Room.name,
            ":path": Room.path,

            ":eq0": Role.getEqId(0),
            ":eq1": Role.getEqId(1),
            ":eq2": Role.getEqId(2),
            ":eq3": Role.getEqId(3),
            ":eq4": Role.getEqId(4),
            ":eq5": Role.getEqId(5),
            ":eq6": Role.getEqId(6),
            ":eq7": Role.getEqId(7),
            ":eq8": Role.getEqId(8),
            ":eq9": Role.getEqId(9),
            ":eq10": Role.getEqId(10),

            ":kf_quan": Role.kongfu.quan,
            ":kf_nei": Role.kongfu.nei,
            ":kf_zhao": Role.kongfu.zhao,
            ":kf_qing": Role.kongfu.qing,
            ":kf_jian": Role.kongfu.jian,
            ":kf_dao": Role.kongfu.dao,
            ":kf_gun": Role.kongfu.gun,
            ":kf_zhang": Role.kongfu.zhang,
            ":kf_bian": Role.kongfu.bian,
            ":kf_an": Role.kongfu.an,

            ":kf_quan_c": Role.kongfu.quan_c,
            ":kf_nei_c": Role.kongfu.nei_c,
            ":kf_zhao_c": Role.kongfu.zhao_c,
            ":kf_qing_c": Role.kongfu.qing_c,
            ":kf_jian_c": Role.kongfu.jian_c,
            ":kf_dao_c": Role.kongfu.dao_c,
            ":kf_gun_c": Role.kongfu.gun_c,
            ":kf_zhang_c": Role.kongfu.zhang_c,
            ":kf_bian_c": Role.kongfu.bian_c,
            ":kf_an_c": Role.kongfu.an_c
        };
        // 【2026-08-09 移植v1.0.0】槽位装备名 :eqName0~:eqName10（去颜色标签/星级，取名字末段）
        for (var eqi = 0; eqi <= 10; eqi++) {
            var eqiObj = (Role.equipments && Role.equipments.eqs) ? Role.equipments.eqs[eqi] : null;
            vars[":eqName" + eqi] = eqiObj ? String(eqiObj.name).replace(/<.+?>|&lt.*/g, "").replace(/^[★☆]+/, "").split(" ").pop() : null;
        }
        return vars;
    });

    VariableStore.register(_ => {
        return {
            ":room ": function (param) {
                const parts = param.split(",");
                for (const part of parts) {
                    if (Room.name.indexOf(part) != -1) return true;
                }
                return false;
            },
            ":cd ": function (sid) {
                return Role.coolingSkill(sid);
            },
            ":status ": function (param) {
                const parts = param.split(",");
                console.log(parts)
                if (parts.length > 1) {
                    const status = parts[0];
                    const id = parts[1];
                    const item = Room.getItem(id);
                    if (item == null || item.status == null) return false;
                    for (const s of item.status) {
                        if (s.sid == status) return true;
                    }
                    return false;
                }
                return Role.hasStatus(param);
            },
            ":pack ": function (param) {
                const parts = param.split(",");
                if (parts.length <= 1) return;
                const id = parts[0];
                const attr = parts[1];
                console.log(id,attr)
                for (const key in Role.items) {
                    if (key == id) {
                        if (!Role.items[key].hasOwnProperty(attr)) return;
                        const value = Role.items[key][attr];
                        return value;
                    }
                }
            },
            ":hp ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.hp;
                return -1;
            },
            ":hpPer ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.hp/item.max_hp;
                return -1;
            },
            ":weapon ": function (id) {
                return id == Role.weapon()
            },
            ":maxHp ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.max_hp;
                return -1;
            },
            ":mp ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.mp;
                return -1;
            },
            ":mpPer ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.mp/item.max_mp;
                return -1;
            },
            ":maxMp ": function (id) {
                const item = Room.getItem(id);
                if (item != null) return item.max_mp;
                return -1;
            },
            ":exist ": function (id) {
                if (id == null) return false;
                const item = Room.getItem(id);
                return item != null;
            },
            ":findName ": function (id) {
                if (id == null) return null;
                const item = Room.getItem(id);
                //if (item != null) return item.name.match(/.*\s([\u4e00-\u9fa5]+)/)[1];
                if (item != null) return item.name.replace(/<.+?>|&lt.*/g, '').split(' ').pop();
                //if (item != null) return item.name.replace(/<.+?>|&lt.*/g, '').match(/(\p{Script=Han}\s)*(\p{Script=Han}*)/u)[2]
                //if (item != null) return item.name.match(/(\p{Script=Han}\s)*(\p{Script=Han}*)/u)[2];
                return null;
            },
            ":eqHas ": function (param) {
                // 【2026-08-09 移植v1.0.0】判断装备是否有指定词条。用法：(:eqHas 装备ID,词条名)
                // 词条名支持"攻击"、"攻击%"（区分是否百分比词条），名称尾部冒号自动忽略
                var parts = param.split(",");
                if (parts.length <= 1) return false;
                var id = (parts || ["", "", "", ""])[0].trim();
                var q = (parts || ["", "", "", ""])[1].trim().replace(/：$/, "");
                var queryPct = q.charAt(q.length - 1) === "%";
                var qBase = queryPct ? q.slice(0, -1) : q;
                var desc = Role.itemDescs[id];
                if (desc == null || !desc.attrs) return false;
                for (var i = 0; i < desc.attrs.length; i++) {
                    var a = desc.attrs[i];
                    if (!a || !a.name) continue;
                    if (a.name.indexOf("◆") >= 0) continue;
                    var name = a.name.replace(/：$/, "");
                    var v = a.value == null ? "" : String(a.value);
                    var attrPct = v.indexOf("%") >= 0;
                    var aBase = name.replace(/%$/, "");
                    if (aBase === qBase && attrPct === queryPct) return true;
                }
                return false;
            },
            ":eqFind ": function (param) {
                // 【2026-08-19 优化】按名字查找物品ID，排除非 grade5/6 的装备
                if (param == null) return null;
                var name = String(param).trim();
                if (name == '') return null;
                // ① 背包 - 只查 grade5/6
                for (var key in Role.items) {
                    var item = Role.items[key];
                    if (item.grade == null || item.grade < 5) continue;
                    var itemName = item.name.replace(/<[^>]+>/g, "").trim();
                    if (itemName.indexOf(name) >= 0) {
                        return key;
                    }
                }
                // ② 身上装备 - 只查 grade5/6
                if (Role.equipments && Role.equipments.eqs) {
                    for (var i = 0; i < Role.equipments.eqs.length; i++) {
                        var eq = Role.equipments.eqs[i];
                        if (eq && eq.name) {
                            if (eq.grade == null || eq.grade < 5) continue;
                            var eqName = eq.name.replace(/<[^>]+>/g, "").trim();
                            if (eqName.indexOf(name) >= 0) {
                                return eq.id;
                            }
                        }
                    }
                }
                // ③ 描述缓存（itemDescs，无 grade 信息，保留原始逻辑）
                for (var descId in Role.itemDescs) {
                    if (Role.itemDescs[descId].name.indexOf(name) >= 0) {
                        return descId;
                    }
                }
                return null;
            },
            ":eqOn ": function (param) {
                // 【2026-08-09 移植v1.0.0】判断某装备ID是否正装备在身上（true/false）
                if (param == null) return false;
                var id = String(param).trim();
                if (!Role.equipments || !Role.equipments.eqs) return false;
                for (var i = 0; i < Role.equipments.eqs.length; i++) {
                    var eq = Role.equipments.eqs[i];
                    if (eq && eq.id == id) return true;
                }
                return false;
            }
        };
    });

    /***********************************************************************************\
        WSMUD Cmd Prehandler And Handler
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  WSMUD Raid 占位符
    //---------------------------------------------------------------------------

    const FilterCenter = {
        filter: function (filterExp, obj) {
            if (filterExp == null) {
                return false;
            }
            const exp = filterExp.substring(1, filterExp.length - 2);
            const yes = eval(`${exp}`);
            return yes;
        }
    }

    function ReplacePlaceholder(exp) {
        var patt = /\{([a-z]?)([^a-z%#]+?|<\w+>[^a-z%#]+?<\/\w+>)([a-z]?)(%?)(#?)\}\??(#[^#{}]*#)?/g;
        var placeholders = [];
        var result = patt.exec(exp);
        while (result != null) {
            placeholders.push({
                text: result[0],
                location: result[1] == "" ? null : result[1],
                name: result[2],
                blurry: result[4] != "%",
                quality: result[3] == "" ? null : result[3],
                type: result[5] != "#" ? "id" : "amount",
                filterExp: result[6]
            });
            result = patt.exec(exp);
        }
        const getValue = function (p) {
            let locationOrder = [];
            if (p.location == null) {
                locationOrder = p.quality == null ? ["r", "b", "d"] : ["b", "d"];
            } else {
                locationOrder = [p.location];
            }
            for (const location of locationOrder) {
                let value = null;
                switch (location) {
                    case "r":
                        value = Room.getItemId(p.name, p.blurry, false, p.filterExp);
                        break;
                    case "b": {
                        let item = Role.findItem(p.name, p.blurry, p.quality, p.filterExp);
                        if (item) {
                            value = p.type == "id" ? item.id : item.count;
                        }
                        break;
                    }
                    case "d": {
                        let item = DialogList.findItem(p.name, p.blurry, p.quality, p.filterExp);
                        if (item) {
                            value = p.type == "id" ? item.id : item.count;
                        }
                        break;
                    }
                }
                if (value != null) return value;
            }
            return null;
        };
        let realExp = exp;
        for (const p of placeholders) {
            let value = getValue(p);
            realExp = realExp.replace(p.text, value);
        }
        return realExp;
    }

    (function () {
        const handle = function (performer, cmd) {
            return ReplacePlaceholder(cmd);
        };
        const handler = new CmdPrehandler(handle)
        CmdPrehandleCenter.shared().addHandler(handler);
    })();

    (function () {
        const handle = function (cmds) {
            var result = [];
            var tempcmds = "";
            var inString = false;
            for (const cmd of cmds) {
                if (cmd.indexOf("`") == 0 || inString) {
                    var ccmd = cmd
                    if (cmd.indexOf("`") == 0) {
                        ccmd = cmd.substr(1);
                    }
                    if (cmd[cmd.length - 1] == "`") {
                        ccmd = cmd.substr(0, cmd.length - 1);
                    }
                    tempcmds = tempcmds + " " + ccmd
                    inString = true;
                }
                if (cmd[cmd.length - 1] == "`") {
                    result[result.length - 1] = result[result.length - 1] + tempcmds
                    tempcmds = "";
                    inString = false;
                    continue;
                }
                if (inString) {
                    continue;
                }
                const header = /^\s*/.exec(cmd)[0];
                let patt = /(\{[^\}]+\})([^\?]|$)/g;
                let r = patt.exec(cmd);
                let j = cmd.indexOf("@js")
                while (r != null && j == -1) {
                    result.push(`${header}@until ${r[1]}? != null`);
                    r = patt.exec(cmd);
                }
                result.push(cmd);
            }
            return result;
        };
        const rule = new PrecompileRule(handle, PrecompileRulePriority.low);
        PrecompileRuleCenter.shared().addRule(rule);
    })();

    //---------------------------------------------------------------------------
    //  WSMUD Raid 命令
    //---------------------------------------------------------------------------
    var __RecordGainsFrom = null;
    (function () {
        const executor = new CmdExecutor(cmd => {
            return cmd.indexOf("<-recordGains") == 0;
        }, (performer, _) => {
            if (performer.log()) Message.cmdLog("开始记录物品获取");
            __RecordGainsFrom = new Date().getTime();
        })
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new CmdExecutor(cmd => {
            return cmd.indexOf("recordGains->") == 0;
        }, (_, cmd) => {
            const gains = Role.gains(__RecordGainsFrom, new Date().getTime());
            var result = {};
            gains.forEach(gain => {
                var oldCount = 0;
                var old = result[gain.name];
                if (old) oldCount = old.count;
                result[gain.name] = { count: oldCount + gain.count, unit: gain.unit };
            });
            var content = "";
            if (cmd.indexOf("recordGains->silent") == -1) {
                Message.clean();
                Message.append("&nbsp;&nbsp;> 战利品列表如下：");
            }
            for (const name in result) {
                if (!result.hasOwnProperty(name)) continue;
                const gain = result[name];
                if (cmd.indexOf("recordGains->silent") == -1) {
                    Message.append("&nbsp;&nbsp;* " + name + " " + gain.count + gain.unit);
                }
                content += `&nbsp;&nbsp;* ${name} ${gain.count}${gain.unit}<br>`;
            }

            // 【2026-08-13 26.1.25】收益转纯文本：供流程变量引用（:gains 预设变量 / (_lastGains) 持久变量），
            // 流程里可直接拼进推送/聊天，如 @push 本次收益：(_lastGains)
            var _plain = (content || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n+/g, '\n').replace(/^ +/gm, '').trim();
            // 【2026-08-16】带颜色前缀版本：将游戏颜色标签 <hir>/<hig> 等转为 [颜色] 前缀文本，
            // 如 <hig>狂风快刀</hig> → [绿]狂风快刀，供企业微信等渠道直接推送（纯文本，无需格式转换）
            // 【2026-08-17】修正颜色映射：hic=蓝, hiz=紫（无大写标签）
            var _colorMap = { '<hig>':'[绿]','</hig>':'',
                '<hir>':'[红]','</hir>':'',
                '<him>':'[品红]','</him>':'',
                '<hic>':'[蓝]','</hic>':'',
                '<hiy>':'[黄]','</hiy>':'',
                '<hiz>':'[紫]','</hiz>':'',
                '<hio>':'[橙]','</hio>':'',
                '<wht>':'','</wht>':'',
                '<hiw>':'[白]','</hiw>':'',
                '<gre>':'[深绿]','</gre>':'',
                '<mag>':'[紫]','</mag>':'',
                '<red>':'[暗红]','</red>':'',
                '<blu>':'[深蓝]','</blu>':'',
                '<hib>':'[深蓝]','</hib>':'' };
            var _richContent = (content || '');
            // 【2026-08-17 修复】服务器返回的颜色标签大小写不固定（实测有大写 <HIZ>），
            // 原 split/join 只匹配小写标签导致大写标签不转换；改用不区分大小写的正则替换
            _richContent = _richContent.replace(/<(\/?)(hig|hir|him|hic|hiy|hiz|hio|wht|hiw|gre|mag|red|blu|hib)>/gi, function (m, sl, tag) {
                var key = '<' + sl + tag.toLowerCase() + '>';
                return _colorMap.hasOwnProperty(key) ? _colorMap[key] : m;
            });
            _richContent = _richContent.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').replace(/\n+/g, '\n').replace(/^ +/gm, '').trim();
            Role.profitInfo = _plain != "" ? _plain : null;
            // 持久变量 _lastGains：刷新后仍在，流程里 (_lastGains) 引用
            try {
                if (typeof PersistentVariables !== 'undefined' && PersistentVariables && typeof PersistentVariables.save === 'function') {
                    PersistentVariables.save('_lastGains', _plain != "" ? _plain : "");
                }
            } catch (e) { }

            // 【2026-08-13 26.1.23 收益推送】战利品统计推送到手机（企业微信等渠道；推送总开关未开则静默）
            // silent/nopopup 模式也推送——正好适合"游戏内静默统计 + 手机看收益"的挂机场景
            // 收益推送使用 _richContent（带企业微信颜色标签），其他渠道用 _plain（纯文本）
            try {
                if (typeof PushAlert === 'function' && _plain) {
                    var _d = new Date();
                    var _ts = String(_d.getHours()).padStart(2, '0') + ':' + String(_d.getMinutes()).padStart(2, '0');
                    // 收益类 10 分钟防重复（比默认 15 分钟宽松，避免连续副本吞掉统计）
                    PushAlert('gains', '💰 收益统计(' + _ts + ')：\n' + _richContent, 10 * 60 * 1000);
                }
            } catch (e) { }

            if (cmd.indexOf("recordGains->nopopup") == 0 || cmd.indexOf("recordGains->silent") == 0) return;
            layer.open({
                type: 1,
                area: ["380px", "300px"],
                title: "战利品列表",
                content: content,
                offset: 'auto',
                shift: 2
            });
        })
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("toolbar", function (performer, param) {
            performer.timeSeries(new Date().getTime());
            $(`span[command=${param}]`).click();
            return new Promise(resolve => {
                setTimeout(_ => {
                    $(".glyphicon-remove-circle").click();
                    resolve();
                }, 500);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilAtCmdExecutor("liaoshang", function (performer, param) {
            if (Role.hp / Role.maxHp >= 1) {
                WG.SendCmd("stopstate");
                return true;
            }
            if (Role.state != RoleState.liaoshang) {
                WG.SendCmd("stopstate;liaoshang");
            }
            return false;
        }, null, 1000);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilAtCmdExecutor("dazuo", function (performer, param) {
            if (Role.mp / Role.maxMp > 0.99) {
                WG.SendCmd("stopstate");
                return true;
            }
            if (Role.state != RoleState.dazuo) {
                WG.SendCmd("stopstate;dazuo");
            }
            return false;
        }, null, 1000);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilAtCmdExecutor("eq", function (performer, param) {
            const eqIds = param.split(",");
            let cmds = [];
            eqIds.forEach(eqId => {
                if (!Role.wearing(eqId)) cmds.push(`eq ${eqId}`);
            });
            if (cmds.length > 0) {
                WG.SendCmd("stopstate;" + cmds.join(";"));
                return false;
            }
            return true;
        }, null, 1000);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilAtCmdExecutor("cd", function (performer, param) {
            if (param == null) {
                return !Role.hasCoolingSkill();
            }

            let validParam = param;
            let isBlack = false;
            if (validParam[0] == "^") {
                validParam = validParam.substring(1);
                isBlack = true;
            }
            const skills = validParam.split(",");
            if (isBlack) {
                for (const cooling of Role.coolingSkills()) {
                    if (skills.indexOf(cooling) == -1) {
                        return false;
                    }
                }
            } else {
                let coolings = Role.coolingSkills();
                for (const skill of skills) {
                    if (coolings.indexOf(skill) != -1) {
                        return false;
                    }
                }
            }
            return true;
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    class UntilSearchedAtCmdExecutor extends UntilAtCmdExecutor {
        constructor(key, search) {
            const assert = function (performer, param) {
                let placeholders = [];
                let patt = /\(\$[a-zA-Z0-9_]+?\)/g;
                let result = patt.exec(param);
                while (result != null) {
                    placeholders.push(result[0]);
                    result = patt.exec(param);
                }
                let regex = param;
                for (let i = 0; i < placeholders.length; i++) {
                    const placeholder = placeholders[i];
                    regex = regex.replace(placeholder, "(.+?)");
                }
                let result2 = search(regex, performer.timeSeries());
                if (result2 == null) {
                    return false;
                }
                for (let j = 0; j < placeholders.length; j++) {
                    const placeholder = placeholders[j];
                    let key = placeholder.substring(2, placeholder.length - 1);
                    let value = result2[j + 1];
                    if (value != null) {
                        UpdateVariable(performer, key, value);
                    }
                }
                return true;
            };
            super(key, assert);
        }
    }

    (function () {
        const executor = new UntilSearchedAtCmdExecutor("tip", (regex, from) => {
            return SystemTips.search(regex, from);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilSearchedAtCmdExecutor("msgtip", (regex, from) => {
            return MsgTips.search(regex, from);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilSearchedAtCmdExecutor("task", (regex, from) => {
            return TaskList.search(regex, from);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();
    (function () {
        // 【2026-08-09 修改】@events：内置 events 命令，等服务器回包后再判断（不阻塞整个流程，
        // 但等待这一次 events 请求的服务器数据，最多 3 秒兜底）；带参数时用回包数据立即匹配并提取变量。
        // 【2026-08-22 修复】不能用 AtCmdExecutor——它会在 superExecute 里无条件调 CmdPrehandleCenter，
        // 把反向捕获占位符 ($Var) 提前替换成变量当前值，导致反捕获失效（匹配命中也无法取值）。
        // 改用手工"智能替换"：($Var) 保留给反向捕获，其余 (Var)/(:预设) 才做变量替换。
        const smartReplace = function (performer, param) {
            // 1) 先临时把反捕获占位符 ($Name) 换成哨兵符，避免被变量替换吞掉
            var tokens = [];
            param = param.replace(/\(\$[a-zA-Z0-9_]+?\)/g, function (s) {
                return "\u0001" + (tokens.push(s) - 1) + "\u0001";
            });
            // 2) 对剩余部分做正常变量替换（复用已注册进 CmdPrehandleCenter 的替换 handler）
            param = CmdPrehandleCenter.shared().handle(performer, param);
            // 3) 还原反捕获占位符
            for (let i = 0; i < tokens.length; i++) {
                param = param.replace("\u0001" + i + "\u0001", tokens[i]);
            }
            return param;
        };
        const executor = new CmdExecutor(function (cmd) {
            // 【2026-08-23】精确匹配 @events（需带参数或完全相等），避免拦截 @eventsall 命令
            return cmd === "@events" || /^@events\s/.test(cmd);
        }, function (performer, cmd) {
            const matched = /@events\s+(.*)$/.exec(cmd);
            const param = matched ? matched[1] : "";
            return new Promise(function (resolve) {
                var finished = false;
                var timeoutTimer = null;
                var hookId = null;
                var finish = function () {
                    if (finished) return;
                    finished = true;
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    if (hookId != null) {
                        try { WG.remove_hook(hookId); } catch (e) { }
                    }
                    resolve();
                };
                hookId = WG.add_hook("dialog", function (data) {
                    if (finished) return;
                    if (data.dialog == null || data.dialog != "events" || data.items == null) return;
                    if (param != null) {
                        // 服务器回包到达：用本次数据立即匹配（参考 EventList._monitorEventsList 的文本拼接）
                        let list = [];
                        for (const item of data.items) {
                            if (item.length > 2) {
                                list.push(item[1] + " " + item[2]);
                            }
                        }
                        // 智能替换：保留 ($Var) 用于反向捕获，其余做变量替换
                        const text = smartReplace(performer, param);
                        let placeholders = [];
                        let patt = /\(\$[a-zA-Z0-9_]+?\)/g;
                        let result = patt.exec(text);
                        while (result != null) {
                            placeholders.push(result[0]);
                            result = patt.exec(text);
                        }
                        // 反向捕获键名列表（后续用于"整轮未匹配则置 null"）
                        const captureKeys = placeholders.map(p => p.substring(2, p.length - 1));
                        let regex = text;
                        for (let i = 0; i < placeholders.length; i++) {
                            regex = regex.replace(placeholders[i], "(.+?)");
                        }
                        // 记录本轮是否匹配成功；未匹配到的反捕获变量置 null
                        let matched = false;
                        try {
                            let reg = new RegExp(regex);
                            for (const t of list) {
                                let m2 = reg.exec(t);
                                if (m2 != null) {
                                    matched = true;
                                    for (let j = 0; j < placeholders.length; j++) {
                                        let key = placeholders[j].substring(2, placeholders[j].length - 1);
                                        let value = m2[j + 1];
                                        if (value != null) UpdateVariable(performer, key, value);
                                    }
                                    break;
                                }
                            }
                        } catch (e) { }
                        // 【2026-08-22】整轮 events 数据都匹配不上时，反向捕获变量应置 null（而非沿用旧值）
                        if (!matched) {
                            for (const key of captureKeys) {
                                UpdateVariable(performer, key, null);
                            }
                        }
                    }
                    finish();
                });
                WG.Send("events");   // 向服务器请求事件列表
                timeoutTimer = setTimeout(finish, 3000);   // 3 秒兜底（服务器没回包也不卡流程）
            });
        }, CmdExecutorPriority.ordinary);
        CmdExecuteCenter.addExecutor(executor);
    })();
    (function () {
        // 【2026-08-23 新增】@eventsall：与 @events 一样等服务器 dialog:events 回包，但同一回包内
        // 支持按 `|` 分隔的多个独立匹配分支，每个分支各自对全部事件条目扫描并捕获变量，互不干扰。
        // 适用场景：同一次回包里包含多条不同活动（如"挖矿效率+($wkzn)。|采药获得的经验+($cyzn)。"），
        // 希望一次性把多个变量都提取到（原 @events 遇到第一条命中即 break，只能取到一个）。
        // smartReplace 与 @events 同逻辑（该 IIFE 局部变量，此处复制一份供本命令使用）
        const smartReplace = function (performer, param) {
            var tokens = [];
            param = param.replace(/\(\$[a-zA-Z0-9_]+?\)/g, function (s) {
                return "\u0001" + (tokens.push(s) - 1) + "\u0001";
            });
            param = CmdPrehandleCenter.shared().handle(performer, param);
            for (let i = 0; i < tokens.length; i++) {
                param = param.replace("\u0001" + i + "\u0001", tokens[i]);
            }
            return param;
        };
        const executor = new CmdExecutor(function (cmd) {
            return cmd.indexOf("@eventsall") == 0;
        }, function (performer, cmd) {
            const matched = /@eventsall\s+(.*)$/.exec(cmd);
            const param = matched ? matched[1] : "";
            return new Promise(function (resolve) {
                var finished = false;
                var timeoutTimer = null;
                var hookId = null;
                var finish = function () {
                    if (finished) return;
                    finished = true;
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    if (hookId != null) {
                        try { WG.remove_hook(hookId); } catch (e) { }
                    }
                    resolve();
                };
                hookId = WG.add_hook("dialog", function (data) {
                    if (finished) return;
                    if (data.dialog == null || data.dialog != "events" || data.items == null) return;
                    if (param != null) {
                        let list = [];
                        for (const item of data.items) {
                            if (item.length > 2) {
                                list.push(item[1] + " " + item[2]);
                            }
                        }
                        // 智能替换：保留 ($Var) 用于反向捕获，其余做变量替换
                        const text = smartReplace(performer, param);
                        // 收集本命令所有反捕获占位符（整轮全部未匹配时置 null 用）
                        let allPlaceholders = [];
                        let ptt = /\(\$[a-zA-Z0-9_]+?\)/g;
                        let rr = ptt.exec(text);
                        while (rr != null) {
                            allPlaceholders.push(rr[0]);
                            rr = ptt.exec(text);
                        }
                        const allCaptureKeys = allPlaceholders.map(p => p.substring(2, p.length - 1));
                        // 按 | 拆成多个独立分支，各自扫描全部条目捕获
                        const segments = String(text).split("|");
                        const hitKeys = {};
                        for (const seg of segments) {
                            if (!seg) continue;
                            // 该分支占位符 → 替换为正则捕获组
                            let segPlaceholders = [];
                            let sp = /\(\$[a-zA-Z0-9_]+?\)/g;
                            let sr = sp.exec(seg);
                            while (sr != null) {
                                segPlaceholders.push(sr[0]);
                                sr = sp.exec(seg);
                            }
                            let segRegex = seg;
                            for (let i = 0; i < segPlaceholders.length; i++) {
                                segRegex = segRegex.replace(segPlaceholders[i], "(.+?)");
                            }
                            try {
                                let sreg = new RegExp(segRegex);
                                for (const t of list) {
                                    let m3 = sreg.exec(t);
                                    if (m3 != null) {
                                        for (let j = 0; j < segPlaceholders.length; j++) {
                                            let key = segPlaceholders[j].substring(2, segPlaceholders[j].length - 1);
                                            let value = m3[j + 1];
                                            if (value != null) {
                                                UpdateVariable(performer, key, value);
                                                hitKeys[key] = true;
                                            }
                                        }
                                        break;   // 该分支命中即停，去处理下一分支
                                    }
                                }
                            } catch (e) { }
                        }
                        // 整轮（所有分支）都未捕获到的反捕获变量 → 置 null
                        for (const key of allCaptureKeys) {
                            if (!hitKeys[key]) {
                                UpdateVariable(performer, key, null);
                            }
                        }
                    }
                    finish();
                });
                WG.Send("events");   // 请求事件列表
                timeoutTimer = setTimeout(finish, 3000);
            });
        }, CmdExecutorPriority.ordinary);
        CmdExecuteCenter.addExecutor(executor);
    })();
    (function () {
        const executor = new UntilSearchedAtCmdExecutor("xy", (regex, from) => {
            return Xiangyang.search(regex, from);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new UntilAtCmdExecutor("kill", function (performer, param) {
            const parts = param.split(",");
            let infos = [];
            for (let i = 0; i < parts.length; i++) {
                const name = parts[i];
                let blurry = true;
                if (name.substring(name.length - 1) == "%") {
                    name = name.substring(0, name.length - 1);
                    blurry = false;
                }
                infos.push({ name: name, blurry: blurry });
            }
            const finish = Room.didKillItemsInRoom(infos);
            if (finish) {
                return true;
            } else {
                let cmd = "";
                infos.forEach(info => {
                    const itemId = Room.getItemId(info.name, info.blurry, true);
                    if (itemId != null) { // 检查是否已处理
                        cmd += "kill " + itemId + ";";
                    }
                });
                WG.SendCmd(cmd);
                return false;
            }
        }, null, 1000, 1000);
        CmdExecuteCenter.addExecutor(executor);
    })();

    /* 等待，直到 dialog 打开，在打开 dialog 后调用，便于后续使用占位符 */
    (function () {
        const executor = new UntilAtCmdExecutor("dialog", function (performer, param) {
            return DialogList.timestamp > performer.timeSeries();
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    function UntilRoleFreePerformerPromise(callback, log) {
        return PerformerPromise("@until (:free) == true", callback, log);
    }

    (function () {
        const executor = new AtCmdExecutor("cleanBag", function (performer, param) {
            if (performer.log()) Message.cmdLog("清理包裹");
            return UntilRoleFreePerformerPromise(resolve => {
                WG.SendCmd("sell all");
                setTimeout(resolve, 1000);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        // 【2026-08-24 增强】@tidyBag：真正的一键整理包裹，固定顺序
        //   stopstate → 自动使用 → 分解 → 清单售卖(autoSellList) → 卖光剩余 → 存仓
        // 使用/分解/清单售卖均做"阻塞"（轮询物品用尽/角色空闲），确保上一步完成后再进入下一步。
        const executor = new AtCmdExecutor("tidyBag", function (performer, param) {
            // 分步进度提示（始终显示，不受 performer.log 开关限制）
            const step = function (m) { Message.cmdLog(m); };
            Message.cmdLog("整理包裹开始");
            return new Promise(function (resolve) {
                // 0) 先 stopstate 停掉当前动作，避免与新指令冲突
                WG.SendCmd("stopstate");
                setTimeout(function () {
                    // 1) 自动使用（阻塞）
                    Message.cmdLog("[1/4] 自动使用物品");
                    WG.tidyBlockUse(step).then(function () {
                        // 2) 分解（阻塞）
                        Message.cmdLog("[2/4] 分解装备");
                        WG.tidyBlockFenjie(step).then(function () {
                            // 3) 按 autoSellList 清单售卖（阻塞）
                            Message.cmdLog("[3/4] 按清单售卖");
                            WG.tidyBlockSell(step).then(function () {
                                // 4) 卖光剩余 + 存仓
                                Message.cmdLog("[4/4] 卖光剩余并存入仓库");
                                WG.SendCmd("sell all;store all");
                                setTimeout(function () { Message.cmdLog("整理包裹完成"); resolve(); }, 1000);
                            });
                        });
                    });
                }, 500);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();


    (function () {
        const executor = new AtCmdExecutor("renew", function (performer, param) {
            if (performer.log()) Message.cmdLog("恢复角色气血和内力");
            return UntilRoleFreePerformerPromise(resolve => {
                Role.renew(_ => { setTimeout(resolve, 1000); });
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("beep", function (performer, param) {
            NotSound();
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("push", function (performer, param) {
            Push(param);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    //---------------------------------------------------------------------------
    //  Skill State Machine
    //---------------------------------------------------------------------------

    var SkillStateMachine = {
        perform: function (skill, force) {
            // if (!Role.hasSkill(skill)) return;
            const timestamp = new Date().getTime();
            this._perform(skill, force, timestamp);
        },
        _perform: function (skill, force, timestamp) {
            if (this._skillStack[skill] != null && this._skillStack[skill] > timestamp) return;
            const self = this;
            if ((!Role.isFree() && !force) || Role.coolingSkill(skill) || Role.rtime) {
                setTimeout(_ => {
                    self._perform(skill, force, timestamp);

                }, 200);
                return;
            }
            // if (!Role.hasSkill(skill)) {
            //     if( self._performNum < 10){
            //         setTimeout(_ => {
            //             self._perform(skill, force, timestamp);
            //         }, 200);
            //     }else{
            //         self._performNum = 0;
            //         return;
            //     }
            //     self._performNum = self._performNum + 1;
            //     return;
            // }
            this._skillStack[skill] = timestamp;
            WG.SendCmd(`perform ${skill}`);
            const timer = setInterval(_ => {
                if (Role.coolingSkill(skill) || Role.combating == false) {
                    clearInterval(timer);
                    if (self._skillStack[skill] != null && self._skillStack[skill] == timestamp) {
                        delete self._skillStack[skill];
                    }
                    return;
                }
                if (!Role.isFree() || Role.rtime) return;
                WG.SendCmd(`perform ${skill}`);
            }, 1000);
        },
        reset: function () {
            this._skillStack = {};
        },
        _skillStack: {},
        _performNum: 0
    }

    //---------------------------------------------------------------------------
    //  Send System Cmd
    //---------------------------------------------------------------------------

    var __systemCmdDelay = 1500;

    (function () {
        const executor = new AtCmdExecutor("cmdDelay", function (performer, param) {
            performer._cmdDelay = parseInt(param);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    const UnpackSystemCmd = function (cmd) {
        let result = cmd;
        let patt = /([^;]+)\[(\d+?)\]/g;
        let r = patt.exec(cmd);
        while (r != null) {
            const packedCmd = r[1];
            const count = parseInt(r[2]);
            const temp = (new Array(count)).fill(packedCmd);
            const unpackedCmd = temp.join(";");
            result = result.replace(r[0], unpackedCmd);
            r = patt.exec(cmd);
        }
        return result;
    };

    (function () {
        function createWorker(f) {
            var blob = new Blob(['(function(){' + f.toString() + '})()']);
            var url = window.URL.createObjectURL(blob);
            var worker = new Worker(url);
            return worker;
        }
        const executor = new CmdExecutor(_ => {
            return true;
        }, (performer, cmd) => {
            let validCmd = CmdPrehandleCenter.shared().handle(performer, cmd);
            validCmd = UnpackSystemCmd(validCmd);
            return UntilRoleFreePerformerPromise(resolve => {
                const timestamp = new Date().getTime();
                let delay = 0;
                const fromReject = timestamp - SystemTips.rejectTimestamp;
                if (fromReject < 1500) {
                    // console.log(fromReject);
                    delay = fromReject;
                }
                var wa = createWorker("setTimeout(() =>  postMessage('0'), " + delay + ")")
                wa.onmessage = function (event) {
                    wa.terminate();
                    if (performer.log()) Message.cmdLog("执行系统命令", validCmd);
                    performer.timeSeries(timestamp);
                    performer.systemCmdTimestamp = timestamp;
                    WG.SendCmd(validCmd);
                    const cmdDelay = performer._cmdDelay == null ? __systemCmdDelay : performer._cmdDelay;
                    setTimeout(resolve, cmdDelay);
                };
            });
        }, CmdExecutorPriority.low);
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("force", function (performer, param) {
            return new Promise(resolve => {
                if (performer.log()) Message.cmdLog("强行执行系统命令", param);
                WG.SendCmd(param);
                const cmdDelay = performer._cmdDelay == null ? __systemCmdDelay : performer._cmdDelay;
                setTimeout(resolve, cmdDelay);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("perform", function (performer, param) {
            const skills = param.split(",");
            for (const skill of skills) {
                SkillStateMachine.perform(skill, false);
            }
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    //---------------------------------------------------------------------------
    //  Manage Trigger
    //---------------------------------------------------------------------------

    (function () {
        const executor = new AtCmdExecutor("on", function (performer, param) {
            unsafeWindow.TriggerCenter.activate(param);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    (function () {
        const executor = new AtCmdExecutor("off", function (performer, param) {
            unsafeWindow.TriggerCenter.deactivate(param);
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    /***********************************************************************************\
        Dungeons（数据从 raid-dungeons.js 加载）
    \***********************************************************************************/

    var Dungeons = (typeof unsafeWindow !== 'undefined' && unsafeWindow.__raidDungeons) || [];

    const GetDungeonFlow = function (name) {
        for (const d of Dungeons) {
            if (d.name == name) {
                return d.source;
            }
        }
        return null;
    };

    // params: name subtype
    const AutoDungeonName = function (params) {
        const parts = params.split(' ');
        const name = parts[0];
        const type = parts[1];
        let totalName = '';
        switch (type) {
            case '0':
                if (GetDungeonFlow(name)) {
                    return name;
                }
                totalName = `${name}(简单)`;
                if (GetDungeonFlow(totalName)) {
                    return totalName;
                }
                break;
            case '1':
                totalName = `${name}(困难)`;
                if (GetDungeonFlow(totalName) != null) {
                    return totalName;
                };
                break;
            case '2':
                totalName = `${name}(组队)`;
                if (GetDungeonFlow(totalName) != null) {
                    return totalName;
                };
                break;
            default:
                break;
        }
        return null;
    };

    (function () {
        const executor = new AtCmdExecutor("fb", function (performer, param) {
            const name = AutoDungeonName(param);
            if (name == null) {
                Message.append('暂不支持次副本哦，欢迎到论坛分享此副本流程。');
            } else {
                const source = GetDungeonSource(name);
                return new Promise(resolve => {
                    const p = new Performer(`自动副本-${name}`, source);
                    p.log(true);
                    p.start(_ => {
                        resolve();
                    });
                });
            }
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    function GetDungeonSource(name) {
        let source = GetDungeonFlow(name);
        if (source == null) {
            return null;
        }
        const result = `
[if] (_DungeonHpThreshold) == null
    ($_DungeonHpThreshold) = 50
[if] (_DungeonWaitSkillCD) == null
    ($_DungeonWaitSkillCD) = 打开
[if] (_DungeonBagCleanWay) == null
    ($_DungeonBagCleanWay) = 存仓及售卖
[if] (_DungeonRecordGains) == null
    ($_DungeonRecordGains) = 是
#select ($_DungeonHpThreshold) = 副本内疗伤，当气血低于百分比,100|90|80|70|60|50|40|30|20|10,(_DungeonHpThreshold)
#select ($_DungeonWaitSkillCD) = Boss战前等待技能冷却,打开|关闭,(_DungeonWaitSkillCD)
#select ($_DungeonBagCleanWay) = 背包清理方案,不清理|售卖|存仓及售卖,(_DungeonBagCleanWay)
#select ($_DungeonRecordGains) = 结束后显示收益统计,是|否,(_DungeonRecordGains)
#input ($_repeat) = 重复次数,1
#config
[if] (arg0) != null
    ($_DungeonHpThreshold) = (arg0)
[if] (arg1) != null
    ($_DungeonWaitSkillCD) = (arg1)
[if] (arg2) != null
    ($_DungeonBagCleanWay) = (arg2)
[if] (arg3) != null
    ($_repeat) = (arg3)
stopstate
<---
[if] (_DungeonHpThreshold) == null
    ($_DungeonHpThreshold) = 50
($hpPer) = (_DungeonHpThreshold)/100
[if] (:hpPer) < (hpPer)
    @liaoshang
--->
[if] (_DungeonRecordGains) == 是
    <-recordGains
($_i) = 0
[if] (_repeat) == null
    ($_repeat) = 1
[while] (_i) < (_repeat)
    @renew
    [if] (_DungeonBagCleanWay) == 售卖
        @cleanBag
    [else if] (_DungeonBagCleanWay) == 存仓及售卖
        @tidyBag
${SourceCodeHelper.appendHeader("    ", source)}
    cr;cr over
    ($_i) = (_i) + 1
[if] (_DungeonBagCleanWay) == 售卖
    @cleanBag
[else if] (_DungeonBagCleanWay) == 存仓及售卖
    @tidyBag
$to 住房-练功房;dazuo
[if] (_DungeonRecordGains) == 是
    recordGains->
`
        return result;
    }


    /***********************************************************************************\
        Server
    \***********************************************************************************/

    // 【2026-08-14 安全警示】判断 Raid 流程/触发器源码是否含可执行任意 JS 的指令（@js / #js）
    // 分享的流程 = 别人写的代码，运行后可操作你的角色；导入前必须让用户确认信任来源
    function SourceContainsExecutableCode(source) {
        if (typeof source !== 'string' || !source) return false;
        return /(^|\n)\s*@js(\s|$)|(^|\n)\s*#js(\s|$)/.test(source);
    }

    const Server = {

        uploadFlows: function () {
            const flows = FlowStore.getAll();
            const map = WorkflowConfig._rootList();
            const data = { map: map, flows: flows };
            const value = JSON.stringify(data);
            Server._sync("uploadFlows", { id: Role.id, value: value }, pass => {
                GM_setClipboard(pass);
                alert(`角色流程上传成功，该角色流程会在服务器保存 24 小时。\n角色流程获取码：${pass}，已复制到系统剪切板。`);
                Message.append(`<hiy>角色流程获取码：${pass}</hiy>`);
                Message.append(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${pass}');" >
                                 我无法复制 </span></div>`, 2);
            }, _ => {
                alert("角色流程上传失败！");
            });
        },
        downloadFlows: function (pass) {
            Server._sync("downloadFlows", { pass: pass }, value => {
                let data = JSON.parse(value);
                // 【2026-08-14 安全警示】云端流程里含 @js/#js（可执行任意代码）→ 提醒确认
                let hasExec = false;
                try {
                    for (const name in data.flows) {
                        if (!data.flows.hasOwnProperty(name)) continue;
                        if (SourceContainsExecutableCode(data.flows[name].source)) { hasExec = true; break; }
                    }
                } catch (e) { }
                if (hasExec && !confirm("⚠️ 该角色流程中包含可执行任意代码的 @js/#js 指令！\n\n云端分享的流程 = 别人写的代码，运行后可在你的游戏里执行任意操作。\n仅在你信任分享者时才拷贝。\n\n仍要拷贝吗？")) {
                    return;
                }
                FlowStore.corver(data.flows);
                WorkflowConfig._rootList(data.map);
                // console.log(data);
                alert("拷贝角色流程成功！");
            }, _ => {
                alert("错误的角色流程获取码！");
            });
        },
        uploadTriggers: function () {

            const triggers = unsafeWindow.TriggerCenter.getAllData();
            const value = JSON.stringify(triggers);
            Server._sync("uploadTriggers", { id: Role.id, value: value }, pass => {
                GM_setClipboard(pass);
                alert(`角色触发器上传成功，该角色触发会在服务器保存 24 小时。\n角色触发器获取码：${pass}，已复制到系统剪切板。`);
                Message.append(`<hiy>角色触发获取码：${pass}</hiy>`);
                Message.append(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${pass}');" >
                                    我无法复制 </span></div>`, 2);
            }, _ => {
                alert("角色触发器上传失败！");
            });


        },
        downloadTriggers: function (pass) {
            Server._sync("downloadTriggers", { pass: pass }, value => {
                let data = JSON.parse(value);
                unsafeWindow.TriggerCenter.corver(data);
                // console.log(data);
                alert("拷贝角色触发器成功！");
            }, _ => {
                alert("错误的角色触发器获取码！");
            });
        },
        getNotice: function () {
            const noticeDataKey = "NoticeDataKey";
            const oldData = GM_getValue(noticeDataKey, { version: "0.0.0", type: "0", value: "欢迎使用 wsmud_Raid" });
            Server._async("notice", { version: oldData.version, id: Role.id }, data => {
                let validData = oldData;
                if (data.version > oldData.version) {
                    GM_setValue(noticeDataKey, data);
                    validData = data;
                }
                if (validData.type == "0") {
                    LayerHelper.msg(`
                    <div>
                    <p><hig>Raid：</hig>${validData.value}</p>
                    <p style="text-align:center">(v-${GM_info.script.version || ''})</p>
                    </div>`);
                } else {
                    const HideVersionNoticeKey = "HideVersionNoticeKey";
                    if (GM_getValue(HideVersionNoticeKey, null) == validData.version) {
                        return;
                    }
                    layer.open({
                        type: 1,
                        skin: "layui-layer-rim", //加上边框
                        area: ["380px"],
                        title: `wsmud_Raid 提示`,
                        content: validData.value,
                        offset: "auto",
                        shift: 2,
                        move: false,
                        closeBtn: 0,
                        btn: ['确认', '不再显示'],
                        yes: function (index) {
                            layer.close(index);
                        },
                        btn2: function () {
                            GM_setValue(HideVersionNoticeKey, validData.version);
                        }
                    });
                }
            });
        },

        shareFlowTrigger: function (username, password, type, data) {

            let value = data;
            value["author"] = username;
            const params = {
                username: username,
                password: password,
                name: data.name,
                phone: "",
                type: type,
                value: JSON.stringify(value)
            };
            // console.log(params);
            Server._sync("uploadSingle", params, token => {
                GM_setClipboard(token);
                alert(`${type}分享成功，该${type}会在服务器保存 30 天\n每次下载会延长保存 始于下载时刻的 30 天\n分享码：${token}\n已复制到系统剪切板。`);
                Message.append(`<hiy>${type}分享码：${token}</hiy>`);
                Message.append(`<div class="item-commands"><span cmd = "@js prompt('请手动复制下面的数据','${token}');" >
                                         我无法复制 </span></div>`, 2);
            }, error => {
                alert(error);
            });

        },
        importFlow: function (token, target) {
            if (token.indexOf("·流程") == -1) {
                alert("错误的流程分享码！");
                return;
            }
            const params = { token: token };
            Server._sync("downloadSingle", params, data => {
                const flow = JSON.parse(data);
                // 【2026-08-14 安全警示】分享的流程含 @js/#js（可执行任意代码）→ 导入前确认信任
                if (SourceContainsExecutableCode(flow.source)) {
                    if (!confirm(`⚠️ 流程「${flow.name}」包含可执行任意代码的 @js/#js 指令！\n\n分享的流程 = 别人写的代码，运行后可在你的游戏里执行任意操作。\n仅在你信任分享者时才导入。\n\n仍要导入吗？`)) {
                        return;
                    }
                }
                const result = WorkflowConfig.createWorkflow(flow.name, flow.source, target);
                if (result == true) {
                    //alert(`导入流程 ${flow.name} 成功！`);
                    Message.append(`<hiy>导入流程 ${flow.name} 成功！</hiy>`);
                } else {
                    alert(result);
                }
            }, _ => {
                alert("错误的流程分享码！");
            });
        },
        importTrigger: function (token) {
            if (token.indexOf("·触发") == -1) {
                alert("错误的触发器分享码！");
                return;
            }
            const params = { token: token };
            Server._sync("downloadSingle", params, data => {
                const trigger = JSON.parse(data);
                // 【2026-08-14 安全警示】触发器源码含 @js/#js（可执行任意代码）→ 导入前确认信任
                if (SourceContainsExecutableCode(trigger.source)) {
                    if (!confirm(`⚠️ 触发器「${trigger.name}」包含可执行任意代码的 @js/#js 指令！\n\n分享的触发器 = 别人写的代码，运行后可在你的游戏里执行任意操作。\n仅在你信任分享者时才导入。\n\n仍要导入吗？`)) {
                        return;
                    }
                }
                const result = unsafeWindow.TriggerCenter.create(trigger.name, trigger.event, trigger.conditions, trigger.source, trigger.active);
                if (result == true) {
                    //alert(`导入触发器 ${trigger.name} 成功！`);
                    Message.append(`<hiy>导入触发器 ${trigger.name} 成功！</hiy>`);
                } else {
                    alert(result);
                }
            }, _ => {
                alert("错误的触发器分享码！");
            });
        },

        _address: "wsmud.ii74.com/S",
        _async(uri, params, success, fail) {
            this._get(true, uri, params, success, fail);
        },
        _sync(uri, params, success, fail) {
            this._get(false, uri, params, success, fail);
        },
        _get(async, uri, params, success, fail) {
            $.ajax({
                type: "post",
                url: `https://${Server._address}/${uri}`,
                data: params,
                async: async,
                success: function (data) {
                    if (data.code == 200) {
                        if (success != null) success(data.data);
                    } else {
                        let error = data.code;
                        if (data.data != null) error = data.data;
                        if (fail != null) fail(error);
                    }
                },
                dataType: "json"
            });
        },
        _getPhone(success, fail) {
            $.ajax({
                type: "post",
                url: `/UserAPI/GetPhone`,
                async: true,
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {
                    if (data) {
                        //去掉*
                        data = data.replace(/\"/g, "");
                        if (success != null) success(data);
                    } else {
                        fail(data);
                    }
                }
            });
        }
    };

    /***********************************************************************************\
        UI
    \***********************************************************************************/

    //---------------------------------------------------------------------------
    //  兼容 1.x.x
    //---------------------------------------------------------------------------

    var CmdGroupManager = {
        /**
         * @returns {{ id: number, name: string }[]}
         */
        getAll: function () {
            var result = [];
            GM_listValues().map(function (key) {
                if (key.indexOf(CmdGroupManager._prefix) == 0) {
                    var id = CmdGroupManager._id(key);
                    var name = CmdGroupManager.getName(id);
                    result.push({ id: id, name: name });
                }
            });
            return result;
        },
        getName: function (id) {
            var value = GM_getValue(this._key(id));
            if (value == null) return null;
            var obj = JSON.parse(value);
            return obj.name;
        },
        getCmdsText: function (id) {
            var value = GM_getValue(this._key(id));
            if (value == null) return "";
            var obj = JSON.parse(value);
            var cmdsStr = obj.cmdsStr;
            return cmdsStr;
        },
        /**
         * @returns {string[]}
         */
        getCmds: function (id) {
            var text = this.getCmdsText(id);
            var cmds = text.split(/^\s*|\s*\n+\s*/g);
            var first = cmds[0];
            if (first != null && first.length == 0) {
                cmds.splice(0, 1);
            }
            var last = cmds[cmds.length - 1];
            if (last != null && last.length == 0) {
                cmds.splice(cmds.length - 1, 1);
            }
            return cmds;
        },
        createCmdGroup: function (name, cmdsStr) {
            var id = new Date().getTime();
            return this.updateCmdGroup(id, name, cmdsStr);
        },
        updateCmdGroup: function (id, name, cmdsStr) {
            if (name == null || !/\S+/g.test(name)) {
                alert("命令组想要一个名字...");
                return false;
            }
            if (cmdsStr == null || !/\S+/g.test(cmdsStr)) {
                alert("命令组不想没有任何内容...");
                return false;
            }
            // 存储格式
            var value = {
                name: name,
                cmdsStr: cmdsStr
            };
            GM_setValue(this._key(id), JSON.stringify(value));
            return true;
        },
        removeCmdGroup: function (id) {
            GM_deleteValue(this._key(id));
        },

        _prefix: "@cmdgroup",
        _key: function (id) {
            return this._prefix + id;
        },
        _id: function (key) {
            return parseInt(key.substring(this._prefix.length));
        }
    };

    var WorkflowConfigManager = {
        /**
         * @returns {{ id: number, name: string }[]}
         */
        getAll: function () {
            var result = [];
            GM_listValues().map(function (key) {
                if (WorkflowConfigManager._isMyKey(key)) {
                    var id = WorkflowConfigManager._id(key);
                    var name = WorkflowConfigManager.getName(id);
                    result.push({ id: id, name: name });
                }
            });
            return result;
        },
        getName: function (id) {
            var value = GM_getValue(this._key(id));
            if (value == null) return null;
            var obj = JSON.parse(value);
            return obj.name;
        },
        /**
         * @returns {{ id: number, repeat: number }[]}
         */
        getCmdGroupInfos: function (id) {
            var value = GM_getValue(this._key(id));
            if (value == null) return null;
            var obj = JSON.parse(value);
            return obj.infos;
        },
        /**
         * @returns {Workflow}
         */
        getWorkflow: function (id) {
            var cmdGroupInfos = this.getCmdGroupInfos(id);
            var items = [];
            for (const info of cmdGroupInfos) {
                var name = CmdGroupManager.getName(info.id);
                var cmds = CmdGroupManager.getCmds(info.id);
                var commandWorkflow = new CommandWorkflow(name, cmds, info.repeat);
                items.push(commandWorkflow);
            }
            var workflow = new Workflow(this.getName(id), items, 1);
            return workflow;
        },
        /**
         * @param {string} name
         * @param {{ id: string, repeat: number }[]} cmdGroupInfos
         */
        createWorkflowConfig: function (name, cmdGroupInfos) {
            var id = new Date().getTime();
            return this.updateWorkflowConfig(id, name, cmdGroupInfos);
        },
        /**
         * @param {number} id
         * @param {string} name
         * @param {{ id: string, repeat: number }[]} cmdGroupInfos
         */
        updateWorkflowConfig: function (id, name, cmdGroupInfos) {
            if (name == null || !/\S+/g.test(name)) {
                alert("工作流想要一个名字...");
                return false;
            }
            if (cmdGroupInfos == null || cmdGroupInfos.length <= 0) {
                alert("工作流不想没有任何内容...");
                return false;
            }
            // 存储格式
            var value = {
                name: name,
                infos: cmdGroupInfos
            };
            GM_setValue(this._key(id), JSON.stringify(value));
            return true;
        },
        removeWorkflowConfig: function (id) {
            GM_deleteValue(this._key(id));
        },

        _prefix: "workflow@",
        _isMyKey: function (key) {
            return key.indexOf(this._prefix + Role.id) == 0;
        },
        _key: function (id) {
            return this._prefix + Role.id + id;
        },
        _id: function (key) {
            return parseInt(key.substring((this._prefix + Role.id).length));
        }
    };

    const CodeTranslator = {
        run: function () {
            const oldFinder1 = this._getFinder("原命令组");
            if (oldFinder1) {
                WorkflowConfig.removeFinder(oldFinder1);
            }
            WorkflowConfig.createFinder("原命令组");
            const oldFinder2 = this._getFinder("原工作流程");
            if (oldFinder2) {
                WorkflowConfig.removeFinder(oldFinder2);
            }
            WorkflowConfig.createFinder("原工作流程");

            let allCmdGroup = CmdGroupManager.getAll();
            let allWorkflow = WorkflowConfigManager.getAll();
            const result = this._newSingleName(allCmdGroup, allWorkflow);
            allCmdGroup = result.group;
            allWorkflow = result.flow;

            allCmdGroup.forEach(g => {
                const cmdsText = CmdGroupManager.getCmdsText(g.id);
                const header = "    ";
                const cmdsTextHasHeader = this._appendHeader(header, cmdsText);
                const source = `($_i) = 0\n[while] (_i) < (arg0)\n${cmdsTextHasHeader}\n${header}($_i) = (_i) + 1`;
                WorkflowConfig.createWorkflow(g.name, source, "原命令组");
            });

            allWorkflow.forEach(f => {
                const infos = WorkflowConfigManager.getCmdGroupInfos(f.id);
                let source = "";
                infos.forEach(info => {
                    let cmdGroupName = null;
                    for (const cmdGroup of allCmdGroup) {
                        if (cmdGroup.id == info.id) {
                            cmdGroupName = cmdGroup.name;
                            break;
                        }
                    }
                    source += `@call ${cmdGroupName} ${info.repeat}\n`;
                });
                WorkflowConfig.createWorkflow(f.name, source, "原工作流程");
            });
        },
        _newSingleName: function (cmdGroups, workflows) {
            let allCmdGroup = this._singleName(cmdGroups);
            let allWorkflow = this._singleName(workflows);
            allCmdGroup.forEach(cmdGroup => {
                const name = cmdGroup.name;
                for (const flow of allWorkflow) {
                    if (flow.name == name) {
                        cmdGroup.name = `芫${name}`;
                        break;
                    }
                }
            });
            return { group: allCmdGroup, flow: allWorkflow };
        },
        _singleName: function (list) {
            for (const item of list) {
                item.name = item.name.replace(/[^_a-zA-Z0-9\u4e00-\u9fa5]/g, "");
            }
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                let name = item.name;
                let number = 1;
                for (let j = i + 1; j < list.length; j++) {
                    const item1 = list[j];
                    if (item1.name == name) {
                        item1.name = `${name}_${number}`;
                        number += 1;
                    }
                }
            }
            return list;
        },
        _getFinder: function (name) {
            let list = WorkflowConfig._rootList();
            const index = WorkflowConfig._findFinder(name, list);
            if (index == null) return null;
            return list[index];
        },
        _appendHeader: function (header, text) {
            let result = `\n${text}`;
            result = result.replace(/(\n)/g, `$1${header}`);
            result = result.replace(/\n\s*\n/g, "\n");
            result = result.replace(/^\s*\n/, "");
            // console.log(result);
            return result;
        }
    };

    //---------------------------------------------------------------------------
    //  2.1.x UI
    //---------------------------------------------------------------------------

    var WorkflowConfig = {
        rootFinderName: "根文件夹",
        rootFinderSortWay: function (value) {
            const key = "__WorkflowRootFinderSortWay";
            if (value == null) {
                return GM_getValue(key, "nameAsc");
            }
            GM_setValue(key, value);
        },
        finderList: function (finderName) {
            let result = [];
            if (finderName == this.rootFinderName) {
                result = this._rootList();
            } else {
                const list = this._rootList();
                const index = this._findFinder(finderName, list);
                if (index != null) {
                    const finder = list[index];
                    result = finder.flows;
                }
            }
            result.forEach(item => {
                if (item.type == "flow") {
                    item.finder = finderName;
                }
            });
            switch (this.rootFinderSortWay()) {
                case "updateDesc":
                    result.reverse();
                    break;
                case "nameAsc":
                    result.sort(function (a, b) {
                        return a.name.localeCompare(b.name);
                    });
                    break;
                case "nameDesc":
                    result.sort(function (a, b) {
                        return b.name.localeCompare(a.name);
                    });
                    break;
                case "updateAsc":
                default:
                    break;
            }
            return result;
        },
        createFinder: function (name, flows) {
            const result = this._checkName(null, name, true);
            if (result != true) return result;

            let list = this._rootList();
            const finder = { name: name, type: "finder", flows: flows ? flows : [] };
            list.push(finder);
            this._rootList(list);
            return true;
        },
        modifyFinder: function (finder, newName) {
            const result = this._checkName(finder.name, newName, true);
            if (result != true) return result;

            if (finder.name == newName) return true;

            this.removeFinder(finder);
            return this.createFinder(newName, finder.flows);
        },
        removeFinder: function (finder) {
            let list = this._rootList();
            const index = this._findFinder(finder.name, list);
            if (index == null) return;

            list.splice(index, 1);
            this._rootList(list);

            for (const flow of finder.flows) {
                FlowStore.remove(flow.name);
            }
        },
        createWorkflow: function (name, source, finderName) {
            const result = this._checkName(null, name, false);
            if (result != true) return result;

            const flow = { name: name, type: "flow" };
            let list = this._rootList();
            let success = false;
            if (finderName == this.rootFinderName) {
                list.push(flow);
                success = true;
            } else {
                const index = this._findFinder(finderName, list);
                if (index != null) {
                    const finder = list[index];
                    finder.flows.push(flow);
                    success = true;
                }
            }
            if (success) {
                FlowStore.save(name, source);
                this._rootList(list);
                return true;
            } else {
                return `未找到名为"${finderName}"的文件夹。`;
            }
        },
        modifyWorkflow: function (flow, newName, newSource, newFinderName) {
            const result = this._checkName(flow.name, newName, false);
            if (result != true) return result;

            if (flow.name != newName || flow.finder != newFinderName) {
                this.removeWorkflow(flow);
                return this.createWorkflow(newName, newSource, newFinderName);
            } else if (FlowStore.get(flow.name) != newSource) {
                FlowStore.save(flow.name, newSource);
            }
            return true;
        },
        removeWorkflow: function (flow) {
            let list = this._rootList();
            if (flow.finder == this.rootFinderName) {
                for (let i = 0; i < list.length; i++) {
                    const item = list[i];
                    if (item.type == "flow" && item.name == flow.name) {
                        list.splice(i, 1);
                        break;
                    }
                }
            } else {
                const index = this._findFinder(flow.finder, list);
                if (index != null) {
                    const finder = list[index];
                    const flows = finder.flows;
                    for (let k = 0; k < flows.length; k++) {
                        const flow1 = flows[k];
                        if (flow1.name == flow.name) {
                            flows.splice(k, 1);
                            break;
                        }
                    }
                }
            }
            this._rootList(list);

            FlowStore.remove(flow.name);
        },
        getFinderNames: function () {
            let result = [this.rootFinderName];
            let list = this._rootList();
            list.forEach(item => {
                if (item.type == "finder") {
                    result.push(item.name);
                }
            });
            return result;
        },
        _rootList: function (list) {
            const key = `WorkflowConfig_${Role.id}`;
            if (list != null) {
                GM_setValue(key, list);
            }
            return GM_getValue(key, []);
        },
        _checkName: function (oldName, name, isFinder) {
            if (name == oldName) return true;
            const itemName = isFinder ? "文件夹" : "工作流程";
            if (!/\S+/.test(name)) return `${itemName}的名称不能为空。`;
            if (name.indexOf(this.rootFinderName) != -1) return `${itemName}的名称中不能包含"${this.rootFinderName}"。`;
            if (!/^[_a-zA-Z0-9\u4e00-\u9fa5]+$/.test(name)) return `${itemName}的名称只能使用中文、英文和数字字符。`;
            let list = this._rootList();
            const type = isFinder ? "finder" : "flow";
            for (const item of list) {
                if (item.type == type && item.name == name) {
                    return `已经存在此名称的${itemName}。`;
                }
                if (item.type == "finder" && !isFinder) {
                    for (const flow of item.flows) {
                        if (flow.name == name) {
                            return `已经存在此名称的${itemName}。`;
                        }
                    }
                }
            }
            return true;
        },
        _findFinder: function (name, list) {
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.type == "finder" && item.name == name) {
                    return i;
                }
            }
            return null;
        }
    };

    var ManagedPerformerCenter = {
        start: function (name, source, log, callback) {
            const p = new Performer(name, source);
            p.log(log != null ? log : true);
            const key = `key${this._counter}`;
            this._counter += 1;
            this._performers[key] = p;
            p.start(_ => {
                delete ManagedPerformerCenter._performers[key];
                if (ManagedPerformerCenter.getAll().length == 0) {
                    // 【2026-08-11 修复】移除运行态 class（原 css border-color "inherit" 会覆盖不了 funny2 的墨绿描边，导致流程结束后按钮回不到原样）
                    $("#workflows-button").removeClass("raid-running");
                }
                if (callback) callback();
            });
            // 【2026-08-11】运行态改用 class（原直接设 border-color:#00FF00 亮绿刺眼且结束恢复不干净）
            $("#workflows-button").addClass("raid-running");
        },
        getAll: function () {
            return Object.values(this._performers);
        },
        _counter: 0,
        _performers: {}
    };

    // 【2026-08-11 加固】Vue 单实例管理：ContentModel 弹窗每次创建前销毁旧实例，防累积泄漏
    let _raidVue = null;

    const UI = {
        showToolbar: function () {
            if (!UI._toolbarHidden) return;
            UI._toolbarHidden = false;
            var raidToolbar = `
            <style>
                .raid-item{
                    display: inline-block;
                    border: solid 1px gray;
                    color: gray;
                    background-color: black;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 0.25em;
                    //min-width: 2.5em;
                    margin-right: 0em;
                    //margin-left: 0.4em;
                    position: relative;
                    padding-left: 0.2em;
                    padding-right: 0.3em;
                    line-height: 28px;
                }
            </style>
            <div id="raidToolbar">
                <div class="raidToolbar" style="width:calc(100% - 40px);margin:5px 0 5px 0">
                    <span class="raid-item hideRaidToolbar" style="width:15px"><hic>&#9660;</span>
                    <span class="raid-item forum"><hiy>快捷</hiy></span>
                    <span class="raid-item shortcut"><hiz>功能</hiz></span>
                    <span class="raid-item trigger"><hio>触发</hio></span>
                    <span class="raid-item customFlow" id="workflows-button"><hig>流程</hig></span>
                    <span class="raid-item moreRaid"><hic>副本</hic></span>
                    <span class="raid-item commandLine"><hir>命令</hir></span>
                    <span class="raid-item zmlztjk"><hip>自命令</hip></span>
                </div>
            </div>`
            $(".WG_log").before(raidToolbar);
            $(".customFlow").on('click', UI.workflows);
            $(".trigger").on('click', UI.trigger);
            $(".forum").on('click', UI.forum);
            $(".shortcut").on('click', UI.shortcut);
            $(".moreRaid").on('click', UI.dungeons);
            $(".commandLine").on('click', UI.commandLine);
            // 【2026-08-08 新增】"自命令"按钮：点击打开/关闭 自命令+自定义监控 面板（同右键菜单"自命令、自定义监控"）
            $(".zmlztjk").on('click', function () {
                if (unsafeWindow && unsafeWindow.WG && WG.zmlztjk) {
                    WG.zmlztjk();
                }
            });
            $(".hideRaidToolbar").on('click', UI.hideToolbar);
        },
        hideToolbar: function () {
            var toolbar = document.getElementById("raidToolbar");
            if (toolbar != null) {
                var items = toolbar.querySelectorAll(".raid-item:not(.hideRaidToolbar)");
                var isHidden = items.length > 0 && items[0].style.display === "none";

                if (isHidden) {
                    // Show toolbar items
                    for (var i = 0; i < items.length; i++) {
                        items[i].style.display = "inline-block";
                    }
                    UI._toolbarHidden = false;

                    // Update button symbol to ▼ (show state)
                    var buttons = toolbar.querySelectorAll(".hideRaidToolbar");
                    for (var j = 0; j < buttons.length; j++) {
                        buttons[j].innerHTML = "<hic>&#9660;";
                    }

                    // Show WG_log panel（【2026-08-11】不再联动右侧 WG_log_log：收起/展开只影响左侧）
                    if ($('.WG_log').css('display') == 'none') {
                        window.localStorage.setItem("closeBorad", "false");
                        $('.WG_log').show();
                    }
                } else {
                    // Hide toolbar items
                    for (var i = 0; i < items.length; i++) {
                        items[i].style.display = "none";
                    }
                    UI._toolbarHidden = true;

                    // Update button symbol to ▲ (hide state)
                    var buttons = toolbar.querySelectorAll(".hideRaidToolbar");
                    for (var j = 0; j < buttons.length; j++) {
                        buttons[j].innerHTML = "<hic>&#9650;";
                    }

                    // Hide WG_log panel（【2026-08-11】不再联动右侧 WG_log_log：收起/展开只影响左侧）
                    if ($('.WG_log').css('display') != 'none') {
                        window.localStorage.setItem("closeBorad", "true");
                        $('.WG_log').hide();
                    }
                }
            }
        },

        trigger: function () {
            if (unsafeWindow.TriggerUI == null) {
                const content = `
                <span class = "zdy-item install-trigger" style="width:120px"> 前往安装 </span>
                `;
                UI._appendHtml("🍟 <hio>触发器</hio>", content);
                $(document).off('click.wd-installtrigger').on('click.wd-installtrigger', '.install-trigger', function () {
                    window.open("https://greasyfork.org/zh-CN/scripts/378984", '_blank').location;
                });
            } else {
                unsafeWindow.TriggerUI.triggerHome();
            }
        },
        forum: function () {
            var content = `
            <span class="zdy-item extension-outMaze" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 走出桃花林</span>
            <span class="zdy-item extension-zhoubotong" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 找到周伯通</span>
            <span class="zdy-item extension-guzongmen" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 古宗门寻路</span>
            <span class="zdy-item extension-cihang" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 慈航七重门</span>
            <span class="zdy-item extension-zhanshendian" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 战神殿解谜 </span>
            <span class="zdy-item extension-sdyt" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 扫荡妖塔</span>
            <span class="zdy-item extension-yjyt" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 一键妖塔</span>
            <span class = "zdy-item extension-setting" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 参数设置 </span>
            <br><br>
            `;
            UI._appendHtml("🐟 <hiy>快捷扩展</hiy>", content);
            $(document).off('click.wd-extensionoutMaze').on('click.wd-extensionoutMaze', '.extension-outMaze', function () {
                WG.SendCmd('stopstate');
                THIsland.outMaze();
            });
            $(document).off('click.wd-extensionzhoubotong').on('click.wd-extensionzhoubotong', '.extension-zhoubotong', function () {
                WG.SendCmd('stopstate');
                THIsland.zhoubotong();
            });
            $(document).off('click.wd-extensioncihang').on('click.wd-extensioncihang', '.extension-cihang', function () {
                WG.SendCmd('stopstate');
                DungeonsShortcuts.extension_cihang();
            });
            $(document).off('click.wd-extensionzhanshendian').on('click.wd-extensionzhanshendian', '.extension-zhanshendian', function () {
                WG.SendCmd('stopstate');
                DungeonsShortcuts.extension_zhanshendian();
            });
            $(document).off('click.wd-extensionguzongmen').on('click.wd-extensionguzongmen', '.extension-guzongmen', function () {
                WG.SendCmd('stopstate');
                DungeonsShortcuts.extension_guzongmen();
            });
            $(document).off('click.wd-extensionsdyt').on('click.wd-extensionsdyt', '.extension-sdyt', function () {
                DungeonsShortcuts.extension_sdyt();
            });
            $(document).off('click.wd-extensionyjyt').on('click.wd-extensionyjyt', '.extension-yjyt', function () {
                DungeonsShortcuts.extension_yjyt();
            });
            $(document).off('click.wd-extensionsetting').on('click.wd-extensionsetting', '.extension-setting', function () {
                // 【2026-08-11 26.1.10】设置入口统一：优先打开插件设置弹窗（与右键菜单「设置」同一弹窗），妖塔参数流程作为回退
                if (window.WG && WG.setting) {
                    WG.setting();
                } else {
                    DungeonsShortcuts.extension_setting();
                }
            });
        },
        shortcut: function () {
            var content = `
            <span class = "zdy-item toolhtml" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 工具网页 </span>
            <span class = "zdy-item guideweb" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 攻略网站 </span>
            <span class = "zdy-item zdybtnset" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 自定义按钮 </span>
            <span class = "zdy-item cleandata" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 清空数据 </span>
            <span class = "zdy-item onekeydelaytest" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 延迟测试 </span>
            <span class = "zdy-item dsrw" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 定时任务 </span>
            <span class = "zdy-item uploadFlows" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 分享角色流程 </span>
            <span class = "zdy-item downloadFlows" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 拷贝角色流程 </span>
            <span class = "zdy-item uploadTriggers" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 分享角色触发 </span>
            <span class = "zdy-item downloadTriggers" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 拷贝角色触发 </span>
            <span class = "zdy-item importFlow" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 导入流程 </span>
            <span class = "zdy-item importTrigger" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 导入触发器 </span>
            <!--<span class = "zdy-item translateCode" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 流程转换修复 </span>-->
            <!--<span class = "zdy-item raidVersion" style="width: 120px; height: 30px; line-height: 30px; border-radius: 0.5em;"> 🏹 ${GM_info.script.version} </span>-->
            `
            UI._appendHtml("🍯 <hiz>插件功能</hiz>", content);
            $(document).off('click.wd-toolhtml').on('click.wd-toolhtml', '.toolhtml', function () {
                openExtensionHtml();
            });
            $(document).off('click.wd-guideweb').on('click.wd-guideweb', '.guideweb', function () {
                window.open("https://ucn595zz2fou.feishu.cn/wiki/JvEZw8bEiiIpf3kQiFJcAwbanji", "_blank");
            });
            $(document).off('click.wd-zdybtnset').on('click.wd-zdybtnset', '.zdybtnset', function () {
                WG.zdy_btnset();
            });
            $(document).off('click.wd-cleandata').on('click.wd-cleandata', '.cleandata', function () {
                WG.clean_data();
            });
            $(document).off('click.wd-onekeydelaytest').on('click.wd-onekeydelaytest', '.onekeydelaytest', function () {
                WG.wsdelaytest();
            });
            $(document).off('click.wd-dsrw').on('click.wd-dsrw', '.dsrw', function () {
                WG.dsj();
            });
            $(document).off('click.wd-uploadFlows').on('click.wd-uploadFlows', '.uploadFlows', _ => {
                Server.uploadFlows();
            });
            $(document).off('click.wd-downloadFlows').on('click.wd-downloadFlows', '.downloadFlows', _ => {
                layer.confirm('拷贝成功将会完全覆盖原有角色流程！', {
                    title: "<red>! 警告</red>",
                    btn: ['那还是算了', '好的继续'],
                    shift: 2,
                }, function (index) {
                    layer.close(index);
                }, function () {
                    layer.prompt({ title: '输入角色流程获取码', formType: 0, shift: 2 }, function (pass, index) {
                        layer.close(index);
                        Server.downloadFlows(pass);
                    });
                });
            });
            $(document).off('click.wd-uploadTriggers').on('click.wd-uploadTriggers', '.uploadTriggers', _ => {
                Server.uploadTriggers();
            });
            $(document).off('click.wd-downloadTriggers').on('click.wd-downloadTriggers', '.downloadTriggers', _ => {
                layer.confirm('拷贝成功将会完全覆盖原有角色触发器！', {
                    title: "<red>警告</red>",
                    btn: ['取消', '确认'],
                    shift: 2,
                }, function (index) {
                    layer.close(index);
                }, function () {
                    layer.prompt({ title: '输入角色触发获取码', formType: 0, shift: 2 }, function (pass, index) {
                        layer.close(index);
                        Server.downloadTriggers(pass);
                    });
                });
            });

            $(document).off('click.wd-importFlow').on('click.wd-importFlow', '.importFlow', _ => {
                let allFinder = WorkflowConfig.getFinderNames().join("|");
                let source = `
                #input ($token)=分享码,
                #select ($target)=目标文件夹,${allFinder},${WorkflowConfig.rootFinderName}
                #config
                @js Server.importFlow("(token)", "(target)");
                `
                const p = new Performer("导入流程", source);
                p.log(false);
                p.start();
            });

            $(document).off('click.wd-importTrigger').on('click.wd-importTrigger', '.importTrigger', _ => {
                let source = `
                #input ($token)=分享码,
                #config
                @js Server.importTrigger("(token)");
                `
                const p = new Performer("导入触发器", source);
                p.log(false);
                p.start();
            });

            $(document).off('click.wd-translateCode').on('click.wd-translateCode', '.translateCode', _ => {
                layer.prompt({ title: '客栈->流程讨论，阅读使用说明后操作', formType: 0, shift: 2 }, function (pass, index) {
                    if (pass == "我确认开始转换") {
                        layer.close(index);
                        CodeTranslator.run();
                    }
                });
            });

            $(document).off('click.wd-raidVersion').on('click.wd-raidVersion', '.raidVersion', _ => {
                Server.getNotice();
            });
        },
        dungeons: function () {
            UI._appendHtml("🍺 <hic>自动副本</hic>", "");
            const model = UI._dungeonsContentModel();
            UI._mountableDiv().appendChild(model.$el);
        },
        commandLine: function () {
            messageAppend("[命令提示] <hio>第一行输入“//”即可运行流程命令，第一行输入“#js”即可运行JavaScript</hio>");
            const lastrun = GM_getValue("_lastrun", "");
            const content = `
            <textarea id="cmdline-input" class="settingbox hide" style="display:inline-block;height:8rem;width:calc(100% - 4em);font-size:0.8em;font-family:'JetBrains Mono',monospace;margin:0 2em">${lastrun}</textarea>
            <div class="item-commands" style="text-align:center">
                <span class="cmdline-run" style="width:120px"><wht>运行</wht></span>
            </div>`;
            UI._appendHtml("<hir>命令</hir>", content);
            var input = $("#cmdline-input");
            input.focusout(function () {
                GM_setValue("_lastrun", input.val());
            });
            $(document).off('click.wd-cmdlinerun').on('click.wd-cmdlinerun', '.cmdline-run', function () {
                // 【2026-08-11 委托化】点击时直接取弹窗内输入框，不依赖外层闭包时序
                var text = $("#cmdline-input").val();
                if (!text) return;
                if (text.split("\n")[0].indexOf("//") >= 0) {
                    if (unsafeWindow && unsafeWindow.ToRaid) {
                        ToRaid.perform(text);
                    }
                } else if (text.split("\n")[0].indexOf("#js") >= 0) {
                    var jscode = text.split("\n");
                    jscode.baoremove(0);
                    eval(jscode.join(""));
                } else {
                    WG.SendCmd(text);
                }
            });
        },

        workflows: function () {
            if (ManagedPerformerCenter.getAll().length == 0) {
                UI.workflowsHome();
            } else {
                UI.runningFlows();
            }
        },
        workflowsHome: function () {
            // const leftText = `
            // <select style='width:80px' id="workflows-sort">
            //     <option value="updateAsc">更新时间升序</option>
            //     <option value="updateDesc">更新时间降序</option>
            //     <option value="nameAsc">名称升序</option>
            //     <option value="nameDesc">名称降序</option>
            // </select>
            // `
            const leftText = `<wht>运行中</wht>`;
            const rightText = `
            <select style='width:80px' id="workflows-opts">
                <option value="none">选择操作</option>
                <option value="createFinder">新建文件夹</option>
                <option value="createFlow">新建流程</option>
            </select>`
            // const getMoreFlows = function() {
            //     window.open("http://wsmud.bobcn.me:4567/category/2", '_blank').location;
            // };
            UI._appendHtml("🥗 <hig>工作流程</hig>", "", rightText, null, leftText, UI.runningFlows);
            $('#workflows-opts').val("none");
            $("#workflows-opts").change(function () {
                switch ($('#workflows-opts').val()) {
                    case "createFinder":
                        UI.createFinder();
                        break;
                    case "createFlow":
                        UI.createWorkflow(WorkflowConfig.rootFinderName);
                        break;
                    case "none":
                    default:
                        break;
                };
            });
            const model = UI._workflowContentModel(WorkflowConfig.finderList(WorkflowConfig.rootFinderName));
            UI._mountableDiv().appendChild(model.$el);
        },
        runningFlows: function () {
            UI._appendHtml("🥗 <hig>运行中流程</hig>", "", null, null, UI._backTitle, UI.workflowsHome);
            const model = UI._runningFlowsContentModel();
            UI._mountableDiv().appendChild(model.$el);
        },
        createFinder: function () {
            const content = `
            <div style="margin: 0 2em 5px 2em;text-align:center;width:calc(100% - 4em)">
                <label for="create-finder-name"> 名称:</label><input id ="create-finder-name" style='width:120px' type="text"  name="create-finder-name" value="">
            </div>`;
            const save = function () {
                const name = $("#create-finder-name").val();
                const result = WorkflowConfig.createFinder(name);
                if (result == true) {
                    UI._closeModal();
                    UI.workflowsHome();
                } else {
                    alert(result);
                }
            };
            UI._showModal("🥗 <hig>新建文件夹</hig>", content, "<wht>保存</wht>", save, UI._backTitle, function () { UI._closeModal(); UI.workflowsHome(); });
        },
        modifyFinder: function (finder) {
            const content = `
            <div style="margin: 0 2em 5px 2em;text-align:center;width:calc(100% - 4em)">
                <label for="modify-finder-name"> 名称:</label><input id ="modify-finder-name" style='width:120px' type="text"  name="modify-finder-name" value="">
            </div>`;
            const remove = function () {
                var verify = confirm("删除文件夹将删除其中的所有流程，确认删除吗？");
                if (verify) {
                    WorkflowConfig.removeFinder(finder);
                    UI._closeModal();
                    UI.workflowsHome();
                }
            };
            const back = function () {
                const name = $("#modify-finder-name").val();
                const result = WorkflowConfig.modifyFinder(finder, name);
                if (result != true) {
                    alert(result);
                    return;
                }
                UI._closeModal();
                UI.workflowsHome();
            };
            UI._showModal("🥗 <hig>修改文件夹</hig>", content, "删除", remove, UI._backSaveTitle, back);
            $('#modify-finder-name').val(finder.name);
        },
        openFinder: function (finderName) {
            if (finderName == WorkflowConfig.rootFinderName) {
                UI.workflowsHome();
                return;
            }
            const list = WorkflowConfig.finderList(finderName);
            UI._appendHtml(`<wht>📂 ${finderName}</wht>`, "", null, null, UI._backTitle, UI.workflowsHome);
            const model = UI._workflowContentModel(list);
            UI._mountableDiv().appendChild(model.$el);
        },
        createWorkflow: function (finderName) {
            const content = `
            <div style="margin: 0 2em 5px 2em;text-align:left;width:calc(100% - 4em)">
                <label for="create-flow-name"> 名称:</label><input id ="create-flow-name" style='width:120px' type="text"  name="create-flow-name" value="">
            </div>
            <textarea class = "settingbox hide" spellcheck="false" style = "height:20rem;display:inline-block;font-size:14px;line-height:1.5;width:calc(100% - 4em);font-family:'JetBrains Mono',monospace;" id = "create-flow-source"></textarea>`;
            // 【2026-08-12 终版：textarea 方案】语法高亮/行号已取消，最终 = textarea + Tab 缩进（黑底灰字 + spellcheck 关闭）
            const save = function () {
                const name = $("#create-flow-name").val();
                const source = $("#create-flow-source").val();
                const result = WorkflowConfig.createWorkflow(name, source, finderName);
                if (result == true) {
                    UI._closeModal();
                    UI.workflowsHome();
                } else {
                    alert(result);
                }
            };
            UI._showModal("🥗 <hig>新建流程</hig>", content, "<wht>保存</wht>", save, UI._backTitle, function () { UI._closeModal(); UI.workflowsHome(); });
            try {
                var _cfTa = document.getElementById('create-flow-source');
                if (_cfTa) {
                    enableTabIndent(_cfTa);
                    // 【2026-08-13 移植作者 26.2】语法高亮编辑器（@js 行走 JS 高亮）
                    try { createRaidEditor('create-flow-source', { height: '20rem' }); } catch (e2) { }
                }
            } catch (e) { }
        },
        modifyWorkflow: function (flow) {
            let options = "";
            WorkflowConfig.getFinderNames().forEach(finderName => {
                options += `<option value="${finderName}">${finderName}</option>`;
            });
            const content = `
            <div style="margin: 0 2em 5px 2em;text-align:left;width:calc(100% - 4em)">
                <label for="modify-flow-name"> 名称:</label><input id ="modify-flow-name" style='width:120px' type="text"  name="modify-flow-name" value="">
                <label for="modify-flow-finder">移动至</label><select id="modify-flow-finder">
                    ${options}
                </select>
            </div>
            <textarea class = "settingbox hide" spellcheck="false" style = "height:20rem;display:inline-block;font-size:14px;line-height:1.5;width:calc(100% - 4em);font-family:'JetBrains Mono',monospace;" id = "modify-flow-source"></textarea>
            <span class="raid-item shareFlow">分享此流程</span>`;
            const remove = function () {
                var verify = confirm("确认删除此工作流程吗？");
                if (verify) {
                    WorkflowConfig.removeWorkflow(flow);
                    UI._closeModal();
                    UI.workflowsHome();
                }
            };
            // 【2026-08-12 终版：textarea 方案】语法高亮/行号已取消，最终 = textarea + Tab 缩进
            const back = function () {
                const name = $("#modify-flow-name").val();
                const source = $("#modify-flow-source").val();
                const finderName = $("#modify-flow-finder").val();
                const result = WorkflowConfig.modifyWorkflow(flow, name, source, finderName);
                if (result != true) {
                    alert(result);
                    return;
                }
                UI._closeModal();
                UI.openFinder(finderName);
            };
            UI._showModal("🥗 <hig>修改流程</hig>", content, "删除", remove, UI._backSaveTitle, back);
            $("#modify-flow-name").val(flow.name);
            $("#modify-flow-finder").val(flow.finder);
            $("#modify-flow-source").val(FlowStore.get(flow.name) || "");
            try {
                var _mfTa2 = document.getElementById('modify-flow-source');
                if (_mfTa2) {
                    enableTabIndent(_mfTa2);
                    // 【2026-08-13 移植作者 26.2】语法高亮编辑器（@js 行走 JS 高亮）
                    try { createRaidEditor('modify-flow-source', { height: '20rem' }); } catch (e2) { }
                }
            } catch (e) { }
            $(".shareFlow").on('click', function () {
                const data = {
                    name: $("#modify-flow-name").val(),
                    source: $("#modify-flow-source").val()
                };
                UI._share("流程", data);
            });
        },

        _toolbarHidden: true,
        _backTitle: "<wht>< 返回</wht>",
        _backSaveTitle: "<wht>< 保存&返回</wht>",

        _appendHtml(title, content, rightText, rightAction, leftText, leftAction) {
            const finalLeftText = leftText == null ? "" : leftText;
            const finalRightText = rightText == null ? "" : rightText;
            var html = `
            <div class = "item-commands" style="text-align:center">
                <div style="margin-top:0.5em">
                    <div style="width:6em;float:left;text-align:left;padding:0 0 0 2em;height:1.23em" id="wsmud_raid_left">${finalLeftText}</div>
                    <div style="width:calc(100% - 16em);float:left;text-align:center;height:1.23em">${title}</div>
                    <div style="width:6em;float:right;text-align:right;padding:0 2em 0 0;height:1.23em" id="wsmud_raid_right">${finalRightText}</div>
                </div>
                <br><br>
                ${content}
            </div>`;
            // 【2026-08-08 按用户选择：方案A】Raid 弹窗内容仍写回日志区 .WG_log pre（原版行为），
            // 只把 Raid 工具栏搬到左侧（见 4258 行附近）。如以后想把弹窗也移左侧，改这里即可。
            Message.clean();
            Message.append(html, 2);
            $("#wsmud_raid_left").on('click', function () {
                if (leftAction) leftAction();
            });
            $("#wsmud_raid_right").on('click', function () {
                if (rightAction) rightAction();
            });
        },
        _closeModal: function () {
            // 【2026-08-11 加固】关闭弹窗时销毁 Vue 实例（防累积泄漏）
            if (_raidVue) { _raidVue.$destroy(); _raidVue = null; }
            var el = document.getElementById('raid-modal-overlay');
            if (el) el.remove();
        },
        _mountableDiv: function () {
            var wg_log = document.getElementsByClassName("WG_log")[0];
            var pre = wg_log.getElementsByTagName("pre")[0];
            var div = pre.getElementsByTagName("div")[0];
            return div;
        },
        _showModal: function (title, content, rightText, rightAction, leftText, leftAction) {
            UI._closeModal();
            var finalLeftText = leftText == null ? "" : leftText;
            var finalRightText = rightText == null ? "" : rightText;
            var overlay = document.createElement('div');
            overlay.id = 'raid-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
            var modal = document.createElement('div');
            // 【2026-08-11 适配游戏本身】黑底 + 游戏灰边框(#666666) + 游戏小圆角(4px)
            modal.style.cssText = 'background:#000000;border:1px solid var(--ext-border, #666666);border-radius:4px;padding:24px;width:80vw;height:75vh;max-width:95%;max-height:85vh;overflow:auto;position:relative;box-shadow:none;';
            var html = `
            <div class="item-commands" style="text-align:center">
                <div style="margin-top:0.5em">
                    <div style="width:12em;float:left;text-align:left;padding:0 0 0 2em;height:1.23em" id="wsmud_modal_left">${finalLeftText}</div>
                    <div style="width:calc(100% - 18em);float:left;text-align:center;height:1.23em">${title}</div>
                    <div style="width:6em;float:right;text-align:right;padding:0 2em 0 0;height:1.23em" id="wsmud_modal_right">${finalRightText}</div>
                </div>
                <br><br>
                ${content}
            </div>`;
            modal.insertAdjacentHTML('beforeend', html);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            var leftEl = document.getElementById('wsmud_modal_left');
            if (leftEl && leftAction) leftEl.onclick = function () { leftAction(); };
            var rightEl = document.getElementById('wsmud_modal_right');
            if (rightEl && rightAction) rightEl.onclick = function () { rightAction(); };
        },
        _workflowContentModel: function (items) {
            if (_raidVue) { _raidVue.$destroy(); _raidVue = null; }
            _raidVue = new Vue({
                el: '#WorkflowsContentModel',
                methods: {
                    createSpan: function (createElement, item) {
                        let style = {
                            width: "120px",
                            "background-color": "#12e4a0",
                            border: "solid 1px rgb(107, 255, 70)",
                            "border-radius": "0.5em",
                            color: "#000dd4",
                            padding: "10px 10px"
                        };
                        if (item.type == "finder") {
                            style = {
                                width: "120px",
                                "background-color": "#0359c3",
                                border: "solid 1px rgb(107, 203, 255)",
                                "border-radius": "0.5em",
                                color: "white",
                                padding: "10px 10px"
                            };
                        }
                        const properties = {
                            attrs: {class: "zdy-item"},
                            style: style
                        };
                        const play = function () {
                            if (item.type == "finder") {
                                UI.openFinder(item.name);
                            } else {
                                ManagedPerformerCenter.start(item.name, FlowStore.get(item.name));
                            }
                        };
                        const edit = function () {
                            if (item.type == "finder") {
                                UI.modifyFinder(item);
                            } else {
                                UI.modifyWorkflow(item);
                            }
                        };
                        const leftProperties = {
                            style: {
                                width: "30px",
                                float: "left",
                                "background-color": "#ffffff4f",
                                "border-radius": "4px"
                            },
                            on: {click: edit}
                        };
                        const leftNode = createElement("div", leftProperties, "⚙");
                        const mainProperties = {
                            attrs: {class: "breakText"},
                            style: {width: "85px", float: "right"},
                            on: {click: play}
                        };
                        const title = item.type == "finder" ? item.name : `▶️${item.name}`;
                        const mainNode = createElement("div", mainProperties, title);
                        return createElement("span", properties, [leftNode, mainNode]);
                    },
                },
                render: function (createElement) {
                    var self = this;
                    let flows = [];
                    let finders = [];
                    items.forEach(item => {
                        if (item.type == "finder") finders.push(self.createSpan(createElement, item));
                        if (item.type == "flow") flows.push(self.createSpan(createElement, item));
                    });
                    let nodes = [];
                    if (flows.length > 0) nodes.push(flows);
                    if (finders.length > 0) {
                        nodes.push(createElement("hr", {
                            style: {
                                "background-color": "gray",
                                height: "1px",
                                width: "calc(100% - 4em)",
                                border: "none"
                            }
                        }));
                        nodes.push(finders);
                    }
                    const style = createElement("style", ".breakText {word-break:keep-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}");
                    nodes.push(style);
                    return createElement(
                        "div",
                        {attrs: {class: "item-commands"}},
                        nodes
                    );
                }
            });
            return _raidVue;
        },
        _dungeonsContentModel: function () {
            if (_raidVue) { _raidVue.$destroy(); _raidVue = null; }
            _raidVue = new Vue({
                el: '#DungeonsContentModel',
                methods: {
                    getItems: function () {
                        return Dungeons;
                    },
                    createSpan: function (createElement, item) {
                        var properties = {
                            attrs: {class: "zdy-item"},
                            style: {
                                width: "120px",
                                height: "30px",
                                "line-height": "30px",
                                "border-radius": "0.5em"
                            },
                            on: {
                                click: function () {
                                    ManagedPerformerCenter.start(`自动副本-${item.name}`, GetDungeonSource(item.name));
                                }
                            },
                        };
                        return createElement('span', properties, item.desc != null ? item.desc : item.name);
                    },
                },
                render: function (createElement) {
                    var items = this.getItems();
                    var theSelf = this;
                    var spans = items.map(function (item) {
                        return theSelf.createSpan(createElement, item);
                    });
                    return createElement(
                        "div",
                        {attrs: {class: "item-commands"}},
                        spans
                    );
                }
            });
            return _raidVue;
        },
        _runningFlowsContentModel: function () {
            if (_raidVue) { _raidVue.$destroy(); _raidVue = null; }
            _raidVue = new Vue({
                el: '#WorkflowsContentModel',
                methods: {
                    createSpan: function (createElement, flow) {
                        let style = {
                            width: "120px",
                            "background-color": "#05b77d",
                            border: "solid 1px rgb(107, 255, 70)",
                            "border-radius": "0.5em",
                            color: "white",
                            padding: "10px 10px"
                        };
                        var properties = {
                            attrs: {class: "zdy-item"},
                            style: style
                        };
                        var stop = function () {
                            flow.stop();
                        };
                        var pause = function () {
                            if (flow.pausing()) {
                                flow.resume();
                            } else {
                                flow.pause();
                            }
                            UI.runningFlows();
                            if (flow.pausing()) {
                                Message.append(`<hiy>暂停执行，流程: ${flow.name()}...</hiy>`);
                            } else {
                                Message.append(`<hiy>恢复执行，流程: ${flow.name()}。</hiy>`);
                            }
                        };
                        const leftProperties = {
                            style: {
                                width: "30px",
                                float: "left",
                                "background-color": "#ffffff4f",
                                "border-radius": "4px"
                            },
                            on: {click: pause}
                        };
                        var leftNode = createElement("div", leftProperties, flow.pausing() ? "▶️" : "⏸");
                        var mainProperties = {
                            attrs: {class: "breakText"},
                            style: {width: "85px", float: "right"},
                            on: {click: stop}
                        };
                        const mainNode = createElement("div", mainProperties, `⏹${flow.name()}`);
                        return createElement("span", properties, [leftNode, mainNode]);
                    },
                },
                render: function (createElement) {
                    var items = ManagedPerformerCenter.getAll();
                    var theSelf = this;
                    var spans = items.map(function (item) {
                        return theSelf.createSpan(createElement, item);
                    });
                    const style = createElement("style", ".breakText {word-break:keep-all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}");
                    spans.push(style);
                    return createElement(
                        "div",
                        {attrs: {class: "item-commands"}},
                        spans
                    );
                }
            });
            return _raidVue;
        },

        _shareData: null,
        /**
         * @param {String} type 流程  触发
         * @param {Object} value
         */
        _share: function (type, value) {
            UI._shareData = value;
            let source = `
            [if] (__FormUserName) == null
                (__FormUserName) = (:name)
            #input ($__FormUserName)=当前角色名,(:name)
            #config
            ($__FormUserName)=(:name)
            ($password)=233
            @js Server.shareFlowTrigger("(__FormUserName)", "(password)", "${type}", UI._shareData);
            `
            const p = new Performer(`分享${type}`, source);
            p.log(false);
            p.start();
        }
    }

    /***********************************************************************************\
        TaoHua Island
    \***********************************************************************************/

    // 暂时保留给桃花岛解密用
    class AncientCmdExecuter {
        constructor(cmds, willStartExecute, didFinishExecute, willPerformCmd, didPerformCmd, interval) {
            this.cmds = cmds;
            this.willStartExecute = willStartExecute;
            this.didFinishExecute = didFinishExecute;
            this.willPerformCmd = willPerformCmd;
            this.didPerformCmd = didPerformCmd;
            this.interval = interval ? interval : 1000;
        }
        execute() {
            if (this.isWorking) return;
            this.isWorking = true;
            if (this.willStartExecute) this.willStartExecute();
            this._performCmd(0);
        }
        _performCmd(index) {
            if (index >= this.cmds.length) { this._finishExecute(); return; }
            if (!Role.isFree()) { this._delayPerformCmd(index); return; }
            var cmd = this.cmds[index];
            if (this.willPerformCmd) {
                var lastCmd = null;
                if (index > 0) lastCmd = this.cmds[index - 1];
                var valid = this.willPerformCmd(lastCmd, cmd);
                if (!valid) { this._delayPerformCmd(index); return; }
                cmd = valid;
            }
            // @开头，虚命令，不真正执行
            if (cmd.indexOf("@") == -1 && cmd.indexOf("kill?") == -1) WG.SendCmd(cmd);
            if (this.didPerformCmd) this.didPerformCmd(cmd);
            // [exit] 保留命令，立即退出执行器
            if (cmd.indexOf("[exit]") != -1) {
                this._finishExecute();
                return;
            }
            this._delayPerformCmd(index + 1);
        }
        _delayPerformCmd(index) {
            var executer = this;
            window.setTimeout(function () {
                executer._performCmd(index);
            }, executer.interval);
        }
        _finishExecute() {
            this.isWorking = false;
            WG.remove_hook(AncientCmdExecuter._hookIndex);
            if (this.didFinishExecute) this.didFinishExecute();
        }
    }

    const THIsland = {
        outMaze: function (callback) {
            if (!Role.atPath("taohua/haitan")) {
                Message.append("只有在 桃花岛的海滩 才能使用此虫洞。");
                return;
            }

            var cmds = [
                "go south",
                "@look 1",
                "@look 5"
            ];
            var willStartExecute = function () {
                THIsland._monitorMaze();
            };
            var didFinishExecute = function () {
                THIsland._cancelMonitorMaze();
                if (callback) callback();
            };
            var willPerformCmd = function (lastCmd, cmd) {
                if (cmd == "@look 1") {
                    if (THIsland._goCenterCmd) {
                        return THIsland._goCenterCmd;
                    } else {
                        return null;
                    }
                }
                if (cmd == "@look 5") {
                    if (THIsland._decodedMaze) {
                        return THIsland._outMazeCmd();
                    } else {
                        return null;
                    }
                }
                return cmd;
            };
            var executer = new AncientCmdExecuter(
                cmds,
                willStartExecute,
                didFinishExecute,
                willPerformCmd,
                undefined,
                1000
            );
            executer.execute();
        },
        zhoubotong: function (callback) {
            if (!Role.atPath("taohua/wofang")) {
                Message.append("只有在 蓉儿的卧室 才能使用此虫洞。");
                return;
            }

            var cmds = [
                "go south;go west;go west;go west;go north;go north;go north",
                "go west;go east;go west;go east;go west",
                "go south",
                "@look 1",
                "@look 5",
                "@go 2",
                "@go 3",
                "@go 4",
                "@go 6",
                "@go 7",
                "@go 8",
                "@end"
            ];
            var willStartExecute = function () {
                THIsland._monitorMaze();
                THIsland._exitsHookIndex = WG.add_hook("exits", function (data) {
                    if (THIsland._lastCoord == undefined || THIsland._lastCoord == [0, 0]) return;
                    if (Object.keys(data.items).length != 4) return;
                    for (var key in data.items) {
                        if (data.items[key] != "桃花林") return;
                    }
                    var normalExistMap = [
                        [["north", "northeast", "east"], ["east", "north", "south"], ["east", "south", "southeast"],],
                        [["east", "north", "west"], [], ["west", "east", "south"],],
                        [["west", "northwest", "north"], ["west", "south", "north"], ["west", "southwest", "south"],]
                    ];
                    var x = THIsland._lastCoord[0] + 1;
                    var y = THIsland._lastCoord[1] + 1;
                    var normalExists = normalExistMap[x][y];
                    for (var key2 in data.items) {
                        if (normalExists.indexOf(key2) != -1) continue;
                        THIsland._goCave = "go " + key2;
                        return;
                    }
                });
            };
            var didFinishExecute = function () {
                THIsland._lastCoord = undefined;
                THIsland._lastGo = undefined;
                THIsland._goCave = undefined;
                THIsland._cancelMonitorMaze();
                WG.remove_hook(THIsland._exitsHookIndex);
                if (callback) callback();
            };
            var willPerformCmd = function (lastCmd, cmd) {
                if (THIsland._goCave) return THIsland._goCave + ";go west;[exit]";

                var number = 0;
                switch (cmd) {
                    case "@look 1":
                        if (THIsland._goCenterCmd) {
                            return THIsland._goCenterCmd;
                        } else {
                            return null;
                        }
                        break;
                    case "@look 5":
                        if (!THIsland._decodedMaze) return null;
                        break;
                    case "@go 2":
                        THIsland._lastCoord = THIsland._mazeCoords[2];
                        THIsland._lastGo = THIsland._mazePath(THIsland._lastCoord);
                        return THIsland._lastGo;
                    case "@go 3": number = 3; break;
                    case "@go 4": number = 4; break;
                    case "@go 6": number = 6; break;
                    case "@go 7": number = 7; break;
                    case "@go 8": number = 8; break;
                }
                if (number != 0) {
                    var back = THIsland._mazeBackPath(THIsland._lastGo);
                    THIsland._lastCoord = THIsland._mazeCoords[number];
                    THIsland._lastGo = THIsland._mazePath(THIsland._lastCoord);
                    return back + ";" + THIsland._lastGo;
                }
                return cmd;
            };
            var executer = new AncientCmdExecuter(
                cmds,
                willStartExecute,
                didFinishExecute,
                willPerformCmd,
                undefined,
                1000
            );
            executer.execute();
        },

        _outMazeCmd: function () {
            var cmd = "";
            for (var i = 2; i <= 9; i++) {
                var coord = THIsland._mazeCoords[i];
                var go = THIsland._mazePath(coord);
                if (i == 9) {
                    cmd += go + ";" + go;
                } else {
                    cmd += go + ";" + THIsland._mazeBackPath(go) + ";";
                }
            }
            cmd += ";go south";
            return cmd;
        },
        _mazePath: function (coord) {
            var pathMap = [
                ["go southwest", "go west", "go northwest"],
                ["go south", "", "go north"],
                ["go southeast", "go east", "go northeast"]
            ];
            var x = coord[0] + 1;
            var y = coord[1] + 1;
            return pathMap[x][y];
        },
        _mazeBackPath: function (path) {
            var backMap = {
                "": "",
                "go southwest": "go northeast",
                "go west": "go east",
                "go northwest": "go southeast",
                "go south": "go north",
                "go north": "go south",
                "go southeast": "go northwest",
                "go east": "go west",
                "go northeast": "go southwest"
            };
            return backMap[path];
        },
        _monitorMaze: function () {
            THIsland._mazeCoords = [
                [2, 2], // unused
                [2, 2],
                [2, 2],
                [2, 2],
                [2, 2],
                [0, 0],
                [2, 2],
                [2, 2],
                [2, 2],
                [2, 2]
            ];
            THIsland._atFirst = false;
            THIsland._goCenterCmd = undefined;
            THIsland._decodedMaze = false;

            var index1 = WG.add_hook(["room", "exits"], function (data) {
                if (THIsland._goCenterCmd != undefined) return;

                if (data.type == "room") {
                    if (data.desc == undefined) return;
                    var patt = new RegExp("四周栽了大概有一棵桃树");
                    var result = patt.exec(data.desc);
                    if (result) THIsland._atFirst = true;
                } else if (data.type == "exits") {
                    if (data.items == undefined) return;
                    if (THIsland._atFirst) {
                        if (data.items.north && data.items.south) {
                            if (data.items.west) {
                                THIsland._mazeCoords[1] = [1, 0];
                                THIsland._goCenterCmd = "go west";
                            } else {
                                THIsland._mazeCoords[1] = [-1, 0];
                                THIsland._goCenterCmd = "go east";
                            }
                        } else if (data.items.west && data.items.east) {
                            if (data.items.north) {
                                THIsland._mazeCoords[1] = [0, -1];
                                THIsland._goCenterCmd = "go north";
                            } else {
                                THIsland._mazeCoords[1] = [0, 1];
                                THIsland._goCenterCmd = "go south";
                            }
                        }
                    }
                }
            });
            var index2 = WG.add_hook("room", function (data) {
                if (THIsland._decodedMaze) return;

                if (data.desc == undefined) return;
                var patt = new RegExp("能看到东南方向大概有.(?=棵桃树)");
                var count = patt.exec(data.desc);
                if (!count) return;
                var text = count.toString();
                switch (text.substring(text.length - 1)) {
                    case "二": THIsland._mazeCoords[2] = [1, -1]; break;
                    case "四": THIsland._mazeCoords[4] = [1, -1]; break;
                    case "六": THIsland._mazeCoords[6] = [1, -1]; break;
                    case "八": THIsland._mazeCoords[8] = [1, -1]; break;
                }

                THIsland._mazeCoords[9] = [-THIsland._mazeCoords[1][0], -THIsland._mazeCoords[1][1]];
                while (true) {
                    if (THIsland._mazeCoords[2][0] != 2) {
                        THIsland._mazeCoords[8] = [-THIsland._mazeCoords[2][0], -THIsland._mazeCoords[2][1]];
                    }
                    if (THIsland._mazeCoords[8][0] != 2) {
                        if (THIsland._mazeCoords[8][0] == THIsland._mazeCoords[1][0]) {
                            THIsland._mazeCoords[6] = [THIsland._mazeCoords[8][0], -THIsland._mazeCoords[8][1]];
                        } else {
                            THIsland._mazeCoords[6] = [-THIsland._mazeCoords[8][0], THIsland._mazeCoords[8][1]];
                        }
                    }
                    if (THIsland._mazeCoords[6][0] != 2) {
                        THIsland._mazeCoords[4] = [-THIsland._mazeCoords[6][0], -THIsland._mazeCoords[6][1]];
                    }
                    if (THIsland._mazeCoords[4][0] != 2) {
                        if (THIsland._mazeCoords[4][0] == THIsland._mazeCoords[9][0]) {
                            THIsland._mazeCoords[2] = [THIsland._mazeCoords[4][0], -THIsland._mazeCoords[4][1]];
                        } else {
                            THIsland._mazeCoords[2] = [-THIsland._mazeCoords[4][0], THIsland._mazeCoords[4][1]];
                        }
                    }
                    if (THIsland._mazeCoords[2][0] != 2 &&
                        THIsland._mazeCoords[4][0] != 2 &&
                        THIsland._mazeCoords[6][0] != 2 &&
                        THIsland._mazeCoords[8][0] != 2) {
                        break;
                    }
                }
                if (THIsland._mazeCoords[8][0] == THIsland._mazeCoords[4][0]) {
                    THIsland._mazeCoords[3] = [THIsland._mazeCoords[8][0], 0];
                } else {
                    THIsland._mazeCoords[3] = [0, THIsland._mazeCoords[8][1]];
                }
                THIsland._mazeCoords[7] = [-THIsland._mazeCoords[3][0], -THIsland._mazeCoords[3][1]];

                THIsland._decodedMaze = true;
            });
            THIsland._mazeHookIndexes = [index1, index2];
        },
        _cancelMonitorMaze: function () {
            for (var i = THIsland._mazeHookIndexes.length - 1; i >= 0; i--) {
                var index = THIsland._mazeHookIndexes[i];
                WG.remove_hook(index);
            }
        },
    };

    //---------------------------------------------------------------------------

    /* @taohualin 走出桃花林 */
    (function () {
        const executor = new AtCmdExecutor("taohualin", function (performer, param) {
            return new Promise(resolve => {
                THIsland.outMaze(resolve);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    /* @zhoubotong 找到周伯通 */
    (function () {
        const executor = new AtCmdExecutor("zhoubotong", function (performer, param) {
            return new Promise(resolve => {
                THIsland.zhoubotong(resolve);
            });
        });
        CmdExecuteCenter.addExecutor(executor);
    })();

    const DungeonsShortcuts = {
        extension_sdyt: function () {
            let source = `
                [if] (:room 副本区域,忧愁谷)==true || (:state)==推演 || (:state)==领悟
                @print <ord>当前状态无法进行一键咸鱼，自动停止！</ord>
                [exit]
                @print 🐟 一键咸鱼 => <hic>扫荡妖塔</hic>
                @print <hic>如果想自己静默式调用扫荡妖塔功能，请先设定变量扫荡次数 <hiy>SDYTnum</hiy> 和 单次消耗精力上限 <hiy>SDYTjlsx</hiy> 的值。</hic>
                [if] (SDYTjlsx) == 0 || (SDYTjlsx) == null || (SDYTjlsx) == undefined
                @js ($SDYTjlsx) = prompt("请输入单次消耗精力上限，超过后将自动停止：", "85");
                [if] (SDYTnum) == 0 || (SDYTnum) == null || (SDYTnum) == undefined
                @js ($SDYTnum) = prompt("请输入本轮扫荡次数，注意：单次消耗精力达到上限后将自动停止。","5")
                ($sdyt_num) = (SDYTnum)
                //($SDYTnum) = null
                [if] (sdyt_num) == 0 || (sdyt_num) == null || (sdyt_num) == undefined
                @print <ord>扫荡次数为0，取消扫荡。</ord>
                [exit]
                @print <hiy>计划扫荡(sdyt_num)次妖塔。</hiy>
                stopstate
                [if] (:room) != 古大陆-墓园
                $goyt
                @await 1500
                [if] (:room) != 古大陆-墓园
                @print <ord>无法前往古大陆，请重试或确定当前角色是否已解锁古大陆。</ord>
                $zdwk
                [exit]
                [if] {b扫荡符#}? < (sdyt_num) || {b扫荡符}? == null
                shop 0 (sdyt_num)
                ($num) = 0
                @cmdDelay 500
                ($ytWeek) = null
                [while] (num) < (sdyt_num)
                ss muyuan
                @tip 你即将消耗一个扫荡符，($jl_yt)精力快速完成一次弑妖塔|你即将消耗($jl_yt)精力快速完成一次弑妖塔|你尚未($ytJS)弑妖塔|你已达到($ytWeek)上限
                [if] (ytJS) != null
                    @print <hiy>妖塔未解锁，无法扫荡。</hiy>
                    [break]
                [if] (ytWeek) != null
                    @print <hiy>妖塔扫荡已达到本周上限。</hiy>
                    [break]
                [if] (jl_yt) > (SDYTjlsx) && (jl_yt) != null
                    @print <ord>单次扫荡精力超过(SDYTjlsx)，自动停止。</ord>
                    [break]
                [else]
                    saodang muyuan
                    @tip 你消耗一个扫荡符|精力快速完成弑妖塔|你的($lack)不够|你已达到($ytWeek)上限
                    [if] (ytWeek) != null
                    @print <hiy>妖塔扫荡已达到本周上限。</hiy>
                    [break]
                    [if] (lack) != null
                    @print <ord>(lack)不足，自动停止扫荡妖塔。</ord>
                    [break]
                ($num) = (num) + 1
                @await 1000
                $zdwk
            `
            const p = new Performer("扫荡妖塔", source);
            p.log(false);
            p.start();
        },
        extension_yjyt: async function () {
            let source = `
                jh fam 9 start;go enter;go up;
                @await 1000;
                ggdl {r疯癫的老头}?;
                go north[4];
                @await 250;
                go north[2];look shi;tiao1 shi;tiao3 shi;
                @await 250;
                tiao1 shi;tiao3 shi;tiao2 shi;go north;"
            `
            const p = new Performer("一键妖塔", source);
            p.log(false);
            p.start();
           },
        extension_setting: function () {
            let source = `
                [(SDYTjlsx)==null]($SDYTjlsx)=85
                [(SDYTnum)==null]($SDYTnum)=5
                @print 🐟 一键咸鱼 => <hic>参数设置</hic>
                #input ($SDYTjlsx)=<hiz>一键设置各种常用流程（陆续更新添加）参数</hiz><br/>&nbsp*&nbsp<ord>🐉 扫荡妖塔</ord> 参数<br/>&nbsp*&nbsp妖塔单次消耗精力上限,(SDYTjlsx)
                #input ($SDYTnum)=每轮妖塔扫荡次数,(SDYTnum)
                #config
                @print 已完成参数设置
            `
            const p = new Performer("参数设置", source);
            p.log(false);
            p.start();
        },
        extension_cihang: function () {
            let source = `
[if] (:room 慈航静斋) == false
    @print <hiy>请先进入慈航副本再运行。</hiy>
    [exit]
[else]
    [if] (:room) != 慈航静斋-山门(副本区域) && (:room) != 慈航静斋-帝踏峰(副本区域)
        @print <hiy>请在山门或帝踏峰运行。</hiy>
        [exit]
($go) = 'east','west','south','north'
($qiku) = '老','病','死','爱别离','怨憎会','求不得'
($num1) = 0
[if] (:room) == 慈航静斋-山门(副本区域)
    go south
[else if] (:room) == 慈航静斋-帝踏峰(副本区域)
    go south[2]
@print <hiy>开始自动寻路，寻路期间请勿点击地图……</hiy>
@cmdDelay 500
[while] (num1) < 6
    @js ($ku) = [(qiku)][(num1)]
    ($num2) = 0
    [while] true
        [if] (map) != null && (retry) == true
            (map)
            @await 500
        @js ($fx) = [(go)][(num2)]
        [if] (fx) == null
            @print <hiy>自动寻路失败，请回到山门重新运行！</hiy>
            [exit]
        go (fx)
        [if] (:room) == 慈航静斋-七重门(副本区域)
            @js ($ku_now) = $(".room_desc").text().match("，是名([^%]+)苦。")[1]
            [if] (ku) != (ku_now)
                [while] true
                    go west
                    [if] (:room) == 慈航静斋-七重门(副本区域)
                        @js ($dir_gc) = $("text:contains('广场')").attr("dir")
                    [if] (dir_gc) == south
                        go south
                    @await 200
                    [if] (:room) == 慈航静斋-山门(副本区域)
                        [break]
                    [else if] (:room) == 慈航静斋-广场(副本区域)
                        @print <hiy>已走出七重门！</hiy>
                        [exit]
                go south
                ($num2) = (num2) + 1
                ($retry) = true
            [else]
                [if] (map) == null
                    ($map) = go (fx)
                [else]
                    ($map) = (map);go (fx)
                ($retry) = false
                [break]
        [else if] (:room) == 慈航静斋-广场(副本区域)
            @print <hiy>已走出七重门！</hiy>
            [exit]
    ($num1) = (num1) + 1
go south
[if] (:room) == 慈航静斋-广场(副本区域)
    @print <hiy>已走出七重门！</hiy>
            `
            const p = new Performer("慈航七重门", source);
            p.log(false);
            p.start();
        },
        extension_zhanshendian: function () {
            let source = `[if] (:room 战神殿) == false
    @print <hiy>请先进入战神殿副本再运行。</hiy>
    [exit]
[if] (:room) != 战神殿-左雁翼(副本区域)
    @print <hiy>请先手动向左走到左雁翼。</hiy>
@until (:room) == 战神殿-左雁翼(副本区域)
look shi
@tip 和外面星空星宿位置一一对应，($star_0)，($star_1)，($star_2)，($star_3)，($star_4)，($star_5)，($star_6)，($star_7)这些星宿依次闪烁
($stars) = "(star_0)","(star_1)","(star_2)","(star_3)","(star_4)","(star_5)","(star_6)","(star_7)"
($dirs) = {"star":"角亢室","dir":1,"eswn":"东北↗︎","go":"northeast"},{"star":"氏房心","dir":0,"eswn":"东→","go":"east"},{"star":"尾箕轸","dir":2,"eswn":"东南↘︎","go":"southeast"},{"star":"井鬼参","dir":4,"eswn":"西南↙︎","go":"southwest"},{"star":"柳星张翼","dir":3,"eswn":"南↓","go":"south"},{"star":"奎娄斗牛","dir":6,"eswn":"西北↖︎","go":"northwest"},{"star":"胃昴毕觜","dir":5,"eswn":"西←","go":"west"},{"star":"女虚危壁","dir":7,"eswn":"北↑","go":"north"}
@cmdDelay 100
($num_1) = 0
[while] (num_1) < 8
    @js ($star) = [(stars)][(num_1)]
    ($num_2) = 0
    [while] (num_2) < 28
        ($dir) = null
        @js ($dir) = var d=[(dirs)];var s=d[(num_2)]["star"].indexOf("(star)");if(s>=0){d[(num_2)]["dir"]}
        [if] (dir) != null
            [break]
        ($num_2) = (num_2) + 1
    push (dir)
    ($num_1) = (num_1) + 1
look shi
@tip 殿顶的星图依旧，却仅剩一颗($last)宿星孤零零的闪烁着
($num_3) = 0
[while] (num_3) < 28
    ($dir_l) = null
    ($go_l) = null
    @js ($dir_l) = var d=[(dirs)];var s=d[(num_3)]["star"].indexOf("(last)");if(s>=0){d[(num_3)]["eswn"]}
    @js ($go_l) = var d=[(dirs)];var s=d[(num_3)]["star"].indexOf("(last)");if(s>=0){d[(num_3)]["go"]}
    [if] (dir_l) != null && (go_l) != null
        [break]
    ($num_3) = (num_3) + 1
@print <hiy>(last)宿，最后一个方位是【(dir_l)】</hiy>
tm (last)宿，最后一个方位是【(dir_l)】60秒倒计时已开始，请抓紧开打。
@print <ord>打完右雁翼最后一波守卫后会自动进秘道【(go_l)】</ord>
@until (:room) == 战神殿-右雁翼(副本区域) || (:room 副本区域) == false
@until (:combating) == true || (:room 副本区域) == false
@until (:combating) == false || (:room 副本区域) == false
[if] (:room 副本区域) == false
    [exit]
[while] (:room) == 战神殿-右雁翼(副本区域) && (:living) == true
    go (go_l);$wait 100
            \`
            const p = new Performer("战神殿解谜", source);
            p.log(false);
            p.start();
        },
        extension_guzongmen: function () {
            let source = \`
@print <hiy>如果寻路一直失败，请检查设置中<ord>【切换房间时不清空上房间信息】</ord>是否开启。</hiy>
[if] (:room 副本区域,忧愁谷) == true
    @print <ord>当前处于副本中，无法寻路！</ord>
    [exit]
@cmdDelay 500
stopstate
jh fam 9 start
go enter
go up
@tip 打败我，你就($pass)上去|聚魂成功|踏过长生门|你已堪破生死|古老的大陆寻找真相|你连($pass)都没聚合|你想($pass)为神吗
[if] (pass) != null
    @print <ord>不符合前往古大陆要求，流程终止。</ord>
    [exit]
ggdl {r疯癫的老头}
go north[3]
go north[3]
look shi
tiao1 shi;tiao1 shi;tiao2 shi
@until (:room) == 古大陆-断山
@js ($ylfx) = $(".room_desc").text().match(/[东南西北]，/g)
@js ($ylfx) = var f="(ylfx)";f.replace(/，/g,"")
@js ($ylfx) = var f="(ylfx)";f.replace(/东/g,"west")
@js ($ylfx) = var f="(ylfx)";f.replace(/西/g,"east")
@js ($ylfx) = var f="(ylfx)";f.replace(/南/g,"north")
@js ($ylfx) = var f="(ylfx)";f.replace(/北/g,"south")
@js ($ylfx) = var f="(ylfx)";f.replace(/,/g,"','")
@js ($ylfx) = var f=['(ylfx)'];f.reverse()
@js ($ylfx) = var f="(ylfx)";f.replace(/,/g,"','")
@js ($ylfx) = "'"+"(ylfx)"+"'"
@js ($fl) = [(ylfx)].length
go down
go south[3]
go south[2]
go west
($go) = 'east','west','south','north'
($num) = 0
[while] (num) < 4
    @await 500
    @js $(".content-message pre").html("");
    @await 500
    @js ($fx1) = [(go)][(num)]
    go (fx1)
    @js ($lost) = $(".content-message").text().match("你似乎迷路了")
    [if] (lost) != null
        go south[3]
        go south[3]
        go west
        ($num) = (num) + 1
    [else]
        [break]
[if] (fl) == 5
    ($num) = 0
    [while] (num) < 5
        @js ($fx) = [(ylfx)][(num)]
        go (fx)
        ($num) = (num) + 1
[else if] (fl) == 4
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    @js ($fx4) = [(ylfx)][2]
    @js ($fx5) = [(ylfx)][3]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx4);go (fx5);go (fx5)"},{"lx":"go (fx2);go (fx3);go (fx4);go (fx4);go (fx5)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx4);go (fx5)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx4);go (fx5)"}
[else if] (fl) == 3
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    @js ($fx4) = [(ylfx)][2]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx4);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx3);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx3);go (fx4)"},{"lx":"go (fx2);go (fx3);go (fx3);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx4);go (fx4)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx3);go (fx4)"}
[else if] (fl) == 2
    @js ($fx2) = [(ylfx)][0]
    @js ($fx3) = [(ylfx)][1]
    ($lxjh) = {"lx":"go (fx2);go (fx3);go (fx3);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx3);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx3);go (fx3)"},{"lx":"go (fx2);go (fx2);go (fx2);go (fx2);go (fx3)"}
[else if] (fl) == 1
    @js ($fx2) = [(ylfx)][0]
    ($lxjh) = {"lx":"go (fx2);go (fx2);go (fx2);go (fx2);go (fx2)"}
[if] (fl) < 5
    @js ($fxlen) = [(lxjh)].length
    ($num) = 0
    [while] (num) < (fxlen)
        @js ($map) = var f=[(lxjh)];f[(num)]["lx"]
        (map)
        [if] (:room) != 古大陆-药林
            [while] (:room) != 古大陆-平原
                go south
                @await 350
            go north;go west
            go (fx1)
            ($num) = (num) + 1
        [else]
            [break]
tiao bush
[if] (:room) == 古大陆-山脚
    @print <ord>古宗门自动寻路已完成！</ord>
[else]
    @print <ord>寻路失败，请重新运行或换个时间。</ord>
            `
            const p = new Performer("古宗门寻路", source);
            p.log(false);
            p.start();
        },
    };

    // Dungeons 数据已移至 ws-js/features/raid-dungeons.js
    // 通过 unsafeWindow.__raidDungeons 加载
    /***********************************************************************************\
        Ready
    \***********************************************************************************/

    const ToRaid = {
        menu: UI.showToolbar,

        perform: function (content, name, log) {
            const realName = name ? name : "第三方调用";
            ManagedPerformerCenter.start(realName, content, log);
        },

        existAutoDungeon: function (params) {
            return AutoDungeonName(params) != null;
        },

        shareTrigger: function (triggerData) {
            UI._share("触发", triggerData);
        }
    };

    $(document).ready(function () {
        __init__();
        if (WG == undefined || WG == null) {
            setTimeout(__init__, 300);
        }
    });

    function __init__() {
        WG = unsafeWindow.WG;
        if (WG == undefined || WG == null) {
            setTimeout(() => { __init__() }, 300);
            return;
        }
        messageAppend = unsafeWindow.messageAppend;
        messageClear = unsafeWindow.messageClear;
        TaskHelper = unsafeWindow.TaskHelper;
        LayerHelper = unsafeWindow.LayerHelper;

        unsafeWindow.ToRaid = ToRaid;
        unsafeWindow.Role = Role;

        Role.init();
        Room.init();
        SystemTips.init();
        MsgTips.init();
        DialogList.init();
        TaskList.init();
        EventList.init();
        Xiangyang.init();
    }
})();
