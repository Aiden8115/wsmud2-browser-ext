// ============================================================
// utils.js —— 通用小工具函数
// ------------------------------------------------------------
// 四个函数：
//   NotSound()        播放"完成提示音"（挖矿完、任务完成时的"叮"一声）
//   getJLGrade(eq)    根据装备名字里的 ★/☆ 算出精炼等级
//   openExtensionHtml()  打开扩展自带的"综合工具网页版"
//   enableTabIndent()  给代码框（流程/触发编辑器）加 Tab 缩进 + 黑底灰字样式
// ============================================================

/**
 * 播放完成提示音（一个短音效 complete.mp3）。
 * 第一次调用时，会通过自己的 <script> 标签 src 反推出扩展 ID，
 * 拼出音频文件的完整地址，然后造一个 <audio> 元素并复用。
 */
function NotSound() {
    let audioElement = document.getElementById('beep');   // 找之前造好的音频元素
    if (!audioElement) {
        // 还没造过 → 先找到自己这个脚本的标签（src 里含 ws-js/core/utils.js 的那个）
        const scriptTag = document.querySelector(`script[src*="ws-js/core/utils.js"]`);
        if (!scriptTag) {
            console.error('Beep1 Error: Cannot find the extension script tag.');
            return;
        }
        // 脚本地址形如 chrome-extension://扩展ID/ws-js/core/utils.js
        // 把 hostname（就是扩展 ID）拿出来拼音频地址
        const extensionId = new URL(scriptTag.src).hostname;

        audioElement = document.createElement('audio');
        audioElement.id = 'beep';
        audioElement.preload = 'auto';   // 提前加载好，播的时候不卡
        audioElement.src = `chrome-extension://${extensionId}/ws-data/complete.mp3`;
        document.body.appendChild(audioElement);
    }
    audioElement.currentTime = 0;  // 从头播（连点也不怕，重头放）
    audioElement.play();
}

/**
 * 根据装备字符串中的 ★ 和 ☆ 计算精炼等级。
 * ★ = 2 点，☆ = 1 点。例如 "青锋剑★★☆" → 2+2+1 = 5 级
 * 输入：eq（装备描述字符串）  输出：精炼等级数字
 */
function getJLGrade(eq) {
    const starCount = (eq.match(/★/g) || []).length;       // 数有几个实心星
    const halfStarCount = (eq.match(/☆/g) || []).length;   // 数有几个空心星
    return starCount * 2 + halfStarCount;
}

/**
 * 通过 postMessage 请求 content script 在新标签页打开扩展内置 HTML 工具页面。
 * （content.js 里监听这个消息 → 转发给 background.js → 新开标签页）
 */
function openExtensionHtml() {
    window.postMessage({ __EXT_BRIDGE__: true, action: 'openHtmlFile' }, '*');
}

/**
 * 【2026-08-11 代码框编辑增强】给 textarea 加编程习惯的按键行为：
 *   - Tab：光标处插入 4 空格缩进；有选中时整块加缩进（每行前 4 空格）
 *   - Shift+Tab：对选区覆盖的所有行做反缩进（去掉前导 tab 或 1-4 空格）
 *   - 兼容 Vue v-model：改值后派发 input 事件让 Vue 同步（Trigger 编辑器用 v-model）
 * 输入：el（textarea DOM 元素）
 */
function enableTabIndent(el) {
    if (!el) return;
    if (el.__tabIndent) return;   // 防重复绑定（同一元素多次调用只绑一次）
    el.__tabIndent = true;
    // 【2026-08-12 全绿修复】textarea 文字颜色被游戏全局 CSS 覆盖（游戏日志默认绿色），
    // 用 inline !important（最高优先级）强制代码框为黑底灰字——三个编辑器统一生效
    try {
        el.style.setProperty('color', '#c0c0c0', 'important');
        el.style.setProperty('background', '#000000', 'important');
        el.style.setProperty('font-family', "'JetBrains Mono', Consolas, monospace", 'important');
        el.style.setProperty('font-size', '14px', 'important');
        el.style.setProperty('line-height', '1.5', 'important');
        el.style.setProperty('text-align', 'left', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '4px', 'important');
        el.style.setProperty('border', '1px solid #666666', 'important');
        el.style.setProperty('caret-color', '#c0c0c0', 'important');
    } catch (e) { }
    var IND = '    ';
    el.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        var s = this.selectionStart, en = this.selectionEnd, v = this.value;
        if (e.shiftKey) {
            // 反缩进：选区所在的所有行，每行去掉前导缩进（tab 或 1-4 空格）
            var ls = v.lastIndexOf('\n', s - 1) + 1;
            var le = v.indexOf('\n', en);
            if (le === -1) le = v.length;
            var lines = v.slice(ls, le).split('\n');
            for (var i = 0; i < lines.length; i++) {
                var m = lines[i].match(/^(\t| {1,4})/);
                if (m) lines[i] = lines[i].slice(m[0].length);
            }
            this.value = v.slice(0, ls) + lines.join('\n') + v.slice(le);
            this.selectionStart = s;
            this.selectionEnd = en;
        } else if (s === en) {
            // 无选中：光标处插入缩进
            this.value = v.slice(0, s) + IND + v.slice(en);
            this.selectionStart = this.selectionEnd = s + IND.length;
        } else {
            // 块缩进：选中所有行每行加缩进
            var sel = v.slice(s, en);
            var firstIsLineStart = s === 0 || v[s - 1] === '\n';
            var newSel = (firstIsLineStart ? IND : '') + sel.replace(/\n/g, '\n' + IND);
            this.value = v.slice(0, s) + newSel + v.slice(en);
            this.selectionStart = s;
            this.selectionEnd = s + newSel.length;
        }
        // 兼容 Vue v-model（Trigger 编辑器）：派发 input 事件让 Vue 同步
        try { this.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) { }
    });
}

/**
 * 【2026-08-13 移植作者 26.2】流程/触发代码编辑器（textarea overlay 语法高亮，@js 行专用 JS 着色）
 * 关键点：
 *   - 两层（高亮 pre / 输入 textarea）padding/font-size/line-height/box-sizing 逐项一致（全内联样式，游戏 CSS 压不到）
 *   - pre 用 white-space:pre-wrap（textarea 默认软换行）→ 两层折行点一致，逐字对齐
 *   - @js 开头行：@js 标记蓝色 + 剩余部分用 JS 语法高亮（关键字粉色/模板字符串等）
 */

// 流程脚本语法着色色板（10 类 token，26.2 新增 jsKeyword）
const RaidScriptColors = {
    comment: '#9e9e9e',
    varColon: '#fff176',
    varNormal: '#4dd0e1',
    cmd: '#4fc3f7',
    dir: '#81c784',
    ctrl: '#ffb74d',
    str: '#ef9a9a',
    operator: '#ce93d8',
    number: '#a5d6a7',
    jsKeyword: '#f48fb1'
};

/**
 * JS 代码高亮（@js 行剩余部分用）：注释/字符串/模板字符串/数字/JS 关键字
 * @param {string} code 已 HTML 转义的 JS 源码
 * @returns {string} 含高亮 span 的 HTML
 */
function highlightJavaScript(code) {
    return code.replace(
        /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:var|let|const|function|if|else|for|while|do|switch|case|break|continue|return|new|this|typeof|instanceof|try|catch|finally|throw|async|await|class|import|export|default|from|true|false|null|undefined|in|of|delete|void|with|yield)\b)/g,
        function (match, comment, strDouble, strSingle, strTemplate, number, keyword) {
            if (comment) return '<span style="color:' + RaidScriptColors.comment + '">' + comment + '</span>';
            if (strDouble) return '<span style="color:' + RaidScriptColors.str + '">' + strDouble + '</span>';
            if (strSingle) return '<span style="color:' + RaidScriptColors.str + '">' + strSingle + '</span>';
            if (strTemplate) return '<span style="color:' + RaidScriptColors.str + '">' + strTemplate + '</span>';
            if (number) return '<span style="color:' + RaidScriptColors.number + '">' + number + '</span>';
            if (keyword) return '<span style="color:' + RaidScriptColors.jsKeyword + '">' + keyword + '</span>';
            return match;
        }
    );
}

/**
 * 流程脚本源码 → 带色 span 的 HTML（逐行处理：@js 行走 JS 高亮，普通行走流程高亮）
 * @param {string} code 原始源码
 * @returns {string} 含高亮 span 的 HTML
 */
function highlightRaidSyntax(code) {
    var escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 逐行处理：@js 开头行 → 剩余部分 JS 高亮；普通行 → 流程高亮
    return escaped.split('\n').map(function (line) {
        var jsMatch = line.match(/^(\s*@js\s?)(.*)$/);
        if (jsMatch) {
            var prefix = jsMatch[1].replace(/@js/, '<span style="color:' + RaidScriptColors.cmd + '">@js</span>');
            return prefix + highlightJavaScript(jsMatch[2]);
        }
        // 普通行：注释 | (:条件) | ($变量) | @执行 | #指令 | [文本] | "字符串" | '字符串' | 数字 | 运算符
        return line.replace(
            /(\/\/[^\n]*)|(\(:\w+\))|(\(\$\w+\))|(@\w+)|(#\w+)|(\[[\w\u4e00-\u9fa5\s]+\])|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(==|!=|>=|<=|&&|\|\|)/g,
            function (match, comment, varColon, varDollar, cmd, dir, ctrl, strDouble, strSingle, number, operator) {
                if (comment) return '<span style="color:' + RaidScriptColors.comment + '">' + comment + '</span>';
                if (varColon) return '<span style="color:' + RaidScriptColors.varColon + '">' + varColon + '</span>';
                if (varDollar) return '<span style="color:' + RaidScriptColors.varNormal + '">' + varDollar + '</span>';
                if (cmd) return '<span style="color:' + RaidScriptColors.cmd + '">' + cmd + '</span>';
                if (dir) return '<span style="color:' + RaidScriptColors.dir + '">' + dir + '</span>';
                if (ctrl) return '<span style="color:' + RaidScriptColors.ctrl + '">' + ctrl + '</span>';
                if (strDouble) return '<span style="color:' + RaidScriptColors.str + '">' + strDouble + '</span>';
                if (strSingle) return '<span style="color:' + RaidScriptColors.str + '">' + strSingle + '</span>';
                if (number) return '<span style="color:' + RaidScriptColors.number + '">' + number + '</span>';
                if (operator) return '<span style="color:' + RaidScriptColors.operator + '">' + operator + '</span>';
                return match;
            }
        );
    }).join('\n');
}

//  Raid Script Autocomplete Dictionary
//---------------------------------------------------------------------------

var RaidAutoComplete = {
    // @commands (sorted by name)
    cmds: [
        { label: "@await", detail: "await ms - 等待(异步)", insert: "@await " },
        { label: "@beep", detail: "beep - 蜂鸣提示", insert: "@beep" },
        { label: "@call", detail: "call name args - 调用子流程", insert: "@call " },
        { label: "@cd", detail: "cd item - 等待物品CD", insert: "@cd " },
        { label: "@cleanBag", detail: "cleanBag - 整理背包", insert: "@cleanBag" },
        { label: "@cmdDelay", detail: "cmdDelay ms - 命令延迟", insert: "@cmdDelay " },
        { label: "@dazuo", detail: "dazuo - 打坐至满", insert: "@dazuo" },
        { label: "@debug", detail: "debug text - 调试输出", insert: "@debug " },
        { label: "@dialog", detail: "dialog name - 等待对话框", insert: "@dialog " },
        { label: "@eq", detail: "eq item - 装备物品", insert: "@eq " },
        { label: "@events", detail: "events text - 等待事件消息", insert: "@events " },
        { label: "@exit", detail: "exit - 退出", insert: "@exit" },
        { label: "@fb", detail: "fb name diff - 自动副本", insert: "@fb " },
        { label: "@force", detail: "force cmd - 强制发送命令", insert: "@force " },
        { label: "@js", detail: "js code - 执行JavaScript", insert: "@js " },
        { label: "@kill", detail: "kill entity - 叫杀", insert: "@kill " },
        { label: "@liaoshang", detail: "liaoshang - 疗伤至满", insert: "@liaoshang" },
        { label: "@msgtip", detail: "msgtip text - 等待消息提示", insert: "@msgtip " },
        { label: "@next", detail: "next - 进入下一次循环", insert: "@next" },
        { label: "@off", detail: "off - 关闭触发", insert: "@off" },
        { label: "@on", detail: "on - 开启触发", insert: "@on" },
        { label: "@perform", detail: "perform pfm - 释放绝招", insert: "@perform " },
        { label: "@print", detail: "print text - 输出消息", insert: "@print " },
        { label: "@push", detail: "push title content - 推送通知", insert: "@push " },
        { label: "@renew", detail: "renew - 修理装备", insert: "@renew" },
        { label: "@show", detail: "show text - 展示消息", insert: "@show " },
        { label: "@stop", detail: "stop name - 停止流程", insert: "@stop " },
        { label: "@task", detail: "task text - 等待任务提示", insert: "@task " },
        { label: "@taohualin", detail: "taohualin - 桃花林", insert: "@taohualin" },
        { label: "@tidyBag", detail: "tidyBag - 整理背包(含丢弃)", insert: "@tidyBag" },
        { label: "@tip", detail: "tip text - 等待场景提示", insert: "@tip " },
        { label: "@toolbar", detail: "toolbar - 显示工具栏", insert: "@toolbar" },
        { label: "@until", detail: "until condition - 等待条件成立", insert: "@until " },
        { label: "@wait", detail: "wait ms - 等待毫秒", insert: "@wait " },
        { label: "@xy", detail: "xy coord - 等待场景坐标", insert: "@xy " },
    ],
    // #directives
    dirs: [
        { label: "#input", detail: "#input ($var)=描述,默认值 - 输入参数", insert: "#input ($)=" },
        { label: "#select", detail: "#select ($var)=描述,选项|分隔,默认 - 选择参数", insert: "#select ($)=" },
        { label: "#config", detail: "#config - 显示配置面板", insert: "#config" },
        { label: "#button", detail: "#button text - 自定义按钮", insert: "#button " },
    ],
    // [control flow]
    ctrls: [
        { label: "[if]", detail: "[if] condition - 条件判断", insert: "[if] " },
        { label: "[else if]", detail: "[else if] condition - 否则如果", insert: "[else if] " },
        { label: "[else]", detail: "[else] - 否则", insert: "[else]" },
        { label: "[while]", detail: "[while] condition - 循环", insert: "[while] " },
        { label: "[for]", detail: "[for] init;cond;step - for循环", insert: "[for] " },
        { label: "[break]", detail: "[break] - 跳出循环", insert: "[break]" },
        { label: "[continue]", detail: "[continue] - 继续循环", insert: "[continue]" },
        { label: "[exit]", detail: "[exit] - 退出流程", insert: "[exit]" },
    ],
    // (:variables) and trigger variables
    vars: [
        { label: "(:room)", detail: "当前房间名", insert: "(:room)" },
        { label: "(:state)", detail: "当前状态", insert: "(:state)" },
        { label: "(:hp)", detail: "当前气血", insert: "(:hp)" },
        { label: "(:maxHp)", detail: "最大气血", insert: "(:maxHp)" },
        { label: "(:hpPer)", detail: "气血百分比(0~1)", insert: "(:hpPer)" },
        { label: "(:mp)", detail: "当前内力", insert: "(:mp)" },
        { label: "(:maxMp)", detail: "最大内力", insert: "(:maxMp)" },
        { label: "(:mpPer)", detail: "内力百分比(0~1)", insert: "(:mpPer)" },
        { label: "(:name)", detail: "角色名", insert: "(:name)" },
        { label: "(:id)", detail: "角色ID", insert: "(:id)" },
        { label: "(:grade)", detail: "等级", insert: "(:grade)" },
        { label: "(:family)", detail: "门派", insert: "(:family)" },
        { label: "(:energy)", detail: "精力", insert: "(:energy)" },
        { label: "(:money)", detail: "金钱", insert: "(:money)" },
        { label: "(:weapon)", detail: "武器类型", insert: "(:weapon)" },
        { label: "(:target)", detail: "当前目标", insert: "(:target)" },
        { label: "(:free)", detail: "是否空闲", insert: "(:free)" },
        { label: "(:date)", detail: "当前日期(日)", insert: "(:date)" },
        { label: "(:day)", detail: "星期几(0-6)", insert: "(:day)" },
        { label: "(:hour)", detail: "当前小时", insert: "(:hour)" },
        { label: "(:minute)", detail: "当前分钟", insert: "(:minute)" },
        { label: "(:second)", detail: "当前秒", insert: "(:second)" },
        { label: "(:mSec)", detail: "当前毫秒", insert: "(:mSec)" },
        // Trigger event variables
        { label: "(type)", detail: "事件类型(触发)", insert: "(type)" },
        { label: "(event)", detail: "事件名称(触发)", insert: "(event)" },
        { label: "(content)", detail: "事件关键词(触发)", insert: "(content)" },
        { label: "(grade)", detail: "事件等级(触发)", insert: "(grade)" },
        { label: "(times)", detail: "持续时间戳(触发)", insert: "(times)" },
    ],
    // Get all suggestions as a flat array
    getAll: function () {
        if (!this._all) {
            this._all = [].concat(this.cmds, this.dirs, this.ctrls, this.vars);
        }
        return this._all;
    },
    // Get suggestions matching a prefix
    match: function (prefix) {
        if (!prefix || prefix.length === 0) return [];
        var lower = prefix.toLowerCase();
        return this.getAll().filter(function (item) {
            return item.label.toLowerCase().indexOf(lower) === 0;
        }).slice(0, 20);
    }
};

/**
 * Create a syntax-highlighted code editor with autocomplete and Tab indentation.
 * The original textarea is preserved (hidden behind a transparent overlay)
 * while a pre element shows the highlighted code.
 * @param {string} textareaId - The ID of the textarea element
 * @param {object} [options] - Optional height/width overrides
 */
function createRaidEditor(textareaId, options) {
    var textarea = document.getElementById(textareaId);
    if (!textarea) return null;

    // Prevent duplicate initialization
    if (document.getElementById(textareaId + '-editor')) {
        return document.getElementById(textareaId + '-editor');
    }

    options = options || {};
    var height = options.height || '30rem';
    var width = options.width || 'calc(100% - 4em)';

    // Create container
    var container = document.createElement('div');
    container.id = textareaId + '-editor';
    container.style.cssText = 'position:relative;height:' + height + ';width:' + width + ';margin:0 2em;text-align:left;';

    // Create line-number gutter (left column)
    var gutter = document.createElement('pre');
    gutter.className = 'raid-editor-lines';
    gutter.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:37px;margin:0;padding:6px 6px 6px 0;overflow:hidden;font-size:0.8em;font-family:JetBrains Mono,monospace;line-height:1.4;text-align:right;color:#666;background:#14141f;pointer-events:none;z-index:3;border-right:1px solid #3a3a4a;box-sizing:border-box;';

    // Create highlight pre element (background layer, absolutely positioned)
    var highlight = document.createElement('pre');
    highlight.className = 'raid-editor-highlight';
    highlight.style.cssText = 'position:absolute;top:0;left:37px;right:0;bottom:0;margin:0;padding:6px 8px;overflow:auto;font-size:0.8em;font-family:JetBrains Mono,monospace;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;background:#1a1a2e;color:#ccc;pointer-events:none;z-index:1;border:1px solid #555;border-radius:4px;text-align:left;box-sizing:border-box;';

    // Style textarea
    textarea.style.cssText = 'display:block;position:absolute;left:37px;top:0;right:0;bottom:0;width:auto;height:auto;margin:0;padding:6px 8px;font-size:0.8em;font-family:JetBrains Mono,monospace;line-height:1.4;background:transparent;color:transparent;caret-color:#fff;z-index:2;border:1px solid #555;border-radius:4px;resize:none;outline:none;overflow:auto;text-align:left;box-sizing:border-box;';

    // Insert container before textarea, then move elements inside
    textarea.parentNode.insertBefore(container, textarea);
    container.appendChild(gutter);
    container.appendChild(highlight);
    container.appendChild(textarea);

    //---------------------------------------------------------------------------
    //  Autocomplete Dropdown
    //---------------------------------------------------------------------------

    var autocomplete = document.createElement('div');
    autocomplete.id = textareaId + '-autocomplete';
    autocomplete.style.cssText = 'position:absolute;z-index:10;display:none;background:#1a1a2e;border:1px solid #555;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);max-height:240px;overflow-y:auto;font-size:0.8em;font-family:JetBrains Mono,monospace;min-width:200px;';
    container.appendChild(autocomplete);

    var acItems = [];
    var acIndex = -1;
    var acPrefix = '';
    var acOpen = false;
    var acTriggerChar = '';
    var skipNextInput = false;

    function getCursorWord(textarea) {
        var pos = textarea.selectionStart;
        var val = textarea.value;
        var start = pos;
        while (start > 0 && /[\w@#\[\]\(:]/.test(val[start - 1])) {
            start--;
        }
        var word = val.substring(start, pos);
        return { word: word, start: start, end: pos };
    }

    function getCaretPixelPos(textarea) {
        // Use a mirror div to measure the caret position
        var mirror = document.createElement('div');
        mirror.style.cssText = 'position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;font-size:0.8em;font-family:JetBrains Mono,monospace;line-height:1.4;padding:6px 8px;width:' + textarea.clientWidth + 'px;';
        mirror.textContent = textarea.value.substring(0, textarea.selectionStart);
        document.body.appendChild(mirror);
        var lines = mirror.textContent.split('\n');
        var lineCount = lines.length;
        var lastLine = lines[lines.length - 1];
        var lineHeight = 18; // approximate
        var charWidth = 7.5; // approximate
        var top = (lineCount - 1) * lineHeight - textarea.scrollTop;
        var left = lastLine.length * charWidth;
        document.body.removeChild(mirror);
        if (top < 0) top = 0;
        return { top: top, left: left };
    }

    function showAutocomplete() {
        if (acItems.length === 0) { hideAutocomplete(); return; }
        acIndex = 0;
        acOpen = true;
        renderAutocomplete();
        var pos = getCaretPixelPos(textarea);
        autocomplete.style.display = 'block';
        autocomplete.style.top = (pos.top + 22) + 'px';
        autocomplete.style.left = Math.min(pos.left + 46, container.clientWidth - 220) + 'px';
        var sel = autocomplete.querySelector('.raid-ac-selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function hideAutocomplete() {
        acOpen = false;
        acItems = [];
        acIndex = -1;
        acPrefix = '';
        acTriggerChar = '';
        autocomplete.style.display = 'none';
    }

    function smartEnter() {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var val = textarea.value;

        // With a selection: just insert a newline
        if (start !== end) {
            var nv0 = val.substring(0, start) + '\n' + val.substring(end);
            textarea.value = nv0;
            textarea.setSelectionRange(start + 1, start + 1);
            syncHighlight();
            return;
        }

        var lineStart = val.lastIndexOf('\n', start - 1) + 1;
        var lineEnd = val.indexOf('\n', start);
        if (lineEnd === -1) lineEnd = val.length;
        var fullLine = val.substring(lineStart, lineEnd);
        var before = val.substring(lineStart, start);
        var indent = (before.match(/^[ \t]*/) || [''])[0];
        var content = fullLine.substring(indent.length);

        // Case A: line is only indentation (no content) and caret at end -> cancel the indent
        if (indent.length > 0 && content.trim() === '' && start === lineEnd) {
            var nvA = val.substring(0, lineStart) + val.substring(lineEnd);
            textarea.value = nvA;
            textarea.setSelectionRange(lineStart, lineStart);
            syncHighlight();
            return;
        }

        // Case B/C: compute next line indent
        var isBlockHeader = /^\[(?:if|else if|else|while|for|foreach|repeat)\]/.test(fullLine.trim());
        var nextIndent = indent + (isBlockHeader ? '    ' : '');

        var nv = val.substring(0, start) + '\n' + nextIndent + val.substring(end);
        textarea.value = nv;
        textarea.setSelectionRange(start + 1 + nextIndent.length, start + 1 + nextIndent.length);
        syncHighlight();
    }

    function renderAutocomplete() {
        var html = '';
        for (var i = 0; i < acItems.length; i++) {
            var item = acItems[i];
            var cls = i === acIndex ? 'raid-ac-selected' : '';
            html += '<div class="raid-ac-item ' + cls + '" data-index="' + i + '">';
            html += '<span class="raid-ac-label">' + escapeHtml(item.label) + '</span>';
            if (item.detail) {
                html += '<span class="raid-ac-detail">' + escapeHtml(item.detail) + '</span>';
            }
            html += '</div>';
        }
        autocomplete.innerHTML = html;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function applyAutocomplete() {
        if (!acOpen || acIndex < 0 || acIndex >= acItems.length) return;
        var item = acItems[acIndex];
        var val = textarea.value;
        var cursor = textarea.selectionStart;
        // Replace the prefix with the inserted text
        var start = cursor - acPrefix.length;
        if (acTriggerChar && val.substring(start - 1, start) === acTriggerChar) {
            start -= 1;
        }
        var newVal = val.substring(0, start) + item.insert + val.substring(cursor);
        var newPos = start + item.insert.length;

        // Remove duplicate auto-closed closing bracket, e.g. "(:room)" + )
        // trailing use the last non-space char (inset like "[if] " ends with space)
        var trimEnd = item.insert.replace(/\s+$/, '');
        var lastChar = trimEnd.charAt(trimEnd.length - 1);
        if (lastChar === ')' || lastChar === ']' || lastChar === '}') {
            var checkPos = start + trimEnd.length;
            while (newVal.charAt(checkPos) === ' ') checkPos++;
            if (newVal.charAt(checkPos) === lastChar) {
                newVal = newVal.substring(0, checkPos) + newVal.substring(checkPos + 1);
                newPos = checkPos;
            }
        }

        // Ensure a trailing space after control structures ending with "]" so
        // completions like "[else]xxx" don't stick together (e.g. "[else] ").
        if (lastChar === ']' && newVal.charAt(newPos) && newVal.charAt(newPos) !== ' ') {
            newVal = newVal.substring(0, newPos) + ' ' + newVal.substring(newPos);
            newPos++;
        }

        textarea.value = newVal;
        textarea.setSelectionRange(newPos, newPos);
        hideAutocomplete();
        syncHighlight();
        // Skip the programmatic input so it doesn't re-open the autocomplete popup
        skipNextInput = true;
        var evt = new Event('input', { bubbles: true });
        textarea.dispatchEvent(evt);
    }

    function selectNext() {
        if (!acOpen || acItems.length === 0) return;
        acIndex = (acIndex + 1) % acItems.length;
        renderAutocomplete();
        var sel = autocomplete.querySelector('.raid-ac-selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function selectPrev() {
        if (!acOpen || acItems.length === 0) return;
        acIndex = (acIndex - 1 + acItems.length) % acItems.length;
        renderAutocomplete();
        var sel = autocomplete.querySelector('.raid-ac-selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function triggerAutocomplete(cursorWord) {
        var word = cursorWord.word;
        acPrefix = word;
        acTriggerChar = '';

        if (word.indexOf('@') === 0) {
            acItems = RaidAutoComplete.cmds.filter(function (c) {
                return c.label.toLowerCase().indexOf(word.toLowerCase()) === 0;
            });
        } else if (word.indexOf('#') === 0) {
            acItems = RaidAutoComplete.dirs.filter(function (d) {
                return d.label.toLowerCase().indexOf(word.toLowerCase()) === 0;
            });
        } else if (word.indexOf('[') === 0) {
            acItems = RaidAutoComplete.ctrls.filter(function (c) {
                return c.label.toLowerCase().indexOf(word.toLowerCase()) === 0;
            });
        } else if (word.indexOf('(') === 0) {
            acItems = RaidAutoComplete.vars.filter(function (v) {
                return v.label.toLowerCase().indexOf(word.toLowerCase()) === 0;
            });
        } else {
            acItems = RaidAutoComplete.match(word || '');
        }

        if (acItems.length > 0) {
            showAutocomplete();
        } else {
            hideAutocomplete();
        }
    }

    //---------------------------------------------------------------------------
    //  Keyboard Event Handling
    //---------------------------------------------------------------------------

    textarea.addEventListener('keydown', function (e) {
        var key = e.key;

        // --- Tab: apply autocomplete only (indentation handled by enableTabIndent) ---
        if (key === 'Tab') {
            e.preventDefault();
            if (acOpen) {
                applyAutocomplete();
            }
            return;
        }

        // --- Backspace: delete a matching bracket pair ---
        if (key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            var bsStart = textarea.selectionStart;
            var bsEnd = textarea.selectionEnd;
            if (bsStart === bsEnd && bsStart > 0) {
                var openCh = textarea.value[bsStart - 1];
                var closeCh = openCh === '(' ? ')' : openCh === '[' ? ']' : openCh === '{' ? '}' : '';
                if (closeCh && textarea.value[bsStart] === closeCh) {
                    e.preventDefault();
                    var nv = textarea.value.substring(0, bsStart - 1) + textarea.value.substring(bsStart + 1);
                    textarea.value = nv;
                    textarea.setSelectionRange(bsStart - 1, bsStart - 1);
                    syncHighlight();
                    return;
                }
            }
        }

        // --- Auto-close brackets, braces, parens, quotes ---
        var pairs = {
            '(': ')', '[': ']', '{': '}',
            '"': '"', "'": "'",
            '\u300C': '\u300D', '\u3010': '\u3011'
        };
        var close = pairs[key];
        if (close) {
            e.preventDefault();
            var start = textarea.selectionStart;
            var end = textarea.selectionEnd;
            var val = textarea.value;

            // For quotes, skip if already followed by same quote
            if ((key === '"' || key === "'") && start === end) {
                var charBefore = val[start - 1] || '';
                var charAfter = val[start] || '';
                // Don't auto-close if inside a word
                if (charBefore.match(/\w/) && charAfter.match(/\w/)) {
                    textarea.value = val.substring(0, start) + key + val.substring(end);
                    textarea.setSelectionRange(start + 1, start + 1);
                    syncHighlight();
                    var evt = new Event('input', { bubbles: true });
                    textarea.dispatchEvent(evt);
                    return;
                }
                // If next char is already the closing quote, skip over it
                if (val[start] === key) {
                    textarea.setSelectionRange(start + 1, start + 1);
                    return;
                }
            }

            if (start !== end) {
                // Wrap selection
                var newVal = val.substring(0, start) + key + val.substring(start, end) + close + val.substring(end);
                textarea.value = newVal;
                textarea.setSelectionRange(end + 1, end + 1);
            } else {
                // Insert pair
                var newVal = val.substring(0, start) + key + close + val.substring(end);
                textarea.value = newVal;
                textarea.setSelectionRange(start + 1, start + 1);
            }
            syncHighlight();
            var evt = new Event('input', { bubbles: true });
            textarea.dispatchEvent(evt);
            return;
        }

        // --- Skip over auto-closed closing brackets ---
        if ((key === ')' || key === ']' || key === '}') && !e.ctrlKey && !e.altKey && !e.metaKey) {
            var selStart = textarea.selectionStart;
            if (selStart === textarea.selectionEnd && textarea.value[selStart] === key) {
                e.preventDefault();
                textarea.setSelectionRange(selStart + 1, selStart + 1);
                return;
            }
        }

        // --- Enter/ArrowUp/ArrowDown/Escape when autocomplete open ---
        if (key === 'Enter' && acOpen) { e.preventDefault(); applyAutocomplete(); return; }
        if (key === 'ArrowDown' && acOpen) { e.preventDefault(); selectNext(); return; }
        if (key === 'ArrowUp' && acOpen) { e.preventDefault(); selectPrev(); return; }
        if (key === 'Escape' && acOpen) { e.preventDefault(); hideAutocomplete(); return; }

        // --- Enter: smart indentation ---
        if (key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            smartEnter();
            return;
        }

        // --- Ctrl+Space: explicitly open autocomplete ---
        if (key === ' ' && e.ctrlKey) {
            e.preventDefault();
            triggerAutocomplete(getCursorWord(textarea));
            return;
        }

        // Sync highlight after any key
        setTimeout(syncHighlight, 0);
    });

    // --- Auto-trigger autocomplete on input ---
    textarea.addEventListener('input', function () {
        if (skipNextInput) { skipNextInput = false; return; }
        var cw = getCursorWord(textarea);
        var word = cw.word;

        // Auto-trigger when typing trigger characters
        if (word === '@' || word === '#' || word === '[' || word === '(') {
            triggerAutocomplete(cw);
            return;
        }

        // If autocomplete is already open, re-filter
        if (acOpen) {
            if (cw.start < textarea.selectionStart) {
                triggerAutocomplete(cw);
            } else {
                hideAutocomplete();
            }
            return;
        }

        // Auto-trigger after typing min 2 chars
        if (word.length >= 2) {
            triggerAutocomplete(cw);
        }
    });

    // Close autocomplete on blur
    textarea.addEventListener('blur', function () {
        setTimeout(hideAutocomplete, 200);
    });

    // Click on autocomplete items
    autocomplete.addEventListener('mousedown', function (e) {
        e.preventDefault(); // Prevent textarea from losing focus
        var target = e.target;
        while (target && target !== autocomplete) {
            if (target.classList.contains('raid-ac-item')) {
                var idx = parseInt(target.getAttribute('data-index'), 10);
                if (!isNaN(idx) && idx >= 0 && idx < acItems.length) {
                    acIndex = idx;
                    applyAutocomplete();
                }
                return;
            }
            target = target.parentNode;
        }
    });

    // Hover on autocomplete items
    autocomplete.addEventListener('mouseover', function (e) {
        var target = e.target;
        while (target && target !== autocomplete) {
            if (target.classList.contains('raid-ac-item')) {
                var idx = parseInt(target.getAttribute('data-index'), 10);
                if (!isNaN(idx) && idx >= 0 && idx < acItems.length) {
                    acIndex = idx;
                    renderAutocomplete();
                }
                return;
            }
            target = target.parentNode;
        }
    });

    //---------------------------------------------------------------------------
    //  Sync functions
    //---------------------------------------------------------------------------

    function findMatchingBracket(code, cursor) {
        // Check before cursor first (higher priority)
        if (cursor > 0) {
            var ch = code[cursor - 1];
            if (ch === '(') return findMatch(code, cursor - 1, '(');
            if (ch === ')') return findMatch(code, cursor - 1, ')');
        }
        // Then check after cursor
        if (cursor < code.length) {
            var ch = code[cursor];
            if (ch === '(') return findMatch(code, cursor, '(');
            if (ch === ')') return findMatch(code, cursor, ')');
        }
        return null;
    }

    function findMatch(code, pos, bracket) {
        if (bracket === '(') {
            var depth = 1;
            for (var i = pos + 1; i < code.length; i++) {
                if (code[i] === '(') depth++;
                else if (code[i] === ')') {
                    depth--;
                    if (depth === 0) return { open: pos, close: i };
                }
            }
        } else {
            var depth = 1;
            for (var i = pos - 1; i >= 0; i--) {
                if (code[i] === ')') depth++;
                else if (code[i] === '(') {
                    depth--;
                    if (depth === 0) return { open: i, close: pos };
                }
            }
        }
        return null;
    }

    function addBracketHighlight(html, code, pair) {
        var result = '';
        var codeIdx = 0;
        var htmlIdx = 0;
        var doneOpen = false;
        var doneClose = false;

        while (htmlIdx < html.length) {
            var ch = html[htmlIdx];

            if (ch === '<') {
                var tagEnd = html.indexOf('>', htmlIdx);
                if (tagEnd === -1) { result += html.substring(htmlIdx); break; }
                result += html.substring(htmlIdx, tagEnd + 1);
                htmlIdx = tagEnd + 1;
                continue;
            }

            if (!doneOpen && codeIdx === pair.open) {
                result += '<span class="raid-bracket-match">';
                doneOpen = true;
            }
            if (!doneClose && codeIdx === pair.close) {
                result += '<span class="raid-bracket-match">';
                doneClose = true;
            }

            if (ch === '&') {
                var entityEnd = html.indexOf(';', htmlIdx);
                if (entityEnd === -1) { result += html.substring(htmlIdx); break; }
                result += html.substring(htmlIdx, entityEnd + 1);
                htmlIdx = entityEnd + 1;
                codeIdx++;
            } else {
                result += ch;
                htmlIdx++;
                codeIdx++;
            }

            if (doneOpen && codeIdx === pair.open + 1) {
                result += '</span>';
            }
            if (doneClose && codeIdx === pair.close + 1) {
                result += '</span>';
            }
        }

        if (htmlIdx < html.length) {
            result += html.substring(htmlIdx);
        }
        return result;
    }

    function syncHighlight() {
        var code = textarea.value;
        var cursor = textarea.selectionStart;
        var html = highlightRaidSyntax(code);

        // Find matching bracket pair (only English parentheses)
        var pair = findMatchingBracket(code, cursor);
        if (pair) {
            html = addBracketHighlight(html, code, pair);
        }

        highlight.innerHTML = html + '\n';
        renderLineNumbers();
    }

    function renderLineNumbers() {
        var lines = textarea.value.split('\n');
        if (lines.length === 0) { gutter.textContent = ''; gutter.scrollTop = 0; return; }

        var contentW = textarea.clientWidth - 14;
        if (contentW < 10) contentW = 10;

        // Resolve real line-height in px via computed style (handles "1.4", "normal", etc.)
        var cs = getComputedStyle(textarea);
        var lhPx = parseFloat(cs.lineHeight);
        if (!lhPx || isNaN(lhPx) || lhPx === 0) {
            var fsPx = parseFloat(cs.fontSize) || 12.8;
            lhPx = fsPx * 1.4;
        }

        // Mirror: NO padding, pure content measurement to avoid first-line padding
        // skewing the per-line height diff.
        var mirror = document.createElement('div');
        mirror.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;margin:0;' +
            'padding:0;border:0;' +
            'font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily +
            ';line-height:' + cs.lineHeight + ';' +
            'white-space:pre-wrap;word-wrap:break-word;' +
            'box-sizing:content-box;width:' + contentW + 'px;';
        document.body.appendChild(mirror);

        var prevH = 0;
        var kList = [];
        for (var i = 0; i < lines.length; i++) {
            mirror.textContent = (i > 0 ? '\n' : '') + (lines[i] || ' ');
            var h = mirror.getBoundingClientRect().height;
            var seg = h - prevH;
            // Use a small tolerance (0.5px) so sub-pixel rounding doesn't
            // inflate k (e.g. 17.98px / 18px -> should be 1, not 2).
            var k = Math.max(1, Math.round((seg - 0.5) / lhPx));
            if (k < 1) k = 1;
            kList.push(k);
            prevH = h;
        }
        document.body.removeChild(mirror);

        var s = '';
        for (var i = 0; i < kList.length; i++) {
            s += (i + 1) + '\n';
            for (var j = 1; j < kList[i]; j++) { s += '\n'; }
        }
        gutter.textContent = s;
        gutter.scrollTop = textarea.scrollTop;
    }

    function syncScroll() {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
        gutter.scrollTop = textarea.scrollTop;
    }

    textarea.addEventListener('input', syncHighlight);
    textarea.addEventListener('scroll', syncScroll);
    textarea.addEventListener('focus', syncHighlight);
    textarea.addEventListener('keydown', function () {
        setTimeout(syncHighlight, 0);
    });
    textarea.addEventListener('keyup', function () {
        setTimeout(syncHighlight, 0);
    });
    textarea.addEventListener('click', function () {
        setTimeout(syncHighlight, 0);
    });

    // Initial highlight
    syncHighlight();

    // Inject autocomplete styles once
    if (!document.getElementById('raid-ac-style')) {
        var acStyle = document.createElement('style');
        acStyle.id = 'raid-ac-style';
        acStyle.textContent = [
            '.raid-ac-item { padding: 4px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; }',
            '.raid-ac-item:hover { background: rgba(255,255,255,0.08); }',
            '.raid-ac-item.raid-ac-selected { background: rgba(79,195,247,0.25); }',
            '.raid-ac-label { color: #4fc3f7; white-space: nowrap; }',
            '.raid-ac-detail { color: #9e9e9e; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.raid-bracket-match { background: rgba(180,180,180,0.3); border-radius: 2px; }'
        ].join('\n');
        document.head.appendChild(acStyle);
    }

    return highlight;
}
