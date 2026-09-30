"""
檢查課程資料 data/lessonXX.js 的注音（寫完新的一課一定要跑）。

  python tools/check_lesson.py 07 08

檢查項目：
  1. 注音字數和國字字數一樣
  2. 語詞、成語、形近字的注音，和新酷音詞庫／單字讀音表（已含教育部辭典校正，見 make_reader.py）不同的，列出來請人工確認
  3. 題目的正確答案在選項第一個、沒有重複選項
"""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_reader import TSI  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TXT = ROOT / 'tools' / 'texts'

ALL = {}
for line in (TXT / 'phonic_table_Z.txt').read_text(encoding='utf-8-sig').splitlines():
    cols = line.split('\t')
    if len(cols) >= 4:
        ALL[cols[0]] = [z for z in cols[3:] if z]


def js_to_json(src):
    """把資料檔的 JS 物件（單引號字串、沒加引號的鍵、註解、結尾逗號）轉成 JSON。"""
    out, i, n = [], 0, len(src)
    while i < n:
        ch = src[i]
        if ch == "'":  # 單引號字串 → 雙引號
            j, buf = i + 1, []
            while src[j] != "'":
                if src[j] == '\\':
                    buf.append(src[j + 1]); j += 2; continue
                buf.append(src[j]); j += 1
            out.append(json.dumps(''.join(buf), ensure_ascii=False)); i = j + 1
        elif src.startswith('//', i):
            i = src.index('\n', i)
        elif src.startswith('/*', i):
            i = src.index('*/', i) + 2
        else:
            m = re.match(r'([A-Za-z_]\w*|\d+)(\s*:)', src[i:])
            if m and (not out or not re.search(r'[\w"]$', out[-1])):
                out.append(json.dumps(m.group(1)) + m.group(2)); i += m.end()
            else:
                out.append(ch); i += 1
    s = ''.join(out)
    return re.sub(r',(\s*[\]}])', r'\1', s)


def load(lid):
    js = (ROOT / 'data' / f'lesson{lid}.js').read_text(encoding='utf-8')
    body = js[js.index(f"window.LESSONS['{lid}'] = ") + len(f"window.LESSONS['{lid}'] = "):].rstrip().rstrip(';')
    return json.loads(js_to_json(body))


def norm(z):
    return '˙' + z.replace('˙', '') if '˙' in z else z


def check_word(w, zy, where, probs):
    zs = zy.split(' ')
    if len(zs) != len(w):
        probs.append(f'{where}「{w}」注音字數不對：{zy}')
        return
    base = ' '.join(norm(z) for z in zs)
    # 「一、不」在語詞裡標本調
    dict_z = TSI.get(w)
    if dict_z and dict_z != base:
        probs.append(f'{where}「{w}」{zy}　詞庫是 {dict_z}')
    for c, z in zip(w, zs):
        if ALL.get(c) and norm(z) not in [norm(x) for x in ALL[c]] and z not in ('˙ㄉㄜ', '˙ㄌㄜ', '˙ㄗ', '˙ㄇㄣ', '˙ㄍㄜ'):
            probs.append(f'{where}「{w}」的「{c}」念 {z}，讀音表沒有這個音（{"/".join(ALL[c])}）')


def main(lids):
    for lid in lids:
        L = load(lid)
        probs = []
        for c in L['chars']:
            if norm(c['zy']) not in [norm(x) for x in ALL.get(c['c'], [c['zy']])]:
                probs.append(f'生字「{c["c"]}」{c["zy"]} 不在讀音表 {ALL.get(c["c"])}')
        for w in L['words']:
            check_word(w['w'], w['zy'], '語詞', probs)
        for x in L.get('idioms', []):
            check_word(x['idiom'], x['zy'], '成語', probs)
            if x['idiom'][x['blank']] != x['options'][0]:
                probs.append(f'成語「{x["idiom"]}」blank 位置的字不是 options[0]')
            if len(set(x['options'])) != len(x['options']):
                probs.append(f'成語「{x["idiom"]}」選項重複')
        for f in L.get('families', []):
            for m in f['members']:
                for w in m['words']:
                    k = w.index(m['c']) if m['c'] in w else -1
                    if k >= 0 and w in TSI:
                        dz = TSI[w].split(' ')[k]
                        if dz != norm(m['zy']):
                            probs.append(f'形近字「{m["c"]}」{m["zy"]}，但「{w}」在詞庫念 {dz}')
                if norm(m['zy']) not in [norm(x) for x in ALL.get(m['c'], [m['zy']])]:
                    probs.append(f'形近字「{m["c"]}」{m["zy"]} 不在讀音表 {ALL.get(m["c"])}')
        for q in L.get('lookalikes', []):
            if not q.get('poly') and '＿' in q['sentence'] and q['options'][0] not in [m['c'] for f in L['families'] if f['id'] == q['fam'] for m in f['members']]:
                probs.append(f'形近字題 {q["id"]} 答案不在字族裡')
            if len(set(q['options'])) != len(q['options']):
                probs.append(f'形近字題 {q["id"]} 選項重複')
        for s in L.get('sentences', []):
            for ch in s.get('choose', []):
                if len(set(ch['options'])) != len(ch['options']):
                    probs.append(f'句型 {s["id"]} 選項重複')
        print(f'== 第 {lid} 課：{len(L["chars"])} 生字、{len(L["words"])} 語詞、{len(L.get("idioms", []))} 成語，待確認 {len(probs)} 項')
        for p in probs:
            print('  ', p)


if __name__ == '__main__':
    main(sys.argv[1:])
