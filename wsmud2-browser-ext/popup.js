// popup.js
// 弹出页面脚本：控制扩展启停、funny2 加载开关，以及导入/导出本地数据。

document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById("toggleSwitch");
    const statusEl = document.getElementById("status");
    const funny2Switch = document.getElementById("funny2Switch");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const importInput = document.getElementById("importInput");

    // 根据启用状态更新底部状态文本
    function updateStatusText(enabled) {
        if (enabled) {
            statusEl.textContent = "启用中";
            statusEl.className = "enabled";
        } else {
            statusEl.textContent = "已禁用";
            statusEl.className = "disabled";
        }
    }

    // 向当前激活的标签页发送消息
    function sendMessageToActiveTab(message, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message, callback);
            }
        });
    }

    // 初始化：从 storage 读取开关状态
    chrome.storage.local.get(["extensionEnabled", "loadFunny2"], (result) => {
        result = result || {};
        const enabled = result.extensionEnabled !== false;
        const loadFunny2 = result.loadFunny2 === undefined ? true : !!result.loadFunny2;

        toggleSwitch.checked = enabled;
        updateStatusText(enabled);

        if (funny2Switch) {
            funny2Switch.checked = loadFunny2;
        }
    });

    // 插件总开关
    toggleSwitch.addEventListener("change", () => {
        const enabled = toggleSwitch.checked;
        chrome.storage.local.set({ extensionEnabled: enabled }, () => {
            updateStatusText(enabled);
            sendMessageToActiveTab({ action: "updateExtensionStatus", enabled });
        });
    });

    // funny2 加载开关
    if (funny2Switch) {
        funny2Switch.addEventListener("change", () => {
            const load = funny2Switch.checked;
            chrome.storage.local.set({ loadFunny2: load }, () => {
                sendMessageToActiveTab({ action: "updateLoadFunny2", enabled: load });
            });
        });
    }

    // 导出配置：从页面脚本收集 localStorage 数据并下载为 JSON 文件
    exportBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "GM_export" }, (response) => {
                if (!response || !response.success) {
                    alert("导出失败：" + (response?.error || "未知错误"));
                    return;
                }

                // 注意：blobUrl 变量按原始流程从字符串 -> Blob -> ObjectURL 逐步复用
                let blobUrl = response.data;
                blobUrl = new Blob([blobUrl], { type: "application/json" });
                blobUrl = URL.createObjectURL(blobUrl);

                const link = document.createElement("a");
                const filename = "wsmud_data_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".json";
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            });
        });
    });

    // 导入配置：触发隐藏的文件选择框
    importBtn.addEventListener("click", () => {
        importInput.click();
    });

    importInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                // 7.3 安全加固：检查导入数据是否包含可执行代码
                const dangerousPatterns = ['eval(', 'new Function(', 'setTimeout(', 'setInterval('];
                const hasDangerousCode = dangerousPatterns.some(p => text.indexOf(p) >= 0);
                if (hasDangerousCode) {
                    if (!confirm('导入的配置文件中检测到可能包含可执行代码（eval、new Function 等），\n是否确认导入？请确保来源可信。')) {
                        return;
                    }
                }
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "GM_import", data: text }, (response) => {
                        if (response && response.success) {
                            alert("数据导入成功！");
                        } else {
                            alert("导入失败：" + (response?.error || "未知错误"));
                        }
                    });
                });
            } catch (err) {
                alert("JSON 格式错误：" + err.message);
            }
        };
        reader.readAsText(file);
    });

    // 3.4 查询存储空间使用情况
    function updateStorageUsage() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: "getStorageUsage" }, (response) => {
                if (response && response.usage) {
                    var usage = response.usage;
                    var totalKB = usage.totalBytes / 1024;
                    var maxBytes = 5 * 1024 * 1024;
                    var percent = Math.min((usage.totalBytes / maxBytes) * 100, 100);
                    document.getElementById("storageUsage").textContent = totalKB.toFixed(0) + 'KB / 5MB（' + usage.keyCount + '个键）';
                    var bar = document.getElementById("storageBar");
                    bar.style.width = percent + '%';
                    bar.className = 'storage-bar-fill';
                    if (percent > 80) bar.classList.add('danger');
                    else if (percent > 60) bar.classList.add('warning');
                }
            });
        });
    }
    updateStorageUsage();
});
