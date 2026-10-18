import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

WIDTH = 1024
HEIGHT = 500

# ---------------------------------------------------------
# FONT PATHS
# ---------------------------------------------------------
FONT_BOLD = 'node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'
FONT_SEMIBOLD = 'node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'
FONT_MEDIUM = 'node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'
FONT_REGULAR = 'node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'
FONT_SERIF = 'node_modules/@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'

font_badge = ImageFont.truetype(FONT_BOLD, 12)
font_title = ImageFont.truetype(FONT_SERIF, 34)
font_subtitle = ImageFont.truetype(FONT_SEMIBOLD, 16)
font_pill = ImageFont.truetype(FONT_MEDIUM, 13)
font_card_title = ImageFont.truetype(FONT_BOLD, 18)
font_card_sub = ImageFont.truetype(FONT_MEDIUM, 12)

# ---------------------------------------------------------
# 1. BASE CANVAS & GRADIENT
# ---------------------------------------------------------
canvas = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 255))
draw_canvas = ImageDraw.Draw(canvas)

# Rich deep gradient (#060913 -> #0f172a -> #0a0e1c)
for y in range(HEIGHT):
    t = y / float(HEIGHT)
    if t < 0.5:
        factor = t * 2
        r = int(6 * (1 - factor) + 15 * factor)
        g = int(9 * (1 - factor) + 23 * factor)
        b = int(19 * (1 - factor) + 42 * factor)
    else:
        factor = (t - 0.5) * 2
        r = int(15 * (1 - factor) + 10 * factor)
        g = int(23 * (1 - factor) + 14 * factor)
        b = int(42 * (1 - factor) + 28 * factor)
    draw_canvas.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

# ---------------------------------------------------------
# 2. AMBIENT GLOWS & LIGHTING
# ---------------------------------------------------------
# Left Warm Gold Glow
glow1 = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
d_g1 = ImageDraw.Draw(glow1)
cx1, cy1 = 260, 210
max_r1 = 400
for r in range(max_r1, 0, -3):
    alpha = int(40 * (1 - (r / max_r1) ** 1.4))
    d_g1.ellipse([cx1 - r, cy1 - r, cx1 + r, cy1 + r], fill=(217, 146, 42, alpha))
glow1 = glow1.filter(ImageFilter.GaussianBlur(45))

# Right Royal Sapphire Glow
glow2 = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
d_g2 = ImageDraw.Draw(glow2)
cx2, cy2 = 800, 250
max_r2 = 450
for r in range(max_r2, 0, -3):
    alpha = int(70 * (1 - (r / max_r2) ** 1.4))
    d_g2.ellipse([cx2 - r, cy2 - r, cx2 + r, cy2 + r], fill=(26, 86, 219, alpha))
glow2 = glow2.filter(ImageFilter.GaussianBlur(50))

# Center Soft Purple Ambient Glow
glow3 = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
d_g3 = ImageDraw.Draw(glow3)
cx3, cy3 = 520, 120
max_r3 = 320
for r in range(max_r3, 0, -4):
    alpha = int(35 * (1 - (r / max_r3) ** 1.6))
    d_g3.ellipse([cx3 - r, cy3 - r, cx3 + r, cy3 + r], fill=(124, 58, 237, alpha))
glow3 = glow3.filter(ImageFilter.GaussianBlur(40))

canvas = Image.alpha_composite(canvas, glow1)
canvas = Image.alpha_composite(canvas, glow2)
canvas = Image.alpha_composite(canvas, glow3)

# ---------------------------------------------------------
# 3. BACKGROUND PATTERN & LIGHT BEAMS
# ---------------------------------------------------------
decor = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
d_d = ImageDraw.Draw(decor)

# Diagonal light rays
for i in range(-400, WIDTH + 400, 140):
    d_d.line([(i, 0), (i + 450, HEIGHT)], fill=(255, 255, 255, 5), width=2)

# Concentric halo rings on right side
for r_ring in [160, 240, 320, 400]:
    d_d.ellipse([800 - r_ring, 250 - r_ring, 800 + r_ring, 250 + r_ring], outline=(255, 255, 255, 10), width=1)

# Floating sparkles (stars)
sparkle_coords = [(120, 60), (480, 50), (600, 430), (960, 80), (70, 420), (520, 440)]
for sx, sy in sparkle_coords:
    d_d.line([(sx - 4, sy), (sx + 4, sy)], fill=(255, 240, 200, 160), width=1)
    d_d.line([(sx, sy - 4), (sx, sy + 4)], fill=(255, 240, 200, 160), width=1)
    d_d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 255, 255, 200))

canvas = Image.alpha_composite(canvas, decor)

# ---------------------------------------------------------
# 4. LEFT SECTION - BRANDING & TYPOGRAPHY
# ---------------------------------------------------------
left_x = 55

# A) Top Pill Badge: "THE WEALTH REALITY CHURCH"
badge_text = "THE WEALTH REALITY CHURCH"
bbox_b = font_badge.getbbox(badge_text)
bw = bbox_b[2] - bbox_b[0] + 24
bh = bbox_b[3] - bbox_b[1] + 12
by = 50

badge_img = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
d_b = ImageDraw.Draw(badge_img)
d_b.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=bh//2, fill=(201, 146, 42, 45), outline=(217, 168, 60, 140), width=1)
d_b.text((12, (bh - (bbox_b[3] - bbox_b[1])) // 2 - 1), badge_text, font=font_badge, fill=(245, 220, 164, 255))

canvas.paste(badge_img, (left_x, by), badge_img)

# B) App Logo ("Gather")
logo = Image.open('assets/logo.png')
crop_logo = logo.crop(logo.getbbox())

# Scale logo to height = 100 px while maintaining aspect ratio
target_h = 100
target_w = int(crop_logo.width * (target_h / float(crop_logo.height)))
resized_logo = crop_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)

# Create soft drop shadow for logo
shadow_logo = Image.new('RGBA', (target_w + 30, target_h + 30), (0, 0, 0, 0))
d_ls = ImageDraw.Draw(shadow_logo)
d_ls.bitmap((15, 15), resized_logo.split()[3], fill=(0, 0, 0, 160))
shadow_logo = shadow_logo.filter(ImageFilter.GaussianBlur(12))

logo_y = 110
canvas.paste(shadow_logo, (left_x - 15, logo_y - 15), shadow_logo)
canvas.paste(resized_logo, (left_x, logo_y), resized_logo)

# C) Tagline: "Connect, Worship & Belong"
tagline_y = 230
# Add drop shadow to tagline
d_shadow = ImageDraw.Draw(canvas)
d_shadow.text((left_x + 2, tagline_y + 2), "Connect, Worship & Belong", font=font_title, fill=(0, 0, 0, 180))
d_shadow.text((left_x, tagline_y), "Connect, Worship & Belong", font=font_title, fill=(255, 255, 255, 255))

# D) Subtitle: "Sermons • Daily Devotionals • Bible • Prayers • Live Streams"
sub_y = 285
d_shadow.text((left_x + 1, sub_y + 1), "Sermons • Daily Devotionals • Bible • Prayers • Live Streams", font=font_subtitle, fill=(0, 0, 0, 140))
d_shadow.text((left_x, sub_y), "Sermons • Daily Devotionals • Bible • Prayers • Live Streams", font=font_subtitle, fill=(203, 213, 225, 255))

# E) Feature Pills at Bottom Left
pills = [
    ("⛪  Sermons", (26, 86, 219)),
    ("📖  Holy Bible", (5, 150, 105)),
    ("🙏  Prayer Wall", (124, 58, 237)),
    ("📺  Live Streams", (217, 146, 42)),
]

pill_x = left_x
pill_y = 345

for p_text, p_color in pills:
    bbox_p = font_pill.getbbox(p_text)
    pw = bbox_p[2] - bbox_p[0] + 24
    ph = bbox_p[3] - bbox_p[1] + 16

    p_img = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    d_p = ImageDraw.Draw(p_img)

    # Glass container background
    d_p.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=ph//2, fill=(255, 255, 255, 22), outline=(255, 255, 255, 50), width=1)

    # Colored accent indicator dot on left inside pill
    d_p.text((12, (ph - (bbox_p[3] - bbox_p[1])) // 2 - 1), p_text, font=font_pill, fill=(255, 255, 255, 245))

    canvas.paste(p_img, (pill_x, pill_y), p_img)
    pill_x += pw + 12

# ---------------------------------------------------------
# 5. RIGHT SECTION - HERO SHOWCASE CARD (APP TILE ARTWORK)
# ---------------------------------------------------------
card_w = 280
card_h = 370
card_x = 680
card_y = 65

# A) Card Shadow
card_shadow = Image.new('RGBA', (card_w + 60, card_h + 60), (0, 0, 0, 0))
d_cs = ImageDraw.Draw(card_shadow)
d_cs.rounded_rectangle([30, 30, 30 + card_w, 30 + card_h], radius=28, fill=(0, 0, 0, 180))
card_shadow = card_shadow.filter(ImageFilter.GaussianBlur(25))
canvas.paste(card_shadow, (card_x - 30, card_y - 15), card_shadow)

# B) Glass Card Panel
card_img = Image.new('RGBA', (card_w, card_h), (0, 0, 0, 0))
d_card = ImageDraw.Draw(card_img)

# Frosted Glass Background
d_card.rounded_rectangle([0, 0, card_w - 1, card_h - 1], radius=24, fill=(255, 255, 255, 18), outline=(255, 255, 255, 75), width=1)
# Inner subtle border glow
d_card.rounded_rectangle([2, 2, card_w - 3, card_h - 3], radius=22, outline=(255, 255, 255, 30), width=1)

# C) App Icon inside Card
icon_src = Image.open('assets/icon.png')

# Create smooth rounded mask for app icon
icon_size = 180
icon_resized = icon_src.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

mask = Image.new('L', (icon_size, icon_size), 0)
d_m = ImageDraw.Draw(mask)
d_m.rounded_rectangle([0, 0, icon_size - 1, icon_size - 1], radius=38, fill=255)

# Icon Drop Shadow
icon_shadow = Image.new('RGBA', (icon_size + 40, icon_size + 40), (0, 0, 0, 0))
d_is = ImageDraw.Draw(icon_shadow)
d_is.rounded_rectangle([20, 20, 20 + icon_size, 20 + icon_size], radius=38, fill=(0, 0, 0, 150))
icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(15))

icon_pos_x = (card_w - icon_size) // 2
icon_pos_y = 45

card_img.paste(icon_shadow, (icon_pos_x - 20, icon_pos_y - 10), icon_shadow)
card_img.paste(icon_resized, (icon_pos_x, icon_pos_y), mask)

# D) Card Labels below Icon
# App Title "Gather App"
bbox_ct = font_card_title.getbbox("Gather App")
ct_w = bbox_ct[2] - bbox_ct[0]
d_card.text(((card_w - ct_w) // 2, 250), "Gather App", font=font_card_title, fill=(255, 255, 255, 255))

# Secondary "Official Church App"
bbox_cs = font_card_sub.getbbox("Official Mobile App")
cs_w = bbox_cs[2] - bbox_cs[0]
d_card.text(((card_w - cs_w) // 2, 280), "Official Mobile App", font=font_card_sub, fill=(217, 168, 60, 240))

# Gold Divider line inside card
d_card.line([(card_w // 2 - 40, 310), (card_w // 2 + 40, 310)], fill=(217, 168, 60, 120), width=1)

# Badge inside card: "WARRI, NIGERIA"
bbox_loc = font_badge.getbbox("WARRI, NIGERIA")
loc_w = bbox_loc[2] - bbox_loc[0]
d_card.text(((card_w - loc_w) // 2, 325), "WARRI, NIGERIA", font=font_badge, fill=(148, 163, 184, 220))

canvas.paste(card_img, (card_x, card_y), card_img)

# ---------------------------------------------------------
# 6. SAVE OUTPUT
# ---------------------------------------------------------
output_path = 'assets/feature-graphic.png'
canvas.save(output_path, 'PNG', optimize=True)

print(f"Feature graphic generated successfully at: {output_path}")
print(f"Dimensions: {canvas.size[0]}x{canvas.size[1]} px")
print(f"File size: {os.path.getsize(output_path) / 1024:.2f} KB")

# Also save copies to alternative standard locations
alt_paths = [
    'assets/feature_graphic.png',
    'assets/play-store-feature-graphic.png',
]

for alt in alt_paths:
    canvas.save(alt, 'PNG', optimize=True)
    print(f"Saved copy to: {alt}")
