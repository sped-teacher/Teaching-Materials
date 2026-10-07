// 從現有的國語學習樂園（預設 mandarin/）複製「程式和工具」到新資料夾，資料（各課內容、圖、課文）不複製。
// 用法（在 repo 根目錄執行）：
//   node .claude/skills/mandarin-learning-site/scripts/new_site.mjs <新資料夾> [--from mandarin]
//   例：node .claude/skills/mandarin-learning-site/scripts/new_site.mjs mandarin-kh5b
// 複製完會列出「還寫著舊學期的地方」，照 SKILL.md 的「換學期要改的地方」逐一改掉。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const fi = args.indexOf('--from');
const FROM = fi >= 0 ? args[fi + 1] : 'mandarin';
const TO = args.filter((a, i) => !a.startsWith('--') && !(fi >= 0 && i === fi + 1))[0];
if (!TO) { console.error('請給新資料夾名稱，例如：node new_site.mjs mandarin-kh5b'); process.exit(1); }
if (!existsSync(join(FROM, 'assets', 'app.js'))) { console.error('找不到 ' + FROM + '/assets/app.js，請在 repo 根目錄執行'); process.exit(1); }
if (existsSync(TO) && readdirSync(TO).length) { console.error(TO + ' 已經存在而且不是空的，不覆蓋'); process.exit(1); }

const copy = (rel) => { cpSync(join(FROM, rel), join(TO, rel), { recursive: true }); console.log('  複製 ' + rel); };
mkdirSync(TO, { recursive: true });
['assets', 'index.html', 'guide.html'].forEach(copy);
mkdirSync(join(TO, 'tools', 'texts'), { recursive: true });
for (const f of readdirSync(join(FROM, 'tools'))) {
  const p = join(FROM, 'tools', f);
  // 程式複製；各課的生圖設定（cards_XX*.json）、課文（texts/）是舊學期的內容，不複製
  if (statSync(p).isFile() && /\.(py|mjs)$/.test(f)) copy(join('tools', f));
}
// 讀音校正：只留說明，各課校正重新累積
const fx = JSON.parse(readFileSync(join(FROM, 'tools', 'texts', 'fixes.json'), 'utf8'));
writeFileSync(join(TO, 'tools', 'texts', 'fixes.json'), JSON.stringify({ _說明: fx._說明 }, null, 2) + '\n');
mkdirSync(join(TO, 'data'), { recursive: true });
mkdirSync(join(TO, 'images'), { recursive: true });
writeFileSync(join(TO, 'data', 'links.js'), `/*
 * 各課的外部資源（沒有就留空物件）
 *   reads：課文點讀（可以有多個） score：朗讀挑戰（評分）
 *   有加密課文（reading.enc.js）的課，網站會用內建的課文點讀、朗讀挑戰，這裡可以不填。
 */
window.LESSON_LINKS = {};
`);
console.log('\n✅ 已建立 ' + TO + '/（data/、images/ 是空的）');

// 列出還寫著舊學期／舊冊的地方
const PAT = /五上|5上|5A|康軒|115|1151|510658925|tm-g5a|col=K|蚊帳大使|第 1～6 課|第 7～12 課|COPY = /;
const files = ['assets/app.js', 'index.html', 'guide.html', 'tools/image_queue.py', 'tools/check_pedia.py', 'tools/make_reader.py'];
console.log('\n⚠ 下面這些行寫著舊學期的資料，要逐一確認、改成新的一冊：');
for (const f of files) {
  const lines = readFileSync(join(TO, f), 'utf8').split(/\r?\n/);
  lines.forEach((t, i) => { if (PAT.test(t)) console.log(`  ${TO}/${f}:${i + 1}  ${t.trim().slice(0, 110)}`); });
}
console.log('\n另外：app.js 的 LESSON_LIST（課次、課名）要換成新的一冊；make_reader.py 的 TSI.update 是通用讀音校正，可以留著。');
