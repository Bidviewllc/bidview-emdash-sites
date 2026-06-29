from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public", "assets")
OUT = os.path.join(ASSETS, "og-image.jpg")

W, H = 1200, 630
GREEN = (23, 99, 47)       # --green #17632f
GREEN_LT = (111, 169, 67)  # --green-light
CREAM = (245, 246, 246)

img = Image.new("RGB", (W, H), GREEN)
draw = ImageDraw.Draw(img)

# subtle darker band at bottom for depth
for y in range(H):
    t = y / H
    r = int(GREEN[0] * (1 - t*0.25))
    g = int(GREEN[1] * (1 - t*0.25))
    b = int(GREEN[2] * (1 - t*0.25))
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Logo: prefer a white/transparent logo; new-leaf-hearing-care-logo.webp is colored on transparent.
logo_path = os.path.join(ASSETS, "new-leaf-hearing-care-logo.webp")
logo = Image.open(logo_path).convert("RGBA")
# scale logo to ~ 520px wide
lw = 520
lh = int(logo.height * (lw / logo.width))
logo = logo.resize((lw, lh), Image.LANCZOS)
# white rounded card behind logo for contrast (logo is colored)
pad = 48
card_w, card_h = lw + pad*2, lh + pad*2
card_x, card_y = (W - card_w)//2, 150
card = Image.new("RGBA", (card_w, card_h), (255, 255, 255, 255))
mask = Image.new("L", (card_w, card_h), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, card_w, card_h], radius=32, fill=255)
img.paste(card, (card_x, card_y), mask)
img.paste(logo, (card_x + pad, card_y + pad), logo)

# Tagline below
def load_font(size):
    for name in ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "arial.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

font = load_font(46)
tag = "Hearing Wellness for a Full, Active Life"
tb = draw.textbbox((0, 0), tag, font=font)
tw = tb[2] - tb[0]
ty = card_y + card_h + 46
draw.text(((W - tw)//2, ty), tag, font=font, fill=CREAM)

# location strip
loc_font = load_font(32)
loc = "Arvada  •  Littleton,  Colorado"
lb = draw.textbbox((0, 0), loc, font=loc_font)
lw2 = lb[2] - lb[0]
draw.text(((W - lw2)//2, ty + 70), loc, font=loc_font, fill=GREEN_LT)

img.save(OUT, "JPEG", quality=88)
print("Wrote", OUT, img.size, str(os.path.getsize(OUT)//1024) + "KB")
