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
    if "\n" in text:   # 手動換行：分段注音，中間插換行
        for k, part in enumerate(text.split("\n")):
            if k: p.add_run().add_break()
            Z(p, part, size, bold)
        return
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


def head(no, name, score, below=False):
    if not below:
        zp((no + "、", "b"), (name, "b"), ("　" + score, "s"), size=15, before=6, keep=True)
        return
    zp((no + "、", "b"), (name, "b"), size=15, before=6, after=0, keep=True)
    zp((score, "s"), size=11, after=2, keep=True).alignment = WD_ALIGN_PARAGRAPH.RIGHT


def choice(n, stem, opts, img=None, img_w=3.0):
    zp(("（　）(%d) " % n, "n"), stem, indent=1.6, first=-1.6, keep=True)
    if img:   # 題目和選項中間放圖
        q = lib.doc.add_paragraph(); q.paragraph_format.left_indent = Cm(1.6)
        q.paragraph_format.space_after = Pt(0); q.paragraph_format.keep_with_next = True
        q.add_run().add_picture(img[0], width=Cm(img_w))
    if sum(len(o) for o in opts) <= 14:
        zp(*sum([[("%s" % "①②③④"[i], "n"), o, ("　", "n")] for i, o in enumerate(opts)], []), indent=1.6, after=4, size=ZS - 1)
        return
    for a in (0, 2):
        p = zp(("①②③④"[a], "n"), opts[a], ("	" + "①②③④"[a + 1], "n"), opts[a + 1], indent=1.6, after=4 if a else 1,
               size=ZS - 2, keep=not a)   # 兩行兩個：小一級字，長選項才不會斷字
        p.paragraph_format.tab_stops.add_tab_stop(Cm(5.6))


def cells(row, widths, valign=WD_CELL_VERTICAL_ALIGNMENT.TOP):
    t = lib.doc.add_table(rows=1, cols=len(row))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sz=0)
    for k, items in enumerate(row):
        c = t.cell(0, k); c.width = Cm(widths[k])
        c.vertical_alignment = valign
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
    head("一", "對的畫○，錯的畫×", "每題 2 分，共 6 分", below=True)
    for st in ["直角三角形有 2 個直角。", "正三角形的 3 個角都是 60°。", "等腰三角形的 2 個底角\n一樣大。"]:   # 手動換行，「一樣」不要被切開
        zp(("（　　）", "n"), st, indent=2.4, first=-2.0, after=3)   # 懸掛縮排：換行對齊題目文字
    ANS.append("一、×、○、○")

    # 二、選擇題
    head("二", "選擇題", "每題 2 分，共 8 分")
    choice(1, T("動物園的看板顯示累積遊客 60070800 人，其中的「7」表示多少？", "60070800 中的「7」表示多少？"),
           ["7萬", "70萬", "7千", "700"])
    choice(2, T("下面是 4 間動物園的遊客人數，哪一個最多？", "下面哪一個數最大？"),
           ["9999999", "10000000", "9900000", "999999"])
    choice(3, T("集合時間到了！時鐘的分針從 12 順時針轉到 4，轉了幾度？", "分針從 12 順時針轉到 4，轉了幾度？"),
           ["60°", "90°", "120°", "150°"], img=figs.clock(0, 4))   # 老師：時鐘題附圖
    ck(4 * 30 == 120, "c3")
    choice(4, T("告示牌是三角形，3 個邊都一樣長，它是什麼三角形？", "3 個邊都一樣長的三角形，叫作什麼？"),
           ["直角三角形", "正三角形", "鈍角三角形", "等腰直角三角形"])
    ANS.append("二、(1) ①　(2) ②　(3) ③　(4) ②")

    # 三、連連看
    head("三", "把一樣的數連起來", "每題 2 分，共 8 分", below=True)
    L = ["30050000", "30500000", "3005000", "3050000"]
    R = ["三百萬五千", "三百零五萬", "三千零五十萬", "三千零五萬"]   # 每一題都不在同一列（線都要斜著連）
    for i in range(4):
        p = lib.doc.add_paragraph()
        pf = p.paragraph_format
        pf.tab_stops.add_tab_stop(Cm(3.3)); pf.tab_stops.add_tab_stop(Cm(5.2))
        pf.space_after = Pt(2); pf.left_indent = Cm(0)
        pf.keep_with_next = i < 3   # 4 題排在同一欄，不要斷開
        run(p, f"({i + 1}) {L[i]}\t●\t●" + "ㄅㄆㄇㄈ"[i] + ".", size=ZS)
        Z(p, R[i])
    spacer(4)
    ANS.append("三、(1)ㄈ 三千零五萬　(2)ㄇ 三千零五十萬　(3)ㄅ 三百萬五千　(4)ㄆ 三百零五萬")

    # 四、填充題（8 格）
    head("四", "填充題", "每格 2 分，共 24 分")
    # 鑑別題 1（老師 2026-10-20）：兩節都要補 0 的寫數，預期錯誤 3005060、300560
    zp(("(1) ", "n"), T("看板寫著「三千零五萬零六十」，記作", "「三千零五萬零六十」記作"), ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    zp(("(2) ", "n"), T("累積人數 45670000 再多 1000000 人，是", "45670000 加 1000000 是"), ("（　　　　　　）。", "n"), indent=0.8, first=-0.8)
    # 轉出來的「角」才是平角／周角（不是旋轉木馬是平角）；兩行並列，一行一格
    zp(("(3) ", "n"), T("時鐘分針轉半圈\n是平角＝", "平角＝"), ("（　　）度", "n"), T("；\n轉一整圈是周角＝", "，周角＝"),   # 老師訂的敘述
       ("（　　）度。", "n"), indent=0.8, first=-0.8)
    zp(("(4) 30×40＝（　　　），800÷20＝（　　　）。", "n"), indent=0.8, first=-0.8)
    ck(45670000 + 1000000 == 46670000 and 70 + 60 + 50 == 180 and max(70, 60, 50) < 90 and 30 * 40 == 1200 and 800 // 20 == 40, "c4")
    ck(3005 * 10000 + 60 == 30050060, "c4a")
    ANS.append("四、(1) 30050060　(2) 46670000　(3) 180，360　(4) 1200，40")

    zp(("(5) ", "n"), T("動物園的兩面告示牌是全等的三角形，填填看。", "下面兩個三角形全等，填填看。"), indent=0.8, first=-0.8, keep=True)
    # 全等三角形（照課本題型，老師 2026-10-21）：左邊標 3 個角和 2 條邊，右邊轉了方向、不標；
    # 先找對應，再用對應填邊長和角度。∠A110°、∠B45°、∠C25°，AB 6、AC 10（邊長比例和角度一致）
    import math
    Bp, Cp = (0.0, 0.0), (5.0, 0.0)
    ab = 5.0 * math.sin(math.radians(25)) / math.sin(math.radians(110))
    Ap = (ab * math.cos(math.radians(45)), ab * math.sin(math.radians(45)))

    def Tf(p, deg=160):   # 翻面再轉一個角度
        x, y = -p[0], p[1]; r = math.radians(deg)
        return (x * math.cos(r) - y * math.sin(r), x * math.sin(r) + y * math.cos(r))
    t1 = figs.tri([Ap, Bp, Cp], labels=[(0, "A", 0.35), (1, "B", 0.35), (2, "C", 0.35)],
                  angles=[(0, "110°", 0.5), (1, "45°", 0.85), (2, "25°", 1.5)],
                  sides=[((0, 1), "6 公分", 0.5), ((0, 2), "10 公分", 0.5)])
    t2 = figs.tri([Tf(Ap), Tf(Cp), Tf(Bp)], labels=[(0, "D", 0.35), (1, "E", 0.35), (2, "F", 0.35)])
    cells([[("img", t1, 0.8)], [("img", t2, 0.8)]], [COLW / 2] * 2, valign=WD_CELL_VERTICAL_ALIGNMENT.CENTER)
    zp(("① ", "n"), "頂點 A 的對應點是頂點", ("（　　）", "n"), "。", indent=1.5, first=-0.7)
    zp(("② ", "n"), "邊 DE 的對應邊是邊", ("（　　）", "n"), "，\nDE 長", ("（　　）", "n"), "公分。", indent=1.5, first=-0.7)
    zp(("③ ", "n"), "∠E 的對應角是∠", ("（　　）", "n"), "，\n∠E 是", ("（　　）", "n"), "度。", indent=1.5, first=-0.7)
    zp(("④ ", "n"), "三角形 DEF 是", ("（　　）", "n"), "三角形。（銳角、直角、鈍角）", indent=1.5, first=-0.7)
    ck(abs(ab / (5.0 * math.sin(math.radians(45)) / math.sin(math.radians(110))) - 0.6) < 0.01, "c5c")   # AB:AC＝6:10
    ANS.append("四、(5) ① D　② AC，10　③ C，25　④ 鈍角（∠A＝110°）")

    # 換到背面
    zp(("背面還有題目 →", "b"), size=12, before=0).alignment = WD_ALIGN_PARAGRAPH.RIGHT
    lib.doc.paragraphs[-1].add_run().add_break(WD_BREAK.PAGE)

    # 五、計算（考試不給直式格）
    head("五", "用直式算算看", "每題 5 分，共 20 分")
    W = [COLW / 2] * 2
    blank = lambda n: (lambda c: [c.add_paragraph() for _ in range(n)])

    def ans_line(txt, n):   # 答案括號放在題目下一行（半欄放不下一整行）
        def f(c):
            q = c.add_paragraph(); q.paragraph_format.left_indent = Cm(0.6); run(q, txt, size=13)
            blank(n)(c)
        return f
    side([(["(1) 2307×4"], ans_line("＝（　　　　）", 6)), (["(2) 234×16"], ans_line("＝（　　　　）", 6))], widths=W, keep=False)
    side([(["(3) 6408÷8"], ans_line("＝（　　　　）", 8)), (["(4) 758÷23"], ans_line("＝（　 ）餘（　 ）", 8))], widths=W, keep=False)
    ck(2307 * 4 == 9228 and 234 * 16 == 3744 and 8 * 801 == 6408 and 23 * 32 + 22 == 758 and 22 < 23, "c5b")   # (4) 三位÷二位、商二位數（鑑別題，老師 2026-10-20）
    ANS.append("五、(1) 9228　(2) 3744　(3) 801　(4) 32 餘 22（鑑別題）")

    # 六、看圖回答
    head("六", "看圖回答問題", "每格 2 分，共 12 分")
    if ctx: zp("小芸用量角器量園區地圖上的角。", size=13)
    BOT = WD_CELL_VERTICAL_ALIGNMENT.BOTTOM
    cells([[("img", figs.protractor(40, "right"), 0.66)], [("img", figs.protractor(70, "left"), 0.66)]], W, valign=BOT)
    cells([[("z", ("(1) ", "n"), "角是", ("（　　）度", "n"))], [("z", ("(2) ", "n"), "角是", ("（　　）度", "n"))]], W)
    zp("用量角器量量看，在（　）裡寫出幾度，再寫出是銳角、直角，還是鈍角。", size=13, keep=True)
    cells([[("img", figs.angle(130, rot=15, arm=3.0))],
           [("z", ("(3)（　　）度，", "n")), ("z", ("　　", "n"), "是", ("（　　）", "n"), "角")]], W,
          valign=WD_CELL_VERTICAL_ALIGNMENT.BOTTOM)
    cells([[("z", ("(4) ", "n"), "∠ㄅ是幾度？"),
            ("img", figs.rays({"rays": [0, 55, 90], "right": [0], "sectors": [(55, 90, "35°", False, 1.0), (0, 55, "ㄅ", "dark", 0.5)]}), 0.55)],
           [("z", ("(5) ", "n"), "∠ㄆ是幾度？"),
            ("img", figs.rays({"rays": [0, 180, 110], "sectors": [(0, 110, "110°", False, 0.7), (110, 180, "ㄆ", "dark", 0.5)]}), 0.55)]],
          W, valign=BOT)
    cells([[("z", ("（　　）度", "n"))], [("z", ("（　　）度", "n"))]], W)
    ANS.append("六、(1) 40　(2) 110　(3) 130°，鈍（角）　(4) 90－35＝55　(5) 180－110＝70（量角題容許 ±2°）")

    # 八、畫畫看：從右欄開始（不要拆在兩欄）
    lib.doc.paragraphs[-1].add_run().add_break(WD_BREAK.COLUMN)
    head("七", "畫畫看", "(1) 3 分，(2) 4 分，共 7 分")
    # 兩題左右並排（右欄放不下上下排）：上列題目、下列留空和底線（底線靠下對齊）
    W2 = [COLW / 2] * 2
    cells([[("z", ("(1) ", "n"), "用量角器從頂點畫一個 70° 的角。")],
           [("z", ("(2) ", "n"), "畫一個兩邊\n都是 3 公分的\n等腰三角形。")]], W2)   # 半欄窄：手動換行，「等腰」不要被切開
    gap = lambda n: ("fn", lambda c: [c.add_paragraph() for _ in range(n)])
    cells([[gap(5), ("img", figs.baseline(4.0))], [gap(6)]], W2,
          valign=WD_CELL_VERTICAL_ALIGNMENT.BOTTOM)
    ANS.append("七、(1) 畫出 70° 的角（容許 68°～72°）　(2) 兩邊都是 3 公分（容許 ±0.2 公分），三邊連成三角形")

    # 八、應用題（3 題，數字比較小；只給「列式」和「答」，不印單位）
    head("八", "應用題（記得寫「答」）", "每題 5 分（列式 2 分、答 3 分），共 15 分", below=True)
    probs = [
        T("動物園去年約有 126 萬位遊客，今年約有 143 萬位，今年多了幾萬位？", "去年有 126 萬人，今年有 143 萬人，今年比去年多幾萬人？"),
        # 鑑別題 2：兩步驟（先乘再減），預期錯誤：只算到 1440 就寫答
        T("1 張門票 45 元，\n全班和老師共 32 人。\n老師付了 2000 元，可以找回幾元？","1 張票 45 元，買 32 張，\n付 2000 元，找回幾元？"),
        T("飼育員有 470 顆飼料球，每 6 顆裝一袋，可以裝幾袋？還剩幾顆？", "470 顆糖，每 6 顆裝一袋，可以裝幾袋？還剩幾顆？"),
    ]
    for k, txt in enumerate(probs, start=1):
        zp(("(%d) " % k, "n"), txt, indent=0.8, first=-0.8, keep=True)
        zp(("　", "n"), indent=0.8, after=78)
    ck(143 - 126 == 17 and 45 * 32 == 1440 and 2000 - 1440 == 560 and 6 * 78 + 2 == 470, "c8")
    ANS.append("八、(1) 143－126＝17，17 萬人（位）　(2) 45×32＝1440，2000－1440＝560，560 元（鑑別題）　(3) 470÷6＝78…2，78 袋剩 2 顆")
    p = zp("□我有仔細讀題目　□我有盡力完成", size=12, before=8, after=0)   # 老師改成兩行
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    zp("寫完了，請仔細檢查！", size=12).alignment = WD_ALIGN_PARAGRAPH.CENTER
    save(path)


def answers(path):
    begin("", base=12)
    p = lib.doc.paragraphs[0] if lib.doc.paragraphs else lib.doc.add_paragraph()
    run(p, "四年級數學期中考（潛能教室）答案與評分　情境版、精簡版題目相同", bold=True, size=14)
    for a in ANS:
        para(a, size=12, after=4)
    para("評分：應用題列式 2 分、答 3 分（答案對但沒寫列式給 3 分；列式對、計算錯給 2 分；第 (2) 題只算到 45×32＝1440 給列式 1 分；第 (3) 題袋數、剩幾顆少寫一個扣 1 分）。計算題只看答案。量角、畫角容許 ±2°。", size=12, before=6)
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
