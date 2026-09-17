from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import html
import math
import shutil
import textwrap
import uuid
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"D:\PFE M2\Platforme SaaS")
OUT = ROOT / "deliverables" / "use_cases_drawio_style_global"
INDIVIDUAL = OUT / "diagrammes_individuels"
PREVIEWS = OUT / "aperçus_png"
COMBINED = OUT / "Matchia_use_cases_detailles_style_diagramme_global.drawio"
ARCHIVE = OUT / "Matchia_use_cases_detailles_style_global_editables.zip"

CANVAS_W, CANVAS_H = 1920, 1300
BOUNDARY = (220, 105, 1470, 1080)

COLORS = {
    "actor": "#555555",
    "association": "#555555",
    "case_fill": "#D7F4EF",
    "case_stroke": "#5D7774",
    "main_fill": "#DBE9FF",
    "main_stroke": "#7DA3D6",
    "dependency": "#14A9B5",
    "dependency_text": "#39747A",
    "condition": "#666666",
    "text": "#333333",
    "page": "#FFFFFF",
    "caption": "#444444",
}


@dataclass
class Actor:
    id: str
    label: str
    x: int
    y: int
    external: bool = False


@dataclass
class UseCase:
    id: str
    label: str
    x: int
    y: int
    w: int = 350
    h: int = 64
    kind: str = "include"  # main | include | extend


@dataclass
class Relation:
    source: str
    target: str
    kind: str = "association"  # association | include | extend
    condition: str = ""


@dataclass
class Diagram:
    code: str
    title: str
    subtitle: str
    actors: list[Actor]
    cases: list[UseCase]
    relations: list[Relation]
    filename: str


def actor(aid, label, side, y, external=False):
    x = 45 if side == "left" else 1760
    return Actor(aid, label, x, y, external)


def uc(cid, label, x, y, kind="include", w=350, h=64):
    return UseCase(cid, label, x, y, w, h, kind)


def inc(main, *targets):
    return [Relation(main, t, "include") for t in targets]


def assoc(source, *targets):
    return [Relation(source, t, "association") for t in targets]


DIAGRAMS = [
    Diagram(
        "UC-01",
        "S’authentifier",
        "Accès sécurisé, rôles et contexte multi-tenant",
        [
            actor("a_saas", "Administrateur SaaS", "left", 220),
            actor("a_bank", "Administrateur Banque", "left", 445),
            actor("a_dealer", "Concessionnaire", "left", 670),
            actor("a_client", "Client", "left", 895),
        ],
        [
            uc("main", "S’authentifier", 700, 155, "main", 500, 82),
            uc("id", "1. Saisir l’adresse e-mail<br>et le mot de passe", 320, 330),
            uc("verify", "2. Vérifier les identifiants", 320, 455),
            uc("status", "3. Vérifier l’état du compte", 320, 580),
            uc("role", "4. Charger le rôle<br>et les autorisations", 810, 330),
            uc("session", "5. Créer la session JWT", 810, 455),
            uc("redirect", "6. Rediriger vers l’espace<br>correspondant au rôle", 810, 580),
            uc("tenant", "Déterminer le contexte<br>du tenant", 1260, 380, "extend"),
            uc("deny", "Refuser l’accès et<br>afficher l’erreur", 1260, 565, "extend"),
            uc("renew", "Renouveler la session<br>ou se reconnecter", 810, 755, "extend"),
        ],
        assoc("a_saas", "main") + assoc("a_bank", "main") + assoc("a_dealer", "main") + assoc("a_client", "main")
        + inc("main", "id", "verify", "status", "role", "session", "redirect")
        + [Relation("tenant", "main", "extend", "utilisateur rattaché à une banque"),
           Relation("deny", "main", "extend", "identifiants invalides, compte inactif ou accès interdit"),
           Relation("renew", "main", "extend", "session ou jeton expiré")],
        "UC-01_Authentification.drawio",
    ),
    Diagram(
        "UC-02",
        "Déposer une demande de marketplace",
        "Soumission publique d’une demande de création de marketplace bancaire",
        [
            actor("a_rep", "Représentant<br>de la banque", "left", 420),
            actor("a_saas", "Administrateur SaaS", "right", 380, True),
            actor("a_mail", "Service e-mail", "right", 790, True),
        ],
        [
            uc("main", "Déposer une demande<br>de marketplace", 700, 150, "main", 500, 86),
            uc("bank", "1. Renseigner la banque et<br>le futur administrateur", 300, 315),
            uc("email", "2. Vérifier l’adresse e-mail", 300, 430),
            uc("config", "3. Configurer le slug et<br>l’identité visuelle", 300, 545),
            uc("modules", "4. Sélectionner les stores<br>et les modules", 300, 660),
            uc("summary", "5. Consulter le récapitulatif", 800, 315),
            uc("submit", "6. Confirmer et soumettre", 800, 430),
            uc("save", "7. Enregistrer la demande<br>au statut « en attente »", 800, 545),
            uc("notify", "8. Notifier<br>l’Administrateur SaaS", 800, 660),
            uc("confirm", "9. Envoyer l’e-mail<br>de confirmation", 800, 775),
            uc("correct", "Corriger les informations", 1260, 330, "extend"),
            uc("resend", "Renvoyer le code<br>de vérification", 1260, 500, "extend"),
            uc("modify", "Modifier la configuration<br>avant la soumission", 1260, 670, "extend"),
        ],
        assoc("a_rep", "main") + assoc("a_saas", "notify") + assoc("a_mail", "email", "confirm")
        + inc("main", "bank", "email", "config", "modules", "summary", "submit", "save", "notify", "confirm")
        + [Relation("correct", "main", "extend", "information obligatoire manquante ou invalide"),
           Relation("resend", "email", "extend", "code incorrect ou expiré"),
           Relation("modify", "main", "extend", "avant confirmation")],
        "UC-02_Demande_marketplace.drawio",
    ),
    Diagram(
        "UC-03",
        "Traiter une demande et activer les services",
        "Validation, paiement Stripe et activation de la marketplace",
        [
            actor("a_saas", "Administrateur SaaS", "left", 410),
            actor("a_rep", "Représentant<br>de la banque", "right", 285, True),
            actor("a_stripe", "Stripe", "right", 610, True),
            actor("a_mail", "Service e-mail", "right", 900, True),
        ],
        [
            uc("main", "Traiter la demande et<br>activer les services", 700, 145, "main", 500, 88),
            uc("review", "1. Consulter et vérifier<br>la demande", 300, 315),
            uc("approve", "2. Approuver la demande", 300, 430),
            uc("paylink", "3. Générer le lien<br>de paiement Stripe", 300, 545),
            uc("sendlink", "4. Envoyer le lien<br>de paiement", 300, 660),
            uc("pay", "5. Effectuer le paiement", 810, 315),
            uc("checkpay", "6. Vérifier la confirmation<br>du paiement", 810, 430),
            uc("activate", "7. Activer la banque, la marketplace,<br>l’abonnement et le compte", 810, 545, w=390, h=72),
            uc("credentials", "8. Envoyer les identifiants<br>de connexion", 810, 675),
            uc("reject", "Rejeter la demande<br>avec un motif", 1270, 370, "extend"),
            uc("paymentfail", "Maintenir les ressources<br>inactives", 1270, 565, "extend"),
        ],
        assoc("a_saas", "main") + assoc("a_rep", "pay")
        + assoc("a_stripe", "paylink", "pay", "checkpay") + assoc("a_mail", "sendlink", "credentials", "reject")
        + inc("main", "review", "approve", "paylink", "sendlink", "pay", "checkpay", "activate", "credentials")
        + [Relation("reject", "main", "extend", "demande non conforme"),
           Relation("paymentfail", "main", "extend", "paiement échoué, annulé ou non confirmé")],
        "UC-03_Traitement_paiement_activation.drawio",
    ),
    Diagram(
        "UC-04",
        "Inscrire et valider un concessionnaire",
        "Dépôt du dossier, validation SaaS et activation du compte",
        [
            actor("a_rep", "Représentant du<br>concessionnaire", "left", 415),
            actor("a_saas", "Administrateur SaaS", "right", 410, True),
            actor("a_mail", "Service e-mail", "right", 830, True),
        ],
        [
            uc("main", "Inscrire et valider<br>un concessionnaire", 700, 145, "main", 500, 88),
            uc("info", "1. Renseigner les informations<br>du concessionnaire", 300, 315),
            uc("docs", "2. Déposer les pièces<br>justificatives", 300, 430),
            uc("submit", "3. Soumettre la demande", 300, 545),
            uc("save", "4. Enregistrer la demande<br>au statut « en attente »", 300, 660),
            uc("review", "5. Consulter et vérifier<br>le dossier", 810, 315),
            uc("approve", "6. Approuver la demande", 810, 430),
            uc("account", "7. Créer et activer le compte<br>Administrateur Concessionnaire", 810, 545, w=390, h=72),
            uc("credentials", "8. Envoyer les identifiants<br>de connexion", 810, 675),
            uc("correct", "Corriger ou compléter<br>le dossier", 1270, 330, "extend"),
            uc("reject", "Rejeter la demande<br>avec un motif", 1270, 530, "extend"),
            uc("rejectmail", "Notifier le rejet<br>par e-mail", 1270, 730, "include"),
        ],
        assoc("a_rep", "main") + assoc("a_saas", "review", "approve", "reject")
        + assoc("a_mail", "credentials", "rejectmail")
        + inc("main", "info", "docs", "submit", "save", "review", "approve", "account", "credentials")
        + [Relation("correct", "main", "extend", "information ou document manquant"),
           Relation("reject", "main", "extend", "dossier non conforme"),
           Relation("reject", "rejectmail", "include")],
        "UC-04_Inscription_concessionnaire.drawio",
    ),
    Diagram(
        "UC-05",
        "Gérer et publier un produit concessionnaire",
        "Catalogue centralisé, stock et publication dans une marketplace partenaire",
        [
            actor("a_dealer", "Concessionnaire", "left", 430),
            actor("a_bank", "Administrateur Banque", "right", 430, True),
        ],
        [
            uc("main", "Gérer et publier<br>un produit", 700, 145, "main", 500, 88),
            uc("edit", "1. Créer ou modifier<br>un produit", 300, 315),
            uc("details", "2. Renseigner les informations,<br>documents et le stock", 300, 430, w=370, h=72),
            uc("bank", "3. Sélectionner une<br>banque partenaire", 300, 555),
            uc("submit", "4. Soumettre le produit<br>pour publication", 300, 670),
            uc("review", "5. Examiner la proposition<br>de publication", 810, 315),
            uc("approve", "6. Approuver la publication", 810, 430),
            uc("publish", "7. Publier le produit dans<br>la marketplace", 810, 545),
            uc("follow", "8. Suivre les publications", 810, 660),
            uc("financing", "9. Consulter les demandes de<br>financement liées aux produits", 810, 775, w=390, h=72),
            uc("correct", "Corriger le produit", 1270, 320, "extend"),
            uc("reject", "Rejeter la publication", 1270, 500, "extend"),
            uc("block", "Bloquer la publication", 1270, 680, "extend"),
        ],
        assoc("a_dealer", "main")
        + assoc("a_bank", "review", "approve", "reject")
        + inc("main", "edit", "details", "bank", "submit", "review", "approve", "publish", "follow", "financing")
        + [Relation("correct", "main", "extend", "données incomplètes ou invalides"),
           Relation("reject", "review", "extend", "publication refusée"),
           Relation("block", "main", "extend", "partenariat ou contrat inactif")],
        "UC-05_Gestion_publication_produit.drawio",
    ),
    Diagram(
        "UC-06",
        "Déposer et traiter une demande de financement",
        "Constitution du dossier client, décision bancaire et mise à jour du stock",
        [
            actor("a_client", "Client", "left", 405),
            actor("a_bank", "Administrateur Banque", "right", 300, True),
            actor("a_dealer", "Concessionnaire", "right", 630, True),
            actor("a_mail", "Service e-mail", "right", 930, True),
        ],
        [
            uc("main", "Déposer et traiter une<br>demande de financement", 700, 140, "main", 500, 90),
            uc("product", "1. Consulter le produit", 280, 300),
            uc("start", "2. Démarrer la demande", 280, 410),
            uc("info", "3. Renseigner les informations<br>du dossier", 280, 520),
            uc("docs", "4. Déposer les pièces<br>justificatives", 280, 630),
            uc("submit", "5. Soumettre le dossier", 280, 740),
            uc("save", "6. Enregistrer la demande<br>au statut « en attente »", 760, 300),
            uc("notifybank", "7. Notifier<br>l’Administrateur Banque", 760, 410),
            uc("review", "8. Consulter le dossier<br>et les documents", 760, 520),
            uc("accept", "9. Accepter la demande", 760, 630),
            uc("status", "10. Mettre à jour le statut<br>du dossier", 760, 740),
            uc("notifyclient", "11. Notifier le client", 760, 850),
            uc("stock", "12. Mettre à jour le stock", 1240, 300),
            uc("dealeraccess", "13. Consulter le dossier lié<br>au produit", 1240, 410),
            uc("compare", "Comparer ou simuler", 1240, 575, "extend"),
            uc("correct", "Compléter ou corriger<br>le dossier", 1240, 735, "extend"),
            uc("reject", "Rejeter la demande<br>avec un motif", 1240, 895, "extend"),
        ],
        assoc("a_client", "main") + assoc("a_bank", "review", "accept", "reject")
        + assoc("a_dealer", "dealeraccess") + assoc("a_mail", "notifyclient", "reject")
        + inc("main", "product", "start", "info", "docs", "submit", "save", "notifybank", "review", "accept", "status", "notifyclient", "stock", "dealeraccess")
        + [Relation("compare", "product", "extend", "comparateur ou simulateur disponible"),
           Relation("correct", "main", "extend", "information ou pièce obligatoire manquante"),
           Relation("reject", "review", "extend", "dossier refusé")],
        "UC-06_Demande_financement.drawio",
    ),
]


def normalize_layout(diagram):
    """Apply a shared, low-crossing layout to every page.

    The main use case stays near the primary actor. Mandatory sub-functions fan out to two
    staggered columns on the right. Conditional extensions remain below the main case. This keeps
    association, include and extend lines visually distinct without changing the source semantics.
    """
    left_actors = [a for a in diagram.actors if not a.external]
    right_actors = [a for a in diagram.actors if a.external]
    if left_actors:
        step = 700 / max(1, len(left_actors) - 1) if len(left_actors) > 1 else 0
        for i, a in enumerate(left_actors):
            a.x = 45
            a.y = int(280 + i * step)
    if right_actors:
        step = 700 / max(1, len(right_actors) - 1) if len(right_actors) > 1 else 0
        for i, a in enumerate(right_actors):
            a.x = 1765
            a.y = int(245 + i * step)

    main_case = next(c for c in diagram.cases if c.kind == "main")
    main_case.x, main_case.y, main_case.w, main_case.h = 330, 480, 430, 92

    included = [c for c in diagram.cases if c.kind == "include"]
    split = math.ceil(len(included) / 2)
    columns = [included[:split], included[split:]]
    for column_index, column in enumerate(columns):
        if not column:
            continue
        start = 175 if column_index == 0 else 235
        end = 1040 if column_index == 0 else 1010
        spacing = (end - start) / max(1, len(column) - 1) if len(column) > 1 else 0
        for i, case in enumerate(column):
            case.x = 825 if column_index == 0 else 1260
            case.y = int(start + i * spacing)
            case.w = 350
            case.h = 70 if "<br>" in case.label else 64

    extensions = [c for c in diagram.cases if c.kind == "extend"]
    for i, case in enumerate(extensions):
        case.x = 360 + i * 55
        case.y = 705 + i * 145
        case.w = 450
        case.h = 90


for _diagram in DIAGRAMS:
    normalize_layout(_diagram)


def geometry(parent, x, y, w, h, relative=False):
    g = ET.SubElement(parent, "mxGeometry", {
        "x": str(x), "y": str(y), "width": str(w), "height": str(h),
        "relative": "1" if relative else "0", "as": "geometry"
    })
    return g


def cell(root, cid, value, style, x, y, w, h, vertex=True):
    attrs = {"id": cid, "value": value, "style": style, "parent": "1"}
    if vertex:
        attrs["vertex"] = "1"
    c = ET.SubElement(root, "mxCell", attrs)
    geometry(c, x, y, w, h)
    return c


def edge(root, eid, rel, index, positions):
    if rel.kind == "association":
        style = (
            "edgeStyle=none;rounded=0;html=1;"
            f"strokeColor={COLORS['association']};strokeWidth=1.15;endArrow=none;"
        )
        value = ""
    else:
        label = "«include»" if rel.kind == "include" else "«extend»"
        value = label
        style = (
            "edgeStyle=none;rounded=0;html=1;"
            f"dashed=1;dashPattern=5 4;strokeColor={COLORS['dependency']};strokeWidth=1.25;"
            "endArrow=classic;endFill=1;endSize=9;labelBackgroundColor=#FFFFFF;"
            f"fontColor={COLORS['dependency_text']};fontFamily=Arial;fontSize=11;"
        )

    e = ET.SubElement(root, "mxCell", {
        "id": eid,
        "value": value,
        "style": style,
        "edge": "1",
        "parent": "1",
        "source": rel.source,
        "target": rel.target,
    })
    g = geometry(e, 0, 0, 0, 0, relative=True)
    if rel.kind == "association":
        source = positions.get(rel.source)
        target = positions.get(rel.target)
        if source and target:
            sx, sy, sw, sh = source
            tx, ty, tw, th = target
            points = ET.SubElement(g, "Array", {"as": "points"})
            if sx < BOUNDARY[0]:
                lane = BOUNDARY[0] + 18 + (index % 5) * 14
                ET.SubElement(points, "mxPoint", {"x": str(lane), "y": str(sy + sh / 2)})
                ET.SubElement(points, "mxPoint", {"x": str(lane), "y": str(ty + th / 2)})
            elif sx > BOUNDARY[0] + BOUNDARY[2]:
                lane = BOUNDARY[0] + BOUNDARY[2] + 18 + (index % 5) * 12
                ET.SubElement(points, "mxPoint", {"x": str(lane), "y": str(sy + sh / 2)})
                ET.SubElement(points, "mxPoint", {"x": str(lane), "y": str(ty + th / 2)})
    else:
        g.set("x", "0.55")
        g.set("y", str(-12 - (index % 2) * 10))
        ET.SubElement(g, "mxPoint", {"x": "0", "y": "0", "as": "offset"})


def build_graph(diagram):
    model = ET.Element("mxGraphModel", {
        "dx": "1422", "dy": "793", "grid": "1", "gridSize": "10", "guides": "1",
        "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": str(CANVAS_W), "pageHeight": str(CANVAS_H),
        "math": "0", "shadow": "0", "background": COLORS["page"],
    })
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    cell(
        root,
        "heading",
        f"<b>{diagram.code} — {html.escape(diagram.title)}</b><br>"
        f"<font color='#666666' style='font-size:12px'>{html.escape(diagram.subtitle)}</font>",
        "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;"
        "whiteSpace=wrap;fontFamily=Arial;fontColor=#444444;fontSize=18;fontStyle=0;",
        420,
        18,
        1080,
        60,
    )

    actor_style = (
        "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;"
        "whiteSpace=wrap;fontFamily=Arial;fontSize=14;fontStyle=0;strokeWidth=1.15;align=center;"
    )
    positions = {}
    for a in diagram.actors:
        style = actor_style + f"strokeColor={COLORS['actor']};fillColor=#FFFFFF;fontColor={COLORS['actor']};"
        actor_label = a.label
        if a.external:
            actor_label += "<br><font color='#666666' style='font-size:11px'>«système externe»</font>"
        cell(root, a.id, actor_label, style, a.x, a.y, 110, 120)
        positions[a.id] = (a.x, a.y, 110, 120)

    extend_conditions = {
        r.source: r.condition for r in diagram.relations if r.kind == "extend" and r.condition
    }
    for case in diagram.cases:
        if case.kind == "main":
            fill, stroke = COLORS["main_fill"], COLORS["main_stroke"]
        else:
            fill, stroke = COLORS["case_fill"], COLORS["case_stroke"]
        style = (
            "ellipse;whiteSpace=wrap;html=1;aspect=fixed=0;shadow=0;"
            f"fillColor={fill};strokeColor={stroke};strokeWidth=1.35;fontColor={COLORS['text']};"
            "fontFamily=Arial;fontSize=14;fontStyle=0;align=center;verticalAlign=middle;spacing=5;"
        )
        case_label = case.label
        if case.id in extend_conditions:
            case_label += (
                f"<br><font color='{COLORS['condition']}' style='font-size:10px'>["
                + html.escape(extend_conditions[case.id]) + "]</font>"
            )
        cell(root, case.id, case_label, style, case.x, case.y, case.w, case.h)
        positions[case.id] = (case.x, case.y, case.w, case.h)

    # Edges are appended after vertices; mxGraph still renders them correctly and keeps the file editable.
    for i, relation in enumerate(diagram.relations, 1):
        edge(root, f"e{i}", relation, i, positions)

    caption = f"Figure : Diagramme de cas d’utilisation détaillé — {html.escape(diagram.title)}"
    cell(root, "caption", caption,
         "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;"
         "fontFamily=Arial;fontColor=#444444;fontSize=16;fontStyle=0;", 410, 1214, 1100, 34)
    return model


def build_mxfile(diagrams):
    mxfile = ET.Element("mxfile", {
        "host": "app.diagrams.net",
        "modified": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "agent": "Codex",
        "version": "24.7.17",
        "type": "device",
        "compressed": "false",
    })
    for d in diagrams:
        page = ET.SubElement(mxfile, "diagram", {"id": uuid.uuid5(uuid.NAMESPACE_DNS, d.code).hex[:20], "name": f"{d.code} {d.title}"})
        page.append(build_graph(d))
    ET.indent(mxfile, space="  ")
    return ET.ElementTree(mxfile)


def write_drawio(path, diagrams):
    path.parent.mkdir(parents=True, exist_ok=True)
    build_mxfile(diagrams).write(path, encoding="utf-8", xml_declaration=True)


def font(size, bold=False):
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def hexrgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def wrap_plain(label):
    return html.unescape(label.replace("<br>", "\n").replace("<br/>", "\n"))


def ellipse_center(draw, box, fill, outline, width, label, label_font, text_color):
    draw.ellipse(box, fill=fill, outline=outline, width=width)
    plain = wrap_plain(label)
    bb = draw.multiline_textbbox((0, 0), plain, font=label_font, align="center", spacing=3)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x1, y1, x2, y2 = box
    draw.multiline_text(((x1 + x2 - tw) / 2, (y1 + y2 - th) / 2), plain, font=label_font, fill=text_color, align="center", spacing=3)


def actor_preview(draw, a):
    color = hexrgb(COLORS["actor"])
    cx, top = a.x + 55, a.y + 4
    draw.ellipse((cx - 15, top, cx + 15, top + 30), outline=color, width=3)
    draw.line((cx, top + 30, cx, top + 75), fill=color, width=3)
    draw.line((cx - 30, top + 48, cx + 30, top + 48), fill=color, width=3)
    draw.line((cx, top + 75, cx - 28, top + 104), fill=color, width=3)
    draw.line((cx, top + 75, cx + 28, top + 104), fill=color, width=3)
    label = wrap_plain(a.label)
    if a.external:
        label += "\n«système externe»"
    f = font(14)
    bb = draw.multiline_textbbox((0, 0), label, font=f, align="center", spacing=2)
    draw.multiline_text((cx - (bb[2] - bb[0]) / 2, a.y + 112), label, font=f, fill=color, align="center", spacing=2)


def center_of(pos):
    x, y, w, h = pos
    return x + w / 2, y + h / 2


def boundary_point(pos, toward):
    x, y, w, h = pos
    cx, cy = center_of(pos)
    tx, ty = toward
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    scale = min((w / 2) / max(abs(dx), 1e-6), (h / 2) / max(abs(dy), 1e-6))
    return cx + dx * scale, cy + dy * scale


def draw_arrow(draw, p1, p2, color, width=2, dashed=False, arrow=False):
    x1, y1 = p1
    x2, y2 = p2
    points = [(x1, y1), (x2, y2)]
    for a, b in zip(points, points[1:]):
        if dashed:
            length = math.dist(a, b)
            if length == 0:
                continue
            ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
            cursor = 0
            while cursor < length:
                end = min(cursor + 11, length)
                draw.line((a[0] + ux * cursor, a[1] + uy * cursor, a[0] + ux * end, a[1] + uy * end), fill=color, width=width)
                cursor += 18
        else:
            draw.line((*a, *b), fill=color, width=width)
    if arrow:
        ang = math.atan2(y2 - y1, x2 - x1)
        size = 13
        left = (x2 - size * math.cos(ang - 0.55), y2 - size * math.sin(ang - 0.55))
        right = (x2 - size * math.cos(ang + 0.55), y2 - size * math.sin(ang + 0.55))
        draw.line((*left, x2, y2, *right), fill=color, width=width)


def preview(diagram, path):
    img = Image.new("RGB", (CANVAS_W, CANVAS_H), hexrgb(COLORS["page"]))
    draw = ImageDraw.Draw(img)
    heading = f"{diagram.code} — {diagram.title}"
    heading_box = draw.textbbox((0, 0), heading, font=font(24, True))
    draw.text(((CANVAS_W - (heading_box[2] - heading_box[0])) / 2, 18), heading,
              font=font(24, True), fill=hexrgb(COLORS["caption"]))
    subtitle_box = draw.textbbox((0, 0), diagram.subtitle, font=font(14))
    draw.text(((CANVAS_W - (subtitle_box[2] - subtitle_box[0])) / 2, 53), diagram.subtitle,
              font=font(14), fill=hexrgb(COLORS["condition"]))

    positions = {a.id: (a.x, a.y, 110, 120) for a in diagram.actors}
    positions.update({c.id: (c.x, c.y, c.w, c.h) for c in diagram.cases})
    for relation_index, rel in enumerate(diagram.relations, 1):
        s, t = positions[rel.source], positions[rel.target]
        sc, tc = center_of(s), center_of(t)
        p1, p2 = boundary_point(s, tc), boundary_point(t, sc)
        if rel.kind == "association":
            sx, sy, sw, sh = s
            tx, ty, tw, th = t
            color = hexrgb(COLORS["association"])
            if sx < BOUNDARY[0]:
                p1 = (sx + sw, sy + sh / 2)
                p2 = (tx, ty + th / 2)
                lane = BOUNDARY[0] + 18 + (relation_index % 5) * 14
                draw.line((p1, (lane, p1[1]), (lane, p2[1]), p2), fill=color, width=2)
            elif sx > BOUNDARY[0] + BOUNDARY[2]:
                p1 = (sx, sy + sh / 2)
                p2 = (tx + tw, ty + th / 2)
                lane = BOUNDARY[0] + BOUNDARY[2] + 18 + (relation_index % 5) * 12
                draw.line((p1, (lane, p1[1]), (lane, p2[1]), p2), fill=color, width=2)
            else:
                draw_arrow(draw, p1, p2, color, 2)
        else:
            color = hexrgb(COLORS["dependency"])
            draw_arrow(draw, p1, p2, color, 2, dashed=True, arrow=True)
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            label = "«include»" if rel.kind == "include" else "«extend»"
            draw.text((mx + 5, my - 15), label, font=font(11), fill=hexrgb(COLORS["dependency_text"]))

    extend_conditions = {
        r.source: r.condition for r in diagram.relations if r.kind == "extend" and r.condition
    }
    for case in diagram.cases:
        if case.kind == "main":
            fill, stroke = COLORS["main_fill"], COLORS["main_stroke"]
        else:
            fill, stroke = COLORS["case_fill"], COLORS["case_stroke"]
        preview_label = case.label
        if case.id in extend_conditions:
            preview_label += "<br>[" + extend_conditions[case.id] + "]"
        ellipse_center(draw, (case.x, case.y, case.x + case.w, case.y + case.h), hexrgb(fill), hexrgb(stroke), 3,
                       preview_label, font(14 if case.kind != "extend" else 12), hexrgb(COLORS["text"]))
    for a in diagram.actors:
        actor_preview(draw, a)

    caption = f"Figure : Diagramme de cas d’utilisation détaillé — {diagram.title}"
    bb = draw.textbbox((0, 0), caption, font=font(16))
    draw.text(((CANVAS_W - (bb[2] - bb[0])) / 2, 1222), caption,
              font=font(16), fill=hexrgb(COLORS["caption"]))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=95)


def validate_drawio(path, expected_pages):
    tree = ET.parse(path)
    root = tree.getroot()
    assert root.tag == "mxfile"
    pages = root.findall("diagram")
    assert len(pages) == expected_pages
    for page in pages:
        graph = page.find("mxGraphModel")
        assert graph is not None
        cells = graph.findall("./root/mxCell")
        ids = {c.get("id") for c in cells}
        assert {"0", "1", "heading", "main", "caption"}.issubset(ids)
        for c in cells:
            if c.get("edge") == "1":
                assert c.get("source") in ids and c.get("target") in ids


def main():
    INDIVIDUAL.mkdir(parents=True)
    PREVIEWS.mkdir(parents=True)

    write_drawio(COMBINED, DIAGRAMS)
    validate_drawio(COMBINED, len(DIAGRAMS))

    individual_paths = []
    for diagram in DIAGRAMS:
        path = INDIVIDUAL / diagram.filename
        write_drawio(path, [diagram])
        validate_drawio(path, 1)
        individual_paths.append(path)
        preview(diagram, PREVIEWS / diagram.filename.replace(".drawio", ".png"))

    readme = OUT / "LISEZ-MOI.txt"
    readme.write_text(
        "DIAGRAMMES DE CAS D’UTILISATION DÉTAILLÉS — MATCHIA\n\n"
        "Le fichier Matchia_use_cases_detailles_style_diagramme_global.drawio contient les six diagrammes sous forme de pages.\n"
        "Le dossier diagrammes_individuels contient un fichier .drawio séparé pour chaque cas d’utilisation.\n"
        "Tous les objets, acteurs, libellés et connecteurs sont éditables dans diagrams.net / Draw.io.\n"
        "La charte reprend celle du diagramme global : fond blanc, acteurs gris, cas vert d’eau, cas principal bleu pâle, associations grises et dépendances UML turquoise.\n\n"
        "Ouverture : Fichier > Ouvrir depuis > Appareil, puis sélectionner le fichier .drawio.\n\n"
        "Ordre des pages :\n"
        + "\n".join(f"{i}. {d.code} — {d.title}" for i, d in enumerate(DIAGRAMS, 1))
        + "\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(COMBINED, COMBINED.name)
        zf.write(readme, readme.name)
        for path in individual_paths:
            zf.write(path, f"diagrammes_individuels/{path.name}")
        for path in sorted(PREVIEWS.glob("*.png")):
            zf.write(path, f"aperçus_png/{path.name}")

    print(f"combined={COMBINED}")
    print(f"archive={ARCHIVE}")
    print(f"individual_drawio={len(individual_paths)}")
    print(f"preview_png={len(list(PREVIEWS.glob('*.png')))}")
    print(f"combined_pages={len(ET.parse(COMBINED).getroot().findall('diagram'))}")


if __name__ == "__main__":
    main()
