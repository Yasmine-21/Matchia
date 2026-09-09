from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "document_work" / "architecture_diagrams_v2"
W, H = 1920, 1080
BLACK = "#171717"
GRAY = "#777777"
LIGHT = "#D8D8D8"
VERY_LIGHT = "#EEEEEE"
WHITE = "#FFFFFF"


def font(size, bold=False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def centered(draw, box, text, size=24, bold=False, fill=BLACK, spacing=5):
    x0, y0, x1, y1 = box
    f = font(size, bold)
    bb = draw.multiline_textbbox((0, 0), text, font=f, spacing=spacing, align="center")
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    draw.multiline_text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2), text,
                        font=f, fill=fill, spacing=spacing, align="center")


def box(draw, xy, title, detail, title_size=23, detail_size=18):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=12, fill=WHITE, outline=LIGHT, width=2)
    centered(draw, (x0 + 15, y0 + 15, x1 - 15, y0 + 58), title, title_size, True)
    centered(draw, (x0 + 15, y0 + 56, x1 - 15, y1 - 12), detail, detail_size, False, spacing=4)


def cylinder(draw, xy, title, detail):
    x0, y0, x1, y1 = xy
    cap_h = 42
    draw.rectangle((x0, y0 + cap_h / 2, x1, y1 - cap_h / 2), fill=WHITE, outline=LIGHT, width=2)
    draw.ellipse((x0, y0, x1, y0 + cap_h), fill=WHITE, outline=LIGHT, width=2)
    draw.arc((x0, y1 - cap_h, x1, y1), 0, 180, fill=LIGHT, width=2)
    draw.line((x0, y0 + cap_h / 2, x0, y1 - cap_h / 2), fill=LIGHT, width=2)
    draw.line((x1, y0 + cap_h / 2, x1, y1 - cap_h / 2), fill=LIGHT, width=2)
    centered(draw, (x0 + 14, y0 + 40, x1 - 14, y0 + 88), title, 22, True)
    centered(draw, (x0 + 14, y0 + 85, x1 - 14, y1 - 20), detail, 17, False, spacing=3)


def arrow(draw, points, fill=GRAY, width=2, head=11):
    draw.line(points, fill=fill, width=width, joint="curve")
    x0, y0 = points[-2]
    x1, y1 = points[-1]
    dx, dy = x1 - x0, y1 - y0
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    bx, by = x1 - ux * head, y1 - uy * head
    draw.polygon([(x1, y1), (bx + px * head * .55, by + py * head * .55),
                  (bx - px * head * .55, by - py * head * .55)], fill=fill)


def label(draw, center, text, size=17):
    f = font(size)
    bb = draw.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x, y = center
    draw.rounded_rectangle((x - tw / 2 - 7, y - th / 2 - 4,
                            x + tw / 2 + 7, y + th / 2 + 4), radius=4, fill=WHITE)
    draw.text((x - tw / 2, y - th / 2), text, font=f, fill=BLACK)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Cadre général et titre, fidèles au modèle fourni.
    draw.rounded_rectangle((42, 28, 1878, 1052), radius=7, fill=WHITE, outline=BLACK, width=3)
    centered(draw, (80, 44, 1840, 86), "Architecture physique de Matchia", 30, True)

    # Frontière de l'environnement applicatif.
    env = (420, 105, 1810, 670)
    draw.rectangle(env, fill=WHITE, outline=VERY_LIGHT, width=2)
    centered(draw, (env[0], 112, env[2], 143), "Environnement d’exécution Matchia", 18)

    users = (72, 365, 350, 535)
    frontend = (470, 350, 770, 545)
    backend = (980, 338, 1305, 557)
    database = (1510, 170, 1770, 355)
    storage = (1510, 425, 1770, 610)

    box(draw, users, "Utilisateurs",
        "Admin SaaS • Banque\nConcessionnaire • Client", 22, 18)
    box(draw, frontend, "Frontend",
        "React + TypeScript + Vite\nservi par Nginx", 22, 18)
    box(draw, backend, "Backend",
        "Spring Boot + Java 17\nAPI REST + Spring Security", 22, 18)
    cylinder(draw, database, "Base PostgreSQL",
             "Schéma partagé\ndonnées isolées par tenant")
    cylinder(draw, storage, "Stockage persistant",
             "Logos, bannières, contrats\net dossiers de financement")

    arrow(draw, [(350, 450), (465, 450)])
    label(draw, (407, 425), "HTTPS")
    arrow(draw, [(770, 450), (975, 450)])
    label(draw, (872, 425), "API REST / HTTPS")
    arrow(draw, [(1305, 390), (1505, 280)])
    label(draw, (1410, 315), "JDBC / JPA Hibernate")
    arrow(draw, [(1305, 488), (1505, 515)])
    label(draw, (1405, 474), "Lecture / écriture")

    # Services externes placés comme dans la référence.
    stripe = (1535, 730, 1735, 805)
    gemini = (1500, 855, 1770, 935)
    smtp = (1460, 940, 1810, 1030)
    box(draw, stripe, "Stripe", "Paiements", 19, 16)
    box(draw, gemini, "Google Gemini", "Assistant IA", 19, 16)
    box(draw, smtp, "Serveur SMTP", "E-mails et notifications", 19, 16)

    arrow(draw, [(1305, 520), (1530, 765)])
    label(draw, (1390, 620), "API HTTPS")
    arrow(draw, [(1305, 535), (1495, 895)])
    label(draw, (1372, 725), "API HTTPS")
    arrow(draw, [(1305, 548), (1455, 985)])
    label(draw, (1362, 810), "SMTP / TLS")

    path = OUT / "architecture_physique_matchia_modele_reference.png"
    img.save(path, quality=96)
    print(path)


if __name__ == "__main__":
    build()
