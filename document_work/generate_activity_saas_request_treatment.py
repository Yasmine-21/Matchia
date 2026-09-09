from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_4_11_activity_saas_request_treatment.png")
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GOLD='#FFF1C9'; RED='#FCE8E6'; GREEN='#E8F5EC'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'
def f(s,b=False): return ImageFont.truetype(BOLD if b else FONT,s)
def wrap(d,t,ff,w):
    result=[]; row=''
    for word in t.split():
        candidate=(row+' '+word).strip()
        if d.textbbox((0,0),candidate,font=ff)[2] <= w: row=candidate
        else: result.append(row); row=word
    if row: result.append(row)
    return result
def center(d,rect,t,size=24):
    ff=f(size,True); x1,y1,x2,y2=rect; rows=wrap(d,t,ff,x2-x1-35); heights=[d.textbbox((0,0),r,font=ff)[3]-d.textbbox((0,0),r,font=ff)[1] for r in rows]; y=y1+(y2-y1-sum(heights)-6*(len(rows)-1))//2
    for r,h in zip(rows,heights):
        w=d.textbbox((0,0),r,font=ff)[2]; d.text((x1+(x2-x1-w)//2,y),r,font=ff,fill=NAVY); y+=h+6
def arrow(d,a,b,label=None):
    d.line((a,b),fill=BLUE,width=4); x1,y1=a; x2,y2=b
    if abs(x2-x1)>=abs(y2-y1): pts=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)]
    else: pts=[(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    d.polygon(pts,fill=BLUE)
    if label: d.text(((x1+x2)//2+12,(y1+y2)//2-20),label,font=f(19,True),fill=GREY)
def action(d,rect,t,fill=LIGHT):
    d.rounded_rectangle(rect,radius=18,fill=fill,outline=BLUE,width=4); center(d,rect,t,22)
def decision(d,cx,cy,t):
    d.polygon([(cx,cy-62),(cx+145,cy),(cx,cy+62),(cx-145,cy)],fill=GOLD,outline=BLUE,width=4); center(d,(cx-105,cy-40,cx+105,cy+40),t,20)

img=Image.new('RGB',(1800,1420),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,1800,105),fill=NAVY); d.text((50,32),'Diagramme d’activité — Traitement d’une demande de marketplace par le SaaS',font=f(35,True),fill='white')
d.text((50,132),'Le back-office SaaS instruit la demande avant toute activation de la banque ou de sa marketplace.',font=f(20),fill=GREY)
cx=900
d.ellipse((868,195,932,259),fill=GREEN,outline=NAVY,width=3); d.text((952,215),'Début',font=f(20,True),fill=NAVY)
action(d,(630,300,1170,400),'Consultation de la demande')
action(d,(630,455,1170,555),'Vérification des informations, stores et modules')
decision(d,cx,645,'Décision')
arrow(d,(cx,259),(cx,300)); arrow(d,(cx,400),(cx,455)); arrow(d,(cx,555),(cx,583))
# Rejection lane
action(d,(150,765,570,865),'Rejet de la demande',RED)
action(d,(150,930,570,1030),'Saisie du motif de rejet',RED)
action(d,(150,1095,570,1195),'E-mail de rejet au demandeur',RED)
arrow(d,(755,645),(570,815),'Rejet'); arrow(d,(360,865),(360,930)); arrow(d,(360,1030),(360,1095))
d.ellipse((328,1235,392,1299),fill=NAVY); d.text((416,1253),'Fin',font=f(20,True),fill=NAVY); arrow(d,(360,1195),(360,1235))
# Approval lane
action(d,(1230,765,1650,865),'Approbation de la demande',GREEN)
action(d,(1230,930,1650,1030),'Génération de l’opération et du lien de paiement', '#EDF3FE')
action(d,(1230,1095,1650,1195),'E-mail de paiement au demandeur',GREEN)
action(d,(1230,1260,1650,1360),'Poursuite du processus de paiement', '#EDF3FE')
arrow(d,(1045,645),(1230,815),'Approbation'); arrow(d,(1440,865),(1440,930)); arrow(d,(1440,1030),(1440,1095)); arrow(d,(1440,1195),(1440,1260))
d.text((1145,690),'La marketplace reste inactive tant que le paiement n’est pas confirmé.',font=f(19,True),fill=GREY)
img.save(OUT); print(OUT)
