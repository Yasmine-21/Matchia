from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"D:\PFE M2\Platforme SaaS\document_work\diagrams_matchia")
OUT.mkdir(parents=True, exist_ok=True)
NAVY='#0B2545'; BLUE='#2E74B5'; LIGHT='#F4F8FC'; GREEN='#E8F5EC'; GOLD='#FFF1C9'; ORANGE='#FDE9D9'; GREY='#5B6573'; BORDER='#B9CBDF'
FONT=r'C:\Windows\Fonts\arial.ttf'; BOLD=r'C:\Windows\Fonts\arialbd.ttf'

def f(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def wrap(d, text, font, width):
    lines, row=[], ''
    for word in text.split():
        candidate=(row+' '+word).strip()
        if d.textbbox((0,0),candidate,font=font)[2] <= width: row=candidate
        else: lines.append(row); row=word
    if row: lines.append(row)
    return lines
def center(d, rect, text, size=20, color=NAVY):
    font=f(size,True); x1,y1,x2,y2=rect; lines=wrap(d,text,font,x2-x1-24)
    hs=[d.textbbox((0,0),line,font=font)[3]-d.textbbox((0,0),line,font=font)[1] for line in lines]
    y=y1+((y2-y1)-sum(hs)-5*(len(lines)-1))//2
    for line,h in zip(lines,hs):
        width=d.textbbox((0,0),line,font=font)[2]; d.text((x1+(x2-x1-width)//2,y),line,font=font,fill=color); y+=h+5
def box(d, rect, text, fill=LIGHT, size=20):
    d.rounded_rectangle(rect,radius=18,fill=fill,outline=BLUE,width=4); center(d,rect,text,size)
def arrow(d, a, b, label=None):
    d.line((a,b),fill=BLUE,width=4); x1,y1=a; x2,y2=b
    if abs(x2-x1)>=abs(y2-y1): pts=[(x2,y2),(x2-14 if x2>x1 else x2+14,y2-8),(x2-14 if x2>x1 else x2+14,y2+8)]
    else: pts=[(x2,y2),(x2-8,y2-14 if y2>y1 else y2+14),(x2+8,y2-14 if y2>y1 else y2+14)]
    d.polygon(pts,fill=BLUE)
    if label:
        font=f(16,True); width=d.textbbox((0,0),label,font=font)[2]
        d.text(((x1+x2-width)//2,(y1+y2)//2-24),label,font=font,fill=GREY)

# Figure 6.1 – CI/CD pipeline
img=Image.new('RGB',(2400,1420),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2400,108),fill=NAVY); d.text((45,33),'Pipeline CI/CD — Construction, qualité, conteneurisation et déploiement',font=f(36,True),fill='white')
d.text((45,138),'Le pipeline Jenkins est déclenché après une modification du dépôt et automatise la livraison des conteneurs.',font=f(20),fill=GREY)
boxes=[
    ((85,275,365,380),'Développeur\nGit push',LIGHT),
    ((455,275,735,380),'GitHub\nWebhook',LIGHT),
    ((825,275,1120,380),'Jenkins\nCheckout',LIGHT),
    ((1210,210,1515,315),'Build backend\nMaven',LIGHT),
    ((1210,350,1515,455),'Build frontend\nNode.js / Vite',LIGHT),
    ((1605,210,1910,315),'Tests backend\nMaven',GREEN),
    ((1605,350,1910,455),'Analyse qualité\nSonarQube',GOLD),
    ((825,610,1180,720),'Images Docker\nbackend + frontend',ORANGE),
    ((1290,610,1635,720),'Docker Hub\nversion Build + latest',ORANGE),
    ((1745,610,2110,720),'Azure Container Apps\nfrontend + backend',GREEN)
]
for rect,text,fill in boxes: box(d,rect,text,fill,20)
arrow(d,(365,327),(455,327)); arrow(d,(735,327),(825,327)); arrow(d,(1120,327),(1210,262)); arrow(d,(1120,327),(1210,402))
arrow(d,(1515,262),(1605,262)); arrow(d,(1515,402),(1605,402)); arrow(d,(1758,315),(1758,350))
arrow(d,(1758,455),(1758,535)); arrow(d,(1758,535),(1002,535)); arrow(d,(1002,535),(1002,610),'succès')
arrow(d,(1180,665),(1290,665)); arrow(d,(1635,665),(1745,665))
d.rounded_rectangle((230,850,2165,1035),radius=18,fill='#F7F9FC',outline=BORDER,width=3)
d.text((270,875),'Étapes automatisées du Jenkinsfile',font=f(22,True),fill=NAVY)
center(d,(270,915,2120,1015),'Compilation Spring Boot et React, tests backend, analyses SonarQube, construction des images, publication Docker Hub puis mise à jour des deux Azure Container Apps.',20)
d.rounded_rectangle((450,1110,1950,1245),radius=16,fill=GOLD,outline='#C48B14',width=3)
center(d,(480,1125,1920,1230),'Point d’amélioration : le Quality Gate SonarQube est analysé, mais le pipeline ne contient pas encore de contrôle bloquant waitForQualityGate avant la construction des images.',18)
d.text((520,1325),'Figure 6.1 — Diagramme du pipeline CI/CD de la plateforme',font=f(20,True),fill=GREY)
img.save(OUT/'fig_6_1_cicd_pipeline.png')

# Figure 6.2 – Azure deployment
img=Image.new('RGB',(2400,1450),'white'); d=ImageDraw.Draw(img)
d.rectangle((0,0,2400,108),fill=NAVY); d.text((45,33),'Architecture de déploiement — Microsoft Azure Container Apps',font=f(36,True),fill='white')
d.text((45,138),'Le frontend et le backend sont déployés sous forme de conteneurs indépendants, mis à jour par le pipeline Jenkins.',font=f(20),fill=GREY)
box(d,(85,315,375,425),'Visiteur /\nAdministrateur',LIGHT)
box(d,(485,315,795,425),'Internet\nHTTPS',LIGHT)
d.rounded_rectangle((900,235,2130,910),radius=24,fill='#F7F9FC',outline=BLUE,width=4)
d.text((940,265),'Azure — Groupe de ressources',font=f(24,True),fill=NAVY)
d.rounded_rectangle((960,325,2070,845),radius=22,fill='#EDF3FE',outline=BLUE,width=3)
d.text((1000,352),'Azure Container Apps Environment',font=f(21,True),fill=NAVY)
box(d,(1020,445,1435,570),'Container App Frontend\nReact compilé + Nginx',GREEN)
box(d,(1590,445,2010,570),'Container App Backend\nSpring Boot',GREEN)
arrow(d,(1435,507),(1590,507),'API REST')
box(d,(1020,650,1435,765),'Variables de build\nURL de l’API',GOLD)
box(d,(1590,650,2010,765),'Variables d’environnement\nconfiguration applicative',GOLD)
arrow(d,(1228,650),(1228,570)); arrow(d,(1800,650),(1800,570))
box(d,(2210,415,2385,530),'PostgreSQL\nexterne',LIGHT,18)
box(d,(2210,620,2385,735),'Services externes\nSMTP · Stripe · Gemini',LIGHT,17)
arrow(d,(2010,507),(2210,472),'JDBC'); arrow(d,(2010,535),(2210,675),'API / SMTP')
box(d,(920,1090,1240,1200),'Docker Hub\nimages versionnées',ORANGE)
box(d,(1370,1090,1690,1200),'Jenkins\nCI/CD',ORANGE)
arrow(d,(1530,1090),(1080,1090),'push images'); arrow(d,(1080,1090),(1080,910),'mise à jour'); arrow(d,(1530,1090),(1530,970),'commande Azure CLI')
arrow(d,(375,370),(485,370)); arrow(d,(795,370),(1020,507),'accès web')
d.rounded_rectangle((235,1270,2165,1378),radius=16,fill='#F7F9FC',outline=BORDER,width=3)
center(d,(265,1285,2135,1363),'La base de données n’est pas décrite comme une ressource Azure dans le pipeline ; la configuration est fournie au backend par variables d’environnement.',18)
d.text((650,1410),'Figure 6.2 — Diagramme de déploiement de la plateforme sur Microsoft Azure',font=f(20,True),fill=GREY)
img.save(OUT/'fig_6_2_azure_deployment.png')

print(OUT/'fig_6_1_cicd_pipeline.png')
print(OUT/'fig_6_2_azure_deployment.png')
