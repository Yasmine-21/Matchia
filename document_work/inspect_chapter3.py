from docx import Document
import json


path = r"D:\PFE - BRI Technology\Rapport\Master Report.docx"
doc = Document(path)
records = []

for index in range(300, 390):
    paragraph = doc.paragraphs[index]
    xml = paragraph._p.xml
    records.append(
        {
            "i": index,
            "style": paragraph.style.name if paragraph.style else None,
            "text": paragraph.text,
            "page_break_before": paragraph.paragraph_format.page_break_before,
            "keep_with_next": paragraph.paragraph_format.keep_with_next,
            "has_page_br": 'w:type="page"' in xml,
            "has_sectPr": "<w:sectPr" in xml,
        }
    )

print(json.dumps(records, ensure_ascii=True, indent=2))
