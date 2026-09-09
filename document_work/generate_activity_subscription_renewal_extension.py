from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_4_22_activity_subscription_renewal_extension.png")
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GOLD='#FFF1C9'; RED='#FCE8E6'; GREEN='#E8F5EC'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'
def f(s,b=False): return ImageFont.truetype(BOLD if b else FONT,s)
def wrap(d,t,ff,w):
    rows=[]; row=''
    for word in t.split():
        q=(row+' '+word).strip()
        if d.textbbox((0,0),q,font=ff)[2] <= w: row=q
        else: rows.append(row); row=word
    if row: rows.append(row)
    return rows
def center(d,rect,t,size=22):
    ff=f(size,True); x1,y1,x2,y2=rect; rows=wrap(d,t,ff,x2-x1-32); hs=[d.textbbox((0,0),r,font=ff)[3]-d.textbbox((0,0),r,font=ff)[1] for r in rows]; yy=y1+(y2-y1-sum(hs)-5*(len(rows)-1))//2
    for r,h in zip(rows,hs):
        w=d.textbbox((0,0),r,font=ff)[2]; d.text((x1+(x2-x1-w)//2,yy),r,font=ff,fill=NAVY); yy+=h+5
def arrow(d,a,b,label=None):
    d.line((a,b),fill=BLUE,width=4); x1,y1=a; x2,y2=b
    pts=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)] if abs(x2-x1)>=abs(y2-y1) else [(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    d.polygon(pts,fill=BLUE)
    if label: d.text(((x1+x2)//2+10,(y1+y2)//2-20),label,font=f(18,True),fill=GREY)
def action(d,rect,t,fill=LIGHT): d.rounded_rectangle(rect,radius=18,fill=fill,outline=BLUE,width=4); center(d,rect,t)
def decision(d,cx,cy,t): d.polygon([(cx,cy-58),(cx+140,cy),(cx,cy+58),(cx-140,cy)],fill=GOLD,outline=BLUE,width=4); center(d,(cx-103,cy-35,cx+103,cy+35),t,19)

img=Image.new('RGB',(1850,1860),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,1850,105),fill=NAVY); d.text((48,32),'Diagramme d’activité — Renouvellement et extension d’un abonnement',font=f(35,True),fill='white')
d.text((48,132),'Les services sont activés uniquement après validation par le SaaS et confirmation du paiement.',font=f(20),fill=GREY)
cx=925
d.ellipse((893,190,957,254),fill=GREEN,outline=NAVY,width=3); d.text((975,210),'Début',font=f(20,True),fill=NAVY)
action(d,(640,290,1210,390),'Consultation de l’abonnement en cours')
decision(d,cx,480,'Choix de la\ndemande')
action(d,(170,580,610,680),'Demande de renouvellement',LIGHT)
action(d,(1240,580,1680,680),'Demande d’extension : nouveaux stores ou modules',LIGHT)
action(d,(640,775,1210,875),'Transmission de la demande au SaaS', '#EDF3FE')
action(d,(640,955,1210,1055),'Validation de la demande par le SaaS', '#EDF3FE')
decision(d,cx,1140,'Demande\nvalidée ?')
action(d,(640,1240,1210,1340),'Paiement de la demande validée', '#EDF3FE')
decision(d,cx,1420,'Paiement\nconfirmé ?')
for a,b in [((cx,254),(cx,290)),((cx,390),(cx,422)),((cx,538),(390,580)),((cx,538),(1460,580)),((390,680),(390,725)),((390,725),(925,725)),((1460,680),(1460,725)),((1460,725),(925,725)),((cx,725),(cx,775)),((cx,875),(cx,955)),((cx,1055),(cx,1082)),((cx,1198),(cx,1240)),((cx,1340),(cx,1362))]: arrow(d,a,b)
d.text((300,525),'Renouvellement',font=f(17,True),fill=GREY); d.text((1370,525),'Extension',font=f(17,True),fill=GREY); d.text((965,1200),'Oui',font=f(17,True),fill=GREY)
# rejection / payment pending branches
action(d,(130,1085,480,1185),'Rejet ou demande de correction',RED); arrow(d,(785,1140),(480,1135),'Non'); d.ellipse((273,1230,337,1294),fill=NAVY); d.text((355,1248),'Fin',font=f(19,True),fill=NAVY); arrow(d,(305,1185),(305,1230))
action(d,(1325,1370,1725,1470),'Paiement non confirmé : aucune activation',RED); arrow(d,(1065,1420),(1325,1420),'Non'); d.ellipse((1493,1500,1557,1564),fill=NAVY); d.text((1575,1518),'Fin',font=f(19,True),fill=NAVY); arrow(d,(1525,1470),(1525,1500))
# success continuation panel
d.rectangle((485,1500,1365,1785),fill='#F7F9FC')
arrow(d,(cx,1478),(925,1560),'Oui')
action(d,(545,1560,925,1660),'Mise à jour de l’abonnement',GREEN)
action(d,(995,1560,1305,1660),'Activation des services',GREEN)
arrow(d,(925,1610),(995,1610)); d.ellipse((895,1710,959,1774),fill=NAVY); d.text((980,1728),'Fin',font=f(19,True),fill=NAVY); arrow(d,(1150,1660),(927,1710))
d.text((595,1815),'Un renouvellement prolonge les services existants ; une extension active uniquement les services supplémentaires souscrits.',font=f(18),fill=GREY)
img.save(OUT); print(OUT)
