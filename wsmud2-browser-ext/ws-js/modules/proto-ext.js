// ============================================================
// proto-ext.js —— 给数组(Array)和字符串(String)加"小功能"
// ------------------------------------------------------------
// JavaScript 允许给所有数组/字符串统一添加新方法，
// 加完后，代码里任何数组都能直接用这些新方法。
// 这个文件就是干这个的，属于"底层工具"，其它脚本都在用。
// ============================================================
'use strict';

// 给所有数组加 baoremove(下标) 方法：按下标删掉一个元素
// 例：arr = ['a','b','c'];  arr.baoremove(1)  →  arr = ['a','c']
Array.prototype.baoremove = function (dx) {
    if (isNaN(dx) || dx > this.length) {  // 下标不合法就返回 false
        return false;
    }
    this.splice(dx, 1);  // splice = 从第 dx 个位置删 1 个
};

// 给所有数组加 remove(值) 方法：按"值"删掉元素（只删第一个匹配的）
// 例：arr = ['a','b','c'];  arr.remove('b')  →  arr = ['a','c']
Array.prototype.remove = function (val) {
    var index = this.indexOf(val);   // 先找值的位置
    if (index > -1) {                // 找到了才删
        this.splice(index, 1);
    }
};

// 给所有字符串加 replaceAll(旧, 新) 方法：把字符串里所有"旧"换成"新"
// 例："aaabbb".replaceAll("a","x")  →  "xxxbbb"
String.prototype.replaceAll = function (s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2);  // g=全部替换，m=多行
};

// 复制文本到剪贴板（独立函数，不是原型方法）
// 造一个隐藏 textarea → 选中 → 执行复制命令 → 删掉
var copyToClipboard = function (text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    document.execCommand("Copy");   // 执行浏览器复制命令
    textarea.parentNode.removeChild(textarea);
};
