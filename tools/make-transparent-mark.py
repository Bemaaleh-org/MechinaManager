"""
מייצר גרסה שקופה של סמל העמותה, לשימוש במסך הכניסה.

⚠ למה לא "כל לבן → שקוף" ולא "לבן שמחובר לשוליים → שקוף":
   בתוך הסמל יש לבן משמעותי — הדגל, ההרים המושלגים והשביל.
   סף פשוט מנקב את הדגל; מילוי הצפה מהשוליים בולע את ההרים
   ואת השביל, כי הם נוגעים בקצה העיגול ומחוברים ללבן שבחוץ.

   לכן זיהוי גיאומטרי: העיגול הכחול מגדיר את גבול הסמל.
     • פיקסל לא-לבן          → אטום תמיד (כולל השביל שיוצא מהעיגול)
     • פיקסל לבן בתוך העיגול → אטום (הרים, דגל)
     • פיקסל לבן מחוץ לעיגול → שקוף

תלוי רק ב-sips ובספרייה הסטנדרטית של Python.

הרצה:  python3 tools/make-transparent-mark.py
פלט:   public/logo-mark.png
"""

import os
import struct
import subprocess
import sys
import zlib

SRC = "tools/logo.jpeg"
OUT = "public/logo-mark.png"
TMP = "/tmp/mk-mark"

# גבולות הסמל בתמונה המקורית (ללא הכיתוב "במעלה הדרך")
CROP_TOP, CROP_LEFT, CROP_H, CROP_W = 45, 179, 500, 470
# 256 מספיק: הסמל מוצג ב-140px, כלומר כפול לצפיפות פיקסלים
# גבוהה. 512 הכפיל את המשקל בלי הבדל נראה לעין.
SIZE = 256
WHITE_MIN = 238           # מעל זה נחשב לבן


def run(*args):
    subprocess.run(args, check=True, capture_output=True)


def read_bmp(path):
    d = open(path, "rb").read()
    offset = struct.unpack_from("<I", d, 10)[0]
    w, h = struct.unpack_from("<ii", d, 18)
    bpp = struct.unpack_from("<H", d, 28)[0]
    if bpp != 24:
        sys.exit(f"צפוי BMP של 24 ביט, התקבל {bpp}")

    bottom_up = h > 0
    h = abs(h)
    row_bytes = (w * 3 + 3) & ~3

    rows = []
    for y in range(h):
        start = offset + y * row_bytes
        rows.append([
            (d[start + x * 3 + 2], d[start + x * 3 + 1], d[start + x * 3])
            for x in range(w)
        ])
    if bottom_up:
        rows.reverse()
    return w, h, rows


def find_circle(w, h, rows):
    """מאתר את העיגול הכחול ומחזיר (cx, cy, r)."""
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = rows[y][x]
            if b > 60 and b > r + 25 and r < 110:   # הכחול הכהה של הלוגו
                xs.append(x)
                ys.append(y)
    if not xs:
        sys.exit("לא נמצא הכחול של הלוגו")

    # הרוחב של הכחול במקום הרחב ביותר הוא קוטר העיגול
    cx = (min(xs) + max(xs)) / 2
    radius = (max(xs) - min(xs)) / 2
    cy = min(ys) + radius     # ראש הכחול הוא ראש העיגול
    return cx, cy, radius


os.makedirs(TMP, exist_ok=True)
run("sips", "-c", str(CROP_H), str(CROP_W), "--cropOffset", str(CROP_TOP), str(CROP_LEFT),
    SRC, "--out", f"{TMP}/bbox.png")
run("sips", "-z", str(SIZE), str(SIZE), f"{TMP}/bbox.png", "--out", f"{TMP}/sized.png")
run("sips", "-s", "format", "bmp", f"{TMP}/sized.png", "--out", f"{TMP}/sized.bmp")

w, h, rows = read_bmp(f"{TMP}/sized.bmp")
cx, cy, radius = find_circle(w, h, rows)
inside = (radius + 2) ** 2

raw = bytearray()
clear = 0
for y in range(h):
    raw.append(0)  # filter: none
    for x in range(w):
        r, g, b = rows[y][x]
        white = r >= WHITE_MIN and g >= WHITE_MIN and b >= WHITE_MIN
        outside = (x - cx) ** 2 + (y - cy) ** 2 > inside
        transparent = white and outside
        if transparent:
            clear += 1
        raw += bytes((r, g, b, 0 if transparent else 255))


def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += chunk(b"IEND", b"")
open(OUT, "wb").write(png)

total = w * h
print(f"  {OUT}  {w}×{h}")
print(f"  עיגול: מרכז ({cx:.0f},{cy:.0f}) רדיוס {radius:.0f}")
print(f"  שקוף: {clear:,} ({100*clear/total:.0f}%)  |  אטום: {total-clear:,}")
