/*
 * 國語五上學習樂園
 * 設計原則（資源班）：
 *   鷹架  ─ 每一步都顯示「現在要做什麼」與步驟進度；分組呈現；提示逐步加強；所有文字都能點來聽。
 *   差異化 ─ 老師在學生的 iPad 上設定等級 1～3（每組數量、選項數、提示方式、注音、自動朗讀）。
 *   遊戲化 ─ 星星、完成度、慶祝動畫、配對與翻牌遊戲；不計時、不扣分、不搶快。
 * 學習紀錄只存在這台 iPad（localStorage），不上傳、不記姓名。
 */
(function () {
  'use strict';

  var LESSONS = window.LESSONS || {};
  var LESSON_LIST = [
    { id: '01', title: '蚊帳大使' },
    { id: '02', title: '從空中看臺灣' },
    { id: '03', title: '攀岩高手' },
    { id: '04', title: '恆久的美' },
    { id: '05', title: '它抓得住你──商標的故事' },
    { id: '06', title: '故事「動」起來' },
    { id: '07', title: '為生命找出口' },
    { id: '08', title: '最勇敢的女孩' },
    { id: '09', title: '在挫折中成長' },
    { id: '10', title: '山中寄情' },
    { id: '11', title: '與達駭黑熊走入山林' },
    { id: '12', title: '荒島上的國王' }
  ];

  // ── 等級（差異化）──────────────────────────────
  // wrongLimit：答錯幾次後直接標出正確答案（等級 1 答錯一次就標出＝近似零錯誤學習）
  var LEVELS = {
    1: { name: '等級 1　大量支持', desc: '每組 4 個、2 個選項、全程注音、自動念題目；答錯一次就標出正確答案。', group: 4, options: 2, pairs: 3, wrongLimit: 1, hint: true, autoRead: true, memory: false, orderCount: 1, prefill: 1 },
    2: { name: '等級 2　部分支持', desc: '每組 6 個、3 個選項；答錯先給提示，再錯才標出答案。', group: 6, options: 3, pairs: 4, wrongLimit: 2, hint: true, autoRead: false, memory: false, orderCount: 2, prefill: 0 },
    3: { name: '等級 3　少量支持', desc: '每組 9 個、4 個選項、翻牌記憶遊戲；沒有提示按鈕。', group: 9, options: 4, pairs: 5, wrongLimit: 2, hint: false, autoRead: false, memory: true, orderCount: 2, prefill: 0 }
  };
  var DEFAULT_SETTINGS = { level: 2, zhuyin: true, autoRead: null, sfx: true, rate: 0.85, sequential: false };
  var PRAISE = ['答對了！', '好厲害！', '太棒了！', '你做到了！', '真細心！'];
  var STORE_KEY = 'tm-g5a-v1';

  // ── 儲存 ───────────────────────────────────────
  var state = load();
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { s = {}; }
    s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
    s.progress = s.progress || {};
    return s;
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 私密瀏覽等情況：不影響使用 */ } }
  function cfg() {
    var s = state.settings, L = LEVELS[s.level] || LEVELS[2];
    return Object.assign({}, L, {
      level: s.level, zhuyin: s.zhuyin, sfx: s.sfx, rate: s.rate, sequential: s.sequential,
      autoRead: s.autoRead == null ? L.autoRead : s.autoRead
    });
  }

  // ── 小工具 ─────────────────────────────────────
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el) {
    for (var i = 1; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); continue; }
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function chunk(a, n) { var out = []; for (var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function today() { var d = new Date(); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function starsEl(n, max) {
    max = max || 3; var s = h('span', { class: 'stars', 'aria-label': n + ' 顆星' });
    for (var i = 0; i < max; i++) append(s, h('span', { class: i < n ? '' : 'off' }, '★'));
    return s;
  }
  function toast(msg) {
    var t = h('div', { style: 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#2A2825;color:#fff;padding:10px 20px;border-radius:999px;font-size:17px;z-index:70' }, msg);
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1800);
  }

  // ── 朗讀（iPad 內建中文語音）───────────────────
  var synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  var zhVoice = null, speakingBtn = null;
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    zhVoice = vs.find(function (v) { return /zh[-_]TW/i.test(v.lang); }) ||
      vs.find(function (v) { return /zh[-_](Hant|HK)/i.test(v.lang); }) ||
      vs.find(function (v) { return /^zh/i.test(v.lang); }) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  function speak(text, btn) {
    if (!synth || !text) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(String(text).replace(/＿+/g, '，空格，'));
    u.lang = 'zh-TW'; if (zhVoice) u.voice = zhVoice; u.rate = cfg().rate;
    if (speakingBtn) speakingBtn.classList.remove('speaking');
    if (btn) {
      speakingBtn = btn; btn.classList.add('speaking');
      u.onend = u.onerror = function () { btn.classList.remove('speaking'); };
    }
    synth.speak(u);
  }
  function stopSpeak() { if (synth) synth.cancel(); }
  function sayBtn(text, label) {
    var b = h('button', { class: 'say', type: 'button', 'aria-label': '朗讀：' + (label || text) }, '🔊');
    b.addEventListener('click', function (e) { e.stopPropagation(); speak(text, b); });
    return b;
  }

  // ── 音效（柔和，不刺耳）─────────────────────────
  var actx = null;
  function tone(freqs, dur, type, gap, vol) {
    if (!cfg().sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      freqs.forEach(function (f) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
        t += gap || 0.09;
      });
    } catch (e) { /* 沒有音效也能用 */ }
  }
  var sfx = {
    right: function () { tone([660, 880], 0.18); },
    wrong: function () { tone([300], 0.2, 'triangle', 0, 0.07); },
    tap: function () { tone([520], 0.07, 'sine', 0, 0.06); },
    win: function () { tone([523, 659, 784, 1047], 0.28, 'sine', 0.13); }
  };

  // ── 注音 ───────────────────────────────────────
  function withZy(text, zy, force) {
    if (!zy || (!cfg().zhuyin && !force)) return document.createTextNode(text);
    var cs = Array.from(text), zs = zy.trim().split(/\s+/);
    if (cs.length !== zs.length) return document.createTextNode(text);
    var f = document.createDocumentFragment();
    cs.forEach(function (c, i) { f.appendChild(h('ruby', {}, c, h('rt', {}, zs[i]))); });
    return f;
  }
  // 把連接詞上色（句型鷹架）
  function colorConn(text, conn) {
    if (!conn || !conn.length) return document.createTextNode(text);
    var f = document.createDocumentFragment(), rest = text;
    var re = new RegExp('(' + conn.map(function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')');
    while (rest) {
      var m = rest.match(re);
      if (!m) { f.appendChild(document.createTextNode(rest)); break; }
      if (m.index) f.appendChild(document.createTextNode(rest.slice(0, m.index)));
      f.appendChild(h('span', { class: m[1] === conn[0] ? 'conn-a' : 'conn-b' }, m[1]));
      rest = rest.slice(m.index + m[1].length);
    }
    return f;
  }
  function blanked(text) {
    var f = document.createDocumentFragment();
    String(text).split(/(＿+)/).forEach(function (part) {
      if (/^＿+$/.test(part)) f.appendChild(h('span', { class: 'blank' }, ' '));
      else if (part) f.appendChild(document.createTextNode(part));
    });
    return f;
  }

  // ── 圖卡（圖片之後放進 images/lessonXX/語詞.png）──
  function picEl(lid, name, big) {
    var box = h('div', { class: 'pic' + (big ? ' big' : '') });
    var exts = ['webp', 'png', 'jpg', 'svg'], i = 0;
    var ph = function () { box.innerHTML = ''; append(box, h('div', { class: 'ph' }, h('span', {}, '🖼️'), '圖卡準備中')); };
    var tryNext = function () {
      if (i >= exts.length) { ph(); return; }
      var img = new Image();
      img.alt = '「' + name + '」圖卡';
      img.onload = function () { box.innerHTML = ''; box.appendChild(img); box.style.borderStyle = 'solid'; };
      img.onerror = tryNext;
      img.src = 'images/lesson' + lid + '/' + encodeURIComponent(name) + '.' + exts[i++];
    };
    ph(); tryNext();
    return box;
  }

  // ── 進度 ───────────────────────────────────────
  function modProg(lid, mid) {
    var p = state.progress; p[lid] = p[lid] || {}; p[lid][mid] = p[lid][mid] || {};
    return p[lid][mid];
  }
  function itemId(x) { return x.c || x.w || x.idiom || x.id || 'all'; }
  function mkUnits(items, size) {
    return chunk(items, size).map(function (g) { return { key: g.map(itemId).join('|'), items: g }; });
  }
  function modStatus(lid, mid) {
    var L = LESSONS[lid], units = MODULES[mid].units(L, cfg()), prog = modProg(lid, mid);
    var done = units.filter(function (u) { return prog[u.key]; });
    var stars = done.length ? Math.round(done.reduce(function (s, u) { return s + prog[u.key].stars; }, 0) / done.length) : 0;
    return { total: units.length, done: done.length, stars: stars, complete: done.length === units.length, units: units, prog: prog };
  }

  // ════════════════════════════════════════════════
  //  題型引擎
  // ════════════════════════════════════════════════
  function qbar(i, n, label) {
    var d = h('div', { class: 'dots' });
    for (var k = 0; k < n; k++) append(d, h('i', { class: k < i ? 'done' : k === i ? 'cur' : '' }));
    return h('div', { class: 'qbar' }, (label || '第 ' + (i + 1) + '／' + n + ' 題'), d);
  }
  function nextBtn(text, fn) {
    var b = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, text);
    b.addEventListener('click', fn);
    setTimeout(function () { b.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    return b;
  }

  // 選擇題：item = { prompt(), say, options[正解在第 0 個], kai, long, hint, after }
  function runQuiz(stage, items, api) {
    var c = api.cfg, i = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var it = items[i], wrong = 0, hinted = false, solved = false;
      var answer = it.options[0];
      var opts = shuffle([answer].concat(shuffle(it.options.slice(1)).slice(0, c.options - 1)));
      var optBox = h('div', { class: 'options' + (it.long ? ' long' : '') });
      var hintSlot = h('div'), fb = h('div', { class: 'feedback' });
      var btns = opts.map(function (o) {
        var b = h('button', { class: 'opt' + (it.kai ? ' kai' : ''), type: 'button' }, o);
        b.addEventListener('click', function () { choose(b, o); });
        if (it.long) append(optBox, h('div', { class: 'row' }, h('div', { style: 'flex:1' }, b), sayBtn(o)));
        else append(optBox, b);
        return b;
      });
      if (it.long) btns.forEach(function (b) { b.style.width = '100%'; });

      function showHint() {
        if (!it.hint || hintSlot.firstChild) return false;
        append(hintSlot, h('div', { class: 'hintbox' }, '💡', h('span', { style: 'flex:1' }, it.hint), sayBtn(it.hint)));
        if (c.autoRead) speak(it.hint);
        return true;
      }
      function reveal() { btns[opts.indexOf(answer)].classList.add('reveal'); showHint(); }
      function choose(b, o) {
        if (solved || b.disabled) return;
        if (o === answer) {
          solved = true;
          b.classList.remove('reveal'); b.classList.add('right');
          btns.forEach(function (x) { x.disabled = true; });
          sfx.right(); api.record(wrong === 0 && !hinted);
          append(fb, h('div', { class: 'praise' }, pick(PRAISE)));
          if (it.after) speak(it.after);
          append(fb, nextBtn(i < items.length - 1 ? '下一題 →' : '完成 →', function () { i++; if (i < items.length) show(); else api.next(); }));
        } else {
          wrong++; b.disabled = true; b.classList.add('wrong', 'shake'); sfx.wrong();
          if (wrong >= c.wrongLimit) reveal(); else showHint();
        }
      }
      var tools = h('div', { class: 'tools' });
      if (it.say) append(tools, (function () {
        var b = h('button', { class: 'btn btn-ghost', type: 'button' }, '🔊 再聽一次');
        b.addEventListener('click', function () { speak(it.say); }); return b;
      })());
      if (c.hint) append(tools, (function () {
        var b = h('button', { class: 'btn btn-ghost', type: 'button' }, '💡 提示');
        b.addEventListener('click', function () {
          if (solved) return;
          hinted = true;
          if (showHint()) return;
          // 沒有文字提示，或已顯示過 → 拿掉一個錯的選項
          var wrongs = btns.filter(function (x, k) { return opts[k] !== answer && !x.disabled; });
          if (wrongs.length) { var x = pick(wrongs); x.disabled = true; x.classList.add('gone'); }
          else reveal();
        });
        return b;
      })());
      append(stage, qbar(i, items.length), h('div', { class: 'prompt' }, it.prompt()), optBox, hintSlot, tools, fb);
      if (c.autoRead && it.say) speak(it.say);
    }
    show();
  }

  // 排順序：item = { chips[正確順序], prefill, vertical, say, conn }
  function runOrder(stage, items, api) {
    var c = api.cfg, i = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var it = items[i], pos = 0, totalMiss = 0, localMiss = 0;
      var vertical = !!it.vertical;
      var slots = h('div', { class: 'slots' + (vertical ? ' vertical' : '') });
      var pool = h('div', { class: 'pool' + (vertical ? ' vertical' : '') });
      var fb = h('div', { class: 'feedback' });
      var entries = it.chips.map(function (t, idx) {
        var chip = h('button', { class: 'chip', type: 'button' }, colorConn(t, it.conn));
        var wrap = vertical ? h('div', { class: 'row' }, h('div', { style: 'flex:1' }, chip), sayBtn(t)) : chip;
        if (vertical) chip.style.width = '100%';
        var e = { t: t, idx: idx, chip: chip, wrap: wrap };
        chip.addEventListener('click', function () { tap(e); });
        return e;
      });
      function place(e) {
        e.chip.disabled = true; e.chip.classList.remove('reveal'); e.chip.classList.add('placed');
        if (vertical) e.chip.insertBefore(h('span', { class: 'slot-num' }, String(e.idx + 1)), e.chip.firstChild);
        slots.appendChild(e.wrap);
      }
      function tap(e) {
        if (e.chip.disabled) return;
        if (e.idx === pos) {
          place(e); pos++; localMiss = 0; sfx.tap();
          if (pos === entries.length) done();
        } else {
          totalMiss++; localMiss++;
          e.chip.classList.remove('shake'); void e.chip.offsetWidth; e.chip.classList.add('shake'); sfx.wrong();
          if (localMiss >= c.wrongLimit) entries[pos].chip.classList.add('reveal');
        }
      }
      function done() {
        sfx.right(); api.record(totalMiss === 0);
        append(fb, h('div', { class: 'praise' }, pick(PRAISE)));
        if (it.say) { append(fb, h('div', { class: 'row', style: 'justify-content:center' }, h('span', { style: 'font-family:var(--kai);font-size:24px' }, colorConn(it.say, it.conn)), sayBtn(it.say))); speak(it.say); }
        append(fb, nextBtn(i < items.length - 1 ? '下一題 →' : '完成 →', function () { i++; if (i < items.length) show(); else api.next(); }));
      }
      var prefill = Math.min(it.prefill || 0, entries.length - 1);
      entries.slice(0, prefill).forEach(function (e) { place(e); pos++; });
      shuffle(entries.slice(prefill)).forEach(function (e) { pool.appendChild(e.wrap); });
      append(stage, qbar(i, items.length),
        h('p', { class: 'muted', style: 'margin:0 0 8px' }, vertical ? '依照發生的先後，一張一張點下去。' : '依照正確的順序，一個一個點下去。'),
        slots, pool, fb);
    }
    show();
  }

  // 配對（翻開版）：pairs = [{ a:語詞, b:意思 }]
  function runMatch(stage, pairs, api) {
    var c = api.cfg, rounds = chunk(pairs, c.pairs), r = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var set = rounds[r], sel = null, matched = 0, miss = set.map(function () { return 0; });
      var fb = h('div', { class: 'feedback' });
      var left = set.map(function (p, k) {
        var t = h('button', { class: 'tile w', type: 'button' }, p.a);
        t.addEventListener('click', function () {
          if (t.disabled) return;
          left.forEach(function (x) { x.classList.remove('sel'); });
          rightTiles.forEach(function (x) { x.el.classList.remove('reveal'); });
          sel = k; t.classList.add('sel'); speak(p.a);
          if (miss[k] >= c.wrongLimit) rightFor(k).el.classList.add('reveal');
        });
        return t;
      });
      var rightTiles = shuffle(set.map(function (p, k) { return { p: p, k: k }; })).map(function (o) {
        o.el = h('button', { class: 'tile', type: 'button', style: 'flex:1' }, o.p.b);
        o.el.addEventListener('click', function () { tapRight(o); });
        o.wrap = h('div', { class: 'row' }, o.el, sayBtn(o.p.b));
        return o;
      });
      function rightFor(k) { return rightTiles.find(function (o) { return o.k === k; }); }
      function tapRight(o) {
        if (o.el.disabled) return;
        if (sel == null) { toast('先點左邊的語詞'); left.forEach(function (x) { if (!x.disabled) { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); } }); return; }
        if (o.k === sel) {
          var cls = 'pair-' + (matched % 6);
          [left[sel], o.el].forEach(function (x) { x.disabled = true; x.classList.remove('sel', 'reveal'); x.classList.add('done', cls); });
          sfx.right(); api.record(miss[sel] === 0); matched++; sel = null;
          if (matched === set.length) finish();
        } else {
          miss[sel]++; o.el.classList.remove('shake'); void o.el.offsetWidth; o.el.classList.add('shake'); sfx.wrong();
          if (miss[sel] >= c.wrongLimit) rightFor(sel).el.classList.add('reveal');
        }
      }
      function finish() {
        append(fb, h('div', { class: 'praise' }, pick(PRAISE)));
        append(fb, nextBtn(r < rounds.length - 1 ? '下一回 →' : '完成 →', function () { r++; if (r < rounds.length) show(); else api.next(); }));
      }
      append(stage, qbar(r, rounds.length, '第 ' + (r + 1) + '／' + rounds.length + ' 回'),
        h('p', { class: 'muted', style: 'margin:0 0 10px' }, '先點左邊的語詞，再點右邊對應的意思。'),
        h('div', { class: 'match' }, h('div', { class: 'col' }, left), h('div', { class: 'col' }, rightTiles.map(function (o) { return o.wrap; }))),
        fb);
    }
    show();
  }

  // 翻牌記憶（等級 3）
  function runMemory(stage, pairs, api) {
    var c = api.cfg, rounds = chunk(pairs, c.pairs), r = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var set = rounds[r], open = [], matched = 0, fails = 0, busy = false;
      var fb = h('div', { class: 'feedback' });
      var cards = shuffle([].concat.apply([], set.map(function (p, k) {
        return [{ k: k, t: p.a, w: true }, { k: k, t: p.b, w: false }];
      })));
      var grid = h('div', { class: 'memory' });
      cards.forEach(function (cd) {
        cd.el = h('button', { class: 'mem', type: 'button', 'aria-label': '翻牌' }, '？');
        cd.el.addEventListener('click', function () { flip(cd); });
        grid.appendChild(cd.el);
      });
      function faceUp(cd) { cd.el.textContent = cd.t; cd.el.classList.add('up'); if (cd.w) cd.el.classList.add('w'); cd.el.setAttribute('aria-label', cd.t); }
      function faceDown(cd) { cd.el.textContent = '？'; cd.el.classList.remove('up', 'w'); }
      function flip(cd) {
        if (busy || cd.done || open.indexOf(cd) >= 0) return;
        faceUp(cd); speak(cd.t); sfx.tap(); open.push(cd);
        if (open.length < 2) return;
        var a = open[0], b = open[1];
        if (a.k === b.k) {
          a.done = b.done = true; var cls = 'pair-' + (matched % 6);
          a.el.classList.add(cls); b.el.classList.add(cls); a.el.disabled = b.el.disabled = true;
          open = []; matched++; sfx.right();
          if (matched === set.length) {
            var indep = Math.max(0, set.length - Math.floor(fails / 2));
            for (var n = 0; n < set.length; n++) api.record(n < indep);
            append(fb, h('div', { class: 'praise' }, pick(PRAISE)));
            append(fb, nextBtn(r < rounds.length - 1 ? '下一回 →' : '完成 →', function () { r++; if (r < rounds.length) show(); else api.next(); }));
          }
        } else {
          fails++; busy = true;
          setTimeout(function () { faceDown(a); faceDown(b); open = []; busy = false; }, 1300);
        }
      }
      append(stage, qbar(r, rounds.length, '第 ' + (r + 1) + '／' + rounds.length + ' 回'),
        h('p', { class: 'muted', style: 'margin:0 0 10px' }, '翻開兩張牌，找出「語詞」和它的「意思」。'), grid, fb);
    }
    show();
  }

  // 字卡／詞卡：每張都點過才能下一步（等級 3 可直接下一步）
  function runCards(stage, items, api, build) {
    var c = api.cfg, seen = 0;
    var grid = h('div', { class: items.length && build.wide ? '' : 'card-grid', style: build.wide ? 'display:grid;gap:14px' : '' });
    var status = h('p', { class: 'muted', style: 'text-align:center;margin:12px 0 0' });
    var go = h('button', { class: 'btn btn-primary btn-block', type: 'button', style: 'margin-top:10px' }, '我都看過了，下一步 →');
    go.addEventListener('click', function () { api.next(); });
    function upd() {
      var left = items.length - seen;
      status.textContent = left > 0 ? '還有 ' + left + ' 張卡沒有點過喔！' : '全部都看過了，好棒！';
      go.disabled = left > 0 && c.level < 3;
    }
    items.forEach(function (it) {
      var card = build(it);
      card.el.classList.add('flash'); append(card.el, h('span', { class: 'check' }, '✔'));
      var mark = function () { if (!card.el.classList.contains('seen')) { card.el.classList.add('seen'); seen++; upd(); } };
      card.el.addEventListener('click', function () { mark(); speak(card.say); });
      card.el.querySelectorAll('.say').forEach(function (b) { b.addEventListener('click', mark); });
      grid.appendChild(card.el);
    });
    upd();
    append(stage, grid, status, go);
  }

  // 步驟包裝
  function step(title, kind, run) { return { title: title, kind: kind, run: run }; }

  // ════════════════════════════════════════════════
  //  各模組
  // ════════════════════════════════════════════════
  function radicalLabel(ch) { return ch.rform ? ch.rform + '（' + ch.radical + '）' : ch.radical; }

  var MODULES = {
    chars: {
      name: '認識生字', icon: '✏️', desc: '看字卡、聽音選字、找部首', core: true,
      units: function (L, c) { return mkUnits(L.chars, c.group); },
      steps: function (L, unit, c) {
        var items = unit.items;
        return [
          step('看字卡：點每一張卡，聽聽看怎麼念。', 'cards', function (stage, api) {
            runCards(stage, items, api, function (ch) {
              var el = h('div', { role: 'button', tabindex: '0' },
                h('div', { class: 'hanzi' }, ch.c),
                c.zhuyin ? h('div', { class: 'zy' }, ch.zy) : null,
                h('div', { class: 'facts' }, '部首 ', h('b', {}, radicalLabel(ch)), '　筆畫 ', h('b', {}, String(ch.strokes))),
                h('div', { class: 'wds' }, ch.words.join('、')));
              return { el: el, say: ch.c + '，' + ch.cue + '。部首是' + ch.radical + '，一共' + ch.strokes + '畫。可以造詞：' + ch.words.join('、') };
            });
          }),
          step('聽音選字：按喇叭聽聲音，找出正確的字。', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(items).map(function (ch) {
              var w = ch.cue.split('的')[0];
              var hintW = w.replace(ch.c, '＿');
              return {
                say: ch.cue, kai: true,
                options: [ch.c].concat(shuffle(L.chars.filter(function (x) { return x.c !== ch.c; }).map(function (x) { return x.c; }))),
                hint: '提示：「' + hintW + '」的空格',
                after: ch.cue,
                prompt: function () {
                  var b = h('button', { class: 'listen-btn', type: 'button', 'aria-label': '聽題目' }, '🔊');
                  b.addEventListener('click', function () { speak(ch.cue, b); });
                  return h('div', {}, b, c.level === 1 ? h('div', { class: 'sentence', style: 'margin-top:10px' }, blanked(hintW)) : h('div', { class: 'sub' }, '點喇叭可以再聽一次'));
                }
              };
            }), api);
          }),
          step('找部首：這個字的部首是哪一個？', 'quiz', function (stage, api) {
            var allRad = uniq(L.chars.map(radicalLabel));
            runQuiz(stage, shuffle(items).map(function (ch) {
              var ans = radicalLabel(ch);
              return {
                say: ch.c + '，' + ch.cue + '，部首是哪一個？', kai: true,
                options: [ans].concat(shuffle(allRad.filter(function (r) { return r !== ans; }))),
                hint: '部首常常在字的左邊、上面、下面或外面。',
                after: ch.c + '，部首是' + ch.radical,
                prompt: function () { return h('div', {}, h('div', { class: 'big' }, ch.c), h('div', { class: 'sub' }, ch.cue)); }
              };
            }), api);
          })
        ];
      }
    },

    words: {
      name: '學會語詞', icon: '🧩', desc: '看圖卡、懂意思、配對遊戲', core: true,
      units: function (L, c) { return mkUnits(L.words, c.group); },
      steps: function (L, unit, c) {
        var items = unit.items;
        return [
          step('看詞卡：點每一張卡，聽語詞和意思。', 'cards', function (stage, api) {
            var build = function (w) {
              var el = h('div', { class: 'word-card', role: 'button', tabindex: '0' },
                picEl(L.id, w.w),
                h('div', { class: 'lines' },
                  h('div', { class: 'line' }, h('span', { class: 'word' }, withZy(w.w, w.zy)), sayBtn(w.say || w.w, w.w)),
                  h('div', { class: 'line' }, h('span', { class: 'meaning', style: 'flex:1' }, w.meaning), sayBtn(w.meaning)),
                  h('div', { class: 'line' }, h('span', { class: 'ex', style: 'flex:1' }, '例句：' + w.example), sayBtn(w.exampleSay || w.example, w.example))));
              return { el: el, say: (w.say || w.w) + '。' + w.meaning };
            };
            build.wide = true;
            runCards(stage, items, api, build);
          }),
          step(c.memory ? '翻牌遊戲：找出語詞和它的意思。' : '配對遊戲：把語詞和意思配成一對。', 'game', function (stage, api) {
            var pairs = items.map(function (w) { return { a: w.w, b: w.meaning }; });
            (c.memory ? runMemory : runMatch)(stage, pairs, api);
          }),
          step('看意思選語詞：哪一個語詞是這個意思？', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(items).map(function (w) {
              return {
                say: w.meaning, kai: true,
                options: [w.w].concat(shuffle(L.words.filter(function (x) { return x.w !== w.w; }).map(function (x) { return x.w; }))),
                after: (w.say || w.w) + '，' + (w.exampleSay || w.example),
                prompt: function () { return h('div', { class: 'sentence' }, '「' + w.meaning + '」'); }
              };
            }), api);
          })
        ];
      }
    },

    sentences: {
      name: '照樣造句', icon: '🧱', desc: '認識句型、排句子、選連接詞', core: true,
      units: function (L) { return L.sentences.map(function (s) { return { key: s.id, items: [s], label: s.pattern }; }); },
      steps: function (L, unit, c) {
        var p = unit.items[0];
        var list = [
          step('認識句型：聽一聽「' + p.pattern + '」怎麼用。', 'intro', function (stage, api) {
            var card = h('div', { class: 'card pattern-card' },
              h('span', { class: 'kind' }, p.kind),
              h('div', { class: 'pat' }, colorConn(p.pattern, p.conn)),
              h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'explain' }, p.explain), sayBtn(p.explain)),
              p.models.map(function (m) { return h('div', { class: 'model' }, h('span', {}, colorConn(m, p.conn)), sayBtn(m)); }));
            append(stage, card, h('div', { style: 'margin-top:16px' }, nextBtn('我知道了，開始練習 →', api.next)));
          }),
          step('排句子：照順序點詞塊，排成完整的句子。', 'quiz', function (stage, api) {
            runOrder(stage, p.order.slice(0, c.orderCount).map(function (chips) {
              return { chips: chips, prefill: c.prefill, conn: p.conn, say: chips.join('') };
            }), api);
          }),
          step('選一選：哪一個接在後面最通順？', 'quiz', function (stage, api) {
            runQuiz(stage, p.choose.map(function (q) {
              return {
                say: q.stem, long: true, options: q.options,
                hint: '想一想「' + p.pattern + '」：' + p.explain,
                after: q.stem + q.options[0],
                prompt: function () { return h('div', { class: 'sentence' }, colorConn(q.stem, p.conn), h('span', { class: 'blank' }, '    ')); }
              };
            }), api);
          })
        ];
        if (c.level >= 2) list.push(step('選連接詞：空格裡要填哪一組？', 'quiz', function (stage, api) {
          runQuiz(stage, p.connect.map(function (q) {
            var parts = q.options[0].split('／'), k = 0;
            return {
              say: q.stem, long: true, options: q.options,
              hint: '把每一組放進句子裡念念看。',
              after: q.stem.replace(/＿＿/g, function () { return parts[k++] || ''; }),
              prompt: function () { return h('div', { class: 'sentence' }, blanked(q.stem)); }
            };
          }), api);
        }));
        return list;
      }
    },

    reading: {
      name: '讀懂課文', icon: '📖', desc: '事件排順序、抓重點', core: true,
      units: function () { return [{ key: 'reading', items: [] }]; },
      steps: function (L, unit, c) {
        var R = L.reading, idx = R.eventsByLevel[c.level] || R.eventsByLevel[3];
        var nq = { 1: 3, 2: 4, 3: 5 }[c.level] || 5;
        return [
          step('排順序：課文的事情，哪一件先發生？', 'quiz', function (stage, api) {
            var chips = idx.map(function (k) { return R.events[k]; });
            runOrder(stage, [{ chips: chips, prefill: c.prefill, vertical: true, say: '' }], api);
          }),
          step('想一想：選出正確的答案。', 'quiz', function (stage, api) {
            runQuiz(stage, R.questions.slice(0, nq).map(function (q) {
              return {
                say: q.q, long: true, options: q.options, hint: q.hint, after: q.options[0],
                prompt: function () { return h('div', { class: 'sentence' }, q.q); }
              };
            }), api);
          })
        ];
      }
    },

    lookalikes: {
      name: '形近字', icon: '🔍', desc: '分辨長得很像的字', core: false,
      units: function (L, c) { return mkUnits(L.lookalikes, c.level === 3 ? L.lookalikes.length : 5); },
      steps: function (L, unit) {
        return [
          step('選字：句子裡的空格要填哪一個字？', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(unit.items).map(function (q) {
              var full = q.sentence.replace('＿', q.options[0]);
              return {
                say: full, kai: true, options: q.options, hint: q.hint, after: full,
                prompt: function () { return h('div', { class: 'sentence' }, blanked(q.sentence)); }
              };
            }), api);
          })
        ];
      }
    },

    idioms: {
      name: '生字變成語', icon: '🏮', desc: '看圖學成語、補上生字', core: false,
      units: function (L, c) { return mkUnits(L.idioms, Math.min(6, Math.max(3, c.group))); },
      steps: function (L, unit, c) {
        var items = unit.items;
        return [
          step('看成語卡：點每一張卡，聽成語和意思。', 'cards', function (stage, api) {
            var build = function (d) {
              var el = h('div', { class: 'word-card', role: 'button', tabindex: '0' },
                picEl(L.id, d.idiom),
                h('div', { class: 'lines' },
                  h('div', { class: 'line' }, h('span', { class: 'word' }, withZy(d.idiom, d.zy)), sayBtn(d.idiom)),
                  h('div', { class: 'line' }, h('span', { class: 'meaning', style: 'flex:1' }, d.meaning), sayBtn(d.meaning)),
                  h('div', { class: 'line' }, h('span', { class: 'ex', style: 'flex:1' }, '例句：' + d.example), sayBtn(d.example))));
              return { el: el, say: d.idiom + '。' + d.meaning };
            };
            build.wide = true;
            runCards(stage, items, api, build);
          }),
          step('補字：成語裡少了一個生字，把它找回來。', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(items).map(function (d) {
              var cs = Array.from(d.idiom); cs[d.blank] = '＿';
              return {
                say: d.meaning, kai: true, options: d.options,
                hint: '這個字是本課的生字，意思是：' + d.meaning,
                after: d.idiom,
                prompt: function () {
                  return h('div', {}, h('div', { style: 'max-width:220px;margin:0 auto 8px' }, picEl(L.id, d.idiom)),
                    h('div', { class: 'big', style: 'font-size:64px' }, blanked(cs.join(''))),
                    h('div', { class: 'sub' }, d.meaning));
                }
              };
            }), api);
          }),
          step('看意思選成語：哪一個成語是這個意思？', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(items).map(function (d) {
              return {
                say: d.meaning, kai: true,
                options: [d.idiom].concat(shuffle(L.idioms.filter(function (x) { return x.idiom !== d.idiom; }).map(function (x) { return x.idiom; }))),
                after: d.idiom + '，' + d.example,
                prompt: function () { return h('div', { class: 'sentence' }, '「' + d.meaning + '」'); }
              };
            }), api);
          })
        ];
      }
    }
  };
  var MODULE_ORDER = ['chars', 'words', 'sentences', 'reading', 'lookalikes', 'idioms'];

  // ════════════════════════════════════════════════
  //  畫面
  // ════════════════════════════════════════════════
  var app = document.getElementById('app');

  function shell(crumbs, mc) {
    stopSpeak(); app.innerHTML = '';
    var nav = h('nav', { class: 'crumbs', 'aria-label': '目前位置' });
    crumbs.forEach(function (c, i) { if (i) append(nav, h('span', {}, '／')); append(nav, c.href ? h('a', { href: c.href }, c.text) : h('span', {}, c.text)); });
    var main = h('main', {});
    if (mc) main.style.setProperty('--mc', mc);
    append(app, h('header', { class: 'topbar' }, h('a', { class: 'brand', href: '#/' }, '📚 國語五上樂園'), nav, gearBtn()), main,
      h('footer', { class: 'footer' }, '特殊教育輔助教材，非出版社官方產品。', h('br'), '內容依康軒版國語五上整理改寫，僅供教學使用，不作商業用途。'));
    window.scrollTo(0, 0);
    return main;
  }

  function renderHome() {
    var main = shell([{ text: '首頁' }]);
    append(main, h('div', { class: 'hero' },
      h('div', { class: 'row' }, h('h1', {}, '國語五上學習樂園'), sayBtn('國語五上學習樂園。選一課開始學習。')),
      h('p', {}, '康軒版・五年級上學期　選一課開始學習。')));
    var grid = h('div', { class: 'lesson-grid' });
    LESSON_LIST.forEach(function (l, n) {
      var L = LESSONS[l.id], no = '第 ' + (n + 1) + ' 課';
      if (!L) { append(grid, h('div', { class: 'lesson-tile off' }, h('span', { class: 'no' }, no), h('span', { class: 't' }, l.title), h('span', { class: 'meta' }, '準備中'))); return; }
      var done = 0, total = 0, stars = 0;
      MODULE_ORDER.forEach(function (mid) { var s = modStatus(l.id, mid); done += s.done; total += s.total; stars += s.stars; });
      var tile = h('div', { class: 'lesson-tile', role: 'link', tabindex: '0' },
        h('span', { class: 'no' }, no), h('span', { class: 't' }, l.title),
        h('span', { class: 'meta' }, '⭐ ' + stars + '／' + (MODULE_ORDER.length * 3), h('span', {}, '完成 ' + Math.round(done / total * 100) + '%'), h('span', { class: 'spacer' }), sayBtn(no + '，' + l.title)));
      tile.addEventListener('click', function () { location.hash = '#/lesson/' + l.id; });
      tile.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.hash = '#/lesson/' + l.id; });
      append(grid, tile);
    });
    append(main, grid);
  }

  function ringSvg(pct) {
    var r = 50, C = 2 * Math.PI * r;
    var svg = '<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#E7DFD0" stroke-width="12"/>' +
      (pct > 0 ? '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#2E8B57" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 60 60)"/>' : '') +
      '<text x="60" y="68" text-anchor="middle" font-size="26" font-weight="700" fill="#2A2825">' + Math.round(pct * 100) + '%</text></svg>';
    var d = h('div', {}); d.innerHTML = svg; return d;
  }

  function renderLesson(lid) {
    var L = LESSONS[lid], c = cfg();
    var main = shell([{ text: '首頁', href: '#/' }, { text: '第 ' + L.no + ' 課 ' + L.title }]);
    var st = {}, done = 0, total = 0, stars = 0;
    MODULE_ORDER.forEach(function (mid) { st[mid] = modStatus(lid, mid); done += st[mid].done; total += st[mid].total; stars += st[mid].stars; });
    append(main, h('div', { class: 'card lesson-head' },
      h('div', {},
        h('div', { class: 'kicker' }, '康軒五上・第 ' + L.no + ' 課'),
        h('div', { class: 'row' }, h('h1', {}, L.title), sayBtn('第' + L.no + '課，' + L.title)),
        h('div', { class: 'focus' }, h('div', { style: 'flex:1' }, h('b', {}, '本課學習重點'), L.focus), sayBtn(L.focus))),
      h('div', { class: 'ring-wrap' }, ringSvg(total ? done / total : 0), h('div', { class: 'num' }, '已完成 ' + done + '／' + total + ' 組'), h('div', { class: 'stars-total' }, '⭐ ' + stars + '／' + (MODULE_ORDER.length * 3)))));

    var core = MODULE_ORDER.filter(function (m) { return MODULES[m].core; });
    var nextCore = core.find(function (m) { return !st[m].complete; });
    var station = function (mid, locked) {
      var M = MODULES[mid], s = st[mid];
      var label = s.complete ? '再玩一次' : s.done ? '繼續' : '開始';
      var go = h('button', { class: 'btn go', type: 'button', disabled: locked }, locked ? '🔒 先完成上一站' : label + ' →');
      go.addEventListener('click', function () { location.hash = '#/lesson/' + lid + '/m/' + mid; });
      return h('div', { class: 'station' + (locked ? ' locked' : ''), style: '--mc:var(--c-' + mid + ')' },
        mid === nextCore && !locked ? h('span', { class: 'badge-next' }, '下一步') : null,
        h('div', { class: 'row' }, h('div', { class: 'icon' }, M.icon), h('h3', { style: 'flex:1' }, M.name), sayBtn(M.name + '，' + M.desc)),
        h('div', { class: 'desc' }, M.desc),
        h('div', { class: 'status' }, starsEl(s.stars), h('span', {}, s.complete ? '已完成' : '第 ' + s.done + '／' + s.total + ' 組')),
        go);
    };
    append(main, h('div', { class: 'section-label' }, '🎯 本課先完成', h('span', { class: 'muted', style: 'font-weight:400;font-size:16px' }, '（建議依照順序）')));
    var cs = h('div', { class: 'stations' });
    core.forEach(function (mid, i) {
      var locked = c.sequential && i > 0 && !st[core[i - 1]].complete;
      append(cs, station(mid, locked));
    });
    append(main, cs);
    append(main, h('div', { class: 'section-label' }, '🌟 加練挑戰', h('span', { class: 'muted', style: 'font-weight:400;font-size:16px' }, '（定期評量常考）')));
    var ex = h('div', { class: 'stations' });
    MODULE_ORDER.filter(function (m) { return !MODULES[m].core; }).forEach(function (mid) { append(ex, station(mid, false)); });
    append(main, ex);

    var strokeUrl = 'https://gsyan888.github.io/html5_fun/html5_stroke_parts/html5_stroke_parts.html?by=gsyan&words=' + encodeURIComponent(L.chars.map(function (x) { return x.c; }).join(''));
    append(main, h('div', { class: 'section-label' }, '🔗 延伸資源（會開新視窗）'),
      h('div', { class: 'extra-links' },
        h('a', { class: 'btn btn-ghost', href: strokeUrl, target: '_blank', rel: 'noopener' }, '🎨 雄筆順・部件上色'),
        h('a', { class: 'btn btn-ghost', href: 'https://sites.google.com/view/samesentence/%E5%BA%B7%E8%BB%92', target: '_blank', rel: 'noopener' }, '✍️ 照樣造句練習（康軒 5A）')));
  }

  function renderModule(lid, mid, uIdx) {
    var L = LESSONS[lid], M = MODULES[mid], c = cfg();
    var units = M.units(L, c), prog = modProg(lid, mid);
    var ui = (uIdx != null && uIdx >= 0 && uIdx < units.length) ? uIdx : units.findIndex(function (u) { return !prog[u.key]; });
    if (ui < 0) ui = 0;
    var unit = units[ui], steps = M.steps(L, unit, c);
    var main = shell([{ text: '首頁', href: '#/' }, { text: '第 ' + L.no + ' 課', href: '#/lesson/' + lid }, { text: M.name }], 'var(--c-' + mid + ')');

    var nowTxt = h('div', { class: 'txt' }), stepEl = h('span', { class: 'step' }), bar = h('i', { style: 'width:0' });
    var nowSay = h('button', { class: 'say', type: 'button', 'aria-label': '朗讀：現在要做什麼' }, '🔊');
    nowSay.addEventListener('click', function () { speak(nowTxt.textContent, nowSay); });
    var stage = h('div', { class: 'stage' });
    append(main, h('div', { class: 'task-head' },
      h('div', { class: 'task-title' }, h('span', { class: 'icon' }, M.icon), h('h2', { style: 'flex:1' }, M.name),
        units.length > 1 ? h('span', { class: 'unit-pill' }, (unit.label || '第 ' + (ui + 1) + '／' + units.length + ' 組')) : (unit.label ? h('span', { class: 'unit-pill' }, unit.label) : null)),
      h('div', { class: 'progress' }, bar),
      h('div', { class: 'now' }, h('div', { style: 'flex:1' }, h('div', { class: 'lbl' }, '☑ 現在要做什麼　', stepEl), nowTxt), nowSay)), stage);

    var stats = { total: 0, indep: 0 }, si = 0;
    var api = {
      cfg: c,
      record: function (indep) { stats.total++; if (indep) stats.indep++; },
      next: function () { si++; if (si < steps.length) show(); else finish(); }
    };
    function show() {
      var s = steps[si];
      nowTxt.textContent = s.title;
      stepEl.textContent = '第 ' + (si + 1) + '／' + steps.length + ' 步';
      bar.style.width = (si / steps.length * 100) + '%';
      stage.innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      s.run(stage, api);
      if (c.autoRead && (s.kind === 'cards' || s.kind === 'intro' || s.kind === 'game')) speak(s.title);
    }
    function finish() {
      bar.style.width = '100%';
      var acc = stats.total ? stats.indep / stats.total : 1;
      var stars = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1;
      var prev = prog[unit.key];
      prog[unit.key] = { stars: Math.max(stars, prev ? prev.stars : 0), last: stars, acc: Math.round(acc * 100), n: stats.total, date: today(), level: c.level, tries: (prev ? prev.tries : 0) + 1 };
      save();
      celebrate(stars, stats, function (overlay) {
        var acts = h('div', { class: 'acts' });
        var more = units.findIndex(function (u, k) { return k !== ui && !prog[u.key]; });
        if (ui + 1 < units.length) append(acts, btnTo('下一組 →', 'btn-primary', function () { overlay.remove(); renderModule(lid, mid, ui + 1); }));
        else if (more >= 0) append(acts, btnTo('還沒完成的組 →', 'btn-primary', function () { overlay.remove(); renderModule(lid, mid, more); }));
        append(acts, btnTo('🔁 再練一次', 'btn-ghost', function () { overlay.remove(); renderModule(lid, mid, ui); }));
        append(acts, btnTo('🏠 回到本課', 'btn-ghost', function () { overlay.remove(); location.hash = '#/lesson/' + lid; }));
        return acts;
      });
    }
    show();
  }
  function btnTo(text, cls, fn) { var b = h('button', { class: 'btn btn-block ' + cls, type: 'button' }, text); b.addEventListener('click', fn); return b; }

  function celebrate(stars, stats, actsFn) {
    sfx.win();
    var msg = stars === 3 ? '太厲害了！' : stars === 2 ? '做得很好！' : '完成了！繼續加油！';
    var conf = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    var colors = ['#E8A92A', '#2F6DB0', '#2E8B6E', '#C77A2B', '#B04A6A', '#6A5AB0'];
    for (var i = 0; i < 40; i++) append(conf, h('i', { style: 'left:' + Math.random() * 100 + '%;background:' + pick(colors) + ';animation-delay:' + (Math.random() * 0.8).toFixed(2) + 's' }));
    var big = h('div', { class: 'big-stars' });
    for (var k = 0; k < 3; k++) append(big, h('span', { class: k < stars ? '' : 'off' }, '★'));
    var overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' });
    var modal = h('div', { class: 'modal celebrate' }, big, h('h2', {}, msg),
      stats.total ? h('p', { class: 'muted' }, '自己答對 ' + stats.indep + '／' + stats.total + ' 題') : null);
    append(modal, actsFn(overlay));
    append(overlay, modal); document.body.appendChild(overlay); document.body.appendChild(conf);
    setTimeout(function () { conf.remove(); }, 3500);
    speak(msg);
  }

  // ════════════════════════════════════════════════
  //  老師設定（長按齒輪 1.5 秒＋算術題，避免學生誤開）
  // ════════════════════════════════════════════════
  function gearBtn() {
    var b = h('button', { class: 'gear', type: 'button', 'aria-label': '老師設定（長按）' }, h('span', { class: 'ring' }), '⚙️');
    var t = null, opened = false;
    var start = function (e) { e.preventDefault(); opened = false; b.classList.add('holding'); t = setTimeout(function () { b.classList.remove('holding'); opened = true; openGate(); }, 1500); };
    var end = function () { clearTimeout(t); b.classList.remove('holding'); };
    b.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, end); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () { if (!opened) toast('老師設定：請按住 2 秒'); opened = false; });
    return b;
  }
  function modalWrap(content) {
    var overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'modal' }, content));
    document.body.appendChild(overlay);
    return overlay;
  }
  function openGate() {
    var a = 12 + Math.floor(Math.random() * 8), b = 6 + Math.floor(Math.random() * 4);
    var input = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': '答案' });
    var ok = h('button', { class: 'btn btn-primary', type: 'button', style: 'flex:1' }, '確定');
    var cancel = h('button', { class: 'btn btn-ghost', type: 'button', style: 'flex:1' }, '取消');
    var ov = modalWrap(h('div', { class: 'gate' }, h('h2', {}, '老師設定'), h('p', { class: 'muted' }, '請回答：' + a + ' × ' + b + ' ＝ ？'), input, h('div', { class: 'row' }, cancel, ok)));
    var check = function () { if (parseInt(input.value, 10) === a * b) { ov.remove(); openTeacher(); } else { input.value = ''; input.classList.add('shake'); setTimeout(function () { input.classList.remove('shake'); }, 400); } };
    ok.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    cancel.addEventListener('click', function () { ov.remove(); });
    setTimeout(function () { input.focus(); }, 50);
  }
  function openTeacher() {
    var ov = modalWrap(h('div'));
    var body = ov.querySelector('.modal');
    body.classList.add('teacher');
    function sw(on, fn) { var b = h('button', { class: 'switch' + (on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false' }); b.addEventListener('click', fn); return b; }
    function set(k, v) { state.settings[k] = v; save(); draw(); }
    function draw() {
      var s = state.settings, c = cfg();
      body.innerHTML = '';
      var close = h('button', { class: 'btn btn-primary', type: 'button' }, '完成');
      close.addEventListener('click', function () { ov.remove(); route(); });
      append(body, h('div', { class: 'row' }, h('h2', { style: 'flex:1' }, '⚙️ 老師設定'), close));
      append(body, h('p', { class: 'muted', style: 'margin:4px 0 0' }, '設定只存在這台 iPad，適合依每位學生調整。'));
      var lv = h('div', { class: 'levels' });
      [1, 2, 3].forEach(function (n) {
        var b = h('button', { class: 'level-opt' + (s.level === n ? ' on' : ''), type: 'button' }, h('b', {}, LEVELS[n].name), h('div', {}, LEVELS[n].desc));
        b.addEventListener('click', function () { state.settings.autoRead = null; set('level', n); });
        append(lv, b);
      });
      append(body, h('section', {}, h('h3', {}, '學習等級'), lv));
      append(body, h('section', {}, h('h3', {}, '個別調整'),
        h('div', { class: 'toggle-row' }, h('span', {}, '顯示注音'), sw(s.zhuyin, function () { set('zhuyin', !s.zhuyin); })),
        h('div', { class: 'toggle-row' }, h('span', {}, '自動念題目', h('br'), h('small', { class: 'muted' }, s.autoRead == null ? '（依等級預設）' : '（已個別設定）')), sw(c.autoRead, function () { set('autoRead', !c.autoRead); })),
        h('div', { class: 'toggle-row' }, h('span', {}, '音效'), sw(s.sfx, function () { set('sfx', !s.sfx); })),
        h('div', { class: 'toggle-row' }, h('span', {}, '核心活動依序解鎖'), sw(s.sequential, function () { set('sequential', !s.sequential); })),
        h('div', { class: 'toggle-row' }, h('span', {}, '朗讀速度'), (function () {
          var seg = h('div', { class: 'seg' });
          [[0.7, '慢'], [0.85, '標準'], [1, '快']].forEach(function (o) {
            var b = h('button', { class: s.rate === o[0] ? 'on' : '', type: 'button' }, o[1]);
            b.addEventListener('click', function () { set('rate', o[0]); speak('朗讀速度測試'); });
            append(seg, b);
          });
          return seg;
        })())));
      append(body, h('section', {}, h('h3', {}, '學習紀錄'), recordsTable()));
      var reset = h('button', { class: 'btn btn-ghost danger', type: 'button', style: 'margin-top:16px' }, '清除這台 iPad 的學習紀錄');
      reset.addEventListener('click', function () { if (window.confirm('確定要清除全部學習紀錄嗎？這個動作無法復原。')) { state.progress = {}; save(); draw(); } });
      append(body, reset);
    }
    draw();
  }
  function recordsTable() {
    var tb = h('tbody');
    Object.keys(LESSONS).sort().forEach(function (lid) {
      MODULE_ORDER.forEach(function (mid) {
        var s = modStatus(lid, mid), recs = Object.keys(s.prog).map(function (k) { return s.prog[k]; });
        var acc = recs.length ? Math.round(recs.reduce(function (a, r) { return a + r.acc; }, 0) / recs.length) + '%' : '—';
        var last = recs.length ? recs.map(function (r) { return r.date; }).sort().pop() : '—';
        append(tb, h('tr', {}, h('td', {}, '第' + LESSONS[lid].no + '課 ' + MODULES[mid].name), h('td', {}, s.done + '／' + s.total), h('td', {}, starsEl(s.stars)), h('td', {}, acc), h('td', {}, last)));
      });
    });
    return h('div', { style: 'overflow-x:auto' }, h('table', { class: 'records' },
      h('thead', {}, h('tr', {}, h('th', {}, '活動'), h('th', {}, '組數'), h('th', {}, '星星'), h('th', {}, '獨立答對'), h('th', {}, '日期'))), tb),
      h('p', { class: 'muted', style: 'font-size:15px' }, '「獨立答對」＝沒有用提示、第一次就答對的比例，可作為 IEP 觀察參考。改變等級後分組方式會不同，組數會重新計算。'));
  }

  // ── 路由 ───────────────────────────────────────
  function route() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'lesson' && LESSONS[p[1]]) {
      if (p[2] === 'm' && MODULES[p[3]]) return renderModule(p[1], p[3], p[4] != null ? parseInt(p[4], 10) : null);
      return renderLesson(p[1]);
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);
  route();
})();
