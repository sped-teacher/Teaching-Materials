# 四上數學期中考（潛能教室）：同一組題目，情境版／精簡版
import sys, os
sys.path.insert(0, r"C:\Users\class\Documents\teaching-materials\.claude\skills\math-review-worksheets\scripts")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import lib
import figs
import zy
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_BREAK

ZS = 14          # 題目字級（注音字型）
COLW = 10.6      # 一欄寬（公分）
ANS = []


def ck(c, m):
    assert c, m


def Z(p, text, size=ZS, bold=False):
    if not text: return
    for c, f in zy.fonts_of(text):
        r = p.add_run(c)
        r.font.size = Pt(size); r.bold = bold
        name = f or FONT
        r.font.name = name
        rf = r._element.get_or_add_rPr().get_or_add_rFonts()
        for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rf.set(qn(a), name)


def fill(p, parts, size=ZS):
    for x in parts:
        if isinstance(x, tuple):
            t, k = x
            if k == "b": Z(p, t, size, bold=True)
            elif k == "n": run(p, t, size=size)           # 不加注音（數字、括號）
            elif k == "s": run(p, t, size=11)              # 小字（配分）
        else:
            Z(p, x, size)


def zp(*parts, size=ZS, indent=0, first=0, before=0, after=2, keep=False, container=None):
    p = (container or lib.doc).add_paragraph()
    pf = p.paragraph_format
    pf.left_indent = Cm(indent); pf.first_line_indent = Cm(first)
    pf.space_before = Pt(before); pf.space_after = Pt(after); pf.line_spacing = 1.05
    if keep: pf.keep_with_next = True
    fill(p, parts, size)
    return p


def head(no, name, score):
    zp((no + "、", "b"), (name, "b"), ("　" + score, "s"), size=15, before=6, keep=True)


def choice(n, stem, opts):
    zp(("（　）(%d) " % n, "n"), stem, indent=1.6, first=-1.6, keep=True)
    zp(*sum([[("%s" % "①②③④"[i], "n"), o, ("　", "n")] for i, o in enumerate(opts)], []), indent=1.6, after=4, size=ZS - 1)


def cells(row, widths):
    t = lib.doc.add_table(rows=1, cols=len(row))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sz=0)
    for k, items in enumerate(row):
        c = t.cell(0, k); c.width = Cm(widths[k])
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        first = True
        for it in items:
            p = c.paragraphs[0] if first else c.add_paragraph()
            first = False
            p.paragraph_format.space_after = Pt(1)
            if it[0] == "img":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                path, w = it[1]
                p.add_run().add_picture(path, width=Cm(w * (it[2] if len(it) > 2 else 1.0)))
            elif it[0] == "fn":
                it[1](c)
            else:
                fill(p, it[1:], size=it[1] if False else ZS - 1)
    spacer(3)
    return t


def build(path, ctx):
    T = (lambda a, b: a if ctx else b)    # 情境文字、精簡文字
    begin("", base=ZS, margin=1.3)
    s = lib.doc.sections[0]
    s.page_width, s.page_height = Cm(25.7), Cm(36.4)       # B4
    s.left_margin = s.right_margin = Cm(1.4)
    s.top_margin = s.bottom_margin = Cm(1.0)
    # ── 抬頭（單欄）──
    p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "115學年度臺中市北區省三國小潛能教室　第一學期第一次定期成績評量　四年級數學領域", bold=True, size=16)
    t = lib.doc.add_table(rows=1, cols=2); borders(t, sz=0)
    a, b = t.cell(0, 0), t.cell(0, 1); a.width, b.width = Cm(9.5), Cm(13.3)
    pa = a.paragraphs[0]
    r = run(pa, "範圍：第一單元～第五單元", bold=True, size=13)
    rpr = r._element.get_or_add_rPr(); bd = OxmlElement("w:bdr")
    for k, v in (("w:val", "single"), ("w:sz", "8"), ("w:space", "1"), ("w:color", "000000")): bd.set(qn(k), v)
    rpr.append(bd)
    if not ctx: run(pa, "　報讀協助", size=12)
    pb = b.paragraphs[0]; pb.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run(pb, "四年＿＿班　姓名：＿＿＿＿＿＿＿　座號：＿＿＿", size=14)
    if ctx:
        zp("小芸和同學們今天要去動物園校外教學！跟著他們一起完成任務吧！", size=13, before=2)
    # ── 兩欄 ──
    sec = lib.doc.add_section(WD_SECTION.CONTINUOUS)
    cols = sec._sectPr.xpath("./w:cols")
    c = cols[0] if cols else OxmlElement("w:cols")
    c.set(qn("w:num"), "2"); c.set(qn("w:space"), "560"); c.set(qn("w:sep"), "1")
    if not cols: sec._sectPr.append(c)

    # 題型順序（老師 2026-10-15）：由易到難——正面都是短題（選擇、是非、連連看、填充），花力氣的（計算、量角、作圖、應用題）在背面。
    # 題量對照學校前兩次潛能教室考卷：短題多、大計算約 5 題（計算 3＋應用 3 題數字小）；考試不給直式格和提示。
    # 一、是非
    head("一", "對的畫○，錯的畫×", "每題 2 分，共 6 分")
    for st in ["3 個角都比 90° 小的三角形，是銳角三角形。", "直角三角形有 2 個直角。", "正三角形的 3 個角都是 60°。"]:
        zp(("（　　）", "n"), st, indent=0.4, after=3)
    ANS.append("一、○、×、○")

    # 二、選擇題
    head("二", "選擇題", "每題 2 分，共 10 分")
    choice(1, T("動物園的看板顯示累積遊客 60070800 人，其中的「7」表示多少？", "60070800 中的「7」表示多少？"),
           ["7萬", "70萬", "7千", "700"])
    choice(2, T("哪一間動物園的遊客人數最多？", "下面哪一個數最大？"),
           ["9999999", "10000000", "9900000", "999999"])
    choice(3, T("小芸量了園區地圖上的 4 個角，哪一個是鈍角？", "下面哪一個是鈍角？"), ["45°", "90°", "120°", "180°"])
    choice(4, T("告示牌是三角形，3 個邊都一樣長，它是什麼三角形？", "3 個邊都一樣長的三角形，叫作什麼？"),
           ["直角三角形", "正三角形", "鈍角三角形", "等腰直角三角形"])
    choice(5, T("89 份飼料分給 29 隻兔子，每隻大約分到幾份？", "89÷29 的商最接近多少？"), ["2", "3", "4", "5"])
    ck(abs(89 / 29 - 3) < 0.5, "c5")
    ANS.append("二、(1) ①　(2) ②　(3) ③　(4) ②　(5) ②")

    # 三、連連看
    head("三", "把一樣的數連起來", "每題 2 分，共 8 分")
    L = ["30050000", "30500000", "3005000", "3050000"]
    R = ["三百零五萬", "三千零五萬", "三百萬五千", "三千零五十萬"]
    for i in range(4):
        p = lib.doc.add_paragraph()
        pf = p.paragraph_format
        pf.tab_stops.add_tab_stop(Cm(3.3)); pf.tab_stops.add_tab_stop(Cm(5.2))
        pf.space_after = Pt(6); pf.left_indent = Cm(0)
        pf.keep_with_next = i < 3   # 4 題排在同一欄，不要斷開
        run(p, f"({i + 1}) {L[i]}\t●\t●" + "ㄅㄆㄇㄈ"[i] + ".", size=ZS)
        Z(p, R[i])
    spacer(4)
    ANS.append("三、(1)ㄆ 三千零五萬　(2)ㄈ 三千零五十萬　(3)ㄇ 三百萬五千　(4)ㄅ 三百零五萬")

    # 四、填充題（8 格）
    head("四", "填充題", "每格 2 分，共 14 分")
    zp(("(1) ", "n"), T("看板寫著「三千零五十萬六千」，記作", "「三千零五十萬六千」記作"), ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(2) ", "n"), T("表上寫著 7 個千萬、4 個十萬和 9 個百，合起來是", "7 個千萬、4 個十萬和 9 個百合起來是"), ("（　　　　　　）。", "n"),
       indent=0.8, first=-0.8)
    zp(("(3) ", "n"), T("累積人數 45670000 再多 1000000 人，是", "45670000 加 1000000 是"), ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(4) ", "n"), T("甲園 2500 萬人加乙園 1800 萬人，", ""), ("2500 萬＋1800 萬＝（　　　）萬", "n") if not ctx else "合起來是",
       ("（　　　）萬人。", "n") if ctx else ("。", "n"), indent=0.8, first=-0.8)
    zp(("(5) ", "n"), T("旋轉木馬轉半圈是平角，是", "平角＝"), ("（　　　）度", "n"), T("；轉一整圈是周角，是", "，周角＝"),
       ("（　　　）度。", "n"), indent=0.8, first=-0.8)
    zp(("(6) ", "n"), T("集合了！時鐘的分針從 12 順時針轉到 4，轉了", "分針從 12 順時針轉到 4，轉了"), ("（　　　）度。", "n"),
       indent=0.8, first=-0.8)
    ck(45670000 + 1000000 == 46670000 and 2500 + 1800 == 4300 and 4 * 30 == 120, "c4")
    ANS.append("四、(1) 30506000　(2) 70400900　(3) 46670000　(4) 4300　(5) 180，360　(6) 120")

    # 換到背面
    zp(("背面還有題目 →", "b"), size=12, before=6).alignment = WD_ALIGN_PARAGRAPH.RIGHT
    lib.doc.paragraphs[-1].add_run().add_break(WD_BREAK.PAGE)

    # 五、計算（考試不給直式格）
    head("五", "用直式算算看", "每題 5 分，共 20 分")
    W = [COLW / 2] * 2
    blank = lambda n: (lambda c: [c.add_paragraph() for _ in range(n)])
    side([(["(1) 2307×4＝（　　）"], blank(6)), (["(2) 46×23＝（　　）"], blank(6))], widths=W, keep=False)
    side([(["(3) 6408÷8＝（　　）"], blank(7)), (["(4) 86÷21＝（ ）…（ ）"], blank(7))], widths=W, keep=False)
    ck(2307 * 4 == 9228 and 46 * 23 == 1058 and 8 * 801 == 6408 and 21 * 4 + 2 == 86, "c5b")
    ANS.append("五、(1) 9228　(2) 1058　(3) 801　(4) 4…2")

    # 六、看圖回答
    head("六", "看圖回答問題", "(1)(2)(5)(6) 每題 2 分，(3)(4) 每格 2 分，共 16 分")
    if ctx: zp("小芸用量角器量園區地圖上的角。", size=13)
    cells([[("img", figs.protractor(40, "right"), 0.66), ("z", ("(1) ", "n"), "角是", ("（　　）", "n"), "度")],
           [("img", figs.protractor(70, "left"), 0.66), ("z", ("(2) ", "n"), "角是", ("（　　）", "n"), "度")]], W)
    zp("用量角器量量看，再從框框裡選出角的名稱：", ("［銳角　直角　鈍角］", "b"), size=13, keep=True)
    cells([[("img", figs.angle(55, rot=20, arm=3.0)), ("z", ("(3) （　　）", "n"), "度，", ("（　　）", "n"))],
           [("img", figs.angle(130, rot=15, arm=3.0)), ("z", ("(4) （　　）", "n"), "度，", ("（　　）", "n"))]], W)
    cells([[("z", ("(5) ", "n"), "∠ㄅ是幾度？"),
            ("img", figs.rays({"rays": [0, 55, 90], "right": [0], "sectors": [(55, 90, "35°", False, 1.0), (0, 55, "ㄅ", "dark", 0.5)]}), 0.55),
            ("z", ("（　　）", "n"), "度")],
           [("z", ("(6) ", "n"), "∠ㄆ是幾度？"),
            ("img", figs.rays({"rays": [0, 180, 110], "sectors": [(0, 110, "110°", False, 0.7), (110, 180, "ㄆ", "dark", 0.5)]}), 0.55),
            ("z", ("（　　）", "n"), "度")]], W)
    ANS.append("六、(1) 40　(2) 110　(3) 55 度，銳角　(4) 130 度，鈍角　(5) 90－35＝55　(6) 180－110＝70（量角題容許 ±2°）")

    # 七、畫畫看
    head("七", "畫畫看", "共 5 分")
    zp("用量角器從頂點畫一個 70° 的角。", indent=0.4, keep=True)
    for _ in range(6):   # 留畫角的空間（角會往上張開）
        e = lib.doc.add_paragraph(); e.paragraph_format.keep_with_next = True
    image(figs.baseline(5.0))
    ANS.append("七、畫出 70° 的角（容許 68°～72°）")

    # 八、應用題（3 題，數字比較小；只給「列式」和「答」，不印單位）
    head("八", "應用題（記得寫「答」）", "每題 7 分（列式 3 分、答案 4 分），共 21 分")
    probs = [
        T("動物園去年約有 126 萬位遊客，今年約有 143 萬位，今年多了幾萬位？", "去年有 126 萬人，今年有 143 萬人，今年比去年多幾萬人？"),
        T("全班和老師共 32 人，1 張門票 45 元，一共要付幾元？", "1 張票 45 元，買 32 張，要付幾元？"),
        T("飼育員有 470 顆飼料球，每 6 顆裝一袋，可以裝幾袋？還剩幾顆？", "470 顆糖，每 6 顆裝一袋，可以裝幾袋？還剩幾顆？"),
    ]
    for k, txt in enumerate(probs, start=1):
        zp(("(%d) " % k, "n"), txt, indent=0.8, first=-0.8, keep=True)
        zp(("　", "n"), indent=0.8, after=92)
    ck(143 - 126 == 17 and 45 * 32 == 1440 and 6 * 78 + 2 == 470, "c8")
    ANS.append("八、(1) 143－126＝17，17 萬人（位）　(2) 45×32＝1440，1440 元　(3) 470÷6＝78…2，78 袋剩 2 顆")
    p = zp("□我有仔細讀題目　□我有盡力完成　寫完了，請仔細檢查！", size=12, before=8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    save(path)


def answers(path):
    begin("", base=12)
    p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
    run(p, "四年級數學期中考（潛能教室）答案與評分　情境版、精簡版題目相同", bold=True, size=14)
    for a in ANS:
        para(a, size=12, after=4)
    para("評分：應用題列式 3 分、答案 4 分（答案對但沒寫列式給 4 分；列式對、計算錯給 3 分）。計算題只看答案。量角、畫角容許 ±2°。", size=12, before=6)
    save(path)


if __name__ == "__main__":
    out = sys.argv[1]
    build(os.path.join(out, "四上數學期中考_情境版.docx"), True)
    n = len(ANS)
    build(os.path.join(out, "四上數學期中考_精簡版_報讀.docx"), False)
    del ANS[n:]
    answers(os.path.join(out, "四上數學期中考_答案與評分.docx"))
    if zy.warn: print("注音沒把握：", sorted(set(zy.warn)))
    print("ok")
