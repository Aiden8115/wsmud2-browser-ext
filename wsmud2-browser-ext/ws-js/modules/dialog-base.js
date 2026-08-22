// ============================================================
// dialog-base.js —— 对话框基座
// ------------------------------------------------------------
// Dialog 对象是所有游戏对话框（背包/技能/任务/排行…）的"底座"：
//   统一处理弹窗的显示/隐藏、当前打开的是哪个面板（curItem）、
//   数据更新（onData）、内容渲染等公共逻辑。
// 具体的每个面板（背包、技能、设置…）在 dialog-panels.js 里定义。
// ============================================================
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
    },
    };
