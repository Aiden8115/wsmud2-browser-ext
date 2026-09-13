// ============================================================
// skill-timers.js —— 技能 CD 与 Buff 倒计时
// ------------------------------------------------------------
//   showSkillCD     在技能按钮上显示剩余冷却秒数
//   showBuffDuration 在状态栏显示 Buff 剩余时间
// 想改倒计时的显示样式/刷新频率 → 在本文件搜索。
//
// 【2026-08-14 性能优化】倒计时渲染从"每个 Buff/技能各开一条递归 setTimeout 链"
// 改为【单一 200ms 主时钟】统一推进：只保留一个 setInterval，所有倒计时登记在
// skillCDTimers / buffTimers 两个 Map 里，主时钟每 tick 统一推进并渲染。
// 顺带优化：显示文本没变化时不再重写 DOM（长 CD 原本每秒白白重写 5 次）。
// 对外函数签名完全不变（showSkillCD / showBuffDuration / clear* 照旧）。
// ============================================================
// skill-timers.js
// Skill CD and Buff duration timers
'use strict';

// 保存技能CD和BUFF定时器的Map（key → 倒计时登记项 {kind, selector, remaining, colorTag, ...}）
var skillCDTimers = new Map();
var buffTimers = new Map();

// BUFF 显示防抖表（key → setTimeout id）：合并 100ms 内同一 BUFF 的重复推送，
// 避免每次推送都"移除旧倒计时→重新渲染"导致图标闪烁
var _buffDebounce = {};

// 获取BUFF定时器的组合键
function getBuffTimerKey(sid, id) {
    return `${sid}-${id}`;
}

// ---------------- 单一主时钟 ----------------
var _masterTimer = null;             // 全局唯一的倒计时时钟
const _MASTER_INTERVAL = 200;        // 主时钟 tick 间隔（毫秒）

// 确保主时钟在跑（有登记项时才启动，全部结束后自动停）
function _ensureMaster() {
    if (_masterTimer) return;
    _masterTimer = setInterval(_masterTick, _MASTER_INTERVAL);
}

// 当前要显示的文字（>60 秒显示整数秒，否则显示 0.1 秒精度）
function _displayText(entry) {
    var secs = entry.remaining / 1000;
    return secs > 60 ? Math.ceil(secs).toFixed(0) : secs.toFixed(1);
}

// 渲染一个登记项：文本没变就不动 DOM（长 CD 每秒只写一次，不再 5 次/秒）
// 【2026-09-07 修复闪烁】BUFF 不再整体重写 .status-item 的 innerHTML（会销毁重建元素，
// 且会把游戏 lastChild 进度条 shadow 一起重建），改为独立 .buff-cd 浮层：首次创建一次，
// 之后每次只更新浮层内容；若浮层被游戏 StatusItem_refresh 重写冲掉则自动重建。
function _renderEntry(entry) {
    var text = _displayText(entry);
    var elements = document.querySelectorAll(entry.selector);
    var found = elements.length > 0;
    // BUFF 浮层被冲掉（文本未变但 span 缺失，如游戏刷新层数重写了 innerHTML）时也必须重绘
    var cdOK = true;
    if (entry.kind === 'buff' && found) {
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i].querySelector('.buff-cd')) { cdOK = false; break; }
        }
    }
    if (text === entry.lastText && !(entry._missing && found) && cdOK) return;
    entry.lastText = text;
    entry._missing = !found;
    elements.forEach((el) => {
        if (entry.kind === 'skill') {
            // 技能 CD：右上角浮层显示（26.4样式），不改变技能行内容/行高
            let float = el.querySelector('.cd-overlay');
            if (!float) {
                float = document.createElement('span');
                float.className = 'cd-overlay';
                float.style.cssText = 'position:absolute;top:0;right:0;font-size:10px;line-height:1;pointer-events:none;';
                el.appendChild(float);
            }
            float.innerHTML = '<' + (entry.colorTag || 'hir') + '>' + text + 's</' + (entry.colorTag || 'hir') + '>';
        } else {
            // BUFF：独立倒计时浮层。必须插在 shadow（游戏进度条，lastChild）之前，
            // 否则会变成 lastChild，被游戏 StatusItemANI/StatusItem_refresh 误当作进度条处理
            let cd = el.querySelector('.buff-cd');
            if (!cd) {
                cd = document.createElement('span');
                cd.className = 'buff-cd';
                const shadowEl = el.querySelector('.shadow');
                if (shadowEl) el.insertBefore(cd, shadowEl);
                else el.appendChild(cd);
            }
            cd.innerHTML = '<' + (entry.colorTag || 'hig') + '>' + text + 's</' + (entry.colorTag || 'hig') + '>';
        }
    });
}

// 倒计时结束的还原：技能移除浮层；BUFF 移除倒计时浮层（原 innerHTML 从未被改动，
// 名字/shadow 一直由游戏自己维护，无需恢复）
function _restoreEntry(entry) {
    const elements = document.querySelectorAll(entry.selector);
    elements.forEach((el) => {
        if (entry.kind === 'skill') {
            const f = el.querySelector('.cd-overlay');
            if (f) f.remove();
        } else {
            const cd = el.querySelector('.buff-cd');
            if (cd) cd.remove();
        }
    });
}

// 主时钟 tick：推进所有倒计时，到期的还原并移除；全部清空后停表
function _masterTick() {
    var expired = [];
    skillCDTimers.forEach(function (entry, key) {
        entry.remaining -= _MASTER_INTERVAL;
        if (entry.remaining <= 0) { expired.push(entry); skillCDTimers.delete(key); return; }
        _renderEntry(entry);
    });
    buffTimers.forEach(function (entry, key) {
        entry.remaining -= _MASTER_INTERVAL;
        if (entry.remaining <= 0) { expired.push(entry); buffTimers.delete(key); return; }
        _renderEntry(entry);
    });
    for (var i = 0; i < expired.length; i++) _restoreEntry(expired[i]);
    if (!skillCDTimers.size && !buffTimers.size && _masterTimer) {
        clearInterval(_masterTimer);
        _masterTimer = null;
    }
}

// ---------------- 对外接口（签名与原实现一致） ----------------

// 清除技能CD显示函数
function clearSkillCDDisplay(id) {
    // 查找技能元素
    const elements = document.querySelectorAll(`.pfm-item[pid="${id}"]`);
    if (elements.length === 0) return;

    elements.forEach((el) => {
        if (el.originalText) {
            el.innerHTML = el.originalText;
        }
    });

    if (skillCDTimers.has(id)) {
        skillCDTimers.delete(id);
    }
}

// 清除单个BUFF定时
function clearBuffDisplay(sid, id) {
    const key = getBuffTimerKey(sid, id);

    // 同时取消尚未执行的防抖延迟，避免 buff 移除后倒计时"复活"
    if (_buffDebounce[key]) {
        clearTimeout(_buffDebounce[key]);
        delete _buffDebounce[key];
    }
    if (buffTimers.has(key)) {
        buffTimers.delete(key);
    }

    const elements = document.querySelectorAll(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`);

    elements.forEach((el) => {
        const cd = el.querySelector('.buff-cd');
        if (cd) cd.remove();
    });
}

// 清除所有BUFF定时
function clearAllBuffTimers() {
    buffTimers.clear();

    // 取消所有挂起的防抖延迟
    for (const k in _buffDebounce) {
        clearTimeout(_buffDebounce[k]);
    }
    _buffDebounce = {};

    // 移除所有倒计时浮层（名字/shadow 由游戏维护，不动）
    const allStatusItems = document.querySelectorAll('.status-item');
    allStatusItems.forEach((el) => {
        const cd = el.querySelector('.buff-cd');

        if (cd) cd.remove();
    });
}

// 【2026-09-08】按物品清理 BUFF 倒计时：物品离开房间（itemremove）时调用，
// 取消该物品挂起的防抖和已登记的计时器，避免物品消失后防抖回调查空 DOM
// （旧实现只清 GameState 数据，残留计时器会空转并触发"找不到BUFF元素"告警）
function clearBuffDisplayByItem(id) {
    if (!id) return;
    // 防抖：取消该物品所有挂起的延迟回调
    for (const k in _buffDebounce) {
        if (k.endsWith('-' + id)) {
            clearTimeout(_buffDebounce[k]);
            delete _buffDebounce[k];
        }
    }
    // 计时器：移除该物品所有登记项（DOM 已随物品消失，无需还原浮层）
    for (const key of buffTimers.keys()) {
        if (key.endsWith('-' + id)) {
            buffTimers.delete(key);
        }
    }
}

// 技能CD显示函数
function showSkillCD(id, distime, overtime = 0) {
    // 【2026-08-15 移植上游 26.2】开关兼容 true / 'true'（旧配置或导入数据可能存成布尔值）
    if (skillCD !== "开" && skillCD !== true && skillCD !== 'true') return;
    // 查找元素
    const elements = document.querySelectorAll(`.pfm-item[pid="${id}"]`);
    if (elements.length === 0) {ExtLog.warn(`找不到SKILL元素:pid=${id}, id=${id}`);return;}

    clearSkillCDDisplay(id);

    elements.forEach((el) => {
        // 清除之前的计时显示，恢复原始内容
        if (el.originalText) {
            el.innerHTML = el.originalText;
        }
        // 保存当前的原始内容（不包含计时）
        el.originalText = el.innerHTML;
    });

    // 登记倒计时（remaining 与原实现 remainingSeconds - overtime/1000 等价）
    skillCDTimers.set(id, {
        kind: 'skill',
        selector: `.pfm-item[pid="${id}"]`,
        remaining: distime - (overtime || 0),
        colorTag: skillCDColor,
        lastText: null,
        _missing: false
    });
    _ensureMaster();
    _renderEntry(skillCDTimers.get(id));
}

// BUFF持续时间显示函数
function showBuffDuration(sid, duration, id, count = 0, overtime = 0) {
    // 只有当buffCD为"开"时才执行
    // 【2026-08-15 移植上游 26.2】开关兼容 true / 'true'
    if (buffCD !== "开" && buffCD !== true && buffCD !== 'true') return;

    const key = getBuffTimerKey(sid, id);

    // 【2026-09-07 防抖】战斗中同一 BUFF 会被高频推送（items/status），100ms 内只保留
    // 最后一次处理，避免反复"移除旧浮层→重渲染"造成的图标高频闪烁
    if (_buffDebounce[key]) {
        clearTimeout(_buffDebounce[key]);
    }
    _buffDebounce[key] = setTimeout(() => {
        delete _buffDebounce[key];

        // 延时100毫秒，等待元素刷新
        const elements = document.querySelectorAll(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`);

        // 【2026-09-08】"找不到"是预期竞态（BUFF 在 100ms 防抖内已过期/物品已离房），
        // 静默返回即可，不再作为告警刷屏（清理逻辑见 clearBuffDisplayByItem）
        if (elements.length === 0) { ExtLog.log(`BUFF元素已消失，跳过: sid=${sid}, id=${id}`); return; }

        clearBuffDisplay(sid, id);

        // 登记倒计时（原 totalSeconds=(duration+100)/1000，remaining 同理）。
        // 层数显示由游戏 StatusItem_add/StatusItem_refresh 维护，这里不再拼写 originalText
        buffTimers.set(key, {
            kind: 'buff',
            selector: `.room-item[itemid="${id}"] .status-item[sid="${sid}"]`,
            remaining: (duration + 100) - (overtime || 0),
            colorTag: buffCDColor,
            lastText: null,
            _missing: false
        });
        _ensureMaster();
        _renderEntry(buffTimers.get(key));
    }, 100);
}
