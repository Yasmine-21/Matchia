from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = Path(r"D:\PFE M2\Platforme SaaS")
OUT = ROOT / "document_work" / "Chapitres_4_5_Matchia_Revision_Inscription_Client.docx"
ASSETS = ROOT / "figure"
DIAGRAMS = ROOT / "document_work" / "generated_ch4_ch5_diagrams"
DIAGRAMS.mkdir(parents=True, exist_ok=True)

NAVY = "0B2545"; BLUE = "2E74B5"; DARK = "1F4D78"; GREY = "5B6573"; LIGHT = "F4F6F9"; BORDER = "D6DCE5"; BLACK = "202124"

def font(size, bold=False):
    choices = [r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\calibri.ttf"]
    for name in choices:
        if os.path.exists(name):
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()

def png_draw_base(name, height=1000):
    im = Image.new("RGB", (1800, height), "white")
    return im, ImageDraw.Draw(im), DIAGRAMS / name

def center_text(draw, box, text, size=30, bold=False, fill="202124"):
    if isinstance(fill, str) and not fill.startswith('#'):
        fill = '#' + fill
    f = font(size, bold)
    x1,y1,x2,y2 = box
    words = text.split()
    lines=[]; current=""
    maxw=max(20,x2-x1-28)
    for word in words:
        test=(current+" "+word).strip()
        if draw.textbbox((0,0),test,font=f)[2] <= maxw:
            current=test
        else:
            lines.append(current); current=word
    if current: lines.append(current)
    total=sum(draw.textbbox((0,0),ln,font=f)[3]-draw.textbbox((0,0),ln,font=f)[1] for ln in lines)+(len(lines)-1)*8
    y=y1+(y2-y1-total)/2
    for ln in lines:
        bb=draw.textbbox((0,0),ln,font=f); w=bb[2]-bb[0]; h=bb[3]-bb[1]
        draw.text((x1+(x2-x1-w)/2,y),ln,font=f,fill=fill)
        y += h+8

def box(draw, rect, text, *, size=29, fill="F7F8FA", outline="202124", rounded=18):
    draw.rounded_rectangle(rect, radius=rounded, fill="#"+fill, outline="#"+outline, width=3)
    center_text(draw, rect, text, size=size, bold=True)

def arrow(draw, a, b, label=None):
    draw.line([a,b], fill="#202124", width=4)
    import math
    ang=math.atan2(b[1]-a[1], b[0]-a[0]); s=16
    p1=(b[0]-s*math.cos(ang-0.5), b[1]-s*math.sin(ang-0.5)); p2=(b[0]-s*math.cos(ang+0.5), b[1]-s*math.sin(ang+0.5))
    draw.polygon([b,p1,p2], fill="#202124")
    if label:
        mx=(a[0]+b[0])/2; my=(a[1]+b[1])/2
        draw.rounded_rectangle((mx-105,my-19,mx+105,my+19), radius=8, fill="white")
        center_text(draw,(mx-100,my-18,mx+100,my+18),label,20,False)

def generate_diagrams():
    # Figure 4.1 : complete onboarding / payment / activation sequence
    im,d,p = png_draw_base("fig_4_1_onboarding_paiement.png", 1260)
    actors=[("Banque",130),("Formulaire public",450),("Back-office SaaS",820),("Stripe",1190),("Back-office Banque",1570)]
    for label,x in actors:
        box(d,(x-110,45,x+110,125),label,size=24,fill="F2F2F2")
        d.line((x,130,x,1160),fill="#7A7A7A",width=2)
    events=[(130,450,190,"remplir la demande"),(450,820,290,"soumettre / notifier"),(820,130,390,"contrôle : approuver / refuser"),(820,130,490,"email : lien de paiement"),(130,1190,590,"paiement sécurisé"),(1190,820,700,"confirmation de paiement"),(820,1570,810,"activer marketplace + abonnement"),(820,130,915,"email : identifiants banque"),(130,1570,1020,"connexion au back-office Banque")]
    for x1,x2,y,l in events: arrow(d,(x1,y),(x2,y),l)
    d.text((55,1185),"L’automatisation limite l’intervention humaine au contrôle SaaS et place l’activation après la confirmation de paiement côté serveur.",font=font(22,True),fill="#202124")
    im.save(p)

    # Figure 4.1 : public marketplace request workflow
    im,d,p = png_draw_base("fig_4_1_demande_marketplace.png", 760)
    steps=["Accès\n/rejoindre", "Informations\nbancaires", "Contact +\ncode e-mail", "Marketplace +\nstores/modules", "Récapitulatif\net soumission"]
    xs=[45,390,735,1080,1425]
    for i,(x,label) in enumerate(zip(xs,steps)):
        box(d,(x,260,x+300,420),label,size=25,fill="F7F7F7")
        if i < len(xs)-1: arrow(d,(x+300,340),(xs[i+1]-12,340))
    d.rounded_rectangle((170,520,1630,650),radius=18,fill="#FAFAFA",outline="#444444",width=2)
    center_text(d,(195,535,1605,635),"Le code e-mail à six chiffres est obligatoire avant la soumission. Les détails stores/modules, leurs paramètres et leurs prix sont mémorisés dans la demande.",26,False)
    im.save(p)

    # Figure 4.2 : approval to activation
    im,d,p = png_draw_base("fig_4_2_approbation_activation.png", 960)
    actors=[("Banque",160),("SaaS",540),("Stripe",920),("Services Matchia",1320),("Admin banque",1660)]
    for lab,x in actors:
        box(d,(x-105,45,x+105,125),lab,size=20,fill="F2F2F2"); d.line((x,130,x,875),fill="#777777",width=2)
    events=[(160,540,190,"demande PENDING"),(540,540,280,"analyse / approbation"),(540,920,385,"lien ou session paiement"),(920,540,490,"confirmation paiement"),(540,1320,600,"activer banque + marketplace + abonnement"),(1320,1660,710,"activer compte + identifiants"),(1320,160,820,"notification + email")]
    for a,b,y,l in events: arrow(d,(a,y),(b,y),l)
    d.text((80,910),"À l’approbation, les objets sont provisionnés à l’état inactif. Le succès du paiement est le seul déclencheur de l’activation effective.",font=font(23,False),fill="#202124")
    im.save(p)

    # Figure 4.3 : subscription change request
    im,d,p = png_draw_base("fig_4_3_renouvellement_ajout_services.png", 720)
    steps=["Banque : renouveler\nou demander un store", "Demande\nPENDING", "SaaS : validation\nou rejet", "Paiement\nPENDING → PAID", "Abonnement / services\nmis à jour"]
    xs=[40,380,720,1060,1400]
    for i,(x,label) in enumerate(zip(xs,steps)):
        box(d,(x,245,x+300,410),label,size=24,fill="F7F7F7")
        if i<len(xs)-1: arrow(d,(x+300,327),(xs[i+1]-12,327))
    d.rounded_rectangle((235,510,1565,625),radius=18,fill="#FAFAFA",outline="#444444",width=2)
    center_text(d,(260,525,1540,610),"Les ajouts de stores et de modules sont des demandes distinctes. Le renouvellement crée une demande de type RENEWAL et prolonge l’abonnement après paiement validé.",25,False)
    im.save(p)

    # Figure 4.2 config store
    im,d,p = png_draw_base("fig_4_2_configuration_store.png", 680)
    steps=["Catalogue global", "Sélection du store", "Paramètres et modules", "Visibilité tenant", "Publication"]
    xs=[50,390,730,1070,1410]
    for i,(x,label) in enumerate(zip(xs,steps)):
        box(d,(x,235,x+280,400),label,size=26,fill="F7F7F7")
        if i<len(xs)-1: arrow(d,(x+280,317),(xs[i+1]-15,317))
    d.rounded_rectangle((155,470,1645,595),radius=16,outline="#4E4E4E",width=2,fill="#FAFAFA")
    center_text(d,(175,480,1625,585),"La configuration est stockée au niveau MarketplaceStore / MarketplaceStoreModule : elle réutilise le catalogue sans dupliquer le code ni les données produit.",27,False)
    im.save(p)

    # Figure 4.4 : renewal / upgrade of a subscription
    im,d,p = png_draw_base("fig_4_4_evolution_abonnement.png", 700)
    flow=[("Banque : renouvellement, upgrade ou ajout",(45,240,340,425)),("Nouvelle demande SaaS",(405,240,700,425)),("Validation de l’évolution",(765,240,1060,425)),("Paiement",(1125,240,1420,425)),("Abonnement mis à jour et services activés",(1485,240,1780,425))]
    for label,rect in flow:
        box(d,rect,label,size=25,fill="F7F7F7")
    for i in range(len(flow)-1):
        arrow(d,(flow[i][1][2],332),(flow[i+1][1][0]-12,332))
    d.rounded_rectangle((190,510,1610,625),radius=16,outline="#4E4E4E",width=2,fill="#FAFAFA")
    center_text(d,(215,522,1585,612),"Aucun store, module ou droit supplémentaire n’est activé avant la validation SaaS et la confirmation du paiement associé.",27,False)
    im.save(p)

    # Figure 4.3 subscription state
    im,d,p = png_draw_base("fig_4_3_etats_abonnement.png", 680)
    states=[("PENDING_\nPAYMENT",(80,240,350,395)),("ACTIVE",(545,240,815,395)),("PENDING_\nRENEWAL",(1010,240,1280,395)),("EXPIRED",(1465,240,1735,395))]
    for lbl,r in states: box(d,r,lbl,size=27,fill="F5F5F5")
    arrow(d,(350,317),(545,317),"paiement confirmé")
    arrow(d,(815,317),(1010,317),"échéance proche")
    arrow(d,(1280,317),(1465,317),"non-renouvellement")
    arrow(d,(1145,240),(680,170),"renouvellement payé")
    d.text((80,490),"Annulation ou échec de paiement : l'abonnement reste non actif ; les accès tenant sont contrôlés par cet état.",font=font(27,False),fill="#202124")
    im.save(p)

    # Figure 5.1 dealer flow
    im,d,p = png_draw_base("fig_5_1_parcours_concessionnaire.png", 760)
    nodes=[("Dossier public",(80,260,360,405)),("Vérification SaaS",(485,260,765,405)),("Compte DEALER_ADMIN",(890,260,1170,405)),("Partenariat banque",(1295,260,1575,405))]
    for lbl,r in nodes: box(d,r,lbl,size=26,fill="F7F7F7")
    for i in range(3): arrow(d,(nodes[i][1][2],332),(nodes[i+1][1][0]-12,332))
    d.rounded_rectangle((440,500,1360,640),radius=16,fill="#FAFAFA",outline="#444444",width=2)
    center_text(d,(470,515,1330,625),"Après accord et contrat actif, le concessionnaire peut soumettre un produit à la banque. La publication reste soumise à une décision bancaire.",27,False)
    im.save(p)

    # Figure 5.2 states publication
    im,d,p = png_draw_base("fig_5_2_etats_publication.png", 760)
    states=[("BROUILLON",(55,275,325,415)),("SOUMISE",(420,275,690,415)),("APPROUVÉE",(785,275,1055,415)),("PUBLIÉE",(1150,275,1420,415)),("RETIRÉE",(1515,275,1785,415))]
    for lbl,r in states: box(d,r,lbl,size=25,fill="F5F5F5")
    for i in range(4): arrow(d,(states[i][1][2],345),(states[i+1][1][0]-10,345))
    arrow(d,(555,275),(190,185),"correction demandée")
    d.text((120,555),"Précondition de publication : concessionnaire actif + partenariat actif + contrat valide + store actif dans la marketplace.",font=font(27,False),fill="#202124")
    im.save(p)

    # Figure 5.3 finance activity
    im,d,p = png_draw_base("fig_5_3_activite_financement.png", 1030)
    boxes=[("Client choisit un produit et simule",(520,65,1280,165)),("Création du brouillon",(600,235,1200,335)),("Pièces obligatoires complètes ?",(580,405,1220,505)),("Soumission à la banque",(600,595,1200,695)),("Décision bancaire et notification",(510,780,1290,880))]
    for lbl,r in boxes: box(d,r,lbl,size=28,fill="F7F7F7")
    for i in range(4): arrow(d,((boxes[i][1][0]+boxes[i][1][2])//2,boxes[i][1][3]),((boxes[i+1][1][0]+boxes[i+1][1][2])//2,boxes[i+1][1][1]-10))
    d.polygon([(900,535),(1020,590),(900,645),(780,590)],outline="#202124",fill="#F7F7F7")
    d.text((1040,545),"non",font=font(25,True),fill="#202124"); d.text((922,625),"oui",font=font(25,True),fill="#202124")
    arrow(d,(780,590),(320,590),"compléter les pièces")
    im.save(p)

    # Figure 5.4 financing sequence
    im,d,p = png_draw_base("fig_5_4_sequence_financement.png", 1000)
    actors=[("Client",180),("Marketplace",570),("API métier",970),("Banque",1370),("Concessionnaire",1690)]
    for lab,x in actors:
        box(d,(x-100,45,x+100,125),lab,size=22,fill="F2F2F2"); d.line((x,130,x,930),fill="#777777",width=2)
    events=[(180,570,200,"simulation"),(180,570,300,"dossier + pièces"),(570,970,395,"contrôle / création"),(970,1370,510,"dossier PENDING"),(1370,970,620,"ACCEPTED / REJECTED"),(970,1690,730,"réserver stock si accepté"),(970,180,835,"notification")]
    for a,b,y,l in events: arrow(d,(a,y),(b,y),l)
    im.save(p)

    # Figure 5.5 AI sequence
    im,d,p = png_draw_base("fig_5_5_ia_securisee.png", 1000)
    actors=[("Admin SaaS",160),("Widget React",500),("API IA",840),("Gemini",1180),("PostgreSQL",1530)]
    for lab,x in actors:
        box(d,(x-105,45,x+105,125),lab,size=21,fill="F2F2F2"); d.line((x,130,x,930),fill="#777777",width=2)
    events=[(160,500,200,"question"),(500,840,290,"requête authentifiée"),(840,1180,385,"schéma filtré + question"),(1180,840,480,"SQL proposé"),(840,840,575,"validation SELECT / whitelist"),(840,1530,680,"SELECT + LIMIT 50"),(1530,840,775,"résultats"),(840,500,870,"réponse reformulée")]
    for a,b,y,l in events: arrow(d,(a,y),(b,y),l)
    d.text((190,950),"Toute requête non conforme (DML, DDL, commentaire, colonne sensible, jointure non autorisée) est rejetée avant exécution.",font=font(23,False),fill="#202124")
    im.save(p)

def set_cell_shading(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)

def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr(); tcMar=tcPr.first_child_found_in('w:tcMar')
    if tcMar is None: tcMar=OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for m,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=tcMar.find(qn('w:'+m))
        if node is None: node=OxmlElement('w:'+m); tcMar.append(node)
        node.set(qn('w:w'),str(v)); node.set(qn('w:type'),'dxa')

def set_table_geometry(table, widths):
    table.autofit=False; table.alignment=WD_TABLE_ALIGNMENT.LEFT
    tblPr=table._tbl.tblPr
    tblW=tblPr.first_child_found_in('w:tblW')
    if tblW is None: tblW=OxmlElement('w:tblW'); tblPr.append(tblW)
    tblW.set(qn('w:w'),str(sum(widths))); tblW.set(qn('w:type'),'dxa')
    ind=tblPr.first_child_found_in('w:tblInd')
    if ind is None: ind=OxmlElement('w:tblInd'); tblPr.append(ind)
    ind.set(qn('w:w'),'120'); ind.set(qn('w:type'),'dxa')
    grid=table._tbl.tblGrid
    for col,w in zip(grid.gridCol_lst,widths): col.set(qn('w:w'),str(w))
    for row in table.rows:
        for cell,w in zip(row.cells,widths):
            cell.width=Inches(w/1440); tcPr=cell._tc.get_or_add_tcPr(); tcW=tcPr.first_child_found_in('w:tcW')
            if tcW is None: tcW=OxmlElement('w:tcW'); tcPr.append(tcW)
            tcW.set(qn('w:w'),str(w)); tcW.set(qn('w:type'),'dxa'); set_cell_margins(cell)

def set_repeat_header(row):
    trPr=row._tr.get_or_add_trPr(); tag=OxmlElement('w:tblHeader'); tag.set(qn('w:val'),'true'); trPr.append(tag)

def add_page_number(paragraph):
    paragraph.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    r=paragraph.add_run('Page '); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); r._r.addnext(fld)

def apply_font(run, size=None, color=None, bold=None, italic=None):
    run.font.name='Calibri'; run._element.rPr.rFonts.set(qn('w:ascii'),'Calibri'); run._element.rPr.rFonts.set(qn('w:hAnsi'),'Calibri')
    if size: run.font.size=Pt(size)
    if color: run.font.color.rgb=RGBColor.from_string(color.lstrip('#'))
    if bold is not None: run.bold=bold
    if italic is not None: run.italic=italic

def para(doc, text='', style=None, bold_prefix=None):
    p=doc.add_paragraph(style=style)
    if bold_prefix and text.startswith(bold_prefix):
        r=p.add_run(bold_prefix); apply_font(r,bold=True)
        r=p.add_run(text[len(bold_prefix):]); apply_font(r)
    else:
        r=p.add_run(text); apply_font(r)
    return p

def add_heading(doc, text, level=1):
    p=doc.add_paragraph(style=f'Heading {level}'); r=p.add_run(text); apply_font(r); return p

def add_caption(doc, text):
    p=doc.add_paragraph(style='Caption'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=p.add_run(text); apply_font(r, size=9, color=GREY, italic=True); return p

def add_figure(doc, path, caption, width=6.25):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(6); p.paragraph_format.space_after=Pt(3)
    run=p.add_run(); shape=run.add_picture(str(path), width=Inches(width))
    shape._inline.docPr.set('descr', caption)
    shape._inline.docPr.set('title', caption)
    add_caption(doc,caption)

def add_placeholder(doc, label, title, instruction):
    t=doc.add_table(rows=1,cols=1); set_table_geometry(t,[9360]); set_repeat_header(t.rows[0]); c=t.cell(0,0); set_cell_shading(c,'F7F7F7'); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=p.add_run(label); apply_font(r,10,BLUE,True)
    p=c.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run(title); apply_font(r,12,BLACK,True)
    p=c.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run(instruction); apply_font(r,9,GREY,italic=True)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)
    add_caption(doc, f"{label} - {title}.")

def add_matrix(doc, headers, rows, widths):
    tbl=doc.add_table(rows=1,cols=len(headers)); tbl.style='Table Grid'; set_table_geometry(tbl,widths); set_repeat_header(tbl.rows[0])
    for cell,h in zip(tbl.rows[0].cells,headers):
        set_cell_shading(cell,'F4F6F9'); p=cell.paragraphs[0]; r=p.add_run(h); apply_font(r,9,BLACK,True)
    for vals in rows:
        cells=tbl.add_row().cells
        for cell,v in zip(cells,vals):
            p=cell.paragraphs[0]; r=p.add_run(v); apply_font(r,9,BLACK)
    doc.add_paragraph().paragraph_format.space_after=Pt(3)
    return tbl

def add_bullets(doc, items):
    for item in items:
        p=doc.add_paragraph(style='List Bullet'); r=p.add_run(item); apply_font(r)

def setup(doc):
    sec=doc.sections[0]; sec.top_margin=Inches(1); sec.bottom_margin=Inches(1); sec.left_margin=Inches(1); sec.right_margin=Inches(1); sec.header_distance=Inches(.492); sec.footer_distance=Inches(.492)
    styles=doc.styles
    normal=styles['Normal']; normal.font.name='Calibri'; normal._element.rPr.rFonts.set(qn('w:ascii'),'Calibri'); normal._element.rPr.rFonts.set(qn('w:hAnsi'),'Calibri'); normal.font.size=Pt(11); normal.font.color.rgb=RGBColor.from_string(BLACK); normal.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY; normal.paragraph_format.space_after=Pt(8); normal.paragraph_format.line_spacing=1.333
    for name,size,color,before,after in [('Heading 1',16,BLUE,18,10),('Heading 2',13,BLUE,12,6),('Heading 3',12,DARK,8,4)]:
        st=styles[name]; st.font.name='Calibri'; st._element.rPr.rFonts.set(qn('w:ascii'),'Calibri'); st._element.rPr.rFonts.set(qn('w:hAnsi'),'Calibri'); st.font.size=Pt(size); st.font.color.rgb=RGBColor.from_string(color); st.font.bold=True; st.paragraph_format.space_before=Pt(before); st.paragraph_format.space_after=Pt(after); st.paragraph_format.keep_with_next=True
    cap=styles['Caption']; cap.font.name='Calibri'; cap.font.size=Pt(9); cap.font.color.rgb=RGBColor.from_string(GREY); cap.paragraph_format.space_after=Pt(8)
    for s in ['List Bullet','List Number']:
        styles[s].font.name='Calibri'; styles[s].font.size=Pt(11); styles[s].paragraph_format.space_after=Pt(4); styles[s].paragraph_format.line_spacing=1.208
    header=sec.header.paragraphs[0]; header.alignment=WD_ALIGN_PARAGRAPH.LEFT; r=header.add_run('MATCHIA | RÉALISATION'); apply_font(r,9,GREY,True)
    footer=sec.footer.paragraphs[0]; add_page_number(footer)

def cover(doc):
    for _ in range(7): doc.add_paragraph()
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run('MÉMOIRE DE FIN D’ÉTUDES'); apply_font(r,11,BLUE,True)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(16); p.paragraph_format.space_after=Pt(10)
    r=p.add_run('Conception, développement et déploiement d’une plateforme SaaS multi-tenant pour la gestion de marketplaces bancaires avec mise en place d’un pipeline CI/CD'); apply_font(r,24,NAVY,True)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(20); r=p.add_run('Chapitres 4 et 5 : réalisation fonctionnelle et parcours métier'); apply_font(r,15,DARK,False)
    for _ in range(7): doc.add_paragraph()
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run('Plateforme Matchia | Version documentaire'); apply_font(r,11,GREY,italic=True)
    doc.add_page_break()

def chapter4(doc):
    add_heading(doc,'Chapitre 4 — Réalisation du SaaS bancaire : onboarding, marketplace, abonnement et paiement',1)
    para(doc,"Ce chapitre présente la réalisation fonctionnelle du modèle SaaS de Matchia. Une même application permet d’instancier plusieurs marketplaces bancaires configurables, sans branchement du code par banque. Le fonctionnement complet relie la demande initiale, le contrôle réalisé depuis le back-office SaaS, le paiement sécurisé, l’activation du tenant puis l’accès au back-office Banque. Cette chaîne rend visible la dépendance essentielle entre abonnement valide, paiement confirmé et disponibilité effective des services.")
    add_heading(doc,'4.1 Organisation de l’interface et prise en compte du tenant',2)
    para(doc,"L’interface React est organisée par espaces fonctionnels. Les routes publiques donnent accès à l’inscription, à la découverte des banques et aux stores. Les routes protégées isolent le back-office SaaS, l’espace banque, l’espace concessionnaire et l’espace client. Cette organisation évite qu’un utilisateur connecté à une banque visualise ou administre les ressources d’un autre tenant.")
    add_bullets(doc,["Le layout SaaS centralise le pilotage de la plateforme, des banques, des offres, des demandes et de l’audit.","Le layout banque restreint les écrans aux utilisateurs, stores, modules, contenus, produits, concessionnaires, financements, abonnements, branding et paramètres de la banque connectée.","Le layout marketplace reprend le contexte du tenant depuis l’URL et adapte l’en-tête, les couleurs, les bannières, les stores et les modules visibles.","Le layout concessionnaire concentre les partenariats, contrats, produits, publications et demandes de financement qui lui sont affectées."])
    para(doc,"Le contexte tenant est transporté par le slug de marketplace et synchronisé côté client afin de charger les ressources de la banque concernée. Le catalogue est donc commun au niveau SaaS, tandis que les associations de stores, de modules, de paramètres et de visibilité sont propres à chaque marketplace. Cette méthode réduit les duplications tout en garantissant une expérience distincte par banque.")
    add_figure(doc,DIAGRAMS/'fig_4_2_configuration_store.png','Figure 4.1 — Activité de configuration d’un store dans une marketplace.',6.25)
    para(doc,"La figure 4.1 illustre cette séparation : un store ne devient visible que lorsque la banque l’a sélectionné, configuré et publié. Les modules sont associés au store dans le contexte de la marketplace ; ils peuvent ainsi être activés ou masqués sans modification du code de l’application commune.")
    add_heading(doc,'4.2 Back-office SaaS : demande, paiement et activation de la marketplace',2)
    para(doc,"Le back-office SaaS orchestre le cycle de création d’une marketplace bancaire. Ce cycle ne se limite pas à l’enregistrement d’une banque : il coordonne la collecte de la demande, sa vérification, la notification de la décision, la souscription, le paiement, l’activation technique et la remise des accès au responsable bancaire. L’automatisation de ces transitions réduit les tâches manuelles répétitives et garantit que les droits ne sont ouverts qu’après satisfaction des prérequis commerciaux et techniques.")
    add_heading(doc,'4.2.1 Remplissage et soumission de la demande de marketplace',3)
    para(doc,"Le parcours commence côté banque par le remplissage d’un formulaire de demande de marketplace. Le demandeur renseigne les informations institutionnelles, les coordonnées du contact, le nom et le slug souhaités pour la marketplace, les éléments de personnalisation ainsi que les stores et modules demandés. La soumission crée un dossier à l’état en attente et génère une notification destinée à l’administrateur SaaS. À ce stade, aucun accès au back-office Banque et aucune marketplace publique ne sont encore actifs.")
    add_heading(doc,'4.2.2 Traitement SaaS, notifications et décision',3)
    para(doc,"L’administrateur SaaS consulte la demande depuis une file de traitement. Il vérifie les informations de la banque, la cohérence de la marketplace proposée, la configuration des stores et modules ainsi que les éléments commerciaux associés. Les actions d’approbation ou de refus sont tracées et accompagnées de notifications. Un refus maintient la marketplace inactive et peut être communiqué avec un motif ; une approbation prépare la souscription et déclenche l’envoi de l’email de paiement.")
    para(doc,"Le tableau de bord consolidé donne une vision immédiate des banques actives, demandes en attente, utilisateurs, stores activés, revenus mensuels, distribution des marketplaces et alertes d’échéance. Il permet de prioriser les actions et de suivre le résultat des validations sans consulter séparément chaque tenant.")
    add_figure(doc,ASSETS/'dashboard.png','Figure 4.2 — Tableau de bord SaaS : indicateurs, alertes d’abonnement et demandes en attente.',6.25)
    add_placeholder(doc,'Capture 4.1','Gestion des demandes bancaires','Insérer ici la liste des demandes et la fenêtre de détail après anonymisation des coordonnées de contact.')
    add_heading(doc,'4.2.3 Email de paiement, paiement et validation',3)
    para(doc,"À l’issue de l’approbation, l’utilisateur demandeur reçoit par email un lien de paiement sécurisé. Cet email constitue le point d’entrée du règlement de l’abonnement correspondant aux stores, modules et options validés. L’utilisateur est redirigé vers le parcours de paiement ; la transaction est créée et suivie par le back-end, qui conserve la référence de paiement utile sans exposer de secret au navigateur.")
    para(doc,"Les statuts distinguent le traitement de la demande de celui du paiement. Une demande peut être en attente, approuvée, refusée ou annulée. Le paiement peut être en attente, payé, échoué ou annulé. Une approbation SaaS ne suffit donc jamais à activer les services : le paiement doit être confirmé par le serveur. Cette distinction permet de gérer les abandons, les erreurs de paiement et les relances sans ouvrir prématurément la marketplace.")
    add_matrix(doc,['Étape','Statut représentatif','Conséquence fonctionnelle'],[
        ('Demande soumise','PENDING','Dossier visible dans la file SaaS ; marketplace inactive.'),
        ('Décision SaaS','APPROVED / REJECTED','En cas d’approbation, email de paiement ; en cas de refus, aucune souscription active.'),
        ('Paiement','PENDING / PAID / FAILED / CANCELLED','PAID est le seul statut qui autorise l’activation ; les autres états conservent les services inactifs.'),
        ('Abonnement','PENDING_PAYMENT / ACTIVE / EXPIRED / PENDING_RENEWAL','L’état ACTIVE conditionne les accès et la disponibilité de la marketplace.')], [1900,2800,4660])
    add_heading(doc,'4.2.4 Activation automatisée et remise des accès Banque',3)
    para(doc,"Après validation du paiement, le back-end active la marketplace et l’abonnement associé. Le tenant devient disponible avec sa configuration initiale, et les services souscrits sont rendus accessibles. Un email distinct est ensuite adressé à l’administrateur de la banque avec les identifiants de connexion au back-office Banque (login et mot de passe initial). Cet envoi clôt le parcours d’onboarding et évite une transmission manuelle d’accès par l’équipe SaaS.")
    para(doc,"Le workflow global est donc le suivant : Soumission de la demande → Traitement SaaS → Approbation → Notification / email de paiement → Paiement → Validation du paiement → Activation de la marketplace → Envoi des identifiants du back-office Banque. Les notifications et emails servent de liens de continuité entre les étapes, tandis que les statuts empêchent tout saut de phase.")
    add_figure(doc,DIAGRAMS/'fig_4_1_onboarding_paiement.png','Figure 4.3 — Diagramme de séquence : soumission, traitement SaaS, paiement, activation et envoi des identifiants Banque.',6.25)
    add_placeholder(doc,'Capture 4.2','Email de paiement de la marketplace','Insérer l’email d’approbation contenant le lien de paiement après anonymisation de l’adresse destinataire et de tout identifiant technique.')
    add_placeholder(doc,'Capture 4.3','Email d’activation et identifiants du Back-office Banque','Insérer l’email de création du compte Banque en masquant le login, le mot de passe et les données personnelles.')
    add_heading(doc,'4.3 Back-office Banque : configuration après activation',2)
    para(doc,"Prérequis : Marketplace active et abonnement valide. L’accès au back-office Banque est accordé à l’administrateur bancaire après la validation du paiement et l’activation du tenant. Tant que l’abonnement n’est pas actif, les actions de configuration et la mise à disposition des services restent bloquées. Cette règle garantit que l’espace bancaire, la marketplace publique et les fonctionnalités souscrites partagent le même état de référence.")
    para(doc,"Une fois connecté, l’administrateur Banque configure son espace sans modifier l’application commune. Il gère les utilisateurs de la banque, les stores affectés, les modules disponibles, le contenu de la marketplace, le branding, les paramètres et les offres. Les données globales restent administrées par le SaaS ; les données de présentation et de disponibilité sont pilotées par le tenant bancaire.")
    add_heading(doc,'4.3.1 Configuration de la marketplace bancaire',3)
    para(doc,"La configuration couvre la gestion du contenu, la personnalisation visuelle, les bannières, les éléments graphiques et les paramètres propres à la banque. L’administrateur peut adapter le logo, la palette, les textes, les bannières et les contenus affichés dans les différents stores. Le résultat est une marketplace cohérente avec l’identité de la banque tout en conservant les composants réutilisables de Matchia.")
    add_heading(doc,'4.3.2 Stores, modules et paramètres spécifiques',3)
    para(doc,"L’administrateur Banque gère les stores qui lui sont affectés, puis active ou désactive les modules disponibles dans chacun d’eux. Les paramètres spécifiques de chaque module peuvent être ajustés afin de personnaliser les fonctionnalités selon le store : un comparateur, un simulateur, les contenus associés ou les règles de présentation ne sont affichés que lorsqu’ils ont été configurés et activés pour le tenant concerné.")
    add_matrix(doc,['Élément','Niveau de gestion','Effet sur la marketplace'],[
        ('Store','Catalogue SaaS puis association tenant','Ajoute ou retire une verticale métier de la marketplace.'),
        ('Module','Association store–tenant','Active un simulateur, comparateur ou contenu seulement là où il est utile.'),
        ('Branding','Tenant bancaire','Applique logo, palette, bannières et textes de la banque.'),
        ('Paramètres','Tenant et store','Adapte les champs et règles de présentation sans imposer un modèle rigide de produit.')], [2100,2500,4760])
    add_placeholder(doc,'Capture 4.4','Configuration des stores et modules','Insérer la vue « Stores assignés » ou « Modules assignés » de l’espace banque.')
    add_placeholder(doc,'Capture 4.5','Branding de la marketplace bancaire','Insérer l’écran de modification du logo, des couleurs, des bannières et des contenus de la banque.')
    add_heading(doc,'4.3.3 Cycle de vie et évolution de l’abonnement',3)
    para(doc,"Le back-office Banque donne également une visibilité sur l’état et l’échéance de l’abonnement. Lorsqu’une banque souhaite renouveler son abonnement, effectuer un upgrade, étendre son offre ou ajouter de nouveaux stores ou modules, elle ne modifie pas directement ses droits. Une nouvelle demande est envoyée au back-office SaaS. Elle suit à nouveau une validation commerciale et technique, puis un paiement avant la mise à jour de l’abonnement et l’activation des nouveaux services.")
    para(doc,"Le workflow d’évolution est donc : Demande de renouvellement / upgrade → SaaS → Validation → Paiement → Mise à jour de l’abonnement → Activation des nouveaux services. Cette reprise du circuit d’approbation protège la cohérence du catalogue commercial et évite que des services payants soient activés sans souscription correspondante.")
    add_figure(doc,DIAGRAMS/'fig_4_4_evolution_abonnement.png','Figure 4.4 — Workflow de renouvellement, upgrade ou ajout de services à l’abonnement.',6.25)
    add_heading(doc,'4.4 Marketplace publique contextualisée',2)
    para(doc,"La marketplace publique constitue la façade du tenant. Le visiteur y retrouve l’identité de la banque, les stores sélectionnés, les contenus associés et, selon la configuration, les modules de comparaison ou de simulation. L’URL conserve le contexte de la marketplace et du store, ce qui rend possible la navigation entre plusieurs verticales sans ambiguïté sur la banque consultée.")
    add_figure(doc,ASSETS/'TenantMarketplace.png','Figure 4.5 — Marketplace contextualisée : store véhicule, identité tenant et modules disponibles.',6.25)
    para(doc,"Dans l’exemple de la figure 4.5, la navigation affiche des stores distincts et met en avant le store « véhicule ». Les boutons de modules visibles à gauche témoignent de la composition configurable de l’offre. La page d’accueil peut être personnalisée par des bannières et des contenus propres à la banque, tandis que les stores affichent les produits et leurs détails dans le contexte du tenant.")
    para(doc,"La marketplace conserve les fonctionnalités déjà mises à disposition du public : page d’accueil, navigation par stores, consultation des produits, détail d’une offre, comparateur, simulateur, chatbot, authentification, inscription client et accès aux espaces sécurisés. Les fonctionnalités visibles sont déterminées par la configuration validée de la banque et par l’état de son abonnement ; elles ne sont donc pas séparées du cycle SaaS décrit précédemment.")
    add_placeholder(doc,'Capture 4.6','Page d’un store avec modules actifs','Insérer une page produit illustrant le comparateur, le simulateur et le chatbot lorsqu’ils sont activés pour le store.')
    add_heading(doc,'4.5 Paiement sécurisé, traçabilité et états d’abonnement',2)
    add_heading(doc,'4.5.1 Modèle commercial et traçabilité',3)
    para(doc,"La demande, l’abonnement et le paiement forment un triptyque cohérent. Lors de la souscription, les éléments commerciaux sélectionnés (stores, modules, prix et paramètres) sont conservés dans l’abonnement afin de préserver l’historique, même si le catalogue commun est ensuite modifié. Les paiements peuvent être suivis avec des statuts de traitement distincts, notamment en attente, payé, échoué ou annulé.")
    para(doc,"La durée de l’abonnement est prise en compte dans la surveillance des échéances. Les alertes permettent d’anticiper le renouvellement, mais la prolongation des accès ne peut être effectuée qu’après la confirmation du règlement. Les écrans SaaS regroupent par conséquent les abonnements actifs, les paiements réalisés, les montants et les dates d’expiration.")
    add_figure(doc,DIAGRAMS/'fig_4_3_etats_abonnement.png','Figure 4.6 — Diagramme d’états d’un abonnement bancaire.',6.25)
    add_heading(doc,'4.5.2 Intégration de Stripe',3)
    para(doc,"L’intégration de paiement utilise Stripe avec deux approches complémentaires : la création d’un Payment Intent pour les scénarios de paiement pilotés par l’application, et la redirection vers une Checkout Session lorsqu’une page de paiement hébergée est adaptée. Dans les deux cas, la clé secrète n’est jamais exposée au navigateur. Le back-end crée la transaction, conserve la référence utile et ne déclenche l’activation qu’après confirmation côté serveur.")
    para(doc,"En environnement de production, ce mécanisme doit être complété par la vérification de signature des webhooks Stripe et l’idempotence des traitements. Ces deux mesures empêchent qu’une notification répétée ou falsifiée conduise à des activations multiples. Les identifiants techniques et les secrets de paiement restent stockés hors du dépôt, dans les variables de configuration ou un gestionnaire de secrets.")
    add_placeholder(doc,'Capture 4.7','Paiement Stripe réussi','Insérer l’écran de retour Stripe ou la confirmation de paiement, sans clé API, jeton ni identifiant de session.')
    add_placeholder(doc,'Capture 4.8','Liste des abonnements et alertes','Insérer la liste SaaS des abonnements payés, renouvellements et alertes d’échéance.')
    add_heading(doc,'4.6 Conclusion',2)
    para(doc,"La réalisation du noyau SaaS assure un parcours maîtrisé : demande bancaire, traitement SaaS, notification, paiement, activation, livraison des identifiants Banque, configuration du tenant et renouvellement. La configuration portée par le tenant rend l’application extensible, tandis que le contrôle d’état de l’abonnement préserve la cohérence entre la souscription commerciale, l’accès au back-office Banque et les fonctions réellement disponibles sur la marketplace publique.")

def chapter4_revised(doc):
    add_heading(doc,'Chapitre 4 — Réalisation complète de la plateforme Matchia : de la demande de marketplace aux espaces métier',1)
    para(doc,"Ce chapitre décrit le fonctionnement réel de Matchia à partir des routes React, des services front-end, des contrôleurs Spring Boot et des services métier du projet. La plateforme repose sur une application SaaS unique, contextualisée par tenant : une banque formule une demande, le SaaS l’instruit, le paiement déclenche l’activation, puis la banque administre sa marketplace, ses stores et ses modules. Les parcours concessionnaire, client et financement restent rattachés à cette marketplace active.")
    para(doc,"Les composants techniques qui portent ce cycle sont notamment JoinPage et requestService côté client, JoinRequestController / RequestController et RequestService côté serveur, puis PaymentController / PaymentService, SubscriptionController / SubscriptionService et BankAdminCredentialsService. La traçabilité est complétée par NotificationService, EmailService et l’audit asynchrone exposé dans le back-office SaaS.")

    add_heading(doc,'4.1 Socle d’identité, de sécurité et de contexte tenant',2)
    para(doc,"Le socle commun de Matchia garantit que les fonctions décrites dans les sections suivantes s’exécutent dans un contexte sécurisé et correctement isolé. L’authentification s’appuie sur un jeton JWT d’accès, un mécanisme de rafraîchissement de session, la déconnexion, la récupération et la réinitialisation de mot de passe, ainsi que la consultation du profil connecté. Les routes React sont protégées et le contrôle d’autorisation est également appliqué côté back-end.")
    para(doc,"Quatre rôles structurent les espaces de la plateforme : ADMIN_SAAS, ADMIN_BANK, DEALER_ADMIN et CLIENT. Chacun accède uniquement aux fonctionnalités de son périmètre. Le contexte tenant est conservé dans les routes de marketplace et synchronisé par TenantUrlSync ; une même application React et Spring Boot sert ainsi plusieurs banques sans mélange de leurs utilisateurs, contenus, stores, modules et données métier.")
    add_bullets(doc,["Le SaaS administre le catalogue commun, les demandes, les banques, les abonnements et la gouvernance globale.","L’administrateur bancaire exploite exclusivement la marketplace de sa banque, sous réserve que son compte et son abonnement soient actifs.","Les concessionnaires et clients sont rattachés au tenant et aux règles de visibilité du store concerné."])

    add_heading(doc,'4.2 Demande de création d’une marketplace bancaire',2)
    para(doc,"La demande publique est accessible depuis la route « /rejoindre ». Le composant JoinPage orchestre un formulaire à quatre étapes : Informations bancaires, Coordonnées, Boutiques & Modules et Finalisation. Cette organisation évite de soumettre une demande incomplète et conserve un état de progression visible pour le demandeur.")
    add_figure(doc,DIAGRAMS/'fig_4_1_demande_marketplace.png','Figure 4.1 — Workflow réel de création d’une demande de marketplace bancaire.',6.25)
    para(doc,"La figure 4.1 résume le processus : la demande ne peut être envoyée qu’après vérification de l’adresse e-mail du contact et validation des sélections de stores et de modules. Les informations commerciales sont ensuite transmises dans la demande, y compris le détail des modules sélectionnés par store et leur prix.")

    add_heading(doc,'4.2.1 Accès et informations bancaires',3)
    para(doc,"Le premier écran recueille le nom de la banque, son adresse e-mail et son numéro de téléphone tunisien, saisi avec le préfixe +216. Il propose également le site web, une description limitée à 1 000 caractères, l’année d’établissement et le téléversement obligatoire du logo. Les fichiers image admis pour ce logo sont PNG, JPG ou SVG, avec une taille maximale de 2 Mo dans l’interface publique.")
    para(doc,"Ces informations définissent l’identité de la future banque et sont contrôlées côté front puis côté serveur. Le back-end valide notamment le format du téléphone, la cohérence de l’année, l’unicité du slug de marketplace et la présence du logo dans le cas d’une demande de type join.")
    add_placeholder(doc,'Capture 4.1','Accès à la demande de marketplace','Insérer la page « Rejoindre Matchia » avec le stepper, puis le premier écran « Informations bancaires » renseigné avec des données de démonstration anonymisées.')

    add_heading(doc,'4.2.2 Informations du futur administrateur bancaire et vérification e-mail',3)
    para(doc,"La deuxième étape porte sur le contact principal qui deviendra administrateur bancaire après activation : nom, prénom, adresse e-mail, numéro de téléphone tunisien et image du contact. L’image est obligatoire dans le formulaire ; les formats PNG, JPG, WEBP ou SVG sont acceptés, dans la limite de 2 Mo.")
    para(doc,"L’adresse du contact n’est pas seulement déclarative. Après contrôle des champs, Matchia envoie un code à six chiffres par e-mail. Le code est valable dix minutes et ne peut être consommé qu’une seule fois. Le demandeur le saisit dans l’interface ; un jeton de vérification est alors retourné et exigé lors de la création définitive de la demande. Un changement d’adresse e-mail annule l’état de vérification, et un délai de renvoi est appliqué dans l’interface.")
    add_placeholder(doc,'Capture 4.2','Coordonnées du futur administrateur bancaire','Insérer l’étape de coordonnées avec nom, prénom, e-mail, téléphone et zone de téléversement de l’image, sans données personnelles réelles.')
    add_placeholder(doc,'Capture 4.3','Vérification de l’adresse e-mail du contact','Insérer le bloc de saisie du code à six chiffres et l’état « Adresse e-mail vérifiée ». La capture existante de l’e-mail peut être utilisée uniquement après anonymisation de l’adresse et du code.')

    add_heading(doc,'4.2.3 Configuration initiale, sélection des stores et modules',3)
    para(doc,"La troisième étape réunit la configuration de la marketplace et la composition de l’offre. La banque renseigne un slug en minuscules, chiffres et tirets, une description limitée à 500 caractères, deux couleurs d’identité et une bannière obligatoire. Elle choisit ensuite au moins un store parmi le catalogue actif. Dans le jeu de données visible dans les captures du projet, les univers proposés sont mobile, médical, éducation, véhicule, immobilier et yassmine ; le catalogue reste administrable côté SaaS et n’est donc pas figé dans le code.")
    para(doc,"Après la sélection d’un store, l’application charge les modules actifs compatibles à travers l’association ModuleStore. Pour tout store qui possède des modules, au moins un module doit être sélectionné. Le choix est stocké par couple store–module, et non comme une liste globale : la demande conserve pour chaque store son libellé, son prix, les modules retenus, leur prix et, lorsqu’ils existent, leurs paramètres. Cette granularité permet ensuite de provisionner exactement les services achetés.")
    add_bullets(doc,["Le module « bannière » est un module fonctionnel, non une page de navigation ; il autorise l’affichage des bannières propres au store.","Le chatbot est également considéré comme un module fonctionnel et peut être rendu visible dans le contexte du store concerné.","Les modules de comparaison et de simulation donnent accès aux routes publiques correspondantes uniquement lorsqu’ils sont associés et actifs pour le store."])
    add_placeholder(doc,'Capture 4.4','Configuration de la marketplace et sélection des stores','Insérer l’étape affichant le slug, les couleurs, la bannière et les cartes de stores sélectionnables.')
    add_placeholder(doc,'Capture 4.5','Sélection des modules par store','Insérer le panneau d’un store choisi avec ses modules compatibles, leurs prix et les sélections associées.')

    add_heading(doc,'4.2.4 Récapitulatif, soumission et confirmation',3)
    para(doc,"La dernière étape affiche une synthèse avant envoi : identité bancaire, contact administrateur, informations de marketplace, stores, modules et montant mensuel calculé. Le service requestService envoie ensuite une requête multipart contenant les fichiers (logo, image du contact et bannière) ainsi que la représentation JSON des stores et modules. Le serveur crée une Request de type join avec le statut initial pending.")
    para(doc,"La création produit deux retours complémentaires : une notification système destinée au SaaS afin de signaler une demande à instruire, et un e-mail de confirmation destiné au contact de la banque. L’interface publique affiche enfin le message « Demande soumise avec succès » et invite le demandeur à revenir à l’accueil. À ce stade, aucune marketplace n’est publique et aucun compte bancaire n’est actif.")
    add_placeholder(doc,'Capture 4.6','Récapitulatif avant soumission','Insérer la vue finale listant les informations de la banque, les stores, les modules et le montant total mensuel.')
    add_placeholder(doc,'Capture 4.7','Confirmation de la demande de marketplace','Insérer l’écran de confirmation après l’envoi. Il doit afficher le succès de la soumission sans révéler de données personnelles.')

    add_heading(doc,'4.3 Back-office SaaS : instruction, pilotage et gouvernance',2)
    para(doc,"L’accès au back-office SaaS est protégé par rôle. Après authentification, l’administrateur SaaS dispose d’un tableau de bord consolidé et de routes dédiées aux banques, demandes, contenu, stores & modules, marketplaces, offres & abonnements, utilisateurs, concessionnaires, paramètres, audit et profil. Les notifications non lues sont également accessibles depuis le layout d’administration.")
    add_figure(doc,ASSETS/'dashboard.png','Figure 4.2 — Tableau de bord SaaS : banques actives, demandes, revenus, alertes et actions à traiter.',6.25)
    para(doc,"La figure 4.2 montre les indicateurs effectivement calculés dans l’espace SaaS : nombre de banques, demandes en attente, utilisateurs, stores actifs, revenu mensuel, distribution des marketplaces par store et alertes d’expiration. Le tableau de bord constitue donc un point de pilotage, tandis que les opérations de détail restent réalisées dans les écrans dédiés.")
    add_matrix(doc,['Espace SaaS','Fonctions réalisées'],[
        ('Demandes','Liste, recherche, consultation du détail, stores/modules retenus, approbation, rejet motivé et statut.'),
        ('Banques et marketplaces','Consultation/gestion des banques, du tenant, du branding, des stores et des modules associés.'),
        ('Catalogue et offres','Gestion du catalogue de stores, des modules et de leurs associations ; suivi des offres, abonnements et paiements.'),
        ('Gouvernance','Utilisateurs, demandes concessionnaires, notifications, journal d’audit et export CSV des logs.'),
        ('Aide à l’analyse','Widget d’assistant IA réservé à l’administrateur SaaS, limité aux analyses autorisées en lecture seule.')], [2500,6860])

    add_heading(doc,'4.3.1 Traitement d’une demande de marketplace',3)
    para(doc,"Le traitement suit la chaîne Demande soumise → Consultation SaaS → Analyse → Approbation ou rejet. La fiche de demande expose les informations bancaires, le contact, le slug et la description de marketplace, les couleurs, les fichiers d’identité ainsi que les stores et modules demandés. L’administrateur peut donc comparer l’offre demandée avec le catalogue et vérifier sa cohérence avant décision.")
    para(doc,"Un rejet positionne la demande à rejected, conserve le motif de rejet, produit une entrée d’audit et crée une notification. Pour une demande join, le service e-mail envoie un message de rejet contenant le motif fourni. Une demande déjà approuvée ne peut ensuite plus être rejetée, et une demande rejetée ne peut plus être approuvée : les transitions sont contrôlées par RequestService.")
    add_placeholder(doc,'Capture 4.8','Liste SaaS des demandes de marketplace','Insérer la liste des demandes avec les filtres ou statuts visibles, sans coordonnées de contact réelles.')
    add_placeholder(doc,'Capture 4.9','Détail SaaS d’une demande de marketplace','Insérer la fiche détaillée : banque, marketplace, stores, modules et montant. Masquer les e-mails, numéros et pièces jointes sensibles.')
    add_placeholder(doc,'Capture 4.10','Décision d’approbation ou de rejet','Insérer la fenêtre ou l’action de décision, incluant le champ du motif de rejet lorsqu’il est affiché.')

    add_heading(doc,'4.3.2 Approbation, paiement et activation conditionnelle',3)
    para(doc,"L’approbation d’une demande join ne rend pas immédiatement le tenant exploitable. Elle provisionne la banque, la marketplace, le futur administrateur ainsi que les associations MarketplaceStore et MarketplaceStoreModule, mais ces objets restent inactifs tant que le paiement n’est pas confirmé. La demande passe à approved, une notification d’approbation est créée et un e-mail d’instructions de paiement contenant le lien de règlement est envoyé au contact.")
    add_figure(doc,DIAGRAMS/'fig_4_2_approbation_activation.png','Figure 4.3 — Diagramme de séquence : approbation SaaS, paiement et activation contrôlée.',6.25)
    para(doc,"La figure 4.3 met en évidence la règle de sécurité métier : l’activation n’est pas une conséquence de l’approbation seule. Elle intervient seulement lorsque PaymentService obtient un état paid. À ce moment, la banque, la marketplace et le compte ADMIN_BANK sont activés ; l’abonnement passe à ACTIVE ; les notifications de paiement sont créées et BankAdminCredentialsService génère un mot de passe temporaire avant l’envoi de l’e-mail d’identifiants du back-office bancaire.")

    add_heading(doc,'4.3.3 Paiement Stripe et suivi de l’abonnement',3)
    para(doc,"Le contrôleur de paiement expose les deux mécanismes utilisés par Matchia : Payment Intent et Checkout Session Stripe. Une opération de paiement est créée avec le statut pending, le montant, la devise, la référence de demande et l’abonnement correspondant. Le lien de Checkout est conservé lorsqu’il est généré. La confirmation relit l’état du prestataire et vérifie, pour une session réglée, le montant et la devise attendus avant de poursuivre le workflow d’activation.")
    para(doc,"Les états de paiement implémentés sont pending, paid, cancelled et failed. Dans le flux Payment Intent, « succeeded » est mappé vers paid, « canceled » vers cancelled et « requires_payment_method » vers failed ; les autres cas restent pending. Cette modélisation permet au SaaS de distinguer une attente, une annulation et un échec au lieu de traiter tout retour non réussi comme une activation.")
    para(doc,"L’abonnement créé pour une demande est d’abord PENDING_PAYMENT. Après paiement confirmé, il devient ACTIVE et sa période annuelle est calculée. Le service planifié de synchronisation gère les échéances, marque les abonnements expirés et produit les alertes des sept jours précédant l’expiration ; un e-mail de rappel est prévu par EmailService. Les abonnements et paiements constituent donc une piste d’historique commerciale et non une simple variable de visibilité.")
    add_figure(doc,DIAGRAMS/'fig_4_3_etats_abonnement.png','Figure 4.4 — États de l’abonnement et contrôle des accès tenant.',6.25)
    add_placeholder(doc,'Capture 4.11','Notification et e-mail d’instructions de paiement','Insérer la notification SaaS ou banque et l’e-mail de paiement après anonymisation des destinataires, liens, identifiants et montants de test.')
    add_placeholder(doc,'Capture 4.12','Paiement et confirmation de retour','Insérer l’écran de paiement ou la page de succès/annulation sans clé API, numéro de carte, identifiant Stripe ni secret.')
    add_placeholder(doc,'Capture 4.13','Marketplace, abonnement et compte bancaire activés','Insérer une preuve visuelle post-paiement : statut actif de la banque ou marketplace, puis l’abonnement créé. L’e-mail d’identifiants doit être anonymisé.')

    add_heading(doc,'4.4 Back-office Banque : exploitation d’un tenant actif',2)
    para(doc,"Prérequis : marketplace active et abonnement valide. L’authentification tenant conserve le contexte de banque dans l’URL (slug ou paramètre tenant) et les routes protégées contrôlent le rôle ADMIN_BANK. Le tableau de bord bancaire donne une vue des utilisateurs, stores, modules, demandes et autres indicateurs propres à la marketplace courante. L’espace permet ensuite de gérer le profil, les utilisateurs, les produits, les contenus, le branding, les concessionnaires, les demandes de financement, les paramètres et les notifications.")
    add_placeholder(doc,'Capture 4.14','Tableau de bord du tenant bancaire','Insérer le tableau de bord banque montrant utilisateurs, stores, modules et demandes, après masquage de l’adresse e-mail, de la photo et des autres données personnelles du compte de démonstration.')

    add_heading(doc,'4.4.1 Personnalisation de la marketplace',3)
    para(doc,"La page Branding permet à la banque de définir ses couleurs primaire et secondaire, son titre d’accueil, son texte de bienvenue, son pied de page, son logo et sa bannière. Les images sont téléversées via les services dédiés puis l’aperçu de la marketplace est rafraîchi. La page de contenu complète ce branding avec la création, la modification, la suppression et la visibilité de contenus au niveau global de marketplace ou au niveau d’un store.")
    para(doc,"La bannière n’est pas réduite à une image statique globale. Les services exposent aussi une gestion par store : ajout, remplacement et suppression de bannières. Lorsqu’il existe plusieurs bannières de store, la marketplace publique propose une rotation et des contrôles précédent/suivant. Cette personnalisation est isolée par tenant et ne modifie pas le catalogue partagé.")
    add_placeholder(doc,'Capture 4.15','Personnalisation du branding bancaire','Insérer la page Branding montrant la palette, les textes, le logo, la bannière et l’aperçu de la marketplace.')
    add_placeholder(doc,'Capture 4.16','Gestion de contenu et bannières par store','Insérer l’écran de gestion des contenus ou le gestionnaire de bannières d’un store actif.')

    add_heading(doc,'4.4.2 Stores, modules et paramètres configurables',3)
    para(doc,"L’espace « Stores assignés » affiche uniquement les stores de la marketplace courante. La banque peut les consulter, les activer ou les désactiver et demander de nouveaux stores depuis le catalogue. Dans l’écran « Modules assignés », chaque store ne révèle que ses propres associations ; un module peut être activé ou désactivé et ses paramètres peuvent être enregistrés dans le contexte du tenant. Un store inactif place ses modules en lecture seule jusqu’à sa réactivation.")
    para(doc,"Les paramètres sont génériques et typés (texte, nombre ou date), ce qui permet de définir, par exemple, les valeurs de simulation sans créer une table technique par produit. Les composants publics utilisent ensuite ces paramètres pour adapter le simulateur. Les modules comparateur, simulateur, bannière et chatbot sont traités selon leur association effective au store ; seul un module navigable expose une page dans le menu, tandis que bannière et chatbot enrichissent l’interface sans ajouter une route indépendante.")
    add_figure(doc,DIAGRAMS/'fig_4_2_configuration_store.png','Figure 4.5 — Configuration tenant d’un store : catalogue commun, modules et visibilité publique.',6.25)
    add_placeholder(doc,'Capture 4.17','Stores associés à la marketplace bancaire','Insérer la page « Stores assignés » avec le statut de chaque store et l’action de demande de nouveau store.')
    add_placeholder(doc,'Capture 4.18','Modules et paramètres du store sélectionné','Insérer la page « Modules assignés » montrant l’activation, les paramètres et le gestionnaire de bannière lorsqu’il est présent.')

    add_heading(doc,'4.4.3 Renouvellement et ajout de services',3)
    para(doc,"Le renouvellement est disponible depuis la page Abonnement. La banque consulte l’historique des abonnements, les paiements, les services inclus, la date d’expiration et le nombre de jours restants, puis transmet une demande de renouvellement annuel au SaaS. Cette demande est de type renewal ; après son approbation, une opération de paiement est créée et les instructions de règlement sont envoyées. Le paiement validé prolonge l’abonnement actif.")
    para(doc,"L’ajout de stores ou de modules est traité comme une demande distincte de type store ou module, et non comme une modification directe de l’abonnement existant. Les choix sont envoyés au SaaS avec le détail par store, passent par l’approbation et le paiement, puis les nouveaux services sont activés. Cette distinction est importante : le projet implémente explicitement un workflow de renouvellement et des workflows séparés d’extension de catalogue, plutôt qu’un unique bouton générique « upgrade ».")
    add_figure(doc,DIAGRAMS/'fig_4_3_renouvellement_ajout_services.png','Figure 4.6 — Workflow réel de renouvellement et d’ajout de stores/modules.',6.25)
    add_placeholder(doc,'Capture 4.19','Abonnement bancaire et historique des services','Insérer la page Abonnement : statut, dernier paiement, expiration, historique et stores/modules inclus.')
    add_placeholder(doc,'Capture 4.20','Demande de renouvellement ou d’extension','Insérer la fenêtre de renouvellement, ou le formulaire de demande de stores/modules, puis le statut de la demande créée.')

    add_heading(doc,'4.5 Marketplace publique et fonctionnalités de découverte',2)
    para(doc,"La marketplace publique reprend le branding de la banque active et les stores visibles. La page d’accueil affiche la bannière, le texte de bienvenue et les offres/store cards. Le visiteur peut ensuite accéder à une page de store, où les produits bancaires et les produits de concessionnaires publiés sont agrégés, avec la contextualisation du store sélectionné. Les routes publiques couvrent également la connexion, l’inscription client, la récupération de mot de passe, la simulation, le comparateur et le blog lorsque le module correspondant est activé.")
    add_figure(doc,ASSETS/'tenantDéploy.png','Figure 4.7 — Page d’accueil d’une marketplace publique tenant : bannière, stores et navigation contextualisée.',6.25)
    para(doc,"La figure 4.8 montre l’application du branding au tenant et la présentation des stores disponibles. La page de store poursuit cette contextualisation : elle affiche les contenus, les bannières, les produits, les indications de disponibilité et les appels vers les modules actifs. Le comparateur peut confronter jusqu’à quatre produits ; le simulateur calcule une estimation et permet d’initier ensuite une demande de financement. Ces outils ne constituent pas une acceptation de crédit automatique.")
    add_figure(doc,ASSETS/'TenantMarketplace.png','Figure 4.8 — Page publique d’un store véhicule avec contenu et modules associés.',6.25)
    add_placeholder(doc,'Capture 4.21','Comparateur, simulateur et chatbot de la marketplace','Insérer une capture d’un module public réellement activé pour le store concerné. Ne retenir le chatbot que s’il est visible dans la configuration de démonstration.')

    add_heading(doc,'4.6 Espaces concessionnaire, client, financement et assistant',2)
    para(doc,"Les fonctionnalités multi-acteurs complètent le cycle de la marketplace. Le concessionnaire dispose d’un compte unique avec un espace pour ses partenariats, contrats, produits, publications et demandes de financement. Il peut solliciter plusieurs banques ; la banque conserve la décision sur le partenariat, le contrat et la publication. Les produits publiés sur un tenant sont donc contrôlés par des préconditions de partenariat actif, contrat valide, store actif et décision bancaire.")
    para(doc,"Le client s’inscrit dans le contexte de la marketplace, consulte les produits, compare ou simule lorsque les modules sont actifs, puis constitue un dossier de financement. Le dossier passe de brouillon à PENDING lorsque les pièces requises sont présentes. La banque instruit ensuite la demande, accepte ou rejette avec un motif, et les notifications ainsi que les e-mails informent les acteurs concernés. Lorsque le produit appartient à un concessionnaire, l’acceptation peut entraîner la réservation du stock.")
    para(doc,"Enfin, le widget d’assistant intelligent est limité à l’administrateur SaaS. Il répond en français aux questions de pilotage à partir d’un schéma filtré. La chaîne de sécurité refuse les DML/DDL, SELECT *, colonnes sensibles, jointures non autorisées et requêtes sans limite ; seules des requêtes SELECT validées, limitées et exécutées en lecture seule peuvent produire une réponse. L’assistant ne décide donc ni d’un crédit ni d’une activation métier.")
    add_figure(doc,ASSETS/'assistant .png','Figure 4.9 — Assistant IA SaaS : restitution d’une information de pilotage dans le back-office.',3.1)
    add_heading(doc,'4.7 Conclusion',2)
    para(doc,"La réalisation de Matchia forme un workflow cohérent et contrôlé : une banque soumet une demande complète et vérifiée, le SaaS l’analyse et la provisionne à l’état inactif, le paiement confirmé active les services et les identifiants, puis le back-office banque administre l’expérience tenant. Les extensions commerciales et le renouvellement restent soumis au SaaS et au paiement. La marketplace publique, les espaces concessionnaire et client, le financement et l’assistant d’analyse prolongent ce socle sans rompre l’isolation fonctionnelle entre les banques.")

def chapter5(doc):
    doc.add_page_break()
    add_heading(doc,'Chapitre 5 — Réalisation des parcours métier : concessionnaires, financement et assistant IA',1)
    para(doc,"Ce chapitre expose les parcours métier qui transforment la marketplace en un écosystème multi-acteurs. Le concessionnaire peut collaborer avec plusieurs banques depuis un seul espace ; la banque garde la décision sur le partenariat, le contrat, la publication et la demande de financement ; le client bénéficie d’un parcours guidé et traçable. Un assistant IA est enfin proposé à l’administrateur SaaS pour interroger les données de pilotage de manière sécurisée.")
    add_heading(doc,'5.1 Inscription et administration des concessionnaires',2)
    para(doc,"Le concessionnaire commence par un formulaire public à plusieurs informations : identité de la société, immatriculation, store visé, contact, coordonnées, logo et pièces justificatives. La demande est stockée dans une file d’examen SaaS. Les documents sont traités dans un espace protégé ; ils ne sont jamais rendus publics dans la marketplace.")
    para(doc,"L’administrateur SaaS consulte la file à l’aide de filtres, de recherche et de pagination. Après contrôle, il peut approuver ou rejeter la demande avec un motif. En cas d’approbation, un compte avec le rôle DEALER_ADMIN est créé et le concessionnaire reçoit les informations nécessaires à la première connexion. Ce rôle donne accès à un espace strictement limité à son entreprise, ses produits, ses partenariats, ses contrats et ses demandes.")
    add_figure(doc,DIAGRAMS/'fig_5_1_parcours_concessionnaire.png','Figure 5.1 — Activité d’onboarding d’un concessionnaire et démarrage du partenariat.',6.25)
    add_placeholder(doc,'Capture 5.1','Formulaire d’inscription concessionnaire','Insérer le formulaire public et masquer les coordonnées personnelles ainsi que les justificatifs sensibles.')
    add_placeholder(doc,'Capture 5.2','File SaaS des demandes concessionnaires','Insérer la liste filtrable des dossiers à traiter avec les statuts.')
    add_heading(doc,'5.2 Partenariats et contrats banque–concessionnaire',2)
    para(doc,"Le partenariat est l’objet métier qui relie un concessionnaire, une banque et un store. Le même concessionnaire peut ainsi être présent auprès de plusieurs banques tout en conservant un compte unique. Une demande peut être initiée par le concessionnaire ou par la banque ; elle est ensuite acceptée, rejetée, suspendue ou terminée. Une contrainte d’unicité empêche la création simultanée de plusieurs liens identiques pour les mêmes acteurs.")
    para(doc,"Le contrat formalise les conditions de la relation : période de validité, modalités de facturation, commission et clauses de fin. Il suit un cycle de vie DRAFT, PENDING_ACCEPTANCE puis ACTIVE, avec des voies de rejet, d’expiration ou de clôture. Un partenariat actif ne suffit pas à autoriser la publication : un contrat actif est une précondition supplémentaire.")
    add_matrix(doc,['Objet','États principaux','Règle métier'],[
        ('Partenariat','PENDING, ACTIVE, REJECTED, SUSPENDED, TERMINATED','Un seul lien actif par banque, concessionnaire et store.'),
        ('Contrat','DRAFT, PENDING_ACCEPTANCE, ACTIVE, REJECTED, EXPIRED, TERMINATED','La publication exige un contrat ACTIVE sur le partenariat.'),
        ('Publication','BROUILLON, SOUMISE, APPROUVÉE, PUBLIÉE, RETIRÉE','La banque décide de la visibilité publique du produit.')], [1900,3300,4160])
    add_figure(doc,DIAGRAMS/'fig_5_2_etats_publication.png','Figure 5.2 — Cycle de vie de la publication d’un produit concessionnaire.',6.25)
    add_placeholder(doc,'Capture 5.3','Espace concessionnaire : partenariats et contrats','Insérer les onglets de gestion des partenariats et des contrats dans l’espace concessionnaire.')
    add_heading(doc,'5.3 Produits, stock et publication multi-banque',2)
    para(doc,"Le concessionnaire gère son catalogue produit depuis son espace : désignation, images, prix, conditions d’éligibilité, paramètres liés au store et documents associés. Le stock est suivi selon les quantités totale, disponible et réservée. La dissociation entre le produit et sa publication permet au concessionnaire de présenter le même produit à plusieurs banques, sans multiplier les comptes ni recopier le stock dans chaque marketplace.")
    para(doc,"Pour être affiché au public, le produit doit être actif, le concessionnaire doit être approuvé, le partenariat et le contrat doivent être valides, le store doit être actif dans la marketplace de la banque et la publication doit être approuvée par cette banque. La décision bancaire est donc individuelle : une publication acceptée chez une banque n’implique aucune publication automatique auprès d’une autre.")
    add_bullets(doc,["Création ou modification du produit et de ses médias dans l’espace concessionnaire.","Ajout de stock et conservation de la disponibilité réellement exploitable.","Soumission du produit vers un partenariat bancaire actif.","Validation ou refus par la banque, avec traçabilité de l’état de publication.","Affichage public uniquement lorsque toutes les préconditions métier sont satisfaites."])
    add_placeholder(doc,'Capture 5.4','Création d’un produit et ajout de stock','Insérer l’écran de création du produit, puis le composant d’ajout de stock ou de documents.')
    add_placeholder(doc,'Capture 5.5','Validation bancaire d’une publication','Insérer l’écran banque permettant d’approuver ou de refuser une publication de concessionnaire.')
    add_heading(doc,'5.4 Suivi concessionnaire des demandes de financement liées à ses produits',2)
    para(doc,"Le concessionnaire dispose de la page « Mes demandes de financement » pour suivre, depuis son compte unique, les dossiers déposés par les clients pour ses produits publiés sur les différentes marketplaces partenaires. La page centralise les demandes, même lorsqu’un même catalogue est présenté auprès de plusieurs banques. Elle affiche des indicateurs du nombre total de dossiers ainsi que des demandes en attente, acceptées et rejetées.")
    para(doc,"La liste présente la référence du dossier, le produit concerné, le client, la banque et la marketplace, le montant demandé, la date de création et le statut. Une recherche par client ou référence, un filtre par statut et un filtre par banque permettent au concessionnaire de retrouver rapidement un dossier. La consultation détaillée restitue notamment le montant financé, la mensualité, la durée, les coordonnées du client, le store et le prix du produit.")
    add_matrix(doc,['État de la demande','Lecture côté concessionnaire','Effet métier'],[
        ('PENDING','Dossier soumis à la banque et visible comme en attente.','Le produit reste disponible tant qu’aucune décision favorable n’est enregistrée.'),
        ('ACCEPTED','Décision favorable visible dans le suivi du concessionnaire.','Le service réserve le stock du produit concerné afin de fiabiliser la disponibilité.'),
        ('REJECTED','Décision défavorable visible dans le suivi.','Aucune réservation de stock n’est créée ; le produit demeure disponible.')], [1800,3900,3660])
    para(doc,"Le rôle du concessionnaire est un rôle de suivi : aucune action d’acceptation ou de rejet n’est disponible dans cet espace, car l’instruction relève de la banque. L’accès est protégé par l’appartenance du produit : le service ne retourne que les demandes associées aux produits du concessionnaire connecté. Les notifications et l’e-mail de décision sont adressés au client ; le concessionnaire constate la mise à jour par son tableau de suivi. Ce cloisonnement protège les données du dossier et préserve l’autorité de décision bancaire.")
    add_placeholder(doc,'Capture 5.6','Suivi concessionnaire des demandes de financement','Insérer la liste des demandes avec les indicateurs, les filtres banque/statut et l’ouverture du détail d’un dossier lié à un produit du concessionnaire.')
    add_heading(doc,'5.5 Parcours client et demande de financement',2)
    add_heading(doc,'5.5.1 Inscription du client et activation du compte',3)
    para(doc,"Lorsqu’un visiteur souhaite déposer une demande de financement sans être connecté, il est orienté vers le formulaire « Créer mon compte client ». L’inscription doit être effectuée depuis une marketplace bancaire : le contexte du tenant, porté par le slug de la banque, rattache le futur compte à la banque concernée et empêche une inscription hors de cet espace.")
    para(doc,"Le formulaire recueille le nom complet, l’adresse e-mail, le téléphone, la date de naissance, l’adresse postale, le mot de passe et sa confirmation. Une photo de profil peut également être ajoutée au format JPG, PNG ou WEBP. Les contrôles vérifient la présence et le format des informations, la longueur minimale du mot de passe, la concordance de sa confirmation ainsi que l’unicité de l’adresse e-mail.")
    para(doc,"Après validation, la plateforme enregistre une inscription en attente et envoie un code de vérification à six chiffres. Ce code est à usage unique et expire après dix minutes ; un renvoi contrôlé est proposé lorsque nécessaire. Seule la validation du code crée le compte actif avec le rôle CLIENT et le rattachement à la banque. Le client peut alors se connecter puis reprendre le parcours de demande de financement initié depuis le simulateur ou la fiche produit.")
    add_placeholder(doc,'Capture 5.7','Inscription et vérification d’un compte client','Insérer le formulaire d’inscription dans le contexte de la marketplace, puis l’écran de saisie du code de vérification envoyé par e-mail.')
    add_heading(doc,'5.5.2 Découverte, comparaison et simulation',3)
    para(doc,"Le client consulte les produits dans le contexte de la marketplace bancaire et du store sélectionné. Il peut comparer les offres et simuler un financement afin d’obtenir une estimation fondée sur le montant, la durée, l’apport et les paramètres du store. Le simulateur est une aide à la décision ; il ne constitue ni une décision de crédit ni un accord automatique de la banque.")
    add_heading(doc,'5.5.3 Constitution du dossier',3)
    para(doc,"La demande de financement est créée à l’état brouillon afin de permettre au client de compléter progressivement son dossier. Les règles de pièces requises dépendent de la banque et du store : identité, justificatif de domicile, justificatif de revenus, attestation d’emploi ou relevé bancaire peuvent être demandés. Pendant la phase de brouillon, le client peut ajouter ou retirer ses fichiers. La soumission est bloquée tant que les documents obligatoires ne sont pas présents.")
    add_figure(doc,DIAGRAMS/'fig_5_3_activite_financement.png','Figure 5.3 — Diagramme d’activité du parcours de demande de financement.',6.25)
    add_heading(doc,'5.5.4 Instruction par la banque et effet sur le stock',3)
    para(doc,"L’agent bancaire consulte les demandes filtrées par store et statut, effectue une recherche et télécharge les pièces justificatives nécessaires à l’instruction. Une demande PENDING peut être acceptée ou rejetée avec un motif. Lorsque le produit retenu appartient à un concessionnaire, l’acceptation déclenche la réservation du stock ; le statut est alors visible dans le suivi du concessionnaire. Le client est informé dans son tableau de bord et par les canaux de notification prévus.")
    add_figure(doc,DIAGRAMS/'fig_5_4_sequence_financement.png','Figure 5.4 — Diagramme de séquence : dépôt, instruction et notification d’une demande de financement.',6.25)
    add_placeholder(doc,'Capture 5.8','Simulateur et création du dossier client','Insérer la simulation puis le formulaire de nouvelle demande dans le contexte du store.')
    add_placeholder(doc,'Capture 5.9','Téléversement des pièces justificatives','Insérer la zone d’ajout des documents requis et l’indicateur de complétude.')
    add_placeholder(doc,'Capture 5.10','Instruction bancaire et décision motivée','Insérer la fiche de demande côté banque avec l’action accepter/refuser et le champ de motif.')
    add_heading(doc,'5.6 Assistant IA d’analyse pour l’administrateur SaaS',2)
    para(doc,"L’assistant IA est réservé à l’administrateur SaaS et vise l’analyse du pilotage, par exemple le nombre de demandes en attente, les banques actives, les abonnements proches de l’expiration ou la répartition des stores. Il ne prend aucune décision métier, ne valide pas de financement et n’exécute aucune action de modification. L’utilisateur formule une question en français ; la réponse est limitée à une synthèse des données autorisées.")
    add_figure(doc,ASSETS/'assistant .png','Figure 5.5 — Assistant IA SaaS : réponse à une question de pilotage sur les demandes en attente.',3.1)
    add_heading(doc,'5.6.1 Chaîne sécurisée de génération et d’exécution',3)
    para(doc,"La question est envoyée depuis le widget React vers le back-end. Le service IA prépare un schéma réduit à des tables, colonnes et relations autorisées avant l’appel au modèle Gemini. Le SQL proposé est ensuite validé de manière déterministe. Une requête conforme est exécutée en lecture seule sur PostgreSQL, avec une limite de lignes et un délai d’exécution ; les résultats sont reformulés pour l’utilisateur. Une requête invalide est rejetée avant tout accès à la base.")
    add_figure(doc,DIAGRAMS/'fig_5_5_ia_securisee.png','Figure 5.6 — Diagramme de séquence de l’assistant IA Text-to-SQL sécurisé.',6.25)
    add_heading(doc,'5.6.2 Contrôles de sécurité',3)
    add_bullets(doc,["Seules les requêtes SELECT sans commentaires, DML, DDL, SELECT INTO, verrouillage ou instruction composée sont acceptées.","La validation impose une liste blanche de tables, de colonnes, d’alias, de jointures et de fonctions autorisées ; SELECT * est refusé.","Les données sensibles — mots de passe, jetons, secrets Stripe, identifiants de checkout, téléphone et données de réinitialisation — sont exclues du schéma proposé au modèle.","La requête exécutée reçoit automatiquement une limite maximale de 50 lignes et un délai court, afin de préserver les performances de la plateforme.","En production, le compte PostgreSQL dédié à cet usage doit être en lecture seule et ses identifiants doivent être fournis par un gestionnaire de secrets."])
    add_placeholder(doc,'Capture 5.11','Réponse valide et refus sécurisé de l’assistant IA','Insérer une question de pilotage valide, puis un exemple de refus d’une requête non conforme, sans afficher de secret ni de token.')
    add_heading(doc,'5.7 Conclusion',2)
    para(doc,"Les parcours réalisés répondent aux limites des marketplaces isolées : un concessionnaire centralise son activité et peut travailler avec plusieurs banques, chaque banque conserve ses décisions et ses contrats, et le stock est géré dans un point de référence unique. Le parcours de financement reste soumis au contrôle humain de la banque. Enfin, l’assistant IA enrichit le pilotage sans élargir les droits fonctionnels ni compromettre la sécurité des données.")

def main():
    generate_diagrams()
    doc=Document(); setup(doc); cover(doc); chapter4_revised(doc); chapter5(doc)
    doc.core_properties.title='Chapitres 4 et 5 — Matchia'
    doc.core_properties.subject='Réalisation SaaS bancaire, parcours concessionnaire, financement et assistant IA'
    doc.core_properties.author='Matchia'
    doc.save(OUT)
    print(OUT)

if __name__=='__main__': main()
