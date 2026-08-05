// chat-display.js
// Rainbow name, smart scroll, date format, auto scroll
'use strict';

// 全局变量，用于获取聊天窗口元素，避免重复查询
var chatContainer = null;

function rainbowplayer() {
    rainbow_name = GM_getValue(roleid + "_rainbow_name", rainbow_name);
    if (!GameState.id || rainbow_name !== "开") return;
    var playerElement = $(`.room-item[itemid="${GameState.id}"]`);
    if (playerElement.length > 0) {
        playerElement.find('.item-name').addClass('supernova-text');
    }
}

// --- 新增的智能滚动函数 ---
function smartAutoScroll() {
    // 如果还没找到聊天窗口，就尝试获取一次
    if (!chatContainer) {
        chatContainer = document.querySelector('.content-message');
        if (!chatContainer) return; // 如果页面上还没有这个元素，就退出
    }
    // 判断滚动条是否在底部的阈值，比如距离底部小于 100px 就认为是在底部
    const threshold = 100; 
    const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < threshold;
    // 如果用户就在底部，那么平滑滚动到底部
    if (isAtBottom) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
}

// --- 修改后的 MutationObserver 初始化函数 ---
function initObserver() {
    // 确保 body 存在
    if (!document.body) {
        setTimeout(initObserver, 0);
        return;
    }
    
    const observer = new MutationObserver(function(mutations) {
        let needsRainbowCheck = false;
        let needsScrollCheck = false;

        mutations.forEach(function(mutation) {
            // 我们只关心子节点列表的变化 (childList)
            if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
                return;
            }
            // 检查是否有新节点被添加到聊天窗口
            if (chatContainer && chatContainer.contains(mutation.target)) {
                needsScrollCheck = true;
            }
            // 检查是否有 room-item 节点被添加（用于彩虹名字）
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // 确保是元素节点
                    if (node.classList.contains('room-item') || node.querySelector('.room-item')) {
                        needsRainbowCheck = true;
                        break; // 找到一个就够了，跳出内层循环
                    }
                }
            }
        });
        // 在所有突变检查完后，统一执行一次任务，避免重复调用
        if (needsRainbowCheck) {
            setTimeout(rainbowplayer, 0); // 稍微延迟确保元素渲染完成
        }
        if (needsScrollCheck) {
            // 滚动不需要延迟，立即响应
            smartAutoScroll();
        }
    });
    
        // 开始监听
    observer.observe(document.body, {
        childList: true, // 只关心节点的添加和删除
        subtree: true   // 需要监听所有子孙节点
    });
}

// --- 修改后的 DOM 加载完成后的执行逻辑 ---
$(document).ready(function() {
// 缓存聊天窗口元素
chatContainer = document.querySelector('.content-message');
initObserver();
// 初始执行一次彩虹名字检查
setTimeout(rainbowplayer, 500);
});

// 格式化日期时间
function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}
/*
//滚动 -- fork from Suqing funny ---------------fixed
// 自动滚动功能
function AutoScroll(name) {
    if (name) {
        if ($(name).length != 0) {
            let scrollTop = $(name)[0].scrollTop;
            let scrollHeight = $(name)[0].scrollHeight;
            let height = Math.ceil($(name).height());
            if (scrollTop < scrollHeight - height) {
                let add = (scrollHeight - height < 120) ? 1 : Math.ceil((scrollHeight - height) / 120);
                $(name)[0].scrollTop = scrollTop + add;
                setTimeout(function () {
                    AutoScroll(name);
                }, 1000 / 120);
            }
        }
    }
}
*/

