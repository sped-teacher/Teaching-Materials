# 3-1～3-3（量角器、量角、畫角、角的種類）作業單，程度較好的學生用
# 參考南一題庫「題目卷(1)_261020105418」（4 頁、約 30 題、畫角沒留位置）→ 挑重點改成正反一張：
# 正面：讀量角器 → 量角＋角的種類 → 選擇；背面：不從 0 度線量 → 畫角（每題留大空間）
import sys
sys.path.insert(0, r"C:\Users\class\Documents\teaching-materials\.claude\skills\math-review-worksheets\scripts")
from lib import *
import lib
import figs

OUT = sys.argv[1]
ANS = []
begin("四年級數學　3-1～3-3 複習卷", base=13, margin=1.2)
title("量角器、量角、畫角")


def prot(n, ray, base, choices=None):
    cell = [("p", (f"{n}.", "b")), ("img", figs.protractor(ray, base), 0.66)]
    if choices:
        cell.append(("p", f"□ {choices[0]} 度　　□ {choices[1]} 度"))
    else:
        cell.append(("p", "（　　　）度"))
    return cell


# 一、讀量角器
q("一、", "量角器量出來的角是幾度？（1、2 在正確的□打ˇ）", before=2)
grid([prot(1, 110, "right", (70, 110)), prot(2, 35, "left", (35, 145)),
      prot(3, 60, "right"), prot(4, 130, "left")], cols=2)
ANS.append("一、1. 110　2. 145　3. 60　4. 50")

# 二、量角＋角的種類
q("二、", "用量角器量量看，再寫出是銳角、直角還是鈍角。")
ANG = [(65, 25), (120, 5), (90, 40), (155, 10)]
grid([[("p", (f"{k}.", "b")), ("img", figs.angle(d, rot=r, arm=3.0)), ("p", "（　　）度，", B4, "角")]
      for k, (d, r) in enumerate(ANG, 5)], cols=2)
ANS.append("二、5. 65 度，銳角　6. 120 度，鈍角　7. 90 度，直角　8. 155 度，鈍角（容許 ±2°）")

# 三、選擇
q("三、", "選擇題")
para("（　）9. 角的邊長和角的大小有什麼關係？", indent=0.4, keep=True)
para("①邊長越長，角度越大　　②邊長越短，角度越大", indent=1.8, after=0, keep=True)
para("③邊長和角度沒有關係　　④邊長一樣，角度也一樣", indent=1.8)
para("（　）10. 一個角從內圈 20 度線到內圈 95 度線，這個角是幾度？", indent=0.4, keep=True)
para("①20 度　②75 度　③95 度　④115 度", indent=1.8)
assert 95 - 20 == 75
ANS.append("三、9. ③　10. ②（95－20＝75）")

# ── 背面 ──
page_break()
q("四、", "沒有從 0 度線量起，角是幾度？（數一數有幾小格）", before=0)
# 外圈 30→165：射線方向 150°、15°；內圈 10→135：射線方向 10°、135°
grid([[("p", ("11.", "b")), ("img", figs.protractor_span(15, 150), 0.66),
       ("p", "從外圈 30 度線到外圈 165 度線"), ("p", "有（　　）小格，是（　　）度。")],
      [("p", ("12.", "b")), ("img", figs.protractor_span(10, 135), 0.66),
       ("p", "從內圈 10 度線到內圈 135 度線"), ("p", "有（　　）小格，是（　　）度。")]], cols=2)
assert 165 - 30 == 135 and 135 - 10 == 125
ANS.append("四、11. 135，135　12. 125，125")


def draw_cell(fig, gap=5):
    def f(c):
        for _ in range(gap):
            c.add_paragraph().paragraph_format.space_after = Pt(2)
        path, w = fig
        pp = c.add_paragraph(); pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pp.add_run().add_picture(path, width=Cm(w))
    return f


q("五、", "用量角器畫畫看。")
side([(["13. 畫 40 度的角，是（　　）角。"], draw_cell(figs.baseline(4.0))),
      (["14. 畫 85 度的角，是（　　）角。"], draw_cell(figs.baseline(4.0)))])
side([(["15. 畫 105 度的角，是（　　）角。"], draw_cell(figs.baseline(4.0))),
      (["16. 以這條線為邊，畫 135 度的角。"], draw_cell(figs.segment(4.0)))])
q("六、", "17. 小玉、阿宏、小羽量同一個角。誰說得對？在□打ˇ（可以不只一個）。", before=6)
image(figs.protractor(65, "left"), scale=0.62)
para("□ 小玉：從外圈 0 度線到外圈 115 度線，所以是 115 度。", indent=0.8, after=1)
para("□ 阿宏：角的邊對到內圈 65，所以是 65 度。", indent=0.8, after=1)
para("□ 小羽：從內圈 65 度線到內圈 180 度線，有 115 小格，所以是 115 度。", indent=0.8)
assert 180 - 65 == 115
ANS.append("五、13. 40 度，銳角　14. 85 度，銳角　15. 105 度，鈍角　16. 自己選一端當頂點畫 135 度（容許 ±2°）")
ANS.append("六、17. 小玉、小羽對（阿宏讀錯圈：0 度線在左邊要讀外圈）")
save(OUT)
print("saved", OUT)

begin("", base=12)
p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
run(p, "四年級數學 3-1～3-3 複習卷　解析（老師用）", bold=True, size=14)
for a in ANS:
    para(a, size=12, after=4)
ans_out = OUT.replace("題目卷", "解析卷")
save(ans_out)
print("saved", ans_out)
