from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"D:\PFE M2\Platforme SaaS\document_work")
OUT = ROOT / "qa_drawio_editable_diagrams"
OUT.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path(r"C:\Windows\Fonts") / name), size)


def make_sheet(paths, output, columns=2, thumb_w=820, thumb_h=1050):
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_w, rows * (thumb_h + 70)), "#ECEFF3")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb_w - 30, thumb_h - 30), Image.Resampling.LANCZOS)
        x0 = (index % columns) * thumb_w
        y0 = (index // columns) * (thumb_h + 70)
        px = x0 + (thumb_w - image.width) // 2
        py = y0 + 55 + (thumb_h - image.height) // 2
        sheet.paste(image, (px, py))
        draw.text((x0 + 18, y0 + 14), path.stem, font=font(25, True), fill="#17324D")
    sheet.save(output)


activity_dir = ROOT / "diagrammes_activite_modele"
activity_names = [
    "AD-01_authentification.png",
    "AD-02_creation_demande_marketplace.png",
    "AD-03_traitement_demande_marketplace.png",
    "AD-04_renouvellement_extension_abonnement.png",
    "AD-05_parcours_concessionnaire.png",
    "AD-06_parcours_client.png",
]
sequence_dir = ROOT / "diagrammes_sequence_matchia"
sequence_names = [f"SD-{i:02d}_{slug}.png" for i, slug in enumerate([
    "authentification",
    "creation_demande_marketplace",
    "traitement_demande_stripe",
    "inscription_concessionnaire",
    "gestion_produit",
    "inscription_client",
    "demande_financement",
    "assistant_saas",
    "chatbot_marketplace",
], 1)]

make_sheet([activity_dir / name for name in activity_names], OUT / "activites_contact.png")
make_sheet([sequence_dir / name for name in sequence_names], OUT / "sequences_contact.png", columns=2, thumb_w=900, thumb_h=1050)
print(OUT)
