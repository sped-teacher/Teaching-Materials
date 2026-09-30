"""
用教育百科（優先《國語辭典簡編本》，沒有才用《重編國語辭典修訂本》）核對課文點讀的詞語讀音。

  python tools/check_pedia.py            # 核對 12 課所有含多音字的詞
  python tools/check_pedia.py 07 08      # 只核對指定課次

結果寫到 tools/texts/教育百科核對.txt（不一致的詞），查過的結果快取在 tools/texts/pedia_cache.json。
每查一個詞停 1 秒，避免被網站擋（HTTP 429）。
"""
import html as htmlmod
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TXT = ROOT / 'tools' / 'texts'
CACHE_F = TXT / 'pedia_cache.json'
cache = json.loads(CACHE_F.read_text(encoding='utf-8')) if CACHE_F.exists() else {}

INI = {'ㄅ': 'b', 'ㄆ': 'p', 'ㄇ': 'm', 'ㄈ': 'f', 'ㄉ': 'd', 'ㄊ': 't', 'ㄋ': 'n', 'ㄌ': 'l', 'ㄍ': 'g', 'ㄎ': 'k',
       'ㄏ': 'h', 'ㄐ': 'j', 'ㄑ': 'q', 'ㄒ': 'x', 'ㄓ': 'zh', 'ㄔ': 'ch', 'ㄕ': 'sh', 'ㄖ': 'r', 'ㄗ': 'z', 'ㄘ': 'c', 'ㄙ': 's'}
FIN = {'': 'i', 'ㄚ': 'a', 'ㄛ': 'o', 'ㄜ': 'e', 'ㄝ': 'e', 'ㄞ': 'ai', 'ㄟ': 'ei', 'ㄠ': 'ao', 'ㄡ': 'ou', 'ㄢ': 'an',
       'ㄣ': 'en', 'ㄤ': 'ang', 'ㄥ': 'eng', 'ㄦ': 'er', 'ㄧ': 'i', 'ㄧㄚ': 'ia', 'ㄧㄛ': 'io', 'ㄧㄝ': 'ie', 'ㄧㄞ': 'iai',
       'ㄧㄠ': 'iao', 'ㄧㄡ': 'iu', 'ㄧㄢ': 'ian', 'ㄧㄣ': 'in', 'ㄧㄤ': 'iang', 'ㄧㄥ': 'ing', 'ㄨ': 'u', 'ㄨㄚ': 'ua',
       'ㄨㄛ': 'uo', 'ㄨㄞ': 'uai', 'ㄨㄟ': 'ui', 'ㄨㄢ': 'uan', 'ㄨㄣ': 'un', 'ㄨㄤ': 'uang', 'ㄨㄥ': 'ong', 'ㄩ': 'v',
       'ㄩㄝ': 've', 'ㄩㄢ': 'van', 'ㄩㄣ': 'vn', 'ㄩㄥ': 'iong'}
ZERO = {'i': 'yi', 'ia': 'ya', 'io': 'yo', 'ie': 'ye', 'iai': 'yai', 'iao': 'yao', 'iu': 'you', 'ian': 'yan', 'in': 'yin',
        'iang': 'yang', 'ing': 'ying', 'u': 'wu', 'ua': 'wa', 'uo': 'wo', 'uai': 'wai', 'ui': 'wei', 'uan': 'wan',
        'un': 'wen', 'uang': 'wang', 'ong': 'weng', 'v': 'yu', 've': 'yue', 'van': 'yuan', 'vn': 'yun', 'iong': 'yong'}


def zy2py(z):
    """注音 → 無調拼音＋聲調數字（輕聲為 0），例如 ㄐㄩㄝˊ → jue2。"""
    t = 0 if '˙' in z else 2 if 'ˊ' in z else 3 if 'ˇ' in z else 4 if 'ˋ' in z else 1
    z = re.sub('[˙ˊˇˋ]', '', z)
    ini = INI.get(z[:1], '')
    fin = z[1:] if ini else z
    if not ini:
        py = ZERO.get(FIN.get(fin, fin), FIN.get(fin, fin))
    else:
        f = FIN.get(fin, fin)
        if ini in ('j', 'q', 'x'):
            f = f.replace('v', 'u')
        if ini in ('b', 'p', 'm', 'f') and f == 'uo':
            f = 'o'
        py = ini + f
    return py + str(t)


def py_norm(syl):
    """教育百科的拼音（jué、de）→ jue2、de0。"""
    t = 0
    out = ''
    for ch in unicodedata.normalize('NFD', syl.lower()):
        o = ord(ch)
        if o == 0x304: t = 1
        elif o == 0x301: t = 2
        elif o == 0x30C: t = 3
        elif o == 0x300: t = 4
        elif o == 0x308: out = out[:-1] + 'v'  # ü（lǜ、nǚ）
        elif ch.isalpha(): out += ch
    return out + str(t)


def fetch(w):
    if w in cache:
        return cache[w]
    url = 'https://pedia.cloud.edu.tw/Entry/Detail?title=' + urllib.parse.quote(w)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (teaching-materials reading check)'})
    for wait in (0, 30, 90):
        time.sleep(wait)
        try:
            raw = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
            break
        except Exception as e:
            if '429' not in str(e) and '5' not in str(getattr(e, 'code', '')):
                return None
    else:
        return None  # 連續失敗先不寫快取，下次再查
    text = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
    text = htmlmod.unescape(re.sub(r'<[^>]+>', ' ', text))
    text = re.sub(r'\s+', ' ', text)
    res = {}
    for book in ('教育部國語辭典簡編本', '教育部重編國語辭典修訂本'):
        i = text.find(book + ' 注音')
        if i < 0:
            i = text.find(book + ' 《')
        if i < 0:
            continue
        seg = text[i: text.find('資料來源', i)]
        reads = []
        for m in re.finditer(r'漢語拼音： (.+?) 解釋： (.{0,24})', seg):
            for alt in re.split(r'\((?:語音|讀音|又音)\)', m.group(1)):
                syls = alt.split()
                if syls:
                    reads.append({'py': ' '.join(py_norm(s) for s in syls), 'raw': alt.strip(), 'mean': m.group(2)})
        if reads:
            res[book] = reads
    cache[w] = res
    CACHE_F.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding='utf-8')
    time.sleep(1)
    return res


def main(lids):
    poly = set()
    for line in (TXT / 'phonic_table_A.txt').read_text(encoding='utf-8-sig').splitlines():
        cols = line.split('\t')
        if len(cols) >= 5 and len({z.lstrip('˙') for z in cols[3:] if z}) >= 2:
            poly.add(cols[0])
    words = {}
    for lid in lids:
        s = (ROOT / 'data' / 'reading' / f'lesson{lid}.js').read_text(encoding='utf-8')
        d = json.loads(s[s.index('] = ') + 4:].rstrip().rstrip(';'))
        for sec in d['sections']:
            for pa in sec['paras']:
                for i, t in enumerate(pa):
                    if len(t[0]) > 1 and t[1] and any(c in poly for c in t[0]):
                        ctx = ''.join(x[0] for x in pa[max(0, i - 3):i + 4])
                        words.setdefault((t[0], t[1]), []).append(f'{lid}…{ctx}…')
    bad, alt, missing = [], [], 0
    for n, ((w, zy), where) in enumerate(words.items(), 1):
        if n % 50 == 0:
            print(n, '/', len(words), flush=True)
        res = fetch(w)
        if res is None:
            missing += 1
            continue
        reads = res.get('教育部國語辭典簡編本', []) or res.get('教育部重編國語辭典修訂本', [])
        if not reads:
            missing += 1
            continue
        # 點讀有標「一、不」變調，辭典標本調：比對前先還原
        zs = ['ㄧ' if c == '一' else 'ㄅㄨˋ' if c == '不' else z for c, z in zip(w, zy.split(' '))]
        mine = ' '.join(zy2py(z) for z in zs)
        pys = [r['py'] for r in reads]
        if mine in pys:
            if mine != pys[0] and len(set(pys)) > 1:
                alt.append(f'{w}（{zy}）用的是第二個以後的讀音；辭典：' + '｜'.join(f"{r['raw']}＝{r['mean']}" for r in reads) + '　' + where[0])
            continue
        bad.append(f'{w}（{zy}）辭典：' + '｜'.join(f"{r['raw']}＝{r['mean']}" for r in reads) + '　' + '；'.join(where[:2]))
    out = ['【讀音和辭典不一致】'] + bad + ['', '【有多種讀音，目前用的不是第一個（請看文意）】'] + alt
    (TXT / '教育百科核對.txt').write_text('\n'.join(out), encoding='utf-8')
    print('共', len(words), '詞；不一致', len(bad), '；非第一讀音', len(alt), '；辭典查不到', missing)


if __name__ == '__main__':
    main(sys.argv[1:] or ['%02d' % i for i in range(1, 13)])
