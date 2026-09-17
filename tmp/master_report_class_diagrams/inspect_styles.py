import json
import sys
import zipfile
import hashlib
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn

source = Path(sys.argv[1])
output = Path(sys.argv[2])
inventory_output = Path(sys.argv[3])
doc = Document(source)

def length_points(value):
    return None if value is None else round(value.pt, 3)

style_names = ["Normal", "Normal (Web)", "Heading 1", "Heading 2", "Caption", "isselectedend", "gjcqjg1a"]
styles = {}
for name in style_names:
    if name not in doc.styles:
        continue
    style = doc.styles[name]
    font = style.font
    pf = style.paragraph_format
    styles[name] = {
        "type": str(style.type),
        "font_name": font.name,
        "font_size_pt": length_points(font.size),
        "bold": font.bold,
        "italic": font.italic,
        "color": None if font.color is None or font.color.rgb is None else str(font.color.rgb),
        "alignment": None if pf.alignment is None else str(pf.alignment),
        "space_before_pt": length_points(pf.space_before),
        "space_after_pt": length_points(pf.space_after),
        "line_spacing": str(pf.line_spacing),
        "keep_with_next": pf.keep_with_next,
        "page_break_before": pf.page_break_before,
    }

paragraph_samples = {}
for index in [338, 340, 374, 375, 379, 384, 387, 394]:
    p = doc.paragraphs[index]
    paragraph_samples[str(index)] = {
        "text": p.text,
        "style": p.style.name,
        "alignment": None if p.alignment is None else str(p.alignment),
        "space_before_pt": length_points(p.paragraph_format.space_before),
        "space_after_pt": length_points(p.paragraph_format.space_after),
        "keep_with_next": p.paragraph_format.keep_with_next,
        "page_break_before": p.paragraph_format.page_break_before,
        "runs": [
            {
                "text": r.text,
                "bold": r.bold,
                "italic": r.italic,
                "font": r.font.name,
                "size_pt": length_points(r.font.size),
            }
            for r in p.runs
        ],
    }

output.write_text(json.dumps({"styles": styles, "paragraph_samples": paragraph_samples}, ensure_ascii=False, indent=2), encoding="utf-8")

inventory = []
with zipfile.ZipFile(source) as archive:
    for info in archive.infolist():
        data = archive.read(info.filename)
        inventory.append({
            "path": info.filename,
            "size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })
inventory_output.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
