// ============================================================
// ws.js —— 游戏客户端核心（原版游戏脚本改造而来，最大文件之一）
// ------------------------------------------------------------
// 这个文件接管了游戏"客户端"的大部分工作：
//   MAP          地图：房间绘制、方向出口、换房间缓存
//   Process      消息分发总表：服务器每条消息按 type 找到对应函数处理
//   Combat       战斗面板：血条蓝条、招式 CD 动画、伤害显示
//   MessageQueue 聊天消息滚动队列（自动翻页、回到底部）
//   WSClient     WebSocket 连接封装；ConnectServer/CloseServer 连接与断开
//   SendCommand  发送游戏指令（断线时缓存并自动重连）
//   ReceiveData/ReceiveMessage 收消息总入口（JSON 走 ReceiveData，文本走 ReceiveMessage）
//   API/storageUtil/Util/Warn/ToolAction/Touch 各种小工具
//
// 主要消息类型（type）：room 房间、exits 出口、items 物品、map 地图、
//   dialog 对话框、sc 状态、combat 战斗、die 死亡、login 登录、
//   perform 出招、msg 消息、status 状态条 等 30 多种。
//
// 想改：地图绘制、聊天显示、状态条、死亡提示等 → 在本文件搜索对应函数。
// ============================================================
'use strict';

const MAP = {
    'DIRS': ["west", "north", "south", "east", "northwest", "southwest", "northeast", "southeast", 'down', 'up', 'westdown', "northdown", "southdown", 'eastdown', "westup", "northup", 'southup', "eastup", 'enter', "out"],
    'REG': /<(\w+)>(.+)<\/\w+>/,
    'CreateExitsMap': function(_t268, _t269, _t270) {
        var _t272 = _t270.split('-');
        if (_t272.length > 1)
            _t270 = _t272[_t272.length - 1];
        _t270 = _t270.replace(/\(.*?\)/, '');
        var _n35 = 30
          , _n36 = 70
          , _n37 = 60
          , _n38 = 20
          , _t273 = _n35 + 10
          , _t274 = (_t269 - _n37) / 2
          , _n39 = 10
          , _o3 = {};
        if (_t268.north && _t268.up) {
            _t268.north_2 = _t268.up;
            delete _t268.up;
        }
        if (_t268.south && _t268.down) {
            _t268.south_2 = _t268.down;
            delete _t268.down;
        }
        for (var _t275 in _t268) {
            if (_t275.indexOf("south") > -1 || _t275 === "down" || _t275 === "out")
                _o3.s = true;
            else
                (_t275.indexOf("north") > -1 || _t275 === 'up' || _t275 === "enter") && (_o3.n = true);
        }
        if (_o3.s)
            _t273 += _n35;
        if (_o3.n) {
            _t273 += _n35;
            _n39 += _n35;
        }
        var _a17 = [];
        _a17.push("<svg style=\"margin-left:-2em\" height=\"" + _t273 + '\x22\x20width=\x22' + _t269 + '\x22>');
        _a17.push("<rect x=\"" + _t274 + "\" y=\"" + _n39 + ("\"  fill=\"dimgrey\" stroke-width=\"1\" stroke=\"gray\" "));
        _a17.push('width=\x22' + _n37 + "\" height=\"" + _n38 + "\"></rect>");
        _a17.push(" <text x=\"" + (_t274 + 30) + "\" y=\"" + (_n39 + 14) + ("\"  text-anchor=\"middle\" style=\"font-size:12px;\" "));
        this.pushName(_a17, _t270, true);
        for (_t275 in _t268) {
            var _t276, _t277, _t278;
            switch (_t275) {
            case "west":
            case "westup":
            case "westdown":
                _t276 = [_t274 - (_n36 - _n37), _n39 + _n38 / 2];
                _t277 = [_t274, _n39 + _n38 / 2];
                _t278 = [_t274 - _n36, _n39];
                break;
            case "east":
            case "eastup":
            case 'eastdown':
                _t276 = [_t274 + _n37, _n39 + _n38 / 2];
                _t277 = [_t274 + _n36, _n39 + _n38 / 2];
                _t278 = [_t274 + _n36, _n39];
                break;
            case "south":
            case 'southup':
            case "southdown":
            case "down":
                _t276 = [_t274 + _n37 / 2, _n39 + _n38];
                _t277 = [_t274 + _n37 / 2, _n39 + _n35];
                _t278 = [_t274, _n39 + _n35];
                break;
            case "north":
            case "northup":
            case 'northdown':
            case 'up':
                _t276 = [_t274 + _n37 / 2, _n39];
                _t277 = [_t274 + _n37 / 2, _n39 - (_n35 - _n38)];
                _t278 = [_t274, _n39 - _n35];
                break;
            case 'northwest':
                _t276 = [_t274 - _n36 + _n37, _n39 - _n35 + _n38];
                _t277 = [_t274, _n39];
                _t278 = [_t274 - _n36, _n39 - _n35];
                break;
            case "northeast":
            case "north_2":
            case "enter":
                _t276 = [_t274 + _n36, _n39 - _n35 + _n38];
                _t277 = [_t274 + _n37, _n39];
                _t278 = [_t274 + _n36, _n39 - _n35];
                break;
            case "southeast":
            case 'south_2':
                _t276 = [_t274 + _n36, _n39 + _n35];
                _t277 = [_t274 + _n37, _n39 + _n38];
                _t278 = [_t274 + _n36, _n39 + _n35];
                break;
            case "southwest":
            case "out":
                _t276 = [_t274 - _n36 + _n37, _n39 + _n35];
                _t277 = [_t274, _n39 + _n38];
                _t278 = [_t274 - _n36, _n39 + _n35];
                break;
            }
            var _t279 = _t268[_t275];
            if (_t275 === "south_2")
                _t275 = 'down';
            else {
                if (_t275 === 'north_2')
                    _t275 = 'up';
            }
            _a17.push('<rect\x20x=\x22' + _t278[0] + "\" y=\"" + _t278[1] + '\x22\x20dir=\x22' + _t275 + ("\" fill=\"#232323\" stroke-width=\"1\" stroke=\"gray\" "));
            _a17.push('width=\x22' + _n37 + '\x22\x20height=\x22' + _n38 + '\x22></rect>');
            _a17.push(" <text x=\"" + (_t278[0] + 30) + '\x22\x20y=\x22' + (_t278[1] + 14) + "\" dir=\"" + _t275 + ("\" text-anchor=\"middle\" style=\"font-size:12px;\""));
            this.pushName(_a17, _t279, false);
            if (_t276) {
                _a17.push("<line  stroke=\"gray\" ");
                _a17.push('\x20x1=\x27' + _t276[0] + "' y1='" + _t276[1] + "' x2='" + _t277[0] + "' y2='" + _t277[1] + '\x27');
                if (_t275.indexOf('up') > -1 || _t275.indexOf("down") > -1) {
                    _a17.push(" stroke-dasharray='5,5'");
                    _a17.push(" stroke-width='10'");
                } else {
                    _a17.push(" stroke-width='1'");
                }
                _a17.push("></line >");
            }
        }
        _a17.push("</svg>");
        return _a17.join('');
    },
    'colors': {
        'hig': "#00FF00",
        'hir': "#FF0000",
        'him': "#FF00FF",
        'hic': '#00FFFF',
        'hiy': "#FFFF00",
        'wht': "#C0C0C0",
        'mag': '#800080',
        'red': "#800000",
        'hiw': "#FFFFFF",
        'gre': "#008000",
        'blu': '#000080',
        'hib': "#0000FF"
    },
    'GetColor': function(_t280, _t281) {
        return this.colors[_t280.toLowerCase()] || "dimgrey";
    },
    'ShowMap': function(_t283, _t284) {
        if (!_t283)
            return;
        this.CurMapID = _t284;
        var _a18 = []
          , _t286 = MAP.getMinPos(_t283)
          , _n40 = 0 - _t286.minX
          , _n41 = 0 - _t286.minY
          , _n42 = 50
          , _n43 = 100
          , _n44 = 60
          , _n45 = 20
          , _J47 = $('.map-panel');
        MAP.MapWidth = (_t286.maxX + _n40 + 1) * _n43;
        let _n46 = 0
        let _t287 = _J47.width();
        if (MAP.MapWidth < _t287) {
            _n46 = (_t287 - MAP.MapWidth) / 2;
            MAP.MapWidth = _t287;
        }
        MAP.MapHeight = (_t286.maxY + _n41 + 1) * _n42;
        if (MAP.MapWidth < 0 || MAP.MapHeight < 0)
            return;
        var _t288 = /^([a-z]{1,2})(\d)?([d|l])?$/;
        _a18.push("<svg class=\"map\" height=\"" + MAP.MapHeight + "\" width=\"" + MAP.MapWidth + '\x22>');
        for (var _n47 = 0; _n47 < _t283.length; _n47++) {
            _a18.push("<rect class='map-room' rm='" + _t283[_n47].id + '\x27\x20');
            var _t289 = (_t283[_n47].p[0] + _n40) * _n43 + _n46 + 20
              , _t290 = (_t283[_n47].p[1] + _n41) * _n42 + 20;
            _a18.push('x=\x27' + _t289 + '\x27\x20y=\x27' + _t290 + '\x27');
            _a18.push(" fill=\"dimgrey\" stroke-width=\"1\" stroke=\"gray\" ");
            _a18.push('width=\x22' + _n44 + '\x22\x20height=\x22' + _n45 + "\"></rect>");
            var _t291 = _t283[_n47].exits;
            if (_t291)
                for (var _n48 = 0; _n48 < _t291.length; _n48++) {
                    _t288.test(_t291[_n48]);
                    var _t292 = RegExp.$2 ? parseInt(RegExp.$2) : 1, _t293, _t294;
                    switch (RegExp.$1) {
                    case 'w':
                        _t293 = [_t289 - (_n43 - _n44) - _n43 * (_t292 - 1), _t290 + _n45 / 2];
                        _t294 = [_t289, _t290 + _n45 / 2];
                        break;
                    case 'e':
                        _t293 = [_t289 + _n44, _t290 + _n45 / 2];
                        _t294 = [_t289 + _n43 + _n43 * (_t292 - 1), _t290 + _n45 / 2];
                        break;
                    case 's':
                        _t293 = [_t289 + _n44 / 2, _t290 + _n45];
                        _t294 = [_t289 + _n44 / 2, _t290 + _n42 + _n42 * (_t292 - 1)];
                        break;
                    case 'n':
                        _t293 = [_t289 + _n44 / 2, _t290];
                        _t294 = [_t289 + _n44 / 2, _t290 - (_n42 - _n45) - _n42 * (_t292 - 1)];
                        break;
                    case 'nw':
                        _t293 = [_t289 - _t292 * _n43 + _n44, _t290 - _t292 * _n42 + _n45];
                        _t294 = [_t289, _t290];
                        break;
                    case 'ne':
                        _t293 = [_t289 + _n44, _t290];
                        _t294 = [_t289 + _t292 * _n43, _t290 - (_n42 - _n45)];
                        break;
                    case 'se':
                        _t293 = [_t289 + _n44, _t290 + _n45];
                        _t294 = [_t289 + _t292 * _n43, _t290 + _t292 * _n42];
                        break;
                    case 'sw':
                        _t293 = [_t289, _t290 + _n45];
                        _t294 = [_t289 - (_n43 - _n44) - _n43 * (_t292 - 1), _t290 + _t292 * _n42];
                        break;
                    }
                    if (_t293) {
                        _a18.push("<line  stroke=\"gray\" ");
                        _a18.push('\x20x1=\x27' + _t293[0] + '\x27\x20y1=\x27' + _t293[1] + "' x2='" + _t294[0] + "' y2='" + _t294[1] + '\x27');
                        if (RegExp.$3) {
                            _a18.push(" stroke-dasharray='5,5'");
                        }
                        if (RegExp.$3 === 'l') {
                            _a18.push(" stroke-width='10'");
                        } else {
                            _a18.push(" stroke-width='1'");
                        }
                        _a18.push('></line\x20>');
                    }
                }
            _a18.push(" <text x=\"" + (_t289 + 30) + "\" y=\"" + (_t290 + 14) + ("\" text-anchor=\"middle\" style=\"font-size:12px;\" "));
            this.pushName(_a18, _t283[_n47].n, true);
        }
        _a18.push('</svg>');
        _J47.html(_a18.join(''));
        this.MapContent = $("svg");
        if (!this.IsShow) {
            this.IsShow = true;
            $(".map-panel").slideDown("fast");
        }
        this.SetRoom(this.Room);
    },
    'pushName': function(_t295, _t296, _t297) {
        var _t299 = this.REG.exec(_t296);
        if (_t299) {
            _t295.push("  fill=\"" + this.GetColor(_t299[1]) + '\x22');
            _t295.push('>' + _t299[2] + "</text>");
        } else {
            _t295.push(" fill=\"");
            _t295.push(_t297 ? "#232323" : 'dimgrey');
            _t295.push('\x22>' + _t296 + "</text>");
        }
    },
    'getMinPos': function(_t300) {
        var _o4 = {
            'minX': 99999,
            'minY': 99999,
            'maxX': 0,
            'maxY': 0
        };
        for (var _n49 = 0; _n49 < _t300.length; _n49++) {
            var _t302 = _t300[_n49].p[0]
              , _t303 = _t300[_n49].p[1];
            _t302 < _o4.minX && (_o4.minX = _t302);
            if (_t302 > _o4.maxX)
                _o4.maxX = _t302;
            _t303 < _o4.minY && (_o4.minY = _t303);
            if (_t303 > _o4.maxY)
                _o4.maxY = _t303;
        }
        return _o4;
    },
    'State': 0,
    'ZoomState': 100,
    'Buffer': {},
    'HideItem': function() {
        if (this.State === 0) {
            this.State = 1;
            $(".room_desc").slideUp("fast");
        }
    },
    'ShowItem': function() {
        if (this.State === 1) {
            this.State = 0;
            $(".room_desc").slideDown("fast");
        }
    },
    'ZoomIn': function(_t306) {
        if (_t306.zoom)
            return;
        MAP.ZoomState = MAP.ZoomState / _t306.zoom;
        if (MAP.ZoomState > 200)
            MAP.ZoomState = 200;
        if (MAP.ZoomState < 80)
            MAP.ZoomState = 80;
        var _t308 = MAP.MapWidth * MAP.ZoomState / 100
          , _t309 = MAP.MapHeight * MAP.ZoomState / 100;
        this.MapContent.attr("viewBox", "0,0," + _t308 + ',' + _t309);
    },
    'SetRoom': function(_t310) {
        this.Room = _t310;
        if (!this.IsShow)
            return;
        if (this.CurRoomItem) {
            this.CurRoomItem.attr("fill", "dimgrey");
            this.CurRoomItem.attr("stroke", "gray");
        }
        this.CurRoomItem = null;
        var _t312 = this.MapContent.find("rect[rm='" + _t310.path + '\x27]');
        if (_t312.length) {
            this.CurRoomItem = _t312;
            this.CurRoomItem.attr('fill', "#bebebe");
            this.CurRoomItem.attr("stroke", "gray");
            var _a19 = [_t312.attr('x'), _t312.attr('y'), _t312.attr("width"), _t312.attr("height")]
              , _t313 = document.querySelector(".map-panel")
              , _t314 = _t313.offsetHeight
              , _t315 = _t313.offsetWidth;
            _t313.scrollTop = _a19[1] - (_t314 - _a19[3]) / 2;
            _t313.scrollLeft = _a19[0] - (_t315 - _a19[2]) / 2;
        }
        var _t316 = _t310.path.substr(0, _t310.path.lastIndexOf('/'));
        if (_t316 !== this.CurMapID) {
            if (MAP.Buffer[_t316])
                return MAP.ShowMap(MAP.Buffer[_t316], _t316);
            SendCommand("map " + _t316);
        }
    },
    'LoadMap': function() {
        if (this.IsShow) {
            this.IsShow = false;
            $(".map-panel").slideUp("fast");
            return;
        }
        var _t318 = MAP.Room;
        if (!_t318)
            return;
        var _t319 = _t318.path.substr(0, _t318.path.lastIndexOf('/'));
        if (_t319 === this.CurMapID) {
            $(".map-panel").slideDown("fast");
            this.IsShow = true;
            return;
        }
        if (MAP.Buffer[_t319])
            return MAP.ShowMap(MAP.Buffer[_t319], _t319);
        SendCommand("map " + _t319);
    },
    'SetMapBuffer': function(_t320, _t321) {
        MAP.Buffer[_t321] = _t320;
    },
    'UpdateMap': function(_t323, _t324) {
        var _t326 = MAP.Buffer[_t323];
        if (!_t326)
            return;
        if (!_t324.id) {
            MAP.Buffer[_t323] = null;
            if (this.CurMapID == _t323)
                this.CurMapID = null;
            return;
        }
        for (var _n50 = 0; _n50 < _t326.length; _n50++) {
            if (_t326[_n50].id == _t324.id) {
                _t326[_n50].n = _t324.n || _t326[_n50].n;
                _t326[_n50].p = _t324.p || _t326[_n50].p;
                _t326[_n50].exits = _t324.exits || _t326[_n50].exits;
                break;
            }
        }
        _t323 === this.CurMapID && MAP.ShowMap(_t326, _t323);
    }
};
const Process = {
    'itemsElement': null,
    'contentScroll': true,
    'message': null,
    'channel': null,
    'clear': function() {
        Dialog.pack.items = null;
        Dialog.skills.items = null;
        this.state(null);
    },
    'init': function() {
        Process.itemsElement = $(".room_items");
        this.message = MessageQueue.create($(".content-message"));
        this.ChannelElement = $(".channel");
        this.ChannelElement.on('click', Dialog.channel.show.bind(Dialog.channel));
        this.channel = MessageQueue.create(this.ChannelElement, 4, 200);
    },
    'startMoveMessage': function(_t100) {
        window.addEventListener("mousemove", Process.moveMessage);
        window.addEventListener("mouseup", Process.endMoveMessage);
        Process.mouseY = _t100.clientY;
    },
    'moveMessage': function(_t101) {
        let _t102 = Process.mouseY - _t101.clientY
          , _t103 = MessageContent[0]
          , _t104 = MessageContent.height()
          , _t105 = _t103.style.marginBottom;
        if (_t105)
            _t105 = parseInt(_t105.replace('px', ''));
        else
            _t105 = 0;
        _t105 = _t105 + _t102;
        if (_t105 < 0)
            _t105 = 0;
        else {
            if (_t105 > _t104 * 0.7)
                return;
        }
        _t103.style.marginBottom = _t105 + 'px';
        Process.mouseY = _t101.clientY;
        _t101.preventDefault();
    },
    'endMoveMessage': function() {
        window.removeEventListener("mousemove", Process.moveMessage);
        window.removeEventListener('mouseup', Process.endMoveMessage);
    },
    'regist': function(_t106) {
        if (_t106.result) {
            HideAndShow("#addrole_panel");
            $("#addrole_panel .input-error").html(_t106.result);
        }
    },
    'emote': function(_t107) {
        Process.emotes = _t107.items || 0;
        var _a3 = [];
        for (var _n10 = 0; _n10 < Process.emotes.length; _n10++) {
            _a3.push("<span>");
            _a3.push(Process.emotes[_n10]);
            _a3.push('</span>');
        }
        $(".channel-emotes").html(_a3.join(''));
    },
    'deleterole': function(_t108) {
        if (_t108.result) {
            var _J31 = $("#role_panel>ul>.content>.role-list>.role-item[roleid='" + _t108.id + '\x27]');
            _J31.remove();
            var _J32 = $("#role_panel>ul>.content>.role-list>.role-item");
            if (_J31.is(".select") && _J32.length)
                $(_J32[0]).addClass('select');
            else
                !_J32.length && LoginMethods.AddRole();
        } else
            Confirm.Show({
                'content': "<span class='input-error'>" + (_t108.message || "删除失败") + '</span>'
            });
    },
    'cross': function(_t109) {
        var _t110 = null;
        for (var _n11 = 0; _n11 < SERVERS.length; _n11++) {
            SERVERS[_n11].ID == _t109.sid && (_t110 = SERVERS[_n11]);
        }
        if (!_t110)
            return;
        GameClient.ChangeServer = true;
        GameClient.Close();
        Dialog.pack.items = null;
        if (_t109.cross_type == "duizhan") {
            Dialog.skills.items = null;
            Dialog.skills.isShow = false;
        }
        console.log("重新连接到", _t110.Name);
        if (!_t109.pid)
            Process.die({
                'relive': true
            });
        ConnectServer(_t110, _t109.pid);
    },
    'roles': function(_t111) {
        var _t112 = _t111.roles;
        if (!_t112.length)
            LoginMethods.AddRole();
        else {
            HideAndShow("#role_panel");
            var _a4 = [];
            for (var _n12 = 0; _n12 < _t112.length; _n12++) {
                _a4.push("<li class='role-item");
                if (_n12 === 0)
                    _a4.push(" select");
                _a4.push("' roleid='" + _t112[_n12].id + '\x27>');
                _a4.push(_t112[_n12].title);
                _a4.push("&nbsp;&nbsp;");
                _a4.push(_t112[_n12].name);
                _a4.push("</li>");
            }
            $(".role-list").html(_a4.join(''));
        }
    },
    'loginerror': function(_t113) {
        $('.container').hide();
        $(".login-content").show();
        ShowLoader("<strong>登陆失败：</strong>" + _t113.msg + '');
    },
    'login': function(_t114) {
        !Process.player && HideAndShow(".container");
        Process.player = _t114.id;
        Process.level = _t114.level;
        Setting.load(_t114.setting);
        if (LastCommand) {
            SendCommand(LastCommand);
            LastCommand = null;
        }
    },
    'levelup': function(_t115) {
        Process.level = _t115.level;
    },
    'selectItem': function(_t116) {
        if ($(_t116.target).is(".status-item")) {
            var _t117 = _t116.target.getAttribute('sid');
            let _J33 = $(_t116.target).closest(".room-item").attr('itemid');
            if (!_t117)
                return;
            if (_J33 === Process.player)
                return SendCommand("status " + _t117);
            return SendCommand("status " + _t117 + '\x20' + _J33);
        }
        var _J34 = $(this).attr("itemid");
        console.log(_J34);
        if (_J34) {
            if (_J34 === Process.player) {
                var _J35 = $(this).find(".item-name").html()
                  , _a5 = [{
                    'cmd': "look " + _J34,
                    'name': '查看'
                }, {
                    'cmd': "dazuo",
                    'name': '打坐'
                }, {
                    'cmd': 'liaoshang',
                    'name': '疗伤'
                }, {
                    'cmd': '#msg <hio>ID已获取：</hio><hiy>@id</hiy>',
                    'name': '查看ID'
                }];
                if (Dialog.team.items && Dialog.team.items.length) {
                    _a5.push({
                        'cmd': 'team\x20out',
                        'name': '退出队伍'
                    });
                    if (Dialog.team.isCap) {
                        _a5.push({
                            'cmd': 'team\x20dismiss',
                            'name': "解散队伍"
                        });
                        _a5.push({
                            'cmd': "team set",
                            'name': "更改分配方式"
                        });
                    }
                }
                Process.item({
                    'id': _J34,
                    'name': _J35,
                    'me': 1,
                    'desc': _J35,
                    'commands': _a5
                });
                return;
            }
            SendCommand("select " + _J34);
        }
    },
    'countwidth': function(_t118, _t119) {
        var _t120 = _t118 * 100 / _t119;
        if (_t120 < 0)
            _t120 = 0;
        if (_t120 > 100)
            _t120 = 100;
        return _t120;
    },
    'itemremove': function(_t121) {
        var _t122 = Combat.STATUS[_t121.id];
        if (_t122) {
            for (var _t123 in _t122.items) {
                clearInterval(_t122.items[_t123].handler);
            }
            var _t124 = _t122.elem.parent();
            if (_t124.next().is(".item-commands"))
                _t124.next().remove();
            _t124.remove();
            delete Combat.STATUS[_t121.id];
        }
        Process.cur_room.items.RemoveAt(_t125 => _t125.id === _t121.id);
    },
    'itemadd': function(_t126) {
        if (Setting.off_plist && _t126.p && _t126.id != Process.player)
            return;
        var _t127 = _t126, _t128;
        Setting.item_firstme && _t127.id == Process.player ? _t128 = $(Process.create_roomitem(_t127)).prependTo(Process.itemsElement) : _t128 = $(Process.create_roomitem(_t127)).appendTo(Process.itemsElement);
        if (Combat.STATUS[_t126.id])
            Process.itemremove(_t126);
        Combat.AppendStatusItem(_t127.id, _t128.find(".item-status-bar"), _t127.status);
        Process.cur_room.items.push(_t127);
    },
    'items': function(_t129) {
        Process.itemsElement.empty();
        Combat.STATUS = {};
        for (var _n13 = 0; _n13 < _t129.items.length; _n13++) {
            var _t130 = _t129.items[_n13];
            if (!_t130)
                continue;
            _t130.player = _t130.p;
            if (_t130.m) {
                _t130.type = '师父';
                _t130.master = 1;
            }
            if (_t130.f) {
                _t130.type = '随从';
                _t130.follower = 1;
            }
            if (_t130.l) {
                _t130.type = '商人';
                _t130.trader = 1;
            }
            if (Setting.off_plist && _t130.p && _t130.id != Process.player)
                continue;
            var _t131;
            Setting.item_firstme && _t130.id == Process.player ? _t131 = $(Process.create_roomitem(_t130)).prependTo(Process.itemsElement) : _t131 = $(Process.create_roomitem(_t130)).appendTo(Process.itemsElement);
            Combat.AppendStatusItem(_t130.id, _t131.find(".item-status-bar"), _t130.status);
        }
        if (!Process.cur_room)
            Process.cur_room = {};
        Process.cur_room.items = _t129.items;
    },
    'get_hpnum': function(_t132, _t133) {
        var _t134 = _t132 / _t133;
        if (_t134 > 0.8)
            return "<hiy>" + _t132 + "</hiy>";
        if (_t134 > 0.5)
            return "<yel>" + _t132 + "</yel>";
        if (_t134 > 0.2)
            return "<red>" + _t132 + "</red>";
        return "<hir>" + _t132 + "</hir>";
    },
    'create_roomitem': function(_t135) {
        var _a6 = [];
        _a6.push("<div class='room-item' itemid='" + _t135.id + '\x27>');
        if (_t135.max_hp) {
            _a6.push("<div class=\"item-status\"");
            if (!Combat.IsShow || Setting.off_hp) {
                _a6.push(" style=\"display:none;\"");
            }
            _a6.push('>');
            _a6.push("<div class=\"progress hp\"><div class=\"progress-bar\" max=\"" + _t135.max_hp + ("\"  style=\"width:") + Process.countwidth(_t135.hp, _t135.max_hp) + ("%\"></div></div>"));
            _a6.push("<div class=\"progress mp\"><div class=\"progress-bar\" max=\"" + _t135.max_mp + ("\"   style=\"width:") + Process.countwidth(_t135.mp, _t135.max_mp) + ("%\"></div></div>"));
            _a6.push("</div>");
        }
        _a6.push("<span class='item-status-bar'>");
        _a6.push("</span>");
        _a6.push("<span class='item-name'>");
        _a6.push(_t135.name);
        if (Setting.show_hpnum && _t135.max_hp) {
            _a6.push("<span class=\"progress-num\">[" + this.get_hpnum(_t135.hp, _t135.max_hp) + ("<nor>/</nor><hiy>") + _t135.max_hp + ("</hiy>]</span>"));
        }
        _a6.push('</span>');
        _a6.push("</div>");
        return _a6.join('');
    },
    'room': function(_t136) {
        $(".room_items").html('');
        $('.room-name').html(_t136.name);
        $(".room_desc").html(_t136.desc);
        Process.room_name = _t136.name;
        if (!Setting.keep_msg)
            Process.message.clear();
        else
            Setting.keep_msg && ReceiveMessage("你来到了" + _t136.name + '。');
        if (Process.room_path == _t136.path)
            return;
        Setting.show_roomitem && Process.searchItems(_t136);
        Combat.ShowRoomCommands(_t136);
        Process.room_path = _t136.path;
        Process.cur_room = _t136;
        MAP.SetRoom(_t136);
    },
    'roomHiddenItemsReg': /<\w{3}\scmd=['"](.+?)['"]>(.+?)<\/\w{3}>/g,
    'searchItems': function(_t137) {
        var _t138 = null
          , _t139 = _t137.desc;
        while ((_t138 = this.roomHiddenItemsReg.exec(_t139)) !== null) {
            _t137.commands.push({
                'cmd': _t138[1],
                'name': _t138[2]
            });
        }
    },
    'exits': function(_t140) {
        var _t141 = _t140 ? _t140.items : Process.room_exits;
        if (!_t141)
            return;
        Process.room_exits = _t141;
        if (Setting.exits_dir === 1) {
            var _a7 = ["这里明显的出口有："]
              , _a8 = [];
            for (var _n14 = 0; _n14 < MAP.DIRS.length; _n14++) {
                _t141[MAP.DIRS[_n14]] && _a8.push(MAP.DIRS[_n14]);
            }
            for (_n14 = 0; _n14 < _a8.length; _n14++) {
                _n14 > 0 && _a7.push(_n14 === _a8.length - 1 ? " 和 " : '、');
                _a7.push("<span class='exits-item' dir='" + _a8[_n14] + '\x27>' + _a8[_n14] + '</span>');
            }
            _a8.length ? $(".room_exits").html(_a7.join('')) : $(".room_exits").html("<HIK>这里没有明显的出口。<HIK>");
        } else
            $(".room_exits").html(MAP.CreateExitsMap(_t141, $(".container").width(), Process.room_name));
    },
    'before_click_exits': function(_t142) {
        var _J36 = $(_t142.target);
        if (!_J36.attr("dir"))
            return;
        if (_J36.is("rect"))
            _J36.attr('fill', "gray");
        else {
            if (_J36.is("text"))
                _J36.prev().attr('fill', "gray");
        }
    },
    'click_exits': function(_t143) {
        var _J37 = $(_t143.target)
          , _t144 = _J37.attr("dir");
        if (!_t144)
            return;
        if (_J37.is("rect"))
            _J37.attr("fill", "#232323");
        else {
            if (_J37.is('text'))
                _J37.prev().attr("fill", "#232323");
        }
        SendCommand("go " + _t144);
    },
    'query_rmitem': function(_t145) {
        for (let _t146 of this.cur_room.items) {
            if (_t146.id === _t145)
                return _t146;
        }
    },
    'item': function(_t147) {
        ReceiveMessage(_t147.desc);
        _t147.commands = _t147.commands ?? [];
        let _t148 = Process.query_rmitem(_t147.id);
        if (_t148)
            _t147 = Object.assign(_t147, _t148);
        SCRIPT.LAST_OBJ = _t147;
        Dialog.extend.append(_t147.commands, 'item', _t147);
        var _a9 = ["<div class='item-commands'>"];
        for (var _n15 = 0; _n15 < _t147.commands.length; _n15++) {
            _a9.push("<span cmd='" + _t147.commands[_n15].cmd + '\x27>');
            _a9.push(_t147.commands[_n15].name);
            _a9.push('</span>');
        }
        _a9.push("</div>");
        if (Setting.show_command && Combat.STATUS[_t147.id]) {
            Process.itemsElement.find(".item-commands").remove();
            var _t149 = Combat.STATUS[_t147.id].elem.parent();
            $(_a9.join('')).insertAfter(_t149);
            Process.message.scroll2end();
            return;
        }
        ReceiveMessage(_a9.join(''));
    },
    'actions': function(_t150) {
        Combat.ShowActions(_t150);
    },
    'cmds': function(_t151) {
        if (!_t151.items)
            return;
        var _a10 = ["<div class='item-commands'>"];
        if (!_t151.items.length)
            _t151.items = [_t151.items];
        for (var _n16 = 0; _n16 < _t151.items.length; _n16++) {
            _a10.push("<span cmd='" + _t151.items[_n16].cmd + '\x27>');
            _a10.push(_t151.items[_n16].name);
            _a10.push("</span>");
        }
        _a10.push("</div>");
        ReceiveMessage(_a10.join(''));
    },
    'map': function(_t152) {
        MAP.SetMapBuffer(_t152.map, _t152.path);
        MAP.ShowMap(_t152.map, _t152.path);
    },
    'updatemap': function(_t153) {
        MAP.UpdateMap(_t153.map, _t153);
    },
    'dialog': function(_t154) {
        Dialog.show(_t154.dialog, _t154);
    },
    'sc': function(_t155) {
        Combat.StatusChanged(_t155);
    },
    'perform': function(_t156) {
        Combat.ShowPFM(_t156);
    },
    'disobj': function(_t157) {
        Combat.DisObj(_t157);
    },
    'changepfm': function(_t158) {
        Combat.ChangeDistime(_t158);
    },
    'clearDistime': function(_t159) {
        Combat.ClearDistime(_t159);
    },
    'pay': function(_t160) {
        if (_t160.pay === 3) {
            ReceiveMessage("<yel>请打开微信扫描二维码支付：</yel>\n");
            let _J38 = $("<div style=\"width:100%;text-align:center;\"><img style=\"border:solid 2px #808088\" src=\"" + _t160.url + '\x22/></div>');
            _J38.children(0).on("load", function() {
                ReceiveMessage('');
            });
            MessagePage.append(_J38);
        } else
            window.location.href = _t160.url;
    },
    'dispfm': function(_t161) {
        Combat.On_Perform(_t161);
    },
    'status': function(_t162) {
        Combat.StatusItemChanged(_t162);
    },
    'combat': function(_t163) {
        if (_t163.start) {
            if (Setting.auto_showcombat === 1 && !Combat.IsShow) {
                Combat.Show();
            }
            if (Setting.auto_hideroom === 1 && !Setting.hide_roomdesc) {
                $('.room_desc').hide();
            }
        }
        if (_t163.end && Setting.auto_hideroom === 1 && !Setting.hide_roomdesc) {
            $(".room_desc").show();
        }
    },
    'state': function(_t164) {
        if (_t164 && _t164.state) {
            var _a11 = ["<span class='title'>" + _t164.state + "</span>"];
            if (_t164.commands)
                for (var _n17 = 0; _n17 < _t164.commands.length; _n17++) {
                    _a11.push("<span class='item-command' cmd='" + _t164.commands[_n17].cmd + '\x27>');
                    _a11.push(_t164.commands[_n17].name);
                    _a11.push('</span>');
                }
            $('.state-bar').html(_a11.join('')).css('visibility', "visible");
            if (_t164.no_stop)
                $(".state-tool").hide();
            else
                $(".state-tool").show();
            Process.states = _t164.desc;
            if (Process.timer)
                clearInterval(Process.timer);
            if (Process.states && Process.states.length) {
            if (typeof Process.states == "string") {
                Process.states = [Process.states];
            }
            Process.timer = setInterval(Process.updatestate, _t164.interval || 5000);
        }
        } else {
            $('.state-bar').empty().css("visibility", "hidden");
            $(".state-tool").hide();
            clearInterval(Process.timer);
        }
    },
    'updatestate': function() {
        if (Process.states && GameClient) {
            var _t165 = Process.states.length;
            ReceiveMessage(Process.states[parseInt(Math.random() * _t165)]);
        }
    },
    'die': function(_t166) {
        if (_t166.relive)
            return Process.state({});
        Process.state({
            'state': "<hiw>你已经死亡：</hiw>",
            'no_stop': true,
            'desc': ["<blk>一股阴冷的气息包围着你。</blk>", "<blu>朦胧中你好像听到有人在喊：过来吧，过来吧！</blu>"],
            'commands': _t166.commands,
            'interval': 12000
        });
    },
    'warn': function(_t167) {
        Warn.Show(_t167);
    },
    'msg': function(_t168) {
        var _t169 = Dialog.channel.createElement(_t168, !Setting.no_spmsg);
        if (!_t169)
            return;
        if (!Setting.no_spmsg) {
            Process.channel.push(_t169);
            Process.channel.scroll2end();
        } else {
            ReceiveMessage(_t169);
        }
    },
    'addAction': function(_t170) {
        Combat.AddObj(_t170.id, _t170.name, _t170.distime);
    },
    'removeAction': function(_t171) {
        Combat.DisObj({
            'id': _t171.id,
            'remove': true
        });
    }
};
const Combat = {
  'IsShow': false,
  'Skills': null,
  'actions': null,
  'room_actions': null,
  'object_actions': null,
  'Scroll': function(_t177) {
      let _J41 = $(this)[0];
      _J41.scrollLeft += _t177.originalEvent.deltaY;
  },
  'Show': function() {
      if (Combat.IsShow)
          return Combat.Hide();
      if (!this.object_actions)
          SendCommand('actions');
      Combat.IsShow = true;
      !Setting.off_hp && $(".room-item>.item-status").show();
      $(".combat-panel").removeClass("hide");
      this.refActions();
      Process.message.scroll2end();
  },
  'Hide': function() {
      Combat.IsShow = false;
      !Setting.off_hp && $(".room-item>.item-status").hide();
      $(".combat-panel").addClass("hide");
  },
  'ShowRoomCommands': function(_t178) {
      this.room = _t178;
      this.room_actions = _t178.commands;
      if (!Combat.IsShow)
          return;
      this.refActions();
  },
  'def_actions': [{
      'cmd': "dazuo",
      'name': '打坐'
  }, {
      'cmd': 'liaoshang',
      'name': '疗伤'
  }],
  'refActions': function() {
      let _a13 = [...this.def_actions];
      this.actions = _a13;
      this.room && Dialog.extend.append(_a13, "action", this.room);
      this.create_actions();
  },
  'ShowActions': function(_t180) {
      this.object_actions = _t180.actions ?? [];
      this.refActions();
      if (_t180.skills)
          this.ShowPFM(_t180);
  },
  'ShowPFM': function(_t182) {
      this.Skills = _t182.skills || [];
      this.create_skillItems(_t182.skills);
  },
  'append_items': function(_t184, _t185) {
      if (!_t184)
          return;
      for (let _t187 of _t184) {
          _t187.elem = $("<span class='act-item' cmd='" + _t187.cmd + '\x27>' + _t187.name + "</span>").appendTo(_t185);
          if (_t187.disper > 0) {
              _t187.elem.css("backgroundSize", _t187.disper + "% 100%");
          }
      }
  },
  'create_actions': function(_t188) {
      var _J42 = $(".room-commands").empty();
      this.append_items(this.actions, _J42);
      this.append_items(this.object_actions, _J42);
      this.append_items(this.room_actions, _J42);
  },
  'DisObj': function(_t190) {
      if (!this.object_actions)
          return;
      var _t192 = _t190.act ? _t190.id : "use " + _t190.id;
      for (var _n20 = 0; _n20 < this.object_actions.length; _n20++) {
          var _t193 = this.object_actions[_n20];
          if (_t193.cmd === _t192) {
              if (_t190.remove) {
                  this.object_actions.splice(_n20, 1);
                  _t193.elem.remove();
                  return;
              }
              else
                  this.ANI_OBJ(_t193, _t190.time, _t190.time);
          }
      }
  },
  'AddObj': function(_t194, _t195) {
      if (!this.object_actions)
          return;
      var _t197 = "use " + _t194;
      for (var _n21 = 0; _n21 < this.object_actions.length; _n21++) {
          var _t198 = this.object_actions[_n21];
          if (_t198.cmd == _t197)
              return;
      }
      this.object_actions.push({
          'cmd': "use " + _t194,
          'name': _t195.replace(/<.+?>/g, '')
      });
      this.create_actions();
  },
  'ANI_OBJ': function(_t199, _t200, _t201) {
      let _t203 = _t199.elem;
      if (!_t203)
          return;
      var _t204 = _t201 * 100 / _t200;
      // 【后台省电】低功耗模式（无真实交互的挂机标签）跳过血条 DOM 写入，保留状态与调度链。
      // 只砍"画给眼睛看的"，不影响战斗逻辑/出招命令；恢复交互后动画自动续播。
      var _lp = window._extLowPower && _extLowPower();
      if (_t204 > 0) {
          if (!_lp)
              _t203.css("backgroundSize", _t204 + '%\x20100%');
      } else {
          if (_t204 < 0)
              _t204 = 0;
          if (!_lp)
              _t203.css("backgroundSize", '0%\x20100%');
      }
      _t199.disper = _t204;
      setTimeout(Combat.ANI_OBJ, 1000, _t199, _t200, _t201 - 1000);
  },
  'create_skillItems': function(_t205) {
      var _J43 = $(".combat-commands").empty();
      if (!_t205.length)
          return;
      for (var _n22 = 0; _n22 < _t205.length; _n22++) {
          var _a14 = [];
          _a14.push("<span class='pfm-item' pid='" + _t205[_n22].id + "' id='" + _t205[_n22].id + '\x27>');
          _a14.push(_t205[_n22].name);
          _a14.push('</span>');
          _t205[_n22].elem = $(_a14.join('')).appendTo(_J43);
      }
  },
  'ChangeDistime': function(_t207) {
      var _t209 = _t207.id.replace('/', '.');
      for (var _n23 = 0; _n23 < Combat.dis_pfms.length; _n23++) {
          if (Combat.dis_pfms[_n23].id == _t209) {
              Combat.dis_pfms[_n23].ani_time += _t207.time;
              break;
          }
      }
  },
  'ClearDistime': function(_t210) {
      if (!Combat.dis_pfms)
          return;
      var _t212 = _t210.id ? _t210.id.replace('/', '.') : _t210.id;
      for (var _n24 = 0; _n24 < Combat.dis_pfms.length; _n24++) {
          (!_t212 || Combat.dis_pfms[_n24].id == _t212) && (Combat.dis_pfms[_n24].ani_time = 0);
      }
  },
  'redisable': function() {
      Combat.dis_pfms = [];
      for (var _n25 = 0; _n25 < Combat.Skills.length; _n25++) {
          var _t214 = Combat.Skills[_n25];
          Combat.dis_pfms.push({
              'id': _t214.id,
              'distime': _t214.distime,
              'ani_time': _t214.distime
          });
      }
      !Combat.time_handler && Combat.ANI_PFM();
  },
  'On_Perform': function(_t215) {
      if (!this.Skills)
          return;
      if (_t215.id === "all" && !_t215.rtime)
          return this.redisable();
      if (_t215.id)
          _t215.id = _t215.id.replace('/', '.');
      _t215.rtime = _t215.rtime || 0;
      _t215.distime = _t215.distime || 0;
      if (!this.dis_pfms)
          this.dis_pfms = [];
      for (var _n26 = 0; _n26 < this.dis_pfms.length; _n26++) {
          if (this.dis_pfms[_n26].id == _t215.id) {
              _t215.id = null;
              this.dis_pfms[_n26].distime = _t215.distime;
              this.dis_pfms[_n26].ani_time = _t215.distime;
              continue;
          }
          if (this.dis_pfms[_n26].ani_time < _t215.rtime) {
              this.dis_pfms[_n26].ani_time = _t215.rtime;
              this.dis_pfms[_n26].distime = _t215.rtime;
          }
      }
      _t215.id && this.dis_pfms.push({
          'id': _t215.id,
          'distime': _t215.distime,
          'ani_time': _t215.distime
      });
      Combat.ani_time = Combat.ani_time ?? 0;
      if (_t215.rtime > Combat.ani_time) {
          Combat.distime = _t215.rtime;
          Combat.ani_time = _t215.rtime;
      }
      !this.time_handler && Combat.ANI_PFM();
  },
  'PFM_INTERVAL': 300,
  'ANI_PFM': function() {
      var _n27 = 0;
      if (Combat.distime > 0)
          _n27 = Combat.ani_time * 100 / Combat.distime;
      // 【后台省电】低功耗模式跳过技能条 DOM 写入，保留冷却状态推进与调度链（恢复交互即续播）。
      var _lp = window._extLowPower && _extLowPower();
      for (var _n28 = 0; _n28 < Combat.Skills.length; _n28++) {
          var _t218 = Combat.Skills[_n28]
            , _t219 = _n27;
          for (var _n29 = 0; _n29 < Combat.dis_pfms.length; _n29++) {
              if (Combat.dis_pfms[_n29].id == _t218.id && Combat.dis_pfms[_n29].distime) {
                  _t219 = Combat.dis_pfms[_n29].ani_time * 100 / Combat.dis_pfms[_n29].distime;
                  _t219 < 0 ? Combat.dis_pfms.splice(_n29, 1) : Combat.dis_pfms[_n29].ani_time -= Combat.PFM_INTERVAL;
                  break;
              }
          }
          if (_t219 > 0) {
              if (_t219 < 0)
                  _t219 = 0;
              if (!_lp)
                  _t218.elem.css("backgroundSize", _t219 + '%\x20100%');
          } else if (!_lp)
              _t218.elem.css("backgroundSize", "0% 100%");
      }
      Combat.ani_time > 0 || Combat.dis_pfms.length ? Combat.time_handler = setTimeout(Combat.ANI_PFM, Combat.PFM_INTERVAL) : Combat.time_handler = null;
      Combat.ani_time -= Combat.PFM_INTERVAL;
  },
  'StatusChanged': function(_t220) {
      var _J44 = $(".room-item");
      for (var _n30 = 0; _n30 < _J44.length; _n30++) {
          var _J45 = $(_J44[_n30]);
          if (_J45.attr('itemid') == _t220.id) {
              this.UpdateBar(_t220, 'mp', _J45);
              this.UpdateBar(_t220, 'hp', _J45);
              break;
          }
      }
  },
  'UpdateBar': function(data, key, $container) {
      const currentVal = data[key];
      let maxVal = 0;

      if (currentVal === undefined) return;

      const $bar = $container.find('.' + key + ' > .progress-bar');

      // 取max值：优先data.max_xxx，否则读dom属性
      if (data['max_' + key]) {
          maxVal = data['max_' + key];
          $bar.attr("max", maxVal);
      } else {
          maxVal = parseInt($bar.attr("max"));
      }

      // hp数值显示
      if (Setting.show_hpnum && key === 'hp') {
          const hpText = Process.get_hpnum(currentVal, maxVal);
          $container.find(".progress-num").html(`[${hpText}<nor>/</nor><hiy>${maxVal}</hiy>]`);
      }

      // 设置进度条宽度
      $bar.css("width", Combat.CountWidth(currentVal, maxVal) + '%');

      // 伤害百分比显示（非玩家）
      if (Setting.show_damage && data.damage && data.id !== Process.player) {
          let damagePercent;
          if (data.damage === -1) {
              damagePercent = Math.trunc((maxVal - currentVal) * 1000 / maxVal) / 10;
          } else {
              damagePercent = Math.trunc(data.damage * 1000 / maxVal) / 10;
          }

          let $damageDom = $container.find(".item-damage");
          if (!$damageDom.length) {
              $damageDom = $("<span class=\"item-damage\">[<hiy>0%</hiy>]</span>").appendTo($container.find(".item-name"));
          }
          $damageDom.html(`[<hiy>${damagePercent}%</hiy>]`);
      }
  },
  'CountWidth': function(_t228, _t229) {
      if (_t229 === 0)
          return 0;
      const _t230 = _t228 * 100 / _t229;
      if (_t230 >= 100)
          return 100;
      if (_t230 < 0)
          return 0;
      return _t230;
  },
  'Perform': function() {
      const _J46 = $(this);
      if (_J46.is("disable"))
          return;
      const _t232 = _J46.attr("pid");
      if (!_t232)
          return;
      SendCommand('perform\x20' + _t232);
  },
  'STATUS': {},
  'AppendStatusItem': function(_t233, _t234, _t235) {
      var _o2 = {
          'elem': _t234,
          'items': {}
      };
      if (_t235)
          for (var _n33 = 0; _n33 < _t235.length; _n33++) {
              this.StatusItem_add(_o2, _t235[_n33]);
          }
      this.STATUS[_t233] = _o2;
  },
  'StatusItemChanged': function(_t237) {
      var _t239 = Combat["StatusItem_" + _t237.action];
      _t239 && _t239.call(Combat, this.STATUS[_t237.id], _t237);
  },
  'StatusItem_add': function(_t240, _t241) {
      if (!_t240)
          return;
      var _a15 = [];
      _a15.push("<span class=\"status-item");
      _t241.downside && _a15.push('\x20downside');
      _a15.push("\" sid=\"");
      _a15.push(_t241.sid);
      _a15.push('\x22>');
      _a15.push(_t241.name);
      if (_t241.count !== undefined) {
          _a15.push('x');
          _a15.push(_t241.count);
      }
      _a15.push("<span class=\"shadow\"></span></span>");
      _t240.items[_t241.sid] = {
          'elem': $(_a15.join('')).appendTo(_t240.elem)[0],
          'name': _t241.name,
          'count': _t241.count,
          'duration': _t241.duration,
          'anitime': _t241.duration - (_t241.overtime || 0)
      };
      if (_t241.duration > 0)
          Combat.StatusItemANI(_t240.items[_t241.sid]);
  },
  'StatusItem_remove': function(_t243, _t244) {
      if (!_t243)
          return;
      var _t246 = _t244.sid;
      if (typeof _t246 === 'string')
          _t246 = [_t246];
      for (var _n34 = 0; _n34 < _t246.length; _n34++) {
          var _t247 = _t243.items[_t246[_n34]];
          if (_t247) {
          $(_t247.elem).remove();
          if (_t247.handler) clearTimeout(_t247.handler);
          delete _t243.items[_t246[_n34]];
      }
      }
  },
  'StatusItem_refresh': function(_t248, _t249) {
      if (!_t248) return;
      const _t251 = _t248.items[_t249.sid];
      if (!_t251) return;
      const _t252 = _t251.elem.firstChild;
      const _t253 = _t251.elem.lastChild;
      _t251.count = _t249.count;
      _t251.elem.innerHTML = _t251.name + 'x' + _t251.count + _t253.outerHTML;
      _t251.handler && clearTimeout(_t251.handler);
      _t251.anitime = _t251.duration;
      Combat.StatusItemANI(_t251);
  },
  'StatusItem_override': function(_t254, _t255) {
      var _t257 = _t254.items[_t255.sid];
      if (!_t257)
          return;
      _t257.handler && clearTimeout(_t257.handler);
      _t257.anitime = _t257.duration;
      Combat.StatusItemANI(_t257);
  },
  'StatusItem_clear': function(_t258, _t259) {
      if (!_t258)
          return;
      for (const _t261 in _t258.items) {
          const _t262 = _t258.items[_t261];
          if (_t262) {
              $(_t262.elem).remove();
              clearTimeout(_t262.handler);
          }
      }
      _t258.items = {};
  },
  'StatusItemANI': function(_t263) {
      var _t265 = _t263.elem.lastChild
        , _t266 = _t263.anitime * 100 / _t263.duration;
      if (_t266 < 0)
          _t266 = 0;
      _t265.style.right = _t266 + '%';
      _t263.anitime = _t263.anitime - 1000;
      if (_t266 > 0) {
          _t263.handler = setTimeout(Combat.StatusItemANI, 1000, _t263);
      } else {
          _t263.handler = 0;
      }
  }
};
// ws.js — wsmud2.com 游戏客户端核心脚本（WebSocket 通信、界面渲染、战斗逻辑等）。

$(function () {
    $(".login-content").on("click", ".panel_item", LoginCommand);
    $('.container').on('click', ContainerCommand);
    // 聊天点击
    $('.channel').on('click', ContainerCommand);

    $(".role-list").on("click", ".role-item", function () {
        $(this).parent().find(".select").removeClass("select");
        $(this).addClass('select');
    });

    $(".channel-box").on("click", 'span', ChannelChanged);
    $(".combat-commands").on("click", ".pfm-item", Combat.Perform).on('wheel', Combat.Scroll);
    $(".room-commands").on("wheel", Combat.Scroll);
    $(".sender-box").on('keyup', OnSendBoxKeyDown);
    $(".room_items").on('click', ".room-item", Process.selectItem);
    $(".bottom-bar").on('click', ".tool-item,.state-bar,.item-command", MenuClick);
    $(".map-panel").on("click", open_map);
    $(".sender-btn").on("click", SendChatMessage);
    $(".room_exits").on("pointerdown", Process.before_click_exits).on("pointerup", Process.click_exits);

    $(".room-title>.map-icon").on("click", () => MAP.LoadMap());
    $(".validnum-box>.validnum-btn").on("click", SendValidateCode);

    Process.init();
    CheckLogin();
    // 清除输入框默认空格（游戏页面 HTML 遗留问题）
    $(".sender-box").val('');
});

const API = {};

function ShowServers() {
    if (!SERVERS) {
        ShowLoader('正在获取服务器列表');
        API.UserAPI.GetServer(function(_t55) {
            if (!_t55 || typeof _t55 === "string") {
                ShowInputError('#login_pwd', '获取服务器列表出错');
                return;
            }
            SERVERS = _t55;
            DisplayServer(_t55);
            ShowServers();
        });
        return;
    }
    const _t56 = SERVERS;
    if (!_t56 || !_t56.length) {
        HideAndShow("#login_panel");
        ShowInputError("#login_pwd", '获取服务器列表出错');
    }
    else {
        const _t57 = GetUserCookie('s')
            , _t58 = _t57 ? SERVERS[_t57] : _t56.length === 1 ? SERVERS[0] : null;
        if (_t58) {
            ShowLoader("正在连接服务器");
            return ConnectServer(_t58);
        }
        HideAndShow("#slist_panel");
    }
}

function DisplayServer() {
    if (!SERVERS)
        return;
    const _t59 = location.hostname.startsWith("127.0.0.1") || location.hostname.startsWith("localhost")
        , _t60 = location.search.startsWith('?test');
    if (_t59) {
        SERVERS.push({
            'id': 100,
            'name': '本地测试1',
            'ip': "127.0.0.1",
            'port': 31200
        });
        SERVERS.push({
            'id': 101,
            'name': "本地测试2",
            'ip': "127.0.0.1",
            'port': 31201
        });
    }
    const _a2 = []
        , _t61 = "武神传说2";
    for (let _n5 = 0; _n5 < SERVERS.length; _n5++) {
        if (!_t60 && !_t59 && SERVERS[_n5].istest)
            continue;
        _a2.push("<li class='role-item");
        if (_n5 === 0)
            _a2.push(" select");
        _a2.push("' index='" + _n5 + '\x27>');
        _a2.push(_t61);
        _a2.push("&nbsp;&nbsp;");
        _a2.push(SERVERS[_n5].name);
        SERVERS[_n5].isdef && _a2.push("<span style='color:red;font-size:0.5rem;line-height:2rem;height:2rem;'>&nbsp;（推荐）</span>");
        _a2.push("</li>");
    }
    $(".server-list").html(_a2.join('')).on("click", 'li', function() {
        const _J20 = $(this);
        if (_J20.is(".select"))
            return;
        _J20.parent().find('.select').removeClass('select');
        _J20.addClass("select");
    });
}
function GetUserCookie(name) {
    let _t63, _t64 = new RegExp("(^| )" + name + ("=([^;]*)(;|$)"));
    _t63 = document.cookie.match(_t64);
    if (_t63)
        return unescape(_t63[2]);
    else
        return null;
}
const Warn = {
  'Elemes': [],
  'Show': function(_t172) {
      var _a12 = ["<div class='warn-dialog'>"];
      _a12.push("<div class='warn-content'>");
      _a12.push(_t172.content);
      _a12.push("</div>");
      _a12.push("<div class='item-commands'>");
      for (var _n18 = 0; _n18 < _t172.cmds.length; _n18++) {
          var _t173 = _t172.cmds[_n18];
          _a12.push("<span cmd='");
          _a12.push(_t173.cmd);
          _a12.push('\x27>');
          _a12.push(_t173.name);
          _a12.push("</span>");
      }
      _a12.push("</div>");
      var _J39 = $(_a12.join('')).appendTo(".bottom-bar");
      this.Elemes.push(_J39);
      this.Settop();
      var _t174 = this.Close.bind(this, _J39);
      _t172.time && window.setTimeout(_t174, _t172.time);
      _J39.on('click', 'span', _t174);
  },
  'Close': function(_t175) {
      if (this.Elemes.indexOf(_t175) > -1) {
          _t175.remove();
          this.Elemes.Remove(_t175);
          this.Settop();
      }
  },
  'Settop': function() {
      var _J40 = $(".bottom-bar").height() + 8;
      for (var _n19 = 0; _n19 < Warn.Elemes.length; _n19++) {
          var _t176 = Warn.Elemes[_n19];
          _t176.css('bottom', _J40);
          _J40 += _t176.height() + 14;
      }
  }
};

let isShowChat;

function ContainerCommand(event) {
    let _J21 = $(event.target)
        , _t65 = _J21.attr('cmd');
    if (!_t65)
        _t65 = _J21.parent().attr("cmd");
    if (_t65) {
        let _t66 = _t65[0];
        if (_t66 === '_') {
            const _t67 = _t65.split('\x20');
            switch (_t67[0]) {
            case "_confirm":
                Confirm.Process(_t67);
                break;
            case "_setting":
                Setting.save(_t67[1], _t67[2]);
                break;
            case "_trade":
                Dialog.trade.confirm(_t67[1]);
                break;
            case "_close":
                Warn.Close(_J21);
                break;
            case "_hide":
                Storage.ban_user(_t67[1]);
                break;
            case "_closed":
                Dialog.hide();
            case "_party":
                Dialog.party.command(_t67[1]);
                break;
            }
        } else if (_t66 === '#') {
            SCRIPT.run(_t65);
        } else {
            SendCommand(_t65);
            if (!_J21.closest(".dialog-fb").length && _J21.closest(".dialog-content").length > 0)
                _J21.closest(".item-commands").remove();
        }
        return false;
    } else if (isShowChat && !_J21.closest(".chat-panel").length) {
        $(".chat-panel").addClass("hide");
        isShowChat = false;
    }
    Confirm.Close();
}

let LastCommand;

function SendCommand(cmd) {
    if (IsConnecting)
        return;
    if (!GameClient || !GameClient.Connected()) {
        LastCommand = cmd;
        ReceiveMessage("<red>连接中断，正在重新连线...</red>");
        ConnectServer(SelectedServer);
        return;
    }
    Dialog.extend.record(cmd);
    GameClient.Send(cmd);
}
function ChannelChanged() {
    const _J22 = $(this)
        , _t68 = _J22.attr('channel');
    if (_t68 === 'emote')
        return ShowEmotePanel();
    if (_J22.is(".selected"))
        return;
    const _t69 = _J22.parent();
    _t69.children().removeClass('selected');
    _J22.addClass('selected');
    _t69.attr("channel", _t68);
    $(".sender-box").focus();
    return false;
}
function ShowEmotePanel() {
    const _J23 = $(".channel-emotes");
    if (_J23.is(".hide")) {
        _J23.removeClass("hide");
        if (!Process.emtoes) {
            SendCommand('emote');
            Process.emtoes = [];
            $(".sender-box").blur();
            _J23.on("click", 'span', function() {
                const _J24 = $(this).html();
                $(".sender-box").val('*' + _J24).focus();
                $(".channel-emotes").addClass("hide");
            });
        }
    } else {
        $(".channel-emotes").addClass('hide');
    }
}
function MenuClick(event) {
    let _J25 = $(this).attr('command');
    if (!_J25) {
        _J25 = $(this).attr("cmd");
        if (_J25)
            SendCommand(_J25);
        return false;
    }
    return HandlerMenuCommand(_J25);
}
const ToolAction = {
    'tools': null,
    'hideTool': null,
    'ToolState': 0,
    'ToolOpacity': 0,
    'ToolSpeed': 0,
    'InitTools': function() {
        if (!this.tools) {
            this.tools = $(".right-bar>.tool-item");
            this.hideTool = $(".br-tool");
            this.bottom_tools = $(".bottom-bar>.tool-item");
        }
    },
    'ShowTools': function() {
        this.InitTools();
        if (this.ToolState === 1)
            return;
        if (this.ToolState === 0) {
            for (var _n6 = 0; _n6 < this.tools.length; _n6++) {
                this.tools[_n6].style.display = '';
                this.tools[_n6].style.opacity = 0;
            }
            this.ToolSpeed = 200;
            this.ToolOpacity = 0;
            $(this.hideTool).removeClass("hide-tool");
        } else {
            this.ToolOpacity = 100;
            this.ToolSpeed = 100;
            $(this.hideTool).addClass("hide-tool");
        }
        window.setTimeout(this.ShowToolsAnimate.bind(this, this.ToolState), 100);
        this.ToolState = 1;
    },
    'ShowToolsAnimate': function(_t71) {
        var _t72, _t73;
        if (_t71 === 0) {
            this.ToolOpacity = this.ToolOpacity + this.ToolSpeed;
            _t72 = this.ToolOpacity;
            for (_t73 = this.tools.length - 1; _t73 >= 0; _t73--) {
                if (_t72 < 0)
                    this.tools[_t73].style.opacity = 0;
                else {
                    if (_t72 > 100)
                        this.tools[_t73].style.opacity = 1;
                    else
                        this.tools[_t73].style.opacity = _t72 / 100;
                }
                _t72 -= 20;
                if (_t72 < 0)
                    break;
            }
            this.ToolOpacity -= 30;
            _t72 < 100 ? window.setTimeout(this.ShowToolsAnimate.bind(this, _t71), 100) : this.ToolState = 2;
        } else {
            this.ToolOpacity = this.ToolOpacity - this.ToolSpeed;
            _t72 = this.ToolOpacity;
            for (_t73 = 0; _t73 < this.tools.length; _t73++) {
                if (_t72 < 0)
                    this.tools[_t73].style.opacity = 0;
                else {
                    if (_t72 > 100)
                        this.tools[_t73].style.opacity = 1;
                    else
                        this.tools[_t73].style.opacity = _t72 / 100;
                }
                _t72 += 20;
                if (_t72 >= 100)
                    break;
            }
            this.ToolOpacity -= 20;
            if (_t72 >= 0)
                window.setTimeout(this.ShowToolsAnimate.bind(this, _t71), 100);
            else {
                this.ToolState = 0;
                for (_t73 = 0; _t73 < this.tools.length; _t73++) {
                    this.tools[_t73].style.display = "none";
                }
            }
        }
    },
    'showFlag': function(_t74, _t75) {
        this.InitTools();
        if (_t75 < 0)
            _t75 = 0;
        else {
            if (_t75 > 99)
                _t75 = 99;
        }
        let _t76 = this.tools.filter('[command=\x27' + _t74 + '\x27]');
        if (!_t76.length)
            _t76 = this.bottom_tools.filter("[command='" + _t74 + '\x27]');
        _t75 ? _t76.find('.tag').removeClass("hide") : _t76.find('.tag').addClass("hide");
    }
};

function HandlerMenuCommand(command) {
    switch (command) {
    case "showtool":
        ToolAction.ShowTools();
        break;
    case "showchat":
        return ShowChat();
    case "showcombat":
        return Combat.Show();
    case 'stopstate':
        if (Dialog.extend.is_record)
            return Dialog.extend.stop_record();
        SendCommand("state stop");
        break;
    case "stateinfo":
        SendCommand('state\x20info');
        break;
    default:
        Dialog.show(command);
        break;
    }
    return false;
}

isShowChat = false;

function ShowChat() {
    var _J26 = $(".chat-panel").toggleClass("hide");
    if (!_J26.is(".hide")) {
        isShowChat = true;
        _J26.find("input").val('').focus();
        return false;
    } else {
        isShowChat = false;
        return false;
    }
}

function CloseServer() {
    GameClient && GameClient.Connected() && GameClient.Destroy();
    GameClient = null;
}

let IsConnecting = false;
const SessionKey = 'u'
const SessionToken = 'p';

function ConnectServer(server, showLoader) {
    if (IsConnecting)
        return;
    SelectedServer = server;
    console.log("重新连接", GameClient === null ? "未连接" : "已连接");
    CloseServer();
    GameClient = new WSClient(server.ip,server.port);
    IsConnecting = true;
    GameClient.OnError = function(_t77, _t78) {
        IsConnecting = false;
        if (_t77) {
            if (_t77.isTrusted)
                _t77 = "服务器没有响应，请稍后重试";
            ShowLoader("<strong>连接失败：</strong>" + _t77 + '');
        }
    }

    GameClient.OnConnect = function() {
        IsConnecting = false;
        if (!showLoader && !Process.player) {
            ShowLoader("正在获取角色列表...");
            SendCommand(GetUserCookie(SessionKey) + '\x20' + GetUserCookie(SessionToken));
        } else if (showLoader) {
            SendCommand(GetUserCookie(SessionKey) + '\x20' + GetUserCookie(SessionToken) + '\x20' + showLoader + '\x20' + server.ID);
        } else {
            SendCommand(GetUserCookie(SessionKey) + '\x20' + GetUserCookie(SessionToken) + '\x20' + Process.player);
        }
    }

    GameClient.OnClose = function(_t81) {
        IsConnecting = false;
        if (this.ChangeServer) {
            this.ChangeServer = false;
            return;
        }
        if (this.Connected())
            return;
        if (Process.player) {
            Process.clear();
            ReceiveMessage("<red>你的连接中断了...</red>");
        } else {
            setTimeout( () => {
                HideAndShow($("#slist_panel"));
            }
            , 3000);
        }
    }

    GameClient.OnData = ReceiveData;
    GameClient.OnMessage = ReceiveMessage;
    GameClient.Connect();
}
function ShowInputError(selector, message) {
    $(selector).focus().parent().find(".input-error").remove();
    $("<div class='input-error'>" + message + '</div>').insertAfter(selector);
}
function ShowLoader(text, withBackdrop) {
    var _J27 = $(".login-content").children();
    for (var _n7 = 0; _n7 < _J27.length; _n7++) {
        $(_J27[_n7]).css("display") != "none" && !$(_J27[_n7]).is(".signinfo") && $(_J27[_n7]).hide();
    }
    var _J28 = $('#loader').css("opacity", 1).show();
    _J28.find("#loader_msg").html(text);
}
const Util = {
    'ProxyHost': '/',
    'isMobile': /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent),
    'Json2Str': function(_t1339) {
        if (typeof _t1339 === 'object') {
            if (_t1339 === undefined || _t1339 === null)
                return '';
            return JSON.stringify(_t1339);
        }
        return _t1339;
    },
    'Json2Str2': function(_t1341) {
        if (_t1341 === undefined || _t1341 === null)
            return '';
        return JSON.stringify(_t1341);
    },
    'Date2Str': function(_t1342) {
        if (_t1342.valueOf)
            return "/Date(" + _t1342.valueOf() + ')/';
        return _t1342;
    },
    'Clone': function(_t1343) {
        var _o12 = {};
        for (var _t1344 in _t1343) {
            _o12[_t1344] = _t1343[_t1344];
        }
        return _o12;
    },
    'Sleep': function(_t1345) {
        if (!(_t1345 > 0))
            _t1345 = 1000;
        return new Promise(_t1346 => {
            setTimeout(_t1346, _t1345);
        }
        );
    },
    'Wait': async function(_fn20) {
        while (!_fn20()) {
            await this.Sleep(1);
        }
    },
    'Str2Json': function(_t1348) {
        if (_t1348.substring(0, 1) !== '{') _t1348 = '{' + _t1348 + '}';
        return new Function('return\x20' + _t1348)();
    },
    'Str2Json2': function(_t1349) {
        return new Function("return " + _t1349)();
    },
    'Str2XML': function(_t1350) {
        var _t1352;
        if (!window.DOMParser) {
            _t1352 = new ActiveXObject("Microsoft.XMLDOM");
            _t1352.async = "false";
            _t1352.loadXML(_t1350);
        }
        else {
            var _t1353 = new DOMParser();
            _t1352 = _t1353.parseFromString(_t1350, 'text/xml');
        }
        return $(_t1352.documentElement);
    },
    'Settings': {
        'MaxUploadFileLength': 1048576 * 30
    },
    'encode': function(_t1354) {
        return encodeURIComponent(_t1354);
    },
    'CookieHelper': {
        'setCookie': function(_t1355, _t1356, _t1357) {
            var _t1359 = _t1355 + '=' + escape(_t1356);
            if (_t1357) {
                var _t1360 = new Date();
                _t1360.setTime(_t1360.getTime() + _t1357 * 60 * 1000);
                _t1359 += "; expires=" + _t1360.toGMTString();
            }
            document.cookie = _t1359;
        },
        'getCookie': function(_t1361) {
            var begin
              , end;
            if (document.cookie.length > 0) {
                begin = document.cookie.indexOf(_t1361 + '=');
                if (begin !== -1)
                    return begin += _t1361.length + 1,
                    end = document.cookie.indexOf(';', begin),
                    end === -1 && (end = document.cookie.length),
                    unescape(document.cookie.substring(begin, end));
            }
            return '';
        },
        'delCookie': function(_t1363) {
            if (this.getCookie(_t1363)) {
                var _t1365 = new Date();
                _t1365.setYear(1000);
                document.cookie = _t1363 + "=;" + _t1365.toGMTString();
            }
        }
    },
    'C_STR': "零一二三四五六七八九",
    'C_STR2': ['', '十', '百', '千', '万', '亿'],
    'C_STR3': ['', '万', '亿'],
    'to_c': function(_t1366) {
        if (!_t1366)
            return '零';
        var _t1368 = ''
          , _n159 = 0
          , _n160 = 0;
        while (_t1366) {
            var _t1369 = _t1366 % 10;
            if (_n159) {
                if (_n159 % 4 === 0 && _n160 !== 3) {
                    _t1368 = Util.C_STR3[_n159 / 4] + _t1368;
                    _n160 = 3;
                }
                else
                    if (_t1369 && _n160 !== 2) {
                    _t1368 = Util.C_STR2[_n159 % 4] + _t1368;
                    _n160 = 2;
                }
            }
            if (_t1369) {
                if (_t1369 !== 1 || _t1366 > 10 || _n159 % 4 !== 1)
                    _t1368 = Util.C_STR[_t1369] + _t1368;
                _n160 = 1;
            } else
                if (_n160 === 1) {
                _t1368 = Util.C_STR[_t1369] + _t1368;
                _n160 = 0;
            }
            _t1366 = parseInt(_t1366 / 10);
            _n159++;
        }
        return _t1368;
    },
    'Get': function(_t1370, _t1371, _t1372) {
        if (!_t1370)
            return;
        var _a106 = [];
        if ($.isPlainObject(_t1371)) {
            for (var _t1374 in _t1371) {
                if (_t1371[_t1374])
                    _a106.push(_t1374 + '=' + Util.encode(Util.Json2Str(_t1371[_t1374])));
            }
            _t1370 = _t1370 + '?' + _a106.join('&');
        } else {
            if ($.isFunction(_t1371))
                _t1372 = _t1371;
            else {
                if ($.isArray(_t1371)) {
                    for (var _n161 = 0; _n161 < _t1371.length; _n161++) {
                        _a106.push(Util.encode(Util.Json2Str(_t1371[_n161])));
                    }
                    _t1370 = _t1370 + '/' + _a106.join('/');
                }
            }
        }
        var _o13 = {
            'url': this.ProxyHost + _t1370,
            'callBack': _t1372,
            'type': 'get'
        };
        return Util.Request(_o13);
    },
    'Post': function(_t1375, _t1376, _t1377) {
        var _a107 = [], _t1379;
        if ($.isPlainObject(_t1376)) {
            for (var _t1380 in _t1376) {
                if (_t1376[_t1380])
                    _a107.push(_t1380 + '=' + Util.Json2Str(_t1376[_t1380]));
            }
            _t1379 = _a107.join('&');
        } else {
            if (_t1376.length) {
                for (var _n162 = 0; _n162 < _t1376.length; _n162++) {
                    _a107.push(Util.Json2Str(_t1376[_n162]));
                }
                _t1379 = Util.Json2Str2(_a107);
            } else
                return;
        }
        var _o14 = {
            'url': this.ProxyHost + _t1375,
            'data': _t1379,
            'callBack': _t1377,
            'type': "post"
        };
        return Util.Request(_o14);
    },
    'Request': function(_t1381) {
        var _fn22 = _t1381.callBack
          , _J90 = $.isFunction(_fn22)
          , _t1383 = null;
        $.ajax(_t1381.url, {
            'data': _t1381.data,
            'type': _t1381.type || "post",
            'async': _J90,
            'dataType': _t1381.dataType || "json",
            'xhrFields': {
                'withCredentials': true
            },
            'statusCode': {
                404: function() {}
            },
            'success': function(_t1384) {
                $.isFunction(_fn22) && _fn22(_t1384);
            },
            'error': function(_t1385, _t1386, _t1387) {
                _t1387 = _t1385.responseText;
                $.isFunction(_fn22) && _fn22(_t1387);
            }
        });
        if (_J90 === false)
            return _t1383;
    },
    'RequestOver': function(_t1388) {
        return _t1388.Code >= 0;
    },
    'ToDate': function() {
        if (arguments.length === 0)
            return new Date();
        if (arguments.length === 1) {
            var _t1390 = arguments[0].split('-');
            return new Date(_t1390[0],parseInt(_t1390[1]) - 1,_t1390[2]);
        } else
            return new Date(arguments[0],arguments[1],arguments[2]);
    },
    'CheckInputs': function(_t1391, _t1392) {
        var _t1394 = _t1391.find("input");
        for (var _n163 = 0; _n163 < _t1394.length; _n163++) {
            var _J91 = $(_t1394[_n163]).val()
              , _b7 = false;
            if (_t1392)
                for (var _n164 = 0; _n164 < _t1392.length; _n164++) {
                    if (_t1392[_n164] == _J91) {
                        _b7 = true;
                    }
                }
            _b7 ? $(_t1394[_n163]).prop("checked", true) : $(_t1394[_n163]).removeProp("checked");
        }
    }
};
const MessageQueue = {
    'size': 3,
    'max': 666,
    'container': null,
    'pages': null,
    'count': 0,
    'allow_scroll': true,
    'create': function(_t83, _n8=3, _n9=666) {
        let _t84 = Object.create(this);
        _t84.container = _t83;
        _t84.pages = [];
        _t84.size = _n8;
        _t84.max = _n9;
        Util.isMobile ? _t83.on("touchend", this.stopDrag.bind(_t84)) : _t83.on("wheel", this.stopDrag.bind(_t84));
        _t84.scroll_button = $("<div class=\"scroll-flag\" style=\"display:none;\"><span class=\"glyphicon glyphicon-chevron-down\"></span></div>");
        _t84.scroll_button.appendTo(_t83);
        _t84.scroll_button.on("pointerup", _t84.start_move.bind(_t84));
        return _t84;
    },
    'stopDrag': function(_t85) {
        let _t86 = this.is_end();
        if (_t86 === this.allow_scroll)
            return;
        this.allow_scroll = _t86;
        _t86 && this.scroll_button.hide();
    },
    'start_move': function() {
        this.allow_scroll = true;
        this.scroll_button.hide();
        this.scroll2end();
    },
    'push': function(_t87) {
        let _t88 = this.pages;
        !_t88.length && _t88.push($("<pre></pre>").appendTo(this.container));
        if (this.count > this.max) {
            if (_t88.length >= this.size)
                _t88.splice(0, 1)[0].remove();
            this.count = 0;
            _t88.push($("<pre></pre>").appendTo(this.container));
        }
        let _t89 = _t88[_t88.length - 1];
        _t89.append(_t87 + '\x0a');
        this.count++;
    },
    'clear': function() {
        for (let _t90 of this.pages) {
            _t90.remove();
        }
        this.pages.length = 0;
        this.count = 0;
    },
    'is_end': function() {
        const _t91 = this.container[0]
          , _t92 = _t91.scrollHeight
          , _t93 = _t91.clientHeight
          , _t94 = _t91.scrollTop;
        return _t94 + _t93 >= _t92 - 50;
    },
    'scroll2end': function() {
        const _t95 = this.container[0]
          , _t96 = _t95.scrollHeight
          , _t97 = _t95.clientHeight;
        if (_t96 < _t97)
            return;
        if (!this.allow_scroll) {
            let _t98 = this.container[0].getBoundingClientRect();
            return this.scroll_button.show().css("top", _t98.bottom - this.scroll_button.height() - screenTop);
        }
        _t95.scrollTop = _t95.scrollHeight;
    }
};
function ReceiveMessage(event) {
    // 【2026-08-11 容错】文本消息处理异常隔离，不中断挂机
    try {
        if (Dialog.extend.message_filter(event))
            return;
        Process.message.push(event);
        Process.message.scroll2end();
        Dialog.extend.trigger(event);
    } catch (e) {
        try { ExtLog.error('[WS] ReceiveMessage 异常（已隔离）:', e && e.message); } catch (e2) { }
    }
}
function ReceiveData(data) {
    // 【2026-08-11 容错】单个处理器异常不再中断整条消息链（原代码异常会跳过 Dialog.extend.process）
    try {
        if (Dialog.extend.data_filter(data))
            return;
        var _fn6 = Process[data.type];
        _fn6 && _fn6(data);
        Dialog.extend.process(data);
    } catch (e) {
        try { ExtLog.error('[WS] ReceiveData 异常（已隔离）:', e && e.message); } catch (e2) { }
    }
}
function OnSendBoxKeyDown(event) {
    event.keyCode === 13 && SendChatMessage();
}
function SendChatMessage() {
    var _J29 = $(".sender-box").val();
    if (!_J29)
        return;
    if (_J29.length > 100)
        return ReceiveMessage("<hir>你输入的内容太多了。</hir>");
    var _J30 = $(".channel-box").attr("channel");
    $(".sender-box").val('').focus();
    SendCommand(_J30 + '\x20' + _J29 + '');
}
function RefreshInput(selector) {
    switch (selector) {
    case "name":
        $("#reg_name").val(create_name($("#gender_0").is(":checked") ? 0 : 1));
        break;
    case 'id':
        $('#reg_id').val(create_id());
        break;
    case "prop":
        var _t99 = create_prop();
        $("#reg_str").val(_t99.str);
        $("#reg_con").val(_t99.con);
        $("#reg_dex").val(_t99.dex);
        $('#reg_int').val(_t99.int);
        break;
    }
}

function CreateHeadPanel(parent) {
    var _a16 = ["<div class=\"title\">"];
    _a16.push(parent.name);
    _a16.push("</div><div><span>气血： </span><div class=\"progress\">");
    _a16.push("<div class=\"progress-bar\" style=\"width:");
    _a16.push(parent.hp * 100 / parent.max_hp);
    _a16.push("%; background-color: #800000;\"></div><span class=\"progress-text\">");
    _a16.push(parent.hp);
    _a16.push('\x20/\x20');
    _a16.push(parent.max_hp);
    _a16.push("</span></div></div><div><span>内力： </span><div class=\"progress\"><div style=\"width:");
    _a16.push(parent.mp * 100 / parent.max_mp);
    _a16.push("%; background-color: #000080;\"></div><span class=\"progress-text\">");
    _a16.push(parent.mp);
    _a16.push(" / ");
    _a16.push(parent.max_mp);
    _a16.push("</span></div></div><div></div>");
    return _a16.join('');
}

const Touch = {
    'List': {},
    'AddListener': function (_t327, _t328, _t329) {
        document.querySelector(_t328).addEventListener('touchstart', Touch.Start);
        _t327 === 'zoom' ? document.querySelector(_t328).addEventListener("touchmove", Touch.Move) : document.querySelector(_t328).addEventListener("touchend", Touch.End);
        if (!Touch.List[_t327])
            Touch.List[_t327] = [];
        Touch.List[_t327].push(_t329);
    },
    'Start': function (_t331) {
        Touch.StartPos = [];
        for (var _n51 = 0; _n51 < _t331.changedTouches.length; _n51++) {
            var _t333 = _t331.changedTouches[_n51];
            Touch.StartPos.push([_t333.screenX, _t333.screenY]);
        }
    },
    'Move': function (_t334) {
        var _t336 = _t334.changedTouches.length;
        if (_t336 !== 2)
            return;
        var _a20 = [];
        for (var _n52 = 0; _n52 < _t336; _n52++) {
            var _t337 = _t334.changedTouches[_n52];
            _a20.push([_t337.screenX, _t337.screenY]);
        }
        if (_a20.length !== 2)
            return;
        Touch.Zoom(Touch.StartPos, _a20);
        Touch.StartPos = _a20;
    },
    'End': function (_t338) {
        var _a21 = [];
        for (var _n53 = 0; _n53 < _t338.changedTouches.length; _n53++) {
            var _t340 = _t338.changedTouches[_n53];
            _a21.push([_t340.screenX, _t340.screenY]);
        }
        if (!_a21.length || _a21.length != Touch.StartPos.length)
            return;
        if (_a21.length === 1)
            Touch.Slide(Touch.StartPos[0], _a21[0]);
        else
            _a21.length === 2 && Touch.Zoom(Touch.StartPos, _a21);
    },
    'Zoom': function (_t341, _t342) {
        var _t344 = Touch.Distance(_t341[0], _t341[1])
            , _t345 = Touch.Distance(_t342[0], _t342[1]);
        Touch.On("zoom", {
            'zoom': _t345 / _t344
        });
    },
    'Distance': function (_t346, _t347) {
        return Math.sqrt(Math.pow(_t346[0] - _t347[0], 2) + Math.pow(_t346[1] - _t347[1], 2));
    },
    'Slide': function (_t349, _t350) {
        var _t352 = _t349[0] - _t350[0]
            , _t353 = _t349[1] - _t350[1];
        Math.abs(_t352) < Math.abs(_t353) && Math.abs(_t353) > 20 && Touch.On("slide", {
            'offY': _t353,
            'offX': _t352,
            'isTop': _t353 > 0
        });
    },
    'On': function (_t354, _t355) {
        var _t357 = Touch.List[_t354];
        if (!_t357)
            return;
        for (var _n54 = 0; _n54 < _t357.length; _n54++) {
            _t357[_n54](_t355);
        }
    }
};
Array.prototype.Remove = function(_t1395) {
    var _t1397 = this.length;
    for (var _n165 = 0; _n165 < _t1397; _n165++) {
        if (this[_n165] == _t1395) {
            this.splice(_n165, 1);
            return this;
        }
    }
    return this;
}
,
Array.prototype.RemoveAt = function(_fn23) {
    for (var _n166 = 0; _n166 < this.length; _n166++) {
        _fn23(this[_n166]) && (this.splice(_n166, 1),
        _n166--);
    }
}
,
Array.prototype.Has = function(_t1398) {
    var _t1399 = this.length;
    for (var _n167 = 0; _n167 < _t1399; _n167++) {
        if (this[_n167] == _t1398)
            return true;
    }
    return false;
}
,
Array.prototype.Map = function(_fn24) {
    var _t1401 = this.length
      , _a108 = [];
    for (var _n168 = 0; _n168 < _t1401; _n168++) {
        var _t1402 = _fn24(this[_n168]);
        if (_t1402)
            _a108.push(_t1402);
    }
    return _a108;
}
,
Array.prototype.First = function(_fn25) {
    var _t1404 = this.length;
    for (var _n169 = 0; _n169 < _t1404; _n169++) {
        var _t1405 = this[_n169];
        if (_fn25(_t1405))
            return _t1405;
    }
    return null;
}
,
Array.prototype.Where = function(_fn26) {
    var _t1407 = this.length
      , _a109 = [];
    for (var _n170 = 0; _n170 < _t1407; _n170++) {
        var _t1408 = this[_n170];
        _fn26(_t1408) && _a109.push(_t1408);
    }
    return _a109;
}
,
Date.prototype.AddDays = function(_t1409) {
    return this.setDate(this.getDate() + _t1409),
    this;
}
,
Date.prototype.AddMonths = function(_t1411) {
    this.setMonth(this.getMonth() + _t1411);
            return this;
}
,
Date.prototype.ToDateString = function() {
    var _t1414 = this.getMonth() + 1;
    if (_t1414 < 10)
        _t1414 = '0' + _t1414;
    var _t1415 = this.getDate();
    if (_t1415 < 10)
        _t1415 = '0' + _t1415;
    return this.getFullYear() + '-' + _t1414 + '-' + _t1415;
}
,
Date.prototype.AddYears = function(_t1416) {
    this.setFullYear(this.getFullYear() + _t1416);
            return this;
}

var wsindex = 0
  , _mudSocket = WebSocket;

// 设置 window.WebSocket = null 以防止游戏页面代码创建额外的 WebSocket 连接，
// 避免覆盖 websocket-proxy.js 中共享的 ws 变量。WSClient 使用已保存的 _mudSocket 创建连接。
window.WebSocket = null;

function WSClient(url, options) {
    this.IP = url;
    this.Port = options;
}
WSClient.prototype.Connect = function(_t1419) {
    try {
        var _t1421 = location.protocol == "http:" ? 'ws' : "wss";
        this.ws = new _mudSocket(_t1421 + '://' + this.IP + ':' + this.Port);
        this.ws.onopen = this.OnConnect;
        this.ws.onclose = this.OnClose.bind(this);
        this.ws.onerror = this.OnError;
        this.ws.onmessage = this.OnReceived.bind(this);
        this.index = wsindex++;
    } catch (_t1422) {
        this.OnError && this.OnError(_t1422);
    }
}
,
WSClient.prototype.OnReceived = function(_t1423) {
    if (!_t1423 || !_t1423.data)
        return;
    var _t1425 = _t1423.data;
    if (_t1425[0] === '{' || _t1425[0] === '[') {
        // 【2026-08-11 容错】服务器消息为单引号 JSON（标准 JSON.parse 会挂，故用 new Function）。
        // 损坏/截断数据会让 new Function 构造抛错 → 原代码无 try，异常冒泡中断该消息处理。
        // 现在：解析失败降级为文本消息显示并记录，不中断挂机。
        var parsed;
        try {
            var _fn27 = new Function("return " + _t1425 + ';');
            parsed = _fn27();
        } catch (e) {
            try { ExtLog.warn('[WS] 消息解析失败，已忽略损坏数据:', e && e.message); } catch (e2) { }
            this.OnMessage(_t1425);
            return;
        }
        try {
            this.OnData(parsed);
        } catch (e) {
            // 数据处理链异常：隔离该条消息，避免中断整条 onmessage
            try { ExtLog.error('[WS] 数据处理异常（已隔离）:', e && e.message); } catch (e2) { }
        }
    } else
        this.OnMessage(_t1425);
}
,
WSClient.prototype.Send = function(_t1426) {
    try {
        this.ws.send(_t1426);
    } catch (_t1427) {
        ReceiveMessage(_t1427);
    }
}
,
WSClient.prototype.Destroy = function() {
    this.ws.onclose = null;
    this.ws.close();
}
,
WSClient.prototype.Close = function() {
    this.ws.close();
}
,
WSClient.prototype.Connected = function() {
    return this.ws && this.ws.readyState === 1;
}

API.UserAPI = {
    'Login': function(_t1431, _t1432, _t1433) {
        return Util.Post("api/user/login", {
            'code': _t1431,
            'pwd': _t1432
        }, _t1433);
    },
    'IsRegistValidation': function(_t1434) {
        return Util.Get("UserAPI/IsRegistValidation", _t1434);
    },
    'ValidationImage': function(_t1436) {
        return Util.Get("api/user/validimage", _t1436);
    },
    'Regist': function(_t1438, _t1439) {
        return Util.Post("api/user/regist", _t1438, _t1439);
    },
    'Enter': function(_t1440, _t1441) {
        return Util.Get('e', [_t1440], _t1441);
    },
    'ChangePassword': function(_t1443, _t1444, _t1445, _t1446) {
        return Util.Post("api/user/changepassword", {
            'oldpwd': _t1443,
            'pwd': _t1444,
            'no': _t1445
        }, _t1446);
    },
    'LoginOut': function(_t1448) {
        return Util.Get("UserAPI/LoginOut", _t1448);
    },
    'GetRoles': function(_t1450, _t1451) {
        return Util.Get("UserAPI/GetRoles", [_t1450], _t1451);
    },
    'AddRole': function(_t1452, _t1453) {
        return Util.Post("UserAPI/AddRole", {
            'player': _t1452
        }, _t1453);
    },
    'GetUser': function(_t1454) {
        return Util.Get("UserAPI/GetUser", _t1454);
    },
    'Search': function(_t1456, _t1457, _t1458, _t1459) {
        return Util.Get("UserAPI/Search", [_t1456, _t1457, _t1458], _t1459);
    },
    'ResetPassword': function(_t1460, _t1461) {
        return Util.Get("UserAPI/ResetPassword", [_t1460], _t1461);
    },
    'RecoverUser': function(_t1462, _t1463) {
        return Util.Get("UserAPI/RecoverUser", [_t1462], _t1463);
    },
    'LoadPlayer': function(_t1464, _t1465, _t1466) {
        return Util.Get("UserAPI/LoadPlayer", [_t1464, _t1465], _t1466);
    },
    'GetPhone': function(_t1467) {
        return Util.Get("api/user/getphone", _t1467);
    },
    'BindPhone': function(_t1468, _t1469, _t1470, _t1471) {
        return Util.Post("api/user/bindphone", {
            'code': _t1468,
            'no': _t1469,
            'pwd': _t1470
        }, _t1471);
    },
    'SendValidateCode': function(_t1472, _t1473) {
        return Util.Get("UserAPI/SendValidateCode", [_t1472], _t1473);
    },
    'ResetPasswordByPhone': function(_t1475, _t1476, _t1477, _t1478, _t1479) {
        return Util.Post("api/user/resetpwd", {
            'name': _t1475,
            'phone': _t1476,
            'vcode': _t1477,
            'pwd': _t1478
        }, _t1479);
    },
    'NewServer': function(_t1481) {
        return Util.Get("UserAPI/NewServer", _t1481);
    },
    'GetServer': function(_t1482) {
        return Util.Get("api/game/servers", _t1482);
    }
};
function HideAndShow(hideSel, showSel) {
    var _t1484, _J92 = $(".login-content").children();
    for (var _n171 = 0; _n171 < _J92.length; _n171++) {
        if ($(_J92[_n171]).css('display') != "none") {
            _t1484 = $(_J92[_n171]);
            break;
        }
    }
    if (!_t1484)
        _t1484 = $("#login_panel");
    _t1484.animate({
        'opacity': 0
    }, "fast", function() {
        _t1484.hide();
        if (hideSel == ".container")
            $(".login-content").hide();
        else
            $(".login-content").show();
        hideSel && (hideSel = $(hideSel),
        hideSel.show(),
        hideSel.css("opacity", '0'),
        hideSel.animate({
            'opacity': 1
        }, "slow", showSel));
    });
}
function initIos() {
    window.isios = true;
    $("<style type='text/css'>body{-webkit-user-select:none;-webkit-user-drag:none;}</style>").appendTo("head");
    $(".download_cmd").remove();
}
function showNews(newsList) {
    HideAndShow($("#new_panel "));
    $("#news_frame").attr("src", "/news/" + newsList + ".html");
}
const storageUtil = {
    'setItem'(_t1488, _t1489) {
        try {
            if (!_t1489)
                return this.removeItem(_t1488);
            let _t1491 = _t1489;
            if (typeof _t1489 === "object")
                _t1491 = JSON.stringify(_t1489);
            localStorage.setItem(_t1488, _t1491);
            return true;
        } catch (_t1492) {
            console.error("存储数据失败:", _t1492);
            return false;
        }
    },
    'getItem'(_t1493, _t1494=null) {
        try {
            const _t1496 = localStorage.getItem(_t1493);
            if (!_t1496)
                return _t1494;
            if (_t1496[0] === '{' || _t1496[0] === '[')
                return JSON.parse(_t1496);
            return _t1496;
        } catch (_t1497) {
            console.error("获取数据失败:", _t1497);
            return _t1494;
        }
    },
    'removeItem'(_t1498) {
        try {
            localStorage.removeItem(_t1498);
            return true;
        } catch (_t1500) {
            console.error("移除数据失败:", _t1500);
            return false;
        }
    },
    'clearAll'() {
        try {
            localStorage.clear();
            return true;
        } catch (_t1502) {
            console.error("清除所有数据失败:", _t1502);
            return false;
        }
    }
};
