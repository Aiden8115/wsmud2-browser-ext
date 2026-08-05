// utils.js
// 通用工具函数：播放提示音、计算装备星级、向 content script 请求打开扩展 HTML 页面。

/**
 * 播放完成提示音。
 * 首次调用时根据自身 <script> 标签推断扩展 ID，构造 chrome-extension:// URL，
 * 在页面中插入 <audio> 元素并复用。
 */
function NotSound() {
    let audioElement = document.getElementById('beep');
    if (!audioElement) {
        const scriptTag = document.querySelector(`script[src*="ws-js/core/utils.js"]`);
        if (!scriptTag) {
            console.error('Beep1 Error: Cannot find the extension script tag.');
            return;
        }
        // 通过脚本标签的 src 推断扩展 ID（hostname 即为扩展 ID）
        const extensionId = new URL(scriptTag.src).hostname;

        audioElement = document.createElement('audio');
        audioElement.id = 'beep';
        audioElement.preload = 'auto';
        audioElement.src = `chrome-extension://${extensionId}/ws-data/complete.mp3`;
        document.body.appendChild(audioElement);
    }
    audioElement.currentTime = 0; // 重置播放头
    audioElement.play();
}

/**
 * 根据装备字符串中的 ★ 和 ☆ 计算精炼等级。
 * ★ 计 2 点，☆ 计 1 点。
 */
function getJLGrade(eq) {
    const starCount = (eq.match(/★/g) || []).length;
    const halfStarCount = (eq.match(/☆/g) || []).length;
    return starCount * 2 + halfStarCount;
}

/**
 * 通过 postMessage 请求 content script 在新标签页打开扩展内置 HTML 工具页面。
 */
function openExtensionHtml() {
    window.postMessage({ __EXT_BRIDGE__: true, action: 'openHtmlFile' }, '*');
}
