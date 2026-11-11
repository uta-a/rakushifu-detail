"""Android用アイコンを生成する。実行: python3 scripts/gen-icons.py（Pillow が必要）。

Web版のカレンダー＋円マークに合わせる。adaptive の絵柄は中央の安全領域内に
収め、角丸や丸形の切り抜きはランチャーに任せる。
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "assets" / "images"
SIZE = 1024
SCALE = 4  # 縮小して輪郭をアンチエイリアスする
BACKGROUND = "#171717"
FOREGROUND = "#fafafa"
ACCENT = "#6ac59a"


def render(name, adaptive=False, monochrome=False, background=False):
    logical = 216 if adaptive else 180
    factor = SIZE * SCALE / logical
    offset = 18 if adaptive else 0
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE),
                      BACKGROUND if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def point(x, y):
        return ((x + offset) * factor, (y + offset) * factor)

    def box(x1, y1, x2, y2):
        return (*point(x1, y1), *point(x2, y2))

    def line(points, fill, width):
        draw.line([point(x, y) for x, y in points], fill=fill,
                  width=round(width * factor), joint="curve")
        for x, y in (points[0], points[-1]):
            r = width / 2
            draw.ellipse(box(x-r, y-r, x+r, y+r), fill=fill)

    draw.rounded_rectangle(box(36, 48, 136, 136), radius=12 * factor,
                           outline=FOREGROUND, width=round(5 * factor))
    line([(38.5, 68), (133.5, 68)], FOREGROUND, 5)
    line([(60, 38), (60, 48)], FOREGROUND, 5)
    line([(112, 38), (112, 48)], FOREGROUND, 5)
    # 小さなサイズでも円マークがカレンダーに埋もれないよう間を空ける。
    draw.ellipse(box(86, 84, 154, 152), fill=(0, 0, 0, 0) if monochrome else BACKGROUND)
    draw.ellipse(box(91, 89, 149, 147), fill=FOREGROUND if monochrome else ACCENT)
    ink = (0, 0, 0, 0) if monochrome else BACKGROUND
    line([(108, 103), (120, 117), (132, 103)], ink, 4)
    line([(120, 117), (120, 136)], ink, 4)
    line([(108, 119), (132, 119)], ink, 4)
    line([(108, 126), (132, 126)], ink, 4)
    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(OUT / name)


render("icon.png", background=True)
render("android-icon-foreground.png", adaptive=True)
render("android-icon-monochrome.png", adaptive=True, monochrome=True)
render("splash-icon.png")
