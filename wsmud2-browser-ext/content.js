// content.js
// 内容脚本：在 wsmud2 页面中按顺序注入扩展自带脚本，并提供 popup 与页面脚本之间的桥接通道。

(() => {
    // 注入 JetBrains Mono 字体
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `@font-face {
        font-family: 'JetBrains Mono';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('${chrome.runtime.getURL('ws-data/JetBrainsMono-Regular.woff2')}') format('woff2');
    }`;
    (document.head || document.documentElement).appendChild(fontStyle);

    // 要加载的自定义脚本列表（不包含可选的 funny2.js）
    // 注意：Main_pluginss.js 已按模块拆分为以下 18 个文件，必须按此顺序加载
    const baseScriptFiles = [
        "ws-js/core/GM_API.js",
        "ws-js/core/utils.js",
        "ws-js/lib/jQuery.js",
        "ws-js/lib/Vue.js",
        "ws-js/lib/layer.js",
        "ws-js/lib/jQuery_contextMenu.js",
        "ws-js/lib/store.js",
        // --- 原 Main_pluginss.js 拆分开始 ---
        "ws-js/modules/proto-ext.js",
        "ws-js/modules/chat-display.js",
        "ws-js/modules/skill-timers.js",
        "ws-js/modules/number-utils.js",
        "ws-js/modules/websocket-proxy.js",
        "ws-js/modules/config-vars.js",
        "ws-js/modules/keyboard.js",
        "ws-js/modules/message-display.js",
        "ws-js/modules/wg-core.js",
        "ws-js/modules/wg-combat.js",
        "ws-js/modules/wg-auto.js",
        "ws-js/modules/wg-misc.js",
        "ws-js/modules/helpers.js",
        "ws-js/modules/ui.js",
        "ws-js/modules/state.js",
        "ws-js/modules/global-init.js",
        "ws-js/modules/audio-push.js",
        "ws-js/modules/main-ready.js",
        // --- 原 Main_pluginss.js 拆分结束 ---
        "ws-js/features/Raid.js",
        "ws-js/core/wslogin.js",
        "ws-js/features/Trigger.js",
        "ws-js/core/login-core.js",
        // --- 原 ws.js 拆分开始 ---
        "ws-js/modules/dialog-base.js",
        "ws-js/modules/dialog-panels.js",
        "ws-js/modules/extension-manager.js",
        // --- 原 ws.js 拆分结束 ---
        "ws-js/core/ws.js"
    ];

    // funny2.js 在脚本序列中的插入位置（位于 main-ready.js 之后、Raid.js 之前）
    const FUNNY2_INSERT_INDEX = 28;

    let extensionEnabled = true;
    let loadFunny2 = true;

    // 按顺序加载自定义脚本
    function loadScriptsInOrder() {
        if (!extensionEnabled) {
            console.log("扩展已禁用，跳过自定义脚本加载");
            return Promise.resolve();
        }

        const scriptFiles = baseScriptFiles.slice();
        if (loadFunny2) {
            scriptFiles.splice(FUNNY2_INSERT_INDEX, 0, "ws-js/features/funny2.js");
        }

        let chain = Promise.resolve();
        scriptFiles.forEach((file) => {
            chain = chain.then(() => loadScript(chrome.runtime.getURL(file)));
        });
        return chain;
    }

    // 加载单个脚本的辅助函数
    function loadScript(src) {
        if (!extensionEnabled) return Promise.resolve();

        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => {
                console.log("脚本加载成功:", src);
                resolve();
            };
            script.onerror = () => {
                console.error("脚本加载失败:", src);
                // 即使失败也 resolve，以继续加载下一个脚本
                resolve();
            };
            (document.head || document.documentElement).appendChild(script);
        });
    }

    // ---------------------------------------------------------------------------
    // 桥接通道：与页面脚本通信以调用 GM_* 等页面上下文函数
    // ---------------------------------------------------------------------------
    const __ext_pending = {};

    // 接收页面脚本回传的调用结果
    window.addEventListener("message", (event) => {
        if (!event.data || !event.data.__EXT_BRIDGE__) return;
        const { id, result, error } = event.data;
        if (!id) return;

        const pending = __ext_pending[id];
        if (!pending) return;

        if (error !== undefined) {
            pending.reject(error);
        } else {
            pending.resolve(result);
        }
        delete __ext_pending[id];
    });

    // 接收页面脚本发起的 openHtmlFile 请求，转发给 background
    window.addEventListener("message", (event) => {
        if (!event.data || !event.data.__EXT_BRIDGE__) return;
        if (event.data.action !== 'openHtmlFile') return;

        chrome.runtime.sendMessage({ action: 'openHtmlFile' }, (response) => {
            if (response && response.success) {
                console.log('HTML文件已在新标签页打开');
            } else {
                console.error('打开HTML文件失败:', response?.error || '未知错误');
            }
        });
    });

    // 调用页面上下文中的函数（通过注入 <script> 标签实现）
    function callPageFunction(fnName, payload) {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            __ext_pending[id] = { resolve, reject };

            // 安全地把 payload 序列化后内嵌到注入脚本中（payload 可能为 undefined）
            const payloadCode = payload === undefined ? 'undefined' : JSON.stringify(payload);
            const script = document.createElement('script');
            script.textContent = `(function(){try{var fn = (typeof ${fnName}==='function')?${fnName}:(window['${fnName}']); if(!fn) throw new Error('function ${fnName} not found'); var res = fn(${payloadCode}); window.postMessage({__EXT_BRIDGE__:true,id:'${id}',action:'${fnName}',result:res},'*')}catch(e){window.postMessage({__EXT_BRIDGE__:true,id:'${id}',action:'${fnName}',error:e && e.message?e.message:String(e)},'*')}})();`;
            (document.documentElement || document.body).appendChild(script);
            script.parentNode.removeChild(script);

            // 超时保护
            setTimeout(() => {
                if (__ext_pending[id]) {
                    __ext_pending[id].reject('timeout');
                    delete __ext_pending[id];
                }
            }, 10000);
        });
    }

    // ---------------------------------------------------------------------------
    // 消息处理：来自扩展其它部分（如 popup）的消息
    // ---------------------------------------------------------------------------
    function handleMessages(message, sender, sendResponse) {
        if (message.action === "updateExtensionStatus") {
            extensionEnabled = message.enabled;
            console.log("扩展状态更新为:", extensionEnabled ? "启用" : "禁用");
            return;
        }

        if (message.action === 'updateLoadFunny2') {
            loadFunny2 = !!message.enabled;
            console.log('loadFunny2 set to', loadFunny2);

            if (loadFunny2 && extensionEnabled) {
                // 动态注入 funny2.js
                loadScript(chrome.runtime.getURL('ws-js/features/funny2.js'))
                    .then(() => {
                        console.log('动态加载 funny2.js 完成');
                        sendResponse({ success: true });
                    })
                    .catch((err) => {
                        console.error('动态加载 funny2.js 失败', err);
                        sendResponse({ success: false, error: String(err) });
                    });
                return true;
            }

            // 关闭 funny2 后，已注入的脚本需要用户刷新页面才能卸载
            sendResponse({ success: true, message: 'disabled_requires_reload' });
            return;
        }

        if (message.action === 'GM_export') {
            try {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    data[key] = localStorage.getItem(key);
                }
                sendResponse({ success: true, data: JSON.stringify(data, null, 2) });
            } catch (err) {
                sendResponse({ success: false, error: String(err) });
            }
            return true;
        }

        if (message.action === 'GM_import') {
            try {
                const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
                if (payload && typeof payload === 'object') {
                    for (const k in payload) {
                        try {
                            localStorage.setItem(k, payload[k]);
                        } catch (e) {
                            console.error('localStorage.setItem failed for key', k, e);
                        }
                    }
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'invalid_payload' });
                }
            } catch (err) {
                sendResponse({ success: false, error: String(err) });
            }
            return true;
        }
    }

    // ---------------------------------------------------------------------------
    // 初始化
    // ---------------------------------------------------------------------------
    chrome.storage.local.get(["extensionEnabled", "loadFunny2"], (result) => {
        extensionEnabled = result.extensionEnabled !== false;
        loadFunny2 = result.loadFunny2 !== false;

        const startLoading = () => {
            loadScriptsInOrder()
                .then(() => {
                    if (extensionEnabled) console.log("所有自定义脚本按顺序加载完成");
                })
                .catch((err) => {
                    console.error("脚本加载过程中出现错误:", err);
                });
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", startLoading);
        } else {
            startLoading();
        }
    });

    chrome.runtime.onMessage.addListener(handleMessages);
})();
