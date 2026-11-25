/* 出卷：選課次、題型、組別 → 隨機出一份直書考卷（A4／B4 橫式、上下雙欄），可以直接改題目、改破音字，然後列印。
 * 題庫：data/exam.enc.js（用出卷密碼加密）；老師電腦本機測試時用 data/exam_plain.js（不進 repo）。
 * 每一句題目都帶著每個字的注音（z 陣列，對齊「完整句子」plainOf）；老師改字時，沒改到的字保留原本的讀音。 */
(function () {
  'use strict';
  var LESSONS = window.LESSONS || {};
  var BANK = window.EXAM_BANK || null;
  var ENC = window.EXAM_ENC || null;
  var KEY_STORE = 'tm-examkey', SAVE = 'tm-exam-v1';
  var CN = '一二三四五六七八九十', NUMS = '①②③④⑤⑥⑦⑧⑨';

  // ── 讀音表：字 → 讀音（第一個是預設） ──
  var ZY = {};
  Object.keys(window.EXAM_ZY1 || {}).forEach(function (z) { Array.from(window.EXAM_ZY1[z]).forEach(function (c) { if (!ZY[c]) ZY[c] = [z]; }); });
  Object.keys(window.EXAM_ZYP || {}).forEach(function (c) { ZY[c] = window.EXAM_ZYP[c].split(' '); });
  var HAN = /[㐀-鿿豈-﫿〇○]/;
  function dz(c) { return HAN.test(c) && ZY[c] ? ZY[c][0] : ''; }
  function zyOf(text) { return Array.from(text).map(dz); }
  // 改過的句子：前後沒變的字保留原本的讀音，中間改過的字用預設讀音
  function rezy(oldText, oldZ, newText) {
    var a = Array.from(oldText || ''), b = Array.from(newText), z = [], i = 0, j = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    for (var k = 0; k < b.length; k++) {
      if (k < i) z.push((oldZ || [])[k] || dz(b[k]));
      else if (k >= b.length - j) z.push((oldZ || [])[a.length - (b.length - k)] || dz(b[k]));
      else z.push(dz(b[k]));
    }
    return z;
  }

  // ── 題目字串 → 完整句子（和 tools/build_exam.py 的 plain 一樣） ──
  function plainOf(kind, s) {
    if (kind === 'look') return s.replace(/（([^）]*)）/g, function (m, g) { var o = g.split('／').filter(function (x) { return x[0] === '*'; })[0]; return o ? o.slice(1) : g.split('／')[0]; });
    if (kind === 'fix') return s.replace(/〔([^>〕]*)>([^〕]*)〕/g, '$2');
    return s.replace(/[〔〕]/g, '');
  }
  // 題目字串 → 段落：[{t:'text', a, b}]（a、b 是完整句子的位置）或特殊格子
  function segs(kind, s) {
    var out = [], p = 0, re = kind === 'look' ? /（([^）]*)）/g : /〔([^〕]*)〕/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) { var t = s.slice(last, m.index); out.push({ t: 'text', a: p, b: p + Array.from(t).length }); p += Array.from(t).length; }
      if (kind === 'look') {
        var os = m[1].split('／'), ok = os.filter(function (x) { return x[0] === '*'; })[0] || os[0];
        out.push({ t: 'opts', at: p, opts: os.map(function (x) { return x.replace(/^\*/, ''); }), ans: ok.replace(/^\*/, '') }); p += 1;
      } else if (kind === 'fix') {
        var ab = m[1].split('>');
        out.push({ t: 'wrong', at: p, wrong: ab[0], right: ab[1] }); p += Array.from(ab[1]).length;
      } else {
        var n = Array.from(m[1]).length;
        out.push({ t: 'slot', a: p, b: p + n, w: m[1] }); p += n;
      }
      last = re.lastIndex;
    }
    if (last < s.length) { var r = s.slice(last); out.push({ t: 'text', a: p, b: p + Array.from(r).length }); }
    return out;
  }

  // ── 小工具 ──
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') el.className = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function cnNum(n) { return n <= 10 ? (n === 10 ? '十' : CN[n - 1]) : n < 20 ? '十' + CN[n - 11] : CN[Math.floor(n / 10) - 1] + '十' + (n % 10 ? CN[n % 10 - 1] : ''); }

  // ── 大題設定 ──
  var SECS = [
    { k: 'dict', name: '看注音寫國字', head: '看注音，在格子裡寫出國字。', n: 10, pts: 2, zy: true },
    { k: 'radical', name: '部首造詞', head: '寫出部首，並造一個語詞。', n: 6, pts: 3, zy: false },
    { k: 'look', name: '圈形近字', head: '圈出正確的字。', n: 5, pts: 2, zy: true },
    { k: 'fix', name: '改錯字', head: '每一句都有一個錯字，把它圈起來，再把正確的字寫在（　）裡。', n: 5, pts: 2, zy: true, off: true },
    { k: 'idiom', name: '成語填代號', head: '從框框裡選出適當的成語，把代號寫在（　）裡。', n: 5, pts: 2, zy: true },
    { k: 'word', name: '選語詞', head: '選出適當的語詞。', n: 5, pts: 2, zy: true },
    { k: 'choice', name: '課文理解', head: '根據課文，選出正確的答案。', n: 6, pts: 2, zy: true },
    { k: 'phrase', name: '照樣寫短語', head: '照樣寫短語。', n: 2, pts: 5, zy: false },
    { k: 'imitate', name: '造句', head: '造句。', n: 2, pts: 5, zy: false }
  ];
  var SEC = {}; SECS.forEach(function (s) { SEC[s.k] = s; });
  var GROUPS = { std: { name: '一般', choiceN: 4, fixBold: false, phraseBank: false }, mid: { name: '中組', choiceN: 3, fixBold: true, phraseBank: true } };

  var st = null;      // 目前這一份
  function defaults() {
    var secs = {};
    SECS.forEach(function (s) { secs[s.k] = { on: !s.off, n: s.n, pts: s.pts, zy: s.zy }; });
    return { v2: 1, lessons: [], group: 'std', paper: 'B4', title: '', titleAuto: true, headZy: false, answers: true, secs: secs, items: {}, heads: {} };
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(st)); } catch (e) { } }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (s && s.secs) { if (!s.v2) { s.v2 = 1; if (s.secs.dict) s.secs.dict.zy = true; } var d = defaults(); SECS.forEach(function (x) { if (!s.secs[x.k]) s.secs[x.k] = d.secs[x.k]; }); return s; } } catch (e) { }
    return null;
  }
  function G() { return GROUPS[st.group] || GROUPS.std; }
  function autoTitle() {
    var ls = st.lessons.slice().sort();
    if (!ls.length) return '考試卷';
    var n = ls.map(function (l) { return parseInt(l, 10); });
    var contiguous = n.every(function (x, i) { return !i || x === n[i - 1] + 1; });
    var txt = n.length === 1 ? '第' + cnNum(n[0]) + '課' : contiguous ? '第' + cnNum(n[0]) + '～' + cnNum(n[n.length - 1]) + '課' : '第' + n.map(cnNum).join('、') + '課';
    return txt + '　考試卷';
  }

  // ── 出題：各課平均分配、避免答案在別題出現 ──
  function pool(kind) {
    var out = [];
    st.lessons.forEach(function (lid) {
      var L = BANK[lid]; if (!L) return;
      (L[kind] || []).forEach(function (it, i) { out.push({ lid: lid, i: i }); });
    });
    return out;
  }
  // 從各課輪流抽（同一課的題目不會擠在一起）
  function draw(kind, n, exclude) {
    var by = {};
    pool(kind).forEach(function (r) { if (!(exclude || {})[r.lid + ':' + r.i]) (by[r.lid] = by[r.lid] || []).push(r); });
    var ls = shuffle(Object.keys(by)); ls.forEach(function (l) { by[l] = shuffle(by[l]); });
    var out = [];
    while (out.length < n && ls.some(function (l) { return by[l].length; })) ls.forEach(function (l) { if (out.length < n && by[l].length) out.push(by[l].shift()); });
    return shuffle(out);
  }
  function mk(kind, ref) {
    var src = BANK[ref.lid][kind][ref.i], it = clone(src);
    it.kind = kind; it.lid = ref.lid; it.ref = ref.lid + ':' + ref.i;
    if (kind === 'choice') it.order = shuffle([0, 1, 2, 3].slice(0, it.o.length));
    if (kind === 'word') it.order = shuffle([0, 1, 2, 3]);
    if (kind === 'look') it.flip = Math.random() < 0.5;
    if (kind === 'phrase') it.pick = it.w.map(function (w, k) { return it.fix[k] ? [] : shuffle(it.bank[k] || []).slice(0, 2); });
    return it;
  }
  function makeIdiomBank() {
    var used = (st.items.idiom || []).map(function (it) { return it.w; });
    var extra = [];
    st.lessons.forEach(function (lid) { ((LESSONS[lid] || {}).idioms || []).forEach(function (x) { if (used.indexOf(x.idiom) < 0) extra.push(x.idiom); }); });
    var visible = allVisible(null);
    extra = shuffle(extra).filter(function (w) { return !answersOf(null).some(function (a) { return w.indexOf(a) >= 0; }) && visible.indexOf(w) < 0; });
    st.idiomBank = shuffle(used.concat(extra.slice(0, used.length ? 1 : 0)));
  }
  // 學生要寫／選的答案（不能在別題露出來）
  function answersOf(skip) {
    var a = [];
    each(function (it) {
      if (it === skip) return;
      if (it.kind === 'dict' || it.kind === 'word') segs(it.kind, it.s).forEach(function (g) { if (g.t === 'slot') a.push(g.w); });
      if (it.kind === 'radical') a.push(it.c);
    });
    return a;
  }
  // 一題印在卷子上看得到的字（不含它自己要藏起來的答案）
  function visibleOf(it) {
    switch (it.kind) {
      case 'dict': case 'idiom': case 'word':
        return segs(it.kind, it.s).filter(function (g) { return g.t === 'text'; }).map(function (g) { return Array.from(plainOf(it.kind, it.s)).slice(g.a, g.b).join(''); }).join('|') + (it.kind === 'word' ? '|' + it.o.join('|') + '|' + segs('word', it.s).filter(function (g) { return g.t === 'slot'; }).map(function (g) { return g.w; }).join('|') : '') + (it.kind === 'idiom' ? '|' + it.w : '');
      case 'look': return it.s;
      case 'fix': return it.s.replace(/〔([^>]*)>[^〕]*〕/g, '$1');
      case 'choice': return it.s + '|' + it.o.join('|');
      case 'radical': return it.c;
      case 'phrase': return it.w.join('') + '|' + [].concat.apply([], it.pick || []).join('|');
      default: return it.s || '';
    }
  }
  function allVisible(skip) { var v = []; each(function (it) { if (it !== skip) v.push(visibleOf(it)); }); return v.join('|') + '|' + (st.idiomBank || []).join('|'); }
  function each(f) { SECS.forEach(function (s) { if (st.secs[s.k].on) (st.items[s.k] || []).forEach(f); }); }
  function leaks() {
    var bad = [];
    each(function (it) {
      var mine = answersOfItem(it);
      if (!mine.length) return;
      var others = allVisible(it);
      mine.forEach(function (w) { if (others.indexOf(w) >= 0) bad.push({ it: it, w: w }); });
    });
    return bad;
  }
  function answersOfItem(it) {
    if (it.kind === 'dict' || it.kind === 'word') return segs(it.kind, it.s).filter(function (g) { return g.t === 'slot'; }).map(function (g) { return g.w; });
    if (it.kind === 'radical') return [it.c];
    return [];
  }
  // 目前卷子上（除了 skip）的答案 A、看得到的字 V；新的一題 ok：不含別題的答案、自己的答案也沒在別題露出來
  function ctx(skip) {
    var A = [], V = [];
    each(function (it) { if (it !== skip) { A = A.concat(answersOfItem(it)); V.push(visibleOf(it)); } });
    V.push((st.idiomBank || []).join('|'));
    return { A: A, V: V };
  }
  function fits(it, C) {
    var vis = visibleOf(it), mine = answersOfItem(it);
    if (C.A.some(function (a) { return vis.indexOf(a) >= 0 && mine.indexOf(a) < 0; })) return false;
    if (mine.some(function (a) { return C.V.some(function (v) { return v.indexOf(a) >= 0; }); })) return false;
    return true;
  }
  // 選語詞：錯的選項多於三個時，挑三個不會洩漏答案的
  function trimWord(it, C) {
    if (it.kind !== 'word' || it.o.length <= 3) return;
    var idx = shuffle(it.o.map(function (x, i) { return i; }));
    var good = idx.filter(function (i) { return !C.A.some(function (a) { return it.o[i].indexOf(a) >= 0; }); });
    var use = good.concat(idx.filter(function (i) { return good.indexOf(i) < 0; })).slice(0, 3);
    it.o = use.map(function (i) { return it.o[i]; }); it.oz = use.map(function (i) { return it.oz[i]; });
  }
  function take(C, it) { C.A = C.A.concat(answersOfItem(it)); C.V.push(visibleOf(it)); }
  // 依順序挑 n 題：先挑不會洩漏的，不夠才用會洩漏的補
  function pick(kind, n, C, exclude) {
    var chosen = [], spare = [];
    draw(kind, 999, exclude).forEach(function (r) {
      if (chosen.length >= n) return;
      var it = mk(kind, r);
      trimWord(it, C);
      if (fits(it, C)) { chosen.push(it); take(C, it); } else spare.push(it);
    });
    while (chosen.length < n && spare.length) { var x = spare.shift(); chosen.push(x); take(C, x); }
    return chosen;
  }
  // 修補：答案出現在別的題目裡 → 把「露出答案的那一題」換成沒有這些答案的題目
  function repair() {
    var t1 = Date.now();
    for (var t = 0; t < 30 && Date.now() - t1 < 150; t++) {
      var L = leaks(); if (!L.length) return;
      var x = L[Math.floor(Math.random() * L.length)], victim = null;
      each(function (it) { if (!victim && it !== x.it && visibleOf(it).indexOf(x.w) >= 0) victim = it; });
      if (!victim) return;
      var list = st.items[victim.kind], used = {}; list.forEach(function (y) { used[y.ref] = 1; });
      var C = ctx(victim), alt = null;
      draw(victim.kind, 999, used).some(function (r) { var it = mk(victim.kind, r); trimWord(it, C); if (fits(it, C)) { alt = it; return true; } return false; });
      if (!alt) continue;
      list[list.indexOf(victim)] = alt;
      if (victim.kind === 'idiom') makeIdiomBank();
    }
  }
  // 先挑只是「看得到」的大題，最後才挑有答案的大題（選語詞、部首、寫國字），答案從還沒出現過的詞裡挑
  var PICK_ORDER = ['look', 'fix', 'idiom', 'choice', 'phrase', 'imitate', 'word', 'radical', 'dict'];
  function generate() {
    // 隨機出很多份，留下「答案在別題露出來」最少的一份
    var best = null, bestN = 1e9;
    var t0 = Date.now();
    for (var t = 0; t < 40 && bestN > 0 && (t < 3 || Date.now() - t0 < 600); t++) {
      st.items = {}; st.idiomBank = [];
      var C = { A: [], V: [] };
      PICK_ORDER.forEach(function (k) {
        var on = st.secs[k].on;
        st.items[k] = shuffle(pick(k, st.secs[k].n, on ? C : { A: [], V: [] }));
      });
      makeIdiomBank();
      repair();
      var n = leaks().length;
      if (n < bestN) { bestN = n; best = { items: st.items, bank: st.idiomBank }; }
    }
    st.items = best.items; st.idiomBank = best.bank;
    st.heads = {};
    save();
  }
  function replaceOne(it) {
    var list = st.items[it.kind], used = {}; list.forEach(function (x) { used[x.ref] = 1; });
    var alt = pick(it.kind, 1, ctx(it), used)[0];
    if (!alt) { alert('這幾課的題庫沒有別的題目可以換了。'); return; }
    list[list.indexOf(it)] = alt;
    if (it.kind === 'idiom') makeIdiomBank();
    save(); render();
  }

  // ── 直書排版引擎：每個字一格（1em），自己斷行、分欄、分頁（不靠瀏覽器的直書，注音才不會跑掉） ──
  // 段落 = 一串格子；格子：{k:'c', c, z, r(可點的字), b(粗體), big, sh(灰底)}、{k:'box'}、{k:'sq'}、{k:'num'}、{k:'sp'}
  var REFS = [];
  var OPEN = '（「『〔【《〈︵﹁﹃', CLOSE = '）」』〕】》〉，。、；：？！︶﹂﹄';
  var VERT = { '（': '︵', '）': '︶', '「': '﹁', '」': '﹂', '『': '﹃', '』': '﹄' };
  var ROT = '～…─—〔〕【】《》〈〉：；';         // 直書時轉 90 度
  var SHIFT = '，。、．';                          // 直書時放在右上角
  function Para(first, rest) { this.cells = []; this.first = first || 0; this.rest = rest == null ? first || 0 : rest; this.gs = []; }
  Para.prototype.push = function (c) { this.cells.push(c); return this; };
  // 文字：showZy 時有注音；setZ(i, z) 讓老師點字改讀音
  Para.prototype.t = function (text, zarr, showZy, setZ, st) {
    var self = this; st = st || {};
    Array.from(text).forEach(function (c, i) {
      var z = (zarr || [])[i] || '', cell = { k: 'c', c: c, z: showZy && HAN.test(c) ? z : '', b: st.b, big: st.big, sh: st.sh };
      if (HAN.test(c) && setZ) cell.r = REFS.push({ c: c, z: z, set: function (nz) { setZ(i, nz); } }) - 1;
      self.cells.push(cell);
    });
    return this;
  };
  Para.prototype.raw = function (text, st) { return this.t(text, null, false, null, st); };
  Para.prototype.box = function (c, z, set) { this.cells.push({ k: 'box', z: z, r: REFS.push({ c: c, z: z, set: set }) - 1 }); return this; };
  Para.prototype.sq = function (n) { for (var i = 0; i < n; i++) this.cells.push({ k: 'sq' }); return this; };
  Para.prototype.num = function (n) { this.cells.push({ k: 'num', t: String(n) + '.' }); return this; };
  Para.prototype.sp = function (n, st) { for (var i = 0; i < (n || 1); i++) this.cells.push({ k: 'sp', sh: st && st.sh }); return this; };
  Para.prototype.paren = function (n) { this.cells.push({ k: 'c', c: '（' }); this.sp(n); this.cells.push({ k: 'c', c: '）' }); return this; };
  // 一組不要拆開的格子（選項、詞庫的詞）
  Para.prototype.group = function (fn) { var a = this.cells.length; fn(this); this.gs.push([a, this.cells.length]); return this; };
  function adv(c) { return c.k === 'box' ? 1.9 : c.k === 'sq' ? 1.5 : c.big ? 1.15 : 1; }

  // 段落 → 一欄一欄（L：一欄可以放幾個 em）
  function breakPara(p, L) {
    var cols = [], cur = null, pos = 0, gEnd = {};
    p.gs.forEach(function (g) { gEnd[g[0]] = g[1]; });
    function newCol() { cur = { cells: [], start: cols.length ? p.rest : p.first }; cols.push(cur); pos = cur.start; }
    newCol();
    for (var i = 0; i < p.cells.length; i++) {
      var c = p.cells[i], a = adv(c);
      if (gEnd[i] != null) {   // 一組放不下這一欄、但新的一欄放得下 → 整組換欄
        var gl = 0; for (var j = i; j < gEnd[i]; j++) gl += adv(p.cells[j]);
        if (pos + gl > L + 0.01 && cur.cells.length && gl <= L - p.rest) newCol();
      }
      if (pos + a > L + 0.01 && cur.cells.length) {
        if (c.k === 'c' && CLOSE.indexOf(c.c) >= 0 && pos + a <= L + 1.01) { /* 標點可以掛在欄尾 */ }
        else newCol();
      }
      if (c.k === 'c' && OPEN.indexOf(c.c) >= 0 && pos + a + 1 > L + 0.01 && cur.cells.length) newCol();   // 開括號不放欄尾
      if (c.k === 'sp' && !cur.cells.length && cols.length > 1) continue;   // 欄頭不放空白
      cur.cells.push(c); pos += a;
    }
    cols.forEach(function (col) { col.wide = col.cells.some(function (c) { return c.z; }); col.box = col.cells.some(function (c) { return c.k === 'box'; }); col.sq = col.cells.some(function (c) { return c.k === 'sq'; }); });
    return cols;
  }
  var PITCH = 1.42, PITCH_Z = 1.9;
  function colW(col) { return col.line ? 2.1 : col.box ? 3.05 : col.sq ? Math.max(1.7, col.wide ? PITCH_Z : PITCH) : col.wide ? PITCH_Z : PITCH; }

  function zyEl(syl) {
    var el = h('span', { class: 'zy' }), light = syl.indexOf('˙') >= 0, tone = '';
    if (light) syl = syl.replace('˙', '');
    if (/[ˊˇˋ]$/.test(syl)) { tone = syl.slice(-1); syl = syl.slice(0, -1); }
    var sy = Array.from(syl), n = sy.length + (light ? 1 : 0);
    var stack = h('span', { class: 'zs', style: 'height:' + n + 'em' }, light ? h('i', { class: 'lt' }, '˙') : null, sy.map(function (s) { return h('i', {}, s); }));
    add(el, stack);
    if (tone) add(el, h('i', { class: 'tn', style: 'top:calc(50% + ' + (n / 2 - 1) + 'em - .1em)' }, tone));
    return el;
  }
  function cellEl(c) {
    var cls = 'cell' + (c.sh ? ' sh' : '') + (c.b ? ' b' : '') + (c.big ? ' big' : '');
    if (c.k === 'sp') return h('div', { class: cls });
    if (c.k === 'sq') return h('div', { class: 'cell sqc' }, h('span', { class: 'sq' }));
    if (c.k === 'num') return h('div', { class: cls + ' num' }, c.t);
    var poly = c.r != null && REFS[c.r] && (ZY[REFS[c.r].c] || []).length > 1;
    var attrs = { class: cls + (c.k === 'box' ? ' boxc' : '') + (c.r != null ? ' ch' : '') + (poly ? ' poly' : '') };
    if (c.r != null) attrs['data-r'] = c.r;
    var g;
    if (c.k === 'box') g = h('span', { class: 'g bx' });
    else {
      var ch = VERT[c.c] || c.c;
      g = h('span', { class: 'g' + (ROT.indexOf(c.c) >= 0 ? ' rot' : '') + (SHIFT.indexOf(c.c) >= 0 ? ' shift' : '') }, ch);
    }
    return h('div', attrs, g, c.z ? zyEl(c.z) : null);
  }
  function colEl(col) {
    var el = h('div', { class: 'col' + (col.line ? ' wl' : '') + (col.box ? ' bxcol' : '') + (col.sq ? ' sqcol' : ''), style: 'width:' + colW(col) + 'em;padding-top:' + (col.start || 0) + 'em' });
    (col.cells || []).forEach(function (c) { el.appendChild(cellEl(c)); });
    return el;
  }

  function sentence(p, it, showZy, opt) {
    opt = opt || {};
    var P = Array.from(plainOf(it.kind, it.s)), setZ = function (i, nz) { it.z[i] = nz; save(); };
    segs(it.kind, it.s).forEach(function (g) {
      if (g.t === 'text') p.t(P.slice(g.a, g.b).join(''), it.z.slice(g.a, g.b), showZy, function (i, nz) { setZ(g.a + i, nz); });
      else if (g.t === 'slot') {
        if (it.kind === 'dict') Array.from(g.w).forEach(function (c, i) { p.box(c, it.z[g.a + i] || '', function (nz) { setZ(g.a + i, nz); }); });
        else if (it.kind === 'idiom') p.paren(3);
        else if (it.kind === 'word') p.group(function () { p.sq(Array.from(g.w).length); });
      } else if (g.t === 'opts') {
        var os = it.flip ? g.opts.slice().reverse() : g.opts;
        p.group(function () { p.raw('（' + os.join('／') + '）', { big: true }); });
      } else if (g.t === 'wrong') {
        p.t(g.wrong, [it.z[g.at] || ''], false, null, { b: opt.bold });
      }
    });
    return p;
  }

  // ── 每個大題 → 方塊（方塊 = 幾欄） ──
  function buildBlocks(L) {
    REFS = [];
    var blocks = [], secNo = 0, g = G();
    function blk(paras, it, keep) {
      var cols = [];
      paras.forEach(function (p) { if (p) cols = cols.concat(p.line ? [{ line: true }] : breakPara(p, L)); });
      return { cols: cols, item: it, keep: keep };
    }
    SECS.forEach(function (S) {
      var cfg = st.secs[S.k], items = st.items[S.k] || [];
      if (!cfg.on || !items.length) return;
      var n = items.length, z = cfg.zy;
      var headTxt = cnNum(++secNo) + '、' + S.head;
      if (!st.heads[S.k] || st.heads[S.k].t !== headTxt) st.heads[S.k] = { t: headTxt, z: zyOf(headTxt) };
      var hp = new Para(0, 1.5).t(headTxt, st.heads[S.k].z, st.headZy, function (i, nz) { st.heads[S.k].z[i] = nz; save(); }, { b: true });
      var pts = '（每題' + cfg.pts + '分，共' + cfg.pts * n + '分）';
      pts.split(/(\d+)/).forEach(function (x) { if (/^\d+$/.test(x)) hp.push({ k: 'num', t: x }); else if (x) hp.raw(x); });
      var hb = blk([hp], null, true); hb.head = true; blocks.push(hb);
      if (S.k === 'idiom') {
        var bp = new Para(1.5, 1.5);
        (st.idiomBank || []).forEach(function (w, k) {
          bp.group(function () { bp.raw(NUMS[k], { sh: true }); var it = items.filter(function (x) { return x.w === w; })[0]; bp.t(w, it ? it.wz : zyOf(w), z, it ? function (i, nz) { it.wz[i] = nz; save(); } : null, { sh: true }); bp.sp(1, { sh: true }); });
        });
        blocks.push(blk([bp], null, true));
      }
      items.forEach(function (it, k) {
        var no = k + 1, paras = [], p;
        switch (S.k) {
          case 'dict': p = new Para(0, 1.5).num(no); paras.push(sentence(p, it, z)); break;
          case 'radical': p = new Para(1.5).num(no).sp(1).t(it.c, [], false, null, { b: true, big: true }).sp(1).raw('部首').paren(2).sp(1).raw('造詞').paren(4); paras.push(p); break;
          case 'look': p = new Para(0, 1.5).num(no); paras.push(sentence(p, it, z)); break;
          case 'fix': p = new Para(0, 3).paren(2).num(no); paras.push(sentence(p, it, z, { bold: g.fixBold })); break;
          case 'idiom': p = new Para(0, 1.5).num(no); paras.push(sentence(p, it, z)); break;
          case 'word':
            p = new Para(0, 3).paren(1).num(no); paras.push(sentence(p, it, z));
            var ans = segs('word', it.s).filter(function (x) { return x.t === 'slot'; })[0];
            var wo = [ans.w].concat(it.o), op = new Para(3, 3);
            it.order.forEach(function (oi, j) {
              op.group(function () { op.raw(NUMS[j]); op.t(wo[oi], oi === 0 ? it.z.slice(ans.a, ans.b) : it.oz[oi - 1], z, function (i, nz) { if (oi === 0) it.z[ans.a + i] = nz; else it.oz[oi - 1][i] = nz; save(); }); op.sp(1); });
            });
            paras.push(op); break;
          case 'choice':
            p = new Para(0, 3).paren(1).num(no).t(it.s, it.z, z, function (i, nz) { it.z[i] = nz; save(); }); paras.push(p);
            var ord = it.order.filter(function (oi) { return oi < g.choiceN; });
            var long = ord.some(function (oi) { return Array.from(it.o[oi]).length > 8; });
            var cp = new Para(3, long ? 4 : 3);
            ord.forEach(function (oi, j) {
              if (long && j) { paras.push(cp); cp = new Para(3, 4); }   // 長的選項一個一欄
              cp.group(function () { cp.raw(NUMS[j]); cp.t(it.o[oi], it.oz[oi], z, function (i, nz) { it.oz[oi][i] = nz; save(); }); cp.sp(1); });
            });
            paras.push(cp); break;
          case 'phrase':
            p = new Para(0, 1.5).num(no);
            it.w.forEach(function (w, j) { p.t(w, it.z[j], z, function (i, nz) { it.z[j][i] = nz; save(); }); p.sp(1); });
            paras.push(p);
            if (g.phraseBank) {
              var bq = new Para(1.5, 4.5).raw('詞庫：');
              shuffleSeed([].concat.apply([], it.pick || []), it.ref).forEach(function (w) {
                bq.group(function () { bq.t(w, it.bz[w] || (it.bz[w] = zyOf(w)), z, function (i, nz) { it.bz[w][i] = nz; save(); }, { sh: true }); bq.sp(1, { sh: true }); bq.sp(1); });
              });
              paras.push(bq);
            }
            var bl = new Para(1.5, 1.5);
            it.w.forEach(function (w, j) { if (it.fix[j]) bl.t(w, it.z[j], z, null); else bl.paren(Math.max(2, Array.from(w).length + 1)); bl.sp(1); });
            paras.push(bl); break;
          case 'imitate':
            p = new Para(0, 1.5).num(no).t(it.s, it.z, z, function (i, nz) { it.z[i] = nz; save(); }); paras.push(p, { line: true }, { line: true }); break;
        }
        blocks.push(blk(paras, it, false));
      });
    });
    return blocks;
  }
  // 詞庫順序固定（每次重畫不要亂跳），但不是照原本順序
  function shuffleSeed(a, seed) {
    var s = 0; String(seed).split('').forEach(function (c) { s = (s * 31 + c.charCodeAt(0)) % 2147483647; });
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { s = (s * 48271) % 2147483647; var j = s % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ── 排版：方塊一個一個放進「上欄 → 下欄 → 下一頁」 ──
  var PAPER = { B4: [364, 257, 16], A4: [297, 210, 13.5] };   // 寬、高（mm）、字級（pt）
  var MM = 96 / 25.4;
  function geom() {
    var P = PAPER[st.paper] || PAPER.B4, fs = P[2] * 96 / 72;
    var rowH = ((P[1] - 20) - 5) / 2 * MM, rowW1 = (P[0] - 20 - 17 - 4) * MM, rowW = (P[0] - 20) * MM;
    return { P: P, fs: fs, L: Math.floor(rowH / fs * 100) / 100 - 0.3, w1: rowW1 / fs, w: rowW / fs };
  }
  function layout(box) {
    var G0 = geom(), blocks = buildBlocks(G0.L), pages = [], cur = null;
    function newPage() { cur = { rows: [[], []], ri: 0, used: 0, first: !pages.length }; pages.push(cur); }
    function rowW() { return cur.first ? G0.w1 : G0.w; }
    function nextRow() { if (cur.ri === 1) newPage(); else { cur.ri = 1; } cur.used = 0; }
    function width(cols) { return cols.reduce(function (s, c) { return s + colW(c); }, 0); }
    newPage();
    for (var i = 0; i < blocks.length; i++) {
      var group = [blocks[i]];
      while (group[group.length - 1].keep && i + 1 < blocks.length) group.push(blocks[++i]);   // 標題（和詞庫）跟著第一題
      var gw = group.reduce(function (s, b) { return s + width(b.cols); }, 0) + 0.3 * group.length;
      if (cur.used && cur.used + gw > rowW()) nextRow();
      group.forEach(function (b) {
        var w = width(b.cols) + 0.3;
        if (cur.used && cur.used + w > rowW()) nextRow();
        if (w > rowW()) {        // 一題比一整欄還寬：拆開放
          var part = { cols: [], item: b.item };
          b.cols.forEach(function (c) {
            if (cur.used + width(part.cols) + colW(c) > rowW() && part.cols.length) { cur.rows[cur.ri].push(part); nextRow(); part = { cols: [], item: b.item }; }
            part.cols.push(c);
          });
          cur.rows[cur.ri].push(part); cur.used += width(part.cols) + 0.3;
        } else { cur.rows[cur.ri].push(b); cur.used += w; }
      });
    }
    box.innerHTML = '';
    pages.forEach(function (pg) {
      var P = G0.P;
      var sheet = h('div', { class: 'sheet', style: 'width:' + P[0] + 'mm;height:' + P[1] + 'mm;font-size:' + P[2] + 'pt' });
      var inner = h('div', { class: 'inner' }), body = h('div', { class: 'body' });
      if (pg.first) add(inner, h('div', { class: 'titlebox' }, h('div', { class: 't1' }, '五上國語　' + (st.title || autoTitle())), h('div', { class: 't2' }, '五年　　班　　號　姓名：　　　　　　　得分：')));
      pg.rows.forEach(function (r, k) {
        if (k) add(body, h('div', { class: 'rule' }));
        var row = h('div', { class: 'row' });
        r.forEach(function (b) {
          var el = h('div', { class: 'blk' + (b.item ? ' it' : '') + (b.head ? ' hd' : '') }, b.cols.map(colEl));
          if (b.item) {
            el._item = b.item;
            add(el, h('span', { class: 'tools' },
              h('button', { type: 'button', onclick: function (e) { e.stopPropagation(); editItem(b.item); } }, '改題目'),
              h('button', { type: 'button', onclick: function (e) { e.stopPropagation(); replaceOne(b.item); } }, '換一題'),
              h('button', { type: 'button', onclick: function (e) { e.stopPropagation(); removeItem(b.item); } }, '刪除')));
          }
          add(row, el);
        });
        add(body, row);
      });
      add(inner, body); add(sheet, inner); add(box, sheet);
    });
    return pages.length;
  }
  function removeItem(it) {
    if (!confirm('刪掉這一題？')) return;
    var list = st.items[it.kind]; list.splice(list.indexOf(it), 1);
    if (it.kind === 'idiom') makeIdiomBank();
    save(); render();
  }

  function answerSheet(box) {
    var P = PAPER[st.paper] || PAPER.B4, g = G();
    var sheet = h('div', { class: 'sheet', style: 'width:' + P[0] + 'mm;height:' + P[1] + 'mm;font-size:14pt' });
    var inner = h('div', { class: 'ans', style: 'position:absolute;inset:12mm;columns:2;column-gap:10mm' });
    add(inner, h('h3', {}, '五上國語　' + (st.title || autoTitle()) + '　參考答案'));
    var secNo = 0;
    SECS.forEach(function (S) {
      var items = st.items[S.k] || [];
      if (!st.secs[S.k].on || !items.length) return;
      var a = items.map(function (it, k) {
        var n = (k + 1) + '. ';
        switch (S.k) {
          case 'dict': return n + segs('dict', it.s).filter(function (x) { return x.t === 'slot'; }).map(function (x) { return x.w; }).join('、');
          case 'radical': return n + it.c + '：' + it.r;
          case 'look': return n + segs('look', it.s).filter(function (x) { return x.t === 'opts'; }).map(function (x) { return x.ans; }).join('');
          case 'fix': return n + segs('fix', it.s).filter(function (x) { return x.t === 'wrong'; }).map(function (x) { return x.wrong + '→' + x.right; }).join('');
          case 'idiom': return n + NUMS[(st.idiomBank || []).indexOf(it.w)];
          case 'word': return n + NUMS[it.order.indexOf(0)];
          case 'choice': return n + NUMS[it.order.filter(function (oi) { return oi < g.choiceN; }).indexOf(0)];
          case 'phrase': return n + '（自由作答）';
          case 'imitate': return n + '（自由作答）';
        }
      });
      add(inner, h('div', { class: 'sec' }, h('b', {}, cnNum(++secNo) + '、' + S.name + '：'), a.join('　')));
    });
    add(sheet, inner); add(box, sheet);
  }

  // ── 編輯 ──
  var editing = false;
  var HELP = {
    dict: '〔　〕裡是要學生看注音寫的語詞（印成只有注音的格子）。',
    look: '（　）裡寫兩個字，用／分開，正確的字前面加 *。例：電影開始了，大家看著大螢（*幕／募）。',
    fix: '〔錯字>正確字〕。例：我把卡片〔奇>寄〕給阿姨。',
    idiom: '〔　〕裡是成語（印成括號，成語放到框框裡）。',
    word: '第一行：句子，〔　〕裡是答案。\n第二行：另外三個選項，用、分開（要和答案一樣字數）。',
    choice: '第一行：題目。\n第二行以後：一行一個選項，正確答案前面加 *。中組只印前三個（正確答案＋第二、三行）。',
    radical: '第一行：要考的字；第二行：部首。',
    phrase: '短語的詞用空白分開；照印的字（的、而、般…）前面加 *。\n例：引起 世人 *的 關注',
    imitate: '句型，例：雖然……可是……'
  };
  function toText(it) {
    switch (it.kind) {
      case 'word': return it.s + '\n' + it.o.join('、');
      case 'choice': return it.s + '\n' + it.o.map(function (o, i) { return (i === 0 ? '*' : '') + o; }).join('\n');
      case 'radical': return it.c + '\n' + it.r;
      case 'phrase': return it.w.map(function (w, i) { return (it.fix[i] ? '*' : '') + w; }).join(' ');
      default: return it.s;
    }
  }
  function fromText(it, txt) {
    var lines = txt.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) throw new Error('沒有內容');
    switch (it.kind) {
      case 'word':
        it.z = rezy(plainOf('word', it.s), it.z, plainOf('word', lines[0])); it.s = lines[0];
        var o = (lines[1] || '').split(/[、,，\s]+/).filter(Boolean);
        if (o.length !== 3) throw new Error('第二行要有三個選項');
        it.oz = o.map(function (w, i) { return it.o[i] === w ? it.oz[i] : zyOf(w); }); it.o = o; break;
      case 'choice':
        var q = lines[0], opts = lines.slice(1);
        if (opts.length < 3) throw new Error('至少要三個選項');
        var ci = opts.findIndex(function (x) { return x[0] === '*'; }); if (ci < 0) ci = 0;
        opts = opts.map(function (x) { return x.replace(/^\*/, ''); });
        var ordered = [opts[ci]].concat(opts.filter(function (x, i) { return i !== ci; })).slice(0, 4);
        it.z = rezy(it.s, it.z, q); it.s = q;
        it.oz = ordered.map(function (w) { var k = it.o.indexOf(w); return k >= 0 ? it.oz[k] : zyOf(w); }); it.o = ordered;
        if (it.order.length !== ordered.length) it.order = shuffle(ordered.map(function (x, i) { return i; }));
        break;
      case 'radical': it.c = Array.from(lines[0])[0]; it.r = lines[1] || ''; break;
      case 'phrase':
        var ws = lines[0].split(/\s+/);
        var oldZ = {}; it.w.forEach(function (w, i) { oldZ[w] = it.z[i]; });
        it.fix = ws.map(function (w) { return w[0] === '*'; }); it.w = ws.map(function (w) { return w.replace(/^\*/, ''); });
        it.z = it.w.map(function (w) { return oldZ[w] || zyOf(w); });
        it.pick = it.w.map(function (w, k) { return it.fix[k] ? [] : (it.pick && it.pick[k]) || []; }); break;
      default:
        var s = lines.join('');
        if (it.kind === 'dict' && !/〔[^〕]+〕/.test(s)) throw new Error('要用〔　〕標出學生要寫的語詞');
        if (it.kind === 'look' && !/（[^）]*\*/.test(s)) throw new Error('（　）裡正確的字前面要加 *');
        if (it.kind === 'fix' && !/〔[^〕]+>[^〕]+〕/.test(s)) throw new Error('要寫成〔錯字>正確字〕');
        if (it.kind === 'idiom') { var m = s.match(/〔([^〕]+)〕/); if (!m) throw new Error('要用〔　〕標出成語'); it.w = m[1]; it.wz = zyOf(m[1]); }
        it.z = rezy(plainOf(it.kind, it.s), it.z, plainOf(it.kind, s)); it.s = s;
    }
  }
  function editItem(it) {
    var ta = h('textarea', {}), err = h('div', { style: 'color:#B3261E;font-size:14px;min-height:1.4em' });
    ta.value = toText(it);
    var dlg = h('dialog', {}, h('h3', { style: 'margin:0 0 6px' }, '改題目（' + SEC[it.kind].name + '）'), h('div', { class: 'help' }, HELP[it.kind]), ta, err,
      h('div', { class: 'help' }, '改完後，注音會用常用讀音；破音字可以直接點卷子上的字改。'),
      h('div', { class: 'row2' }, h('button', { class: 'btn', type: 'button', onclick: function () { dlg.close(); } }, '取消'),
        h('button', { class: 'btn main', type: 'button', onclick: function () {
          var backup = clone(it);
          try { fromText(it, ta.value); } catch (e) { Object.assign(it, backup); err.textContent = e.message; return; }
          if (it.kind === 'idiom') { var b = st.idiomBank || [], k = b.indexOf(backup.w); if (k >= 0) b[k] = it.w; }
          dlg.close(); save(); render();
        } }, '儲存')));
    dlg.addEventListener('close', function () { dlg.remove(); });
    document.body.appendChild(dlg); dlg.showModal(); ta.focus();
  }
  // 點一個字 → 選讀音
  var popEl = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
  function pickZy(ref, x, y) {
    closePop();
    var list = (ZY[ref.c] || []).slice(); if (ref.z && list.indexOf(ref.z) < 0) list.unshift(ref.z);
    var inp = h('input', { type: 'text', placeholder: '自己打注音', value: '' });
    var setIt = function (z) { ref.set(z); closePop(); render(); };
    popEl = h('div', { class: 'pop' }, h('div', {}, '「', h('b', {}, ref.c), '」的讀音：'),
      h('div', { class: 'opts' }, list.map(function (z) { return h('button', { type: 'button', class: z === ref.z ? 'cur' : '', onclick: function () { setIt(z); } }, z); })),
      h('div', {}, inp, ' ', h('button', { type: 'button', class: 'btn', style: 'padding:3px 10px', onclick: function () { if (inp.value.trim()) setIt(inp.value.trim().replace(/\s+/g, '')); } }, '用這個')));
    document.body.appendChild(popEl);
    var r = popEl.getBoundingClientRect();
    popEl.style.left = Math.min(x + 8, innerWidth - r.width - 8) + 'px';
    popEl.style.top = Math.min(y + 8, innerHeight - r.height - 8) + 'px';
  }

  // ── 畫面 ──
  var app = document.getElementById('app'), sheetsBox = null, panel = null, lastPages = 0;
  function render() {
    closePop();
    var css = document.getElementById('page-size'), P = PAPER[st.paper] || PAPER.B4;
    css.textContent = '@page { size: ' + P[0] + 'mm ' + P[1] + 'mm; margin: 0; }';
    sheetsBox.style.zoom = '';
    var pages = layout(sheetsBox); lastPages = pages;
    if (st.answers) answerSheet(sheetsBox);
    sheetsBox.classList.toggle('editing', editing);
    // 預覽縮小到放得下
    var avail = sheetsBox.parentNode.clientWidth - 36, w = sheetsBox.firstChild ? sheetsBox.firstChild.offsetWidth : 1;
    if (w > avail) sheetsBox.style.zoom = String(Math.max(0.3, avail / w));
    drawPanel();
  }
  function drawPanel() {
    panel.innerHTML = '';
    var avail = Object.keys(BANK).sort();
    var total = 0; SECS.forEach(function (s) { if (st.secs[s.k].on) total += st.secs[s.k].pts * (st.items[s.k] || []).length; });
    add(panel, [
      h('a', { class: 'back', href: './' }, '← 回國語學習樂園'),
      h('h1', {}, '📝 出卷'),
      h('h2', {}, '課次'),
      h('div', { class: 'chips' }, Object.keys(LESSONS).sort().map(function (lid) {
        var ok = avail.indexOf(lid) >= 0, on = st.lessons.indexOf(lid) >= 0;
        return h('label', { class: 'chip' + (on ? ' on' : '') + (ok ? '' : ' off'), title: ok ? LESSONS[lid].title : '題庫還沒有這一課' },
          h('input', { type: 'checkbox', checked: on, disabled: !ok, onchange: function () { st.lessons = on ? st.lessons.filter(function (x) { return x !== lid; }) : st.lessons.concat(lid).sort(); generate(); render(); } }), String(parseInt(lid, 10)));
      })),
      h('h2', {}, '組別'),
      h('div', { class: 'chips' }, Object.keys(GROUPS).map(function (k) {
        return h('label', { class: 'chip' + (st.group === k ? ' on' : '') }, h('input', { type: 'radio', name: 'grp', checked: st.group === k, onchange: function () { st.group = k; save(); render(); } }), GROUPS[k].name);
      })),
      h('p', { class: 'tip' }, '中組：課文理解 3 個選項、改錯字的錯字用粗體、短語給詞庫。'),
      h('h2', {}, '紙張（橫式、直書、上下雙欄）'),
      h('div', { class: 'chips' }, ['B4', 'A4'].map(function (k) {
        return h('label', { class: 'chip' + (st.paper === k ? ' on' : '') }, h('input', { type: 'radio', name: 'paper', checked: st.paper === k, onchange: function () { st.paper = k; save(); render(); } }), k);
      })),
      h('div', { class: 'field' }, '標題', h('input', { type: 'text', value: st.title || autoTitle(), onchange: function (e) { st.title = e.target.value.trim(); save(); render(); } })),
      h('h2', {}, '題型'),
      h('table', { class: 'secs' }, h('tr', {}, h('th', {}, ''), h('th', { style: 'text-align:left' }, '大題'), h('th', {}, '題數'), h('th', {}, '每題分'), h('th', {}, '注音')),
        SECS.map(function (s) {
          var c = st.secs[s.k], have = pool(s.k).length;
          return h('tr', {},
            h('td', {}, h('input', { type: 'checkbox', checked: c.on, onchange: function () { c.on = !c.on; if (c.on && !(st.items[s.k] || []).length) { st.items[s.k] = pick(s.k, c.n, ctx(null)); if (s.k === 'idiom') makeIdiomBank(); } save(); render(); } })),
            h('td', { class: 'nm', title: '題庫有 ' + have + ' 題' }, s.name),
            h('td', {}, h('input', { type: 'number', min: 1, max: 20, value: (st.items[s.k] || []).length || c.n, onchange: function (e) { setCount(s.k, +e.target.value); } })),
            h('td', {}, h('input', { type: 'number', min: 1, max: 20, value: c.pts, onchange: function (e) { c.pts = Math.max(1, +e.target.value || 1); save(); render(); } })),
            h('td', {}, h('input', { type: 'checkbox', checked: c.zy, title: s.k === 'dict' ? '句子的注音（格子的注音一定會印）' : '', onchange: function () { c.zy = !c.zy; save(); render(); } })));
        })),
      h('div', { class: 'total' + (total === 100 ? '' : ' bad') }, '總分：' + total + ' 分' + (total === 100 ? '' : '（不是 100 分）')),
      (function () { var L = leaks(); return L.length ? h('div', { class: 'tip', style: 'color:#B3261E' }, '⚠️ 答案在別題出現：' + L.map(function (x) { return '「' + x.w + '」（' + SEC[x.it.kind].name + '）'; }).join('、') + '。可以按「編輯題目」→「換一題」。') : null; })(),
      h('label', { class: 'field' }, h('input', { type: 'checkbox', checked: st.headZy, onchange: function () { st.headZy = !st.headZy; save(); render(); } }), '大題標題也標注音'),
      h('label', { class: 'field' }, h('input', { type: 'checkbox', checked: st.answers, onchange: function () { st.answers = !st.answers; save(); render(); } }), '附參考答案（最後一頁）'),
      h('div', { class: 'tip', style: lastPages > 2 ? 'color:#B3261E;font-weight:700' : '' }, '考卷 ' + lastPages + ' 頁' + (lastPages > 2 ? '（超過兩頁：可以減少題數，或改用 B4）' : lastPages === 2 ? '（正反兩面）' : '')),
      h('div', { class: 'btns' },
        h('button', { class: 'btn', type: 'button', onclick: function () { if (confirm('重新出一份題目？（改過的題目會不見）')) { generate(); render(); } } }, '🔀 換一份題目'),
        h('button', { class: 'btn' + (editing ? ' on' : ''), type: 'button', onclick: function () { editing = !editing; render(); } }, editing ? '✏️ 編輯中（再按一次結束）' : '✏️ 編輯題目、改破音字'),
        h('button', { class: 'btn main', type: 'button', onclick: function () { editing = false; render(); setTimeout(function () { window.print(); }, 50); } }, '🖨️ 列印')),
      h('p', { class: 'tip' }, editing ? '編輯中：把滑鼠移到題目上，可以「改題目」「換一題」「刪除」；點任何一個字可以改它的注音（藍色注音是破音字）。' : '列印時紙張選「' + st.paper + '」、方向「橫向」，邊界選「無」，縮放 100%。'),
      h('p', { class: 'tip' }, '題目和讀音的修改會自動記在這台電腦。'),
      h('button', { class: 'btn', type: 'button', style: 'margin-top:10px;width:100%;font-size:14px', onclick: function () { if (confirm('鎖上題庫？下次要再輸入出卷密碼。')) { try { localStorage.removeItem(KEY_STORE); } catch (e) { } location.reload(); } } }, '🔒 鎖上題庫')
    ]);
  }
  function setCount(k, n) {
    n = Math.max(1, Math.min(20, n || 1));
    var list = st.items[k] = st.items[k] || [];
    st.secs[k].n = n;
    if (list.length > n) list.length = n;
    if (list.length < n) {
      var used = {}; list.forEach(function (x) { used[x.ref] = 1; });
      pick(k, n - list.length, ctx(null), used).forEach(function (x) { list.push(x); });
    }
    if (k === 'idiom') makeIdiomBank();
    save(); render();
  }

  // 本機測試用
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__exam = { generate: function () { generate(); }, leaks: function () { return leaks(); }, st: function () { return st; } };
  function start() {
    st = load() || defaults();
    st.lessons = st.lessons.filter(function (l) { return BANK[l]; });
    if (!st.lessons.length) { st.lessons = Object.keys(BANK).sort().slice(0, 3); generate(); }
    app.innerHTML = '';
    panel = h('aside', { class: 'panel' });
    sheetsBox = h('div', { class: 'sheets' });
    add(app, h('div', { class: 'wrap' }, panel, h('section', { class: 'preview' }, sheetsBox)));
    sheetsBox.addEventListener('click', function (e) {
      if (!editing) return;
      var ch = e.target.closest('.ch');
      if (ch) { e.stopPropagation(); var ref = REFS[+ch.getAttribute('data-r')]; if (ref) pickZy(ref, e.clientX, e.clientY); return; }
      var blk = e.target.closest('.blk.it');
      if (blk && blk._item) editItem(blk._item);
    });
    document.addEventListener('click', function (e) { if (popEl && !popEl.contains(e.target) && !e.target.closest('.ch')) closePop(); });
    var go = function () { render(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    var t = null; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 200); });
  }

  // ── 解鎖題庫（出卷密碼；和學生用的教室密碼不同） ──
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function unb64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function decryptWith(key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(ENC.iv) }, key, b64(ENC.data)).then(function (buf) {
      BANK = JSON.parse(new TextDecoder().decode(buf)); return key;
    });
  }
  function fromStore() {
    var raw = null; try { raw = localStorage.getItem(KEY_STORE); } catch (e) { }
    if (!raw || !ENC || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    return crypto.subtle.importKey('raw', b64(raw), { name: 'AES-GCM' }, false, ['decrypt']).then(decryptWith).then(function () { return true; })
      .catch(function () { try { localStorage.removeItem(KEY_STORE); } catch (e) { } return false; });
  }
  function withPassword(pw) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(ENC.salt), iterations: ENC.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    }).then(decryptWith).then(function (key) {
      return crypto.subtle.exportKey('raw', key).then(function (raw) { try { localStorage.setItem(KEY_STORE, unb64(raw)); } catch (e) { } });
    });
  }
  function lockScreen() {
    var inp = h('input', { type: 'password', autocomplete: 'off', 'aria-label': '出卷密碼' }), msg = h('p', { style: 'min-height:1.5em;color:#B3261E;margin:0' });
    var go = function () {
      if (!inp.value) return;
      msg.textContent = '解開中…';
      withPassword(inp.value).then(start).catch(function () { msg.textContent = '密碼不對，請再試一次。'; inp.value = ''; inp.focus(); });
    };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    app.innerHTML = '';
    add(app, h('div', { class: 'lock' }, h('h2', { style: 'margin-top:0' }, '📝 出卷'),
      ENC ? [h('p', {}, '請輸入老師的出卷密碼。'), inp, msg, h('button', { class: 'btn main', type: 'button', style: 'width:100%', onclick: go }, '開始出卷')]
        : h('p', {}, '題庫還沒有放上網站。請老師在電腦上執行 mandarin/tools/encrypt_exam.mjs。'),
      h('p', { style: 'margin-top:16px' }, h('a', { href: './' }, '← 回國語學習樂園'))));
    inp.focus();
  }

  // 老師電腦本機測試：有沒加密的題庫就直接用
  function boot() {
    if (BANK) return start();
    fromStore().then(function (ok) { if (ok) start(); else lockScreen(); });
  }
  if (!BANK && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    var s = document.createElement('script');
    s.src = 'data/exam_plain.js?t=' + Date.now();
    s.onload = function () { BANK = window.EXAM_BANK || null; boot(); };
    s.onerror = boot;
    document.head.appendChild(s);
  } else boot();
})();
