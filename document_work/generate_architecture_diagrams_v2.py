from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "document_work" / "architecture_diagrams_v2"
LOGO = ROOT / "MatchiaFrontend" / "public" / "logos" / "matchia-clear-full.png"

W, H = 1920, 1080
NAVY = "#0B2343"
INK = "#102A4C"
MUTED = "#5E6D83"
BLUE = "#246BCE"
ORANGE = "#F47A20"
GREEN = "#16865E"
PURPLE = "#7B4CB0"
LINE = "#CBD6E4"
BG = "#F6F8FC"
WHITE = "#FFFFFF"


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def text_center(draw, xy, value, size=28, color=INK, bold=False, spacing=8):
    x0, y0, x1, y1 = xy
    fnt = font(size, bold)
    box = draw.multiline_textbbox((0, 0), value, font=fnt, spacing=spacing, align="center")
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.multiline_text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2), value,
                        font=fnt, fill=color, spacing=spacing, align="center")


def rounded(draw, xy, fill=WHITE, outline=LINE, radius=24, width=3, shadow=True):
    x0, y0, x1, y1 = xy
    if shadow:
        draw.rounded_rectangle((x0 + 7, y0 + 9, x1 + 7, y1 + 9), radius=radius,
                               fill="#DDE4EF")
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw, points, color=BLUE, width=6, head=15):
    draw.line(points, fill=color, width=width, joint="curve")
    x0, y0 = points[-2]
    x1, y1 = points[-1]
    if abs(x1 - x0) >= abs(y1 - y0):
        if x1 >= x0:
            tri = [(x1, y1), (x1 - head, y1 - head * .65), (x1 - head, y1 + head * .65)]
        else:
            tri = [(x1, y1), (x1 + head, y1 - head * .65), (x1 + head, y1 + head * .65)]
    else:
        if y1 >= y0:
            tri = [(x1, y1), (x1 - head * .65, y1 - head), (x1 + head * .65, y1 - head)]
        else:
            tri = [(x1, y1), (x1 - head * .65, y1 + head), (x1 + head * .65, y1 + head)]
    draw.polygon(tri, fill=color)


def header(img, title, subtitle):
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 140), fill=NAVY)
    draw.text((68, 30), title, font=font(47, True), fill=WHITE)
    draw.text((70, 89), subtitle, font=font(22), fill="#C6D7ED")

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((310, 88), Image.Resampling.LANCZOS)
    alpha = logo.getchannel("A")
    box = alpha.getbbox()
    if box:
        logo = logo.crop(box)
        logo.thumbnail((310, 78), Image.Resampling.LANCZOS)
    img.alpha_composite(logo, (W - logo.width - 70, 31))


def layer(draw, y, h, index, eyebrow, title, detail, fill, stroke):
    x0, x1 = 150, 1770
    rounded(draw, (x0, y, x1, y + h), fill=fill, outline=stroke, radius=24, width=3)
    draw.ellipse((178, y + h/2 - 29, 236, y + h/2 + 29), fill=stroke)
    text_center(draw, (178, y + h/2 - 29, 236, y + h/2 + 29), str(index), 25, WHITE, True)
    draw.text((270, y + 21), eyebrow.upper(), font=font(17, True), fill=stroke)
    draw.text((270, y + 49), title, font=font(31, True), fill=INK)
    draw.text((270, y + 81), detail, font=font(19), fill=MUTED)


def build_logical():
    img = Image.new("RGBA", (W, H), BG)
    header(img, "Architecture logique de Matchia",
           "Architecture client–serveur en couches • MVC • monolithe modulaire multi-tenant")
    draw = ImageDraw.Draw(img)

    layer(draw, 195, 125, 1, "Vue / Présentation",
          "SPA React et espaces utilisateurs",
          "Pages, composants, layouts et routes : Public • Client • Banque • Concessionnaire • SaaS",
          "#EAF3FF", BLUE)
    arrow(draw, [(960, 320), (960, 354)], color="#6E87A8", width=5, head=13)

    layer(draw, 355, 125, 2, "Contrôleur / API REST",
          "Échanges HTTP et contrat applicatif",
          "Services Axios • contrôleurs Spring • DTO • validation • gestion normalisée des erreurs",
          "#FFF3E2", ORANGE)
    arrow(draw, [(960, 480), (960, 514)], color="#6E87A8", width=5, head=13)

    layer(draw, 515, 105, 3, "Sécurité transversale",
          "Authentification, autorisation et isolation du tenant",
          "Spring Security • JWT / refresh token • rôles • contexte bancaire et contrôles d’accès",
          "#F3ECFB", PURPLE)
    arrow(draw, [(960, 620), (960, 654)], color="#6E87A8", width=5, head=13)

    rounded(draw, (150, 655, 1770, 865), fill="#EAF8F2", outline=GREEN, radius=24, width=3)
    draw.ellipse((178, 681, 236, 739), fill=GREEN)
    text_center(draw, (178, 681, 236, 739), "4", 25, WHITE, True)
    draw.text((270, 676), "MODÈLE / SERVICES MÉTIER", font=font(17, True), fill=GREEN)
    draw.text((270, 705), "Monolithe modulaire organisé par domaines fonctionnels", font=font(31, True), fill=INK)

    domains = [
        "Administration SaaS", "Marketplaces\nStores & modules", "Abonnements\n& paiements",
        "Concessionnaires\n& produits", "Financement\n& contrats", "Notifications\n& assistant IA"
    ]
    x = 270
    for i, name in enumerate(domains):
        bw = 225
        bx = x + i * 240
        rounded(draw, (bx, 770, bx + bw, 838), fill=WHITE, outline="#B8DCCF", radius=16, width=2, shadow=False)
        text_center(draw, (bx + 6, 775, bx + bw - 6, 834), name, 17, INK, True, 4)

    arrow(draw, [(960, 865), (960, 899)], color="#6E87A8", width=5, head=13)
    rounded(draw, (150, 900, 1770, 1020), fill="#EEF2F7", outline="#69788D", radius=24, width=3)
    draw.ellipse((178, 931, 236, 989), fill="#69788D")
    text_center(draw, (178, 931, 236, 989), "5", 25, WHITE, True)
    draw.text((270, 921), "ACCÈS AUX DONNÉES ET PERSISTANCE", font=font(17, True), fill="#69788D")
    draw.text((270, 952), "Repositories Spring Data JPA • entités • mappers", font=font(29, True), fill=INK)
    draw.text((1015, 952), "PostgreSQL partagé • fichiers persistants", font=font(25, True), fill=INK)
    draw.line((965, 923, 965, 996), fill=LINE, width=3)

    img.convert("RGB").save(OUT / "architecture_logique_matchia.png", quality=96)


def node(draw, xy, kicker, title, lines, fill, stroke):
    x0, y0, x1, y1 = xy
    rounded(draw, xy, fill=fill, outline=stroke, radius=24, width=3)
    kicker_font = font(14, True)
    kicker_box = draw.textbbox((0, 0), kicker, font=kicker_font)
    kicker_width = max(111, kicker_box[2] - kicker_box[0] + 30)
    draw.rounded_rectangle((x0 + 24, y0 + 21, x0 + 24 + kicker_width, y0 + 52), radius=15, fill=stroke)
    text_center(draw, (x0 + 24, y0 + 21, x0 + 24 + kicker_width, y0 + 52), kicker, 14, WHITE, True)
    draw.text((x0 + 27, y0 + 72), title, font=font(28, True), fill=INK)
    draw.multiline_text((x0 + 27, y0 + 116), lines, font=font(19), fill=MUTED, spacing=8)


def build_physical():
    img = Image.new("RGBA", (W, H), BG)
    header(img, "Architecture physique de Matchia",
           "Composants techniques, communications et dépendances externes")
    draw = ImageDraw.Draw(img)

    # Azure execution boundary
    draw.rounded_rectangle((430, 205, 1410, 650), radius=34, fill="#F3F8FF", outline="#7EA7D8", width=4)
    draw.text((472, 229), "ENVIRONNEMENT D’EXÉCUTION MATCHIA", font=font(20, True), fill=BLUE)

    node(draw, (60, 342, 350, 578), "CLIENT", "Navigateur Web",
         "Interfaces Public, Client,\nBanque, SaaS et Dealer", "#EAF3FF", BLUE)

    node(draw, (500, 332, 850, 586), "FRONTEND", "Application Web",
         "React + TypeScript + Vite\nBuild statique servi par Nginx", "#EAF8F2", GREEN)

    node(draw, (995, 332, 1345, 586), "BACKEND", "API REST",
         "Spring Boot + Java 17\nAPI REST • Spring Security", "#FFF3E2", ORANGE)

    arrow(draw, [(350, 460), (495, 460)], color=BLUE, width=6, head=16)
    text_center(draw, (365, 416, 482, 448), "HTTPS", 17, MUTED, True)
    arrow(draw, [(850, 460), (990, 460)], color=BLUE, width=6, head=16)
    text_center(draw, (858, 416, 982, 448), "API REST", 17, MUTED, True)

    # Database outside the two application containers
    rounded(draw, (1535, 305, 1845, 575), fill="#F3ECFB", outline=PURPLE, radius=26, width=3)
    draw.ellipse((1580, 344, 1800, 400), fill="#E1D2F1", outline=PURPLE, width=3)
    draw.rectangle((1580, 371, 1800, 471), fill="#E1D2F1", outline=PURPLE, width=3)
    draw.arc((1580, 442, 1800, 498), 0, 180, fill=PURPLE, width=3)
    text_center(draw, (1585, 350, 1795, 483), "PostgreSQL", 26, INK, True)
    text_center(draw, (1562, 500, 1818, 553), "Base et schéma partagés\nIsolation logique par banque", 18, MUTED, True, 5)
    arrow(draw, [(1345, 460), (1530, 460)], color=PURPLE, width=6, head=16)
    text_center(draw, (1366, 416, 1514, 448), "JDBC / JPA", 17, MUTED, True)

    # External services
    draw.text((68, 782), "SERVICES EXTERNES APPELÉS PAR LE BACKEND", font=font(19, True), fill=MUTED)
    services = [
        ((220, 830, 610, 1000), "PAIEMENT", "Stripe", "Paiement et confirmation" , BLUE, "#EAF3FF"),
        ((765, 830, 1155, 1000), "INTELLIGENCE IA", "Google Gemini", "Génération et reformulation", GREEN, "#EAF8F2"),
        ((1310, 830, 1700, 1000), "MESSAGERIE", "Serveur SMTP", "E-mails et notifications", ORANGE, "#FFF3E2"),
    ]
    for xy, kicker, title, line, stroke, fill in services:
        node(draw, xy, kicker, title, line, fill, stroke)

    # Fan-out from backend to external dependencies
    draw.line((1170, 586, 1170, 768), fill="#6E87A8", width=4)
    draw.line((415, 768, 1505, 768), fill="#6E87A8", width=4)
    for cx in (415, 960, 1505):
        arrow(draw, [(cx, 768), (cx, 825)], color="#6E87A8", width=4, head=12)
    text_center(draw, (1075, 705, 1265, 740), "HTTPS / TLS", 16, MUTED, True)

    final_image = img.convert("RGB")
    final_image.save(OUT / "architecture_physique_matchia.png", quality=96)
    final_image.save(OUT / "architecture_physique_matchia_sans_stockage.png", quality=96)
    final_image.save(OUT / "architecture_physique_matchia_composants.png", quality=96)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_logical()
    build_physical()
    print(OUT / "architecture_logique_matchia.png")
    print(OUT / "architecture_physique_matchia.png")


if __name__ == "__main__":
    main()
