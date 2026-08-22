// ============================================================
// ui.js —— 界面生成
// ------------------------------------------------------------
// 负责生成各种界面 HTML：
//   UI.wgui        主界面（快捷操作栏等）
//   UI.syssetting  系统设置面板
//   UI.zmlsetting  自命令设置面板
//   UI.ztjksetting 状态监控设置面板
//   UI.timeoutui   定时任务界面
//   UI.zdybtnui    自定义按钮界面
//   UI.fastjinglian 精炼滑块控件
//   UI.codeInput   游戏内命令行输入框（main-ready 里挂到页面上的那个）
// 想改界面上的文字/按钮 → 在本文件搜索对应 UI.xxx。
// ============================================================
// ui.js
// UI interface and fast jinglian
'use strict';

//UI
var UI = {
    codeInput: `<div class="runtest layui-layer-wrap" style="display: none;">
                    <textarea class="site-demo-text" id="testmain" data-enpassusermodified="yes">
                    </textarea>
                    <a class="layui-btn layui-btn-normal runtesta" style="position:absolute;right:20px;bottom:20px"  >运行</a>
                 </div>`,
    zdybtnui: function () {
        let ui = `<div class='WG_button'>`;
        let keyitem = ["Q", "W", "E", "R", "T", "Y"];
        let i = 0;
        for (let item of zdy_btnlist) {
            if (item.name !== '无' && item.name !== '') {
                ui = ui + ` <span class='zdy-item' id = 'keyin${keyitem[i]}'>${item.name}(${keyitem[i]})</span>`;
            }
            i = i + 1;
        }
        return ui + `<span class="zdy-item auto_perform" style="float:right;"> 自动攻击 </span>
            <span class="zdy-item cmd_echo" style="float:right;">代码</span> </div>`;
    },
    btnui: function () {
        return `<div class='WG_button'>
        <span class="zdy-item auto_perform" style="float:right;"> 自动攻击 </span>
            <span class="zdy-item cmd_echo" style="float:right;">代码</span> </div>`
    },
    wgui: function () {
        let p;
        if (inzdy_btn) {
            p = UI.zdybtnui();
        } else {
            p = UI.btnui();
        }
        return `
            <div class='WG_log'>
                <pre></pre>
            </div>
            <div class='WG_log_log'>
                <div class="WG_log_log_title"><span>日志</span><span class="wlg-btn" data-act="clear">清除日志</span><span class="wlg-btn" data-act="reset">重置统计</span></div>
                <pre></pre>
            </div>` + p;
    },
    cleandataui: function() {
        return `
            <div class="setting-item" >
                <div class="item-commands"><span class="dps">清空战斗统计</span></div>
            </div>
            <div class="setting-item" >
                <div class="item-commands"><span class="getjy">清空累积经验</span></div>
            </div>
            <div class="setting-item" >
                <div class="item-commands"><span class="getitem">清空获得物品</span></div>
            </div>
        `
    },
    zdyBtnsetui: function () {
        let ui = '';

        let keyitem = ["Q", "W", "E", "R", "T", "Y"];
        for (let item of keyitem) {
            ui = ui + `<div class="setting-item setting-item2 ">
             <div style='width:10%'>${item}:</div><span>名称:<input style='width:20%' id='name${item}' /></span> <span style='margin-left:5px'>命令:<input id='send${item}'/></span>
            </div>`
        }
        ui = ui + `
                     <div class="setting-item" >
            <div class="item-commands"><span class="savebtn">保存自定义按钮设置</span></div>
                    </div>
        `;
        return ui;
    },
    html_lninput: function (prop, title) {
        return `
          <div class="setting-item" >
            <span><label for="${prop}">${title}</label><input id="${prop}" name="${prop}" type="text" style="width:80px" value>
            </span>        </div> `;
    },
    html_input: function (prop, title, width = '50%') {
        return `
             <div class="setting-item" >
            <span><label for="${prop}"> ${title}</label> </span>
          </div>
          <textarea class="settingbox hide zdy-box" id="${prop}" name="${prop}" style="display: inline-block; width: ${width};">  </textarea>
        `;
    },

    html_switch: function (prop, title, pfor) {
        return `<div class="setting-item setting-item2 " for="${pfor}" style='display: inline-block;'>
            <span class="title"> ${title}</span>
            <span class="switch2" id="${prop}" >
            <span class="switch-button"></span>
            <span class="switch-text">关</span>
            </span>
            </div>
            `;
    },
    switchClick: function (e) {
        let t = $(this),
            s = t.parent().attr("for");
        if (t.is(".on")) {
            t.removeClass("on");
            t.find(".switch-text").html("关")
        } else {
            t.addClass("on");
            t.find(".switch-text").html("开");
        }
    },
    syssetting: function () {
        return `
        <h3>插件</h3>
        <div class="setting-item zdy_dialog" >武神传说2插件扩展自制版</div> 
        `+
            `
            <div class="setting-item" >
            <span><label for="family">门派选择：</label><select id="family" style="width:80px">
                    <option value="武当">武当</option>
                    <option value="华山">华山</option>
                    <option value="少林">少林</option>
                    <option value="峨眉">峨眉</option>
                    <option value="逍遥">逍遥</option>
                    <option value="丐帮">丐帮</option>
                    <option value="武馆">武馆</option>
                    <option value="杀手楼">杀手楼</option>
                </select>
            </span>
            </div>`

            + UI.html_switch('autorelogin', '自动重连: ', 'auto_relogin')
            + UI.html_switch('autorecover', '重连失败后自动刷新重登: ', 'auto_recover')
            + `
            <div class="setting-item" style="color:#888;font-size:11px;text-align:center;">自动重连仍失败(约13分钟)后刷新页面并自动重新登录，24小时内最多5次，防止无人值守时号挂死</div>`
            + UI.html_switch('dpssakada', '战斗统计:', 'dpssakada')
            + UI.html_switch('funnycalc', '经验统计:', 'funnycalc')
            + UI.html_switch('keepalive', '后台保活(防挂机延迟): ', 'keepalive')
            + UI.html_switch('rainbowname', '彩虹名字: ', 'rainbow_name')
            + UI.html_lninput("loginhml", "登录后执行命令：", "95%")
            + `
            <div class="setting-item">
            <span> <label for="autowork"> 挂机选项($zdwk) </label><select id="autowork" style="width:60px">
                <option value="0"> 挖矿 </option>
                <option value="1"> 修炼 </option>
                <option value="2"> 钓鱼 </option>
            </select>
            </span></div> `

            + `<h3>显示配置</h3>`
            + UI.html_switch('busyinfo', '显示昏迷信息：', 'busy_info')
            + UI.html_switch('skillCD', '显示技能CD：', 'skillCD')
            + UI.html_switch('buffCD', '显示BuffCD：', 'buffCD')
            + UI.html_switch('getitemShow', '显示获得物品：', 'getitemShow')
            // 【2026-08-12 移植作者 f45137e】技能CD/BuffCD 颜色下拉
            + `
            <div class="setting-item" >
            <span> <label for="skillCDColor"> 技能CD颜色： </label><select id="skillCDColor" style="width:80px">
                <option value="hir"> 红色 </option>
                <option value="hig"> 绿色 </option>
                <option value="hiy"> 黄色 </option>
                <option value="hic"> 青色 </option>
                <option value="hiz"> 蓝色 </option>
                <option value="hio"> 橙色 </option>
                <option value="wht"> 白色 </option>
            </select>
            </span></div> `
            + `
            <div class="setting-item" >
            <span> <label for="buffCDColor"> BuffCD颜色： </label><select id="buffCDColor" style="width:80px">
                <option value="hir"> 红色 </option>
                <option value="hig"> 绿色 </option>
                <option value="hiy"> 黄色 </option>
                <option value="hic"> 青色 </option>
                <option value="hiz"> 蓝色 </option>
                <option value="hio"> 橙色 </option>
                <option value="wht"> 白色 </option>
            </select>
            </span></div> `
            + `
            <div class="setting-item" >
            <span> <label for="zmlshowsetting"> 自命令显示位置： </label><select id="zmlshowsetting" style="width:80px">
                <option value="0"> 物品栏 </option>
                <option value="1"> 技能栏下方 </option>
            </select>
            </span></div> `

           
            + `<h3>自动BOSS、喜宴配置</h3>`
            + UI.html_switch('marry_kiss', '自动喜宴：', "automarry")
            + UI.html_switch('autoBoss', '自动领取boss', "autoBoss")
            + UI.html_lninput("BossName", "输入自动领取的boss名称")
            + UI.html_lninput("auto_command", "输入喜宴、boss后命令(留空为自动挖矿或修炼)：", "95%")
        
            + `<h3>自动买符与活动轮询</h3>`
            + UI.html_switch('autobuytalisman', '进游戏自动买符：', 'auto_buy_talisman')
            + `
            <div class="setting-item">
            <span> <label for="event_poll_interval"> 定时轮询活动间隔时间（分钟）： </label><input id="event_poll_interval" type="number" min="1" style="width:60px" value="1">
            </span></div> `

            + `<h3>挂机健康自检</h3>`
            + UI.html_switch('healthcheck', '定时检查页面卡顿隐患(每5分钟)：', 'healthcheck_enabled')
            + `
            <div class="setting-item" style="color:#888;font-size:11px;text-align:center;">自动裁剪超长日志、检查消息积压/页面节点/存储占用，发现问题会提示</div>`

            + `<h3>自动施法配置</h3>`
            + UI.html_switch('autopfmswitch', '自动施法开关：', 'auto_pfmswitch')
            + UI.html_switch('autopfmmode', 'AI施法模式：', 'auto_pfm_mode')
            + UI.html_input("unauto_pfm", "自动施法黑名单(填技能代码，使用半角逗号分隔)：", "95%")

            + `<h3>仓库存储配置</h3>`
            + UI.html_input("autoBuy", "自动当铺购买清单：(用半角逗号分隔)", "95%")
            // 【2026-08-09 移植v1.0.0】自动售卖/自动使用清单（执行入口在游戏内命令，不在设置面板）
            + UI.html_input("autoSell", "自动售卖清单(物品名称，半角逗号分隔，模糊匹配)：", "95%")
            + UI.html_input("autoUse", "自动使用清单(物品名称，半角逗号分隔，模糊匹配)：", "95%")

            + `<h3>自动分解配置</h3>`
            + UI.html_switch('fj_onekey', '开启一键分解', "onekey_fenjie")
            + UI.html_switch('fj_follower', '启用随从分解', "follower_fenjie")
            + UI.html_lninput('fj_sc', '分解随从名')
            + UI.html_input("fjList", "输入自动分解的装备名字和级别(如'千斤拳2'，无名字或级别会全匹配，用半角逗号分隔)","95%")
            
            + `<h3>杂项配置</h3>`
            + UI.html_lninput("die_str", "死亡提示： ")
            + UI.html_lninput("custom_dock", "抬高高度（px）： ")
            // 【2026-08-14 跨窗口同步】全局设置（屏蔽/推送/保活等 _ 开头键）变更时广播到所有游戏窗口（默认关）
            + UI.html_switch('ext_sync_global', '跨窗口同步全局设置(默认关)：', 'ext_sync_global')
            + `
            <div class="setting-item">
            <span> <label for="color_select"> 界面配色： </label><select id="color_select" style="width:80px">
                <option value="normal"> 原版 </option>
                <option value="flat"> flat模式 </option>
                <option value="access"> 色若模式</option>
            </select> *此功能刷新后生效
            </span></div>`

            + `<h3>屏蔽选项</h3>`
            + UI.html_switch('shieldswitch', '聊天频道屏蔽开关: ', 'shieldswitch')
            + UI.html_lninput("shield", "屏蔽人物名(用半角逗号分隔)：")
            + UI.html_lninput("shieldkey", "屏蔽关键字(用半角逗号分隔)：")

            + `<h3>推送配置</h3>`
            + UI.html_switch('pushSwitch', '远程通知推送开关(使用@push推送通知，语法参考@print)：', 'pushSwitch')
            + `
            <div class="setting-item">
            <span> <label for="pushType"> 通知推送方式(使用方法加群看)： </label><select id="pushType" style="width:80px">
                <option value="0"> Server酱(限32字符) </option>
                <option value="1"> Bark iOS </option>
                <option value="2"> PushPlus.plus(支持html标签) </option>
                <option value="3"> 飞书机器人 </option>
                <option value="4"> Qmsg私聊 </option>
                <option value="5"> Qmsg群聊 </option>
                <option value="6"> 企业微信机器人 </option>
            </select>
            </span></div> `
            + UI.html_lninput("pushToken", "推送方式对应的Token或Key(只要Key不要填整个网址)：")
            + UI.html_switch('pushDeath', '死亡推送(角色死亡/复活时自动推送)：', 'pushDeath')
            + `
            <div class="setting-item" style="color:#888;font-size:11px;text-align:center;">开启后除手动 @push 外，掉线重连失败/角色死亡/长时间无消息等关键事件也会自动推送到手机（同类事件15分钟内最多1次）</div>`
            // 【2026-08-14 测试推送按钮】一键验证当前渠道/Token 是否可用
            + `
            <div class="setting-item">
                <div class="item-commands"><span class="push_test_btn">测试推送</span></div>
            </div>`
        //+ UI.html_lninput("pushUrl", "推演方式对应的推送网址(末尾不要加斜杠/)：")

            + `<h3>发呆检测</h3>`
            + UI.html_switch('idleCmdSwitch', '发呆检测开关(角色发呆超过设定秒数时自动执行命令)：', '_idleCmdSwitch')
            + UI.html_lninput("idleCmdSeconds", "发呆秒数阈值(超过此秒数触发)：")
            + UI.html_lninput("idleCmdContent", "触发时执行的命令(如 @liaoshang；留空只发提醒)：")

            + `<h3>技能自定义</h3>`
            + UI.html_switch('zdyskillsswitch', '自定义技能顺序开关：', 'zdyskills')

            + UI.html_input("zdyskilllist", "自定义技能顺序json数组：", "95%")
            + ` <div class="setting-item" ><div class="item-commands"><span class="clear_skillJson">清空技能json数组</span></div></div>`
            + `<h3>自定义按钮</h3>`
            + UI.zdyBtnsetui() +
            ` <h3>系统</h3> `
            // 【2026-08-09 移植v1.0.0】上传/下载/恢复默认配置按钮
            + `
            <div class="setting-item" >
                <div class="item-commands">
                    <span class="backup_btn">上传配置</span>
                    <span class="load_btn">下载配置</span>
                    <span class="reset_default_btn" style="border-color:#e74c3c;color:#e74c3c;">恢复默认设置</span>
                </div>
            </div>
            <div class="setting-item" style="color:#888;font-size:11px;text-align:center;">上传/下载配置用于跨角色同步（含游戏自带拓展设置），恢复默认仅重置当前角色设置</div>
            <!-- 【2026-08-11 自动备份】本地自动备份入口：配置每天自动备份，损坏时可恢复 -->
            <div class="setting-item">
                <div class="item-commands">
                    <span class="backup_now_btn">立即备份</span>
                    <span class="restore_backup_btn" style="border-color:#e67e22;color:#e67e22;">恢复备份</span>
                </div>
                <div style="color:#888;font-size:11px;text-align:center;margin-top:2px;" id="ext-backup-info">配置每天自动备份到本地，设置损坏时可一键恢复</div>
            </div>
            <!-- 【2026-08-13 存储清理】孤儿键扫描 + 备份清理（角色删除/改名后残留的配置键） -->
            <div class="setting-item">
                <div class="item-commands">
                    <span class="scan_orphan_btn">扫描孤儿键</span>
                    <span class="clean_orphan_btn" style="border-color:#e74c3c;color:#e74c3c;">备份并清理</span>
                </div>
                <div style="color:#888;font-size:11px;text-align:center;margin-top:2px;" id="ext-orphan-info">角色删除/改名后残留的配置键，可一键扫描清理（清理前自动备份，可恢复）</div>
            </div>
            `
    },


    zmlsetting: `<div class='zdy_dialog' style='text-align:right;width:280px' id="zmldialog">
<div class="setting-item"><span><label for="zml_name"> 输入自定义命令名称:</label></span><span><input id="zml_name"
            style='width:80px' type="text" name="zml_name" value="" v-model="singnalzml.name"></span></div>
<div class="setting-item"> <label for="zml_type"> 自命令类型： </label><select id="zml_type" style="width:80px"
        v-model="singnalzml.zmlType">
        <option value="0"> 插件原生 </option>
        <option value="1"> Raidjs流程 </option>
        <option value="2"> JS原生 </option>
    </select> </div>
<div class="setting-item"> <label for="zml_info"> 输入自定义命令(用半角分号(;)分隔):</label></div>
<div class="setting-item"><textarea class="settingbox hide zdy-box" style="display: inline-block;" id='zml_info'
        v-model="singnalzml.zmlRun"></textarea></div>
<div class="item-commands"><span class="getSharezml" @click="getShare"> 查询分享 </span> <span class="editadd"
        @click="add"> 保存 </span> <span class="editdel" @click="del"> 删除 </span> </div>
<div class="item-commands" id="zml_show">
    <span v-for="(item, index) in zmldata" @click="edit(item)">
        编辑{{item.name}}
    </span>
    <br />
    <span v-for="(item, index) in zmldata" @click="showp(item)">
         <label v-if="item.zmlShow == '1'">取消快速使用</label><label v-else>快速使用</label>{{item.name}}
    </span>
    <br />
    <span v-for="(item, index) in zmldata" @click="share(item)">
        分享{{item.name}}
    </span>
    <br />
</div>
</div> `,




    zmlandztjkui: `<div class='zdy_dialog' style='text-align:right;width:280px' id="zmlandztjk">
 <div class="item-commands"> <span class="editzml" @click="zml"> 编辑自命令 </span> </div>
 <div class="item-commands"> <span class="editztjk" @click="ztjk"> 编辑自定义监控 </span>
     <div class="item-commands"> <span class="startzdjk" @click="startjk"> 注入所有监控 </span> <span class="stopzdjk"
             @click="stopjk"> 暂停所有监控
         </span>
     </div>
 </div>
 <div class="item-commands" id="zml_show">
             <span v-for="(item, index) in zmldata" @click="run(item)">
                 {{item.name}}
             </span>
 </div>
 </div>`, ztjksetting: `<div class='zdy_dialog' style='text-align:right;width:280px'>
<div class="setting-item"> <label> 监控脚本引擎：在这里，你可以编写JS代码来处理任何游戏事件。</label></div>
<div class="setting-item"> <label for="ztjk_name"> 监控名称:</label><input id="ztjk_name" style='width:150px' type="text"
        name="ztjk_name" value=""></div>
        
<div class="setting-item"><span><label for="ztjk_script"> 监控脚本 (传入参数为 data, 可用全局变量 G, WG, T):</label></span></div>
<div class="setting-item"> <textarea class="settingbox hide zdy-box" style="display: inline-block; width: 260px; height: 120px;"
        id='ztjk_script'></textarea></div>

<div class="item-commands"><span class="ztjk_sharedfind"> 查询分享 </span> <span class="ztjk_editadd"> 保存 </span> <span
        class="ztjk_editdel"> 删除 </span></div>
<div class="item-commands" id="ztjk_show"></div>
<div class="item-commands" id="ztjk_set"></div>
</div> `,
    timeoutui: `<div class='zdy_dialog' style='text-align:right;width:280px'> 注意,可以留空的时或者分,这样就是每分钟/小时 的x秒触发任务,秒为必填项目 <div class="setting-item">    <span>任务名:<input type="text" id="questname" placeholder="任务名" style="width:50%"></span></div> <div class="setting-item">     <label for = "rtype"> 运行次数 </label><select style='width:80px' id="rtype"></div> <option value="1">一次</option> <option value="2">每天</option> </select></span></div> <div class="setting-item">  <span>时:<input type="number" id="ht" placeholder="时" style="width:50%"></span></div> <div class="setting-item">   <span>分:<input type="number" id="mt" placeholder="分" style="width:50%"></span></div> <div class="setting-item">  <span>秒:<input type="number" id="st" placeholder="秒" style="width:50%"></span></div> <div class="setting-item">  <span><label for="zml_info"> 输入自定义命令(用半角分号(;)分隔):</label></span></div> <div class="setting-item">   <textarea class = "settingbox hide zdy-box"style = "display: inline-block;"id = 'zml_info'></textarea></div> <div class = "item-commands"> <span class = "startQuest"> 开始 </span><span class = "removeQuest"> 删除 </span>  </div> <div class='questlist item-commands'></div> </div>`,
    toui: [
        `<div class='item-commands'>
        <span cmd = "$to 扬州城-当铺" > 当铺 </span>
        <span cmd = "$to 后勤"> 后勤 </span>
        <span cmd = "$to 师父"> 师父 </span>
        <span cmd = "$to 扬州城-钱庄" > 仓库 </span>
        <span cmd = "$to 少林派-西侧殿" > 木头人 </span></div>`,
        /*`<div class='item-commands'>
        <span cmd = "$gogzm">古宗门</span>
        <span cmd = "$godddb">大殿底部</span></div>`*/
    ],
    fbui: function (name, mulit, diffi) {
        let ui = `<div class='item-commands'>`;
        if (unsafeWindow && unsafeWindow.ToRaid) {
            if (ToRaid.existAutoDungeon(`${name} 0`)) {
                ui = ui + `<span cmd = "@fb ${name} 0" >自动副本-${name}</span>`;
            }
            if (diffi) {
                if (ToRaid.existAutoDungeon(`${name} 1`)) {
                    ui += `<span cmd = "@fb ${name} 1" >自动副本-${name}-困难</span>`;
                }
            }
            if (mulit) {
                if (ToRaid.existAutoDungeon(`${name} 2`)) {
                    ui += `<span cmd = "@fb ${name} 2" >自动副本-${name}-组队</span>`;
                }
            }
        } else {
            ui += `未安装Raid.js插件`;
        }
        if (ui == `<div class='item-commands'>`) {
            return `<div>暂无自动副本脚本,欢迎共享。</div>`
        } else {
            return ui + `</div>`;
        }

    },
    itemui: function (itemname) {
        itemname = itemname.toLowerCase();
        let ui = `<div class="item-commands ">`;
        if (itemname.indexOf("★") >= 0 || itemname.indexOf("☆") >= 0) {
            ui = ui + '</div>';
        } else if (itemname.indexOf("残页") >= 0 && itemname != "武道残页"){
            ui = ui + `<span class = "addzxbuy"  cmd='$addzxbuy ${itemname}'> 添加到回收 </span>`;
        }
        ui = ui + `</div>`;
        return ui;
    },
    xiangqianui: function (id) {
        return `<div class="item-commands "><span cmd="unxiangqian ${id}" style="color: #00FFFF"> 取消镶嵌 </span></div>`;
    },
    jinglianui: function (id) {
        return `<div id="fastjinglian" style="display: flex; flex-direction: column; line-height: normal;"><div style="display: flex; align-items: center; gap: 4px;"><div id="jinglian-slider" style="flex: 1; min-width: 0; height: 32px; display: flex; align-items: center; position: relative;"><input type="range" min="0" max="12" step="1" value="0" id="jinglian-slider-input" style="width: 100%; height: 8px; outline: none;"></div><div id="jinglian-slider-number" style="min-width: 2.5em; text-align: center; font-weight: bold;color: #FF4500"></div></div><div style="display: flex; justify-content: space-between; align-items: center; padding: 0px 4px; margin: 0; flex-wrap: wrap;"><div style="display: flex; align-items: center; gap: 4px"><span>⟶</span><span class="item-commands"><span id="jinglian-preview"></span></span></div><div style="flex: 0 0 auto; line-height: 0;"><span id="jinglian-cost" style="font-size: 14px;;"></span><span style="font-size: 14px;color: #00FF00">&nbsp;玄晶</span></div></div></div><div class="item-commands" style="padding: 4px 16px;"><span cmd="unjinglian ${id}" style="color: #00FFFF">取消精炼</span></div>`;
    },

}
function fastjinglian (jlname, jlid) {
    // 匹配颜色
    let colormatch = jlname.match(/^<([^>]+)>/);
    let jl_color = colormatch ? colormatch[1].toLowerCase() : '';

    // 去除颜色标签
    let pureText = jlname.replace(/<[^>]+>/g, '');
    // 去除星星
    let lastname = pureText.replace(/^[★☆]+/, '');

    // 匹配星星
    let starsmatch = pureText.match(/^([★☆]+)/);
    let jl_stars = starsmatch ? starsmatch[1] : '';
    // 计算精炼等级
		let jl_times = 0;
    for (const s of jl_stars) {
            jl_times += s === '★' ? 2 : 1;
        }

		let xuanjing = 0
		for (let i = 0; i < GameState.packs.items.length; i++) {
			if (GameState.packs.items[i].name == "<hig>玄晶</hig>") {
				xuanjing = GameState.packs.items[i].count
				break
			}
		}
		// 获取元素内容
		const jinglianCost = document.getElementById("jinglian-cost");
		const jinglianPreview = document.getElementById("jinglian-preview");
		const jinglianSliderNumber = document.getElementById("jinglian-slider-number");
		const jinglianPreviewContent = document.createElement(jl_color);
		jinglianPreviewContent.textContent = jl_stars + lastname;
		jinglianPreview.appendChild(jinglianPreviewContent);
		let previewJinglianTimes = jl_times;
		// 滑动条事件
		const jinglianSliderInput = document.getElementById("jinglian-slider-input");
		jinglianSliderInput.addEventListener("click", (event) => {
			event.stopPropagation()
		});
		jinglianSliderInput.value = jl_times.toString();

		let jl_level = (function() {
			const jlgrade = [{
				color: "wht",
				cost: 0
			}, {
				color: "hig",
				cost: 2
			}, {
				color: "hic",
				cost: 4
			}, {
				color: "hiy",
				cost: 6
			}, {
				color: "hiz",
				cost: 8
			}, {
				color: "hio",
				cost: 10
			}, ];
			for (let grade of jlgrade) {
				if (jl_color === grade.color) {
					return grade
				}
			}
			return null
		})();
		function CalculateCost(times) {
			return jl_level.cost * (2 ** times - 1)
		}

		function UpdatePreview() {
			jinglianSliderNumber.textContent = `+${previewJinglianTimes}`;
			const alreadyCost = CalculateCost(jl_times);
			const previewCost = CalculateCost(previewJinglianTimes);
			if (previewJinglianTimes < jl_times) {
				jinglianCost.textContent = `${xuanjing}+${alreadyCost-previewCost}`;
				jinglianCost.style.color = "#00FFFF";
				jinglianPreview.setAttribute("cmd", ("#unjinglian " + jlid + ";" + ("jinglian " + jlid + " ok;").repeat(previewJinglianTimes)).slice(0, -1));
				jinglianPreview.style.cursor = "pointer"
			} else if (previewJinglianTimes === jl_times) {
				jinglianCost.textContent = `${xuanjing}`;
				jinglianCost.style.color = "#C0C0C0";
				jinglianPreview.removeAttribute("cmd");
				jinglianPreview.style.cursor = "default"
			} else if (previewJinglianTimes > jl_times) {
				jinglianCost.textContent = `${xuanjing}-${previewCost-alreadyCost}`;
				if (xuanjing >= (previewCost - alreadyCost)) {
					jinglianCost.style.color = "#00FF00";
					if (previewJinglianTimes >= 12) {
						jinglianPreview.setAttribute("cmd", "#jinglian " + jlid + " full")
					} else {
						jinglianPreview.setAttribute("cmd", (("#jinglian " + jlid + " ok;").repeat(previewJinglianTimes - jl_times)).slice(0, -1))
					}
					jinglianPreview.style.cursor = "pointer"
				} else {
					jinglianCost.style.color = "#800000";
					jinglianPreview.removeAttribute("cmd");
					jinglianPreview.style.cursor = "not-allowed"
				}
			}
			jinglianPreviewContent.textContent = "★".repeat(Math.floor(previewJinglianTimes / 2)) + "☆".repeat(previewJinglianTimes % 2) + lastname
		}
		UpdatePreview();
		jinglianSliderInput.addEventListener("input", (event) => {
			previewJinglianTimes = parseInt(event.target.value);
			UpdatePreview()
		});
	}
