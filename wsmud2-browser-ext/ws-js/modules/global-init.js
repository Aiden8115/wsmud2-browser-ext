// global-init.js
// GI global init: hooks and data sync
'use strict';

//GlobalInit
var GlobalInit = {
    gcdThread: null,
    init: function () {
        
        WG.add_hook("dialog", function (data) {
            if (data.dialog == 'list') {
                // 自动当铺购买
                if (data.stores) {
                    // 仓库数据
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    storeData = data.stores;

                    GameState.store.max_store_count = data.max_store_count;
                    GameState.store.sum = data.sum;
                    GameState.store.stores = data.stores;
                    
                } else if (data.store) {
                    // 单次存储
                    let scan_store = true;
                    let bag_remove_id = null;
                    let store_remove_id = null;

                    for (let i = 0; i < GameState.packs.items.length; i++) {
                        let bag_item = GameState.packs.items[i];
                        if (bag_item == null) { continue; }
                        if (bag_item.id == data.id) {     // 道具存于背包时, 先判断数量  若数量为0 删除背包数据,若不为0 修改背包数据
                            scan_store = false;
                            let over_num = bag_item.count - data.store;
                            if (over_num == 0) {
                                // GameState.packs.items.splice(i, 1)
                                bag_remove_id = i;
                            } else {
                                GameState.packs.items[i].count = over_num;
                            }
                            break;
                        }
                    }
                    if (scan_store) {   // 如果不存在于背包时, 添加数据到背包,并判断仓库数量
                        for (let j = 0; j < storeData.length; j++) {
                            let store_item = storeData[j];
                            if (store_item == null) { continue; }
                            if (store_item.id == data.storeid) {
                                let item = {
                                    id: data.id,
                                    name: store_item.name,
                                    count: Math.abs(data.store)
                                }
                                //更新背包
                                GameState.packs.items.push(item);
                                break;
                            }

                        }
                    }
                    //计算仓库数据,若仓库存在该数据 修改其数量,若不存在 则添加,如果计算后数量为0 则删除该条数据
                    let found_store = true;
                    for (let j = 0; j < storeData.length; j++) {
                        let store_item = storeData[j];
                        if (store_item == null) { continue; }

                        if (store_item.id == data.id) {
                            found_store = false;
                            let store_count = store_item.count + data.store;
                            if (store_count === 0) {
                                // storeData.splice(j, 1)
                                store_remove_id = j;
                            } else {
                                storeData[j].count = store_count;
                            }
                            break;
                        }

                    }
                    if (found_store) {
                        for (let j = 0; j < GameState.packs.items.length; j++) {
                            let store_item = GameState.packs.items[j];
                            if (store_item == null) { continue; }
                            if (store_item.id === data.id) {
                                let item = {
                                    id: data.stroeid,
                                    name: store_item.name,
                                    count: Math.abs(data.store)
                                }
                                //更新背包
                                storeData.push(item)
                                break;
                            }
                        }
                    }
                    // 移除队列数据
                    if (bag_remove_id != null) {
                        GameState.packs.items.splice(bag_remove_id, 1)
                    }
                    if (store_remove_id != null) {
                        storeData.splice(store_remove_id, 1)
                    }
                } else if (data.title == "唐楠正在贩卖以下物品：" && autoBuyList){
                    messageAppend("<hig>自动当铺购买中，如有问题请检查设置</hig>")
                    let _seller;
                    let _itemids = new Map();
                    let _sendcmd = "";
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    _seller = data.seller;
                    for (let item of data.selllist) {
                        if (WG.inArray(item.name, autoBuyList.split(",")) && item.count) {
                            _itemids.set(item.id, item.count);
                        }
                    }
                    _itemids.forEach((val, key, map) => {
                        _sendcmd = _sendcmd + "buy " + val + " " + key + " from " + _seller + ";";
                        _sendcmd = _sendcmd + "$wait 500;";
                    });
                    WG.SendCmd(_sendcmd);
                    
                }; 
            } else if (data.dialog == "score") {
                for (let key in data) {
                    GameState.score[key] = data[key];
                }
                if (data.level) {
                    if (data.level.indexOf('武帝') >= 0 || data.level.indexOf('武神') >= 0 ||
                    data.level.indexOf('剑神') >= 0 || data.level.indexOf('刀皇') >= 0 ||
                    data.level.indexOf('兵主') >= 0 || data.level.indexOf('战神') >= 0) {
                        GameState.score.isGod = true
                    } else { GameState.score.isGod = false }
                }
                if (data.family) {
                    GameState.score.family = data.family.replaceAll('派', '').replaceAll('楼', '');
                    if (GameState.score.family == "无门无") {GameState.score.family = "武馆";}
                    family = GameState.score.family;

                    // 添加拼音映射
                    const familyPyMap = {'武当': 'WUDANG','峨眉': 'EMEI','少林': 'SHAOLIN','逍遥': 'XIAOYAO','华山': 'HUASHAN','丐帮': 'GAI','杀手': 'SHASHOU','武馆': '' };
                    GameState.score.family_py = familyPyMap[family] || '';
                    GM_setValue(roleid + "_family", GameState.score.family);
                } 
            } else if (data.dialog == "pack") {
                if (data.items != undefined) {
                    // 背包数据
                    data = WG.smartClone(data);
                    data = WG.deserializePackData(data);
                    GameState.packs.items = data.items;
                    GameState.packs.max_item_count = data.max_item_count;
                    GameState.packs.money = data.money;
                    GameState.packs.eqs = data.eqs;
                    GameState.packs.eq_group = data.eq_group;

                    if (data.eq_group>=0) {
                        eqgroup = GM_getValue(roleid + "_eqgroup") || [];
                        eqgroup[data.eq_group]= data.eqs;
                        GM_setValue(roleid + "_eqgroup", eqgroup);
                    }
                }
                // 脱下装备
                if (data.uneq != undefined){
                    let p = WG.smartClone(GameState.packs.eqs[data.uneq]);
                    GameState.packs.eqs[data.uneq] = null;
                    GameState.packs.items.push(p);
                }
                // 添加装备
                if (data.eq != undefined){
                    let index = GameState.packs.items.findIndex(item => {return item.id === data.id;});
                    let p = WG.smartClone(GameState.packs.items[index]);
                    GameState.packs.items.splice(index, 1);
                    GameState.packs.eqs[data.eq] = p;
                }
                if (data.remove) {
                    let index = GameState.packs.items.findIndex(item => {return item.id === data.id;});
                    if (index == -1)return;
                    let item = GameState.packs.items[index];
                    let count = item.count - data.remove;
                    if (count <= 0) {
                        GameState.packs.items.splice(index, 1);
                    } else {
                        item.count = count;
                    }
                }
                if (data.name != null) {
                    let index = GameState.packs.items.findIndex(item => {return item.id === data.id;});
                    let old_count = index == -1 ? null : GameState.packs.items[index].count;
                    // 追加packs
                    let item = {
                        id: data.id,
                        name: data.name,
                        count: data.count,
                        grade: data.grade,
                        unit: data.unit,
                        value: data.value,
                        can_eq: data.can_eq || 0,
                        can_use: data.can_use || 0,
                        can_study: data.can_study || 0,
                        can_open: data.can_open || 0,
                        can_combine: data.can_combine || 0,
                    };
                    if (index !== -1) {
                        GameState.packs.items.splice(index, 1, item);
                    } else {
                        GameState.packs.items.push(item);
                    }
                    
                    //  获得物品设置   
                    if (getitemShow = "开" && !data.name.includes("<wht>")){
                        let count = index == -1 ? data.count : data.count - old_count;
                        let id = data.id;
                        let str;
                        if (data.can_eq == 1) {
                            if (index != -1)return;
                            str = `获得1${data.unit}${data.name}`;
                        }
                        if (!itemTotalCount[id]) {
                            itemTotalCount[id] = 0;
                        } else if (itemTotalCount[id]<0){return};
                        
                        itemTotalCount[id] += count;
                        str = `获得<hiw>${itemTotalCount[id]}</hiw>${data.unit}${data.name}，共有<hiw>${data.count}</hiw>${data.unit}`;
                        messageAppend(str, 0, id)
                    }

                }
                if (data.can_use || data.can_open) {
                    //生成快速使用按钮
                    function autoUse(item) {
                        if (/养精丹|朱果|潜灵果|背包扩充石|仓库扩充石|小箱子|师门补给包|随从礼包|技能重置包/.test(item.name)) {
                            let cmd = ["stopstate"];
                            let count = item.count;
                            let zl = "use";
                            if (/小箱子|师门补给包|随从礼包|技能重置包/.test(item.name)) zl = "open";
                            for (let i = 0; i < count; i++) {
                                cmd.push(`$wait 250;${zl} ${item.id}`);
                            }
                            $(".content-message pre").append(
                                $(`<div class="item-commands"><span class="autouse">使用 ${item.name} ${count}次</span></div>`).click(() => WG.SendCmd(cmd)),
                            );
                            // AutoScroll(".content-message");
                        }
                    }
                    //获得物品后检测生成快速使用按钮 -- fork from Suqing funny
                    if (data.name) {
                        autoUse(data);
                    }
                }

            } else if (data.dialog == "skills") {
                // 技能数据
                if (data.items) {
                    GameState.skills.items = data.items;
                    GameState.skills.limit = data.limit;
                    GameState.skills.sk_group = data.sk_group;
                    // 匹配装备的技能
                    GameState.skills.items.forEach(item => {
                        if (item.name.indexOf("基本") >= 0) {
                            if (item.enable_skill) {
                                GameState.skills.enable_skills[item.id].id = item.enable_skill;
                            } else {
                                GameState.skills.enable_skills[item.id] = {name:null,id:null};
                            }
                        } else {
                            for (let key in GameState.skills.enable_skills) {
                                if (GameState.skills.enable_skills[key].id && item.id == GameState.skills.enable_skills[key].id) {
                                    GameState.skills.enable_skills[key].name = item.name;
                                }
                            }
                        }
                    });
                }
                if (data.books) {
                    // 书架
                    GameState.skills.books = data.books
                }
                if (data.sk_group>=0) {
                    // 保存技能组
                    skgroup = GM_getValue(roleid + "_skgroup");
                    setTimeout(() => {
                        skgroup[data.sk_group]= GameState.skills.enable_skills
                        GM_setValue(roleid + "_skgroup", skgroup);
                    }, 200)
                }
                if (data.enable != undefined) {
                    // 替换装备的技能
                    for (let key in GameState.skills.enable_skills) {
                        let item = GameState.skills.enable_skills[key];
                        if (key == data.id) {
                            item.id = data.enable
                            for (let skill of GameState.skills.items) {
                                if (skill.id == data.enable) {
                                    item.name = skill.name;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (data.enable != null && zdyskills == "开") {
                    zdyskilllist == "";
                    messageAppend("检测到更换技能,请刷新重新获取技能数据!");
                    zdyskills = "关";
                    GM_setValue(roleid + "_zdyskilllist", "");
                    GM_setValue(roleid + "_zdyskills", zdyskills);
                }
            } else if (data.dialog == 'party' && data.name != undefined) {
                GameState.relation.party = data.name;
            } else if (data.dialog == 'team' && data.items != undefined) {
                GameState.relation.team = data.items;
            } else if (data.dialog == 'relation' && data.fls != undefined) {
                GameState.relation.follower = data.fls.slice(0, -1);
        
                const workMap = { 挖矿: 'wk', 钓鱼: 'diao', 采药: 'cai' };
                GameState.relation.follower.forEach(item => item[2] = workMap[item[2]]);

                let fls = GameState.relation.follower;
                let addr = GM_getValue(roleid + "_saveAddr");

                for (let i = 0; i < fls.length; i++) {
                    let wk = fls[i][2];
                    if (wk && addr == "关") {
                        addr = "开"
                        GM_setValue(roleid + "_saveAddr", addr);
                    } else if (!wk && addr == "开"){
                        messageAppend(`<hiy>注意：随从<hir>${fls[i][0]}</hir>停止工作！！</hiy>`);
                        fls[i][2] ='cai';
                    }
                }
            } else if (data.dialog == 'jh') {
                if (data.fbs) {
                    fb_path = data.fbs;
                }
            } else if (data.dialog == "events"){
                if (data.update || data.finish) {
                    WG.SendCmd("events")
                } else if (data.items && Array.isArray(data.items)) {
                    GameState.events = data.items;
                    // 检测喜宴和BOSS活动
                    for (let n = 0; n < data.items.length; n++) {
                        if (data.items[n] && data.items[n][0] === "marry") {
                            var automarry = GM_getValue(roleid + "_automarry", automarry);
                            if (automarry == "开" && GameState.fight.in_fight == false) {
                                if (stopauto || WG.at('副本')) {
                                    messageClear();
                                    messageAppend("<hiy>已自动领取喜宴</hiy>");
                                    WG.xiyan();
                                } else {
                                    WG.xiyan();
                                }
                            } else if (automarry == "关" || GameState.fight.in_fight == true) {
                                let b = "<div class=\"item-commands\"><span  id = 'onekeyjh'>参加喜宴</span></div>"
                                messageClear();
                                messageAppend("<hiy>点击参加喜宴</hiy>");
                                messageAppend(b);
                                $('#onekeyjh').on('click', function () {
                                    WG.xiyan();
                                });
                            }
                        } else if (data.items[n] && data.items[n][0].includes("boss")) {
                            var boss_name = data.items[n][2].match(/(.*?)被击败了/)?.[1];
                            BossName = GM_getValue(roleid + "_BossName", BossName);
                            autoBoss = GM_getValue(roleid + "_autoBoss", autoBoss);
                            if (boss_name == null || BossName=='') {continue;}
                            if (boss_name && boss_name.includes("<hi")) {
                                boss_name = boss_name.match(/<hi([^>]+)>(.*?)<\/hi\1>/)[2]
                            }
                            if (boss_name != BossName) {continue;}
                            if (autoBoss == "开" && GameState.fight.in_fight == false) {
                                if (stopauto || WG.at('副本')) {
                                    let b = "<div class=\"item-commands\"><span  id = 'onekeyboss'>领取BOSS</span></div>"
                                    messageClear();
                                    messageAppend("<hiy>自动领取boss</hiy>");
                                    messageAppend(b);
                                    $('#onekeyboss').on('click', function () {
                                    WG.collBoss(data.items[n]);
                                });
                                } else {
                                    WG.collBoss(data.items[n]);
                                }
                            } else if (GameState.fight.in_fight == true) {
                                let b = "<div class=\"item-commands\"><span  id = 'onekeyboss'>领取BOSS</span></div>"
                                messageClear();
                                messageAppend("<hiy>点击参加领取BOSS,由于未开启自动领取,或者在战斗中,需要手动领取</hiy>");
                                messageAppend(b);
                                $('#onekeyboss').on('click', function () {
                                    WG.collBoss(data.items[n]);
                                });
                            }
                        }
                    }
                }
            };
        });

        WG.add_hook(["status", "login", "exits", "room", "items", "itemadd", "itemremove", "sc", "text", "state", "msg", "perform", "clearDistime", "dispfm", "combat", "die"], function (data) {
            switch (data.type) {
                case "login":
                    GameState.id = data.id;
                    GameState.connected = true;
                    WG.online = true;
                    break;
                case "exits":
                    GameState.room.exits = new Map();
                    if (data.items["north"]) {
                        GameState.room.exits.set("north", {
                            exits: data.items["north"]
                        });
                    }
                    if (data.items["south"]) {
                        GameState.room.exits.set("south", {
                            exits: data.items["south"]
                        });
                    }
                    if (data.items["east"]) {
                        GameState.room.exits.set("east", {
                            exits: data.items["east"]
                        });
                    }
                    if (data.items["west"]) {
                        GameState.room.exits.set("west", {
                            exits: data.items["west"]
                        });
                    }
                    if (data.items["northup"]) {
                        GameState.room.exits.set("northup", {
                            exits: data.items["northup"]
                        });
                    }
                    if (data.items["southup"]) {
                        GameState.room.exits.set("southup", {
                            exits: data.items["southup"]
                        });
                    }
                    if (data.items["eastup"]) {
                        GameState.room.exits.set("eastup", {
                            exits: data.items["eastup"]
                        });
                    }
                    if (data.items["westup"]) {
                        GameState.room.exits.set("westup", {
                            exits: data.items["westup"]
                        });
                    }
                    if (data.items["northdown"]) {
                        GameState.room.exits.set("northdown", {
                            exits: data.items["northdown"]
                        });
                    }
                    if (data.items["southdown"]) {
                        GameState.room.exits.set("southdown", {
                            exits: data.items["southdown"]
                        });
                    }
                    if (data.items["eastdown"]) {
                        GameState.room.exits.set("eastdown", {
                            exits: data.items["eastdown"]
                        });
                    }
                    if (data.items["westdown"]) {
                        GameState.room.exits.set("westdown", {
                            exits: data.items["westdown"]
                        });
                    }
                    if (data.items["up"]) {
                        GameState.room.exits.set("up", {
                            exits: data.items["up"]
                        });
                    }
                    if (data.items["down"]) {
                        GameState.room.exits.set("down", {
                            exits: data.items["down"]
                        });
                    }
                    if (data.items["enter"]) {
                        GameState.room.exits.set("enter", {
                            exits: data.items["enter"]
                        });
                    }
                    if (data.items["out"]) {
                        GameState.room.exits.set("out", {
                            exits: data.items["out"]
                        });
                    }
                    // 清除原有房间BUFF计时
                    clearAllBuffTimers();
                    break;
                case "room":
                    let tmp = data.path.split("/");
                    GameState.room.type = tmp[0];
                    GameState.room.path = tmp[1];
                    if (GameState.room.type == 'home' || GameState.room.path == 'kuang')
                        can_auto = true;
                    else
                        can_auto = false;
                    GameState.room.name = data.name;
                    //强制结束pfm
                    if (GameState.fight.in_fight) {
                        GameState.fight.in_fight = false;
                        WG.auto_preform("stop");
                        WG.clean_dps();
                    }
                    break;
                case "items":
                    // 获取NPC
                    WG.saveRoomstate(data);

                    GameState.items = new Map();
                    for (var i = 0; i < data.items.length; i++) {
                        let item = data.items[i];
                        if (item.id) {
                            if (item.id == GameState.id && item.status != null) {
                                GameState.selfStatus = []
                                for (var x = 0; x < item.status.length; x++) {
                                    GameState.selfStatus.push(item.status[x].sid)
                                }
                            }
                            let n = $.trim($('<body>' + item.name + '</body>').text());
                            let i = n.lastIndexOf(' ');
                            let j = n.lastIndexOf('<');
                            let t = "";
                            let s = "";
                            if (j >= 0) {
                                s = n.substr(j + 1, 2);
                            }
                            if (i >= 0) {
                                t = n.substr(0, i);
                                n = n.substr(i + 1).replace(/<.*>/g, '');
                            }

                            GameState.items.set(item.id, {
                                name: n,
                                title: t,
                                state: s,
                                max_hp: item.max_hp,
                                max_mp: item.max_mp,
                                hp: item.hp,
                                mp: item.mp,
                                p: item.p,
                                damage: 0,
                                status: item.status
                            });
                        }
                         // 添加新房间BUFF计时
                        if (item.status && item.status.length > 0) {
                            for (let j = 0; j < item.status.length; j++) {
                                const statusItem = item.status[j];
                                showBuffDuration(statusItem.sid, statusItem.duration, item.id, statusItem.count || 0, statusItem.overtime);
                            }
                        }
                    }
                    break;
                case "itemadd":
                    if (data.id) {
                        let n = $.trim($('<body>' + data.name + '</body>').text());
                        let i = n.lastIndexOf(' ');
                        let j = n.lastIndexOf('<');
                        let t = "";
                        let s = "";
                        if (i >= 0) {
                            t = n.substr(0, i);
                            if (j >= 0) {
                                s = n.substr(j + 1, 2);
                            }
                            n = n.substr(i + 1).replace(/<.*>/g, '');
                        }
                        GameState.items.set(data.id, {
                            name: n,
                            title: t,
                            state: s,
                            max_hp: data.max_hp,
                            max_mp: data.max_mp,
                            hp: data.hp,
                            mp: data.mp,
                            p: data.p,
                            damage: 0,
                            status: data.status
                        });

                        // 添加新人物BUFF计时
                        if (data.status && data.status.length > 0) {
                            for (let i = 0; i < data.status.length; i++) {
                                const statusItem = data.status[i];
                                showBuffDuration(statusItem.sid, statusItem.duration, data.id, statusItem.count || 0,  statusItem.overtime);
                            }
                        }
                        
                    }
                    break;
                case "itemremove":
                    GameState.items.delete(data.id);
                    break
                case "sc":
                    let xitem = GameState.items.get(data.id);
                    if (data.hp !== undefined) {
                        xitem.hp = data.hp;
                        if (data.id != GameState.id) {
                            GameState.fight.fight_id = data.id; //伤害统计需要
                        }
                        // WG.showallhp();
                    }
                    if (data.mp !== undefined) {
                        xitem.mp = data.mp;
                    }
                    if (data.id != GameState.id) break;
                    // 记录角色的属性
                    if (data.hp != null) GameState.score.hp = data.hp;
                    if (data.max_hp != null) GameState.score.maxHp = data.max_hp;
                    if (data.mp != null) GameState.score.mp = data.mp;
                    if (data.max_mp != null) GameState.score.maxMp = data.max_mp;
                    break
                case "perform":
                    GameState.skills.perform = data.skills;
                    if (zdyskilllist == "") {
                        zdyskilllist = JSON.stringify(data.skills);
                        GM_setValue(roleid + "_zdyskilllist", zdyskilllist);
                    }
                    break
                case 'clearDistime':
                    WG.cds.forEach(function (v, k) {
                        WG.cds.set(k, { iscd: false, distime: 0 });
                        // 清除对应技能的CD显示
                        clearSkillCDDisplay(k);
                    });
                    break;
                case 'dispfm':
                    if (data.id) {
                        WG.cds.set(data.id, { iscd: true, distime: data.distime || 0 });
                        var _id = data.id;
                        setTimeout(function () {
                            WG.cds.set(_id, { iscd: false, distime: 0 });
                            //技能cd时间到
                            let pfmtimeTips = {
                                data: JSON.stringify({
                                    type: "enapfm",
                                    id: _id
                                })
                            };
                            WG.receive_message(pfmtimeTips);
                        }, data.distime);
                        // 调用技能CD显示函数
                        showSkillCD(data.id, data.distime);
                    }
                    if (data.rtime) {
                        if (WG.gcd) {
                            clearTimeout(GlobalInit.gcdThread);
                        }
                        WG.gcd = true;
                        GlobalInit.gcdThread = setTimeout(function () {
                            WG.gcd = false;
                        }, data.rtime);
                    }
                    break;
                case 'enapfm':
                    // 技能可用时，清除对应技能的CD显示
                    clearSkillCDDisplay(data.id);
                    break;
                case "combat":
                    if (data.start) {
                        GameState.fight.in_fight = true;
                        battleStartTime = new Date();
                        WG.auto_preform();
                    }
                    if (data.end) {
                        GameState.fight.in_fight = false;
                        WG.auto_preform("stop");
                        WG.clean_dps();
                    }
                    break
                case "status":
                    // 层数刷新
                    if (data.count != undefined) {
                        GameState.status.set(data.id, {
                            "sid": data.sid,
                            "count": data.count
                        });
                    }
                    // 自己ID
                    if (data.id == GameState.id) {
                        if (data.action == 'add') {
                            GameState.selfStatus.push(data.sid)
                            if (data.duration) {
                                setTimeout(() => {
                                    GameState.selfStatus.remove(data.sid);
                                }, data.duration - (data.overtime || 0));
                            }
                        } else if (data.action == 'remove') {
                            let tmpbufflist = []
                            for (let i = 0; i < GameState.selfStatus.length; i++) {
                                if (GameState.selfStatus[i] != data.sid) {
                                    tmpbufflist.push(GameState.selfStatus[i])
                                }
                            }
                            GameState.selfStatus = tmpbufflist;
                        } else if (data.action == 'clear') {
                            GameState.selfStatus = []
                        }
                    }
                   
                    let item = GameState.items.get(data.id);
                    if (item == null) {
                        break;
                    }
                    // 状态刷新
                    if (data.action == 'add' || data.action == 'refresh') {
                        if (item.status == null) {
                            item.status = [];
                        }
                        // 查找对应的BUFF
                        const buffIndex = item.status.findIndex(buff => buff.sid === data.sid);
                        let currentDuration = data.duration;
                        
                        if (buffIndex !== -1) {
                            // 更新
                            item.status[buffIndex].duration = data.duration || item.status[buffIndex].duration;
                            currentDuration = item.status[buffIndex].duration;
                        } else {
                            item.status.push({ sid: data.sid, name: data.name, duration: data.duration, count: data.count || 0, overtime: 0 }); 
                        }
                        showBuffDuration(data.sid, currentDuration, data.id, data.count || 0, 0);

                    } else if (data.action == 'remove') {
                        for (let i = 0; i < item.status.length; i++) {
                            let s = item.status[i];
                            if (s.sid == data.sid) {
                                item.status.splice(i, 1);
                                // 清除BUFF计时
                                clearBuffDisplay(data.sid, data.id);
                                break;
                            }
                        }
                    } else if (data.action == 'clear') {
                        const id = data.id;
                        for (let i = 0; i < item.status.length; i++) {
                            // 清除
                            clearBuffDisplay(item.status[i].sid, id);
                            item.status.splice(i, 1);
                        }
                    } 
                     // 控制信息显示
                    if (busy_info === '开') {
                        if (data.id == GameState.id) {
                            if (data.action == 'add') {
                                if (data.sid == 'busy' || data.sid == 'faint') {
                                    var _id = data.id;
                                    messageAppend(`<hig>你被${data.name}了${data.duration / 1000}秒`, 0, data.id+'_'+data.name);
                                    if (data.name == '绊字诀') return;
                                }
                            }
                        } else {
                            if (data.action == 'add') {
                                if (data.sid == 'busy' || data.sid == 'faint' || data.sid == 'chidun' || data.sid == 'unarmed') {
                                    let npc = GameState.items.get(data.id)
                                    messageAppend(`<hig>${npc.name}被${data.name}了${data.duration / 1000}秒`, 0, data.id+'_'+data.name);
                                }
                            }
                        }
                    }
                    break
                case "text":
                    if (data.msg.indexOf("今日副本次数") >=0 && data.msg.indexOf("BOSS挑战") >= 0){
                        const info = data.msg;
                        const regex = /武道塔进度\d+层，已累积(\d+)份奖励\n武道残页总量\d+\n门派职位等级[^，\n]+，已累积(\d+)份师门物资\n衙门职位等级[^，\n]+，已累积(\d+)份奖励\n今日副本次数(\d+)\/20\nBOSS挑战(\d+)\/5\n([^，\n]+)\n(获取圣元碎片(\d+)\/1\n)?(获取帝魄碎片(\d+)\/1\n)?获取额外(\d+)\/(\d+)师门功绩\n本周已经获取襄阳军功(\d+)\/(\d+)\n已领取(\d+)\/(\d+)奖励军功/;
                        const matches = info.match(regex);

                        if (!matches) {return;}

                        const result = {
                            wudao: parseInt(matches[1], 10),
                            shimen: parseInt(matches[2], 10),
                            yamen: parseInt(matches[3], 10),
                            fuben: parseInt(matches[4], 10),
                            boss: parseInt(matches[5], 10),
                            qingan: matches[6] === '尚未请安',
                            shengyuan: matches[8] ? parseInt(matches[8], 10) : -1,
                            dipo: matches[10] ? parseInt(matches[10], 10) : -1,
                            gongji: {
                                cur: parseInt(matches[11], 10),
                                max: parseInt(matches[12], 10)
                            },
                            jungong: {
                                cur: parseInt(matches[13], 10),
                                max: parseInt(matches[14], 10)
                            },
                            jungong1: parseInt(matches[15], 10)
                        };

                        if (result.wudao>5) {
                            messageAppend(`<hir>武道塔累积${result.wudao}天，武道塔累积${result.wudao}天，请尽快领取</hir>`);
                        };
                        if (result.shimen>48) {
                            messageAppend(`<hir>师门累积${result.shimen}份，请尽快领取</hir>`);
                        };
                        if (result.yamen>48) {
                            messageAppend(`<hir>衙门累积${result.yamen}份，请尽快领取</hir>`);
                        };
                        if (result.fuben<20) {
                            messageAppend(`<hir>免费精力未用完，请尽快使用</hir>`);
                        };
                        if (result.boss<5) {
                            autoBoss = "开";
                            messageAppend(`<hiy>Boss次数未用完，已开启自动领取Boss</hiy>`);
                            GM_setValue(roleid + "_autoBoss", autoBoss);
                        } else {
                            autoBoss = "关";
                            GM_setValue(roleid + "_autoBoss", autoBoss);
                        };
                        if (result.qingan) {
                            WG.SendCmd('sx greet')
                            messageAppend(`<hiy>未请安，已自动请安</hiy>`);
                        };
                        if (result.shengyuan===0) {
                            messageAppend(`<hir>圣元碎片未获取，请尽快获取</hir>`);
                        };
                        if (result.dipo===0) {
                            messageAppend(`<hir>帝魄碎片未获取，请尽快获取</hir>`);
                        };
                        if (result.gongji.cur<result.gongji.max) {
                            messageAppend(`<hir>门派战功绩未满，请尽快获取</hir>`);
                        };
                        if (result.jungong.cur<result.jungong.max) {
                            messageAppend(`<hir>军功未满，请尽快获取</hir>`);
                        };
                        if (result.jungong1==0) {
                            messageAppend(`<hir>胜利军功未领取，请尽快领取</hir>`);
                        };
                        if(result.fuben>=20&&result.boss>=5&&!result.qingan&&result.shengyuan!==0&&result.dipo!==0&&result.gongji.cur>=result.gongji.max){
                            messageAppend(`<hig>今日任务全部完成!</hig>`);
                        };

                     }

                    if (data.msg.indexOf("还没准备好，你还不能使用。") >= 0) {
                        // let skillname = data.msg.replaceAll("还没准备好，你还不能使用。","");
                        // let skillid = GameState.skills.map(e => { return e['name'] == skillname ? e['id'] : '' }).join("")
                        // if (skillid!=''){
                        //     WG.cds.set(skillid,true)
                        //     setTimeout(() => {
                        //         WG.cds.set(skillid,false)
                        //     }, 1000);
                        // }
                        if (!WG.gcd) {
                            WG.gcd = true;
                            setTimeout(() => {
                                WG.gcd = false
                            }, 500);
                        }
                    }
                    if ((data.msg.indexOf("不要急") >= 0 || data.msg.indexOf("你现在手忙脚乱") >= 0 ||
                         data.msg.indexOf("你正在昏迷") >= 0 || data.msg.indexOf("你上个技能") >= 0) && auto_pfmswitch == "开") {
                        if (!WG.gcd) {
                            WG.gcd = true;
                            setTimeout(() => {
                                WG.gcd = false
                            }, 500);
                        }
                    }
                    break
                case 'die':
                    GameState.selfStatus = []

                    if (die_str != '' && data.relive == null) {
                        textShow(die_str)
                    }
                    break;
                default:
                    break;
            }
        });
        WG.add_hook('text', function (data) {
            if (data.msg.indexOf(`${role}身上东西太多了`) >= 0 || data.msg.indexOf("你身上东西太多了") >= 0 || data.msg.indexOf("你拿不下那么多东西。") >= 0) {
                messageAppend("<hiy>友情提示：请检查是否背包已满！");
                Beep();
            } else if (data.msg.indexOf("长得") >= 0 && data.msg.indexOf("看起来") >= 0) {
                let s = data.msg.split("\n")[0].split(" ");
                let name = s[s.length - 1];
                if (name.indexOf("<") >= 0) {
                    name = name.split("<")[0];
                }
                let t = new Date().getMilliseconds();
                let shieldhtml = `<div class="item-commands"><span id="addshield${t}">屏蔽 ${name}</span></div>`
                messageAppend(shieldhtml, 0);
                $(`#addshield${t}`).on('click', function () {
                    shield = GM_getValue('_shield', shield);
                    if (shield != "") {
                        shield = shield + "," + name;
                    } else {
                        shield = name;
                    }
                    GM_setValue('_shield', shield);
                    $('#shield').val(shield);
                    messageAppend("<hiy>已屏蔽", 1);
                });
            } else if (dpssakada == '开' && /.*造成<.*>.*<\/.*>点.*/.test(data.msg)) {
                let pdata = data.msg;
                let a = pdata.split(/.*造成<wht>|.*造成<hir>|<\/wht>点|<\/hir>点/);
                let b = a[2].split(/伤害|\(|</);
                
                if (b[2] != '你') {
                    if (b[0] == '暴击') {//判断关键字
                        //critDamageTotal = critDamageTotal + parseInt(a[1]);
                        lastCritDamage = parseInt(a[1]);

                    } else {
                        // normalDamageTotal = normalDamageTotal + parseInt(a[1]);
                        lastNormalDamage = parseInt(a[1]);
                    }
                    dpsLocked = 1;
                }
            } else if (dpssakada == '开' && /看起来充满活力，一点也不累。|似乎有些疲惫，但是仍然十分有活力。|看起来可能有些累了。|动作似乎开始有点不太灵光，但是仍然有条不紊。|已经一副头重脚轻的模样，正在勉力支撑著不倒下去。|看起来已经力不从心了。|已经陷入半昏迷状态，随时都可能摔倒晕去。|似乎十分疲惫，看来需要好好休息了。|气喘嘘嘘，看起来状况并不太好。|摇头晃脑、歪歪斜斜地站都站不稳，眼看就要倒在地上。/.test(data.msg)) {
                let dd = data.msg.split(/看起来充满活力，一点也不累。|似乎有些疲惫，但是仍然十分有活力。|看起来可能有些累了。|动作似乎开始有点不太灵光，但是仍然有条不紊。|已经一副头重脚轻的模样，正在勉力支撑著不倒下去。|看起来已经力不从心了。|已经陷入半昏迷状态，随时都可能摔倒晕去。|似乎十分疲惫，看来需要好好休息了。|气喘嘘嘘，看起来状况并不太好。|摇头晃脑、歪歪斜斜地站都站不稳，眼看就要倒在地上。/);
                //console.log(dd);
                if (dd.length >= 2) {
                    if (dd[0].indexOf("你") < 0) {
                        if (lastCritDamage > 0) {
                            critDamageTotal = critDamageTotal + lastCritDamage;
                            critHitCount = critHitCount + 1;//暴击伤害和暴击次数增加
                        }
                        if (lastNormalDamage > 0) {
                            normalDamageTotal = normalDamageTotal + lastNormalDamage;
                            normalHitCount = normalHitCount + 1;
                        }
                    }
                    lastCritDamage = 0;
                    lastNormalDamage = 0;
                }
            } else if (/看起来.*想杀死你！|你扑向/.test(data.msg)) {
                let match = data.msg.match(/看起来(.*)想杀死你！/) || data.msg.match(/你扑向(.*)/);
                if (Array.isArray(match) && match.length > 1) {
                    let name = match[1];
                    let room = roomData.find(room => room.name && room.name.includes(name));
                    if (room) {
                        GameState.fight.fight_id = room.id;
                    }
                }
            } else if (onekey_fenjie == "开" && (data.msg.indexOf("你将身上的杂物卖了") >= 0 || data.msg.indexOf("你身上的杂物已经清理干净了") >= 0)) {
                // 自动一键分解
                let fjlist = GM_getValue(roleid + "_fenjieList").split(",");
                let pack = GameState.packs.items;
                let cmd = "";
                if (fjlist && fjlist.length > 0) {
                    let cmd0 = "";
                    let cmd1 = "";
                    if (follower_fenjie == '开') {
                        cmd0 = `goto home;go northeast;$wait 200;dc {r${fj_sc}} stopstate;$wait 1000;`
                        let fwork = GameState.relation.follower.find(i => i[0].includes(fj_sc))?.[2];
                        cmd1 = `dc {r${fj_sc}} ${fwork};`
                    };
                    for (let i = 0; i < fjlist.length; i++) {
                        let item = fjlist[i].trim();
                        let match = item.match(/^([\u4e00-\u9fa5]+)(\d*)$|^(\d+)$/);
                        let name = match?.[3] ? null : (match?.[1] || null);
                        let grade = match?.[3] || match?.[2] || null;
                        
                        for (let j = 0; j < pack.length; j++) {
                            if (!pack[j].can_eq||pack[j].locked) continue;
                            let nameMatch = name ? pack[j].name.includes(name) : true;
                            let gradeMatch = grade ? pack[j].grade == grade : true;
                            if (nameMatch && gradeMatch) {
                                let id = pack[j].id;
                                if (follower_fenjie == '开') {
                                    cmd += `give {r${fj_sc}} ${id};dc {r${fj_sc}} fenjie ${id};$wait 600;`;
                                } else {
                                    cmd += `fenjie ${id};$wait 400;`;
                                }
                            }
                        }
                    }
                    if(!cmd)return;
                    if(cmd0)WG.SendCmd(cmd0+cmd+cmd1);
                    else WG.SendCmd(cmd);
                }
            } else if (/你获得了(.*)点经验，(.*)点潜能/.test(data.msg) && funnycalc == '开') {
                let x = data.msg.match(/获得了(.*)点经验，(.*)点潜能/);
                expGained += parseInt(x[1]);
                potGained += parseInt(x[2]);
                $(".content-message pre #total").remove();
                setTimeout(() => messageAppend(`\n共计获得了<hig>${expGained}</hig>点经验和<hig>${potGained}</hig>点潜能。`,1,"totla"), 50);
                // messageAppend(`\n共计获得了<hig>${expGained}</hig>点经验和<hig>${potGained}</hig>点潜能。`,1,"totla")

            } else if (/你从武道秘籍中领悟到了/.test(data.text)) {
                Tips();//武道书读完的提示音
            } else if (data.msg.indexOf("说：") == -1) {
                if (data.msg.indexOf("只能在战斗中使用。") >= 0 || data.msg.indexOf('这里不允许战斗') != -1 || data.msg.indexOf('没时间这么做') != -1) {
                    if (GameState.fight.in_fight) {
                        GameState.fight.in_fight = false;
                        WG.auto_preform("stop");
                        WG.clean_dps();
                    }
                }
                if (data.msg.indexOf("加油，加油！！") >= 0) {
                    if (GameState.fight.in_fight == false) {
                        GameState.fight.in_fight = true;
                        WG.auto_preform();
                    }
                }
                if (data.msg.indexOf("你的内力不够，无法使用") >= 0) {
                    // if (G.fight.in_fight == false) {
                    //     G.fight.in_fight = true;
                    // }
                    if (WG.preform_timer != null) {
                        WG.auto_preform("stop");
                        messageAppend("<hiy>内力不足,停止自动出招", 0)
                    }
                }
            }
        });
        WG.add_hook("roles", function (data) {
            // unsafeWindow.SS_ROLES = data.roles;
            function sendRoles() {
                if (originWindow.source) {
                    originWindow.source.postMessage(data.roles, '*');
                } else {
                    setTimeout(sendRoles, 1000);
                }
            }
            sendRoles();

            setTimeout(() => {
                let loginnum = getQueryVariable("login")
                if (loginnum) {
                    let userList = $('#role_panel > ul > li.content > ul >li');
                    for (let uidx = 0; uidx < userList.length; uidx++) {
                        if (loginnum == uidx + 1) {
                            $(userList[uidx]).addClass("select");
                        } else {
                            $(userList[uidx]).removeClass("select");
                        }
                    }
                    $("li[command=SelectRole]").click()
                    return;
                }
            }, 5000);

        });
    },
    configInit: function () {
        family = GM_getValue(roleid + "_family", family);
        automarry = GM_getValue(roleid + "_automarry", automarry);
        autoBoss = GM_getValue(roleid + "_autoBoss", autoBoss);
        BossName = GM_getValue(roleid + "_BossName", BossName);
        onekey_fenjie = GM_getValue(roleid + "_onekey_fenjie", onekey_fenjie);
        follower_fenjie = GM_getValue(roleid + "_follower_fenjie", follower_fenjie);
        fj_sc = GM_getValue(roleid + "_fj_sc", fj_sc);
        fenjieList = GM_getValue(roleid + "_fenjieList", fenjieList);
        eqgroup = GM_getValue(roleid + "_eqgroup", eqgroup);
        skgroup = GM_getValue(roleid + "_skgroup", skgroup);
        if (family == null) {
            family = $('.role-list .select').text().substr(0, 2)
        }
        unauto_pfm = GM_getValue(roleid + "_unauto_pfm", unauto_pfm);
        auto_pfmswitch = GM_getValue(roleid + "_auto_pfmswitch", auto_pfmswitch);
        auto_pfm_mode = GM_getValue(roleid + "_auto_pfm_mode", auto_pfm_mode);
        busy_info = GM_getValue(roleid + "_busy_info", busy_info);
        buffCD = GM_getValue(roleid + "_buffCD", buffCD);
        skillCD = GM_getValue(roleid + "_skillCD", skillCD);
        saveAddr = GM_getValue(roleid + "_saveAddr", saveAddr);
        auto_relogin = GM_getValue(roleid + "_auto_relogin", auto_relogin);
        rainbow_name = GM_getValue(roleid + "_rainbow_name", rainbow_name);
        getitemShow = GM_getValue(roleid + "_getitemShow", getitemShow);
        zml = GM_getValue(roleid + "_zml", zml);
        ztjk_item = GM_getValue(roleid + "_ztjk", ztjk_item);
        auto_command = GM_getValue(roleid + "_auto_command", auto_command);
        var unpfm = unauto_pfm.split(',');
        for (var pfmname of unpfm) {
            if (pfmname) blackpfm.push(pfmname)
        }
        die_str = GM_getValue(roleid + "_die_str", die_str);
        autowork = GM_getValue(roleid + "_autowork", autowork);
        custom_dock = GM_getValue(roleid + "_custom_dock", custom_dock);
        shieldswitch = GM_getValue("_shieldswitch", shieldswitch);
        shield = GM_getValue("_shield", shield);
        shieldkey = GM_getValue("_shieldkey", shieldkey);
        backimageurl = GM_getValue(roleid + "_backimageurl", backimageurl);
        loginhml = GM_getValue(roleid + "_loginhml", loginhml);
        timequestion = GM_getValue(roleid + "_timequestion", timequestion);
        dpssakada = GM_getValue(roleid + "_dpssakada", dpssakada);
        funnycalc = GM_getValue(roleid + "_funnycalc", funnycalc);
        autoBuyList = GM_getValue(roleid + "_autoBuyList", autoBuyList);
        zdyskilllist = GM_getValue(roleid + "_zdyskilllist", zdyskilllist);
        zdyskills = GM_getValue(roleid + "_zdyskills", zdyskills);
        // 通知推送开关、方式、Token、Url
        pushSwitch = GM_getValue("_pushSwitch", pushSwitch);
        pushType = GM_getValue("_pushType", pushType);
        pushToken = GM_getValue("_pushToken", pushToken);
        //pushUrl = GM_getValue("_pushUrl", pushUrl);
        color_select = GM_getValue("color_select", color_select);
        WG.zdy_btnListInit();

    }
};
