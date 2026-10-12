# wsdata/XX.json 格式

放在老師電腦 `Desktop\學國5上\學習單資料\wsdata\`（不上傳 GitHub），一課一個檔，檔名是兩位數課次。只放「網站資料沒有、這份作業才需要」的內容。範例：該資料夾的 `07.json`。

```json
{
  "summary": [
    { "tag": "開頭", "title": "一路逆風", "text": "朋友說，飛機起飛、降落時要〔逆風〕，才能飛得又平又穩。" },
    { "tag": "觀察①", "title": "母鷹訓練小鷹", "text": "……〔物競天擇〕……" }
  ],
  "extraLook": [
    { "fam": "lu", "sentence": "古時候，官員領的薪水叫做俸＿。" }
  ],
  "zyfix": { "背牠": "ㄅㄟ ㄊㄚ" }
}
```

| 欄位 | 必要 | 說明 |
|---|---|---|
| `summary` | ✔ | 段落大意。`tag`、`title` 照網站 `reading.map`；`text` 改寫的大意，〔語詞〕＝空格。全部空格加起來**剛好 8 個**，每個都是本課 `words` 裡、`images/lessonXX/語詞.webp` 有圖的詞，不重複。 |
| `extraLook` | | 〈字音字形〉有、網站沒題目的形近字補充句。`fam` 是網站 `families` 的 id，句子用全形「＿」當空格。 |
| `zyfix` | | 第 ③ 頁注音校正：`{"詞": "注音 注音"}`，會蓋過自動標的讀音。 |

寫完先列給老師確認，再產生。

# wsdata_extra/XX.json（外加組）

放在 `學習單資料\wsdata_extra\`（和 wsdata 同一層）。範例：該資料夾的 `03.json`。

```json
{
  "phrases": [ { "title": "短語", "model": "伸長堅韌的虯鬚", "structure": "（動詞）（形容詞）的（名詞）",
                 "choose": [ { "stem": "蓋出＿的大樓", "options": ["堅固", "奔跑", "昨天"], "ans": "堅固" } ],
                 "swap": ["蓋出＿的＿"] } ],
  "sentences": [ { "pattern": "先……再……", "rel": "承接", "explain": "…", "origin": "課文原句",
                   "choose": { "stem": "…再＿。", "options": ["錯的", "對的"] }, "connect": "放學回到家後，我會先＿，再＿。" } ],
  "idioms": [ { "idiom": "疾風勁草", "meaning": "…", "situ": ["情境一", "情境二"], "frame": "他就像〔成語〕，遇到＿也不退縮。" } ]
}
```
- 「＿」是要學生寫的地方（一個就好，程式會畫成底線）。成語的 `frame`：一個「〔成語〕」（學生寫目標成語）＋一個「＿」（填符合句意的內容），標準見 SKILL.md。`title` 可寫「短句」。
- `ans` 只是給老師看的答案，不會印出來。
- 成語圖用網站的 `images/lessonXX/成語.webp`。
