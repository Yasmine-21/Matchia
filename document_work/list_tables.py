from docx import Document

path = r"D:\PFE M2\Platforme SaaS\document_work\Developpements_Assortis_ICA_IBF_verifie.docx"
document = Document(path)
for number, table in enumerate(document.tables, start=1):
    rows = [" | ".join(cell.text.replace("\n", " / ") for cell in row.cells) for row in table.rows]
    print(f"TABLE {number}: {' || '.join(rows)}")
