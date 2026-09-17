from __future__ import annotations

from pathlib import Path
import importlib.util
import math
import sys
import zipfile


ROOT = Path(r"D:\PFE M2\Platforme SaaS")
BASE_SCRIPT = ROOT / "document_work" / "generate_drawio_use_cases.py"
OUT = ROOT / "deliverables" / "use_cases_drawio_utilisateurs_uniquement"
INDIVIDUAL = OUT / "diagrammes_individuels"
PREVIEWS = OUT / "aperçus_png"
COMBINED = OUT / "Matchia_use_cases_detailles_actions_utilisateurs.drawio"
ARCHIVE = OUT / "Matchia_use_cases_actions_utilisateurs_editables.zip"


spec = importlib.util.spec_from_file_location("drawio_base", BASE_SCRIPT)
base = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = base
spec.loader.exec_module(base)


def actor(aid: str, label: str, side: str, y: int) -> base.Actor:
    """Create a human actor; right-side actors are secondary, never external systems."""
    return base.Actor(aid, label, 45 if side == "left" else 1765, y, False)


def uc(cid: str, label: str, kind: str = "include", w: int = 350, h: int = 64) -> base.UseCase:
    return base.UseCase(cid, label, 0, 0, w, h, kind)


def inc(main: str, *targets: str) -> list[base.Relation]:
    return [base.Relation(main, target, "include") for target in targets]


def assoc(source: str, *targets: str) -> list[base.Relation]:
    return [base.Relation(source, target, "association") for target in targets]


DIAGRAMS = [
    base.Diagram(
        "UC-01",
        "S’authentifier",
        "Actions réalisées par les utilisateurs pour accéder à leur espace",
        [
            actor("a_saas", "Administrateur SaaS", "left", 230),
            actor("a_bank", "Administrateur Banque", "left", 450),
            actor("a_dealer", "Concessionnaire", "left", 670),
            actor("a_client", "Client", "left", 890),
        ],
        [
            uc("main", "S’authentifier", "main", 430, 92),
            uc("email", "1. Saisir l’adresse e-mail"),
            uc("password", "2. Saisir le mot de passe"),
            uc("submit", "3. Valider le formulaire<br>de connexion"),
            uc("retry", "Corriger les identifiants<br>et réessayer", "extend", 440, 86),
            uc("reconnect", "Se reconnecter", "extend", 440, 82),
        ],
        assoc("a_saas", "main")
        + assoc("a_bank", "main")
        + assoc("a_dealer", "main")
        + assoc("a_client", "main")
        + inc("main", "email", "password", "submit")
        + [
            base.Relation("retry", "main", "extend", "identifiants refusés"),
            base.Relation("reconnect", "main", "extend", "session expirée"),
        ],
        "UC-01_Authentification_utilisateurs.drawio",
    ),
    base.Diagram(
        "UC-02",
        "Déposer une demande de marketplace",
        "Actions du représentant de la banque jusqu’à la soumission",
        [actor("a_rep", "Représentant<br>de la banque", "left", 470)],
        [
            uc("main", "Déposer une demande<br>de marketplace", "main", 430, 92),
            uc("bank", "1. Renseigner les informations<br>de la banque"),
            uc("admin", "2. Renseigner les informations<br>du futur administrateur"),
            uc("code", "3. Saisir le code de<br>vérification reçu"),
            uc("identity", "4. Définir le slug et<br>l’identité visuelle"),
            uc("services", "5. Sélectionner les stores<br>et les modules"),
            uc("summary", "6. Consulter le récapitulatif"),
            uc("submit", "7. Confirmer et soumettre<br>la demande"),
            uc("correct", "Corriger les informations", "extend", 440, 82),
            uc("resend", "Demander un nouveau code<br>de vérification", "extend", 440, 86),
            uc("modify", "Modifier la configuration<br>avant la soumission", "extend", 440, 86),
        ],
        assoc("a_rep", "main")
        + inc("main", "bank", "admin", "code", "identity", "services", "summary", "submit")
        + [
            base.Relation("correct", "main", "extend", "information manquante ou invalide"),
            base.Relation("resend", "main", "extend", "code non reçu ou expiré"),
            base.Relation("modify", "main", "extend", "avant confirmation"),
        ],
        "UC-02_Demande_marketplace_utilisateur.drawio",
    ),
    base.Diagram(
        "UC-03",
        "Traiter une demande et activer les services",
        "Décision de l’Administrateur SaaS et paiement par le représentant de la banque",
        [
            actor("a_saas", "Administrateur SaaS", "left", 470),
            actor("a_rep", "Représentant<br>de la banque", "right", 470),
        ],
        [
            uc("main", "Traiter la demande", "main", 430, 92),
            uc("payment_main", "Régler les services", "main", 430, 92),
            uc("consult", "1. Consulter la demande"),
            uc("review", "2. Examiner les informations<br>et les choix de services"),
            uc("approve", "3. Approuver la demande"),
            uc("openlink", "1. Ouvrir le lien<br>de paiement Stripe"),
            uc("pay", "2. Effectuer le paiement"),
            uc("follow", "3. Consulter l’état<br>de la demande"),
            uc("login", "4. Se connecter à<br>l’espace activé"),
            uc("reject", "Rejeter la demande<br>et préciser le motif", "extend", 440, 88),
        ],
        assoc("a_saas", "main")
        + assoc("a_rep", "payment_main")
        + inc("main", "consult", "review", "approve")
        + inc("payment_main", "openlink", "pay", "follow", "login")
        + [base.Relation("reject", "main", "extend", "demande non conforme")],
        "UC-03_Traitement_paiement_utilisateurs.drawio",
    ),
    base.Diagram(
        "UC-04",
        "Inscrire et valider un concessionnaire",
        "Dépôt du dossier par le concessionnaire et décision de l’Administrateur SaaS",
        [
            actor("a_rep", "Représentant du<br>concessionnaire", "left", 470),
            actor("a_saas", "Administrateur SaaS", "right", 470),
        ],
        [
            uc("main", "Inscrire et valider<br>un concessionnaire", "main", 430, 92),
            uc("info", "1. Renseigner les informations<br>du concessionnaire"),
            uc("docs", "2. Déposer les pièces<br>justificatives"),
            uc("submit", "3. Soumettre la demande"),
            uc("follow", "4. Consulter l’état<br>de la demande"),
            uc("review", "5. Consulter et examiner<br>le dossier"),
            uc("approve", "6. Approuver la demande"),
            uc("correct", "Corriger ou compléter<br>le dossier", "extend", 440, 86),
            uc("reject", "Rejeter la demande<br>et préciser le motif", "extend", 440, 88),
        ],
        assoc("a_rep", "main")
        + assoc("a_saas", "main")
        + inc("main", "info", "docs", "submit", "follow", "review", "approve")
        + [
            base.Relation("correct", "main", "extend", "dossier incomplet"),
            base.Relation("reject", "main", "extend", "dossier non conforme"),
        ],
        "UC-04_Inscription_concessionnaire_utilisateurs.drawio",
    ),
    base.Diagram(
        "UC-05",
        "Gérer et publier un produit concessionnaire",
        "Actions du concessionnaire et décision de l’Administrateur Banque",
        [
            actor("a_dealer", "Concessionnaire", "left", 470),
            actor("a_bank", "Administrateur Banque", "right", 470),
        ],
        [
            uc("main", "Gérer et proposer<br>un produit", "main", 430, 92),
            uc("edit", "1. Créer ou modifier<br>un produit"),
            uc("details", "2. Renseigner les informations<br>et déposer les documents"),
            uc("stock", "3. Renseigner le stock"),
            uc("partner", "4. Sélectionner une<br>banque partenaire"),
            uc("submit", "5. Soumettre le produit<br>pour publication"),
            uc("follow", "6. Suivre les propositions<br>de publication"),
            uc("financing", "7. Consulter les financements<br>liés aux produits"),
            uc("review", "8. Examiner la proposition<br>de publication"),
            uc("approve", "9. Approuver la publication"),
            uc("correct", "Corriger le produit", "extend", 440, 82),
            uc("reject", "Refuser la publication<br>et préciser le motif", "extend", 440, 88),
            uc("block", "Bloquer une publication", "extend", 440, 82),
        ],
        assoc("a_dealer", "main")
        + assoc("a_bank", "main")
        + inc("main", "edit", "details", "stock", "partner", "submit", "follow", "financing", "review", "approve")
        + [
            base.Relation("correct", "main", "extend", "informations incomplètes"),
            base.Relation("reject", "review", "extend", "proposition refusée"),
            base.Relation("block", "main", "extend", "publication à suspendre"),
        ],
        "UC-05_Gestion_produit_utilisateurs.drawio",
    ),
    base.Diagram(
        "UC-06",
        "Déposer et traiter une demande de financement",
        "Actions du client, de l’Administrateur Banque et du concessionnaire",
        [
            actor("a_client", "Client", "left", 470),
            actor("a_bank", "Administrateur Banque", "right", 330),
            actor("a_dealer", "Concessionnaire", "right", 760),
        ],
        [
            uc("main", "Déposer une demande<br>de financement", "main", 430, 92),
            uc("bank_main", "Traiter une demande<br>de financement", "main", 430, 92),
            uc("dealer_main", "Suivre les financements<br>liés aux produits", "main", 430, 92),
            uc("product", "1. Consulter le produit"),
            uc("start", "2. Démarrer la demande"),
            uc("info", "3. Renseigner les informations<br>du dossier"),
            uc("docs", "4. Déposer les pièces<br>justificatives"),
            uc("submit", "5. Soumettre le dossier"),
            uc("follow", "6. Suivre la demande"),
            uc("review", "1. Consulter le dossier<br>et les documents"),
            uc("decision", "2. Renseigner la décision"),
            uc("dealer", "1. Consulter le dossier lié<br>au produit"),
            uc("compare", "Comparer ou simuler", "extend", 440, 82),
            uc("correct", "Compléter ou corriger<br>le dossier", "extend", 440, 86),
            uc("reject", "Refuser la demande<br>et préciser le motif", "extend", 440, 88),
        ],
        assoc("a_client", "main")
        + assoc("a_bank", "bank_main")
        + assoc("a_dealer", "dealer_main")
        + inc("main", "product", "start", "info", "docs", "submit", "follow")
        + inc("bank_main", "review", "decision")
        + inc("dealer_main", "dealer")
        + [
            base.Relation("compare", "product", "extend", "simulation souhaitée"),
            base.Relation("correct", "main", "extend", "dossier incomplet"),
            base.Relation("reject", "decision", "extend", "dossier refusé"),
        ],
        "UC-06_Financement_utilisateurs.drawio",
    ),
]


RIGHT_ACTORS = {
    "UC-03": {"a_rep"},
    "UC-04": {"a_saas"},
    "UC-05": {"a_bank"},
    "UC-06": {"a_bank", "a_dealer"},
}


def apply_layout(diagram: base.Diagram) -> None:
    if diagram.code == "UC-03":
        positions = {
            "main": (300, 470, 430, 92),
            "payment_main": (1190, 470, 430, 92),
            "consult": (260, 160, 350, 64),
            "review": (470, 285, 350, 70),
            "approve": (340, 650, 350, 64),
            "reject": (170, 815, 450, 90),
            "openlink": (1130, 160, 350, 70),
            "pay": (1350, 285, 350, 64),
            "follow": (1130, 650, 350, 70),
            "login": (1350, 790, 350, 70),
        }
        for case in diagram.cases:
            case.x, case.y, case.w, case.h = positions[case.id]
        for item in diagram.actors:
            item.x = 45 if item.id == "a_saas" else 1765
            item.y = 470
        return

    if diagram.code == "UC-06":
        positions = {
            "main": (270, 470, 430, 92),
            "bank_main": (1240, 330, 430, 92),
            "dealer_main": (1240, 850, 430, 92),
            "product": (730, 135, 350, 64),
            "start": (730, 245, 350, 64),
            "info": (730, 355, 350, 70),
            "docs": (730, 620, 350, 70),
            "submit": (730, 735, 350, 64),
            "follow": (730, 845, 350, 64),
            "compare": (225, 185, 450, 90),
            "correct": (225, 760, 450, 90),
            "review": (1190, 135, 350, 70),
            "decision": (1360, 500, 350, 64),
            "reject": (1240, 645, 450, 90),
            "dealer": (1280, 1010, 350, 70),
        }
        for case in diagram.cases:
            case.x, case.y, case.w, case.h = positions[case.id]
        actor_positions = {
            "a_client": (45, 470),
            "a_bank": (1765, 315),
            "a_dealer": (1765, 850),
        }
        for item in diagram.actors:
            item.x, item.y = actor_positions[item.id]
        return

    main_case = next(case for case in diagram.cases if case.kind == "main")
    main_case.x, main_case.y, main_case.w, main_case.h = 330, 480, 430, 92

    included = [case for case in diagram.cases if case.kind == "include"]
    split = math.ceil(len(included) / 2)
    for column_index, column in enumerate((included[:split], included[split:])):
        for index, case in enumerate(column):
            case.x = 825 if column_index == 0 else 1260
            case.y = 175 + column_index * 55 + index * 190
            case.w = 350
            case.h = 70 if "<br>" in case.label else 64

    extensions = [case for case in diagram.cases if case.kind == "extend"]
    for index, case in enumerate(extensions):
        case.x = 360 + index * 55
        case.y = 705 + index * 145
        case.w = 450
        case.h = 90

    right_ids = RIGHT_ACTORS.get(diagram.code, set())
    left = [item for item in diagram.actors if item.id not in right_ids]
    right = [item for item in diagram.actors if item.id in right_ids]

    for index, item in enumerate(left):
        item.x = 45
        item.y = 280 + index * (700 // max(1, len(left) - 1)) if len(left) > 1 else 470
    for index, item in enumerate(right):
        item.x = 1765
        item.y = 300 + index * (550 // max(1, len(right) - 1)) if len(right) > 1 else 470


def validate_human_actions(diagram: base.Diagram) -> None:
    prohibited = (
        "session jwt",
        "vérifier les identifiants",
        "enregistrer la demande",
        "envoyer l’e-mail",
        "envoyer les identifiants",
        "activer la banque",
        "mettre à jour le stock",
        "notifier le client",
    )
    labels = " ".join(case.label.lower() for case in diagram.cases)
    found = [term for term in prohibited if term in labels]
    if found:
        raise RuntimeError(f"System-only functions remain in {diagram.code}: {found}")
    if any(item.external for item in diagram.actors):
        raise RuntimeError(f"A system actor remains in {diagram.code}")


def main() -> None:
    INDIVIDUAL.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)

    for diagram in DIAGRAMS:
        apply_layout(diagram)
        validate_human_actions(diagram)

    base.write_drawio(COMBINED, DIAGRAMS)
    base.validate_drawio(COMBINED, len(DIAGRAMS))

    paths = []
    for diagram in DIAGRAMS:
        path = INDIVIDUAL / diagram.filename
        base.write_drawio(path, [diagram])
        base.validate_drawio(path, 1)
        base.preview(diagram, PREVIEWS / path.name.replace(".drawio", ".png"))
        paths.append(path)

    readme = OUT / "LISEZ-MOI.txt"
    readme.write_text(
        "DIAGRAMMES DE CAS D’UTILISATION — ACTIONS DES UTILISATEURS UNIQUEMENT\n\n"
        "Ces diagrammes ne présentent que les actions réalisées ou déclenchées par des acteurs humains.\n"
        "Les traitements internes du système, les notifications automatiques, la création des sessions, "
        "les changements automatiques de statut et les services techniques externes ont été retirés.\n\n"
        "Le fichier multipage contient les six diagrammes. Chaque élément reste éditable dans Draw.io.\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(COMBINED, COMBINED.name)
        archive.write(readme, readme.name)
        for path in paths:
            archive.write(path, f"diagrammes_individuels/{path.name}")
        for path in sorted(PREVIEWS.glob("*.png")):
            archive.write(path, f"aperçus_png/{path.name}")

    print(f"combined={COMBINED}")
    print(f"archive={ARCHIVE}")
    print(f"individual_drawio={len(paths)}")
    print(f"preview_png={len(list(PREVIEWS.glob('*.png')))}")


if __name__ == "__main__":
    main()
