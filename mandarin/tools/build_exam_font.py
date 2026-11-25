"""
出卷頁用的注音字型（直書、注音在字右邊、破音字用 IVS 選讀音，和 BopoDoc 同一套做法）。

來源：ButTaiwan/bpmfvs v1.500 的 BpmfZihiKaiStd-Regular.ttf（字嗨注音標楷；漢字 CC-BY 4.0、其他 OFL 1.1）。
字型原檔很大（17 MB），不放 repo；這個程式把它切成小塊（只放常用字和題庫用到的字），
放在 assets/fonts/bpmf/，網頁用 unicode-range 只下載用到的那幾塊。
OFL 規定改過的字型不能沿用保留名稱「字嗨／Zihi」，所以字型名稱改成 TMBpmfKai。

  python tools/build_exam_font.py 字型原檔.ttf
"""
import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'fonts' / 'bpmf'
FAMILY = 'TMBpmfKai'
CHUNK = 350


def wanted():
    first, rest = set(), set()
    # 題庫和課本資料用到的字放第一塊（出卷幾乎只用到這些）
    for f in [ROOT / 'data' / 'exam_plain.js'] + sorted((ROOT / 'data').glob('lesson[0-9][0-9].js')):
        if f.exists():
            first |= set(re.findall(r'[㐀-鿿]', f.read_text(encoding='utf-8')))
    for line in (ROOT / 'tools' / 'texts' / 'phonic_table_Z.txt').read_text(encoding='utf-8-sig').splitlines():
        c = line.split('\t')
        if len(c) >= 4 and 'A' in c[2]:          # 教育部常用字
            rest.add(c[0])
    return sorted(first), sorted(rest - first)


def make(src, chars, name, extra=''):
    opts = subset.Options()
    opts.layout_features = ['vert', 'vrt2', 'ss10']   # 直書標點、沒有注音的字
    opts.flavor = 'woff2'
    opts.name_IDs = ['*']
    opts.notdef_outline = False
    opts.glyph_names = False
    f = TTFont(src)
    s = subset.Subsetter(opts)
    s.populate(unicodes=[ord(c) for c in chars] + [ord(c) for c in extra] + list(range(0xE01E0, 0xE01F0)))   # 破音字的讀音選擇符（IVS）
    s.subset(f)
    for rec in f['name'].names:
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            v = {1: FAMILY, 3: FAMILY + '-subset', 4: FAMILY, 6: FAMILY, 16: FAMILY, 17: 'Regular'}[rec.nameID]
            rec.string = v
    f.save(OUT / name)
    return (OUT / name).stat().st_size


def urange(chars):
    cps = sorted(ord(c) for c in chars)
    out, a = [], None
    for i, cp in enumerate(cps):
        if a is None:
            a = b = cp
        elif cp == b + 1:
            b = cp
        else:
            out.append((a, b)); a = b = cp
    if a is not None:
        out.append((a, b))
    return ', '.join('U+%X' % a if a == b else 'U+%X-%X' % (a, b) for a, b in out)


def main():
    src = sys.argv[1]
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.woff2'):
        old.unlink()
    first, rest = wanted()
    groups = [first] + [rest[i:i + CHUNK] for i in range(0, len(rest), CHUNK)]
    punct = '，。、；：？！「」『』（）〔〕【】《》〈〉…—～─．·／＿　０１２３４５６７８９①②③④⑤⑥⑦⑧⑨'
    css = ['/* 出卷頁注音字型（由 tools/build_exam_font.py 產生）。字嗨注音標楷 BpmfZihiKaiStd © But Ko，'
           'https://github.com/ButTaiwan/bpmfvs；漢字 CC-BY 4.0（含全字庫正楷體，國家發展委員會），其他 OFL 1.1；改名為 TMBpmfKai */']
    total = 0
    size = make(src, '', 'p.woff2', punct); total += size
    css.append("@font-face { font-family: '%s'; src: url('fonts/bpmf/p.woff2') format('woff2'); font-display: block; unicode-range: %s; }" % (FAMILY, urange(punct)))
    for k, g in enumerate(groups):
        size = make(src, ''.join(g), 'k%02d.woff2' % k); total += size
        css.append("@font-face { font-family: '%s'; src: url('fonts/bpmf/k%02d.woff2') format('woff2'); font-display: block; unicode-range: %s, U+E01E0-E01EF; }" % (FAMILY, k, urange(g)))
        print('k%02d' % k, len(g), '字', round(size / 1024), 'KB')
    (ROOT / 'assets' / 'exam-font.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
    print('共', len(groups) + 1, '塊，', round(total / 1024 / 1024, 1), 'MB')


if __name__ == '__main__':
    main()
