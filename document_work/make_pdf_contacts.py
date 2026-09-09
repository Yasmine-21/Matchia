from pathlib import Path
from PIL import Image

root = Path(r"D:\PFE M2\Platforme SaaS\tmp\pdfs\render_matchia")
out = Path(r"D:\PFE M2\Platforme SaaS\tmp\pdfs\contact_matchia")
out.mkdir(parents=True, exist_ok=True)
pages = sorted(root.glob("*.png"))
for start in range(0, len(pages), 8):
    canvas = Image.new("RGB", (540, 1400), "white")
    for offset, page in enumerate(pages[start:start + 8]):
        with Image.open(page) as source:
            thumb = source.resize((243, 315))
            x = (offset % 2) * 260 + 20
            y = (offset // 2) * 340 + 20
            canvas.paste(thumb, (x, y))
    canvas.save(out / f"contact_{start // 8 + 1}.png")
