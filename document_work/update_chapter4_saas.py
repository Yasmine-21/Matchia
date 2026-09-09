from copy import deepcopy
from pathlib import Path

from docx import Document


SOURCE = Path(r"D:\PFE - BRI Technology\Rapport\Master Report.docx")
OUTPUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\Master Report - chapitre 4 réorganisé.docx")


def apply_paragraph_format(target, template):
    """Copy the paragraph and first-run formatting used by the source report."""
    if target._p.pPr is not None:
        target._p.remove(target._p.pPr)
    if template._p.pPr is not None:
        target._p.insert(0, deepcopy(template._p.pPr))


def first_formatted_run(paragraph):
    return next((run for run in paragraph.runs if run.text), None)


def insert_before(anchor, text, template):
    paragraph = anchor.insert_paragraph_before()
    apply_paragraph_format(paragraph, template)
    run = paragraph.add_run(text)
    source_run = first_formatted_run(template)
    if source_run is not None and source_run._r.rPr is not None:
        run._r.insert(0, deepcopy(source_run._r.rPr))
    return paragraph


def remove_paragraph(paragraph):
    parent = paragraph._element.getparent()
    parent.remove(paragraph._element)
    paragraph._p = paragraph._element = None


def main():
    document = Document(SOURCE)

    # Paragraphs 341-373 are the existing SaaS back-office section. Keep paragraph
    # 374 (Back-office Banque) and all following report content intact.
    paragraphs = document.paragraphs
    section_template = paragraphs[341]
    body_template = paragraphs[342]
    minor_heading_template = paragraphs[347]
    web_body_template = paragraphs[352]
    figure_template = paragraphs[345]
    anchor = paragraphs[374]
    old_section = paragraphs[341:374]

    content = [
        ("section", "4. Back-office SaaS : administration et supervision de la plateforme"),
        ("body", "Après la soumission d’une demande, son traitement est assuré par l’Administrateur SaaS. Le Back-office SaaS constitue l’espace central de gouvernance de la plateforme. Il regroupe les fonctionnalités nécessaires au pilotage des ressources partagées, au suivi des demandes et au contrôle du cycle de vie des services proposés aux banques."),
        ("minor", "4.1. Tableau de bord"),
        ("body", "Le tableau de bord fournit une vue synthétique de l’activité de la plateforme à travers des indicateurs relatifs notamment aux banques, aux demandes reçues, aux abonnements et aux principales opérations à suivre. Il permet ainsi à l’Administrateur SaaS d’identifier rapidement les éléments nécessitant son intervention."),
        ("figure", "Figure 4.8 — Tableau de bord de l’Administrateur SaaS"),
        ("minor", "4.2. Gestion des stores et des modules"),
        ("body", "Cette rubrique permet d’administrer le catalogue des stores et des modules proposés aux banques. L’Administrateur SaaS peut consulter les univers fonctionnels disponibles, organiser les modules associés et définir les éléments qui pourront être sélectionnés lors de la création ou de l’évolution d’une marketplace. Cette gestion centralisée garantit la cohérence des services mis à disposition des différents tenants."),
        ("minor", "4.3. Gestion des demandes de marketplace"),
        ("body", "La rubrique Demandes centralise les sollicitations reçues pour la création ou l’évolution des services d’une marketplace. Elle facilite leur consultation, leur analyse et leur traitement dans un cadre traçable."),
        ("minor", "4.3.1. Traitement d’une demande de marketplace"),
        ("body", "L’Administrateur SaaS dispose d’une interface permettant de consulter les demandes reçues et d’accéder à leur détail. La fiche d’une demande présente les informations de la banque, celles du futur administrateur, la configuration souhaitée ainsi que les stores et modules sélectionnés."),
        ("body", "Après vérification, l’administrateur peut approuver ou rejeter la demande. En cas de rejet, il renseigne le motif de la décision ; un e-mail précisant ce motif est ensuite transmis au demandeur. En cas d’approbation, le processus se poursuit vers l’étape de paiement."),
        ("figure", "Figure 4.9 — Liste des demandes de marketplace dans le Back-office SaaS"),
        ("figure", "Figure 4.10 — Consultation du détail d’une demande"),
        ("web", "Le processus décisionnel est également présenté dans le diagramme d’activité suivant."),
        ("figure", "Figure 4.11 — Diagramme d’activité du traitement d’une demande par l’Administrateur SaaS"),
        ("minor", "4.3.2. Approbation et déclenchement du paiement"),
        ("body", "Lorsqu’une demande est approuvée, la plateforme prépare les éléments nécessaires à la future activation de la banque et de sa marketplace. Ces éléments restent toutefois inactifs tant que le paiement n’a pas été confirmé. À cette étape, un e-mail contenant les instructions de paiement et le lien correspondant est envoyé au contact de la banque."),
        ("minor", "4.3.3. Paiement sécurisé par Stripe et activation de la marketplace"),
        ("web", "Le paiement est une étape déterminante du cycle de vie de la demande. Il est intégré à la plateforme au moyen de Stripe, service de paiement en ligne. Lorsqu’il ouvre le lien reçu, le futur Administrateur Banque accède à une interface de paiement sécurisée dans laquelle il renseigne les informations nécessaires à la transaction. Les données de carte sont traitées par les composants sécurisés de Stripe et ne sont pas enregistrées par l’application."),
        ("web", "Le backend crée l’opération de paiement et l’associe à la demande ainsi qu’à l’abonnement concerné. Après la confirmation de la transaction, il vérifie le statut retourné par Stripe avant de mettre à jour le paiement. Seule une confirmation de paiement réussie déclenche l’activation de la banque, de sa marketplace, de l’abonnement et du compte Administrateur Banque. En cas d’échec ou de paiement en attente, ces ressources restent inactives."),
        ("web", "La plateforme génère ensuite les informations nécessaires à la première connexion et envoie au responsable de la banque un e-mail contenant ses identifiants d’accès au Back-office Banque."),
        ("body", "Le workflow complet est représenté par le diagramme de séquence suivant."),
        ("figure", "Figure 4.12 — Diagramme de séquence de l’approbation, du paiement et de l’activation"),
        ("figure", "Figure 4.13 — E-mail contenant les instructions de paiement"),
        ("figure", "Figure 4.14 — Confirmation du paiement"),
        ("figure", "Figure 4.15 — Activation de la marketplace et de l’abonnement"),
        ("figure", "Figure 4.16 — E-mail d’accès au Back-office Banque"),
        ("minor", "4.4. Gestion des banques"),
        ("body", "La rubrique Banques permet à l’Administrateur SaaS de consulter les établissements enregistrés sur la plateforme et de suivre leur état d’activation. Elle offre une vue sur les informations propres à chaque banque et sur la marketplace qui lui est rattachée, tout en respectant le principe d’isolation des données entre tenants."),
        ("minor", "4.5. Gestion des utilisateurs et des rôles"),
        ("body", "Cette fonctionnalité permet de consulter les utilisateurs de la plateforme et d’administrer les rôles attribués. Elle contribue à appliquer les règles d’autorisation : chaque utilisateur accède exclusivement aux espaces et aux opérations correspondant à son profil."),
        ("minor", "4.6. Gestion des concessionnaires"),
        ("body", "L’Administrateur SaaS peut suivre les demandes d’inscription des concessionnaires, consulter les informations et documents transmis, puis statuer sur leur admissibilité. Cette rubrique permet également de superviser les comptes concessionnaires actifs et leur participation aux marketplaces bancaires."),
        ("minor", "4.7. Gestion des marketplaces"),
        ("body", "La rubrique Marketplace permet de visualiser les marketplaces créées pour les banques et d’en suivre le statut. Elle constitue un point de contrôle sur les espaces publics associés aux tenants et sur leur disponibilité après validation de l’abonnement."),
        ("minor", "4.8. Gestion du contenu des marketplaces"),
        ("body", "La gestion du contenu permet d’administrer les éléments éditoriaux et visuels utilisés par les marketplaces. L’Administrateur SaaS peut ainsi superviser les contenus publiés tout en laissant à chaque banque un périmètre de personnalisation propre à son espace."),
        ("minor", "4.9. Gestion des offres et des abonnements"),
        ("body", "Cette rubrique regroupe la gestion des offres commerciales et le suivi des abonnements. L’abonnement établit le lien entre les services sélectionnés par la banque et leur période d’utilisation. Lors de la création initiale, il reste en attente du paiement ; après confirmation, il devient actif et les stores et modules souscrits peuvent être exploités."),
        ("body", "Le Back-office SaaS permet également de suivre les périodes de validité, les statuts et l’échéance des abonnements, afin d’informer les acteurs concernés lorsqu’un renouvellement est nécessaire. Cette gestion garantit que seuls les services associés à un abonnement valide restent accessibles."),
        ("minor", "4.10. Audit et logs"),
        ("body", "La rubrique Audit & Logs fournit une consultation des événements importants réalisés sur la plateforme. Elle contribue à la traçabilité des opérations d’administration, des actions liées aux demandes et des opérations de paiement, ce qui facilite le suivi et l’analyse des incidents."),
        ("minor", "4.11. Paramètres de la plateforme"),
        ("body", "Enfin, la rubrique Paramètres centralise les options de configuration générale accessibles à l’Administrateur SaaS. Elle permet de maintenir les réglages nécessaires au fonctionnement cohérent de la plateforme, sans intervenir directement sur les données propres à une banque."),
    ]

    templates = {
        "section": section_template,
        "body": body_template,
        "minor": minor_heading_template,
        "web": web_body_template,
        "figure": figure_template,
    }
    for kind, text in content:
        insert_before(anchor, text, templates[kind])

    for paragraph in old_section:
        remove_paragraph(paragraph)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
