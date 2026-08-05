// background.js
// Service worker：处理来自 content script 的消息，例如在新标签页中打开扩展内置 HTML 文件。

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== 'openHtmlFile') {
        return false;
    }

    chrome.tabs.create(
        { url: chrome.runtime.getURL('ws-data/武神2综合工具网页版.html') },
        (tab) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, tabId: tab.id });
            }
        }
    );

    // 异步调用，需返回 true 以保持 sendResponse 通道打开
    return true;
});
