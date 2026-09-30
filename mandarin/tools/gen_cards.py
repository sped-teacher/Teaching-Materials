"""
產生語詞圖卡。

畫風參考特工 365 語詞圖庫公開的生圖原則（插畫部分），全部統一用同一種風格：
  簡潔教育插畫、原創角色、柔和扁平、純白背景
我們另外規定：畫面任何地方不可出現任何文字、字母、數字（也不用對話框）。
這條規定寫死在程式裡，每張都會自動加上，不能關掉。

產圖引擎：
  codex（預設）：Codex CLI 內建的產圖功能，用老師自己登入的 ChatGPT 帳號（先執行 codex login）
  --hf        ：Hugging Face FLUX.1-schnell（免費、每天額度少；可用 HF_TOKEN 環境變數）

用法：
  python tools/gen_cards.py tools/cards_01.json            # 產生設定檔裡還沒有圖的語詞
  python tools/gen_cards.py tools/cards_01.json 蚊帳 獎狀   # 只產生（或重產）指定語詞
  python tools/gen_cards.py --redo tools/cards_01.json     # 全部重產
  python tools/gen_cards.py --hf tools/cards_01.json       # 改用 Hugging Face

設定檔格式：{ "lesson": "01", "cards": [ { "name": 語詞, "scene": 英文畫面描述 } ] }
圖片裁成正方形 640×640，存成 images/lessonXX/語詞.webp（每張約 30 KB）。
帳號憑證、token 絕對不要寫進這個檔案或 repo。
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image

SIZE = 640  # iPad 高解析螢幕顯示圖卡（最大約 320 點）用 640 就夠清楚
STYLE = (
    'Clean simple educational illustration for teaching picture cards, Japanese simple '
    'clip-art style, soft flat colors with gentle rounded outlines, bright but not harsh '
    'colors, cute friendly original characters (Taiwanese elementary school children), '
    'one clear simple scene, subject centered, pure white #FFFFFF background, uncluttered.'
)
# 寫死：畫面任何地方不可出現任何文字、字母、數字
NO_TEXT = (
    'Absolutely no text anywhere in the image: no words, no letters, no numbers, '
    'no Chinese characters, no speech bubbles, no signs, no labels, no logos, no writing of any kind.'
)

ROOT = Path(__file__).resolve().parent.parent


# ── Codex CLI ─────────────────────────────────────
CODEX_IMAGES = Path.home() / '.codex' / 'generated_images'


def codex_cmd():
    js = Path(os.environ.get('APPDATA', '')) / 'npm' / 'node_modules' / '@openai' / 'codex' / 'bin' / 'codex.js'
    if js.exists() and shutil.which('node'):
        return [shutil.which('node'), str(js)]
    exe = shutil.which('codex')
    if not exe:
        raise RuntimeError('找不到 codex，請先安裝 Codex CLI 並執行 codex login')
    return [exe]


def gen_codex(prompt: str) -> Image.Image:
    ask = ('Use your built-in image generation tool to create exactly ONE square (1:1) image. '
           'Do not write any code, do not read any files, just generate the image once. '
           'Image prompt: ' + prompt)
    start = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        r = subprocess.run(codex_cmd() + ['exec', '--skip-git-repo-check', '-C', tmp, ask],
                           stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
    new = [p for p in CODEX_IMAGES.rglob('*.png') if p.stat().st_mtime >= start - 1]
    if not new:
        tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
        raise RuntimeError('Codex 沒有產生圖片：' + ' / '.join(tail))
    return Image.open(max(new, key=lambda p: p.stat().st_mtime))


# ── Hugging Face ──────────────────────────────────
HF_SPACE = 'black-forest-labs/FLUX.1-schnell'
_hf_client = None


def gen_hf(prompt: str) -> Image.Image:
    global _hf_client
    from gradio_client import Client
    if _hf_client is None:
        _hf_client = Client(HF_SPACE, token=os.environ.get('HF_TOKEN') or None, verbose=False)
    result = _hf_client.predict(prompt=prompt, seed=0, randomize_seed=True, width=1024, height=1024,
                                num_inference_steps=4, api_name='/infer')
    return Image.open(result[0] if isinstance(result, (list, tuple)) else result)


def save_webp(img: Image.Image, out: Path):
    """裁成正方形、縮成 640×640，存成 WebP（每張約 30 KB，網站載入快）。"""
    img = img.convert('RGB')
    s = min(img.size)
    left, top = (img.width - s) // 2, (img.height - s) // 2
    img = img.crop((left, top, left + s, top + s)).resize((SIZE, SIZE), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, 'WEBP', quality=80, method=6)


def make(lesson: str, name: str, scene: str, engine) -> Path:
    img = engine(f'{STYLE} {scene.strip()} {NO_TEXT}')
    out = ROOT / 'images' / f'lesson{lesson}' / f'{name}.webp'
    save_webp(img, out)
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    engine = gen_hf if '--hf' in args else gen_codex
    redo = '--redo' in args
    args = [a for a in args if not a.startswith('--')]
    if not args:
        print(__doc__)
        sys.exit(1)
    conf = json.loads(Path(args[0]).read_text(encoding='utf-8'))
    only, lesson = set(args[1:]), conf['lesson']
    for card in conf['cards']:
        name = card['name']
        out = ROOT / 'images' / f'lesson{lesson}' / f'{name}.webp'
        if only and name not in only:
            continue
        if not only and not redo and out.exists():
            print(f'略過（已有圖）：{name}')
            continue
        try:
            print(f'完成：{make(lesson, name, card["scene"], engine)}', flush=True)
        except Exception as e:  # 額度用完或服務忙碌時，先停下來
            print(f'失敗：{name}：{e}', flush=True)
            sys.exit(2)
