from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_5_6_sequence_ai_text_to_sql_secure.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GREEN='#E8F5EC'; RED='#FCE8E6'; GOLD='#FFF1C9'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'

def f(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def wrap(draw, text, font, width):
    rows, row=[], ''
    for word in text.split():
        candidate=(row+' '+word).strip()
        if draw.textbbox((0,0),candidate,font=font)[2] <= width: row=candidate
        else: rows.append(row); row=word
    if row: rows.append(row)
    return rows
def center(draw, rect, text, size=18, color=NAVY):
    font=f(size,True); x1,y1,x2,y2=rect; rows=wrap(draw,text,font,x2-x1-20)
    heights=[draw.textbbox((0,0),r,font=font)[3]-draw.textbbox((0,0),r,font=font)[1] for r in rows]
    y=y1+((y2-y1)-sum(heights)-4*(len(rows)-1))//2
    for row,height in zip(rows,heights):
        width=draw.textbbox((0,0),row,font=font)[2]
        draw.text((x1+(x2-x1-width)//2,y),row,font=font,fill=color); y+=height+4
def arrow(draw, source, target, label, dashed=False):
    x1,y1=source; x2,y2=target
    if dashed:
        steps=max(1,int(max(abs(x2-x1),abs(y2-y1))/16))
        for i in range(steps):
            if i%2==0:
                xa=x1+(x2-x1)*i/steps; xb=x1+(x2-x1)*(i+1)/steps
                ya=y1+(y2-y1)*i/steps; yb=y1+(y2-y1)*(i+1)/steps
                draw.line((xa,ya,xb,yb),fill=BLUE,width=3)
    else: draw.line((source,target),fill=BLUE,width=3)
    if abs(x2-x1)>=abs(y2-y1): pts=[(x2,y2),(x2-13 if x2>x1 else x2+13,y2-7),(x2-13 if x2>x1 else x2+13,y2+7)]
    else: pts=[(x2,y2),(x2-7,y2-13 if y2>y1 else y2+13),(x2+7,y2-13 if y2>y1 else y2+13)]
    draw.polygon(pts,fill=BLUE)
    font=f(16); rows=wrap(draw,label,font,max(115,abs(x2-x1)-25)); y=y1-27-19*(len(rows)-1)
    for row in rows:
        width=draw.textbbox((0,0),row,font=font)[2]
        draw.text(((x1+x2-width)//2,y),row,font=font,fill=NAVY); y+=19

img=Image.new('RGB',(2600,1700),'white'); draw=ImageDraw.Draw(img)
draw.rectangle((0,0,2600,110),fill=NAVY)
draw.text((48,34),'Diagramme de séquence — Assistant IA Text-to-SQL sécurisé',font=f(37,True),fill='white')
draw.rounded_rectangle((90,140,2510,211),radius=12,fill=GOLD,outline='#C48B14',width=2)
center(draw,(110,149,2490,202),'Principe : Gemini propose une requête ; seul le backend valide et exécute une lecture contrôlée.',19)

participants=[('Administrateur\nSaaS',170),('Interface\nSaaS',530),('Backend\nMatchia',900),('Service de schéma\nautorisé',1270),('Gemini\n(LLM)',1640),('Validateur\nSQL',2010),('PostgreSQL',2380)]
for name,x in participants:
    draw.rounded_rectangle((x-125,260,x+125,342),radius=14,fill=LIGHT,outline=BLUE,width=3)
    center(draw,(x-116,268,x+116,334),name,19)
    for y in range(358,1635,16): draw.line((x,y,x,y+8),fill='#8EA5BE',width=2)

for x,y1,y2 in [(900,410,1460),(1270,495,615),(1640,720,1480),(2010,875,1300),(2380,1185,1320)]:
    draw.rectangle((x-8,y1,x+8,y2),fill='#DCEAF8',outline=BLUE,width=2)

arrow(draw,(170,420),(530,420),'1. Pose une question en langage naturel')
arrow(draw,(530,505),(900,505),'2. Transmet la question')
arrow(draw,(900,590),(1270,590),'3. Demande le schéma dynamique autorisé')
arrow(draw,(1270,665),(900,665),'4. Retourne tables, colonnes et relations filtrées',True)
arrow(draw,(900,750),(1640,750),'5. Envoie question, contexte métier et schéma autorisé')
arrow(draw,(1640,835),(900,835),'6. Retourne une proposition SQL',True)
arrow(draw,(900,920),(2010,920),'7. Soumet la requête au contrôle')

draw.rectangle((770,970,2475,1370),outline=GREEN,width=3); draw.rectangle((770,970,2475,1015),fill=GREEN)
draw.text((795,982),'alt — Validation déterministe de la requête SQL',font=f(20,True),fill=NAVY)
draw.line((770,1145,2475,1145),fill=GREEN,width=2)
draw.text((795,1032),'[Requête refusée]',font=f(18,True),fill=NAVY)
arrow(draw,(2010,1080),(900,1080),'8. Refuse : opération, table, colonne ou jointure non autorisée',True)
arrow(draw,(900,1125),(530,1125),'9. Retourne un message de refus contrôlé',True)
draw.text((795,1165),'[Requête valide]',font=f(18,True),fill=NAVY)
arrow(draw,(2010,1215),(2380,1215),'8. Exécute SELECT en lecture seule, limité à 50 résultats')
arrow(draw,(2380,1290),(900,1290),'9. Retourne les résultats autorisés',True)

arrow(draw,(900,1395),(1640,1395),'10. Transmet les résultats pour reformulation métier')
arrow(draw,(1640,1475),(900,1475),'11. Retourne une réponse concise en français',True)
arrow(draw,(900,1550),(530,1550),'12. Affiche la réponse sans détails techniques',True)
arrow(draw,(530,1615),(170,1615),'13. Consulte la réponse',True)

img.save(OUT); print(OUT)
