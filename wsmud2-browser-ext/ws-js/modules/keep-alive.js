/**
 * keep-alive.js — 后台保活（2026-08-10 新增）
 *
 * 解决多开挂机时，浏览器对隐藏标签页的节流/休眠导致定时器被降频的问题。
 * 三层保活（按强度递增）：
 *   ① 覆盖 visibility API —— 让页面始终"可见"（visibilityState 恒为 visible）
 *   ② 每 30 秒模拟一次用户活动（mousemove）—— 浏览器记录为活跃页面
 *   ③ 静音音频保活 —— 首次点击页面后启动一个静音音频流，
 *      浏览器对"正在播放音频"的页面不节流（最强，治本）
 *
 * 开关：设置 → 杂项配置 → 后台保活（全局键 _keepalive，默认开，非角色配置）
 * 切换即时生效：window._extKeepAlive.start() / .stop()
 */
(function () {
    'use strict';

    var KEY = '_keepalive';
    var isOn = function () { var v = GM_getValue(KEY, '开'); return v == '开' || v === true || v === 'true'; };

    /* ① 覆盖 visibility API：页面始终可见 */
    try {
        Object.defineProperty(document, 'visibilityState', {
            get: function () { return 'visible'; },
            configurable: true
        });
        Object.defineProperty(document, 'hidden', {
            get: function () { return false; },
            configurable: true
        });
        // 双保险：即便浏览器派发 visibilitychange，也拦截掉（防游戏/脚本暂停逻辑）
        document.addEventListener('visibilitychange', function (e) {
            e.stopImmediatePropagation();
        }, true);
    } catch (e) { }

    /* ② 模拟用户活动 */
    var evTimer = null;
    function startEv() {
        if (evTimer) return;
        evTimer = setInterval(function () {
            try {
                document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1, clientY: 1 }));
            } catch (e) { }
        }, 30000);
    }
    function stopEv() {
        if (evTimer) { clearInterval(evTimer); evTimer = null; }
    }

    /* ③ 静音音频保活（需用户手势后启动） */
    var actx = null, src = null;
    function startAudio() {
        if (actx) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx = new AC();
            var buf = actx.createBuffer(1, 1, 22050);   // 1 采样静音 buffer
            src = actx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            src.connect(actx.destination);
            src.start();
            if (actx.state === 'suspended') {
                actx.resume().catch(function () { });
            }
        } catch (e) { }
    }
    function stopAudio() {
        try { if (src) src.stop(); } catch (e) { }
        try { if (actx) actx.close(); } catch (e) { }
        src = null; actx = null;
    }

    function start() {
        if (isOn()) { startEv(); }
    }
    function stop() { stopEv(); stopAudio(); }

    // 首次用户交互后启动音频（autoplay 政策要求用户手势）
    document.addEventListener('click', function once() {
        document.removeEventListener('click', once);
        if (isOn()) startAudio();
    });

    if (isOn()) start();

    // 供设置面板切换（window 挂载，勿删）
    window._extKeepAlive = {
        start: function () { start(); startAudio(); },
        stop: function () { stop(); },
        isOn: isOn
    };
})();
