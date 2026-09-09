from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia")
ROOT.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GREEN='#E8F5EC'; GOLD='#FFF1C9'; ORANGE='#FFF0E3'; PURPLE='#F1EAFE'; GREY='#5B6573'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'

def f(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def wrap(d, text, font, width):
    lines, current=[], ''
    for word in text.split():
        candidate=(current+' '+word).strip()
        if d.textbbox((0,0),candidate,font=font)[2] <= width: current=candidate
        else: lines.append(current); current=word
    if current: lines.append(current)
    return lines
def center(d, rect, text, size=20, color=NAVY):
    font=f(size,True); x1,y1,x2,y2=rect; lines=wrap(d,text,font,x2-x1-28)
    hs=[d.textbbox((0,0),line,font=font)[3]-d.textbbox((0,0),line,font=font)[1] for line in lines]
    y=y1+((y2-y1)-sum(hs)-5*(len(lines)-1))//2
    for line,h in zip(lines,hs):
        width=d.textbbox((0,0),line,font=font)[2]
        d.text((x1+(x2-x1-width)//2,y),line,font=font,fill=color); y+=h+5
def box(d, rect, text, fill=LIGHT, size=20):
    d.rounded_rectangle(rect,radius=18,fill=fill,outline=BLUE,width=4); center(d,rect,text,size)
def arrow(d, source, target, label=None):
    d.line((source,target),fill=BLUE,width=4); x1,y1=source; x2,y2=target
    if abs(x2-x1)>=abs(y2-y1): pts=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)]
    else: pts=[(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    d.polygon(pts,fill=BLUE)
    if label:
        font=f(16,True); width=d.textbbox((0,0),label,font=font)[2]
        d.text(((x1+x2-width)//2,(y1+y2)//2-24),label,font=font,fill=GREY)

# Figure 6.1 — pipeline
img=Image.new('RGB',(2400,1430),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2400,110),fill=NAVY)
d.text((48,34),'Pipeline CI/CD de Matchia : de GitHub au déploiement Azure',font=f(37,True),fill='white')
d.rounded_rectangle((70,140,2330,208),radius=12,fill=GOLD,outline='#C48B14',width=2)
center(d,(90,148,2310,200),'Chaque push GitHub déclenche la construction, les contrôles qualité, la création des images et la mise à jour des applications Azure.',19)

box(d,(90,300,340,410),'GitHub\nPush du code source',PURPLE)
box(d,(460,300,710,410),'Jenkins\nDéclenchement du pipeline',LIGHT)
box(d,(840,245,1130,355),'Build backend\nMaven / Spring Boot',ORANGE)
box(d,(840,430,1130,540),'Build frontend\nnpm ci / Vite',ORANGE)
box(d,(1260,245,1550,355),'Tests backend\nMaven',GREEN)
box(d,(1260,430,1550,540),'Analyse qualité\nSonarQube backend et frontend',GREEN)
box(d,(1680,335,1960,455),'Docker Build\nImages frontend et backend',LIGHT)
box(d,(2070,335,2330,455),'Docker Hub\nTags : numéro de build et latest',PURPLE)
box(d,(900,720,1510,845),'Azure Container Apps\nMise à jour du backend et du frontend',GREEN,22)

arrow(d,(340,355),(460,355),'Webhook GitHub')
arrow(d,(710,355),(840,300))
arrow(d,(710,355),(840,485))
arrow(d,(1130,300),(1260,300))
arrow(d,(1130,485),(1260,485))
arrow(d,(1550,300),(1680,395))
arrow(d,(1550,485),(1680,395))
arrow(d,(1960,395),(2070,395),'push')
arrow(d,(2200,455),(1510,782),'az containerapp update')

d.rounded_rectangle((90,980,2310,1320),radius=18,fill='#F8FAFC',outline='#B8C7D8',width=2)
d.text((125,1015),'Étapes effectivement présentes dans le Jenkinsfile',font=f(23,True),fill=NAVY)
notes=[
    '1. Récupération du code depuis GitHub.',
    '2. Construction du backend et du frontend.',
    '3. Exécution des tests backend.',
    '4. Analyse SonarQube du backend et du frontend.',
    '5. Construction puis publication des images Docker.',
    '6. Déploiement des nouvelles révisions sur Azure Container Apps.'
]
for i,note in enumerate(notes):
    x=140+(i%3)*730; y=1080+(i//3)*110
    d.ellipse((x,y,x+28,y+28),fill=BLUE); d.text((x+9,y+3),str(i+1),font=f(15,True),fill='white')
    d.text((x+42,y+2),note,font=f(18),fill=NAVY)
img.save(ROOT/'fig_6_1_pipeline_cicd.png')

# Figure 6.2 — deployment
img=Image.new('RGB',(2400,1450),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2400,110),fill=NAVY)
d.text((48,34),'Architecture de déploiement de Matchia sur Microsoft Azure',font=f(37,True),fill='white')
d.rounded_rectangle((580,180,1850,1010),radius=28,fill='#F7FBFF',outline=BLUE,width=4)
d.text((635,215),'Microsoft Azure — Azure Container Apps',font=f(28,True),fill=NAVY)

box(d,(90,440,420,565),'Utilisateurs\nNavigateurs web',LIGHT,22)
box(d,(700,390,1100,540),'Container App Frontend\nReact compilé et servi par Nginx',GREEN,21)
box(d,(1390,390,1790,540),'Container App Backend\nSpring Boot — API REST',GREEN,21)
box(d,(1920,390,2290,540),'PostgreSQL\nService externe configuré par variables d’environnement',ORANGE,19)
box(d,(700,760,1100,885),'Marketplace publique\nContexte de banque transmis dans l’URL',LIGHT,20)
box(d,(1390,760,1790,885),'Services métier\nSécurité JWT, paiement, e-mail, IA',LIGHT,20)

box(d,(90,1030,420,1155),'Jenkins\nDéploie une nouvelle révision',PURPLE,20)
box(d,(90,1240,420,1365),'Docker Hub\nImages versionnées',PURPLE,20)

arrow(d,(420,502),(700,465),'HTTPS')
arrow(d,(1100,465),(1390,465),'API REST')
arrow(d,(1790,465),(1920,465),'JDBC')
arrow(d,(900,540),(900,760),'Affichage')
arrow(d,(1590,540),(1590,760),'Traitement')
arrow(d,(420,1092),(700,530),'az containerapp update')
arrow(d,(420,1302),(420,1155),'images')

d.rounded_rectangle((580,1120,2290,1285),radius=16,fill=GOLD,outline='#C48B14',width=2)
center(d,(610,1135,2260,1270),'Le frontend et le backend sont déployés comme deux services conteneurisés distincts. La base PostgreSQL est fournie par un service externe, paramétré par variables d’environnement.',19)
img.save(ROOT/'fig_6_2_azure_deployment_architecture.png')

print(ROOT/'fig_6_1_pipeline_cicd.png')
print(ROOT/'fig_6_2_azure_deployment_architecture.png')
