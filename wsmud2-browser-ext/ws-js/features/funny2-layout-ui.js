// funny2-layout-ui.js
// 武神传说 MUD 界面布局 —— UI 元素（辅助函数、快捷按钮、换组/扩展等）
"use strict";

window.__funny2_layout = window.__funny2_layout || {};

(function () {
    var layout = window.__funny2_layout;

    layout.initUI = function () {
        var F = window.__funny2;

        /********************QUICK BTN 主题分组着色********************/
        // 【2026-09-08 和谐化】左侧快捷按钮四行按语义配主题色，flex 等距排布
        GM_addStyle([
            '.left-hotkeys > div { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 6px; justify-content: flex-start; }',
            '.left-hotkeys .span-btn { margin: 0; flex: 0 1 auto; min-width: 0; padding: 4px 10px; font-size: 12px; justify-content: center; box-sizing: border-box; white-space: nowrap; background: transparent; border-color: var(--ws-border); }',
            'hic.span-btn { color: var(--ws-cyan); }',
            'hic.span-btn:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--ws-border-hover); }',
            'hig.span-btn { color: var(--ws-gold); }',
            'hig.span-btn:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--ws-border-hover); }',
            'hiz.span-btn { color: var(--ws-success); }',
            'hiz.span-btn:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--ws-border-hover); }',
            'hio.span-btn { color: var(--ws-danger); }',
            'hio.span-btn:hover { color: #fff; background: rgba(255,255,255,.07); border-color: var(--ws-border-hover); }',
        ].join('\n'));
        var hideLeftRight = function () {
            AddContent($("<div></div>").append(
                $('<span class="span-btn"></span>').append("全部隐藏").click(function () { $(".left").hide(); $(".right").hide(); }),
                $('<span class="span-btn"></span>').append("全部显示").click(function () { $(".left").show(); $(".right").show(); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("隐藏左边栏").click(function () { $(".left").hide(); }),
                $('<span class="span-btn"></span>').append("显示左边栏").click(function () { $(".left").show(); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("隐藏右边栏").click(function () { $(".right").hide(); }),
                $('<span class="span-btn"></span>').append("显示右边栏").click(function () { $(".right").show(); })
            ));
        };
        var clearRightMsg = function () {
            $(".content-message pre").html("");
            // 【2026-09-07 清屏顺带清聊天记录】只清 DOM 不够：切频道时会从 datas 重放，需连按频道缓存一起清
            try {
                if (typeof Dialog !== 'undefined' && Dialog.channel && Array.isArray(Dialog.channel.datas)) {
                    Dialog.channel.datas.length = 0;
                }
                if (typeof Process !== 'undefined' && Process.channel && typeof Process.channel.clear === 'function') {
                    Process.channel.clear();
                }
            } catch (e) { }
        };
        var scpack = [
            "玄晶","红宝石", "绿宝石", "蓝宝石", "黄宝石",
            "鲤鱼", "草鱼", "鲢鱼", "鲮鱼", "鳊鱼", "鲂鱼", "黄金鳉", "黄颡鱼", "太湖银鱼", "虹鳟", "孔雀鱼", "反天刀",
            "银龙鱼", "黑龙鱼", "罗汉鱼", "巨骨舌鱼", "七星刀鱼", "帝王老虎魟",
            "当归", "芦荟", "山楂叶", "柴胡", "金银花", "石楠叶", "茯苓", "沉香", "熟地黄", "九香虫", "络石藤", "冬虫夏草",
            "人参", "何首乌", "凌霄花", "灵芝", "天仙藤", "盘龙参"
        ];

        var takesc = function (sc, is_sell) {
            is_sell = is_sell || 0;
            var sid = sc.id;
            var work = sc.work;
            var workMap = { '挖矿': 'wk', '钓鱼': 'diao', '采药': 'cai' };
            var workAbbr = workMap[work];
            if (F.room.str != "住房-小花园") {
                f2SendCommand(['stopstate', 'goto home', 'go northeast']);
            }
            f2SendCommand(['dc ' + sid + ' stopstate', 'pack ' + sid]);
            var pack2_hook = window.WG.add_hook('dialog', function (data) {
                var command = [];
                for (var i = 0; i < data.items.length; i++) {
                    if (!scpack.some(function (item) { return data.items[i][0].includes(item); })) { continue; }
                    var pid = data.items[i][1];
                    var pcount = data.items[i][2];
                    command.push(is_sell ? 'dc ' + sid + ' sell ' + pid : 'dc ' + sid + ' give ' + F.role.id + ' ' + pcount + ' ' + pid);
                    command.push(500);
                }
                command.push('dc ' + sid + ' ' + workAbbr);
                command.push('$close');
                f2SendCommand(command);
                window.WG.remove_hook(pack2_hook);
            });
        };
        var dzsc = function () {
            var container = $("<div></div>");
            for (var name in F.follower) {
                if (F.follower.hasOwnProperty(name)) {
                    var sc = F.follower[name];
                    (function (sc) {
                        container.append(
                            $('<span class="span-btn"></span>').append(name + "：拿").click(function () { takesc(sc, 0); }),
                            $('<span class="span-btn"></span>').append(name + "：卖").click(function () { takesc(sc, 1); }),
                            $('<br>')
                        );
                    })(sc);
                }
            }
            AddContent(container);
        };
        var toSchoolHQ = function () {
            AddContent($("<div></div>").append(
                $('<span class="span-btn"></span>').append('<hic>' + GameState.score.family + '</hic>').click(function () { f2SendCommand('stopstate;$to 后勤;$wait 500;ask1 {r门派后勤管理员}'); }),
                $('<span class="span-btn"></span>').append("武当").click(function () { f2SendCommand('stopstate;goto fam2 WUDANG'); }),
                $('<span class="span-btn"></span>').append("少林").click(function () { f2SendCommand('stopstate;goto fam2 SHAOLIN'); }),
                $('<span class="span-btn"></span>').append("华山").click(function () { f2SendCommand('stopstate;goto fam2 HUASHAN'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("峨眉").click(function () { f2SendCommand('stopstate;goto fam2 EMEI'); }),
                $('<span class="span-btn"></span>').append("逍遥").click(function () { f2SendCommand('stopstate;goto fam2 XIAOYAO'); }),
                $('<span class="span-btn"></span>').append("丐帮").click(function () { f2SendCommand('stopstate;goto fam2 GAOBANG'); }),
                $('<span class="span-btn"></span>').append("杀手").click(function () { f2SendCommand('stopstate;goto fam2 SHASHOU'); }),
                $('<br>')
            ));
        };
        var toSchoolMPZ = function () {
            AddContent($("<div></div>").append(
                $('<span class="span-btn"></span>').append("逍遥").click(function () { f2SendCommand('stopstate;$to 门派橙-逍遥'); }),
                $('<span class="span-btn"></span>').append("华山").click(function () { f2SendCommand('stopstate;$to 门派橙-华山'); }),
                $('<span class="span-btn"></span>').append("武当").click(function () { f2SendCommand('stopstate;$to 门派橙-武当'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("峨眉").click(function () { f2SendCommand('stopstate;$to 门派橙-峨眉'); }),
                $('<span class="span-btn"></span>').append("丐帮").click(function () { f2SendCommand('stopstate;$to 门派橙-丐帮'); }),
                $('<span class="span-btn"></span>').append("少林").click(function () { f2SendCommand('stopstate;$to 门派橙-少林'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append('<hig>领取奖励</hig>').click(function () { f2SendCommand('stopstate;events WUDANG_settle'); })
            ));
        };
        var toSchoolJD = function () {
            AddContent($("<div></div>").append(
                $('<span class="span-btn"></span>').append("蓬莱-观海台").click(function () { f2SendCommand('stopstate;$to 蓬莱岛-观海台'); }),
                $('<span class="span-btn"></span>').append("蓬莱-石碑").click(function () { f2SendCommand('stopstate;$to 蓬莱岛-石碑'); }),
                $('<span class="span-btn"></span>').append("蓬莱-姜卫").click(function () { f2SendCommand('stopstate;$to 蓬莱岛-姜卫'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("药王谷-鉴宝阁").click(function () { f2SendCommand('stopstate;$to 药王谷-鉴宝阁;$wait 500;list {r拍卖师}'); }),
                $('<span class="span-btn"></span>').append("药王谷-炼丹房").click(function () { f2SendCommand('stopstate;$to 药王谷-炼丹房'); }),
                $('<span class="span-btn"></span>').append("药王谷-藏书楼").click(function () { f2SendCommand('stopstate;$to 药王谷-藏书楼'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("古大陆-守墓老人").click(function () { f2SendCommand('stopstate;jh ar 9 start'); })
            ));
        };
        var toSchoolBP = function () {
            AddContent($("<div></div>").append(
                $('<span class="span-btn"></span>').append("帮会-大院").click(function () { f2SendCommand('stopstate;$to 帮会-大院'); }),
                $('<span class="span-btn"></span>').append("帮会-仓库").click(function () { f2SendCommand('stopstate;$to 帮会-仓库'); }),
                $('<span class="span-btn"></span>').append("帮会-聚义堂").click(function () { f2SendCommand('stopstate;$to 帮会-聚义堂'); }),
                $('<br>'),
                $('<span class="span-btn"></span>').append("帮会-炼药房").click(function () { f2SendCommand('stopstate;$to 帮会-炼药房'); }),
                $('<span class="span-btn"></span>').append("帮会-练功房").click(function () { f2SendCommand('stopstate;$to 帮会-练功房'); })
            ));
        };
        /********************LEFT-HOTKEYS（快捷按钮）********************/
        $(".left-hotkeys").append(
            $("<div></div>").append(
                $('<hic class="span-btn"></hic>').append("刷新").click(function () { clickInfo(); clickPack(); f2SendCommand("events"); }),
                $('<hic class="span-btn"></hic>').append("统计").click(function () { f2SendCommand("info"); }),
                $('<hic class="span-btn"></hic>').append("换组").click(checkEq),
                $('<hic class="span-btn"></hic>').append("扩展").click(openExtend),
                $('<hic class="span-btn"></hic>').append("设置").click(function () { if (window.WG && WG.setting) { WG.setting(); } else { DungeonsShortcuts.extension_setting(); } }),
                $('<hic class="span-btn"></hic>').append("挂机").click(function () { WG.zdwk(); }),
                $('<hic class="span-btn"></hic>').append("庙回").click(function () { ToRaid.perform("//~silent\n@cmdDelay 0\nstopstate\n@renew"); }),
                $('<hic class="span-btn"></hic>').append("塔回").click(function () { ToRaid.perform("//~silent\n@cmdDelay 0\nstopstate\n($force_name) = (:kf_nei)\nenable force none\n$stoppfm\nenable force (force_name)\ngoto wd1\n@await 1000\n@until (:free) == true && (:room) == 武道塔-塔顶\n@print <hio>武道回血完成！</hio>"); })
            ),
            $("<div></div>").append(
                $('<hig class="span-btn"></hig>').append("当铺").click(function () { f2SendCommand('stopstate;$to 扬州城-当铺;$wait 200;list {r唐楠};'); }),
                $('<hig class="span-btn"></hig>').append("赌场").click(function () { f2SendCommand('stopstate;$to 扬州城-赌场;$wait 200;duihuan2;ask3 {r易直非}'); }),
                $('<hig class="span-btn"></hig>').append("后勤").click(toSchoolHQ),
                $('<hig class="span-btn"></hig>').append("词条").click(function () { f2SendCommand("stopstate;duihuan3"); }),
                $('<hig class="span-btn"></hig>').append("衙门").click(function () { f2SendCommand('stopstate;$to 扬州城-衙门正厅'); }),
                $('<hig class="span-btn"></hig>').append("师父").click(function () { f2SendCommand("stopstate;goto fam1"); }),
                $('<hig class="span-btn"></hig>').append("木人").click(function () { f2SendCommand("stopstate;$to 少林派-西侧殿"); }),
            ),
            $("<div></div>").append(
                $('<hiz class="span-btn"></hiz>').append("仓库").click(function () { f2SendCommand("store"); }),
                $('<hiz class="span-btn"></hiz>').append("随从").click(dzsc),
                $('<hiz class="span-btn"></hiz>').append("清包").click(function () { ToRaid.perform("@tidyBag"); }),
                $('<hiz class="span-btn"></hiz>').append("门战").click(toSchoolMPZ),
                $('<hiz class="span-btn"></hiz>').append("拍卖").click(function () { f2SendCommand('pm list'); }),
                $('<hiz class="span-btn"></hiz>').append("练功").click(function () { f2SendCommand('stopstate;$to 住房-练功房'); }),
                $('<hiz class="span-btn"></hiz>').append("花园").click(function () { f2SendCommand('stopstate;$to 住房-小花园'); }),
                $('<hiz class="span-btn"></hiz>').append("塔顶").click(function () { f2SendCommand('stopstate;jh fam 9 start;go enter'); })
            ),
            $("<div></div>").append(
                $('<hio class="span-btn"></hio>').append("隐藏").click(hideLeftRight),
                $('<hio class="span-btn"></hio>').append("清屏").click(clearRightMsg),
                $('<hio class="span-btn"></hio>').append("工具").click(function () { openExtensionHtml(); }),
                $('<hio class="span-btn"></hio>').append("攻略").click(function () { window.open("https://ucn595zz2fou.feishu.cn/wiki/JvEZw8bEiiIpf3kQiFJcAwbanji", "_blank"); }),
                $('<hio class="span-btn"></hio>').append("切换").click(toggleLeftRight),
                $('<hio class="span-btn"></hio>').append("禁地").click(toSchoolJD),
                $('<hio class="span-btn"></hio>').append("帮会").click(toSchoolBP),
                // 【2026-09-07 重登】软重登：清日志 DOM + 断线自动续连（1秒内恢复，不刷新页面）
                $('<hio class="span-btn"></hio>').append("重登").attr('id', 'btn_f2_relogin').click(function () {
                    var fn = (typeof unsafeWindow !== 'undefined' && unsafeWindow.__extManualRelogin) || window.__extManualRelogin;
                    if (fn) fn();
                })
            ),
            $("<div></div>")
        );

        var _lrSwapped = false;
        function toggleLeftRight() {
            _lrSwapped = !_lrSwapped;
            try {
                $('.left').css('order', _lrSwapped ? '1' : '-1');
                $('.right').css('order', _lrSwapped ? '-1' : '1');
            } catch (_) {}
        }

        function checkEq() {
            f2SendCommand(["pack", "cha"]);
            var eqgroup = localStorage.getItem(F.id + "_eqgroup");
            var skgroup = localStorage.getItem(F.id + "_skgroup");
            AddContent(
                $("<div></div>").append(
                    $('<span class="span-btn" eq="0"></span>').append("组一").click(loadEq),
                    $('<span class="span-btn" eq="1"></span>').append("组二").click(loadEq),
                    $('<span class="span-btn" eq="2"></span>').append("组三").click(loadEq),
                    $('<br>'),
                    $('<span class="span-btn" eq="0"></span>').append("查看组一").click(check),
                    $('<span class="span-btn" eq="1"></span>').append("查看组二").click(check),
                    $('<span class="span-btn" eq="2"></span>').append("查看组三").click(check),
                    $('<br>'),
                    $('<hiy>如无反应，请设置为对应组后重新点击\n</hiy>')
                )
            );
            function loadEq() {
                var index = $(this).attr("eq");
                var name = ["技能装备组一", "技能装备组二", "技能装备组三"];
                f2SendCommand(['stopstate', 'eqgroup ' + index, 'skgroup ' + index]);
                AddContent('<hir>已一键更换<hiw>' + name[index] + '</hiw>！</hir>\n');
            }
            function check() {
                var index = $(this).attr("eq");
                var name = ["组一", "组二", "组三"];
                var str = '<hir>' + name[index] + '</hir><hiw>配置为：</hiw>\n';
                str += '<hiw>------技能组------</hiw>\n';
                try {
                    var base_s = JSON.parse(skgroup)[index];
                    var key_s = Object.keys(base_s);
                    if (key_s.length == 0) {
                        str += "技能组为空，请设置后通过组查获取\n";
                    } else {
                        key_s.forEach(function (key) {
                            if (base_s[key] == null || base_s[key].name == null) return;
                            str += base_s[key].name + "\n";
                        });
                    }
                } catch (e) { str += "技能组为空\n"; }
                str += '<hiw>--------背包组--------</hiw>\n';
                try {
                    var base_e = JSON.parse(eqgroup)[index];
                    if (base_e.length == 0) {
                        str += "装备组为空，请设置后通过组查获取\n";
                    } else {
                        base_e.forEach(function (eq) {
                            if (eq == null) return;
                            str += eq.name + "\n";
                        });
                    }
                } catch (e) { str += "装备组为空\n"; }
                AddContent(str);
            }
        }

        function openExtend() {
            $('span[command=setting]').click();
            $('span.footer-item[for="extend"]').click();
        }

        function clickInfo() {
            $(".content-info").show();
            f2SendCommand(["score2", "score"]);
            setTimeout(function () { $(".dialog-close").click(); }, 200);
            AddContent('<hic>属性数据已刷新！\n</hic>');
        }

        function clickPack() {
            $('span[command=pack]').click();
            f2SendCommand("pack");
            setTimeout(function () { $(".dialog-close").click(); }, 100);
            AddContent('<hic>背包数据已刷新！\n</hic>');
        }
    };
})();