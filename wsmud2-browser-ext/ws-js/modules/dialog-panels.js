// ============================================================
// dialog-panels.js —— 全部对话框面板（大文件，4.5K+ 行）
// ------------------------------------------------------------
// 定义了游戏里所有弹窗面板的内容（数据来自服务器，onData 接收渲染，
// 点按钮通过 cmd="..." 回发游戏指令）。面板列表：
//   Dialog.skills   自身技能面板
//   Dialog.master   师父/随从技能
//   Dialog.pack     背包（含整理/存仓）
//   Dialog.pack2    他人背包
//   Dialog.trade    交易
//   Dialog.list     商店/仓库买卖
//   Dialog.shop     商城
//   Dialog.channel  聊天频道
//   Dialog.tasks    任务
//   Dialog.stats    六大排行榜
//   Dialog.events   活动
//   Dialog.pm       拍卖行
//   Dialog.message  站内信（含队伍/关系/帮派子页）
//   Dialog.relation 夫妻/师徒/家人
//   Dialog.party    帮派
//   Dialog.team     队伍
//   Dialog.jh 等    江湖（门派/副本/禁地）
//   Dialog.keys     快捷键设置（默认键位表 default_keys 在 3755 行附近）
//   Dialog.extend   自定义扩展/触发器
//   Dialog.setting  游戏设置
//
// 想改：面板上的按钮文字（整理包裹/存仓库/清理杂物等）、
//   技能等级称号表（skill_levels，约 366 行）、
//   默认快捷键（default_keys，约 3755 行）、
//   频道列表（Dialog.channel.footer，约 1582 行）、
//   预置扩展（default_extend，约 4214 行）→ 在本文件搜索关键词。
// 注意：extend 面板的 cmd_import 处有一小段被混淆的索引调用（原版残留），
//   功能正常但难读，遇到别慌。
// ============================================================
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
        // 【2026-08-18 潜能计算器】跟在"练习"按钮后
        var _qnGrade = _t444.grade || 0;
        var _qnLevel = _t444.level || 0;
        var _qnLimit = _t444.limit || 9999;
        var _qnTarget = Math.min(_qnLevel + 100, _qnLimit);
        var _qnX = [2,2,7,10,12,15,20][_qnGrade] || 2;
        var _qnY = [5,10,15,20,25,30,35][_qnGrade] || 5;
        var _qnInit = (_qnTarget - _qnLevel) * _qnX + _qnY * ((_qnTarget * (_qnTarget - 1) / 2) - (_qnLevel * (_qnLevel - 1) / 2));
        _a30.push('<div class="qianneng-calc" data-skid="' + _t444.id + '" data-grade="' + _qnGrade + '" data-x="' + _qnX + '" data-y="' + _qnY + '" data-limit="' + _qnLimit + '" style="display:block;width:auto;color:#c0c0c0">');
        _a30.push('<div style="display:flex;align-items:center;flex-wrap:wrap">');
        _a30.push('<div style="display:flex;align-items:center;margin:8px"><label style="margin-right:5px">起始等级：<input type="number" class="qn-start" value="' + _qnLevel + '" style="width:60px;padding:4px;border:1px solid;border-radius:3px;background-color:transparent;color:inherit"></label></div>');
        _a30.push('<div style="display:flex;align-items:center;margin:8px"><label style="margin-right:5px">目标等级：<input type="number" class="qn-target" value="' + _qnTarget + '" style="width:60px;padding:4px;border:1px solid;border-radius:3px;background-color:transparent;color:inherit"></label></div>');
        _a30.push('<div style="display:flex;align-items:center;margin:8px 5px 8px auto">需要潜能：<b class="qn-needed" style="font-weight:bold;min-width:4em;text-align:center">' + Math.round(_qnInit) + '</b></div>');
        _a30.push('<div class="item-commands" style="margin:8px 5px"><span class="qn-go" cmd="#lianxi ' + _t444.id + ' ' + _qnTarget + '" style="cursor:pointer;border:1px solid gray;padding:2px 8px;border-radius:4px;color:gray">练习到目标等级</span></div>');
        _a30.push('</div>');
        _a30.push('</div>');
        SCRIPT.LAST_OBJ = _t444;
        let _t447 = Dialog.extend.query('skill', _t444);
        _a30.push('<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px">');
        for (let _t448 of _t447) {
            _a30.push("<span style=\"display:inline-block;border:1px solid gray;color:gray;background-color:black;cursor:pointer;border-radius:4px;padding:0.25em 1em;margin:0.25em 0\" cmd=\"", _t448.cmd, '\x22>', _t448.name, '</span>');
        }
        _a30.push('</div>');
        Dialog.skills.element.find(".item-commands").remove();
        var _qnHtml = $(_a30.join(''));
        _qnHtml.insertAfter(_J55);
        checkScroll(_J55.next());
        // 绑定计算器输入事件
        Dialog.skills._bindCalc(_qnHtml.find('.qianneng-calc'));
    },
    '_bindCalc': function(calcElm) {
        if (!calcElm || !calcElm.length) return;
        calcElm.find('.qn-start, .qn-target').off('input.qn').on('input.qn', function() {
            var calc = $(this).closest('.qianneng-calc');
            var start = parseInt(calc.find('.qn-start').val()) || 0;
            var target = parseInt(calc.find('.qn-target').val()) || 0;
            var x = parseInt(calc.data('x')) || 2;
            var y = parseInt(calc.data('y')) || 5;
            var limit = parseInt(calc.data('limit')) || 9999;
            var skid = calc.data('skid');
            calc.find('.qn-start').css('color', (start < 0 || isNaN(start)) ? '#FF4500' : '#c0c0c0');
            calc.find('.qn-target').css('color', (target < 0 || isNaN(target) || target < start) ? '#FF4500' : '#c0c0c0');
            if (start < 0 || target < 0 || isNaN(start) || isNaN(target) || target < start) {
                calc.find('.qn-needed').text('-').css('color','#505050');
                calc.find('.qn-go').removeAttr('cmd');
                return;
            }
            calc.find('.qn-needed').css('color','#c0c0c0');
            var needed = (target - start) * x + y * ((target * (target - 1) / 2) - (start * (start - 1) / 2));
            calc.find('.qn-needed').text(Math.round(needed));
            calc.find('.qn-go').attr('cmd', '#lianxi ' + skid + ' ' + target);
            if (target > limit) calc.find('.qn-target').css('color', '#FFFF00');
        });
    },
};
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
            // 关键：使用【捕获阶段】的原生监听，直接绑定在稳定的 .dialog-list 容器上。
            // obj-item 上的游戏原生 onclick 会调用 stopPropagation/stopImmediatePropagation
            // 阻止事件冒泡，导致冒泡阶段的委托（on/click）永远收不到点击；而捕获阶段在
            // 事件到达目标之前就会先触发容器上的监听，因此能可靠命中并弹出数量选择框。
            this.element[0].addEventListener('click', this._captureClick, true);
        }
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
    // 捕获阶段分发入口：冒泡被游戏原生 onclick 阻止时也能命中。
    // 根据 .obj-item 所处列表（第一个=左「已选」，最后一个=右「背包」）路由到对应处理。
    '_captureClick': function(ev) {
        var item = $(ev.target).closest('.obj-item');
        if (!item.length)
            return;
        var parent = item.parent();
        // 关键：在捕获阶段立即阻止事件继续传播。
        // 若任其冒泡到 .container/.channel，ContainerCommand() 最后会调用 Confirm.Close()，
        // 把刚 Show() 出来的数量选择确认框瞬间再次隐藏（display:none）。
        // stopImmediatePropagation 同时阻止 .obj-item 上游戏原生 onclick 触发，避免其重置 UI。
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (parent.is('.obj-list:first-child')) {
            Dialog.trade.left_click.call(item[0], ev);
        } else if (parent.is('.obj-list:last-child')) {
            Dialog.trade.right_click.call(item[0], ev);
        }
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
          , _t626 = parseInt(_J64.attr("otype"))
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
        Dialog.title("帮派【" + _t898.name + '】\x20<nor>' + _t898.roles.length + '/' + this.level_roles[_t898.level] + "</nor>");
        var _a81 = [];
        _t898.notice && (_a81.push("<div class='party-notice'>"),
        _a81.push(_t898.notice),
        _a81.push("</div>"));
        _a81.push("<div class='party-roles'>");
        for (var _n126 = 0; _n126 < _t898.roles.length; _n126++) {
            var _t901 = _t898.roles[_n126];
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
    },{
        name: '数据触发器',
        value: 'trigger',
        for: [{
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
                // 【2026-08-15 修复】原实现调用混淆解码函数 _t1040(...)，该函数只在被 rules.json
                // 屏蔽的游戏原版 dist/ws.js 中存在，扩展自带 ws.js 无此函数 → 点击导入直接
                // ReferenceError 失败。这里反混淆为等价普通代码（JSON.parse / result / setting /
                // items / refresh_list / save_extend），行为与原版一致。
                _t1043.onload = function(_t1044) {
                    try {
                        const _t1046 = JSON.parse(_t1044.target.result);
                        Dialog.extend.setting = _t1046.items;
                        Dialog.extend.refresh_list();
                        Dialog.extend.save_extend();
                        ReceiveMessage("<cyn>扩展文件加载成功。</cyn>");
                    } catch (_t1047) {
                        console.error('JSON解析错误：', _t1047);
                        ReceiveMessage('<red>扩展文件加载失败！</red>');
                    }
                }
                ,
                _t1043.onerror = function() {
                    console.error('文件读取失败：', _t1043.error);
                    ReceiveMessage('<red>文件读取失败！</red>');
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
        if (this.list_elem.is(".hide")) {
            // 【2026-08-08 修复】原版这里 return false 会阻断 Dialog.close()，
            // 导致设置对话框永远关不掉、页面像"卡死"一样。
            // 改为：先退出编辑态（恢复列表、隐藏编辑区），但允许对话框正常关闭。
            this.list_elem.removeClass("hide");
            this.edit_elem.addClass('hide');
        }
        this.footer_buttons && this.footer_buttons.remove();
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
