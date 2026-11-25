"""
出卷用的資料：
  1. data/exam_zy.js（進 repo）：每個字的讀音表，網頁上改題目、改破音字時用。
       ZY1 = {讀音: 預設念這個音的字}；ZYP = {多音字: "讀音1 讀音2 …"（第一個是預設）}
  2. data/exam_plain.js（不進 repo）：題庫（tools/exam/bank.json）＋每一句的注音，只在老師電腦測試用。
     上網站前用 node tools/encrypt_exam.mjs 加密成 data/exam.enc.js。

  python tools/build_exam.py

注音用課文點讀同一套規則（make_reader.zy_line：斷詞、新酷音詞庫、多音字規則、一不變調、老師校正 fixes.json）。
"""
import json
import re
import subprocess
from pathlib import Path

import make_reader as mr

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / 'tools' / 'exam' / 'bank.json'
FIXES = {}
if mr.FIX_F.exists():
    for v in json.loads(mr.FIX_F.read_text(encoding='utf-8')).values():
        if isinstance(v, dict):
            FIXES.update(v)
# 出卷另外校正的讀音（依《國語辭典簡編本》）
FIXES.update({'為什麼': 'ㄨㄟˋ ㄕㄣˊ ˙ㄇㄜ', '怎樣': 'ㄗㄣˇ ㄧㄤˋ', '怎麼樣': 'ㄗㄣˇ ˙ㄇㄜ ㄧㄤˋ'})
for w in FIXES:
    mr.jieba.add_word(mr._t2s.convert(w), 99999)


def zy(text):
    """一句話 → 每個字的注音（標點、符號是空字串），長度和 text 一樣。"""
    out = []
    for tok in mr.zy_line(text, FIXES, []):
        zs = tok[1].split(' ') if tok[1] else []
        if len(zs) == len(tok[0]):
            out += zs
        else:
            out += [''] * len(tok[0])
    assert len(out) == len(text), text
    return out


# 題目字串 → 「要查注音的完整句子」（和 assets/exam.js 的 plainOf 一樣的規則）
def plain(kind, s):
    if kind == 'look':
        return re.sub(r'（([^）]*)）', lambda m: next(o[1:] for o in m.group(1).split('／') if o.startswith('*')), s)
    if kind == 'fix':
        return re.sub(r'〔([^>〕]*)>([^〕]*)〕', r'\2', s)
    return s.replace('〔', '').replace('〕', '')


def lesson_extra():
    """課本資料（網站 data/lessonXX.js）：生字部首、短語範例、句型。"""
    js = r"""
global.window={};const out={};
for(let i=1;i<=12;i++){const id=String(i).padStart(2,'0');try{require(process.argv[1]+'/data/lesson'+id+'.js')}catch(e){continue}
const L=window.LESSONS[id];out[id]={title:L.title,
 radical:Object.fromEntries(L.chars.map(c=>[c.c,c.radical])),
 phrase:(L.phrases||[]).map(p=>({m:p.model,fix:(p.blocks||[]).map(b=>typeof b==='string'),bank:(p.blocks||[]).map(b=>typeof b==='string'?[]:((p.bank||{})[b.k]||[]).map(x=>x.w))})),
 imitate:(L.sentences||[]).map(s=>s.pattern)}}
console.log(JSON.stringify(out))"""
    r = subprocess.run(['node', '-e', js, str(ROOT)], capture_output=True, text=True, encoding='utf-8', check=True)
    return json.loads(r.stdout)


def zy_table():
    """讀音表照 bpmfvs 原本的順序（注音字型的 IVS：第 n 個讀音 = U+E01E0+n）。"""
    one, poly = {}, {}
    for line in (mr.TXT / 'phonic_table_Z.txt').read_text(encoding='utf-8-sig').splitlines():
        cols = line.split('	')
        if len(cols) < 4 or not re.search('[ABC]', cols[2]):
            continue
        rs = ['˙' + r.replace('˙', '') if '˙' in r else r for r in cols[3:] if r]
        c = cols[0]
        one[rs[0]] = one.get(rs[0], '') + c
        if len(rs) > 1:
            poly[c] = ' '.join(rs)
    return one, poly


def main():
    bank = json.loads(BANK.read_text(encoding='utf-8'))
    extra = lesson_extra()
    out = {}
    for lid, B in bank.items():
        if not re.fullmatch(r'\d\d', lid):
            continue
        E = extra[lid]
        L = {'title': E['title']}
        for kind in ('dict', 'look', 'fix', 'idiom'):
            L[kind] = [{'s': s, 'z': zy(plain(kind, s))} for s in B.get(kind, [])]
        L['idiom'] = [dict(it, w=re.search(r'〔([^〕]*)〕', it['s']).group(1)) for it in L['idiom']]
        for it in L['idiom']:
            it['wz'] = zy(it['w'])
        L['word'] = [{'s': q['q'], 'z': zy(plain('word', q['q'])), 'o': q['o'], 'oz': [zy(o) for o in q['o']]} for q in B.get('word', [])]
        L['choice'] = [{'s': q['q'], 'z': zy(q['q']), 'o': q['o'], 'oz': [zy(o) for o in q['o']]} for q in B.get('choice', [])]
        L['radical'] = [{'c': c, 'r': E['radical'].get(c, '')} for c in B.get('radical', [])]
        # 短語：fix＝照印的字（的、而、般…）；bank＝每一格可以用的詞（中組給詞庫用，不放範例本身的詞）
        L['phrase'] = [{'w': p['m'], 'z': [zy(w) for w in p['m']], 'fix': p['fix'],
                        'bank': [[x for x in b if x != w] for b, w in zip(p['bank'], p['m'])],
                        'bz': {x: zy(x) for b in p['bank'] for x in b}} for p in E['phrase']]
        L['imitate'] = [{'s': p, 'z': zy(p)} for p in E['imitate']]
        out[lid] = L
        bad = [c for c in L['radical'] if not c['r']]
        if bad:
            print('！', lid, '部首題的字不是本課生字：', ''.join(c['c'] for c in bad))
        print(lid, E['title'], {k: len(v) for k, v in L.items() if isinstance(v, list)})
    (ROOT / 'data' / 'exam_plain.js').write_text(
        '/* 出卷題庫（不進 repo；由 tools/build_exam.py 產生，用 tools/encrypt_exam.mjs 加密成 exam.enc.js） */\n'
        'window.EXAM_BANK = ' + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')
    one, poly = zy_table()
    (ROOT / 'data' / 'exam_zy.js').write_text(
        '/* 出卷頁改題目用的讀音表（由 tools/build_exam.py 產生）：ZY1 預設讀音 → 字；ZYP 多音字 → 所有讀音 */\n'
        'window.EXAM_ZY1 = ' + json.dumps(one, ensure_ascii=False, separators=(',', ':')) + ';\n'
        'window.EXAM_ZYP = ' + json.dumps(poly, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('讀音表：', len(one), '個讀音、', len(poly), '個多音字')


if __name__ == '__main__':
    main()
