// GM_API.js
// 模拟油猴（Greasemonkey/Tampermonkey）的 GM_* 系列 API，
// 供依赖 GM 接口的用户脚本在浏览器扩展环境下运行。

let unsafeWindow = window;
let GM_info = {};
var httpRequest = new XMLHttpRequest();

// 添加 <style> 标签注入自定义 CSS
function GM_addStyle(css) {
    try {
        const style = document.createElement("style");
        style.textContent = css;
        (document.head || document.body || document.documentElement || document).appendChild(style);
    } catch (e) {
        console.log("GM_addStyle: " + e);
    }
}

// 写入一个值到 localStorage（JSON 序列化）
function GM_setValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.log("GM_setValue: " + e);
    }
}

// 从 localStorage 读取一个值并反序列化
// 注意：当存储值为 falsy（包括空字符串、0 等）时，会返回 defaultValue
function GM_getValue(key, defaultValue) {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.log("GM_getValue: " + e);
        return defaultValue;
    }
}

// 列出所有 localStorage 的 key
function GM_listValues() {
    const length = localStorage.length;
    const keys = [];
    for (let i = 0; i < length; i++) {
        keys.push(localStorage.key(i));
    }
    return keys;
}

// 删除一个 localStorage 键
function GM_deleteValue(key) {
    localStorage.removeItem(key);
}

// 复制文本到剪贴板（兼容旧 API execCommand）
function GM_setClipboard(text) {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.value = text;
    input.focus();
    input.select();
    try {
        document.execCommand("copy");
    } catch (e) {
        console.log("GM_setClipboard: " + e.message);
    }
    input.blur();
    document.body.removeChild(input);
}

// 导出所有 GM 数据为 JSON 字符串
// 若存在 android.exportToFile 接口（安卓壳），同时调用其写入文件
function GM_export(filename = "wsmud_data.json") {
    try {
        const keys = GM_listValues();
        const data = {};
        for (let i = 0; i < keys.length; i++) {
            data[keys[i]] = GM_getValue(keys[i]);
        }
        const json = JSON.stringify(data, null, 2);
        console.log(json);
        if (typeof android !== "undefined" && android.exportToFile) {
            android.exportToFile(json, filename);
        }
        return json;
    } catch (e) {
        console.log("GM_export: " + e.message);
        return null;
    }
}

// 导入 JSON 字符串或对象到 GM 存储
function GM_import(data) {
    try {
        const obj = typeof data === "string" ? JSON.parse(data) : data;
        for (const key in obj) {
            GM_setValue(key, obj[key]);
        }
        console.log("数据导入成功");
        return true;
    } catch (e) {
        console.log("GM_import: " + e.message);
        return false;
    }
}

// 导出为带时间戳的文件名
function GM_exportToFile() {
    return GM_export("wsmud_data_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".json");
}

// 异步拉取远程版本信息；初始 script 为空对象，请求完成后覆盖
// 注：保持原有的 open -> send -> 赋值 onreadystatechange 顺序，异步请求下行为一致
httpRequest.open("GET", "http://wsmud.ii74.com/S/version", true);
httpRequest.send();
httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        const text = httpRequest.responseText;
        console.log(text);
        GM_info.script = JSON.parse(text);
    }
};
GM_info.script = { version: "" };
