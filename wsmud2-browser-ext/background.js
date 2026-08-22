// ============================================================
// background.js —— 扩展的后台脚本（Service Worker）
// ------------------------------------------------------------
// 它平时"睡觉"，只有收到消息时才被叫醒干活。
// 本扩展里它只负责一件事：
//   收到"打开综合工具网页版"的请求 → 在新标签页打开内置的 HTML 工具页面
// ------------------------------------------------------------
// 小知识：浏览器只允许扩展页面打开 chrome-extension:// 开头的内部页面，
// 游戏页面自己没这个权限，所以要"求"后台帮忙开。
// ============================================================

// 监听所有发给扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 【2026-08-11 安全最佳实践】校验消息来源：只处理本扩展自身的消息（防外部扩展伪装调用）
    if (sender && sender.id && sender.id !== chrome.runtime.id) {
        return false;
    }
    // 只处理"打开 HTML 文件"这一类消息，其它消息直接忽略
    if (message.action !== 'openHtmlFile') {
        return false;  // 不处理，让消息继续走（后面没有监听者的话会报"没被处理"）
    }

    // 用浏览器 API 新开一个标签页，打开扩展自带的"综合工具网页版"
    chrome.tabs.create(
        { url: chrome.runtime.getURL('ws-data/武神2综合工具网页版.html') },
        (tab) => {
            // 检查有没有出错（比如权限不足）
            if (chrome.runtime.lastError) {
                // 出错：把错误信息回给请求方
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                // 成功：把新标签页的 id 回给请求方
                sendResponse({ success: true, tabId: tab.id });
            }
        }
    );

    // 返回 true 表示"我会异步回复"——必须写，否则 sendResponse 通道会提前关闭
    return true;
});
