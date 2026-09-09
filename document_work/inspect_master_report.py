from docx import Document

source = r"D:\PFE - BRI Technology\Rapport\Master Report.docx"
doc = Document(source)
for index in range(300, 375):
    paragraph = doc.paragraphs[index]
    print(f"[{index}] ({paragraph.style.name}) {paragraph.text}")
