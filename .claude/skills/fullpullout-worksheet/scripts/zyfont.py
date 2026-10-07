"""找出注音字型（文鼎標楷注音／破音一～五）裡，哪一個字型會讓這個字顯示指定的讀音。

做法：把字畫出來，切下右邊的注音部分，和「預設讀音就是這個音的其他字」的注音部分比對，最像的就是。
"""
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TTC = r'C:\Windows\Fonts\kai08mz.ttc'
NAMES = ['文鼎標楷注音', '文鼎標楷注音破音一', '文鼎標楷注音破音二', '文鼎標楷注音破音三', '文鼎標楷注音破音四', '文鼎標楷注音破音五']
SIZE = 100
import os
TABLE = Path(os.environ.get('WS_SITE', 'mandarin')).resolve() / 'tools' / 'texts' / 'phonic_table_Z.txt'   # 讀音表（fetch_tables.py 下載）


def norm(z):
    return '˙' + z.replace('˙', '') if '˙' in z else z


READ = {}
for line in TABLE.read_text(encoding='utf-8-sig').splitlines():
    p = line.split('\t')
    if len(p) >= 4:
        READ.setdefault(p[0], []).append(norm(p[3].strip()))
FIRST = {}
for c, rs in READ.items():
    FIRST.setdefault(rs[0], []).append(c)


@lru_cache(maxsize=None)
def font(i):
    return ImageFont.truetype(TTC, SIZE, index=i)


@lru_cache(maxsize=None)
def crop(c, i):
    """字 c 在第 i 個字型的注音部分（切到剛好包住注音）；沒有注音回傳 None。"""
    im = Image.new('1', (160, 125), 1)
    ImageDraw.Draw(im).text((0, 0), c, font=font(i), fill=0)
    z = im.crop((98, 0, 158, 125))
    bb = z.getbbox() if z.getbbox() is None else Image.eval(z.convert('L'), lambda v: 255 - v).getbbox()
    return z.crop(bb) if bb else None


def diff(a, b, neutral=False):
    """注音點陣差幾點。neutral：a 是輕聲（上面多一個點），只比下面和 b 一樣高的部分。"""
    if a is None or b is None:
        return 10 ** 9
    if neutral:
        if a.size[1] <= b.size[1] + 3:
            return 10 ** 9
        a = a.crop((0, a.size[1] - b.size[1], a.size[0], a.size[1]))
    if abs(a.size[0] - b.size[0]) > 2 or abs(a.size[1] - b.size[1]) > 2:
        return 10 ** 6
    w, h = min(a.size[0], b.size[0]), min(a.size[1], b.size[1])
    pa, pb = a.load(), b.load()
    return sum(1 for x in range(w) for y in range(h) if pa[x, y] != pb[x, y])


def common(r):
    return 0x4E00 <= ord(r) <= 0x9FFF and crop(r, 0) is not None


# 自動比對不出來、用眼睛核對過的（字, 讀音）→ 字型索引
OVERRIDE = {('體', 'ㄊㄧˇ'): 0, ('神', 'ㄕㄣˊ'): 0, ('噴', 'ㄆㄣˋ'): 1, ('麼', '˙ㄇㄜ'): 1, ('奶', '˙ㄋㄞ'): 1, ('喪', 'ㄙㄤˋ'): 1}


@lru_cache(maxsize=None)
def variant(c, zy):
    if (c, norm(zy)) in OVERRIDE:
        return OVERRIDE[(c, norm(zy))], 0
    return _variant(c, zy)


@lru_cache(maxsize=None)
def _variant(c, zy):
    """回傳 (字型索引, 差異)。差異 0～幾十 表示對上了；找不到回傳 (None, None)。"""
    zy = norm(zy)
    neutral = zy.startswith('˙')
    key = zy[1:] if neutral else zy           # 輕聲：拿一聲的字當對照，只比點下面的部分
    pool = [r for r in FIRST.get(key, []) if r != c and common(r)]
    refs = [r for r in pool if len(READ.get(r, [])) == 1][:4] or pool[:4]
    if not refs:
        # 輕聲沒有一聲的字可對照：改用「第一個讀音就是這個輕聲」的字；都沒有時，這個字自己的第一讀音就是它 → 用預設字型
        refs = [r for r in FIRST.get(zy, []) if r != c and common(r)][:4]
        neutral = False
        if not refs:
            return (0, 0) if READ.get(c, [None])[0] == zy else (None, None)
    best = (None, None)
    for i in range(6):
        cc = crop(c, i)
        if cc is None:
            continue
        d = min(diff(cc, crop(r, 0), neutral) for r in refs)
        if best[1] is None or d < best[1]:
            best = (i, d)
    return best


if __name__ == '__main__':
    for c, z in [('得', 'ㄉㄜˊ'), ('的', '˙ㄉㄜ'), ('長', 'ㄓㄤˇ'), ('長', 'ㄔㄤˊ'), ('和', 'ㄏㄢˋ'), ('和', 'ㄏㄜˊ'), ('為', 'ㄨㄟˋ'),
                 ('為', 'ㄨㄟˊ'), ('一', 'ㄧˊ'), ('一', 'ㄧˋ'), ('一', 'ㄧ'), ('不', 'ㄅㄨˊ'), ('不', 'ㄅㄨˋ'), ('地', 'ㄉㄧˋ'),
                 ('著', '˙ㄓㄜ'), ('背', 'ㄅㄟ'), ('背', 'ㄅㄟˋ'), ('了', '˙ㄌㄜ'), ('們', '˙ㄇㄣ')]:
        print(c, z, variant(c, z))
