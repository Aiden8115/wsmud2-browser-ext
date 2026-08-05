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
function messageAppend(m, area = 0, id = null) {
    var ap = m + "\n";
    if (area === 2) {
        if (id !== null) { 
            var target = $(".WG_log pre #" + id);
            if (target.length > 0) {
                target.remove();
            } 
            $(".WG_log pre").append('<span id="' + id + '">' + ap + '</span>');
        } else {
            $('.WG_log pre').append(ap)
        }
    } else if (area === 1) {
        if (id !== null) { 
            var target = $(".content-message pre #" + id);
            if (target.length > 0) {
                target.remove();
            } 
            $(".content-message pre").append('<span id="' + id + '">' + ap + '</span>');
        } else {
            $('.content-message pre').append(ap)
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
            100 < log_log_line && (log_log_line = 0, $(".WG_log_log pre").empty());
            $(".WG_log_log pre").append('<span id="' + id + '">' + ts + ap + '</span>');
            log_log_line++;
            if ($(".WG_log_log pre")[0]) $(".WG_log_log pre")[0].scrollTop = 99999;
            
        } else {
            100 < log_log_line && (log_log_line = 0, $(".WG_log_log pre").empty());
            $(".WG_log_log pre").append('<span>' + ts + ap + '</span>');
            log_log_line++;
            if ($(".WG_log_log pre")[0]) $(".WG_log_log pre")[0].scrollTop = 99999;
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
