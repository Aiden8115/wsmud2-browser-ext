// ============================================================
// check-syntax.js —— 一键语法检查（改代码后先跑它，再刷新插件）
// ------------------------------------------------------------
// 用法（需要本机装 Node.js）：
//   node check-syntax.js
// 作用：对扩展里所有 .js 文件执行 node --check（只查语法，不执行），
// 自动跳过 .bak/.bak2 备份文件和第三方压缩库（lib/ 下除外，它们也一并查）。
// 全部通过输出绿色 OK；有错会列出文件名与错误信息，exit code 非 0。
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SKIP = ['.bak', '.bak2', '.formatted.js'];   // 备份/参考副本跳过（formatted 副本保留一次校验）
const EXCLUDE_DIRS = ['.idea', '_metadata', 'ws-data'];
const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';

function collectJs(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (EXCLUDE_DIRS.includes(entry.name)) continue;
            collectJs(path.join(dir, entry.name), out);
        } else if (entry.name.endsWith('.js')) {
            if (SKIP.some(s => entry.name.endsWith(s))) continue;
            out.push(path.join(dir, entry.name));
        }
    }
}

const files = [];
collectJs(ROOT, files);

let ok = 0, fail = 0;
console.log(`共发现 ${files.length} 个 .js 文件，开始语法检查...\n`);
for (const f of files) {
    const rel = path.relative(ROOT, f);
    try {
        execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
        ok++;
    } catch (e) {
        fail++;
        console.log(`${RED}[FAIL]${RESET} ${rel}`);
        const msg = String(e.stderr || e.message || e).trim();
        if (msg) console.log(msg.split('\n').slice(0, 5).map(l => '       ' + l).join('\n'));
    }
}
console.log(`\n${fail === 0 ? GREEN : RED}结果：${ok} 通过, ${fail} 失败${RESET}`);
if (fail > 0) {
    console.log(`${YELLOW}提示：有语法错误的文件请先修复，再刷新插件 + 刷新游戏页测试。${RESET}`);
    process.exit(1);
}
