"""共用：讀網站的一課資料、作業補充資料，給句子標注音。由 make_docx.py 載入。

路徑由環境變數設定（fit.py 會設好）：
  WS_SITE  網站資料夾（例：mandarin），裡面有 data/lessonXX.js、images/、tools/make_reader.py
  WS_OUT   作業輸出資料夾
  WS_DATA  補充資料資料夾（預設 WS_SITE/tools/worksheet/wsdata）
  WS_LID   課次（make_docx.py 會設）
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

SITE = Path(os.environ.get('WS_SITE', 'mandarin')).resolve()
OUT = Path(os.environ.get('WS_OUT', '.')).resolve()
DATA = Path(os.environ.get('WS_DATA', str(SITE / 'tools' / 'worksheet' / 'wsdata'))).resolve()
LID = os.environ['WS_LID']
NUM = '零一二三四五六七八九十'

# ── 讀網站資料 ──
js = subprocess.run(['node', '-e', f"global.window=global;eval(require('fs').readFileSync(String.raw`{SITE / 'data' / f'lesson{LID}.js'}`,'utf8'));process.stdout.write(JSON.stringify(window.LESSONS['{LID}']))"],
                    capture_output=True, text=True, encoding='utf-8').stdout
L = json.loads(js)

# ── 句子注音：借用 make_reader.py（斷詞＋詞庫＋變調規則），語詞用網站資料的注音 ──
sys.path.insert(0, str(SITE / 'tools'))
import make_reader as mr  # noqa: E402

KNOWN = {w['w']: w['zy'] for w in L['words']}
KNOWN.update({d['idiom']: d['zy'] for d in L['idioms']})
for f in L['families']:
    for m in f['members']:
        for w in m['words']:
            if len(w) == 2 and w.index(m['c']) >= 0 and f.get('poly'):
                # 多音字的語詞：被考的那個字用指定讀音
                z = (mr.lookup(w) or '').split()
                if len(z) == 2:
                    z[w.index(m['c'])] = m['zy']
                    KNOWN[w] = ' '.join(z)
# 網站課文點讀的讀音校正（tools/texts/fixes.json，例：路得），再加上這份作業自己的校正（wsdata 的 zyfix）
_fx = json.loads((SITE / 'tools' / 'texts' / 'fixes.json').read_text(encoding='utf-8')).get(LID, {})
KNOWN.update({w: z.split('|')[0] for w, z in _fx.items()})
KNOWN.update(json.loads((DATA / f'{LID}.json').read_text(encoding='utf-8')).get('zyfix', {}))
_cache = {}


def zy_of(text):
    """整句 → [(字, 注音)]；標點注音是空字串。"""
    if text in _cache:
        return _cache[text]
    tmp = Path(tempfile.mkdtemp())
    (tmp / 'lessonws.txt').write_text('@t\n' + text + '\n', encoding='utf-8')
    (tmp / 'fixes.json').write_text(json.dumps({'ws': KNOWN}, ensure_ascii=False), encoding='utf-8')
    mr.TXT, mr.OUT, mr.FIX_F = tmp, tmp, tmp / 'fixes.json'
    mr.build('ws')
    data = json.loads(re.search(r'= (\{.*\});?\s*$', (tmp / 'lessonws.js').read_text(encoding='utf-8'), re.S).group(1))
    out = []
    for tok in data['sections'][0]['paras'][0]:
        zs = tok[1].split(' ') if tok[1] else []
        for i, c in enumerate(tok[0]):
            out.append((c, zs[i] if i < len(zs) else ''))
    _cache[text] = out
    return out
