// ============================================================
// extension-manager.js —— 扩展脚本引擎 + 确认框 + 外观设置
// ------------------------------------------------------------
//   SCRIPT        扩展脚本引擎：支持 #wait（等待）/ #msg（发消息）/
//                 #action（执行动作）/ #pfm（出招）/ @me/@npc/@item（目标占位符）
//                 等模板命令，用来写简单的"扩展脚本"
//   MAP_DIR_EXITS 方向映射表
//   Setting       页面外观/频道设置（游戏界面颜色、频道开关等）
//   Confirm       通用确认框（商店买入/卖出/分解等操作的二次确认）
// ============================================================
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
            if (!(_n145 >= 0 && _n145 < 12))
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
};

const MAP_DIR_EXITS = {
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
            $(".channel").css("font-size", _t1243);
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
