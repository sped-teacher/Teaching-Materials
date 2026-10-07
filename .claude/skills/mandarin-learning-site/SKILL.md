---
name: mandarin-learning-site
description: 照「康軒國語五上學習樂園」（repo 的 mandarin/）的最終規格，替新的一冊國語課本做一個同樣的資源班學習網站。網站有 iPad 等級 1～3、認識生字拆字、語詞、短語積木、句型合併與看圖造句、讀懂課文、形近字、成語、修辭、語詞挑戰，課文加密。老師拿到新學期或新版本、新年級的國語教材（生字表、生字詞語解釋、語句練習、字音字形、課文），說要「做下學期的網站」「做五下／四上的學習樂園」「照國語網站的做法做新的一冊」「新教材開始做」，或要替新的一冊做其中一站（例如只做短語積木、讀懂課文）時，都用這個 skill。即使老師沒說「skill」或「學習樂園」，只要是要用新教材做出跟現在國語網站一樣規格的練習網站，就用它。
---

# 國語學習樂園：新一冊製作流程

這個 skill 把五上網站一路做出來、老師逐條修正過的做法整理成流程。目標是拿到新教材，就能做出**和 `mandarin/` 一模一樣規格**的網站：程式照抄，只換內容。

**最重要的觀念**
- **`mandarin/` 是標準答案**。程式（`assets/app.js`、`style.css`、`guide.html`、`tools/`）不用重寫，直接複製；要做的是每一課的**資料**（`data/lessonXX.js`）和**圖**。欄位怎麼寫、寫成什麼樣子，打開 `mandarin/data/lesson07.js` 等現成的課對照。
- **內容一律先列給老師確認，再寫進網站。** 老師對字源、搭配、情境很在意，五上幾乎每一站都改過。先給確認表，老師說「可以」才寫。可以幾課一起列（老師說過「2-6 一次來」），一次一站最好核對。
- 老師是資源班特教老師，不寫程式。回報用繁體中文、白話，不要丟技術名詞。

## 開始前：問清楚（一次問完）

1. **哪一冊**：版本（康軒／南一／翰林）、年級、學期、學年（例：115 學年下學期 康軒五下）。
2. **資料夾名稱**：建議 `mandarin-<版本代號><年級><學期>`（例 `mandarin-kh5b`）。老師另有想法就照老師的。網址就是 `https://sped-teacher.github.io/Teaching-Materials/<資料夾>/`。
3. **教材在哪**：老師雲端的教材資料夾（需要的檔案見 `references/content-rules.md`「資料來源對照」）。課文文字檔老師另外給，只放在這台電腦。
4. **考試範圍**：期中考幾課到幾課（首頁分兩區）。
5. 如果是**一、二、三年級**或功能想改：先和老師討論哪些站要留（低年級可能不適合句型合併、修辭），再開始做。

## 流程總覽

| 階段 | 做什麼 | 老師確認 |
|---|---|---|
| 0 建站 | `scripts/new_site.mjs` 複製程式、改學期設定 | 網站名稱、資料夾名 |
| 1 基本資料 | chars、words、textWords、idioms、families/lookalikes 從教材整理 | 生字（官方表核對）、多音字 |
| 2 認識生字 | charParts 拆字解說＋改錯字 | ✅ 拆字確認表 |
| 3 短語短句 | phrases 積木（詞庫、搭配、情境） | ✅ 每個單元的詞庫與搭配表、情境 |
| 4 句型練習 | sentences（示範、合併、反例、看圖造句） | ✅ 句子與反例、看圖情境 |
| 5 讀懂課文 | 課文點讀 → reading（地圖、段落、文體活動、問題、主旨） | ✅ 文體活動的分類／順序、題目 |
| 6 其他站 | rhetoric、listening | 看一遍 |
| 7 圖 | cards_XX*.json → 另一台電腦用 Codex 畫 | 畫完逐張看 |
| 8 共用資料 | quiz_zy、char_zy、字型、加密、版本號 | 老師自己輸入教室密碼 |
| 9 上線 | 檢查、總覽卡片、使用說明、push、確認部署、回報網址 | iPad 實測 |

每一階段結束都可以先 commit、push 上網（還沒做的站網站會自動顯示「待更新」或改用舊版練習），不用等全部完成。

## 0. 建站

在 repo 根目錄：
```bash
node .claude/skills/mandarin-learning-site/scripts/new_site.mjs <資料夾>
```
它複製程式和工具（不複製各課資料、圖、課文、生圖設定），建立空的 `data/`、`images/`，最後列出所有還寫著舊學期的行。照 `references/build-and-deploy.md` 第 1 節的表逐一改。**`STORE_KEY` 一定要換**，不然兩冊的學習紀錄會混在一起。

## 1～6. 一課一課做資料

**先讀**：`references/data-schema.md`（欄位）和 `references/content-rules.md`（老師的規則），再打開 `mandarin/data/` 裡同文體的一課當範本。

建議順序：先把**全部課**的基本資料（階段 1）做完，再一站一站往下做（全部課的拆字 → 全部課的短語 → …）。同一站一起做，規則比較一致，老師一次確認也比較快。

每一課寫完：
```bash
node .claude/skills/mandarin-learning-site/scripts/check_spec.mjs <資料夾> 07
python <資料夾>/tools/check_lesson.py 07
```
`check_spec.mjs` 會抓網站會壞的地方（缺欄位、索引錯）和老師定過的規則：
- 改錯字的答案要是本課生字，錯字剛好出現一次。
- 不同顏色的積木不能有同一個詞。
- 每個句子都要照順序用到連接詞。
- 螢光筆句子要是課文原文。
- 不能有罕用字。
- 圖有沒有排進生圖設定。

❌ 一定要改；⚠ 看一下是不是還沒做的部分。

**確認表的寫法**：用表格，一列一項，老師可以直接在對話裡說「第幾列改成……」。拆字寫成 `notes/拆字確認_第X-Y課.md`，格式照 `notes/拆字確認_第7-12課.md`。短語、句型、讀懂課文直接在對話裡列。老師改過的規則如果是新的，記進 `content-rules.md`，下次就不會再錯。

## 7. 圖

每課四個設定檔：
- `cards_XX.json`：語詞、成語、形近字的圖
- `_phrase`：短語
- `_char`：字源
- `_sent`：句型

寫法見 `references/build-and-deploy.md` 第 4 節。圖名要和資料裡的 `pic` 一字不差，`check_spec.mjs` 會列出沒排到的。

這台電腦沒有 Codex：寫好設定檔、push，請老師到另一台電腦 `git pull` 後跑 `gen_cards.py` 或 `image_queue.py`。畫完要逐張看有沒有字、意思對不對。

## 8. 共用資料與課文

依序做：
1. `make_quiz_zy.py`
2. 有課文時跑 `make_reader.py`、`check_pedia.py`、`make_score_data.py`
3. `build_font.py`
4. 請老師自己跑 `encrypt_readings.mjs` 輸入教室密碼
5. `bump_version.mjs`

細節見 `references/build-and-deploy.md` 第 3、5 節。

## 9. 檢查與上線

1. 本機預覽，每課用等級 1、等級 3 各走一遍每一站（`references/build-and-deploy.md` 第 6 節）。用瀏覽器工具實際點，不要只看程式。
2. 總覽 `index.html` 加卡片、`guide.html` 改名稱（第 7 節）。
3. 收工流程：檢查敏感資料 → 更新 `notes/工作筆記.md` → commit → push → **確認 GitHub Pages 真的部署了** → 回報網址（第 8 節）。

## 絕對不能做的事（repo 是公開的）

- 課文全文（`data/reading/`、`tools/texts/lessonXX.txt`）不進 repo，網站只放加密檔。commit 前看 `git status`。
- 教室密碼不寫在任何檔案或對話裡。加密由老師自己在終端機輸入。
- 學生個資（姓名、學號、成績、照片）、API Key、帳號 token 不放進 repo。
- gsyan（雄筆順等）的資料只能連結，不能複製進 repo。
- 讀音只依《國語辭典簡編本》《國語小字典》，不用《重編國語辭典修訂本》，不憑記憶寫注音。

## 參考檔案

- `references/data-schema.md`：每個欄位的格式與範例（寫資料時讀）
- `references/content-rules.md`：每一站內容怎麼寫、老師的規則、資料來源對照（寫內容和確認表時讀）
- `references/build-and-deploy.md`：換冊要改的地方、工具指令、生圖、課文加密、預覽、上線（建站和收尾時讀）
- `scripts/new_site.mjs`：建新網站資料夾
- `scripts/check_spec.mjs`：檢查一課的資料符不符合規格
