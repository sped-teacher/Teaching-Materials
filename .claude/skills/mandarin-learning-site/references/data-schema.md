# 各課資料規格（data/lessonXX.js）

> 這份是「欄位長什麼樣子」。每個欄位**內容怎麼寫、老師的規則**看 `content-rules.md`。
> 寫的時候一定打開現成的範本對照：`mandarin/data/lesson07.js`（散文、分類）、`lesson10.js`（詩、詩句解碼）、`lesson12.js`（故事、排順序）、`lesson02.js`（有短句、同色兩塊積木）。
> 程式在 `assets/app.js`，欄位用法不確定就 grep 那個欄位名。

## 目錄
1. 檔頭與基本欄位
2. chars 生字
3. charParts 拆字解說＋改錯字
4. words 語詞、textWords 課文詞語
5. phrases 短語短句（積木）
6. sentences 句型
7. reading 讀懂課文
8. families、lookalikes 形近字
9. idioms 成語、rhetoric 修辭、listening 聽聽看
10. 共用資料檔

**通則**：選項陣列的**第一個是正確答案**（網頁依等級取數量、打亂）。注音音節之間用半形空白、輕聲點放最前面（˙ㄉㄜ）。

---

## 1. 檔頭與基本欄位

```js
/*
 * 第七課〈為生命找出口〉教學資料
 * 內容依康軒版國語五上第七課整理，語意、例句、題目皆為自行改寫，不含課文全文。
 * 每個選項陣列的第一個是正確答案，網頁會依等級取用數量並打亂順序。
 */
window.LESSONS = window.LESSONS || {};
window.LESSONS['07'] = {
  id: '07', no: 7, title: '為生命找出口',
  pediaId: '…',   // 教育百科「生字詞彙表」本課 TextNameId（延伸資源連結用）
  focus: '一句話：這課要學會什麼（含本課句型）',
  chars: [...], charParts: {...}, words: [...], textWords: [...],
  phrases: [...], sentences: [...], reading: {...},
  families: [...], lookalikes: [...], rhetoric: [...], listening: [...], idioms: [...]
};
```

## 2. chars 生字

```js
{ c: '洲', zy: 'ㄓㄡ', radical: '水', rform: '氵', strokes: 9, words: ['非洲', '亞洲', '沙洲'], cue: '非洲的洲',
  poly: [{ zy: 'ㄓㄨㄥˋ', words: ['重要'] }] }   // poly：多音字的其他念法（依出版社〈字音字形〉），沒有就不寫
```
- `rform`：部首在字裡的寫法和部首本字不同時才寫（氵、扌、忄、阝、辶…）。
- `cue`：聽音選字時念的提示「○○的○」。

## 3. charParts 拆字解說＋改錯字（以生字為 key）

```js
charParts: {
  '逆': { t: 'xs1',
         parts: [{ p: '辶', m: '走路', r: 1 }, { p: '屰', s: '屰 ㄋㄧˋ' }],
         say: '逆，左邊是走字旁，跟走路有關；右邊的屰……念起來一樣。跟方向相反，就是逆，像逆風。',
         fix: { s: '我們頂著送風往前騎。', w: '送', h: '逆風是跟方向相反，右邊是「屰」，像倒過來的人。' } },
  '競': { t: 'hy', parts: [...], pic: '字源_競', say: '…', fix: {...} }
}
```
- `t`：`xs1` 形聲①（聲旁念法一樣或很像）、`xs2` 形聲②（只有一點像 → `s` 寫「○、○也有它」）、`hy` 會意、`xx` 象形、`kj` 口訣記法。
- `parts[]`：`p` 部件；`m` 意思（綠色）或 `s` 念法（藍色）擇一；`r: 1` 標部首。3 個以上部件網頁自動縮小換行。
- `pic`：字源圖（卡片右下角小圖，點了放大），檔名 `字源_X`，寫進 `tools/cards_XX_char.json`。只有圖真的能幫忙理解的字才畫（一課 2～4 張）。
- `fix`：改錯字。`s` 句子（錯字 `w` 剛好出現一次）、`h` 提示（說部首的意思）。**改成的字＝這個生字**（本課生字）。

## 4. words 語詞、textWords 課文詞語

```js
words: [{ w: '逆風', zy: 'ㄋㄧˋ ㄈㄥ', meaning: '迎著風的方向前進；風從前面吹過來。',
          example: '逆風騎腳踏車，要花更大的力氣。', origin: '課文原句（可選）', say: '朗讀用字（可選，念錯時用）' }],
textWords: [{ w: '一路順風', meaning: '祝福要出遠門的人，一路上平安順利。' }]
```
- `words` 會同時用在「學會語詞」「注音聽打」「識字讀詞」三站，每個詞都要有圖（`images/lessonXX/語詞.webp`，寫進 `tools/cards_XX.json`）。
- `textWords` 只出現在讀懂課文（段落裡畫底線、點了出現意思；地圖步驟下有 📒 清單）。

## 5. phrases 短語短句（積木）

```js
{
  id: 'p1', kind: '短句練習',              // kind 不寫＝短語練習
  model: ['一次一次', '的', '練習著'],       // 課本的短語，切成積木
  roles: ['量詞', '', '動詞'],               // 每塊的詞性（照短語裡的用法），膠水寫 ''
  explain: '把「一次」說兩遍，表示一直不停的做同一件事。',
  examples: [['一遍一遍', '的', '朗讀著'], ...],  examplePics: ['短語_一遍一遍的朗讀著', ...],  exampleSay: ['念了一遍又一遍，一直念。', ...],
  practice: [[...], ...],                    // 舊版練習用（保留）
  blocks: [{ k: 'q', name: '多少' }, '的', { k: 'v', name: '做什麼' }],   // 字串＝固定的膠水
  order: ['v', 'q'],                         // 想的順序（可選，預設照 blocks）
  prefill1: [...],                           // 等級 1 先放好的積木（只有老師同意才用）
  bank: { q: [{ w: '一次一次', e: '🔁' }, ...], v: [{ w: '練習著', e: '💪' }, ...] },   // e＝圖示；x 可加說明
  ok:  [{ q: ['一次一次'], v: ['練習著'] }, ...],                    // 說得通的搭配
  bad: [{ q: ['一口一口'], v: ['前進著', '閱讀著'], why: '「一口一口」是用嘴巴……' }],   // 說不通＋原因
  thingWhy: '「{n}」放在這裡怪怪的……',      // 可選
  pic: '短語_一次一次的練習著',              // 老師示範圖
  scenes: [{ pic: '情境_…', say: '弟弟學騎腳踏車，跌倒了又爬起來，再騎一次。',
             ans: ['一次一次', '的', '練習著'], fit: { q: ['一次一次'], v: ['練習著'] },   // fit＝和圖相符的都算對
             no: { q: ['一口一口', '一頁一頁'] },     // 等級 1 不放進選項的
             q: { v: '弟弟一直在做什麼？', q: '……是怎麼練習的？' },   // 每塊積木的引導問題
             miss: '…' }],                          // 可選
  guided: [0, 1], own: [2, 3],               // 情境 0、1 一起想；2、3 看圖自己想
  swapSay: '換成「{q}」，做的方式就不一樣了！',
  think: [{ at: 2, say: '先看紅色積木……' }, { at: -1, say: '合起來就是……' }],   // 老師放聲思考（at＝第幾塊，-1＝最後）
  missWord: {...}                            // 可選：選錯範圍詞時的說明（第 8 課）
}
```
- 積木顏色 `k`（全站固定）：`v` 紅＝做什麼、`n` 藍＝誰／什麼、`r` 紫＝後來怎樣、`a` 綠＝什麼樣子、`q` 橘＝數量。
- 同色兩塊：第二塊用別的 k、加 `c` 指定顏色，例 `{ k: 'b', c: 'a', name: '什麼樣子' }`，可共用同一份詞庫。
- 詞性名稱（`roles`）用：名詞、動詞、形容詞、量詞、疊字詞、疊字量詞、摹聲詞……（分一分的選項＝名詞、動詞、形容詞、量詞＋這個短語用到的特別詞性）。
- 圖：`pic`、`examplePics`、`scenes[].pic` 全部寫進 `tools/cards_XX_phrase.json`（一個單元約 8 張）。

## 6. sentences 句型

```js
{
  id: 'only', pattern: '只有……才能……', kind: '條件複句',
  explain: '「只有」後面說唯一的條件……', conn: ['只有', '才能'],
  origin: ['課文原句', ...], models: ['只有專心上課，才能聽懂老師說的話。', ...],
  order: [['只有', '多吃青菜，', '才能', '身體健康。'], ...],
  choose: [{ stem: '只有不怕辛苦的練習，', options: ['才能在比賽中表現得好。', '可是他很累。', ...] }],
  connect: [{ stem: '＿＿按時睡覺，＿＿有精神上課。', options: ['只有／才能', '雖然／可是', ...] }],
  flex: true,      // 可選：彈性句型，只在等級 3 出現
  combine: {
    rel: 'cond',   // 可選：kind 不是 8 種複句時指定關係（turn cond more cause aim seq par ifr）
    q: '是不是「一定要」先做到前面，後面才會發生？', yes: '一定要', no: '不一定',   // 可選：改寫關係問題
    idea: '…', ideas: ['📚 讀書', ...],                                             // 可選：自己造句的想法卡
    demo: { e: '👂📚', a: '專心上課', b: '能聽懂老師說的話', j: '只有專心上課，才能聽懂老師說的話。',
            why: '不專心就聽不懂，一定要專心才行！', pic: '句型1_示範' },
    tryPair: {...},                                 // 舊欄位，可留
    pairs: [{ e, a, b, c?, j, fit: true, why },     // 句子合併：fit true 要有 j
            { e, a, b, fit: false, why, alt }],     // 反例：說明為什麼不合，alt＝比較好的說法
    look: { pic: '句型1_看圖', hint: ['排好隊', '拿午餐'], model: '只有排好隊，才能拿到午餐。' }   // 看圖造句
  }
}
```
- `kind` 用 8 種複句：轉折、條件、遞進、因果、目的、承接、並列、假設（`app.js` 的 `KIND_REL`）。
- 圖名固定：第 N 個句型 `句型N_示範`、`句型N_看圖`，寫進 `tools/cards_XX_sent.json`。
- 流程：認識句型（示範圖）→ 句子合併 → 看圖造句 → 自己造句（後兩步送老師批改）。

## 7. reading 讀懂課文

```js
reading: {
  task: '分辨觀察和體悟',         // 這課的文體活動名稱（站的說明會用）
  mapNote: '…', unit: '節', poem: true,   // unit/poem：詩用「節」
  map: [{ tag: '開頭', title: '一路逆風', sum: '一句話大意', paras: [1], branch: true }],   // 課文地圖；branch＝並列分支
  paras: [{ no: 1, text: [0], sum: '這段在說什麼（選項正解）', keys: ['課文原句片段（螢光筆）'] }],
  // ↑ text＝課文原稿的段落索引（從 0 起、跨小標題連續算）；keys 一定要是原稿裡一字不差的片段
  // 文體活動三選一：
  sort:   { ask, hint1, hint2, groups: [{ name, at, sub }], cards: [{ t, g, at?, kw, keys, think? }], byLevel: {1:[…],2:[…],3:[…]} },   // 說明文、議論、散文：分類
  decode: { ask, q, items: [{ kw, para, keys, ctx, ctxKeys, meaning, like }], byLevel },   // 詩：詩句解碼
  events: ['事件1', ...], eventParts: [1, 2, 3],   // 故事、傳記：排順序（eventParts＝每個事件在地圖第幾格）
  eventsByLevel: { 1: [1, 3, 4], 2: [...], 3: [...] },   // 一定要有（就算不是排順序）
  questions: [{ q, para, keys, options: [正解, ...], hint }],
  theme: { options: [正解, ...], hint }    // 想一想主旨
}
```
- `hint1/hint2` 可用 `{kw}`、`{range}` 代入。
- 課文原稿 `data/reading/lessonXX.js` 由 `tools/make_reader.py` 產生，**不進 repo**；網站用加密的 `data/reading.enc.js`。

## 8. families、lookalikes 形近字

```js
families: [
  { id: 'wen', title: '「穩、隱」長得像', members: [{ c, zy, words, pic, line, tip }] },              // 形似字組
  { id: 'lin', base: '粦', baseZy: 'ㄌㄧㄣˊ', members: [{ c, zy, part, partName, words, pic, line, tip }] },   // 字族（同聲旁）
  { id: 'maiP', poly: true, base: '脈', members: [{ c, zy, words, pic, line, tip }] }                // 一字多音
],
lookalikes: [
  { id: 'w1', fam: 'wen', sentence: '爸爸開車很＿，大家都不會暈車。', options: ['穩', '隱'], hint: '…' },
  { id: 'm1', fam: 'maiP', poly: true, sentence: '…山脈…', hl: '脈', options: ['ㄇㄞˋ', 'ㄇㄛˋ'], hint: '…' }
]
```
- `line`：字族文的一句（讀字族文用），`tip`：部件提示。`pic` 指向語詞圖（寫進 `cards_XX.json`）。

## 9. idioms、rhetoric、listening

```js
idioms: [{ idiom: '莫逆之交', zy: 'ㄇㄛˋ ㄋㄧˋ ㄓ ㄐㄧㄠ', blank: 1, options: ['逆', '溺', '膩', '匿'], meaning, example }],   // options[0]＝idiom[blank]；每課 6 個；要有圖
rhetoric: [{ id, name, explain, clue, clueWords, examples: [{ s, hl: [...], note }], judge: [{ s, yes }], judgeHint, askTitle, ask: [{ s, q, options }] }],
listening: [{ focus: '一路順風', listen: '要念給學生聽的一句話', q: '…是什麼意思？', options: [...] }]
```

## 10. 共用資料檔（整個網站一份）

| 檔案 | 怎麼來 |
|---|---|
| `data/links.js` | 手寫：沒有加密課文時的外部點讀／朗讀連結（有 reading.enc.js 就不需要） |
| `data/quiz_zy.js`、`data/zy_cands.js` | `python tools/make_quiz_zy.py`（讀各課 words） |
| `data/char_zy.js` | `python tools/make_score_data.py`（讀課文原稿） |
| `data/reading.enc.js` | `node tools/encrypt_readings.mjs`（老師自己輸入教室密碼） |
| `assets/fonts/twkai.woff2` | `python tools/build_font.py`（文字有改就重跑） |
| `index.html` 的 `<script>` | 每一課一行 `data/lessonXX.js?v=…`，課數不同要增減 |
