"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareMarkdownStrings = compareMarkdownStrings;
const fs_1 = __importDefault(require("fs"));
function normalizeLines(text) {
    return text.replace(/\r\n/g, '\n').split('\n');
}
function lcsLength(a, b) {
    if (a.length === 0 || b.length === 0) {
        return 0;
    }
    const prev = new Uint32Array(b.length + 1);
    const curr = new Uint32Array(b.length + 1);
    for (let i = 1; i <= a.length; i += 1) {
        const aVal = a[i - 1];
        for (let j = 1; j <= b.length; j += 1) {
            if (aVal === b[j - 1]) {
                curr[j] = prev[j - 1] + 1;
            }
            else {
                curr[j] = prev[j] > curr[j - 1] ? prev[j] : curr[j - 1];
            }
        }
        prev.set(curr);
    }
    return prev[b.length];
}
function compareMarkdownStrings(left, right) {
    const leftLines = normalizeLines(left);
    const rightLines = normalizeLines(right);
    const lcs = lcsLength(leftLines, rightLines);
    const total = leftLines.length + rightLines.length;
    const similarity = total === 0 ? 1 : (2 * lcs) / total;
    const diffs = [];
    const maxScan = Math.min(leftLines.length, rightLines.length);
    for (let i = 0; i < maxScan; i += 1) {
        if (leftLines[i] !== rightLines[i]) {
            diffs.push({ line: i + 1, left: leftLines[i], right: rightLines[i] });
            if (diffs.length >= 20) {
                break;
            }
        }
    }
    if (diffs.length < 20 && leftLines.length !== rightLines.length) {
        diffs.push({
            line: maxScan + 1,
            left: leftLines.slice(maxScan, maxScan + 1).join(''),
            right: rightLines.slice(maxScan, maxScan + 1).join(''),
        });
    }
    return {
        similarity,
        lcsLength: lcs,
        leftLines: leftLines.length,
        rightLines: rightLines.length,
        diffs,
    };
}
function formatLine(value) {
    if (value === undefined) {
        return '<EOF>';
    }
    if (value === '') {
        return '<EMPTY>';
    }
    return value;
}
function runCli() {
    const [leftPath, rightPath] = process.argv.slice(2);
    if (!leftPath || !rightPath) {
        console.error('用法: npx ts-node scripts/compare-md.ts <python_md> <ts_md>');
        process.exit(1);
    }
    const left = fs_1.default.readFileSync(leftPath, 'utf-8');
    const right = fs_1.default.readFileSync(rightPath, 'utf-8');
    const result = compareMarkdownStrings(left, right);
    console.log(`行数A: ${result.leftLines}`);
    console.log(`行数B: ${result.rightLines}`);
    console.log(`LCS: ${result.lcsLength}`);
    console.log(`相似度: ${result.similarity.toFixed(6)}`);
    if (result.diffs.length > 0) {
        console.log('前20处差异(按行号粗略对齐):');
        for (const diff of result.diffs) {
            console.log(`- 行 ${diff.line}:`);
            console.log(`  A: ${formatLine(diff.left)}`);
            console.log(`  B: ${formatLine(diff.right)}`);
        }
    }
    else {
        console.log('未发现差异行（按行号对齐）。');
    }
}
if (require.main === module) {
    runCli();
}
//# sourceMappingURL=compare-md.js.map