# 句子注音（借用國語網站的 make_reader.py＋國語 skill 的 zyfont.py 選破音字型）
import json, os, re, sys, tempfile
from pathlib import Path

REPO = Path(r"C:\Users\class\Documents\teaching-materials")
SITE = REPO / "mandarin"
os.environ.setdefault("WS_SITE", str(SITE))
sys.path.insert(0, str(SITE / "tools"))
sys.path.insert(0, str(REPO / ".claude" / "skills" / "fullpullout-worksheet" / "scripts"))
import make_reader as mr  # noqa: E402
import zyfont  # noqa: E402

# 數學考卷常用詞的讀音校正
KNOWN = {
    "數一數": "ㄕㄨˇ ㄧˋ ㄕㄨˇ", "數數看": "ㄕㄨˇ ㄕㄨˇ ㄎㄢˋ", "量量看": "ㄌㄧㄤˊ ㄌㄧㄤˊ ㄎㄢˋ", "量一量": "ㄌㄧㄤˊ ㄧˋ ㄌㄧㄤˊ",
    "量角器": "ㄌㄧㄤˊ ㄐㄧㄠˇ ㄑㄧˋ", "還剩": "ㄏㄞˊ ㄕㄥˋ", "還有": "ㄏㄞˊ ㄧㄡˇ", "一樣長": "ㄧˊ ㄧㄤˋ ㄔㄤˊ",
    "邊長": "ㄅㄧㄢ ㄔㄤˊ", "長度": "ㄔㄤˊ ㄉㄨˋ", "旋轉": "ㄒㄩㄢˊ ㄓㄨㄢˇ", "轉到": "ㄓㄨㄢˇ ㄉㄠˋ", "轉了": "ㄓㄨㄢˇ ˙ㄌㄜ",
    "數字": "ㄕㄨˋ ㄗˋ", "幾個": "ㄐㄧˇ ˙ㄍㄜ", "張": "ㄓㄤ", "答": "ㄉㄚˊ", "答案": "ㄉㄚˊ ㄢˋ", "得": "ㄉㄜˊ",
    "平分": "ㄆㄧㄥˊ ㄈㄣ", "公分": "ㄍㄨㄥ ㄈㄣ", "部分": "ㄅㄨˋ ㄈㄣˋ", "分成": "ㄈㄣ ㄔㄥˊ", "分針": "ㄈㄣ ㄓㄣ",
    "相差": "ㄒㄧㄤ ㄔㄚ", "差多少": "ㄔㄚ ㄉㄨㄛ ㄕㄠˇ", "多少": "ㄉㄨㄛ ㄕㄠˇ", "剩下": "ㄕㄥˋ ㄒㄧㄚˋ",
    "直式": "ㄓˊ ㄕˋ", "算式": "ㄙㄨㄢˋ ㄕˋ", "畫出": "ㄏㄨㄚˋ ㄔㄨ", "一個": "ㄧˊ ˙ㄍㄜ", "一共": "ㄧˊ ㄍㄨㄥˋ",
    "頂點": "ㄉㄧㄥˇ ㄉㄧㄢˇ", "對應": "ㄉㄨㄟˋ ㄧㄥˋ", "全等": "ㄑㄩㄢˊ ㄉㄥˇ", "等腰": "ㄉㄥˇ ㄧㄠ",
    "參觀": "ㄘㄢ ㄍㄨㄢ", "看板": "ㄎㄢˋ ㄅㄢˇ", "應用題": "ㄧㄥˋ ㄩㄥˋ ㄊㄧˊ", "應用": "ㄧㄥˋ ㄩㄥˋ", "教學": "ㄐㄧㄠˋ ㄒㄩㄝˊ",
    "記得": "ㄐㄧˋ ˙ㄉㄜ", "量了": "ㄌㄧㄤˊ ˙ㄌㄜ", "興奮": "ㄒㄧㄥ ㄈㄣˋ", "一起": "ㄧˋ ㄑㄧˇ", "一天": "ㄧˋ ㄊㄧㄢ",
}
_cache = {}
warn = []


def zy_of(text):
    if text in _cache:
        return _cache[text]
    tmp = Path(tempfile.mkdtemp())
    (tmp / "lessonws.txt").write_text("@t\n" + text + "\n", encoding="utf-8")
    (tmp / "fixes.json").write_text(json.dumps({"ws": KNOWN}, ensure_ascii=False), encoding="utf-8")
    mr.TXT, mr.OUT, mr.FIX_F = tmp, tmp, tmp / "fixes.json"
    mr.build("ws")
    data = json.loads(re.search(r"= (\{.*\});?\s*$", (tmp / "lessonws.js").read_text(encoding="utf-8"), re.S).group(1))
    out = []
    for tok in data["sections"][0]["paras"][0]:
        zs = tok[1].split(" ") if tok[1] else []
        for i, c in enumerate(tok[0]):
            out.append((c, zs[i] if i < len(zs) else ""))
    _cache[text] = out
    return out


# 單字一律用的讀音（這份考卷裡「量」都是動詞「量角度」，沒有「容量、數量」）
CHAR = {"量": "ㄌㄧㄤˊ", "個": "˙ㄍㄜ"}   # 個：量詞一律讀輕聲（老師 2026-10-21）


def fonts_of(text):
    """[(字, 字型名稱)]：中文字依讀音選注音字型，其他用 None（由呼叫端用標楷體）"""
    res = []
    for c, z in zy_of(text):
        z = CHAR.get(c, z) if z else z
        if z and re.match(r"[㐀-鿿]", c):
            i, d = zyfont.variant(c, z)
            if i is None or d > 30:
                warn.append(f"{c}{z}")
                i = 0
            res.append((c, zyfont.NAMES[i]))
        else:
            res.append((c, None))
    return res


if __name__ == "__main__":
    for t in ["數數看，量量看，還剩下幾個？", "一個邊長 3 公分的正三角形", "分針從 12 順時針轉到 4，轉了幾度？",
              "平分給 6 個人，每人分到多少？", "兩年相差多少元？答：", "樂園裡的遊樂設施"]:
        print(t, "→", " ".join(f"{c}{z}" for c, z in zy_of(t) if z))
        print("   ", [(c, f) for c, f in fonts_of(t) if f and f != zyfont.NAMES[0]])
