# 角度、量角器、時鐘、三角形的圖（PIL，300dpi，插入 Word 時用實際尺寸，學生可用量角器量）
import math, os, tempfile
from PIL import Image, ImageDraw, ImageFont

DPI = 300
PX = DPI / 2.54            # 1 公分幾個像素
OUT = os.path.join(tempfile.gettempdir(), "math-worksheet-img")
os.makedirs(OUT, exist_ok=True)
FONT = r"C:\Windows\Fonts\kaiu.ttf"
INK = (40, 40, 40)
SHADE = (220, 220, 220)
BLUE = (60, 110, 180)
_n = [0]


def font(pt):
    return ImageFont.truetype(FONT, int(pt * DPI / 72))


class Canvas:
    """以公分為單位、y 軸朝上的畫布；存檔時自動裁邊，回傳 (路徑, 寬公分)"""
    def __init__(self, w, h, ox, oy):
        self.w, self.h, self.ox, self.oy = w, h, ox, oy
        self.im = Image.new("RGB", (int(w * PX), int(h * PX)), "white")
        self.d = ImageDraw.Draw(self.im)

    def p(self, x, y):
        return ((self.ox + x) * PX, (self.h - (self.oy + y)) * PX)

    def line(self, a, b, width=0.05, fill=INK, dash=None):
        if dash:
            L = math.dist(a, b); n = int(L / dash)
            for i in range(0, n, 2):
                t0, t1 = i / n, min((i + 1) / n, 1)
                self.line((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0),
                          (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1), width, fill)
            return
        self.d.line([self.p(*a), self.p(*b)], fill=fill, width=max(1, int(width * PX)))

    def sector(self, c, r, a0, a1, fill=SHADE):
        """以 c 為圓心、從 a0 到 a1（逆時針、度）塗扇形"""
        x, y = self.p(*c); R = r * PX
        self.d.pieslice([x - R, y - R, x + R, y + R], -a1, -a0, fill=fill)

    def arc(self, c, r, a0, a1, width=0.03, fill=INK):
        x, y = self.p(*c); R = r * PX
        self.d.arc([x - R, y - R, x + R, y + R], -a1, -a0, fill=fill, width=max(1, int(width * PX)))

    def text(self, xy, s, pt=12, fill=INK, anchor="mm"):
        self.d.text(self.p(*xy), s, font=font(pt), fill=fill, anchor=anchor)

    def dot(self, c, r=0.06, fill=INK):
        x, y = self.p(*c); R = r * PX
        self.d.ellipse([x - R, y - R, x + R, y + R], fill=fill)

    def right_mark(self, c, a0, s=0.3):
        """在 c 畫直角記號，兩邊方向 a0、a0+90"""
        u = (math.cos(math.radians(a0)), math.sin(math.radians(a0)))
        v = (-u[1], u[0])
        p1 = (c[0] + u[0] * s, c[1] + u[1] * s)
        p2 = (p1[0] + v[0] * s, p1[1] + v[1] * s)
        p3 = (c[0] + v[0] * s, c[1] + v[1] * s)
        self.line(p1, p2, 0.025); self.line(p2, p3, 0.025)

    def save(self, name=None):
        bg = Image.new("RGB", self.im.size, "white")
        from PIL import ImageChops
        box = ImageChops.difference(self.im, bg).getbbox()
        pad = int(0.15 * PX)
        if box:
            box = (max(0, box[0] - pad), max(0, box[1] - pad),
                   min(self.im.width, box[2] + pad), min(self.im.height, box[3] + pad))
            im = self.im.crop(box)
        else:
            im = self.im
        _n[0] += 1
        path = os.path.join(OUT, (name or f"f{_n[0]:03d}") + ".png")
        im.save(path, dpi=(DPI, DPI))
        return path, im.width / PX


def pol(c, r, a):
    return (c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a)))


def angle(deg, rot=0, arm=3.6, arc=0.7, label=None, letter=None, name=None, arms=(None, None)):
    """真實尺寸的角：第一邊方向 rot，逆時針轉 deg 度。arms 可分別給兩邊長度"""
    a1, a2 = arms[0] or arm, arms[1] or arm
    cv = Canvas(12, 12, 6, 6)
    O = (0, 0)
    if arc: cv.sector(O, arc, rot, rot + deg)
    cv.line(O, pol(O, a1, rot), 0.04)
    cv.line(O, pol(O, a2, rot + deg), 0.04)
    if letter: cv.text(pol(O, arc * 0.55, rot + deg / 2), letter, 13)
    if label: cv.text(pol(O, arc + 0.45, rot + deg / 2), label, 12)
    return cv.save(name)


def protractor(ray, base="right", R=3.0, name=None):
    """量角器圖：外圈 0 在左、內圈 0 在右。ray＝射線的方向（0＝右邊、逆時針）。
    base='right' 角從右邊那條線量起（讀內圈）；'left' 從左邊量起（讀外圈）"""
    cv = Canvas(9, 5.5, 4.5, 0.8)
    O = (0, 0)
    # 角的扇形
    if base == "right": cv.sector(O, 0.9, 0, ray, (200, 200, 200))
    else: cv.sector(O, 0.9, ray, 180, (200, 200, 200))
    cv.arc(O, R, 0, 180, 0.03)
    cv.arc(O, R - 0.9, 0, 180, 0.015, (120, 120, 120))
    cv.line((-R, 0), (R, 0), 0.03)
    for t in range(0, 181):
        if t % 10 == 0: L = 0.32
        elif t % 5 == 0: L = 0.2
        else: L = 0.1
        cv.line(pol(O, R, t), pol(O, R - L, t), 0.012)
        if t % 10 == 0:
            cv.line(pol(O, R - 0.9, t), pol(O, R - 0.75, t), 0.012, (120, 120, 120))
            cv.text(pol(O, R - 0.48, t), str(180 - t), 6.5)                    # 外圈
            cv.text(pol(O, R - 1.15, t), str(t), 5.5, fill=(90, 90, 90))     # 內圈
    cv.line((-R - 0.6, 0), (R + 0.6, 0), 0.04)   # 角的底邊
    cv.line(O, pol(O, R + 0.6, ray), 0.04)        # 角的另一邊
    cv.dot(O, 0.06)
    return cv.save(name)


def clock(start, end, cw=True, R=1.6, name=None):
    """時鐘：從 start 轉到 end，cw＝順時針；畫指針和旋轉箭頭"""
    cv = Canvas(5, 5, 2.5, 2.5)
    O = (0, 0)
    cv.arc(O, R, 0, 360, 0.04)
    for k in range(60):
        L = 0.18 if k % 5 == 0 else 0.07
        cv.line(pol(O, R, 90 - 6 * k), pol(O, R - L, 90 - 6 * k), 0.02)
    for h in range(1, 13):
        cv.text(pol(O, R - 0.42, 90 - 30 * h), str(h), 10)
    a_s, a_e = 90 - 30 * start, 90 - 30 * end
    cv.line(O, pol(O, R - 0.65, a_s), 0.05, (130, 130, 130))
    cv.line(O, pol(O, R - 0.65, a_e), 0.05)
    # 旋轉箭頭
    r = 0.55
    if cw:
        a0, a1 = a_e, a_s
        while a0 > a1: a0 -= 360
        cv.arc(O, r, a0, a1, 0.03, BLUE)
        tip, back = a_e, a_e + 12
    else:
        a0, a1 = a_s, a_e
        while a1 < a0: a1 += 360
        cv.arc(O, r, a0, a1, 0.03, BLUE)
        tip, back = a_e, a_e - 12
    t = pol(O, r, tip)
    for off in (0.12, -0.12):
        b = pol(O, r + off, back)
        cv.line(t, b, 0.03, BLUE)
    cv.dot(O, 0.08)
    return cv.save(name)


def rays(spec, name=None, R=3.0):
    """角度計算的圖。spec：
       rays: [方向...]（實線）  dashed: [方向...]  right: [a0...]（直角記號，邊 a0 和 a0+90）
       sectors: [(a0, a1, 文字, 塗色 True/False, 半徑)]"""
    cv = Canvas(10, 10, 5, 5)
    O = (0, 0)
    for a0, a1, txt, sh, r in spec.get("sectors", []):
        if sh: cv.sector(O, r, a0, a1, (150, 150, 150) if sh == "dark" else SHADE)
        else: cv.arc(O, r, a0, a1, 0.025)
    for a in spec.get("rays", []):
        cv.line(O, pol(O, spec.get("len", {}).get(a, R), a), 0.04)
    for a in spec.get("dashed", []):
        cv.line(O, pol(O, 1.4, a), 0.025, dash=0.12)
    for a0 in spec.get("right", []):
        cv.right_mark(O, a0, 0.4)
    for a0, a1, txt, sh, r in spec.get("sectors", []):
        if txt: cv.text(pol(O, r + 0.42, (a0 + a1) / 2), txt, 12)
    for xy, txt in spec.get("texts", []):
        cv.text(xy, txt, 12)
    return cv.save(name)


def tri(pts, labels=(), marks=(), right=None, fill=(232, 232, 232), name=None, inner=None, pt=13, angles=()):
    """三角形：pts 三個頂點（公分）；labels [(點索引, 字, 偏移)]；marks [(邊 i-j, 記號數)]；
       right＝直角所在頂點索引；inner＝中間的字；angles [(頂點索引, 文字)] 寫在角裡"""
    cv = Canvas(16, 14, 4, 4)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    poly = [cv.p(*p) for p in pts]
    cv.d.polygon(poly, fill=fill)
    for i in range(3):
        cv.line(pts[i], pts[(i + 1) % 3], 0.035)
    for (i, j), k in marks:
        a, b = pts[i], pts[j]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        L = math.dist(a, b); u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L); v = (-u[1], u[0])
        for t in range(k):
            off = (t - (k - 1) / 2) * 0.12
            c = (m[0] + u[0] * off, m[1] + u[1] * off)
            cv.line((c[0] - v[0] * 0.15, c[1] - v[1] * 0.15), (c[0] + v[0] * 0.15, c[1] + v[1] * 0.15), 0.025)
    if right is not None:
        c = pts[right]; a = pts[(right + 1) % 3]
        a0 = math.degrees(math.atan2(a[1] - c[1], a[0] - c[0]))
        b = pts[(right + 2) % 3]
        a1 = math.degrees(math.atan2(b[1] - c[1], b[0] - c[0]))
        if (a1 - a0) % 360 > 180: a0 = a1
        cv.right_mark(c, a0, 0.3)
    cx, cy = sum(xs) / 3, sum(ys) / 3
    for i, s, off in labels:
        p = pts[i]
        d = math.dist(p, (cx, cy)) or 1
        q = (p[0] + (p[0] - cx) / d * off, p[1] + (p[1] - cy) / d * off)
        cv.text(q, s, pt)
    for i, s in angles:
        p = pts[i]
        d = math.dist(p, (cx, cy)) or 1
        q = (p[0] + (cx - p[0]) / d * 0.75, p[1] + (cy - p[1]) / d * 0.75)
        cv.text(q, s, 10)
    if inner: cv.text((cx, cy), inner, pt)
    return cv.save(name)


def baseline(L=5.0, name=None):
    """畫角用：一條線＋左端點"""
    cv = Canvas(8, 2, 1, 1)
    cv.line((0, 0), (L, 0), 0.04)
    cv.dot((0, 0), 0.08)
    cv.text((0, -0.4), "頂點", 10)
    return cv.save(name)
