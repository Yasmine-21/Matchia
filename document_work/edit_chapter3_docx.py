from copy import deepcopy
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from lxml import etree


SOURCE = Path(r"D:\PFE - BRI Technology\Rapport\Master Report.docx")
OUTPUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\Master_Report_Introduction_Conclusion_Chapitre_3.docx")

INTRODUCTION = (
    "Ce chapitre présente les fondements architecturaux et techniques de la plateforme Matchia. "
    "Il introduit d’abord le modèle SaaS et le principe de la multi-tenancy, puis examine les "
    "principales stratégies d’isolation des données afin de justifier le choix retenu pour le projet. "
    "Il décrit ensuite l’architecture globale de la solution à travers ses vues logique et physique, "
    "avant de présenter l’environnement de développement ainsi que les technologies mobilisées pour "
    "sa réalisation."
)

CONCLUSION = (
    "En conclusion, ce chapitre a permis de présenter les fondements architecturaux et techniques de "
    "Matchia. Il a introduit le modèle SaaS et le principe de la multi-tenancy, comparé les principales "
    "stratégies d’isolation des données et justifié le choix d’une base et d’un schéma partagés avec une "
    "isolation logique par tenant. Il a également décrit l’architecture monolithique en couches de la "
    "plateforme, à travers ses vues logique et physique, ainsi que l’environnement de développement et "
    "les technologies retenues pour sa réalisation. Ces choix constituent un socle cohérent, maintenable "
    "et évolutif pour la mise en œuvre des fonctionnalités présentées dans les chapitres suivants."
)

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{%s}" % NS["w"]
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def paragraph_text(paragraph):
    return "".join(paragraph.xpath(".//w:t/text()", namespaces=NS)).strip()


def set_text(paragraph, text, preserve_run_formatting=False):
    p_pr = paragraph.find(W + "pPr")
    first_r_pr = paragraph.find(".//" + W + "rPr") if preserve_run_formatting else None
    for child in list(paragraph):
        if child is not p_pr:
            paragraph.remove(child)

    run = etree.SubElement(paragraph, W + "r")
    if first_r_pr is not None:
        run.append(deepcopy(first_r_pr))
    text_node = etree.SubElement(run, W + "t")
    text_node.set(XML_SPACE, "preserve")
    text_node.text = text


def clone_with_text(sample, text, preserve_run_formatting=False):
    clone = deepcopy(sample)
    set_text(clone, text, preserve_run_formatting=preserve_run_formatting)
    return clone


with ZipFile(SOURCE, "r") as source_zip:
    entries = [(info, source_zip.read(info.filename)) for info in source_zip.infolist()]

document_bytes = dict((info.filename, data) for info, data in entries)["word/document.xml"]
root = etree.fromstring(document_bytes)
body = root.find("w:body", NS)
children = list(body)

paragraphs = [child for child in children if child.tag == W + "p"]

chapter3_heading = next(p for p in paragraphs if paragraph_text(p).startswith("Chapitre 3"))
chapter3_pos = children.index(chapter3_heading)

intro_heading = next(
    child
    for child in children[chapter3_pos + 1 :]
    if child.tag == W + "p" and paragraph_text(child) == "1. Introduction"
)
intro_heading_pos = children.index(intro_heading)
intro_placeholder = next(
    child
    for child in children[intro_heading_pos + 1 :]
    if child.tag == W + "p"
)
if paragraph_text(intro_placeholder):
    raise RuntimeError("Le paragraphe réservé à l’introduction du chapitre 3 n’est pas vide.")

chapter4_heading = next(p for p in paragraphs if paragraph_text(p).startswith("Chapitre 4"))
chapter4_pos = children.index(chapter4_heading)

sample_intro = next(
    p
    for p in paragraphs
    if paragraph_text(p).startswith("Ce chapitre est consacré à la réalisation de la plateforme Matchia")
)
sample_conclusion_heading = intro_heading
sample_conclusion_body = next(
    p
    for p in paragraphs
    if paragraph_text(p).startswith("En conclusion, ce chapitre a permis de présenter la mise en œuvre")
)

body.replace(intro_placeholder, clone_with_text(sample_intro, INTRODUCTION))

# Le tableau des technologies est suivi d’un saut de section qui rétablit la page en portrait.
# Les deux premiers paragraphes vides placés après ce saut constituent l’emplacement naturel
# de la conclusion, avant le début du chapitre 4.
children = list(body)
chapter4_pos = children.index(chapter4_heading)
section_break_positions = [
    i
    for i, child in enumerate(children[chapter3_pos:chapter4_pos], start=chapter3_pos)
    if child.tag == W + "p" and child.find(".//" + W + "sectPr") is not None
]
if len(section_break_positions) < 2:
    raise RuntimeError("Les sauts de section attendus à la fin du chapitre 3 sont introuvables.")
section_break_pos = section_break_positions[-2]

placeholders = []
for child in children[section_break_pos + 1 : chapter4_pos]:
    if child.tag != W + "p":
        continue
    if paragraph_text(child):
        continue
    if child.find(".//" + W + "drawing") is not None or child.find(".//" + W + "pict") is not None:
        continue
    placeholders.append(child)
    if len(placeholders) == 2:
        break

if len(placeholders) != 2:
    raise RuntimeError("Impossible de localiser les paragraphes réservés à la conclusion du chapitre 3.")

body.replace(
    placeholders[0],
    clone_with_text(sample_conclusion_heading, "5. Conclusion", preserve_run_formatting=True),
)
body.replace(placeholders[1], clone_with_text(sample_conclusion_body, CONCLUSION))

new_document_xml = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone="yes")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED) as output_zip:
    for info, data in entries:
        new_info = ZipInfo(info.filename, date_time=info.date_time)
        new_info.compress_type = info.compress_type
        new_info.comment = info.comment
        new_info.extra = info.extra
        new_info.internal_attr = info.internal_attr
        new_info.external_attr = info.external_attr
        new_info.create_system = info.create_system
        new_info.flag_bits = info.flag_bits
        if info.filename == "word/document.xml":
            data = new_document_xml
        output_zip.writestr(new_info, data)

print(OUTPUT)
