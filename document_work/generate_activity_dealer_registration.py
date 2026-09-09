from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_5_1_activity_dealer_registration_validation.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = '#0B2545'; BLUE = '#2E74B5'; LIGHT = '#F4F8FC'; GOLD = '#FFF1C9'; RED = '#FCE8E6'; GREEN = '#E8F5EC'; GREY = '#5B6573'; PALE = '#EDF3FE'
FONT = r'C:\Windows\Fonts\arial.ttf'; BOLD = r'C:\Windows\Fonts\arialbd.ttf'

def f(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)

def wrap(draw, text, font, width):
    lines, current = [], ''
    for word in text.split():
        candidate = (current + ' ' + word).strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= width:
            current = candidate
        else:
            lines.append(current); current = word
    if current: lines.append(current)
    return lines

def center(draw, rect, text, size=21):
    font = f(size, True); x1, y1, x2, y2 = rect; lines = wrap(draw, text, font, x2-x1-30)
    heights = [draw.textbbox((0,0), line, font=font)[3] - draw.textbbox((0,0), line, font=font)[1] for line in lines]
    y = y1 + ((y2-y1)-sum(heights)-5*(len(lines)-1))//2
    for line, height in zip(lines, heights):
        width = draw.textbbox((0,0), line, font=font)[2]
        draw.text((x1+(x2-x1-width)//2, y), line, font=font, fill=NAVY); y += height+5

def action(draw, rect, text, fill=LIGHT):
    draw.rounded_rectangle(rect, radius=18, fill=fill, outline=BLUE, width=4); center(draw, rect, text)

def decision(draw, cx, cy, text):
    draw.polygon([(cx,cy-60),(cx+145,cy),(cx,cy+60),(cx-145,cy)], fill=GOLD, outline=BLUE, width=4)
    center(draw, (cx-108,cy-36,cx+108,cy+36), text, 19)

def arrow(draw, source, target, label=None):
    draw.line((source,target), fill=BLUE, width=4); x1,y1=source; x2,y2=target
    if abs(x2-x1) >= abs(y2-y1):
        points=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)]
    else:
        points=[(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    draw.polygon(points, fill=BLUE)
    if label: draw.text(((x1+x2)//2+10,(y1+y2)//2-21), label, font=f(18,True), fill=GREY)

def end(draw, x, y):
    draw.ellipse((x,y,x+64,y+64), fill=NAVY); draw.text((x+82,y+18), 'Fin', font=f(19,True), fill=NAVY)

img = Image.new('RGB', (1900, 1930), 'white'); draw = ImageDraw.Draw(img); cx = 950
draw.rectangle((0,0,1900,108), fill=NAVY)
draw.text((45,32), 'Diagramme d’activité — Inscription et validation d’un concessionnaire', font=f(34,True), fill='white')
draw.text((45,136), 'La validation de la demande conditionne la création du compte et l’accès à l’espace personnel.', font=f(20), fill=GREY)

draw.ellipse((918,190,982,254), fill=GREEN, outline=NAVY, width=3); draw.text((1000,210), 'Début', font=f(20,True), fill=NAVY)
action(draw, (650,292,1250,390), 'Accès au formulaire d’inscription public')
action(draw, (650,470,1250,590), 'Saisie des informations de l’entreprise, des coordonnées, du store et de l’activité')
action(draw, (650,670,1250,790), 'Transmission des documents justificatifs pour vérifier l’identité, la conformité et l’éligibilité')
action(draw, (650,870,1250,970), 'Soumission de la demande')
action(draw, (650,1050,1250,1160), 'Enregistrement et transmission à l’Administrateur SaaS', PALE)
action(draw, (650,1240,1250,1340), 'Analyse de la demande par l’Administrateur SaaS', PALE)
decision(draw, cx, 1435, 'Demande\napprouvée ?')

for source,target in [((cx,254),(cx,292)),((cx,390),(cx,470)),((cx,590),(cx,670)),((cx,790),(cx,870)),((cx,970),(cx,1050)),((cx,1160),(cx,1240)),((cx,1340),(cx,1375))]:
    arrow(draw, source, target)

action(draw, (100,1365,500,1465), 'Enregistrement du motif de rejet', RED)
action(draw, (100,1545,500,1645), 'Envoi d’un e-mail précisant le motif au demandeur', RED)
arrow(draw, (805,1435), (500,1415), 'Non'); arrow(draw, (300,1465), (300,1545)); end(draw, 268, 1700); arrow(draw, (300,1645), (300,1700))

action(draw, (650,1550,970,1650), 'Création du compte concessionnaire', GREEN)
action(draw, (1050,1550,1370,1650), 'Accès à l’espace personnel', GREEN)
action(draw, (1450,1550,1810,1650), 'Envoi d’un e-mail contenant les identifiants', GREEN)
arrow(draw, (cx,1495), (810,1550), 'Oui'); arrow(draw, (970,1600), (1050,1600)); arrow(draw, (1370,1600), (1450,1600)); end(draw, 1598, 1720); arrow(draw, (1630,1650), (1630,1720))

img.save(OUT); print(OUT)
