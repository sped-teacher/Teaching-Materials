"""
從全字庫正楷體（TW-Kai，OFL-1.1）挑出網站用到的字，做成小字型檔 assets/fonts/twkai.woff2。
每加一課或改了文字，重新執行：python tools/build_font.py
完整字型放在 C:\\Claude\\twkai（不進 repo）。
"""
import re
from pathlib import Path
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r'C:\Claude\twkai\TW-Kai-98_1.ttf')
OUT = ROOT / 'assets' / 'fonts' / 'twkai.woff2'

text = ''
# zy_cands.js（注音聽打選字的同音字表）、char_zy.js（朗讀挑戰比對讀音的索引）都有幾千字、不會用楷書顯示，
# 不放進楷書字型，免得檔案太大
for p in [p for p in (ROOT / 'data').rglob('*.js') if p.name not in ('zy_cands.js', 'char_zy.js')] + [ROOT / 'assets' / 'app.js', ROOT / 'index.html']:
    text += p.read_text(encoding='utf-8')
chars = set(re.findall(r'[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]', text)) | set('０１２３４５６７８９')
OUT.parent.mkdir(parents=True, exist_ok=True)
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
font = subset.load_font(str(SRC), opts)
s = subset.Subsetter(opts)
s.populate(text=''.join(sorted(chars)))
s.subset(font)
subset.save_font(font, str(OUT), opts)
print(len(chars), 'chars ->', OUT, round(OUT.stat().st_size / 1024), 'KB')
