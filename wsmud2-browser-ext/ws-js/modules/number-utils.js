// ============================================================
// number-utils.js —— 数字格式化
// ------------------------------------------------------------
//   addChineseUnit  数字转成"万/亿"显示（比如 120000 → 12万）
//   还有 URL 参数解析的小工具
// ============================================================
// number-utils.js
// Number unit conversion (wan/yi) and URL query
'use strict';

//为数字加上单位：万或亿
function addWan(integer, number, mutiple, decimalDigit) {
    var digit = getDigit(integer);
    if (digit > 3) {
        var remainder = digit % 8;
        if (remainder >= 5) { // ‘十万’、‘百万’、‘千万’显示为‘万’
            remainder = 4;
        }
        return Math.round(number / Math.pow(10, remainder + mutiple - decimalDigit)) / Math.pow(10, decimalDigit) + '万';
    } else {
        return Math.round(number / Math.pow(10, mutiple - decimalDigit)) / Math.pow(10, decimalDigit);
    }
}
// 获取数字位数
function getDigit(integer) {
    var digit = -1;
    while (integer >= 1) {
        digit++;
        integer = integer / 10;
    }
    return digit;
}
// 为数字添加中文单位（万、亿等）
function addChineseUnit(number, decimalDigit) {

    decimalDigit = decimalDigit == null ? 2 : decimalDigit;
    var integer = Math.floor(number);
    var digit = getDigit(integer);
    // ['个', '十', '百', '千', '万', '十万', '百万', '千万'];
    var unit = [];
    if (digit > 3) {
        var multiple = Math.floor(digit / 8);
        if (multiple >= 1) {
            var tmp = Math.round(integer / Math.pow(10, 8 * multiple));
            unit.push(addWan(tmp, number, 8 * multiple, decimalDigit));
            for (var i = 0; i < multiple; i++) {
                unit.push('亿');
            }
            return unit.join('');
        } else {
            return addWan(integer, number, 0, decimalDigit);
        }
    } else {
        return number;
    }
}
// 获取URL查询参数
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
    }
    return (false);
}
