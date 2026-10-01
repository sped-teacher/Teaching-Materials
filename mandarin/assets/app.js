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

  // 左上角顯示的教材名稱：格式「版本＋科目＋年級學期」（之後新增其他版本、年級照這個格式）
  var SITE_NAME = '康軒國語五上';
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
    var b = h('button', { class: 'say', type: 'button', 'aria-label': '朗讀：' + (label || text), 'data-say': text }, '🔊');
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
    cs.forEach(function (c, i) { f.appendChild(h('span', { class: 'zy-c' }, h('span', { class: 'zy-h' }, c), zyColumn(zs[i]))); });
    return f;
  }
  // 注音直排在國字右側：符號由上往下，聲調在右邊（對齊最後一個符號），輕聲「˙」在最上面
  function zyColumn(syl) {
    var col = h('span', { class: 'zy-v', 'aria-hidden': 'true' });
    var light = syl.indexOf('˙') >= 0, tone = '';  // 輕聲點不論寫在前面或後面，都畫在最上面
    if (light) syl = syl.replace('˙', '');
    if (/[ˊˇˋˉ]$/.test(syl)) { tone = syl.slice(-1); syl = syl.slice(0, -1); }
    var sy = Array.from(syl);
    if (light) append(col, h('span', { class: 'zy-light', style: 'grid-row:1;grid-column:1' }, '˙'));
    sy.forEach(function (s, k) { append(col, h('span', { class: 'zy-s', style: 'grid-row:' + (k + 2) + ';grid-column:1' }, s)); });
    if (tone) append(col, h('span', { class: 'zy-t', style: 'grid-row:' + (sy.length + 1) + ';grid-column:2' }, tone));
    return col;
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

  // ── 圖卡：images/lessonXX/語詞.webp（640×640，每張約 30 KB）──
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
  // 分組：先算要分幾組（每組最多 size 個），再平均分配，例如 15 個、每組最多 6 個 → 5-5-5
  function mkUnits(items, size) {
    return balanced(items, size).map(function (g) { return { key: g.map(itemId).join('|'), items: g }; });
  }
  // 平均分組：每組最多 size 個，不會剩下只有一兩個的最後一組
  function balanced(items, size) {
    var n = Math.ceil(items.length / size) || 1, base = Math.floor(items.length / n), extra = items.length % n;
    var out = [], at = 0;
    for (var k = 0; k < n; k++) out.push(items.slice(at, at += base + (k < extra ? 1 : 0)));
    return out;
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

  // 收題模式（單課小考用）：CAPTURE 是陣列時，各站的選擇題不畫出來，只把題目收集起來
  var CAPTURE = null;

  // 選擇題：item = { prompt(), say, options[正解在第 0 個], kai, long, hint, after }
  // api.result(it, indep, promptEl)：答完一題時通知（錯題複習、單課小考用）
  function runQuiz(stage, items, api) {
    if (CAPTURE) { items.forEach(function (it) { CAPTURE.push(it); }); return; }
    var c = api.cfg, i = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var it = items[i], wrong = 0, hinted = false, solved = false;
      var answer = it.options[0];
      // fixed：選項照給的順序顯示（例如「有／沒有」）
      var opts = it.fixed ? it.fixed.slice() : shuffle([answer].concat(shuffle(it.options.slice(1)).slice(0, c.options - 1)));
      var maxLen = Math.max.apply(null, opts.map(function (o) { return Array.from(o).length; }));
      var optBox = h('div', { class: 'options' + (it.long ? ' long' : '') + (it.kai && maxLen >= 3 ? ' wide' : '') });
      var hintSlot = h('div'), fb = h('div', { class: 'feedback' });
      var btns = opts.map(function (o) {
        // zyOf：選項是注音時，改成「國字＋右側注音」顯示
        var b = h('button', { class: 'opt' + (it.kai || it.zyOf ? ' kai' : ''), type: 'button', 'aria-label': o }, it.zyOf ? withZy(it.zyOf, o, true) : o);
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
          var indep = wrong === 0 && !hinted;
          sfx.right(); api.record(indep);
          if (api.result) api.result(it, indep, promptEl);
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
          // 拿掉一個錯的選項；長選項連旁邊的喇叭整行一起藏起來
          if (wrongs.length) { var x = pick(wrongs); x.disabled = true; x.classList.add('gone'); if (it.long) x.closest('.row').classList.add('gone'); }
          else reveal();
        });
        return b;
      })());
      var promptEl = h('div', { class: 'prompt' }, it.prompt());
      append(stage, qbar(i, items.length), promptEl, optBox, hintSlot, tools, fb);
      if (c.autoRead && it.say) speak(it.say);
    }
    show();
  }

  // 排順序：item = { chips[正確順序], prefill, vertical, say, conn }
  function runOrder(stage, items, api) {
    if (CAPTURE) return;
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
  // perRound：每回幾對（不給就依等級，並平均分回）
  function runMatch(stage, pairs, api, noun, perRound) {
    if (CAPTURE) return;
    var c = api.cfg, rounds = balanced(pairs, perRound || c.pairs), r = 0;
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
        if (sel == null) { toast('先點左邊的' + (noun || '語詞')); left.forEach(function (x) { if (!x.disabled) { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); } }); return; }
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
        h('p', { class: 'muted', style: 'margin:0 0 10px' }, '先點左邊的' + (noun || '語詞') + '，再點右邊對應的意思。'),
        h('div', { class: 'match' }, h('div', { class: 'col' }, left), h('div', { class: 'col' }, rightTiles.map(function (o) { return o.wrap; }))),
        fb);
    }
    show();
  }

  // 翻牌記憶（等級 3）
  function runMemory(stage, pairs, api, noun) {
    if (CAPTURE) return;
    var c = api.cfg, rounds = balanced(pairs, c.pairs), r = 0;
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
        h('p', { class: 'muted', style: 'margin:0 0 10px' }, '翻開兩張牌，找出「' + (noun || '語詞') + '」和它的「意思」。'), grid, fb);
    }
    show();
  }

  // 字卡／詞卡：每張都點過才能下一步（等級 3 可直接下一步）
  function runCards(stage, items, api, build) {
    if (CAPTURE) return;
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
  // 教育百科（教育部教育雲）
  var PEDIA = 'https://pedia.cloud.edu.tw';
  function pediaLink(title, label) {
    var a = h('a', { class: 'pedia', href: PEDIA + '/Entry/Detail?title=' + encodeURIComponent(title), target: '_blank', rel: 'noopener', 'aria-label': '在教育百科查「' + title + '」（開新視窗）' }, label || '📖 教育百科');
    a.addEventListener('click', function (e) { e.stopPropagation(); });
    return a;
  }
  function radicalLabel(ch) { return ch.rform ? ch.rform + '（' + ch.radical + '）' : ch.radical; }

  // ════════════════════════════════════════════════
  //  自己造句：打字或用說的。用「規則」檢查句型結構（連接詞、順序、每一段有沒有寫），
  //  幫忙補標點後念一遍；意思通不通順電腦判斷不了，句子會存起來給老師看（老師設定頁）。
  // ════════════════════════════════════════════════
  var HALF_PUNCT = { ',': '，', '.': '。', '?': '？', '!': '！', ';': '；', ':': '：' };
  function cleanSentence(s) {
    return String(s || '').replace(/[,.?!;:]/g, function (m) { return HALF_PUNCT[m]; })
      .replace(/\s+/g, '').replace(/([，。？！；：、])\1+/g, '$1').replace(/^[，。？！；：、]+/, '');
  }
  function hanCount(s) { return (String(s).match(/[㐀-鿿]/g) || []).length; }
  function bareText(s) { return String(s).replace(/[^㐀-鿿]/g, ''); }
  // 依序找連接詞的位置（同一個詞出現兩次也可以，例如「一邊……一邊……」）
  function findConns(s, conns) {
    var pos = [], from = 0;
    for (var i = 0; i < conns.length; i++) {
      var k = s.indexOf(conns[i], from);
      if (k < 0) return { missing: i, pos: pos };
      pos.push(k); from = k + conns[i].length;
    }
    return { pos: pos };
  }
  // 句型「雖然……可是……」→ ['雖然', '可是', '']：每個「……」是學生要寫的地方
  function patParts(p) { return p.pattern.split('……'); }
  function fixSentence(s, p) {
    s = cleanSentence(s);
    var conns = p.conn, f = findConns(s, conns), lead = patParts(p)[0] === '';
    if (f.missing == null) {
      for (var i = f.pos.length - 1; i >= 0; i--) {
        var k = f.pos[i];
        // 連接詞前面補逗號：第二個以後的連接詞；句型開頭是「……」時第一個也要（今天下雨，所以……）
        if (k > 0 && (i > 0 || lead) && !/[，。？！；：、「]/.test(s[k - 1])) s = s.slice(0, k) + '，' + s.slice(k);
      }
    }
    if (!/[。？！]$/.test(s)) s = s.replace(/[，、；：]+$/, '') + '。';
    return s;
  }
  function checkSentence(raw, p) {
    var s = cleanSentence(raw), conns = p.conn, parts = patParts(p);
    if (/[A-Za-z]/.test(s)) return { msg: '請用中文寫句子。' };
    if (!hanCount(s)) return { msg: '還沒有寫句子喔。' };
    if (/([㐀-鿿])\1\1/.test(s)) return { msg: '好像有字重複打了，檢查一下。' };
    var f = findConns(s, conns);
    if (f.missing != null) {
      var w = conns[f.missing];
      if (f.missing > 0 && w === conns[f.missing - 1]) return { msg: '句子裡要有兩個「' + w + '」。這個句型是「' + p.pattern + '」。' };
      if (f.missing > 0 && s.indexOf(w) >= 0) return { msg: '「' + conns[f.missing - 1] + '」要寫在「' + w + '」前面。' };
      return { msg: '句子裡要有「' + w + '」。這個句型是「' + p.pattern + '」。' };
    }
    // 每一段要寫的內容（至少 2 個字）
    var segs = [];
    if (parts[0] === '') segs.push({ txt: s.slice(0, f.pos[0]), where: '「' + conns[0] + '」前面' });
    for (var i = 0; i < conns.length; i++) {
      var a = f.pos[i] + conns[i].length, b = i + 1 < conns.length ? f.pos[i + 1] : s.length;
      if (i + 1 < conns.length || parts[parts.length - 1] === '') segs.push({ txt: s.slice(a, b), where: '「' + conns[i] + '」後面' });
    }
    for (var k = 0; k < segs.length; k++) if (hanCount(segs[k].txt) < 2) return { msg: segs[k].where + '要再多寫一點。' };
    if (hanCount(s) < bareText(conns.join('')).length + 5) return { msg: '句子太短了，再多寫一點。' };
    var me = bareText(s), copies = (p.models || []).concat(p.origin || []).some(function (m) { return bareText(m) === me; });
    if (copies) return { msg: '這是例句喔，換成你自己的話試試看。' };
    return { ok: true, fixed: fixSentence(s, p) };
  }
  // 🎤 用說的（瀏覽器語音辨識）；不支援的瀏覽器就不顯示，學生仍可用鍵盤上的麥克風
  var SR_CLASS = window.SpeechRecognition || window.webkitSpeechRecognition;
  function micFor(input) {
    if (!SR_CLASS) return null;
    var b = h('button', { class: 'say mic-btn', type: 'button', 'aria-label': '用說的' }, '🎤'), rec = null;
    b.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      stopSpeak();
      var base = input.value;
      rec = new SR_CLASS(); rec.lang = 'zh-TW'; rec.interimResults = true; rec.continuous = false;
      rec.onresult = function (e) { var t = ''; for (var r = 0; r < e.results.length; r++) t += e.results[r][0].transcript; input.value = base + t; };
      rec.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('請在瀏覽器設定裡允許使用麥克風');
        else if (e.error === 'network') toast('語音輸入要連上網路');
      };
      rec.onend = function () { rec = null; b.classList.remove('speaking'); b.textContent = '🎤'; };
      try { rec.start(); b.classList.add('speaking'); b.textContent = '⏹'; } catch (err) { rec = null; }
    });
    window.addEventListener('hashchange', function () { if (rec) { try { rec.abort(); } catch (e) { } } }, { once: true });
    return b;
  }
  function runMake(stage, p, L, api) {
    if (CAPTURE) return;
    var c = api.cfg, frame = c.level < 3, parts = patParts(p), tries = 0, done = false;
    var model = (p.models || [])[0] || (p.origin || [])[0] || '';
    var inputs = [];
    function mkInput(ph) {
      var inp = h('input', { type: 'text', class: 'make-in', lang: 'zh-Hant', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', placeholder: ph || '' });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      inputs.push(inp);
      var mic = micFor(inp);
      return h('span', { class: 'make-slot' }, inp, mic);
    }
    var box;
    if (frame) {
      // 句型框：一段一列，連接詞在左邊對齊、格子在中間、標點在右邊
      //   原本 [　　] ，
      //     但 [　　] 。
      box = h('div', { class: 'make-frame' });
      var blanks = parts.length - 1;
      for (var bi = 0; bi < blanks; bi++) {
        var last = bi === blanks - 1;
        append(box,
          h('span', { class: 'make-conn make-lead' }, parts[bi] ? colorConn(parts[bi], p.conn) : ''),
          mkInput(bi === 0 && parts[0] === '' ? '先寫……' : '寫你的想法'),
          h('span', { class: 'make-conn make-end' }, last ? (parts[blanks] || '') + '。' : '，'));
      }
    } else {
      box = h('div', { class: 'make-free' }, mkInput('用「' + p.pattern + '」寫一個句子'));
    }
    function assemble() {
      if (!frame) return inputs[0].value;
      var s = '';
      parts.forEach(function (part, i) {
        if (part) s += (i > 0 ? '，' : '') + part;
        if (i < parts.length - 1) {
          var t = cleanSentence(inputs[i].value).replace(/[，。？！；：、]+$/, '');
          if (part && t.indexOf(part) === 0) t = t.slice(part.length);                       // 用說的時常把連接詞也念進去
          var nx = parts[i + 1]; if (nx && t.slice(-nx.length) === nx) t = t.slice(0, -nx.length);
          s += t;
        }
      });
      return s;
    }
    var exBox = h('div');
    function showExample() {
      if (exBox.firstChild || !model) return;
      append(exBox, h('div', { class: 'model' }, h('span', { class: 'tag' }, '例句'), h('span', {}, colorConn(model, p.conn)), sayBtn(model)));
    }
    if (c.level === 1) showExample();
    var fb = h('div', { class: 'feedback' });
    var checkBtn = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, '✅ 檢查我的句子');
    checkBtn.addEventListener('click', check);
    var tools = h('div', { class: 'tools' });
    if (c.level > 1 && model) append(tools, btnTo('💡 看例句', 'btn-ghost', function () { showExample(); }));
    function saveMade(text) {
      var pr = state.progress; pr[L.id] = pr[L.id] || {};
      pr[L.id].made = (pr[L.id].made || []).concat([{ p: p.pattern, s: text, d: today(), lv: c.level, t: tries + 1 }]).slice(-60);
      save();
    }
    function check() {
      if (done) return;
      var empty = inputs.every(function (x) { return !x.value.trim(); });
      var r = empty ? { msg: '還沒有寫句子喔。' } : checkSentence(assemble(), p);
      fb.innerHTML = '';
      if (!r.ok) {
        tries++; sfx.wrong();
        append(fb, h('div', { class: 'hintbox' }, '💡', h('span', { style: 'flex:1' }, r.msg), sayBtn(r.msg)));
        if (c.autoRead) speak(r.msg);
        if (tries >= 2) {
          showExample();
          append(fb, btnTo('先跳過，下一步 →', 'btn-ghost', function () { done = true; api.record(false); api.next(); }));
        }
        return;
      }
      done = true; sfx.right(); api.record(tries === 0);
      inputs.forEach(function (x) { x.disabled = true; });
      checkBtn.disabled = true;
      saveMade(r.fixed);
      var raw = cleanSentence(assemble()), changed = !frame && raw !== r.fixed;
      append(fb, h('div', { class: 'praise' }, pick(PRAISE)),
        h('div', { class: 'card made-card' }, h('div', { class: 'muted', style: 'font-size:16px' }, changed ? '我幫你加上了標點符號，念一遍：' : '你的句子：'),
          h('div', { class: 'row', style: 'justify-content:center' }, h('span', { class: 'made-text' }, colorConn(r.fixed, p.conn)), sayBtn(r.fixed))),
        h('p', { class: 'muted', style: 'text-align:center;margin:4px 0' }, '念念看，意思通順嗎？老師也會看你造的句子。'),
        nextBtn('完成 →', api.next));
      speak(r.fixed);
    }
    append(stage,
      h('p', { class: 'muted', style: 'margin:0 0 6px' }, frame ? '在空格裡寫上你的想法，句子就完成了。' : '用「' + p.pattern + '」寫一個完整的句子。'),
      h('p', { class: 'muted', style: 'margin:0 0 12px;font-size:16px' }, '可以打字，也可以按 🎤 用說的（或用鍵盤上的麥克風）。'),
      box, exBox, h('div', { style: 'margin-top:14px' }, checkBtn), tools, fb);
    setTimeout(function () { if (inputs[0]) inputs[0].focus(); }, 80);
  }

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
                h('div', { class: 'hanzi' }, withZy(ch.c, ch.zy)),
                h('div', { class: 'facts' }, h('span', { class: 'nw' }, '部首 ', h('b', {}, radicalLabel(ch))), '　', h('span', { class: 'nw' }, '筆畫 ', h('b', {}, String(ch.strokes)))),
                h('div', { class: 'wds' }, ch.words.join('、')),
                ch.poly ? h('div', { class: 'poly' }, h('span', { class: 'tag' }, '多音字'), ch.poly.map(function (p) {
                  return h('div', {}, h('b', { class: 'poly-char' }, withZy(ch.c, p.zy, true)), h('div', { class: 'nw' }, p.words.join('、')));
                })) : null,
                pediaLink(ch.c));
              var polySay = ch.poly ? '。這是多音字，還有另一個念法：' + ch.poly.map(function (p) { return p.words.join('、'); }).join('；') : '';
              return { el: el, say: ch.c + '，' + ch.cue + '。部首是' + ch.radical + '，一共' + ch.strokes + '畫。可以造詞：' + ch.words.join('、') + polySay };
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
                  var b = h('button', { class: 'listen-btn', type: 'button', 'aria-label': '聽題目', 'data-say': ch.cue }, '🔊');
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
        var pairs = items.map(function (w) { return { a: w.w, b: w.meaning }; });
        // 看詞卡 → 配對 → 看意思選語詞 → 翻牌（最難，只有等級 3）
        var list = [
          step('看詞卡：點每一張卡，聽語詞和意思。', 'cards', function (stage, api) {
            var build = function (w) {
              var el = h('div', { class: 'word-card', role: 'button', tabindex: '0' },
                picEl(L.id, w.w),
                h('div', { class: 'lines' },
                  h('div', { class: 'line' }, h('span', { class: 'word' }, withZy(w.w, w.zy)), sayBtn(w.say || w.w, w.w)),
                  h('div', { class: 'line' }, h('span', { class: 'meaning', style: 'flex:1' }, w.meaning), sayBtn(w.meaning)),
                  w.origin ? h('div', { class: 'line' }, h('span', { class: 'ex origin', style: 'flex:1' }, h('b', {}, '課文：'), w.origin), sayBtn(w.originSay || w.origin, w.origin)) : null,
                  h('div', { class: 'line' }, h('span', { class: 'ex', style: 'flex:1' }, '例句：' + w.example), sayBtn(w.exampleSay || w.example, w.example))));
              return { el: el, say: (w.say || w.w) + '。' + w.meaning };
            };
            build.wide = true;
            runCards(stage, items, api, build);
          }),
          step('配對遊戲：把語詞和意思配成一對。', 'game', function (stage, api) { runMatch(stage, pairs, api); }),
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
        if (c.memory) list.push(step('翻牌遊戲：找出語詞和它的意思。', 'game', function (stage, api) { runMemory(stage, pairs, api); }));
        return list;
      }
    },

    // 短語短句：看結構（詞性上色）→ 排短語 → 選出順序正確的短語
    phrases: {
      name: '短語短句', icon: '🔗', desc: '認識短語短句結構、排排看', core: true,
      units: function (L) { return (L.phrases || []).map(function (p) { return { key: p.id, items: [p], label: p.model.join('') }; }); },
      steps: function (L, unit, c) {
        var p = unit.items[0];
        var K = p.kind === '短句練習' ? '短句' : '短語';
        var roleCls = function (i) { return { '動詞': 'ph-v', '名詞': 'ph-n', '形容詞': 'ph-a', '疊字詞': 'ph-a', '量詞': 'ph-q', '疊字量詞': 'ph-q' }[p.roles[i]] || 'ph-x'; };
        var colored = function (parts) { return h('span', { class: 'phrase' }, parts.map(function (t, i) { return h('span', { class: roleCls(i) }, t); })); };
        var structure = h('div', { class: 'ph-structure' }, p.roles.map(function (r, i) {
          return h('span', { class: 'ph-slot ' + roleCls(i) }, r ? '（' + r + '）' : p.model[i]);
        }));
        var structSay = p.roles.map(function (r, i) { return r || p.model[i]; }).join('，');
        // 錯的選項：把相鄰兩個詞塊對調，或頭尾對調（去掉重複、去掉和正解一樣的）
        var scramble = function (parts) {
          var right = parts.join(''), out = [];
          var swap = function (i, j) { var a = parts.slice(), t = a[i]; a[i] = a[j]; a[j] = t; return a.join(''); };
          for (var i = 0; i < parts.length - 1; i++) out.push(swap(i, i + 1));
          out.push(swap(0, parts.length - 1));
          out = uniq(out).filter(function (s) { return s !== right; });
          return [right].concat(shuffle(out).slice(0, 3));
        };
        return [
          step('認識' + K + '：看看這個' + K + '是怎麼組成的。', 'intro', function (stage, api) {
            var card = h('div', { class: 'card pattern-card' },
              h('span', { class: 'kind' }, p.kind || '短語練習'),
              h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'pat' }, colored(p.model)), sayBtn(p.model.join(''))),
              h('div', { class: 'row', style: 'justify-content:center' }, structure, sayBtn(structSay, '短語結構')),
              h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'explain' }, p.explain), sayBtn(p.explain)),
              p.examples.map(function (e) { return h('div', { class: 'model' }, colored(e), sayBtn(e.join(''))); }));
            append(stage, card, h('div', { style: 'margin-top:16px' }, nextBtn('我知道了，開始練習 →', api.next)));
          }),
          step('排' + K + '：照順序點詞塊，排成完整的' + K + '。', 'quiz', function (stage, api) {
            append(stage, h('div', { style: 'text-align:center;margin-bottom:8px' }, structure.cloneNode(true)));
            var box = h('div'); append(stage, box);
            runOrder(box, p.practice.slice(0, c.orderCount + 1).map(function (chips) {
              return { chips: chips, prefill: c.prefill, say: chips.join('') };
            }), api);
          }),
          step('選一選：哪一個' + K + '的順序是對的？', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(p.practice.concat(p.examples)).slice(0, c.orderCount + 2).map(function (parts) {
              return {
                long: true, options: scramble(parts), after: parts.join(''),
                hint: '照這個順序：' + p.roles.map(function (r, i) { return r ? '（' + r + '）' : p.model[i]; }).join(''),
                prompt: function () { return h('div', {}, structure.cloneNode(true)); }
              };
            }), api);
          })
        ];
      }
    },

    sentences: {
      name: '句型練習', icon: '🧱', desc: '認識句型、排句子、選連接詞', core: true,
      units: function (L, c) {
        return L.sentences.filter(function (s) { return !s.flex || c.level === 3; })
          .map(function (s) { return { key: s.id, items: [s], label: s.pattern + (s.flex ? '（挑戰）' : '') }; });
      },
      steps: function (L, unit, c) {
        var p = unit.items[0];
        var list = [
          step('認識句型：聽一聽「' + p.pattern + '」怎麼用。', 'intro', function (stage, api) {
            var card = h('div', { class: 'card pattern-card' },
              h('span', { class: 'kind' }, p.kind),
              h('div', { class: 'pat' }, colorConn(p.pattern, p.conn)),
              h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'explain' }, p.explain), sayBtn(p.explain)),
              (p.origin || []).map(function (m) { return h('div', { class: 'model origin' }, h('span', { class: 'tag' }, '課文'), h('span', {}, colorConn(m, p.conn)), sayBtn(m)); }),
              p.models.map(function (m) { return h('div', { class: 'model' }, h('span', { class: 'tag' }, '例句'), h('span', {}, colorConn(m, p.conn)), sayBtn(m)); }));
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
        list.push(step(c.level < 3 ? '自己造句：在空格寫上你的想法。' : '自己造句：用「' + p.pattern + '」寫一個句子。', 'quiz', function (stage, api) {
          runMake(stage, p, L, api);
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

    // 字族文：先讀韻文認識一家人 → 母體字加部首組字 → 句子選字；最後一組是綜合測驗
    lookalikes: {
      name: '形近字', icon: '🔍', desc: '讀字族文、組字、句子選字', core: false,
      units: function (L) {
        return L.families.map(function (f) { return { key: f.id, items: [f], label: f.title || (f.poly ? '「' + f.base + '」一字兩音' : '「' + f.base + '」字家族') }; })
          .concat([{ key: 'mix', items: L.lookalikes, label: '綜合測驗' }]);
      },
      steps: function (L, unit, c) {
        // 把句子裡的某個字標色（多音字題用）
        var hlText = function (text, ch, zy) {
          var k = text.indexOf(ch);
          return [text.slice(0, k), h('b', { class: 'hl-char' }, zy ? withZy(ch, zy, true) : ch), text.slice(k + 1)];
        };
        var qItem = function (q) {
          if (q.poly) return {
            options: q.options, hint: q.hint, after: q.sentence, zyOf: q.hl,
            prompt: function () { return h('div', {}, h('div', { class: 'sentence' }, hlText(q.sentence, q.hl)), h('div', { class: 'sub' }, '句子裡的「' + q.hl + '」要怎麼念？')); }
          };
          var full = q.sentence.replace('＿', q.options[0]);
          return {
            say: full, kai: true, options: q.options, hint: q.hint, after: full,
            prompt: function () { return h('div', { class: 'sentence' }, blanked(q.sentence)); }
          };
        };
        var fillStep = function (title, qs) {
          return step(title, 'quiz', function (stage, api) { runQuiz(stage, shuffle(qs).map(qItem), api); });
        };
        if (unit.key === 'mix') {
          var n = { 1: 6, 2: 10 }[c.level] || L.lookalikes.length;
          return [fillStep('綜合測驗：選出正確的字或念法。', shuffle(L.lookalikes).slice(0, n))];
        }
        var f = unit.items[0];
        var famQs = L.lookalikes.filter(function (q) { return q.fam === f.id; });
        var kids = f.members.filter(function (m) { return !m.base; });
        var famChars = f.members.map(function (m) { return m.c; });
        var formula = function (m) {
          return h('span', { class: 'formula' }, h('b', {}, f.base), '＋', h('b', { class: 'part' }, m.part));
        };
        // 沒有 base 的是「形似字」（例如 乎／平）：不組字，改成看語詞選字
        var similar = !f.base;
        var readStep = step(f.poly ? '讀一讀：同一個「' + f.base + '」有兩種念法，再點每一張字卡。' : similar ? '比一比：念一念，看看哪裡不一樣，再點每一張字卡。' : '讀字族文：念一念，再點每一張字卡。', 'cards', function (stage, api) {
          var poemSay = f.members.map(function (m) { return m.line; }).join('，') + '。';
          var readAll = h('button', { class: 'btn btn-ghost', type: 'button' }, '🔊 念整首');
          readAll.addEventListener('click', function () { speak(poemSay); });
          append(stage, h('div', { class: 'card fam-poem' },
            similar ? h('div', { class: 'fam-base' }, h('span', { class: 'b' }, famChars.join('　')), h('span', {}, '長得很像'))
              : h('div', { class: 'fam-base' }, h('span', { class: 'b' }, f.poly ? f.base : withZy(f.base, f.baseZy)), h('span', {}, f.poly ? '一字兩音' : '字家族')),
            f.members.map(function (m) {
              return h('div', { class: 'fam-line' }, h('span', { style: 'flex:1' }, hlText(m.line, m.c, f.poly ? m.zy : null)), sayBtn(m.line));
            }),
            h('div', { class: 'tools', style: 'margin-top:8px' }, readAll)));
          runCards(stage, f.members, api, function (m) {
            var el = h('div', { role: 'button', tabindex: '0' },
              m.pic ? h('div', { class: 'fam-pic' }, picEl(L.id, m.pic)) : null,
              h('div', { class: 'hanzi' + (f.poly ? ' zy-strong' : '') }, withZy(m.c, m.zy, f.poly)),
              f.poly || similar ? null : h('div', { class: 'facts' }, m.base ? h('span', { class: 'formula' }, '母體字') : formula(m)),
              h('div', { class: 'wds' }, m.words.join('、')),
              h('div', { class: 'tip' }, m.tip));
            return { el: el, say: f.poly ? m.words.join('，') + '。' + m.tip : m.c + '，' + m.words[0] + '的' + m.c + '。' + m.tip };
          });
        });
        if (f.poly) {
          var zys = f.members.map(function (m) { return m.zy; });
          return [
            readStep,
            step('選念法：語詞裡的「' + f.base + '」怎麼念？', 'quiz', function (stage, api) {
              var qs = [];
              f.members.forEach(function (m) {
                m.words.forEach(function (w) {
                  qs.push({
                    options: [m.zy].concat(zys.filter(function (z) { return z !== m.zy; })), hint: m.tip, after: w, zyOf: f.base,
                    prompt: function () { return h('div', { class: 'big', style: 'font-size:72px' }, hlText(w, f.base)); }
                  });
                });
              });
              runQuiz(stage, shuffle(qs), api);
            }),
            fillStep('句子裡的念法：「' + f.base + '」在句子裡怎麼念？', famQs)
          ];
        }
        if (similar) return [
          readStep,
          step('看語詞選字：語詞裡少了哪一個字？', 'quiz', function (stage, api) {
            var qs = [];
            f.members.forEach(function (m) {
              m.words.forEach(function (w) {
                qs.push({
                  say: w, kai: true, options: [m.c].concat(shuffle(famChars.filter(function (x) { return x !== m.c; }))),
                  hint: m.tip, after: w,
                  prompt: function () { return h('div', { class: 'big', style: 'font-size:72px' }, blanked(w.replace(m.c, '＿'))); }
                });
              });
            });
            runQuiz(stage, shuffle(qs), api);
          }),
          fillStep('句子選字：空格裡要填哪一個字？', famQs)
        ];
        return [
          readStep,
          step('組字：「' + f.base + '」加上部首，會變成哪一個字？', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(kids).map(function (m) {
              return {
                say: f.base + '，加上' + m.partName + '，變成哪一個字？', kai: true,
                options: [m.c].concat(shuffle(famChars.filter(function (x) { return x !== m.c; }))),
                hint: m.tip, after: m.c + '，' + m.words[0] + '的' + m.c,
                prompt: function () { return h('div', { class: 'big', style: 'font-size:64px' }, formula(m), '＝？'); }
              };
            }), api);
          }),
          fillStep('句子選字：空格裡要填哪一個字？', famQs)
        ];
      }
    },

    idioms: {
      name: '生字變成語', icon: '🏮', desc: '補上生字、看圖選成語、配對', core: false,
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
          // 補字（本課生字放進成語，定期評量常考）→ 看意思選成語（有圖片提示）→ 配對（沒有圖片）
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
          step('看意思選成語：看圖和意思，選出正確的成語。', 'quiz', function (stage, api) {
            runQuiz(stage, shuffle(items).map(function (d) {
              return {
                say: d.meaning, kai: true,
                options: [d.idiom].concat(shuffle(L.idioms.filter(function (x) { return x.idiom !== d.idiom; }).map(function (x) { return x.idiom; }))),
                after: d.idiom + '，' + d.example,
                prompt: function () {
                  return h('div', {}, h('div', { style: 'max-width:220px;margin:0 auto 8px' }, picEl(L.id, d.idiom)),
                    h('div', { class: 'sentence' }, '「' + d.meaning + '」'));
                }
              };
            }), api);
          }),
          step('配對遊戲：把成語和意思配成一對。', 'game', function (stage, api) {
            // 成語一次全部配對，不分回
            runMatch(stage, items.map(function (d) { return { a: d.idiom, b: d.meaning }; }), api, '成語', items.length);
          })
        ];
      }
    }
  };
  // 聽聽看（加練・綜合測驗）：先聽一句話（等級 2、3 只聽不看），再回答問題；提示＝顯示剛剛聽到的句子
  MODULES.listening = {
    name: '聽聽看', icon: '👂', desc: '聽一句話、回答問題（綜合測驗）', core: false,
    units: function (L) { return L.listening ? [{ key: 'listening', items: L.listening }] : []; },
    steps: function (L, unit, c) {
      var n = { 1: 5, 2: 8 }[c.level] || unit.items.length;
      return [step('聽聽看：先聽一句話，再選出正確的答案。', 'quiz', function (stage, api) {
        runQuiz(stage, shuffle(unit.items).slice(0, n).map(function (it) {
          return {
            say: it.listen + '。' + it.q, long: true, options: it.options,
            // 提示：先說這題的重點（語詞或句型），再給剛剛聽到的句子
            hint: (it.focus ? '這題的重點是「' + it.focus + '」。' : '') + '剛剛說的是：「' + it.listen + '」', after: it.listen,
            prompt: function () {
              var b = h('button', { class: 'listen-btn', type: 'button', 'aria-label': '先聽一聽', 'data-say': it.listen }, '🔊');
              b.addEventListener('click', function () { speak(it.listen, b); });
              return h('div', {}, b, h('div', { class: 'sub' }, '先聽一聽'),
                c.level === 1 ? h('div', { class: 'sentence', style: 'margin-top:8px' }, it.listen) : null,
                h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, h('div', { class: 'sentence' }, it.q), sayBtn(it.q)));
            }
          };
        }), api);
      })];
    }
  };
  // 修辭小偵探：認識修辭（例句上色）→ 判斷是不是 → 找出比成什麼
  MODULES.rhetoric = {
    name: '修辭小偵探', icon: '🕵️', desc: '認識修辭、找出句子裡的修辭', core: false,
    units: function (L) { return (L.rhetoric || []).map(function (r) { return { key: r.id, items: [r], label: r.name }; }); },
    steps: function (L, unit, c) {
      var r = unit.items[0], nJ = { 1: 4, 2: 6 }[c.level] || (r.judge || []).length, nA = { 1: 3, 2: 4 }[c.level] || r.ask.length;
      // 把例句裡的詞上色：第一個藍色、第二個紅色；線索字（例如譬喻的「像、如」）加底線
      var clues = r.clueWords || ['好像', '彷彿', '像', '如', '般', '是'];
      var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
      var colorHl = function (s, hl) {
        var keys = (hl || []).concat(clues);
        if (!keys.length) return s;
        var re = new RegExp('(' + keys.map(esc).join('|') + ')');
        return s.split(re).filter(Boolean).map(function (p) {
          var k = (hl || []).indexOf(p);
          return k >= 0 ? h('span', { class: k ? 'conn-a' : 'conn-b' }, p) : clues.indexOf(p) >= 0 ? h('u', { class: 'rh-clue' }, p) : p;
        });
      };
      var list = [
        step('認識修辭：看看什麼是「' + r.name + '」。', 'intro', function (stage, api) {
          var card = h('div', { class: 'card pattern-card' },
            h('span', { class: 'kind' }, '修辭'),
            h('div', { class: 'pat' }, r.name),
            h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'explain' }, r.explain), sayBtn(r.explain)),
            h('div', { class: 'row', style: 'justify-content:center' }, h('div', { class: 'explain' }, '🔎 ' + r.clue), sayBtn(r.clue)),
            r.examples.map(function (e) {
              return h('div', { class: 'model', style: 'flex-direction:column;gap:4px' },
                h('div', { class: 'row', style: 'justify-content:center' }, h('span', {}, colorHl(e.s, e.hl)), sayBtn(e.s)),
                h('div', { class: 'muted', style: 'font-family:var(--font);font-size:18px' }, (r.id === 'metaphor' && e.hl[1] ? e.hl[0] + ' → ' + e.hl[1] + '：' : '') + e.note));
            }));
          append(stage, card, h('div', { style: 'margin-top:16px' }, nextBtn('我知道了，開始當偵探 →', api.next)));
        })
      ];
      if (r.judge && r.judge.length) list.push(step('偵探任務一：這句話有沒有用「' + r.name + '」？', 'quiz', function (stage, api) {
          runQuiz(stage, shuffle(r.judge).slice(0, nJ).map(function (j) {
            return {
              say: j.s, long: true, options: j.yes ? ['有，是' + r.name, '沒有'] : ['沒有', '有，是' + r.name],
              fixed: ['有，是' + r.name, '沒有'],
              hint: r.judgeHint, after: j.s,
              prompt: function () { return h('div', { class: 'sentence' }, j.s); }
            };
          }), api);
        }));
      list.push(step(r.askTitle || '偵探任務二：找一找，這句話把什麼比成什麼？', 'quiz', function (stage, api) {
        runQuiz(stage, shuffle(r.ask).slice(0, nA).map(function (a) {
          return {
            say: a.s + a.q, options: a.options, hint: r.askHint, after: a.s,
            kai: a.options.every(function (o) { return o.length <= 5; }),
            long: a.options.some(function (o) { return o.length > 5; }),
            prompt: function () { return h('div', {}, h('div', { class: 'sentence' }, colorHl(a.s)), h('div', { class: 'sub' }, a.q)); }
          };
        }), api);
      }));
      return list;
    }
  };
  // 注音聽打：聽語詞，用畫面上的注音鍵盤（標準大千式排列）打出每個字的注音、按聲調，再從同音字裡選出正確的字。
  // 只能用點的（不接實體鍵盤），避免系統輸入法自動選字。題目是 LESSON_LINKS 的 quizWords，
  // 正確注音在 data/quiz_zy.js，選字用的同音字表在 data/zy_cands.js（都由 tools/make_quiz_zy.py 產生）
  var LINKS = window.LESSON_LINKS || {}, QUIZ_ZY = window.QUIZ_ZY || {}, ZY_CANDS = window.ZY_CANDS || {};
  var ZY_ROWS = ['ㄅㄉˇˋㄓˊ˙ㄚㄞㄢㄦ', 'ㄆㄊㄍㄐㄔㄗㄧㄛㄟㄣ', 'ㄇㄋㄎㄑㄕㄘㄨㄜㄠㄤ', 'ㄈㄌㄏㄒㄖㄙㄩㄝㄡㄥ'];
  var ZY_INI = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ', ZY_MED = 'ㄧㄨㄩ', ZY_TONE = 'ˉˊˇˋ˙';
  var ZY_TONE_NAME = { 'ˉ': '一聲', 'ˊ': '二聲', 'ˇ': '三聲', 'ˋ': '四聲', '˙': '輕聲' };
  var CAND_N = { 1: 3, 2: 5, 3: 8 };  // 選字時列出幾個同音字
  function zyNorm(z) { return z.indexOf('˙') >= 0 ? '˙' + z.replace('˙', '') : z; }
  function runZhuyin(stage, items, api, lid) {
    if (CAPTURE) return;
    var c = api.cfg, i = 0;
    function show() {
      stopSpeak(); stage.innerHTML = '';
      var it = items[i], ans = it.zy.split(' ').map(zyNorm), chars = Array.from(it.w);
      var slots = ans.map(function () { return { s: '', tone: null, ch: null }; }), cur = 0, wrong = 0, hinted = false, solved = false;
      var picBox = h('div', { class: 'zg-pic' }), hintSlot = h('div'), fb = h('div', { class: 'feedback' });
      // 圖片：有圖才顯示（沒圖不佔位置）；等級 1、2 一開始就顯示，等級 3 要按提示
      var picShown = false, hasPic = false, img = new Image();
      img.alt = '「' + it.w + '」的圖';
      img.onload = function () { hasPic = true; picBox.appendChild(img); if (picShown || c.level < 3) { picShown = true; picBox.classList.add('on'); } };
      img.src = 'images/lesson' + lid + '/' + encodeURIComponent(it.w) + '.webp';
      function showPic() {
        if (picShown || !hasPic) return false;
        picShown = true; picBox.classList.add('on');
        return true;
      }
      function slotZy(sl) { return (sl.tone === '˙' ? '˙' : '') + sl.s + (sl.tone && sl.tone !== 'ˉ' && sl.tone !== '˙' ? sl.tone : ''); }
      function picking() { var sl = slots[cur]; return !solved && sl.tone && !sl.ch; }
      // 這個讀音的同音字：依常用程度取前幾個；注音打對時，正確的字一定在裡面
      function cands(k) {
        var z = slotZy(slots[k]), all = Array.from(ZY_CANDS[z] || ''), n = CAND_N[c.level] || 5, list = all.slice(0, n);
        if (z === ans[k] && list.indexOf(chars[k]) < 0) list[Math.min(n, all.length) - 1] = chars[k];
        return list;
      }
      var slotBox = h('div', { class: 'zg-slots' }), candBox = h('div', { class: 'zg-cands' });
      function draw() {
        slotBox.innerHTML = '';
        slots.forEach(function (sl, k) {
          var han = sl.ch ? h('span', { class: 'zg-han got' }, sl.ch) : h('span', { class: 'zg-han' }, c.level === 1 ? chars[k] : '？');
          var b = h('button', { type: 'button', class: 'zg-slot' + (k === cur && !solved ? ' cur' : '') + (sl.bad ? ' bad' : '') + (sl.ok ? ' ok' : ''), 'aria-label': '第 ' + (k + 1) + ' 個字' },
            han, h('span', { class: 'zg-zy' }, slotZy(sl) ? zyColumn(slotZy(sl)) : ''));
          b.addEventListener('click', function () { if (!solved) { cur = k; if (slots[k].tone) slots[k].ch = null; draw(); } });
          slotBox.appendChild(b);
        });
        candBox.innerHTML = '';
        if (!picking()) { candBox.classList.remove('on'); return; }
        candBox.classList.add('on');
        var list = cands(cur);
        if (!list.length) {
          append(candBox, h('div', { class: 'zg-none' }, '找不到念「' + slotZy(slots[cur]) + '」的字，檢查一下注音，按 ⌫ 改改看。'));
          return;
        }
        append(candBox, h('div', { class: 'zg-cands-t' }, '選字：'));
        list.forEach(function (ch) {
          var b = h('button', { type: 'button', class: 'zg-cand' + (slots[cur].showAns && ch === chars[cur] ? ' reveal' : '') }, ch);
          b.addEventListener('click', function () { choose(ch); });
          candBox.appendChild(b);
        });
      }
      // 下一個要做的字：注音或選字還沒完成的，或上次對答案錯的
      function nextTodo() {
        for (var k = 0; k < slots.length; k++) { var j = (cur + 1 + k) % slots.length, sl = slots[j]; if (!sl.tone || !sl.ch || sl.bad) return j; }
        return -1;
      }
      function choose(ch) {
        sfx.tap();
        var sl = slots[cur];
        sl.ch = ch; sl.bad = false; sl.showAns = false;
        var nx = nextTodo();
        if (nx < 0) { draw(); check(); return; }  // 全部完成就自動對答案
        cur = nx;
        draw();
      }
      function press(key) {
        if (solved) return;
        var sl = slots[cur];
        if (key === '⌫') {
          sfx.tap(); sl.bad = false;
          if (sl.ch) sl.ch = null;
          else if (sl.tone) sl.tone = null;
          else if (sl.s) sl.s = sl.s.slice(0, -1);
          else if (cur > 0) { cur--; slots[cur].ch = null; slots[cur].bad = false; }
        } else if (ZY_TONE.indexOf(key) >= 0) {
          if (!sl.s) return;
          sfx.tap(); sl.tone = key; sl.ch = null; sl.bad = false;  // 按完聲調就出現同音字讓你選
        } else {
          if (picking()) return;  // 先選字，才能打下一個字
          if (sl.tone) {  // 這個字已經完成：跳到下一個還沒打的字
            var n2 = nextTodo();
            if (n2 < 0 || slots[n2].s) return;
            cur = n2; sl = slots[cur];
          }
          if (sl.s.length >= 3) return;
          sfx.tap(); sl.bad = false; sl.s += key;
        }
        draw();
      }
      function check() {
        var bad = 0;
        slots.forEach(function (sl, k) { sl.bad = slotZy(sl) !== ans[k] || sl.ch !== chars[k]; if (sl.bad) bad++; });
        if (!bad) {
          solved = true; slots.forEach(function (sl) { sl.ok = true; });
          draw(); sfx.right(); api.record(wrong === 0 && !hinted);
          append(fb, h('div', { class: 'praise' }, pick(PRAISE)));
          speak(it.w);
          append(fb, nextBtn(i < items.length - 1 ? '下一題 →' : '完成 →', function () { i++; if (i < items.length) show(); else api.next(); }));
          return;
        }
        wrong++; sfx.wrong();
        // 注音對、只是字選錯：直接重新選字
        slots.forEach(function (sl, k) { if (sl.bad && slotZy(sl) === ans[k]) sl.ch = null; });
        cur = slots.findIndex(function (sl) { return sl.bad; });
        draw();
        hintSlot.innerHTML = '';
        if (wrong >= c.wrongLimit) {
          // 標出正確答案，照著再做一次
          append(hintSlot, h('div', { class: 'hintbox' }, '💡', h('span', { style: 'flex:1' }, '正確答案：', h('span', { class: 'zg-ans' }, withZy(it.w, it.zy, true)), '　紅色的字，照著再做一次。')));
          showPic();
        } else {
          append(hintSlot, h('div', { class: 'hintbox' }, '💡', h('span', { style: 'flex:1' }, '紅色的字不對（注音或選的字），再聽一次、改改看。')));
          speak(it.w);
        }
      }
      // 提示：先顯示圖片（有圖的話）；再來每按一次補上目前這個字的下一個符號、聲調；注音對了就標出要選的字
      function hint() {
        if (solved) return;
        hinted = true;
        speak(it.w);
        if (showPic()) return;
        var sl = slots[cur], a = ans[cur], body = a.replace('˙', '').replace(/[ˊˇˋ]$/, '');
        if (sl.tone && slotZy(sl) === a) { if (sl.ch !== chars[cur]) { sl.ch = null; sl.showAns = true; } draw(); return; }
        if (sl.tone || sl.s !== body.slice(0, sl.s.length)) { sl.s = ''; sl.tone = null; sl.ch = null; }
        if (sl.s.length < body.length) sl.s = body.slice(0, sl.s.length + 1);
        else { sl.tone = a.indexOf('˙') >= 0 ? '˙' : (/[ˊˇˋ]$/.test(a) ? a.slice(-1) : 'ˉ'); sl.showAns = true; }
        draw();
      }
      // 鍵盤：標準注音鍵盤（大千式）的排列，空白鍵是一聲
      function key(k) {
        var kind = ZY_TONE.indexOf(k) >= 0 ? 'tone' : ZY_INI.indexOf(k) >= 0 ? 'ini' : ZY_MED.indexOf(k) >= 0 ? 'med' : 'fin';
        var b = h('button', { type: 'button', class: 'zg-key ' + kind, 'aria-label': ZY_TONE_NAME[k] || k },
          kind === 'tone' ? [h('span', { class: 'zg-tmark' }, k), h('small', {}, ZY_TONE_NAME[k])] : k);
        b.addEventListener('click', function () { press(k); });
        return b;
      }
      var kb = h('div', { class: 'zg-kb' });
      ZY_ROWS.forEach(function (row, r) {
        var line = h('div', { class: 'zg-row r' + r });
        Array.from(row).forEach(function (k) { line.appendChild(key(k)); });
        if (r === 0) {
          var del = h('button', { type: 'button', class: 'zg-key del', 'aria-label': '刪除' }, '⌫');
          del.addEventListener('click', function () { press('⌫'); });
          line.appendChild(del);
        }
        kb.appendChild(line);
      });
      var space = h('button', { type: 'button', class: 'zg-key tone space', 'aria-label': '一聲（空白鍵）' }, h('small', {}, '一聲（空白鍵）'));
      space.addEventListener('click', function () { press('ˉ'); });
      kb.appendChild(h('div', { class: 'zg-row' }, space));

      var play = h('button', { class: 'btn btn-primary zg-play', type: 'button' }, '🔊 聽語詞');
      play.addEventListener('click', function () { speak(it.w, play); });
      var tools = h('div', { class: 'tools' });
      if (c.hint) {
        var hb = h('button', { class: 'btn btn-ghost', type: 'button' }, '💡 提示');
        hb.addEventListener('click', hint);
        tools.appendChild(hb);
      }
      append(stage, qbar(i, items.length), h('div', { class: 'zg-top' }, picBox, h('div', { class: 'zg-main' }, play, slotBox)),
        candBox, hintSlot, kb, tools, fb);
      draw();
      setTimeout(function () { speak(it.w, play); }, 300);
    }
    show();
  }
  MODULES.zhuyinGame = {
    name: '注音聽打', icon: '🎧', desc: '聽語詞，用注音鍵盤打出來', core: false,
    units: function (L, c) {
      var k = LINKS[L.id];
      if (!k || !k.quizWords) return [];
      var items = k.quizWords.filter(function (w) { return QUIZ_ZY[w]; }).map(function (w) { return { w: w, zy: QUIZ_ZY[w] }; });
      return mkUnits(items, c.group + 2);
    },
    steps: function (L, unit) {
      return [step('注音聽打：聽語詞，用下面的注音鍵盤打出每個字的注音、按聲調，再選出正確的字。', 'quiz', function (stage, api) {
        runZhuyin(stage, shuffle(unit.items), api, L.id);
      })];
    }
  };
  var MODULE_ORDER = ['chars', 'words', 'phrases', 'sentences', 'reading', 'lookalikes', 'idioms', 'rhetoric', 'zhuyinGame', 'listening'];

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
    append(app, h('header', { class: 'topbar' }, h('a', { class: 'brand', href: '#/' }, '📚 ' + SITE_NAME), nav, gearBtn()), main,
      h('footer', { class: 'footer' }, h('a', { href: 'guide.html' }, '📘 使用說明'), '　', h('a', { href: '../' }, '🏫 資源班教材總覽'), h('br'), '特殊教育輔助教材，非出版社官方產品。', h('br'), '內容依康軒版國語五上整理改寫，僅供教學使用，不作商業用途。', h('br'), '楷書字型：全字庫正楷體（數位發展部，CNS11643 中文標準交換碼全字庫網站 https://www.cns11643.gov.tw，政府資料開放授權條款－第1版）'));
    window.scrollTo(0, 0);
    return main;
  }

  function renderHome() {
    var main = shell([{ text: '首頁' }]);
    append(main, h('div', { class: 'hero' },
      h('div', { class: 'row' }, h('h1', {}, '國語五上學習樂園'), sayBtn('國語五上學習樂園。選一課開始學習。')),
      h('p', {}, '康軒版・五年級上學期　選一課開始學習。　', h('a', { href: 'guide.html' }, '📘 使用說明'))));
    var dueAll = dueMistakes().length;
    if (dueAll) append(main, h('a', { class: 'review-banner', href: '#/review' }, '🔁 今天有 ' + dueAll + ' 題錯題要複習', h('span', { class: 'spacer' }), '開始複習 →'));
    var grid = h('div', { class: 'lesson-grid' });
    LESSON_LIST.forEach(function (l, n) {
      var L = LESSONS[l.id], no = '第 ' + (n + 1) + ' 課';
      if (!L) {
        var hasRead = hasReading(l.id);
        append(grid, h('div', { class: 'lesson-tile off' }, h('span', { class: 'no' }, no), h('span', { class: 't' }, l.title),
          h('span', { class: 'meta' }, '練習準備中', hasRead ? h('span', { class: 'spacer' }) : null,
            hasRead ? h('a', { class: 'btn btn-read btn-sm', href: '#/read/' + l.id }, '📖 課文點讀') : null,
            hasRead ? h('a', { class: 'btn btn-score btn-sm', href: '#/score/' + l.id }, '🎙️ 朗讀挑戰') : null)));
        return;
      }
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
    append(main, h('div', { class: 'section-label' }, '🎯 本課先完成'));
    var cs = h('div', { class: 'stations' });
    core.forEach(function (mid, i) {
      var locked = c.sequential && i > 0 && !st[core[i - 1]].complete;
      append(cs, station(mid, locked));
    });
    append(main, cs);
    append(main, h('div', { class: 'section-label' }, '🌟 加練挑戰'));
    var ex = h('div', { class: 'stations' });
    MODULE_ORDER.filter(function (m) { return !MODULES[m].core; }).forEach(function (mid) { append(ex, station(mid, false)); });
    append(main, ex);

    // 複習與小考
    var dueN = dueMistakes(lid).length, allN = mistakes().filter(function (m) { return m.lid === lid; }).length;
    var tests = (state.progress[lid] && state.progress[lid].tests) || [], lastT = tests[tests.length - 1];
    var revGo = h('button', { class: 'btn go', type: 'button' }, dueN ? '開始複習 →' : '看看錯題');
    revGo.addEventListener('click', function () { location.hash = '#/review/' + lid; });
    var testGo = h('button', { class: 'btn go', type: 'button' }, lastT ? '再考一次 →' : '開始考試 →');
    testGo.addEventListener('click', function () { location.hash = '#/test/' + lid; });
    append(main, h('div', { class: 'section-label' }, '🔁 複習與小考'),
      h('div', { class: 'stations' },
        h('div', { class: 'station', style: '--mc:var(--c-review)' },
          dueN ? h('span', { class: 'badge-next' }, dueN + ' 題要複習') : null,
          h('div', { class: 'row' }, h('div', { class: 'icon' }, '🔁'), h('h3', { style: 'flex:1' }, '錯題複習'), sayBtn('錯題複習，把答錯的題目再做一次')),
          h('div', { class: 'desc' }, '答錯的題目會自動放到這裡，隔幾天再複習一次'),
          h('div', { class: 'status' }, allN ? '練習中 ' + allN + ' 題' + (dueN ? '・今天要複習 ' + dueN + ' 題' : '・今天都複習完了') : '目前沒有錯題'),
          revGo),
        h('div', { class: 'station', style: '--mc:var(--c-test)' },
          h('div', { class: 'row' }, h('div', { class: 'icon' }, '📝'), h('h3', { style: 'flex:1' }, '單課小考'), sayBtn('單課小考，從各站抽題考一次')),
          h('div', { class: 'desc' }, '從各站抽題混在一起考，像定期評量'),
          h('div', { class: 'status' }, lastT ? '上次 ' + lastT.d + '：' + lastT.score + ' 分' : '還沒考過'),
          testGo)));

    var strokeUrl = 'https://gsyan888.github.io/html5_fun/html5_stroke_parts/html5_stroke_parts.html?by=gsyan&words=' + encodeURIComponent(L.chars.map(function (x) { return x.c; }).join(''));
    var LK = (window.LESSON_LINKS || {})[lid] || {};
    var hasR = hasReading(lid), lock = READINGS[lid] ? '' : '🔒 ';
    if ((LK.reads && LK.reads.length) || LK.score || hasR) {
      append(main, h('div', { class: 'section-label' }, '📖 課文朗讀'),
        h('div', { class: 'extra-links read-links' },
          hasR ? h('a', { class: 'btn btn-read', href: '#/read/' + lid }, lock + '📖 課文點讀') : null,
          (hasR ? [] : LK.reads || []).map(function (r) { return h('a', { class: 'btn btn-read', href: r.url, target: '_blank', rel: 'noopener' }, r.text); }),
          // 朗讀挑戰改用網站內建的語音辨識評分（原本的 Gemini 版本不穩定）
          hasR ? h('a', { class: 'btn btn-score', href: '#/score/' + lid }, lock + '🎙️ 朗讀挑戰（評分）')
            : LK.score ? h('a', { class: 'btn btn-score', href: LK.score.url, target: '_blank', rel: 'noopener' }, LK.score.text) : null));
    }
    append(main, h('div', { class: 'section-label' }, '🔗 延伸資源（會開新視窗）'),
      h('div', { class: 'extra-links' },
        h('a', { class: 'btn btn-ghost', href: strokeUrl, target: '_blank', rel: 'noopener' }, '🎨 雄筆順・部件上色'),
        L.pediaId ? h('a', { class: 'btn btn-ghost', href: PEDIA + '/Bookmark/TCollection?TextNameId=' + L.pediaId, target: '_blank', rel: 'noopener' }, '📖 教育百科・本課生字詞') : null,
        // 雄::gsyan 語文高手：id＝學期-版本(1＝康軒)-年級-課次-遊戲
        h('a', { class: 'btn btn-ghost', href: 'https://gsyan888.blogspot.com/2026/01/html5-fun-confusable.html?id=1151-1-5-' + L.no + '-basketball', target: '_blank', rel: 'noopener' }, '🏀 字音字形語文高手（形近字遊戲）'),
        h('a', { class: 'btn btn-ghost', href: 'https://sites.google.com/view/sentencematch/%E5%BA%B7%E8%BB%92', target: '_blank', rel: 'noopener' }, '🧠 詞語理解練習（康軒）'),
        h('a', { class: 'btn btn-ghost', href: 'https://sites.google.com/view/samesentence/%E5%BA%B7%E8%BB%92', target: '_blank', rel: 'noopener' }, '✍️ 照樣造句線上練習（康軒 5A）')));
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
      result: function (it, indep, el) { if (!indep) addMistake(lid, mid, it, el); },
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

  // ════════════════════════════════════════════════
  //  錯題複習（間隔重複）：答錯或用了提示的選擇題存成「快照」，
  //  隔一段時間再出現：答對一次就隔久一點（今天 → 1 天 → 3 天 → 7 天），連續答對 4 次就學會了；答錯回到今天。
  //  只存在這台 iPad。
  // ════════════════════════════════════════════════
  var BOX_DAYS = [0, 1, 3, 7];
  var DAY = 86400000;
  function mistakes() { state.mistakes = state.mistakes || []; return state.mistakes; }
  function snapText(el) { return el ? el.textContent.replace(/[🔊\s]/g, '') : ''; }
  function addMistake(lid, mid, it, el) {
    if (!it || !it.options) return;
    var id = [lid, mid, it.options[0], it.say || '', snapText(el).slice(0, 60)].join('|');
    var list = mistakes(), m = list.find(function (x) { return x.id === id; });
    if (m) { m.box = 0; m.due = Date.now(); m.n++; m.last = today(); save(); return; }
    list.push({
      id: id, lid: lid, mid: mid, box: 0, due: Date.now(), n: 1, first: today(), last: today(),
      snap: { html: el ? el.innerHTML : '', say: it.say || '', options: it.options.slice(0, 8), fixed: it.fixed || null, zyOf: it.zyOf || null, kai: !!it.kai, long: !!it.long, hint: it.hint || '', after: it.after || '' }
    });
    if (list.length > 300) list.splice(0, list.length - 300);
    save();
  }
  function dueMistakes(lid) {
    var now = Date.now();
    return mistakes().filter(function (m) { return (!lid || m.lid === lid) && m.due <= now; });
  }
  // 快照還原成題目：🔊 按鈕依 data-say 重新接上朗讀
  function itemFromSnap(m) {
    var s = m.snap;
    return {
      _mk: m.id, say: s.say, options: s.options, fixed: s.fixed, zyOf: s.zyOf, kai: s.kai, long: s.long, hint: s.hint, after: s.after,
      prompt: function () {
        var d = h('div'); d.innerHTML = s.html;
        d.querySelectorAll('[data-say]').forEach(function (b) {
          b.classList.remove('speaking');
          b.addEventListener('click', function (e) { e.stopPropagation(); speak(b.getAttribute('data-say'), b); });
        });
        return d;
      }
    };
  }
  function renderReview(lid) {
    var c = cfg(), crumbs = [{ text: '首頁', href: '#/' }];
    if (lid) crumbs.push({ text: '第 ' + parseInt(lid, 10) + ' 課', href: '#/lesson/' + lid });
    crumbs.push({ text: '錯題複習' });
    var main = shell(crumbs, 'var(--c-review)');
    var due = shuffle(dueMistakes(lid)), all = mistakes().filter(function (m) { return !lid || m.lid === lid; });
    append(main, h('div', { class: 'task-head' }, h('div', { class: 'task-title' }, h('span', { class: 'icon' }, '🔁'),
      h('h2', { style: 'flex:1' }, '錯題複習' + (lid ? '・第 ' + parseInt(lid, 10) + ' 課' : '')), sayBtn('錯題複習。把之前答錯的題目再做一次。'))));
    if (!due.length) {
      var next = all.reduce(function (t, m) { return Math.min(t, m.due); }, Infinity);
      append(main, h('div', { class: 'card', style: 'text-align:center' }, h('div', { style: 'font-size:56px' }, '🎉'),
        h('h2', {}, all.length ? '今天的錯題都複習完了！' : '目前沒有錯題'),
        h('p', { class: 'muted' }, all.length ? '還有 ' + all.length + ' 題在練習中，' + (isFinite(next) ? Math.max(1, Math.ceil((next - Date.now()) / DAY)) + ' 天後會再出現。' : '') : '做練習時答錯的題目，會自動放到這裡。'),
        h('div', { class: 'tools' }, btnTo(lid ? '🏠 回到本課' : '🏠 回首頁', 'btn-primary', function () { location.hash = lid ? '#/lesson/' + lid : '#/'; }))));
      return;
    }
    var batch = due.slice(0, Math.max(5, c.group + 2));
    var stage = h('div', { class: 'stage' }), stats = { total: 0, indep: 0 }, learned = 0;
    append(main, h('div', { class: 'now' }, h('div', { style: 'flex:1' }, h('div', { class: 'lbl' }, '☑ 現在要做什麼'),
      h('div', { class: 'txt' }, '把之前答錯的題目再做一次（這次 ' + batch.length + ' 題，還有 ' + (due.length - batch.length) + ' 題）。'))), stage);
    runQuiz(stage, batch.map(itemFromSnap), {
      cfg: c,
      record: function (indep) { stats.total++; if (indep) stats.indep++; },
      result: function (it, indep) {
        var list = mistakes(), k = list.findIndex(function (x) { return x.id === it._mk; });
        if (k < 0) return;
        var m = list[k];
        if (indep) {
          m.box++;
          if (m.box >= BOX_DAYS.length) { list.splice(k, 1); learned++; }
          else m.due = Date.now() + BOX_DAYS[m.box] * DAY - 3600000;   // 提早一小時，隔天上課就會出現
        } else { m.box = 0; m.due = Date.now(); m.n++; }
        m.last = today(); save();
      },
      next: function () {
        var stars = stats.total && stats.indep / stats.total >= 0.9 ? 3 : stats.indep / stats.total >= 0.6 ? 2 : 1;
        celebrate(stars, stats, function (overlay) {
          var acts = h('div', { class: 'acts' });
          if (learned) append(acts, h('p', { class: 'muted', style: 'margin:0' }, '🏅 有 ' + learned + ' 題已經學會了，不會再出現。'));
          if (dueMistakes(lid).length) append(acts, btnTo('🔁 再複習下一批', 'btn-primary', function () { overlay.remove(); renderReview(lid); }));
          append(acts, btnTo(lid ? '🏠 回到本課' : '🏠 回首頁', 'btn-ghost', function () { overlay.remove(); location.hash = lid ? '#/lesson/' + lid : '#/'; }));
          return acts;
        });
      }
    });
  }

  // ════════════════════════════════════════════════
  //  單課小考：從各站的選擇題各抽幾題，混在一起考（像定期評量）。
  //  沒有提示按鈕、答錯一次就標出正確答案；考完看分數和各站答對率，答錯的題目自動放進錯題複習。
  // ════════════════════════════════════════════════
  function collectQuiz(L, c) {
    var bank = {};
    MODULE_ORDER.forEach(function (mid) {
      var M = MODULES[mid], got = [];
      CAPTURE = got;
      try {
        M.units(L, c).forEach(function (u) {
          M.steps(L, u, c).forEach(function (st) { if (st.kind === 'quiz') st.run(h('div'), { cfg: c, record: function () { }, next: function () { } }); });
        });
      } catch (e) { /* 這一站收題失敗就略過 */ }
      CAPTURE = null;
      // 同一題（答案＋題目朗讀）只留一個
      var seen = {};
      got = got.filter(function (it) { var k = it.options[0] + '|' + (it.say || ''); if (seen[k]) return false; seen[k] = 1; return true; });
      if (got.length) bank[mid] = got.map(function (it) { it._mid = mid; return it; });
    });
    return bank;
  }
  function renderTest(lid) {
    var L = LESSONS[lid], base = cfg();
    var c = Object.assign({}, base, { hint: false, wrongLimit: 1 });   // 考試：沒有提示，答錯一次就標出答案
    var main = shell([{ text: '首頁', href: '#/' }, { text: '第 ' + L.no + ' 課', href: '#/lesson/' + lid }, { text: '單課小考' }], 'var(--c-test)');
    var bank = collectQuiz(L, c), mids = Object.keys(bank);
    var target = { 1: 8, 2: 12, 3: 15 }[c.level] || 12;
    // 各站輪流抽，盡量每站都有
    var pools = {}; mids.forEach(function (m) { pools[m] = shuffle(bank[m]); });
    var picked = [];
    while (picked.length < target && mids.some(function (m) { return pools[m].length; })) {
      shuffle(mids).forEach(function (m) { if (picked.length < target && pools[m].length) picked.push(pools[m].pop()); });
    }
    var intro = h('div', { class: 'card', style: 'text-align:center' },
      h('div', { style: 'font-size:56px' }, '📝'),
      h('div', { class: 'row', style: 'justify-content:center' }, h('h2', {}, '第 ' + L.no + ' 課 單課小考'), sayBtn('單課小考。一共' + picked.length + '題。這次沒有提示，答錯的話會告訴你正確答案。')),
      h('p', { class: 'muted' }, '一共 ' + picked.length + ' 題，題目從各個練習站抽出來。', h('br'), '這次沒有提示；答錯會標出正確答案，考完會放進錯題複習。'));
    append(main, intro, h('div', { style: 'margin-top:16px' }, nextBtn('開始考試 →', start)));
    function start() {
      main.innerHTML = '';
      var stage = h('div', { class: 'stage' }), stats = { total: 0, indep: 0 }, per = {};
      append(main, h('div', { class: 'task-head' }, h('div', { class: 'task-title' }, h('span', { class: 'icon' }, '📝'), h('h2', { style: 'flex:1' }, '第 ' + L.no + ' 課 單課小考'))), stage);
      runQuiz(stage, picked, {
        cfg: c,
        record: function (indep) { stats.total++; if (indep) stats.indep++; },
        result: function (it, indep, el) {
          var p = per[it._mid] = per[it._mid] || { n: 0, ok: 0 }; p.n++; if (indep) p.ok++;
          if (!indep) addMistake(lid, it._mid, it, el);
        },
        next: function () {
          var score = stats.total ? Math.round(stats.indep / stats.total * 100) : 0;
          var pr = state.progress; pr[lid] = pr[lid] || {};
          pr[lid].tests = (pr[lid].tests || []).concat([{ d: today(), score: score, n: stats.total, lv: c.level, per: per }]).slice(-20);
          save();
          var stars = score >= 90 ? 3 : score >= 60 ? 2 : 1;
          celebrate(stars, stats, function (overlay) {
            var acts = h('div', { class: 'acts' });
            var tb = h('tbody');
            mids.filter(function (m) { return per[m]; }).forEach(function (m) {
              append(tb, h('tr', {}, h('td', {}, MODULES[m].icon + ' ' + MODULES[m].name), h('td', {}, per[m].ok + '／' + per[m].n)));
            });
            append(acts, h('div', { class: 'test-score' }, h('b', {}, score + ' 分')),
              h('table', { class: 'records' }, h('thead', {}, h('tr', {}, h('th', {}, '練習站'), h('th', {}, '答對'))), tb));
            if (stats.indep < stats.total) append(acts, btnTo('🔁 馬上複習答錯的題目', 'btn-primary', function () { overlay.remove(); location.hash = '#/review/' + lid; }));
            append(acts, btnTo('🏠 回到本課', 'btn-ghost', function () { overlay.remove(); location.hash = '#/lesson/' + lid; }));
            return acts;
          });
        }
      });
    }
  }

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
      if (ENC) {
        var unlocked = Object.keys(READINGS).length > 0;
        var lockBtn = h('button', { class: 'btn btn-ghost', type: 'button', disabled: !unlocked }, unlocked ? '🔒 鎖上課文（要重新輸入教室密碼）' : '課文目前是鎖上的');
        lockBtn.addEventListener('click', function () { lockReadings(); draw(); toast('已鎖上，下次要輸入教室密碼'); });
        append(body, h('section', {}, h('h3', {}, '教室密碼'),
          h('p', { class: 'muted', style: 'margin:0 0 8px' }, '課文點讀、朗讀挑戰需要教室密碼。這台 iPad 目前' + (unlocked ? '已解鎖。' : '尚未解鎖。')), lockBtn));
      }
      append(body, h('section', {}, h('h3', {}, '學習紀錄'), recordsTable()));
      append(body, h('section', {}, h('h3', {}, '單課小考成績'), testList()));
      append(body, h('section', {}, h('h3', {}, '學生造的句子'), madeList()));
      var reset = h('button', { class: 'btn btn-ghost danger', type: 'button', style: 'margin-top:16px' }, '清除這台 iPad 的學習紀錄');
      reset.addEventListener('click', function () { if (window.confirm('確定要清除全部學習紀錄嗎？（含錯題、小考成績、造的句子）這個動作無法復原。')) { state.progress = {}; state.mistakes = []; save(); draw(); } });
      append(body, reset);
    }
    draw();
  }
  // 老師設定：單課小考的成績（每課最近幾次）與錯題數
  function testList() {
    var tb = h('tbody'), any = false;
    Object.keys(LESSONS).sort().forEach(function (lid) {
      var t = (state.progress[lid] && state.progress[lid].tests) || [];
      var mk = mistakes().filter(function (m) { return m.lid === lid; }).length;
      if (!t.length && !mk) return;
      any = true;
      var weak = '';
      var lastT = t[t.length - 1];
      if (lastT && lastT.per) {
        weak = Object.keys(lastT.per).filter(function (m) { var p = lastT.per[m]; return p.n && p.ok / p.n < 0.6; })
          .map(function (m) { return MODULES[m] ? MODULES[m].name : m; }).join('、');
      }
      append(tb, h('tr', {}, h('td', {}, '第' + parseInt(lid, 10) + '課'),
        h('td', {}, t.slice(-3).map(function (x) { return x.d + ' ' + x.score + '分（等級' + x.lv + '）'; }).join('、') || '—'),
        h('td', {}, weak || '—'), h('td', {}, mk ? mk + ' 題' : '—')));
    });
    if (!any) return h('p', { class: 'muted', style: 'margin:0' }, '還沒有小考或錯題紀錄。');
    return h('div', { style: 'overflow-x:auto' }, h('table', { class: 'records' },
      h('thead', {}, h('tr', {}, h('th', {}, '課次'), h('th', {}, '最近小考'), h('th', {}, '要加強（答對不到 6 成）'), h('th', {}, '錯題練習中'))), tb));
  }
  // 老師設定：學生在「句型練習 → 自己造句」寫的句子（新的在上面）
  function madeList() {
    var rows = [];
    Object.keys(state.progress).sort().forEach(function (lid) {
      (state.progress[lid].made || []).forEach(function (m) { rows.push({ lid: lid, m: m }); });
    });
    if (!rows.length) return h('p', { class: 'muted', style: 'margin:0' }, '還沒有造句紀錄。');
    var tb = h('tbody');
    rows.slice(-40).reverse().forEach(function (r) {
      append(tb, h('tr', {}, h('td', {}, r.m.d), h('td', {}, '第' + parseInt(r.lid, 10) + '課'), h('td', {}, r.m.p),
        h('td', { style: 'font-size:18px' }, r.m.s), h('td', {}, '等級' + r.m.lv + (r.m.t > 1 ? '・試了' + r.m.t + '次' : ''))));
    });
    return h('div', { style: 'overflow-x:auto' }, h('table', { class: 'records' },
      h('thead', {}, h('tr', {}, h('th', {}, '日期'), h('th', {}, '課次'), h('th', {}, '句型'), h('th', {}, '句子'), h('th', {}, ''))), tb),
      h('p', { class: 'muted', style: 'font-size:15px' }, '電腦只檢查句型結構（連接詞、順序、每段有沒有寫），意思是否通順請老師看這裡。'));
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
  // ════════════════════════════════════════════════
  //  課文點讀：讀字／讀詞／讀句，點了就念；也可以念全文
  //  資料由 tools/make_reader.py 產生（注音查教育部辭典，老師校正寫在 tools/texts/fixes.json）
  // ════════════════════════════════════════════════
  var READINGS = window.READINGS || {};

  // ── 教室密碼：課文全文加密存放（data/reading.enc.js），輸入密碼後才在這台裝置解開 ──
  // 解開後的金鑰記在這台裝置（localStorage），之後不用再輸入；老師設定頁可以「鎖上」。
  var ENC = window.READINGS_ENC || null;
  var CLASS_KEY = 'tm-classkey';
  function hasReading(lid) { return !!READINGS[lid] || !!(ENC && ENC.lessons.indexOf(lid) >= 0); }
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function unb64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function cryptoOk() { return !!(window.crypto && window.crypto.subtle); }
  function decryptWith(key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(ENC.iv) }, key, b64(ENC.data)).then(function (buf) {
      var obj = JSON.parse(new TextDecoder().decode(buf));
      Object.keys(obj).forEach(function (k) { READINGS[k] = obj[k]; });
      return key;
    });
  }
  function unlockWithPassword(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(ENC.salt), iterations: ENC.iter, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    }).then(decryptWith).then(function (key) {
      return crypto.subtle.exportKey('raw', key).then(function (raw) {
        try { localStorage.setItem(CLASS_KEY, unb64(raw)); } catch (e) { /* 無法記住：下次再輸入 */ }
      });
    });
  }
  function unlockFromStore() {
    var raw = null;
    try { raw = localStorage.getItem(CLASS_KEY); } catch (e) { raw = null; }
    if (!ENC || !raw || !cryptoOk()) return Promise.resolve(false);
    return crypto.subtle.importKey('raw', b64(raw), { name: 'AES-GCM' }, false, ['decrypt'])
      .then(decryptWith).then(function () { return true; })
      .catch(function () { try { localStorage.removeItem(CLASS_KEY); } catch (e) { } return false; });
  }
  function lockReadings() {
    try { localStorage.removeItem(CLASS_KEY); } catch (e) { }
    if (ENC) Object.keys(READINGS).forEach(function (k) { delete READINGS[k]; });
  }
  function renderUnlock(kind, lid) {
    var no = parseInt(lid, 10);
    var crumbs = [{ text: '首頁', href: '#/' }];
    if (LESSONS[lid]) crumbs.push({ text: '第 ' + no + ' 課', href: '#/lesson/' + lid });
    crumbs.push({ text: kind === 'read' ? '課文點讀' : '朗讀挑戰' });
    var main = shell(crumbs);
    var input = h('input', { type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': '教室密碼' });
    var msg = h('p', { class: 'muted', style: 'min-height:1.6em;margin:0' });
    var go = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, '進入教室 →');
    var busy = false;
    function submit() {
      var pw = input.value.trim();
      if (!pw || busy) return;
      if (!cryptoOk()) { msg.textContent = '這個瀏覽器不支援解鎖，請改用 Safari 或 Chrome 開啟正式網址。'; return; }
      busy = true; go.disabled = true; msg.textContent = '開門中……';
      unlockWithPassword(pw).then(function () { sfx.right(); route(); })
        .catch(function () {
          busy = false; go.disabled = false; input.value = '';
          msg.textContent = '密碼不對，再試一次。'; sfx.wrong();
          input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
        });
    }
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    append(main, h('div', { class: 'card gate', style: 'max-width:520px;margin:20px auto;text-align:center' },
      h('div', { style: 'font-size:56px' }, '🔒'),
      h('div', { class: 'row', style: 'justify-content:center' }, h('h2', {}, '請輸入教室密碼'), sayBtn('請輸入教室密碼，進入課文教室。')),
      h('p', { class: 'muted', style: 'line-height:1.8' }, '課文只給班上同學使用，', h('br'), '輸入一次後，這台 iPad 會記住。'),
      input, msg, go));
    setTimeout(function () { input.focus(); }, 50);
  }

  function renderReader(lid) {
    var R = READINGS[lid], info = LESSON_LIST.find(function (l) { return l.id === lid; }) || {};
    var no = parseInt(lid, 10);
    var crumbs = [{ text: '首頁', href: '#/' }];
    if (LESSONS[lid]) crumbs.push({ text: '第 ' + no + ' 課', href: '#/lesson/' + lid });
    crumbs.push({ text: '課文點讀' });
    var main = shell(crumbs, 'var(--c-reading)');
    var mode = 'word', playing = false, cur = [];
    var units = { char: [], word: [], sent: [] };   // 每個模式的點讀單位：{ els:[], text }
    var SENT_END = /[，。？！；：]/;

    function clearHl() { cur.forEach(function (e) { e.classList.remove('hl-read'); }); cur = []; }
    function play(u) {
      clearHl(); u.els.forEach(function (e) { e.classList.add('hl-read'); }); cur = u.els;
      return new Promise(function (res) {
        if (!synth) return res();
        synth.cancel();
        var t = new SpeechSynthesisUtterance(u.say || u.text);
        t.lang = 'zh-TW'; if (zhVoice) t.voice = zhVoice; t.rate = cfg().rate;
        t.onend = t.onerror = function () { res(); };
        synth.speak(t);
      });
    }
    function unitOf(el) { var list = units[mode]; for (var i = 0; i < list.length; i++) if (list[i].els.indexOf(el) >= 0) return list[i]; return null; }

    var text = h('div', { class: 'reader-text' });
    R.sections.forEach(function (sec) {
      if (sec.h) append(text, h('h3', { class: 'reader-h' }, sec.h));
      sec.paras.forEach(function (para) {
        var p = h('p', { class: 'reader-p' }), sent = { els: [], text: '', say: '' };
        // 換行規則：句號、逗號、下引號黏在前一個字後面；上引號黏在下一個字前面
        var lastWrap = null, pendingOpen = null;
        var place = function (el, c) {
          if (/[，。、；：？！」』）…─—]/.test(c) && lastWrap) { lastWrap.appendChild(el); return; }
          if (/[「『（]/.test(c)) { pendingOpen = pendingOpen || h('span', { class: 'nw-grp' }); pendingOpen.appendChild(el); return; }
          var w = pendingOpen || h('span', { class: 'nw-grp' }); pendingOpen = null;
          w.appendChild(el); p.appendChild(w); lastWrap = w;
        };
        para.forEach(function (tok) {
          // tok = [文字, 注音, 朗讀用字（可省略，例如連接詞「和」念ㄏㄢˋ時用「汗」）]
          var w = tok[0], zs = tok[1] ? tok[1].split(' ') : [], word = { els: [], text: w, say: tok[2] };
          Array.from(w).forEach(function (c, i) {
            var el = zs[i] ? h('span', { class: 'rc' }, withZy(c, zs[i])) : h('span', { class: 'rc punct' }, c);
            var sc = tok[2] && tok[2].length === w.length ? tok[2][i] : c;
            if (zs[i]) { units.char.push({ els: [el], text: c, say: sc }); word.els.push(el); }
            // 句尾後面的下引號，歸到上一句
            if (/[」』）]/.test(c) && !sent.els.length && units.sent.length) { var last = units.sent[units.sent.length - 1]; last.els.push(el); last.text += c; last.say += c; }
            else { sent.els.push(el); sent.text += c; sent.say += sc; }
            el.addEventListener('click', function () { if (playing) return; var u = unitOf(el); if (u) play(u); });
            place(el, c);
            if (SENT_END.test(c) && sent.text.replace(/[「」『』（）\s]/g, '').length > 1) { units.sent.push(sent); sent = { els: [], text: '', say: '' }; }
          });
          if (word.els.length) units.word.push(word);
        });
        if (sent.els.length) units.sent.push(sent);
        if (pendingOpen) p.appendChild(pendingOpen);
        append(text, p);
      });
    });

    var modeBox = h('div', { class: 'seg reader-modes' });
    [['char', '讀字'], ['word', '讀詞'], ['sent', '讀句']].forEach(function (m) {
      var b = h('button', { type: 'button', class: m[0] === mode ? 'on' : '' }, m[1]);
      b.addEventListener('click', function () { mode = m[0]; clearHl(); [].forEach.call(modeBox.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
      append(modeBox, b);
    });
    var allBtn = h('button', { class: 'btn btn-primary', type: 'button' }, '🔊 念全文');
    allBtn.addEventListener('click', function () {
      if (playing) { playing = false; stopSpeak(); clearHl(); allBtn.textContent = '🔊 念全文'; return; }
      playing = true; allBtn.textContent = '⏹ 停止';
      var i = 0;
      (function next() {
        if (!playing || i >= units.sent.length) { playing = false; clearHl(); allBtn.textContent = '🔊 念全文'; return; }
        var u = units.sent[i++]; u.els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        play(u).then(next);
      })();
    });
    append(main, h('div', { class: 'card reader' },
      h('div', { class: 'reader-bar' }, h('span', { class: 'muted' }, '點一下就會念：'), modeBox, h('span', { class: 'spacer' }), allBtn),
      h('h2', { class: 'reader-title' }, R.title || ('第 ' + no + ' 課 ' + (info.title || ''))),
      text));
  }

  // ════════════════════════════════════════════════
  //  朗讀挑戰：一段一段念，用瀏覽器內建的語音辨識（iPad Safari、Android／電腦 Chrome、Edge）
  //  辨識出來的字跟課文逐字比對讀音（不管聲調，同音字算對），標出沒念到的字、給星星。
  //  成績只存在這台裝置的瀏覽器（state.progress[課次].score），不上傳。
  // ════════════════════════════════════════════════
  var CHAR_READS = null;  // 字 → 讀音們（由 data/char_zy.js 反查）
  function charReads(ch) {
    if (!CHAR_READS) {
      CHAR_READS = {};
      var idx = window.CHAR_ZY || {};
      Object.keys(idx).forEach(function (z) { Array.from(idx[z]).forEach(function (c) { (CHAR_READS[c] = CHAR_READS[c] || []).push(z); }); });
    }
    return CHAR_READS[ch] || [];
  }
  var SPOKEN_DIGIT = { '0': '〇', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '零': '〇', '○': '〇' };
  function bareZy(z) { return z.replace(/[˙ˊˇˋ]/g, ''); }
  // 課文的字 t {c, zy, bare} 跟辨識出來的字 got 比：'ok' 念對、'tone' 字音對但聲調不對、null 沒念到
  // 同一個字、輕聲字（念什麼聲調都算對）、「一、不」（有變調）不判斷聲調
  function judgeSound(t, got) {
    got = SPOKEN_DIGIT[got] || got;
    if ((SPOKEN_DIGIT[t.c] || t.c) === got) return 'ok';
    var reads = charReads(got);
    if (!reads.length) return null;
    var loose = t.zy.indexOf('˙') >= 0 || t.c === '一' || t.c === '不';
    if (!loose && reads.indexOf(t.zy) >= 0) return 'ok';
    var bare = reads.map(bareZy);
    if (bare.indexOf(t.bare) < 0) return null;
    return loose ? 'ok' : 'tone';
  }
  // 逐字對齊（編輯距離），回傳課文每個字的結果（'ok'／'tone'／null）
  function alignRead(targets, heard) {
    var n = targets.length, m = heard.length, D = [], J = [], k, j;
    for (k = 0; k <= n; k++) { D.push([k]); J.push([]); for (j = 1; j <= m; j++) D[k].push(k ? 0 : j); }
    for (k = 1; k <= n; k++) for (j = 1; j <= m; j++) {
      J[k][j] = judgeSound(targets[k - 1], heard[j - 1]);
      D[k][j] = Math.min(D[k - 1][j] + 1, D[k][j - 1] + 1, D[k - 1][j - 1] + (J[k][j] ? 0 : 1));
    }
    var res = targets.map(function () { return null; });
    k = n; j = m;
    while (k > 0 && j > 0) {
      if (D[k][j] === D[k - 1][j - 1] + (J[k][j] ? 0 : 1)) { res[k - 1] = J[k][j]; k--; j--; }
      else if (D[k][j] === D[k - 1][j] + 1) k--;
      else j--;
    }
    return res;
  }
  // 把課文切成一段一段：等級 1 到逗號就切（比較短）；等級 2、3 到句號、問號、驚嘆號才切，
  // 但一段太長（超過 18 字，等級 3 是 30 字）時，遇到逗號也切
  function scoreChunks(R, level) {
    var END = /[。？！；]/, SOFT = /[，：]/, MAX = level === 1 ? 0 : level === 2 ? 18 : 30;
    var out = [];
    R.sections.forEach(function (sec, si) {
      sec.paras.forEach(function (para) {
        var cur = [];
        var flush = function () { if (cur.some(function (x) { return x.bare; })) out.push({ sec: si, h: sec.h, chars: cur }); cur = []; };
        para.forEach(function (tok) {
          var zs = tok[1] ? tok[1].split(' ') : [];
          Array.from(tok[0]).forEach(function (c, i) {
            var z = zs[i] || '', x = { c: c, zy: z, bare: z.replace(/[˙ˊˇˋ]/g, ''), say: tok[2] && tok[2].length === tok[0].length ? tok[2][i] : c };
            // 句尾後面的下引號，歸到上一段
            if (/[」』）]/.test(c) && !cur.length && out.length) { out[out.length - 1].chars.push(x); return; }
            cur.push(x);
            if (END.test(c) || (SOFT.test(c) && cur.filter(function (y) { return y.bare; }).length >= MAX)) flush();
          });
        });
        flush();
      });
    });
    return out;
  }
  function scoreStars(p) { return p >= 90 ? 3 : p >= 70 ? 2 : p >= 40 ? 1 : 0; }
  function renderScore(lid) {
    var R = READINGS[lid], no = parseInt(lid, 10), c = cfg();
    var crumbs = [{ text: '首頁', href: '#/' }];
    if (LESSONS[lid]) crumbs.push({ text: '第 ' + no + ' 課', href: '#/lesson/' + lid });
    crumbs.push({ text: '朗讀挑戰' });
    var main = shell(crumbs, 'var(--c-reading)');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var chunks = scoreChunks(R, c.level), prog = modProg(lid, 'score'), at = 0;
    // 從第一段還沒念過的地方開始
    for (var q = 0; q < chunks.length; q++) if (prog[c.level + ':' + q] == null) { at = q; break; }
    var head = h('div', { class: 'score-head' }), body = h('div', { class: 'score-body' });
    append(main, h('div', { class: 'card reader score' }, h('h2', { class: 'reader-title' }, '🎙️ 朗讀挑戰：' + (R.title || '')), head, body));
    if (!SR) {
      append(body, h('div', { class: 'hintbox' }, '⚠️', h('span', { style: 'flex:1' }, '這個瀏覽器不能語音辨識。請用 iPad 的 Safari，或安卓、電腦的 Chrome、Edge 開啟。')));
      return;
    }
    var rec = null;
    function drawHead() {
      head.innerHTML = '';
      var done = chunks.filter(function (x, k) { return prog[c.level + ':' + k] != null; }).length;
      var avg = done ? Math.round(chunks.reduce(function (s, x, k) { return s + (prog[c.level + ':' + k] || 0); }, 0) / done) : 0;
      var dots = h('div', { class: 'score-dots' });
      chunks.forEach(function (x, k) {
        var p = prog[c.level + ':' + k];
        var b = h('button', { type: 'button', class: 'sd' + (k === at ? ' cur' : '') + (p == null ? '' : ' s' + scoreStars(p)), 'aria-label': '第 ' + (k + 1) + ' 段' + (p == null ? '' : '，' + p + ' 分') });
        b.addEventListener('click', function () { stopRec(); at = k; show(); });
        dots.appendChild(b);
      });
      append(head, h('div', { class: 'row' }, h('span', {}, '第 ' + (at + 1) + '／' + chunks.length + ' 段'), h('span', { class: 'spacer' }),
        h('span', { class: 'muted' }, '已念 ' + done + ' 段' + (done ? '・平均 ' + avg + ' 分' : ''))), dots);
    }
    function stopRec() { if (rec) { try { rec.abort(); } catch (e) { /* 已經停了 */ } rec = null; } }
    function show() {
      stopSpeak(); drawHead(); body.innerHTML = '';
      var ch = chunks[at], targets = ch.chars.filter(function (x) { return x.bare; });
      var line = h('p', { class: 'reader-p score-line' }), els = [];
      ch.chars.forEach(function (x) {
        var el = x.bare ? h('span', { class: 'rc' }, withZy(x.c, x.zy)) : h('span', { class: 'rc punct' }, x.c);
        if (x.bare) els.push(el);
        line.appendChild(el);
      });
      var live = h('div', { class: 'score-live muted' }), result = h('div', { class: 'feedback' });
      var demo = h('button', { class: 'btn btn-ghost', type: 'button' }, '🔊 聽示範');
      demo.addEventListener('click', function () { stopRec(); speak(ch.chars.map(function (x) { return x.say; }).join(''), demo); });
      var mic = h('button', { class: 'btn btn-primary score-mic', type: 'button' }, '🎙️ 開始念');
      var heard = '';
      function finish() {
        mic.classList.remove('rec'); mic.textContent = '🎙️ 再念一次';
        var got = Array.from(heard.replace(/[\s，。、；：？！「」『』（）,.!?;:'"]/g, ''));
        if (!got.length) { live.textContent = '沒有聽到聲音，靠近一點、大聲一點再念一次。'; return; }
        // 念對 1 分、聲調不對 0.5 分、沒念到 0 分
        var res = alignRead(targets, got), pts = 0, tones = 0;
        res.forEach(function (r) { pts += r === 'ok' ? 1 : r === 'tone' ? 0.5 : 0; if (r === 'tone') tones++; });
        var pct = Math.round(pts / targets.length * 100);
        els.forEach(function (el, k) { el.classList.toggle('sc-ok', res[k] === 'ok'); el.classList.toggle('sc-tone', res[k] === 'tone'); el.classList.toggle('sc-miss', !res[k]); });
        var key = c.level + ':' + at, best = prog[key];
        if (best == null || pct > best) { prog[key] = pct; save(); }
        result.innerHTML = '';
        var st = scoreStars(pct);
        if (st >= 2) sfx.right(); else sfx.wrong();
        append(result, h('div', { class: 'score-res' }, starsEl(st), h('b', {}, pct + ' 分'),
          h('span', {}, pct === 100 ? '每個字都念對了！' : (st >= 2 ? '很棒！' : '先按「聽示範」，再念一次。') +
            (res.some(function (r) { return !r; }) ? '紅色的字沒聽到。' : '') + (tones ? '橘色的字聲調不對。' : ''))));
        append(result, nextBtn(at < chunks.length - 1 ? '下一段 →' : '看成績 →', function () { if (at < chunks.length - 1) { at++; show(); } else summary(); }));
        drawHead();
      }
      mic.addEventListener('click', function () {
        if (rec) { rec.stop(); return; }   // 念完按「停止」
        stopSpeak(); heard = ''; result.innerHTML = '';
        els.forEach(function (el) { el.classList.remove('sc-ok', 'sc-tone', 'sc-miss'); });
        rec = new SR();
        rec.lang = 'zh-TW'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
        rec.onresult = function (e) {
          var fin = '', tmp = '';
          for (var r = 0; r < e.results.length; r++) { if (e.results[r].isFinal) fin += e.results[r][0].transcript; else tmp += e.results[r][0].transcript; }
          heard = fin + tmp;
          live.textContent = '聽到：' + heard;
        };
        rec.onerror = function (e) {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') live.textContent = '沒有使用麥克風的權限，請在瀏覽器設定裡允許這個網站使用麥克風。';
          else if (e.error === 'network') live.textContent = '語音辨識要連上網路，請確認網路後再試一次。';
        };
        rec.onend = function () { rec = null; finish(); };
        try { rec.start(); } catch (err) { rec = null; return; }
        mic.classList.add('rec'); mic.textContent = '⏹ 念完了';
        live.textContent = '請開始念……念完按「念完了」。';
      });
      append(body, ch.h ? h('div', { class: 'muted score-sec' }, ch.h) : null, h('div', { class: 'reader-text' }, line),
        h('div', { class: 'tools' }, demo, mic), live, result);
      if (c.autoRead) speak(ch.chars.map(function (x) { return x.say; }).join(''), demo);
    }
    function summary() {
      stopRec(); stopSpeak(); drawHead(); body.innerHTML = '';
      var done = chunks.filter(function (x, k) { return prog[c.level + ':' + k] != null; }).length;
      var avg = done ? Math.round(chunks.reduce(function (s, x, k) { return s + (prog[c.level + ':' + k] || 0); }, 0) / done) : 0;
      sfx.win();
      append(body, h('div', { class: 'score-sum' }, h('div', { class: 'big' }, avg + ' 分'), starsEl(scoreStars(avg)),
        h('p', {}, '念了 ' + done + '／' + chunks.length + ' 段。上面的圓點可以選一段重念，會留下最高分。')),
        h('div', { class: 'tools' }, btnTo('從頭再念一次', 'btn-ghost', function () { at = 0; show(); }),
          LESSONS[lid] ? btnTo('回到本課', 'btn-primary', function () { location.hash = '#/lesson/' + lid; }) : btnTo('回首頁', 'btn-primary', function () { location.hash = '#/'; })));
    }
    window.addEventListener('hashchange', stopRec, { once: true });
    show();
  }

  function route() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'read' && READINGS[p[1]]) return renderReader(p[1]);
    if (p[0] === 'score' && READINGS[p[1]]) return renderScore(p[1]);
    if ((p[0] === 'read' || p[0] === 'score') && hasReading(p[1])) return renderUnlock(p[0], p[1]);
    if (p[0] === 'review') return renderReview(LESSONS[p[1]] ? p[1] : null);
    if (p[0] === 'test' && LESSONS[p[1]]) return renderTest(p[1]);
    if (p[0] === 'lesson' && LESSONS[p[1]]) {
      if (p[2] === 'm' && MODULES[p[3]]) return renderModule(p[1], p[3], p[4] != null ? parseInt(p[4], 10) : null);
      return renderLesson(p[1]);
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);
  unlockFromStore().then(route, route);
})();
