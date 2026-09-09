from copy import deepcopy
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from lxml import etree


SOURCE = Path(
    r"D:\PFE M2\Platforme SaaS\document_work\Master_Report_Introduction_Conclusion_Chapitre_3.docx"
)
OUTPUT = Path(
    r"D:\PFE M2\Platforme SaaS\document_work\Master_Report_Architecture_Chapitre_3_Reformulee.docx"
)

GLOBAL_INTRO = (
    "Dans cette section, nous proposons une analyse approfondie de l’architecture globale de "
    "l’application, en examinant à la fois ses aspects logique et physique."
)

LOGICAL_INTRO = (
    "L’architecture logique de Matchia repose sur une architecture en couches de type MVC. "
    "Dans cette organisation, chaque couche assure une responsabilité précise et participe à "
    "l’exécution des traitements de l’application."
)

LOGICAL_DESCRIPTION = (
    "La Vue est portée par le frontend React et TypeScript, qui affiche les interfaces et transmet "
    "les actions des utilisateurs au backend au moyen de requêtes HTTP. Le rôle de Contrôleur est "
    "assuré par les contrôleurs REST de Spring Boot, chargés de recevoir les requêtes et de les "
    "orienter vers les services. Le Modèle regroupe la logique métier, les entités et les DTO "
    "manipulés par l’application. Les services appliquent les règles fonctionnelles, tandis que les "
    "Repositories JPA assurent l’accès aux données stockées dans PostgreSQL. Dans cette adaptation "
    "du modèle MVC, la vue est séparée du backend et les échanges s’effectuent à travers des API REST, "
    "avec des réponses principalement retournées au format JSON."
)

LOGICAL_BENEFIT = (
    "Cette séparation des responsabilités rend l’application plus lisible, maintenable et évolutive."
)

PHYSICAL_INTRO = (
    "L’architecture physique de Matchia suit une architecture 3 tiers. Elle répartit les composants "
    "techniques entre le tiers présentation, le tiers applicatif et le tiers données, tout en intégrant "
    "les services externes utilisés par la plateforme."
)

PHYSICAL_DESCRIPTION = (
    "Le tiers présentation comprend le navigateur Web et le frontend développé avec React, TypeScript "
    "et Vite, puis servi par Nginx. Il assure l’affichage des interfaces et communique avec le backend "
    "au moyen d’API REST sécurisées par HTTPS. Le tiers applicatif correspond au backend développé avec "
    "Spring Boot et Java 17. Il centralise la logique métier et s’appuie sur Spring Security pour gérer "
    "l’authentification, l’autorisation et le contrôle des accès. Le tiers données est constitué de la "
    "base PostgreSQL, accessible par le backend à travers JPA/Hibernate et JDBC. La base et le schéma "
    "sont partagés entre les différentes banques, tandis que l’isolation des données est assurée "
    "logiquement selon le tenant. Le backend communique également avec Stripe pour les paiements, "
    "l’API Gemini de Google AI pour l’assistance intelligente et un serveur SMTP pour l’envoi des "
    "e-mails et des notifications."
)

CONCLUSION = (
    "En conclusion, ce chapitre a permis de présenter les fondements architecturaux et techniques de "
    "Matchia. Il a introduit le modèle SaaS et le principe de la multi-tenancy, comparé les principales "
    "stratégies d’isolation des données et justifié le choix d’une base et d’un schéma partagés avec une "
    "isolation logique par tenant. Il a également décrit l’architecture globale de la plateforme à "
    "travers une architecture logique en couches de type MVC et une architecture physique 3 tiers, puis "
    "présenté l’environnement de développement et les technologies retenues. Ces choix constituent un "
    "socle cohérent, maintenable et évolutif pour la mise en œuvre des fonctionnalités abordées dans les "
    "chapitres suivants."
)

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{%s}" % NS["w"]
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def paragraph_text(paragraph):
    return "".join(paragraph.xpath(".//w:t/text()", namespaces=NS)).strip()


def find_paragraph(paragraphs, prefix):
    matches = [p for p in paragraphs if paragraph_text(p).startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f"Paragraphe introuvable ou ambigu : {prefix!r} ({len(matches)} résultat(s)).")
    return matches[0]


def set_paragraph_text(paragraph, text):
    p_pr = paragraph.find(W + "pPr")
    for child in list(paragraph):
        if child is not p_pr:
            paragraph.remove(child)
    run = etree.SubElement(paragraph, W + "r")
    text_node = etree.SubElement(run, W + "t")
    text_node.set(XML_SPACE, "preserve")
    text_node.text = text


with ZipFile(SOURCE, "r") as source_zip:
    entries = [(info, source_zip.read(info.filename)) for info in source_zip.infolist()]

entry_map = {info.filename: data for info, data in entries}
root = etree.fromstring(entry_map["word/document.xml"])
body = root.find("w:body", NS)
paragraphs = [child for child in body if child.tag == W + "p"]

global_intro = find_paragraph(paragraphs, "Après avoir défini le modèle SaaS multi-tenant")
global_description = find_paragraph(paragraphs, "Matchia repose sur une architecture monolithique")
global_mvc = find_paragraph(paragraphs, "Cette organisation s’inspire également des principes du modèle MVC")
global_views = find_paragraph(paragraphs, "Afin de mieux représenter cette organisation")

logical_intro = find_paragraph(paragraphs, "L’architecture logique décrit la manière")
logical_layers = find_paragraph(paragraphs, "Dans Matchia, cette architecture suit une organisation en couches")
logical_description = find_paragraph(paragraphs, "La première couche correspond à la vue")
logical_benefit = find_paragraph(paragraphs, "Cette organisation assure une séparation claire")

physical_intro = find_paragraph(paragraphs, "L’architecture physique de Matchia décrit")
physical_description = find_paragraph(paragraphs, "Les différents acteurs de Matchia")
conclusion = find_paragraph(paragraphs, "En conclusion, ce chapitre a permis de présenter les fondements")

set_paragraph_text(global_intro, GLOBAL_INTRO)
body.remove(global_description)
body.remove(global_mvc)
body.remove(global_views)

set_paragraph_text(logical_intro, LOGICAL_INTRO)
body.remove(logical_layers)
set_paragraph_text(logical_description, LOGICAL_DESCRIPTION)
set_paragraph_text(logical_benefit, LOGICAL_BENEFIT)

set_paragraph_text(physical_intro, PHYSICAL_INTRO)
set_paragraph_text(physical_description, PHYSICAL_DESCRIPTION)
set_paragraph_text(conclusion, CONCLUSION)

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
