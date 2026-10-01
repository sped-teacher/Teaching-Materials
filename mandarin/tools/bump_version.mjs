// 更新網站載入檔案的版本號（?v=…），讓 iPad 一定抓到新版，不會一直用舊的暫存。
// 用法：node mandarin/tools/bump_version.mjs     （有改 assets/、data/ 的檔案，commit 前跑一次）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = new Date(), p = (n) => String(n).padStart(2, '0');
const v = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;

for (const name of ['index.html', 'guide.html']) {
  const f = join(ROOT, name);
  const before = readFileSync(f, 'utf8');
  // 只處理本站的相對路徑（assets/、data/），外部網址不動
  const after = before.replace(/((?:src|href)=")((?:assets|data)\/[^"?]+)(?:\?v=[^"]*)?"/g, `$1$2?v=${v}"`);
  writeFileSync(f, after, 'utf8');
  const n = (after.match(/\?v=/g) || []).length;
  console.log(`${name}：${n} 個檔案 → v=${v}`);
}
