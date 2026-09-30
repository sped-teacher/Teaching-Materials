"""
產生「朗讀挑戰」比對讀音用的索引 data/char_zy.js：{讀音: 念這個音的字}。

  python tools/make_score_data.py

語音辨識常把字認成同音字（例如「蚊帳」認成「文帳」），所以評分時比讀音：辨識出來的字只要有一個讀音
跟課文那個字一樣就算念對；只差聲調算「聲調不對」。
字的讀音來自 bpmfvs 讀音表 phonic_table_Z.txt（常用、次常用字的所有讀音），加上課文點讀資料裡的讀音。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TXT = ROOT / 'tools' / 'texts'


def norm(z):
    """讀音統一寫法：輕聲點放最前面（˙ㄉㄜ）。"""
    return '˙' + z.replace('˙', '') if '˙' in z else z


def main():
    idx = {}

    def add(c, z):
        z = norm(z)
        if z and c not in idx.setdefault(z, ''):
            idx[z] += c
    for line in (TXT / 'phonic_table_Z.txt').read_text(encoding='utf-8-sig').splitlines():
        cols = line.split('\t')
        if len(cols) >= 4 and re.search('[ABC]', cols[2]):
            for z in cols[3:]:
                if z:
                    add(cols[0], z)
    for f in sorted((ROOT / 'data' / 'reading').glob('lesson*.js')):
        s = f.read_text(encoding='utf-8')
        d = json.loads(s[s.index('] = ') + 4:].rstrip().rstrip(';'))
        for sec in d['sections']:
            for pa in sec['paras']:
                for t in pa:
                    if t[1]:
                        for c, z in zip(t[0], t[1].split(' ')):
                            add(c, z)
    (ROOT / 'data' / 'char_zy.js').write_text(
        '/* 朗讀挑戰比對讀音用：{讀音: 念這個音的字}（由 tools/make_score_data.py 產生） */\n'
        'window.CHAR_ZY = ' + json.dumps(idx, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(len(idx), '個讀音，', sum(len(v) for v in idx.values()), '個字音')


if __name__ == '__main__':
    main()
