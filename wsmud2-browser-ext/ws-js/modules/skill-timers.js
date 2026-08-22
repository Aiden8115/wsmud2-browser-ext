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

// 获取BUFF定时器的组合键
function getBuffTimerKey(sid, id) {
    return `${sid}-${id}`;
}

// 【2026-08-12 移植作者 f45137e】游戏颜色标签 → CSS 色值（用于技能CD浮层上色）
const CD_TAG_COLORS = { hir: '#ff0000', hig: '#00ff00', hiy: '#ffff00', hic: '#00ffff', hiz: '#0000ff', hio: '#ff8000', wht: '#ffffff' };

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
function _renderEntry(entry) {
    var text = _displayText(entry);
    var elements = document.querySelectorAll(entry.selector);
    var found = elements.length > 0;
    if (text === entry.lastText && !(entry._missing && found)) return;
    entry.lastText = text;
    entry._missing = !found;
    elements.forEach((el) => {
        if (entry.kind === 'skill') {
            // 技能 CD：右上角浮层显示，不改变技能行内容/行高
            let float = el.querySelector('.skill-cd-float');
            if (!float) {
                float = document.createElement('span');
                float.className = 'skill-cd-float';
                el.appendChild(float);
            }
            float.textContent = text + 's';
            float.style.color = CD_TAG_COLORS[entry.colorTag] || '#ffffff';
        } else {
            // BUFF：内文追加剩余时间（保持原实现的行为）
            const shadowElement = el.querySelector('.shadow');
            const shadowStyle = shadowElement ? shadowElement.outerHTML : '';
            el.innerHTML = `${entry.originalText}<${entry.colorTag}>${text}s</${entry.colorTag}>${shadowStyle}`;
        }
    });
}

// 倒计时结束的还原：技能移除浮层；BUFF 恢复原始文本
// 【2026-08-14 修复】BUFF 到期改为"名字 + shadow 星标"一起恢复（原实现只恢复名字，
// 与 clearBuffDisplay 的行为不一致，会把 buff 的 shadow 星标弄丢）
function _restoreEntry(entry) {
    const elements = document.querySelectorAll(entry.selector);
    elements.forEach((el) => {
        if (entry.kind === 'skill') {
            const f = el.querySelector('.skill-cd-float');
            if (f) f.remove();
        } else if (el.originalText) {
            const shadowElement = el.querySelector('.shadow');
            const shadowStyle = shadowElement ? shadowElement.outerHTML : '';
            el.innerHTML = `${el.originalText}${shadowStyle}`;
            el.originalText = null;
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

    if (buffTimers.has(key)) {
        buffTimers.delete(key);
    }

    const elements = document.querySelectorAll(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`);

    elements.forEach((el) => {
        if (el.originalText) {
            const shadowElement = el.querySelector('.shadow');
            const shadowStyle = shadowElement ? shadowElement.outerHTML : '';

            el.innerHTML = `${el.originalText}${shadowStyle}`;
            el.originalText = null;
        }
    });
}

// 清除所有BUFF定时
function clearAllBuffTimers() {
    buffTimers.clear();

    // 恢复原始文本
    const allStatusItems = document.querySelectorAll('.status-item');
    allStatusItems.forEach((el) => {
        if (el.originalText) {
            const shadowElement = el.querySelector('.shadow');
            const shadowStyle = shadowElement ? shadowElement.outerHTML : '';

            el.innerHTML = `${el.originalText}${shadowStyle}`;
            el.originalText = null;
        }
    });
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
    // 延时100毫秒，等待元素刷新
    setTimeout(() => {
        const elements = document.querySelectorAll(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`);

        if (elements.length === 0) {ExtLog.warn(`找不到BUFF元素: sid=${sid}, id=${id}`);return;}

        clearBuffDisplay(sid, id);

        let newOriginalText = '';
        elements.forEach((el) => {
            // 清除之前的计时显示，恢复原始内容
            if (el.originalText) {
                el.innerHTML = el.originalText;
            }
            // 保存当前的原始内容（不包含计时）
            newOriginalText = el.firstChild ? el.firstChild.nodeValue.trim() : el.textContent.trim();
            el.originalText = newOriginalText;
        });

        // 处理refresh BUFF的层数（与原实现一致）
        let finalOriginalText = elements[0].originalText;
        if (count > 0) {
            finalOriginalText = finalOriginalText.replace(/x\d+$/, '') + `x${count}`;
        }

        // 登记倒计时（原 totalSeconds=(duration+100)/1000，remaining 同理）
        const key = getBuffTimerKey(sid, id);
        buffTimers.set(key, {
            kind: 'buff',
            selector: `.room-item[itemid="${id}"] .status-item[sid="${sid}"]`,
            remaining: (duration + 100) - (overtime || 0),
            colorTag: buffCDColor,
            originalText: finalOriginalText,
            lastText: null,
            _missing: false
        });
        _ensureMaster();
        _renderEntry(buffTimers.get(key));
    }, 100);
}
