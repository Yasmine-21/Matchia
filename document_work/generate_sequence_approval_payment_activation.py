from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_4_12_sequence_approval_payment_activation.png")
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GREEN='#E8F5EC'; RED='#FCE8E6'; GOLD='#FFF1C9'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'
def f(s,b=False): return ImageFont.truetype(BOLD if b else FONT,s)
def wrap(d,t,ff,w):
    rows=[]; row=''
    for word in t.split():
        candidate=(row+' '+word).strip()
        if d.textbbox((0,0),candidate,font=ff)[2] <= w: row=candidate
        else: rows.append(row); row=word
    if row: rows.append(row)
    return rows
def center(d,rect,t,size=18,color=NAVY):
    ff=f(size,True); x1,y1,x2,y2=rect; rows=wrap(d,t,ff,x2-x1-20); hs=[d.textbbox((0,0),r,font=ff)[3]-d.textbbox((0,0),r,font=ff)[1] for r in rows]; yy=y1+(y2-y1-sum(hs)-4*(len(rows)-1))//2
    for r,h in zip(rows,hs):
        w=d.textbbox((0,0),r,font=ff)[2]; d.text((x1+(x2-x1-w)//2,yy),r,font=ff,fill=color); yy+=h+4
def arrow(d,a,b,label,kind='solid'):
    color=BLUE; width=3
    if kind=='dashed':
        x1,y1=a; x2,y2=b; steps=max(1,int(abs(x2-x1)/16));
        for i in range(steps):
            if i%2==0:
                xa=x1+(x2-x1)*i/steps; xb=x1+(x2-x1)*(i+1)/steps; ya=y1+(y2-y1)*i/steps; yb=y1+(y2-y1)*(i+1)/steps; d.line((xa,ya,xb,yb),fill=color,width=width)
    else: d.line((a,b),fill=color,width=width)
    x1,y1=a; x2,y2=b; pts=[(x2,y2),(x2-13 if x2>x1 else x2+13,y2-7),(x2-13 if x2>x1 else x2+13,y2+7)]
    d.polygon(pts,fill=color)
    ff=f(17,False); rows=wrap(d,label,ff,max(100,abs(x2-x1)-28)); yy=y1-28-20*(len(rows)-1)
    for r in rows:
        w=d.textbbox((0,0),r,font=ff)[2]; d.text(((x1+x2-w)//2,yy),r,font=ff,fill=NAVY); yy+=20

img=Image.new('RGB',(2250,1530),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2250,105),fill=NAVY); d.text((55,32),'Diagramme de séquence — Approbation, paiement et activation',font=f(36,True),fill='white')
d.rounded_rectangle((95,135,2155,205),radius=12,fill=GOLD,outline='#C48B14',width=2); center(d,(115,145,2135,195),'Précondition : la demande de marketplace a été approuvée par l’Administrateur SaaS. La banque reçoit les instructions de paiement.',19)
participants=[('Banque',170),('Frontend',540),('Backend\nMatchia',910),('Service de\npaiement',1280),('Base de\ndonnées',1650),('Service\nEmail',2020)]
for name,x in participants:
    d.rounded_rectangle((x-120,245,x+120,325),radius=14,fill=LIGHT,outline=BLUE,width=3); center(d,(x-112,253,x+112,317),name,19)
    for y in range(340,1450,16): d.line((x,y,x,y+8),fill='#8EA5BE',width=2)
# activation bars
for x,y1,y2 in [(910,410,1325),(1280,595,1005),(1650,520,1280),(2020,1230,1375)]: d.rectangle((x-8,y1,x+8,y2),fill='#DCEAF8',outline=BLUE,width=2)
arrow(d,(170,410),(540,410),'1. Ouvre le lien de paiement reçu par e-mail')
arrow(d,(540,500),(910,500),'2. Demande la création / récupération de l’opération de paiement')
arrow(d,(910,585),(1650,585),'3. Enregistre ou lit le paiement au statut PENDING')
arrow(d,(910,675),(1280,675),'4. Crée la session ou l’intention de paiement')
arrow(d,(1280,760),(540,760),'5. Retourne l’URL ou les données de paiement','dashed')
arrow(d,(540,845),(170,845),'6. Affiche l’interface de paiement','dashed')
arrow(d,(170,930),(1280,930),'7. Renseigne les informations et confirme la transaction')
arrow(d,(1280,1015),(910,1015),'8. Retourne la confirmation du paiement','dashed')
d.rectangle((820,1060,1760,1375),outline=GREEN,width=3); d.rectangle((820,1060,1760,1105),fill=GREEN); d.text((845,1072),'alt — Paiement validé',font=f(20,True),fill=NAVY)
arrow(d,(910,1145),(1650,1145),'9. Met à jour le paiement : PAID / SUCCESS')
arrow(d,(910,1220),(1650,1220),'10. Active banque, marketplace, abonnement et compte Administrateur Banque')
arrow(d,(910,1305),(2020,1305),'11. Envoie l’e-mail avec les identifiants d’accès')
arrow(d,(2020,1390),(170,1390),'12. Reçoit les identifiants du Back-office Banque','dashed')
d.rectangle((95,1450,1050,1515),fill=RED,outline='#B44747',width=2); center(d,(105,1455,1040,1510),'Sinon : paiement non validé → aucune activation ; la demande reste en attente de confirmation.',17)
img.save(OUT); print(OUT)
