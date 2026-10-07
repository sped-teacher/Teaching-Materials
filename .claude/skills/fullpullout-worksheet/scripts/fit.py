"""產生全抽組作業（Word＋PDF），自動挑一頁放得下的版面（每課 3 頁）。

  python fit.py --site mandarin --out "C:\\Users\\class\\Desktop\\學國5上\\全抽作業" 01 04
  python fit.py --site mandarin --out <資料夾>            # data/ 裡的全部課

  --site  網站資料夾（有 data/lessonXX.js、images/、tools/）
  --out   作業輸出資料夾（不在 repo 裡）
  --data  補充資料（段落大意改寫等），預設 <site>/tools/worksheet/wsdata
需要：Word、python-docx、pywin32、Pillow、文鼎標楷注音字型。
"""
import argparse, os, subprocess, sys
from pathlib import Path
import win32com.client

HERE = Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument('--site', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--data')
ap.add_argument('lessons', nargs='*')
a = ap.parse_args()
site = Path(a.site).resolve()
out = Path(a.out).resolve()
out.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, WS_SITE=str(site), WS_OUT=str(out), PYTHONIOENCODING='utf-8')
if a.data:
    env['WS_DATA'] = str(Path(a.data).resolve())
data = Path(env.get('WS_DATA', site / 'tools' / 'worksheet' / 'wsdata'))
lessons = a.lessons or sorted(p.stem for p in data.glob('[0-9][0-9].json'))

LEVELS = 6   # 版面等級 0～5：0 最豐富；放不下時減少情境圖、縮小圖（見 make_docx.py 的 PLANS）
word = win32com.client.DispatchEx('Word.Application')
word.Visible = False
try:
    for lid in lessons:
        docx = out / f'第{lid}課_全抽作業.docx'
        for level in range(LEVELS):
            r = subprocess.run([sys.executable, str(HERE / 'make_docx.py'), lid, str(level), 'top'],
                               capture_output=True, text=True, encoding='utf-8', env=env)
            if r.returncode:
                print(f'{lid}：產生失敗\n{r.stderr[-1500:]}')
                break
            warn = [l for l in r.stdout.splitlines() if '⚠' in l]
            d = word.Documents.Open(str(docx), False, True)
            pages = d.ComputeStatistics(2)
            if pages <= 3 or level == LEVELS - 1:
                d.ExportAsFixedFormat(str(docx.with_suffix('.pdf')), 17)
                d.Close(False)
                print(f'{lid}：{pages} 頁（版面等級 {level}）', *warn)
                break
            d.Close(False)
finally:
    word.Quit()
