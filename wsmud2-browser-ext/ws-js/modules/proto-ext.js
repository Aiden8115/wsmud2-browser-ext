// proto-ext.js
// Array/String prototype extensions and clipboard helper
'use strict';

// 通过索引移除数组元素
Array.prototype.baoremove = function (dx) {
    if (isNaN(dx) || dx > this.length) {
        return false;
    }
    this.splice(dx, 1);
};
// 通过值移除数组元素
Array.prototype.remove = function (val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};
// 替换字符串中所有匹配项
String.prototype.replaceAll = function (s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2);
};
// 复制文本到剪贴板
var copyToClipboard = function (text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    document.execCommand("Copy");
    textarea.parentNode.removeChild(textarea);
};
