/* 修辭小教室：先選譬喻或摹寫，兩種都照上課流程 ①猜猜看 → ②找一找（文氏圖／五感放大鏡） → ③說說看（題目卡） → ④分辨
 * 單人單機：紀錄只存在這台 iPad（localStorage），不存學生姓名。 */
(function () {
  'use strict';
  var MP = window.MP, app = document.getElementById('app'), crumb = document.getElementById('crumb');
  var KEY = 'tm-metaphor-v1';

  // ── 小工具 ──
  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el) {
    for (var i = 1; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); continue; }
      el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 私密瀏覽等情況存不了，網站照常用 */ } }
  var S = load(); S.done = S.done || {}; S.mine = S.mine || []; S.level = S.level || 1;
  function markDone(k) { S.done[k] = true; save(S); }

  // 朗讀（台灣中文）
  var voice = null;
  function pickVoice() {
    var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    voice = vs.filter(function (v) { return /zh[-_]TW/i.test(v.lang); })[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(t) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t.replace(/[［］＿]/g, ''));
    u.lang = 'zh-TW'; u.rate = 0.85; if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  function sayBtn(t) { return h('button', { class: 'say', title: '念給我聽', 'aria-label': '念給我聽', onclick: function () { speak(typeof t === 'function' ? t() : t); } }, '🔊'); }

  // 圖片：images/名稱.webp，還沒有圖就用 emoji
  function pic(name, size) {
    var box = h('span', { class: 'pic' + (size ? ' ' + size : '') });
    var emo = h('span', { class: 'emo', 'aria-hidden': 'true' }, MP.emoji[name] || '❓');
    var img = new Image();
    img.alt = name;
    img.onload = function () { box.innerHTML = ''; box.appendChild(img); };
    img.src = 'images/' + encodeURIComponent(name) + '.webp';
    box.appendChild(emo);
    return box;
  }

  // 語音輸入：瀏覽器有語音辨識就顯示 🎤；沒有的話用 iPad 鍵盤上的麥克風
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function micFor(input) {
    if (!SR) return null;
    var b = h('button', { class: 'mic', type: 'button' }, '🎤 說');
    var rec = null;
    b.onclick = function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'zh-TW'; rec.interimResults = false;
      rec.onresult = function (e) { input.value = (input.value + e.results[0][0].transcript).replace(/[。．.]$/, ''); input.dispatchEvent(new Event('input')); };
      rec.onend = function () { rec = null; b.classList.remove('on'); b.textContent = '🎤 說'; };
      b.classList.add('on'); b.textContent = '⏹ 停'; rec.start();
    };
    return b;
  }

  function page(title, body) {
    crumb.textContent = title || '';
    app.innerHTML = '';
    add(app, body);
    window.scrollTo(0, 0);
  }
  function back(to) { return h('a', { class: 'btn small', href: to || '#/m' }, '← 回目錄'); }
  function fb() { return h('div', { class: 'feedback', role: 'status' }); }
  function setFb(el, ok, text) { el.className = 'feedback ' + (ok ? 'ok' : 'no'); el.textContent = text; speak(text.replace(/[🎉👍💡]/g, '')); }
  function cueTag(k) { var c = MP.cues[k]; return h('span', { class: 'chip' }, c.icon + ' ' + c.name); }

  // ── 首頁：選譬喻或摹寫 ──
  function home() {
    page('', [
      h('div', { class: 'hero' }, h('h1', {}, '修辭小教室'), h('div', { class: 'muted' }, '康軒國語五上・認識修辭')),
      h('div', { class: 'menu big' },
        h('a', { href: '#/m', style: '--c:#6A5AB0' },
          h('span', { class: 't' }, '🌙 譬喻'), h('span', { class: 'd' }, '兩種不一樣的東西，有相同的地方，拿來比一比。'),
          h('span', { class: 'n' }, '學習地圖一')),
        h('a', { href: '#/s', style: '--c:#2E8B6E' },
          h('span', { class: 't' }, '👀 摹寫'), h('span', { class: 'd' }, '把看到、聽到、聞到、吃到、摸到的感覺，仔細寫出來。'),
          h('span', { class: 'n' }, '五種感覺'))),
      h('div', { class: 'row', style: 'margin-top:18px' },
        h('a', { class: 'btn', href: '#/mine' }, '📒 我造的句子（' + S.mine.length + '）'))
    ]);
  }

  // ── 譬喻目錄 ──
  var STEPS = [
    { k: 'guess', n: '①', t: '🔍 猜猜我是誰', d: '一張一張翻提示卡，猜猜是什麼東西', c: '#2F6DB0' },
    { k: 'venn', n: '②', t: '⭕ 找一樣的地方', d: '用四張提示卡和文氏圖，找出兩樣東西相同的地方', c: '#6A5AB0' },
    { k: 'say', n: '③', t: '🎴 說說看像什麼', d: '看題目卡，說出像什麼、為什麼像（等級 1～3）', c: '#D08A2E' },
    { k: 'judge', n: '④', t: '⚖️ 是不是譬喻？', d: '有關鍵字就是譬喻嗎？過兩關檢查', c: '#2E8B57' }
  ];
  function metaHome() {
    page('🌙 譬喻', [
      h('div', { class: 'row' }, h('a', { class: 'btn small', href: '#/' }, '← 修辭小教室')),
      h('div', { class: 'hero' },
        h('h1', {}, '🌙 譬喻'),
        h('div', { class: 'muted' }, '學習地圖一：認識修辭──譬喻')),
      h('div', { class: 'card', style: 'margin-bottom:16px' },
        h('div', { class: 'row' }, h('b', {}, '什麼是譬喻？'), sayBtn('兩種不一樣的東西，有相同的地方，就可以拿來比一比，這就是譬喻。')),
        h('div', {}, '兩種', h('b', {}, '不一樣'), '的東西，有', h('b', {}, '相同的地方'), '，就可以拿來比一比。'),
        h('div', { class: 'formula', style: 'margin-top:10px' },
          h('span', { class: 'fa' }, '描寫的東西'), '　像　', h('span', { class: 'fb' }, '相似的東西'), '，因為都　', h('span', { class: 'fm' }, '相同的地方'), '。')),
      // 譬喻的關鍵字：不只「像」；但有關鍵字不一定是譬喻，要過第④站的兩關檢查
      h('div', { class: 'card', style: 'margin-bottom:16px' },
        h('div', { class: 'row' }, h('b', {}, '🔑 譬喻的關鍵字'), sayBtn('譬喻的關鍵字有：' + MP.keywords.join('、') + '。看到這些字，還要檢查一下，才知道是不是譬喻。')),
        h('div', { class: 'kw-list' }, MP.keywords.map(function (k) { return h('span', { class: 'kw' }, k); })),
        h('div', { class: 'muted', style: 'font-size:16px;margin-top:6px' }, '看到這些字，還要用第④站的兩關檢查，才知道是不是譬喻。')),
      h('div', { class: 'menu' }, STEPS.map(function (s) {
        return h('a', { href: '#/m/' + s.k, style: '--c:' + s.c },
          S.done[s.k] ? h('span', { class: 'done', title: '做過了' }, '⭐') : null,
          h('span', { class: 'n' }, '第 ' + s.n + ' 站'), h('span', { class: 't' }, s.t), h('span', { class: 'd' }, s.d));
      })),
      h('div', { class: 'row', style: 'margin-top:18px' },
        h('a', { class: 'btn', href: '#/m/teacher' }, '🧑‍🏫 老師題目卡（投影）'),
        h('a', { class: 'btn', href: '#/mine' }, '📒 我造的句子（' + S.mine.length + '）'))
    ]);
  }

  // ── ① 猜猜我是誰 ──
  function guess(i) {
    var list = MP.riddles;
    if (i >= list.length) return guessEnd();
    var r = list[i], shown = 1, solved = false, msg = fb();
    var cueBox = h('div', { class: 'cues' }), optBox = h('div', { class: 'opts' });
    var moreBtn = h('button', { class: 'btn' }, '👉 再翻一張提示');
    var nextBtn = h('button', { class: 'btn primary', style: 'display:none', onclick: function () { guess(i + 1); } }, i + 1 < list.length ? '下一題 →' : '看結果 →');
    function drawCues() {
      cueBox.innerHTML = '';
      r.clues.forEach(function (c, k) {
        var cue = MP.cues[c[0]], open = k < shown || solved;
        add(cueBox, h('button', { class: 'cue ' + (open ? 'show' : 'hide'), onclick: function () { if (open) speak(c[1]); else if (k === shown) more(); } },
          h('span', { class: 'ci' }, cue.icon), ' ', h('span', { class: 'cn' }, cue.name),
          h('span', { class: 'ct' }, open ? c[1] : '？')));
      });
      moreBtn.style.display = shown < r.clues.length && !solved ? '' : 'none';
    }
    function more() { if (shown < r.clues.length) { shown++; drawCues(); speak(r.clues[shown - 1][1]); } }
    moreBtn.onclick = more;
    shuffle(r.opts).forEach(function (o) {
      var b = h('button', { class: 'opt' }, pic(o), o);
      b.onclick = function () {
        if (solved || b.classList.contains('wrong')) return;
        if (o === r.ans) {
          solved = true; b.classList.add('right'); drawCues();
          setFb(msg, true, '🎉 答對了！是「' + r.ans + '」，你看了 ' + shown + ' 張提示。');
          nextBtn.style.display = '';
        } else {
          b.classList.add('wrong');
          setFb(msg, false, shown < r.clues.length ? '不是「' + o + '」喔，再翻一張提示看看。' : '不是「' + o + '」喔，再看一次提示。');
        }
      };
      add(optBox, b);
    });
    drawCues();
    page('① 猜猜我是誰', [
      h('div', { class: 'row' }, back(), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + list.length + ' 題')),
      h('h2', {}, '🔍 猜猜我是誰？'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('span', {}, '一張一張翻提示卡，覺得知道了，就點下面的答案。'), sayBtn('一張一張翻提示卡，覺得知道了，就點下面的答案。')),
        h('div', { style: 'margin:12px 0' }, cueBox),
        h('div', { class: 'row center' }, moreBtn),
        optBox, msg, h('div', { class: 'row center' }, nextBtn))
    ]);
    speak(r.clues[0][1]);
  }
  function guessEnd() {
    markDone('guess');
    var t = '猜謎是看特點，想出是什麼東西。譬喻剛好反過來：看兩樣東西，找到一樣的特點，就能比一比。';
    page('① 猜猜我是誰', [
      back(), h('h2', {}, '🎉 全部猜完了！'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('b', {}, '想一想'), sayBtn(t)),
        h('p', {}, '猜謎：看', h('b', {}, '特點'), '，想出是什麼東西。'),
        h('p', {}, '譬喻：剛好反過來──看兩樣東西，找到', h('b', {}, '一樣的特點'), '，就能比一比。'),
        h('p', { class: 'muted' }, '剛剛的提示卡，就是找特點的四個方向：'),
        h('div', { class: 'row' }, Object.keys(MP.cues).map(cueTag)),
        h('div', { class: 'row', style: 'margin-top:14px' }, h('a', { class: 'btn primary', href: '#/m/venn' }, '下一站：找一樣的地方 →')))
    ]);
  }

  // ── ② 提示卡＋文氏圖 ──
  function venn(i) {
    var v = MP.venn[i], k = 0, msg = fb(), placed = [];
    var za = h('div', { class: 'zone za' }), zb = h('div', { class: 'zone zb' }), zm = h('div', { class: 'zone zm' }, h('div', { class: 'head' }, '相似的地方'));
    var ask = h('div'), tail = h('div');
    function zoneOf(w) { return w === 'a' ? za : w === 'b' ? zb : zm; }
    function q() {
      ask.innerHTML = ''; msg.className = 'feedback'; msg.textContent = '';
      if (k >= v.f.length) return finish();
      var f = v.f[k];
      var text = '「' + f[0] + '」是誰有的？';
      add(ask, h('div', { class: 'row center', style: 'font-size:24px' }, cueTag(f[2]), h('b', {}, text), sayBtn(text)));
      var opts = h('div', { class: 'opts' });
      [['a', '只有' + v.a], ['both', '兩個都有'], ['b', '只有' + v.b]].forEach(function (o) {
        var b = h('button', { class: 'opt txt' }, o[1]);
        b.onclick = function () {
          if (b.classList.contains('wrong')) return;
          if (o[0] === f[1]) {
            b.classList.add('right');
            add(zoneOf(f[1]), h('span', { class: 'tag ' + f[1] }, f[0]));
            placed.push(f);
            setFb(msg, true, f[1] === 'both' ? '👍 對！「' + f[0] + '」兩個都有，放在中間。' : '👍 對！只有' + (f[1] === 'a' ? v.a : v.b) + '是這樣。');
            k++; setTimeout(q, 1300);
          } else {
            b.classList.add('wrong');
            setFb(msg, false, '再想想：' + v.a + '是不是' + f[0] + '？' + v.b + '是不是' + f[0] + '？');
          }
        };
        add(opts, b);
      });
      add(ask, opts);
    }
    function finish() {
      if (i === MP.venn.length - 1) markDone('venn');
      var sent = v.a + '像' + v.b + '，因為都' + v.why + '。';
      add(tail, h('div', { class: 'card', style: 'margin-top:12px' },
        h('div', { class: 'row' }, h('b', {}, '用句子公式說說看：'), sayBtn(sent)),
        h('div', { class: 'formula' }, h('span', { class: 'fa' }, v.a), ' 像 ', h('span', { class: 'fb' }, v.b), '，因為都 ', h('span', { class: 'fm' }, v.why), '。'),
        v.book ? h('p', {}, '📖 課本的句子：', h('b', {}, v.sent), ' ', sayBtn(v.sent)) : h('p', {}, '也可以說：', h('b', {}, v.sent), ' ', sayBtn(v.sent)),
        h('div', { class: 'row', style: 'margin-top:8px' },
          i + 1 < MP.venn.length ? h('button', { class: 'btn primary', onclick: function () { venn(i + 1); } }, '下一組 →') : h('a', { class: 'btn primary', href: '#/m/say' }, '下一站：說說看像什麼 →'))));
      speak(sent);
    }
    page('② 找一樣的地方', [
      h('div', { class: 'row' }, back(), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + MP.venn.length + ' 組'),
        MP.venn.map(function (x, j) { return h('button', { class: 'btn small' + (j === i ? ' primary' : ''), onclick: function () { venn(j); } }, x.a + '・' + x.b); })),
      h('h2', {}, '⭕ 找一樣的地方'),
      i === 0 ? h('div', { class: 'card', style: 'margin-bottom:12px' },
        h('div', { class: 'row' }, h('b', {}, '四張提示卡：從這四個方向找一樣的地方'), sayBtn('從形狀、顏色、動作、功能或感覺，找出兩樣東西一樣的地方。')),
        h('div', { class: 'cues', style: 'margin-top:8px' }, Object.keys(MP.cues).map(function (c) {
          var x = MP.cues[c]; return h('div', { class: 'cue show' }, h('span', { class: 'ci' }, x.icon), ' ', h('span', { class: 'cn' }, x.name), h('span', { class: 'ct' }, x.ask));
        }))) : null,
      h('div', { class: 'card' },
        h('div', { class: 'pair' },
          h('div', { class: 'side a' }, pic(v.a), h('div', {}, v.a), h('div', { class: 'muted', style: 'font-size:15px' }, '描寫的事物')),
          h('div', { style: 'font-size:28px' }, '和'),
          h('div', { class: 'side b' }, pic(v.b), h('div', {}, v.b), h('div', { class: 'muted', style: 'font-size:15px' }, '相似的事物'))),
        h('div', { class: 'venn' }, h('div', { class: 'c ca' }), h('div', { class: 'c cb' }),
          h('span', { class: 'lbl la' }, v.a), h('span', { class: 'lbl lb' }, v.b), za, zm, zb),
        ask, msg),
      tail
    ]);
    q();
  }

  // ── ③ 說說看像什麼 ──
  var order = [], oi = 0;
  function nextTopic() { if (oi >= order.length) { order = shuffle(MP.topics); oi = 0; } return order[oi++]; }
  function levelBar(onPick) {
    return h('div', { class: 'levels' }, [1, 2, 3].map(function (n) {
      return h('button', { class: 'btn small' + (S.level === n ? ' on' : ''), onclick: function () { S.level = n; save(S); onPick(); } },
        ['', '等級 1：選一選', '等級 2：提示卡＋公式', '等級 3：自己說'][n]);
    }));
  }
  function topicCard(tp, big, sayText) {
    return h('div', { class: 'topic' }, pic(tp.pic, 'big'), h('div', { class: 'tt' }, tp.t), big ? null : sayBtn(sayText || tp.t + '，像什麼？'));
  }
  function keep(tp, s, how) {
    S.mine.unshift({ k: 'm', t: tp.t, s: s, lv: S.level, how: how || '', d: new Date().toLocaleDateString('zh-TW') });
    S.mine = S.mine.slice(0, 200); save(S); markDone('say');
  }
  function say(tp) {
    tp = tp || nextTopic();
    var body = h('div'), msg = fb();
    var nextBtn = h('button', { class: 'btn primary', onclick: function () { say(); } }, '換下一張題目卡 →');
    if (S.level === 1) say1(tp, body, msg); else if (S.level === 2) say2(tp, body, msg); else say3(tp, body, msg);
    page('③ 說說看像什麼', [
      h('div', { class: 'row' }, back()),
      h('h2', {}, '🎴 說說看像什麼'),
      levelBar(function () { say(tp); }),
      h('div', { class: 'card', style: 'margin-top:12px' }, topicCard(tp), body, msg, h('div', { class: 'row center', style: 'margin-top:10px' }, nextBtn))
    ]);
    speak(tp.t + '，像什麼？');
  }
  // 等級 1：選像什麼（圖）→ 選為什麼像 → 念出整句
  function say1(tp, body, msg) {
    var v = pick(tp.v);
    var t1 = '「' + tp.t + '」像什麼？';
    add(body, h('div', { class: 'row center' }, h('b', {}, '1. ' + t1)));
    var o1 = h('div', { class: 'opts' }), step2 = h('div');
    shuffle([v.w].concat(tp.x)).forEach(function (o) {
      var b = h('button', { class: 'opt' }, pic(o, 'sm'), o);
      b.onclick = function () {
        if (step2.childNodes.length || b.classList.contains('wrong')) return;
        if (o !== v.w) { b.classList.add('wrong'); setFb(msg, false, '「' + o + '」和' + tp.t + '有一樣的地方嗎？再想想。'); return; }
        b.classList.add('right'); setFb(msg, true, '👍 對！像' + v.w + '。');
        var t2 = '為什麼像？' + tp.t + '和' + v.w + '，都……';
        add(step2, h('div', { class: 'row center' }, h('b', {}, '2. ' + t2), cueTag(v.cue)));
        var o2 = h('div', { class: 'opts' });
        shuffle([v.why].concat(v.no)).forEach(function (w) {
          var c = h('button', { class: 'opt txt' }, w);
          c.onclick = function () {
            if (c.classList.contains('wrong') || o2.dataset.done) return;
            if (w !== v.why) { c.classList.add('wrong'); setFb(msg, false, v.w + '是不是「' + w + '」？再想想。'); return; }
            c.classList.add('right'); o2.dataset.done = 1;
            var s = tp.t + '像' + v.w + '，因為都' + v.why + '。';
            add(step2, h('div', { class: 'formula' }, h('span', { class: 'fa' }, tp.t), ' 像 ', h('span', { class: 'fb' }, v.w), '，因為都 ', h('span', { class: 'fm' }, v.why), '。 ', sayBtn(s)));
            msg.className = 'feedback ok'; msg.textContent = '🎉 你造出一個譬喻句了！跟著念一次。';
            speak(s); keep(tp, s, '選');
          };
          add(o2, c);
        });
        add(step2, o2);
      };
      add(o1, b);
    });
    add(body, o1, step2);
  }
  // 等級 2：抽一張提示卡，照公式填兩格
  function say2(tp, body, msg) {
    var v = pick(tp.v), cue = MP.cues[v.cue];
    var i1 = h('input', { class: 'fin', placeholder: '像什麼？', 'aria-label': '像什麼' });
    var i2 = h('input', { class: 'fin', placeholder: '一樣的地方', 'aria-label': '一樣的地方', style: 'width:11em' });
    add(body,
      h('div', { class: 'row center', style: 'margin:10px 0' }, h('span', {}, '提示卡：'), h('span', { class: 'cue show', style: 'width:auto;min-height:0' }, cue.icon + ' ' + cue.name + '──' + cue.ask)),
      h('div', { class: 'formula' }, h('span', { class: 'fa' }, tp.t), ' 像 ', i1, ' ', micFor(i1), '，因為都 ', i2, ' ', micFor(i2), '。'),
      h('div', { class: 'muted center', style: 'font-size:16px;margin-top:4px' }, '可以打字，也可以按鍵盤上的 🎤 用說的。'));
    var out = h('div'), ref = h('div', { class: 'reveal' });
    var done = h('button', { class: 'btn primary', onclick: function () {
      var a = i1.value.trim(), b = i2.value.trim().replace(/^都/, '').replace(/[。，！]$/, '');
      if (!a || !b) { setFb(msg, false, '兩個空格都要寫喔。'); return; }
      if (a === tp.t || a === tp.pic) { setFb(msg, false, '要比成另一樣「不一樣」的東西喔。'); return; }
      var s = tp.t + '像' + a + '，因為都' + b + '。';
      selfCheck(out, msg, s, function () { keep(tp, s, '公式'); }, function () { i1.focus(); });
    } }, '完成，念給我聽');
    add(body, h('div', { class: 'row center', style: 'margin-top:10px' }, done,
      h('button', { class: 'btn', onclick: function () { showRef(ref, tp); } }, '👀 參考答案')), out, ref);
  }
  // 等級 3：自己說；需要時再打開提示卡、公式
  function say3(tp, body, msg) {
    var ta = h('textarea', { class: 'fin', placeholder: '「' + tp.t + '」像什麼？為什麼？', 'aria-label': '自己造句' });
    var hint = h('div'), lv = 0;
    var hb = h('button', { class: 'btn', onclick: function () {
      lv++;
      if (lv === 1) add(hint, h('div', { class: 'row center', style: 'margin:8px 0' }, Object.keys(MP.cues).map(cueTag)));
      if (lv === 2) { add(hint, h('div', { class: 'formula' }, h('span', { class: 'fa' }, tp.t), ' 像 ', h('span', { class: 'slot' }, '？'), '，因為都 ', h('span', { class: 'slot' }, '？'), '。')); hb.style.display = 'none'; }
    } }, '💡 提示');
    var out = h('div'), ref = h('div', { class: 'reveal' });
    add(body, h('div', { class: 'row', style: 'margin-top:10px' }, ta), h('div', { class: 'row center' }, micFor(ta), h('span', { class: 'muted', style: 'font-size:16px' }, '可以打字，也可以按鍵盤上的 🎤 用說的。')), hint);
    add(body, h('div', { class: 'row center', style: 'margin-top:10px' }, h('button', { class: 'btn primary', onclick: function () {
      var s = ta.value.trim().replace(/\s+/g, '');
      if (s.length < 6) { setFb(msg, false, '句子太短了，說說看像什麼、為什麼像。'); return; }
      if (!/像|好像|彷彿|如|似|般/.test(s)) { setFb(msg, false, '譬喻句要有「像、好像、彷彿」這類的詞喔。'); return; }
      if (!/[。！？]$/.test(s)) s += '。';
      selfCheck(out, msg, s, function () { keep(tp, s, '自己'); }, function () { ta.focus(); });
    } }, '完成，念給我聽'), hb, h('button', { class: 'btn', onclick: function () { showRef(ref, tp); } }, '👀 參考答案')), out, ref);
  }
  function selfCheck(out, msg, s, ok, redo) {
    out.innerHTML = ''; msg.className = 'feedback'; msg.textContent = '';
    speak(s);
    add(out, h('div', { class: 'formula', style: 'margin-top:10px' }, s, ' ', sayBtn(s)),
      h('div', { class: 'row center', style: 'margin-top:8px' }, h('span', {}, '聽聽看，兩樣東西真的有一樣的地方嗎？'),
        h('button', { class: 'btn', onclick: function () { ok(); out.innerHTML = ''; setFb(msg, true, '🎉 存到「我造的句子」了！'); } }, '👍 有，很通順'),
        h('button', { class: 'btn', onclick: function () { out.innerHTML = ''; redo(); } }, '✏️ 我要改改看')));
  }
  function showRef(ref, tp) {
    ref.innerHTML = '';
    add(ref, h('div', { class: 'card', style: 'background:var(--soft)' }, tp.v.map(function (v) {
      var s = tp.t + '像' + v.w + '，因為都' + v.why + '。';
      return h('div', { class: 'row', style: 'margin:6px 0' }, pic(v.w, 'sm'), cueTag(v.cue), h('span', { class: 'ref' }, s), sayBtn(s));
    }), h('div', { class: 'muted', style: 'font-size:16px' }, '只要說得出一樣的地方，別的答案也可以！')));
  }

  // ── 老師題目卡（投影） ──
  function teacher(tp) {
    tp = tp || nextTopic();
    var extra = h('div');
    page('🧑‍🏫 老師題目卡', h('div', { class: 'teacher' },
      h('div', { class: 'row' }, back(),
        h('button', { class: 'btn primary', onclick: function () { teacher(); } }, '🎲 換一張'),
        h('button', { class: 'btn', onclick: function () { extra.innerHTML = ''; add(extra, h('div', { class: 'cues', style: 'margin-top:12px' }, Object.keys(MP.cues).map(function (c) { var x = MP.cues[c]; return h('div', { class: 'cue show' }, h('span', { class: 'ci' }, x.icon), ' ', h('span', { class: 'cn' }, x.name), h('span', { class: 'ct' }, x.ask)); }))); } }, '💡 提示卡'),
        h('button', { class: 'btn', onclick: function () { extra.innerHTML = ''; add(extra, h('div', { class: 'formula', style: 'margin-top:12px' }, h('span', { class: 'fa' }, tp.t), ' 像 ', h('span', { class: 'slot' }, '？'), '，因為都 ', h('span', { class: 'slot' }, '？'), '。'), h('div', { class: 'muted', style: 'margin-top:8px' }, '「像」也可以換成：' + MP.keywords.filter(function (k) { return k !== '像'; }).join('、'))); } }, '📝 公式'),
        h('button', { class: 'btn', onclick: function () { showRef(extra, tp); } }, '👀 參考答案')),
      h('div', { class: 'card', style: 'margin-top:12px' }, topicCard(tp, true), extra),
      h('div', { class: 'row', style: 'margin-top:12px' }, MP.topics.map(function (x) { return h('button', { class: 'btn small' + (x === tp ? ' primary' : ''), onclick: function () { teacher(x); } }, x.t); }))));
  }

  // ── ④ 是不是譬喻？（分辨：譬喻、在猜、同一類）──
  var RULE = '先過第一關：把「像」換成「好像」，後面接的是一件事，那是在猜，不是譬喻。再過第二關：前後兩樣是同一類，例如人和人，那是長得相像，不是譬喻。兩關都過，才是譬喻。';
  function judgeIntro() {
    page('④ 是不是譬喻？', [
      back(), h('h2', {}, '⚖️ 是不是譬喻？'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('span', {}, '有譬喻關鍵字（像、好像、彷彿、是……）的句子，不一定是譬喻。要過兩關檢查：'), sayBtn(RULE)),
        h('div', { class: 'rule' },
          h('div', { style: 'background:var(--b-soft)' }, h('b', {}, '第一關：換字檢查'), h('br'), '關鍵字後面接的是', h('b', {}, '一件事'), '，可以換成「大概」？', h('br'), '→ 是在', h('b', {}, '猜'), '（似乎），不是譬喻。', h('br'), h('span', { class: 'muted' }, '例：小貓像是快睡著了。')),
          h('div', { style: 'background:var(--a-soft)' }, h('b', {}, '第二關：同類檢查'), h('br'), '前後兩樣是', h('b', {}, '同一類'), '（人和人、狗和狗）？', h('br'), '→ ', h('b', {}, '不是譬喻'), '。', h('br'), h('span', { class: 'muted' }, '例：小宇長得像他的爸爸。他是我的哥哥。')),
          h('div', { style: 'background:var(--both-soft)' }, h('b', {}, '兩關都過'), h('br'), '兩樣', h('b', {}, '不一樣'), '的東西，有一樣的地方', h('br'), '→ ', h('b', {}, '是譬喻！'), h('br'), h('span', { class: 'muted' }, '例：河流像臍帶。'))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: function () { judge(jRound(MP.judge, jPool), 0, 0); } }, '開始檢查（7 句）→')))
    ]);
  }
  // 第④站一回 7 句（資源班學生注意力），輪流出、不重複
  var J_ROUND = 7, jPool = [];
  function jRound(src, pool) { if (pool.length < J_ROUND) { pool.length = 0; shuffle(src).forEach(function (x) { pool.push(x); }); } return pool.splice(0, J_ROUND); }
  function mark(s, kw) {
    var m = kw ? [kw] : s.match(/像是|好像|彷彿|如同|宛如|好比|像/);
    if (!m) return [s];
    var k = s.indexOf(m[0]);
    return [s.slice(0, k), h('u', {}, m[0]), s.slice(k + m[0].length)];
  }
  function judge(list, i, score) {
    if (i >= list.length) return judgeEnd(list.length, score);
    var j = list[i], msg = fb(), stage = h('div'), first = true;
    var c1 = h('span', { class: 'check cur' }, '第一關 換字'), c2 = h('span', { class: 'check' }, '第二關 同類');
    var nextBtn = h('button', { class: 'btn primary', style: 'display:none', onclick: function () { judge(list, i + 1, score + (first ? 1 : 0)); } }, i + 1 < list.length ? '下一句 →' : '看結果 →');
    function ask(text, opts, right, onRight, wrongTip) {
      stage.innerHTML = '';
      msg.className = 'feedback'; msg.textContent = '';  // 換下一關時，上一關的提示要清掉
      add(stage, h('div', { class: 'row center', style: 'font-size:22px' }, h('b', {}, text), sayBtn(text)));
      var box = h('div', { class: 'opts' });
      opts.forEach(function (o, k) {
        var b = h('button', { class: 'opt txt' }, o);
        b.onclick = function () {
          if (b.classList.contains('wrong') || box.dataset.done) return;
          if (k === right) { b.classList.add('right'); box.dataset.done = 1; onRight(); }
          else { b.classList.add('wrong'); first = false; setFb(msg, false, wrongTip); }
        };
        add(box, b);
      });
      add(stage, box);
    }
    function result(cls, title, why) {
      var r = h('div', { class: 'result ' + cls }, h('b', {}, title), h('br'), why, ' ', sayBtn(title + '。' + why));
      add(stage, r); speak(title + '。' + why);
      msg.className = 'feedback'; msg.textContent = '';
      nextBtn.style.display = '';
    }
    // 第一關：關鍵字後面接的是東西，還是一件事？
    var kw = j.kw || (j.s.match(/像是|好像|彷彿|如同|宛如|好比|像/) || ['像'])[0];
    ask('「' + kw + '」後面接的是什麼？', ['一樣東西、一個人', '一件事（猜猜看發生什麼事）'], j.k === 'guess' ? 1 : 0, function () {
      if (j.k === 'guess') {
        c1.className = 'check cur';
        return result('guess', '不是譬喻：這是在「猜」', '「' + kw + '」後面接的是一件事「' + j.after + '」。換成「大概、好像」也通：' + j.swap);
      }
      c1.className = 'check pass'; c2.className = 'check cur';
      // 第二關：前後是同一類嗎？
      ask('「' + j.a + '」和「' + j.b + '」是同一類嗎？', ['是同一類', '不是同一類'], j.k === 'same' ? 0 : 1, function () {
        if (j.k === 'same') return result('same', '不是譬喻：前後是同一類', '「' + j.a + '」和「' + j.b + '」' + j.kind + '，是同一類。');
        c2.className = 'check pass';
        result('meta', '🎉 是譬喻！', '「' + j.a + '」和「' + j.b + '」不一樣，但是' + j.why + '。');
      }, j.k === 'same' ? '想想看：「' + j.a + '」和「' + j.b + '」是不是同一種？' : '「' + j.a + '」和「' + j.b + '」是同一種東西嗎？');
    }, j.k === 'guess' ? '把「' + kw + '」換成「大概」念念看，後面是不是在猜發生什麼事？' : '「' + kw + '」後面的「' + j.b + '」是一樣東西（或人）喔。');
    page('④ 是不是譬喻？', [
      h('div', { class: 'row' }, back(), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + list.length + ' 句')),
      h('div', { class: 'card', style: 'margin-top:10px' },
        h('div', { class: 'sentence' }, mark(j.s, j.kw), ' ', sayBtn(j.s)),
        h('div', { class: 'checks' }, c1, c2),
        stage, msg, h('div', { class: 'row center', style: 'margin-top:10px' }, nextBtn))
    ]);
    speak(j.s);
  }
  function judgeEnd(n, score) {
    markDone('judge');
    var stars = score >= n - 1 ? 3 : score >= n * 0.7 ? 2 : 1;
    page('④ 是不是譬喻？', [
      back(), h('h2', {}, '🎉 檢查完了！'),
      h('div', { class: 'card center' },
        h('div', { class: 'stars' }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
        h('p', {}, n + ' 句裡，一次就答對 ' + score + ' 句。'),
        h('div', { class: 'row center' },
          h('button', { class: 'btn primary', onclick: function () { judge(jRound(MP.judge, jPool), 0, 0); } }, '再來 7 句'),
          h('button', { class: 'btn', onclick: judgeIntro }, '看兩關規則')))
    ]);
  }

  // ── 我造的句子 ──
  function mine() {
    page('📒 我造的句子', [
      back('#/'), h('h2', {}, '📒 我造的句子'),
      S.mine.length ? h('div', { class: 'card' }, h('ol', { class: 'mine' }, S.mine.map(function (m) {
        return h('li', {}, h('span', { class: 'row' }, h('span', {}, m.s), sayBtn(m.s), h('span', { class: 'muted', style: 'font-size:15px' }, (m.k === 's' ? '摹寫' : '譬喻') + '・' + m.d + '・等級 ' + m.lv)));
      })), h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn small', onclick: function () {
        if (confirm('要清除這台 iPad 上的所有句子嗎？')) { S.mine = []; save(S); mine(); }
      } }, '🗑 全部清除'))) : h('div', { class: 'card muted' }, '還沒有句子，到「③ 說說看」造句吧！')
    ]);
  }

  // ══════════ 摹寫 ══════════
  var MX = window.MX;
  function senseTag(k) { var x = MX.senses[k]; return h('span', { class: 'chip' }, x.icon + ' ' + x.name); }
  function senseCards() {
    return h('div', { class: 'cues senses' }, Object.keys(MX.senses).map(function (k) {
      var x = MX.senses[k];
      return h('div', { class: 'cue show' }, h('span', { class: 'ci' }, x.icon), ' ', h('span', { class: 'cn' }, x.long), h('span', { class: 'ct' }, x.ask));
    }));
  }
  var SBACK = '#/s';
  var S_STEPS = [
    { k: 'guess', n: '①', t: '🔍 猜猜我在哪裡', d: '翻開五感提示卡，猜猜是哪裡、是什麼', c: '#2F6DB0' },
    { k: 'scope', n: '②', t: '🔎 五感放大鏡', d: '把句子放進五種感覺的格子，合起來就是一段摹寫', c: '#6A5AB0' },
    { k: 'say', n: '③', t: '🎴 說說看', d: '看題目卡，用一種感覺仔細說出來（等級 1～3）', c: '#D08A2E' },
    { k: 'judge', n: '④', t: '⚖️ 有沒有摹寫？', d: '過兩關檢查：有沒有寫出感覺？是哪一種感覺？', c: '#2E8B57' }
  ];
  var S_WHAT = '把眼睛看到、耳朵聽到、鼻子聞到、嘴巴吃到、身體摸到的感覺，仔細的寫出來，這就是摹寫。';
  function senseHome() {
    page('👀 摹寫', [
      h('div', { class: 'row' }, h('a', { class: 'btn small', href: '#/' }, '← 修辭小教室')),
      h('div', { class: 'hero' }, h('h1', {}, '👀 摹寫'), h('div', { class: 'muted' }, '用五種感覺，把東西寫得像真的一樣')),
      h('div', { class: 'card', style: 'margin-bottom:16px' },
        h('div', { class: 'row' }, h('b', {}, '什麼是摹寫？'), sayBtn(S_WHAT)),
        h('div', {}, '把', h('b', {}, '看到、聽到、聞到、吃到、摸到'), '的感覺，', h('b', {}, '仔細'), '的寫出來。'),
        h('div', { class: 'row center', style: 'margin:8px 0;font-size:28px' }, Object.keys(MX.senses).map(function (k) { return h('span', { title: MX.senses[k].long }, MX.senses[k].icon); })),
        h('div', { class: 'formula' }, '只說「很好吃」→ ', h('span', { class: 'fm' }, '吃起來甜甜的、有濃濃的奶油香'))),
      h('div', { class: 'menu' }, S_STEPS.map(function (s) {
        return h('a', { href: '#/s/' + s.k, style: '--c:' + s.c },
          S.done['s-' + s.k] ? h('span', { class: 'done', title: '做過了' }, '⭐') : null,
          h('span', { class: 'n' }, '第 ' + s.n + ' 站'), h('span', { class: 't' }, s.t), h('span', { class: 'd' }, s.d));
      })),
      h('div', { class: 'row', style: 'margin-top:18px' },
        h('a', { class: 'btn', href: '#/s/teacher' }, '🧑‍🏫 老師題目卡（投影）'),
        h('a', { class: 'btn', href: '#/mine' }, '📒 我造的句子（' + S.mine.length + '）'))
    ]);
  }

  // ① 猜猜我在哪裡
  function sGuess(i) {
    var list = MX.riddles;
    if (i >= list.length) return sGuessEnd();
    var r = list[i], shown = 1, solved = false, msg = fb();
    var cueBox = h('div', { class: 'cues' }), optBox = h('div', { class: 'opts' });
    var moreBtn = h('button', { class: 'btn' }, '👉 再翻一張提示');
    var nextBtn = h('button', { class: 'btn primary', style: 'display:none', onclick: function () { sGuess(i + 1); } }, i + 1 < list.length ? '下一題 →' : '看結果 →');
    function drawCues() {
      cueBox.innerHTML = '';
      r.clues.forEach(function (c, k) {
        var x = MX.senses[c[0]], open = k < shown || solved;
        add(cueBox, h('button', { class: 'cue ' + (open ? 'show' : 'hide'), onclick: function () { if (open) speak(c[1]); else if (k === shown) more(); } },
          h('span', { class: 'ci' }, x.icon), ' ', h('span', { class: 'cn' }, x.long), h('span', { class: 'ct' }, open ? c[1] : '？')));
      });
      moreBtn.style.display = shown < r.clues.length && !solved ? '' : 'none';
    }
    function more() { if (shown < r.clues.length) { shown++; drawCues(); speak(r.clues[shown - 1][1]); } }
    moreBtn.onclick = more;
    shuffle(r.opts).forEach(function (o) {
      var b = h('button', { class: 'opt' }, pic(o), o);
      b.onclick = function () {
        if (solved || b.classList.contains('wrong')) return;
        if (o === r.ans) {
          solved = true; b.classList.add('right'); drawCues();
          setFb(msg, true, '🎉 答對了！是「' + r.ans + '」，你看了 ' + shown + ' 張提示。');
          nextBtn.style.display = '';
        } else {
          b.classList.add('wrong');
          setFb(msg, false, '不是「' + o + '」喔，' + (shown < r.clues.length ? '再翻一張提示看看。' : '再看一次提示。'));
        }
      };
      add(optBox, b);
    });
    drawCues();
    page('① 猜猜我在哪裡', [
      h('div', { class: 'row' }, back(SBACK), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + list.length + ' 題')),
      h('h2', {}, '🔍 猜猜我在哪裡？'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('span', {}, '一張一張翻感覺卡，覺得知道了，就點下面的答案。'), sayBtn('一張一張翻感覺卡，覺得知道了，就點下面的答案。')),
        h('div', { style: 'margin:12px 0' }, cueBox),
        h('div', { class: 'row center' }, moreBtn),
        optBox, msg, h('div', { class: 'row center' }, nextBtn))
    ]);
    speak(r.clues[0][1]);
  }
  function sGuessEnd() {
    markDone('s-guess');
    var t = '你沒有看到圖，只聽到看、聽、聞、吃、摸的感覺，就猜出來了。把感覺仔細寫出來，讀的人就好像真的在那裡，這就是摹寫。';
    page('① 猜猜我在哪裡', [
      back(SBACK), h('h2', {}, '🎉 全部猜完了！'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('b', {}, '想一想'), sayBtn(t)),
        h('p', {}, '你沒有看到圖，只讀了', h('b', {}, '感覺'), '，就猜出來了！'),
        h('p', {}, '把感覺', h('b', {}, '仔細'), '寫出來，讀的人就好像真的在那裡──這就是', h('b', {}, '摹寫'), '。'),
        senseCards(),
        h('div', { class: 'row', style: 'margin-top:14px' }, h('a', { class: 'btn primary', href: '#/s/scope' }, '下一站：五感放大鏡 →')))
    ]);
  }

  // ② 五感放大鏡：每一句選是哪一種感覺，放進格子，最後合成一段
  function sScope(i) {
    var sc = MX.scenes[i], k = 0, msg = fb(), order = shuffle(sc.f);
    var boxes = {}, grid = h('div', { class: 'sense-grid' });
    Object.keys(MX.senses).forEach(function (s) {
      var x = MX.senses[s];
      boxes[s] = h('div', { class: 'sbox-body' });
      add(grid, h('div', { class: 'sbox' }, h('div', { class: 'sbox-head' }, x.icon + ' ' + x.long), boxes[s]));
    });
    var ask = h('div'), tail = h('div');
    function q() {
      ask.innerHTML = ''; msg.className = 'feedback'; msg.textContent = '';
      if (k >= order.length) return finish();
      var f = order[k], text = '「' + f[0] + '」是用哪一種感覺？';
      add(ask, h('div', { class: 'row center', style: 'font-size:24px' }, h('b', {}, text), sayBtn(text)));
      var opts = h('div', { class: 'opts' });
      Object.keys(MX.senses).forEach(function (s) {
        var x = MX.senses[s], b = h('button', { class: 'opt txt' }, x.icon + ' ' + x.name);
        b.onclick = function () {
          if (b.classList.contains('wrong') || opts.dataset.done) return;
          if (s === f[1]) {
            b.classList.add('right'); opts.dataset.done = 1;
            add(boxes[s], h('span', { class: 'tag both' }, f[0]));
            setFb(msg, true, '👍 對！是' + x.long + '。');
            k++; setTimeout(q, 1200);
          } else {
            b.classList.add('wrong');
            setFb(msg, false, '想一想：「' + f[0] + '」是用眼睛、耳朵、鼻子、嘴巴，還是身體感覺到的？');
          }
        };
        add(opts, b);
      });
      add(ask, opts);
    }
    function finish() {
      if (i === MX.scenes.length - 1) markDone('s-scope');
      var para = '在' + sc.t + '，' + sc.f.map(function (f) { return f[0]; }).join('，') + '。';
      add(tail, h('div', { class: 'card', style: 'margin-top:12px' },
        h('div', { class: 'row' }, h('b', {}, '五種感覺合起來，就是一段摹寫：'), sayBtn(para)),
        h('div', { class: 'formula', style: 'text-align:left' }, para),
        h('p', {}, '念念看，是不是好像真的在' + sc.t + '？'),
        h('div', { class: 'row' }, i + 1 < MX.scenes.length ? h('button', { class: 'btn primary', onclick: function () { sScope(i + 1); } }, '下一個地方 →') : h('a', { class: 'btn primary', href: '#/s/say' }, '下一站：說說看 →'))));
      speak(para);
    }
    page('② 五感放大鏡', [
      h('div', { class: 'row' }, back(SBACK), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + MX.scenes.length + ' 個地方'),
        MX.scenes.map(function (x, j) { return h('button', { class: 'btn small' + (j === i ? ' primary' : ''), onclick: function () { sScope(j); } }, x.t); })),
      h('h2', {}, '🔎 五感放大鏡：' + sc.t),
      h('div', { class: 'card' },
        h('div', { class: 'row center' }, pic(sc.pic, 'big')),
        grid, ask, msg),
      tail
    ]);
    q();
  }

  // ③ 說說看（題目卡）
  var sOrder = [], sOi = 0;
  function sNextTopic() { if (sOi >= sOrder.length) { sOrder = shuffle(MX.topics); sOi = 0; } return sOrder[sOi++]; }
  var VAGUE = /^(很|好|真|非常)?(好|漂亮|好吃|好聽|好看|棒|美|不錯|香|開心)(的|喔|啊)?$/;
  function sKeep(tp, s) {
    S.mine.unshift({ k: 's', t: tp.t, s: s, lv: S.level, d: new Date().toLocaleDateString('zh-TW') });
    S.mine = S.mine.slice(0, 200); save(S); markDone('s-say');
  }
  function sRef(ref, tp) {
    ref.innerHTML = '';
    add(ref, h('div', { class: 'card', style: 'background:var(--soft)' }, Object.keys(tp.s).map(function (k) {
      return h('div', { class: 'row', style: 'margin:6px 0' }, senseTag(k), h('span', { class: 'ref' }, tp.s[k].s), sayBtn(tp.s[k].s));
    }), h('div', { class: 'muted', style: 'font-size:16px' }, '只要寫出仔細的感覺，別的答案也可以！')));
  }
  function sSay(tp) {
    tp = tp || sNextTopic();
    var body = h('div'), msg = fb(), sk = pick(Object.keys(tp.s)), x = MX.senses[sk];
    var nextBtn = h('button', { class: 'btn primary', onclick: function () { sSay(); } }, '換下一張題目卡 →');
    var card = h('div', { class: 'row center', style: 'margin:10px 0' }, h('span', {}, '感覺卡：'), h('span', { class: 'cue show', style: 'width:auto;min-height:0' }, x.icon + ' ' + x.long + '──' + x.ask));
    if (S.level === 1) {
      var t1 = '「' + tp.t + '」' + x.verb + '怎麼樣？';
      add(body, card, h('div', { class: 'row center' }, h('b', {}, t1), sayBtn(t1)));
      var o = h('div', { class: 'opts' }), out = h('div');
      var right = tp.s[sk].w, others = [];
      MX.topics.forEach(function (t2) { Object.keys(t2.s).forEach(function (k2) { if (k2 !== sk && others.indexOf(t2.s[k2].w) < 0) others.push(t2.s[k2].w); }); });
      // 挑長度最接近答案的兩個（同一種感覺的不用）
      var wrongs = shuffle(others).sort(function (a, b) { return Math.abs(a.length - right.length) - Math.abs(b.length - right.length); }).slice(0, 2);
      shuffle([right].concat(wrongs)).forEach(function (w) {
        var b = h('button', { class: 'opt txt' }, w);
        b.onclick = function () {
          if (b.classList.contains('wrong') || o.dataset.done) return;
          if (w !== tp.s[sk].w) { b.classList.add('wrong'); setFb(msg, false, '「' + w + '」是' + x.name + '得到的嗎？再想想。'); return; }
          b.classList.add('right'); o.dataset.done = 1;
          var s = tp.s[sk].s;
          add(out, h('div', { class: 'formula' }, s, ' ', sayBtn(s)));
          msg.className = 'feedback ok'; msg.textContent = '🎉 你寫出一句摹寫了！跟著念一次。';
          speak(s); sKeep(tp, s);
        };
        add(o, b);
      });
      add(body, o, out);
    } else if (S.level === 2) {
      var inp = h('input', { class: 'fin', placeholder: '怎麼樣？', 'aria-label': '寫出感覺', style: 'width:12em' });
      var out2 = h('div'), ref = h('div', { class: 'reveal' });
      add(body, card,
        h('div', { class: 'formula' }, h('span', { class: 'fa' }, tp.t), '，' + x.verb + ' ', inp, ' ', micFor(inp), '。'),
        h('div', { class: 'muted center', style: 'font-size:16px;margin-top:4px' }, '可以打字，也可以按鍵盤上的 🎤 用說的。'),
        h('div', { class: 'row center', style: 'margin-top:10px' },
          h('button', { class: 'btn primary', onclick: function () {
            var a = inp.value.trim().replace(/[。，！]$/, '');
            if (!a) { setFb(msg, false, '空格要寫喔。'); return; }
            if (VAGUE.test(a)) { setFb(msg, false, '「' + a + '」太簡單了，寫得更仔細一點：是什麼顏色、聲音、味道？'); return; }
            var s = tp.t + '，' + x.verb + a + '。';
            selfCheck(out2, msg, s, function () { sKeep(tp, s); }, function () { inp.focus(); });
          } }, '完成，念給我聽'),
          h('button', { class: 'btn', onclick: function () { sRef(ref, tp); } }, '👀 參考答案')), out2, ref);
    } else {
      var ta = h('textarea', { class: 'fin', placeholder: '「' + tp.t + '」看起來、聽起來、聞起來、吃起來、摸起來怎麼樣？', 'aria-label': '自己寫摹寫句' });
      var hint = h('div'), lv = 0, out3 = h('div'), ref3 = h('div', { class: 'reveal' });
      var hb = h('button', { class: 'btn', onclick: function () {
        lv++;
        if (lv === 1) add(hint, senseCards());
        if (lv === 2) { add(hint, h('div', { class: 'formula', style: 'margin-top:8px' }, h('span', { class: 'fa' }, tp.t), '，' + x.verb + ' ', h('span', { class: 'slot' }, '？'), '。')); hb.style.display = 'none'; }
      } }, '💡 提示');
      add(body, h('div', { class: 'row', style: 'margin-top:10px' }, ta), h('div', { class: 'row center' }, micFor(ta), h('span', { class: 'muted', style: 'font-size:16px' }, '可以打字，也可以按鍵盤上的 🎤 用說的。')), hint,
        h('div', { class: 'row center', style: 'margin-top:10px' }, h('button', { class: 'btn primary', onclick: function () {
          var s = ta.value.trim().replace(/\s+/g, '');
          if (s.length < 6) { setFb(msg, false, '句子太短了，仔細說說看到、聽到、聞到、吃到或摸到什麼。'); return; }
          if (!/[。！？]$/.test(s)) s += '。';
          selfCheck(out3, msg, s, function () { sKeep(tp, s); }, function () { ta.focus(); });
        } }, '完成，念給我聽'), hb, h('button', { class: 'btn', onclick: function () { sRef(ref3, tp); } }, '👀 參考答案')), out3, ref3);
    }
    page('③ 說說看', [
      h('div', { class: 'row' }, back(SBACK)),
      h('h2', {}, '🎴 說說看'),
      levelBar(function () { sSay(tp); }),
      h('div', { class: 'card', style: 'margin-top:12px' }, topicCard(tp, false, tp.t + '。' + x.ask), body, msg, h('div', { class: 'row center', style: 'margin-top:10px' }, nextBtn))
    ]);
    speak(tp.t + '。' + x.ask);
  }
  function sTeacher(tp) {
    tp = tp || sNextTopic();
    var extra = h('div');
    page('🧑‍🏫 老師題目卡・摹寫', h('div', { class: 'teacher' },
      h('div', { class: 'row' }, back(SBACK),
        h('button', { class: 'btn primary', onclick: function () { sTeacher(); } }, '🎲 換一張'),
        h('button', { class: 'btn', onclick: function () { extra.innerHTML = ''; add(extra, h('div', { style: 'margin-top:12px' }, senseCards())); } }, '💡 五感卡'),
        h('button', { class: 'btn', onclick: function () { sRef(extra, tp); } }, '👀 參考答案')),
      h('div', { class: 'card', style: 'margin-top:12px' }, topicCard(tp, true), extra),
      h('div', { class: 'row', style: 'margin-top:12px' }, MX.topics.map(function (x) { return h('button', { class: 'btn small' + (x === tp ? ' primary' : ''), onclick: function () { sTeacher(x); } }, x.t); }))));
  }

  // ④ 有沒有摹寫？
  var S_RULE = '第一關：有沒有仔細寫出感覺？只說很好吃、很漂亮、很開心，不是摹寫。第二關：是哪一種感覺？看、聽、聞、吃，還是摸？';
  function sJudgeIntro() {
    page('④ 有沒有摹寫？', [
      back(SBACK), h('h2', {}, '⚖️ 有沒有摹寫？'),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('span', {}, '每一句都要過兩關檢查：'), sayBtn(S_RULE)),
        h('div', { class: 'rule' },
          h('div', { style: 'background:var(--b-soft)' }, h('b', {}, '第一關：有沒有仔細寫出感覺？'), h('br'), '只說「很好吃、很漂亮、很好聽、很開心」', h('br'), '→ ', h('b', {}, '不是摹寫'), '。', h('br'), h('span', { class: 'muted' }, '例：這個麵包很好吃。')),
          h('div', { style: 'background:var(--both-soft)' }, h('b', {}, '第二關：是哪一種感覺？'), h('br'), '👀 看　👂 聽　👃 聞　👅 吃　✋ 摸', h('br'), h('span', { class: 'muted' }, '例：雨滴滴答答的打在玻璃上。→ 👂 聽'))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: function () { sJudge(jRound(MX.judge, sjPool), 0, 0); } }, '開始檢查（7 句）→')))
    ]);
  }
  var sjPool = [];
  function sJudge(list, i, score) {
    if (i >= list.length) return sJudgeEnd(list.length, score);
    var j = list[i], msg = fb(), stage = h('div'), first = true;
    var c1 = h('span', { class: 'check cur' }, '第一關 有沒有感覺'), c2 = h('span', { class: 'check' }, '第二關 哪一種');
    var nextBtn = h('button', { class: 'btn primary', style: 'display:none', onclick: function () { sJudge(list, i + 1, score + (first ? 1 : 0)); } }, i + 1 < list.length ? '下一句 →' : '看結果 →');
    function result(cls, title, why) {
      add(stage, h('div', { class: 'result ' + cls }, h('b', {}, title), h('br'), why, ' ', sayBtn(title + '。' + why)));
      speak(title + '。' + why);
      msg.className = 'feedback'; msg.textContent = '';
      nextBtn.style.display = '';
    }
    function ask2() {
      stage.innerHTML = ''; msg.className = 'feedback'; msg.textContent = '';  // 上一關的提示清掉
      var t = '這句話是用哪一種感覺寫的？';
      add(stage, h('div', { class: 'row center', style: 'font-size:22px' }, h('b', {}, t), sayBtn(t)));
      var box = h('div', { class: 'opts' });
      Object.keys(MX.senses).forEach(function (s) {
        var x = MX.senses[s], b = h('button', { class: 'opt txt' }, x.icon + ' ' + x.name);
        b.onclick = function () {
          if (b.classList.contains('wrong') || box.dataset.done) return;
          if (s === j.k) { b.classList.add('right'); box.dataset.done = 1; c2.className = 'check pass'; result('meta', '🎉 是摹寫！', '用了' + x.long + '：「' + j.key + '」。'); }
          else { b.classList.add('wrong'); first = false; setFb(msg, false, '找找看「' + j.key + '」，是用身體哪個地方感覺到的？'); }
        };
        add(box, b);
      });
      add(stage, box);
    }
    var t1 = '有沒有仔細寫出看到、聽到、聞到、吃到或摸到的感覺？';
    add(stage, h('div', { class: 'row center', style: 'font-size:22px' }, h('b', {}, t1), sayBtn(t1)));
    var box1 = h('div', { class: 'opts' });
    [['有，寫出了感覺', true], ['沒有，只說好不好', false]].forEach(function (o) {
      var b = h('button', { class: 'opt txt' }, o[0]);
      b.onclick = function () {
        if (b.classList.contains('wrong') || box1.dataset.done) return;
        if (o[1] === (j.k !== 'none')) {
          b.classList.add('right'); box1.dataset.done = 1;
          if (j.k === 'none') result('guess', '不是摹寫', j.tip + '可以改成：' + j.fix);
          else { c1.className = 'check pass'; c2.className = 'check cur'; setTimeout(ask2, 600); }
        } else {
          b.classList.add('wrong'); first = false;
          setFb(msg, false, j.k === 'none' ? '「很好、很漂亮」只說了好不好，有寫出是什麼顏色、聲音、味道嗎？' : '找找看，句子裡有「' + j.key + '」喔。');
        }
      };
      add(box1, b);
    });
    add(stage, box1);
    page('④ 有沒有摹寫？', [
      h('div', { class: 'row' }, back(SBACK), h('span', { class: 'progress' }, '第 ' + (i + 1) + ' / ' + list.length + ' 句')),
      h('div', { class: 'card', style: 'margin-top:10px' },
        h('div', { class: 'sentence' }, j.s, ' ', sayBtn(j.s)),
        h('div', { class: 'checks' }, c1, c2),
        stage, msg, h('div', { class: 'row center', style: 'margin-top:10px' }, nextBtn))
    ]);
    speak(j.s);
  }
  function sJudgeEnd(n, score) {
    markDone('s-judge');
    var stars = score >= n - 1 ? 3 : score >= n * 0.7 ? 2 : 1;
    page('④ 有沒有摹寫？', [
      back(SBACK), h('h2', {}, '🎉 檢查完了！'),
      h('div', { class: 'card center' },
        h('div', { class: 'stars' }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
        h('p', {}, n + ' 句裡，一次就答對 ' + score + ' 句。'),
        h('div', { class: 'row center' },
          h('button', { class: 'btn primary', onclick: function () { sJudge(jRound(MX.judge, sjPool), 0, 0); } }, '再來 7 句'),
          h('button', { class: 'btn', onclick: sJudgeIntro }, '看兩關規則')))
    ]);
  }

  // ── 路由 ──
  function route() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    var r = (location.hash || '#/').slice(2);
    if (r === 'm') metaHome();
    else if (r === 'm/guess') guess(0);
    else if (r === 'm/venn') venn(0);
    else if (r === 'm/say') say();
    else if (r === 'm/teacher') teacher();
    else if (r === 'm/judge') judgeIntro();
    else if (r === 's') senseHome();
    else if (r === 's/guess') sGuess(0);
    else if (r === 's/scope') sScope(0);
    else if (r === 's/say') sSay();
    else if (r === 's/teacher') sTeacher();
    else if (r === 's/judge') sJudgeIntro();
    else if (r === 'mine') mine();
    else home();
  }
  window.addEventListener('hashchange', route);
  route();
})();
