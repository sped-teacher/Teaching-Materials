# 老師用：上課規劃＋全部答案
import sys, os, json, re, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "scripts"))
from lib import *
import lib

OUT = sys.argv[1]
ans = json.load(open(os.path.join(tempfile.gettempdir(), "math-worksheet-answers.json"), encoding="utf-8"))

PLAN = [
    ("第 1 次", "1-1～1-2", "位值表、國字和數字（四位一節、零）、加一加、幾個幾個合起來"),
    ("第 2 次", "1-3～1-4", "比大小、數字卡、用「萬」算加減、應用題（合起來／相差）"),
    ("第 3 次", "2-1～2-2", "0 的秘密、四位數×一位數（進位小格）、乘以二位數拆兩列"),
    ("第 4 次", "2-3", "三位數、四位數×二位數、應用題（1 份×幾份）"),
    ("第 5 次", "3-1～3-3", "讀量角器（內圈／外圈）、量角畫角、直角銳角鈍角"),
    ("第 6 次", "3-4～3-6", "先估再量、平角周角、時鐘 1 大格 30 度、角度計算、旋轉角名稱"),
    ("複習考 1", "第 1～3 單元", "資源班版考卷（3 頁）"),
    ("第 7 次", "4-1", "除法直式 4 步驟（除乘減拉）、商寫 0、驗算、應用題"),
    ("第 8 次", "4-2～4-3", "倍數表找商、三位數÷二位數、應用題和驗算"),
    ("第 9 次", "5-1～5-3", "用邊／用角分類三角形、畫三角形（含正三角形）、全等的對應"),
    ("複習考 2", "第 4～5 單元", "資源班版考卷（3 頁）"),
    ("第 10 次", "第 1～5 單元", "期中考前總複習（新題目，每單元都有）"),
]

begin("四年級數學　期中複習（老師用）", base=12)
title("上課規劃＋答案")
para("每次上課：課堂單 3 頁（一節 40 分鐘）＋回家作業 1 頁（整面；前半本次類題，後半「複習一下」）。", size=12)
para("角度、三角形的圖是實際尺寸，列印時請選「實際大小／100%」，學生才能用量角器量出正確度數。", size=12)
t = lib.doc.add_table(rows=1 + len(PLAN), cols=3)
borders(t)
for j, h in enumerate(["次", "範圍", "重點"]):
    cell_text(t.cell(0, j), h, bold=True, size=12, fill=GE)
for i, (a, b, c) in enumerate(PLAN, start=1):
    cell_text(t.cell(i, 0), a, size=12, bold=a.startswith("複習"))
    cell_text(t.cell(i, 1), b, size=12)
    cell_text(t.cell(i, 2), c, size=12, align="l")
for r in t.rows:
    r.cells[0].width = Cm(2.3); r.cells[1].width = Cm(2.9); r.cells[2].width = Cm(12.0)
spacer()
order = ["第01次 課堂", "第01次 作業"]
for n in range(2, 11):
    order += [f"第{n:02d}次 課堂", f"第{n:02d}次 作業"]
    if n == 6: order.append("複習考1")
    if n == 9: order.append("複習考2")
for k in order:
    if k not in ans: continue
    para((k.replace("第0", "第 ").replace("次", " 次").replace("複習考", "複習考 "), "b"), size=13, before=6, keep=True)
    for line in ans[k]:
        # 乘二位數的兩列：不寫「第 2 列補 0」（老師沒教），寫成「426、284（從十位寫）→ 3266」
        line = re.sub(r"(\d+)＋(\d+)0＝(\d+)", r"\1、\2（從十位寫）→ \3", line)
        para(line, size=11.5, indent=0.4)
save(OUT)
print("saved", OUT)
