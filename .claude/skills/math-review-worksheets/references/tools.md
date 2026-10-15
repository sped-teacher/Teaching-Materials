# 工具用法

內容模組開頭：

```python
from lib import *      # 版面工具、B2/B4/B5/B6 空格、ALL 位值名稱
import lib             # 需要直接動文件時用 lib.doc
import figs            # 圖
from s_a import ans, E, check   # 範例裡的答案／驗算工具
```

## lib.py

| 函式 | 用途與重點參數 |
|---|---|
| `begin(header, base=14, margin=1.5)` | 開新 A4 文件。作業用 `base=13, margin=1.2` |
| `save(path)` | 存檔（存之前會執行 `lib.PRE_SAVE`，`build.py` 用它加 `EXTRA` 補題） |
| `title(part)` | 頁首淡色小字＋大標題＋右邊座號姓名。每頁開頭用 |
| `page_break()` | 換頁（加在上一段後面，不會多出空白頁） |
| `hint(*lines, title="小提醒")` | 灰底提示框；每個參數一行，可用 parts 清單（含積木） |
| `para(*parts, size, indent, before, after)` | 一段文字。parts 可為字串或 `(字, "b")` 粗體、`(字, "ex")` 藍字示範、`(字, "blk")` 積木 |
| `q(label, *parts)` | 題號（粗體）＋題目 |
| `step(n, *parts)` | 「第 n 步」 |
| `E("8")` | 示範答案：回傳「（8）」藍字，用 `*E("8")` 展開 |
| `place_table(cols, rows, hot={列: 位名}, ex_rows=(...), h, label_w)` | 位值表。`cols` 例：`ALL`（千萬～一）或 `["十萬","萬","千","百","十","一"]`；`rows=[(左欄標籤或 None, "數字")]` |
| `vgrid(n, rows, h, size=18, parent=None)` | 直式格。rows 每列 dict：`d` 數字（靠右）、`op` 符號、`line` 下面粗線、`carry` 進位小格列、`ex` 藍字、`hl` 塗色的位（0＝一位）、`start=1` 乘二位數的第 2 列從十位開始寫（這列和乘數的十位塗同色，**不寫 0**）、`pre` 灰底提示字 |
| `ldiv(除數, 被除數, q="商", work=[(字串, 畫線)], blank, h, size, ex, parent)` | 除法直式。示範時 `work` 每列字串長度＝被除數位數（用空白對齊），例 7425÷6：`("6   ",True),("14  ",False),("12  ",True)…` |
| `mults(除數, n, filled)` | 倍數表（除數×1～×n），示範時 `filled=True` |
| `blocks(("10萬",3), ("1萬",6))` | 積木，每種一列 |
| `boxes(n, labels, w, h)` | 數字卡／位數空格 |
| `side([(標題parts, builder), ...])` | 兩題並排（整列不會被切到兩頁）；builder 是 `lambda c: vgrid(..., parent=c)` 或 `ldiv(..., parent=c)`，也可 `None`（只有文字）。作業的直式用 `size=15, cw=0.8, h=0.6`（範例 `s_a.py` 的 `G／M1／M2`） |
| `free_app(題目, lines=6)` | 作業的應用題：回傳 `side()` 用的一格（題目＋「列式：」「直式：」空白＋靠右「答：＿＿＿＿」，不印單位），例：`side([free_app("17. …"), free_app("18. …")])` |
| `grid(cells, cols, widths, size=13)` | 圖文排版；每格 `[("p", parts...), ("img", 圖, 縮放)]`。**要讓學生量的角不要縮放** |
| `image(圖, scale)` | 單獨插圖（置中） |

空格：`B2`（一位數）、`B4`、`B5`、`B6`（大數）。

## figs.py（300dpi，插入時是實際尺寸）

| 函式 | 說明 |
|---|---|
| `angle(deg, rot=0, arm=3.6, letter=None)` | 真實大小的角：第一邊方向 `rot`，逆時針轉 `deg` |
| `protractor(ray, base="right"/"left")` | 量角器讀數圖。`base="right"` 從右邊量（讀內圈），`"left"` 從左邊量（讀外圈，度數＝180－ray） |
| `clock(start, end, cw=True)` | 時鐘：灰色指針在 start、黑色在 end、藍色箭頭表示方向 |
| `rays({"rays": [方向], "right": [a0], "sectors": [(a0, a1, "35°", 塗色, 半徑)], "dashed": [...]})` | 角度計算圖。塗色 `"dark"` 是要求的角 |
| `tri(pts, labels=[(點, "A", 0.35)], marks=[((i, j), 記號數)], right=頂點, inner="甲")` | 三角形（公分座標）；全等題用同樣的 marks 表示對應邊 |
| `baseline(L)` | 畫角／畫三角形用：一條 L 公分的線＋頂點 |

範例 `s_c.py` 的 `rot(pts, deg, s=縮放)` 可做旋轉、放大的三角形（全等題的干擾選項）。

## 檢查工具（PowerShell）

- `scripts\topdf.ps1 -dir <資料夾> -filter "*.docx"`：用 Word 轉 PDF，印每份頁數。
- `scripts\fill.ps1 -dir <資料夾> -filter "*作業*.docx"`：頁數＋最後一頁用到幾 %（作業要 1 頁、≥88%）。
