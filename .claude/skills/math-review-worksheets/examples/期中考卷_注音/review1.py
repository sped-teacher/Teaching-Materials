# 期中複習考 1（第 1～3 單元：大數、乘法、角度）——照期中考卷格式重做（老師 2026-10-22：原本的複習考太簡單）
# A4、雙欄、正反兩面、注音；不給格子和提示；有鑑別題。共用 exam.py 的注音與排版函式。
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["EXAM_ZS"] = "12"   # A4 欄比較窄：注音字 12 號（期中考 B4 是 14 號）
import exam as E
from exam import Z, zp, head, choice, cells, center, ck, lib, figs
from lib import *
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_BREAK

COLW = 8.6     # A4 一欄寬（公分）
ANS = []


def build(path):
    begin("", base=E.ZS, margin=1.2)
    s = lib.doc.sections[0]
    s.page_width, s.page_height = Cm(21.0), Cm(29.7)      # A4
    s.left_margin = s.right_margin = Cm(1.2)
    s.top_margin = s.bottom_margin = Cm(1.0)
    p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "四年級數學　期中複習考 1　第一單元～第三單元", bold=True, size=15)
    p = lib.doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run(p, "座號：＿＿＿　姓名：＿＿＿＿＿＿＿", size=13)
    sec = lib.doc.add_section(WD_SECTION.CONTINUOUS)
    cols = sec._sectPr.xpath("./w:cols")
    c = cols[0] if cols else OxmlElement("w:cols")
    c.set(qn("w:num"), "2"); c.set(qn("w:space"), "480"); c.set(qn("w:sep"), "1")
    if not cols: sec._sectPr.append(c)
    W = [COLW / 2] * 2
    BOT = WD_CELL_VERTICAL_ALIGNMENT.BOTTOM

    # 一、是非
    hp = zp(("一、", "b"), ("對的畫○，錯的畫", "b"), size=15, before=2, after=0, keep=True)
    sr = hp.add_run("✕"); sr.font.size = Pt(17); sr.bold = True; sr.font.name = "Segoe UI Symbol"   # 老師 2026-10-27：用 ✕，大小和 ○ 差不多
    rf = sr._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"): rf.set(qn(a), "Segoe UI Symbol")
    E.thicken(sr)
    zp(("每題 2 分，共 6 分", "s"), size=11, after=2, keep=True).alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for k, st in enumerate(["9999999 再加 1 就是一千萬。", "角的兩邊畫得越長，角就越大。", "1 個周角等於 2 個平角。"], 1):
        zp(("（　）(%d) " % k, "n"), st, indent=1.6, first=-1.6, after=3)
    ck(9999999 + 1 == 10000000 and 360 == 2 * 180, "t")
    ANS.append("一、(1) ○　(2) ×（角的大小看張開的程度）　(3) ○")

    # 二、選擇
    head("二", "選擇題", "每題 2 分，共 10 分")
    choice(1, "30607000 中的「6」表示多少？", ["6萬", "60萬", "600萬", "6000"])
    choice(2, "下面哪一個數最接近 5000 萬？", ["49990000", "50100000", "5000000", "51000000"])
    choice(3, "分針從 3 逆時針轉到 12，轉了幾度？", ["30°", "60°", "90°", "270°"], img=figs.clock(3, 12, False))
    choice(4, "25×40 的積，和下面哪一個一樣？", ["25×4", "250×4", "250×40", "2500×4"])
    choice(5, "下面哪一個是鈍角？", ["45°", "90°", "135°", "180°"])
    ck(30607000 // 100000 % 10 == 6 and 25 * 40 == 250 * 4 and min([49990000, 50100000, 5000000, 51000000],
       key=lambda v: abs(v - 50000000)) == 49990000, "c")
    ANS.append("二、(1) ②　(2) ①（只差 10000）　(3) ③（逆時針 3 大格；④ 是轉錯方向）　(4) ②　(5) ③（180° 是平角）")

    # 三、連連看
    head("三", "把一樣的數連起來", "每題 2 分，共 8 分", below=True)
    L = ["20080000", "20800000", "2008000", "2080000"]
    R = ["二千零八十萬", "二百萬八千", "二百零八萬", "二千零八萬"]   # 每一題都不在同一列
    for i in range(4):
        p = lib.doc.add_paragraph(); pf = p.paragraph_format
        pf.tab_stops.add_tab_stop(Cm(2.6)); pf.tab_stops.add_tab_stop(Cm(3.8))
        pf.space_after = Pt(2); pf.keep_with_next = i < 3
        run(p, f"({i + 1}) {L[i]}\t●\t●" + "ㄅㄆㄇㄈ"[i] + ".", size=E.ZS)
        Z(p, R[i])
    spacer(4)
    ANS.append("三、(1)ㄈ 二千零八萬　(2)ㄅ 二千零八十萬　(3)ㄆ 二百萬八千　(4)ㄇ 二百零八萬")

    # 四、填充
    head("四", "填充題", "每格 2 分，共 18 分")
    # 鑑別題：兩節都要補 0、「12 個百萬」要進位
    zp(("(1) ", "n"), "「六千零八萬零三百」記作", ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(2) ", "n"), "5 個千萬、12 個百萬和 3 個千合起來是", ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(3) ", "n"), "40050800 讀作", ("（　　　　　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(4) 2468 萬＋1375 萬＝（　　　）萬。", "n"), indent=0.8, first=-0.8)
    zp(("(5) 8030000－2650000＝（　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(6) ", "n"), "平角＝", ("（　　）度", "n"), "，周角＝", ("（　　）度。", "n"), indent=0.8, first=-0.8)
    zp(("(7) 300×60＝（　　　），40×500＝（　　　）。", "n"), indent=0.8, first=-0.8)
    ck(6008 * 10000 + 300 == 60080300 and 50000000 + 12000000 + 3000 == 62003000 and 2468 + 1375 == 3843
       and 8030000 - 2650000 == 5380000 and 300 * 60 == 18000 and 40 * 500 == 20000, "f")
    ANS.append("四、(1) 60080300（鑑別題）　(2) 62003000（12 個百萬要進位，鑑別題）　(3) 四千零五萬零八百　(4) 3843　"
               "(5) 5380000　(6) 180，360　(7) 18000，20000（40×500 末尾有 3 個 0）")
    # 五、畫畫看（A4 背面放不下，放正面右欄）
    head("五", "畫畫看", "每題 5 分，共 10 分")
    cells([[("z", ("(1) ", "n"), "從頂點畫一個 125° 的角。")], [("z", ("(2) ", "n"), "從頂點畫一個 40° 的角。")]], W)
    gap = lambda n: ("fn", lambda c: [c.add_paragraph() for _ in range(n)])
    cells([[gap(3), ("img", figs.baseline(3.2))], [gap(3), ("img", figs.baseline(3.2))]], W, valign=BOT)
    ANS.append("五、(1) 125°　(2) 40°（容許 ±2°）")

    zp(("背面還有題目 →", "b"), size=12, before=0).alignment = WD_ALIGN_PARAGRAPH.RIGHT
    lib.doc.paragraphs[-1].add_run().add_break(WD_BREAK.PAGE)

    # 六、直式
    head("六", "用直式算算看", "每題 5 分，共 20 分", below=True)
    blank = lambda n: (lambda c: [c.add_paragraph() for _ in range(n)])

    def ans_line(txt, n):
        def f(c):
            q = c.add_paragraph(); q.paragraph_format.left_indent = Cm(0.5); run(q, txt, size=13)
            blank(n)(c)
        return f
    side([(["(1) 2308×6"], ans_line("＝（　　　　）", 5)), (["(2) 47×36"], ans_line("＝（　　　　）", 5))], widths=W, keep=False)
    side([(["(3) 415×23"], ans_line("＝（　　　　）", 6)), (["(4) 1205×31"], ans_line("＝（　　　　）", 6))], widths=W, keep=False)
    ck(2308 * 6 == 13848 and 47 * 36 == 1692 and 415 * 23 == 9545 and 1205 * 31 == 37355, "v")
    ANS.append("六、(1) 13848　(2) 1692　(3) 9545　(4) 37355（四位×二位，鑑別題）")

    # 七、看圖
    head("七", "看圖回答問題", "每格 2 分，共 12 分", below=True)
    BOT = WD_CELL_VERTICAL_ALIGNMENT.BOTTOM
    PR = dict(R=3.4, fs=1.3)
    cells([[("z", ("(1) ", "n"), "角是幾度？")], [("z", ("(2) ", "n"), "角是幾度？")]], W)
    cells([[("img", figs.protractor(35, "right", **PR), 0.5)], [("img", figs.protractor(50, "left", **PR), 0.5)]], W, valign=BOT)
    center(cells([[("z", ("（　　）度", "n"))], [("z", ("（　　）度", "n"))]], W))
    zp(("(3) ", "n"), "用量角器量量看，在（　）裡寫出幾度，再寫出是銳角、直角，還是鈍角。", size=13, indent=0.8, first=-0.8, keep=True)
    cells([[("img", figs.angle(105, rot=20, arm=2.6))],
           [("z", ("（　　）度，", "n")), ("z", "是", ("（　　）", "n"), "角")]], W, valign=BOT)
    lib.doc.paragraphs[-1].add_run().add_break(WD_BREAK.COLUMN)   # (4)(5) 題目和圖不要拆在兩欄
    cells([[("z", ("(4) ", "n"), "∠ㄅ是幾度？")], [("z", ("(5) ", "n"), "∠ㄆ是幾度？")]], W)
    cells([[("img", figs.rays({"rays": [0, 180, 125], "sectors": [(0, 125, "125°", False, 0.7), (125, 180, "ㄅ", "dark", 0.55)]}), 0.5)],
           [("img", figs.rays({"rays": [0, 100], "sectors": [(0, 100, "100°", False, 0.7), (100, 360, "ㄆ", "dark", 0.45)]}), 0.5)]],
          W, valign=BOT)
    center(cells([[("z", ("（　　）度", "n"))], [("z", ("（　　）度", "n"))]], W))
    ANS.append("七、(1) 35　(2) 130（左邊的 0 讀外圈）　(3) 105 度，鈍角　(4) 180－125＝55　(5) 360－100＝260（周角，鑑別題）（量角容許 ±2°）")

    # 八、應用題
    head("八", "應用題（記得寫「答」）", "(1)(2) 每題 5 分，(3) 6 分，共 16 分", below=True)
    probs = ["博物館去年有 845000 人參觀，今年有 1023000 人參觀，今年比去年多幾人？",
             "1 張門票 285 元，買 16 張要付幾元？",
             "小明每天存 125 元，存了 28 天後，買了一個 2500 元的玩具，還剩幾元？"]   # (3) 兩步驟（鑑別題）
    for k, txt in enumerate(probs, start=1):
        zp(("(%d) " % k, "n"), txt, indent=0.8, first=-0.8, keep=True)
        zp(("　", "n"), indent=0.8, after=74 if k < 3 else 90)
    ck(1023000 - 845000 == 178000 and 285 * 16 == 4560 and 125 * 28 == 3500 and 3500 - 2500 == 1000, "a")
    ANS.append("八、(1) 1023000－845000＝178000，178000 人　(2) 285×16＝4560，4560 元　"
               "(3) 125×28＝3500，3500－2500＝1000，1000 元（鑑別題）")
    p = zp("□我有仔細讀題目　□我有盡力完成", size=12, before=4, after=0)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    save(path)


def answers(path):
    begin("", base=12)
    p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
    run(p, "四年級數學　期中複習考 1（第一～三單元）答案與評分", bold=True, size=14)
    for a in ANS:
        para(a, size=12, after=4)
    para("評分：應用題 (1)(2) 列式 2 分、答 3 分；(3) 兩個算式各 2 分、答 2 分（只算到 125×28＝3500 給 2 分）。"
         "計算題只看答案。量角、畫角容許 ±2°。", size=12, before=6)
    save(path)


if __name__ == "__main__":
    out = sys.argv[1]
    build(os.path.join(out, "複習考1_第1-3單元.docx"))
    answers(os.path.join(out, "複習考1_答案與評分.docx"))
    import zy
    if zy.warn: print("注音沒把握：", sorted(set(zy.warn)))
    print("ok")
