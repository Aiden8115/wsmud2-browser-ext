
// ============================================================
// 武神2综合工具网页版.js —— 独立工具网页的交互逻辑
// ------------------------------------------------------------
// 这个网页是扩展自带的"综合工具"（右键/插件里打开），
// 独立于游戏运行，提供各种攻略查询、数据查询等功能。
// 数据（副本攻略等）在同目录的 武神2综合工具网页版-data.js 里。
// ============================================================

// 移动端菜单逻辑
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const mobileMenuMask = document.getElementById('mobileMenuMask');
mobileMenuBtn && mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('-translate-x-full');
    mobileMenuMask.classList.remove('hidden');
});
mobileMenuClose && mobileMenuClose.addEventListener('click', () => {
    mobileMenu.classList.add('-translate-x-full');
    mobileMenuMask.classList.add('hidden');
});
mobileMenuMask && mobileMenuMask.addEventListener('click', () => {
    mobileMenu.classList.add('-translate-x-full');
    mobileMenuMask.classList.add('hidden');
});
document.querySelectorAll('.mobile-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('.sidebar-item').forEach(i => {
            if (i.getAttribute('data-target') === targetId) i.click();
        });
        mobileMenu.classList.add('-translate-x-full');
        mobileMenuMask.classList.add('hidden');
    });
});

// 1. 侧边栏展开/收缩功能
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
const fullTexts = document.querySelectorAll('.full-text');
const shortTexts = document.querySelectorAll('.short-text');
let isExpanded = false;

toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
        // 展开：宽度增加到192px，显示完整文字，隐藏简写
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-48');
        fullTexts.forEach(text => text.classList.remove('hidden'));
        shortTexts.forEach(text => text.classList.add('hidden'));
        toggleBtn.querySelector('.full-text').textContent = '收缩';
        toggleBtn.querySelector('.full-text').classList.remove('hidden');
        toggleBtn.querySelector('.short-text').classList.add('hidden');
    } else {
        // 收缩：宽度恢复到80px，显示简写，隐藏完整文字
        sidebar.classList.remove('w-48');
        sidebar.classList.add('w-20');
        fullTexts.forEach(text => text.classList.add('hidden'));
        shortTexts.forEach(text => text.classList.remove('hidden'));
        toggleBtn.querySelector('.full-text').textContent = '展开';
        toggleBtn.querySelector('.full-text').classList.add('hidden');
        toggleBtn.querySelector('.short-text').classList.remove('hidden');
    }
});

// 2. 导航项点击切换内容板块
const sidebarItems = document.querySelectorAll('.sidebar-item');
const contentSections = document.querySelectorAll('.content-section');
const introSection = document.getElementById('intro');

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        // 移除所有激活状态
        sidebarItems.forEach(i => i.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        introSection.classList.add('hidden'); // 默认隐藏欢迎页

        // 激活当前选中项和对应内容
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        if (targetId === 'intro') {
            introSection.classList.remove('hidden');
        } else {
            document.getElementById(targetId).classList.add('active');
        }
    });
});

// 板块1：计算工具
const tableBody = document.getElementById('calculationTable');
const rows = tableBody.querySelectorAll('tr');

// 记录每行的激活输入类型（'e'或'result1'）
const activeInputs = Array(7).fill(null);

// 为每行添加事件监听器
rows.forEach((row, i) => {
    const dInput = row.querySelector('.d-input');
    const eInput = row.querySelector('.e-input');
    const result1Input = row.querySelector('.result1-input');

    // 监听d输入，实时计算
    dInput.addEventListener('input', () => {
        calculateRow(i);
    });

    // 监听e输入
    eInput.addEventListener('input', () => {
        if (eInput.value === '') {
            activeInputs[i] = null;
            result1Input.value = '';
        } else {
            activeInputs[i] = 'e';
            result1Input.value = '';
        }
        calculateRow(i);
    });

    // 监听result1输入
    result1Input.addEventListener('input', () => {
        if (result1Input.value === '') {
            activeInputs[i] = null;
            eInput.value = '';
        } else {
            activeInputs[i] = 'result1';
            eInput.value = '';
            // 新增：只保留整数
            result1Input.value = parseInt(result1Input.value) || '';
        }
        calculateRow(i);
    });
});

// 监听基础参数
['paramA', 'paramB', 'paramC'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        calculatePracticeSpeed(); 
        calculateAllRows();
    });
});

// 监听练习速度输入框的变化
document.getElementById('practiceSpeed').addEventListener('input', () => {
    calculateAllRows();
});

// 计算单行
function calculateRow(idx) {
    const rows = tableBody.querySelectorAll('tr');
    const row = rows[idx];
    const dInput = row.querySelector('.d-input');
    const eInput = row.querySelector('.e-input');
    const result1Input = row.querySelector('.result1-input');
    const result2Cell = row.querySelector('.result2');

    const a = parseFloat(document.getElementById('paramA').value) || 0;
    const b = parseFloat(document.getElementById('paramB').value) || 0;
    const c = parseFloat(document.getElementById('paramC').value) / 100 || 0;

    const d = parseFloat(dInput.value) || 0;
    let e = eInput.value !== '' ? parseFloat(eInput.value) : null;
    let result1 = result1Input.value !== '' ? parseFloat(result1Input.value) : null;

    let calculatedResult1 = '', calculatedE = '', calculatedResult2 = '';

    const formulaParams = [
        { x: 2, y: 5 },   // 白色
        { x: 2, y: 10 },   // 绿色
        { x: 7, y: 15 },   // 蓝色
        { x: 10, y: 20 },   // 黄色
        { x: 12, y: 25 },   // 紫色
        { x: 15, y: 30 },  // 橙色
        { x: 20, y: 35 }   // 红色
    ];

    if (activeInputs[idx] === 'e' && eInput.value !== '' && !isNaN(e)) {
        const { x, y } = formulaParams[idx];
        calculatedResult1 = (e - d) * x + y * ((e * (e - 1) / 2) - (d * (d - 1) / 2));
        // 只保留整数
        result1Input.value = calculatedResult1 ? parseInt(calculatedResult1) : '';
    } else if (activeInputs[idx] === 'result1' && result1Input.value !== '' && !isNaN(result1)) {
        // 反算e
        const { x, y } = formulaParams[idx];
        const A = y / 2;
        const B = x - y / 2;
        const C = -(result1 + y / 2 * d * d - x * d - y / 2 * d);
        const discriminant = B * B - 4 * A * C;
        if (discriminant >= 0) {
            calculatedE = (-B + Math.sqrt(discriminant)) / (2 * A);
            // 只保留整数
            eInput.value = calculatedE ? parseInt(calculatedE) : '';
        } else {
            eInput.value = '';
        }
    }

    // 计算result2
    let useResult1 = parseFloat(result1Input.value);
    // 从practiceSpeed输入框获取值，如果不存在或无效，则使用原始计算公式
    let denominator = parseFloat(document.getElementById('practiceSpeed').value) || 0;
    // 如果practiceSpeed为0或无效，使用原始计算公式
    if (denominator === 0 || isNaN(denominator)) {
        denominator = (a + b) * (1 + c - 0.01 * a) / 5;
    } else {
        // 如果practiceSpeed有效，需要除以5以保持与原始计算一致
        denominator = denominator / 5;
    }
    calculatedResult2 = denominator !== 0 && !isNaN(useResult1) ? useResult1 / denominator / 60 : '';
    result2Cell.textContent = calculatedResult2 && !isNaN(calculatedResult2) ? calculatedResult2.toFixed(2) : '-';
}

// 计算所有行（用于基础参数变化）
function calculateAllRows() {
    for (let i = 0; i < 7; i++) {
        calculateRow(i);
    }
}

function calculatePracticeSpeed() {
    const a = parseFloat(document.getElementById('paramA').value) || 0;
    const b = parseFloat(document.getElementById('paramB').value) || 0;
    const c = parseFloat(document.getElementById('paramC').value) / 100 || 0;
    
    // 计算denominator（根据业务逻辑推测的计算公式）
    const denominator = (a + b) * (1 + c - 0.01 * a);
    document.getElementById('practiceSpeed').value = denominator.toFixed(0);
}

// 为所有输入框绑定实时计算事件（输入即触发）
// 基础参数输入框（a、b、c）
document.getElementById('paramA').addEventListener('input', calculateAllRows);
document.getElementById('paramB').addEventListener('input', calculateAllRows);
document.getElementById('paramC').addEventListener('input', calculateAllRows);
document.querySelectorAll('.d-input, .e-input, .result1-input').forEach(input => {
    input.addEventListener('input', calculateAllRows);
});        

document.querySelectorAll('.dungeon-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.dungeon-tab').forEach(t => t.classList.remove('active', 'text-accent', 'border-b-2', 'border-accent'));
        tab.classList.add('active', 'text-accent', 'border-b-2', 'border-accent');
        document.querySelectorAll('.dungeon-content').forEach(c => c.classList.add('hidden'));
        if (tab.dataset.type === 'normal') {
            document.getElementById('normal-dungeon-section').classList.remove('hidden');
        } else {
            document.getElementById('elite-dungeon-section').classList.remove('hidden');
        }
    });
});

const skillTypeSelect = document.getElementById('skillType');
const levelCapInput = document.getElementById('levelCap');
const requiredExpDisplay = document.getElementById('requiredExp');

// 计算需求经验的函数
function calculateRequiredExp() {
    // 获取等级上限值
    const a = parseFloat(levelCapInput.value) || 0;
    
    // 获取选中技能类型的系数
    const selectedOption = skillTypeSelect.options[skillTypeSelect.selectedIndex];
    const x = parseFloat(selectedOption.getAttribute('data-coefficient')) || 1;
    
    // 计算需求经验 (b = a³ / x / 10) 并取整
    const b = Math.round(Math.pow(a, 3) / x / 10);
    
    // 更新展示结果
    requiredExpDisplay.textContent = b;
}

// 监听下拉列表变化
skillTypeSelect.addEventListener('change', calculateRequiredExp);

// 监听输入框变化
levelCapInput.addEventListener('input', calculateRequiredExp);
levelCapInput.addEventListener('change', calculateRequiredExp);

// 开花计算功能
const currentNeiliInput = document.getElementById('currentNeili');
const innateBoneInput = document.getElementById('innateBone');
const acquiredBoneInput = document.getElementById('acquiredBone');
const flowerScoreDisplay = document.getElementById('flowerScore');
const flowerRequirementsBtn = document.getElementById('flowerRequirementsBtn');
const flowerRequirementsText = document.getElementById('flowerRequirementsText');

// 计算开花分值的函数
function calculateFlowerScore() {
    // 获取输入值
    const neili = parseFloat(currentNeiliInput.value) || 0;
    const innateBone = parseFloat(innateBoneInput.value) || 0;
    const acquiredBone = parseFloat(acquiredBoneInput.value) || 0;
    
    // 根据公式计算分值：分值 = （当前内力 ÷ 100） + （先天根骨 × 后天根骨 ÷ 10）
    const score = (neili / 100) + (innateBone * acquiredBone / 10);
    
    // 更新展示结果（显示整数）
    flowerScoreDisplay.textContent = Math.round(score);
}

// 为输入框添加事件监听器
currentNeiliInput.addEventListener('input', calculateFlowerScore);
currentNeiliInput.addEventListener('change', calculateFlowerScore);
innateBoneInput.addEventListener('input', calculateFlowerScore);
innateBoneInput.addEventListener('change', calculateFlowerScore);
acquiredBoneInput.addEventListener('input', calculateFlowerScore);
acquiredBoneInput.addEventListener('change', calculateFlowerScore);

// 为开花要求按钮添加点击事件监听器
flowerRequirementsBtn.addEventListener('click', function() {
    flowerRequirementsText.classList.toggle('hidden');
});


//计算器

// 获取DOM元素
const calcToggleBtn = document.getElementById('calcToggleBtn');
const calcPanel = document.getElementById('calcPanel');
const inputExpr = document.getElementById('inputExpr');
const result = document.getElementById('result');

// 显示/隐藏计算器面板
calcToggleBtn.addEventListener('click', () => {
if (calcPanel.classList.contains('hidden')) {
// 显示面板（从下方滑入）
calcPanel.classList.remove('hidden');
setTimeout(() => {
calcPanel.classList.remove('opacity-0', 'translate-y-2');
}, 10);
} else {
// 隐藏面板（滑向下方）
calcPanel.classList.add('opacity-0', 'translate-y-2');
setTimeout(() => {
calcPanel.classList.add('hidden');
}, 300);
}
});

// 计算功能
function calculate() {
const expr = inputExpr.value.trim();

// 清空结果
if (!expr) {
result.textContent = "结果将显示在这里";
return;
}

try {
// 仅允许数字和基本运算符
if (/^[\d+\-*/().]+$/.test(expr)) {
const res = eval(expr);
result.textContent = res;
}
} catch (error) {
// 计算错误时不做处理
}
}

// 实时计算 - 监听输入框变化
inputExpr.addEventListener('input', calculate);
//板块2：精炼计算
// 精炼计算默认配置常量（类似于Python脚本中的配置）
const DEFAULT_CONFIG = {
totalMoney: 103036,  // 总玄晶
initialIQ: 20,      // 先天悟性
baseEff: 100,       // 基础效率
baseIQ: 936,        // 后天悟性
equipmentList: [
    {quality: '黄', IQ: 10, efficiency: 0, name: '龙纹剑'},
    {quality: '黄', IQ: 22, efficiency: 10, name: '泼墨衫'},
    {quality: '紫', IQ: 20, efficiency: 0, name: '真武道靴'},
    {quality: '黄', IQ: 20, efficiency: 10, name: '涟星的冰玉簪'},
    {quality: '黄', IQ: 20, efficiency: 0, name: '将军帔'},
    {quality: '黄', IQ: 15, efficiency: 0, name: '黑白戒'},
    {quality: '紫', IQ: 35, efficiency: 0, name: '杨不悔的项链'},
    {quality: '黄', IQ: 0, efficiency: 15, name: '花无缺的玉佩'},
    {quality: '紫', IQ: 21, efficiency: 0, name: '火灵手环'},
    {quality: '黄', IQ: 18, efficiency: 0, name: '焦尾弦'},
    {quality: '黄', IQ: 0, efficiency: 0, name: '碧磷针'}
]
};

// 保存配置到localStorage
function saveConfig() {
const config = {
    totalMoney: parseInt(document.getElementById('CrystalNum').value) || DEFAULT_CONFIG.totalMoney,
    initialIQ: parseInt(document.getElementById('InitialIQ').value) || DEFAULT_CONFIG.initialIQ,
    baseEff: parseInt(document.getElementById('BaseEff').value) || DEFAULT_CONFIG.baseEff,
    baseIQ: parseInt(document.getElementById('BaseIQ').value) || DEFAULT_CONFIG.baseIQ,
    equipmentList: []
};

// 收集装备数据
const qualityReverseMap = {'蓝': '1', '黄': '2', '紫': '3', '橙': '4', '红': '5'};
for (let i = 1; i <= 11; i++) {
    // 获取装备数据
    const nameInput = document.getElementById(`name${i}`) || 
                      document.getElementById(`name${i.toString().padStart(2, '0')}`);
    const iqInput = document.getElementById(`IQ${i}`) || 
                  document.getElementById(`IQ${i.toString().padStart(2, '0')}`);
    const effInput = document.getElementById(`eff${i}`) || 
                      document.getElementById(`eff${i.toString().padStart(2, '0')}`);
    const qualitySelect = document.getElementById(`quality${i}`);
    
    if (nameInput && iqInput && effInput && qualitySelect) {
        const qualityMap = {'1': '蓝', '2': '黄', '3': '紫', '4': '橙', '5': '红'};
        config.equipmentList.push({
            quality: qualityMap[qualitySelect.value] || '蓝',
            name: nameInput.value.trim(),
            IQ: parseInt(iqInput.value) || 0,
            efficiency: parseInt(effInput.value) || 0
        });
    }
}

localStorage.setItem('jinglianConfig', JSON.stringify(config));
alert('配置已保存！');
}

// 加载配置到输入框
function loadConfig() {
try {
    const savedConfig = localStorage.getItem('jinglianConfig');
    const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
    
    // 设置基本参数
    document.getElementById('CrystalNum').value = config.totalMoney || DEFAULT_CONFIG.totalMoney;
    document.getElementById('InitialIQ').value = config.initialIQ || DEFAULT_CONFIG.initialIQ;
    document.getElementById('BaseIQ').value = config.baseIQ || DEFAULT_CONFIG.baseIQ;
    document.getElementById('BaseEff').value = config.baseEff || DEFAULT_CONFIG.baseEff;
    
    // 设置装备数据
    const qualityReverseMap = {'蓝': '1', '黄': '2', '紫': '3', '橙': '4', '红': '5'};
    for (let i = 0; i < Math.min(11, config.equipmentList.length); i++) {
        const eq = config.equipmentList[i];
        const position = i + 1;
        
        // 获取并设置名称输入框
        const nameInput = document.getElementById(`name${position}`) || 
                          document.getElementById(`name${position.toString().padStart(2, '0')}`);
        if (nameInput) nameInput.value = eq.name || '';
        
        // 获取并设置悟性输入框
        const iqInput = document.getElementById(`IQ${position}`) || 
                      document.getElementById(`IQ${position.toString().padStart(2, '0')}`);
        if (iqInput) iqInput.value = eq.IQ || 0;
        
        // 获取并设置效率输入框
        const effInput = document.getElementById(`eff${position}`) || 
                          document.getElementById(`eff${position.toString().padStart(2, '0')}`);
        if (effInput) effInput.value = eq.efficiency || 0;
        
        // 获取并设置品质下拉框
        const qualitySelect = document.getElementById(`quality${position}`);
        if (qualitySelect) {
            qualitySelect.value = qualityReverseMap[eq.quality] || '1';
        }
    }
    
    return config;
} catch (error) {
    console.error('加载配置失败:', error);
    // 加载失败时使用默认配置
    return DEFAULT_CONFIG;
}
}

// 计算所有装备都能提升到的最高等级X
function calculateMaxUniformLevel(totalMoney, equipmentList) {
// 品质对应的玄晶基数
const qualityBase = {'蓝': 4, '黄': 6, '紫': 8, '橙': 10, '红': 12};

// 从最高等级开始尝试，找到最大的X使得所有装备都能升级到X级
for (let x = 12; x >= 0; x--) {
    let totalCost = 0;
    for (const eq of equipmentList) {
        // 跳过无属性加成的装备（不计算其花费）
        if (eq['IQ'] === 0 && eq['efficiency'] === 0) {
            continue;
        }
        
        const baseCost = qualityBase[eq['quality']];
        // 计算单个装备升级到x级的花费
        const cost = x > 0 ? Math.floor(baseCost * (Math.pow(2, x) - 1)) : 0;
        totalCost += cost;
        
        // 如果总花费已经超过预算，提前退出
        if (totalCost > totalMoney) {
            break;
        }
    }
    
    // 如果所有装备都能升级到x级且总花费不超过预算
    if (totalCost <= totalMoney) {
        return x;
    }
}

return 0; // 理论上不应该到这里，至少0级总是可以的
}

// 精炼计算核心逻辑
function calculateBestUpgrade(totalMoney, initialIQ, equipmentList, baseEff = 0, baseIQ = 0) {
// 计算所有装备都能提升到的最高等级X
const maxUniformLevel = calculateMaxUniformLevel(totalMoney, equipmentList);
// 设置最低等级为X-4，但不低于0
const minLevel = Math.max(maxUniformLevel - 4, 0);

// 升级等级对应的属性倍数
const multipliers = [1.0, 1.1, 1.2, 1.4, 1.7, 2.1, 2.6, 3.2, 3.9, 4.7, 5.6, 6.6, 7.7];

// 品质对应的玄晶基数（映射更清晰的命名）
const qualityBase = {'蓝': 4, '黄': 6, '紫': 8, '橙': 10, '红': 12};

// 初始状态：[cost, IQ, efficiency]
let states = [[0, baseIQ, baseEff]];
// 保存每个状态对应的等级列表
let levelLists = [[]];

for (const eq of equipmentList) {
    const quality = eq['quality'];
    const eqIQ = eq['IQ'];
    const eqEfficiency = eq['efficiency'];
    
    // 跳过无属性加成的装备（直接加0级）
    if (eqIQ === 0 && eqEfficiency === 0) {
        levelLists = levelLists.map(levels => [...levels, 0]);
        continue;
    }
    
    const baseCost = qualityBase[quality];
    
    // 预计算所有等级的花费和属性加成
    const levelCosts = Array.from({length: 13}, (_, level) => 
        level > 0 ? Math.floor(baseCost * (Math.pow(2, level) - 1)) : 0
    );
    
    // 提前过滤：等级花费本身超过总金钱的直接排除，且等级不低于最低等级（除非是无属性加成的装备）
    // 对于无属性加成的装备，仍允许0级
    const minLevelForEq = (eqIQ === 0 && eqEfficiency === 0) ? 0 : minLevel;
    const validLevels = levelCosts
        .map((cost, lev) => ({ cost, lev }))
        .filter(item => item.cost <= totalMoney && item.lev >= minLevelForEq)
        .map(item => item.lev);
    
    if (validLevels.length === 0) {  // 所有等级都买不起，只能选0级
        levelLists = levelLists.map(levels => [...levels, 0]);
        continue;
    }
    
    // 预计算有效等级的属性加成
    const IQBoosts = {};
    const effBoosts = {};
    validLevels.forEach(lev => {
        IQBoosts[lev] = Math.floor(eqIQ * multipliers[lev]);
        effBoosts[lev] = Math.floor(eqEfficiency * multipliers[lev]);
    });
    
    // 计算所有可能的新状态
    let newStates = [];
    let newLevelLists = [];
    
    // 遍历有效等级
    for (const level of validLevels) {
        const costAdd = levelCosts[level];
        const iqAdd = IQBoosts[level];
        const effAdd = effBoosts[level];
        
        // 批量计算有效旧状态（避免循环内判断）
        const validOldIndices = states
            .map((state, index) => ({ state, index }))
            .filter(item => (item.state[0] + costAdd) <= totalMoney)
            .map(item => item.index);
        
        if (validOldIndices.length === 0) {
            continue;  // 该等级无有效旧状态可组合
        }
        
        // 批量生成新状态和等级列表
        validOldIndices.forEach(i => {
            newStates.push([
                states[i][0] + costAdd,
                states[i][1] + iqAdd,
                states[i][2] + effAdd
            ]);
            newLevelLists.push([...levelLists[i], level]);
        });
    }
    
    if (newStates.length === 0) {  // 所有等级都无法组合，返回null
        return null;
    }
    
    // 按花费分组，优化支配筛选
    const costGroups = {};
    for (let i = 0; i < newStates.length; i++) {
        const state = newStates[i];
        const levels = newLevelLists[i];
        const cost = state[0];
        if (!costGroups[cost]) {
            costGroups[cost] = [];
        }
        costGroups[cost].push({ state, levels });
    }
    
    // 优化的支配筛选：每个花费组内保留非支配状态
    let optimizedStates = [];
    let optimizedLevels = [];
    
    Object.values(costGroups).forEach(group => {
        const groupStates = group.map(item => item.state);
        const groupLevels = group.map(item => item.levels);
        
        // 按IQ降序、效率降序排序（为高效筛选做准备）
        const sortedPairs = Array.from({length: groupStates.length}, (_, i) => ({ index: i, state: groupStates[i] }))
            .sort((a, b) => {
                if (b.state[1] !== a.state[1]) {
                    return b.state[1] - a.state[1];
                }
                return b.state[2] - a.state[2];
            });
        
        const sortedIndices = sortedPairs.map(pair => pair.index);
        
        // 线性筛选非支配状态
        let maxEff = -Infinity;
        sortedIndices.forEach(idx => {
            const currentEff = groupStates[idx][2];
            if (currentEff > maxEff) {
                optimizedStates.push(groupStates[idx]);
                optimizedLevels.push(groupLevels[idx]);
                maxEff = currentEff;
            }
        });
    });
    
    if (optimizedStates.length === 0) {
        return null;
    }
    
    // 更新状态和等级列表
    states = optimizedStates;
    levelLists = optimizedLevels;
}

// 计算最大速度收益
if (states.length === 0) {
    return null;
}

let maxPower = -Infinity;
let maxIdx = 0;

for (let i = 0; i < states.length; i++) {
    const [cost, iq, eff] = states[i];
    const totalIq = initialIQ + iq;
    const effFactor = 1 + (eff / 100) - 0.01 * initialIQ;
    const power = totalIq * effFactor;
    
    if (power > maxPower) {
        maxPower = power;
        maxIdx = i;
    }
}

// 构建结果
return {
    'levels': levelLists[maxIdx],
    'total_cost': states[maxIdx][0],
    'max_power': Math.round(maxPower * 100) / 100,
    'total_IQ': Math.round((initialIQ + states[maxIdx][1]) * 100) / 100,
    'total_efficiency': Math.round(states[maxIdx][2] * 100) / 100
};
}

// 页面交互逻辑
document.addEventListener('DOMContentLoaded', function() {
const calculateBtn = document.getElementById('calculateBtn');
const calculatingAnimation = document.getElementById('calculatingAnimation');
const resultDiv = document.getElementById('Result');

// 页面加载时自动加载配置
loadConfig();

// 添加保存配置按钮
function addSaveConfigButton() {
    // 查找计算按钮的父元素，在旁边添加保存按钮
    const parentElement = calculateBtn ? calculateBtn.parentElement : null;
    if (parentElement) {
        // 检查是否已经存在保存按钮
        if (!document.getElementById('saveConfigBtn')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveConfigBtn';
            saveBtn.textContent = '保存配置';
            saveBtn.className = 'ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
            saveBtn.addEventListener('click', saveConfig);
            parentElement.appendChild(saveBtn);
        }
    }
}

// 添加保存按钮
addSaveConfigButton();

calculateBtn.addEventListener('click', async function() {
    // 显示计算动画
    calculatingAnimation.classList.remove('hidden');
    calculatingAnimation.classList.add('flex', 'items-center');
    resultDiv.innerHTML = '<p>正在计算最优精炼方案...</p>';
    
    try {
        // 收集输入数据
        const totalMoney = parseInt(document.getElementById('CrystalNum').value);
        const initialIQ = parseInt(document.getElementById('InitialIQ').value);
        const baseIQ = parseInt(document.getElementById('BaseIQ').value);
        const baseEff = parseInt(document.getElementById('BaseEff').value);
        
        // 验证输入
        if (isNaN(totalMoney) || totalMoney <= 0) {
            throw new Error('请输入有效的玄晶总量');
        }
        if (isNaN(initialIQ) || initialIQ < 0) {
            throw new Error('请输入有效的先天悟性');
        }
        if (isNaN(baseIQ) || baseIQ < 0) {
            throw new Error('请输入有效的基础悟性');
        }
        if (isNaN(baseEff) || baseEff < 0) {
            throw new Error('请输入有效的基础效率');
        }
        
        // 收集装备数据
        const equipmentList = [];
        const positions = ['武器', '衣服', '鞋', '头部', '披风', '戒指', '项链', '饰品', '护腕', '腰带', '暗器'];
        
        for (let i = 1; i <= positions.length; i++) {
            // 获取品质下拉框
        const qualitySelect = document.getElementById(`quality${i}`) || { value: '1' };
            
            // 获取名称输入框，处理所有可能的ID格式
            const nameInput = document.getElementById(`name${i}`) || 
                              document.getElementById(`name${i.toString().padStart(2, '0')}`) || 
                              { value: `${positions[i-1]}` };
            
            // 获取悟性输入框，处理所有可能的ID格式
            const iqInput = document.getElementById(`IQ${i}`) || 
                          document.getElementById(`IQ${i.toString().padStart(2, '0')}`) || 
                          { value: '0' };
            
            // 获取效率输入框，处理所有可能的ID格式
            const effInput = document.getElementById(`eff${i}`) || 
                              document.getElementById(`eff${i.toString().padStart(2, '0')}`) || 
                              { value: '0' };
            
            // 品质映射
            const qualityMap = {'1': '蓝', '2': '黄', '3': '紫', '4': '橙', '5': '红'};
            const quality = qualityMap[qualitySelect.value] || '蓝';
            // 当数字输入框未输入时视为0
            const name = nameInput.value.trim() || positions[i-1];
            const iq = iqInput.value === '' ? 0 : (parseInt(iqInput.value) || 0);
            const eff = effInput.value === '' ? 0 : (parseInt(effInput.value) || 0);
            
            // 只有当IQ或efficiency不为0时才添加该装备
            if (iq !== 0 || eff !== 0) {
                equipmentList.push({
                    quality,
                    name,
                    IQ: iq,
                    efficiency: eff
                });
            }
        }
        
        // 使用setTimeout模拟异步计算，避免UI阻塞
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 如果没有需要计算的装备（所有IQ和eff都为0），直接创建基本结果
        let bestSolution;
        if (equipmentList.length === 0) {
            bestSolution = {
                'levels': [],
                'total_cost': 0,
                'max_power': Math.round((initialIQ + baseIQ) * (1 + baseEff/100 - 0.01 * initialIQ) * 100) / 100,
                'total_IQ': Math.round((initialIQ + baseIQ) * 100) / 100,
                'total_efficiency': baseEff
            };
        } else {
            // 执行计算
            bestSolution = calculateBestUpgrade(totalMoney, initialIQ, equipmentList, baseEff, baseIQ);
        }
        
        if (bestSolution) {
            // 构建结果显示
            let resultHtml = `<div class="mb-3 p-2 bg-[#444444] border border-[#444444] rounded-md text-white">`;
            resultHtml += `<p class="font-medium text-green-500">计算成功！</p>`;
            resultHtml += `<p>总花费：<strong>${bestSolution.total_cost}</strong> 玄晶</p>`;
            resultHtml += `<p>总悟性：<strong>${bestSolution.total_IQ}</strong></p>`;
            resultHtml += `<p>总效率：<strong>${bestSolution.total_efficiency.toFixed(2)}%</strong></p>`;
            resultHtml += `<p>最大速度：<strong>${bestSolution.max_power.toFixed(2)}</strong></p>`;
            resultHtml += `</div>`;
            
            resultHtml += `<div class="bg-[#444444] p-3 rounded-md">`;
            resultHtml += `<h5 class="text-lg font-medium text-white mb-2">最优精炼方案：</h5>`;
            // 将等级转换为★☆格式的函数
            function levelToStars(level) {
                const fullStars = Math.floor(level / 2);
                const halfStar = level % 2;
                return '★'.repeat(fullStars) + '☆'.repeat(halfStar);
            }
            
            // 品质到颜色代码的映射
            const qualityToColor = {'蓝': 'HIC', '黄': 'HIY', '紫': 'HIZ', '橙': 'HIO', '红': 'HIR'};
            const qualityToBorderColor = {'蓝': '#00FFFF', '黄': '#FFFF00', '紫': '#912CEE', '橙': '#FF8C00', '红': '#FF0000'};
            
            resultHtml += `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">`;
            
            bestSolution.levels.forEach((level, index) => {
                if (level > 0) {  // 只显示需要升级的装备
                    const eq = equipmentList[index];
                    const stars = levelToStars(level);
                    const colorClass = qualityToColor[eq.quality] || 'HIY';
                    resultHtml += `<div class="p-2 bg-[#333333] rounded-md border border-[#333333] text-white">`;
                    resultHtml += `<span class="font-medium ${colorClass}">${stars}${eq.name}</span>`;
                    resultHtml += `</div>`;
                }
            });
            
            resultHtml += `</div>`;
            resultHtml += `</div>`;
            
            resultDiv.innerHTML = resultHtml;
            
            // 生成精炼扩展
            let refineText = '#menu pack;#wait 200;';
            let refineItems = [];
            
            bestSolution.levels.forEach((level, index) => {
                if (level > 0) {  // 只添加需要升级的装备
                    const eq = equipmentList[index];
                    // refineItems.push(`unjinglian @pack(<${colorCode}>${stars}${eq.name}</${colorCode}>);`);
                    refineItems.push(`unjinglian @pack(${eq.name});`);
                }
            });
            
            // 连接所有精炼项（不再使用分号连接）
            if (refineItems.length > 0) {
                refineText += refineItems.join('');
            }
            
            // 生成取消精炼扩展（根据等级重复生成）
            let unjlText = '#menu pack;#wait 200;';
            let unjlItems = [];
            
            bestSolution.levels.forEach((level, index) => {
                if (level > 0) {  // 只添加需要升级的装备
                    const eq = equipmentList[index];
                    const itemCommands = [];
                    // 根据level重复生成精炼命令
                    for (let i = 0; i < level; i++) {
                        itemCommands.push(`jinglian @pack(${eq.name}) ok;`);
                    }
                    // 所有重复完成后只添加一次#wait 1000
                    unjlItems.push(itemCommands.join('') + '#wait 2000;');
                }
            });
            
            // 连接所有取消精炼项
            if (unjlItems.length > 0) {
                unjlText += unjlItems.join('');
            }
            
            // 添加复制到剪贴板函数
            function copyToClipboard(text) {
                var textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("Copy");
                textarea.parentNode.removeChild(textarea);
                alert('复制成功！');
            }
            
            // 显示取消精炼扩展
            const resultJLDiv = document.getElementById('Result_jl');
            if (resultJLDiv) {
                // 将按钮放在p标签旁边
                resultJLDiv.innerHTML = `<div class="flex items-center justify-between mb-2"><p>一键精炼扩展：</p><button id="copyUnJlBtn" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">复制精炼扩展</button></div><div class="p-2 bg-[#444444] rounded font-mono text-sm text-white">${unjlText}</div>`;
                document.getElementById('copyUnJlBtn').addEventListener('click', function() {
                    copyToClipboard(unjlText);
                });
            }
            
            // 显示精炼扩展到指定区域
            const resultUNJLDiv = document.getElementById('Result_unjl');
            if (resultUNJLDiv) {
                // 将按钮放在p标签旁边
                resultUNJLDiv.innerHTML = `<div class="flex items-center justify-between mb-2"><p>一键取消精炼扩展：</p><button id="copyJlBtn" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">复制取消精炼扩展</button></div><div class="p-2 bg-[#444444] rounded font-mono text-sm text-white">${refineText}</div>`;
                document.getElementById('copyJlBtn').addEventListener('click', function() {
                    copyToClipboard(refineText);
                });
            }
        } else {
            resultDiv.innerHTML = `<div class="p-3 bg-[#444444] border border-[#444444] rounded-md text-red-500">无法计算最优方案，请检查输入参数</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="p-3 bg-[#444444] border border-[#444444] rounded-md text-red-500">${error.message}</div>`;
    } finally {
        // 隐藏计算动画
        calculatingAnimation.classList.add('hidden');
        calculatingAnimation.classList.remove('flex', 'items-center');
    }
});
});

//板块3：副本
// 普通副本下拉事件
document.getElementById('normal-dungeon-select').addEventListener('change', function () {
    const id = this.value;
    const data = dungeonData[id];
    if (data) {
        document.getElementById('dungeon-title').textContent = data.title;
        document.getElementById('dungeon-text').innerHTML = data.content.replace(/text-black/g, 'text-white');
    } else {
        document.getElementById('dungeon-title').textContent = '请选择一个副本查看攻略';
        document.getElementById('dungeon-text').innerHTML = '<p>从上方下拉框选择一个副本，将显示该副本的详细攻略内容。</p>';
    }
});

// 禁地副本下拉事件
document.getElementById('elite-dungeon-select').addEventListener('change', function () {
    const id = this.value;
    const data = eliteDungeonData[id];
    if (data) {
        document.getElementById('elite-dungeon-title').textContent = data.title;
        document.getElementById('elite-dungeon-text').innerHTML = data.content.replace(/text-black/g, 'text-white');
    } else {
        document.getElementById('elite-dungeon-title').textContent = '请选择一个禁地副本查看攻略';
        document.getElementById('elite-dungeon-text').innerHTML = '<p>从上方下拉框选择一个禁地副本，将显示该副本的详细攻略内容。</p>';
    }
});

document.querySelectorAll('.dungeon-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.dungeon-tab').forEach(t => t.classList.remove('active', 'text-accent', 'border-b-2', 'border-accent'));
        tab.classList.add('active', 'text-accent', 'border-b-2', 'border-accent');
        // 内容切换
        document.querySelectorAll('.dungeon-content').forEach(c => c.classList.add('hidden'));
        if (tab.dataset.type === 'normal') {
            document.getElementById('normal-dungeon-section').classList.remove('hidden');
        } else {
            document.getElementById('elite-dungeon-section').classList.remove('hidden');
        }
    });
});

// 部分切换功能
document.querySelectorAll('.part-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // 切换标签样式
        document.querySelectorAll('.part-tab').forEach(t => {
            t.classList.remove('active', 'text-accent', 'border-b-2', 'border-accent');
            t.classList.add('text-secondary', 'hover:text-primary');
        });
        tab.classList.add('active', 'text-accent', 'border-b-2', 'border-accent');
        tab.classList.remove('text-secondary', 'hover:text-primary');
        
        // 切换内容显示
        const partId = tab.getAttribute('data-part');
        document.querySelectorAll('.part-content').forEach(part => {
            part.classList.add('hidden');
        });
        document.getElementById(partId).classList.remove('hidden');
    });
});

// 普通副本列表点击事件
document.querySelectorAll('.dungeon-item').forEach(item => {
    item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const data = dungeonData[id];
        
        document.getElementById('dungeon-title').textContent = data.title;
        document.getElementById('dungeon-text').innerHTML = data.content.replace(/text-black/g, 'text-white');
        
        // 高亮选中项
        document.querySelectorAll('.dungeon-item').forEach(i => {
            i.classList.remove('bg-gray-200', 'font-medium');
        });
        item.classList.add('bg-gray-200', 'font-medium');
    });
});

// 精英副本列表点击事件
document.querySelectorAll('.elite-dungeon-item').forEach(item => {
    item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const data = eliteDungeonData[id];
        
        document.getElementById('elite-dungeon-title').textContent = data.title;
        document.getElementById('elite-dungeon-text').innerHTML = data.content.replace(/text-black/g, 'text-white');
        
        // 高亮选中项
        document.querySelectorAll('.elite-dungeon-item').forEach(i => {
            i.classList.remove('bg-gray-200', 'font-medium');
        });
        item.classList.add('bg-gray-200', 'font-medium');
    });
});

//板块3：技能、装备
// 工具函数：为下拉框应用选中项的颜色样式
function applySelectedOptionStyle(selectElement) {
    if (!selectElement) return;
    
    // 移除所有选项的选中样式
    Array.from(selectElement.options).forEach(option => {
        option.classList.remove('selected-option');
    });
    
    // 获取选中的选项
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption) {
        // 为选中项添加选中样式类
        selectedOption.classList.add('selected-option');
        
        // 为select元素应用选中项的颜色类
        const colorClasses = ['HIW', 'HIG', 'HIC', 'HIY', 'HIZ', 'HIO', 'HIR'];
        colorClasses.forEach(cls => {
            selectElement.classList.remove(cls);
        });
        
        // 添加选中项的颜色类（跳过HIW，使用默认样式）
        colorClasses.forEach(cls => {
            if (cls !== 'HIW' && selectedOption.classList.contains(cls)) {
                selectElement.classList.add(cls);
            }
        });
    }
}

// 数据分组函数：按grade分组
function groupByGrade(data) {
    const result = {
        white: [],
        green: [],
        blue: [],
        yellow: [],
        purple: [],
        orange: [],
        red: []
    };
    
    // 映射grade值到对应的分组键
    const gradeMap = {
        'HIW': 'white',
        'HIG': 'green',
        'HIC': 'blue',
        'HIY': 'yellow', // 兼容旧数据
        'HIZ': 'purple',
        'HIO': 'orange',
        'HIR': 'red'
    };
    
    data.forEach(item => {
        const groupKey = gradeMap[item.grade];
        if (groupKey && result.hasOwnProperty(groupKey)) {
            result[groupKey].push(item);
        }
    });
    return result;
}

// 通用的渲染下拉框函数
function renderSelect(selectId, dataByGrade, grade = 'white') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择...</option>';
    const arr = dataByGrade[grade] || [];
    
    if (arr.length === 0) {
        select.innerHTML = '<option value="">暂无该等级的数据</option>';
        applySelectedOptionStyle(select); // 应用样式
        return;
    }
    
    arr.forEach((item, index) => {
        const option = document.createElement('option');
        // 处理id为空的情况，使用name作为fallback值或索引
        option.value = item.id || item.name || `item_${index}`;
        option.textContent = item.name;
        // 当样式为HIW时，忽略，使用默认样式
        if (item.grade !== 'HIW') {
            option.className = item.grade;
        }
        select.appendChild(option);
    });
    
    applySelectedOptionStyle(select); // 应用样式
}

// 通用的详情显示函数
function showItemDetails(itemId, dataByGrade, grade, titleId, descriptionId, defaultTitle, defaultDescription) {
    const arr = dataByGrade[grade] || [];
    // 寻找匹配的项目，处理id可能为空的情况
    const item = arr.find(i => 
        (i.id && i.id == itemId) || 
        (i.name && i.name == itemId) ||
        (!i.id && !i.name && `item_${arr.indexOf(i)}` == itemId)
    );
    
    const titleElement = document.getElementById(titleId);
    const descriptionElement = document.getElementById(descriptionId);
    
    if (!titleElement || !descriptionElement) return;
    
    if (item) {
        // 判断是否为武器面板（根据titleId是否包含weapon）
        const isWeapon = titleId.includes('weapon');
        
        if (isWeapon) {
            // 武器面板只显示名称，不显示id
            titleElement.textContent = item.name;
        } else {
            // 技能面板显示名称和id
        titleElement.innerHTML = `${item.name}<br><span class="font-italic text-[12px] md:text-[16px]">checkskill ${item.id || 'N/A'} 1000</span>`;
        }
        
        // 构建详细信息，包含所有字段并应用指定样式
        let detailsHtml = '';
        
        // 合并desc和desc_grade并换行显示，去除前缀
        let combinedDesc = '';
        if (item.desc_grade && item.desc) {
            combinedDesc = `${item.desc_grade}<br>${item.desc}`;
        } else if (item.desc_grade) {
            combinedDesc = item.desc_grade;
        } else if (item.desc) {
            combinedDesc = item.desc;
        }
        
        if (combinedDesc) {
            detailsHtml += `<div class="mb-4 text-[14px] md:text-[18px]">${combinedDesc}</div>`;
        }
        
        // 显示装备属性，应用响应式字体样式
        if (item.eq && item.eq.trim() !== '') {
            detailsHtml += `<div class="mb-4 text-[14px] md:text-[18px]">${item.eq.replace(/\n/g, '<br>')}</div>`;
        }
        
        // 显示技能信息，应用响应式字体样式
        if (item.skill && item.skill.trim() !== '') {
            detailsHtml += `<div class="mb-4 text-[14px] md:text-[18px]">${item.skill.replace(/\n/g, '<br>')}</div>`;
        }
        
        // 显示进阶效果，应用响应式字体样式
        if (item.advance && item.advance.trim() !== '') {
            detailsHtml += `<div class="mb-4 text-[14px] md:text-[18px]"><strong>进阶效果：</strong><br>◆${item.advance.replace(/\n/g, '<br>◆')}</div>`;
        }
        
        // 如果没有详细信息，显示默认描述
        if (detailsHtml === '') {
            detailsHtml = item.description || defaultDescription;
        }
        
        descriptionElement.innerHTML = detailsHtml;
    } else {
        titleElement.textContent = defaultTitle;
        descriptionElement.innerHTML = defaultDescription;
    }
}

// 初始化数据和事件绑定
function initItemSystem(prefix, data, dataByGradeVarName) {
    // 生成分组数据
    const dataByGrade = window[dataByGradeVarName] = groupByGrade(data);
    
    // 获取DOM元素
    const gradeSelect = document.getElementById(`${prefix}-grade`);
    const itemSelect = document.getElementById(`${prefix}-select`);
    
    if (!gradeSelect || !itemSelect) return;
    
    // 为下拉框添加样式应用事件
    gradeSelect.addEventListener('change', function() {
        applySelectedOptionStyle(this);
        const grade = this.value;
        renderSelect(`${prefix}-select`, dataByGrade, grade);
        
        // 清空详情
        const defaultTitle = prefix === 'weapon' ? '请选择一个装备查看详情' : '请选择一个技能查看详情';
        const defaultDescription = `<p>从上方下拉框选择一个${prefix === 'weapon' ? '装备' : '技能'}，将显示该${prefix === 'weapon' ? '装备' : '技能'}的详细信息。</p>`;
        showItemDetails('', dataByGrade, grade, `${prefix}-title`, `${prefix}-description`, defaultTitle, defaultDescription);
    });
    
    itemSelect.addEventListener('change', function() {
        applySelectedOptionStyle(this);
        const grade = gradeSelect.value;
        const id = this.value;
        const defaultTitle = prefix === 'weapon' ? '请选择一个装备查看详情' : '请选择一个技能查看详情';
        const defaultDescription = `<p>从上方下拉框选择一个${prefix === 'weapon' ? '装备' : '技能'}，将显示该${prefix === 'weapon' ? '装备' : '技能'}的详细信息。</p>`;
        showItemDetails(id, dataByGrade, grade, `${prefix}-title`, `${prefix}-description`, defaultTitle, defaultDescription);
    });
    
    // 初始渲染
    renderSelect(`${prefix}-select`, dataByGrade, 'white');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化武器系统
    initItemSystem('weapon', weaponData, 'weaponDataByGrade');
    
    // 初始化技能系统
    initItemSystem('skill', skilldata, 'skillDataByGrade');
    
    // 初始化所有相关下拉框的样式
    ['weapon-grade', 'skill-grade', 'skillType'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            applySelectedOptionStyle(select);
        }
    });
});


// 6. tab切换（技能/装备）
document.querySelectorAll('.property-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.property-tab').forEach(t => t.classList.remove('active', 'text-accent', 'border-b-2', 'border-accent'));
        tab.classList.add('active', 'text-accent', 'border-b-2', 'border-accent');
        // 内容切换
        document.querySelectorAll('.property-content').forEach(c => {
            c.classList.add('hidden');
            c.classList.remove('active');
        });
        if (tab.dataset.type === 'skill') {
            document.getElementById('skill-section').classList.remove('hidden');
            document.getElementById('skill-section').classList.add('active');
        } else {
            document.getElementById('weapon-section').classList.remove('hidden');
            document.getElementById('weapon-section').classList.add('active');
        }
    });
});


//板块4：门派
// 处理门派标签切换事件
document.querySelectorAll('.faction-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const targetPart = this.getAttribute('data-part');
        
        // 切换标签状态
        document.querySelectorAll('.faction-tab').forEach(t => {
            t.classList.remove('active', 'text-accent', 'border-b-2', 'border-accent');
            t.classList.add('text-secondary');
        });
        this.classList.add('active', 'text-accent', 'border-b-2', 'border-accent');
        this.classList.remove('text-secondary');
        
        // 切换内容区域
        document.querySelectorAll('.faction-content').forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(targetPart);
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
        
        // 重置选中状态
        document.querySelectorAll('.faction-item').forEach(el => {
            el.classList.remove('bg-gray-700');
        });
    });
});

// 门派列表点击事件
document.querySelectorAll('.faction-item').forEach(item => {
    item.addEventListener('click', function() {
        // 获取点击的门派标识
        const faction = this.getAttribute('data-faction');
        
        // 确定当前激活的内容区域（拜师条件或装备属性）
        const activeContent = document.querySelector('.faction-content.active');
        const isRequirements = activeContent.id === 'faction-requirements';
        
        // 根据当前激活区域选择对应的数据
        const dataSource = isRequirements ? factionRequirementsData : factionEquipmentData;
        const data = dataSource[faction];
        
        // 更新标题和内容
        const titleElement = isRequirements ? document.getElementById('requirements-title') : document.getElementById('equipment-title');
        const contentElement = isRequirements ? document.getElementById('requirements-text') : document.getElementById('equipment-text');
    
        titleElement.textContent = data.title;
        contentElement.innerHTML = data.content;

        // 高亮当前选中的门派
        document.querySelectorAll('.faction-item').forEach(el => {
            el.classList.remove('bg-gray-700');
        });
        this.classList.add('bg-gray-700');
    });
});


//板块7：随从属性展示

// 随从列表点击事件
document.querySelectorAll('.fellow-item').forEach(item => {
    item.addEventListener('click', function() {
        // 获取点击的随从名称
        const fellowName = this.getAttribute('data-fellow');
        
        // 查找fellow数据中对应的角色
        let fellowData = null;
        for (let i = 1; i < fellow.data.length; i++) {
            if (fellow.data[i][0] === fellowName) {
                fellowData = fellow.data[i];
                break;
            }
        }
        
        if (fellowData) {
            // 更新标题
            document.getElementById('fellow-title').textContent = fellowName;
            
            // 创建属性展示区域
            const contentContainer = document.getElementById('fellow-content');
            contentContainer.innerHTML = '';
            
            // 创建属性列表
            const attributeGrid = document.createElement('div');
            attributeGrid.className = 'grid grid-cols-1 gap-2 max-w-[120px] text-center';
            
            // 遍历属性并创建展示项
            for (let i = 1; i < fellowData.length; i++) {
                const attributeName = fellow.data[0][i];
                let attributeValue = fellowData[i];

                const attributeItem = document.createElement('div');
                attributeItem.className = 'flex p-2 bg-[#333333] rounded-md shadow-sm text-white';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'w-1/3 font-medium text-primary text-base';
                nameSpan.textContent = attributeName;
                
                const valueSpan = document.createElement('span');
                valueSpan.className = 'w-2/3 text-secondary text-base';
                valueSpan.textContent = attributeValue;
                
                attributeItem.appendChild(nameSpan);
                attributeItem.appendChild(valueSpan);
                attributeGrid.appendChild(attributeItem);
            }
            
            contentContainer.appendChild(attributeGrid);
            
            // 高亮当前选中的随从
            document.querySelectorAll('.fellow-item').forEach(el => {
                el.classList.remove('bg-gray-700', 'font-medium');
            });
            this.classList.add('bg-gray-700', 'font-medium');
        }
    });
});
