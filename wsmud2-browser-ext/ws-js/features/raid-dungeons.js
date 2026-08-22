// ============================================================
// raid-dungeons.js —— 副本流程数据（从 Raid.js 拆分）
// ------------------------------------------------------------
// 本文件只包含 Dungeons 数组，即游戏中所有内置副本的流程脚本。
// 这是一个纯数据文件，不包含任何逻辑。
// 通过 unsafeWindow.__raidDungeons 暴露给 Raid.js 使用。
// ============================================================
'use strict';

var __raidDungeons = [
    {
        name: "华山论剑",
        source: `
@print 👑 感谢 koyodakla、freesunny 对此副本代码提供的帮助。
jh fb 30 start1;cr huashan/lunjian/leitaixia
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go up
@tip 恭喜你战胜了五绝
@wait 1000
jump bi
get all from {r五绝宝箱}`
    },
    {
        name: "光明顶(组队)",
        source: `
@print 👑 感谢 dtooboss 分享此副本代码。
jh fb 26 start3;cr mj/shanmen 2 0
go north;go west;go northwest
@kill 冷谦
go north
@kill 张中
go north
@kill 周颠
go north;go north
@kill 颜垣
go east
@kill 唐洋
go north
@kill 辛然
go west;go west
@kill 庄铮
go south
@kill 闻苍松
go east;go south
@kill 说不得,彭莹玉
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[2]
@kill 韦一笑,殷天正
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[2]
@kill 张无忌,杨逍,范遥`
    },
    {
        name: "光明顶",
        source: `
@print 👑 感谢 dtooboss 分享此副本代码。
jh fb 26 start1;cr mj/shanmen
go north;go west;go northwest
@kill 冷谦
go north
@kill 张中
go north
@kill 周颠
go north;go north
@kill 颜垣
go east
@kill 唐洋
go north
@kill 辛然
go west;go west
@kill 庄铮
go south
@kill 闻苍松
go east;go south
@kill 说不得,彭莹玉
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[2]
@kill 韦一笑,殷天正
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[2]
@kill 张无忌,杨逍,范遥`
    },
    {
        name: "燕子坞(困难)",
        source: `
jh fb 23 start2;cr murong/anbian 1 0
go east;go east
@kill 包不同
go east;go south;go east;go south;go south
@kill 王夫人
go north;go north;go west;go north
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go east;go east;go east
@kill 慕容复
go west;go north
look pai;bai pai[3]
go north;search
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go south
@kill 慕容博
go east
@kill 阿朱`
    },
    {
        name: "燕子坞(简单)",
        source: `
jh fb 23 start1;cr murong/anbian
go east;go east
@kill 包不同
go east;go south;go east;go south;go south
@kill 王夫人
go north;go north;go west;go north
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go east;go east;go east
@kill 慕容复
go west;go north
look pai;bai pai[3]
go north;search
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go south
@kill 慕容博
go east
@kill 阿朱`
    },
    {
        name: "燕子坞(偷书)",
        source: `
@print 👑 感谢 Airson 分享此副本代码。
jh fb 23 start1;cr murong/anbian
go east;go east
@kill 包不同
go east;go east;go east;go north
look pai;bai pai[3]
go north;search`
    },
    {
        name: "移花宫(困难)",
        source: `
jh fb 22 start2;cr huashan/yihua/shandao 1 0
go south[5]
go south[5]
go south[5]
@kill 花月奴
go south;go south
@kill 移花宫女弟子,移花宫女弟子
($id) = {移花宫女弟子}
[if] (:exist (id)) == true
    $killw 移花宫女弟子
go south
@kill 移花宫女弟子,移花宫女弟子
($id) = {移花宫女弟子}
[if] (:exist (id)) == true
    $killw 移花宫女弟子
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go southeast
@kill 涟星
[if] {r邀月}? != null
    @kill 邀月
[if] {邀月的尸体}? == null
    [if] (_DungeonWaitSkillCD) == 打开
        @cd
go northwest;go southwest
[if] {r邀月}? != null
    @kill 邀月
[if] {b火折子g}? != null
    look hua
    @tip 你数了下大概有($number)朵花
    go southeast
    look bed;pushstart bed
    pushleft bed[(number)]
    @await 1000
    pushright bed[8]
    @await 1000
    go down;fire;go west
    @kill 花无缺
    look xia;open xia`
    },
    {
        name: "移花宫(简单)",
        source: `
jh fb 22 start1;cr huashan/yihua/shandao
go south[5]
go south[5]
go south[5]
@kill 花月奴
go south;go south
@kill 移花宫女弟子,移花宫女弟子
go south
@kill 移花宫女弟子,移花宫女弟子
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go southeast
@kill 涟星
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go northwest;go southwest
@kill 邀月
//[if] {b火折子g}? != null
[if] 1 == 1
    look hua
    @tip 你数了下大概有($number)朵花
    go southeast
    look bed;pushstart bed
    pushleft bed[(number)]
    @await 1000
    pushright bed[8]
    @await 1000
    go down;fire;go west
    @kill 花无缺
    look xia;open xia`


    },
    {
        name: "冰火岛(困难)",
        source: `
@print 👑 感谢 WanJiaQi 分享此副本代码。
jh fb 21 start2;cr mj/bhd/haibian 1 0
go west
@kill 炎龙
go west
@kill 炎龙
go west
@kill 炎龙王
@liaoshang
go west;search
@tip 你找到了
go east[4];go north
@kill 白熊
go north
@kill 白熊
@liaoshang
go north;go west;zuan dong
[if] (_DungeonWaitSkillCD) == 打开
    @cd
@kill 张翠山
@kill 谢逊`
    },
    {
        name: "冰火岛(简单)",
        source: `
@print 👑 感谢 WanJiaQi 分享此副本代码。
jh fb 21 start1;cr mj/bhd/haibian 0 0
go west
@kill 炎龙
go west
@kill 炎龙
go west
@kill 炎龙王
@liaoshang
//go west;search
//@tip 你找到了
go east[3];go north
@kill 白熊
go north
@kill 白熊
@liaoshang
go north;go west;zuan dong
[if] (_DungeonWaitSkillCD) == 打开
    @cd
@kill 谢逊`
    },
    {
        name: "星宿海",
        source: `
jh fb 20 start1;cr xingxiu/xxh6
go northeast
@kill 星宿派
go north
@kill 星宿派
go northwest
@kill 星宿派
go southwest
@kill 星宿派
go south
@kill 星宿派
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north;go northeast;go north
@kill 丁春秋`
    },
    {
        name: "白驼山",
        source: `
jh fb 19 start1;cr baituo/damen
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[4]
@kill 欧阳锋
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go south
@kill 欧阳克,白衣少女
go south[2];go west[3]
@kill 毒蛇
go north
@kill 毒蛇
go north;go north
@kill 蟒蛇`
    },
    {
        name: "白驼山(组队)",
        source: `
jh fb 19 start3;cr baituo/damen 2 0
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[4]
@kill 欧阳锋
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go south
@kill 欧阳克,白衣少女
go south[2];go west[3]
@kill 毒蛇
go north
@kill 毒蛇
go north;go north
@kill 蟒蛇`
    },
    {
        name: "桃花岛(困难)",
        source: `
jh fb 18 start2;cr taohua/haitan 1 0
@until (:path) == taohua/haitan
@taohualin
@wait 1000
go south
@kill 陆乘风
go east;go east
@kill 曲灵风
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go east;go east
@kill 黄药师
go west;go north
@kill 黄蓉`
    },
    {
        name: "桃花岛(简单)",
        source: `
jh fb 18 start1;cr taohua/haitan
@until (:path) == taohua/haitan
@taohualin
@wait 1000
go south
@kill 陆乘风
go east;go east
@kill 曲灵风
go east;go north
ok {黄蓉}
@zhoubotong
@kill 周伯通
look xia;search xia
go east[2]
go northwest;go southeast;go southeast;go northwest
go southwest;go northeast;go northeast;go southwest
@until (:path) == taohua/haitan
@taohualin
@wait 2000
go south;go east
go east;go east;go north
select {黄蓉};give1 {黄蓉}
@kill 黄蓉`
    },
    {
        name: "云梦沼泽(组队)",
        source: `
@print 👑 感谢 leiyulin 分享此副本代码。
jh fb 17 start3;cr cd/yunmeng/senlin 2 0
$wait 500
go east
@kill 巨鳄
go north
@kill 巨鳄,巨鳄
go east
@kill 巨鳄,巨鳄
go west;go north
@kill 巨鳄,巨鳄
look lu;kan lu;go north
@kill 火龙
go north
@kill 火龙
go north
@kill 火龙
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 火龙王`
    },
    {
        name: "云梦沼泽",
        source: `
@print 👑 感谢 leiyulin 分享此副本代码。
jh fb 17 start1;cr cd/yunmeng/senlin
$wait 500
go east
@kill 巨鳄
go north
@kill 巨鳄,巨鳄
go east
@kill 巨鳄,巨鳄
go west;go north
@kill 巨鳄,巨鳄
look lu;kan lu;go north
@kill 火龙
go north
@kill 火龙
go north
@kill 火龙
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 火龙王`
    },
    {
        name: "嵩山",
        source: `
jh fb 16 start1;cr wuyue/songshan/taishi
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north[2]
@kill 十三太保
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go northup;go northeast;go northup[2]
@kill 十三太保,十三太保
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go northup;go north
@kill 十三太保,十三太保,十三太保
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 十三太保,十三太保,十三太保,十三太保
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 左冷禅`
    },
    {
        name: "泰山",
        source: `
jh fb 15 start1;cr wuyue/taishan/daizong
go northup[2]
@kill 玉磬子
go northup[2]
@kill 玉音子
go northup[2]
go northup[2]
@kill 玉玑子`
    },
    {
        name: "衡山",
        source: `
jh fb 14 start1;cr wuyue/henshan/hengyang
go west;go north
@kill 嵩山弟子,嵩山弟子
go north;go north
@kill 费彬
@kill 史登达,丁勉
@kill 刘正风
go south[3];go west[2]
@kill 曲洋,曲非烟
go east[4];go southeast;go south;go east;go south
@kill 莫大`
    },
    {
        name: "青城山",
        source: `
@print 👑 感谢 矮大瓜 分享此副本代码。
jh fb 13 start1;cr wuyue/qingcheng/shanlu
go westup
@kill 青城派弟子,青城派弟子
go north
go northup
go eastup
@kill 青城派弟子,青城派弟子
go northup
@kill 洪人雄
go north[3]
@kill 于人豪
go north
@kill 侯人英,罗人杰
go south
go east
@kill 余人彦
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 余沧海`
    },
    {
        name: "恒山",
        source: `
@print 👑 感谢 .min-A 分享此副本代码。
jh fb 12 start1;cr wuyue/hengshan/daziling
go northup;go northwest;go northwest;go northup;go northup
@kill 不戒和尚,仪琳,哑婆婆
go north;go north
@kill 定静师太,定闲师太,定仪师太

($path)=(:path)
[while] true
    <---
    @until (path)!=(:path)
    ($path)=(:path)
    ($guy) = {r采花大盗 田伯光}?
    [if] (guy) != null
        @kill 采花大盗 田伯光
    [if] {田伯光的尸体}? != null
        [break]
    --->
    go south
    go west
    go north
    go south
    go east
    go east
    go north
    go south
    go west
    go south
    go southdown
    go east
    go southeast
    go northup
    go southdown
    go southeast
    go southdown

    go northup
    go northwest
    go northup
    go southdown
    go northwest
    go northup
    go northup
    go north
    go north`
    },
    {
        name: "五毒教(组队)",
        source: `
@print 👑 感谢 矮大瓜 分享此副本代码。
jh fb 11 start3;cr cd/wudu/damen 2 0
@kill 五毒教徒,五毒教徒,五毒教徒,五毒教徒
go east
@kill 沙千里
go south
@kill 藏獒
go west
@kill 白髯老者
go east
go south
@kill 毒郎中
go north
go north
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 潘秀达,岑其斯,齐云敖
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 何红药
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 何铁手`
    },
    {
        name: "五毒教",
        source: `
@print 👑 感谢 矮大瓜 分享此副本代码。
jh fb 11 start1;cr cd/wudu/damen
@kill 五毒教徒,五毒教徒,五毒教徒,五毒教徒
go east
@kill 沙千里
go south
@kill 藏獒
go west
@kill 白髯老者
go east
go south
@kill 毒郎中
go north
go north
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 潘秀达,岑其斯,齐云敖
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 何红药
[if](_DungeonWaitSkillCD) == 打开
    @cd
go east
@kill 何铁手`
    },
    {
        name: "温府",
        desc: "温府(2k+闪避)",
        source: `
@print 👑 感谢 JiaQi Wan 分享此副本代码。
jh fb 10 start1;cr cd/wen/damen
look tree;climb tree;go north;go northeast
[while] true
    [if] (:path) != cd/wen/zoulang4
        go northeast
    [else]
        [break]
go north[2];go northwest;go north
look zhuang;tiao zhuang
@kill 温方义,温方山,温方施,温方南
[if] {r温家老大 温方达%}? != null
    @kill 温方达
@wait 2000
[if] (_DungeonWaitSkillCD) == 打开
    @cd
look zhuang;tiao zhuang
@until (:path) == cd/wen/xiaoyuan
@wait 500
[if] {r夏雪宜}? != null
    @kill 夏雪宜
go north
@kill 温仪`
    },
    {
        name: "关外",
        source: `
@print 👑 感谢 老实人 分享此副本代码。
jh fb 9 start1;cr bj/guanwai/damen
go northeast
@kill 金雕
go east
@kill 金雕
go southeast
@kill 金雕
go east
@kill 平四
go north
select {r胡斐}
ask {r胡斐} about 阎基
@tip 胡斐说道：阎基是我的杀父仇人($chat)
[if] (chat) == ，
        give {r胡斐} {b阎基的头颅}
        ask {r胡斐} about 胡家刀谱
[if] (_DungeonWaitSkillCD) == 打开
    @cd
@kill 胡斐
go south;go east
@kill 东北虎
go eastup
@kill 东北虎
go southup
@kill 东北虎
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go eastup
@kill 黑熊
go westdown;go northdown;go west[2];go northwest
go west;go southwest;go west
give {r船夫} 10000 money
@until (:room)==关外-船厂(副本区域)
@wait 500
@kill 船夫
go south;go west[5];go north
@kill 江湖医生 阎基`
    },
    {
        name: "神龙教(组队)",
        source: `
jh fb 8 start3;cr bj/shenlong/haitan 2 0;go north
@kill 毒蛇,竹叶青
look bush;kan bush;go north
@kill 毒蛇,竹叶青
go north
@kill 神龙教弟子,神龙教弟子
go north
@kill 神龙教军师 陆高轩
go south;go east
@kill 神龙教青龙使 许雪亭
go east
@kill 神龙教女弟子,神龙教女弟子
go north[2]
@kill 神龙教弟子,神龙教弟子
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 洪安通,张淡月,无根道长`
    },
    {
        name: "神龙教",
        source: `
jh fb 8 start1;cr bj/shenlong/haitan;go north
@kill 毒蛇,竹叶青
look bush;kan bush;go north
@kill 毒蛇,竹叶青
go north
@kill 神龙教弟子,神龙教弟子
go north
@kill 神龙教军师 陆高轩
go south;go east
@kill 神龙教青龙使 许雪亭
go east
@kill 神龙教女弟子,神龙教女弟子
go north[2]
@kill 神龙教弟子,神龙教弟子
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 洪安通,张淡月,无根道长`
    },
    {
        name: "天地会",
        source: `
@print 👑 感谢 jicki 分享此副本代码，感谢 andyfos、mma1996 协助完成。
jh fb 7 start1;cr bj/tdh/hct
@kill 药铺伙计
@kill 天地会青木堂护法 徐天川
go west
@kill 关夫子 关安基
knock;knock;knock
go down
@until {r尸体}? != null
go west[5]
@until {r尸体}? != null
go north
@liaoshang
[if] (_DungeonWaitSkillCD) == 打开
    @cd
@kill 陈近南
go east
get {r一}?
@wait 500
get {r一}?
go west
go north
go east
@tip 拔刀相助，贫尼感激不尽。
@wait 1000
select {r神尼};cha {r神尼}
@wait 1000
@kill 独臂神尼`
    },
    {
        name: "鳌拜府",
        source: `
@print 👑 感谢 Jeaepan 分享此副本代码。
jh fb 6 start1;cr bj/ao/damen
@kill 官兵,官兵
go west
@kill 吴之荣
go north
@kill 厨师
go south;go west
@kill 家将,家将,女管家
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go west
@kill 满洲第一勇士 鳌拜
go east;go north
look shu;open shu
@tip 发现扉页的($pos)下角被鳌拜写了一个大大的杀字
look hua
$wait 500
[if] (pos) == 左
    tleft hua
[if] (pos) == 右
    $wait 500
    tright hua
go north
select {r四十二章经g}?
get {r四十二章经g}?
go south;go south
($open) = 没开
look men;unlock men
@tip 你用一把钥匙($open)了牢房门|你不会撬锁
[if] (open) == 打开
    go south
    select {r庄允城}?
    ask {r庄允城}? about 吴之荣
    @kill 庄允城`
    },
    {
        name: "庄府",
        source: `
@print 👑 感谢 qwer68588 分享此副本代码。
jh fb 5 start1;cr bj/zhuang/xiaolu
go north
@kill 土匪
go north
look men;break men
go north
@kill 神龙教弟子,神龙教弟子
go north
@kill 神龙教弟子
@kill 神龙教小头目 章老三
go west
@kill 神龙教弟子
go east;go east
@kill 神龙教弟子`
    },
    {
        name: "兵营",
        source: `
@print 👑 感谢 qwer68588 分享此副本代码。
jh fb 4 start1;cr yz/by/damen
@kill 官兵,官兵
$wait 1000
@liaoshang
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go south
@kill 官兵,官兵,官兵,武将,武将,史青山
$wait 1000
look men;open men
go south;search`
    },
    {
        name: "流氓巷(组队)",
        source: `
jh fb 2 start3;cr yz/lmw/xiangzi1 2 0
@kill 小流氓,小流氓
go east
@kill 流氓,流氓
go north
@kill 流氓头,流氓,流氓
go south;go east
@kill 流氓,流氓
go east
@kill 流氓头领`
    },
    {
        name: "流氓巷",
        source: `
jh fb 2 start1;cr yz/lmw/xiangzi1
@kill 小流氓,小流氓
go east
@kill 流氓,流氓
go north
@kill 流氓头,流氓,流氓
go south;go east
@kill 流氓,流氓
go east
@kill 流氓头领`
    },
    {
        name: "丽春院",
        source: `
jh fb 3 start1;cr yz/lcy/dating
@kill 韦春芳
go up
@kill 龟公
go west
@kill 史松
look tai;tui tai;go enter
@kill 茅十八`
    },
    {
        name: "财主家(困难)",
        source: `
jh fb 1 start2;cr yz/cuifu/caizhu 1 0
@kill 大狼狗,大狼狗
go north
@kill 管家,家丁,家丁
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 财主 崔员外
($open) = 没开
look men;open men
@tip 你不会撬锁|钥匙($open)了秘门
[if] (open) == 打开
    go east
    ok {丫鬟}
    go west;go south;go south
    ok {丫鬟}?
    go north;go north;go west
    select {财主女儿 崔莺莺};ask {财主女儿 崔莺莺} about 东厢
[else]
    go west
@kill 财主女儿 崔莺莺
[if] (open) == 打开
    go east;go east;look gui;search gui`
    },
    {
        name: "财主家(简单)",
        source: `
jh fb 1 start1;cr yz/cuifu/caizhu
@kill 大狼狗,大狼狗
go north
@kill 管家,家丁,家丁
[if] (_DungeonWaitSkillCD) == 打开
    @cd
go north
@kill 财主 崔员外
($open) = 没开
look men;open men
@tip 你不会撬锁|钥匙($open)了秘门
[if] (open) == 打开
    go east
    ok {丫鬟}
    go west;go south;go south
    ok {丫鬟}?
    go north;go north;go west
    select {财主女儿 崔莺莺};ask {财主女儿 崔莺莺} about 东厢
[else]
    go west
@kill 财主女儿 崔莺莺
[if] (open) == 打开
    go east;go east;look gui;search gui` }
];

// 暴露给 Raid.js 使用
try {
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.__raidDungeons = __raidDungeons;
    } else if (typeof window !== 'undefined') {
        window.__raidDungeons = __raidDungeons;
    }
} catch (e) { }