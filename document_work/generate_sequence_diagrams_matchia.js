"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "diagrammes_sequence_matchia");
fs.mkdirSync(OUT, { recursive: true });

const COLORS = {
  ink: "#17324D",
  blue: "#2F75B5",
  blueDark: "#1F4E79",
  pale: "#EAF3FB",
  pale2: "#F7FAFD",
  external: "#FFF1E8",
  externalStroke: "#C55A11",
  line: "#68839E",
  muted: "#5C6F82",
  white: "#FFFFFF",
  alt: "#FFF8DF",
};

const diagrams = [
  {
    id: "SD-01_authentification",
    title: "Authentification, autorisation et contexte multi-tenant",
    participants: [
      ["Utilisateur", "actor"], ["Interface Web", "boundary"], ["API Auth", "control"],
      ["Service JWT", "control"], ["PostgreSQL", "entity"],
    ],
    messages: [
      [0,1,"Saisir e-mail et mot de passe"],
      [1,2,"POST /auth/login"],
      [2,4,"Rechercher le compte"],
      [4,2,"Compte, rôle et tenant", "return"],
      [2,2,"Vérifier mot de passe et état"],
      [2,1,"401 + message d’erreur", "return"],
      [2,4,"Charger autorisations"],
      [4,2,"Rôles et permissions", "return"],
      [2,2,"Résoudre le contexte tenant"],
      [2,3,"Générer access token et refresh token"],
      [3,2,"Jetons signés", "return"],
      [2,1,"200 + session et profil", "return"],
      [1,0,"Rediriger vers l’espace autorisé", "return"],
    ],
    fragments: [
      {kind:"alt", start:5, end:12, label:"[compte invalide ou inactif]", separators:[{at:6,label:"[identifiants valides]"}]},
      {kind:"opt", start:8, end:8, label:"[utilisateur rattaché à une banque]"},
    ],
    activations: [[1,0,12],[2,1,11],[4,2,7],[3,9,10]],
  },
  {
    id: "SD-02_creation_demande_marketplace",
    title: "Création d’une demande de marketplace bancaire",
    participants: [
      ["Demandeur banque", "actor"], ["Portail public", "boundary"], ["API SaaS", "control"],
      ["Service E-mail", "external"], ["PostgreSQL", "entity"],
    ],
    messages: [
      [0,1,"Renseigner banque et futur administrateur"],
      [1,2,"Demander un code de vérification"],
      [2,3,"Envoyer le code à usage unique"],
      [3,0,"Code de vérification", "return"],
      [0,1,"Saisir le code reçu"],
      [1,2,"Vérifier le code"],
      [2,1,"Code refusé / expiré", "return"],
      [2,4,"Marquer l’e-mail comme vérifié"],
      [4,2,"Confirmation", "return"],
      [0,1,"Configurer slug, thème, stores et modules"],
      [0,1,"Valider le récapitulatif"],
      [1,2,"POST /marketplace-requests"],
      [2,2,"Valider unicité, offre et sélections"],
      [2,1,"Afficher les champs à corriger", "return"],
      [2,4,"Créer la demande EN_ATTENTE"],
      [4,2,"Référence de la demande", "return"],
      [2,3,"Notifier le demandeur et l’Admin SaaS"],
      [2,1,"Confirmation et référence", "return"],
      [1,0,"Afficher la confirmation", "return"],
    ],
    fragments: [
      {kind:"alt", start:6, end:8, label:"[code invalide]", separators:[{at:7,label:"[code valide]"}]},
      {kind:"alt", start:13, end:18, label:"[données invalides]", separators:[{at:14,label:"[données valides]"}]},
    ],
    activations: [[1,0,18],[2,1,17],[3,2,3],[4,7,15]],
  },
  {
    id: "SD-03_traitement_demande_stripe",
    title: "Traitement d’une demande, paiement Stripe et activation",
    participants: [
      ["Admin SaaS", "actor"], ["Back-office", "boundary"], ["API SaaS", "control"],
      ["Stripe", "external"], ["Service E-mail", "external"], ["PostgreSQL", "entity"], ["Futur Admin Banque", "actor"],
    ],
    messages: [
      [0,1,"Consulter la demande"],
      [1,2,"GET /requests/{id}"],
      [2,5,"Charger demande et sélections"],
      [5,2,"Dossier complet", "return"],
      [2,1,"Afficher le détail", "return"],
      [0,1,"Approuver ou rejeter"],
      [1,2,"PATCH décision + motif"],
      [2,5,"Enregistrer le rejet"],
      [2,4,"Envoyer le motif de rejet"],
      [4,6,"Notification de rejet", "return"],
      [2,5,"Préparer banque, marketplace et abonnement"],
      [2,3,"Créer une Checkout Session"],
      [3,2,"URL de paiement", "return"],
      [2,5,"Enregistrer PAIEMENT_EN_ATTENTE"],
      [2,4,"Envoyer le lien Stripe"],
      [4,6,"Instructions de paiement", "return"],
      [6,3,"Régler la Checkout Session"],
      [3,2,"Webhook checkout.session.completed"],
      [2,3,"Vérifier signature et statut"],
      [3,2,"Paiement échoué ou en attente", "return"],
      [2,5,"Conserver les ressources INACTIVES"],
      [2,4,"Notifier l’échec ou l’attente"],
      [4,6,"Paiement non confirmé", "return"],
      [3,2,"Paiement confirmé", "return"],
      [2,5,"Activer tenant, marketplace, abonnement et compte"],
      [5,2,"Activation confirmée", "return"],
      [2,4,"Envoyer les accès au Back-office Banque"],
      [4,6,"Identifiants de première connexion", "return"],
    ],
    fragments: [
      {kind:"alt", start:7, end:27, label:"[demande rejetée]", separators:[{at:10,label:"[demande approuvée]"}]},
      {kind:"alt", start:17, end:27, label:"[paiement échoué ou en attente]", separators:[{at:23,label:"[paiement confirmé]"}]},
    ],
    activations: [[1,0,6],[2,1,27],[5,2,25],[3,11,23],[4,8,27]],
  },
  {
    id: "SD-04_inscription_concessionnaire",
    title: "Inscription et validation d’un concessionnaire",
    participants: [
      ["Concessionnaire", "actor"], ["Portail public", "boundary"], ["API SaaS", "control"],
      ["Admin SaaS", "actor"], ["Service E-mail", "external"], ["PostgreSQL", "entity"],
    ],
    messages: [
      [0,1,"Saisir entreprise, store et coordonnées"],
      [0,1,"Joindre les justificatifs"],
      [1,2,"POST /dealer-requests"],
      [2,2,"Valider données et pièces obligatoires"],
      [2,1,"Signaler les éléments à corriger", "return"],
      [2,5,"Créer la demande EN_ATTENTE"],
      [5,2,"Référence créée", "return"],
      [2,4,"Notifier l’Administrateur SaaS"],
      [4,3,"Nouvelle demande concessionnaire", "return"],
      [3,2,"Consulter puis décider"],
      [2,5,"Enregistrer REJETÉE + motif"],
      [2,4,"Envoyer le motif"],
      [4,0,"Notification de rejet", "return"],
      [2,5,"Créer le compte concessionnaire"],
      [2,5,"Marquer la demande APPROUVÉE"],
      [2,4,"Envoyer les accès"],
      [4,0,"Identifiants de connexion", "return"],
    ],
    fragments: [
      {kind:"alt", start:4, end:8, label:"[dossier incomplet]", separators:[{at:5,label:"[dossier valide]"}]},
      {kind:"alt", start:10, end:16, label:"[rejet]", separators:[{at:13,label:"[approbation]"}]},
    ],
    activations: [[1,0,4],[2,2,16],[5,5,14],[4,7,16]],
  },
  {
    id: "SD-05_gestion_produit",
    title: "Gestion et publication multi-banque d’un produit",
    participants: [
      ["Concessionnaire", "actor"], ["Back-office concessionnaire", "boundary"], ["API Catalogue", "control"],
      ["Azure Files", "external"], ["PostgreSQL", "entity"], ["Admin Banque", "actor"],
    ],
    messages: [
      [0,1,"Créer ou modifier la fiche produit"],
      [1,2,"Enregistrer données et stock"],
      [2,2,"Vérifier droits, partenariat et contrat"],
      [2,3,"Téléverser les images"],
      [3,2,"URL des médias", "return"],
      [2,4,"Créer / mettre à jour le produit central"],
      [4,2,"Produit enregistré", "return"],
      [2,1,"Confirmation", "return"],
      [0,1,"Demander la publication pour une banque"],
      [1,2,"POST /product-publications"],
      [2,4,"Créer publication EN_ATTENTE"],
      [2,5,"Notifier la banque"],
      [5,2,"Approuver ou rejeter la publication"],
      [2,4,"Enregistrer REJETÉE + motif"],
      [2,1,"Demander une correction", "return"],
      [2,4,"Enregistrer APPROUVÉE et PUBLIÉE"],
      [2,4,"Propager les mises à jour de stock"],
      [2,1,"Produit visible sur la marketplace", "return"],
    ],
    fragments: [
      {kind:"alt", start:13, end:17, label:"[publication rejetée]", separators:[{at:15,label:"[publication approuvée]"}]},
      {kind:"loop", start:16, end:16, label:"[à chaque changement de stock]"},
    ],
    activations: [[1,0,17],[2,1,17],[3,3,4],[4,5,16]],
  },
  {
    id: "SD-06_inscription_client",
    title: "Inscription d’un client et activation du compte",
    participants: [
      ["Internaute", "actor"], ["Marketplace", "boundary"], ["API Client", "control"],
      ["Service E-mail", "external"], ["PostgreSQL", "entity"],
    ],
    messages: [
      [0,1,"Ouvrir l’inscription dans la marketplace"],
      [0,1,"Saisir identité, e-mail et mot de passe"],
      [1,2,"POST /clients/register + tenant"],
      [2,4,"Vérifier e-mail dans le tenant"],
      [4,2,"Disponibilité", "return"],
      [2,1,"Afficher l’erreur d’unicité", "return"],
      [2,4,"Créer le compte INACTIF"],
      [2,3,"Envoyer le code à six chiffres"],
      [3,0,"Code de vérification", "return"],
      [0,1,"Saisir le code"],
      [1,2,"POST /clients/verify"],
      [2,1,"Code invalide ou expiré", "return"],
      [2,4,"Activer le compte et rattacher le tenant"],
      [4,2,"Compte ACTIF", "return"],
      [2,1,"Inscription confirmée", "return"],
      [1,0,"Accès à la connexion", "return"],
    ],
    fragments: [
      {kind:"alt", start:5, end:8, label:"[e-mail déjà utilisé]", separators:[{at:6,label:"[e-mail disponible]"}]},
      {kind:"alt", start:11, end:15, label:"[code invalide]", separators:[{at:12,label:"[code valide]"}]},
    ],
    activations: [[1,0,15],[2,2,14],[3,7,8],[4,3,13]],
  },
  {
    id: "SD-07_demande_financement",
    title: "Constitution et traitement d’une demande de financement",
    participants: [
      ["Client", "actor"], ["Marketplace", "boundary"], ["API Financement", "control"],
      ["Azure Files", "external"], ["PostgreSQL", "entity"], ["Admin Banque", "actor"], ["Service E-mail", "external"],
    ],
    messages: [
      [0,1,"Choisir un produit ou une simulation"],
      [1,2,"Créer un dossier brouillon"],
      [2,4,"Enregistrer DRAFT + tenant"],
      [4,2,"Référence du dossier", "return"],
      [0,1,"Compléter les informations"],
      [0,1,"Téléverser les justificatifs"],
      [1,2,"Envoyer les documents"],
      [2,3,"Stocker les fichiers"],
      [3,2,"Chemins sécurisés", "return"],
      [2,4,"Associer les documents au dossier"],
      [0,1,"Soumettre la demande"],
      [1,2,"POST /financing/{id}/submit"],
      [2,2,"Vérifier complétude et éligibilité"],
      [2,1,"Lister les pièces manquantes", "return"],
      [2,4,"Passer le dossier EN_ATTENTE"],
      [2,6,"Notifier la banque"],
      [6,5,"Nouveau dossier à traiter", "return"],
      [5,2,"Consulter puis rendre la décision"],
      [2,4,"Enregistrer REJETÉE + motif"],
      [2,6,"Notifier le rejet"],
      [6,0,"Décision et motif", "return"],
      [2,4,"Enregistrer ACCEPTÉE"],
      [2,4,"Réserver le stock du produit"],
      [2,6,"Notifier l’acceptation"],
      [6,0,"Demande acceptée", "return"],
    ],
    fragments: [
      {kind:"alt", start:13, end:16, label:"[dossier incomplet]", separators:[{at:14,label:"[dossier complet]"}]},
      {kind:"alt", start:18, end:24, label:"[rejet]", separators:[{at:21,label:"[acceptation]"}]},
    ],
    activations: [[1,0,13],[2,1,24],[3,7,8],[4,2,22],[6,15,24]],
  },
  {
    id: "SD-08_assistant_saas",
    title: "Assistant SaaS Text-to-SQL sécurisé",
    participants: [
      ["Admin SaaS", "actor"], ["Back-office SaaS", "boundary"], ["API Assistant", "control"],
      ["Gemini", "external"], ["PostgreSQL", "entity"],
    ],
    messages: [
      [0,1,"Poser une question en langage naturel"],
      [1,2,"POST /assistant/query"],
      [2,2,"Vérifier rôle et périmètre"],
      [2,4,"Lire le schéma métier autorisé"],
      [4,2,"Tables et colonnes filtrées", "return"],
      [2,3,"Question + schéma sans données sensibles"],
      [3,2,"Proposition SQL", "return"],
      [2,2,"Valider SELECT, tables, limites et délai"],
      [2,1,"Refuser la requête non autorisée", "return"],
      [2,4,"Exécuter en lecture seule"],
      [4,2,"Résultat limité", "return"],
      [2,3,"Reformuler le résultat"],
      [3,2,"Réponse métier", "return"],
      [2,1,"Retourner la réponse et la traçabilité", "return"],
      [1,0,"Afficher la réponse", "return"],
    ],
    fragments: [
      {kind:"alt", start:8, end:14, label:"[SQL refusé ou non conforme]", separators:[{at:9,label:"[SQL validé]"}]},
    ],
    activations: [[1,0,14],[2,1,13],[3,5,12],[4,3,10]],
  },
  {
    id: "SD-09_chatbot_marketplace",
    title: "Chatbot public d’une marketplace bancaire",
    participants: [
      ["Internaute", "actor"], ["Widget Chatbot", "boundary"], ["API Chatbot", "control"],
      ["Moteur d’intentions", "control"], ["Catalogue public", "entity"],
    ],
    messages: [
      [0,1,"Envoyer un message"],
      [1,2,"POST /chatbot/message + contexte"],
      [2,4,"Vérifier tenant, store et module actif"],
      [4,2,"Contexte public autorisé", "return"],
      [2,1,"Chatbot indisponible", "return"],
      [2,3,"Normaliser le texte et détecter l’intention"],
      [3,2,"Intention + paramètres", "return"],
      [2,4,"Rechercher produits / stock / concessionnaire"],
      [4,2,"Résultats publics filtrés", "return"],
      [2,2,"Construire la réponse ou l’orientation"],
      [2,1,"Demander une reformulation", "return"],
      [2,1,"Réponse, liens ou accès au simulateur", "return"],
      [1,0,"Afficher la réponse", "return"],
    ],
    fragments: [
      {kind:"alt", start:4, end:12, label:"[module désactivé ou accès non autorisé]", separators:[{at:5,label:"[module actif]"}]},
      {kind:"alt", start:10, end:12, label:"[intention ambiguë ou aucun résultat]", separators:[{at:11,label:"[résultat disponible]"}]},
    ],
    activations: [[1,0,12],[2,1,11],[3,5,6],[4,2,8]],
  },
];

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > maxChars && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function svgText(lines, x, y, opts={}) {
  const size = opts.size || 18;
  const weight = opts.weight || 500;
  const anchor = opts.anchor || "middle";
  const fill = opts.fill || COLORS.ink;
  const italic = opts.italic ? "font-style=\"italic\"" : "";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${italic}>` +
    lines.map((line,i)=>`<tspan x="${x}" dy="${i===0?0:size+3}">${esc(line)}</tspan>`).join("") + `</text>`;
}

function geometry(d) {
  const W = 1800, margin = 125, boxY = 92, boxH = 76;
  const n = d.participants.length;
  const gap = (W - 2*margin) / (n-1);
  const centers = Array.from({length:n},(_,i)=>margin+i*gap);
  const boxW = Math.min(218, Math.max(180, gap*0.78));
  let y = 235;
  const msg = d.messages.map((m) => {
    const dist = Math.abs(centers[m[1]]-centers[m[0]]);
    const maxChars = m[0]===m[1] ? 29 : Math.max(24, Math.floor(dist/9.0));
    const lines = wrap(m[2], maxChars);
    const row = {y, lines};
    y += 70 + Math.max(0, lines.length-1)*20;
    return row;
  });
  const H = Math.max(1040, y + 120);
  return {W,H,margin,boxY,boxH,boxW,centers,msg,lifelineBottom:H-88};
}

function makeSvg(d) {
  const g = geometry(d);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}">`;
  s += `<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,4 L0,8 z" fill="${COLORS.blueDark}"/></marker><marker id="openArrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M1,0 L10,4 L1,8" fill="none" stroke="${COLORS.line}" stroke-width="1.6"/></marker><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.14"/></filter></defs>`;
  s += `<rect width="100%" height="100%" fill="white"/>`;
  s += svgText([d.title], g.W/2, 48, {size:30,weight:700,fill:COLORS.blueDark});
  s += `<line x1="70" y1="66" x2="1730" y2="66" stroke="${COLORS.blue}" stroke-width="2"/>`;

  for (const f of d.fragments || []) {
    const y1 = g.msg[f.start].y - 48;
    const y2 = g.msg[f.end].y + 34;
    s += `<rect x="45" y="${y1}" width="1710" height="${y2-y1}" rx="4" fill="${COLORS.alt}" fill-opacity="0.26" stroke="${COLORS.line}" stroke-width="2"/>`;
    s += `<path d="M45 ${y1} h104 v31 h-86 l-18 -18 z" fill="${COLORS.pale}" stroke="${COLORS.line}" stroke-width="1.5"/>`;
    s += svgText([f.kind], 89, y1+22, {size:17,weight:700,fill:COLORS.blueDark});
    s += svgText([f.label], 165, y1+24, {size:16,weight:600,anchor:"start",fill:COLORS.muted,italic:true});
    for (const sep of f.separators || []) {
      const sy = g.msg[sep.at].y - 44;
      s += `<line x1="45" y1="${sy}" x2="1755" y2="${sy}" stroke="${COLORS.line}" stroke-width="1.5" stroke-dasharray="10 8"/>`;
      s += svgText([sep.label], 64, sy+22, {size:16,weight:600,anchor:"start",fill:COLORS.muted,italic:true});
    }
  }

  d.participants.forEach((p,i)=>{
    const x=g.centers[i], ext=p[1]==="external";
    const fill=ext?COLORS.external:COLORS.pale, stroke=ext?COLORS.externalStroke:COLORS.blue;
    s += `<rect x="${x-g.boxW/2}" y="${g.boxY}" width="${g.boxW}" height="${g.boxH}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="3" filter="url(#shadow)"/>`;
    s += svgText([`«${p[1]}»`], x, g.boxY+23, {size:15,weight:500,fill:ext?COLORS.externalStroke:COLORS.muted,italic:true});
    const nameLines=wrap(p[0],20);
    s += svgText(nameLines, x, g.boxY+49, {size:17,weight:700,fill:COLORS.ink});
    s += `<line x1="${x}" y1="${g.boxY+g.boxH}" x2="${x}" y2="${g.lifelineBottom}" stroke="${COLORS.line}" stroke-width="2" stroke-dasharray="10 9"/>`;
  });

  for (const a of d.activations || []) {
    const x=g.centers[a[0]], y1=g.msg[a[1]].y-13, y2=g.msg[a[2]].y+24;
    s += `<rect x="${x-9}" y="${y1}" width="18" height="${y2-y1}" fill="${COLORS.pale}" stroke="${COLORS.blue}" stroke-width="1.6"/>`;
  }

  d.messages.forEach((m,i)=>{
    const [from,to,label,type] = m;
    const y=g.msg[i].y, x1=g.centers[from], x2=g.centers[to];
    const isReturn=type==="return";
    if (from===to) {
      const loopW=86;
      s += `<path d="M${x1} ${y} h${loopW} v35 h-${loopW}" fill="none" stroke="${COLORS.blueDark}" stroke-width="2.3" marker-end="url(#arrow)"/>`;
      s += svgText(g.msg[i].lines, x1+loopW/2, y-9, {size:17,weight:600,fill:COLORS.ink});
    } else {
      const dir=x2>x1?1:-1, start=x1+dir*10, end=x2-dir*12;
      const dash=isReturn?'stroke-dasharray="10 7"':'';
      s += `<line x1="${start}" y1="${y}" x2="${end}" y2="${y}" stroke="${isReturn?COLORS.line:COLORS.blueDark}" stroke-width="${isReturn?2:2.5}" ${dash} marker-end="url(#${isReturn?'openArrow':'arrow'})"/>`;
      s += svgText(g.msg[i].lines, (x1+x2)/2, y-10-(g.msg[i].lines.length-1)*20, {size:17,weight:isReturn?500:600,fill:isReturn?COLORS.muted:COLORS.ink});
    }
  });

  const ly=g.H-42;
  s += `<line x1="80" y1="${ly}" x2="150" y2="${ly}" stroke="${COLORS.blueDark}" stroke-width="2.5" marker-end="url(#arrow)"/>`;
  s += svgText(["appel"], 166, ly+6, {size:15,anchor:"start",fill:COLORS.muted});
  s += `<line x1="260" y1="${ly}" x2="330" y2="${ly}" stroke="${COLORS.line}" stroke-width="2" stroke-dasharray="10 7" marker-end="url(#openArrow)"/>`;
  s += svgText(["retour"], 346, ly+6, {size:15,anchor:"start",fill:COLORS.muted});
  s += `<rect x="455" y="${ly-13}" width="16" height="30" fill="${COLORS.pale}" stroke="${COLORS.blue}"/>`;
  s += svgText(["activation"], 486, ly+6, {size:15,anchor:"start",fill:COLORS.muted});
  s += svgText(["Fragments UML : alt, opt, loop"], 1718, ly+6, {size:15,anchor:"end",fill:COLORS.muted,italic:true});
  s += `</svg>`;
  return {svg:s, geom:g};
}

function drawioPage(d, g) {
  let cells = `<mxCell id="0"/><mxCell id="1" parent="0"/>`;
  let id=2;
  const add=(value,style,x,y,w,h,vertex=true)=>{
    const cid=id++;
    cells += `<mxCell id="${cid}" value="${esc(value)}" style="${style}" ${vertex?'vertex="1"':'edge="1"'} parent="1"><mxGeometry ${vertex?`x="${x}" y="${y}" width="${w}" height="${h}"`:'relative="1"'} as="geometry"/></mxCell>`;
    return cid;
  };
  add(d.title,"text;html=1;align=center;verticalAlign=middle;fontSize=24;fontStyle=1;fontColor=#1F4E79;",250,18,1300,42);
  const pids=[];
  d.participants.forEach((p,i)=>{
    const ext=p[1]==="external";
    const val=`«${p[1]}»<br><b>${p[0]}</b>`;
    pids.push(add(val,`rounded=1;whiteSpace=wrap;html=1;fillColor=${ext?'#FFF1E8':'#EAF3FB'};strokeColor=${ext?'#C55A11':'#2F75B5'};strokeWidth=2;fontColor=#17324D;fontSize=13;`,g.centers[i]-g.boxW/2,g.boxY,g.boxW,g.boxH));
    add("","shape=line;html=1;strokeColor=#68839E;dashed=1;dashPattern=8 8;",g.centers[i],g.boxY+g.boxH,1,g.lifelineBottom-(g.boxY+g.boxH));
  });
  for (const f of d.fragments||[]) {
    const y1=g.msg[f.start].y-48, y2=g.msg[f.end].y+34;
    add(`${f.kind}  ${f.label}`,"shape=umlFrame;whiteSpace=wrap;html=1;fillColor=#FFF8DF;fillOpacity=25;strokeColor=#68839E;fontColor=#17324D;fontSize=12;align=left;verticalAlign=top;spacingTop=4;",45,y1,1710,y2-y1);
  }
  d.messages.forEach((m,i)=>{
    const [from,to,label,type]=m;
    if(from===to){
      const eid=id++;
      const x=g.centers[from], y=g.msg[i].y;
      cells += `<mxCell id="${eid}" value="${esc(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#1F4E79;strokeWidth=2;endArrow=block;endFill=1;fontColor=#17324D;fontSize=12;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x}" y="${y}" as="sourcePoint"/><mxPoint x="${x}" y="${y+35}" as="targetPoint"/><Array as="points"><mxPoint x="${x+86}" y="${y}"/><mxPoint x="${x+86}" y="${y+35}"/></Array></mxGeometry></mxCell>`;
    } else {
      const style=`edgeStyle=none;html=1;strokeColor=${type==='return'?'#68839E':'#1F4E79'};strokeWidth=2;${type==='return'?'dashed=1;endArrow=open;endFill=0;':'endArrow=block;endFill=1;'}fontColor=#17324D;fontSize=12;`;
      const eid=id++;
      cells += `<mxCell id="${eid}" value="${esc(label)}" style="${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${g.centers[from]}" y="${g.msg[i].y}" as="sourcePoint"/><mxPoint x="${g.centers[to]}" y="${g.msg[i].y}" as="targetPoint"/></mxGeometry></mxCell>`;
    }
  });
  return `<diagram id="${esc(d.id.replace(/_/g,"-"))}" name="${esc(d.id)}"><mxGraphModel dx="1800" dy="${g.H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="${g.H}" math="0" shadow="0"><root>${cells}</root></mxGraphModel></diagram>`;
}

async function main() {
  const pages=[];
  for (const d of diagrams) {
    const {svg,geom}=makeSvg(d);
    const svgPath=path.join(OUT,`${d.id}.svg`);
    const pngPath=path.join(OUT,`${d.id}.png`);
    fs.writeFileSync(svgPath,svg,"utf8");
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    pages.push(drawioPage(d,geom));
    const one=`<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" modified="2026-09-05T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${drawioPage(d,geom)}</mxfile>`;
    fs.writeFileSync(path.join(OUT,`${d.id}.drawio`),one,"utf8");
    console.log(`${d.id}: ${geom.W}x${geom.H}`);
  }
  fs.writeFileSync(path.join(OUT,"Diagrammes_sequence_Matchia.drawio"),`<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" modified="2026-09-05T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${pages.join("")}</mxfile>`,"utf8");
}

main().catch((e)=>{console.error(e);process.exit(1);});
