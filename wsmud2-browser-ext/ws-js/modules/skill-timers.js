// skill-timers.js
// Skill CD and Buff duration timers
// 使用单一 200ms 主时钟统一管理所有 CD/Buff 倒计时
'use strict';

// ============================================================
// 中央计时器注册表
// ============================================================
var _timerRegistry = [];      // 所有活跃定时器条目
var _mainClockId = null;      // 主时钟 setInterval ID
var _nextTimerId = 1;         // 自增 ID

// 获取下一个唯一 ID
function _nextId() {
    return _nextTimerId++;
}

// 主时钟 tick 函数（200ms 间隔）
function _mainTick() {
    var now = Date.now();
    for (var i = _timerRegistry.length - 1; i >= 0; i--) {
        var entry = _timerRegistry[i];
        if (!entry) continue;

        var elapsed = now - entry.startTime;
        var remaining = entry.totalMs - elapsed;

        if (remaining <= 0) {
            // 计时结束
            _updateDisplay(entry, 0);
            _timerRegistry.splice(i, 1);
            if (entry.onExpire) entry.onExpire();
        } else {
            _updateDisplay(entry, remaining);
        }
    }
}

// 启动主时钟（如尚未启动）
function _ensureMainClock() {
    if (_mainClockId === null) {
        _mainClockId = setInterval(_mainTick, 200);
    }
}

// 停止主时钟（无活跃定时器时自动停止）
function _stopMainClockIfEmpty() {
    if (_mainClockId !== null && _timerRegistry.length === 0) {
        clearInterval(_mainClockId);
        _mainClockId = null;
    }
}

// ============================================================
// 显示更新函数
// ============================================================
function _getDisplayTime(remainingMs) {
    var seconds = remainingMs / 1000;
    if (seconds > 60) {
        return Math.ceil(seconds).toFixed(0);
    } else {
        return seconds.toFixed(1);
    }
}

function _buildDisplayHtml(originalText, colorTag, displayTime, shadowStyle, isPfmItem) {
    if (isPfmItem) {
        // 技能CD：右上角小字浮层，不撑开行高
        return originalText
            + '<span class="cd-overlay" style="position:absolute;top:0;right:0;font-size:10px;line-height:1;pointer-events:none;">'
            + '<' + colorTag + '>' + displayTime + 's</' + colorTag + '>'
            + '</span>'
            + shadowStyle;
    } else {
        // Buff 等其他情况
        return originalText
            + '<' + colorTag + '>' + displayTime + 's</' + colorTag + '>'
            + shadowStyle;
    }
}

function _updateDisplay(entry, remainingMs) {
    var isPfmItem = entry.selector.startsWith('.pfm-item');
    var displayTime = remainingMs > 0 ? _getDisplayTime(remainingMs) : '0.0s';

    var elements = document.querySelectorAll(entry.selector);
    elements.forEach(function (el) {
        var shadowElement = el.querySelector('.shadow');
        var shadowStyle = shadowElement ? shadowElement.outerHTML : '';
        el.innerHTML = _buildDisplayHtml(entry.originalText, entry.colorTag, displayTime, shadowStyle, isPfmItem);
    });
}

// ============================================================
// 注册/注销定时器
// ============================================================
function _registerTimer(selector, id, originalText, totalMs, colorTag, onExpire) {
    var timerId = _nextId();
    var entry = {
        timerId: timerId,
        key: id,
        selector: selector,
        originalText: originalText,
        totalMs: totalMs,
        colorTag: colorTag,
        startTime: Date.now(),
        onExpire: onExpire
    };
    _timerRegistry.push(entry);
    _ensureMainClock();
    return timerId;
}

function _unregisterTimer(key) {
    for (var i = 0; i < _timerRegistry.length; i++) {
        if (_timerRegistry[i] && _timerRegistry[i].key === key) {
            _timerRegistry.splice(i, 1);
            break;
        }
    }
    _stopMainClockIfEmpty();
}

// ============================================================
// 对外接口
// ============================================================

// 技能CD显示函数
function showSkillCD(id, distime, overtime) {
    if (skillCD !== "开" && skillCD !== true && skillCD !== 'true') return;

    var elements = document.querySelectorAll('.pfm-item[pid="' + id + '"]');
    if (elements.length === 0) {
        console.log('找不到SKILL元素:pid=' + id);
        return;
    }

    // 清除旧定时器
    clearSkillCDDisplay(id);

    // 保存原始文本
    var originalText = '';
    elements.forEach(function (el) {
        if (el.originalText) {
            el.innerHTML = el.originalText;
        }
        el.originalText = el.innerHTML;
        if (!originalText) originalText = el.innerHTML;
    });

    var totalSeconds = (distime - (overtime || 0)) / 1000;
    var totalMs = totalSeconds * 1000;

    if (totalMs <= 0) return;

    _registerTimer(
        '.pfm-item[pid="' + id + '"]',
        'skill_' + id,
        originalText,
        totalMs,
        skillCDColor || 'hir',
        function () {
            // 过期后重置
            var els = document.querySelectorAll('.pfm-item[pid="' + id + '"]');
            els.forEach(function (el) {
                if (el.originalText) {
                    var shadowElement = el.querySelector('.shadow');
                    var shadowStyle = shadowElement ? shadowElement.outerHTML : '';
                    el.innerHTML = el.originalText
                        + '<span class="cd-overlay" style="position:absolute;top:0;right:0;font-size:10px;line-height:1;pointer-events:none;">'
                        + '<' + (skillCDColor || 'hir') + '>0.0s</' + (skillCDColor || 'hir') + '>'
                        + '</span>'
                        + shadowStyle;
                }
            });
        }
    );
}

// 清除技能CD显示
function clearSkillCDDisplay(id) {
    var key = 'skill_' + id;
    _unregisterTimer(key);

    var elements = document.querySelectorAll('.pfm-item[pid="' + id + '"]');
    elements.forEach(function (el) {
        if (el.originalText) {
            el.innerHTML = el.originalText;
        }
    });
}

// BUFF持续时间显示函数
function showBuffDuration(sid, duration, id, count, overtime) {
    if (buffCD !== "开" && buffCD !== true && buffCD !== 'true') return;

    // 延时等待元素刷新
    setTimeout(function () {
        var elements = document.querySelectorAll('.room-item[itemid="' + id + '"] .status-item[sid="' + sid + '"]');
        if (elements.length === 0) {
            console.log('找不到BUFF元素: sid=' + sid + ', id=' + id);
            return;
        }

        var key = 'buff_' + sid + '_' + id;
        clearBuffDisplay(sid, id);

        var newOriginalText = '';
        elements.forEach(function (el) {
            if (el.originalText) {
                el.innerHTML = el.originalText;
            }
            newOriginalText = el.firstChild ? el.firstChild.nodeValue.trim() : el.textContent.trim();
            el.originalText = newOriginalText;
        });

        var finalOriginalText = elements[0].originalText;
        if (count > 0) {
            finalOriginalText = finalOriginalText.replace(/x\d+$/, '') + 'x' + count;
        }

        var totalMs = (duration + 100) - (overtime || 0);
        if (totalMs <= 0) return;

        _registerTimer(
            '.room-item[itemid="' + id + '"] .status-item[sid="' + sid + '"]',
            key,
            finalOriginalText,
            totalMs,
            buffCDColor || 'hir',
            function () {
                clearBuffDisplay(sid, id);
            }
        );
    }, 100);
}

// 清除单个BUFF定时
function clearBuffDisplay(sid, id) {
    var key = 'buff_' + sid + '_' + id;
    _unregisterTimer(key);

    var elements = document.querySelectorAll('.room-item[itemid="' + id + '"] .status-item[sid="' + sid + '"]');
    elements.forEach(function (el) {
        if (el.originalText) {
            var shadowElement = el.querySelector('.shadow');
            var shadowStyle = shadowElement ? shadowElement.outerHTML : '';
            el.innerHTML = el.originalText + shadowStyle;
            el.originalText = null;
        }
    });
}

// 清除所有BUFF定时
function clearAllBuffTimers() {
    // 移除所有 buff_ 开头的定时器
    for (var i = _timerRegistry.length - 1; i >= 0; i--) {
        if (_timerRegistry[i] && _timerRegistry[i].key.indexOf('buff_') === 0) {
            _timerRegistry.splice(i, 1);
        }
    }
    _stopMainClockIfEmpty();

    // 恢复原始文本
    var allStatusItems = document.querySelectorAll('.status-item');
    allStatusItems.forEach(function (el) {
        if (el.originalText) {
            var shadowElement = el.querySelector('.shadow');
            var shadowStyle = shadowElement ? shadowElement.outerHTML : '';
            el.innerHTML = el.originalText + shadowStyle;
            el.originalText = null;
        }
    });
}