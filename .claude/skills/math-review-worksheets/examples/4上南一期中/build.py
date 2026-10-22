import sys, os, json, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
sys.path.insert(0, HERE)
import s_a
import lib, s_x, s_y
mods = [s_y, s_x, s_a]
try:
    import s_b; mods.append(s_b)
except ImportError:
    pass
try:
    import s_c; mods.append(s_c)
except ImportError:
    pass

OUT = sys.argv[1]
only = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
JOBS = [
    ("n01", "第01次_課堂_位值讀寫數與換算"), ("g01", "第01次_作業_位值讀寫數與換算"),
    ("n02", "第02次_課堂_比大小與大數加減"), ("g02", "第02次_作業_比大小與大數加減"),
    ("s04", "第03次_課堂_乘法一"), ("h04", "第03次_作業_乘法一"),
    ("s05", "第04次_課堂_乘法二"), ("h05", "第04次_作業_乘法二"),
    ("s06", "第05次_課堂_量角器與角的種類"), ("h06", "第05次_作業_量角器與角的種類"),
    ("s07", "第06次_課堂_旋轉角與角度計算"), ("h07", "第06次_作業_旋轉角與角度計算"),
    # ("e01", "複習考1_第1-3單元"),   # 2026-10-22 改用 ../期中考卷_注音/review1.py（期中考格式、A4 雙欄）
    ("s08", "第07次_課堂_除法一"), ("h08", "第07次_作業_除法一"),
    ("s09", "第08次_課堂_除法二"), ("h09", "第08次_作業_除法二"),
    ("s10", "第09次_課堂_三角形"), ("h10", "第09次_作業_三角形"),
    ("e02", "複習考2_第4-5單元"),
    ("t10", "第10次_課堂_期中總複習"), ("u10", "第10次_作業_期中總複習"),
]
done = []
ans = {}
for key, name in JOBS:
    if only and key not in only:
        continue
    for m in mods:
        if hasattr(m, key):
            lib.PRE_SAVE = s_x.EXTRA.get(key)
            getattr(m, key)(os.path.join(OUT, name + ".docx"))
            lib.PRE_SAVE = None
            done.append(name)
            break
for m in mods:
    for k, v in getattr(m, "ANS", {}).items():
        ans.setdefault(k, []).extend(v)
json.dump(ans, open(os.path.join(tempfile.gettempdir(), "math-worksheet-answers.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\n".join(done))
