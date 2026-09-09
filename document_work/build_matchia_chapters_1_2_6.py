from pathlib import Path
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\PFE M2\Platforme SaaS")
MONOCHROME = "--monochrome" in sys.argv
OUT = ROOT / "document_work" / ("Rapport_Matchia_Chapitres_1_2_6_NoirBlanc.docx" if MONOCHROME else "Chapitres_1_2_6_Matchia.docx")
FIG = ROOT / "figure"
DIAGRAM = ROOT / "document_work" / "diagrams_matchia"

BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
INK = "0B2545"
LIGHT = "F4F6F9"
TABLE_FILL = "F4F6F9"
GRAY = "666666"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_geometry(table, widths):
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.first_child_found_in("w:tblW")
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(sum(widths)))
    tbl_w.set(qn("w:type"), "dxa")
    tbl_ind = tbl_pr.first_child_found_in("w:tblInd")
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), "120")
    tbl_ind.set(qn("w:type"), "dxa")
    grid = tbl.tblGrid
    for item in list(grid):
        grid.remove(item)
    for width in widths:
        gc = OxmlElement("w:gridCol")
        gc.set(qn("w:w"), str(width))
        grid.append(gc)
    for row in table.rows:
        for idx, cell in enumerate(row.cells):
            cell.width = Inches(widths[idx] / 1440)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(widths[idx]))
            tc_w.set(qn("w:type"), "dxa")
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    run.font.size = Pt(9)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def style_run(run, size=11, bold=False, color="000000", italic=False):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run.bold = bold
    run.italic = italic


def add_text(doc, text, bold_lead=None):
    p = doc.add_paragraph(style="Normal")
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.333
    if bold_lead and text.startswith(bold_lead):
        style_run(p.add_run(bold_lead), bold=True)
        style_run(p.add_run(text[len(bold_lead):]))
    else:
        style_run(p.add_run(text))
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    style_run(run, size={1:16, 2:13, 3:12}[level], bold=True, color={1:BLUE,2:BLUE,3:DARK_BLUE}[level])
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(text)
    style_run(run, size=10, italic=True, color=GRAY)
    return p


def add_callout(doc, title, body):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360])
    set_repeat_table_header(table.rows[0])
    cell = table.cell(0, 0)
    set_cell_shading(cell, LIGHT)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    style_run(p.add_run(title), size=11, bold=True, color=DARK_BLUE)
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.2
    style_run(p2.add_run(body), size=10.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_table(doc, headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    set_table_geometry(table, widths)
    header = table.rows[0]
    set_repeat_table_header(header)
    for i, title in enumerate(headers):
        cell = header.cells[i]
        set_cell_shading(cell, TABLE_FILL)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        style_run(p.add_run(title), size=10, bold=True, color=DARK_BLUE)
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.08
            style_run(p.add_run(value), size=9.4)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_figure(doc, filename, caption, intro, interpretation, width=6.15):
    add_text(doc, intro)
    path = FIG / filename
    if path.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_together = True
        run = p.add_run()
        run.add_picture(str(path), width=Inches(width))
        for doc_pr in run._r.xpath('.//wp:docPr'):
            doc_pr.set('descr', caption)
            doc_pr.set('title', caption)
        add_caption(doc, caption)
        add_text(doc, interpretation)
    else:
        add_callout(doc, "Figure non insérée", f"La capture attendue « {filename} » n'a pas été trouvée dans le dossier figure.")


def font(size, bold=False):
    path = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
    return ImageFont.truetype(path, size)


def rounded(draw, xy, text, fill, outline="#FFFFFF", text_color="#FFFFFF", size=24):
    draw.rounded_rectangle(xy, radius=18, fill=fill, outline=outline, width=2)
    x1, y1, x2, y2 = xy
    max_width = x2 - x1 - 28
    words = text.split()
    lines, line = [], ""
    f = font(size, True)
    for word in words:
        candidate = (line + " " + word).strip()
        if draw.textbbox((0, 0), candidate, font=f)[2] <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    h = sum(draw.textbbox((0, 0), l, font=f)[3] - draw.textbbox((0, 0), l, font=f)[1] for l in lines) + (len(lines)-1)*6
    yy = (y1+y2-h)//2
    for line in lines:
        box = draw.textbbox((0, 0), line, font=f)
        draw.text(((x1+x2-(box[2]-box[0]))//2, yy), line, font=f, fill=text_color)
        yy += (box[3]-box[1])+6


def arrow(draw, start, end, color="#355C9A", width=6):
    draw.line([start, end], fill=color, width=width)
    x1, y1 = start; x2, y2 = end
    if abs(x2-x1) >= abs(y2-y1):
        pts = [(x2, y2), (x2-16 if x2>x1 else x2+16, y2-10), (x2-16 if x2>x1 else x2+16, y2+10)]
    else:
        pts = [(x2, y2), (x2-10, y2-16 if y2>y1 else y2+16), (x2+10, y2-16 if y2>y1 else y2+16)]
    draw.polygon(pts, fill=color)


def diagram_canvas(title):
    img = Image.new("RGB", (1800, 960), "#F7F9FC")
    d = ImageDraw.Draw(img)
    d.rectangle((0,0,1800,110), fill="#0B2545")
    d.text((70, 32), title, font=font(42, True), fill="white")
    return img, d


def create_diagrams():
    DIAGRAM.mkdir(parents=True, exist_ok=True)
    # Global use cases
    img, d = diagram_canvas("Diagramme de cas d'utilisation global - Matchia")
    # Le nom de la plateforme est placé en tête du conteneur central afin de
    # laisser la zone des cas d'utilisation entièrement lisible.
    d.rounded_rectangle((650,220,1150,750), radius=24, fill="#176B87", outline="#176B87")
    d.text((800,235), "MATCHIA", font=font(34, True), fill="white")
    usecases = [
        (710,290,"Gouverner\nla plateforme"), (940,290,"Configurer\nla marketplace"),
        (710,445,"Gérer partenaires\net publications"), (940,445,"Financer et\nsuivre les dossiers"),
        (825,600,"Payer, notifier\net auditer"),
    ]
    for x,y,t in usecases:
        d.ellipse((x,y,x+230,y+100), fill="#F3C969", outline="#FFFFFF", width=2)
        bb=d.textbbox((0,0),t,font=font(20,True)); d.multiline_text((x+115-(bb[2]-bb[0])/2,y+25),t,font=font(20,True),fill="#0B2545",align="center")
    actors=[(65,185,"Administrateur\nSaaS","#355C9A"),(65,420,"Administrateur\nBanque","#6A4C93"),(65,660,"Concessionnaire","#A23E48"),(1350,220,"Client","#2A9D8F"),(1350,430,"Internaute","#E76F51"),(1350,640,"Stripe / Gemini\n/ SMTP","#B88917")]
    for x,y,t,c in actors:
        rounded(d,(x,y,x+270,y+125),t,c,size=22)
        arrow(d,(x+270,y+62) if x<500 else (x,y+62),(650,y+62 if y<750 else 600),"#7E8A97",3)
    img.save(DIAGRAM / "use_cases_global.png")
    # Global class diagram
    img, d = diagram_canvas("Diagramme de classes global - Matchia")
    def class_box(x1, y1, x2, y2, name, attributes, fill):
        d.rounded_rectangle((x1, y1, x2, y2), radius=16, fill="white", outline=fill, width=4)
        d.rounded_rectangle((x1, y1, x2, y1+58), radius=16, fill=fill, outline=fill, width=2)
        d.rectangle((x1, y1+38, x2, y1+58), fill=fill)
        title_font = font(23, True); body_font = font(18)
        bb = d.textbbox((0,0), name, font=title_font)
        d.text(((x1+x2-(bb[2]-bb[0]))//2, y1+14), name, font=title_font, fill="white")
        yy = y1 + 76
        for attribute in attributes:
            d.text((x1+18, yy), attribute, font=body_font, fill="#0B2545")
            yy += 27

    class_box(65, 185, 430, 430, "Bank (Tenant)", ["id", "name", "status", "branding"], "#355C9A")
    class_box(535, 185, 900, 430, "Marketplace", ["id", "subdomain", "isActive", "bankId"], "#6A4C93")
    class_box(1005, 185, 1370, 430, "Store / Module", ["id", "name", "visible", "category"], "#2A9D8F")
    class_box(1420, 185, 1740, 430, "User", ["id", "email", "role", "bankId"], "#E76F51")
    class_box(65, 585, 430, 850, "Dealer", ["id", "company", "status", "storeId"], "#A23E48")
    class_box(535, 585, 900, 850, "Product", ["id", "name", "stock", "dealerId"], "#B88917")
    class_box(1005, 585, 1370, 850, "FinancingRequest", ["id", "status", "amount", "bankId"], "#176B87")
    class_box(1420, 585, 1740, 850, "Subscription", ["id", "status", "plan", "bankId"], "#5C7F71")
    arrow(d, (430, 308), (535, 308), "#355C9A", 4); d.text((455, 275), "1     1", font=font(16, True), fill="#355C9A")
    arrow(d, (900, 308), (1005, 308), "#2A9D8F", 4); d.text((918, 275), "*     *", font=font(16, True), fill="#2A9D8F")
    arrow(d, (430, 718), (535, 718), "#A23E48", 4); d.text((448, 685), "1     *", font=font(16, True), fill="#A23E48")
    arrow(d, (900, 718), (1005, 718), "#176B87", 4); d.text((920, 685), "1     *", font=font(16, True), fill="#176B87")
    d.text((585, 905), "Les attributs sont volontairement synthétiques : le diagramme décrit les agrégats métier et les relations tenantisées.", font=font(19), fill="#0B2545")
    img.save(DIAGRAM / "global_class.png")
    # Activity diagram: financing workflow
    img, d = diagram_canvas("Diagramme d'activité - Demande de financement")
    def activity_box(x1, y1, x2, y2, text, fill):
        rounded(d, (x1, y1, x2, y2), text, fill, size=22)
    def diamond(x, y, text, fill="#F3C969"):
        pts = [(x, y-62), (x+155, y), (x, y+62), (x-155, y)]
        d.polygon(pts, fill=fill, outline="#FFFFFF")
        lines = text.split("\n")
        yy = y - 22
        for line in lines:
            bb = d.textbbox((0,0), line, font=font(18, True))
            d.text((x-(bb[2]-bb[0])//2, yy), line, font=font(18, True), fill="#0B2545")
            yy += 23
    d.ellipse((850,145,920,215), fill="#2A9D8F", outline="white", width=3)
    d.text((860,170), "Début", font=font(15, True), fill="white")
    activity_box(690,250,1080,350,"Créer brouillon\net simulation", "#355C9A")
    diamond(885,430,"Pièces\ncomplètes ?")
    activity_box(1115,365,1530,495,"Ajouter / corriger\nles documents", "#E76F51")
    activity_box(690,525,1080,625,"Soumettre le dossier\n(PENDING)", "#6A4C93")
    activity_box(690,690,1080,790,"La banque du tenant\nexamine le dossier", "#176B87")
    diamond(885,865,"Dossier\naccepté ?")
    activity_box(200,800,600,920,"Rejeter avec motif\net notifier le client", "#A23E48")
    activity_box(1170,800,1590,920,"Accepter, notifier\net réserver le stock", "#2A9D8F")
    arrow(d,(885,215),(885,250)); arrow(d,(885,350),(885,368)); arrow(d,(885,492),(885,525)); arrow(d,(885,625),(885,690)); arrow(d,(885,790),(885,803))
    arrow(d,(1040,430),(1115,430)); arrow(d,(1320,495),(1320,555)); arrow(d,(1320,555),(1080,555)); d.text((1070,400), "Non", font=font(17, True), fill="#0B2545")
    arrow(d,(730,865),(600,865)); arrow(d,(1040,865),(1170,865)); d.text((665,835), "Non", font=font(17, True), fill="#0B2545"); d.text((1060,835), "Oui", font=font(17, True), fill="#0B2545")
    d.text((820,455), "Oui", font=font(17, True), fill="#0B2545")
    img.save(DIAGRAM / "financing_activity.png")
    # onboarding and payment
    img, d = diagram_canvas("Onboarding bancaire : validation, paiement et activation")
    steps=[("Banque\nsoumet sa demande","#355C9A"),("Sélection\nstores et modules","#6A4C93"),("SaaS valide\nou rejette","#E76F51"),("Stripe\nconfirme le paiement","#B88917"),("Activation\nbanque + marketplace","#2A9D8F")]
    x=65
    for i,(t,c) in enumerate(steps):
        rounded(d,(x,380,x+290,560),t,c,size=25)
        if i<len(steps)-1: arrow(d,(x+290,470),(x+350,470))
        x+=350
    d.text((170,690),"Si la demande est rejetée ou si le paiement n'est pas confirmé, l'activation n'est pas déclenchée.",font=font(26),fill="#0B2545")
    img.save(DIAGRAM / "onboarding_payment.png")
    # dealer
    img, d = diagram_canvas("Cycle concessionnaire : partenariat, contrat et publication")
    steps=[("Dossier dealer\nvalidé par SaaS","#355C9A"),("Demande de\npartenariat","#A23E48"),("Décision\nde la banque","#6A4C93"),("Contrat\nactif","#B88917"),("Publication\nproduit","#2A9D8F")]
    x=65
    for i,(t,c) in enumerate(steps):
        rounded(d,(x,355,x+290,565),t,c,size=25)
        if i<len(steps)-1: arrow(d,(x+290,460),(x+350,460))
        x+=350
    d.text((170,690),"La visibilité publique exige que le concessionnaire, le partenariat, le contrat, le store et la marketplace restent actifs.",font=font(25),fill="#0B2545")
    img.save(DIAGRAM / "dealer_publication.png")
    # financing
    img, d = diagram_canvas("Workflow de demande de financement")
    steps=[("Client simule\net crée un brouillon","#355C9A"),("Dépôt des\npièces requises","#6A4C93"),("Soumission\nPENDING","#E76F51"),("Banque accepte\nou rejette","#B88917"),("Notification client\n+ réservation stock","#2A9D8F")]
    x=65
    for i,(t,c) in enumerate(steps):
        rounded(d,(x,350,x+290,570),t,c,size=24)
        if i<len(steps)-1: arrow(d,(x+290,460),(x+350,460))
        x+=350
    d.text((205,700),"Le rejet exige un motif ; seule une banque du tenant concerné peut traiter le dossier.",font=font(26),fill="#0B2545")
    img.save(DIAGRAM / "financing_workflow.png")
    # AI
    img, d = diagram_canvas("Assistant IA : Text-to-SQL sécurisé et lecture seule")
    nodes=[("Admin SaaS\nQuestion",60,380,"#355C9A"),("API IA\nContexte",390,380,"#6A4C93"),("Gemini\nSQL proposé",720,380,"#E76F51"),("Validateur\nAllowlist",1050,380,"#B88917"),("PostgreSQL\nSELECT borné",1380,380,"#2A9D8F")]
    for i,(t,x,y,c) in enumerate(nodes):
        rounded(d,(x,y,x+270,y+180),t,c,size=25)
        if i<len(nodes)-1: arrow(d,(x+270,y+90),(x+330,y+90))
    d.text((240,700),"Les requêtes non SELECT, les colonnes sensibles, les jointures non autorisées et les résultats supérieurs à 50 lignes sont rejetés.",font=font(24),fill="#0B2545")
    img.save(DIAGRAM / "ai_secure_sequence.png")
    if MONOCHROME:
        # La variante imprimable conserve la géométrie et les légendes des
        # diagrammes tout en supprimant toute information chromatique.
        for path in DIAGRAM.glob("*.png"):
            Image.open(path).convert("L").save(path)


def add_diagram(doc, filename, caption, intro, interpretation, width=6.15):
    if MONOCHROME:
        caption = caption.replace("coloré", "en niveaux de gris").replace("colorée", "en niveaux de gris")
        intro = intro.replace("représentation colorée", "représentation en niveaux de gris")
        interpretation = interpretation.replace("Les couleurs", "Les nuances de gris")
    add_text(doc, intro)
    path = DIAGRAM / filename
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(str(path), width=Inches(width))
    for doc_pr in run._r.xpath('.//wp:docPr'):
        doc_pr.set('descr', caption)
        doc_pr.set('title', caption)
    add_caption(doc, caption)
    add_text(doc, interpretation)


def add_use_case(doc, title, actor, preconditions, nominal, alternatives, postconditions):
    add_heading(doc, title, 3)
    add_table(doc, ["Élément", "Description"], [
        ("Acteur principal", actor),
        ("Préconditions", preconditions),
        ("Scénario nominal", nominal),
        ("Scénarios alternatifs", alternatives),
        ("Postconditions", postconditions),
    ], [2100, 7260])


create_diagrams()
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(1)
section.bottom_margin = Inches(1)
section.left_margin = Inches(1)
section.right_margin = Inches(1)
section.header_distance = Inches(0.492)
section.footer_distance = Inches(0.492)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Calibri"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(8)
normal.paragraph_format.line_spacing = 1.333
for name, size, color, before, after in [
    ("Heading 1", 16, BLUE, 18, 10),
    ("Heading 2", 13, BLUE, 12, 6),
    ("Heading 3", 12, DARK_BLUE, 8, 4),
]:
    style = styles[name]
    style.font.name = "Calibri"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Calibri")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Calibri")
    style.font.size = Pt(size)
    style.font.color.rgb = RGBColor.from_string(color)
    style.font.bold = True
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)

header = section.header.paragraphs[0]
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
style_run(header.add_run("Matchia - Chapitres du mémoire PFE"), size=9, color=GRAY)
footer = section.footer.paragraphs[0]
add_page_number(footer)

# Cover
doc.add_paragraph().paragraph_format.space_after = Pt(80)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
style_run(p.add_run("MATCHIA"), size=28, bold=True, color=INK)
p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
style_run(p2.add_run("Plateforme SaaS multi-tenant de marketplaces bancaires"), size=15, color=DARK_BLUE)
doc.add_paragraph().paragraph_format.space_after = Pt(30)
p3 = doc.add_paragraph()
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
style_run(p3.add_run("Conception, développement et déploiement d’une plateforme SaaS multi-tenant\npour la gestion de marketplaces bancaires avec mise en place d’un pipeline CI/CD\n\nRapport de Projet de Fin d'Études - Master"), size=14, bold=True, color="000000")
doc.add_paragraph().paragraph_format.space_after = Pt(50)
meta = doc.add_table(rows=3, cols=2)
set_table_geometry(meta, [2600, 6760])
set_repeat_table_header(meta.rows[0])
for i, (label, value) in enumerate([
    ("Sujet", "Conception, développement et déploiement d’une plateforme SaaS multi-tenant pour la gestion de marketplaces bancaires avec mise en place d’un pipeline CI/CD"),
    ("Organisme d'accueil", "BRI Technology - informations institutionnelles à compléter et valider"),
    ("Version", "Document de rédaction fondé sur le code, les configurations et les captures disponibles"),
]):
    set_cell_shading(meta.cell(i,0), TABLE_FILL)
    style_run(meta.cell(i,0).paragraphs[0].add_run(label), size=10, bold=True, color=DARK_BLUE)
    style_run(meta.cell(i,1).paragraphs[0].add_run(value), size=10)
doc.add_page_break()

# Préambule
add_heading(doc, "Note de méthode", 1)
add_text(doc, "Le présent document est une rédaction directement intégrable dans le mémoire. Elle repose sur l'analyse du code source et des artefacts réellement présents dans le dépôt Matchia : application React/Vite, API Spring Boot, PostgreSQL, Dockerfiles, fichiers Docker Compose, Jenkinsfile, configurations SonarQube, documentations métier et captures du dossier figure. Lorsque l'information institutionnelle n'est pas vérifiable dans le dépôt, elle est signalée explicitement afin d'éviter toute affirmation non fondée.")
add_callout(doc, "Précaution de sécurité", "Certaines captures et fichiers locaux contiennent des valeurs de configuration ou des jetons. Ils ne doivent pas être reproduits dans le mémoire. Les captures proposées ci-dessous ont été sélectionnées pour leur valeur démonstrative ; toute valeur confidentielle doit être masquée avant l'impression ou la diffusion.")

# Chapitre 1
doc.add_page_break()
add_heading(doc, "Chapitre 1 - Cadre général, contexte et étude de l'existant", 1)
add_heading(doc, "1.1 Introduction", 2)
add_text(doc, "La transformation numérique du secteur bancaire ne se limite plus à la mise en ligne d'un catalogue institutionnel. Elle suppose la capacité de proposer des services configurables, de fédérer des partenaires, d'accompagner les clients dans leurs démarches et d'exploiter les données de manière maîtrisée. Dans ce cadre, le projet Matchia a pour ambition de mutualiser un socle applicatif tout en préservant l'identité et l'autonomie opérationnelle de chaque banque. Ce chapitre présente l'environnement général du projet, les insuffisances d'une approche fondée sur des marketplaces développées séparément, puis la réponse apportée par Matchia.")

add_heading(doc, "1.2 Présentation de l'organisme d'accueil", 2)
add_text(doc, "Les artefacts graphiques associés au projet identifient l'organisme d'accueil sous l'appellation BRI Technology. Le dépôt ne contient cependant ni fiche institutionnelle officielle, ni données vérifiables relatives à son effectif, à sa date de création, à ses marchés ou à son organigramme. Afin de conserver la rigueur académique attendue, ces informations doivent être complétées à partir d'une source validée par l'entreprise avant la remise finale.")
add_text(doc, "Dans le cadre du présent PFE, l'organisme d'accueil constitue le contexte de réalisation d'une solution de génie logiciel orientée services financiers numériques. Le projet mobilise une architecture web moderne, des pratiques de conteneurisation, des mécanismes de sécurité applicative et des outils d'industrialisation. Cette orientation est cohérente avec une activité de conception de solutions numériques : l'équipe de réalisation doit à la fois répondre à des besoins métier, garantir l'intégration de services externes et assurer la maintenabilité de la solution livrée.")
add_callout(doc, "Texte à compléter avant dépôt", "Insérer ici une brève présentation officielle de BRI Technology : activité, domaines d'expertise, localisation, taille ou organisation, ainsi que le rattachement exact du projet à l'équipe d'accueil. Cette complétion doit provenir d'une source institutionnelle et non être déduite du code source.")

add_heading(doc, "1.3 Contexte général du projet", 2)
add_text(doc, "Les banques cherchent à proposer des parcours digitaux continus, allant de la découverte d'une offre jusqu'au suivi d'une demande. Cette évolution implique la coexistence de plusieurs catégories de financement, de contenus marketing, de produits, de partenaires commerciaux et de profils utilisateurs. Lorsqu'une solution est conçue pour une seule banque, chaque nouvelle banque introduit une nouvelle variante de l'application, de ses règles de présentation et de ses données. La multiplication de ces variantes limite rapidement la capacité d'évolution du fournisseur de la solution.")
add_text(doc, "Matchia répond à cette problématique par une plateforme SaaS multi-tenant. Le modèle retenu repose sur un socle applicatif commun et sur une isolation logique des données. Une banque constitue un tenant possédant sa marketplace, son identité visuelle, ses utilisateurs, ses contenus, ses stores activés, ses modules et ses produits. Les stores et les modules sont administrés comme un catalogue mutualisé, puis configurés et rendus visibles au niveau de chaque marketplace. Ainsi, l'ajout d'une banque relève principalement d'un processus de configuration et d'activation plutôt que de la création d'une nouvelle application.")
add_text(doc, "Le besoin métier dépasse la mise à disposition d'une vitrine. La plateforme relie l'administrateur SaaS, qui gouverne l'écosystème, l'administrateur de banque, qui paramètre son tenant, le concessionnaire, qui gère ses produits et ses partenariats, et le client, qui consulte les offres et constitue un dossier de financement. L'architecture prend également en compte les abonnements et les paiements en ligne, les notifications, les emails, la traçabilité et un assistant IA réservé au pilotage SaaS. Matchia se positionne ainsi comme un environnement centralisé de création, d'exploitation et d'évolution de marketplaces bancaires.")

add_heading(doc, "1.4 Étude de l'existant", 2)
add_heading(doc, "1.4.1 Marketplaces développées séparément", 3)
add_text(doc, "Dans une approche traditionnelle, chaque banque dispose de sa propre marketplace, issue d'une copie de projet, d'une personnalisation manuelle ou d'un développement spécifique. Les couleurs, le catalogue, les contenus, les paramètres et parfois les processus sont modifiés directement dans une version dédiée du code. L'arrivée d'un nouveau client bancaire entraîne alors une phase de cadrage, de paramétrage technique, de tests et de mise en production distincte. Une correction fonctionnelle ou de sécurité doit ensuite être reportée dans plusieurs versions, avec un risque de divergence entre les installations.")
add_text(doc, "Cette organisation produit une duplication de code et de configuration. Elle augmente la charge de maintenance, rallonge les délais de livraison et crée une dépendance forte à l'équipe de développement pour des opérations qui pourraient être configurables. Plus le nombre de banques augmente, plus le coût marginal d'une nouvelle marketplace et le risque de régression deviennent élevés. L'approche est donc peu adaptée à un objectif de croissance multi-banques.")
add_heading(doc, "1.4.2 Demande de marketplace et onboarding traditionnel", 3)
add_text(doc, "Avant l'automatisation, une banque souhaitant disposer d'une marketplace échange directement avec le fournisseur de la solution. Les besoins sont exprimés au cours de réunions ou d'échanges administratifs, puis traduits manuellement en choix de fonctionnalités, catégories et éléments de branding. La configuration est réalisée par l'équipe technique, qui doit souvent coordonner les validations, les accès et la mise en service. La banque reste dépendante de cette médiation et ne bénéficie pas d'un parcours self-service traçable.")
add_text(doc, "Un tel processus limite l'industrialisation de l'onboarding. Il rend difficile le suivi uniforme des demandes, la conservation d'un historique des sélections et la liaison directe entre l'offre choisie, le paiement et l'activation des services. Il ne permet pas non plus d'offrir à l'opérateur SaaS une vision consolidée des demandes en attente, des abonnements actifs et des échéances à venir.")
add_heading(doc, "1.4.3 Paiement et activation dissociés", 3)
add_text(doc, "Dans un schéma non intégré, le paiement est traité en dehors de la plateforme ou selon une procédure manuelle. La vérification de la transaction, la mise à jour de l'abonnement et l'activation des services nécessitent alors des interventions complémentaires. Cette dissociation introduit des délais, des risques d'erreur de saisie et une visibilité limitée sur l'état réel du service souscrit. Elle rend également plus complexe la gestion des renouvellements et des relances d'échéance.")
add_heading(doc, "1.4.4 Gestion décentralisée des concessionnaires", 3)
add_text(doc, "La difficulté est particulièrement visible lorsqu'un concessionnaire travaille avec plusieurs banques. Dans un modèle de marketplaces indépendantes, le partenaire peut devoir créer un compte et gérer un catalogue dans chaque environnement. Il répète la saisie des mêmes produits, actualise plusieurs représentations de stock et suit des règles de publication distinctes. Un concessionnaire lié à trois banques peut ainsi disposer de trois espaces, de trois catalogues et de plusieurs mises à jour pour une même offre. Cette dispersion favorise les incohérences, notamment sur les informations produit et les disponibilités, tout en diminuant la lisibilité des partenariats actifs.")

add_heading(doc, "1.5 Problématique", 2)
add_text(doc, "Le problème à résoudre consiste à rendre la création et l'exploitation de marketplaces bancaires reproductibles, sans imposer la réalisation d'une application et d'un cycle de déploiement distincts pour chaque banque. La solution doit permettre de configurer une marketplace, ses stores, ses modules et son identité visuelle à partir d'un socle unique, tout en assurant l'étanchéité des données et des droits entre banques.")
add_text(doc, "La problématique comporte également un enjeu de fluidité opérationnelle. Comment dématérialiser le parcours d'adhésion d'une banque, associer de manière fiable la validation SaaS, le paiement en ligne et l'activation du service, puis rendre l'état de l'abonnement immédiatement traçable ? Le processus attendu doit éviter les échanges physiques systématiques entre la banque et le fournisseur d'application, sans supprimer les contrôles de gouvernance nécessaires.")
add_text(doc, "Enfin, la plateforme doit concilier centralisation et autonomie des partenaires. Comment offrir à un concessionnaire un compte et un catalogue uniques, réutilisables auprès de plusieurs banques, tout en laissant à chaque banque la maîtrise de ses partenariats, contrats, publications et dossiers de financement ? Cette question implique de centraliser les données de référence et le stock, mais de contextualiser leur visibilité et les décisions au niveau de chaque tenant.")
add_callout(doc, "Formulation synthétique", "Comment concevoir, développer et déployer une plateforme SaaS multi-tenant capable de créer et de gérer des marketplaces bancaires configurables, d'automatiser l'onboarding et le paiement, de centraliser les données concessionnaires, tout en garantissant l'isolation des tenants, la sécurité et la traçabilité ?")

add_heading(doc, "1.6 Solution proposée : Matchia", 2)
add_text(doc, "Matchia propose de transformer la création d'une marketplace bancaire en un parcours gouverné par une plateforme unique. Le noyau SaaS conserve le catalogue commun des stores et des modules, tandis que chaque banque dispose d'une marketplace dont l'identité, les contenus, les fonctionnalités activées et les données opérationnelles sont isolés logiquement. Cette conception réduit la nécessité de copier le code et rend l'évolution fonctionnelle plus homogène.")
add_text(doc, "Le parcours d'adhésion digitalise les opérations auparavant manuelles. Une banque soumet une demande, sélectionne les stores et modules correspondant à son besoin, puis sa demande est examinée par l'administrateur SaaS. Après validation, le paiement est initié via Stripe ; la confirmation côté backend déclenche l'activation de la banque, de sa marketplace, de l'abonnement et, lorsque nécessaire, du compte administrateur. Ce lien entre validation, paiement et activation garantit une cohérence qui n'existe pas dans un processus externe au système.")
add_text(doc, "Le module concessionnaire centralise également le travail du partenaire. Un seul compte permet de gérer le profil, le catalogue, les documents et les stocks. Les relations avec les banques sont matérialisées par des partenariats et des contrats, puis chaque banque décide indépendamment de la publication d'un produit dans sa marketplace. Ce mécanisme préserve l'autonomie de la banque sans imposer au concessionnaire de recréer ses données dans chaque environnement.")
add_callout(doc, "Valeur principale", "Matchia remplace une logique de développement par banque par une logique de configuration par tenant. Cette différence permet de concilier mutualisation technique, personnalisation métier, gouvernance des accès et montée en charge fonctionnelle.")

add_heading(doc, "1.7 Objectifs du projet", 2)
add_text(doc, "L'objectif général du projet est de concevoir et de réaliser une plateforme SaaS centralisée permettant la création et la gestion dynamique de marketplaces bancaires. Cette plateforme doit fournir un socle commun sans effacer les spécificités fonctionnelles et visuelles de chaque banque.")
add_table(doc, ["Objectif spécifique", "Contribution de Matchia"], [
    ("Automatiser l'onboarding", "Dépôt de demande, sélection de stores/modules, validation, paiement, activation et émission d'identifiants."),
    ("Réduire la duplication", "Catalogue mutualisé et configuration de marketplace par tenant au lieu de copies de code."),
    ("Centraliser les partenaires", "Compte concessionnaire unique, partenariats et contrats multi-banques, publications indépendantes."),
    ("Accompagner le client", "Consultation, comparateur, simulateur, dossier de financement, pièces justificatives et suivi de décision."),
    ("Industrialiser l'exploitation", "Conteneurs Docker, pipeline Jenkins, analyse SonarQube, images Docker Hub et déploiement Azure Container Apps."),
], [3250, 6110])
add_caption(doc, "Tableau 1.2 - Objectifs spécifiques du projet Matchia")

add_heading(doc, "1.8 Méthodologie de travail : Agile Scrum", 2)
add_text(doc, "Le projet applique la méthode Agile Scrum afin de produire la plateforme par incréments utilisables et contrôlables. Scrum est adapté à Matchia car les besoins sont interconnectés : l'isolation multi-tenant conditionne les espaces bancaires, l'activation dépend du paiement, la publication d'un produit dépend d'un partenariat, et le financement dépend des documents exigés. Au lieu de figer l'ensemble du produit avant le développement, l'équipe priorise un backlog, réalise un incrément à chaque sprint, le démontre puis ajuste les priorités selon les retours et les dépendances techniques.")
add_heading(doc, "1.8.1 Rôles Scrum appliqués au projet", 3)
add_text(doc, "Le Product Owner porte la vision métier : il ordonne le Product Backlog, formule les besoins sous forme de user stories et valide la valeur apportée par les incréments. Dans le contexte du PFE, ce rôle peut être assuré par le responsable métier ou le référent du projet. Le Scrum Master veille au respect du cadre Scrum, facilite la levée des obstacles et s'assure que les cérémonies restent orientées vers l'amélioration continue. L'équipe de développement conçoit, code, teste, documente et déploie l'incrément ; elle regroupe les compétences frontend, backend, base de données, qualité et DevOps nécessaires à la livraison.")
add_heading(doc, "1.8.2 Artéfacts et règles de préparation", 3)
add_text(doc, "Le Product Backlog rassemble les besoins classés par valeur et par dépendance : gestion des identités, tenant bancaire, catalogue de stores et modules, onboarding, paiement, espace concessionnaire, financement, assistant IA et industrialisation. Le Sprint Backlog contient les user stories sélectionnées, leurs tâches techniques et leurs critères d'acceptation. L'incrément est la partie réellement terminée et démontrable du produit. Une story est prête à être planifiée lorsqu'elle possède une description, un acteur, des critères d'acceptation, des dépendances identifiées et une estimation ; elle est terminée lorsque le code est relu, testé, intégré, documenté et déployable par le pipeline.")
add_heading(doc, "1.8.3 Cérémonies Scrum", 3)
add_text(doc, "Chaque sprint, de durée fixe et courte, débute par le Sprint Planning. L'équipe définit un objectif de sprint puis sélectionne les stories réalisables au regard de sa capacité. Le Daily Scrum, limité dans le temps, synchronise l'avancement, le travail à venir et les obstacles. Le Backlog Refinement prépare les besoins futurs : les stories sont clarifiées, découpées et estimées. En Sprint Review, l'incrément est présenté aux parties prenantes à partir d'un environnement de démonstration ; les retours alimentent le backlog. Enfin, la Sprint Retrospective analyse le fonctionnement de l'équipe et décide d'actions d'amélioration concrètes pour le sprint suivant.")
add_heading(doc, "1.8.4 Découpage incrémental de Matchia", 3)
add_table(doc, ["Sprint", "Objectif Scrum", "Incrément démontrable"], [
    ("S1", "Établir le socle et les accès.", "Projet React/Spring Boot, PostgreSQL, authentification JWT, rôles et routes protégées."),
    ("S2", "Mettre en place le noyau SaaS.", "Banques tenants, marketplaces, stores, modules, contexte tenant et administration SaaS."),
    ("S3", "Digitaliser l'adhésion et l'activation.", "Demande bancaire, sélection de l'offre, validation SaaS, paiement Stripe et activation contrôlée."),
    ("S4", "Centraliser le parcours concessionnaire.", "Compte unique, produits, stock, partenariats, contrats et demandes de publication."),
    ("S5", "Livrer le parcours client.", "Consultation, simulation, pièces justificatives, demande de financement, décision et notifications."),
    ("S6", "Fiabiliser l'exploitation.", "Tests, SonarQube, Docker, Jenkins, publication des images et déploiement Azure."),
], [1050, 3000, 5310])
add_caption(doc, "Tableau 1.1 - Découpage Scrum proposé pour Matchia")
add_text(doc, "Cette organisation n'empêche pas les ajustements : le Product Owner peut réordonner le backlog à la suite d'une revue, tandis que l'équipe conserve l'objectif du sprint en cours. Les critères de sécurité - contrôle des rôles, contexte tenant, validation des données et absence de secrets dans le code - font partie de la Definition of Done et ne sont pas reportés à une phase finale.")

add_heading(doc, "1.9 Conclusion", 2)
add_text(doc, "Ce chapitre a montré que Matchia répond à une problématique de multiplication des marketplaces bancaires, de dispersion des partenaires et de manque d'automatisation du cycle commercial. La plateforme proposée fournit un socle SaaS multi-tenant, configurable et gouverné par des règles métier. Le chapitre suivant détaille les acteurs, les exigences, les cas d'utilisation et les règles qui structurent cette solution.")

# Chapitre 2
doc.add_page_break()
add_heading(doc, "Chapitre 2 - Analyse et spécification des besoins", 1)
add_heading(doc, "2.1 Introduction", 2)
add_text(doc, "L'analyse des besoins a pour finalité de traduire le contexte présenté précédemment en services observables, règles contrôlables et responsabilités explicites. Elle ne se limite pas à l'inventaire des écrans : elle formalise les interactions entre les rôles, les données manipulées et les conditions de transition entre les états métier. Pour Matchia, cette étape est déterminante car la plateforme combine un périmètre SaaS transversal et plusieurs espaces opérationnels rattachés à des tenants bancaires.")

add_heading(doc, "2.2 Identification des acteurs", 2)
add_text(doc, "Les acteurs de Matchia sont à la fois humains et techniques. Les acteurs humains utilisent des espaces adaptés à leurs responsabilités ; les systèmes externes assurent des services spécialisés que la plateforme orchestre sans leur déléguer la gouvernance métier.")
add_table(doc, ["Acteur", "Rôle et périmètre", "Interactions principales"], [
    ("Administrateur SaaS", "Opérateur global de la plateforme. Il dispose d'une vision transverse sur les banques, les demandes, les catalogues, les abonnements, les paiements, les audits et les demandes concessionnaires.", "Valide/rejette les adhésions, administre stores/modules/marketplaces, consulte les indicateurs et interroge l'assistant IA."),
    ("Administrateur Banque", "Administrateur d'un tenant bancaire. Son périmètre est limité à sa banque, sa marketplace, ses utilisateurs, ses contenus, ses produits et ses dossiers.", "Paramètre branding/stores/modules, traite partenariats et publications, gère financement et abonnement."),
    ("Concessionnaire", "Partenaire commercial rattaché à une catégorie de store. Il possède un espace unique, même lorsqu'il travaille avec plusieurs banques.", "Soumet son dossier, gère produits/stock/documents, demande des partenariats et des publications, consulte les demandes liées à ses produits."),
    ("Client", "Utilisateur inscrit dans une marketplace bancaire donnée. Il est propriétaire de son profil et de ses dossiers.", "Consulte les offres, simule, téléverse les pièces, soumet et suit une demande de financement."),
    ("Internaute", "Visiteur non authentifié de la plateforme ou d'une marketplace.", "Consulte les contenus publics, les stores et les produits, et peut initier une inscription ou une demande d'adhésion."),
    ("Stripe", "Prestataire de paiement externe.", "Reçoit les demandes de Payment Intent ou Checkout Session ; son statut est vérifié avant l'activation interne."),
    ("Gemini", "Service LLM externe utilisé par l'assistant SaaS.", "Génère une proposition de requête et une réponse en langage naturel ; il ne reçoit aucune connexion à la base."),
    ("SMTP", "Service d'envoi d'emails.", "Diffuse les codes, confirmations, identifiants, liens de paiement, relances et décisions."),
    ("Jenkins / SonarQube / Docker Hub / Azure", "Chaîne d'industrialisation et de livraison.", "Construit, teste, analyse, conteneurise, publie et déploie les composants de Matchia."),
], [1750, 4100, 3510])
add_caption(doc, "Tableau 2.1 - Acteurs de la plateforme Matchia")

add_heading(doc, "2.3 Choix du modèle SaaS et de la multi-tenance", 2)
add_heading(doc, "2.3.1 Modèle SaaS retenu", 3)
add_text(doc, "Le modèle Software as a Service (SaaS) consiste à proposer une application accessible en ligne, exploitée sur un socle technique commun et fournie sous forme de service. Pour Matchia, ce choix permet de remplacer des livraisons logicielles séparées par un produit unique, maintenu et déployé de façon centralisée. Les banques souscrivent une offre, sélectionnent les stores et modules nécessaires, puis exploitent une marketplace configurée selon leur identité et leurs besoins. Les mises à jour correctives et fonctionnelles sont ainsi réalisées une seule fois sur le socle, avant d'être rendues disponibles de manière maîtrisée aux tenants concernés.")
add_heading(doc, "2.3.2 Principe de multi-tenance", 3)
add_text(doc, "La multi-tenance permet à plusieurs organisations d'utiliser la même application sans partager leurs données opérationnelles. Dans Matchia, chaque banque représente un tenant. Son contexte détermine la marketplace consultée, les utilisateurs habilités, les contenus visibles, les produits, les dossiers de financement, les décisions et les abonnements associés. Les ressources globales, telles que le catalogue des stores et des modules, sont administrées au niveau SaaS ; leur activation et leur visibilité sont ensuite configurées pour chaque banque. L'isolation est donc logique et doit être appliquée dans les routes, les services métier, les contrôles d'autorisation et les requêtes de données.")
add_text(doc, "Trois stratégies sont habituellement envisagées. Une base de données par tenant maximise l'isolation mais multiplie les opérations d'administration. Un schéma par tenant offre une séparation intermédiaire, tout en imposant une gestion spécifique des migrations. Enfin, une base et un schéma partagés avec identification du tenant mutualisent l'infrastructure et requièrent des contrôles applicatifs rigoureux. Le projet Matchia adopte cette dernière logique : les entités métier sont contextualisées par la banque et les accès sont bornés par le rôle et le tenant, ce qui correspond aux routes et aux services destinés aux espaces SaaS et bancaires.")
add_table(doc, ["Stratégie", "Atouts", "Contraintes", "Position de Matchia"], [
    ("Base par tenant", "Isolation forte et sauvegarde distincte.", "Coût, supervision et migrations plus lourds.", "Non retenue dans les configurations observées."),
    ("Schéma par tenant", "Séparation structurelle dans une même base.", "Gestion des schémas et des évolutions plus complexe.", "Non retenue explicitement."),
    ("Base partagée avec tenant", "Mutualisation, coûts maîtrisés, déploiement unique.", "Les filtres de tenant et les autorisations doivent être systématiques.", "Retenue : la banque constitue le contexte logique des données."),
], [1750, 2400, 2800, 2410])
add_caption(doc, "Tableau 2.3 - Comparaison des stratégies de multi-tenance")
add_heading(doc, "2.3.3 Justification du choix", 3)
add_table(doc, ["Critère", "Choix SaaS multi-tenant pour Matchia"], [
    ("Évolutivité", "L'ajout d'une banque devient un processus d'adhésion, de configuration et d'activation ; il ne requiert pas une nouvelle base de code."),
    ("Mutualisation", "Le frontend, le backend, les correctifs, les contrôles de sécurité et le pipeline CI/CD sont partagés et maintenus une seule fois."),
    ("Personnalisation", "Chaque tenant conserve sa marketplace, son branding, ses utilisateurs, ses stores et modules activés, ses contenus et ses règles métier."),
    ("Isolation", "Les droits et les données sont filtrés par tenant ; un administrateur banque ne peut accéder qu'à son périmètre bancaire."),
    ("Partenaires", "Le concessionnaire centralise son catalogue et son stock, tandis que les partenariats et les publications restent contextualisés par banque."),
    ("Exploitation", "Une chaîne DevOps unique construit, analyse et déploie les composants de la plateforme, ce qui réduit la répétition des opérations."),
], [2300, 7060])
add_caption(doc, "Tableau 2.2 - Justification du modèle SaaS multi-tenant")
add_callout(doc, "Choix d'architecture", "Matchia retient une application mutualisée avec une isolation logique par banque, plutôt qu'une application et un cycle de déploiement indépendants pour chaque banque. Ce choix répond simultanément aux objectifs de centralisation, de configurabilité et de gouvernance.")

add_heading(doc, "2.4 Besoins fonctionnels", 2)
add_heading(doc, "2.4.1 Besoins de l'administrateur SaaS", 3)
add_text(doc, "L'administrateur SaaS est responsable de la gouvernance de la plateforme. Il consulte un tableau de bord consolidé, gère les banques et les demandes d'adhésion, définit le catalogue de stores et de modules, administre les marketplaces, les contenus globaux et les utilisateurs. Il suit aussi les offres, les abonnements payés, le revenu mensuel et les échéances. La présence d'un journal d'audit, de statistiques et d'un mécanisme d'export répond au besoin de traçabilité des opérations transverses.")
add_text(doc, "Cet acteur traite les demandes de création de comptes concessionnaires, accède de manière sécurisée à leurs justificatifs et déclenche la création du concessionnaire et de son administrateur lorsque le dossier est validé. Il bénéficie enfin d'un assistant IA analytique dont l'usage est explicitement restreint au rôle ADMIN_SAAS. Le système lui offre donc des fonctions CRUD, de validation, d'activation, de supervision et d'analyse, et non un simple catalogue de données.")
add_heading(doc, "2.4.2 Besoins de l'administrateur Banque", 3)
add_text(doc, "L'administrateur de banque pilote un tenant. Il configure l'identité de sa marketplace - couleurs, logo, bannière, texte d'accueil et contenu - et décide quels stores et modules sont activés ou visibles. Il gère les utilisateurs rattachés à sa banque, les produits bancaires et leurs paramètres, les bannières de stores et les exigences documentaires associées aux demandes de financement. Le périmètre est volontairement restreint : une banque ne doit ni administrer les données globales du SaaS ni consulter les dossiers d'un autre tenant.")
add_text(doc, "L'espace bancaire prend également en charge les relations B2B. La banque peut consulter les concessionnaires disponibles pour ses stores, initier ou traiter un partenariat, gérer les contrats associés et approuver, rejeter ou inactiver les demandes de publication. Enfin, elle traite les demandes de financement liées à ses stores, consulte les pièces et communique une décision acceptée ou rejetée avec commentaire et motif si nécessaire.")
add_heading(doc, "2.4.3 Besoins du concessionnaire", 3)
add_text(doc, "Le concessionnaire dépose d'abord un dossier comprenant ses données d'entreprise, un logo et des justificatifs. Après approbation, il accède à un espace unique de gestion. Il actualise son profil, consulte son dashboard, repère les banques accessibles pour son store et gère l'historique de ses partenariats. Le principe central est la réutilisation : le produit est créé une seule fois dans son catalogue, tandis que la publication est décidée séparément par chaque banque partenaire.")
add_text(doc, "Le concessionnaire peut créer, modifier ou supprimer ses produits, ajuster les stocks, renseigner les caractéristiques variables définies par le store et joindre des documents. Il soumet ensuite une demande de publication liée à un partenariat actif. Il peut suivre l'état des publications, recevoir des notifications et consulter les demandes de financement concernant ses propres produits, sans accéder aux dossiers des autres concessionnaires ni aux décisions internes d'une banque.")
add_heading(doc, "2.4.4 Besoins du client et de l'internaute", 3)
add_text(doc, "L'internaute accède aux contenus publics de Matchia et des marketplaces : présentation, stores, produits, bannières et modules visibles. Le comparateur facilite la lecture de caractéristiques hétérogènes et le simulateur fournit une estimation à partir du montant, de l'apport, de la durée et du taux. L'inscription et l'authentification transforment ce visiteur en client rattaché à une marketplace bancaire.")
add_text(doc, "Le client authentifié gère ses coordonnées, visualise un tableau de bord, crée un brouillon de demande de financement et dépose les documents exigés pour le couple banque/store. Il peut télécharger ou supprimer une pièce tant que le dossier est éditable, puis soumettre la demande lorsque toutes les pièces requises sont présentes. Il suit le statut de ses dossiers et reçoit une notification ainsi qu'un email lors d'une décision bancaire. Le simulateur n'accorde pas un crédit : il assiste la préparation du dossier, la décision demeurant une responsabilité de la banque.")
add_heading(doc, "2.4.5 Notifications, emails, audit et IA", 3)
add_text(doc, "Les notifications sont persistées et peuvent être marquées lues, marquées lues globalement ou supprimées. Elles couvrent notamment les demandes, les décisions, les paiements, les partenariats, les contrats, les publications et le financement. Les emails complètent ce mécanisme lors des étapes nécessitant une action hors de l'application : vérification d'adresse, identifiants temporaires, lien de paiement, rappel d'échéance, confirmation ou rejet.")
add_text(doc, "Le journal d'audit conserve le contexte d'une action : tenant, acteur, rôle, type de ressource, statut, corrélation, banque ou marketplace concernée. L'assistant IA, quant à lui, n'est pas un chatbot de support générique. Il répond à des questions analytiques de l'administrateur SaaS en orchestrant une génération Text-to-SQL contrôlée ; la requête est validée, exécutée en lecture seule et bornée avant la génération de la réponse en français.")

add_heading(doc, "2.5 Diagramme de cas d'utilisation global", 2)
add_text(doc, "Le diagramme de cas d'utilisation global doit placer Matchia au centre et relier les cinq acteurs humains aux domaines fonctionnels qui leur sont propres. L'administrateur SaaS y est associé à la gouvernance des tenants, au catalogue, aux demandes, aux abonnements, à l'audit et à l'assistant IA. L'administrateur banque est associé à la configuration de son tenant, aux produits, aux partenaires et au financement. Le concessionnaire est associé au profil, aux partenariats, aux contrats, aux produits et aux publications. Le client est associé à l'inscription, au profil, à la simulation et au financement. L'internaute est associé à la consultation publique et au déclenchement des demandes d'inscription. Stripe, Gemini et SMTP figurent comme acteurs externes reliés respectivement au paiement, à l'assistant et aux communications.")
add_table(doc, ["Acteur", "Cas d'utilisation principaux à relier au diagramme"], [
    ("SaaS", "Gérer banques, demandes, marketplaces, stores, modules, utilisateurs, contenus, abonnements, paiements, concessionnaires, audits et assistant IA."),
    ("Banque", "Configurer marketplace, gérer utilisateurs/contenus/produits, traiter partenaires, contrats, publications et financement."),
    ("Concessionnaire", "Gérer profil, produits, stock, documents, partenariats, contrats et demandes de publication."),
    ("Client", "S'inscrire, se connecter, gérer profil, simuler, créer/soumettre/consulter une demande et gérer ses documents."),
    ("Internaute", "Consulter marketplace, stores et produits ; comparer, simuler, déposer une demande d'adhésion ou de concessionnaire."),
], [2200, 7160])
add_caption(doc, "Tableau 2.4 - Contenu attendu du diagramme de cas d'utilisation global")
add_diagram(doc, "use_cases_global.png", "Figure 2.1 - Diagramme coloré de cas d'utilisation global de Matchia", "Afin de synthétiser les relations entre les acteurs et les grands domaines fonctionnels, la figure suivante propose une représentation colorée du diagramme global.", "Les couleurs distinguent les acteurs et les domaines de service. Ce diagramme doit être lu comme une vue de haut niveau : les cas d'utilisation détaillés et les contrôles métier sont précisés dans les sections suivantes.")

add_heading(doc, "2.6 Diagramme de classes global", 2)
add_text(doc, "Le diagramme de classes global représente les principaux concepts métier et leurs associations. La classe Bank joue le rôle de tenant : elle possède une marketplace, des utilisateurs et des abonnements. Le catalogue Store / Module est activé dans le périmètre de la marketplace. Le concessionnaire gère un ensemble de produits et un produit peut donner lieu à des demandes de financement rattachées à une banque. Ce diagramme reste volontairement conceptuel : il expose les responsabilités structurantes sans reproduire l'intégralité des attributs techniques du code.")
add_diagram(doc, "global_class.png", "Figure 2.2 - Diagramme de classes global et tenantisé de Matchia", "La figure suivante synthétise les classes métier au cœur de la plateforme et rend visible la place de la banque en tant que tenant.", "Les liens traduisent une lecture de haut niveau : les associations de configuration, de visibilité et les tables de liaison peuvent être détaillées dans le chapitre de conception. Le point essentiel est que les ressources opérationnelles sont toujours rattachées ou contextualisées par le tenant concerné.")

add_heading(doc, "2.7 Diagramme d'activité : traitement d'une demande de financement", 2)
add_text(doc, "Le diagramme d'activité décrit le comportement du système depuis la préparation du dossier jusqu'à la décision bancaire. Il met en évidence les points de contrôle : complétude des pièces, traitement par la banque du tenant et obligation d'un motif en cas de rejet. La réservation de stock n'intervient qu'après une décision favorable lorsque le produit est associé à un concessionnaire.")
add_diagram(doc, "financing_activity.png", "Figure 2.3 - Diagramme d'activité coloré d'une demande de financement", "Le flux suivant formalise le cycle de vie d'une demande de financement au sein d'une marketplace bancaire.", "Les boucles de correction empêchent la soumission d'un dossier incomplet. Les deux issues finales assurent une communication explicite au client, tout en maintenant l'isolation des décisions au niveau de la banque concernée.")

add_heading(doc, "2.8 Cas d'utilisation détaillés", 2)
add_use_case(doc, "UC1 - Adhésion d'une banque", "Internaute représentant une banque", "Le formulaire d'adhésion est accessible ; l'adresse email est vérifiée lorsque le parcours le requiert.", "Le représentant renseigne les informations de la banque, sélectionne stores et modules, puis soumet la demande. Le SaaS reçoit un dossier pending et le contact reçoit une confirmation.", "Email non vérifié, données invalides, sélection incomplète ou demande rejetée avec motif.", "Une demande historisée, associée aux sélections et prête au traitement SaaS, est créée.")
add_use_case(doc, "UC2 - Validation, paiement et activation", "Administrateur SaaS puis contact bancaire", "Une demande d'adhésion est en attente et comporte les informations requises.", "Le SaaS approuve la demande ; le contact utilise le parcours Stripe ; le backend confirme le paiement et active banque, marketplace, abonnement et compte.", "Rejet motivé, paiement annulé ou statut Stripe non payé : l'activation ne doit pas être réalisée.", "Les composants concernés sont actifs seulement après confirmation de paiement.")
add_use_case(doc, "UC3 - Partenariat et publication dealer", "Concessionnaire et administrateur Banque", "Le dealer est actif ; le store est compatible ; la banque est disponible.", "Le dealer demande un partenariat ; la banque le traite ; un contrat est envoyé et accepté ; le dealer soumet un produit ; la banque décide la publication.", "Doublon dealer-banque-store, rejet, suspension, contrat expiré ou produit inactif.", "Le produit n'est visible publiquement que si la publication et les dépendances restent actives.")
add_use_case(doc, "UC4 - Demande de financement", "Client puis administrateur Banque", "Le client est authentifié dans un tenant ; le store et le produit sont accessibles.", "Le client crée un brouillon, renseigne la simulation, dépose les pièces requises et soumet. La banque consulte le dossier et rend une décision.", "Pièce manquante, produit hors tenant, dossier non brouillon, rejet sans motif ou tentative d'accès à un dossier non autorisé.", "Le dossier passe à ACCEPTED ou REJECTED ; le client est notifié et, pour un produit dealer accepté, le stock est réservé.")
add_use_case(doc, "UC5 - Interrogation IA contrôlée", "Administrateur SaaS", "L'utilisateur dispose du rôle ADMIN_SAAS et la configuration Gemini est disponible.", "La question est envoyée au backend ; le schéma filtré et le contexte sont transmis au LLM ; le SQL proposé est validé, exécuté en lecture seule et reformulé.", "SQL non conforme, donnée absente, erreur d'exécution ou dépassement des règles de sécurité.", "La réponse française est retournée sans exposition des champs ou identifiants sensibles.")

add_heading(doc, "2.9 Diagrammes de séquence recommandés", 2)
add_text(doc, "Les diagrammes de séquence suivants doivent être insérés dans les chapitres de conception et de réalisation. Ils permettent de rendre visibles les responsabilités du frontend, de l'API, de la base et des services externes. Leur objectif est de montrer les contrôles, non de reproduire les détails du code.")
add_table(doc, ["Diagramme", "Participants", "Étapes à représenter"], [
    ("Authentification", "Utilisateur, React, API Auth, filtre JWT, base.", "Login, émission access/refresh token, requête protégée, renouvellement et refus d'accès."),
    ("Onboarding banque", "Représentant, frontend, RequestService, SaaS, base, SMTP.", "Dépôt, vérification, sélection, persistance, notification et validation/rejet."),
    ("Paiement et activation", "Contact banque, frontend, PaymentService, Stripe, base, SMTP.", "Création session/intention, confirmation Stripe, mise à jour état, activation et email."),
    ("Partenariat/publication", "Dealer, banque, services partenariat/contrat/produit, base, notification.", "Demande, décision, contrat, soumission produit, approbation/rejet de publication."),
    ("Financement", "Client, API, base, banque, dealer éventuel, SMTP.", "Brouillon, documents, contrôle, soumission, décision, notification et réservation stock."),
    ("Assistant IA", "Admin SaaS, widget, API IA, Gemini, validateur SQL, PostgreSQL.", "Question, schéma filtré, SQL proposé, validation, lecture bornée, reformulation ou rejet."),
], [2200, 3100, 4060])
add_caption(doc, "Tableau 2.5 - Diagrammes de séquence à réaliser")

add_heading(doc, "2.10 Workflows métier colorés", 2)
add_text(doc, "Le rapport de conception peut compléter les diagrammes présentés ci-dessous par des diagrammes UML ciblés : séquence d'authentification, séquence d'onboarding bancaire, séquence de paiement, séquence de partenariat banque-concessionnaire, séquence de financement et séquence de l'assistant IA. Un diagramme de composants est pertinent dans le chapitre de conception pour relier frontend React, API Spring Boot, PostgreSQL et services externes. Enfin, le diagramme de déploiement présenté au chapitre 6 porte l'architecture cloud réelle : frontend et backend conteneurisés, images Docker Hub et Azure Container Apps.")
add_table(doc, ["Diagramme", "Objectif", "Emplacement recommandé"], [
    ("Cas d'utilisation global", "Délimiter les acteurs et les services majeurs.", "Section 2.5."),
    ("Classes global", "Présenter les entités métier et les associations tenantisées.", "Section 2.6."),
    ("Activité", "Décrire les décisions et les états du financement.", "Section 2.7."),
    ("Séquence", "Détailler les échanges frontend, backend et services externes.", "Section 2.9 / chapitre de conception."),
    ("Composants et déploiement", "Présenter les composants techniques et l'hébergement cloud.", "Chapitre de conception et section 6.11."),
], [2000, 4650, 2710])
add_caption(doc, "Tableau 2.6 - Diagrammes UML et emplacements recommandés")
add_diagram(doc, "onboarding_payment.png", "Figure 2.4 - Diagramme coloré du parcours d'onboarding et de paiement", "Le parcours commercial de Matchia associe la validation de la demande au paiement puis à l'activation. La figure suivante formalise ce séquencement.", "L'activation n'est jamais une simple conséquence de l'envoi du formulaire. Elle dépend de la validation SaaS et de la confirmation de paiement vérifiée par le backend.")
add_diagram(doc, "dealer_publication.png", "Figure 2.5 - Diagramme coloré du cycle concessionnaire", "Le schéma ci-dessous rend visible le cycle B2B qui relie la création du partenaire, le contrat et la publication du produit.", "La publication est une décision indépendante de chaque banque. Cette indépendance permet au concessionnaire de centraliser son catalogue sans retirer à la banque son contrôle sur les offres visibles dans sa marketplace.")
add_diagram(doc, "financing_workflow.png", "Figure 2.6 - Diagramme coloré du workflow de financement", "Le workflow de financement est présenté sous forme d'étapes ordonnées, depuis la simulation jusqu'à la communication de la décision.", "La séparation entre brouillon, soumission et décision garantit que les documents obligatoires sont contrôlés avant le traitement bancaire. Le processus préserve également l'isolation du tenant concerné.")
add_diagram(doc, "ai_secure_sequence.png", "Figure 2.7 - Diagramme coloré de l'assistant IA sécurisé", "Le dernier diagramme de la présente analyse illustre la chaîne de sécurité de l'assistant IA réservé à l'administration SaaS.", "Gemini ne se connecte jamais directement à PostgreSQL. Le validateur backend impose une allowlist, une lecture seule, un timeout et une borne de résultats avant la reformulation de la réponse.")

add_heading(doc, "2.11 Exigences non fonctionnelles", 2)
add_table(doc, ["Exigence", "Mécanismes présents dans Matchia", "Critère de validation"], [
    ("Sécurité", "JWT stateless, refresh token, rôles, contrôle de tenant dans les services, validation DTO, CORS, fichiers protégés.", "Un utilisateur non autorisé ne consulte ni ne modifie une ressource hors de son périmètre."),
    ("Confidentialité", "Relations banque/client/dealer, téléchargement contrôlé, filtrage IA des colonnes sensibles.", "Un dossier ou document est récupéré uniquement par son propriétaire ou une banque habilitée."),
    ("Intégrité", "Contraintes d'unicité, statuts énumérés, transactions JPA, version optimiste sur financement.", "Les doublons et transitions d'état non autorisées sont refusés."),
    ("Performance", "API REST, index de demandes, filtres, limitation de résultats IA à 50 et timeout de 15 secondes.", "Les consultations ne chargent pas de données inutilement volumineuses."),
    ("Scalabilité", "Tenant bancaire logique, catalogues réutilisables, conteneurs indépendants frontend/backend.", "Une banque peut être ajoutée par configuration sans clone applicatif."),
    ("Maintenabilité", "Séparation React/Spring, couches controller-service-repository, DTO/mappers, TypeScript, tests et SonarQube.", "Une évolution métier peut être localisée et vérifiée par les outils de qualité."),
    ("Disponibilité", "Docker Compose local, images versionnées, Azure Container Apps et procédures de redéploiement.", "Les services peuvent être reconstruits et redéployés de manière reproductible."),
], [1600, 4300, 3460])
add_caption(doc, "Tableau 2.7 - Exigences non fonctionnelles")

add_heading(doc, "2.12 Règles métier", 2)
add_text(doc, "Les règles métier sont principalement appliquées dans les services Spring. Elles constituent une seconde ligne de défense après les restrictions de navigation et de rôle du frontend. Les règles essentielles sont les suivantes.")
add_table(doc, ["Référence", "Règle formalisée"], [
    ("RM1", "Une banque et sa marketplace ne deviennent actives qu'après le traitement favorable de la demande et la confirmation d'un paiement payé."),
    ("RM2", "Un store ou un module apparaît dans une marketplace seulement lorsqu'il est affecté, activé et visible pour ce tenant."),
    ("RM3", "Une demande de financement client doit concerner un store actif sur la marketplace du client et un produit cohérent avec ce store et ce tenant."),
    ("RM4", "Un dossier de financement ne peut être soumis qu'à l'état DRAFT et après dépôt de toutes les pièces obligatoires actives."),
    ("RM5", "Une banque ne traite que les dossiers de financement de son propre tenant ; le rejet exige un motif."),
    ("RM6", "Le concessionnaire n'accède qu'à son profil, ses produits, ses partenariats, ses contrats, ses publications et aux dossiers liés à ses produits."),
    ("RM7", "Le triplet concessionnaire-banque-store est unique pour empêcher des demandes de partenariat concurrentes ou dupliquées."),
    ("RM8", "Une publication de produit est décidée indépendamment par chaque banque et ne devient publique que si produit, concessionnaire, partenariat, store et marketplace sont actifs."),
    ("RM9", "Un stock de produit concessionnaire est réservé lors de l'acceptation d'une demande de financement portant sur ce produit."),
    ("RM10", "L'assistant IA ne peut exécuter qu'une requête SELECT validée, bornée et en lecture seule ; les champs sensibles sont exclus."),
], [1050, 8310])
add_caption(doc, "Tableau 2.8 - Principales règles métier de Matchia")

add_heading(doc, "2.13 Backlog produit, releases et sprints", 2)
add_text(doc, "La planification Agile proposée transforme les fonctionnalités réellement présentes dans Matchia en éléments de Product Backlog priorisés. Une user story exprime une valeur attendue par un acteur ; le Product Backlog les classe selon leur valeur métier, leur risque et leurs dépendances. Lors du Sprint Planning, l'équipe sélectionne les stories prêtes dans le Sprint Backlog, définit un objectif de sprint et produit un incrément potentiellement démontrable. La répartition ci-dessous est une planification de référence pour le mémoire : elle respecte l'ordre de dépendance observé dans le projet, sans prétendre reconstituer l'historique exact de chaque commit.")

add_heading(doc, "2.13.1 Product Backlog priorisé", 3)
add_table(doc, ["Réf.", "User story", "Priorité", "Critères d'acceptation essentiels"], [
    ("PB1", "En tant qu'utilisateur, je souhaite créer un compte et m'authentifier afin d'accéder uniquement à mon espace.", "Critique", "JWT et rôles actifs ; routes et API protégées ; refus des accès non autorisés."),
    ("PB2", "En tant qu'administrateur SaaS, je souhaite gérer banques, marketplaces, stores et modules afin d'administrer le socle commun.", "Critique", "Création, consultation, modification et activation contrôlées ; audit des actions."),
    ("PB3", "En tant que banque, je souhaite soumettre une demande et sélectionner mes besoins afin d'obtenir une marketplace configurée.", "Haute", "Demande historisée ; sélection stores/modules ; validation ou rejet motivé."),
    ("PB4", "En tant que contact bancaire, je souhaite payer en ligne afin que l'abonnement puisse être activé selon les règles métier.", "Haute", "Statut Stripe vérifié ; activation uniquement après paiement confirmé ; notification envoyée."),
    ("PB5", "En tant qu'administrateur banque, je souhaite configurer mon tenant afin de personnaliser la marketplace.", "Haute", "Branding, contenus, stores et modules visibles uniquement dans le tenant concerné."),
    ("PB6", "En tant que concessionnaire, je souhaite gérer un catalogue et un stock uniques afin de travailler avec plusieurs banques.", "Haute", "Profil unique ; produits et stock centralisés ; partenariats distincts par banque."),
    ("PB7", "En tant que banque, je souhaite traiter les partenariats et publications afin de contrôler les offres visibles.", "Moyenne", "Contrat et publication conditionnés par les statuts actifs ; décision tracée."),
    ("PB8", "En tant que client, je souhaite simuler et déposer une demande de financement afin de suivre mon dossier.", "Haute", "Pièces obligatoires contrôlées ; soumission, décision et notification historisées."),
    ("PB9", "En tant qu'administrateur SaaS, je souhaite interroger un assistant analytique afin d'obtenir des indicateurs sans exposer les données sensibles.", "Moyenne", "Accès ADMIN_SAAS ; SQL validé, SELECT seul, lecture bornée et réponse reformulée."),
    ("PB10", "En tant qu'équipe projet, nous souhaitons automatiser la livraison afin de disposer de versions reproductibles.", "Haute", "Build, tests backend, analyse Sonar, images Docker et déploiement Azure exécutables par Jenkins."),
], [800, 3600, 1100, 3860])
add_caption(doc, "Tableau 2.9 - Product Backlog priorisé de Matchia")

add_heading(doc, "2.13.2 Planification par releases", 3)
add_table(doc, ["Release", "Objectif de livraison", "Incrément livré"], [
    ("R1 - Fondation", "Mettre à disposition un socle sécurisé et multi-tenant.", "Modèle Bank/User, PostgreSQL, authentification JWT/refresh, rôles, routes protégées, stores et modules."),
    ("R2 - Onboarding", "Créer et activer une marketplace bancaire configurée.", "Demande bancaire, vérification email, sélection, validation/rejet, branding, abonnement et paiement."),
    ("R3 - Marketplace", "Permettre l'exploitation du tenant et du catalogue public.", "Accueil tenant, stores, produits bancaires, paramètres, bannières, comparateur et simulateur."),
    ("R4 - Partenaires", "Centraliser les concessionnaires et leur relation avec les banques.", "Dossier dealer, compte unique, produits, stock, partenariats, contrats et publications multi-banques."),
    ("R5 - Financement", "Accompagner le client jusqu'à la décision bancaire.", "Profil client, pièces, demande de financement, traitement bancaire, suivi et réservation de stock."),
    ("R6 - Industrialisation", "Fiabiliser la qualité et le déploiement.", "Audit, assistant IA sécurisé, tests, SonarQube, Docker, Jenkins, Docker Hub et Azure Container Apps."),
], [1600, 3100, 4660])
add_caption(doc, "Tableau 2.10 - Planification des releases Matchia")

add_heading(doc, "2.13.3 Planification détaillée des sprints", 3)
add_text(doc, "La durée recommandée d'un sprint est de deux semaines. À la fin de chaque sprint, l'incrément est présenté en Sprint Review ; les retours servent à réordonner le Product Backlog. Les sprints suivants sont organisés de façon à ce que les éléments dépendants ne soient engagés qu'après disponibilité de leur socle fonctionnel.")
add_table(doc, ["Sprint", "Objectif", "User stories sélectionnées", "Acteurs", "Livrable de sprint"], [
    ("S1", "Poser le socle technique.", "PB1 (partie identité) ; modèles Bank/User ; base PostgreSQL.", "Tous rôles", "Application React/Spring initialisée, authentification et rôles de base."),
    ("S2", "Mettre en place la gouvernance SaaS.", "PB2 ; catalogue stores/modules ; contexte bancaire.", "Admin SaaS", "Back-office SaaS et premières règles d'isolation tenant."),
    ("S3", "Digitaliser la demande bancaire.", "PB3 ; formulaire, vérification et sélection de l'offre.", "Internaute, SaaS", "Demande d'adhésion historisée et administrable."),
    ("S4", "Automatiser l'activation commerciale.", "PB4 ; offres, abonnement, Stripe, activation et emails.", "Banque, SaaS", "Paiement contrôlé et activation conditionnelle du tenant."),
    ("S5", "Publier une marketplace tenantisée.", "PB5 ; branding, contenus, produits bancaires, comparaison et simulation.", "Banque, Internaute", "Marketplace personnalisée et parcours public utilisable."),
    ("S6", "Centraliser la gestion concessionnaire.", "PB6 ; dossier dealer, profil, catalogue et stock.", "Concessionnaire, SaaS", "Espace dealer unique avec données de référence centralisées."),
    ("S7", "Gérer les relations B2B.", "PB7 ; partenariats, contrats et demandes de publication.", "Banque, Concessionnaire", "Contrôle bancaire des partenariats et des offres publiées."),
    ("S8", "Livrer le financement client.", "PB8 ; inscription client, pièces, dossier, décision et notifications.", "Client, Banque", "Cycle de financement complet et suivi du statut."),
    ("S9", "Renforcer pilotage et sécurité.", "PB9 ; audit, tableaux de bord, assistant IA en lecture seule.", "Admin SaaS", "Analyse transverse sécurisée et traçabilité consolidée."),
    ("S10", "Industrialiser la livraison.", "PB10 ; tests, Sonar, Docker, Jenkins et Azure.", "Équipe projet", "Pipeline CI/CD exécutant construction, contrôle et déploiement."),
], [700, 1400, 3100, 1400, 2760])
add_caption(doc, "Tableau 2.11 - Planification Agile par sprints de deux semaines")
add_callout(doc, "Pilotage Scrum", "Le Sprint Backlog est révisé à chaque Sprint Planning. Toute story reportée, obstacle technique ou retour de Sprint Review est réintroduit dans le Product Backlog et priorisé avant le sprint suivant. Cette règle évite de figer le planning tout en conservant une trajectoire cohérente avec les dépendances de Matchia.")

add_heading(doc, "2.14 Conclusion", 2)
add_text(doc, "L'analyse des besoins confirme que Matchia est un système multi-acteurs et multi-processus. Les exigences combinent gouvernance SaaS, autonomie contrôlée des banques, centralisation des concessionnaires, parcours client documenté et intégrations externes. Les règles métier garantissent que la configurabilité n'affaiblit ni l'isolation des tenants ni la cohérence des transitions. Ces spécifications constituent la base de l'architecture et de la réalisation présentées dans les chapitres suivants du mémoire.")

# Chapitre 6
doc.add_page_break()
add_heading(doc, "Chapitre 6 - DevOps et déploiement", 1)
add_heading(doc, "6.1 Introduction", 2)
add_text(doc, "Le développement d'une plateforme SaaS ne s'arrête pas à la production du code applicatif. Sa qualité et sa disponibilité dépendent de la capacité à construire les composants de manière reproductible, à exécuter les contrôles nécessaires, à produire des images cohérentes et à déployer une version identifiée. Matchia met en œuvre une chaîne DevOps associant Git/GitHub, Jenkins, Maven, Node.js, SonarQube, Docker, Docker Hub et Azure Container Apps. Ce chapitre décrit exclusivement les mécanismes vérifiables dans les fichiers de configuration et les captures présentes dans le dépôt.")

add_heading(doc, "6.2 Environnements du projet", 2)
add_table(doc, ["Environnement", "Rôle", "Éléments vérifiés"], [
    ("Développement local", "Codage, exécution et recette fonctionnelle sur poste de travail.", "React/Vite, Spring Boot sur le port 8081, PostgreSQL local ou externe, uploads locaux."),
    ("Docker local", "Reproduction de l'exécution applicative dans deux conteneurs.", "Compose principal, images matchia-frontend et matchia-backend, réseau bridge, volume uploads."),
    ("Outillage CI/qualité", "Automatisation des builds et analyse statique.", "Jenkins containerisé avec Docker-in-Docker ; SonarQube et PostgreSQL Sonar dans un Compose dédié."),
    ("Cloud", "Mise à disposition des images de production.", "Jenkinsfile : Docker Hub puis az containerapp update pour frontend et backend dans Azure Container Apps."),
], [1850, 3100, 4410])
add_caption(doc, "Tableau 6.1 - Environnements identifiés dans le projet")

add_heading(doc, "6.3 Gestion du code source avec Git et GitHub", 2)
add_text(doc, "Le Jenkinsfile configure un déclencheur githubPush() et commence par une étape Checkout exécutée sur le dépôt associé au job. Le cycle de livraison est donc initié par une modification versionnée : le développeur réalise ses changements, les intègre au dépôt GitHub, puis Jenkins récupère l'état correspondant pour lancer les stages. Cette organisation apporte une traçabilité entre la version source, le numéro de build Jenkins et les images Docker publiées.")
add_text(doc, "Le dépôt contient également une capture liée au paramétrage de Jenkins et une capture de création de pipeline. Ces artefacts démontrent l'existence d'un pipeline déclaré dans l'outil. Les détails de gouvernance Git - conventions de branches, stratégie de revue ou règles de fusion - ne sont pas documentés de manière fiable dans les fichiers disponibles ; ils ne doivent donc pas être présentés comme des pratiques formalisées sans validation de l'équipe.")

add_heading(doc, "6.4 Conteneurisation avec Docker", 2)
add_heading(doc, "6.4.1 Image backend", 3)
add_text(doc, "Le Dockerfile du backend adopte une construction multi-stage. La première image repose sur Maven 3.9 et Eclipse Temurin 17. Le fichier pom.xml est copié avant le code source afin de télécharger les dépendances avec mvn dependency:go-offline, puis le répertoire src est ajouté et la commande mvn clean package -DskipTests génère le JAR. La seconde image, Eclipse Temurin 17 JRE, ne conserve que le JAR produit et démarre l'application avec java -jar app.jar. Cette séparation réduit la surface de l'image d'exécution en évitant d'y embarquer Maven et les fichiers source.")
add_text(doc, "Le port 8081 est exposé conformément à la configuration Spring Boot. Les tests ne sont pas exécutés dans ce Dockerfile ; ils sont séparés de la phase de conteneurisation et pris en charge par l'étape Tests Backend du pipeline Jenkins. Cette séparation doit être explicitée : une image construite avec -DskipTests n'est acceptable que si la chaîne CI exécute les tests avant la publication de l'image.")
add_heading(doc, "6.4.2 Image frontend", 3)
add_text(doc, "Le Dockerfile du frontend suit également deux étapes. Une image Node 22 Alpine copie les descripteurs de dépendances, installe les paquets, récupère le code et lance npm run build. La variable VITE_API_URL est passée comme argument de build puis injectée dans l'environnement de compilation Vite. La seconde étape s'appuie sur Nginx Alpine, remplace la configuration par défaut, copie le contenu du dossier dist et expose le port 80. La règle try_files de Nginx redirige les routes de la SPA vers index.html, ce qui permet de conserver le routage React après un rafraîchissement de page.")
add_figure(doc, "imagesdocker.png", "Figure 6.1 - Construction réussie des images Docker Matchia", "La phase de construction produit une image distincte pour le frontend et pour le backend. La capture suivante est retenue car elle montre le résultat des deux builds sans exposer de valeur confidentielle.", "Cette figure confirme que les deux artefacts applicatifs sont produits séparément. Cette indépendance facilite l'évolution d'une couche sans imposer la reconstruction de l'autre en dehors du pipeline qui les coordonne.", width=6.15)
add_heading(doc, "6.4.3 Base de données", 3)
add_text(doc, "La base métier de Matchia est PostgreSQL. Dans le fichier docker-compose.yml principal, elle n'est pas déclarée comme un service Docker : le backend utilise une URL JDBC fournie par variables d'environnement et, pour l'environnement local décrit, l'hôte host.docker.internal permet au conteneur d'atteindre PostgreSQL installé hors du réseau Compose. Cette précision est importante : le mémoire ne doit pas représenter un troisième conteneur PostgreSQL dans le Compose principal alors qu'il n'est pas présent dans ce fichier.")
add_text(doc, "Un PostgreSQL distinct est en revanche défini dans docker-compose.sonar.yml pour stocker les données propres à SonarQube. La séparation entre la base métier et la base d'outillage évite de confondre les données fonctionnelles de Matchia avec les métriques de qualité logicielle.")

add_heading(doc, "6.5 Orchestration avec Docker Compose", 2)
add_text(doc, "Le Compose principal orchestre deux services : backend et frontend. Le backend est construit à partir de MatchiaBackend/Dockerfile, publie le port 8081 et monte le répertoire uploads afin de préserver les fichiers générés. Le frontend est construit à partir de MatchiaFrontend/Dockerfile, reçoit l'URL API au build, publie le port 5173 vers le port 80 Nginx et dépend du backend. Les deux services sont attachés au réseau bridge matchia-network. Le mode restart unless-stopped traduit une volonté de reprise automatique après un redémarrage de l'hôte Docker, sans prétendre constituer à lui seul une stratégie de haute disponibilité.")
add_text(doc, "Deux autres fichiers Compose complètent cette architecture. docker-compose.jenkins.yml exécute Jenkins avec un service Docker-in-Docker, des certificats TLS et des volumes persistants. docker-compose.sonar.yml exécute SonarQube Community avec une base PostgreSQL dédiée, un healthcheck et des volumes pour les données, extensions et journaux. Cette organisation sépare l'exécution métier de l'outillage de build et de qualité.")
add_figure(doc, "containerdocker .png", "Figure 6.2 - Démarrage des conteneurs applicatifs via Docker Compose", "Après la construction des images, le démarrage local est réalisé par Docker Compose. La capture ci-dessous montre le lancement coordonné des deux conteneurs applicatifs.", "La sortie atteste que matchia-backend et matchia-frontend ont été démarrés. Elle illustre la reproductibilité de l'environnement local, tout en rappelant que la base métier reste un service externe dans cette configuration.", width=5.5)

add_heading(doc, "6.6 Intégration continue avec Jenkins", 2)
add_text(doc, "Le Jenkinsfile définit un pipeline déclaratif. Il désactive le checkout implicite afin de rendre explicite la récupération du code dans le stage Checkout, puis configure githubPush() comme déclencheur. Une variable AZURE_BACKEND_URL contient l'URL du backend déployé ; elle est utilisée lors de la construction du frontend pour produire une version qui pointe vers l'API Azure. Le pipeline est constitué de stages qui réalisent la construction, les tests backend, les analyses SonarQube, la création d'images, leur publication sur Docker Hub et la mise à jour des deux Container Apps.")
add_table(doc, ["Stage Jenkins", "Commande ou mécanisme vérifié", "Résultat attendu"], [
    ("Checkout", "checkout scm", "Récupération de la révision GitHub associée au build."),
    ("Build Backend", "./mvnw clean package -DskipTests", "Compilation Spring Boot et génération du JAR."),
    ("Build Frontend", "npm ci puis VITE_API_URL=... npm run build", "Installation déterministe et production de dist."),
    ("Tests Backend", "./mvnw test", "Exécution des tests Java et génération du rapport JaCoCo configuré dans Maven."),
    ("Sonar Backend", "sonar-maven-plugin avec rapport jacoco.xml", "Analyse statique du backend et remontée de couverture."),
    ("Sonar Frontend", "npx @sonar/scan avec token Jenkins", "Analyse du code TypeScript/React et du rapport lcov."),
    ("Docker Build", "docker build backend et frontend", "Création d'images locales version de build."),
    ("Push Docker Images", "tag build/latest puis docker push", "Publication des deux images sur Docker Hub."),
    ("Deploy Azure", "az containerapp update frontend et backend", "Création d'une nouvelle révision des Container Apps."),
], [1950, 4070, 3340])
add_caption(doc, "Tableau 6.2 - Stages réellement définis dans le Jenkinsfile")
add_figure(doc, "jenkins1.png", "Figure 6.3 - Exécution réussie du pipeline Matchia sous Jenkins", "La capture de Jenkins synthétise les stages exécutés lors d'un build réussi. Elle est particulièrement pertinente car sa séquence correspond aux étapes déclarées dans le Jenkinsfile.", "La figure montre le checkout, les builds backend et frontend, les tests backend, les analyses SonarQube, la construction et la publication Docker, puis les deux déploiements Azure. Elle constitue une preuve visuelle du déroulement de la chaîne CI/CD.", width=6.2)
add_callout(doc, "Limite observée", "Le Jenkinsfile ne contient pas de stage explicite waitForQualityGate. SonarQube est exécuté et une capture montre un Quality Gate validé, mais l'arrêt automatique du pipeline en attente du verdict du Quality Gate n'est pas visible dans le script. Cette étape doit être présentée comme une amélioration recommandée, non comme un verrou déjà codé.")

add_heading(doc, "6.7 Build du backend et 6.8 Build du frontend", 2)
add_text(doc, "Le backend est construit avec le Maven Wrapper présent dans MatchiaBackend. Le pipeline exécute d'abord clean package -DskipTests afin de produire l'artefact de déploiement, puis ./mvnw test dans un stage distinct. Le pom.xml déclare Java 17, Spring Boot, JPA, Security, Validation, Mail, PostgreSQL, Stripe, WebFlux, JWT, les starters de test et JaCoCo. Le rapport XML généré par JaCoCo est ensuite référencé par l'analyse Sonar Maven.")
add_text(doc, "Le frontend est construit avec Node.js 24 dans Jenkins. Le stage utilise npm ci, commande adaptée à package-lock.json et à une installation reproductible, puis npm run build. Ce script enchaîne la vérification TypeScript tsc -b et le build Vite. Le package.json définit également npm run test et npm run test:coverage, mais ces commandes ne sont pas appelées dans le Jenkinsfile courant. L'ajout d'un stage Tests Frontend avant l'analyse SonarQube constitue donc une amélioration prioritaire de la chaîne.")

add_heading(doc, "6.9 Tests automatisés", 2)
add_text(doc, "Le code source contient des tests backend dans MatchiaBackend/src/test et des tests frontend Vitest dans MatchiaFrontend/src. Le backend couvre notamment les services métier, les contrôles de sécurité, les transitions de financement et les services dealer. La configuration Maven intègre les dépendances de test Spring ainsi que Testcontainers pour PostgreSQL. Le frontend dispose de tests de pages publiques, services API, utilitaires de tenant, visibilité des modules, comparaison, stockage de session et assistant IA. Les rapports de couverture frontend existants utilisent le format lcov, conformément à sonar-project.properties.")
add_text(doc, "Le nombre de fichiers de test ne constitue pas à lui seul une preuve de qualité. Dans le mémoire, il convient de présenter les résultats réellement produits à la date de livraison - succès/échec, taux de couverture et périmètre - sans inventer de pourcentage. La capture SonarQube backend disponible affiche un Quality Gate validé mais une couverture de 0,0 % pour l'analyse capturée ; cette valeur doit être interprétée comme un état de l'outil à cet instant et non comme une couverture définitive du projet.")

add_heading(doc, "6.10 Analyse de qualité avec SonarQube", 2)
add_text(doc, "SonarQube est configuré pour les deux couches. Côté backend, le Jenkinsfile appelle le plugin sonar-maven-plugin et lui indique le chemin du rapport JaCoCo. Côté frontend, sonar-project.properties définit la clé du projet, les sources src, les exclusions de dépendances, de build, d'images et de composants UI, les tests .test.ts/.test.tsx ainsi que coverage/lcov.info. Le stage Jenkins utilise @sonar/scan avec les variables d'environnement de l'installation SonarQube et un credential dédié.")
add_text(doc, "L'objectif de cette analyse est de rendre visibles les problèmes de fiabilité, maintenabilité, sécurité, duplication et couverture. Elle donne à l'équipe un indicateur commun avant la publication d'une image. SonarQube Community possède toutefois des limites de couverture fonctionnelle ; l'analyse statique doit être complétée par les tests applicatifs, les revues de code et les contrôles de secrets. Il est notamment indispensable de ne jamais conserver un token dans une capture ou dans un fichier versionné.")
add_figure(doc, "SonarBackend.png", "Figure 6.4 - Tableau de bord SonarQube du backend Matchia", "La figure suivante est retenue pour illustrer les indicateurs de qualité du backend. Les valeurs affichées correspondent à l'analyse visible dans l'environnement SonarQube et doivent être datées dans la version finale du mémoire.", "Le Quality Gate apparaît comme validé, tandis que le tableau de bord expose les catégories de problèmes, la duplication et la couverture. La figure doit être accompagnée d'une interprétation factuelle : un Quality Gate vert ne dispense pas de corriger les problèmes restants ni d'améliorer la couverture affichée.", width=6.2)
add_callout(doc, "Capture exclue", "La capture SonarFrontend.png expose une valeur assimilable à un jeton dans l'éditeur. Elle a été analysée comme preuve de configuration du scan frontend, mais elle ne doit pas être insérée telle quelle dans le mémoire. Utiliser une capture assainie ou le tableau de bord SonarQube correspondant.")

add_heading(doc, "6.11 Pipeline CI/CD global", 2)
add_text(doc, "Le pipeline global de Matchia peut être résumé de la manière suivante : développeur -> GitHub -> Jenkins -> checkout -> build backend et frontend -> tests backend -> scans SonarQube backend et frontend -> Docker build -> Docker Hub -> déploiement backend Azure -> déploiement frontend Azure. Cette représentation doit respecter l'ordre réellement codé. Les deux scans s'exécutent après les tests backend ; le Quality Gate est visible dans l'outillage mais le script ne contient pas de mécanisme de blocage explicite ; les tests frontend sont disponibles dans le projet mais non déclenchés dans ce Jenkinsfile.")
add_table(doc, ["Entrée", "Contrôle", "Sortie"], [
    ("Commit/push GitHub", "Webhook githubPush et checkout SCM", "Révision source associée à un numéro de build Jenkins."),
    ("Code backend", "Maven, tests, JaCoCo, Sonar Maven", "JAR vérifié et mesures de qualité disponibles."),
    ("Code frontend", "npm ci, tsc -b, Vite, Sonar scanner", "Assets dist et mesures de qualité disponibles."),
    ("Artefacts", "Docker build et tags build/latest", "Images frontend/backend sur Docker Hub."),
    ("Images", "az containerapp update", "Nouvelles révisions frontend et backend sur Azure Container Apps."),
], [2100, 4000, 3260])
add_caption(doc, "Tableau 6.3 - Chaîne CI/CD de Matchia")

add_heading(doc, "6.12 Déploiement sur Azure", 2)
add_text(doc, "Le Jenkinsfile configure une URL backend sous le domaine Azure Container Apps et exécute, pour chaque composant, la commande az containerapp update. Les images sont tirées de Docker Hub et portent à la fois un tag correspondant au numéro de build et un tag latest. Le déploiement précise le groupe de ressources rg-matchia et ajoute un suffixe de révision v$BUILD_NUMBER. Cette pratique permet d'identifier la révision livrée et de distinguer les mises à jour successives des Container Apps.")
add_text(doc, "Le dépôt met donc en évidence Azure Container Apps pour le frontend et le backend, ainsi que Docker Hub comme registry. Il ne permet pas d'affirmer que les images sont stockées dans Azure Container Registry, car aucune commande ou configuration ACR n'est présente. Le fichier de procédure de redéploiement mentionne une base PostgreSQL Azure et la remise en service des ingress des deux Container Apps ; cette information peut être présentée comme procédure d'exploitation fournie avec le projet. En revanche, la capture azure.png ne montre qu'une page d'accueil du portail, sans ressource Matchia identifiable : elle ne doit pas être utilisée comme preuve du déploiement.")
add_figure(doc, "tenantDéploy.png", "Figure 6.5 - Marketplace tenant déployée sur Azure Container Apps", "La preuve applicative la plus utile du déploiement est la consultation d'une marketplace tenant via l'URL Azure Container Apps. La capture suivante montre la marketplace test1234 chargée avec son paramètre de tenant.", "Cette figure démontre que le frontend déployé restitue une expérience de marketplace configurée par tenant. Elle complète la capture Jenkins : la première atteste le déroulement du pipeline, tandis que celle-ci atteste le résultat applicatif accessible après déploiement.", width=6.2)

add_heading(doc, "6.13 Architecture de déploiement", 2)
add_text(doc, "L'architecture finale peut être représentée par le chemin suivant : utilisateur -> frontend React servi par Nginx dans une Azure Container App -> API Spring Boot dans une Azure Container App -> PostgreSQL. Le pipeline Jenkins construit les images, les publie dans Docker Hub et met à jour les deux Container Apps. Stripe, Gemini et SMTP restent des services externes appelés uniquement par le backend. Les uploads doivent être associés à un stockage persistant ; en local, le Compose monte un volume vers le répertoire uploads. Pour une exploitation cloud durable, le stockage, la sauvegarde et la politique de conservation doivent être explicitement configurés et documentés.")
add_callout(doc, "Figure à produire dans le mémoire", "Dessiner un diagramme de déploiement avec les éléments vérifiés : GitHub, Jenkins, SonarQube, Docker Hub, Azure Container App Frontend, Azure Container App Backend, PostgreSQL, Stripe, Gemini, SMTP et stockage des uploads. Ne représenter Azure Container Registry qu'en cas de migration effective vers ce service.")

add_heading(doc, "6.14 Cycle de vie des ressources Azure", 2)
add_text(doc, "Le fichier Redéploiement.txt documente une procédure opérationnelle : redémarrage de PostgreSQL Azure, remise à disposition des ingress des Container Apps backend et frontend, reconnexion Azure CLI dans Jenkins si la session a expiré, puis relance du tunnel temporaire et vérification du webhook GitHub. Cette procédure traduit la nécessité de gérer l'état des ressources entre deux périodes de travail, notamment lorsque certaines ressources sont arrêtées pour limiter la consommation.")
add_text(doc, "Le redéploiement applicatif reste centré sur la chaîne CI/CD : modification du code, push GitHub, lancement Jenkins, construction, publication d'une nouvelle image puis mise à jour de la Container App. Le suffixe de révision utilisé par Jenkins facilite le suivi des versions. Avant une mise en production élargie, il est recommandé de formaliser une stratégie de retour arrière fondée sur les révisions Container Apps, un contrôle de santé applicatif, des sauvegardes de la base et une supervision centralisée.")

add_heading(doc, "6.15 Variables d'environnement et secrets", 2)
add_text(doc, "Les configurations Spring, Docker et Vite utilisent des variables d'environnement pour l'URL de la base, les identifiants, l'URL de l'API, les URLs publiques, les paramètres Stripe, la clé Gemini, le secret JWT, la messagerie et les répertoires de fichiers. Cette externalisation est indispensable pour distinguer les environnements local, CI et cloud. Dans le pipeline, les identifiants Docker Hub et le token Sonar sont récupérés via les mécanismes de credentials Jenkins, ce qui évite de les inscrire directement dans le Jenkinsfile.")
add_text(doc, "La configuration actuellement visible contient également des valeurs de développement et certains artefacts de travail peuvent exposer des informations sensibles. Ces valeurs ne doivent jamais apparaître dans le mémoire. La cible de production doit privilégier des secrets injectés par Azure Container Apps ou un coffre-fort tel qu'Azure Key Vault, une rotation des clés, une base sans mot de passe par défaut, ainsi que la désactivation des logs de débogage inutiles. Cette recommandation est particulièrement importante pour une solution manipulant des données bancaires, des dossiers et des documents clients.")

add_heading(doc, "6.16 Sélection et interprétation des captures", 2)
add_text(doc, "Le dossier figure a été parcouru. Les captures suivantes sont retenues car elles apportent une preuve distincte et académique sans redondance. Les captures de tokens, clés API, mots de passe, configuration détaillée de connexion ou portail Azure générique doivent être écartées ou intégralement anonymisées.")
add_table(doc, ["Figure", "Fichier source", "Emplacement et rôle"], [
    ("Figure 6.1", "imagesdocker.png", "Section 6.4.2 ; confirme la construction des images frontend et backend."),
    ("Figure 6.2", "containerdocker .png", "Section 6.5 ; montre le démarrage des deux conteneurs applicatifs."),
    ("Figure 6.3", "jenkins1.png", "Section 6.6 ; visualise l'exécution complète du pipeline et ses stages."),
    ("Figure 6.4", "SonarBackend.png", "Section 6.10 ; présente un tableau de bord de qualité backend et le Quality Gate."),
    ("Figure 6.5", "tenantDéploy.png", "Section 6.12 ; démontre le résultat accessible du déploiement tenant sur Azure."),
    ("À exclure/assainir", "SonarFrontend.png, dockercompose.png, clés/tokens", "Ces captures peuvent contenir un jeton, un mot de passe ou une valeur d'environnement. Les anonymiser avant toute utilisation."),
    ("À exclure comme preuve", "azure.png", "Le portail Azure affiché ne montre pas une ressource Matchia identifiable ; il ne démontre pas le déploiement."),
], [1500, 2800, 5060])
add_caption(doc, "Tableau 6.4 - Captures DevOps retenues et règles d'utilisation")

add_heading(doc, "6.17 Difficultés rencontrées et solutions apportées", 2)
add_text(doc, "Les fichiers disponibles permettent d'identifier des difficultés de configuration sans en faire un journal d'erreurs. Premièrement, l'environnement comporte plusieurs services locaux - application, Jenkins, SonarQube et PostgreSQL - qui requièrent des réseaux, volumes et dépendances distincts. La solution mise en place est la séparation en fichiers Compose dédiés et l'usage de Docker-in-Docker pour permettre à Jenkins de construire et de publier les images. Deuxièmement, le frontend doit connaître l'URL du backend au moment de sa compilation Vite. Le pipeline injecte donc AZURE_BACKEND_URL par argument de build, ce qui évite de livrer un frontend pointant vers l'environnement local.")
add_text(doc, "Troisièmement, la qualité de deux écosystèmes technologiques différents doit être consolidée. Le projet utilise JaCoCo et le plugin Maven pour le backend, et lcov avec @sonar/scan pour le frontend. Enfin, le déploiement cloud peut nécessiter une reconnexion de la CLI Azure et la remise en service de ressources arrêtées. La procédure de redéploiement documente ces opérations. Les améliorations recommandées sont l'automatisation du contrôle Quality Gate, l'exécution des tests frontend dans Jenkins, la centralisation des secrets et l'ajout de contrôles de santé et de rollback.")

add_heading(doc, "6.18 Bilan DevOps", 2)
add_text(doc, "La chaîne DevOps de Matchia apporte de la reproductibilité à un projet composé de deux applications et de plusieurs services externes. Docker garantit une construction homogène du backend et du frontend ; Docker Compose facilite l'exécution locale ; Jenkins relie la version GitHub à un pipeline de build, test, analyse, image et déploiement ; SonarQube rend visibles des indicateurs de qualité ; Azure Container Apps permet de livrer les services sous forme de révisions. Cette chaîne réduit les opérations manuelles et constitue une base solide pour l'exploitation d'une plateforme SaaS.")
add_text(doc, "Son niveau de maturité doit toutefois être présenté avec précision. L'automatisation de l'analyse SonarQube est en place, mais le verrou Quality Gate explicite et les tests frontend dans le Jenkinsfile restent à renforcer. Les secrets et les données de connexion doivent être retirés des configurations locales et des captures. Ces améliorations ne remettent pas en cause les éléments réalisés ; elles définissent la trajectoire nécessaire pour rapprocher le prototype d'une exploitation de production soumise à des contraintes bancaires.")

add_heading(doc, "6.19 Conclusion", 2)
add_text(doc, "Ce chapitre a présenté les mécanismes d'industrialisation réellement implémentés dans Matchia. La conteneurisation sépare les couches frontend et backend, l'orchestration locale structure leur exécution, Jenkins automatise la livraison, SonarQube fournit un retour sur la qualité et Azure Container Apps reçoit les nouvelles révisions. La démarche DevOps prolonge ainsi l'architecture SaaS : elle rend l'évolution de la plateforme plus reproductible, plus traçable et plus facile à déployer pour l'ensemble des tenants bancaires.")

doc.core_properties.title = "Conception, développement et déploiement d’une plateforme SaaS multi-tenant pour la gestion de marketplaces bancaires avec mise en place d’un pipeline CI/CD"
doc.core_properties.subject = "Rapport PFE Master - plateforme SaaS bancaire multi-tenant"
doc.core_properties.author = "Matchia PFE"
doc.save(OUT)
print(OUT)
