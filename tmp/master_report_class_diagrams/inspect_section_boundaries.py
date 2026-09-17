import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn

doc = Document(Path(sys.argv[1]))
body = doc._element.body
para_index = -1
for child in body:
    if child.tag == qn("w:p"):
        para_index += 1
        sect = child.find("./w:pPr/w:sectPr", child.nsmap)
        if sect is not None:
            text = "".join(child.itertext()).strip().replace("\n", " ")
            pgn = sect.find("w:pgNumType", sect.nsmap)
            title = sect.find("w:titlePg", sect.nsmap)
            print("boundary", para_index, repr(text[:80]), "pgNum", dict(pgn.attrib) if pgn is not None else None, "titlePg", title is not None)
    elif child.tag == qn("w:sectPr"):
        pgn = child.find("w:pgNumType", child.nsmap)
        title = child.find("w:titlePg", child.nsmap)
        print("body-sectPr", "pgNum", dict(pgn.attrib) if pgn is not None else None, "titlePg", title is not None)

print("sections", len(doc.sections))
for i, sec in enumerate(doc.sections):
    print(i, "start", sec.start_type, "diff_first", sec.different_first_page_header_footer,
          "odd_even", doc.settings.odd_and_even_pages_header_footer,
          "header_link", sec.header.is_linked_to_previous,
          "footer_link", sec.footer.is_linked_to_previous,
          "first_header_link", sec.first_page_header.is_linked_to_previous,
          "first_footer_link", sec.first_page_footer.is_linked_to_previous,
          "even_header_link", sec.even_page_header.is_linked_to_previous,
          "even_footer_link", sec.even_page_footer.is_linked_to_previous)
