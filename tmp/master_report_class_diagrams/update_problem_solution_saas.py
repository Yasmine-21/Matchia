from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


SOURCE = Path(
    r"D:\PFE M2\Platforme SaaS\deliverables\rapport\Master Report_avec_diagrammes_classes_Drawio.docx"
)
OUTPUT = Path(
    r"D:\PFE M2\Platforme SaaS\deliverables\rapport\Master Report_final_SaaS_mis_en_valeur.docx"
)


REPLACEMENTS = {
    "L’étude de l’existant met en évidence plusieurs limites majeures :": (
        "L’étude de l’existant met en évidence une problématique centrale : la gestion des "
        "marketplaces repose sur des processus non automatisés et sur des applications spécifiques "
        "à chaque banque, ce qui limite la mutualisation, la centralisation et l’évolutivité. Cette "
        "problématique se décline comme suit :"
    ),
    "Processus de création peu automatisé : la mise en place d’une nouvelle marketplace nécessitait "
    "plusieurs échanges et interventions entre la banque et le fournisseur de la solution.": (
        "Processus de création non automatisé : la mise en place d’une nouvelle marketplace reposait "
        "sur des échanges et des interventions manuelles entre la banque et le fournisseur de la "
        "solution, depuis l’expression du besoin jusqu’à la configuration."
    ),
    "Paiement et activation non intégrés : le règlement, sa vérification, la mise à jour de "
    "l’abonnement et l’activation des services nécessitaient des opérations supplémentaires.": (
        "Paiement, activation et suivi non automatisés : le règlement, sa vérification, la mise à "
        "jour de l’abonnement et l’activation des services étaient réalisés séparément et "
        "nécessitaient des interventions humaines."
    ),
    "Afin de répondre aux besoins identifiés, la solution proposée consiste à mettre en place "
    "Matchia, une plateforme SaaS multi-tenant permettant de centraliser la gestion de plusieurs "
    "marketplaces bancaires au sein d’un même système. Chaque banque dispose de son propre espace "
    "personnalisable, avec ses stores, modules, contenus et paramètres, tout en s’appuyant sur un "
    "socle applicatif commun. La plateforme intègre également le processus d’adhésion en regroupant "
    "les étapes de demande, de validation, de paiement et d’activation dans un même parcours. Par "
    "ailleurs, la gestion des concessionnaires est centralisée grâce à un compte unique leur "
    "permettant de collaborer avec plusieurs banques et de gérer leurs produits et partenariats "
    "depuis un seul espace. La solution offre ainsi une plateforme centralisée, configurable, "
    "automatisée et évolutive, adaptée à la gestion de plusieurs établissements bancaires et de "
    "leurs différents partenaires.": (
        "Pour répondre à cette problématique, le noyau du projet Matchia repose sur une plateforme "
        "SaaS multi-tenant. Ce socle SaaS unique mutualise l’application, l’infrastructure et les "
        "fonctionnalités communes pour l’ensemble des banques, tout en isolant les données et la "
        "configuration de chaque tenant. Il remplace la multiplication des applications spécifiques "
        "par un service centralisé, configurable et évolutif, administré depuis un back-office SaaS. "
        "Autour de ce noyau, chaque banque dispose de sa marketplace personnalisable, composée de "
        "stores, de modules, de contenus et de paramètres propres. Elle bénéficie également d’un "
        "cycle de souscription intégré réunissant la demande, la validation, le paiement, la création "
        "de l’abonnement et l’activation des services. La même logique de centralisation s’applique "
        "aux concessionnaires : un compte unique leur permet de collaborer avec plusieurs banques et "
        "de gérer leurs produits et leurs partenariats depuis un seul espace. Le modèle SaaS constitue "
        "ainsi la base fonctionnelle et architecturale de Matchia ; l’automatisation des parcours en "
        "est une conséquence directe, au service d’une gestion cohérente, maintenable et capable "
        "d’évoluer."
    ),
}

BOLD_PREFIXES = {
    "Processus de création peu automatisé : la mise en place d’une nouvelle marketplace nécessitait "
    "plusieurs échanges et interventions entre la banque et le fournisseur de la solution.": (
        "Processus de création non automatisé : "
    ),
    "Paiement et activation non intégrés : le règlement, sa vérification, la mise à jour de "
    "l’abonnement et l’activation des services nécessitaient des opérations supplémentaires.": (
        "Paiement, activation et suivi non automatisés : "
    ),
}


def append_run(paragraph, text_value: str, run_properties, bold: bool | None = None) -> None:
    run = OxmlElement("w:r")
    properties = deepcopy(run_properties) if run_properties is not None else OxmlElement("w:rPr")
    if bold is not None:
        for name in ("w:b", "w:bCs"):
            for existing in properties.findall(qn(name)):
                properties.remove(existing)
            bold_element = OxmlElement(name)
            bold_element.set(qn("w:val"), "1" if bold else "0")
            properties.append(bold_element)
    if len(properties):
        run.append(properties)
    text = OxmlElement("w:t")
    text.set(qn("xml:space"), "preserve")
    text.text = text_value
    run.append(text)
    paragraph._p.append(run)


def replace_paragraph_text(paragraph, new_text: str, bold_prefix: str | None = None) -> None:
    run_properties = None
    if paragraph.runs and paragraph.runs[0]._r.rPr is not None:
        run_properties = deepcopy(paragraph.runs[0]._r.rPr)

    for child in list(paragraph._p):
        if child.tag != qn("w:pPr"):
            paragraph._p.remove(child)

    if bold_prefix is None:
        append_run(paragraph, new_text, run_properties)
        return
    if not new_text.startswith(bold_prefix):
        raise RuntimeError(f"Bold prefix does not match replacement: {bold_prefix}")
    append_run(paragraph, bold_prefix, run_properties, bold=True)
    append_run(paragraph, new_text[len(bold_prefix) :], run_properties, bold=False)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    document = Document(str(SOURCE))
    paragraphs_by_text = {}
    for paragraph in document.paragraphs:
        paragraphs_by_text.setdefault(paragraph.text.strip(), []).append(paragraph)

    for old_text, new_text in REPLACEMENTS.items():
        matches = paragraphs_by_text.get(old_text, [])
        if len(matches) != 1:
            raise RuntimeError(
                f"Expected one exact paragraph match, found {len(matches)} for: {old_text[:80]}"
            )
        replace_paragraph_text(matches[0], new_text, BOLD_PREFIXES.get(old_text))

    settings = document.settings._element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(str(OUTPUT))
    print(f"Created: {OUTPUT}")
    print(f"Replacements: {len(REPLACEMENTS)}")
    print(f"Size: {OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
