"""
用教育部《國語辭典簡編本》核對課文點讀的詞語讀音。
讀音只依《簡編本》《國語小字典》，不用《重編國語辭典修訂本》（教育部標明它適用於語文研究者）。
預設直接查簡編本網站（dict.concised.moe.edu.tw，快、不太會被擋）；加 --pedia 改查教育百科（只取其中的簡編本，但常被限流）。

  python tools/check_pedia.py            # 核對 12 課所有含多音字的詞
  python tools/check_pedia.py 07 08      # 只核對指定課次
  python tools/check_pedia.py --pedia    # 改用教育百科

結果寫到 tools/texts/教育百科核對.txt（不一致的詞），查過的結果快取在 tools/texts/pedia_cache.json。
每查一個詞停 3 秒，避免被網站擋（HTTP 429）；中斷後重跑會從快取接著查。
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
    time.sleep(3)   # 每 1 秒查一次仍常被擋（429 會等 30～90 秒），改 3 秒反而比較快
    return res


CONC_F = TXT / 'concised_cache.json'
conc_cache = json.loads(CONC_F.read_text(encoding='utf-8')) if CONC_F.exists() else {}
# 簡編本網站：只有一筆時會轉址到詞條頁，要帶著搜尋頁給的 cookie，否則詞條頁是空的
import http.cookiejar
CONC_OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
CONC_OPENER.addheaders = [('User-Agent', 'Mozilla/5.0 (teaching-materials reading check)')]


def fetch_concised(w):
    """直接查教育部《國語辭典簡編本》網站（教育百科常被限流時用）。
    搜尋結果列表就有注音；只有一筆時會直接跳到詞條頁，從頁面描述取注音。"""
    if w in conc_cache:
        return conc_cache[w]
    url = 'https://dict.concised.moe.edu.tw/search.jsp?md=1&word=' + urllib.parse.quote(w)
    for wait in (0, 20, 60):
        time.sleep(wait)
        try:
            raw = CONC_OPENER.open(url, timeout=30).read().decode('utf-8', 'replace')
            if not raw.strip():
                raise IOError('5xx empty page')   # 空白頁當成暫時錯誤，等一下再試
            break
        except Exception as e:
            if '429' not in str(e) and '5' not in str(getattr(e, 'code', '')):
                return None
    else:
        return None
    zys = []
    m = re.search(r'name="Description" content="字詞:([^,]*),注音:([^,]*),釋義:([^"]{0,24})', raw)
    if m and m.group(1) == w:            # 只有一筆：詞條頁
        zys.append((re.split(r'[（(]變[)）]', m.group(2))[0], htmlmod.unescape(m.group(3))))
    # 列表：<tr data-link='dictView…'>…<td><a…><cR>答案</cR></a></td><td><phon>ㄉㄚ<sup>ˊ</sup></phon> …
    # 「(變)」後面是變調讀音（<idiv>…</idiv>），只取本調，和點讀比對時的處理一致
    for row in re.finditer(r'<tr data-link=[\'"]dictView[^\'"]*[\'"][^>]*>(.*?)</tr>', raw, flags=re.S | re.I):
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row.group(1), flags=re.S | re.I)
        if len(cells) < 3:
            continue
        title = re.sub(r'<[^>]+>', '', cells[1]).strip()
        if title != w:
            continue
        base = re.sub(r'<idiv>.*?</idiv>', '', cells[2], flags=re.S | re.I)
        zy = ' '.join(re.sub(r'<[^>]+>', '', p).strip() for p in re.findall(r'<phon>(.*?)</phon>', base, flags=re.S | re.I))
        if zy.strip():
            zys.append((zy, ''))
    reads = []
    for zy, mean in zys:
        syls = [s for s in re.split(r'[\s　]+', zy.strip()) if s]
        if syls:
            reads.append({'py': ' '.join(zy2py(s) for s in syls), 'raw': ' '.join(syls), 'mean': mean})
    res = {'教育部國語辭典簡編本': reads} if reads else {}
    conc_cache[w] = res
    CONC_F.write_text(json.dumps(conc_cache, ensure_ascii=False, indent=0), encoding='utf-8')
    time.sleep(0.5)
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
        # 先查簡編本網站；查不到（例如簡編本沒收的詞）且教育百科快取裡有，就用教育百科的結果
        res = fetch_concised(w) if USE_CONCISED else fetch(w)
        if not res and w in cache:
            res = cache[w]
        if res is None:
            missing += 1
            continue
        # 只用《簡編本》（老師決定：不用《重編國語辭典修訂本》，它是給語文研究者的，常列又音）
        reads = res.get('教育部國語辭典簡編本', [])
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


USE_CONCISED = '--pedia' not in sys.argv   # 預設直接查簡編本網站；加 --pedia 改回查教育百科

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args or ['%02d' % i for i in range(1, 13)])
