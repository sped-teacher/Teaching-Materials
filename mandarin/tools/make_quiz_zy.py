"""
產生「注音聽打」題目的正確注音 data/quiz_zy.js（題目語詞＝各課 data/lessonXX.js 的 words，和「認識語詞」一樣）。

  python tools/make_quiz_zy.py

讀音來源：各課 data/lessonXX.js 的語詞注音 → 新酷音詞庫（make_reader.py 的 TSI，已含教育部辭典校正）→ 單字預設讀音。
要改某個詞的注音，直接改 OVERRIDE 再重新產生。
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_reader import TSI, CHAR, split_known  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
# 老師或核對後指定的讀音（優先）
OVERRIDE = {}


def lesson_words():
    out = {}
    for f in sorted((ROOT / 'data').glob('lesson*.js')):
        s = f.read_text(encoding='utf-8')
        for m in re.finditer(r"\{ *(?:w|idiom): *'([^']+)', *zy: *'([^']+)'", s):
            out.setdefault(m.group(1), m.group(2))
    return out


def main():
    known = lesson_words()
    result, where = {}, {}
    for f in sorted((ROOT / 'data').glob('lesson*.js')):
        s = f.read_text(encoding='utf-8')
        m = re.search(r"\r?\n  words: \[(.*?)\r?\n  \],", s, re.S)
        if not m:
            continue
        for w in re.findall(r"\{ *w: *'([^']+)'", m.group(1)):
            if w in OVERRIDE:
                z, src = OVERRIDE[w], '指定'
            elif w in known:
                z, src = known[w], '課本語詞'
            elif w in TSI:
                z, src = TSI[w], '詞庫'
            else:
                z = ' '.join(TSI[p] if len(p) > 1 else CHAR.get(p, '？') for p in split_known(w))
                src = '拆字'
            result[w] = z
            where[w] = src
    (ROOT / 'data' / 'quiz_zy.js').write_text(
        '/* 注音聽打的正確注音（由 tools/make_quiz_zy.py 產生） */\n'
        'window.QUIZ_ZY = ' + json.dumps(result, ensure_ascii=False, indent=0) + ';\n', encoding='utf-8')
    for w, z in result.items():
        if where[w] != '課本語詞':
            print(f'{w}\t{z}\t{where[w]}')
    print('共', len(result), '詞')
    make_cands(result)


def make_cands(quiz, per=12):
    """選字用的同音字表 data/zy_cands.js：{讀音: 同音常用字（常用的在前）}。
    只收教育部常用字（讀音表等級 A），依新酷音詞庫的單字頻率排序；題目用到的字一定收進去。"""
    txt = ROOT / 'tools' / 'texts'
    common = set()
    for line in (txt / 'phonic_table_Z.txt').read_text(encoding='utf-8-sig').splitlines():
        cols = line.split('\t')
        if len(cols) >= 4 and 'A' in cols[2]:
            common.add(cols[0])
    freq = {}
    for line in (txt / 'tsi.src.txt').read_text(encoding='utf-8-sig').splitlines():
        p = line.split(' ')
        if len(p) == 3 and len(p[0]) == 1 and p[0] in common and p[1].isdigit():
            z = '˙' + p[2].replace('˙', '') if '˙' in p[2] else p[2]
            freq.setdefault(z, {})
            freq[z][p[0]] = max(freq[z].get(p[0], 0), int(p[1]))
    need = {}
    for w, zy in quiz.items():
        for c, z in zip(w, zy.split(' ')):
            need.setdefault(z, set()).add(c)
    cands = {}
    for z in set(freq) | set(need):
        order = sorted(freq.get(z, {}), key=lambda c: -freq[z][c])
        must = need.get(z, set())
        keep = [c for c in order if c in must or len(must) + sum(1 for x in order[:order.index(c)] if x not in must) < per]
        cands[z] = ''.join(keep + sorted(must - set(keep)))
    (ROOT / 'data' / 'zy_cands.js').write_text(
        '/* 注音聽打「選字」用的同音字表（由 tools/make_quiz_zy.py 產生） */\n'
        'window.ZY_CANDS = ' + json.dumps(cands, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('同音字表', len(cands), '個讀音')


if __name__ == '__main__':
    main()
