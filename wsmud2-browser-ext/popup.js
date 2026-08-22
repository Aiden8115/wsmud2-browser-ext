// ============================================================
// popup.js —— 插件弹窗的逻辑脚本
// ------------------------------------------------------------
// 点击浏览器工具栏上的插件图标 → 弹出 popup.html（一个 320px 宽的小窗口）
// 本文件负责这个小窗口里的全部交互：
//   1. 插件总开关（开/关整个扩展）
//   2. funny2 界面增强脚本开关
//   3. 导出配置 / 导入配置（备份和恢复游戏里的插件设置）
// ============================================================

// 等页面结构加载完再绑定事件（HTML 元素要存在才能绑事件）
document.addEventListener("DOMContentLoaded", () => {
    // ---- 先拿到页面上的各个控件 ----
    const toggleSwitch = document.getElementById("toggleSwitch");   // 插件总开关
    const statusEl = document.getElementById("status");             // 状态文字
    const funny2Switch = document.getElementById("funny2Switch");   // funny2 开关
    const exportBtn = document.getElementById("exportBtn");         // 导出按钮
    const importBtn = document.getElementById("importBtn");         // 导入按钮
    const importInput = document.getElementById("importInput");     // 隐藏的文件选择框

    // 根据启用状态更新底部状态文字（绿=运行中，红=已禁用）
    function updateStatusText(enabled) {
        if (enabled) {
            statusEl.textContent = "启用中";
            statusEl.className = "enabled";
        } else {
            statusEl.textContent = "已禁用";
            statusEl.className = "disabled";
        }
    }

    // 给"当前正在看的那个标签页"发消息（就是游戏页面）
    // callback 是可选的回复处理函数
    // 【2026-08-15 修复】原实现不检查 chrome.runtime.lastError：在非游戏页（如新标签页）点
    // 导出/导入会报"未知错误"。现在统一处理：无可用标签页/页面未注入插件时回调 null。
    function sendMessageToActiveTab(message, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                if (callback) callback(null);
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[WSMUD popup] 消息发送失败:", chrome.runtime.lastError.message);
                    if (callback) callback(null);
                    return;
                }
                if (callback) callback(response);
            });
        });
    }

    // ---- 初始化：从扩展存储里读出上次的开关状态，回填到界面上 ----
    chrome.storage.local.get(["extensionEnabled", "loadFunny2"], (result) => {
        result = result || {};
        const enabled = result.extensionEnabled !== false;    // 没存过就当"开"
        const loadFunny2 = result.loadFunny2 === undefined ? true : !!result.loadFunny2;

        toggleSwitch.checked = enabled;       // 开关位置
        updateStatusText(enabled);            // 状态文字

        if (funny2Switch) {
            funny2Switch.checked = loadFunny2;
        }
    });

    // 【2026-08-14】底部版本号自动从 manifest.json 读取（原为写死的 26.1.25，改版本必漏）
    try {
        const verEl = document.getElementById("version");
        if (verEl && chrome.runtime && chrome.runtime.getManifest) {
            verEl.textContent = chrome.runtime.getManifest().version + " | WSMUD 插件";
        }
    } catch (e) { }

    // ---- 插件总开关：切换时保存状态，并通知游戏页面 ----
    toggleSwitch.addEventListener("change", () => {
        const enabled = toggleSwitch.checked;
        chrome.storage.local.set({ extensionEnabled: enabled }, () => {
            updateStatusText(enabled);
            // 通知游戏页面的 content.js：开关变了
            sendMessageToActiveTab({ action: "updateExtensionStatus", enabled });
            // 【2026-08-14】已注入的脚本无法卸载，关闭后需刷新页面才完全停止
            if (!enabled) {
                alert("插件已禁用。已注入游戏页的脚本仍会运行，刷新游戏页面后才会完全停止。");
            }
        });
    });

    // ---- funny2 开关：切换时保存状态，并通知游戏页面 ----
    if (funny2Switch) {
        funny2Switch.addEventListener("change", () => {
            const load = funny2Switch.checked;
            chrome.storage.local.set({ loadFunny2: load }, () => {
                sendMessageToActiveTab({ action: "updateLoadFunny2", enabled: load }, (response) => {
                    // 【2026-08-14】关闭 funny2 需刷新页面才完全生效，明确提示用户
                    if (!load) {
                        alert(response && response.message === 'disabled_requires_reload'
                            ? "已关闭 funny2。已注入的界面脚本需刷新游戏页后才完全移除。"
                            : "已保存 funny2 开关（关闭后需刷新游戏页才完全生效）。");
                    }
                });
            });
        });
    }

    // ---- 导出配置：让游戏页面把它的 localStorage 数据打包成 JSON，然后下载 ----
    exportBtn.addEventListener("click", () => {
        // 向游戏页面要数据
        sendMessageToActiveTab({ action: "GM_export" }, (response) => {
            if (!response || !response.success) {
                // 【2026-08-15】区分"页面未就绪"和"导出过程出错"，提示更明确
                alert(!response
                    ? "导出失败：请先打开游戏页面（当前标签页没有可导出的插件数据）。"
                    : ("导出失败：" + (response.error || "未知错误")));
                return;
            }

            // 【2026-08-14 安全提示】备份里含一键登录账号数据（可解出密码）→ 导出前警示
            if (response.hasAccountData) {
                const ok = confirm("⚠️ 注意：备份文件中包含【一键登录】保存的账号数据（密码为可还原的编码，非真正加密）！\n\n请妥善保管此文件，切勿发给他人或在公共电脑留存。\n\n仍要导出吗？");
                if (!ok) return;
            }

            // 数据是字符串 → 转成 Blob（二进制数据块）→ 生成一个临时下载链接
            let blobUrl = response.data;
            blobUrl = new Blob([blobUrl], { type: "application/json" });
            blobUrl = URL.createObjectURL(blobUrl);

            // 模拟点击 <a download> 触发浏览器下载
            const link = document.createElement("a");
            // 文件名带时间戳，方便区分：wsmud_data_2026-08-08T15-53-01.json
            const filename = "wsmud_data_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".json";
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);  // 用完释放临时链接
        });
    });

    // ---- 导入配置：点击"导入"按钮 = 模拟点击隐藏的文件选择框 ----
    importBtn.addEventListener("click", () => {
        importInput.click();
    });

    // ---- 用户选好文件后：读取文件内容，发给游戏页面写回 localStorage ----
    importInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;  // 文件内容（JSON 字符串）
                const doImport = (force) => {
                    // 【2026-08-15】统一走 sendMessageToActiveTab（带 lastError 处理）
                    sendMessageToActiveTab({ action: "GM_import", data: text, force }, (response) => {
                        if (response && response.success) {
                            alert("数据导入成功！");
                        } else if (response && response.requiresConfirm) {
                            // 【2026-08-14 安全警示】配置含可执行/自动操作项，确认来源后再导入
                            const ok = confirm("⚠️ 该配置文件包含【可执行/自动操作】的项目（如：登录后执行命令、自命令、触发器、定时任务、扩展脚本等）。\n\n导入后这些项目会随配置生效——请确认这份配置来自你信任的来源。\n\n仍要导入吗？");
                            if (ok) doImport(true);
                        } else {
                            alert(!response
                                ? "导入失败：请先打开游戏页面（当前标签页没有可导入的插件数据）。"
                                : ("导入失败：" + (response.error || "未知错误")));
                        }
                    });
                };
                doImport(false);
            } catch (err) {
                alert("JSON 格式错误：" + err.message);
            }
        };
        reader.readAsText(file);  // 以文本方式读取文件
    });
});
