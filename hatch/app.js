/* 念課文孵寵物（試做）
 * 一個自然段＝一顆蛋。段落切成一句一句念，語音辨識逐字比對讀音（跟國語網站「朗讀挑戰」同一套）：
 *   90 分以上餵 3 個、70 分以上餵 2 個、有開口餵 1 個；每句算最好的一次。
 *   每一句都念過、飽食度到「句數 × 2」就破蛋，孵出的寵物收進圖鑑。
 * 課文是加密的（../mandarin/data/reading.enc.js），用國語網站同一把教室金鑰（localStorage tm-classkey）。
 * 紀錄只存在這台裝置（localStorage tm-hatch-v1），不上傳。
 */
(function () {
  'use strict';
  var ENC = window.READINGS_ENC || null, PETS = window.PETS || [];
  var READINGS = window.READINGS = window.READINGS || {};   // 解密後的課文放這裡
  var CLASS_KEY = 'tm-classkey', STORE = 'tm-hatch-v1';
  var app = document.getElementById('app');

  // ── 小工具 ──────────────────────────────
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
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el) {
    for (var i = 1; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
      else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ── 紀錄 ────────────────────────────────
  var S = { level: 2, zy: true, best: {}, hatched: {} };
  try { var saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved) Object.keys(saved).forEach(function (k) { S[k] = saved[k]; }); } catch (e) { /* 沒有紀錄 */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* 無法儲存 */ } }

  // ── 朗讀（示範）、音效 ───────────────────
  var synth = window.speechSynthesis || null, zhVoice = null;
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    zhVoice = vs.filter(function (v) { return /zh[-_]TW/i.test(v.lang); })[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  function speak(text, btn) {
    if (!synth || !text) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW'; if (zhVoice) u.voice = zhVoice; u.rate = 0.85;
    if (btn) { btn.classList.add('speaking'); u.onend = u.onerror = function () { btn.classList.remove('speaking'); }; }
    synth.speak(u);
  }
  function stopSpeak() { if (synth) synth.cancel(); }
  var actx = null;
  function tone(freqs, dur, gap) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * (gap || 0.1);
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
      });
    } catch (e) { /* 沒有音效 */ }
  }
  var sfx = {
    eat: function () { tone([660, 880], 0.15, 0.09); },
    soft: function () { tone([440, 520], 0.18, 0.12); },
    hatch: function () { tone([523, 659, 784, 1047, 1319], 0.3, 0.12); }
  };

  // ── 教室密碼（跟國語網站同一套） ──────────
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function unb64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function decryptWith(key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(ENC.iv) }, key, b64(ENC.data)).then(function (buf) {
      var obj = JSON.parse(new TextDecoder().decode(buf));
      Object.keys(obj).forEach(function (k) { READINGS[k] = obj[k]; });
      return key;
    });
  }
  function unlockWithPassword(pw) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(ENC.salt), iterations: ENC.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    }).then(decryptWith).then(function (key) {
      return crypto.subtle.exportKey('raw', key).then(function (raw) { try { localStorage.setItem(CLASS_KEY, unb64(raw)); } catch (e) { /* 下次再輸入 */ } });
    });
  }
  function unlockFromStore() {
    var raw = null;
    try { raw = localStorage.getItem(CLASS_KEY); } catch (e) { raw = null; }
    if (!ENC || !raw || !(window.crypto && crypto.subtle)) return Promise.resolve(false);
    return crypto.subtle.importKey('raw', b64(raw), { name: 'AES-GCM' }, false, ['decrypt'])
      .then(decryptWith).then(function () { return true; })
      .catch(function () { return false; });
  }
  function renderUnlock() {
    var input = h('input', { type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': '教室密碼' });
    var msg = h('p', { class: 'muted center' });
    var go = h('button', { class: 'btn btn-main', type: 'button' }, '進入孵化屋 →');
    function tryIt() {
      var pw = input.value.trim();
      if (!pw) { msg.textContent = '請輸入教室密碼。'; return; }
      go.disabled = true; msg.textContent = '解鎖中……';
      unlockWithPassword(pw).then(function () { route(); }).catch(function () { go.disabled = false; msg.textContent = '密碼不對，請老師再試一次。'; });
    }
    go.addEventListener('click', tryIt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryIt(); });
    app.innerHTML = '';
    add(app, h('div', { class: 'card unlock' }, h('div', { class: 'big-egg-emoji' }, '🥚'), h('h2', {}, '請老師輸入教室密碼'),
      h('p', { class: 'muted center' }, '課文有著作權，要輸入教室密碼才能打開。這台 iPad 在國語網站輸入過，就不用再輸入。'),
      input, go, msg));
    input.focus();
  }

  // ── 注音（國字右邊直排） ───────────────────
  function zyColumn(syl) {
    var col = h('span', { class: 'zy-v', 'aria-hidden': 'true' });
    var light = syl.indexOf('˙') >= 0, tn = '';
    if (light) syl = syl.replace('˙', '');
    if (/[ˊˇˋˉ]$/.test(syl)) { tn = syl.slice(-1); syl = syl.slice(0, -1); }
    var sy = Array.from(syl);
    if (light) add(col, h('span', { class: 'zy-light', style: 'grid-row:1;grid-column:1' }, '˙'));
    sy.forEach(function (s, k) { add(col, h('span', { class: 'zy-s', style: 'grid-row:' + (k + 2) + ';grid-column:1' }, s)); });
    if (tn) add(col, h('span', { class: 'zy-t', style: 'grid-row:' + (sy.length + 1) + ';grid-column:2' }, tn));
    return col;
  }
  function charEl(x) {
    if (x.br) return h('br');
    if (!x.bare) return h('span', { class: 'rc punct' }, x.c);
    if (!S.zy || !x.zy) return h('span', { class: 'rc' }, x.c);
    return h('span', { class: 'rc' }, h('span', { class: 'zy-c' }, h('span', { class: 'zy-h' }, x.c), zyColumn(x.zy)));
  }

  // ── 讀音比對（跟朗讀挑戰一樣：同音字算對、聲調錯算一半） ──
  var CHAR_READS = null;
  function charReads(ch) {
    if (!CHAR_READS) {
      CHAR_READS = {};
      var idx = window.CHAR_ZY || {};
      Object.keys(idx).forEach(function (z) { Array.from(idx[z]).forEach(function (c) { (CHAR_READS[c] = CHAR_READS[c] || []).push(z); }); });
    }
    return CHAR_READS[ch] || [];
  }
  var DIGIT = { '0': '〇', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '零': '〇', '○': '〇' };
  function bareZy(z) { return z.replace(/[˙ˊˇˋ]/g, ''); }
  function judgeSound(t, got) {
    got = DIGIT[got] || got;
    if ((DIGIT[t.c] || t.c) === got) return 'ok';
    var reads = charReads(got);
    if (!reads.length) return null;
    var loose = t.zy.indexOf('˙') >= 0 || t.c === '一' || t.c === '不';
    if (!loose && reads.indexOf(t.zy) >= 0) return 'ok';
    if (reads.map(bareZy).indexOf(t.bare) < 0) return null;
    return loose ? 'ok' : 'tone';
  }
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

  // ── 課文 → 段落（蛋）→ 句子 ────────────────
  // 等級 1 到逗號就切（短）；等級 2、3 到句號才切，太長（18／30 字）遇到逗號也切
  function paraChunks(para, level) {
    var END = /[。？！；]/, SOFT = /[，：]/, MAX = level === 1 ? 0 : level === 2 ? 18 : 30;
    var out = [], cur = [];
    function flush() { if (cur.some(function (x) { return x.bare; })) out.push(cur); cur = []; }
    para.forEach(function (tok) {
      var zs = tok[1] ? tok[1].split(' ') : [];
      Array.from(tok[0]).forEach(function (c, i) {
        var z = zs[i] || '', x = { c: c, zy: z, bare: bareZy(z), say: tok[2] && tok[2].length === tok[0].length ? tok[2][i] : c };
        if (/[」』）]/.test(c) && !cur.length && out.length) { out[out.length - 1].push(x); return; }
        cur.push(x);
        if (END.test(c) || (SOFT.test(c) && cur.filter(function (y) { return y.bare; }).length >= MAX)) flush();
      });
    });
    flush();
    return out;
  }
  function paraChars(para) {
    var out = [];
    para.forEach(function (tok) {
      var zs = tok[1] ? tok[1].split(' ') : [];
      Array.from(tok[0]).forEach(function (c, i) {
        var z = zs[i] || '';
        out.push({ c: c, zy: z, bare: bareZy(z), say: tok[2] && tok[2].length === tok[0].length ? tok[2][i] : c });
      });
    });
    return out;
  }
  function bareCount(xs) { return xs.filter(function (x) { return x.bare; }).length; }
  // 詩（一行一段）：幾行併成一句念，行和行之間換行顯示
  function lineChunks(lines, level) {
    var MIN = level === 1 ? 6 : level === 2 ? 10 : 16, out = [], cur = [];
    lines.forEach(function (para) {
      if (cur.length) cur.push({ c: '', br: true, bare: '', say: '，' });
      cur = cur.concat(paraChars(para));
      if (bareCount(cur) >= MIN) { out.push(cur); cur = []; }
    });
    if (bareCount(cur)) {
      if (out.length && bareCount(cur) < MIN / 2) out[out.length - 1] = out[out.length - 1].concat([{ c: '', br: true, bare: '', say: '，' }], cur);
      else out.push(cur);
    }
    return out;
  }
  // 一個自然段＝一顆蛋；連續很短的段（每段不到 20 字，例如新詩、古詩一行一段）併成一顆，大約 36 字
  function eggsOf(lid) {
    var R = READINGS[lid], eggs = [], SHORT = 20, GROUP = 36;
    R.sections.forEach(function (sec) {
      var buf = [], bufLen = 0;
      function flushBuf() { if (buf.length) eggs.push({ h: sec.h, chunks: lineChunks(buf, S.level) }); buf = []; bufLen = 0; }
      sec.paras.forEach(function (para) {
        var len = bareCount(paraChars(para));
        if (len < SHORT) { buf.push(para); bufLen += len; if (bufLen >= GROUP) flushBuf(); return; }
        flushBuf();
        var chunks = paraChunks(para, S.level);
        if (chunks.length) eggs.push({ h: sec.h, chunks: chunks });
      });
      flushBuf();
    });
    return eggs.filter(function (e) { return e.chunks.length; });
  }
  function lessonTitle(lid) {
    var t = (READINGS[lid].title || '').split('　')[0].replace(/^[一二三四五六七八九十]+、/, '');
    return t || ('第 ' + parseInt(lid, 10) + ' 課');
  }
  // 蛋殼的樣子（固定）；蛋裡是哪一隻，破蛋時才決定（還沒收集過的優先）
  function petOf(lid, pi) { return PETS[(parseInt(lid, 10) * 5 + pi) % PETS.length]; }
  var FOODS = ['🍓', '🍎', '🍇', '🌽', '🫐', '🍌', '🥕', '🍯'];
  function foodOf(lid, pi) { return FOODS[(parseInt(lid, 10) * 3 + pi) % FOODS.length]; }
  function petByName(n) { return PETS.filter(function (p) { return p.name === n; })[0]; }
  function hatchedPet(lid, pi) {
    var r = S.hatched[lid] && S.hatched[lid][pi];
    if (!r) return null;
    if (typeof r === 'object' && petByName(r.p)) return { pet: petByName(r.p), gold: !!r.g };
    return { pet: petOf(lid, pi), gold: false };   // 舊紀錄
  }
  function collected() {
    var c = {};
    Object.keys(S.hatched).forEach(function (l) {
      Object.keys(S.hatched[l]).forEach(function (pi) {
        var hp = hatchedPet(l, parseInt(pi, 10));
        if (!hp) return;
        var k = c[hp.pet.name] = c[hp.pet.name] || { n: 0, g: 0 };
        k.n++; if (hp.gold) k.g++;
      });
    });
    return c;
  }
  function choosePet() {
    var c = collected(), left = PETS.filter(function (p) { return !c[p.name]; }), pool = left.length ? left : PETS;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function petName(hp) { return (hp.gold ? '金色' : '') + hp.pet.name; }
  function bestOf(lid, pi) {
    var b = S.best[lid] = S.best[lid] || {}, lv = b[S.level] = b[S.level] || {};
    return lv[pi] = lv[pi] || {};
  }
  function foodFor(pct) { return pct >= 90 ? 3 : pct >= 70 ? 2 : 1; }
  function eggState(lid, pi, egg) {
    var best = bestOf(lid, pi), food = 0, read = 0;
    egg.chunks.forEach(function (c, ci) { if (best[ci] != null) { read++; food += foodFor(best[ci]); } });
    var need = egg.chunks.length * 2, max = egg.chunks.length * 3;
    var hatched = !!(S.hatched[lid] && S.hatched[lid][pi]);
    return { food: food, need: need, max: max, read: read, all: read === egg.chunks.length, hatched: hatched, ready: read === egg.chunks.length && food >= need };
  }

  // ── 畫蛋（CSS 畫的蛋殼＋裂痕）、畫寵物 ─────────
  function eggEl(pet, stage, size) {
    // stage 0～3：裂痕越來越多
    var el = h('div', { class: 'egg egg-' + (size || 'm') + ' crack' + stage, style: '--egg:' + pet.egg[0] + ';--spot:' + pet.egg[1] });
    add(el, h('span', { class: 'spot s1' }), h('span', { class: 'spot s2' }), h('span', { class: 'spot s3' }));
    el.insertAdjacentHTML('beforeend',
      '<svg class="cracks" viewBox="0 0 100 130" aria-hidden="true">' +
      '<path class="c1" d="M28 52 L38 60 L33 68 L44 74"/>' +
      '<path class="c2" d="M70 44 L62 55 L71 62 L63 72 L70 80"/>' +
      '<path class="c3" d="M18 70 L30 72 L36 66 L48 70 L58 64 L68 70 L82 66"/></svg>');
    return el;
  }
  function petImg(pet, cls) {
    var wrap = h('div', { class: 'pet ' + (cls || '') });
    var img = h('img', { src: 'images/' + encodeURIComponent(pet.name) + '.webp', alt: pet.name });
    img.addEventListener('error', function () { wrap.innerHTML = ''; add(wrap, h('span', { class: 'pet-emoji' }, pet.emoji)); });
    add(wrap, img);
    return wrap;
  }
  function stageOf(st) { return st.hatched ? 3 : Math.min(3, Math.floor(st.food / Math.max(1, st.need) * 3)); }

  // ── 首頁：選課 ──────────────────────────
  function lessonIds() { return (ENC ? ENC.lessons : []).filter(function (l) { return READINGS[l]; }); }
  function renderHome() {
    app.innerHTML = '';
    add(app, h('div', { class: 'card intro' },
      h('h1', {}, '🥚 念課文孵寵物'),
      h('p', {}, '每一個自然段都是一顆神祕寵物蛋。大聲把課文一句一句念出來，就能餵蛋裡的小寵物，讓牠長大、破蛋出生！'),
      h('ul', { class: 'rules' },
        h('li', {}, '🍒 念得很好餵 3 個、很接近餵 2 個、有開口餵 1 個'),
        h('li', {}, '🥚 每一句都念過、飽食度滿了，蛋就會破掉；先孵出還沒收集過的寶寶'),
        h('li', {}, '✨ 每一句都念到 100 分，有機會孵出金色寶寶'),
        h('li', {}, '💛 念不好沒關係，按「🔊 聽示範」再念一次'))));
    var grid = h('div', { class: 'lessons' });
    lessonIds().forEach(function (lid) {
      var eggs = eggsOf(lid), n = 0;
      eggs.forEach(function (e, pi) { if (eggState(lid, pi, e).hatched) n++; });
      var R = READINGS[lid];
      add(grid, h('a', { class: 'lesson card', href: '#/l/' + lid },
        h('div', { class: 'l-no' }, '第 ' + parseInt(lid, 10) + ' 課'),
        h('div', { class: 'l-title' }, lessonTitle(lid)),
        h('div', { class: 'l-eggs' }, eggs.map(function (e, pi) {
          var st = eggState(lid, pi, e);
          return st.hatched ? h('span', { class: 'mini' + (hatchedPet(lid, pi).gold ? ' gold-mini' : '') }, hatchedPet(lid, pi).pet.emoji) : h('span', { class: 'mini egg-dot', style: '--egg:' + petOf(lid, pi).egg[0] + ';--spot:' + petOf(lid, pi).egg[1] });
        })),
        h('div', { class: 'l-count muted' }, '孵出 ' + n + '／' + eggs.length)));
    });
    add(app, grid, settings());
  }
  function settings() {
    var lv = h('select', { 'aria-label': '一句的長短' },
      h('option', { value: '1' }, '短（到逗號）'), h('option', { value: '2' }, '中（一句）'), h('option', { value: '3' }, '長（長句）'));
    lv.value = String(S.level);
    lv.addEventListener('change', function () { S.level = parseInt(lv.value, 10); save(); route(); });
    var zy = h('input', { type: 'checkbox' }); zy.checked = !!S.zy;
    zy.addEventListener('change', function () { S.zy = zy.checked; save(); route(); });
    return h('div', { class: 'settings' },
      h('label', {}, '一次念：', lv),
      h('label', {}, zy, ' 顯示注音'));
  }

  // ── 一課：一排蛋 ────────────────────────
  function renderLesson(lid) {
    var R = READINGS[lid], eggs = eggsOf(lid);
    app.innerHTML = '';
    var grid = h('div', { class: 'nest' });
    eggs.forEach(function (e, pi) {
      var pet = petOf(lid, pi), st = eggState(lid, pi, e), hp = hatchedPet(lid, pi);
      add(grid, h('a', { class: 'nest-item card' + (st.hatched ? ' done' : ''), href: '#/l/' + lid + '/' + pi },
        hp ? petImg(hp.pet, 'pet-s' + (hp.gold ? ' gold' : '')) : eggEl(pet, stageOf(st), 's'),
        h('div', { class: 'n-label' }, '第 ' + (pi + 1) + ' 顆'),
        e.h ? h('div', { class: 'n-sec' }, e.h.split('　')[0]) : null,
        h('div', { class: 'muted' }, hp ? petName(hp) : (st.read ? '念了 ' + st.read + '／' + e.chunks.length + ' 句' : e.chunks.length + ' 句'))));
    });
    add(app, h('div', { class: 'crumbs' }, h('a', { href: '#/' }, '← 選課')),
      h('h2', { class: 'center' }, '第 ' + parseInt(lid, 10) + ' 課　' + lessonTitle(lid)),
      h('p', { class: 'muted center' }, '點一顆蛋開始念。一顆蛋＝一個自然段。'), grid);
  }

  // ── 孵一顆蛋 ────────────────────────────
  var rec = null;
  function stopRec() { if (rec) { try { rec.abort(); } catch (e) { /* 已停 */ } rec = null; } }
  function renderEgg(lid, pi) {
    var eggs = eggsOf(lid), egg = eggs[pi];
    if (!egg) { location.hash = '#/l/' + lid; return; }
    var pet = petOf(lid, pi), food = foodOf(lid, pi), best = bestOf(lid, pi);
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var at = 0;
    for (var q = 0; q < egg.chunks.length; q++) if (best[q] == null) { at = q; break; }
    app.innerHTML = '';
    var stageBox = h('div', { class: 'stage' }), bar = h('div', { class: 'bar' }), dots = h('div', { class: 'dots' });
    var body = h('div', { class: 'card read' });
    add(app, h('div', { class: 'crumbs' }, h('a', { href: '#/l/' + lid }, '← 第 ' + parseInt(lid, 10) + ' 課的蛋')),
      h('div', { class: 'egg-head' }, h('b', {}, '第 ' + (pi + 1) + ' 顆蛋' + (egg.h ? '（' + egg.h.split('　')[0] + '）' : '')), h('span', { class: 'muted' }, '　餵 ' + food + ' 就會長大')),
      stageBox, bar, dots, body);

    function drawStage(fed) {
      var st = eggState(lid, pi, egg);
      stageBox.innerHTML = '';
      var hp = hatchedPet(lid, pi);
      if (hp) {
        add(stageBox, h('div', { class: 'hatched' }, petImg(hp.pet, 'pet-l pop' + (hp.gold ? ' gold' : '')), h('div', { class: 'bubble' }, '我是' + petName(hp) + '！' + hp.pet.say)));
      } else {
        var e = eggEl(pet, stageOf(st), 'l');
        if (fed) e.classList.add('wobble');
        add(stageBox, e);
      }
      bar.innerHTML = '';
      add(bar, h('span', { class: 'bar-label' }, '飽食度'));
      for (var i = 0; i < st.need; i++) add(bar, h('span', { class: 'slot' + (i < st.food ? ' full' : '') }, i < st.food ? food : ''));
      dots.innerHTML = '';
      egg.chunks.forEach(function (c, ci) {
        var p = best[ci];
        var b = h('button', { type: 'button', class: 'dot' + (ci === at ? ' cur' : '') + (p == null ? '' : ' f' + foodFor(p)), 'aria-label': '第 ' + (ci + 1) + ' 句' }, String(ci + 1));
        b.addEventListener('click', function () { stopRec(); at = ci; show(); });
        add(dots, b);
      });
      return st;
    }
    function feed(n, x0, y0) {
      // 食物從按鈕飛到蛋
      var target = stageBox.getBoundingClientRect();
      for (var i = 0; i < n; i++) {
        var f = h('span', { class: 'fly', style: 'left:' + (x0 + i * 26) + 'px;top:' + y0 + 'px' }, food);
        document.body.appendChild(f);
        (function (f, i) {
          setTimeout(function () {
            f.style.transform = 'translate(' + (target.left + target.width / 2 - x0 - i * 26) + 'px,' + (target.top + target.height / 2 - y0) + 'px) scale(.4)';
            f.style.opacity = '0';
            sfx.eat();
          }, 120 + i * 220);
          setTimeout(function () { f.remove(); }, 1100 + i * 220);
        })(f, i);
      }
    }
    function hatchNow() {
      // 每一句都念到 100 分：一半機會孵出金色寶寶
      var perfect = egg.chunks.every(function (c, ci) { return best[ci] === 100; });
      var got = { p: choosePet().name, g: perfect && Math.random() < 0.5 ? 1 : 0, t: Date.now() };
      var isNew = !collected()[got.p];
      S.hatched[lid] = S.hatched[lid] || {}; S.hatched[lid][pi] = got; save();
      var hp = hatchedPet(lid, pi);
      var e = stageBox.querySelector('.egg');
      if (e) e.classList.add('shake');
      setTimeout(function () {
        sfx.hatch();
        drawStage();
        body.innerHTML = '';
        var next = pi + 1 < eggs.length ? h('a', { class: 'btn btn-main', href: '#/l/' + lid + '/' + (pi + 1) }, '下一顆蛋 →') : h('a', { class: 'btn btn-main', href: '#/l/' + lid }, '這課的蛋都看看 →');
        add(body, h('div', { class: 'center' }, h('h2', {}, (hp.gold ? '✨ ' : '🎉 ') + '破蛋了！孵出「' + petName(hp) + '」'),
          h('p', { class: 'muted' }, (isNew ? '新朋友！已經收進圖鑑。' : '已經收進圖鑑。') + (hp.gold ? '每一句都念到 100 分，才有機會孵出金色寶寶喔！' : (perfect ? '' : '每一句都念到 100 分，就有機會孵出金色寶寶！'))),
          h('div', { class: 'row' }, next, h('a', { class: 'btn', href: '#/dex' }, '🐾 看圖鑑'))));
        speak('破蛋了！孵出' + petName(hp) + '。' + hp.pet.say);
      }, 1400);
    }
    function show() {
      stopSpeak(); stopRec();
      var st = drawStage();
      body.innerHTML = '';
      var chunk = egg.chunks[at], targets = chunk.filter(function (x) { return x.bare; });
      var line = h('p', { class: 'line' }), els = [];
      chunk.forEach(function (x) { var el = charEl(x); if (x.bare) els.push(el); add(line, el); });
      var live = h('div', { class: 'live muted' }), result = h('div', { class: 'result' });
      var say = chunk.map(function (x) { return x.say; }).join('');
      var demo = h('button', { class: 'btn', type: 'button' }, '🔊 聽示範');
      demo.addEventListener('click', function () { stopRec(); speak(say, demo); });
      var mic = h('button', { class: 'btn btn-main mic', type: 'button' }, '🎙️ 開始念');
      add(body, h('div', { class: 'muted small' }, '第 ' + (at + 1) + '／' + egg.chunks.length + ' 句' + (st.hatched ? '（已經孵出來了，可以再練習）' : '')),
        line, h('div', { class: 'row' }, demo, mic), live, result);
      if (!SR) { live.textContent = '這個瀏覽器不能語音辨識。請用 iPad 的 Safari，或電腦的 Chrome、Edge。'; mic.disabled = true; return; }
      var heard = '';
      function finish() {
        mic.classList.remove('rec'); mic.textContent = '🎙️ 再念一次';
        var got = Array.from(heard.replace(/[\s，。、；：？！「」『』（）,.!?;:'"]/g, ''));
        if (!got.length) { live.textContent = '沒有聽到聲音，靠近一點、大聲一點再念一次。'; return; }
        var res = alignRead(targets, got), pts = 0;
        res.forEach(function (r) { pts += r === 'ok' ? 1 : r === 'tone' ? 0.5 : 0; });
        var pct = Math.round(pts / targets.length * 100);
        els.forEach(function (el, k) { el.classList.toggle('ok', res[k] === 'ok'); el.classList.toggle('tone', res[k] === 'tone'); el.classList.toggle('miss', !res[k]); });
        var before = eggState(lid, pi, egg).food, old = best[at];
        if (old == null || pct > old) { best[at] = pct; save(); }
        var after = eggState(lid, pi, egg), gain = after.food - before, n = foodFor(pct);
        var r = mic.getBoundingClientRect();
        result.innerHTML = '';
        var words = n === 3 ? '念得好棒！' : n === 2 ? '很接近了！' : '有開口就很棒！';
        add(result, h('div', { class: 'res' }, h('b', {}, pct + ' 分'), h('span', {}, words + ' 餵 ' + n + ' 個' + food),
          res.some(function (x) { return !x; }) ? h('span', { class: 'muted' }, '紅色的字沒聽到。') : null,
          res.some(function (x) { return x === 'tone'; }) ? h('span', { class: 'muted' }, '橘色的字聲調不對。') : null));
        if (old != null && gain <= 0) add(result, h('div', { class: 'muted small' }, '這句之前念得比較好（' + old + ' 分），飽食度算最好的一次。'));
        if (gain > 0) { feed(Math.min(3, gain), r.left, r.top); sfx.eat(); } else sfx.soft();
        setTimeout(function () {
          drawStage(gain > 0);
          if (after.ready && !after.hatched) { hatchNow(); return; }
          var nextAt = -1;
          for (var k = 1; k <= egg.chunks.length; k++) { var c = (at + k) % egg.chunks.length; if (best[c] == null) { nextAt = c; break; } }
          var nb;
          if (nextAt >= 0) nb = h('button', { class: 'btn btn-main', type: 'button' }, '下一句 →');
          else if (!after.hatched) {
            add(result, h('div', { class: 'hint' }, '每一句都念過了，還差一點點就破蛋！點上面顏色淡的句子再念一次，念得更好就能多餵。'));
            var low = 0; egg.chunks.forEach(function (c, ci) { if (best[ci] < best[low]) low = ci; }); nextAt = low;
            nb = h('button', { class: 'btn btn-main', type: 'button' }, '再念第 ' + (low + 1) + ' 句 →');
          } else if (at + 1 < egg.chunks.length) { nextAt = at + 1; nb = h('button', { class: 'btn btn-main', type: 'button' }, '下一句 →'); }
          if (nb) { nb.addEventListener('click', function () { at = nextAt; show(); }); add(result, h('div', { class: 'row' }, nb)); }
        }, gain > 0 ? 900 : 200);
      }
      mic.addEventListener('click', function () {
        if (rec) { rec.stop(); return; }
        stopSpeak(); heard = ''; result.innerHTML = '';
        els.forEach(function (el) { el.classList.remove('ok', 'tone', 'miss'); });
        rec = new SR(); rec.lang = 'zh-TW'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
        rec.onresult = function (e) {
          var fin = '', tmp = '';
          for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; }
          heard = fin + tmp; live.textContent = '聽到：' + heard;
        };
        rec.onerror = function (e) {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') live.textContent = '沒有麥克風權限，請在瀏覽器設定裡允許這個網站使用麥克風。';
          else if (e.error === 'network') live.textContent = '語音辨識要連上網路，請確認網路再試一次。';
        };
        rec.onend = function () { rec = null; finish(); };
        try { rec.start(); } catch (err) { rec = null; return; }
        mic.classList.add('rec'); mic.textContent = '⏹ 念完了';
        live.textContent = '請大聲念……念完按「念完了」。';
      });
    }
    show();
  }

  // ── 圖鑑 ────────────────────────────────
  function renderDex() {
    app.innerHTML = '';
    var got = collected(), kinds = Object.keys(got).length, golds = 0;
    Object.keys(got).forEach(function (k) { if (got[k].g) golds++; });
    var grid = h('div', { class: 'dex' });
    PETS.forEach(function (p) {
      var have = got[p.name];
      add(grid, h('div', { class: 'dex-item card' + (have ? '' : ' locked') },
        have ? petImg(p, 'pet-m' + (have.g ? ' gold' : '')) : eggEl(p, 0, 's'),
        h('b', {}, have ? (have.g ? '✨' : '') + p.name : '？？？'),
        h('div', { class: 'muted small' }, have ? '孵出 ' + have.n + ' 隻' + (have.g ? '（金色 ' + have.g + '）' : '') : '還沒孵出來')));
    });
    add(app, h('div', { class: 'crumbs' }, h('a', { href: '#/' }, '← 選課')),
      h('h2', { class: 'center' }, '🐾 寵物圖鑑'),
      h('p', { class: 'muted center' }, '收集了 ' + kinds + '／' + PETS.length + ' 種台灣動物寶寶' + (golds ? '・金色 ' + golds + ' 種' : '')),
      h('p', { class: 'muted center small' }, '✨ 一顆蛋的每一句都念到 100 分，就有機會孵出金色寶寶。'), grid);
  }

  // ── 路由 ────────────────────────────────
  function route() {
    stopRec(); stopSpeak();
    window.scrollTo(0, 0);
    if (!Object.keys(READINGS).length) {
      unlockFromStore().then(function (ok) { if (ok) route(); else renderUnlock(); });
      return;
    }
    var m = location.hash.replace(/^#\/?/, '').split('/');
    if (m[0] === 'l' && READINGS[m[1]]) {
      if (m[2] != null && m[2] !== '') renderEgg(m[1], parseInt(m[2], 10));
      else renderLesson(m[1]);
    } else if (m[0] === 'dex') renderDex();
    else renderHome();
  }
  window.addEventListener('hashchange', route);
  if (!ENC) { app.textContent = '找不到課文資料。'; return; }
  route();
})();
