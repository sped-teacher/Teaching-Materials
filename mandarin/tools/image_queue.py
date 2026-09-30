"""
生圖佇列：依序把 tools/cards_XX.json 的圖都畫完（已經有圖的會略過）。
Codex 額度用完時，每隔一段時間再試一次，直到全部畫完。

  python tools/image_queue.py              # 第 3～12 課
  python tools/image_queue.py 07 08        # 只排指定課次

畫完後，把其他課已經畫過的共用圖複製過來（COPY）。
"""
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WAIT = 60 * 60  # 額度用完時，等 1 小時再試

# 共用圖：(來源課, 目的課, 語詞)
COPY = [('02', '07', n) for n in ('記錄', '俸祿', '綠葉')] + \
       [('01', '10', n) for n in ('募集', '布幕', '羨慕')] + \
       [('07', '10', n) for n in ('職業', '編織', '認識', '旗幟')] + \
       [('03', '05', '消失'), ('03', '06', '消失'), ('03', '06', '銷售')] + \
       [('01', '10', '日暮'), ('02', '07', '忙碌'), ('03', '07', '隱形'), ('03', '07', '安穩'),
        ('04', '11', '灌溉'), ('05', '11', '孩子')]


def copy_shared():
    for src, dst, name in COPY:
        a = ROOT / 'images' / f'lesson{src}' / f'{name}.png'
        b = ROOT / 'images' / f'lesson{dst}' / f'{name}.png'
        if a.exists() and not b.exists():
            b.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(a, b)
            print(f'複製：{a.name} → lesson{dst}', flush=True)


def keep_awake():
    """程式執行期間不讓 Windows 自動睡眠（螢幕可以關）；程式結束就自動恢復，不改電源設定。"""
    try:
        import ctypes
        ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
        print('已設定：畫圖期間電腦不會自動睡眠', flush=True)
    except Exception:
        pass  # 不是 Windows 就略過


def main(lids):
    keep_awake()
    for lid in lids:
        conf = ROOT / 'tools' / f'cards_{lid}.json'
        if not conf.exists():
            continue
        while True:
            print(f'=== 第 {lid} 課 {time.strftime("%H:%M")} ===', flush=True)
            r = subprocess.run([sys.executable, str(ROOT / 'tools' / 'gen_cards.py'), str(conf)])
            copy_shared()
            if r.returncode == 0:
                break
            print(f'第 {lid} 課中斷（多半是額度用完），{WAIT // 60} 分鐘後再試', flush=True)
            time.sleep(WAIT)
    copy_shared()
    print('全部完成', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:] or ['%02d' % i for i in range(3, 13)])
