// skill-timers.js
// Skill CD and Buff duration timers
'use strict';

// 保存技能CD和BUFF定时器的Map
var skillCDTimers = new Map();
var buffTimers = new Map();

// 获取BUFF定时器的组合键
function getBuffTimerKey(sid, id) {
    return `${sid}-${id}`;
}

// 通用显示更新函数，参数：HTML元素、人物id、技能文本、技能时长、定时器、已过时间、显示颜色
function updateDurationDisplay(selector, id, originalText, totalSeconds, timerMap, overtime = 0, colorTag = 'hir') {
    let remainingSeconds =totalSeconds - overtime / 1000
    // 更新函数
    const update = () => {
        // 检查是否还有该元素的定时器（防止重复调用）
        // if (!timerMap.has(id)) {
        //     return;
        // }
        
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {

            let displayTime;
            if (remainingSeconds > 60) {
                displayTime = Math.ceil(remainingSeconds).toFixed(0);
            } else {
                displayTime = remainingSeconds.toFixed(1);
            }
            
            const shadowElement = el.querySelector('.shadow');
            const shadowStyle = shadowElement ? shadowElement.outerHTML : '';
            
            if (selector.startsWith('.pfm-item')) {
                // SKILLcd 显示：换行并锁定在原元素正下方
                el.innerHTML = `${originalText}<br><span><${colorTag}>${displayTime}s</${colorTag}></span>${shadowStyle}`;
            } else {
                // 其他情况保持原有显示
                el.innerHTML = `${originalText}<${colorTag}>${displayTime}s</${colorTag}>${shadowStyle}`;
            }
        });
        
        // 根据剩余时间设置不同的更新频率
        let updateInterval;
        let subtractValue;
        
        if (remainingSeconds > 60) {
            updateInterval = 1000;
            subtractValue = 1;
        } else {
            updateInterval = 200;
            subtractValue = 0.2;
        }
        
        remainingSeconds -= subtractValue;
        if (remainingSeconds > 0) {
            const timerId = setTimeout(update, updateInterval);
            timerMap.set(id, timerId);
        } else {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
                const shadowElement = el.querySelector('.shadow');
                const shadowStyle = shadowElement ? shadowElement.outerHTML : '';
                
                // 计时结束后显示同宽度的空白字符
                const spaces = '0.0s'; // 5个全角空格，对应"00.0s"的宽度
                if (selector.startsWith('.pfm-item')) {
                    // SKILLcd 显示：换行并锁定在原元素正下方
                    el.innerHTML = `${originalText}<br><span><${colorTag}>${spaces}</${colorTag}></span>${shadowStyle}`;
                } else {
                    // 其他情况保持原有显示
                    el.innerHTML = `${originalText}<${colorTag}>${spaces}</${colorTag}>${shadowStyle}`;
                }
                // 保留originalText，以便下次添加计时前清除
            });
            timerMap.delete(id);
        }
    };
    
    const timerId = setTimeout(update, 100);
    timerMap.set(id, timerId);
}

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
        clearTimeout(skillCDTimers.get(id));
        skillCDTimers.delete(id);
    }
}

// 清除单个BUFF定时
function clearBuffDisplay(sid, id) {
    const key = getBuffTimerKey(sid, id);
    
    if (buffTimers.has(key)) {
        clearTimeout(buffTimers.get(key));
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
    for (const [key, timerId] of buffTimers) {
        clearTimeout(timerId);
    }
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
    if (skillCD !== "开" && skillCD !== true && skillCD !== 'true') return;
    // 查找元素
    const elements = document.querySelectorAll(`.pfm-item[pid="${id}"]`);
    if (elements.length === 0) {console.log(`找不到SKILL元素:pid=${pid}, id=${id}`);return;}
    
    clearSkillCDDisplay(id);
    
    elements.forEach((el) => {
        // 清除之前的计时显示，恢复原始内容
        if (el.originalText) {
            el.innerHTML = el.originalText;
        }
        // 保存当前的原始内容（不包含计时）
        el.originalText = el.innerHTML;
    });
    
    const totalSeconds = distime / 1000;
    
    updateDurationDisplay(`.pfm-item[pid="${id}"]`, id, elements[0].originalText, totalSeconds, skillCDTimers, overtime, skillCDColor);
}

// BUFF持续时间显示函数
function showBuffDuration(sid, duration, id, count = 0, overtime = 0) {
    // 只有当buffCD为"开"时才执行
    if (buffCD !== "开" && buffCD !== true && buffCD !== 'true') return;
    // 延时100毫秒，等待元素刷新
    setTimeout(() => {
        const elements = document.querySelectorAll(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`);

        if (elements.length === 0) {console.log(`找不到BUFF元素: sid=${sid}, id=${id}`);return;}

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
        
        const totalSeconds = (duration + 100) / 1000;
        // 处理refresh BUFF的层数
        let finalOriginalText = elements[0].originalText;
        if (count > 0) {
            finalOriginalText = finalOriginalText.replace(/x\d+$/, '') + `x${count}`;
        }
        // 使用通用显示更新函数，确保只在特定room-item下添加BUFF文本
        updateDurationDisplay(`.room-item[itemid="${id}"] .status-item[sid="${sid}"]`, getBuffTimerKey(sid, id), finalOriginalText, totalSeconds, buffTimers, overtime, buffCDColor);
    }, 100);
}


