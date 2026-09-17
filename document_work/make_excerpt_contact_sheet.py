from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report")
PAGES = sorted(ROOT.glob("excerpt_page-*.png"))
OUTPUT = ROOT / "excerpt_contact_sheet.png"

cols, rows = 3, 4
thumb_w, thumb_h = 480, 660
label_h, margin = 28, 16
canvas = Image.new(
    "RGB",
    (cols * thumb_w + (cols + 1) * margin, rows * (thumb_h + label_h) + (rows + 1) * margin),
    "#d8dde5",
)
draw = ImageDraw.Draw(canvas)
font = ImageFont.load_default(size=18)

for index, page in enumerate(PAGES):
    col, row = index % cols, index // cols
    x = margin + col * (thumb_w + margin)
    y = margin + row * (thumb_h + label_h + margin)
    with Image.open(page) as image:
        preview = image.convert("RGB")
        preview.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(preview, (x + (thumb_w - preview.width) // 2, y))
    draw.text((x + 6, y + thumb_h + 4), f"Page {index + 1}", fill="#172033", font=font)

canvas.save(OUTPUT, optimize=True)
print(OUTPUT)
