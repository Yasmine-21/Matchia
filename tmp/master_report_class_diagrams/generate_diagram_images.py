import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

FONT = r"C:\Windows\Fonts\arial.ttf"
BOLD = r"C:\Windows\Fonts\arialbd.ttf"

COLORS = {
    "shared": (47, 93, 124),
    "saas": (107, 79, 163),
    "catalogue": (47, 125, 91),
    "dealer": (184, 92, 0),
    "finance": (34, 94, 168),
    "security": (156, 47, 98),
}

FILLS = {
    "shared": (234, 242, 248),
    "saas": (243, 238, 255),
    "catalogue": (236, 248, 241),
    "dealer": (255, 242, 230),
    "finance": (234, 243, 255),
    "security": (253, 238, 245),
}

def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def text_box(draw, xy, text, fnt, fill, anchor="mm"):
    box = draw.textbbox(xy, text, font=fnt, anchor=anchor)
    pad = 5
    draw.rectangle((box[0]-pad, box[1]-pad, box[2]+pad, box[3]+pad), fill="white")
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor)

def entity(draw, spec, compact=False):
    x, y, w, h = spec["box"]
    group = spec.get("group", "shared")
    stroke = COLORS[group]
    fill = FILLS[group]
    header_h = 68 if not compact else h
    draw.rounded_rectangle((x, y, x+w, y+h), radius=8, fill=fill, outline=stroke, width=4)
    draw.rectangle((x+2, y+2, x+w-2, y+header_h), fill=stroke)
    title_size = 31 if not compact else 29
    draw.text((x+w/2, y+header_h/2), spec["name"], font=font(title_size, True), fill="white", anchor="mm")
    if not compact:
        attrs = spec.get("attrs", [])
        yy = y + header_h + 16
        for attr in attrs[:3]:
            draw.text((x+16, yy), f"- {attr}", font=font(22), fill=(25, 43, 61), anchor="la")
            yy += 31

def intersection_point(a, b):
    ax, ay, aw, ah = a["box"]
    bx, by, bw, bh = b["box"]
    acx, acy = ax+aw/2, ay+ah/2
    bcx, bcy = bx+bw/2, by+bh/2
    if abs(bcx-acx) >= abs(bcy-acy):
        if bcx >= acx:
            return (ax+aw, acy), (bx, bcy)
        return (ax, acy), (bx+bw, bcy)
    if bcy >= acy:
        return (acx, ay+ah), (bcx, by)
    return (acx, ay), (bcx, by+bh)

def edge(draw, nodes, spec):
    source = nodes[spec[0]]
    target = nodes[spec[1]]
    label = spec[2]
    source_mult = spec[3] if len(spec) > 3 else ""
    target_mult = spec[4] if len(spec) > 4 else ""
    dashed = len(spec) > 5 and spec[5] == "dashed"
    p1, p2 = intersection_point(source, target)
    if abs(p2[0]-p1[0]) >= abs(p2[1]-p1[1]):
        mid = (p1[0]+p2[0])/2
        points = [p1, (mid, p1[1]), (mid, p2[1]), p2]
    else:
        mid = (p1[1]+p2[1])/2
        points = [p1, (p1[0], mid), (p2[0], mid), p2]
    color = (86, 101, 116)
    if dashed:
        for a, b in zip(points, points[1:]):
            length = max(abs(b[0]-a[0]), abs(b[1]-a[1]))
            steps = max(1, int(length/18))
            for i in range(0, steps, 2):
                t1, t2 = i/steps, min(1, (i+1)/steps)
                q1 = (a[0]+(b[0]-a[0])*t1, a[1]+(b[1]-a[1])*t1)
                q2 = (a[0]+(b[0]-a[0])*t2, a[1]+(b[1]-a[1])*t2)
                draw.line((q1, q2), fill=color, width=4)
    else:
        draw.line(points, fill=color, width=4, joint="curve")
    # Les rôles sont explicités dans le texte du rapport. La figure conserve
    # les multiplicités UML, sans libellés centraux susceptibles de se croiser.
    if source_mult:
        draw.text((p1[0]+8, p1[1]-8), source_mult, font=font(18, True), fill=(17, 24, 39), anchor="lb")
    if target_mult:
        draw.text((p2[0]-8, p2[1]-8), target_mult, font=font(18, True), fill=(17, 24, 39), anchor="rb")

def render(path, title, specs, edges, compact=False, size=(2200, 1300), note=None):
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    draw.text((size[0]/2, 42), title, font=font(36, True), fill=(22, 50, 79), anchor="mm")
    draw.line((70, 78, size[0]-70, 78), fill=(203, 213, 225), width=3)
    nodes = {spec["name"]: spec for spec in specs}
    for relation in edges:
        edge(draw, nodes, relation)
    for spec in specs:
        entity(draw, spec, compact=compact)
    if note:
        draw.text((size[0]/2, size[1]-28), note, font=font(17), fill=(75, 85, 99), anchor="mm")
    image.save(path, dpi=(300, 300), optimize=True)

def n(name, x, y, group, attrs=(), w=390, h=175):
    return {"name": name, "box": (x, y, w, h), "group": group, "attrs": list(attrs)}

# Global overview: principal entities only, with no attributes to keep it readable.
global_specs = [
    n("Request", 80, 190, "saas", w=300, h=92),
    n("Subscription", 80, 390, "saas", w=300, h=92),
    n("Payment", 80, 590, "saas", w=300, h=92),
    n("Bank", 820, 130, "shared", w=300, h=92),
    n("Marketplace", 820, 330, "catalogue", w=300, h=92),
    n("Store", 610, 550, "catalogue", w=300, h=92),
    n("Module", 1030, 550, "catalogue", w=300, h=92),
    n("Content", 820, 760, "catalogue", w=300, h=92),
    n("Dealer", 1640, 170, "dealer", w=300, h=92),
    n("Partnership", 2020, 330, "dealer", w=310, h=92),
    n("Contract", 2020, 520, "dealer", w=310, h=92),
    n("DealerProduct", 1640, 600, "dealer", w=300, h=92),
    n("PublicationRequest", 1980, 790, "dealer", w=350, h=92),
    n("User", 450, 990, "security", w=300, h=92),
    n("FinancingRequest", 980, 990, "finance", w=350, h=92),
    n("RequestDocument", 1500, 990, "finance", w=350, h=92),
    n("Notification", 500, 1190, "security", w=320, h=92),
    n("AuditLog", 980, 1190, "security", w=300, h=92),
]
global_edges = [
    ("Bank", "Marketplace", "1 / 0..1", "1", "0..1"),
    ("Bank", "Request", "demandes", "0..1", "0..*"),
    ("Request", "Subscription", "crée", "1", "0..1"),
    ("Request", "Payment", "paiements", "1", "0..*"),
    ("Marketplace", "Store", "catalogue", "1", "0..*"),
    ("Store", "Module", "configuration", "0..*", "0..*"),
    ("Store", "Content", "contenus", "1", "0..*"),
    ("Bank", "Partnership", "partenariats", "1", "0..*"),
    ("Dealer", "Partnership", "partenariats", "1", "0..*"),
    ("Partnership", "Contract", "versions", "1", "0..*"),
    ("Dealer", "DealerProduct", "catalogue", "1", "0..*"),
    ("DealerProduct", "PublicationRequest", "publication", "1", "0..*"),
    ("User", "FinancingRequest", "client", "1", "0..*"),
    ("DealerProduct", "FinancingRequest", "produit", "1", "0..*"),
    ("FinancingRequest", "RequestDocument", "pièces", "1", "0..*"),
    ("Notification", "User", "destinataire", "0..*", "0..1", "dashed"),
    ("AuditLog", "Bank", "traçabilité", "0..*", "0..1", "dashed"),
]
render(OUT / "diagramme_global.png", "Vue globale du modèle de classes Matchia", global_specs, global_edges, compact=True, size=(2400, 1400), note="Les traits pointillés représentent des références logiques sans clé étrangère directe.")

saas_specs = [
    n("Bank", 80, 150, "shared", ("id : Long", "slug : String")),
    n("Marketplace", 550, 150, "catalogue", ("id : Long", "status : Enum")),
    n("Request", 1020, 150, "saas", ("id : Long", "status : Enum", "totalAmount : Double"), h=205),
    n("Subscription", 1510, 150, "saas", ("id : Long", "status : Enum")),
    n("Payment", 1510, 480, "saas", ("id : Long", "amount : Double", "status : Enum"), h=205),
    n("RequestStoreSelection", 550, 520, "saas", ("storeId : Long", "storeName : String"), w=430),
    n("RequestModuleSelection", 1030, 520, "saas", ("moduleId : Long", "moduleName : String"), w=450),
    n("Store", 400, 900, "catalogue", ("id : Long", "name : String")),
    n("Module", 1120, 900, "catalogue", ("id : Long", "name : String")),
]
saas_edges = [
    ("Bank", "Marketplace", "possède", "1", "0..1"), ("Bank", "Request", "demandes", "0..1", "0..*"),
    ("Request", "RequestStoreSelection", "snapshot", "1", "0..*"),
    ("RequestStoreSelection", "RequestModuleSelection", "modules", "1", "0..*"),
    ("RequestStoreSelection", "Store", "storeId", "0..*", "0..1", "dashed"),
    ("RequestModuleSelection", "Module", "moduleId", "0..*", "0..1", "dashed"),
    ("Request", "Subscription", "activation", "1", "0..1"),
    ("Request", "Payment", "paiements", "1", "0..*"),
    ("Subscription", "Payment", "historique", "0..1", "0..*"),
]
render(OUT / "diagramme_saas.png", "Noyau SaaS demandes abonnements et paiements", saas_specs, saas_edges)

catalogue_specs = [
    n("Bank", 80, 150, "shared", ("id : Long", "slug : String")),
    n("Marketplace", 550, 150, "catalogue", ("id : Long", "primaryColor : String")),
    n("MarketplaceStore", 1050, 150, "catalogue", ("enabled : Boolean", "displayOrder : Integer"), w=430),
    n("Store", 1550, 150, "catalogue", ("id : Long", "name : String", "price : Decimal"), h=205),
    n("Module", 80, 540, "catalogue", ("id : Long", "name : String")),
    n("ModuleStore", 550, 540, "catalogue", ("enabled : Boolean", "customPrice : Decimal")),
    n("ModuleStoreParameter", 1050, 540, "catalogue", ("code : String", "value : String"), w=460),
    n("Content", 1550, 540, "catalogue", ("title : String", "status : Enum")),
    n("ContentVisibility", 1550, 900, "catalogue", ("visible : Boolean", "id : Long"), w=430),
    n("ProductParameterDefinition", 550, 900, "catalogue", ("name : String", "createdAt : DateTime"), w=500),
]
catalogue_edges = [
    ("Bank", "Marketplace", "possède", "1", "0..1"),
    ("Marketplace", "MarketplaceStore", "affecte", "1", "0..*"),
    ("Store", "MarketplaceStore", "affectations", "1", "0..*"),
    ("Store", "ModuleStore", "configure", "1", "0..*"),
    ("Module", "ModuleStore", "configure", "1", "0..*"),
    ("ModuleStore", "ModuleStoreParameter", "paramètres", "1", "0..*"),
    ("Store", "Content", "contenus", "1", "0..*"),
    ("Content", "ContentVisibility", "visibilités", "1", "0..*"),
    ("Marketplace", "ContentVisibility", "règles", "1", "0..*"),
    ("Store", "ProductParameterDefinition", "schéma", "1", "0..*"),
]
render(OUT / "diagramme_catalogue.png", "Catalogue marketplace stores et modules", catalogue_specs, catalogue_edges)

dealer_specs = [
    n("Bank", 80, 150, "shared", ("id : Long", "name : String")),
    n("Store", 550, 150, "catalogue", ("id : Long", "name : String")),
    n("Dealer", 1020, 150, "dealer", ("companyName : String", "status : Enum")),
    n("User", 1510, 150, "security", ("email : String", "role : Enum")),
    n("DealerBankPartnership", 80, 540, "dealer", ("status : Enum", "requestDate : DateTime"), w=470),
    n("PartnershipContract", 620, 540, "dealer", ("contractNumber : String", "versionNumber : Integer"), w=450),
    n("DealerProduct", 1140, 540, "dealer", ("name : String", "price : Decimal", "availableStock : Integer"), h=205),
    n("ProductPublicationRequest", 1620, 540, "dealer", ("status : Enum", "submittedAt : DateTime"), w=500),
    n("DealerProductDocument", 620, 930, "dealer", ("documentType : String", "filePath : String"), w=450),
    n("DealerProductCatalogImage", 1140, 930, "dealer", ("imageUrl : String", "displayOrder : Integer"), w=500),
]
dealer_edges = [
    ("Dealer", "User", "comptes", "0..1", "0..*"), ("Store", "Dealer", "spécialité", "1", "0..*"),
    ("Dealer", "DealerBankPartnership", "partenariats", "1", "0..*"),
    ("Bank", "DealerBankPartnership", "partenariats", "1", "0..*"),
    ("Store", "DealerBankPartnership", "périmètre", "1", "0..*"),
    ("DealerBankPartnership", "PartnershipContract", "versions", "1", "0..*"),
    ("Dealer", "DealerProduct", "catalogue", "1", "0..*"),
    ("DealerProduct", "ProductPublicationRequest", "publication", "1", "0..*"),
    ("DealerProduct", "DealerProductDocument", "documents", "1", "0..*"),
    ("DealerProduct", "DealerProductCatalogImage", "galerie", "1", "0..*"),
]
render(OUT / "diagramme_dealer.png", "Concessionnaires partenariats contrats et publication", dealer_specs, dealer_edges)

finance_specs = [
    n("User", 80, 150, "security", ("id : Long", "email : String")),
    n("Bank", 550, 150, "shared", ("id : Long", "name : String")),
    n("Store", 1020, 150, "catalogue", ("id : Long", "name : String")),
    n("DealerProduct", 1510, 150, "dealer", ("id : Long", "name : String", "price : Decimal"), h=205),
    n("FinancingRequest", 780, 520, "finance", ("reference : String", "requestedAmount : Decimal", "status : Enum"), w=470, h=205),
    n("FinancingRequestDocument", 80, 900, "finance", ("documentType : String", "storedFilename : String"), w=500),
    n("RequiredFinancingDocument", 650, 900, "finance", ("documentType : String", "required : Boolean"), w=500),
    n("Notification", 1320, 900, "security", ("recipientId : Long", "status : Enum")),
]
finance_edges = [
    ("User", "FinancingRequest", "client", "1", "0..*"), ("Bank", "FinancingRequest", "traite", "1", "0..*"),
    ("Store", "FinancingRequest", "type", "1", "0..*"),
    ("DealerProduct", "FinancingRequest", "produit", "1", "0..*"),
    ("FinancingRequest", "FinancingRequestDocument", "pièces", "1", "0..*"),
    ("Bank", "RequiredFinancingDocument", "exigences", "1", "0..*"),
    ("Store", "RequiredFinancingDocument", "exigences", "1", "0..*"),
    ("Notification", "FinancingRequest", "relatedRequestId", "0..*", "0..1", "dashed"),
]
render(OUT / "diagramme_financement.png", "Client simulation et demande de financement", finance_specs, finance_edges, note="DealerProduct constitue l’unique source produit fonctionnelle du financement.")

security_specs = [
    n("User", 80, 150, "security", ("email : String", "role : Enum", "status : Enum"), h=205),
    n("Bank", 550, 150, "shared", ("id : Long", "slug : String")),
    n("Marketplace", 1020, 150, "catalogue", ("id : Long", "slug : String")),
    n("Request", 1510, 150, "saas", ("id : Long", "status : Enum")),
    n("RefreshToken", 80, 540, "security", ("tokenHash : String", "expiresAt : Instant")),
    n("PasswordResetToken", 550, 540, "security", ("tokenHash : String", "usedAt : Instant"), w=430),
    n("JoinEmailVerification", 1050, 540, "security", ("email : String", "consumedAt : Instant"), w=450),
    n("ClientRegistrationVerification", 1550, 540, "security", ("email : String", "expiresAt : Instant"), w=520),
    n("Notification", 420, 930, "security", ("recipientId : Long", "relatedRequestId : Long"), w=430),
    n("AuditLog", 1180, 930, "security", ("action : String", "resourceType : String", "createdAt : DateTime"), h=205),
]
security_edges = [
    ("Bank", "User", "utilisateurs", "0..1", "0..*"), ("Bank", "Marketplace", "marketplace", "1", "0..1"),
    ("Bank", "Request", "demandes", "0..1", "0..*"),
    ("User", "RefreshToken", "sessions", "1", "0..*"),
    ("User", "PasswordResetToken", "réinitialisations", "1", "0..*"),
    ("Bank", "ClientRegistrationVerification", "inscriptions", "1", "0..*"),
    ("Notification", "User", "recipientId", "0..*", "0..1", "dashed"),
    ("Notification", "Request", "relatedRequestId", "0..*", "0..1", "dashed"),
    ("AuditLog", "User", "actorId", "0..*", "0..1", "dashed"),
    ("AuditLog", "Bank", "bankId", "0..*", "0..1", "dashed"),
]
render(OUT / "diagramme_securite.png", "Authentification vérifications notifications et audit", security_specs, security_edges, note="Les vérifications par e-mail sont des workflows temporaires; certaines références d’audit sont polymorphes.")

print("Generated:")
for path in sorted(OUT.glob("*.png")):
    print(path)
