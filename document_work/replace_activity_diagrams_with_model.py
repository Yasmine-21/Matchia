from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree
from PIL import Image


ROOT = Path(r"D:\PFE M2\Platforme SaaS\document_work")
SOURCE = ROOT / "Master Report - diagrammes UML complets.docx"
OUTPUT = ROOT / "Master Report - diagrammes activités modèle harmonisé.docx"
DIAGRAMS = ROOT / "diagrammes_activite_modele"

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}

REPLACEMENTS = {
    "Diagramme d’activité de l’authentification et de la détermination du contexte d’accès": DIAGRAMS / "AD-01_authentification.png",
    "Diagramme d’activité de création et de soumission d’une demande de marketplace bancaire": DIAGRAMS / "AD-02_creation_demande_marketplace.png",
    "Diagramme d’activité du traitement d’une demande de marketplace par l’Administrateur SaaS": DIAGRAMS / "AD-03_traitement_demande_marketplace.png",
    "Diagramme d’activité du parcours métier du Concessionnaire": DIAGRAMS / "AD-04_parcours_concessionnaire.png",
    "Diagramme d’activité du parcours Client et de la demande de financement": DIAGRAMS / "AD-05_parcours_client.png",
}

OLD_CAPTION = "Figure 4.12 — Diagramme d’activité du traitement d’une demande de marketplace"
NEW_CAPTION = "Figure 4.12 — Diagramme d’activité du traitement d’une demande et du paiement Stripe"


def replace_paragraph_text(document_root, old_text: str, new_text: str) -> bool:
    for paragraph in document_root.xpath(".//w:p", namespaces=NS):
        text_nodes = paragraph.xpath(".//w:t", namespaces=NS)
        if "".join(node.text or "" for node in text_nodes).strip() != old_text:
            continue
        if not text_nodes:
            return False
        text_nodes[0].text = new_text
        for node in text_nodes[1:]:
            node.text = ""
        return True
    return False


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    for image in REPLACEMENTS.values():
        if not image.exists():
            raise FileNotFoundError(image)

    with ZipFile(SOURCE, "r") as source_zip:
        entries = {item.filename: source_zip.read(item.filename) for item in source_zip.infolist()}

    document_root = etree.fromstring(entries["word/document.xml"])
    rels_root = etree.fromstring(entries["word/_rels/document.xml.rels"])
    rel_targets = {
        rel.get("Id"): rel.get("Target")
        for rel in rels_root.xpath(".//pr:Relationship", namespaces=NS)
    }

    media_updates: dict[str, bytes] = {}
    found: list[str] = []
    for doc_pr in document_root.xpath(".//wp:docPr", namespaces=NS):
        description = doc_pr.get("descr") or ""
        if description not in REPLACEMENTS:
            continue
        inline = doc_pr.getparent()
        blips = inline.xpath(".//a:blip", namespaces=NS)
        if len(blips) != 1:
            raise RuntimeError(f"Image relationship not found for {description}")
        rel_id = blips[0].get(f"{{{NS['r']}}}embed")
        target = rel_targets.get(rel_id)
        if not target:
            raise RuntimeError(f"Relationship target not found for {description}")
        media_name = str((Path("word") / target).as_posix())
        media_updates[media_name] = REPLACEMENTS[description].read_bytes()
        found.append(description)
        with Image.open(REPLACEMENTS[description]) as image:
            pixel_width, pixel_height = image.size
        width_inches = min(5.9, 8.05 * pixel_width / pixel_height)
        height_inches = width_inches * pixel_height / pixel_width
        cx = str(round(width_inches * 914400))
        cy = str(round(height_inches * 914400))
        extent = inline.find(f"{{{NS['wp']}}}extent")
        if extent is None:
            raise RuntimeError(f"Drawing extent not found for {description}")
        extent.set("cx", cx)
        extent.set("cy", cy)
        for shape_extent in inline.xpath(".//a:xfrm/a:ext", namespaces=NS):
            shape_extent.set("cx", cx)
            shape_extent.set("cy", cy)
        if "traitement d’une demande" in description:
            new_alt = "Diagramme d’activité du traitement d’une demande de marketplace et du paiement sécurisé par Stripe"
            doc_pr.set("descr", new_alt)
            doc_pr.set("title", new_alt)

    missing = set(REPLACEMENTS) - set(found)
    if missing:
        raise RuntimeError(f"Activity diagrams not found in source: {sorted(missing)}")
    if not replace_paragraph_text(document_root, OLD_CAPTION, NEW_CAPTION):
        raise RuntimeError("Treatment caption not found")

    entries["word/document.xml"] = etree.tostring(
        document_root, xml_declaration=True, encoding="UTF-8", standalone="yes"
    )
    entries.update(media_updates)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(suffix=".docx", delete=False, dir=OUTPUT.parent) as temporary:
        temp_path = Path(temporary.name)
    try:
        with ZipFile(temp_path, "w", ZIP_DEFLATED) as output_zip:
            for name, data in entries.items():
                output_zip.writestr(name, data)
        temp_path.replace(OUTPUT)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    print(OUTPUT)
    print(f"replaced_images={len(media_updates)}")
    print(f"bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
