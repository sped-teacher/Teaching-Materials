// 檢查一課的資料 data/lessonXX.js 有沒有照國語學習樂園的規格寫（寫完一課、改完一課都跑一次）。
// 用法（在 repo 根目錄執行）：
//   node .claude/skills/mandarin-learning-site/scripts/check_spec.mjs mandarin 07 08
//   node .claude/skills/mandarin-learning-site/scripts/check_spec.mjs mandarin        （全部課）
// ❌＝一定要改（網站會壞或違反老師的規則）；⚠＝請確認（可能是還沒做的部分，例如圖還沒畫）。
// 有課文原稿 data/reading/lessonXX.js（只在老師電腦）時，會順便核對螢光筆句子（keys）是不是課文裡真的有。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const [SITE = 'mandarin', ...want] = process.argv.slice(2);
const ctx = { window: {} }; vm.createContext(ctx);
const ids = want.length ? want : readdirSync(join(SITE, 'data')).map((f) => (f.match(/^lesson(\d\d)\.js$/) || [])[1]).filter(Boolean);
let bad = 0, warn = 0;

for (const id of ids) {
  const f = join(SITE, 'data', 'lesson' + id + '.js');
  if (!existsSync(f)) { console.log('❌ 找不到 ' + f); bad++; continue; }
  vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  const L = ctx.window.LESSONS[id];
  const out = [];
  const E = (m) => { out.push('  ❌ ' + m); bad++; };
  const W = (m) => { out.push('  ⚠ ' + m); warn++; };
  const han = (s) => (String(s).match(/[㐀-鿿\u{20000}-\u{3FFFF}]/gu) || []).length;
  const syl = (z) => String(z).trim().split(/\s+/).filter(Boolean).length;
  const uniq = (a) => new Set(a).size === a.length;

  // ── 基本欄位 ──
  for (const k of ['id', 'no', 'title', 'focus', 'chars', 'words', 'phrases', 'sentences', 'reading', 'families', 'lookalikes', 'idioms', 'rhetoric', 'listening'])
    if (L[k] == null) E('缺少 ' + k);
  for (const k of ['pediaId', 'charParts', 'textWords']) if (L[k] == null) W('缺少 ' + k + '（目前規格每課都有）');
  if (!L.chars) { console.log('第 ' + id + ' 課\n' + out.join('\n')); continue; }

  // 罕用字（Ext-B 以後）iPad 楷書字型、注音字型都可能顯示不出來
  const all = JSON.stringify(L);
  const rare = [...new Set([...all].filter((c) => c.codePointAt(0) > 0xffff && /\p{Script=Han}/u.test(c)))];
  if (rare.length) E('有罕用字 ' + rare.join('') + '，iPad 可能顯示不出來，改用常用字說明');

  // ── 生字 ──
  const lessonChars = L.chars.map((c) => c.c);
  L.chars.forEach((c) => {
    for (const k of ['c', 'zy', 'radical', 'strokes', 'words', 'cue']) if (c[k] == null) E(`生字「${c.c}」缺 ${k}`);
    if (c.zy && syl(c.zy) !== 1) E(`生字「${c.c}」的注音應該只有一個音：${c.zy}`);
    (c.words || []).forEach((w) => { if (!w.includes(c.c)) E(`生字「${c.c}」的語詞「${w}」裡沒有這個字`); });
  });
  if (!uniq(lessonChars)) E('生字有重複');

  // ── 拆字（charParts）──
  const CP = L.charParts || {};
  for (const c of lessonChars) {
    const P = CP[c];
    if (!P) { if (L.charParts) W(`生字「${c}」沒有拆字解說`); continue; }
    if (!['xs1', 'xs2', 'hy', 'xx', 'kj'].includes(P.t)) E(`「${c}」的類型 t 不對：${P.t}`);
    if (!P.parts || !P.parts.length) E(`「${c}」沒有 parts`);
    (P.parts || []).forEach((x) => { if (!x.p || (x.m == null && x.s == null)) E(`「${c}」的部件要有 p，和 m（意思）或 s（念法）`); });
    if (!['kj', 'xx'].includes(P.t) && (P.parts || []).length > 1 && !(P.parts || []).some((x) => x.r)) W(`「${c}」沒有標部首部件（r:1）`);
    if (P.t === 'kj' && /因為|所以|由來/.test(P.say || '')) W(`「${c}」是口訣記法，解說不要把口訣說成字的由來：${P.say}`);
    if (!P.say) E(`「${c}」缺 say（iPad 念的解說）`);
    if (!P.fix) W(`「${c}」沒有改錯字題`);
    else {
      const { s = '', w = '', h } = P.fix;
      const n = s.split(w).length - 1;
      if (n !== 1) E(`「${c}」改錯字：錯字「${w}」在句子裡出現 ${n} 次（要剛好 1 次）：${s}`);
      if (s.includes(c) && !s.includes(c + w) && !s.includes(w + c)) W(`「${c}」改錯字：句子裡已經有正確的字「${c}」，學生會混淆：${s}`);
      if (!h) E(`「${c}」改錯字缺提示 h`);
    }
  }
  for (const c of Object.keys(CP)) if (!lessonChars.includes(c)) E(`charParts 的「${c}」不是本課生字（改錯字的答案一定要是本課生字）`);

  // ── 語詞 ──
  (L.words || []).forEach((w) => {
    for (const k of ['w', 'zy', 'meaning', 'example']) if (!w[k]) E(`語詞「${w.w}」缺 ${k}`);
    if (w.zy && syl(w.zy) !== han(w.w)) E(`語詞「${w.w}」注音 ${syl(w.zy)} 個音、國字 ${han(w.w)} 個字`);
  });
  if (!uniq((L.words || []).map((w) => w.w))) E('語詞有重複');
  (L.textWords || []).forEach((w) => { if (!w.w || !w.meaning) E('課文詞語缺 w 或 meaning'); });

  // ── 短語短句（積木）──
  (L.phrases || []).forEach((p) => {
    const tag = `短語 ${p.id}（${(p.model || []).join('')}）`;
    if (!p.model || !p.explain) E(tag + ' 缺 model 或 explain');
    if (p.roles && p.roles.length !== p.model.length) E(tag + ' roles 和 model 長度不同');
    if (!p.blocks) { W(tag + ' 沒有積木（blocks），會用舊版練習'); return; }
    const keys = p.blocks.filter((b) => typeof b === 'object').map((b) => b.k);
    if (!uniq(keys)) E(tag + ' 積木的 k 重複（兩塊同色要用不同 k，再用 c 指定顏色）');
    const words = {};
    for (const k of keys) {
      const b = (p.bank || {})[k];
      if (!b || !b.length) { E(tag + ` 詞庫 bank.${k} 是空的`); continue; }
      words[k] = b.map((x) => x.w);
      b.forEach((x) => { if (!x.e) W(tag + ` 詞庫「${x.w}」沒有圖示 e`); });
    }
    // 同色的兩塊（{ k:'b', c:'a' }）可以共用詞庫；不同色的積木不能有同一個詞
    const byColor = {};
    p.blocks.filter((b) => typeof b === 'object').forEach((b) => { const col = b.c || b.k; (byColor[col] = byColor[col] || new Set()); (words[b.k] || []).forEach((w) => byColor[col].add(w)); });
    const flat = Object.values(byColor).flatMap((s) => [...s]);
    if (!uniq(flat)) E(tag + ' 同一個詞出現在兩種顏色的積木詞庫');
    const inBank = (k, arr, where) => (arr || []).forEach((w) => { if (words[k] && !words[k].includes(w)) E(tag + ` ${where} 的「${w}」不在 bank.${k}`); });
    (p.ok || []).forEach((r) => Object.keys(r).forEach((k) => inBank(k, r[k], 'ok')));
    (p.bad || []).forEach((r) => { Object.keys(r).filter((k) => k !== 'why').forEach((k) => inBank(k, r[k], 'bad')); if (!r.why) E(tag + ' bad 缺 why'); });
    const sc = p.scenes || [];
    if (sc.length < 4) W(tag + ` 情境只有 ${sc.length} 個（規格 4 個：guided 2 + own 2）`);
    sc.forEach((s, i) => {
      if (!s.pic || !s.say || !s.ans || !s.fit) E(tag + ` 情境 ${i} 缺 pic/say/ans/fit`);
      Object.keys(s.fit || {}).forEach((k) => inBank(k, s.fit[k], `情境 ${i} fit`));
      Object.keys(s.no || {}).forEach((k) => inBank(k, s.no[k], `情境 ${i} no`));
    });
    [...(p.guided || []), ...(p.own || [])].forEach((i) => { if (!sc[i]) E(tag + ` guided/own 指到不存在的情境 ${i}`); });
    if (!p.pic) E(tag + ' 缺示範圖 pic');
    if ((p.examples || []).length !== (p.examplePics || []).length) W(tag + ' examples 和 examplePics 數量不同');
    if (!p.think || !p.think.length) W(tag + ' 沒有放聲思考 think');
  });

  // ── 句型 ──
  const inOrder = (s, conn) => { let at = 0; return conn.every((w) => { const k = s.indexOf(w, at); if (k < 0) return false; at = k + w.length; return true; }); };
  const KINDS = ['轉折複句', '條件複句', '遞進複句', '因果複句', '目的複句', '承接複句', '並列複句', '假設複句'];
  (L.sentences || []).forEach((s, i) => {
    const tag = `句型「${s.pattern}」`;
    if (!KINDS.includes(s.kind) && !(s.combine && s.combine.rel)) E(tag + ` 的 kind「${s.kind}」不在 8 種複句裡，要加 combine.rel`);
    if (!s.conn || !s.conn.length) { E(tag + ' 缺 conn（連接詞）'); return; }
    (s.models || []).forEach((m) => { if (!inOrder(m, s.conn)) E(tag + ' 例句沒照順序用到連接詞：' + m); });
    const C = s.combine;
    if (!C) { E(tag + ' 缺 combine（句子合併）'); return; }
    if (!C.demo || !C.demo.j) E(tag + ' 缺老師示範 combine.demo');
    else {
      if (!inOrder(C.demo.j, s.conn)) E(tag + ' 示範句沒用到連接詞：' + C.demo.j);
      if (C.demo.pic !== `句型${i + 1}_示範`) W(tag + ` 示範圖名稱應該是「句型${i + 1}_示範」（現在：${C.demo.pic}）`);
    }
    const pairs = C.pairs || [];
    if (!pairs.some((p) => p.fit === false)) W(tag + ' 句子合併沒有反例（fit:false）');
    pairs.forEach((p) => {
      if (p.fit && !inOrder(p.j || '', s.conn)) E(tag + ' 合併句沒照順序用到連接詞：' + p.j);
      if (p.fit === false && (!p.why || !p.alt)) E(tag + ' 反例要有 why、alt');
    });
    if (!C.look) W(tag + ' 沒有看圖造句 combine.look');
    else {
      if (C.look.pic !== `句型${i + 1}_看圖`) W(tag + ` 看圖造句圖名稱應該是「句型${i + 1}_看圖」`);
      if (!inOrder(C.look.model || '', s.conn)) E(tag + ' 看圖造句參考句沒照順序用到連接詞：' + C.look.model);
      if ((s.models || []).includes(C.look.model)) E(tag + ' 看圖造句參考句和例句一樣');
    }
  });

  // ── 讀懂課文 ──
  const R = L.reading || {};
  let text = null;
  const rf = join(SITE, 'data', 'reading', 'lesson' + id + '.js');
  if (existsSync(rf)) {
    vm.runInContext(readFileSync(rf, 'utf8'), ctx, { filename: rf });
    const RD = ctx.window.READINGS[id];
    text = RD.sections.flatMap((sec) => sec.paras).map((p) => p.map((t) => t[0]).join(''));
  }
  const keyOK = (k, where) => { if (text && !text.some((t) => t.includes(k))) E(`讀懂課文 ${where} 的螢光筆句子不在課文裡：「${k}」`); };
  if (!R.map) W('讀懂課文還沒有課文地圖 map（網站會標「待更新」）');
  if (!R.eventsByLevel || ![1, 2, 3].every((n) => R.eventsByLevel[n])) E('讀懂課文缺 eventsByLevel（1、2、3 都要有）');
  (R.map || []).forEach((m) => { if (!m.tag || !m.title || !m.sum || !m.paras) E('課文地圖格缺 tag/title/sum/paras：' + JSON.stringify(m).slice(0, 60)); });
  (R.paras || []).forEach((p) => {
    (p.keys || []).forEach((k) => keyOK(k, `第 ${p.no} 段`));
    if (text) (p.text || []).forEach((t) => { if (!text[t]) E(`第 ${p.no} 段的 text 索引 ${t} 超出課文段落數 ${text.length}`); });
  });
  (R.questions || []).forEach((q) => {
    if (!q.options || q.options.length < 3) E('問題選項太少：' + q.q);
    else if (!uniq(q.options)) E('問題選項重複：' + q.q);
    (q.keys || []).forEach((k) => keyOK(k, '問題「' + q.q + '」'));
  });
  if (!R.theme) W('讀懂課文沒有「想一想主旨」theme（可以不做，第 7 課以後都有）');
  if (R.sort) {
    R.sort.cards.forEach((c) => { if (!R.sort.groups[c.g]) E('分類卡片的 g 不對：' + c.t); (c.keys || []).forEach((k) => keyOK(k, '分類卡片')); });
    if (!R.sort.byLevel) E('分類活動缺 byLevel');
  }
  if (R.decode) {
    R.decode.items.forEach((d) => { (d.keys || []).forEach((k) => keyOK(k, '詩句解碼')); (d.ctxKeys || []).forEach((k) => keyOK(k, '詩句解碼語譯')); });
    if (!R.decode.byLevel) E('詩句解碼缺 byLevel');
  }
  if (!text) W('沒有課文原稿 data/reading/lesson' + id + '.js（老師電腦才有），螢光筆句子沒核對');

  // ── 形近字、成語、修辭、聽聽看 ──
  const famIds = (L.families || []).map((f) => f.id);
  (L.lookalikes || []).forEach((q) => {
    if (!famIds.includes(q.fam)) E(`形近字題 ${q.id} 的 fam「${q.fam}」不存在`);
    if (!uniq(q.options || [])) E(`形近字題 ${q.id} 選項重複`);
    if (q.poly) { if (!q.sentence.includes(q.hl)) E(`形近字題 ${q.id} 句子裡沒有「${q.hl}」`); }
    else if (!q.sentence.includes('＿')) E(`形近字題 ${q.id} 句子要有全形底線「＿」`);
  });
  (L.idioms || []).forEach((d) => {
    if (d.options && d.options[0] !== d.idiom[d.blank]) E(`成語「${d.idiom}」補字的第一個選項要是正確答案「${d.idiom[d.blank]}」`);
    if (d.zy && syl(d.zy) !== han(d.idiom)) E(`成語「${d.idiom}」注音數量不對`);
  });
  (L.listening || []).forEach((q) => { if (!q.listen || !q.q || !q.options) E('聽聽看題目缺欄位：' + (q.focus || '')); });

  // ── 圖：資料用到的圖，有沒有排進生圖設定（tools/cards_XX*.json）、畫好了沒 ──
  const pics = new Set();
  (L.words || []).forEach((w) => pics.add(w.w));
  (L.idioms || []).forEach((d) => pics.add(d.idiom));
  (L.families || []).forEach((f) => f.members.forEach((m) => m.pic && pics.add(m.pic)));
  Object.values(CP).forEach((P) => P.pic && pics.add(P.pic));
  (L.phrases || []).forEach((p) => { p.pic && pics.add(p.pic); (p.examplePics || []).forEach((x) => pics.add(x)); (p.scenes || []).forEach((s) => s.pic && pics.add(s.pic)); });
  (L.sentences || []).forEach((s) => { const C = s.combine || {}; C.demo && C.demo.pic && pics.add(C.demo.pic); C.look && pics.add(C.look.pic); });
  const planned = new Set();
  const tdir = join(SITE, 'tools');
  if (existsSync(tdir)) readdirSync(tdir).filter((f) => f.startsWith('cards_' + id) && f.endsWith('.json'))
    .forEach((f) => JSON.parse(readFileSync(join(tdir, f), 'utf8')).cards.forEach((c) => planned.add(c.name)));
  const missing = [], unplanned = [];
  for (const p of pics) {
    if (!existsSync(join(SITE, 'images', 'lesson' + id, p + '.webp'))) { missing.push(p); if (!planned.has(p)) unplanned.push(p); }
  }
  if (unplanned.length) W(`${unplanned.length} 張圖還沒畫、也沒寫進 cards_${id}*.json：${unplanned.slice(0, 12).join('、')}${unplanned.length > 12 ? '…' : ''}`);
  if (missing.length) W(`${missing.length} 張圖還沒畫好（圖卡會先顯示準備中）`);

  console.log(`第 ${id} 課〈${L.title}〉` + (out.length ? '\n' + out.join('\n') : '　✅ 全部符合規格'));
}
console.log(`\n合計：❌ ${bad} 個要改、⚠ ${warn} 個請確認`);
process.exit(bad ? 1 : 0);
