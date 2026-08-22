// ============================================================
// logger.js —— 统一日志工具（参考 uBlock Origin console.js 的封装思路）
// ------------------------------------------------------------
// 用法（页面脚本内，经 content.js 注入后全局可用）：
//   ExtLog.log('消息') / ExtLog.warn('警告') / ExtLog.error('错误')
//   ExtLog.setEnabled(false)  // 关闭 log/warn（error 永远输出）
// 输出格式：[HH:MM:SS] [WSMUD] 消息
// 想在控制台快速过滤插件日志 → 过滤 "[WSMUD]"
// ============================================================
'use strict';

var ExtLog = {
    enabled: true,                    // 总开关：false 时 log/warn 静默，error 不受影响
    prefix: '[WSMUD]',

    // 时间戳（时:分:秒）
    _ts: function () {
        try { return new Date().toTimeString().slice(0, 8); } catch (e) { return ''; }
    },

    log: function () {
        if (!ExtLog.enabled) return;
        try { console.log.apply(console, [ExtLog._ts(), ExtLog.prefix].concat(Array.prototype.slice.call(arguments))); } catch (e) { }
    },

    info: function () {
        ExtLog.log.apply(ExtLog, arguments);
    },

    warn: function () {
        if (!ExtLog.enabled) return;
        try { console.warn.apply(console, [ExtLog._ts(), ExtLog.prefix].concat(Array.prototype.slice.call(arguments))); } catch (e) { }
    },

    // 错误永远输出（排查问题必需）
    error: function () {
        try { console.error.apply(console, [ExtLog._ts(), ExtLog.prefix].concat(Array.prototype.slice.call(arguments))); } catch (e) { }
    },

    setEnabled: function (v) {
        ExtLog.enabled = !!v;
    }
};

// ============================================================
// 页面级错误聚合（参考大项目错误监控实践）：
// 捕获未被处理的 JS 异常/异步错误，统一输出为 [WSMUD-ERR]，带限频防刷屏。
// 挂机十几开时，控制台过滤 [WSMUD-ERR] 即可一眼看到所有异常。
// ============================================================
(function () {
    // 简单去重 + 限频：同一错误 10 秒内只报一次，窗口过期后输出一条并带上窗口内累计次数
    var errCount = {};
    function capture(msg, source, line, col) {
        var key = msg + '@' + source + ':' + line;
        var now = Date.now();
        var rec = errCount[key];
        if (rec && now - rec.ts < 10000) {
            rec.n++;              // 10 秒窗口内重复 → 只累计次数，不刷屏
            return;
        }
        // 窗口过期或首次出现 → 输出一条（count = 上一窗口内累计次数）
        var count = rec ? rec.n : 0;
        if (Object.keys(errCount).length > 100) errCount = {};   // 兜底防无限增长
        errCount[key] = { ts: now, n: 1 };
        try {
            console.error('[WSMUD-ERR]', msg, '|', source + ':' + line + ':' + col, count > 1 ? '(x' + count + ')' : '');
        } catch (e) { }
    }
    // 同步异常
    window.addEventListener('error', function (e) {
        capture(e.message || String(e), e.filename || '', e.lineno || 0, e.colno || 0);
    });
    // 异步 Promise 异常
    window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        var msg = r && r.message ? r.message : String(r);
        capture('Promise: ' + msg, '', 0, 0);
    });
})();
