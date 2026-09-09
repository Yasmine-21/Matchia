from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_4_1_activity_marketplace_request.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = "#0B2545"; BLUE = "#2E74B5"; LIGHT = "#F4F8FC"; GOLD = "#FFF1C9"; RED = "#FCE8E6"; GREEN = "#E8F5EC"; GREY = "#5B6573"
font_path = r"C:\Windows\Fonts\arial.ttf"; bold_path = r"C:\Windows\Fonts\arialbd.ttf"
def font(size, bold=False): return ImageFont.truetype(bold_path if bold else font_path, size)

def centered(draw, rect, text, size=24, bold=True, color=NAVY):
    f=font(size,bold); x1,y1,x2,y2=rect; maxw=x2-x1-40; rows=[]; row=""
    for word in text.split():
        test=(row+" "+word).strip()
        if draw.textbbox((0,0),test,font=f)[2] <= maxw: row=test
        else: rows.append(row); row=word
    if row: rows.append(row)
    heights=[draw.textbbox((0,0),r,font=f)[3]-draw.textbbox((0,0),r,font=f)[1] for r in rows]
    y=y1+((y2-y1)-sum(heights)-7*(len(rows)-1))//2
    for r,h in zip(rows,heights):
        w=draw.textbbox((0,0),r,font=f)[2]; draw.text((x1+(x2-x1-w)//2,y),r,font=f,fill=color); y+=h+7

def arrow(draw, start, end, label=None):
    draw.line([start,end],fill=BLUE,width=4)
    x1,y1=start; x2,y2=end
    if abs(x2-x1)>=abs(y2-y1):
        pts=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)]
    else: pts=[(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    draw.polygon(pts,fill=BLUE)
    if label:
        f=font(20,True); draw.text(((x1+x2)//2+12,(y1+y2)//2-20),label,font=f,fill=GREY)

def action(draw, rect, label, fill=LIGHT):
    draw.rounded_rectangle(rect,radius=20,fill=fill,outline=BLUE,width=4); centered(draw,rect,label)

def decision(draw, cx, cy, label):
    pts=[(cx,cy-65),(cx+150,cy),(cx,cy+65),(cx-150,cy)]
    draw.polygon(pts,fill=GOLD,outline=BLUE,width=4); centered(draw,(cx-105,cy-40,cx+105,cy+40),label,20)

img=Image.new("RGB",(1900,2320),"white"); d=ImageDraw.Draw(img)
d.rectangle((0,0,1900,110),fill=NAVY)
d.text((65,32),"Diagramme d’activité — Demande de création d’une marketplace",font=font(38,True),fill="white")
d.text((65,130),"Le parcours est interrompu ou renvoyé vers une correction tant que les informations, la vérification e-mail ou les sélections ne sont pas valides.",font=font(20),fill=GREY)

cx=950
d.ellipse((cx-32,185,cx+32,249),fill=GREEN,outline=NAVY,width=3); centered(d,(cx-32,185,cx+32,249),"",18)
d.text((990,205),"Début",font=font(20,True),fill=NAVY)
action(d,(690,285,1210,375),"Accès au formulaire de demande")
action(d,(690,425,1210,535),"Saisie des informations de la banque")
decision(d,cx,615,"Informations\nvalides ?")
action(d,(690,735,1210,845),"Saisie des informations du futur administrateur")
decision(d,cx,925,"Informations\nvalides ?")
action(d,(690,1045,1210,1155),"Envoi et saisie du code de vérification e-mail",fill="#EDF3FE")
decision(d,cx,1235,"E-mail\nvérifié ?")
action(d,(690,1355,1210,1465),"Configuration de la marketplace")
action(d,(690,1515,1210,1625),"Sélection des stores et des modules")
decision(d,cx,1705,"Sélections\nvalides ?")
action(d,(690,1815,1210,1925),"Récapitulatif et soumission",fill="#EDF3FE")

# Continue the lower confirmation band in a second aligned lane to preserve readability.
for a,b in [((cx,249),(cx,285)),((cx,375),(cx,425)),((cx,535),(cx,550)),((cx,680),(cx,735)),((cx,845),(cx,860)),((cx,990),(cx,1045)),((cx,1155),(cx,1170)),((cx,1300),(cx,1355)),((cx,1465),(cx,1515)),((cx,1625),(cx,1640)),((cx,1770),(cx,1815))]: arrow(d,a,b)
# invalid loops
action(d,(1350,570,1770,660),"Corriger les informations",fill=RED); arrow(d,(1100,615),(1350,615),"Non"); arrow(d,(1350,660),(1350,790)); arrow(d,(1350,790),(1210,790))
action(d,(1350,880,1770,970),"Corriger les informations",fill=RED); arrow(d,(1100,925),(1350,925),"Non"); arrow(d,(1350,970),(1350,1100)); arrow(d,(1350,1100),(1210,1100))
action(d,(1350,1190,1770,1280),"Renvoyer le code ou corriger l’e-mail",fill=RED); arrow(d,(1100,1235),(1350,1235),"Non"); arrow(d,(1350,1280),(1350,1100)); arrow(d,(1350,1100),(1210,1100))
action(d,(1350,1660,1770,1750),"Modifier les stores ou modules",fill=RED); arrow(d,(1100,1705),(1350,1705),"Non"); arrow(d,(1350,1750),(1350,1570)); arrow(d,(1350,1570),(1210,1570))
for x,y in [(980,690),(980,1000),(980,1310),(980,1780)]:
    d.text((x,y),"Oui",font=font(19,True),fill=GREY)

# footer continuation panel
d.rectangle((0,1935,1900,2290),fill="#F7F9FC")
d.text((65,1970),"Suite du processus après confirmation de la soumission",font=font(27,True),fill=NAVY)
action(d,(190,2050,610,2160),"Création de la demande au statut PENDING",fill="#EDF3FE")
action(d,(740,2050,1160,2160),"Notification du back-office SaaS et e-mail de confirmation",fill="#EDF3FE")
action(d,(1290,2050,1710,2160),"Confirmation affichée au demandeur",fill=GREEN)
arrow(d,(610,2105),(740,2105)); arrow(d,(1160,2105),(1290,2105))
d.ellipse((1470,2210,1530,2270),fill=NAVY); d.text((1550,2225),"Fin",font=font(20,True),fill=NAVY); arrow(d,(1500,2160),(1500,2210))

# expand image canvas to include the footer band.
img.save(OUT)
print(OUT)
