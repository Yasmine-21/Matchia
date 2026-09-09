from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"D:\PFE M2\Platforme SaaS\document_work\qa_report_full"
)
pages = sorted(ROOT.glob("page-*.png"))
font = ImageFont.load_default()

thumb_w, thumb_h = 255, 361
label_h = 22
cols, rows = 4, 3
margin = 14

for sheet_no, start in enumerate(range(0, len(pages), cols * rows), start=1):
    group = pages[start : start + cols * rows]
    canvas = Image.new(
        "RGB",
        (
            margin * (cols + 1) + thumb_w * cols,
            margin * (rows + 1) + (thumb_h + label_h) * rows,
        ),
        "#d9dde3",
    )
    draw = ImageDraw.Draw(canvas)
    for slot, page in enumerate(group):
        col = slot % cols
        row = slot // cols
        x = margin + col * (thumb_w + margin)
        y = margin + row * (thumb_h + label_h + margin)
        with Image.open(page) as im:
            preview = im.convert("RGB")
            preview.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            px = x + (thumb_w - preview.width) // 2
            py = y + (thumb_h - preview.height) // 2
            canvas.paste(preview, (px, py))
        label = page.stem.replace("page-", "Page ")
        draw.text((x + 4, y + thumb_h + 4), label, fill="black", font=font)
    canvas.save(ROOT / f"contact-{sheet_no:02d}.png", optimize=True)

print(f"pages={len(pages)} sheets={sheet_no}")
