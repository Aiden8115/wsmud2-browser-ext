// ============================================================
// message-display.js —— 游戏日志输出
// ------------------------------------------------------------
//   messageAppend  往游戏消息区追加一条文字（支持颜色标签 <hic>/<hiy> 等）
//   messageClear   清空消息区
//   imgShow        显示图片消息
//   sx_array       门派首席信息
// 想改日志的颜色、格式 → 在本文件搜索。
// ============================================================
// message-display.js
// Message rendering: image/text/append/clear
'use strict';


function textBecomeImg(text, fontsize, fontcolor) {
    var canvas = document.createElement('canvas');
    //小于32字加1  小于60字加2  小于80字加4    小于100字加6
    var $buHeight = 0;
    if (fontsize <= 32) { $buHeight = 1; }
    else if (fontsize > 32 && fontsize <= 60) { $buHeight = 2; }
    else if (fontsize > 60 && fontsize <= 80) { $buHeight = 4; }
    else if (fontsize > 80 && fontsize <= 100) { $buHeight = 6; }
    else if (fontsize > 100) { $buHeight = 10; }

    //对于g j 等有时会有遮挡，这里增加一些高度
    canvas.height = fontsize + $buHeight;
    var context = canvas.getContext('2d');

    // 擦除(0,0)位置大小为200x200的矩形，擦除的意思是把该区域变为透明
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = fontcolor;
    context.font = fontsize + "px KaiTi";

    //top（顶部对齐） hanging（悬挂） middle（中间对齐） bottom（底部对齐） alphabetic是默认值
    context.textBaseline = 'middle';
    context.fillText(text, 0, fontsize / 2)

    canvas.width = context.measureText(text).width;
    context.fillStyle = fontcolor;
    context.font = fontsize + "px KaiTi";
    context.textBaseline = 'middle';
    context.fillText(text, 0, fontsize / 2)

    var dataUrl = canvas.toDataURL('image/png');//注意这里背景透明的话，需要使用png
    return dataUrl;
}
function messageClear() {
    $(".WG_log pre").html("");
    // 【2026-08-11 修复】清空全部批量队列：避免残留排队消息在弹窗打开/清空日志后混入（弹窗用 .WG_log pre 作宿主）
    _msgQ['2'] = [];
    _msgQ['1'] = [];
    _msgQ['0'] = [];
}
var log_line = 0;
var log_log_line = 0;

function textShow(text) {
    imgShow(textBecomeImg(text, 90, 'red'))
}
function imgShow(url, t = 2000) {

    $('.container > .content-message').css('background', 'url(' + url + ') no-repeat center center')
    setTimeout(() => {
        $('.container > .content-message').css('background', '')
    }, t);
}
// 【2026-08-11 渲染性能】批量追加：同一微任务内的多条消息合并为一次 DOM 插入（原生 insertAdjacentHTML）
// 游戏消息密集（战斗/刷屏）时避免每消息一次 jQuery append 触发频繁重排；滚动跟随在 flush 时执行一次
var _msgQ = {};          // area -> html 数组
var _msgTick = null;
function _flushMsgQ() {
    _msgTick = null;
    for (var a in _msgQ) {
        var arr = _msgQ[a];
        if (!arr.length) continue;
        var html = arr.join('');
        arr.length = 0;
        var pre = a === '2' ? document.querySelector('.WG_log pre')
            : a === '1' ? document.querySelector('.content-message pre')
            : document.querySelector('.WG_log_log pre');
        if (pre) pre.insertAdjacentHTML('beforeend', html);
    }
    // 保持原行为：右侧日志区跟随最新消息滚动到底
    var p2 = document.querySelector('.WG_log_log pre');
    if (p2) p2.scrollTop = 99999;
    // 【2026-08-11 超长保护】批量路径追加后裁剪检查
    _trimLogIfNeeded();
}
function _queueAppend(area, html) {
    if (!_msgQ[area]) _msgQ[area] = [];
    _msgQ[area].push(html);
    if (!_msgTick) _msgTick = setTimeout(_flushMsgQ, 0);
}

// 【2026-08-11 超长保护】日志超过阈值时裁剪最旧行——不恢复自动清空（用户要求手动清），
// 仅防止挂机十几开 + 刷屏时 .WG_log_log pre 的 DOM 无限膨胀拖垮浏览器
var _LOG_MAX = 8000;      // 超过此行数触发裁剪
var _LOG_KEEP = 1000;     // 裁剪后至少保留的行数
var _LOG_CUT = 2000;      // 每次裁剪行数
function _trimLogIfNeeded() {
    if (log_log_line <= _LOG_MAX) return;
    var p3 = document.querySelector('.WG_log_log pre');
    if (!p3) return;
    var spans = p3.querySelectorAll('span');
    if (spans.length <= _LOG_KEEP) return;
    var cut = Math.min(_LOG_CUT, spans.length - _LOG_KEEP);
    for (var i = 0; i < cut; i++) spans[i].remove();
    log_log_line -= cut;
    try { ExtLog.warn('[日志] 超过 ' + _LOG_MAX + ' 行，已自动裁剪最旧 ' + cut + ' 行保护性能；仍可点标题栏「清除日志」手动清空'); } catch (e) { }
}

function messageAppend(m, area = 0, id = null, sync = false) {
    var ap = m + "\n";
    // 【2026-08-11 修复】sync=true 时同步插入（Raid/Trigger 弹窗内容依赖 append 后立即绑定事件/Vue 挂载，
    // 若走批量异步队列会错过绑定 → 弹窗按钮全部失效）；普通游戏消息继续走批量渲染（性能优化）
    if (area === 2) {
        if (id !== null || sync) { 
            var target = $(".WG_log pre #" + id);
            if (target.length > 0) {
                target.remove();
            } 
            $(".WG_log pre").append('<span id="' + id + '">' + ap + '</span>');
        } else {
            _queueAppend('2', ap);
        }
    } else if (area === 1) {
        if (id !== null || sync) { 
            var target = $(".content-message pre #" + id);
            if (target.length > 0) {
                target.remove();
            } 
            $(".content-message pre").append('<span id="' + id + '">' + ap + '</span>');
        } else {
            _queueAppend('1', ap);
        }
    } else {
        var now = new Date();
        var ts = '[' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0') + '] ';
        if (id !== null) {
            var target = $(".WG_log_log pre #" + id);
            if (target.length > 0) {
                target.remove();
                log_log_line--;
            } 
            // 【2026-08-11 26.1.10】取消条数过多自动清空（原 100 行上限），改由标题栏「清除日志」按钮手动清
            $(".WG_log_log pre").append('<span id="' + id + '">' + ts + ap + '</span>');
            log_log_line++;
            if ($(".WG_log_log pre")[0]) $(".WG_log_log pre")[0].scrollTop = 99999;
            
        } else if (sync) {
            // 【2026-08-11 修复】同步路径：弹窗等需要立即可见的场景
            $(".WG_log_log pre").append('<span>' + ts + ap + '</span>');
            log_log_line++;
            if ($(".WG_log_log pre")[0]) $(".WG_log_log pre")[0].scrollTop = 99999;
            _trimLogIfNeeded();
        } else {
            // 【2026-08-11 26.1.10】取消条数过多自动清空（原 100 行上限）
            log_log_line++;
            _queueAppend('0', '<span>' + ts + ap + '</span>');
        }
    }
    return id;
}
var sx_array = {
    '武当': {
        "place": "武当派-三清殿",
        "npc": "武当派第二代弟子 武当首侠 宋远桥",
        "sxplace": "武当派-太子岩",
        "sx": "首席弟子"
    },
    '华山': {
        "place": "华山派-镇岳宫",
        "npc": "市井豪杰 高根明",
        "sxplace": "华山派-练武场",
        "sx": "首席弟子"
    },
    '少林': {
        "place": "少林派-天王殿",
        "npc": "少林寺第三十九代弟子 道觉禅师",
        "sxplace": "少林派-练武场",
        "sx": "大师兄"
    },
    '逍遥': {
        "place": "逍遥派-青草坪",
        "npc": "聪辩老人 苏星河",
        "sxplace": "-jh fam 5 start;go west",
        "sx": "首席弟子"
    },
    '丐帮': {
        "place": "丐帮-树洞下",
        "npc": "丐帮七袋弟子 左全",
        "sxplace": "丐帮-破庙密室",
        "sx": "首席弟子"
    },
    '峨眉': {
        "place": "峨眉派-庙门",
        "npc": "峨眉派第五代弟子 苏梦清",
        "sxplace": "峨眉派-广场",
        "sx": "大师姐"
    },
    '武馆': {
        "place": "扬州城-扬州武馆",
        "npc": "武馆教习",
        "sxplace": "扬州城-扬州武馆"
    },
    '杀手楼': {
        "place": "杀手楼-大厅",
        "npc": "杀手教习 何小二",
        "sxplace": "杀手楼-练功房",
        "sx": "金牌杀手"
    },
};
