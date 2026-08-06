'use strict';

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
var isShowChat = false;
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
var ToolAction = {
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
    if (Dialog.extend.message_filter(event))
        return;
    Process.message.push(event);
    Process.message.scroll2end();
    Dialog.extend.trigger(event);
}
function ReceiveData(data) {
    if (Dialog.extend.data_filter(data))
        return;
    var _fn6 = Process[data.type];
    _fn6 && _fn6(data);
    Dialog.extend.process(data);
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
var Process = {
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
}
  , Warn = {
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
}
  , Combat = {
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
        if (_t204 > 0)
            _t203.css("backgroundSize", _t204 + '%\x20100%');
        else {
            if (_t204 < 0)
                _t204 = 0;
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
            _a14.push("<span class='pfm-item' pid='" + _t205[_n22].id + '\x27>');
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
                _t218.elem.css("backgroundSize", _t219 + '%\x20100%');
            } else
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
var MAP = {
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
}
  , Touch = {
    'List': {},
    'AddListener': function(_t327, _t328, _t329) {
        document.querySelector(_t328).addEventListener('touchstart', Touch.Start);
        _t327 === 'zoom' ? document.querySelector(_t328).addEventListener("touchmove", Touch.Move) : document.querySelector(_t328).addEventListener("touchend", Touch.End);
        if (!Touch.List[_t327])
            Touch.List[_t327] = [];
        Touch.List[_t327].push(_t329);
    },
    'Start': function(_t331) {
        Touch.StartPos = [];
        for (var _n51 = 0; _n51 < _t331.changedTouches.length; _n51++) {
            var _t333 = _t331.changedTouches[_n51];
            Touch.StartPos.push([_t333.screenX, _t333.screenY]);
        }
    },
    'Move': function(_t334) {
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
    'End': function(_t338) {
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
    'Zoom': function(_t341, _t342) {
        var _t344 = Touch.Distance(_t341[0], _t341[1])
          , _t345 = Touch.Distance(_t342[0], _t342[1]);
        Touch.On("zoom", {
            'zoom': _t345 / _t344
        });
    },
    'Distance': function(_t346, _t347) {
        return Math.sqrt(Math.pow(_t346[0] - _t347[0], 2) + Math.pow(_t346[1] - _t347[1], 2));
    },
    'Slide': function(_t349, _t350) {
        var _t352 = _t349[0] - _t350[0]
          , _t353 = _t349[1] - _t350[1];
        Math.abs(_t352) < Math.abs(_t353) && Math.abs(_t353) > 20 && Touch.On("slide", {
            'offY': _t353,
            'offX': _t352,
            'isTop': _t353 > 0
        });
    },
    'On': function(_t354, _t355) {
        var _t357 = Touch.List[_t354];
        if (!_t357)
            return;
        for (var _n54 = 0; _n54 < _t357.length; _n54++) {
            _t357[_n54](_t355);
        }
    }
};
const Dialog = {
    'isShow': false,
    'curItem': null,
    'show': function(_t358, _t359) {
        if (!_t358)
            return;
        if (!_t359) {
            if (this.isShow && _t358 === this.curItem)
                return this.hide();
            if (this.curItem && _t358 !== this.curItem) {
                if (Dialog[Dialog.curItem].close) {
                    Dialog[Dialog.curItem].close();
                }
                Dialog[Dialog.curItem].isShow = false;
                Dialog.contentElement.empty();
            }
            this.init();
            this.curItem = _t358;
            this[_t358].show(_t359);
            Process.message.scroll2end();
        } else
            this[_t358].onData(_t359);
    },
    'select': function(_t361) {
        if (this.isShow && _t361 === this.curItem)
            return this.hide();
        if (this.curItem && _t361 !== this.curItem) {
                if (Dialog[Dialog.curItem].close) {
                    Dialog[Dialog.curItem].close();
                }
                Dialog[Dialog.curItem].isShow = false;
                Dialog.contentElement.empty();
            }
        this.init();
        this.curItem = _t361;
    },
    'init': function() {
        if (this.isShow)
            return;
        if (!this.isInit) {
            this.contentElement = $(".dialog>.dialog-content");
            this.titleElement = $(".dialog>.dialog-header>.dialog-title");
            this.iconElement = $(".dialog>.dialog-header>.dialog-icon");
            this.footerElement = $(".dialog>.dialog-footer").on("click", ".footer-item", Dialog.footerClick);
            this.hiddenElement = $(".hidden-item");
            this.element = $(".dialog");
            $(".dialog>.dialog-header>.dialog-close").on("click", Dialog.hide);
            this.isInit = true;
        }
        $(".content-room").addClass("hide");
        this.element.removeClass("hide");
        this.isShow = true;
    },
    'hide': function() {
        if (Dialog[Dialog.curItem].hide && Dialog[Dialog.curItem].hide() === false)
            return;
        Dialog.close();
    },
    'footerClick': function() {
        var _J48 = $(this);
        if (_J48.is(".select"))
            return;
        var _t366 = _J48.attr("for");
        _J48.parent().find(".footer-item.select").removeClass('select');
        _J48.addClass('select');
        Dialog[Dialog.curItem].footerChanged(_t366, _J48);
    },
    'title': function(_t367) {
        Dialog.titleElement.html(_t367);
    },
    'icon': function(_t369) {
        this.iconElement.attr("class", "dialog-icon glyphicon glyphicon-" + _t369);
    },
    'footer': function(_t371) {
        _t371 ? this.footerElement.html(_t371) : this.footerElement.empty();
    },
    'close': function() {
        if (!Dialog.isShow)
            return;
        Dialog.isShow = false;
        $(".content-room").removeClass("hide");
        Dialog.element.addClass("hide");
    },
    'score': {
        'footer': [['属性', ".dialog-score"], ['详细', ".dialog-score2"], ['称号', ".dialog-titles"]],
        'selectIndex': 0,
        'onData': function(_t374) {
            console.log(_t374);
            this.data = _t374;
            this.init_elem();
            Dialog.titleElement.html(_t374.name);
            Dialog.icon("user");
            if (_t374.titles) {
                this.titles = _t374.titles;
                this.create_titles();
            }
            else {
                if (_t374.id && _t374.id != this.uid) {
                this.uid = _t374.id;
                if (this.uid != Process.player) {
                    Dialog.footerElement.find(".footer-item:eq(2)").hide();
                } else {
                    Dialog.footerElement.find(".footer-item:eq(2)").show();
                }
            }
                var _J49 = $(_t374.name ? this.footer[0][1] : this.footer[1][1])
                  , _t376 = _J49.find('span');
                for (var _n55 = 0; _n55 < _t376.length; _n55++) {
                    var _J50 = $(_t376[_n55])
                      , _t377 = _J50.attr("data-prop");
                    _t377 && _J50.html(_t374[_t377] || 0);
                }
            }
        },
        'init_elem': function() {
            Dialog.init();
            Dialog.curItem = "score";
            if (this.isShow)
                return;
            Dialog.footer('');
            for (let _n56 = 0; _n56 < this.footer.length; _n56++) {
                const _J51 = $("<span class='footer-item " + (this.selectIndex == _n56 ? "select" : '') + "' for='" + _n56 + '\x27>' + this.footer[_n56][0] + "</span>").appendTo(Dialog.footerElement);
                this.footer[_n56][1] = $(this.footer[_n56][1]);
            }
            this.isShow = true;
            this.footerChanged(this.selectIndex);
        },
        'show': function(_t379) {
            if (_t379)
                return;
            if (!this.selectIndex)
                SendCommand('score');
            else {
                if (this.selectIndex === 1)
                    SendCommand("score2");
                else
                    SendCommand("score title");
            }
            this.init_elem();
        },
        'close': function() {
            this.footer[this.selectIndex][1].remove();
            Dialog.footer('');
            this.isShow = false;
        },
        'footerChanged': function(_t382) {
            var _t384 = this.data;
            _t382 = parseInt(_t382);
            this.footer[this.selectIndex][1].remove();
            this.selectIndex = _t382;
            var _J52 = $(this.footer[this.selectIndex][1]).appendTo(Dialog.contentElement.empty());
            if (_t382 === 1) {
                if (this.uid && Process.player != this.uid)
                    SendCommand("score2 " + this.uid);
                else
                    SendCommand("score2");
            } else {
                if (_t382 === 2) {
                    if (!this.titles)
                        SendCommand("score title");
                    _J52.on("click", ".btn-noused", function(_t385) {
                        var _J53 = $(_t385.target);
                        if (_J53.is("red"))
                            _J53 = _J53.parent();
                        var _n57 = parseInt(_J53.attr("index"));
                        for (var _n58 = 0; _n58 < this.titles.length; _n58++) {
                            if (_n58 === _n57)
                                this.titles[_n58].use = this.titles[_n58].use ? false : true;
                            else
                                this.titles[_n58].use = false;
                        }
                        SendCommand("title " + _n57);
                        this.create_titles();
                    }
                    .bind(this));
                }
            }
        },
        'create_titles': function() {
            var _J54 = $(".dialog-titles")
              , _a22 = [];
            for (var _n59 = 0; _n59 < this.titles.length; _n59++) {
                _a22.push("<div class='title-item", this.titles[_n59].use ? " selected" : '', '\x27>');
                _a22.push(this.titles[_n59].title);
                _a22.push("<span class='btn-noused' index='");
                _a22.push(_n59);
                _a22.push('\x27>');
                _a22.push(this.titles[_n59].use ? "<red>取消</red>" : '使用');
                _a22.push("</span>");
                _a22.push("</div>");
            }
            _J54.html(_a22.length ? _a22.join('') : "<div class='empty'>你还没有获得任何称号</div>");
        }
    },
    'map': {
        'onData': function(_t388) {
            Dialog.title(_t388.title || '地图');
        },
        'show': function() {
            Dialog.init();
            var _t391 = MAP.Room.name
              , _t392 = _t391.indexOf('-');
            _t392 > -1 && (_t391 = _t391.substr(0, _t392));
            Dialog.title(_t391);
            Dialog.footer('');
            this.element = $(".map");
            Dialog.contentElement.append(this.element);
            Dialog.icon('map-marker');
            Dialog.iconElement.attr('class', "dialog-icon glyphicon glyphicon-map-marker");
        },
        'hide': function() {
            this.element.remove();
            if ($(".map-panel").children().length === 0)
                this.element.appendTo('.map-panel');
        },
        'close': function() {
            this.hide();
        }
    }
};
Dialog.skills = {
    'isShow': false,
    'selectItem': ".dialog-skills",
    'hide': function() {
        if (this.skill_element) {
            this.skill_element.remove();
            this.skill_element = null;
            this.element.removeClass("hide-item");
            this.create_footer();
            this.skill_element_id = null;
            return false;
        }
    },
    'close': function() {
        this.hide();
        this.element.remove();
        this.isShow = false;
        this.skill_element_id = null;
        this.element.removeClass('hide-item');
    },
    'limit': 0,
    'selected_item': -1,
    'showdesc': function(_t397) {
        if (!this.isShow)
            return;
        this.element.find(".item-commands").remove();
        if (this.skill_element)
            this.skill_element.remove();
        this.skill_element = $("<pre></pre>").html(_t397.desc).appendTo(this.element);
        this.skill_element_id = _t397.id;
        this.element.addClass("hide-item");
        let _a23 = ["<div class=\"item-commands\">"];
        if (this.master) {
            _a23.push("<span cmd=\"xue ", _t397.id, " from ", this.master, "\">学习</span>");
            if (this.is_follower) {
                _a23.push("<span cmd=\"dc ", this.master, " lingwu ", _t397.id, "\">进阶</span>");
                _a23.push("<span cmd=\"dc ", this.master, " fangqi ", _t397.id, "\">遗忘</span>");
            }
        }
        else {
            if (_t397.is_custom)
                _a23.push("<span cmd=\"zc ", _t397.id, "\">推演</span>");
            _a23.push("<span cmd=\"lingwu ", _t397.id, "\">进阶</span>");
            _a23.push("<span cmd=\"lingwu2 ", _t397.id, "\">融合</span>");
            _a23.push("<span cmd=\"fangqi ", _t397.id, "\">遗忘</span>");
        }
        _a23.push("</div>");
        Dialog.footer(_a23.join(''));
    },
    'footerChanged': function(_t399, _t400) {
        if (_t399 == this.selected_item && !_t400)
            return;
        this.selected_item = _t399;
        Dialog.skills.element.find(".item-commands").remove();
        if (_t399 == 2) {
            if (!this.books)
                SendCommand('sbook');
            else
                this.showBooks();
            return this.element.addClass("dialog-books");
        }
        if (this.element.is(".dialog-books")) {
            this.element.removeClass("dialog-books");
            this.create_footer();
            return this.createSkillItems(this.items);
        }
        if (_t399 == 0) {
            this.element.find(".base").removeClass("hide");
            this.element.find('.skill').addClass("hide");
        }
        else
            if (_t399 == 1) {
            this.element.find(".base").addClass("hide");
            this.element.find(".skill").removeClass("hide");
        }
    },
    'footers': ['基础', '特殊', '书架'],
    'eq_group': 0,
    'create_footer': function(_t402) {
        var _t404 = this.footers
          , _a24 = [];
        for (var _n60 = 0; _n60 < _t404.length; _n60++) {
            _a24.push("<span class='footer-item" + (_n60 == this.selected_item ? " select" : '') + "' for='" + _n60 + "''>" + _t404[_n60] + "</span>");
        }
        if (!_t402)
            for (let _n61 = 0; _n61 < 3; _n61++) {
                _a24.push("<span class=\"sk-group", 2 - _n61 === this.sk_group ? " select" : '', "\" group=\"", 2 - _n61, '\x22>', 3 - _n61, '</span>');
            }
        Dialog.footer(_a24.join(''));
    },
    'eq_group_click': function() {
        let _n62 = parseInt($(this).attr("group"));
        if (_n62 >= 0)
            SendCommand("skgroup " + _n62);
    },
    'updateSkill': function(_t405) {
        if (!this.skills)
            return;
        var _t407 = this.skills[_t405.id];
        if (!_t407)
            return this.addSkill(_t407);
        if (_t405.name)
            _t407.name = _t405.name;
        if (_t405.grade >= 0 && _t405.grade !== _t407.grade) {
            _t407.grade = _t405.grade;
            if (_t407.can_enables)
                for (let _t408 of _t407.can_enables) {
                    let _t409 = this.skills[_t408];
                    _t409 && _t409.enable_skill === _t405.id && this.updateSkillItem(_t409);
                }
        }
        if (_t405.enable) {
            if (_t407.enable_skill) {
                var _t410 = _t407.enable_skill;
                _t407.enable_skill = null;
                this.skills[_t410][_t405.id] = false;
                this.updateSkillItem(this.skills[_t410]);
            }
            this.skills[_t405.enable][_t405.id] = true;
            _t407.enable_skill = _t405.enable;
            this.updateSkillItem(this.skills[_t405.enable]);
            this.updateSkillItem(this.skills[_t405.id]);
        } else {
            if (_t405.exp !== undefined || _t405.level !== undefined) {
                if (_t405.level >= 0)
                    _t407.level = _t405.level;
                if (_t405.exp >= 0)
                    _t407.exp = _t405.exp;
                if (_t405.can_enables)
                    _t407.can_enables = _t405.can_enables;
                this.updateSkillItem(_t407);
            } else {
                if (_t405.enable === false) {
                    if (_t407.enable_skill) {
                        _t410 = _t407.enable_skill;
                        this.skills[_t410][_t405.id] = false;
                        _t407.enable_skill = null;
                        this.updateSkillItem(this.skills[_t410]);
                        this.updateSkillItem(this.skills[_t405.id]);
                    }
                }
            }
        }
    },
    'updateSkillItem': function(_t411) {
        var _t413 = this.element.find(".skill-item[skid='" + _t411.id + '\x27]');
        if (_t413) {
            let _t414 = _t413.css("display") === 'none';
            _t413.replaceWith(this.createSkillItem(_t411));
            if (_t414)
                _t413.hide();
        }
    },
    'addSkill': function(_t415) {
        if (!this.items || !_t415)
            return;
        if (this.skills[_t415.id])
            return this.updateSkill(_t415);
        this.items.push(_t415);
        this.skills[_t415.id] = _t415;
        this.items = this.sort_items(this.items);
        this.createSkillItems(this.items);
    },
    'format_books': function(_t417) {
        let _a25 = [];
        for (let _n63 = 0; _n63 < _t417.length; _n63++) {
            _a25.push({
                'name': _t417[_n63][0],
                'grade': _t417[_n63][1],
                'id': _n63
            });
        }
        return _a25;
    },
    'onData': function(_t419) {
        if (_t419.book) {
            if (!this.books)
                return;
            this.books.push({
                'name': _t419.book[0],
                'grade': _t419.book[1],
                'id': _t419.book[2]
            });
            if (this.isShow && this.selected_item == 2)
                return this.showBooks();
            return;
        }
        if (_t419.books) {
            this.books = this.format_books(_t419.books);
            if (this.isShow || !Dialog.master.isShow)
                return this.showBooks();
            else
                return Dialog.master.showBooks();
        }
        if (_t419.id && !_t419.desc) {
            if (_t419.from)
                return this.updateSkill.call(Dialog.master, _t419);
            return this.updateSkill(_t419);
        }
        if (_t419.item) {
            if (Dialog.master.isShow && Dialog.master.is_follower)
                return this.addSkill.call(Dialog.master, _t419.item);
            return this.addSkill(_t419.item);
        }
        if (!this.isShow) {
            if (Dialog.master.isShow)
                return Dialog.master.onData(_t419);
        }
        if (_t419.desc) {
            if (_t419.id)
                this.updateSkill(_t419);
            return this.showdesc(_t419);
        }
        if (_t419.remove && this.items) {
            if (_t419.from && _t419.from !== Process.player)
                return;
            this.items.Remove(this.skills[_t419.remove]);
            for (var _n64 = 0; _n64 < this.items.length; _n64++) {
                this.items[_n64].enable_skill == _t419.remove && (this.items[_n64].enable_skill = null);
            }
            delete this.skills[_t419.remove];
            if (this.skill_element && this.skill_element_id === _t419.remove) {
                this.hide();
            }
            return this.createSkillItems(this.items);
        }
        if (_t419.items) {
            this.title = _t419.title;
            Dialog.title(this.title + "，等级上限" + _t419.limit + '级');
            Dialog.icon("book");
            this.items = this.sort_items(_t419.items);
            this.skills = {};
            for (_n64 = 0; _n64 < this.items.length; _n64++) {
                var _t421 = this.items[_n64];
                this.skills[_t421.id] = _t421;
            }
            this.items.length > 10 && this.selected_item < 0 && this.footerChanged(0);
            this.createSkillItems(this.items);
        }
        if (_t419.sk_group >= 0) {
            this.sk_group = _t419.sk_group;
            this.limit = _t419.limit;
            this.create_footer();
        }
        if (_t419.limit >= 0) {
            this.limit = _t419.limit;
            Dialog.title(this.title + "，等级上限" + this.limit + '级');
        }
    },
    'show': function() {
        if (this.isShow)
            return;
        this.isShow = true;
        if (!this.element) {
            this.element = $("<div class=\"dialog-skills\"></div>");
            Dialog.footerElement.on('click', ".sk-group", Dialog.skills.eq_group_click);
        }
        this.element.on("click", ".skill-item", Dialog.skills.item_click);
        this.element.appendTo(Dialog.contentElement);
        this.element.removeClass("hide-item");
        if (!this.items)
            SendCommand('cha');
        else {
            SendCommand("cha none");
            Dialog.icon("book");
            this.create_footer();
        }
    },
    'isEnable': function(_t423, _t424) {
        if (!_t423.can_enables)
            return false;
        for (var _n65 = 0; _n65 < _t423.can_enables.length; _n65++) {
            var _t426 = _t424[_t423.can_enables[_n65]];
            if (_t426 && _t426.enable_skill == _t423.id)
                return true;
        }
        return false;
    },
    'showBooks': function() {
        var _a26 = []
          , _t428 = this.sort_items(this.books);
        for (let _t429 of _t428) {
            _a26.push("<div class=\"book-item ");
            _a26.push('grade', _t429.grade, "\" >");
            _a26.push("<div class=\"book-name\">", _t429.name, '</div>');
            _a26.push("<div class=\"book-action border-right\" cmd=\"sbook ", _t429.id, '\x22>查看</div>');
            _a26.push("<div class=\"book-action\" cmd=\"study ", _t429.id, "\">学习</div>");
            _a26.push('</div>');
        }
        this.element.html(_a26.join(''));
        this.create_footer(true);
    },
    'createSkillItem': function(_t430, _t431) {
        _t431 = _t431 || this.skills;
        var _a27 = [];
        _a27.push("<div class=\"skill-item ");
        _a27.push("grade" + _t430.grade);
        if (!this.master) {
            if (_t430.can_enables) {
                _a27.push(" skill");
                if (this.selected_item == 0)
                    _a27.push(" hide");
            } else {
                _a27.push(" base");
                if (this.selected_item == 1)
                    _a27.push('\x20hide');
            }
        }
        var _t433 = this.isEnable(_t430, _t431);
        _t433 && _a27.push(" enable");
        _a27.push('\x22\x20skid=\x22' + _t430.id + '\x22>');
        _a27.push("<span class=\"glyphicon glyphicon-ok enable-flag\"></span>");
        _a27.push(_t430.name);
        if (_t430.enable_skill && _t431) {
            var _t434 = _t431[_t430.enable_skill];
            if (_t434) {
            _a27.push("<span class=\"enable_skill\">已装备：");
            _a27.push(wrap_name(_t434));
            _a27.push('</span>');
        }
        }
        _a27.push("<span class=\"skill-level\">");
        _a27.push(_t430.level);
        _a27.push("级 / ");
        _a27.push(_t430.exp);
        _a27.push('%');
        _a27.push("&nbsp;");
        _a27.push(Dialog.skills.get_lvdesc(_t430.level));
        _a27.push("</span></div>");
        return _a27.join('');
    },
    'sort_items': function(_t435) {
        if (!_t435 || !Setting.auto_sortitem)
            return _t435;
        var _a28 = [];
        for (var _n66 = 0; _n66 < _t435.length; _n66++) {
            var _t437 = _t435[_n66]
              , _b1 = false;
            for (var _n67 = 0; _n67 < _a28.length; _n67++) {
                if (_t437.grade > _a28[_n67].grade) {
                    _a28.splice(_n67, 0, _t437);
                    _b1 = true;
                    break;
                }
            }
            !_b1 && _a28.push(_t437);
        }
        return _a28;
    },
    'createSkillItems': function(_t438, _t439) {
        let _a29 = [];
        for (var _n68 = 0; _n68 < _t438.length; _n68++) {
            _a29.push(this.createSkillItem(_t438[_n68], _t439));
        }
        this.element.html(_a29.join(''));
    },
    'level_color': ["wht", "hig", 'hic', "hij", "hiz", "hio", 'ord'],
    'get_lvdesc': function(_t441) {
        if (_t441 < 1000)
            return Dialog.skills.skill_levels[parseInt(_t441 / 50)];
        var _n69 = Math.trunc((_t441 - 1000) / 500);
        if (_n69 > 6)
            _n69 = 6;
        return Dialog.skills.skill_levels[_n69 + 20];
    },
    'skill_levels': ["<BLU>初学乍练</BLU>", "<BLU>不知所以</BLU>", "<HIB>粗通皮毛</HIB>", "<HIB>渐有所悟</HIB>", "<YEL>半生不熟</YEL>", "<YEL>马马虎虎</YEL>", "<HIY>平淡无奇</HIY>", "<HIY>触类旁通</HIY>", "<HIG>心领神会</HIG>", "<HIG>挥洒自如</HIG>", "<HIC>驾轻就熟</HIC>", "<HIC>出类拔萃</HIC>", "<CYN>初入佳境</CYN>", "<CYN>神乎其技</CYN>", "<MAG>威不可当</MAG>", "<HIW>豁然贯通</HIW>", "<HIW>超群绝伦</HIW>", "<RED>登峰造极</RED>", "<WHT>登堂入室</WHT>", "<HIM>一代宗师</HIM>", "<WHT>超凡入圣</WHT>", "<HIO>出神入化</HIO>", "<HIO>独步天下</HIO>", "<HIR>空前绝后</HIR>", "<HIR>旷古绝伦</HIR>", "<HIW>深不可测</HIW>", "<HIW>返璞归真</HIW>"],
    'item_click': function() {
        var _J55 = $(this)
          , _a30 = ["<div class='item-commands'>"]
          , _t444 = Dialog.skills.skills[_J55.attr("skid")];
        if (!_t444)
            return;
        _a30.push("<span cmd=\"checkskill " + _t444.id + ("\">查看详细</span>"));
        if (_t444.can_enables)
            for (var _n70 = 0; _n70 < _t444.can_enables.length; _n70++) {
                var _t445 = Dialog.skills.skills[_t444.can_enables[_n70]];
                if (!_t445)
                    continue;
                if (_t445.enable_skill != _t444.id)
                    _a30.push("<span cmd=\"enable " + _t445.id + '\x20' + _t444.id + "\">装备" + _t445.name + '</span>');
                else
                    _a30.push("<span cmd=\"enable " + _t445.id + (" none\">取消装备") + _t445.name + "</span>");
            }
        if (_t444.enable_skill) {
            var _t446 = Dialog.skills.skills[_t444.enable_skill];
            if (_t446)
                _a30.push("<span cmd=\"enable " + _t444.id + (" none\">取消装备") + _t446.name + '</span>');
            else
                _t444.enable_skill = null;
        }
        _a30.push("<span cmd=\"_confirm fangqi " + _t444.id + ("\">遗忘</span>"));
        _a30.push("<span cmd=\"lianxi " + _t444.id + ("\">练习</span>"));
        SCRIPT.LAST_OBJ = _t444;
        let _t447 = Dialog.extend.query('skill', _t444);
        for (let _t448 of _t447) {
            _a30.push("<span cmd=\"", _t448.cmd, '\x22>', _t448.name, '</span>');
        }
        _a30.push('</div>');
        Dialog.skills.element.find(".item-commands").remove();
        $(_a30.join('')).insertAfter(_J55);
        checkScroll(_J55.next());
    }
},
Dialog.master = {
    'isShow': false,
    'hide': function() {
        if (this.skill_element) {
            this.skill_element.remove();
            this.skill_element = null;
            this.element.removeClass("hide-item");
            Dialog.footer('');
            return false;
        }
        this.isShow = false;
    },
    'close': Dialog.skills.close,
    'createSkillItems': Dialog.skills.createSkillItems,
    'createSkillItem': Dialog.skills.createSkillItem,
    'updateSkill': Dialog.skills.updateSkill,
    'updateSkillItem': Dialog.skills.updateSkillItem,
    'showdesc': Dialog.skills.showdesc,
    'isEnable': Dialog.skills.isEnable,
    'onData': function(_t450) {
        if (_t450.desc)
            return this.showdesc(_t450);
        if (_t450.id)
            return this.updateSkill(_t450);
        if (_t450.books)
            return this.showBooks();
        if (_t450.remove && _t450.from === this.master) {
            this.items.Remove(this.skills[_t450.remove]);
            var _t452 = this.skills[_t450.remove];
            for (var _n71 = 0; _n71 < this.items.length; _n71++) {
                this.items[_n71].enable_skill == _t450.remove && (this.items[_n71].enable_skill = null);
            }
            delete this.skills[_t450.remove];
            return this.createSkillItems(this.items);
        }
        if (!_t450.master && !_t450.follower)
            return;
        Dialog.show("master");
        this.master = _t450.master || _t450.follower;
        this.is_follower = !!_t450.follower;
        var _o5 = {};
        for (_n71 = 0; _n71 < _t450.items.length; _n71++) {
            var _t453 = _t450.items[_n71];
            _o5[_t453.id] = _t453;
        }
        this.skills = _o5;
        this.items = _t450.items;
        Dialog.title(_t450.title);
        Dialog.icon('book');
        this.createSkillItems(_t450.items, _o5);
        if (_t450.limit) {
            if (this.is_follower) {
                let _a31 = ["<div class=\"footer-item select\" for=\"0\">", "技能</div>"];
                _a31.push("<div class=\"footer-item\" for=\"1\">书架</div>");
                _a31.push("<span class='obj-money'>", _t450.target, "目前的技能上限为<HIC>", _t450.limit, "</HIC>级</span>");
                Dialog.footer(_a31.join(''));
            } else
                Dialog.footer("<span class='obj-money'>你目前的技能上限为<HIC>" + _t450.limit + ("</HIC>级</span>"));
        }
    },
    'create_footer': function() {},
    'selectedItem': 0,
    'footerChanged': function(_t454) {
        _t454 = parseInt(_t454);
        if (_t454 === this.selectedItem)
            return;
        this.selectedItem = _t454;
        if (_t454 === 0) {
            this.element.removeClass("dialog-books");
            this.createSkillItems(this.items, this.skills);
        }
        else {
            if (!Dialog.skills.books)
                SendCommand("sbook");
            else
                this.showBooks();
            return this.element.addClass("dialog-books");
        }
    },
    'showBooks': function() {
        if (!this.isShow || !this.is_follower)
            return;
        var _a32 = []
          , _t457 = Dialog.skills.sort_items(Dialog.skills.books);
        for (let _t458 of _t457) {
            _a32.push("<div class=\"book-item ");
            _a32.push("grade", _t458.grade, "\" >");
            _a32.push("<div class=\"book-name\">", _t458.name, "</div>");
            _a32.push("<div class=\"book-action border-right\" cmd=\"sbook ", _t458.id, "\">查看</div>");
            _a32.push("<div class=\"book-action\" cmd=\"dc ", Dialog.master.master, " study ", _t458.id, "\">学习</div>");
            _a32.push("</div>");
        }
        this.element.html(_a32.join(''));
    },
    'show': function() {
        if (this.isShow)
            return;
        if (!this.element) {
            this.element = $("<div class=\"dialog-skills\"></div >");
        }
        this.element.on('click', ".skill-item", this.item_click);
        this.element.appendTo(Dialog.contentElement);
        this.element.removeClass('hide-item');
        this.isShow = true;
    },
    'item_click': function() {
        var _J56 = $(this)
          , _t461 = Dialog.master.skills[_J56.attr("skid")];
        if (!_t461)
            return;
        var _a33 = ["<div class='item-commands'>"];
        _a33.push("<span cmd=\"checkskill " + _t461.id + '\x20' + Dialog.master.master + ("\">查看详细</span>"));
        _a33.push("<span cmd=\"xue " + _J56.attr("skid") + " from " + Dialog.master.master + ("\">学习</span>"));
        _t461.master = 1;
        if (Dialog.master.is_follower) {
            var _t462 = "dc " + Dialog.master.master;
            _a33.push("<span cmd=\"_confirm " + _t462 + '\x20fangqi\x20' + _J56.attr("skid") + ("\">遗忘</span>"));
            _a33.push("<span cmd=\"" + _t462 + " lianxi " + _J56.attr('skid') + ("\">练习</span>"));
            if (_t461.can_enables)
                for (var _n72 = 0; _n72 < _t461.can_enables.length; _n72++) {
                    var _t463 = Dialog.master.skills[_t461.can_enables[_n72]];
                    if (!_t463)
                        continue;
                    if (_t463.enable_skill != _t461.id)
                        _a33.push("<span cmd=\"" + _t462 + " enable " + _t463.id + '\x20' + _t461.id + "\">装备" + _t463.name + "</span>");
                    else
                        _a33.push("<span cmd=\"" + _t462 + '\x20enable\x20' + _t463.id + (" none\">取消装备") + _t463.name + "</span>");
                }
            if (_t461.enable_skill) {
                var _t464 = Dialog.master.skills[_t461.enable_skill];
                if (_t464)
                    _a33.push("<span cmd=\"" + _t462 + " enable " + _t461.id + (" none\">取消装备") + _t464.name + "</span>");
                else
                    _t461.enable_skill = null;
            }
            _t461.master = 0;
        }
        SCRIPT.LAST_OBJ = _t461;
        let _t465 = Dialog.extend.query('mskill', _t461);
        for (let _t466 of _t465) {
            _a33.push("<span cmd=\"", _t466.cmd, '\x22>', _t466.name, '</span>');
        }
        _a33.push("</div>");
        Dialog.master.element.find(".item-commands").remove();
        $(_a33.join('')).insertAfter(_J56);
        checkScroll(_J56);
    }
};
Dialog.pack = {
    'close': Dialog.skills.close,
    'hide': Dialog.skills.hide,
    'command_before': '',
    'updateitem': function(_t467) {
        var _a34;
        if (_t467.money !== undefined) {
            this.money = _t467.money;
            this.show_moeny();
        }
        if (_t467.eq_group !== undefined) {
            this.eq_group = _t467.eq_group;
            this.show_moeny();
        }
        else {
            if (_t467.eq !== undefined && this.items) {
                for (var _n73 = 0; _n73 < this.items.length; _n73++) {
                    if (this.items[_n73].id == _t467.id) {
                        this.eqs[_t467.eq] = this.items[_n73];
                        this.items.splice(_n73, 1);
                        break;
                    }
                }
                this.show_items();
            } else {
                if (_t467.uneq !== undefined && this.items) {
                    var _t469 = this.eqs[_t467.uneq];
                    _t469.can_eq = 1;
                    _t469.count = 1;
                    this.items.push(_t469);
                    this.eqs[_t467.uneq] = null;
                    this.show_items();
                } else {
                    if (_t467.locked >= 0) {
                        let _t470 = this.get_item(_t467.id);
                        if (_t470) {
                            _t470.is_lock = _t467.locked;
                            let _t471 = this.packElement.find('[oindex=\x22' + _t467.id + '\x22]');
                            _t470.is_lock ? _t471.addClass("lock") : _t471.removeClass("lock");
                        }
                    } else {
                        if (_t467.jldesc) {
                            _a34 = [];
                            _a34.push(_t467.jldesc);
                            _a34.push("<span class='item-commands'>");
                            _a34.push("<span cmd=\"" + this.command_before + "jinglian " + _t467.id + (" ok\">精炼</span>"));
                            _a34.push("<span cmd=\"" + this.command_before + 'jinglian\x20' + _t467.id + (" full\">精炼到满级</span>"));
                            _a34.push("</span>");
                            this.show_sub(_a34.join(''));
                        } else {
                            if (_t467.xqdesc) {
                                _a34 = [];
                                _a34.push(_t467.xqdesc);
                                _a34.push("<span class='item-commands'>");
                                for (_n73 = 0; _n73 < _t467.stones.length; _n73++) {
                                    var _t472 = _t467.stones[_n73];
                                    _a34.push("<span cmd=\"" + this.command_before + "xiangqian " + _t467.id + '\x20' + _t472.id + "\">镶嵌" + _t472.name + ("</span><br/>"));
                                }
                                _a34.push("</span>");
                                this.show_sub(_a34.join(''));
                            } else {
                                if (_t467.desc) {
                                    _a34 = [];
                                    _a34.push(_t467.desc);
                                    _a34.push("<span class='item-commands'>");
                                    var _t473 = _t467.from;
                                    if (_t473 === 'eq')
                                        _a34.push("<span cmd=\"" + this.command_before + "uneq " + _t467.id + ("\">取消装备</span>"));
                                    else {
                                        if (_t473 === "item") {
                                            var _t474 = this.get_item(_t467.id);
                                            SCRIPT.LAST_OBJ = _t474;
                                            _t474 && this.create_item_command(_t474, _a34, _t467.commands);
                                        } else {
                                            if (_t473 === "store")
                                                _a34.push("<span cmd=\"_confirm qu " + _t467.id + ("\">取出</span>"));
                                            else
                                                _t473 === 'sj' ? _a34.push("<span cmd=\"_confirm qu " + _t467.id + ("\">取出</span>")) : _a34.push("<span cmd=\"_confirm buy 1 " + _t467.id + " from " + Dialog.list.seller + ("\">购买</span>"));
                                        }
                                    }
                                    _a34.push('</span>');
                                    this.show_sub(_a34.join(''));
                                } else {
                                    if (_t467.remove && this.items) {
                                        var _t475 = this.items;
                                        for (_n73 = 0; _n73 < _t475.length; _n73++) {
                                            if (_t475[_n73].id == _t467.id) {
                                                if (_t467.remove >= _t475[_n73].count) {
                                                    _t475.splice(_n73, 1);
                                                    Combat.DisObj(_t467);
                                                } else {
                                                    _t475[_n73].count -= _t467.remove;
                                                }
                                                break;
                                            }
                                        }
                                        if (this.isShow)
                                            this.show_items();
                                        else
                                            return false;
                                    } else {
                                        if (_t467.name && this.items) {
                                            _t469 = this.get_item(_t467.id);
                                            _t469 ? (_t469.count = _t467.count,
                                            _t469.name = _t467.name) : this.items.push(_t467);
                                            if (this.isShow)
                                                this.show_items();
                                            else
                                                return false;
                                        } else {
                                            if (_t467.max_item_count) {
                                                this.max_count = _t467.max_item_count;
                                                ReceiveMessage((Dialog.pack2.isShow ? Dialog.pack2.target_name : '你') + '的背包容量扩充为' + this.max_count + '。');
                                                this.show_items();
                                            }
                                            else
                                                return false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    },
    'get_item': function(_t476, _t477) {
        _t477 = _t477 || this.items;
        if (!_t477)
            return;
        for (var _n74 = 0; _n74 < _t477.length; _n74++) {
            if (_t477[_n74] && _t477[_n74].id == _t476)
                return _t477[_n74];
        }
    },
    'show_sub': function(_t479) {
        if (this.objelement)
            this.objelement.remove();
        var _t481 = this.packElement;
        Dialog.list.isShow && (_t481 = Dialog.list.rightElement);
        this.objelement = $("<pre class='obj-desc'>" + _t479 + "</pre>").appendTo(_t481.parent()).on("click", function() {
            this.objelement.remove();
            this.objelement = null;
            _t481.show();
        }
        .bind(this));
        _t481.hide();
    },
    'onData': function(_t483) {
        if (_t483.items) {
            this.eqs = this.formatEqs(_t483.eqs || []);
            this.money = _t483.money;
            this.eq_group = _t483.eq_group;
            this.items = this.formatItems(_t483.items);
            this.max_count = _t483.max_item_count;
            if (this.isShow) {
            this.show_items();
            this.show_moeny();
        }
        }
        else {
            if (Dialog.pack2.isShow && !_t483.name)
                return Dialog.pack2.onData(_t483);
            if (this.updateitem(_t483))
                return;
        }
        if (!this.isShow) {
            if (Dialog.list.isShow)
                return Dialog.list.update_pack(_t483);
            if (Dialog.trade.isShow)
                return Dialog.trade.update_pack(_t483);
        }
    },
    'formatPackItem': function(_t485) {
        return {
            'name': _t485[0],
            'id': _t485[1],
            'count': _t485[2],
            'grade': _t485[3],
            'unit': _t485[4],
            'value': _t485[5],
            'can_eq': _t485[6],
            'can_use': _t485[7],
            'can_study': _t485[8],
            'can_open': _t485[9],
            'can_combine': _t485[10],
            'is_lock': _t485[11],
            'otype': _t485[12]
        };
    },
    'formatItems': function(_t486) {
        let _a35 = [];
        for (let _t488 of _t486) {
            _a35.push(this.formatPackItem(_t488));
        }
        return _a35;
    },
    'formatEqs': function(_t489) {
        let _a36 = [];
        for (let _t491 of _t489) {
            if (!_t491)
                _a36.push(_t491);
            else
                _a36.push({
                    'name': _t491[0],
                    'id': _t491[1],
                    'grade': _t491[2],
                    'can_use': _t491[3],
                    'is_lock': _t491[4]
                });
        }
        return _a36;
    },
    'show_moeny': function() {
        if (!this.isShow)
            return;
        let _t493 = moneyToStr(this.money)
          , _a37 = [];
        for (let _n75 = 0; _n75 < 3; _n75++) {
            _a37.push("<span class=\"footer-item eq-group", _n75 === this.eq_group ? " select" : '', "\" for=\"", _n75 + 1, '\x22>', _n75 + 1, "</span>");
        }
        _a37.push("<div class='obj-money'>");
        if (this.packElement.is('.cleanup')) {
            _a37.push("<span for='cancle' class='footer-item'>取消</span>");
            _a37.push("<span for='store' class='footer-item'>自动存仓</span>");
            _a37.push("<span for='sell' class='footer-item'>清理杂物</span>");
            _a37.push("<span for='cleanup' class='footer-item'>确定</span></div>");
        } else {
            _a37.push('你', _t493 ? "身上有" + _t493 : "身上没有任何银两");
            _a37.push("<span for='cleanup' class='footer-item'>整理包裹</span></div>");
        }
        Dialog.footer(_a37.join(''));
    },
    'cleanup_cmds': {
        'cleanup': true,
        'cancle': true,
        'store': true,
        'sell': true
    },
    'footerChanged': function(_t494, _t495) {
        if (this.cleanup_cmds[_t494])
            return this.cleanup(_t494, _t495);
        let _n76 = parseInt(_t494) - 1;
        if (!(_n76 >= 0 && _n76 < 3))
            return;
        SendCommand("eqgroup " + _n76);
    },
    'cleanup': function(_t497, _t498) {
        let _t500 = this;
        _t498.removeClass("select");
        if (_t500.packElement.is(".cleanup")) {
            if (_t497 === "cleanup")
                _t500.packElement.find(".obj-item>.selected").each(this.cleanup_item);
            else {
                if (_t497 === "store")
                    SendCommand((this.command_before ?? '') + 'store\x20all');
                else
                    _t497 === 'sell' && SendCommand((this.command_before ?? '') + "sell all");
            }
            _t500.packElement.removeClass("cleanup");
            this.show_moeny();
        } else {
            _t500.packElement.find(".item-commands").remove();
            _t500.packElement.addClass('cleanup');
            _t500.show_items();
            this.show_moeny();
        }
    },
    'cleanup_item': function(_t501, _t502) {
        let _J57 = $(_t502)
          , _t504 = _J57.parent().attr("oindex")
          , _t505 = _J57.attr("cmd");
        SendCommand(_t505 + '\x20' + _t504);
    },
    'show_items': function() {
        if (!this.packElement)
            return;
        this.createItems();
        this.create_eqs();
        Dialog.icon("briefcase");
        var _t507 = this.target_name || '你';
        Dialog.title(this.items && this.items.length ? _t507 + '身上共有' + this.items.length + '/' + this.max_count + "件物品" : _t507 + "身上没有任何东西");
    },
    'init_element': function() {
        if (!this.element) {
            this.element = $("<div class=\"dialog-pack\"><div class=\"eq-list\"><div class=\"eq-item\"><span class=\"eq-type\">武器</span><span class=\"eq-name\"></span></div><div class=\"eq-item\"><span class=\"eq-type\">衣服</span><span class=\"eq-name\"></span>" + ("</div > <div class=\"eq-item\"><span class=\"eq-type\">鞋</span><span class=\"eq-name\"></span></div> <div class=\"eq-item\"><span class=\"eq-type\">头部</span><span class=\"eq-name\"></span></div> <div class=\"eq-item\">") + ("<span class=\"eq-type\">披风</span><span class=\"eq-name\"></span></div> <div class=\"eq-item\"><span class=\"eq-type\">戒指</span><span class=\"eq-name\"></span></div> <div class=\"eq-item\"><span class=\"eq-type\">项链</span><span class=\"eq-name\"></span>") + ("</div> <div class=\"eq-item\"><span class=\"eq-type\">饰品</span><span class=\"eq-name\"></span></div> <div class=\"eq-item\"><span class=\"eq-type\">护腕</span><span class=\"eq-name\"></span></div>") + ("<div class=\"eq-item\"><span class=\"eq-type\">腰带</span><span class=\"eq-name\"></span></div><div class=\"eq-item\"><span class=\"eq-type\">暗器</span><span class=\"eq-name\"></span></div></div><div class=\"obj-list\"></div></div>"));
        }
        this.packElement = this.element.find('.obj-list');
        this.eqElement = this.element.find(".eq-list");
    },
    'show': function() {
        if (!Dialog.isShow)
            Dialog.show();
        if (this.objelement) {
            this.objelement.remove();
            this.objelement = null;
            if (this.packElement) this.packElement.show();
        }
        if (this.isShow)
            return SendCommand(this.items ? "pack none" : "pack");
        this.isShow = true;
        this.init_element();
        this.packElement.on('click', ".obj-item", Dialog.pack.item_click);
        this.eqElement.on('click', ".eq-item", Dialog.pack.eqitem_click);
        this.packElement.removeClass("cleanup");
        this.element.appendTo(Dialog.contentElement);
        if (!this.items)
            SendCommand("pack");
        else {
            SendCommand("pack none");
            this.show_items();
        }
    },
    'create_eqs': function() {
        var _t511 = this.eqElement.children();
        for (var _n77 = 0; _n77 < _t511.length; _n77++) {
            var _t512 = this.eqs[_n77];
            _t512 ? $(_t511[_n77]).attr('class', "eq-item grade" + _t512.grade).attr('oindex', _n77).find(".eq-name").html(_t512.name) : $(_t511[_n77]).attr('class', "eq-item empty").attr("oindex", '').find('.eq-name').html('');
        }
    },
    'levels': {
        'wht': 0,
        'hig': 1,
        'hic': 2,
        'hiy': 3,
        'hiz': 4,
        'hio': 5,
        'ord': 6
    },
    'sort_items': function(_t513) {
        if (!_t513 || !Setting.auto_sortitem)
            return _t513;
        var _a38 = [];
        for (var _n78 = 0; _n78 < _t513.length; _n78++) {
            var _t515 = _t513[_n78]
              , _b2 = false;
            for (var _n79 = 0; _n79 < _a38.length; _n79++) {
                if (_t515.grade < _a38[_n79].grade) {
                    _a38.splice(_n79, 0, _t515);
                    _b2 = true;
                    break;
                }
            }
            !_b2 && _a38.push(_t515);
        }
        return _a38;
    },
    'createItems': function() {
        if (!this.items)
            return;
        var _t517 = Dialog.pack.sort_items(this.items)
          , _a39 = [];
        let _t518 = this.packElement?.is(".cleanup");
        for (var _n80 = 0; _n80 < this.max_count; _n80++) {
            var _t519 = _t517[_n80];
            if (_t519) {
                _a39.push("<div class=\"obj-item ", _t519.is_lock ? "lock " : '', "grade", _t519.grade, '\x22\x20oindex=\x22');
                _a39.push(_t519.id);
                _a39.push('\x22>');
                _a39.push(_t519.name);
                if (this.show_type === 1) {
                    _a39.push("<span class='obj-value'>");
                    _a39.push('每');
                    _a39.push(_t519.unit);
                    _a39.push(moneyToStr(_t519.value));
                    _a39.push('：');
                    _a39.push(_t519.count);
                    _a39.push(_t519.unit);
                    _a39.push("</span>");
                }
                else
                    if (_t519.count > 1) {
                    _a39.push("<span class='obj-value'>");
                    _a39.push(_t519.count);
                    _a39.push(_t519.unit);
                    _a39.push("</span>");
                }
                if (_t518) {
                    _t519.grade > 0 && _a39.push("<span cmd='store' class='obj-oper", _t519.can_study ? '\x20selected' : '\x20', "'>存仓库</span>");
                    _t519.can_combine && _t519.count >= _t519.can_combine && _a39.push("<span cmd='combine' class='obj-oper'>合成</span>");
                    this.target_name && _a39.push("<span cmd='give ", Process.player, '\x20', _t519.count, "' class='obj-oper'>拿来</span>");
                    if (_t519.can_eq && _t519.grade > 0) {
                        _a39.push("<span cmd='sell' class='obj-oper'>卖掉</span>");
                        _a39.push("<span cmd='fenjie' class='obj-oper'>分解</span>");
                    }
                    else {
                        if (_t519.value > 0)
                            _a39.push("<span cmd='sell' class='obj-oper'>卖掉</span>");
                        else
                            !_t519.grade && _a39.push("<span cmd='drop' class='obj-oper'>丢掉</span>");
                    }
                }
            } else
                _a39.push("<div class=\"obj-item\" oindex=\"\">");
            _a39.push("</div>");
        }
        this.packElement.html(_a39.join(''));
    },
    'create_item_command': function(_t520, _t521, _t522) {
        _t521.push("<span cmd=\"_confirm " + this.command_before + 'drop\x20' + _t520.count + '\x20' + _t520.id + ("\">丢掉</span>"));
        _t521.push("<span cmd=\"lockobj " + _t520.id + '\x22>', _t520.is_lock ? '解锁' : '锁定', '</span>');
        if (_t520.can_eq) {
            _t521.push("<span cmd=\"" + this.command_before + "eq " + _t520.id + ("\">装备</span>"));
            if (!this.command_before) {
                _t521.push("<span cmd=\"jinglian " + _t520.id + ("\">精炼</span>"));
                _t521.push("<span cmd=\"xiangqian " + _t520.id + ("\">镶嵌</span>"));
                _t521.push("<span cmd=\"shortcut " + _t520.id + ("\">设置快速装备</span>"));
            }
            _t521.push("<span cmd=\"" + this.command_before + "fenjie " + _t520.id + ("\">分解</span>"));
        }
        if (_t520.can_use) {
            _t521.push("<span cmd=\"" + this.command_before + "use " + _t520.id + ("\">使用</span>"));
            if (!_t520.can_eq && !this.command_before) _t521.push("<span cmd=\"shortcut " + _t520.id + ("\">设置快速使用</span>"));
        }
        _t520.can_open && _t521.push("<span cmd=\"" + this.command_before + "open " + _t520.id + ("\">打开</span>"));
        _t520.can_study && _t521.push("<span cmd=\"" + this.command_before + "study " + _t520.id + ("\">学习</span>"));
        _t520.can_combine && _t520.count >= _t520.can_combine && _t521.push("<span cmd=\"_confirm " + this.command_before + 'combine\x20' + _t520.id + '\x20' + _t520.can_combine + ("\">合成</span>"));
        this.command_before && _t521.push("<span cmd=\"_confirm " + this.command_before + "give " + Process.player + '\x20' + _t520.count + '\x20' + _t520.id + ("\">拿来</span>"));
        _t522 = _t522 || [];
        Dialog.extend.append(_t522, "pack", _t520);
        for (var _n81 = 0; _n81 < _t522.length; _n81++) {
            if (_t522[_n81].extend)
                _t521.push("<span cmd=\"", _t522[_n81].cmd, '\x22>', _t522[_n81].name, '</span>');
            else
                _t521.push("<span cmd=\"packitem ", _t522[_n81].cmd, '\x20', _t520.id, '\x22>', _t522[_n81].name, "</span>");
        }
    },
    'item_click': function(_t524) {
        let _J58 = $(_t524.target)
          , _t526 = Dialog.pack.packElement.is(".cleanup");
        if (_t526 && _J58.is(".obj-oper"))
            return Dialog.pack.item_cleanup(_J58);
        _J58 = $(this);
        var _t527 = _J58.attr("oindex");
        if (!_t527)
            return;
        var _t528 = Dialog.pack.get_item(_t527);
        Dialog.pack.packElement.find(".item-commands").remove();
        if (!_t528)
            return;
        SCRIPT.LAST_OBJ = _t528;
        var _a40 = ["<span class='item-commands'>"];
        _a40.push("<span cmd=\"checkobj " + _t528.id + (" from item\">查看</span>"));
        Dialog.pack.create_item_command(_t528, _a40);
        _a40.push("</span>");
        _J58 = $(_a40.join('')).insertAfter(_J58);
        checkScroll(_J58);
    },
    'eqitem_click': function() {
        var _t530 = Dialog.pack.eqs[$(this).attr("oindex")];
        if (!_t530)
            return;
        SendCommand('checkobj\x20' + _t530.id + " from eq");
    },
    'item_cleanup': function(_t531) {
        if (_t531.is('.selected'))
            _t531.removeClass("selected");
        else {
            _t531.parent().find(".selected").removeClass("selected");
            _t531.addClass("selected");
        }
        return false;
    }
};
function checkScroll(container) {
    const _t534 = container.parent()
      , _t535 = _t534[0].getBoundingClientRect()
      , _t536 = container[0].getBoundingClientRect()
      , _t537 = _t536.top >= _t535.top && _t536.bottom <= _t535.bottom;
    if (!_t537) {
        _t534[0].scrollTop = _t534.scrollTop() + (_t536.bottom - _t535.bottom);
    }
}
Dialog.pack2 = {
    'onData': function(_t539) {
        this.show();
        if (_t539.items) {
            this.eqs = this.formatEqs(_t539.eqs || []);
            this.money = _t539.money;
            this.id = _t539.id;
            this.command_before = "dc " + this.id + '\x20';
            this.items = this.formatItems(_t539.items);
            this.target_name = _t539.name;
            this.max_count = _t539.max_item_count;
            this.show_items();
            this.show_moeny();
        } else {
            this.updateitem(_t539);
        }
    },
    'cleanup_cmds': Dialog.pack.cleanup_cmds,
    'formatEqs': Dialog.pack.formatEqs,
    'formatItems': Dialog.pack.formatItems,
    'formatPackItem': Dialog.pack.formatPackItem,
    'createItems': Dialog.pack.createItems,
    'create_eqs': Dialog.pack.create_eqs,
    'init_element': Dialog.pack.init_element,
    'show_items': Dialog.pack.show_items,
    'updateitem': Dialog.pack.updateitem,
    'footerChanged': Dialog.pack.footerChanged,
    'cleanup': Dialog.pack.cleanup,
    'show_moeny': function() {
        if (!this.isShow)
            return;
        let _t542 = moneyToStr(this.money)
          , _a41 = [];
        _a41.push("<div class='obj-money'>");
        if (this.packElement.is('.cleanup')) {
            _a41.push("<span for='cancle' class='footer-item'>取消</span>");
            _a41.push("<span for='store' class='footer-item'>自动存仓</span>");
            _a41.push("<span for='sell' class='footer-item'>清理杂物</span>");
            _a41.push("<span for='cleanup' class='footer-item'>确定</span></div>");
        } else {
            _a41.push(this.target_name, _t542 ? "身上有" + _t542 : '身上没有任何银两');
            _a41.push("<span for='cleanup' class='footer-item'>整理</span></div>");
        }
        Dialog.footer(_a41.join(''));
    },
    'cleanup_item': function(_t543, _t544) {
        let _J59 = $(_t544)
          , _t546 = _J59.parent().attr("oindex")
          , _t547 = _J59.attr('cmd');
        SendCommand(Dialog.pack2.command_before + '\x20' + _t547 + '\x20' + _t546);
    },
    'show_sub': Dialog.pack.show_sub,
    'close': Dialog.skills.close,
    'hide': function() {
        this.element.remove();
        this.isShow = false;
    },
    'get_item': Dialog.pack.get_item,
    'create_item_command': Dialog.pack.create_item_command,
    'show': function() {
        if (!Dialog.isShow)
            Dialog.show('pack2');
        if (this.objelement) {
            this.objelement.remove();
            this.objelement = null;
            if (this.packElement) this.packElement.show();
        }
        if (this.isShow)
            return;
        this.isShow = true;
        this.init_element();
        this.packElement.on("click", ".obj-item", this.item_click);
        this.eqElement.on("click", ".eq-item", this.eqitem_click);
        this.element.appendTo(Dialog.contentElement);
    },
    'item_click': function(_t550) {
        let _J60 = $(_t550.target)
          , _t552 = Dialog.pack2.packElement.is('.cleanup');
        if (_t552 && _J60.is(".obj-oper"))
            return Dialog.pack.item_cleanup(_J60);
        _J60 = $(this);
        var _t553 = _J60.attr('oindex');
        if (!_t553)
            return;
        var _t554 = Dialog.pack2.get_item(_t553);
        Dialog.pack2.element.find(".item-commands").remove();
        if (!_t554)
            return;
        SCRIPT.LAST_OBJ = _t554;
        var _a42 = ["<span class='item-commands'>"];
        _a42.push("<span cmd=\"" + Dialog.pack2.command_before + " checkobj " + _t554.id + (" from item\">查看</span>"));
        Dialog.pack2.create_item_command(_t554, _a42);
        _a42.push("</span>");
        _J60 = $(_a42.join('')).insertAfter(_J60);
        checkScroll(_J60);
    },
    'eqitem_click': function() {
        var _t556 = Dialog.pack2.eqs[$(this).attr("oindex")];
        if (!_t556)
            return;
        SendCommand(Dialog.pack2.command_before + '\x20checkobj\x20' + _t556.id + " from eq");
    }
},
Dialog.trade = {
    'hide': function() {
        this.element.remove();
        this.isShow = false;
    },
    'close': function() {
        this.hide();
    },
    'onData': function(_t559) {
        !this.isShow && Dialog.show("trade");
        Dialog.title('和' + _t559.name + "交易中");
        var _t561 = Dialog.pack.items;
        this.trade_target = _t559.target;
        this.trade_list.length = 0;
        if (!Dialog.pack.items)
            SendCommand("pack");
        else
            this.update_pack();
        Dialog.pack.isShow = false;
        this.create_items(this.leftElement.empty(), this.trade_list, this.max_count);
    },
    'update_pack': function(_t562) {
        this.create_items(this.rightElement.empty(), Dialog.pack.items, Dialog.pack.max_count);
    },
    'max_count': 10,
    'trade_list': [],
    'show': function(_t564) {
        if (this.isShow)
            return;
        Dialog.init();
        Dialog.curItem = 'trade';
        if (!this.element) {
            this.element = $("<div class=\"dialog-list\"><div class=\"obj-list\"></div><div class=\"obj-list\"></div></div >");
            this.leftElement = $(this.element.children()[0]);
            this.rightElement = $(this.element.children()[1]);
        }
        this.leftElement.on("click", ".obj-item", this.left_click);
        this.rightElement.on('click', '.obj-item', this.right_click);
        this.element.appendTo(Dialog.contentElement.empty());
        this.create_footer();
        this.isShow = true;
    },
    'create_footer': function() {
        var _a43 = ["<div class='item-commands'>"];
        _a43.push("<span cmd='_trade ok'>确定</span>");
        _a43.push("<span  cmd='_trade cancle'>取消</span>");
        _a43.push("</div>");
        Dialog.footer(_a43.join(''));
    },
    'confirm': function(_t567) {
        if (_t567 === 'ok' && this.trade_list.length)
            for (var _n82 = 0; _n82 < this.trade_list.length; _n82++) {
                SendCommand("give " + this.trade_target + '\x20' + this.trade_list[_n82].count + '\x20' + this.trade_list[_n82].id);
            }
        Dialog.hide();
    },
    'create_items': function(_t569, _t570, _t571) {
        var _a44 = [];
        _t570 = Dialog.pack.sort_items(_t570);
        for (var _n83 = 0; _n83 < _t571; _n83++) {
            var _t573 = _t570[_n83];
            _a44.push("<div class=\"obj-item");
            if (_t573) {
                _a44.push(_t573.is_lock ? " lock" : '', '\x20grade', _t573.grade);
                _a44.push('\x22');
                _a44.push(" oindex='" + _t573.id + '\x27>');
                _a44.push(_t573.name);
                if (_t573.count > 1) {
                    _a44.push("<span class='obj-value'>");
                    _a44.push(_t573.count);
                    _a44.push(_t573.unit);
                    _a44.push('</span>');
                }
            } else {
                _a44.push('\x22>');
            }
            _a44.push("</div>");
        }
        _t569.html(_a44.join(''));
    },
    'left_click': function() {
        var _J61 = $(this)
          , _t575 = _J61.attr('oindex');
        if (!_t575)
            return;
        var _t576 = null;
        for (var _n84 = 0; _n84 < Dialog.trade.trade_list.length; _n84++) {
            if (Dialog.trade.trade_list[_n84].id == _t575) {
                _t576 = Dialog.trade.trade_list[_n84];
                break;
            }
        }
        if (!_t576)
            return;
        Dialog.trade.cancle_trade(_t576);
        return false;
    },
    'enable_item': function(_t577, _t578) {
        var _t580 = this.rightElement.find(".obj-item[oindex='" + _t577.id + '\x27]');
        if (!_t580.length)
            return;
        _t578 ? _t580.removeClass("disabled") : _t580.addClass("disabled");
    },
    'right_click': function() {
        var _J62 = $(this);
        if (_J62.is(".disabled"))
            return;
        var _t582 = _J62.attr("oindex");
        if (!_t582)
            return;
        var _t583 = Dialog.pack.get_item(_t582);
        if (!_t583)
            return;
        if (_t583.count > 1) {
            return Confirm.Show_trade_add(_t583);
        }
        Dialog.trade.add_trade(_t583);
        return false;
    },
    'add_trade': function(_t584) {
        for (var _n85 = 0; _n85 < this.trade_list.length; _n85++) {
            if (_t584.id == this.trade_list[_n85].id) {
                this.trade_list[_n85].count += _t584.count;
                return this.create_items();
            }
        }
        this.trade_list.push(_t584);
        this.create_items(this.leftElement.empty(), this.trade_list, this.max_count);
        this.enable_item(_t584, false);
    },
    'cancle_trade': function(_t586) {
        for (var _n86 = 0; _n86 < this.trade_list.length; _n86++) {
            if (_t586.id == this.trade_list[_n86].id) {
                this.trade_list.splice(_n86, 1);
                _n86--;
            }
        }
        this.create_items(this.leftElement.empty(), this.trade_list, this.max_count);
        this.enable_item(_t586, true);
    }
};
const level_desc = ["wht", "hig", 'hic', 'hiy', 'him', 'hio', "ord"];
function wrap_name(name) {
    let _t589 = level_desc[name.grade];
    return '<' + _t589 + '>' + name.name + '</' + _t589 + '>';
}
Dialog.list = {
    'hide': function() {
        this.element.remove();
        this.isShow = false;
    },
    'close': function() {
        this.hide();
    },
    'updateitem': function(_t592) {
        if (_t592.store) {
            if (!this.stores || !this.isShow)
                return Dialog.pack.onData({
                    'remove': _t592.store,
                    'id': _t592.id
                });
            var _t594 = this.find_item(1, _t592.id)
              , _t595 = this.find_item(3, _t592.storeid);
            if (!_t594) {
                _t594 = Object.assign({}, _t595);
                _t594.id = _t592.id;
                _t594.count = -_t592.store;
                Dialog.pack.items.push(_t594);
            } else {
                _t594.count -= _t592.store;
            }
            if (!_t595) {
                _t595 = Object.assign({}, _t594);
                _t595.id = _t592.storeid;
                _t595.count = _t592.store;
                this.stores.push(_t595);
            } else {
                _t595.count += _t592.store;
            }
            this.store_count = _t592.sum ?? this.stores.length;
            if (_t595.count === 0)
                this.stores.Remove(_t595);
            if (_t594.count === 0)
                Dialog.pack.items.Remove(_t594);
        } else {
            if (_t592.sell) {
                _t594 = this.find_item(2, _t592.id);
                if (_t594) {
                    _t594.count -= _t592.sell;
                    return this.create_items(this.selllist, this.leftElement, 2, this.selllist.length);
                }
            }
        }
        if (this.isstore && this.isShow) {
            this.create_items(this.stores, this.leftElement, 3, Math.max(this.max_store_count, 100));
            Dialog.title("你的仓库中有" + this.store_count + '/' + this.max_store_count + '件物品');
        }
        this.update_pack();
        if (_t592.money !== undefined)
            this.show_footer(_t592.money);
    },
    'find_item': function(_t596, _t597) {
        var _t599 = Dialog.pack.items;
        if (_t596 === 2)
            _t599 = this.selllist;
        else {
            if (_t596 === 3)
                _t599 = this.stores;
        }
        for (var _n87 = 0; _n87 < _t599.length; _n87++) {
            if (_t599[_n87].id == _t597)
                return _t599[_n87];
        }
    },
    'formatItems': function(_t600) {
        let _a45 = [];
        for (let _t601 of _t600) {
            _a45.push({
                'name': _t601[0],
                'id': _t601[1],
                'count': _t601[2],
                'grade': _t601[3],
                'unit': _t601[4],
                'value': _t601[5]
            });
        }
        return _a45;
    },
    'onData': function(_t602) {
        if (_t602.id)
            return this.updateitem(_t602);
        var _t604 = _t602.gongji ?? _t602.jungong ?? _t602.yaoyuan ?? _t602.mvalue;
        if (_t602.selllist) {
            this.show();
            this.isstore = false;
            this.gongji = _t604;
            this.money_name = null;
            this.typeElement.hide();
            this.selllist = this.formatItems(_t602.selllist);
            if (_t602.gongji >= 0)
                this.money_name = "门派功绩";
            else {
                if (_t602.jungong >= 0)
                    this.money_name = '军功';
                else {
                    if (_t602.yaoyuan >= 0)
                        this.money_name = "<ord>妖元</ord>";
                    else
                        this.money_name = _t602.mtype;
                }
            }
            this.create_items(this.selllist, this.leftElement, 2, this.selllist.length);
            Dialog.titleElement.html(_t602.title);
            Dialog.icon("shopping-cart");
            if (_t602.seller)
                this.seller = _t602.seller;
            this.update_pack();
        } else
            if (_t602.stores) {
            this.show();
            this.typeElement.show();
            this.isstore = true;
            this.stores = Dialog.pack.formatItems(_t602.stores);
            if (_t602.sum > 0) {
                this.typeElement.show();
                this.store_count = _t602.sum;
            } else {
                this.typeElement.hide();
                this.store_count = _t602.stores.length;
            }
            this.create_items(this.stores, this.leftElement, 3, Math.max(_t602.max_store_count, 100));
            this.leftElement[0].scrollTop = 0;
            Dialog.titleElement.html('你的仓库中有' + this.store_count + '/' + _t602.max_store_count + "件物品");
            this.max_store_count = _t602.max_store_count;
            Dialog.icon('lock');
            this.update_pack();
        }
        if (_t604 >= 0) {
            this.gongji = _t604;
            this.show_footer(_t604);
        }
    },
    'show': function(_t605) {
        if (!Dialog.isShow || Dialog.curItem !== 'list')
            Dialog.show('list');
        if (this.rightElement) {
            this.rightElement.show();
            if (Dialog.pack.objelement)
                Dialog.pack.objelement.remove();
        }
        if (this.isShow)
            return;
        if (!this.element) {
            this.element = $("<div class=\"dialog-list\"><div class=\"otype-list\"><div class=\"otype-item select\" otype=\"0\">道具</div><div class=\"otype-item\"  otype=\"1\">秘籍</div><div class=\"otype-item\" otype=\"2\">宝石</div><div class=\"otype-item\" otype=\"3\">资源</div><div class=\"otype-item\" otype=\"4\">装备</div></div><div class=\"trade-list\"></div><div class=\"obj-list\"></div></div >");
            var _t607 = this.element.children();
            this.typeElement = $(_t607[0]);
            this.typeElement.hide();
            this.leftElement = $(_t607[1]);
            this.rightElement = $(_t607[2]);
        }
        this.element.on('click', ".obj-item", Dialog.list.item_click);
        this.element.on("click", ".otype-item", Dialog.list.otype_click);
        this.element.appendTo(Dialog.contentElement.empty());
        this.isShow = true;
    },
    'selected_type': 0,
    'otype_click': function() {
        let _J63 = $(this).attr("otype")
          , _n88 = parseInt(_J63)
          , _t609 = Dialog.list;
        if (!_t609.stores)
            return;
        if (_n88 === _t609.selected_type)
            return;
        let _t610 = _t609.typeElement.children();
        $(_t610[_t609.selected_type]).removeClass("select");
        _t609.selected_type = parseInt(_J63);
        $(_t610[_n88]).addClass("select");
        SendCommand("store " + _n88);
    },
    'show_footer': function(_t611) {
        _t611 = this.money_name ? this.gongji : _t611;
        let _t613 = this.isstore ? "store" : 'sell';
        if (this.isstore) {
            var _t614 = this.money_name ? "你目前有" + _t611 + "<hiy>" + this.money_name + "</hiy>" : "你身上有" + moneyToStr(_t611);
            Dialog.footerElement.html("<div class='obj-money'>" + _t614 + ("<span cmd='") + _t613 + (" all'>存仓库</span></div>"));
        } else {
            _t614 = this.money_name ? '你目前有' + _t611 + "<hiy>" + this.money_name + "</hiy>" : '你身上有' + moneyToStr(_t611);
            Dialog.footerElement.html("<div class='obj-money'>" + _t614 + ("<span cmd='") + _t613 + (" all'>清理杂物</span></div>"));
        }
    },
    'update_pack': function() {
        var _t616 = Dialog.pack.items;
        if (!_t616)
            SendCommand("pack");
        else {
            this.create_items(_t616, this.rightElement, 1, Dialog.pack.max_count);
            this.show_footer(Dialog.pack.money);
        }
    },
    'create_items': function(_t617, _t618, _t619, _t620) {
        var _a46 = []
          , _t622 = _t617;
        (_t619 === 1 || _t619 === 3) && (_t622 = Dialog.pack.sort_items(_t617));
        for (var _n89 = 0; _n89 < _t620; _n89++) {
            var _t623 = _t622[_n89];
            _a46.push("<div class=\"obj-item");
            if (_t623) {
                _a46.push(_t623.is_lock ? " lock" : '', " grade", _t623.grade);
                _a46.push("\" obj=\"");
                _a46.push(_t623.id);
                _a46.push("\" otype=\"");
                _a46.push(_t619);
                _a46.push('\x22>');
                if (_t619 === 1) {
                _a46.push("<span class=\"grade", _t623.grade, '\x22>');
                _a46.push(_t623.name);
                _a46.push("</span>");
            } else {
                _a46.push(_t623.name);
            }
                _a46.push("<span class='obj-value'>");
                if (_t619 === 2) {
                    _a46.push('每');
                    _a46.push(_t623.unit);
                    _a46.push(this.money_name ? _t623.value + '<hiy>' + this.money_name + "</hiy>" : moneyToStr(_t623.value));
                    if (_t623.count == -1) {
                    _a46.push("：大量现货");
                } else {
                    _a46.push("：剩余");
                    _a46.push(_t623.count);
                    _a46.push(_t623.unit);
                }
                }
                else {
                    if (_t619 === 1 && !this.isstore) {
                        if (_t623.value) {
                        _a46.push('每');
                        _a46.push(_t623.unit);
                        _a46.push(moneyToStr(_t623.value));
                        _a46.push('：');
                        _a46.push(_t623.count);
                        _a46.push(_t623.unit);
                    } else {
                        _a46.push("不可出售");
                    }
                    }
                    else
                        if (_t623.count > 1) {
                        _a46.push(_t623.count);
                        _a46.push(_t623.unit);
                    }
                }
                _a46.push("</span>");
            } else
                _a46.push('\x22>');
            _a46.push("</div>");
        }
        _t618.html(_a46.join(''));
    },
    'item_click': function() {
        var _J64 = $(this)
          , _t625 = _J64.attr("obj")
          , _t626 = _J64.attr("otype")
          , _t627 = Dialog.list.find_item(_t626, _t625);
        if (!_t627)
            return;
        var _a47 = ["<div class='item-commands'>"];
        if (Dialog.list.isstore) {
            if (_t626 === 3) {
                _a47.push("<span cmd=\"checkobj " + _t625 + " from store" + ("\">查看</span>"));
                _a47.push("<span cmd=\"_confirm qu " + _t625 + ("\">取出</span>"));
            }
            else
                if (_t626 === 1) {
                _a47.push("<span cmd=\"checkobj " + _t625 + (" from item\">查看</span>"));
                _a47.push("<span cmd=\"_confirm store " + _t627.count + '\x20' + _t625 + ("\">存到仓库</span>"));
            }
        } else {
            if (_t626 === 2) {
                _a47.push("<span cmd=\"checkobj " + _t625 + '\x20from\x20' + Dialog.list.seller + ("\">查看</span>"));
                if (_t627.count)
                    _a47.push("<span cmd=\"_confirm buy " + _t627.count + '\x20' + _t625 + " from " + Dialog.list.seller + ("\">购买</span>"));
            } else
                if (_t626 === 1) {
                _a47.push("<span cmd=\"checkobj " + _t625 + (" from item\">查看</span>"));
                _a47.push("<span cmd=\"_confirm sell " + _t627.count + '\x20' + _t625 + " to " + Dialog.list.seller + ("\">卖掉</span>"));
            }
        }
        _a47.push("</div>");
        Dialog.list.element.find(".item-commands").remove();
        _J64 = $(_a47.join('')).insertAfter(_J64);
        checkScroll(_J64);
    }
};
function moneyToStr(value) {
    if (!value)
        return '';
    var _a48 = [];
    if (value >= 10000) {
        _a48.push(parseInt(value / 10000) + "两<hiy>黄金</hiy>");
        value = value % 10000;
    }
    if (value > 100) {
        _a48.push(parseInt(value / 100) + "两<wht>白银</wht>");
        value = value % 100;
    }
    if (value > 0)
        _a48.push(value + "个<yel>铜板</yel>");
    return _a48.join('');
}
Dialog.channel = {
    'footer': [['全部', ''], ['世界', "chat"], ['队伍', 'tm'], ['门派', "fam"], ['全区', 'es'], ['帮派', 'pty'], ['系统', "sys"]],
    'isScroll': true,
    'last_click': 0,
    'show': function() {
        if (Date.now() - this.last_click > 500) {
            this.last_click = Date.now();
            return;
        }
        if (Dialog.channel.isShow)
            return;
        Dialog.select("channel");
        Dialog.icon("comment");
        Dialog.title('');
        Dialog.footer('');
        for (var _n90 = 0; _n90 < Dialog.channel.footer.length; _n90++) {
            var _J65 = $("<span class='footer-item channel-item' for='" + Dialog.channel.footer[_n90][1] + '\x27>' + Dialog.channel.footer[_n90][0] + "</span>").appendTo(Dialog.footerElement);
            if (_n90 === 0)
                _J65.addClass('select');
        }
        Dialog.contentElement.html('').append(Process.ChannelElement.addClass("channel-dialog"));
        Dialog.channel.isShow = true;
        Dialog.channel.scrollBottom();
    },
    'hide': function() {
        Dialog.channel.footerChanged('');
        Process.ChannelElement.removeClass("channel-dialog").insertBefore(".content-message");
        this.scrollBottom();
        this.isShow = false;
    },
    'close': function() {
        this.hide();
    },
    'scrollBottom': function() {
        Process.channel.scroll2end();
    },
    'footerChanged': function(_t633) {
        if (Dialog.channel.select_item == _t633)
            return;
        Dialog.channel.select_item = _t633;
        Process.channel.clear();
        for (var _n91 = 0; _n91 < this.datas.length; _n91++) {
            var _t635 = this.datas[_n91];
            (!_t633 || _t635[0] == _t633) && Process.channel.push(_t635[1]);
        }
        Process.channel.scroll2end();
    },
    'datas': [],
    'createElement': function(_t636, _t637) {
        var _t639 = "hic"
          , _t640 = '';
        switch (_t636.ch) {
        case 'tm':
            _t639 = "hig";
            _t640 = '队伍';
            break;
        case 'fam':
            _t639 = "hiy";
            _t640 = _t636.fam || '门派';
            break;
        case 'rumor':
            _t639 = "him";
            _t640 = '谣言';
            _t636.name = '某人';
            break;
        case 'sys':
            _t639 = 'hir';
            _t640 = '系统';
            _t636.name = '';
            break;
        case 'es':
            _t639 = 'hio';
            _t640 = _t636.server;
            _t636.uid = null;
            break;
        case "pty":
            _t639 = "hiz";
            _t640 = '帮派';
            break;
        default:
            _t640 = ['闲聊', '闲聊', '闲聊', "<hiy>宗师</hiy>", "<HIZ>武圣</HIZ>", "<hio>武帝</hio>", "<ord>武神</ord>"][_t636.lv];
            _t636.lv6 && (_t640 = ["<ord>武神</ord>", "<ord>剑神</ord>", "<ord>刀皇</ord>", "<ord>兵主</ord>", "<ord>战神</ord>"][_t636.lv6]);
            break;
        }
        var _a49 = ['<', _t639, '>【'];
        _a49.push(_t640);
        _a49.push('】');
        if (_t636.name) {
            _a49.push('<span');
            if (_t636.uid)
                _a49.push(" cmd='look3 " + _t636.uid + '\x27');
            _a49.push('>');
            _a49.push(_t636.name);
            _a49.push("</span>：");
        }
        _a49.push(_t636.content);
        var _t641 = _a49.join('');
        this.datas.length > 800 && (this.datas.length = 0,
        this.datas.splice(0, 200));
        if (_t636.ch == "rumor")
            _t636.ch = 'sys';
        this.datas.push([_t636.ch, _t641]);
        if (this.select_item && this.select_item != _t636.ch)
            return '';
        return _t641;
    }
},
Dialog.setting = {
    'footer': [['显示', 'setting'], ["<yel>高级</yel>", "custom"], ['快捷键', "keys"], ['扩展', "extend"]],
    'selectitem': null,
    'init': function() {
        if (this.settingElement)
            return;
        if (Util.isMobile)
            this.footer.splice(2, 1);
        this.settingElement = $(".dialog-setting");
        this.extendElement = $(".dialog-extend");
        this.keysElement = $(".dialog-skeys");
        this.customElement = $(".dialog-custom");
        var _J66 = $(".setting>.setting-item");
        for (var _n92 = 0; _n92 < _J66.length; _n92++) {
            var _J67 = $(_J66[_n92])
              , _t643 = _J67.attr('for');
            if (!_t643)
                continue;
            var _t644 = Setting[_t643];
            switch (_t643) {
            case "fontsize":
                this.select_color(_J67.find(".color-item"), _t644, "fontSize");
                break;
            case "font":
                this.select_color(_J67.find(".color-item"), _t644, "fontFamily");
                break;
            case 'fontcolor':
                this.select_color(_J67.find(".color-item"), _t644, "backgroundColor");
                break;
            case "backcolor":
                this.select_color(_J67.find(".color-item"), _t644, "backgroundColor");
                break;
            case "combat_size":
            case "menu_size":
            case "dialog_size":
                this.select_value(_J67.find(".color-item"), _t644);
                break;
            case 'auto_pfm':
            case "auto_pfm2":
                if (_t644) {
                    _J67.find('.switch\x20').addClass('on');
                    _J67.find(".switch-text").html('开');
                    $('#' + _t643).show().val(_t644);
                }
                break;
            case "auto_work":
                if (_t644) {
                    _J67.find(".switch ").addClass('on');
                    _J67.find(".switch-text").html('开');
                    $('#' + _t643).show().val(_t644 !== 1 ? _t644 : '');
                }
                break;
            default:
                if (_t644 === 1) {
                    _J67.find('.switch\x20').addClass('on');
                    _J67.find(".switch-text").html('开');
                }
                break;
            }
        }
    },
    'show': function() {
        this.init();
        if (this.isShow)
            return;
        this.footerChanged("setting");
        Dialog.icon("cog");
        Dialog.title('设置');
        Dialog.footerElement.empty();
        for (var _n93 = 0; _n93 < this.footer.length; _n93++) {
            var _J68 = $("<span class='footer-item' for='" + this.footer[_n93][1] + '\x27>' + this.footer[_n93][0] + "</span>").appendTo(Dialog.footerElement);
            if (_n93 === 0)
                _J68.addClass('select');
        }
        this.isShow = true;
    },
    'select_color': function(_t646, _t647, _t648) {
        for (var _n94 = 0; _n94 < _t646.length; _n94++) {
            _t646[_n94].style[_t648] == _t647 ? $(_t646[_n94]).addClass("select") : $(_t646[_n94]).removeClass("select");
        }
    },
    'select_value': function(_t650, _t651) {
        for (var _n95 = 0; _n95 < _t650.length; _n95++) {
            $(_t650[_n95]).attr("value") == _t651 ? $(_t650[_n95]).addClass("select") : $(_t650[_n95]).removeClass("select");
        }
    },
    'footerChanged': function(_t653) {
        let _t655 = this[_t653 + 'Element'];
        if (!_t655 || _t655 === this.selectitem)
            return this.child?.command(_t653);
        this.selectitem && this.selectitem.remove();
        this.selectitem = _t655;
        if (this.child)
            this.child.hide();
        this.child = null;
        if (_t653 === 'setting') {
            this.selectitem.on('click', ".switch", this.switchClick);
            this.selectitem.on("click", ".color-item", this.colorClick);
        }
        else
            if (_t653 === 'custom') {
            this.selectitem.on("click", ".switch", this.switchClick);
            this.selectitem.on("click", ".setting-ok", this.save_custom);
        } else {
            this.child = Dialog[_t653];
            this.child.show(this.selectitem);
        }
        this.selectitem.appendTo(Dialog.contentElement);
    },
    'helpClick': function() {
        var _J69 = $(this)
          , _t657 = _J69.attr("action");
        switch (_t657) {
        case 'tologin':
            break;
        case "torole":
            GameClient.Close();
            HideAndShow("#role_panel", function() {
                Process.player = null;
                Process.clear();
            });
            break;
        case "toserver":
            Process.player = null;
            GameClient.Close();
            break;
        default:
            break;
        }
    },
    'close_help': function() {
        if (this.frame) {
            this.frame.remove();
            this.selectitem.removeClass('help-detl');
            this.frame = null;
        }
    },
    'hide': function() {
        if (this.child && this.child.hide() === false)
            return false;
        this.close();
    },
    'close': function() {
        this.child?.close();
        this.selectitem?.remove();
        this.isShow = false;
        this.selectitem = null;
        this.child = null;
    },
    'save_custom': function() {
        var _J70;
        if ($(".dialog-custom>.setting-item[for='auto_pfm']>.switch").is(".on")) {
            _J70 = $('#auto_pfm').val();
            if (!_J70)
                return ReceiveMessage("<hir>你没有设置自动出招的绝招。</hir>");
            if (_J70.length > 300)
                return ReceiveMessage("<hir>你设置的出招过长。</hir>");
            Setting.save("auto_pfm", _J70);
        }
        if ($(".dialog-custom>.setting-item[for='auto_pfm2']>.switch").is(".on")) {
            _J70 = $('#auto_pfm2').val();
            if (!_J70)
                return ReceiveMessage("<hir>你没有设置自动反击的绝招。</hir>");
            if (_J70.length > 300)
                return ReceiveMessage("<hir>你设置的出招过长。</hir>");
            Setting.save("auto_pfm2", _J70);
        }
        if ($(".dialog-custom>.setting-item[for='auto_work']>.switch").is('.on')) {
            _J70 = $('#auto_work').val();
            if (_J70 && _J70.length > 400)
                return ReceiveMessage("<hir>你设置的过长。</hir>");
            Setting.save("auto_work", _J70 || 1);
        }
        ReceiveMessage("<hic>设置已保存。</hic>");
    },
    'get_pfms': function(_t663) {
        if (!Combat.Skills)
            return ReceiveMessage("<hir>你没有可用的绝招设置。</hir>");
        var _a50 = [];
        for (var _n96 = 0; _n96 < Combat.Skills.length; _n96++) {
            if (_a50.length > 0)
                _a50.push(',');
            _a50.push(Combat.Skills[_n96].id);
        }
        $('#' + _t663).val(_a50.join(''));
        ReceiveMessage("已预设置为你默认的绝招(未保存)，你可以修改为适合你的出招顺序后点击保存");
    },
    'switchClick': function(_t665) {
        var _J71 = $(this)
          , _t667 = _J71.parent().attr('for')
          , _n97 = 0;
        if (_J71.is(".on")) {
            _J71.removeClass('on');
            _J71.find(".switch-text").html('关');
        } else {
            _J71.addClass('on');
            _J71.find(".switch-text").html('开');
            _n97 = 1;
        }
        switch (_t667) {
        case 'auto_pfm':
        case 'auto_pfm2':
            if (_n97) {
                $('#' + _t667).show();
                Dialog.setting.get_pfms(_t667);
                Setting[_t667] = 0;
            } else {
                $('#' + _t667).hide();
                Setting.save(_t667, 0);
            }
            break;
        case 'auto_work':
            if (_n97) {
                $('#' + _t667).show();
            } else {
                $('#' + _t667).hide();
                Setting.save(_t667, 0);
            }
            break;
        default:
            Setting.save(_t667, _n97);
            break;
        }
        _t665.cancelable = true;
        return false;
    },
    'COLORS': {
        'rgb(255,\x20255,\x20255)': "#fff",
        'rgb(189,\x20195,\x20199)': "#bdc3c7",
        'rgb(0,\x20128,\x200)': '#008000'
    },
    'colorClick': function() {
        var _J72 = $(this);
        if (_J72.is(".select"))
            return;
        var _t669 = _J72.parent();
        _t669.children().removeClass("select");
        _J72.addClass("select");
        var _t670 = _t669.closest(".setting-item").attr("for");
        if (!_t670)
            return;
        var _t671 = '';
        switch (_t670) {
        case "combat_size":
        case "dialog_size":
        case "menu_size":
            _t671 = _J72.attr("value");
            break;
        case "fontsize":
            _t671 = _J72[0].style.fontSize;
            break;
        case "fontcolor":
            _t671 = Dialog.setting.COLORS[_J72[0].style.backgroundColor] ?? '';
            break;
        case "backcolor":
            _t671 = _J72[0].style.backgroundColor;
            break;
        case "font":
            _t671 = _J72[0].style.fontFamily;
            if (!_t671)
                _t671 = "none";
            break;
        }
        Setting.save(_t670, _t671);
    }
},
Dialog.tasks = {
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'update_item': function(_t673) {
        for (var _n98 = 0; _n98 < this.items.length; _n98++) {
            if (this.items[_n98].id == _t673.id) {
                if (_t673.state) {
                this.items[_n98].title = _t673.title;
                this.items[_n98].state = _t673.state;
                this.items[_n98].desc = _t673.desc;
            } else {
                this.items.splice(_n98, 1);
            }
                break;
            }
        }
        this.create_items();
    },
    'onData': function(_t675) {
        if (_t675.id)
            return this.update_item(_t675);
        Dialog.title('任务列表');
        Dialog.icon("exclamation-sign");
        this.items = _t675.items;
        this.create_items();
    },
    'show': function() {
        if (!this.element)
            this.element = $("<div class='dialog-tasks'></div>");
        SendCommand("tasks");
        if (this.isShow)
            return;
        this.element.appendTo(Dialog.contentElement);
        this.isShow = true;
    },
    'status_css': ['', "none", "finish", 'over'],
    'create_items': function() {
        var _a51 = []
          , _b3 = false;
        for (var _n99 = 0; _n99 < this.items.length; _n99++) {
            var _t679 = this.items[_n99];
            _a51.push("<div class='task-item flex-row ");
            _a51.push(this.status_css[_t679.state]);
            _a51.push("'><div class='flex-1'><h3>");
            _a51.push(_t679.title);
            _a51.push("</h3>");
            _a51.push("<pre class='task-desc'>");
            _a51.push(_t679.desc);
            _a51.push("</pre></div>");
            _a51.push("<span class='task-btn flex-0'");
            if (_t679.state === 1)
                _a51.push(">进行中");
            else {
                if (_t679.state === 2) {
                    _a51.push(" cmd=\"task ");
                    _a51.push(_t679.id);
                    _a51.push(" fin\"");
                    _b3 = true;
                    _a51.push(">可领取");
                }
                else
                    _t679.state === 3 && _a51.push(">已完成");
            }
            _a51.push('</span>');
            _a51.push("</div>");
        }
        this.element.html(_a51.join(''));
        Dialog.footer('');
    }
};
const STATS_SILDER1 = [['总榜', ''], ["武当派", "wudang"], ["少林派", "shaolin"], ["华山派", "huashan"], ['峨眉派', 'emei'], ["逍遥派", "xiaoyao"], ['丐帮', "gaibang"], ['杀手楼', "shashou"], ["无门无派", 'none']]
  , STATS_SILDER2 = [['武器', ''], ['衣服', 'cloth'], ['鞋', "shoes"], ['头部', 'head'], ['披风', "cape"], ['戒指', "ring"], ['项链', "necklace"], ['饰品', 'jewels'], ['护腕', 'wrist'], ['腰带', "waist"], ['暗器', "throwing"]];
Dialog.stats = {
    'footers': [{
        'cmd': "score",
        'name': "综合榜",
        'selected_silder': '',
        'silder': STATS_SILDER1
    }, {
        'cmd': "top",
        'name': '高手榜',
        'selected_silder': '',
        'silder': STATS_SILDER1
    }, {
        'cmd': "weapon",
        'name': "兵器谱",
        'selected_silder': '',
        'silder': STATS_SILDER2
    }, {
        'cmd': 'exp',
        'name': "经验榜",
        'selected_silder': '',
        'silder': STATS_SILDER1
    }, {
        'cmd': 'mp',
        'name': "内力榜",
        'selected_silder': '',
        'silder': STATS_SILDER1
    }, {
        'cmd': 'money',
        'name': "富豪榜",
        'selected_silder': '',
        'silder': STATS_SILDER1
    }],
    'selectedItem': 0,
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'onData': function(_t681) {
        if (_t681.close)
            return Dialog.hide();
        if (_t681.tops) {
            if (_t681.top) {
                this.show_desc("你目前在第" + _t681.top + "名，积分" + _t681.sc);
            } else {
                this.show_desc("你目前没有上榜，积分：" + _t681.sc);
            }
            return this.create_tops(_t681.tops, _t681);
        }
        if (_t681.weapons) {
            this.show_desc('');
            return this.create_weapons(_t681.weapons);
        }
        if (_t681.scores) {
            this.show_desc('你目前的评分：' + _t681.score);
            return this.create_scores(_t681.scores);
        }
        if (_t681.items) {
            this.create_other(_t681.items, _t681.st);
            let _t683 = new Date(_t681.time);
            _t681.fam = _t681.fam ?? '';
            this["last_" + _t681.st + _t681.fam] = {
                'items': _t681.items,
                'time': _t681.time + 60000,
                'score': _t681.score
            };
            if (_t681.score)
                this.show_desc("你目前的评分：" + _t681.score);
            else
                this.show_desc('上次更新：' + _t683.getHours() + ':' + _t683.getMinutes());
        }
    },
    'create_other': function(_t684, _t685) {
        var _a52 = [];
        for (var _n100 = 0; _n100 < 20; _n100++) {
            _a52.push("<div class='top-item");
            if (_n100 < 3)
                _a52.push(" top", _n100 + 1);
            _a52.push("' top='");
            _a52.push(_n100 + 1);
            _a52.push("'><span class='top-title'>");
            _a52.push(this.top_names[_n100]);
            _a52.push('、</span>');
            _a52.push("<span class='top-name'>");
            let _t687 = _t684[_n100] ?? ['无', 0];
            _a52.push(_t687[0]);
            _a52.push("</span>");
            _a52.push("<span class='top-sc'>");
            _a52.push(_t687[1]);
            _a52.push('</span>');
            _a52.push('</div>');
        }
        this.container.html(_a52.join(''));
    },
    'silderClick': function() {
        let _J73 = $(this)
          , _t689 = _J73.attr("stype")
          , _t690 = Dialog.stats.selectedItem;
        if (_t690.selected_silder === _t689)
            return;
        _t690.selected_silder = _t689;
        _J73.parent().find(".select").removeClass('select');
        _J73.addClass("select");
        Dialog.stats.load_stats();
    },
    'create_silder': function(_t691) {
        let _a53 = [];
        _t691 = _t691 || [];
        let _t693 = this.selectedItem;
        for (let _t694 of _t691) {
            _a53.push("<div class=\"stats-silder ", _t693.selected_silder === _t694[1] ? "select" : '', "\" stype=\"", _t694[1], '\x22>', _t694[0], "</div>");
        }
        this.left_silder.html(_a53.join(''));
    },
    'top_names': ['一\u3000', '二\u3000', '三\u3000', '四\u3000', '五\u3000', '六\u3000', '七\u3000', '八\u3000', '九\u3000', '十\u3000', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'],
    'create_scores': function(_t695, _t696) {
        var _a54 = [];
        for (var _n101 = 0; _n101 < 20; _n101++) {
            _a54.push("<div class='top-item scores");
            if (_n101 < 3)
                _a54.push(" top", _n101 + 1);
            _a54.push("' top='");
            _a54.push(_n101 + 1);
            _a54.push("'><span class='top-title'>");
            _a54.push(this.top_names[_n101]);
            _a54.push('、</span>');
            _a54.push("<span class='top-name'>");
            let _t698 = _t695[_n101] ?? ['无', ''];
            _a54.push(_t698[0]);
            _a54.push("</span>");
            _a54.push("<span class='top-sc'>");
            _a54.push(_t698[1]);
            _a54.push("</span>");
            _a54.push("</div>");
        }
        this.container.html(_a54.join(''));
    },
    'fam_names': {
        'emei': '峨眉第',
        'wudang': '武当第',
        'huashan': "华山第",
        'xiaoyao': "逍遥第",
        'gaibang': "丐帮第",
        'shaolin': "少林第",
        'shashou': '杀手第',
        'none': '散修第'
    },
    'create_tops': function(_t699, _t700) {
        var _a55 = [];
        for (var _n102 = 0; _n102 < _t699.length; _n102++) {
            _a55.push("<div class='top-item top ");
            if (_n102 < 3)
                _a55.push(" top", _n102 + 1);
            _a55.push("' top='");
            _a55.push(_n102 + 1);
            _a55.push("'><span class='top-title'>");
            _a55.push(_t700.fam ? this.fam_names[_t700.fam] : "天下第");
            _a55.push(this.top_names[_n102]);
            _a55.push("</span>");
            _a55.push("<span class='top-name'>");
            _a55.push(_t699[_n102][0]);
            _a55.push("</span>");
            _a55.push("<span class='top-sc'>");
            _a55.push(_t699[_n102][1]);
            _a55.push("</span>");
            _a55.push("</div>");
        }
        this.container.html(_a55.join(''));
        this.top = _t700.top;
    },
    'create_weapons': function(_t702) {
        var _a56 = [];
        for (var _n103 = 0; _n103 < 10; _n103++) {
            _a56.push("<div class='top-item weapon top");
            _a56.push(_n103 + 1);
            _a56.push("' top='");
            _a56.push(_n103 + 1);
            _a56.push("'><span class='top-title'>");
            let _t704 = _t702[_n103] ?? ['无', ''];
            _a56.push(this.top_names[_n103]);
            _a56.push("、</span>");
            _a56.push("<span class='top-name'>");
            _a56.push(_t704[0]);
            _a56.push('</span>');
            _a56.push("<span class='top-sc'>");
            _a56.push(_t704[1]);
            _a56.push('</span>');
            _a56.push('</div>');
        }
        this.container.html(_a56.join(''));
    },
    'show': function() {
        if (!this.selectedItem)
            this.selectedItem = this.footers[0];
        this.load_stats();
        if (!this.element) {
            this.element = $("<div class='stats-container'><div class='stats-container-left'></div></div>");
            this.container = $("<div class='dialog-stats'></div>").appendTo(this.element);
            this.left_silder = this.element.find(".stats-container-left");
            this.create_silder(this.selectedItem.silder);
        }
        if (this.isShow)
            return;
        this.create_footer();
        Dialog.icon("stats");
        Dialog.title(this.selectedItem.name);
        Dialog.contentElement.html(this.element);
        this.element.on("click", '.top-item', this.itemClick);
        this.left_silder.on("click", ".stats-silder ", this.silderClick);
        this.isShow = true;
    },
    'load_stats': function() {
        let _t707 = this.selectedItem.cmd
          , _t708 = this.selectedItem.selected_silder
          , _t709 = this["last_" + _t707 + _t708];
        if (_t709 && _t709.time > Date.now()) {
            let _t710 = new Date(_t709.time)
              , _t711 = '';
            if (_t709.score)
                _t711 = '你目前的评分：' + _t709.score;
            else
                _t711 = "上次更新：" + _t710.getHours() + ':' + _t710.getMinutes();
            this.show_desc(_t711);
            return this.create_other(_t709.items, _t707);
        }
        let _t712 = 'stats\x20' + _t707;
        if (_t708)
            _t712 = _t712 + '\x20' + _t708;
        SendCommand(_t712);
    },
    'create_footer': function() {
        var _a57 = [];
        for (var _n104 = 0; _n104 < this.footers.length; _n104++) {
            var _t714 = this.footers[_n104];
            _a57.push("<span class='footer-item" + (_t714 === this.selectedItem ? " select" : '') + '\x27\x20for=\x27' + _n104 + "''>" + _t714.name + "</span>");
        }
        _a57.push("<span class='stats-span'></span>");
        Dialog.footer(_a57.join(''));
    },
    'show_desc': function(_t715) {
        Dialog.footerElement.find(".stats-span").html(_t715);
    },
    'footerChanged': function(_t717) {
        var _t719 = this.footers[_t717];
        if (_t719 === this.selectedItem)
            return;
        this.selectedItem = _t719;
        Dialog.title(this.selectedItem.name);
        this.create_silder(this.selectedItem.silder);
        this.load_stats();
    },
    'itemClick': function() {
        var _J74 = $(this)
          , _n105 = parseInt(_J74.attr("top"))
          , _t721 = Dialog.stats.selectedItem.cmd
          , _a58 = ["<div class='item-commands'>"]
          , _t722 = Dialog.stats.selectedItem.selected_silder;
        if (_t721 === "top") {
            _a58.push("<span cmd=\"stats " + _t721 + '\x20' + _t722 + '\x20' + _n105 + ("\">查看</span>"));
            if (!Dialog.stats.top || _n105 < Dialog.stats.top)
                _a58.push("<span cmd=\"biwu " + _t722 + '\x20' + _n105 + ("\">挑战</span>"));
            _a58.push("<span cmd=\"reward top " + _n105 + ("\">查看规则和奖励</span>"));
        } else {
            _a58.push("<span cmd=\"stats " + _t721 + '\x20' + _t722 + '\x20' + _n105 + ("\">查看</span>"));
            _a58.push("<span cmd=\"reward " + _t721 + '\x20' + _n105 + ("\">查看奖励</span>"));
        }
        _a58.push("</div>");
        Dialog.stats.element.find(".item-commands").remove();
        $(_a58.join('')).insertAfter(_J74);
    }
},
Dialog.jh_fam = {
    'name': '门派',
    'items': null,
    'selected_index': 0,
    'type': "fam",
    'onDetail': function(_t723) {
        var _t725 = this.items[_t723.index];
        if (!_t725)
            return;
        _t725.type = '门派';
        _t725.desc = _t723.desc;
        _t725.sp = _t723.sp;
        _t725.actions = _t723.actions;
        _t725.skills = _t723.skills;
        return this.showDetail(_t725);
    },
    'showDetail': function(_t726) {
        var _a59 = ["<pre><hig>"];
        _a59.push(_t726.name);
        _a59.push("</hig>\n");
        _a59.push(_t726.desc);
        if (_t726.sp) {
            _a59.push("\n<hig>特点：");
            _a59.push(_t726.sp);
            _a59.push('</hig>\x0a');
        }
        this.append_actions(_a59, _t726);
        _a59.push("<div class=\"item-commands\"><span cmd=\"jh fam " + _t726.index + (" start\">进入地图</span>"));
        let _a60 = [];
        Dialog.extend.append(_a60, "map", _t726);
        for (let _t728 of _a60) {
            _a59.push("<span cmd=\"", _t728.cmd, '\x22>', _t728.name, "</span>");
        }
        _a59.push("</div>");
        if (_t726.skills)
            _a59.push(_t726.skills);
        _a59.push("</pre>");
        this.descElement.html(_a59.join(''));
        this.select(_t726.index);
    },
    'append_actions': function(_t729, _t730) {
        let _t732 = _t730.actions ?? [];
        _t729.push("<div class=\"fb-actions\">");
        for (let _t733 of _t732) {
            _t729.push("<div class=\"fb-action\">");
            _t729.push("<span class=\"action-desc\">", _t733[2] ?? '', "</span>");
            if (_t733[1])
                _t729.push("<span class=\"action-name\"  cmd=\"", _t733[0], '\x22>', _t733[1], "</span>");
            _t729.push('</div>');
        }
        _t729.push("</div>");
    },
    'show': function(_t734, _t735) {
        var _a61 = [];
        for (var _n106 = 0; _n106 < this.items.length; _n106++) {
            var _t737 = this.items[_n106];
            _a61.push("<div class=\"fam-item");
            _a61.push("\" index=\"", _n106, '\x22>', _t737.name, "</div>");
            _t737.index = _n106;
        }
        _t734.html(_a61.join(''));
        this.listElement = _t734;
        this.descElement = _t735;
        this.onClickItem(this.selected_index);
    },
    'select': function(_t738) {
        var _t740 = this.listElement.find("div[index='" + _t738 + '\x27]');
        if (_t740.length && !_t740.is('.selected')) {
            var _t741 = _t740[0].offsetTop
              , _t742 = this.listElement.height();
            if (_t741 > _t742 / 2) {
                _t741 = (_t742 - _t740.height()) / 2;
                this.listElement[0].scrollTop = _t741;
            }
            if (this.selectedItem)
                this.selectedItem.removeClass("selected");
            this.selectedItem = _t740;
            this.selectedItem.addClass("selected");
            this.selected_index = _t738;
        }
    },
    'onClickItem': function(_t743) {
        const _t745 = this.items[_t743];
        if (!_t745.desc)
            SendCommand("jh " + this.type + '\x20' + _t743);
        else
            this.showDetail(_t745);
        this.select(_t743);
    },
    'append_footer': function() {
        let _t747 = this.items[this.selected_index];
        Dialog.footerElement.find(".item-commands").html("<span cmd=\"jh fam " + _t747.index + (" start\">进入地图</span>"));
    }
},
Dialog.jh_fb = {
    'name': '副本',
    'type': 'fb',
    'items': null,
    'selected_index': -1,
    'select': Dialog.jh_fam.select,
    'onClickItem': Dialog.jh_fam.onClickItem,
    'onDetail': function(data) {
        var item = this.items[data.index];
        if (!item)
            return;
        item.type = '副本';
        item.desc = data.desc;
        item.reward = data.reward;
        item.diffs = data.diffs;
        item.status = data.status;
        return this.showDetail(item);
    },
    'update_unlock': function(unlockLevel) {
        this.unlock = unlockLevel;
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].unlock = unlockLevel >= i;
        }
        if (this.selected_index < 0)
            this.selected_index = unlockLevel;
    },
    'show': function(listEl, descEl) {
        this.listElement = listEl;
        this.descElement = descEl;
        var htmlParts = ["<div class='fb-content'>"];
        for (var i = 0; i < this.items.length; i++) {
            var fbItem = this.items[i];
            htmlParts.push("<div class=\"fb-item");
            !fbItem.unlock && htmlParts.push(" lock");
            fbItem.index = i;
            htmlParts.push("\" index=\"", i, '\x22>', fbItem.name, '</div>');
        }
        this.listElement.html(htmlParts.join(''));
        this.onClickItem(this.selected_index);
    },
    'show_first': function(element) {
        let prevHtml = element.prev().html();
        prevHtml && ReceiveMessage(prevHtml);
    },
    'fb_models': ['普通', "<red>困难</red>", "<hic>组队</hic>"],
    'showDetail': function(item) {
        var htmlParts = ["<pre>"];
        htmlParts.push(item.name);
        item.unlock ? htmlParts.push("\n<hig>已解锁</hig>\n") : htmlParts.push("\n<red>未解锁</red>\n");
        htmlParts.push(item.desc);
        this.append_status(htmlParts, item);
        if (item.unlock && item.diffs) {
            htmlParts.push("<div class=\"item-commands\">");
            for (let i = 0; i < item.diffs.length; i++) {
                if (item.diffs[i])
                    htmlParts.push("<span cmd=\"jh fb ", item.index, '\x20start', i + 1, '\x22>', this.fb_buttons[i], "</span>");
            }
            let extraItems = [];
            Dialog.extend.append(extraItems, "map", item);
            for (let extraItem of extraItems) {
                htmlParts.push("<span cmd=\"", extraItem.cmd, '\x22>', extraItem.name, "</span>");
            }
            htmlParts.push('</div>');
        }
        htmlParts.push(item.reward);
        htmlParts.push("</pre>");
        this.descElement.html(htmlParts.join(''));
        this.select(item.index);
    },
    'append_status': function(htmlParts, item) {
        const statusList = item.status ?? [];
        if (!statusList.length)
            return;
        htmlParts.push("<div class=\"fb-actions\">");
        for (let i = 0; i < statusList.length; i++) {
            let statusItem = statusList[i];
            if (!statusItem)
                continue;
            if (statusItem[0] === 1) {
                htmlParts.push("<div class=\"fb-action finshed\">");
                htmlParts.push("<span class=\"action-desc\">由", statusItem[1], "首次通过", "</span>");
                htmlParts.push("<span class=\"action-name\" cmd=\"cr2 ", item.index, '\x20', i, '\x22>', this.fb_models[i], "</span>");
                htmlParts.push("</div>");
            } else {
                htmlParts.push("<div class=\"fb-action\">");
                htmlParts.push("<span class=\"action-desc\">该模式尚未完成首杀", statusItem[1] ? '，称号奖励：' + statusItem[1] : '', "</span>");
                htmlParts.push("<span class=\"action-name\"  cmd=\"cr2 ", item.index, '\x20', i, '\x22>', this.fb_models[i], "</span>");
                htmlParts.push('</div>');
            }
        }
        htmlParts.push('</div>');
    },
    'fb_buttons': ['进入副本', '困难模式', '组队进入'],
    'append_footer': function() {
        let item = this.items[this.selected_index];
        let htmlParts = [];
        if (item.unlock)
            for (let i = 0; i < item.diffs.length; i++) {
                if (item.diffs[i]) {
                    htmlParts.push("<span cmd=\"jh fb ", item.index, '\x20start', i + 1, '\x22>', this.fb_buttons[i], "</span>");
                }
            }
        Dialog.footerElement.find(".item-commands").html(htmlParts.join(''));
    }
},
Dialog.jh_ar = {
    'name': '禁地',
    'items': null,
    'type': 'ar',
    'selected_index': 0,
    'select': Dialog.jh_fam.select,
    'onClickItem': Dialog.jh_fam.onClickItem,
    'append_status': Dialog.jh_fb.append_status,
    'append_actions': Dialog.jh_fam.append_actions,
    'fb_models': ['普通', '普通', '组队'],
    'onDetail': function(_t769) {
        var _t771 = this.items[_t769.index];
        if (!_t771)
            return;
        _t771.type = '禁地';
        _t771.desc = _t769.desc;
        _t771.actions = _t769.actions;
        _t771.status = _t769.status;
        _t771.reward = _t769.reward;
        return this.showDetail(_t771);
    },
    'update_unlock': function(_t772) {
        for (let _n112 = 0; _n112 < this.items.length; _n112++) {
            this.items[_n112].unlock = (_t772 & Math.pow(2, _n112)) !== 0;
        }
    },
    'show': function(_t773, _t774) {
        var _a66 = ["<div class='fb-content'>"];
        let _t776 = Math.max(this.items.length, 10);
        for (var _n113 = 0; _n113 < _t776; _n113++) {
            var _t777 = this.items[_n113];
            _a66.push("<div class=\"fb-item");
            if (_t777) {
                if (!_t777.unlock)
                    _a66.push(" lock");
                _a66.push('\x22\x20index=\x22', _n113, '\x22>', _t777.name, '</div>');
                _t777.index = _n113;
            } else {
                _a66.push("\">&nbsp;</div>");
            }
        }
        _a66.join('</div>');
        this.listElement = _t773;
        this.descElement = _t774;
        this.listElement.html(_a66.join(''));
        this.onClickItem(this.selected_index);
    },
    'showDetail': function(_t778) {
        var _a67 = ["<pre>"];
        _a67.push(_t778.name);
        _t778.unlock ? _a67.push("\n<hig>已解锁</hig>\n") : _a67.push("\n<red>未解锁</red>\n");
        _a67.push(_t778.desc, '\x0a');
        this.append_status(_a67, _t778);
        this.append_actions(_a67, _t778);
        if (_t778.unlock) {
            _a67.push("<div class=\"item-commands\">");
            _a67.push("<span cmd=\"jh ar " + _t778.index + (" start\">进入地图</span>"));
            let _a68 = [];
            Dialog.extend.append(_a68, 'map', _t778);
            for (let _t780 of _a68) {
                _a67.push("<span cmd=\"", _t780.cmd, '\x22>', _t780.name, "</span>");
            }
            _a67.push("</div>");
        }
        _a67.push(_t778.reward);
        _a67.push("</pre>");
        this.descElement.html(_a67.join(''));
        this.select(_t778.index);
    },
    'append_footer': function() {
        let _t782 = this.items[this.selected_index];
        if (_t782.unlock)
            Dialog.footerElement.find(".item-commands").html("<span cmd=\"jh ar " + _t782.index + (" start\">进入地图</span>"));
        else
            Dialog.footerElement.find(".item-commands").empty();
    }
},
Dialog.jh = {
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'onData': function(_t784) {
        if (_t784.close)
            return Dialog.isShow && Dialog.hide();
        if (_t784.desc)
            return this.selected_item.onDetail(_t784);
        if (_t784.unlock !== undefined || _t784.unlock2 !== undefined)
            return this.update_lock(_t784);
        if (_t784.refresh !== undefined && this.isLoad) {
            let _t786 = Dialog["jh_" + _t784.t]
              , _t787 = _t786.items[_t784.refresh];
            if (_t787 && _t787.desc) {
                _t787.desc = null;
                let _t788 = _t786.items.indexOf(_t787);
                _t786.selected_index == _t788 && _t786.onClickItem(_t788);
            }
            return;
        }
        if (!_t784.fbs)
            return;
        Dialog.jh_fam.items = _t784.families.map(function(_t789) {
            return {
                'name': _t789,
                'unlock': false
            };
        });
        Dialog.jh_fb.items = _t784.fbs.map(function(_t790) {
            return {
                'name': _t790
            };
        });
        Dialog.jh_ar.items = _t784.areas.map(function(_t791) {
            return {
                'name': _t791,
                'unlock': false
            };
        });
        this.selected_item.show(this.listElement, this.descElement);
    },
    'show': function() {
        if (this.isShow)
            return;
        if (!this.element)
            this.element = $("<div class='dialog-fb'><div class='fb-left'></div><div class='fb-right'></div></div>");
        this.listElement = this.element.find(".fb-left").on("click", ".fb-item,.fam-item", this.item_click);
        this.descElement = this.element.find(".fb-right");
        Dialog.title('江湖');
        Dialog.icon('home');
        this.element.appendTo(Dialog.contentElement);
        this.isShow = true;
        if (this.isLoad) {
            SendCommand('jh\x20fb\x20lock');
        } else {
            SendCommand('jh');
            this.isLoad = true;
            this.selected_item = this.footers[0];
        }
        this.create_footer();
    },
    'selected_item': null,
    'footers': [Dialog.jh_fam, Dialog.jh_fb, Dialog.jh_ar],
    'create_footer': function() {
        var _a69 = [];
        for (var _n114 = 0; _n114 < this.footers.length; _n114++) {
            let _t794 = this.footers[_n114];
            _a69.push("<span class='footer-item" + (_t794 == this.selected_item ? " select" : '') + "' for='" + _n114 + '\x27>' + this.footers[_n114].name + "</span>");
        }
        _a69.push("<div class=\"item-commands\"></div>");
        Dialog.footerElement.html(_a69.join(''));
    },
    'item_click': function() {
        var _J75 = $(this);
        if (_J75.is(".selected"))
            return;
        let _t796 = _J75.attr('index');
        if (_t796 !== undefined)
            Dialog.jh.selected_item.onClickItem(_t796);
    },
    'update_lock': function(_t797) {
        if (_t797.unlock >= 0 && Dialog.jh_fb.items) {
            Dialog.jh_fb.update_unlock(_t797.unlock);
            if (this.selected_item === Dialog.jh_fb)
                Dialog.jh_fb.show(this.listElement, this.descElement);
        }
        if (_t797.unlock2 >= 0 && Dialog.jh_ar.items) {
            Dialog.jh_ar.update_unlock(_t797.unlock2);
            if (this.selected_item === Dialog.jh_ar)
                Dialog.jh_ar.show(this.listElement, this.descElement);
        }
    },
    'footerChanged': function(_t799) {
        let _t801 = this.footers[_t799];
        if (_t801 == this.selected_item)
            return;
        this.selected_item = _t801;
        Dialog.footerElement.find(".item-commands").empty();
        _t801.show(this.listElement, this.descElement);
    }
},
Dialog.shop = {
    'selected_item': 0,
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'onData': function(_t803) {
        if (_t803.money) {
            let _t805 = _t803.money ?? [0, 0];
            this.money = _t805[0];
            this.cash_money = _t805[1];
            if (_t805.length > 2) {
                this.footers = ['黄金', '元宝', '活动'];
                this.act_money = _t805[2];
                this.act_name = _t803.mtype ?? "<hic>积分</hic>";
            }
            this.create_footer();
        }
        if (_t803.remove) {
            let _t806 = this.get_item(_t803.remove);
            if (_t806)
                _t806.removed = true;
            return this.show_items();
        }
        if (_t803.item) {
            let[_t807,_t808] = _t803.item
              , _t809 = this.get_item(_t807);
            if (_t809) {
                _t809.count = _t808;
                this.show_items();
            }
            return;
        }
        if (!_t803.idx)
            return;
        this.idx = _t803.idx;
        this.list0 = this.format_items(_t803.selllist[0], 0);
        this.list1 = this.format_items(_t803.selllist[1], 1);
        if (_t803.selllist.length > 2)
            this.list2 = this.format_items(_t803.selllist[2], 2);
        this.show_items();
    },
    'footerChanged': function(_t810) {
        this.selected_item = parseInt(_t810);
        this.show_items();
        this.create_footer();
    },
    'footers': ['黄金', '元宝'],
    'create_footer': function() {
        if (!this.isShow)
            return;
        var _a70 = [];
        for (var _n115 = 0; _n115 < this.footers.length; _n115++) {
            _a70.push("<span class='footer-item" + (_n115 === this.selected_item ? '\x20select' : '') + "' for='" + _n115 + '\x27\x27>' + this.footers[_n115] + "</span>");
        }
        if (this.selected_item === 0)
            _a70.push("<div class=\"obj-money\">", this.money > 0 ? '你身上有' + moneyToStr(this.money) : '你身上没有银两', '</div>');
        else {
            if (this.selected_item === 1)
                _a70.push("<div class=\"obj-money\">", this.cash_money > 0 ? "你身上有" + this.cash_money + ("<hij>元宝</hij>") : "你身上没有元宝", "<span cmd=\"transmoney\">账号转入</span></div>");
            else
                this.selected_item === 2 && _a70.push("<div class=\"obj-money\">", "你身上有", this.act_money > 0 ? this.act_money : 0, this.act_name);
        }
        Dialog.footer(_a70.join(''));
    },
    'format_items': function(_t813, _t814) {
        let _a71 = [];
        for (let _t816 of _t813) {
            if (!_t816)
                continue;
            let _o6 = {
                'id': _t816[0],
                'name': _t816[1],
                'desc': _t816[2],
                'value': _t816[3],
                'grade': _t816[4],
                'discount': _t816[5]
            };
            if (_t816[6]) {
                _o6.limit = _t816[6];
                _o6.count = _t816[7];
            }
            if (_o6.discount < 1) {
                if (_t814 === 0)
                    _o6.price0 = "<del>" + _o6.value + "两黄金</del>";
                else {
                    if (_t814 === 1)
                        _o6.price0 = "<del>" + _o6.value + "元宝</del>";
                    else {
                        if (_t814 === 2)
                            _o6.price0 = "<del>" + _o6.value + this.act_name + "</del>";
                    }
                }
                _o6.value = _o6.value * _o6.discount;
            }
            if (_t814 === 0) {
                if (_o6.value >= 1)
                    _o6.price = "<hiy>" + _o6.value + '两黄金</hiy>';
                else
                    _o6.price = "<wht>" + _o6.value * 100 + "两白银</wht>";
            } else {
                if (_t814 === 1)
                    _o6.price = "<hij>" + _o6.value + "元宝</hij>";
                else
                    _t814 === 2 && (_o6.price = _o6.value + this.act_name);
            }
            _a71.push(_o6);
        }
        return _a71;
    },
    'show_items': function() {
        if (!this.isShow)
            return;
        this.create_items([this.list0, this.list1, this.list2][this.selected_item]);
    },
    'get_item': function(_t818) {
        if (this.list0) {
            for (let _t820 of this.list0)
                if (_t820.id === _t818)
                    return _t820;
        }
        if (this.list1) {
            for (let _t821 of this.list1)
                if (_t821.id === _t818)
                    return _t821;
        }
        if (this.list2) {
            for (let _t822 of this.list2)
                if (_t822.id === _t818)
                    return _t822;
        }
    },
    'show': function(_t823) {
        if (!this.element)
            this.element = $("<div class='dialog-shop-content'><div class='dialog-shop'></div></div>");
        Dialog.title("商品列表");
        Dialog.icon("shopping-cart");
        this.isShow = true;
        this.element.appendTo(Dialog.contentElement);
        if (!this.idx)
            SendCommand("shop");
        else
            SendCommand('shop\x20' + this.idx);
    },
    'create_items': function(_t825) {
        let _a72 = [];
        for (let _n116 = 0; _n116 < _t825.length; _n116++) {
            let _t827 = _t825[_n116];
            if (_t827.removed) {
                _t825.splice(_n116, 1);
                _n116--;
                continue;
            }
            _a72.push("<div class='shop-item");
            _a72.push('\x20grade', _t827.grade);
            _a72.push("'><div class='flex-1'><div class='shop-item-title'>");
            _a72.push("<div class=\"shop-item-name\">", _t827.name, "</div>");
            if (_t827.limit > 0)
                _a72.push('(', _t827.count, '/', _t827.limit, ')');
            _a72.push("</div>");
            _a72.push("<pre class='shop-desc'>");
            _a72.push(_t827.desc);
            _a72.push("</pre></div>");
            _a72.push("<div class='shop-btn' ");
            _a72.push("cmd=\"_confirm shop ", _t827.id);
            _t827.limit > 0 && _a72.push('\x20', _t827.limit - _t827.count);
            _a72.push('\x22>');
            _t827.price0 && _a72.push('&nbsp;', _t827.price0, "&nbsp;");
            _a72.push(_t827.price);
            _a72.push("</div>");
            _a72.push('</div>');
        }
        this.element.find(".dialog-shop").html(_a72.join(''));
    }
},
Dialog.message = {
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'hide': function() {
        if (this.detailID) {
            this.hide_detail();
            return false;
        }
    },
    'hide_detail': function() {
        this.element.removeClass("detail");
        this.detailID = null;
        Dialog.footerElement.find(".item-commands").empty();
    },
    'selected_item': 0,
    'messages': [],
    'isLoad': false,
    'unRead': 0,
    'onData': function(_t831) {
        if (_t831.receive)
            return this.updateMessageState(_t831.receive, _t831.index);
        if (_t831.items)
            return this.createMessageDetail(_t831.id, _t831.items);
        if (_t831.clear)
            return this.clear_message(_t831.clear);
        _t831.unRead !== undefined && (this.unRead = _t831.unRead);
        if (_t831.messages)
            for (var _n117 = 0; _n117 < _t831.messages.length; _n117++) {
                this.addMessage(_t831.messages[_n117]);
            }
        if (_t831.message) {
            if (!this.isShow)
                this.unRead++;
            if (this.messages)
                this.addMessage(_t831.message);
            _t831.message.id == "notice" && this.showNotice(_t831.message);
        }
        if (this.element)
            this.showMessages();
        if (this.isShow)
            _t831.message && this.element.is(".detail") & this.detailID == _t831.message.id && this.detailElement.prepend($(this.createMessageDetailItem(_t831.message.id, _t831.message.name, _t831.message)));
        else
            this.showUnread();
    },
    'showUnread': function() {
        if (this.unRead)
            ToolAction.showFlag("message", this.unRead);
        else
            ToolAction.showFlag("message", 0);
    },
    'addMessage': function(_t834) {
        for (let _n118 = 0; _n118 < this.messages.length; _n118++) {
            if (this.messages[_n118].id == _t834.id) {
                this.messages[_n118] = _t834;
                return;
            }
        }
        this.messages.push(_t834);
    },
    'clear_message': function(_t836) {
        for (let _n119 = 0; _n119 < this.messages.length; _n119++) {
            let _t838 = this.messages[_n119].id;
            if (_t836 === true && _t838 !== 'notice' || _t838 === _t836) {
                this.messages.splice(_n119, 1);
                _n119--;
            }
        }
        this.showMessages();
        if (!this.isShow)
            return;
        this.element.is(".detail") & (_t836 === true || this.detailID == _t836) && this.hide_detail();
    },
    'show': function(_t839) {
        this.unRead = 0;
        this.showUnread();
        if (this.isShow)
            return;
        this.isShow = true;
        Dialog.title('消息');
        Dialog.icon("envelope");
        this.create_footer();
        this.footerChanged(this.selected_item);
        if (this.isLoad)
            return;
        SendCommand("message");
        this.isLoad = true;
    },
    'inner_show': function() {
        Dialog.title('消息');
        Dialog.icon("envelope");
        this.element.on("click", ".message-item", this.showMessageDetail);
    },
    'inner_close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'footers': ['消息', '队伍', '关系', '帮派'],
    'footerElements': ["message", "team", "relation", 'party'],
    'create_footer': function() {
        var _a73 = [];
        for (var _n120 = 0; _n120 < this.footers.length; _n120++) {
            _a73.push("<span class='footer-item" + (_n120 == this.selected_item ? " select" : '') + "' for='" + _n120 + '\x27\x27>' + this.footers[_n120] + "</span>");
        }
        _a73.push("<dic class=\"item-commands\"></div>");
        Dialog.footer(_a73.join(''));
    },
    'footerChanged': function(_t844) {
        this.selected_item = _t844;
        Dialog.footerElement.find(".item-commands").empty();
        this.showChild();
    },
    'showChild': function() {
        var _t847 = Dialog[this.footerElements[this.selected_item]];
        if (this.selectedChild)
            this.selectedChild.inner_close();
        if (!_t847.element)
            _t847.element = _t847.createElement();
        Dialog.contentElement.html(_t847.element);
        _t847.inner_show();
        this.selectedChild = _t847;
    },
    'showNotice': function(_t848) {
        var _a74 = ["\n<hiy>系统公告</hiy>\n"]
          , _t850 = new Date(_t848.time);
        _a74.push(_t850.getFullYear());
        _a74.push('年');
        _a74.push(_t850.getMonth() + 1);
        _a74.push('月');
        _a74.push(_t850.getDate());
        _a74.push('日\x20');
        _a74.push(_t850.getHours());
        _a74.push('时');
        _a74.push(_t850.getMinutes());
        _a74.push("分\n<hic>");
        _a74.push(_t848.content);
        _a74.push("\n</hic>");
        ReceiveMessage(_a74.join(''));
    },
    'showMessages': function(_t851) {
        var _a75 = [];
        for (var _n121 = 0; _n121 < this.messages.length; _n121++) {
            var _t853 = this.messages[_n121];
            _a75.push("<div class='message-item' fromid=\"");
            _a75.push(_t853.id);
            _a75.push("\"><div class='message-title'>");
            _a75.push(_t853.name);
            _a75.push("<span class='message-time'>");
            _a75.push(this.getTimedesc(_t853.time));
            _a75.push('</span>');
            _a75.push("</div>");
            _a75.push("<div class='message-content'>");
            _a75.push(_t853.content);
            _a75.push('</div>');
            _a75.push('</div>');
        }
        if (!_a75.length)
            _a75.push("<div class=\"empty\">暂无新消息</div>");
        if (!this.listElement)
            this.listElement = this.element.find(".message-list");
        this.listElement.html(_a75.join(''));
    },
    'getTimedesc': function(_t854) {
        var _t856 = new Date()
          , _t857 = new Date(_t854)
          , _t858 = (_t856 - _t857) / 1000;
        if (_t858 < 60)
            return '刚刚';
        else {
            if (_t858 < 3600)
                return parseInt(_t858 / 60) + '分钟前';
            else {
                if (_t857.getFullYear() == _t856.getFullYear() && _t857.getMonth() == _t856.getMonth()) {
                    var _t859 = _t857.getDate() - _t856.getDate()
                      , _t860 = '今天\x20' + this.add_zero(_t857.getHours()) + ':' + this.add_zero(_t857.getMinutes());
                    if (_t859 === 0)
                        return _t860;
                    else {
                        if (_t859 === 1)
                            return "昨天 " + _t860;
                        else {
                            if (_t859 === 2)
                                return "前天 " + _t860;
                        }
                    }
                }
            }
        }
        var _t861 = _t857.getMonth() + 1 + '月' + _t857.getDate() + '日\x20' + this.add_zero(_t857.getHours()) + '：' + this.add_zero(_t857.getMinutes());
        if (_t856 - _t857 > 2332800000) _t861 += "<mem>即将过期</mem>";
        return _t861;
    },
    'add_zero': function(_t862) {
        if (_t862 < 10)
            return '0' + _t862;
        return _t862;
    },
    'showMessageDetail': function() {
        var _J76 = $(this).attr('fromid');
        if (!_J76)
            return;
        SendCommand('message\x20' + _J76);
        Dialog.message.element.addClass('detail');
    },
    'getMessageitem': function(_t864) {
        for (var _n122 = 0; _n122 < this.messages.length; _n122++) {
            if (this.messages[_n122].id == _t864)
                return this.messages[_n122];
        }
    },
    'createMessageDetail': function(_t866, _t867) {
        !this.detailElement && (this.detailElement = this.element.find(".detail-list"));
        var _t869 = this.getMessageitem(_t866);
        if (!_t869)
            return;
        var _a76 = [];
        this.detailID = _t866;
        let _b4 = false;
        for (var _n123 = 0; _n123 < _t867.length; _n123++) {
            var _t870 = _t867[_n123];
            _a76.push(this.createMessageDetailItem(_t866, _t869.name, _t870));
            _t870.attach && !_t870.rec && (_b4 = true);
        }
        this.detailElement.html(_a76.join(''));
        let _t871 = '';
        _t866 !== "notice" && (_t871 = "<span cmd=\"message delete " + _t866 + ("\">删除</span><span cmd=\"receive ") + _t866 + ("\">领取全部</span>"));
        Dialog.footerElement.find(".item-commands").html(_t871);
    },
    'createMessageDetailItem': function(_t872, _t873, _t874) {
        var _a77 = [];
        _a77.push("<div class='detail-item' rec='", _t874.attach && !_t874.rec ? 1 : 0, "' fid='", _t872, "' index='" + _t874.index + '\x27>');
        _a77.push("<span class='detail-name'>");
        _a77.push(_t873);
        _a77.push('</span>');
        _a77.push("<span class='detail-time'>");
        _a77.push(this.getTimedesc(_t874.time));
        _a77.push("</span>");
        _a77.push("<pre class='detail-content'>");
        _a77.push(_t874.content);
        _a77.push('</pre>');
        if (_t874.attach) {
            for (var _n124 = 0; _n124 < _t874.attach.length; _n124++) {
                _a77.push("<div class='detail-attach'>");
                _a77.push(_t874.attach[_n124].name);
                _a77.push("</div>");
            }
            _t874.rec ? _a77.push("<div class='detail-rec'>已领取</div>") : _a77.push("<div  class='detail-rec' cmd='receive " + _t872 + '\x20' + _t874.index + ("'><hig>领取</hig></div>"));
        }
        _a77.push("</div>");
        return _a77.join('');
    },
    'createElement': function() {
        return $("<div class=\"dialog-message\"><div class=\"message-list\"></div><div class=\"detail-list\"></div></div>");
    },
    'updateMessageState': function(_t877, _t878) {
        if (this.detailID != _t877)
            return;
        const _t880 = this.detailElement.find(".detail-item[index='" + _t878 + ("']>.detail-rec"));
        _t880.html('已领取').removeAttr("cmd");
    }
},
Dialog.relation = {
    'createElement': function() {
        return $("<div class=\"dialog-relation\"></div>");
    },
    'inner_show': function() {
        SendCommand("relation");
        this.isShow = true;
        Dialog.title('关系');
        Dialog.icon("heart");
    },
    'onData': function(_t883) {
        if (!this.element)
            this.element = this.createElement();
        var _a78 = [];
        _a78.push("<div class='relation-item'>");
        _a78.push("<div class='relation-desc'>");
        if (_t883.husband) {
            _a78.push("你的丈夫：");
            _a78.push(_t883.husband);
        }
        else
            if (_t883.wife) {
                _a78.push("你的妻子：");
                _a78.push(_t883.wife);
            } else {
                _a78.push("你目前没有结婚。");
            }
        _a78.push("</div>");
        if (_t883.wife || _t883.husband) {
            _a78.push("<div class='relation-cmd' cmd='_confirm greet wife'><him>❀送花❀</him></div>");
            _a78.push("<div class='relation-cmd' cmd='rel marry'>解除关系</div>");
        }
        _a78.push('</div>');
        _a78.push("<div class='relation-item'>");
        _a78.push("<div class='relation-desc'>");
        if (_t883.shifu) {
            _a78.push('你的师父：');
            _a78.push(_t883.shifu);
        }
        else
            if (_t883.tudi) {
                _a78.push("你的徒弟：");
                _a78.push(_t883.tudi);
            } else {
                _a78.push("你目前没有拜师，也没有收徒。");
            }
        _a78.push("</div>");
        if (_t883.shifu) {
            _a78.push("<div class='relation-cmd' cmd='greet master'><hig>请安</hig></div>");
            _a78.push("<div class='relation-cmd' cmd='rel st'>出师</div>");
            _a78.push("</div>");
        }
        else
            _t883.tid && _a78.push("<div class='relation-cmd' cmd='rel st'>解除关系</div>");
        _a78.push('</div>');
        if (_t883.st !== undefined) {
            _a78.push("<div class='relation-item'><div class='relation-desc'>");
            _a78.push("当师徒组队完成副本后将获得额外奖励，本周已完成" + _t883.st + "/10。", "</div>");
            _a78.push("<div class='relation-cmd' cmd='team add ", _t883.tid ?? _t883.shifu, "'>邀请组队</div>");
            _a78.push("</div>");
        }
        if (_t883.reward) {
            _a78.push("<div class='relation-item'>");
            _a78.push(_t883.reward);
            _a78.push('</div>');
        }
        _a78.push("</div>");
        if (_t883.fls)
            for (let _t885 of _t883.fls) {
                if (!_t885)
                    continue;
                _a78.push("<div class='relation-item'>");
                _a78.push("<div class='relation-desc'>你的家人：", _t885[0]);
                if (_t885[2]) {
                    _a78.push('，已', _t885[2], format_time_span(_t885[3]));
                    _a78.push("</div>");
                    _a78.push("<div class='relation-cmd' cmd='rel ", _t885[1], " stop'>停止</div>");
                } else {
                    _a78.push("空闲中</div>");
                    _a78.push("<div class='relation-cmd' cmd='rel ", _t885[1], " caiyao'><hic>采药</hic></div>");
                    _a78.push("<div class='relation-cmd' cmd='rel ", _t885[1], " diaoyu'><hic>钓鱼</hic></div>");
                    _a78.push("<div class='relation-cmd' cmd='rel ", _t885[1], " wk'><hic>挖矿</hic></div>");
                }
                _a78.push('</div>');
            }
        this.element.html(_a78.join(''));
    },
    'inner_close': function() {
        this.element.remove();
        this.isShow = false;
    }
},
Dialog.party = {
    'createElement': function() {
        return $("<div class=\"dialog-party\"></div>");
    },
    'inner_show': function() {
        SendCommand("party load");
        this.isShow = true;
        Dialog.title('');
        this.element.on("click", ".party-role", this.show_commands);
        Dialog.icon('flag');
    },
    'levels': ['', "<hio>帮主<hio>", "<hiz>副帮主</hiz>", "<hiy>长老</hiy>", "<hic>堂主</hic>", '帮众'],
    'level_roles': [1, 20, 30, 40, 50, 60],
    'level': 5,
    'get_role': function(_t889) {
        if (!this.roles)
            return;
        for (var _n125 = 0; _n125 < this.roles.length; _n125++) {
            if (this.roles[_n125].id == _t889)
                return this.roles[_n125];
        }
    },
    'command': function(_t891) {
        if (_t891 === 'create') {
            let _a79 = ["<div class=\"dialog-party-add\">"];
            _a79.push("<div>创建帮派需要500两<hiy>黄金</hiy>，请输入帮派名称(2-5字中文)：</div>");
            _a79.push("<input type=\"text\" >");
            _a79.push("<div class='item-commands'><span cmd='_party cancle'>取消</span><span cmd='_party create2'>确定</span></div>");
            _a79.push("</div>");
            this.element.html(_a79.join(''));
        } else {
            if (_t891 === "cancle")
                this.empty('你还没有加入帮派');
            else {
                if (_t891 === "create2") {
                    let _J77 = $(".dialog-party-add>input").val();
                    if (!_J77 || _J77.length > 5 || _J77.length < 2)
                        return ReceiveMessage("帮派名字需要是2-5中文字符。");
                    SendCommand("party create2 " + _J77);
                }
            }
        }
    },
    'empty': function(_t893) {
        this.element.html("<wht>" + _t893 + ("</wht><div class='item-commands'><span cmd='_party create'>创建帮派</span><span cmd='party list'>加入帮派</span></div>"));
    },
    'show_list': function(_t895) {
        if (!_t895.list.length)
            return this.empty("现在没有已经创建的帮派");
        var _a80 = [];
        for (let _t897 of _t895.list) {
            _a80.push("<div class='party-item'>");
            _a80.push("<span class='party-item-name'>");
            _a80.push(_t897[0]);
            _a80.push("</span>");
            _a80.push("<span class='party-item-sc'>人数：");
            _a80.push(_t897[1]);
            _a80.push("</span>");
            _a80.push("<span class='party-item-cmd' cmd='party join ", _t897[0], "'>加入</span>");
            _a80.push("</div>");
        }
        this.element.html(_a80.join(''));
    },
    'onData': function(_t898) {
        if (_t898.list)
            return this.show_list(_t898);
        if (!_t898.name)
            return this.empty("你还没有加入帮派");
        Dialog.title("帮派【" + _t900.name + '】\x20<nor>' + _t898.roles.length + '/' + this.level_roles[_t898.level] + "</nor>");
        var _a81 = [];
        _t900.notice && (_a81.push("<div class='party-notice'>"),
        _a81.push(_t900.notice),
        _a81.push("</div>"));
        _a81.push("<div class='party-roles'>");
        for (var _n126 = 0; _n126 < _t900.roles.length; _n126++) {
            var _t901 = _t900.roles[_n126];
            _t901.id == Process.player && (this.level = _t901.level);
            _a81.push("<div class='party-role' roleid='" + _t901.id + '\x27>');
            _a81.push("<span class='role-level'>");
            _a81.push(this.levels[_t901.level]);
            _a81.push("</span>");
            _a81.push("<span class='role-name'>");
            _a81.push(_t901.name);
            _a81.push("</span>");
            _a81.push("<span class='role-sc'>");
            _a81.push(_t901.sc);
            _a81.push('</span>');
            _a81.push("</div>");
        }
        _a81.push("</div>");
        this.roles = _t898.roles;
        this.element.html(_a81.join(''));
    },
    'show_commands': function() {
        var _t903 = Dialog.party.get_role($(this).attr("roleid"));
        if (!_t903)
            return;
        var _a82 = ["<div class='item-commands'>"];
        if (_t903.id == Process.player) {
            _a82.push("<span cmd=\"party out\">退出帮派</span>");
            Dialog.party.level === 1 && _a82.push("<span cmd=\"party dissmiss\">解散</span>");
        }
        else {
            if (_t903.level > Dialog.party.level - 1 && _t903.level > 2)
                _a82.push("<span cmd=\"party uplevel " + _t903.id + "\">提升为" + Dialog.party.levels[_t903.level - 1] + "</span>");
            _t903.level > Dialog.party.level && _t903.level < 5 && _a82.push("<span cmd=\"party downlevel " + _t903.id + "\">降级为" + Dialog.party.levels[_t903.level + 1] + '</span>');
            Dialog.party.level === 1 && _t903.level === 2 && _a82.push("<span cmd=\"party trans " + _t903.id + ("\">让位</span>"));
            if (_t903.level > Dialog.party.level)
                _a82.push("<span cmd=\"party remove " + _t903.id + ("\">开除</span>"));
            _t903.online && _a82.push("<span cmd=\"team add " + _t903.id + ("\">邀请组队</span>"));
        }
        if (_a82.length === 1)
            return;
        _a82.push("</div>");
        Dialog.party.element.find(".item-commands").remove();
        $(_a82.join('')).insertAfter(this);
    },
    'inner_close': function() {
        this.element.remove();
        this.isShow = false;
    }
},
Dialog.team = {
    'createElement': function() {
        return $("<div class=\"dialog-team\"></div>");
    },
    'inner_show': function() {
        SendCommand('team');
        this.isShow = true;
        Dialog.title('队伍');
        this.element.on("click", ".team-item", this.clickItem);
        Dialog.icon("list");
    },
    'items': [],
    'onData': function(_t906) {
        if (_t906.items) {
            this.items = _t906.items;
            if (_t906.items.length)
                this.isCap = _t906.items[0].id == Process.player;
            else
                this.isCap = 0;
        }
        _t906.dismiss && (this.items.length = 0,
        this.isCap = false);
        if (_t906.remove) {
            if (!this.items.length)
                return;
            for (var _n127 = 0; _n127 < this.items.length; _n127++) {
                if (this.items[_n127].id == _t906.remove) {
                    this.items.splice(_n127, 1);
                    break;
                }
            }
        }
        this.createItems();
    },
    'inner_close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'createItems': function() {
        if (!this.element)
            return;
        var _a83 = [];
        for (var _n128 = 0; _n128 < this.items.length; _n128++) {
            var _t910 = this.items[_n128];
            _a83.push("<div class='team-item' index='" + _n128 + '\x27>');
            _a83.push("<span class='team-flag'>");
            _a83.push(_n128 > 0 ? '' : "<span class='glyphicon glyphicon-flag'></span>");
            _a83.push('</span>');
            _a83.push("<span class='team-title'>");
            _a83.push(_t910.name);
            _a83.push('</span>');
            _a83.push("</div>");
        }
        if (!_a83.length)
            _a83.push("<div class=\"empty\">你还没有加入任何队伍。</div>");
        this.element.html(_a83.join(''));
    },
    'clickItem': function() {
        var _J78 = $(this)
          , _t912 = Dialog.team.items[_J78.attr("index")];
        if (!_t912)
            return;
        var _a84 = ["<div class='item-commands'>"];
        _a84.push("<span cmd=\"look3 " + _t912.id + ("\">查看</span>"));
        var _t913 = Dialog.team.items[0].id == Process.player;
        if (_t913 && _t912.id != Process.player)
            _a84.push("<span cmd=\"team remove " + _t912.id + ("\">移出队伍</span>"));
        else
            _t912.id == Process.player && _a84.push("<span cmd=\"team out " + _t912.id + ("\">退出队伍</span>"));
        _t913 && _t912.id == Process.player && _a84.push("<span cmd=\"team set\">更改分配方式</span>");
        _a84.push("</div>");
        Dialog.team.element.find(".item-commands").remove();
        $(_a84.join('')).appendTo(_J78);
    }
},
Dialog.events = {
    'unRead': 0,
    'hide': function() {
        this.element.remove();
        this.isShow = false;
    },
    'onData': function(_t915) {
        if (_t915.close)
            return Dialog.hide();
        if (!_t915.items) {
            if (_t915.finish)
                this.unRead--;
            else
                this.unRead++;
            return this.showUnread();
        }
        this.items = _t915.items;
        this.create_items();
    },
    'showUnread': function() {
        ToolAction.showFlag('events', this.unRead);
    },
    'show': function() {
        if (!this.element)
            this.element = $("<div class='dialog-events'></div>");
        SendCommand("events");
        if (this.isShow)
            return;
        Dialog.title('活动');
        Dialog.icon("dashboard");
        this.unRead = 0;
        this.showUnread();
        Dialog.footer('');
        this.element.appendTo(Dialog.contentElement);
        this.isShow = true;
    },
    'create_items': function() {
        if (!this.element) {
            if (!this.isShow)
                return;
            this.element = $("<div class='dialog-events'></div>");
            this.element.appendTo(Dialog.contentElement);
        }
        let _a85 = [];
        for (let _n129 = 0; _n129 < this.items.length; _n129++) {
            const [_t920,_t921,_t922,_t923,_t924,_t925] = this.items[_n129];
            _a85.push("<div class='event-item flex-row ");
            _a85.push("grade", _t923);
            _a85.push("'><div class='flex-1'><h3>");
            _a85.push(_t921);
            _a85.push('</h3>');
            _a85.push("<pre class='event-desc'>");
            _a85.push(_t922);
            if (_t924 > 0)
                _a85.push("\n<mem>", this.format_time(_t924), "</mem>");
            _a85.push("</pre></div>");
            _a85.push("<span class='event-btn flex-0'");
            if (_t925)
                _a85.push(" cmd='events ", _t920, '\x27\x20>', _t925);
            else
                _a85.push(">进行中");
            _a85.push('</span>');
            _a85.push('</div>');
        }
        if (!_a85.length)
            _a85.push("<div class=\"empty\">暂无活动</div>");
        this.element.html(_a85.join(''));
        Dialog.footer("<span class=\"obj-money\">共有" + this.items.length + ("项活动正在进行</span>"));
    },
    'format_time': function(_t926) {
        let _t928 = new Date(_t926)
          , _t929 = new Date()
          , _t930 = _t928.getDate()
          , _t931 = _t928.getHours()
          , _t932 = _t928.getMinutes()
          , _a86 = ["持续到"];
        if (_t929.getFullYear() !== _t928.getFullYear())
            _a86.push(_t928.getFullYear(), '年');
        if (_t929.getMonth() !== _t928.getMonth())
            _a86.push(this.format_num(_t928.getMonth() + 1), '月', this.format_num(_t930), '日');
        else {
            if (_t930 !== _t929.getDate())
                _a86.push(this.format_num(_t930), '日');
        }
        _a86.push(this.format_num(_t931), ':', this.format_num(_t932));
        return _a86.join('');
    },
    'format_num': function(_t933) {
        return _t933 > 9 ? _t933.toString() : '0' + _t933.toString();
    }
},
Dialog.pm = {
    'close': function() {
        this.element.remove();
        this.isShow = false;
    },
    'onData': function(_t936) {
        if (_t936.list) {
            this.show();
            this.create_items(_t936.list);
        }
        else
            _t936.item && this.update_item(_t936.item);
    },
    'show': function() {
        if (!Dialog.isShow || Dialog.curItem !== 'pm')
            Dialog.show('pm');
        if (!this.element)
            this.element = $("<div class='dialog-pms'></div>");
        if (this.isShow)
            return;
        Dialog.title("拍卖行");
        Dialog.icon("shopping-cart");
        Dialog.footer('');
        this.element.appendTo(Dialog.contentElement);
        this.element.on("click", ".pm-item", this.select_item);
        this.isShow = true;
    },
    'select_item': function() {
        let _J79 = $(this)
          , _t940 = Dialog.pm;
        if (_t940.selected_item)
            _t940.selected_item.removeClass("selected");
        _t940.selected_item = _J79;
        _t940.selected_item.addClass("selected");
    },
    'update_item': function(_t941) {
        let _t943 = this.element.find(".pm-item[oid=\"" + _t941[0] + '\x22]');
        if (_t943)
            _t943.replaceWith(this.create_item(_t941));
    },
    'create_items': function(_t944) {
        let _a87 = [];
        for (let _n130 = 0; _n130 < _t944.length; _n130++) {
            _a87.push(this.create_item(_t944[_n130]));
        }
        if (!_a87.length)
            _a87.push("<div class=\"empty\">暂无拍卖</div>");
        this.element.html(_a87.join(''));
        Dialog.footer("<span class=\"obj-money\">共有" + _t944.length + ("项道具正在拍卖</span>"));
    },
    'create_item': function(_t946) {
        let _a88 = [];
        const [_t948,_t949,_t950,_t951,_t952] = _t946;
        _a88.push("<div class='pm-item grade0 flex-row' oid='", _t948, '\x27>');
        _a88.push("<div class='pm-title' cmd='pm show ", _t948, '\x27>');
        _a88.push(_t949);
        _a88.push("</div>");
        _a88.push("<div class='pm-desc flex-1'>");
        _t952 ? _a88.push(_t952, "最后出价", moneyToStr(_t950)) : _a88.push("当前价格", moneyToStr(_t950));
        _a88.push('</div>');
        _a88.push("<div class='pm-mem'>");
        _a88.push('剩余：', format_time_span(_t951), '');
        _a88.push("</div>");
        _a88.push("<div class='pm-add' cmd='pm add ", _t948, '\x27>');
        _a88.push('出价');
        _a88.push("</div>");
        _a88.push("</div>");
        return _a88.join('');
    },
    'format_num': function(_t953) {
        return _t953 > 9 ? _t953.toString() : '0' + _t953.toString();
    }
};
function format_time_span(seconds) {
    let _t956 = Math.floor(seconds / 1000);
    if (_t956 < 0)
        _t956 = 0;
    if (_t956 > 3600) {
        let _t957 = Math.floor(_t956 / 3600) + '小时';
        _t956 = _t956 % 3600;
        _t957 += Math.floor(_t956 / 60) + '分';
        return _t957;
    }
    let _t958 = Math.floor(_t956 / 60) + '分';
    _t956 = _t956 % 60;
        return _t958 + _t956 + '秒';
}
Dialog.keys = {
    'groups': [{
        'name': '移动',
        'items': [{
            'name': '左',
            'key': null,
            'cmd': "#go @dir(left)"
        }, {
            'name': '右',
            'key': null,
            'cmd': "#go @dir(right)"
        }, {
            'name': '上',
            'key': null,
            'cmd': "#go @dir(up)"
        }, {
            'name': '下',
            'key': null,
            'cmd': "#go @dir(down)"
        }, {
            'name': '左上',
            'key': null,
            'cmd': "#go @dir(leftup)"
        }, {
            'name': '左下',
            'key': null,
            'cmd': "#go @dir(leftdown)"
        }, {
            'name': '右上',
            'key': null,
            'cmd': "#go @dir(rightup)"
        }, {
            'name': '右下',
            'key': null,
            'cmd': "#go @dir(rightdown)"
        }]
    }, {
        'name': '菜单',
        'items': [{
            'name': '属性',
            'key': null,
            'cmd': "#menu score"
        }, {
            'name': '背包',
            'key': null,
            'cmd': "#menu pack"
        }, {
            'name': '技能',
            'key': null,
            'cmd': "#menu skills"
        }, {
            'name': '任务',
            'key': null,
            'cmd': "#menu tasks"
        }, {
            'name': '商城',
            'key': null,
            'cmd': "#menu shop"
        }, {
            'name': '社交',
            'key': null,
            'cmd': "#menu message"
        }, {
            'name': '排行',
            'key': null,
            'cmd': "#menu stats"
        }, {
            'name': '设置',
            'key': null,
            'cmd': "#menu setting"
        }, {
            'name': '动作',
            'key': null,
            'cmd': "#menu showcombat"
        }, {
            'name': '活动',
            'key': null,
            'cmd': "#menu events"
        }, {
            'name': '聊天',
            'key': null,
            'cmd': "#menu showchat"
        }, {
            'name': '停止',
            'key': null,
            'cmd': "#menu stopstate"
        }, {
            'name': '江湖',
            'key': null,
            'cmd': "#menu jh"
        }]
    }],
    'setting': null,
    'show': function(_t959) {
        this.element = _t959;
        this.init();
        _t959.on('click', ".skey-item", this.item_clicked);
        document.body.addEventListener("keydown", this.record_press);
    },
    'hide': function() {
        document.body.removeEventListener("keydown", this.record_press);
    },
    'close': function() {
        document.body.removeEventListener('keydown', this.record_press);
    },
    'record_press': function(_t963) {
        let _t965 = Dialog.keys.select_item;
        if (!_t965)
            return;
        let _t966 = Dialog.keys.get_item(_t965.attr("sid"));
        if (!_t966)
            return;
        if (_t963.keyCode === 8 || _t963.keyCode === 27) {
            Dialog.keys.save_setting(_t966, null);
            return _t965.find('.skey-key').html('');
        }
        let _t967 = Dialog.keys.get_key_code(_t963);
        Dialog.keys.save_setting(_t966, _t967);
        _t965.find(".skey-key").html(_t966.key);
        _t963.preventDefault();
        _t963.stopPropagation();
    },
    'get_key_code': function(_t968) {
        let _t970 = _t968.code;
        if (_t968.ctrlKey) {
            if (_t968.key === 'Control')
                return;
            _t970 = "Ctrl+" + _t970;
        }
        if (_t968.altKey) {
            if (_t968.key === 'Alt')
                return;
            _t970 = "Alt+" + _t970;
        }
        if (_t968.shiftKey) {
            if (_t968.key === "Shift")
                return;
            _t970 = "Shift+" + _t970;
        }
        return _t970;
    },
    'save_setting': function(_t971, _t972) {
        _t971.key = _t972;
        if (!this.setting)
            this.setting = {};
        if (!_t972) {
            _t972 = this.id2keys[_t971.id];
            if (_t972)
                delete this.setting[_t972];
            delete this.id2keys[_t971.id];
        } else {
            if (_t972) {
                if (this.setting[_t972]) {
                    if (this.setting[_t972] === _t971.id)
                        return;
                    let _t974 = this.get_item(this.setting[_t972]);
                    _t974 && (_t974.key = null,
                    this.element.find(".skey-item[sid=\"" + _t974.id + ("\"]>.skey-key")).html(''));
                }
                this.setting[_t972] = _t971.id;
            }
        }
        storageUtil.setItem("keys", this.setting);
    },
    'get_item': function(_t975) {
        if (this.groups.length === 2)
            this.init();
        let _t977 = _t975.split('_')
          , _t978 = Dialog.keys.groups[parseInt(_t977[0])];
        if (!_t978)
            return;
        let _t979 = _t978.items[parseInt(_t977[1])];
        return _t979;
    },
    'default_keys': {
        'KeyW': "0_2",
        'KeyA': "0_0",
        'KeyR': "0_6",
        'KeyD': "0_1",
        'KeyS': "0_3",
        'KeyQ': '0_4'
    },
    'init_key': function() {
        if (this.load_storage)
            return;
        if (Util.isMobile)
            return;
        this.load_storage = true;
        this.setting = storageUtil.getItem("keys");
        window.addEventListener('keydown', this.keypress);
        this.id2keys = {};
        if (!this.setting)
            return;
        for (let _t981 in this.setting) {
            this.id2keys[this.setting[_t981]] = _t981;
        }
    },
    'keypress': function(_t982) {
        if (_t982.target !== document.body)
            return;
        let _t984 = Dialog.keys.setting;
        if (!_t984)
            return;
        let _t985 = Dialog.keys.get_key_code(_t982);
        if (_t984[_t985]) {
            let _t986 = Dialog.keys.get_item(_t984[_t985]);
            _t986 && (SCRIPT.run(_t986.cmd),
            _t982.preventDefault());
        }
    },
    'item_clicked': function() {
        let _t988 = Dialog.keys.select_item;
        if (_t988)
            _t988.removeClass('selected');
        Dialog.keys.select_item = $(this).addClass("selected");
    },
    'init': function() {
        if (this.groups.length > 2)
            return;
        let _t990 = this.id2keys || {}
          , _t991 = null
          , _n131 = 0;
        for (let _t992 of this.groups) {
            for (let _n132 = 0; _n132 < _t992.items.length; _n132++) {
                _t991 = _n131 + '_' + _n132;
                _t992.items[_n132].id = _t991;
                _t992.items[_n132].key = _t990[_t991];
            }
            _n131++;
        }
        let _o7 = {
            'name': "动作栏",
            'items': []
        };
        for (let _n133 = 0; _n133 < 12; _n133++) {
            _t991 = '2_' + _n133;
            _o7.items.push({
                'name': '栏位' + (_n133 + 1),
                'id': _t991,
                'cmd': '#action\x20' + _n133,
                'key': _t990[_t991]
            });
        }
        this.groups.push(_o7);
        _o7 = {
            'name': "技能栏",
            'items': []
        };
        for (let _n134 = 0; _n134 < 12; _n134++) {
            _t991 = '3_' + _n134;
            _o7.items.push({
                'name': '栏位' + (_n134 + 1),
                'id': _t991,
                'cmd': "#pfm " + _n134,
                'key': _t990[_t991]
            });
        }
        this.groups.push(_o7);
        this.element && this.create_html();
    },
    'create_html': function() {
        let _a89 = []
          , _n135 = 0
          , _n136 = 0;
        for (let _t994 of this.groups) {
            _a89.push("<h3>", _t994.name, "</h3>"),
            _n136 = 0;
            for (let _t995 of _t994.items) {
                _a89.push("<div class=\"skey-item\" sid=\"", _t995.id, '\x22>'),
                _a89.push("<div class=\"skey-name\">", _t995.name, "</div>"),
                _a89.push("<div class=\"skey-key\">", _t995.key, "</div>"),
                _a89.push("</div>"),
                _n136++;
            }
            _n135++;
        }
        this.element.html(_a89.join(''));
    }
},
Dialog.extend = {
    'types': [{
        'name': "自定义快捷操作",
        'value': "button",
        'for': [{
            'name': '动作栏',
            'value': 'action'
        }, {
            'name': '地图',
            'value': "map"
        }, {
            'name': "背包道具",
            'value': "pack"
        }, {
            'name': '技能',
            'value': 'skill'
        }, {
            'name': "师父/随从技能",
            'value': "mskill"
        }, {
            'name': "房间物体",
            'value': 'item'
        }]
    },{//新增扩展选项
        'name': '数据触发器',
        'value': 'trigger',
        'for': [{
            'name': '数据',
            'value': 'data'
        }]
    },{
        'name': '文本触发器',
        'value': 'filter',
        'for': [{
            'name': '文本',
            'value': 'message'
        }]
    }],
    'init': function(_t996) {
        _t996.on("click", "[ecmd]", this.onButtonClick);
        _t996.on("click", ".setting-item", this.onClickRow);
        _t996.on("click", ".switch", this.switchClick);
        _t996.on("change", "select", this.selectChanged);
        if (this.element)
            return;
        this.element = _t996;
        let _a90 = [];
        _a90.push("<div class=\"extend-list\">");
        this.append_settings(_a90);
        _a90.push("</div>");
        this.append_edit(_a90);
        _t996.html(_a90.join(''));
        this.edit_elem = this.element.find(".extend-add");
        this.list_elem = this.element.find(".extend-list");
    },
    'refresh_list': function() {
        let _a91 = [];
        this.append_settings(_a91);
        this.list_elem.html(_a91.join(''));
    },
    'append_settings': function(_t999) {
        let _t1001 = this.setting
          , _n137 = 0;
        for (let _t1002 of _t1001) {
            _t999.push(this.create_item(_t1002, _n137++));
        }
    },
    'action_types': {
        'button': '快捷操作',
        'trigger': "触发器",
        'filter': '过滤器'
    },
    'regex': {
        'message': true,
        'fmessage': true
    },
    'for_types': {
        'map': '地图',
        'action': "动作栏",
        'pack': '背包道具',
        'skill': '技能',
        'item': "房间物体",
        'mskill': "师父/随从技能",
        'message': '文本',
        'data': '事件',
        'fmessage': '文本',
        'fdata': '事件'
    },
    'create_item': function(_t1003, _t1004) {
        let _a92 = [];
        _a92.push("<div class=\"setting-item\" sid=\"", _t1004++, '\x22>');
        _a92.push("<div class=\"title\">");
        _a92.push(this.for_types[_t1003.for], this.action_types[_t1003.type], '【', _t1003.name, '】');
        _a92.push("</div>");
        let _b5 = false;
        if (_t1003.on && _t1003.on[Process.player])
            _b5 = true;
        _a92.push("<span class=\"switch ", _b5 ? 'on' : '', "\"><span class=\"switch-button\"></span><span class=\"switch-text\">开</span></span>");
        _a92.push("</div>");
        return _a92.join('');
    },
    'selectChanged': function() {
        let _J80 = $(this);
        if (_J80.attr("prop") !== 'type') {
            const _t1007 = _J80.val();
            _J80.parent().next().find(".extend-row-header").html(Dialog.extend.regex[_t1007] ? "正则表达式" : "可选参数");
            return;
        }
        let _t1008 = _J80.val()
          , _t1009 = null;
        for (let _t1010 of Dialog.extend.types) {
            if (_t1008 === _t1010.value) {
                _t1009 = _t1010.for;
                break;
            }
        }
        if (!_t1009)
            return;
        _J80 = _J80.parent().next().find("select");
        let _a93 = [];
        for (let _t1011 of _t1009) {
            _a93.push("<option value=\"", _t1011.value, '\x22>', _t1011.name, "</option>");
        }
        _J80.html(_a93.join(''));
    },
    'switchClick': function() {
        let _J81 = $(this)
          , _t1013 = _J81.find(".switch-text")
          , _t1014 = _t1013.text()
          , _t1015 = _t1014 !== "开始记录"
          , _b6 = false;
        if (_J81.is(".on")) {
            _J81.removeClass('on');
            if (_t1015)
                _t1013.html('关');
        } else {
            _J81.addClass('on');
            if (_t1015)
                _t1013.html('开');
            _b6 = true;
        }
        if (!_t1015) {
            if (_b6) {
            Dialog.close();
            Dialog.extend.start_record();
        } else {
            Dialog.extend.stop_record();
        }
        }
        else {
            let _t1016 = Dialog.extend.setting[_J81.parent().attr('sid')];
            if (_t1016) {
                if (!_t1016.on)
                    _t1016.on = {};
                if (_b6) {
                    _t1016.on[Process.player] = 1;
                } else {
                    delete _t1016.on[Process.player];
                }
                Dialog.extend.save_extend(_t1016);
            }
        }
        return false;
    },
    'start_record': function() {
        if (this.is_record)
            return;
        this.is_record = true,
        this.prev_time = 0,
        this.record_cmds = [],
        ReceiveMessage("<hic>开始记录你的操作命令。</hic>"),
        Process.state({
            'state': "正在记录你的操作命令"
        });
    },
    'excluded': {
        'score': true,
        'score2': true,
        'pack': true,
        'cha': true,
        'tasks': true,
        'message': true,
        'relation': true,
        'shop': true,
        'team': true,
        'jh': true
    },
    'excluded_check': [_t1018 => _t1018.startsWith('jh') && _t1018.indexOf("start") < 0, _t1019 => _t1019.startsWith("stats"), _t1020 => _t1020.startsWith("map"), _t1021 => _t1021.startsWith("look")],
    'record': function(_t1022) {
        if (!this.is_record)
            return;
        if (this.excluded[_t1022])
            return;
        for (let _fn8 of this.excluded_check) {
            if (_fn8(_t1022))
                return;
        }
        let _t1024 = Date.now();
        if (this.prev_time > 0)
            this.record_cmds.push('#wait\x20' + (_t1024 - this.prev_time));
        this.record_cmds.push(_t1022);
        this.prev_time = _t1024;
    },
    'stop_record': function() {
        if (!this.is_record)
            return;
        this.is_record = false;
        ReceiveMessage("<cyn>已停止记录你的操作命令。</cyn>");
        this.edit_elem.find('.switch').removeClass('on');
        if (this.record_cmds.length > 0) {
            Dialog.show("setting");
            Dialog.setting.footerChanged(3);
            this.edit_elem.removeClass("hide");
            this.list_elem.addClass('hide');
            this.edit_elem.find("textarea").val(this.record_cmds.join(';'));
            Process.state();
        }
    },
    'helper': "<li ecmd='show_actions'>可用命令参考</li><li ecmd='show_vars'>可用变量参考</li><li ecmd='show_paras'>参数用法参考</li>",
    'append_edit': function(_t1026) {
        _t1026.push("<div class=\"extend-add hide\">");
        _t1026.push("<div class=\"extend-row\">");
        _t1026.push("<input  prop=\"name\" class=\"extend-input\"/>");
        _t1026.push("<div class='extend-row-header'>提示/描述/说明</div>");
        _t1026.push("</div>");
        _t1026.push("<div class=\"extend-row\">");
        _t1026.push("<select prop=\"type\" class=\"extend-input\">");
        for (let _t1028 of this.types) {
            _t1026.push("<option value=\"", _t1028.value, '\x22>', _t1028.name, '</option>');
        }
        _t1026.push("</select><div class='extend-row-header'>扩展类型</div>");
        _t1026.push('</div>');
        let _t1029 = this.types[0];
        _t1026.push("<div class=\"extend-row\">");
        _t1026.push("<select prop=\"for\" class=\"extend-input\">");
        for (let _t1030 of _t1029.for) {
            _t1026.push("<option value=\"", _t1030.value, '\x22>', _t1030.name, "</option>");
        }
        _t1026.push("</select><div class='extend-row-header'>可用选项</div>");
        _t1026.push('</div>');
        _t1026.push("<div class=\"extend-row\">");
        _t1026.push("<input  prop=\"paras\" class=\"extend-input\"/>");
        _t1026.push("<div class='extend-row-header'>可选参数</div>");
        _t1026.push("</div>");
        _t1026.push("<div class=\"extend-row flex-1\">");
        _t1026.push("<textarea   prop=\"content\"  class=\"extend-input\"></textarea>");
        _t1026.push("<div class='extend-row-header extend-menus'>");
        _t1026.push("<span class=\"switch\"> <span class=\"switch-button\"> </span><span class=\"switch-text\">开始记录</span></span>");
        _t1026.push("<ul class='extend-help'>");
        _t1026.push(this.helper);
        _t1026.push("</ul><button ecmd='save'>保存</button>");
        _t1026.push("</div></div>");
        _t1026.push("</div>");
    },
    'onClickRow': function() {
        var _J82 = $(this)
          , _t1032 = Dialog.extend.setting[_J82.attr("sid")];
        if (!_t1032)
            return;
        Dialog.extend.selected_item = _t1032,
        !Dialog.extend.edit_button && (Dialog.extend.edit_button = $("<div class=\"buttons\"><button ecmd=\"edit\">编辑</button><button ecmd=\"up\">上移</button><button ecmd=\"down\">下移</button><button ecmd=\"remove\">移除</button></div>")),
        Dialog.extend.edit_button.insertAfter(_J82);
    },
    'show': function(_t1033) {
        this.init(_t1033),
        !this.footer_buttons && (this.footer_buttons = $("<div class=\"obj-money\"><span for=\"import\" class=\"footer-item\">导入</span><span for=\"export\" class=\"footer-item\">导出</span><span for=\"add\" class=\"footer-item\">添加扩展</span></div>")),
        Dialog.footerElement.append(this.footer_buttons);
    },
    'command': function(_t1035) {
        const _t1037 = this["cmd_" + _t1035];
        if (_t1037)
            _t1037.call(this);
    },
    'cmd_import': function() {
        if (!this.fileinput) {
            let _J83 = $("<input type=\"file\" style=\"display:none\"  accept=\".json\" />")[0];
            document.body.appendChild(_J83),
            this.fileinput = _J83,
            _J83.addEventListener("change", function(_t1039) {
                const _t1041 = _t1039.target.files[0];
                if (!_t1041)
                    return ReceiveMessage("<red>未选择扩展文件。</red>");
                const _t1042 = _t1041.name.split('.').pop().toLowerCase()
                  , _a94 = ["application/json", 'text/json', "text/plain"];
                if (_t1042 !== "json" && !_a94.includes(_t1041.type))
                    return _t1039.target.value = '',
                    ReceiveMessage("<red>请选择有效的JSON文件！</red>");
                const _t1043 = new FileReader();
                _t1043.onload = function(_t1044) {
                    var _t1045 = _t1040;
                    try {
                        const _t1046 = JSON[_t1045(2401)](_t1044.target[_t1045(1891)]);
                        Dialog.extend[_t1045(354)] = _t1046[_t1045(2269)],
                        Dialog[_t1045(981)].refresh_list(),
                        Dialog[_t1045(981)].save_extend(),
                        ReceiveMessage("<cyn>扩展文件加载成功。</cyn>");
                    } catch (_t1047) {
                        console[_t1045(1453)]('JSON解析错误：', _t1047),
                        ReceiveMessage('<red>扩展文件加' + _t1045(1681));
                    }
                }
                ,
                _t1043.onerror = function() {
                    var _t1048 = _t1040;
                    console[_t1048(1453)](_t1048(856), _t1043[_t1048(1453)]),
                    ReceiveMessage(_t1048(1135) + _t1048(1230));
                }
                ,
                _t1043.readAsText(_t1041, "utf-8");
            });
        }
        this.fileinput.click();
    },
    'cmd_export': function() {
        try {
            let _o8 = {
                'id': Process.player,
                'version': "0.1",
                'items': Dialog.extend.setting
            };
            const _t1050 = JSON.stringify(_o8, null, 2);
            if (window.android && typeof window.android.saveJsonFile === "function") {
                window.android.saveJsonFile("武神扩展.json", _t1050);
                ReceiveMessage("<cyn>扩展导出为本地文件【武神扩展.json】。</cyn>");
            }
            else {
                const _t1051 = new Blob([_t1050],{
                    'type': "application/json;charset=utf-8"
                })
                  , _t1052 = URL.createObjectURL(_t1051)
                  , _t1053 = document.createElement('a');
                _t1053.href = _t1052;
                _t1053.style.display = "none ";
                _t1053.download = "武神扩展.json";
                document.body.appendChild(_t1053);
                _t1053.click();
                document.body.removeChild(_t1053);
                URL.revokeObjectURL(_t1052);
                ReceiveMessage("<cyn>扩展导出为本地文件【武神扩展.json】。</cyn>");
            }
        } catch (_t1054) {
            console.error("保存JSON文件失败：", _t1054);
            alert("文件保存失败，请重试！");
        }
    },
    'hide': function() {
        this.is_record && this.stop_record();
        if (this.list_elem.is(".hide"))
            return this.list_elem.removeClass("hide"),
            this.edit_elem.addClass('hide'),
            false;
        this.footer_buttons.remove();
    },
    'close': function() {},
    'default_extend': [{
        'name': "<red>全部击杀</red>",
        'type': 'button',
        'for': "action",
        'content': "kill @npc"
    }, {
        'name': "<gre>全部拾取</gre>",
        'type': "button",
        'for': 'action',
        'content': "get all from @item(尸体)"
    }, {
        'name': "<gre>返回武庙</gre>",
        'type': "button",
        'for': "map",
        'paras': "name(扬州)",
        'content': "jh fam 0 start;go north;go north;go west"
    }, {
        'name': '练习到指定等级',
        'type': "button",
        'for': 'skill',
        'content': "lianxi @id @input"
    }, {
        'name': '学习到指定等级',
        'type': "button",
        'for': 'mskill',
        'content': "xue @input @id from @master"
    }],
    'init_extend': function() {
        if (!this.setting)
            this.setting = storageUtil.getItem("extends") ?? this.default_extend;
        this.init_extend_group();
    },
    'init_extend_group': function() {
        this.groups = {};
        for (let _t1058 of this.setting) {
            this.init_extend_item(_t1058);
        }
    },
    'save_extend': function() {
        storageUtil.setItem("extends", this.setting);
        this.init_extend_group();
        Combat.refActions();
    },
    'init_extend_item': function(_t1060) {
        let _t1062 = this.groups[_t1060.for];
        if (!_t1062)
            _t1062 = this.groups[_t1060.for] = [];
        let _t1063 = _t1060.content;
        if (_t1060.on === true) {
            _t1060.on = {};
            _t1060.on[Process.player] = 1;
        }
        if (!_t1063 || !_t1060.on || !_t1060.on[Process.player])
            return;
        if (_t1063[0] !== '#')
            _t1063 = '#' + _t1063;
        _t1062.push({
            'name': _t1060.name,
            'extend': true,
            'check': this.regex[_t1060.for] ? this.match(_t1060.paras) : this.condtion(_t1060.paras),
            'cmd': _t1063
        });
    },
    'match': function(_t1064) {
        try {
            if (!_t1064)
                return null;
            return this.express.match.bind(this, new RegExp(_t1064));
        } catch (_t1066) {
            console.error(_t1066);
            return null;
        }
    },
    'exp_reg': /(\w+)\((>=|<=|!=|>|<)?(.+?)\)/g,
    'condtion': function(_t1067) {
        if (!_t1067)
            return null;
        let _t1069 = null
          , _a95 = [];
        while (_t1069 = this.exp_reg.exec(_t1067)) {
            let _t1070 = _t1069[1]
              , _t1071 = _t1069[2]
              , _t1072 = _t1069[3];
            if (!_t1070 || !_t1072)
                return null;
            if (_t1071) {
                let _t1073 = this.express[_t1071];
                if (!_t1073)
                    return null;
                _a95.push(_t1073.bind(this, _t1070, _t1072));
            } else {
                if (_t1072[0] === '/' && _t1072[_t1072.length - 1] === '/')
                    _a95.push(this.express.match_prop.bind(this, _t1070, new RegExp(_t1072.substring(1, _t1072.length - 1))));
                else
                    _a95.push(this.express.def.bind(this, _t1070, _t1072));
            }
        }
        return _a95.length > 0 ? _a95 : null;
    },
    'express': {
        '>=': function(_t1074, _t1075, _t1076) {
            return _t1076[_t1074] >= parseInt(_t1075);
        },
        '>': function(_t1077, _t1078, _t1079) {
            return _t1079[_t1077] > parseInt(_t1078);
        },
        '<': function(_t1080, _t1081, _t1082) {
            return _t1082[_t1080] < parseInt(_t1081);
        },
        '<=': function(_t1083, _t1084, _t1085) {
            return _t1085[_t1083] <= parseInt(_t1084);
        },
        '=': function(_t1086, _t1087, _t1088) {
            return _t1088[_t1086] = parseInt(_t1087);
        },
        '!=': function(_t1089, _t1090, _t1091) {
            return _t1091[_t1089] != parseInt(_t1090);
        },
        'match': function(_t1092, _t1093) {
            let _t1095 = _t1092.exec(_t1093);
            if (!_t1095)
                return false;
            return SCRIPT.lAST_MATCHES = _t1095,
            true;
        },
        'match_prop': function(_t1096, _t1097, _t1098) {
            let _t1099 = _t1098[_t1096];
            if (!_t1099 || !_t1097)
                return false;
            return _t1097.test(_t1099);
        },
        'def': function(_t1100, _t1101, _t1102) {
            let _t1104 = _t1102[_t1100];
            if (typeof _t1104 === "number")
                return _t1104 === parseInt(_t1101);
            else {
                if (typeof _t1104 === "boolean")
                    return _t1104 && _t1104.toString() === _t1101;
            }
            return _t1104 && _t1104.indexOf(_t1101) > -1;
        }
    },
    'query': function(_t1105, _t1106) {
        let _a96 = [];
        this.append(_a96, _t1105, _t1106);
        return _a96;
    },
    'append': function(_t1108, _t1109, _t1110) {
        let _t1112 = this.groups[_t1109];
        if (!_t1112)
            return;
        for (let _t1113 of _t1112) {
            this.check_para(_t1113, _t1110) && _t1108.push(_t1113);
        }
    },
    'message_filter': function(_t1114) {},
    'data_filter': function() {},
    'trigger': function(_t1115) {
        if (!this.groups)
            return;
        let _t1117 = this.groups.message;
        if (!_t1117)
            return;
        for (let _t1118 of _t1117) {
            if (!_t1118.check)
                continue;
            _t1118.check(_t1115) && SCRIPT.run(_t1118.cmd);
        }
    },
    'process': function(_t1119) {
        if (!this.groups)
            return;
        let _t1121 = this.groups.data;
        if (!_t1121)
            return;
        for (let _t1122 of _t1121) {
            if (this.check_para(_t1122, _t1119)) {
                SCRIPT.LAST_DATA = _t1119;
                SCRIPT.run(_t1122.cmd);
            }
        }
    },
    'check_para': function(_t1123, _t1124) {
        if (!_t1123.check)
            return true;
        for (let _fn9 of _t1123.check) {
            if (!_fn9(_t1124))
                return false;
        }
        return true;
    },
    'onButtonClick': function() {
        let _J84 = $(this).attr('ecmd').split('_')
          , _t1127 = _J84[0];
        _J84[0] = $(this);
        let _t1128 = Dialog.extend["cmd_" + _t1127];
        _t1128 && _t1128.apply(Dialog.extend, _J84);
    },
    'cmd_add': function() {
        this.edit_elem.removeClass('hide');
        this.list_elem.addClass('hide');
        this.edit_elem.attr("sid", '-1');
        let _t1130 = this.edit_elem.find("input, textarea");
        for (let _t1131 of _t1130) {
            $(_t1131).val('');
        }
    },
    'cmd_up': function() {
        this.cmd_move(-1);
    },
    'cmd_down': function() {
        this.cmd_move(1);
    },
    'cmd_move': function(_t1133) {
        let _t1135 = this.selected_item;
        if (!_t1135)
            return;
        let _t1136 = this.setting.indexOf(_t1135)
          , _t1137 = this.setting.indexOf(_t1135) + _t1133;
        if (_t1137 < 0 || _t1137 >= this.setting.length)
            return;
        this.setting.splice(_t1136, 1);
        this.setting.splice(_t1137, 0, _t1135);
        this.refresh_list();
        this.save_extend();
    },
    'cmd_edit': function() {
        let _t1139 = this.selected_item;
        if (!_t1139)
            return;
        this.edit_elem.removeClass("hide");
        this.list_elem.addClass("hide");
        this.edit_elem.attr("sid", this.setting.indexOf(_t1139));
        let _t1140 = this.edit_elem.find("input, textarea, select");
        for (let _t1141 of _t1140) {
            let _J85 = $(_t1141).val()
              , _t1142 = _t1139[_t1141.getAttribute("prop")];
            if (_t1142 !== _J85) {
                $(_t1141).val(_t1142).change();

            }
        }
    },
    'cmd_save': function() {
        let _n138 = parseInt(this.edit_elem.attr("sid"))
          , _t1144 = this.edit_elem.find("input, textarea, select")
          , _o9 = {};
        for (let _t1145 of _t1144) {
            _o9[_t1145.getAttribute('prop')] = _t1145.value;
        }
        if (!_o9.name)
            return this.show_error("name");
        if (!_o9.type)
            return this.show_error("type");
        if (!_o9.content)
            return this.show_error("content");
        if (_o9.paras) {
            Dialog.extend.regex[_o9.for] ? _o9.check = this.match(_o9.paras) : _o9.check = this.condtion(_o9.paras);
            if (!_o9.check)
                return this.show_error("paras");
        }
        this.hide();
        $(this.create_item(_o9, this.setting.length)).appendTo(this.list_elem);
        if (_n138 < 0) {
            this.setting.push(_o9);
        } else {
            _o9.on = this.setting[_n138].on;
            this.setting[_n138] = _o9;
            this.refresh_list();
        }
        this.save_extend();
    },
    'cmd_remove': function() {
        let _t1147 = this.selected_item;
        if (!_t1147)
            return;
        this.setting.Remove(_t1147),
        this.refresh_list(),
        this.save_extend();
    },
    'show_error': function(_t1148) {
        let _t1150 = this.element.find("[prop=\"" + _t1148 + '\x22]').parent();
        _t1150.addClass("error-shake");
        setTimeout( () => {
            _t1150.removeClass("error-shake");
        }
        , 1500);
    },
    'cmd_show': function(_t1152, _t1153) {
        let _t1155 = SCRIPT.helper[_t1153];
        if (!_t1155)
            return;
        let _a97 = [];
        for (let _n139 = 0; _n139 < _t1155.length; _n139++) {
            _a97.push('<li>', _t1155[_n139], "</li>");
        }
        let _t1156 = _t1152.parent();
        _t1156.html(_a97.join(''));
        _t1156.next().html('返回').attr("ecmd", "return");
    },
    'cmd_return': function(_t1157) {
        _t1157.html('保存').attr("ecmd", "save").prev().html(this.helper);
    }
},
Dialog.friend = {
    'show': function() {
        if (!this.data)
            return SendCommand('friend');
    },
    'onData': function(_t1159) {}
},
Dialog.pay = {
    'createElement': function() {},
    'show': function() {
        this.isShow = true;
        this.element = this.createElement();
        this.element.appendTo(Dialog.contentElement);
    },
    'close': function() {
        this.element.remove();
        this.isShow = false;
    }
};
const SCRIPT = {
    'is_running': false,
    'run': async function(_t1162) {
        this.is_running = true;
        try {
            let _t1164 = _t1162.split(';');
            for (let _t1165 of _t1164) {
                await this.run_one(_t1165);
            }
        } catch (_t1166) {
            console.log("扩展执行失败：", _t1166);
        }
        this.is_running = false;
    },
    'var_reg': /^@(\w+)(?:\(([^)]*)\))?$/,
    'run_one': async function(_t1167) {
        let _t1169 = _t1167.split('\x20')
          , _t1170 = _t1169[0]
          , _fn10 = this.actions.def;
        if (_t1170[0] === '#') {
            _t1170 = _t1170.substring(1);
            _fn10 = this.actions[_t1170] ?? this.actions.def;
        }
        let _a98 = [[]]
          , _t1171 = null;
        for (let _n140 = 1; _n140 < _t1169.length; _n140++) {
            if (!_a98.length)
                break;
            _t1171 = _t1169[_n140];
            _t1171[0] === '@' ? await this.push_paras(_a98, _t1171) : _a98.map(_t1172 => _t1172.push(_t1171));
        }
        for (let _t1173 of _a98) {
            await _fn10(_t1173, _t1170);
        }
    },
    'push_paras': async function(_t1174, _t1175) {
        const _t1177 = _t1175.match(this.var_reg);
        if (!_t1177)
            throw new Error("<cyn>错误的参数格式" + _t1175 + "</cyn>");
        const _t1178 = _t1177[1]
          , _t1179 = _t1177[2] ? _t1177[2].split(',').map(_t1180 => _t1180.trim()) : [];
        let _fn11 = this.vars[_t1178];
        if (!_fn11)
            throw new Error('<cyn>无效参数' + _t1175 + "</cyn>");
        let _t1181 = await _fn11(..._t1179);
        if (!_t1181)
            return _t1174.length = 0;
        if (!Array.isArray(_t1181))
            return _t1174.map(_t1182 => _t1182.push(_t1181));
        if (!_t1181.length)
            return _t1174.length = 0;
        let _t1183 = _t1174.length;
        for (let _n141 = 1; _n141 < _t1181.length; _n141++) {
            for (let _n142 = 0; _n142 < _t1183; _n142++) {
                _t1174.push([..._t1174[_n142], _t1181[_n141]]);
            }
        }
        for (let _n143 = 0; _n143 < _t1183; _n143++) {
            _t1174[_n143].push(_t1181[0]);
        }
    },
    'actions': {
        'def': function(_t1184, _t1185) {
            if (_t1184.length)
                SendCommand(_t1185 + '\x20' + _t1184.join('\x20'));
            else
                SendCommand(_t1185);
        },
        'wait': function(_t1187) {
            return Util.Sleep(parseInt(_t1187[0]));
        },
        'action': async function(_t1189) {
            let _n144 = parseInt(_t1189[0]);
            if (!(_n144 >= 0 && _n144 < 10))
                return;
            let _J86 = $(".room-commands").children().eq(_n144).attr('cmd');
            if (_J86)
                SCRIPT.run(_J86);
        },
        'pfm': function(_t1191) {
            let _n145 = parseInt(_t1191[0]);
            if (!(_n145 >= 0 && _n145 < 10))
                return SendCommand("perform " + _t1191[0]);
            let _J87 = $(".combat-commands").children().eq(_n145).attr('pid');
            if (_J87)
                SCRIPT.run("perform " + _J87);
        },
        'menu': function(_t1193) {
            let _t1194 = _t1193[0];
            if (_t1194)
                HandlerMenuCommand(_t1194);
        },
        'msg': function(_t1195) {
            _t1195.length > 0 && ReceiveMessage(_t1195.join(''));
        }
    },
    'vars': {
        'me': function() {
            return Process.player;
        },
        'dir': function(_t1198) {
            let _t1200 = MAP_DIR_EXITS[_t1198];
            if (!_t1200)
                return;
            for (let _t1201 of _t1200) {
                if (Process.room_exits[_t1201])
                    return _t1201;
            }
        },
        'npc': function(..._t1202) {
            let _t1204 = Process.cur_room
              , _a99 = [];
            for (let _t1205 of _t1204.items) {
                if (!_t1205)
                    continue;
                if (_t1205.hp > 0 && !_t1205.p) {
                    if (!_t1202 || !_t1202.length)
                        _a99.push(_t1205.id);
                    else
                        for (let _t1206 of _t1202) {
                            if (_t1205.name.indexOf(_t1206) > -1) {
                                _a99.push(_t1205.id);
                                break;
                            }
                        }
                }
            }
            return _a99;
        },
        'item': function(..._t1207) {
            let _t1209 = Process.cur_room
              , _a100 = [];
            for (let _t1210 of _t1209.items) {
                if (!_t1210)
                    continue;
                if (!_t1207 || !_t1207.length)
                    _a100.push(_t1210.id);
                else
                    for (let _t1211 of _t1207) {
                        if (_t1210.name.indexOf(_t1211) > -1) {
                            _a100.push(_t1210.id);
                            break;
                        }
                    }
            }
            return _a100;
        },
        'id': function() {
            let _t1213 = SCRIPT.LAST_OBJ;
            if (_t1213)
                return _t1213.id;
            return '';
        },
        'obj': function(_t1214) {
            let _t1216 = SCRIPT.LAST_OBJ;
            if (!_t1214 || !_t1216)
                return;
            return _t1216[_t1214];
        },
        'pack': function(..._t1217) {
            let _t1219 = Dialog.pack.isShow ? Dialog.pack.items : Dialog.pack2.items;
            if (!_t1219)
                return;
            let _a101 = [];
            for (let _t1220 of _t1219) {
                for (let _t1221 of _t1217) {
                    if (_t1220.name.indexOf(_t1221) > -1) {
                        _a101.push(_t1220.id);
                        break;
                    }
                }
            }
            return _a101;
        },
        'goods': function(..._t1222) {
            let _t1224 = Dialog.list.selllist;
            if (!_t1224)
                return;
            let _a102 = [];
            for (let _t1225 of _t1224) {
                for (let _t1226 of _t1222) {
                    if (_t1225.name.indexOf(_t1226) > -1) {
                        _a102.push(_t1225.id);
                        break;
                    }
                }
            }
            return _a102;
        },
        'input': function() {
            const _o10 = {
                'btn_text': '确定',
                'min': 0,
                'max': 0
            };
            for (let _n146 = 0; _n146 < arguments.length; _n146++) {
                let _t1228 = arguments[_n146];
                if (typeof _t1228 === 'string')
                    _o10.btn_text = _t1228;
                else
                    _o10.max > 0 ? _o10.min = _t1228 : _o10.max = _t1228;
            }
            _o10.content = Confirm.get_countelement(_o10.min || 1, _o10.max || 9999);
            return new Promise( (_t1229, _t1230) => {
                _o10.onOK = _t1229;
                _o10.onCancle = _t1230;
                Confirm.Show(_o10);
            }
            );
        },
        'mat': function(_t1232) {
            let _t1234 = SCRIPT.lAST_MATCHES;
            if (!_t1234)
                return;
            return _t1234[_t1232];
        },
        'data': function(_t1235) {
            if (!_t1235 || !SCRIPT.LAST_DATA)
                return;
            return SCRIPT.LAST_DATA[_t1235];
        },
        'master': function() {
            return Dialog.master.master;
        },
        'dc': function() {
            if (Dialog.master.isShow)
                return "dc " + Dialog.master.master;
            return Dialog.pack2.command_before;
        }
    },
    'helper': {
        'actions': ["#wait 100：等待100毫秒执行", "#msg 你好：输出提示消息", "#menu score，打开对话框", "#action (0-9)，执行动作栏对应位置的操作", "#pfm (0-9)，释放对应位置的绝招", '持续增加'],
        'vars': ["@dir(left)：获取当前房间左边方向的出口命令", "@npc(小二)：获取当前房间的npc ID，无参数返回所有npc", "@item：获取当前房间所有物品ID，参数匹配名称", "@id：当前正在操作的道具，技能，NPC等的ID", "持续增加"],
        'paras': ["参数用来判断所在位置的数据属性，比如地图的参数，有name,type,index", "name(扬州)：名称里包含扬州二字的地图", "index(>3)：索引大于3的地图"]
    }
}
  , MAP_DIR_EXITS = {
    'left': ['west', "westup", "westdown"],
    'right': ['east', "eastup", "eastdown"],
    'up': ['north', "northup", 'northdown', 'up'],
    'down': ["south", 'southup', "southdown", "down"],
    'leftup': ['northwest'],
    'leftdown': ['southwest'],
    'rightup': ['northeast'],
    'rightdown': ['southeast']
};
var Setting = {
    'keep_msg': 0,
    'show_hpnum': 0,
    'show_hp': 0,
    'item_autoheight': 0,
    'item_firstme': 0,
    'hide_roomdesc': 0,
    'exits_dir': 0,
    'show_sa': 0,
    'show_command': 0,
    'fontsize': '0.875rem',
    'font': '',
    'no_spmsg': 0,
    'fontcolor': '#008000',
    'backcolor': 'black',
    'auto_showcombat': 0,
    'auto_sortitem': 0,
    'auto_hideroom': 0,
    'show_roomitem': 0,
    'fullscreen': 0,
    'channel_chat': 1,
    'channel_tm': 1,
    'channel_fam': 1,
    'channel_es': 1,
    'ban_pk': 0,
    'off_plist': 0,
    'combat_wrap': 0,
    'combat_size': "1em",
    'dialog_size': "1em",
    'menu_size': "1em",
    'action_wrap': 0,
    'off_hp': 0,
    'show_damage': 0,
    'no_master': 0,
    'no_team': 0,
    'no_load': true,
    'load': function(_t1239) {
        Dialog.keys.init_key();
        Dialog.extend.init_extend();
        if (!_t1239)
            return;
        for (var _t1241 in _t1239) {
            if (_t1241 === "fullscreen")
                continue;
            this.set_prop(_t1241, _t1239[_t1241]);
            this[_t1241] = _t1239[_t1241];
        }
    },
    'set_prop': function(_t1242, _t1243) {
        switch (_t1242) {
        case "fontsize":
            $(".container").css("font-size", _t1243);
            $(".dialog-confirm").css("font-size", _t1243);
            break;
        case "font":
            if (_t1243 === "none")
                _t1243 = '';
            $(".container").css("font-family", _t1243);
            break;
        case "combat_size":
            $(".content-bottom").css('font-size', _t1243);
            break;
        case "dialog_size":
            $('.dialog').css("font-size", _t1243);
            break;
        case "show_sa":
            Combat.refActions();
            break;
        case 'menu_size':
            $(".bottom-bar").css('font-size', _t1243);
            break;
        case "fontcolor":
            $(document.body).css('color', _t1243);
            break;
        case 'backcolor':
            $(document.body).css("background-color", _t1243);
            break;
        case "hide_roomdesc":
            if (_t1243)
                $(".room_desc").hide();
            else
                $(".room_desc").show();
            break;
        case "exits_dir":
            Process.exits();
            break;
        case 'off_hp':
            _t1243 ? $(".item-status").hide() : $(".item-status").show();
            break;
        case "combat_wrap":
            _t1243 ? $(".combat-commands").addClass("combat-wrap") : $(".combat-commands").removeClass("combat-wrap");
            break;
        case "action_wrap":
            _t1243 ? $(".room-commands").addClass("combat-wrap") : $(".room-commands").removeClass("combat-wrap");
            break;
        case "item_autoheight":
            if (_t1243)
                $(".room_items").removeAttr("style");
            else
                $(".room_items").attr("style", "max-height: 8rem; overflow-y: auto;");
            break;
        case "item_firstme":
            if (_t1243 === 1) {
                var _J88 = $(".room_items>.room-item[itemid='" + Process.player + '\x27]');
                $(".room_items").prepend(_J88);
            }
            break;
        case 'show_hp':
            if (!Combat.IsShow) {
                if (_t1243 === 1)
                    $(".room-item>.item-status").show();
                else
                    $(".room-item>.item-status").hide();
            }
            break;
        case 'show_hpnum':
            Process.cur_room && Process.items(Process.cur_room);
            break;
        case "show_damage":
            $(".item-damage").remove();
            break;
        case 'fullscreen':
            _t1243 ? Setting.launchFullScreen() : Setting.exitFullscreen();
            break;
        case "show_command":
            Process.itemsElement.find(".item-commands").remove();
            break;
        case "no_spmsg":
            _t1243 ? Process.ChannelElement.hide() : Process.ChannelElement.show();
            break;
        }
    },
    'save': function(_t1245, _t1246) {
        this[_t1245] = _t1246;
        this.set_prop(_t1245, _t1246);
        SendCommand('setting\x20' + _t1245 + '\x20' + _t1246);
    },
    'launchFullScreen': function(_t1248) {
        _t1248 = _t1248 || document.documentElement;
        if (_t1248.requestFullscreen)
            _t1248.requestFullscreen();
        else {
            if (_t1248.mozRequestFullScreen)
                _t1248.mozRequestFullScreen();
            else {
                if (_t1248.webkitRequestFullscreen)
                    _t1248.webkitRequestFullscreen();
                else
                    _t1248.msRequestFullscreen && _t1248.msRequestFullscreen();
            }
        }
    },
    'exitFullscreen': function() {
        if (document.exitFullscreen)
            document.exitFullscreen();
        else {
            if (document.mozCancelFullScreen)
                document.mozCancelFullScreen();
            else
                document.webkitExitFullscreen && document.webkitExitFullscreen();
        }
    }
}
  , _name0 = "万俟司马上官欧阳夏侯诸葛闻人东方赫连皇甫尉迟公羊澹台公冶宗政濮阳淳于单于太叔申屠公孙仲孙轩辕令狐锺离宇文长孙慕容鲜于闾丘司徒司空丌官司寇子车颛孙端木巫马公西乐正公良拓拔夹谷谷梁梁丘左丘东门西门"
  , _name1 = "赵钱孙李周吴郑王冯陈楮卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎"
  , _name2 = "世舜丞主产仁仇仓仕仞任伋众伸佐佺侃侪促俟信俣修倝倡倧偿储僖僧僳儒俊伟列则刚创前剑助劭势勘参叔吏嗣士壮孺守宽宾宋宗宙宣实宰尊峙峻崇崈川州巡帅庚战才承拯操斋昌晁暠曹曾珺玮珹琒琛琩琮琸瑎玚璟璥瑜生畴矗矢石磊砂碫示社祖祚祥禅稹穆竣竦综缜绪舱舷船蚩襦轼辑轩子杰榜碧葆莱蒲天乐东钢铎铖铠铸铿锋镇键镰馗旭骏骢骥驹驾骄诚诤赐慕端征坚建弓强彦御悍擎攀旷昂晷健冀凯劻啸柴木林森朴骞寒函高魁魏鲛鲲鹰丕乒候冕勰备宪宾密封山峰弼彪彭旁日明昪昴胜汉涵汗浩涛淏清澜浦澉澎澔瀚瀛灏沧虚豪豹辅辈迈邶合部阔雄霆震韩俯颁颇频颔风飒飙飚马亮仑仝代儋利力劼勒卓哲喆展帝弛弢弩彰征律德志忠思振挺掣旲旻昊昮晋晟晸朕朗段殿泰滕炅炜煜煊炎选玄勇君稼黎利贤谊金鑫辉墨欧有友闻问"
  , _name3 = "筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜姬舒影荔枝思丽秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊勤珍贞莉兰凤洁梅琳素云莲真环雪荣妹霞香月莺媛艳瑞凡佳嘉琼桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希宁欣飘育滢馥";
function create_name(family, sex) {
    sex = sex || parseInt(Math.random() * 2) + 1;
    var _a103 = [];
    if (sex === 2) {
        var _n147 = parseInt(Math.random() * _name0.length);
        if (_n147 % 2 === 1)
            _n147 -= 1;
        _a103.push(_name0[_n147++]);
        _a103.push(_name0[_n147]);
    } else
        _a103.push(_name1[parseInt(Math.random() * _name1.length)]);
    if (family === 0) {
        _a103.push(_name2[parseInt(Math.random() * _name2.length)]);
    } else {
        _a103.push(_name3[parseInt(Math.random() * _name3.length)]);
    }
    if (parseInt(Math.random() * 4) > 1) {
        if (family === 0) {
            _a103.push(_name2[parseInt(Math.random() * _name2.length)]);
        } else {
            _a103.push(_name3[parseInt(Math.random() * _name3.length)]);
        }
    }
    return _a103.join('');
}
function create_id() {
    var _t1253 = "abcdefghijklmnopqrstuvwxyz"
      , _t1254 = '123456789'
      , _a104 = []
      , _n148 = parseInt(Math.random() * 3) + 3;
    for (var _n149 = 0; _n149 < _n148; _n149++) {
        _n149 < 3 ? _a104.push(_t1253[parseInt(Math.random() * _t1253.length)]) : _a104.push(_t1254[parseInt(Math.random() * _t1254.length)]);
    }
    return _a104.join('');
}
function create_prop() {
    var _n150 = 20
      , _a105 = [];
    for (var _n151 = 0; _n151 < 4; _n151++) {
        var _n152 = parseInt(Math.random() * 15 + 1);
        if (_n150 >= _n152) {
            if (_n151 === 3) {
                _n152 = _n150;
            } else {
                _n150 -= _n152;
            }
            _a105[_n151] = _n152;
        } else {
            _a105[_n151] = _n150;
            _n150 = 0;
        }
    }
    var _o11 = {};
    _o11.str = _a105[0] + 15;
    _o11.con = _a105[1] + 15;
    _o11.dex = _a105[2] + 15;
    _o11.int = _a105[3] + 15;
    return _o11;
}
var Confirm = {
    'DEFAULT': {
        'onOK': function() {},
        'footer': true,
        'btn_text': '确认'
    },
    'Show': function(_t1256) {
        this.Init();
        this.Parameter = Object.assign({}, this.DEFAULT, _t1256);
        this.content.empty().append(this.Parameter.content);
        this.element.show();
        if (this.Parameter.footer) {
            this.btn.show();
            this.btn.find('.btn-text').html(this.Parameter.btn_text);
        } else {
            this.btn.hide();
        }
        this.isShow = true;
    },
    'Close': function(_t1258) {
        if (!Confirm.isShow)
            return;
        Confirm.element.hide();
        Confirm.isShow = false;
        if (!_t1258 && this.Parameter.onCancle)
            this.Parameter.onCancle();
    },
    'Init': function() {
        if (this._init)
            return;
        this.element = $(".dialog-confirm");
        this.content = this.element.find(".dialog-content");
        this.btn = this.element.find(".dialog-btn");
        this.element.on("click", ".btn-ok", function(_t1261) {
            if (Confirm.Parameter.content === Confirm.count_element) {
                var _t1263 = Confirm.count_element.find("input")
                  , _n153 = parseInt(_t1263.val());
                if (_n153.toString() === 'NaN')
                    _n153 = 0;
                if (_n153 > Confirm.max_count)
                    _n153 = Confirm.max_count;
                Confirm.Parameter.onOK(_n153);
            } else
                Confirm.Parameter.onOK();
            return Confirm.Close(true),
            false;
        });
        this.element.on('click', ".btn", function(_t1264) {
            var _t1266 = Confirm.max_count || 1000
              , _J89 = $(_t1264.target)
              , _n154 = parseInt(_J89.attr('ac'))
              , _t1267 = _J89.parent().find("input")
              , _n155 = parseInt(_t1267.val());
            if (_n155.toString() == "NaN")
                _n155 = 0;
            if (_n154 === -10)
                _n155 -= 10;
            else {
                if (_n154 === 10) {
                    if (_n155 === 1)
                        _n155 = 0;
                    _n155 += 10;
                } else
                    _n154 === 1 ? _n155 = _t1266 : _n155 = 1;
            }
            if (_n155 < 1)
                _n155 = 1;
            else {
                if (_n155 > _t1266)
                    _n155 = _t1266;
            }
            return _t1267.val(_n155),
            false;
        });
        this._init = true;
    },
    'Process': function(_t1268) {
        var _t1270 = _t1268[1]
          , _t1271 = '';
        _t1270 === 'dc' && (_t1270 = _t1268[3],
        _t1271 = _t1268.splice(1, 2),
        _t1271 = _t1271[0] + '\x20' + _t1271[1] + '\x20');
        var _t1272 = this["Show_" + _t1270];
        _t1272 && _t1272.call(this, _t1268, _t1271);
    },
    'get_countelement': function(_t1273, _t1274) {
        !this.count_element && (this.count_element = $("<div  class=\"confirm-count\"><span class=\"btn\" ac=\"0\">最少</span><span ac=\"-10\" class=\"btn\">减10</span><input type=\"text\" value=\"1\" /><span class=\"btn\"  ac=\"10\" >加10</span><span class=\"btn\" ac=\"1\" >最多</span></div>"));
        if (_t1273)
            this.count_element.find("input").val(_t1273);
        else
            this.count_element.find("input").val(1);
        if (_t1274)
            _t1274 = parseInt(_t1274);
        return this.max_count = _t1274 || 1000,
        this.count_element;
    },
    'Show_shop': function(_t1276, _t1277) {
        var _t1279 = _t1276[2];
        if (!_t1279)
            return;
        var _t1280 = Dialog.shop.get_item(_t1279);
        if (!_t1280)
            return;
        let _t1281 = _t1276[3] ? parseInt(_t1276[3]) : -1;
        this.Show({
            'content': this.get_countelement(1, _t1281 === -1 ? 9999 : _t1281),
            'btn_text': '购买' + _t1280.name,
            'onOK': function(_t1282) {
                if (!(_t1282 > 0))
                    return;
                SendCommand('shop\x20' + _t1279 + '\x20' + _t1282);
            }
        });
    },
    'Show_buy': function(_t1283) {
        var _t1285 = _t1283[3];
        if (!_t1285)
            return;
        var _n156 = parseInt(_t1283[2]);
        this.Show({
            'content': this.get_countelement(1, _n156 === -1 ? 9999 : _n156),
            'btn_text': '购买',
            'onOK': function(_t1286) {
                if (!(_t1286 > 0))
                    return;
                SendCommand("buy " + _t1286 + '\x20' + _t1285 + '\x20from\x20' + _t1283[5]);
            }
        });
    },
    'Show_greet': function(_t1287) {
        this.Show({
            'content': this.get_countelement(1, 99),
            'btn_text': '送花',
            'onOK': function(_t1289) {
                if (!(_t1289 > 0))
                    return;
                SendCommand("greet " + _t1289);
            }
        });
    },
    'Show_sell': function(_t1290) {
        var _t1292 = _t1290[3];
        if (!_t1292)
            return;
        this.Show({
            'content': this.get_countelement(_t1290[2], _t1290[2]),
            'btn_text': '卖出',
            'onOK': function(_t1293) {
                if (!(_t1293 > 0))
                    return;
                SendCommand("sell " + _t1293 + '\x20' + _t1292 + '\x20to\x20' + _t1290[5]);
            }
        });
    },
    'Show_store': function(_t1294) {
        var _t1296 = _t1294[3];
        if (!_t1296)
            return;
        if (_t1294[2] === 1)
            return SendCommand((Dialog.list.is_bookshelf ? "sj " : '') + 'store\x20' + _t1296);
        this.Show({
            'content': this.get_countelement(_t1294[2], _t1294[2]),
            'btn_text': '存入',
            'onOK': function(_t1297) {
                if (!(_t1297 > 0))
                    return;
                SendCommand((Dialog.list.is_bookshelf ? "sj " : '') + "store " + _t1297 + '\x20' + _t1296);
            }
        });
    },
    'Show_fenjie': function(_t1299, _t1300) {
        var _t1302 = _t1299[2];
        if (!_t1302)
            return;
        var _t1303 = Dialog.pack.isShow ? Dialog.pack.get_item(_t1302) : Dialog.pack2.get_item(_t1302);
        if (!_t1303)
            return;
        if (_t1303.name.indexOf('★') == -1)
            return SendCommand("fenjie " + _t1302);
        this.Show({
            'content': '是否确认分解' + _t1303.name + '？',
            'btn_text': '确认分解',
            'onOK': function() {
                SendCommand(_t1300 + 'fenjie\x20' + _t1302);
            }
        });
    },
    'Show_qu': function(_t1304) {
        var _t1306 = _t1304[2];
        if (!_t1306)
            return;
        var _t1307 = Dialog.list.find_item(3, _t1306);
        if (!_t1307)
            return;
        if (_t1307.count === 1)
            return SendCommand((Dialog.list.is_bookshelf ? 'sj\x20' : '') + "qu 1 " + _t1306);
        this.Show({
            'content': this.get_countelement(_t1307.count, _t1307.count),
            'btn_text': '取出',
            'onOK': function(_t1308) {
                if (!(_t1308 > 0))
                    return;
                SendCommand((Dialog.list.is_bookshelf ? 'sj\x20' : '') + "qu " + _t1308 + '\x20' + _t1306);
            }
        });
    },
    'Show_drop': function(_t1310, _t1311) {
        var _t1313 = _t1310[3];
        if (!_t1313)
            return;
        var _t1314 = Dialog.pack.isShow ? Dialog.pack.get_item(_t1313) : Dialog.pack2.get_item(_t1313);
        if (!_t1314)
            return;
        this.Show({
            'content': _t1310[2] === 1 ? "是否确认丢掉" + _t1314.name + '？' : this.get_countelement(_t1310[2], _t1310[2]),
            'btn_text': '丢掉',
            'onOK': function(_t1315) {
                if (_t1310[2] === 1)
                    return SendCommand(_t1311 + 'drop\x20' + _t1313);
                if (!(_t1315 > 0))
                    return;
                SendCommand(_t1311 + "drop " + _t1315 + '\x20' + _t1313);
            }
        });
    },
    'Show_give': function(_t1316, _t1317) {
        var _t1319 = _t1316[4];
        if (!_t1319)
            return;
        var _t1320 = Dialog.pack2.get_item(_t1319);
        if (!_t1320)
            return;
        if (_t1320.count === 1)
            return SendCommand(_t1317 + 'give\x20' + Process.player + '\x201\x20' + _t1319);
        this.Show({
            'content': this.get_countelement(_t1320.count, _t1320.count),
            'btn_text': '拿来',
            'onOK': function(_t1321) {
                if (!(_t1321 > 0))
                    return;
                SendCommand(_t1317 + "give " + Process.player + '\x20' + _t1321 + '\x20' + _t1319);
            }
        });
    },
    'Show_trade_add': function(_t1322) {
        if (!_t1322)
            return;
        this.Show({
            'content': this.get_countelement(_t1322.count, _t1322.count),
            'btn_text': '确定',
            'onOK': function(_t1324) {
                if (!(_t1324 > 0))
                    return;
                var _t1326 = Util.Clone(_t1322);
                _t1326.count = _t1324,
                Dialog.trade.add_trade(_t1326);
            }
        });
    },
    'Show_fangqi': function(_t1327, _t1328) {
        var _t1330 = _t1327[2];
        if (!_t1330)
            return;
        var _t1331 = _t1328 ? Dialog.master.skills[_t1330] : Dialog.skills.skills[_t1330];
        if (!_t1331)
            return;
        this.Show({
            'content': "是否确认放弃技能" + _t1331.name + '？',
            'onOK': function() {
                SendCommand(_t1328 + "fangqi " + _t1330);
            }
        });
    },
    'Show_combine': function(_t1332, _t1333) {
        var _t1335 = _t1332[2];
        if (!_t1335)
            return;
        var _t1336 = Dialog.pack.get_item(_t1335);
        if (!_t1336)
            return;
        var _n157 = parseInt(_t1332[3]);
        if (!_n157)
            return;
        var _n158 = parseInt(_t1336.count / _n157);
        if (_n158 === 1)
            return SendCommand("combine " + _t1335);
        this.Show({
            'content': this.get_countelement(_n158),
            'btn_text': '合成',
            'onOK': function(_t1337) {
                if (!(_t1337 > 0))
                    return;
                SendCommand(_t1333 + "combine " + _t1335 + '\x20' + _t1337);
            }
        });
    },
    'Show_pay': function() {
        SendCommand("pay 0 " + (/mobile/i.test(navigator.userAgent) ? 'm' : 'c'));
    }
}
  , Util = {
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
        var _fn27 = new Function("return " + _t1425 + ';');
        this.OnData(_fn27());
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
