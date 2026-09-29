"""
把課文（tools/texts/lessonXX.txt）做成「課文點讀」資料 data/reading/lessonXX.js。

  python tools/make_reader.py 07            # 產生第 7 課
  python tools/make_reader.py 01 07 08 ...  # 一次產生多課

課文檔格式：@標題（第一行）、#小標題、其他每一行是一段。
流程（全部在本機，不連網）：
  1. 斷詞：課文轉簡體給 jieba 斷詞（jieba 對簡體最準），再依字數切回原本的繁體字；顯示與查讀音都用繁體。
  2. 詞的讀音：新酷音輸入法詞庫 tsi.src.txt（台灣讀音，隨 ButTaiwan/bpmfvs 專案取得）。
  3. 單字的讀音：bpmfvs 讀音表 phonic_table_Z.txt 的第一讀音（整理自教育部一字多音審訂表、重編國語辭典）。
  4. 套用「一、不」變調與「的、了、著……」輕聲規則，最後套用老師校正（tools/texts/fixes.json）。
沒有被整個詞查到的多音字，會列在 tools/texts/lessonXX_review.txt 請老師複核。
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import jieba
from opencc import OpenCC

_t2s = OpenCC('t2s')


def cut(line):
    """斷詞：先轉簡體再用 jieba 斷（對簡體最準），再依字數切回原本的繁體字。"""
    simp = _t2s.convert(line)
    if len(simp) != len(line):
        return jieba.lcut(line, HMM=False)
    out, i = [], 0
    for tok in jieba.lcut(simp, HMM=False):
        out.append(line[i:i + len(tok)])
        i += len(tok)
    return out

ROOT = Path(__file__).resolve().parent.parent
TXT = ROOT / 'tools' / 'texts'
OUT = ROOT / 'data' / 'reading'
CACHE_F = TXT / 'zy_cache.json'
FIX_F = TXT / 'fixes.json'
cache = json.loads(CACHE_F.read_text(encoding='utf-8')) if CACHE_F.exists() else {}

HAN = re.compile(r'[㐀-鿿〇○]')
ZYC = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙'
# 常見虛字、語尾助詞：單獨出現時的念法
PARTICLE = {'的': '˙ㄉㄜ', '了': '˙ㄌㄜ', '著': '˙ㄓㄜ', '們': '˙ㄇㄣ', '麼': '˙ㄇㄜ', '呢': '˙ㄋㄜ', '吧': '˙ㄅㄚ',
            '嗎': '˙ㄇㄚ', '啊': '˙ㄚ', '得': '˙ㄉㄜ', '地': '˙ㄉㄜ', '○': 'ㄌㄧㄥˊ', '〇': 'ㄌㄧㄥˊ'}
# 多音字：依 ButTaiwan/bpmfvs 的讀音表（整理自教育部《國語一字多音審訂表》《重編國語辭典》）
# 多音字若沒有被整個詞查到（只能單字查），就列入「請老師複核」清單
# 國小課文常見、容易念錯的多音字（再用教育部 2012 審訂表 phonic_table_A.txt 確認真的有兩個以上讀音）
COMMON_POLY = set('長重行還好為少數傳發調量得地教興更相當應朝處種便差假奇降藏縱勝養勞藉樂和空著覺會分只'
                  '中將間參省盛乘背露薄載覆轉漂強曾似度思彈刺切塞答難惡否屬血供挑擔系扇縫場乾鮮悶泊宿') - set('和為會')
# 「和」「為」已經有固定規則（見 build），不用列入複核；
# 「會」單獨出現一律念ㄏㄨㄟˋ（預設讀音就是），只有「會計」等詞念ㄎㄨㄞˋ，由詞庫決定
# 「為」前面是這些字（封為、稱為、訂為……）表示「成為、當作」，念ㄨㄟˊ
WEI2 = set('封名稱訂化成作認視選改分轉變譽列定')


def _load_poly():
    f = TXT / 'phonic_table_A.txt'
    poly = set()
    if f.exists():
        for line in f.read_text(encoding='utf-8-sig').splitlines():
            cols = line.split('\t')
            if len(cols) >= 5 and len({z.lstrip('˙') for z in cols[3:] if z}) >= 2:
                poly.add(cols[0])
    return (poly & COMMON_POLY) if poly else COMMON_POLY


REVIEW = _load_poly()


# 詞的讀音：新酷音輸入法詞庫（bpmfvs 附的 tsi.src.txt，台灣讀音），同一個詞有多種讀音時取最常用的
def _load_tsi():
    best = {}
    f = TXT / 'tsi.src.txt'
    for line in f.read_text(encoding='utf-8-sig').splitlines():
        parts = line.split(' ')
        if len(parts) < 3 or not parts[1].isdigit():
            continue
        w, freq, zs = parts[0], int(parts[1]), parts[2:]
        if len(zs) != len(w) or len(w) < 2:
            continue
        # 新酷音把輕聲點寫在後面（ㄌㄜ˙），統一改成教育部寫法放在前面（˙ㄌㄜ）
        zs = ['˙' + z.replace('˙', '') if '˙' in z else z for z in zs]
        if w not in best or freq > best[w][0]:
            best[w] = (freq, ' '.join(zs))
    return {w: z for w, (f_, z) in best.items()}


# 單字的預設讀音：bpmfvs 讀音表的第一讀音
def _load_char():
    f = TXT / 'phonic_table_Z.txt'
    out = {}
    for line in f.read_text(encoding='utf-8-sig').splitlines():
        cols = line.split('\t')
        if len(cols) >= 4:
            out[cols[0]] = cols[3]
    return out


TSI = _load_tsi()
# 詞庫讀音和教育部《重編國語辭典修訂本》不同的詞，以辭典為準（每一課都適用）
TSI.update({
    '覺得': 'ㄐㄩㄝˊ ˙ㄉㄜ', '極大': 'ㄐㄧˊ ㄉㄚˋ', '角色': 'ㄐㄩㄝˊ ㄙㄜˋ', '主角': 'ㄓㄨˇ ㄐㄩㄝˊ',
    '給予': 'ㄐㄧˇ ㄩˇ', '教導': 'ㄐㄧㄠˋ ㄉㄠˇ', '脈絡': 'ㄇㄞˋ ㄌㄨㄛˋ', '脈絡分明': 'ㄇㄞˋ ㄌㄨㄛˋ ㄈㄣ ㄇㄧㄥˊ',
    '恐怖分子': 'ㄎㄨㄥˇ ㄅㄨˋ ㄈㄣˋ ㄗˇ', '商鋪': 'ㄕㄤ ㄆㄨˋ', '十二個': 'ㄕˊ ㄦˋ ˙ㄍㄜ',
    # 以下依教育部國語小字典（第 7～12 課生字）
    '癌症': 'ㄞˊ ㄓㄥˋ', '廣播': 'ㄍㄨㄤˇ ㄅㄛˋ', '山脈': 'ㄕㄢ ㄇㄞˋ', '噴香': 'ㄆㄣˋ ㄒㄧㄤ', '熱淚盈眶': 'ㄖㄜˋ ㄌㄟˋ ㄧㄥˊ ㄎㄨㄤ',
    '伐木': 'ㄈㄚ ㄇㄨˋ', '步伐': 'ㄅㄨˋ ㄈㄚ',
})
CHAR = _load_char()
NUM = set('○〇零一二三四五六七八九十百千萬兩第')
DIGIT = set('○〇零一二三四五六七八九')  # 「一」後面接這些（年份、編號）才念本調；一百、一千照樣變調


def fetch(title):
    url = 'https://pedia.cloud.edu.tw/Entry/Detail?title=' + urllib.parse.quote(title)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (teaching-materials reader builder)'})
    for _ in range(3):
        try:
            html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', 'replace')
            break
        except Exception:
            time.sleep(2)
    else:
        return None
    text = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', html, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    time.sleep(0.15)
    if len(title) == 1:
        m = re.search(re.escape(title) + ' ' + re.escape(title) + ' ([' + ZYC + ' ]+?) 部首', text)
        return m.group(1).replace(' ', '') if m else None
    i = text.find('確定 ' + title + ' ')
    if i < 0:
        return None
    seg = text[i + 3 + len(title): text.find('漢語拼音', i)].strip().split(' ')
    out = []
    for tok in seg:
        if len(tok) == 1 and HAN.match(tok):
            out.append('')
        elif out:
            out[-1] += tok
    return ' '.join(out) if len(out) == len(title) and all(out) else None


def lookup(w):
    """詞 → 詞庫讀音；單字 → 預設讀音。查不到回傳 None。"""
    if len(w) > 1:
        return TSI.get(w)
    return CHAR.get(w)


def split_known(tok):
    """整個詞查不到時，在詞裡面由左到右找最長的已知詞（最多 4 字），剩下的單字另外處理。"""
    out, i = [], 0
    while i < len(tok):
        for n in range(min(4, len(tok) - i), 1, -1):
            if tok[i:i + n] in TSI:
                out.append(tok[i:i + n])
                i += n
                break
        else:
            out.append(tok[i])
            i += 1
    return out


def tone(z):
    return 4 if z.endswith('ˋ') else 3 if z.endswith('ˇ') else 2 if z.endswith('ˊ') else 0 if z.startswith('˙') else 1


def build(lid):
    lines = (TXT / f'lesson{lid}.txt').read_text(encoding='utf-8').strip().splitlines()
    fixes = json.loads(FIX_F.read_text(encoding='utf-8')).get(lid, {}) if FIX_F.exists() else {}
    for w in fixes:
        jieba.add_word(_t2s.convert(w), 99999)
    title, sections, review = '', [], []
    cur = {'h': '', 'paras': []}
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('@'):
            title = line[1:]
            continue
        if line.startswith('#'):
            if cur['paras'] or cur['h']:
                sections.append(cur)
            cur = {'h': line[1:], 'paras': []}
            continue
        para = []  # [文字, 注音（以空白分字；標點為空字串）]
        for tok in cut(line):
            if not HAN.search(tok):
                para.append([tok, ''])
                continue
            if tok in fixes:
                # 可寫成「注音|朗讀用字」，例如 "ㄇㄠˊ ㄈㄚˇ ㄓㄤˇ|毛髮漲"，讓語音念對
                zy, _, say = fixes[tok].partition('|')
                para.append([tok, zy] + ([say] if say else []))
                continue
            z = lookup(tok) if len(tok) > 1 else None
            if z:
                para.append([tok, z])
                continue
            # 整個詞查不到：拆成已知的小詞＋單字；單字用預設讀音，多音字列入複核
            zs = []
            for part in split_known(tok):
                if len(part) > 1:
                    zs.append(TSI[part])
                    continue
                c = part
                if c in PARTICLE:
                    zs.append(PARTICLE[c])
                else:
                    zs.append(lookup(c) or '？')
                if c in REVIEW:
                    at = line.find(tok)
                    review.append(f'{c}（{zs[-1]}）：…{line[max(0, at - 6): at + len(tok) + 6]}…')
            para.append([tok, ' '.join(zs)])
        # 連接詞「和」（我和媽媽）：單獨成詞時念ㄏㄢˋ，朗讀改用同音字「汗」（老師實測「漢」仍會念成ㄏㄜˊ）；和平、溫和等詞維持ㄏㄜˊ
        for tk in para:
            if tk[0] == '和' and tk[1] == 'ㄏㄜˊ':
                tk[1] = 'ㄏㄢˋ'
                tk.append('汗')
        # 「為」單獨成詞：當「為了、替」（為女孩爭取、為牠發急）念ㄨㄟˋ，朗讀改用同音字「位」；
        # 當「成為、當作」（封為、稱為、化危機為轉機、以……為……）維持ㄨㄟˊ。以為、成為等詞由詞庫決定
        for i, tk in enumerate(para):
            if tk[0] != '為':
                continue
            prev = para[i - 1][0][-1:] if i else ''
            clause = re.split(r'[，。？！；：、「」『』]', ''.join(t[0] for t in para[:i]))[-1]
            if prev in WEI2 or re.search('(?<![可所得足難加予])以|[化認視把將當]', clause):
                tk[1] = 'ㄨㄟˊ'
            else:
                tk[1] = 'ㄨㄟˋ'
                tk.append('位')
        # 固定輕聲：「們」（我們、你們、他們、人們……）一律念˙ㄇㄣ
        for tk in para:
            if tk[1] and '們' in tk[0]:
                zs = tk[1].split(' ')
                tk[1] = ' '.join('˙ㄇㄣ' if ch == '們' else z for ch, z in zip(tk[0], zs))
        # 一、不 變調
        flat = [(pi, ci) for pi, tk in enumerate(para) if tk[1] for ci in range(len(tk[0]))]
        def zy_at(k):
            pi, ci = flat[k]
            return para[pi][1].split(' ')[ci]
        def set_at(k, v):
            pi, ci = flat[k]
            zs = para[pi][1].split(' ')
            zs[ci] = v
            para[pi][1] = ' '.join(zs)
        chars = [para[pi][0][ci] for pi, ci in flat]
        for k, c in enumerate(chars):
            if k + 1 >= len(chars):
                continue
            nxt = zy_at(k + 1)
            # 後面的字念輕聲（一個 ˙ㄍㄜ）時，依它的本調變調：個 ㄍㄜˋ → 一ˊ個
            if nxt.startswith('˙') and CHAR.get(chars[k + 1]):
                nxt = CHAR[chars[k + 1]]
            if c == '不' and zy_at(k) == 'ㄅㄨˋ' and tone(nxt) == 4:
                set_at(k, 'ㄅㄨˊ')
            if c == '一' and zy_at(k) == 'ㄧ':
                prev = chars[k - 1] if k else ''
                if prev in NUM or chars[k + 1] in DIGIT or chars[k + 1] in '月日號樓':
                    continue
                # 「一」在詞尾（之一、唯一、同一）或後面隔著標點，念本調
                pi, ci = flat[k]
                if (len(para[pi][0]) > 1 and ci == len(para[pi][0]) - 1) or flat[k + 1][0] - pi > 1:
                    continue
                set_at(k, 'ㄧˊ' if tone(nxt) == 4 else 'ㄧˋ')
        cur['paras'].append(para)
    sections.append(cur)
    OUT.mkdir(parents=True, exist_ok=True)
    data = {'title': title, 'sections': sections}
    (OUT / f'lesson{lid}.js').write_text(
        '/* 課文點讀資料（由 tools/make_reader.py 產生；要改注音請改 tools/texts/fixes.json 再重新產生） */\n'
        'window.READINGS = window.READINGS || {};\n'
        f"window.READINGS['{lid}'] = " + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
    (TXT / f'lesson{lid}_review.txt').write_text('\n'.join(dict.fromkeys(review)), encoding='utf-8')
    missing = sum(p[1].count('？') for s in sections for pa in s['paras'] for p in pa)
    print(lid, title, '段落', sum(len(s['paras']) for s in sections), '查不到', missing, '待複核', len(set(review)))


if __name__ == '__main__':
    for lid in sys.argv[1:]:
        build(lid)
