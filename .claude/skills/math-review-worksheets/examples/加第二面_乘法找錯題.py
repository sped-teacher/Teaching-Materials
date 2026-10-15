# 在「題目卷_2-1~2-2」後面加第二面：檢查乘法直式有沒有算錯、算錯怎麼改（4 題）
import sys, os
sys.path.insert(0, r"C:\Users\class\Documents\teaching-materials\.claude\skills\math-review-worksheets\scripts")
from docx import Document
from docx.enum.section import WD_SECTION
from lib import *
import lib

SRC, OUT = sys.argv[1], sys.argv[2]
lib.doc = Document(SRC)

# 新的一頁（單欄）
sec = lib.doc.add_section(WD_SECTION.NEW_PAGE)
cols = sec._sectPr.xpath("./w:cols")
if cols:
    cols[0].set(qn("w:num"), "1")
    for a in ("w:sep", "w:space"):
        if cols[0].get(qn(a)) is not None:
            del cols[0].attrib[qn(a)]
# 原考卷有「文件格線」，行高會被撐大、直式格的數字會被切掉 → 第二面不用格線
for g in sec._sectPr.xpath("./w:docGrid"):
    sec._sectPr.remove(g)

p = para(("五、找錯誤、改正確：", "b"), size=15, after=4)
hint("檢查 3 步：① 每一位乘得對不對　② 進位有沒有加上去　③ 乘十位那一列有沒有往左一格（先寫 0）",
     "先估一估：1438×4 大約是 1400×4＝5600，答案差很多就一定算錯了。", title="小明寫了 4 題直式，幫他檢查：算錯的把錯的數字圈起來，在右邊寫出正確的算法")

REASONS = "錯在：□ 九九算錯　□ 忘記加進位　□ 第 2 列沒往左一格（沒寫 0）　□ 加錯"


def item(n, expr, student_rows, ncols, blank_rows):
    q(f"{n}.", f"小明算 {expr}，他算對了嗎？　□ 算對了　□ 算錯了", before=3)
    side([(["小明的算法（錯的數字圈起來）："], lambda c: vgrid(ncols, student_rows, h=0.62, size=15, cw=0.8, parent=c)),
          (["正確的算法（算錯的才要寫）："], lambda c: vgrid(ncols, blank_rows, h=0.62, size=15, cw=0.8, parent=c))])
    para(REASONS, size=12, indent=0.4, after=2)


# 1. 1438×4：十位忘記加進位（3×4＝12，忘了加 3）→ 寫成 5722，正確是 5752
assert 1438 * 4 == 5752
item(1, "1438×4",
     [dict(carry=True, d=" 113 "), dict(d="1438"), dict(op="×", d="4", line=True), dict(d="5722")], 5,
     [dict(carry=True), dict(d="1438"), dict(op="×", d="4", line=True), dict()])
# 2. 2065×3：中間的 0 那一位忘記加進位（0×3＋1＝1）→ 寫成 6095，正確是 6195
assert 2065 * 3 == 6195
item(2, "2065×3",
     [dict(carry=True, d="  11 "), dict(d="2065"), dict(op="×", d="3", line=True), dict(d="6095")], 5,
     [dict(carry=True), dict(d="2065"), dict(op="×", d="3", line=True), dict()])
# 3. 36×24：第 2 列沒有往左一格（72 沒寫成 720）→ 144＋72＝216，正確是 144＋720＝864
assert 36 * 24 == 864 and 36 * 4 == 144 and 36 * 20 == 720
item(3, "36×24",
     [dict(d="36"), dict(op="×", d="24", line=True), dict(d="144"), dict(op="＋", d="72", line=True), dict(d="216")], 4,
     [dict(d="36"), dict(op="×", d="24", line=True), dict(), dict(op="＋", line=True), dict()])
# 4. 47×23：算對了（141＋940＝1081）
assert 47 * 23 == 1081 and 47 * 3 == 141 and 47 * 20 == 940
item(4, "47×23",
     [dict(d="47"), dict(op="×", d="23", line=True), dict(d="141"), dict(op="＋", d="940", line=True), dict(d="1081")], 4,
     [dict(d="47"), dict(op="×", d="23", line=True), dict(), dict(op="＋", line=True), dict()])

lib.doc.save(OUT)
print("saved", OUT)
