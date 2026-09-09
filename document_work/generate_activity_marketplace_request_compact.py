from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_4_1_activity_marketplace_request_compact.png")
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GOLD='#FFF1C9'; RED='#FCE8E6'; GREEN='#E8F5EC'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'
def f(n,b=False): return ImageFont.truetype(BOLD if b else FONT,n)
def wrap(d,t,ff,w):
    rows=[]; r=''
    for word in t.split():
        q=(r+' '+word).strip()
        if d.textbbox((0,0),q,font=ff)[2] <= w: r=q
        else: rows.append(r); r=word
    if r: rows.append(r)
    return rows
def label(d,rect,text,size=20,color=NAVY):
    ff=f(size,True); x1,y1,x2,y2=rect; rows=wrap(d,text,ff,x2-x1-28); hs=[d.textbbox((0,0),r,font=ff)[3]-d.textbbox((0,0),r,font=ff)[1] for r in rows]; yy=y1+(y2-y1-sum(hs)-4*(len(rows)-1))//2
    for r,h in zip(rows,hs):
        w=d.textbbox((0,0),r,font=ff)[2]; d.text((x1+(x2-x1-w)//2,yy),r,font=ff,fill=color); yy+=h+4
def arrow(d,a,b,txt=None):
    d.line((a,b),fill=BLUE,width=4); x1,y1=a; x2,y2=b
    pts=[(x2,y2),(x2-13 if x2>x1 else x2+13,y2-8),(x2-13 if x2>x1 else x2+13,y2+8)] if abs(x2-x1)>=abs(y2-y1) else [(x2,y2),(x2-8,y2-13 if y2>y1 else y2+13),(x2+8,y2-13 if y2>y1 else y2+13)]
    d.polygon(pts,fill=BLUE)
    if txt: d.text(((x1+x2)//2+7,(y1+y2)//2-18),txt,font=f(16,True),fill=GREY)
def action(d,x,y,text,fill=LIGHT):
    d.rounded_rectangle((x,y,x+250,y+82),radius=16,fill=fill,outline=BLUE,width=3); label(d,(x,y,x+250,y+82),text,17)
def decision(d,x,y,text):
    d.polygon([(x+110,y),(x+220,y+46),(x+110,y+92),(x,y+46)],fill=GOLD,outline=BLUE,width=3); label(d,(x+30,y+17,x+190,y+75),text,15)

img=Image.new('RGB',(2500,1350),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2500,90),fill=NAVY); d.text((48,25),'Diagramme d’activité — Demande de création d’une marketplace bancaire',font=f(34,True),fill='white')
d.text((48,115),'Les décisions de validité et la vérification e-mail conditionnent le passage à l’étape suivante.',font=f(19),fill=GREY)
# Ligne 1 : saisie et contrôle d’identité
d.ellipse((72,235,124,287),fill=GREEN,outline=NAVY,width=3); d.text((72,300),'Début',font=f(16,True),fill=NAVY)
action(d,175,220,'Accès au formulaire'); action(d,490,220,'Informations de la banque'); decision(d,805,215,'Informations\nvalides ?'); action(d,1110,220,'Informations de l’administrateur'); decision(d,1425,215,'Informations\nvalides ?'); action(d,1730,220,'Vérification de l’e-mail'); decision(d,2045,215,'E-mail\nvérifié ?')
for x1,x2 in [(124,175),(425,490),(740,805),(1025,1110),(1360,1425),(1640,1730),(1980,2045)]: arrow(d,(x1,261),(x2,261))
# Corrections de la première ligne
for x,y,text,target in [(805,375,'Corriger les informations',(615,302)),(1425,375,'Corriger les informations',(1235,302)),(2045,375,'Renvoyer le code ou corriger l’e-mail',(1855,302))]:
    action(d,x,y,text,RED); arrow(d,(x+110,307),(x+110,y)); arrow(d,(x+110,y+82),(target[0],y+123)); arrow(d,(target[0],y+123),target)
for x in [895,1515,2135]: d.text((x,275),'Oui',font=f(15,True),fill=GREY)
d.text((990,330),'Non',font=f(15,True),fill=GREY); d.text((1610,330),'Non',font=f(15,True),fill=GREY); d.text((2230,330),'Non',font=f(15,True),fill=GREY)
# Ligne 2 : configuration, sélection et soumission
action(d,175,720,'Configuration de la marketplace'); action(d,490,720,'Sélection des stores et modules'); decision(d,805,715,'Sélections\nvalides ?'); action(d,1110,720,'Récapitulatif'); action(d,1425,720,'Soumission de la demande', '#EDF3FE'); action(d,1730,720,'Création au statut PENDING', '#EDF3FE'); action(d,2045,720,'Notification SaaS et e-mail', '#EDF3FE')
arrow(d,(2155,307),(2155,630)); arrow(d,(2155,630),(300,630)); arrow(d,(300,630),(300,720))
for x1,x2 in [(425,490),(740,805),(1025,1110),(1360,1425),(1675,1730),(1980,2045)]: arrow(d,(x1,761),(x2,761))
d.text((500,660),'E-mail vérifié',font=f(16,True),fill=GREY)
action(d,805,880,'Modifier stores ou modules',RED); arrow(d,(915,807),(915,880),'Non'); arrow(d,(915,962),(615,962)); arrow(d,(615,962),(615,802)); d.text((895,820),'Oui',font=f(15,True),fill=GREY)
# Ligne 3 : confirmation
action(d,700,1100,'Confirmation affichée au demandeur',GREEN); d.ellipse((1165,1115,1217,1167),fill=NAVY); d.text((1234,1127),'Fin',font=f(17,True),fill=NAVY); arrow(d,(2170,802),(2170,1040)); arrow(d,(2170,1040),(825,1040)); arrow(d,(825,1040),(825,1100)); arrow(d,(950,1141),(1165,1141))
d.text((48,1250),'Légende : les rectangles arrondis représentent les activités, les losanges les décisions et les flèches les transitions du workflow.',font=f(18),fill=GREY)
img.save(OUT); print(OUT)
