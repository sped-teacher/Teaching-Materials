"""
把 images/ 裡的 PNG 圖卡轉成 640×640 WebP（每張約 30 KB，原本 PNG 約 770 KB），轉好後刪掉 PNG。

  python tools/optimize_images.py            # 全部
  python tools/optimize_images.py 12         # 只轉指定課次

新畫的圖 gen_cards.py 已經直接存成 WebP，這支只用來轉舊的 PNG。
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_cards import save_webp  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main(lids):
    dirs = [ROOT / 'images' / f'lesson{l}' for l in lids] if lids else sorted((ROOT / 'images').glob('lesson*'))
    before = after = n = 0
    for d in dirs:
        for png in sorted(d.glob('*.png')):
            out = png.with_suffix('.webp')
            with Image.open(png) as im:
                save_webp(im, out)
            before += png.stat().st_size
            after += out.stat().st_size
            png.unlink()
            n += 1
    if n:
        print(f'轉了 {n} 張：{before // 1024 // 1024} MB → {after // 1024 // 1024} MB')
    else:
        print('沒有要轉的 PNG')


if __name__ == '__main__':
    main(sys.argv[1:])
