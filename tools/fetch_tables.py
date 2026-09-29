"""
下載注音讀音資料到 tools/texts/（這些是外部專案的檔案，不放進我們的 repo）：
  - phonic_table_Z.txt、phonic_table_A.txt：ButTaiwan/bpmfvs 讀音表（整理自教育部一字多音審訂表等）
  - tsi.src.txt：新酷音輸入法詞庫（隨 bpmfvs 專案提供）
來源：https://github.com/ButTaiwan/bpmfvs （授權見該專案 LICENSE）

  python tools/fetch_tables.py

換新電腦、要執行 make_reader.py、make_quiz_zy.py、make_score_data.py、check_lesson.py 之前先跑一次。
"""
import urllib.request
from pathlib import Path

BASE = 'https://raw.githubusercontent.com/ButTaiwan/bpmfvs/master/phonetic/'
FILES = {'phonic_table_Z.txt': 'phonic_table_Z.txt', 'phonic_table_A.txt': 'phonic_table_A.txt',
         'tsi.src.txt': 'source/tsi.src.txt'}
OUT = Path(__file__).resolve().parent / 'texts'

for name, path in FILES.items():
    dst = OUT / name
    if dst.exists():
        print('已經有了：', name)
        continue
    print('下載：', name)
    data = urllib.request.urlopen(BASE + path, timeout=120).read()
    dst.write_bytes(data)
print('完成')
