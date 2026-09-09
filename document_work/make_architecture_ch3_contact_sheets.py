from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


pages_dir = Path(r"D:\PFE M2\Platforme SaaS\document_work\rendered_architecture_ch3\pages")
output_dir = Path(r"D:\PFE M2\Platforme SaaS\document_work\rendered_architecture_ch3\contact_sheets")
output_dir.mkdir(parents=True, exist_ok=True)

page_paths = sorted(pages_dir.glob("page-*.png"))
cols, rows = 3, 3
thumb_w = 420
gap = 24
label_h = 28
font = ImageFont.load_default()

with Image.open(page_paths[0]) as sample:
    ratio = sample.height / sample.width
thumb_h = round(thumb_w * ratio)

for sheet_index in range(0, len(page_paths), cols * rows):
    subset = page_paths[sheet_index : sheet_index + cols * rows]
    canvas_w = cols * thumb_w + (cols + 1) * gap
    canvas_h = rows * (thumb_h + label_h) + (rows + 1) * gap
    canvas = Image.new("RGB", (canvas_w, canvas_h), "#D8DEE8")
    draw = ImageDraw.Draw(canvas)
    for slot, page_path in enumerate(subset):
        row, col = divmod(slot, cols)
        x = gap + col * (thumb_w + gap)
        y = gap + row * (thumb_h + label_h + gap)
        with Image.open(page_path) as page:
            thumb = page.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(thumb, (x, y))
        draw.text((x, y + thumb_h + 7), page_path.stem, fill="#111827", font=font)
    first = sheet_index + 1
    last = sheet_index + len(subset)
    canvas.save(output_dir / f"pages-{first:02d}-{last:02d}.png", quality=95)

print(len(list(output_dir.glob("*.png"))))
