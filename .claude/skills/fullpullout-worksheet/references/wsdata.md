# wsdata/XX.json 格式

放在 `<網站>/tools/worksheet/wsdata/`，一課一個檔，檔名是兩位數課次。只放「網站資料沒有、這份作業才需要」的內容。範例：`mandarin/tools/worksheet/wsdata/07.json`。

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
