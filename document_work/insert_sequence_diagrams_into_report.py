from pathlib import Path
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(r"D:\PFE M2\Platforme SaaS\document_work")
SOURCE = ROOT / "Master Report - diagrammes activités modèle harmonisé.docx"
ASSETS = ROOT / "diagrammes_sequence_matchia"
OUTPUT = ROOT / "Master Report - diagrammes UML complets avec séquences.docx"


def replace_text_preserve_first_run(paragraph, pattern, replacement):
    original = paragraph.text
    updated = re.sub(pattern, replacement, original)
    if updated == original:
        return False
    if paragraph.runs:
        paragraph.runs[0].text = updated
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(updated)
    return True


def renumber_existing_figures(doc):
    for p in doc.paragraphs:
        text = p.text
        if "Figure 4." in text:
            def repl4(m):
                n = int(m.group(1))
                if n == 1:
                    new = 1
                elif n == 2:
                    new = 3
                else:
                    new = n + 2
                return f"Figure 4.{new}"
            replace_text_preserve_first_run(p, r"Figure 4\.(\d+)", repl4)
        elif "Figure 5." in text:
            mapping = {1: 1, 2: 3, 3: 4, 4: 6, 5: 7, 6: 8, 7: 9}
            def repl5(m):
                n = int(m.group(1))
                return f"Figure 5.{mapping.get(n, n + 2)}"
            replace_text_preserve_first_run(p, r"Figure 5\.(\d+)", repl5)


def find_paragraph(doc, startswith=None, contains=None):
    for p in doc.paragraphs:
        text = " ".join(p.text.split())
        if startswith is not None and text.startswith(startswith):
            return p
        if contains is not None and contains in text:
            return p
    raise ValueError(f"Anchor not found: startswith={startswith!r}, contains={contains!r}")


def style_intro(p):
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True


def style_caption(p):
    p.style = "Caption"
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_together = True
    for run in p.runs:
        run.font.italic = True
        run.font.color.rgb = RGBColor(0x5C, 0x6F, 0x82)
        run.font.name = "Times New Roman"
        run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Times New Roman")
        run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Times New Roman")
        run.font.size = Pt(9)


def insert_picture_before(anchor, filename, alt_text, width_inches=6.15):
    img_p = anchor.insert_paragraph_before()
    img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img_p.paragraph_format.space_before = Pt(6)
    img_p.paragraph_format.space_after = Pt(2)
    img_p.paragraph_format.keep_with_next = True
    run = img_p.add_run()
    shape = run.add_picture(str(ASSETS / filename), width=Inches(width_inches))
    doc_pr = shape._inline.docPr
    doc_pr.set("descr", alt_text)
    doc_pr.set("title", alt_text)
    return img_p


def insert_new_figure(anchor, intro, filename, caption, alt_text, width_inches=6.15):
    intro_p = anchor.insert_paragraph_before(intro)
    style_intro(intro_p)
    insert_picture_before(anchor, filename, alt_text, width_inches)
    caption_p = anchor.insert_paragraph_before(caption)
    style_caption(caption_p)


def prepare_existing_caption(p, new_text=None):
    if new_text is not None:
        if p.runs:
            p.runs[0].text = new_text
            for run in p.runs[1:]:
                run.text = ""
        else:
            p.add_run(new_text)
    style_caption(p)


def main():
    doc = Document(SOURCE)
    renumber_existing_figures(doc)

    # Chapitre 4 : authentification.
    anchor = find_paragraph(doc, startswith="3. Demande de création d’une marketplace bancaire")
    insert_new_figure(
        anchor,
        "Le diagramme de séquence suivant détaille les échanges entre l’interface, le service d’authentification, la génération des jetons et la base de données. Il met en évidence le refus des comptes invalides ainsi que la résolution conditionnelle du contexte tenant.",
        "SD-01_authentification.png",
        "Figure 4.2 — Diagramme de séquence de l’authentification et du contexte multi-tenant",
        "Diagramme de séquence UML de l’authentification, de l’autorisation et de la résolution du contexte multi-tenant.",
    )

    # Chapitre 4 : création de la demande.
    anchor = find_paragraph(doc, startswith="3.1. Renseignement des informations de la banque")
    insert_new_figure(
        anchor,
        "Le diagramme de séquence complète cette vue en montrant la vérification de l’adresse e-mail, la validation de la configuration, l’enregistrement de la demande et l’envoi des notifications.",
        "SD-02_creation_demande_marketplace.png",
        "Figure 4.4 — Diagramme de séquence de la création d’une demande de marketplace bancaire",
        "Diagramme de séquence UML de la création et de la soumission d’une demande de marketplace bancaire.",
    )

    # Chapitre 4 : traitement, paiement Stripe et activation (légende déjà présente).
    caption = find_paragraph(doc, contains="Diagramme de séquence de l’approbation, du paiement et de l’activation")
    prepare_existing_caption(caption)
    insert_picture_before(
        caption,
        "SD-03_traitement_demande_stripe.png",
        "Diagramme de séquence UML du traitement d’une demande de marketplace, du paiement Stripe et de l’activation conditionnelle.",
        width_inches=5.85,
    )

    # Chapitre 5 : inscription et validation du concessionnaire.
    anchor = find_paragraph(doc, startswith="Capture 5.1 — Formulaire d’inscription du concessionnaire")
    insert_new_figure(
        anchor,
        "Le diagramme de séquence ci-dessous précise la validation du dossier, sa transmission à l’Administrateur SaaS et les deux issues possibles du traitement.",
        "SD-04_inscription_concessionnaire.png",
        "Figure 5.2 — Diagramme de séquence de l’inscription et de la validation d’un concessionnaire",
        "Diagramme de séquence UML de l’inscription, de l’approbation ou du rejet d’un concessionnaire.",
    )

    # Chapitre 5 : catalogue, stock et publication bancaire.
    anchor = find_paragraph(doc, startswith="Capture 5.4 — Création d’un produit et gestion du stock")
    insert_new_figure(
        anchor,
        "Le diagramme de séquence suivant distingue la gestion du produit central, le stockage de ses médias et la demande de publication propre à chaque banque partenaire.",
        "SD-05_gestion_produit.png",
        "Figure 5.4 — Diagramme de séquence de la gestion et de la publication multi-banque d’un produit",
        "Diagramme de séquence UML de la création, de la mise à jour, du stock et de la publication bancaire d’un produit.",
    )

    # Chapitre 5 : inscription du client dans le tenant de la marketplace.
    anchor = find_paragraph(doc, startswith="Capture 5.7 — Inscription et vérification du compte client")
    insert_new_figure(
        anchor,
        "Le diagramme de séquence détaille la création initiale du compte inactif, l’envoi du code à six chiffres et l’activation du client dans le tenant de la marketplace consultée.",
        "SD-06_inscription_client.png",
        "Figure 5.5 — Diagramme de séquence de l’inscription et de l’activation du compte Client",
        "Diagramme de séquence UML de l’inscription d’un client, de la vérification de l’e-mail et de l’activation du compte dans un tenant.",
    )

    # Chapitre 5 : demande de financement (légende existante).
    caption = find_paragraph(doc, contains="Diagramme de séquence du traitement d’une demande de financement")
    prepare_existing_caption(
        caption,
        "Figure 5.7 — Diagramme de séquence de la constitution et du traitement d’une demande de financement",
    )
    insert_picture_before(
        caption,
        "SD-07_demande_financement.png",
        "Diagramme de séquence UML de la création du dossier, du dépôt des justificatifs et de la décision bancaire.",
        width_inches=5.85,
    )

    # Chapitre 5 : assistant SaaS sécurisé (légende existante).
    caption = find_paragraph(doc, contains="Diagramme de séquence de l’assistant IA Text-to-SQL sécurisé")
    prepare_existing_caption(caption)
    insert_picture_before(
        caption,
        "SD-08_assistant_saas.png",
        "Diagramme de séquence UML de l’assistant SaaS Text-to-SQL avec schéma filtré, validation déterministe et lecture seule.",
    )

    # Chapitre 5 : chatbot public à base de règles (légende existante).
    caption = find_paragraph(doc, contains="Fonctionnement du chatbot public dans une marketplace")
    prepare_existing_caption(
        caption,
        "Figure 5.9 — Diagramme de séquence du chatbot public d’une marketplace bancaire",
    )
    insert_picture_before(
        caption,
        "SD-09_chatbot_marketplace.png",
        "Diagramme de séquence UML du chatbot public, du contrôle du module, de la détection d’intention et de la consultation du catalogue autorisé.",
    )

    # Métadonnées et enregistrement dans un nouveau fichier.
    doc.core_properties.subject = "Rapport Matchia enrichi avec les diagrammes de séquence UML"
    doc.core_properties.comments = "Diagrammes d’activité, cas d’utilisation et séquence harmonisés."
    doc.save(OUTPUT)

    # Contrôles structurels immédiats.
    check = Document(OUTPUT)
    expected_captions = [
        "Figure 4.2 — Diagramme de séquence de l’authentification et du contexte multi-tenant",
        "Figure 4.4 — Diagramme de séquence de la création d’une demande de marketplace bancaire",
        "Figure 4.15 — Diagramme de séquence de l’approbation, du paiement et de l’activation",
        "Figure 5.2 — Diagramme de séquence de l’inscription et de la validation d’un concessionnaire",
        "Figure 5.4 — Diagramme de séquence de la gestion et de la publication multi-banque d’un produit",
        "Figure 5.5 — Diagramme de séquence de l’inscription et de l’activation du compte Client",
        "Figure 5.7 — Diagramme de séquence de la constitution et du traitement d’une demande de financement",
        "Figure 5.8 — Diagramme de séquence de l’assistant IA Text-to-SQL sécurisé",
        "Figure 5.9 — Diagramme de séquence du chatbot public d’une marketplace bancaire",
    ]
    texts = {" ".join(p.text.split()) for p in check.paragraphs}
    missing = [c for c in expected_captions if c not in texts]
    if missing:
        raise RuntimeError(f"Missing captions: {missing}")
    if len(check.inline_shapes) != 57:
        raise RuntimeError(f"Expected 57 inline shapes, found {len(check.inline_shapes)}")
    print(f"OUTPUT={OUTPUT}")
    print(f"PARAGRAPHS={len(check.paragraphs)} TABLES={len(check.tables)} SHAPES={len(check.inline_shapes)}")


if __name__ == "__main__":
    main()
