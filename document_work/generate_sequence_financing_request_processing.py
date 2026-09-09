from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia\fig_5_5_sequence_financing_request_processing.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GREEN='#E8F5EC'; RED='#FCE8E6'; GOLD='#FFF1C9'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'

def f(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def wrap(draw, text, font, width):
    rows, row = [], ''
    for word in text.split():
        candidate = (row + ' ' + word).strip()
        if draw.textbbox((0,0), candidate, font=font)[2] <= width: row = candidate
        else: rows.append(row); row = word
    if row: rows.append(row)
    return rows
def center(draw, rect, text, size=18, color=NAVY):
    font=f(size,True); x1,y1,x2,y2=rect; rows=wrap(draw,text,font,x2-x1-20)
    heights=[draw.textbbox((0,0),row,font=font)[3]-draw.textbbox((0,0),row,font=font)[1] for row in rows]
    y=y1+((y2-y1)-sum(heights)-4*(len(rows)-1))//2
    for row,height in zip(rows,heights):
        width=draw.textbbox((0,0),row,font=font)[2]
        draw.text((x1+(x2-x1-width)//2,y),row,font=font,fill=color); y+=height+4
def arrow(draw, source, target, label, dashed=False):
    x1,y1=source; x2,y2=target
    if dashed:
        steps=max(1,int(max(abs(x2-x1),abs(y2-y1))/16))
        for index in range(steps):
            if index%2==0:
                xa=x1+(x2-x1)*index/steps; xb=x1+(x2-x1)*(index+1)/steps
                ya=y1+(y2-y1)*index/steps; yb=y1+(y2-y1)*(index+1)/steps
                draw.line((xa,ya,xb,yb),fill=BLUE,width=3)
    else: draw.line((source,target),fill=BLUE,width=3)
    if abs(x2-x1)>=abs(y2-y1): points=[(x2,y2),(x2-13 if x2>x1 else x2+13,y2-7),(x2-13 if x2>x1 else x2+13,y2+7)]
    else: points=[(x2,y2),(x2-7,y2-13 if y2>y1 else y2+13),(x2+7,y2-13 if y2>y1 else y2+13)]
    draw.polygon(points,fill=BLUE)
    font=f(17); rows=wrap(draw,label,font,max(120,abs(x2-x1)-26)); y=y1-28-19*(len(rows)-1)
    for row in rows:
        width=draw.textbbox((0,0),row,font=font)[2]
        draw.text(((x1+x2-width)//2,y),row,font=font,fill=NAVY); y+=19

img=Image.new('RGB',(2280,1510),'white'); draw=ImageDraw.Draw(img)
draw.rectangle((0,0,2280,105),fill=NAVY)
draw.text((48,32),'Diagramme de séquence — Traitement d’une demande de financement',font=f(36,True),fill='white')
draw.rounded_rectangle((95,135,2185,204),radius=12,fill=GOLD,outline='#C48B14',width=2)
center(draw,(115,144,2165,195),'Précondition : le client a soumis un dossier complet ; la demande est enregistrée au statut PENDING.',19)

participants=[('Client',160),('Interface\nweb',500),('Backend\nMatchia',840),('Base de\ndonnées',1180),('Administrateur\nBanque',1540),('Service\nE-mail',1940)]
for name,x in participants:
    draw.rounded_rectangle((x-120,245,x+120,325),radius=14,fill=LIGHT,outline=BLUE,width=3)
    center(draw,(x-112,253,x+112,317),name,19)
    for y in range(340,1435,16): draw.line((x,y,x,y+8),fill='#8EA5BE',width=2)

for x,y1,y2 in [(840,400,1320),(1180,480,1260),(1540,690,1170),(1940,1210,1330)]:
    draw.rectangle((x-8,y1,x+8,y2),fill='#DCEAF8',outline=BLUE,width=2)

arrow(draw,(160,410),(500,410),'1. Soumet la demande de financement')
arrow(draw,(500,500),(840,500),'2. Transmet le dossier')
arrow(draw,(840,585),(1180,585),'3. Enregistre la demande au statut PENDING')
arrow(draw,(1540,680),(500,680),'4. Consulte les demandes en attente')
arrow(draw,(500,765),(840,765),'5. Demande le détail du dossier')
arrow(draw,(840,850),(1180,850),'6. Charge le dossier et les documents')
arrow(draw,(840,935),(500,935),'7. Retourne les informations du dossier',True)
arrow(draw,(500,1010),(1540,1010),'8. Affiche le détail et les justificatifs',True)

draw.rectangle((715,1055,2045,1370),outline=GREEN,width=3); draw.rectangle((715,1055,2045,1100),fill=GREEN)
draw.text((742,1067),'alt — Décision de l’Administrateur Banque',font=f(20,True),fill=NAVY)
draw.line((715,1210,2045,1210),fill=GREEN,width=2)
draw.text((740,1116),'[Demande acceptée]',font=f(18,True),fill=NAVY)
arrow(draw,(1540,1155),(500,1155),'9. Valide la demande')
arrow(draw,(500,1185),(840,1185),'10. Transmet la décision ACCEPTED')
arrow(draw,(840,1210),(1180,1210),'11. Met à jour le statut et réserve une unité du stock')
draw.text((740,1230),'[Demande rejetée]',font=f(18,True),fill=NAVY)
arrow(draw,(1540,1280),(500,1280),'9. Rejette et indique le motif')
arrow(draw,(500,1310),(840,1310),'10. Transmet REJECTED et le motif')
arrow(draw,(840,1340),(1180,1340),'11. Met à jour le statut sans réservation du stock')

arrow(draw,(840,1410),(1940,1410),'12. Envoie l’e-mail de décision au client')
arrow(draw,(1940,1465),(160,1465),'13. Reçoit la décision et le motif en cas de rejet',True)

img.save(OUT); print(OUT)
