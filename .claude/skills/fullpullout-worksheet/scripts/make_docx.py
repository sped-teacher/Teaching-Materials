"""全抽組作業：產生可以編輯的 Word 檔（第XX課_全抽作業.docx），再用 Word 轉成 PDF（內容和 Word 一模一樣）。

注音用「文鼎標楷注音」字型（破音一～五換讀音），程式會自動選對讀音的字型；
老師在 Word 裡看到注音不對，把那個字的字型換成「文鼎標楷注音破音一／二…」就可以。
"""
import io, json, os, re, sys
from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image, ImageEnhance

HERE = Path(__file__).parent
LID = sys.argv[1] if len(sys.argv) > 1 else '02'
LEVEL = int(sys.argv[2]) if len(sys.argv) > 2 else 0   # 版面等級（fit.py 會傳）
HMODE = sys.argv[3] if len(sys.argv) > 3 else 'top'    # 課次位置（老師決定統一放標題上面）
os.environ['WS_LID'] = LID
sys.path.insert(0, str(HERE))
from common import L, zy_of, KNOWN, SITE, OUT, NUM, DATA  # noqa: E402
EX = json.loads((DATA / f'{LID}.json').read_text(encoding='utf-8'))
import zyfont  # noqa: E402

KAI = '標楷體'
GRAY = RGBColor(0x6B, 0x7C, 0x8F)
NAVY = RGBColor(0x44, 0x60, 0x7D)
FILL = {'green': 'E1EEDF', 'blue': 'DFE8F3', 'red': 'F5E0DE', 'orange': 'F6E8D6', 'purple': 'E9E2F0', 'gray': 'F1F3F5', 'tag': 'F6EDD2', 'hl': 'F2EAD0'}
LINE = {'green': '6F9A68', 'blue': '6C8DB3', 'red': 'B97A74', 'orange': 'C09A68', 'purple': '9483AD', '': '555555'}
COLOR = {'v': 'red', 'n': 'blue', 'r': 'purple', 'a': 'green', 'q': 'orange'}
warn = []

doc = Document()
st = doc.styles['Normal']
st.font.name = KAI
st.font.size = Pt(14)
st.element.rPr.rFonts.set(qn('w:eastAsia'), KAI)
st.paragraph_format.space_after = Pt(0)
st.paragraph_format.space_before = Pt(0)
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(1.1)
sec.top_margin = sec.bottom_margin = Cm(1.0)
WIDTH = 21 - 2.2


def font_of(run, name):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rf.set(qn(a), name)


def shade(el, fill):
    pr = el.get_or_add_rPr() if hasattr(el, 'get_or_add_rPr') else el
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), fill)
    pr.append(s)


def add(p, text, size=None, bold=False, color=None, font=None, fill=None):
    r = p.add_run(text)
    if size:
        r.font.size = Pt(size)
    r.bold = bold
    if color:
        r.font.color.rgb = color
    if font:
        font_of(r, font)
    if fill:
        shade(r._element, FILL[fill])
    return r


def blank(p, n, color='', size=None):
    """寫字底線：用全形底線字元「＿」（有顏色、淡底色）。行尾的空白加底線 Word 會不顯示，所以不用空白。"""
    r = add(p, '_' * (n * 2), size=size, color=RGBColor.from_string(LINE[color]), font=KAI)   # 半形底線連在一起，Word 不會從中間換行
    if color:
        shade(r._element, FILL[color])
    return r


def zy_text(p, text, size, zy=None):
    """注音字型：每個字依讀音選「文鼎標楷注音」或破音字型；標點用標楷體。"""
    pairs = list(zip(text, zy.split())) if zy and len(zy.split()) == len(text) else zy_of(text)
    for c, z in pairs:
        if z and re.match(r'[㐀-鿿]', c):
            i, d = zyfont.variant(c, z)
            if i is None or d > 30:
                warn.append(f'{c}{z}')
                i = 0
            add(p, c, size=size, font=zyfont.NAMES[i])
        else:
            add(p, c, size=size, font=KAI)


def cell_border(cell, color='C9D3DD', sz=8, sides=('top', 'left', 'bottom', 'right')):
    tcPr = cell._tc.get_or_add_tcPr()
    b = OxmlElement('w:tcBorders')
    for s in ('top', 'left', 'bottom', 'right'):
        e = OxmlElement(f'w:{s}')
        if s in sides:
            e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(sz)); e.set(qn('w:color'), color)
        else:
            e.set(qn('w:val'), 'nil')
        b.append(e)
    tcPr.append(b)


def cell_fill(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), FILL[fill])
    tcPr.append(s)


def table(rows, cols, widths, borders=True):
    t = doc.add_table(rows=rows, cols=cols)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for row in t.rows:
        for k, c in enumerate(row.cells):
            c.width = Cm(widths[k])
            if borders:
                cell_border(c)
            else:
                cell_border(c, sides=())
    return t


def para(cell_or_doc, first=False, align=None, before=0, after=0, line=None):
    if first and hasattr(cell_or_doc, 'paragraphs') and cell_or_doc.paragraphs and not cell_or_doc.paragraphs[0].text and not cell_or_doc.paragraphs[0].runs:
        p = cell_or_doc.paragraphs[0]
    else:
        p = cell_or_doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if line:
        pf.line_spacing = line
    if align:
        p.alignment = align
    return p


def picture(p, name, cm):
    srcp = SITE / 'images' / f'lesson{LID}' / f'{name}.webp'
    if not srcp.exists():
        add(p, '（圖）', size=10, color=GRAY)
        return
    im = Image.open(srcp).convert('RGB').resize((360, 360))
    im = ImageEnhance.Color(im).enhance(0.35)
    im = Image.blend(im, Image.new('RGB', im.size, 'white'), 0.18)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=82); buf.seek(0)
    p.add_run().add_picture(buf, width=Cm(cm))


def header(no, title, how, newpage=False):
    """標題：第一行淡色小字課次（或放頁尾），第二行主題，全部靠左；座號姓名靠右。"""
    cn = NUM[L['no']] if L['no'] <= 10 else '十' + NUM[L['no'] - 10]
    lesson = f'第{cn}課　{L["title"]}'
    if HMODE == 'top':
        p = para(doc)
        p.paragraph_format.page_break_before = newpage
        add(p, lesson, size=10, color=GRAY)
    p = para(doc, after=2)
    if HMODE != 'top':
        p.paragraph_format.page_break_before = newpage
    from docx.enum.text import WD_TAB_ALIGNMENT
    p.paragraph_format.tab_stops.add_tab_stop(Cm(WIDTH), WD_TAB_ALIGNMENT.RIGHT)
    add(p, f'{no}　{title}', size=18, bold=True, color=NAVY)
    add(p, '	'); add(p, '座號＿＿＿　姓名＿＿＿＿＿＿', size=12)
    pPr = p._p.get_or_add_pPr()
    bdr = OxmlElement('w:pBdr'); b = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), '12'); b.set(qn('w:color'), '9FB3C8'); b.set(qn('w:space'), '1')
    bdr.append(b); pPr.append(bdr)
    add(para(doc, before=3, after=4), how, size=14)


if HMODE != 'top':
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cn_ = NUM[L['no']] if L['no'] <= 10 else '十' + NUM[L['no'] - 10]
    add(fp, f'第{cn_}課　{L["title"]}', size=9, color=GRAY)
    sec.footer_distance = Cm(0.5)


def tiny(container):
    """表格後面 Word 一定要有一個段落：做成 1 點高，不佔版面。"""
    p = container.add_paragraph()
    p.paragraph_format.line_spacing = Pt(1)
    add(p, '', size=1)
    return p


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ── ① 形近字・多音字 ──
header('①', '形近字・多音字', '先圈出每組字不一樣的地方，再想一想句子的意思，把正確的字寫在底線上。')
fams = [f for f in L['families'] if not f.get('poly')]
rows = (len(fams) + 1) // 2
t = table(rows, 2, [WIDTH / 2, WIDTH / 2])
n = 0
for k, f in enumerate(fams):
    c = t.cell(k // 2, k % 2)
    p = para(c, True, after=2)
    for j, m in enumerate(f['members']):
        if j:
            add(p, '　', size=17)
        zy_text(p, m['c'], 17, m['zy'])
    shade(p._p.get_or_add_pPr(), FILL['gray'])
    qs = [q['sentence'] for q in L['lookalikes'] if q['fam'] == f['id'] and not q.get('poly')]
    qs += [e['sentence'] for e in EX.get('extraLook', []) if e['fam'] == f['id']]
    for s in qs:
        n += 1
        p = para(c, line=1.25 if LEVEL < 3 else 1.1)
        add(p, f'{n}. ', size=10, color=GRAY)
        parts = s.split('＿')
        for i, part in enumerate(parts):
            if i:
                blank(p, 2, size=13)
            add(p, part, size=13)
if len(fams) % 2:
    cell_border(t.cell(rows - 1, 1), sides=())
polys = [f for f in L['families'] if f.get('poly')]
if polys:
    p = para(doc, before=5, after=2)
    add(p, '多音字：念念看，圈出正確的注音。', size=13, bold=True, color=NAVY)
    p = para(doc, after=2)
    shade(p._p.get_or_add_pPr(), FILL['gray'])
    for f in polys:
        for m in f['members']:
            zy_text(p, m['c'], 17, m['zy'])
            add(p, '、'.join(m['words']) + '　　', size=9.5, color=GRAY)
    items = [q for f in polys for q in L['lookalikes'] if q['fam'] == f['id'] and q.get('poly')]
    t = table((len(items) + 1) // 2, 2, [WIDTH / 2, WIDTH / 2], borders=False)
    for k, q in enumerate(items):
        n += 1
        c = t.cell(k // 2, k % 2)
        p = para(c, True)
        add(p, f'{n}. ', size=10, color=GRAY)
        a, _, b = q['sentence'].partition(q['hl'])
        add(p, a, size=13); add(p, q['hl'], size=13, fill='hl'); add(p, b, size=13)
        p = para(c, after=3)
        add(p, '　' + '　　　'.join(sorted(q['options'])), size=11.5)

# ── ② 短語短句・句型 ──
# 版面等級（第 2 個參數，0 最豐富）：一頁放不下時，fit.py 會一級一級往下試
#   (每個短語幾張情境圖, 圖寬 cm, 每個句型幾題重組)
PLANS = [(3, 3.6, 1), (3, 3.0, 1), (2, 3.0, 1), (2, 2.6, 1), (2, 2.2, 1), (2, 1.8, 1)]   # 句型統一每個 1 題（老師決定）
NSC, pic_cm, PER = PLANS[min(LEVEL, len(PLANS) - 1)]
say_pt = 10.5 if pic_cm < 3.4 else 11.5
header('②', '短語短句・句型', '看圖，從詞庫選詞，寫在同顏色的底線上。', newpage=True)
phs = [ph for ph in L['phrases'] if ph.get('blocks')]
for ph in phs:
    blocks = ph['blocks']
    t = table(1, 1, [WIDTH])
    c = t.cell(0, 0)
    p = para(c, True, after=2)
    add(p, '課文：', size=13)
    for i, b in enumerate(blocks):
        if isinstance(b, dict):
            add(p, ph['model'][i], size=13, fill=COLOR[b.get('c', b['k'])]); add(p, ' ', size=13)
        else:
            add(p, b + ' ', size=13)
    sc = ph['scenes'][:NSC]
    used = {}
    for s in sc:
        for i, b in enumerate(blocks):
            if isinstance(b, dict):
                col = b.get('c', b['k'])
                used.setdefault(col, [])
                if s['ans'][i] not in used[col]:
                    used[col].append(s['ans'][i])
    p = para(c, after=3)
    add(p, '詞庫：', size=13)
    # 詞庫打亂順序（不照情境圖的順序、顏色也混在一起），每次產生都一樣
    import random
    pool = [(k, w) for k, ws in used.items() for w in ws]
    random.Random(sum(map(ord, ''.join(ph['model'])))).shuffle(pool)
    for k, w in pool:
        add(p, w, size=13, fill=COLOR[k]); add(p, '　', size=13)
    inner = c.add_table(rows=1, cols=len(sc))
    inner.autofit = False
    for k, s in enumerate(sc):
        ic = inner.cell(0, k)
        ic.width = Cm((WIDTH - 0.4) / len(sc))
        cell_border(ic, sides=())
        picture(para(ic, True, WD_ALIGN_PARAGRAPH.CENTER), s['pic'], pic_cm)
        add(para(ic, line=1.1, after=2), s['say'], size=say_pt)
        p = para(ic, align=WD_ALIGN_PARAGRAPH.CENTER, line=1.6 if LEVEL < 5 else 1.3, after=3)
        for i, b in enumerate(blocks):
            if isinstance(b, dict):
                blank(p, len(s['ans'][i]) + 1, COLOR[b.get('c', b['k'])], size=13)
                add(p, ' ', size=13)
            else:
                add(p, b, size=13)
    # 巢狀表格後面 Word 會自動多一個空段落：縮成 1 點，卡片下面才不會空一大塊
    last = c.paragraphs[-1]
    last.paragraph_format.line_spacing = Pt(1)
    add(last, '', size=1)
    sp = para(doc); sp.paragraph_format.line_spacing = Pt(4)


def chunks(sent, conn):
    """句子切成詞卡：連接詞自己一張，其他部分在逗號後切開。回傳 [(文字, 是不是連接詞)]。"""
    out, rest = [], sent
    for w in conn:
        k = rest.find(w)
        if k < 0:
            continue
        out.append((rest[:k], False)); out.append((w, True)); rest = rest[k + len(w):]
    out.append((rest, False))
    res = []
    for txt, isc in out:
        if isc:
            res.append((txt, True)); continue
        for piece in re.findall(r'[^，]+，?', txt):
            res.append((piece, False))
    return [(x, y) for x, y in res if x]


def shuffled(items, seed):
    import random
    r = random.Random(seed)
    for _ in range(20):
        s = items[:]; r.shuffle(s)
        if s != items:
            return s
    return items[::-1]


sents = [s for s in L['sentences'] if not s.get('flex') and s.get('combine')]
if sents:
    p = para(doc, before=2, after=3)
    add(p, '句型：看圖，在詞卡前面寫 1、2、3……排出順序，再照順序把句子抄在底線上。', size=13, bold=True, color=NAVY)
    items = []
    for si, s in enumerate(L['sentences']):
        if s not in sents:
            continue
        C = s['combine']
        for sent, pn in [(C['look']['model'], C['look'].get('pic')), (C['demo']['j'], C['demo'].get('pic'))][:PER]:
            items.append((s, sent, pn))
    t = table(len(items), 2, [2.9, WIDTH - 2.9])
    for r, (s, sent, pn) in enumerate(items):
        picture(para(t.cell(r, 0), True, WD_ALIGN_PARAGRAPH.CENTER), pn, 2.4 if LEVEL < 5 else 2.0)
        c = t.cell(r, 1)
        p = para(c, True, before=2, after=2, line=1.3)
        add(p, s['pattern'] + '　', size=9.5, color=GRAY)
        ch = chunks(sent, s['conn'])
        for txt, isc in shuffled(ch, sum(map(ord, sent))):
            add(p, '(　) ', size=12, color=GRAY)
            add(p, txt, size=14, bold=isc, fill='tag' if isc else 'gray')
            add(p, '　　', size=12)
        p = para(c, before=2, after=2)
        blank(p, 30, size=14)

# ── ③ 段落大意（有注音）──
header('③', '段落大意', '看圖和字母，從詞庫找出語詞，寫進段落裡同字母的底線。', newpage=True)
blanks = [w for s in EX['summary'] for w in re.findall(r'〔(.+?)〕', s['text'])]
LET = 'ABCDEFGH'
CIRC = 'ⒶⒷⒸⒹⒺⒻⒼⒽ'
letter = {w: i for i, w in enumerate(blanks)}
zyw = {w['w']: w['zy'] for w in L['words']}
t = table(1, len(blanks), [WIDTH / len(blanks)] * len(blanks), borders=False)
for w, i in letter.items():
    c = t.cell(0, i)
    add(para(c, True, WD_ALIGN_PARAGRAPH.CENTER), LET[i], size=11, bold=True, color=NAVY)
    picture(para(c, align=WD_ALIGN_PARAGRAPH.CENTER), w, 1.95)
p = para(doc, before=3)
shade(p._p.get_or_add_pPr(), FILL['gray'])
add(p, '詞庫：', size=12, color=GRAY)
p = para(doc, after=4)
shade(p._p.get_or_add_pPr(), FILL['gray'])
for w in sorted(blanks, key=lambda w: (len(w), w[::-1])):
    zy_text(p, w, 14, zyw.get(w) or KNOWN.get(w))
    add(p, '　', size=14)
t = table(len(EX['summary']), 1, [WIDTH])
for r, sec_ in enumerate(EX['summary']):
    c = t.cell(r, 0)
    add(para(c, True, before=1), f'【{sec_["tag"]}】{sec_["title"]}', size=11, color=NAVY, fill='tag')
    p = para(c, line=1.0, after=1)
    for i, part in enumerate(re.split(r'〔(.+?)〕', sec_['text'])):
        if i % 2:
            add(p, CIRC[letter[part]], size=11, color=NAVY)
            blank(p, len(part) + 1, size=14)
        elif part:
            zy_text(p, part, 14)

docx_path = OUT / f'第{LID}課_全抽作業.docx'
doc.save(docx_path)
print(docx_path)
if warn:
    print('⚠ 注音字型沒有把握的字（請在 Word 裡看一下）：', '、'.join(sorted(set(warn))))
