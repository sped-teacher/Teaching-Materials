# 建站、工具、圖、加密、上線

## 目錄
1. 換一冊要改的地方
2. 電腦準備
3. 工具指令總表
4. 生圖（另一台有 Codex 的電腦）
5. 課文：點讀資料與加密
6. 本機預覽與檢查
7. 總覽頁、使用說明
8. 上線與確認

---

## 1. 換一冊要改的地方

`scripts/new_site.mjs` 複製完會列出所有寫著舊學期的行。逐一改：

| 位置 | 改成 |
|---|---|
| `assets/app.js` 檔頭註解 | 新的網站名稱 |
| `SITE_NAME` | 「版本＋科目＋年級學期」，例：`康軒國語五下` |
| `LESSON_LIST` | 新一冊的課次與課名（課名以出版社生字表為準） |
| `STORE_KEY` | **一定要換**，例：`tm-g5b-v1`。所有網站在同一個網域，不換的話兩冊的學習紀錄會混在一起 |
| 首頁 `h1`、`sayBtn`、副標 | 「科目＋年級學期＋學習樂園」、「康軒版・五年級下學期」 |
| 期中／期末考範圍 | 依新一冊的考試範圍（問老師幾課到幾課） |
| `kicker`（每課頁上方） | 「康軒五下・第 N 課」 |
| 頁尾 | 「內容依康軒版國語五下整理改寫」 |
| `partdleUrl()` | 見下方 PARTDLE |
| 語文高手連結 `id=1151-1-5-` | 學期碼-版本-年級：115 上＝1151、115 下＝1152；康軒＝1（其他版本先到網站查） |
| 詞語理解、照樣造句連結 | 版本名稱、「5A」→ 新一冊的代號（先打開網站確認有沒有這一冊） |
| `index.html` | `<title>`、description；`<script>` 每課一行（課數不同要增減）；`reading.enc.js` 那行留著 |
| `guide.html` | 標題、左上角名稱、頁尾的版本冊別；內容是通用的，功能沒變就不用改 |
| `tools/image_queue.py` | `COPY`（舊學期共用圖）清空；預設課次範圍 |
| `tools/check_pedia.py` | 預設課次 `range(1, 13)`（課數不同才改） |

**PARTDLE 部件拼語詞**（顏國雄老師 HTML5 FUN）：
`https://gsyan888.blogspot.com/2024/06/html5-fun-partdle.html?by=gsyan&id=1kBueULlojPOH9E3EZYEUcUAv1HfJm_wULQT1hT2m1nM&gid=<學期 gid>&autostart=1&col=<欄>&lesson=<課次>`
- `gid`：題庫試算表裡「這個學期」那一頁的編號（115 上＝`510658925`）。新學期打開 PARTDLE 網頁的學期選單或試算表找；找不到先問老師，或暫時拿掉這個按鈕。
- `col`：`String.fromCharCode(65 + 版本*6 + 年級-1)`，南一＝0、康軒＝1、翰林＝2（康軒五年級＝K）。

**教育百科 pediaId**：每課 `pediaId` 是教育百科「生字詞彙表」的 TextNameId。到 pedia.cloud.edu.tw 的生字詞彙表選學年、年級、版本，點進各課，網址裡的 TextNameId 就是。

## 2. 電腦準備（換電腦第一次）

```bash
pip install jieba opencc-python-reimplemented fonttools brotli pillow
python mandarin/tools/fetch_tables.py
```
- `fetch_tables.py` 下載讀音表（外部專案，不進 repo）。
- 全字庫正楷體原始檔 `TW-Kai-98_1.ttf` 放 `C:\Claude\twkai\`（重做字型才需要）。
- 課文原稿只在老師電腦（`data/reading/`、`tools/texts/lessonXX.txt`），換電腦要老師自己用隨身碟搬，不放進 repo 或雲端同步資料夾。

## 3. 工具指令總表（在新網站資料夾底下的 tools/）

| 什麼時候 | 指令 |
|---|---|
| 寫完／改完一課 | `node .claude/skills/mandarin-learning-site/scripts/check_spec.mjs <資料夾> 07` |
| 寫完／改完一課（注音） | `python <資料夾>/tools/check_lesson.py 07` |
| 有課文檔之後 | `python <資料夾>/tools/make_reader.py 07` → 看 `tools/texts/lesson07_review.txt` 的多音字 |
| 核對點讀讀音 | `python <資料夾>/tools/check_pedia.py 07`（每詞停 3 秒，跑很久就放背景） |
| 讀音校正 | 改 `tools/texts/fixes.json`（`"07": { "詞": "注音|朗讀用字" }`）再跑 make_reader |
| 語詞有改 | `python <資料夾>/tools/make_quiz_zy.py` |
| 課文有改 | `python <資料夾>/tools/make_score_data.py`，然後老師跑 `encrypt_readings.mjs` |
| 任何文字有改 | `python <資料夾>/tools/build_font.py` |
| commit 前（有改 assets/、data/） | `node <資料夾>/tools/bump_version.mjs` |

## 4. 生圖（另一台有 Codex 的電腦）

這台電腦沒有 Codex，所以這裡只寫好設定檔，推上 GitHub，另一台 `git pull` 後畫。

| 設定檔 | 內容 | 圖名 |
|---|---|---|
| `tools/cards_XX.json` | 語詞、成語、形近字的圖 | 語詞本身，例 `逆風` |
| `tools/cards_XX_phrase.json` | 短語示範、例子、情境 | `短語_…`、`情境_…` |
| `tools/cards_XX_char.json` | 字源圖 | `字源_X` |
| `tools/cards_XX_sent.json` | 句型示範、看圖造句 | `句型N_示範`、`句型N_看圖` |

格式：`{ "lesson": "07", "cards": [ { "name": "圖名", "scene": "英文畫面描述" } ] }`

另一台電腦：
```bash
codex login
python <資料夾>/tools/gen_cards.py <資料夾>/tools/cards_07_phrase.json
python <資料夾>/tools/image_queue.py 01 02 03
```
- 存成 `images/lessonXX/圖名.webp`（640×640，約 30 KB）。
- Codex 有兩種限制：整體額度、短時間生圖次數（約 1 小時重置）。`image_queue.py` 會自己等、再試。
- **畫完每張都要看**：有沒有字或符號、意思對不對。不對的寫進清單重畫（`gen_cards.py 設定檔 圖名`）。
- 別課已經有的同一個語詞圖，可以用 `image_queue.py` 的 `COPY` 複製，不用重畫。
- 帳號、token 不寫進任何檔案。

## 5. 課文：點讀資料與加密

1. 老師提供課文 → 存成 `<資料夾>/tools/texts/lessonXX.txt`（第一行 `@標題`、`#小標題`、其他每行一段）。**這個檔不進 repo**（.gitignore 已擋 `**/tools/texts/lesson[0-9][0-9].txt`、`**/data/reading/`）。
2. `make_reader.py XX` → `data/reading/lessonXX.js`（點讀用的斷詞＋注音）。看 review 檔、跑 `check_pedia.py`，有錯改 `fixes.json`。
3. 讀音規則（程式已內建）：們＝˙ㄇㄣ；連接詞「和」＝ㄏㄢˋ；「為」當「為了、替」＝ㄨㄟˋ；一、不變調；稱謂疊字第二字輕聲。
4. `make_score_data.py`（朗讀挑戰的讀音索引）。
5. **加密由老師自己做**：請老師在自己的終端機執行下面這行，輸入兩次教室密碼（畫面不顯示）。Claude 不問、不看、不寫下密碼。
   ```bash
   node <資料夾>/tools/encrypt_readings.mjs
   ```
6. commit 前用 `git status` 確認沒有 `data/reading/`、`tools/texts/lessonXX.txt` 被加進去。

## 6. 本機預覽與檢查

- 預覽：在 repo 根目錄起本機伺服器（`.claude/launch.json` 加一個設定：`python -m http.server 8765`，port 8765），開 `http://localhost:8765/<資料夾>/`。
- 要測讀懂課文、課文點讀但不想輸入密碼：做一個暫時的 `_test.html` 直接載入 `data/reading/lessonXX.js`，**測完刪掉，不 commit**。
- 每一課至少走一遍：等級 1 和等級 3 各一次，每一站從頭到尾（拆字卡、改錯字、短語分一分、骰子、句子合併、看圖造句、讀懂課文各步驟）。看主控台有沒有錯誤。
- 圖還沒畫好時會顯示「圖卡準備中」或改用表情符號，這是正常的。

## 7. 總覽頁、使用說明

- 根目錄 `index.html`（資源班教材總覽）加一張卡片：
  - 同版本同年級（例：康軒五下）→ 放進現有的「康軒五年級」子標籤的 `.grid`，多一個 `<a class="item">`。
  - 不同版本或年級 → 新增一個子標籤，名稱「版本＋年級」（例：南一四年級）。
  - 卡片：`.t` 網站名稱、`.d` 一句說明、`.meta` 「第 1～N 課 →」；下面「📘 使用說明」連到新網站的 guide.html。
- `guide.html`：功能和五上一樣就只改名稱；有新功能再補對應分頁（開學設定、練習內容、造句批改、等級調整、學習紀錄、常見問題、參考與致謝）。

## 8. 上線與確認

1. 檢查敏感資料：沒有學生個資、密碼、金鑰、課文原稿（`git status`、`git diff --cached --stat`）。
2. `node <資料夾>/tools/bump_version.mjs`（有改 assets/、data/）。
3. 更新 `notes/工作筆記.md`（做了什麼、下一步）。
4. `git add` → `git commit`（訊息用中文，結尾加 Co-Authored-By）→ `git push`。
5. **確認網站真的更新了**（GitHub Pages 曾經卡在排隊 6.5 小時）：
   ```bash
   gh run list -R sped-teacher/Teaching-Materials -L 3
   ```
   或抓網站的 index.html 看 `?v=` 是不是新的版本號。卡住太久就重新部署：
   ```bash
   gh api -X POST repos/sped-teacher/Teaching-Materials/pages/builds
   ```
6. 回報網址給老師：`https://sped-teacher.github.io/Teaching-Materials/<資料夾>/`。iPad 看到舊畫面 → 關掉 App 再開或重新整理。

**參考與致謝**（頁尾與使用說明都要有，新網站沿用）：注音聽打、識字讀詞參考顏國雄老師 HTML5 FUN；雄筆順、PARTDLE、語文高手以連結使用；楷書字型全字庫正楷體（政府資料開放授權）；讀音資料 ButTaiwan/bpmfvs。gsyan 的部件資料標示 All rights reserved，只能連結、不能複製進 repo。
