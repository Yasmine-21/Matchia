"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 2400;
const H = 1760;
const OUT = path.join(__dirname, "diagrammes_usecase_detailles_matchia");
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  {
    code: "UC-01", slug: "authentification", title: "S'authentifier",
    system: "Authentification et contexte d'accès",
    actors: ["Administrateur SaaS", "Administrateur Banque", "Concessionnaire", "Client"],
    includes: ["Saisir l'adresse e-mail\net le mot de passe", "Vérifier les identifiants", "Vérifier l'état du compte", "Charger le rôle et contrôler\nles autorisations", "Créer une session authentifiée", "Rediriger vers l'espace\ncorrespondant au rôle"],
    extensions: [
      ["Déterminer le contexte du tenant", "Utilisateur rattaché à une banque ou à une marketplace"],
      ["Refuser l'authentification\net afficher un message d'erreur", "Identifiants incorrects, compte inactif ou accès hors périmètre"],
      ["Renouveler la session\nou se reconnecter", "Session ou jeton d'authentification expiré"],
    ],
    source: "Chapitre 4 — Authentification, autorisation et contexte multi-tenant",
  },
  {
    code: "UC-02", slug: "demande_marketplace", title: "Soumettre une demande de marketplace bancaire",
    system: "Onboarding d'une banque",
    actors: ["Internaute"],
    includes: ["Renseigner la banque et le futur\nAdministrateur Banque", "Vérifier l'adresse e-mail", "Configurer le slug et\nl'identité visuelle", "Sélectionner les stores,\nmodules et l'offre", "Contrôler le récapitulatif", "Enregistrer et transmettre\nla demande", "Créer la notification et\nl'e-mail de confirmation"],
    extensions: [["Corriger les informations saisies", "Données invalides ou incomplètes, code incorrect ou slug indisponible"], ["Abandonner la demande", "Avant la soumission définitive"]],
    external: [{ label: "Service d'e-mail", connects: ["u1", "u6"] }],
    source: "Chapitre 4 — Demande de création d'une marketplace bancaire",
  },
  {
    code: "UC-03", slug: "administration_saas", title: "Administrer et superviser la plateforme SaaS",
    system: "Back-office SaaS",
    actors: ["Administrateur SaaS"],
    includes: ["S'authentifier", "Consulter le tableau de bord global", "Gérer les stores et les modules", "Gérer les banques, utilisateurs\net rôles", "Gérer concessionnaires, marketplaces\net contenus", "Gérer les offres, abonnements\net paiements", "Consulter l'audit, les logs\net les paramètres"],
    extensions: [], source: "Chapitre 4 — Back-office SaaS : administration et supervision",
  },
  {
    code: "UC-04", slug: "traitement_demande_marketplace", title: "Traiter une demande de marketplace",
    system: "Décision sur une demande bancaire",
    actors: ["Administrateur SaaS"],
    includes: ["S'authentifier", "Consulter la liste des demandes", "Ouvrir le détail de la demande", "Vérifier la banque, le futur\nadministrateur et la configuration", "Approuver ou rejeter la demande", "Enregistrer la décision\net son motif"],
    extensions: [["Déclencher le paiement", "Demande approuvée"], ["Notifier le rejet avec son motif", "Demande rejetée"]],
    external: [{ label: "Service d'e-mail", connects: ["x0", "x1"] }],
    source: "Chapitre 4 — Traitement d'une demande de marketplace",
  },
  {
    code: "UC-05", slug: "paiement_activation_marketplace", title: "Payer et activer la marketplace",
    system: "Paiement et activation des services",
    actors: ["Internaute"],
    includes: ["Ouvrir le lien de paiement reçu", "Créer la session de paiement", "Saisir et traiter la transaction", "Vérifier la confirmation Stripe", "Mettre à jour le paiement", "Activer la banque, la marketplace,\nl'abonnement et le compte", "Envoyer les informations\nde première connexion"],
    extensions: [["Maintenir les ressources inactives", "Paiement en attente ou échoué"], ["Relancer le paiement", "Transaction échouée"]],
    external: [{ label: "Stripe", connects: ["u1", "u2", "u3", "u4"] }, { label: "Service d'e-mail", connects: ["u0", "u6"] }],
    source: "Chapitre 4 — Paiement sécurisé par Stripe et activation",
  },
  {
    code: "UC-06", slug: "administration_banque", title: "Administrer la marketplace bancaire",
    system: "Back-office Banque",
    actors: ["Administrateur Banque"],
    includes: ["S'authentifier", "Consulter le tableau de bord,\nle profil et les notifications", "Personnaliser l'identité visuelle\net les contenus", "Gérer les stores, modules\net paramètres", "Gérer produits, clients,\nconcessionnaires et partenariats", "Traiter les demandes de financement", "Consulter l'abonnement\net les services actifs"],
    extensions: [["Refuser l'accès", "Ressource appartenant à un autre tenant"]],
    source: "Chapitre 4 — Back-office Banque : administration de la marketplace",
  },
  {
    code: "UC-07", slug: "renouvellement_services", title: "Renouveler ou ajouter des services",
    system: "Évolution d'un abonnement bancaire",
    actors: ["Administrateur Banque", "Administrateur SaaS"],
    includes: ["S'authentifier", "Consulter l'abonnement\net son historique", "Choisir un renouvellement\nou une extension", "Sélectionner les stores\net modules souhaités", "Soumettre la demande", "Examiner et approuver la demande", "Effectuer le paiement Stripe", "Mettre à jour l'abonnement\net activer les services"],
    extensions: [["Rejeter la demande avec motif", "Demande non approuvée"], ["Conserver les services inchangés", "Paiement échoué ou en attente"]],
    external: [{ label: "Stripe", connects: ["u6"] }, { label: "Service d'e-mail", connects: ["u4", "u5", "u7"] }],
    source: "Chapitre 4 — Renouvellement et ajout des services",
  },
  {
    code: "UC-08", slug: "marketplace_publique", title: "Consulter la marketplace, comparer et simuler",
    system: "Marketplace bancaire publique",
    actors: ["Internaute", "Client"],
    includes: ["Identifier la marketplace par son slug", "Afficher l'identité visuelle\net les contenus", "Consulter les stores disponibles", "Parcourir les produits publiés", "Consulter la fiche détaillée\nd'un produit"],
    extensions: [["Comparer plusieurs produits", "Module Comparateur actif"], ["Simuler un financement", "Module Simulateur actif"], ["Commencer une demande\nde financement", "Le visiteur souhaite poursuivre"]],
    source: "Chapitre 4 — Marketplace publique et chapitre 5 — Consultation, comparaison et simulation",
  },
  {
    code: "UC-09", slug: "inscription_concessionnaire", title: "Déposer une demande d'inscription comme Concessionnaire",
    system: "Onboarding d'un concessionnaire",
    actors: ["Internaute"],
    includes: ["Renseigner l'entreprise\net les coordonnées", "Sélectionner le store concerné", "Fournir les informations d'activité", "Téléverser les pièces justificatives", "Vérifier la complétude", "Enregistrer et transmettre\nla demande", "Notifier l'Administrateur SaaS"],
    extensions: [["Corriger ou compléter le dossier", "Informations ou pièces obligatoires manquantes"], ["Abandonner la demande", "Avant la soumission"]],
    source: "Chapitre 5 — Inscription et validation du concessionnaire",
  },
  {
    code: "UC-10", slug: "validation_concessionnaire", title: "Traiter une demande d'inscription Concessionnaire",
    system: "Validation d'un concessionnaire",
    actors: ["Administrateur SaaS"],
    includes: ["S'authentifier", "Consulter les demandes reçues", "Ouvrir les informations\net les documents", "Vérifier l'identité, la conformité\net l'éligibilité", "Enregistrer la décision"],
    extensions: [["Approuver et créer le compte", "Dossier admissible"], ["Rejeter et enregistrer le motif", "Dossier non admissible"], ["Envoyer la décision\net les identifiants", "Après traitement"]],
    external: [{ label: "Service d'e-mail", connects: ["x1", "x2"] }],
    source: "Chapitre 5 — Inscription et validation du concessionnaire",
  },
  {
    code: "UC-11", slug: "partenariats_contrats", title: "Gérer les partenariats et les contrats",
    system: "Collaboration banque concessionnaire",
    actors: ["Concessionnaire", "Administrateur Banque"],
    includes: ["S'authentifier", "Initier une demande de partenariat", "Sélectionner la banque,\nle concessionnaire et le store", "Consulter et traiter la demande", "Accepter ou rejeter la demande", "Définir les conditions du contrat", "Accepter et valider le contrat", "Activer le partenariat\net le contrat"],
    extensions: [["Annuler ou résilier le contrat", "Décision autorisée pendant la période de validité"], ["Expirer le contrat", "Date de fin atteinte"]],
    source: "Chapitre 5 — Partenariats et contrats",
  },
  {
    code: "UC-12", slug: "produits_publications_stock", title: "Gérer les produits, les stocks et les publications",
    system: "Catalogue concessionnaire multi-banque",
    actors: ["Concessionnaire", "Administrateur Banque"],
    includes: ["S'authentifier", "Créer ou modifier un produit", "Gérer le stock centralisé", "Sélectionner les banques partenaires", "Demander la publication", "Valider la publication par la banque", "Publier sur les marketplaces autorisées", "Propager les mises à jour\ndu produit et du stock"],
    extensions: [["Refuser la publication", "Concessionnaire, partenariat, contrat, store ou publication non valide"], ["Réserver le stock", "Demande de financement acceptée"]],
    source: "Chapitre 5 — Produits et publications multi-banque",
  },
  {
    code: "UC-13", slug: "inscription_client", title: "S'inscrire comme Client",
    system: "Création d'un compte Client",
    actors: ["Internaute"],
    includes: ["Identifier le tenant\nde la marketplace", "Renseigner les informations du client", "Valider le formulaire", "Envoyer un code de vérification", "Saisir et vérifier le code", "Activer le compte Client", "Reprendre le parcours de financement"],
    extensions: [["Refuser la vérification", "Code incorrect ou expiré"], ["Renvoyer un nouveau code", "Code non reçu ou expiré"]],
    external: [{ label: "Service d'e-mail", connects: ["u3", "x1"] }],
    source: "Chapitre 5 — Inscription du client et activation du compte",
  },
  {
    code: "UC-14", slug: "demande_financement_client", title: "Constituer et soumettre une demande de financement",
    system: "Dossier de financement Client",
    actors: ["Client"],
    includes: ["S'authentifier", "Sélectionner un produit\nou une simulation", "Créer le dossier à l'état brouillon", "Renseigner les informations requises", "Téléverser les documents justificatifs", "Vérifier les pièces obligatoires", "Soumettre le dossier à la banque", "Consulter et suivre le statut"],
    extensions: [["Conserver le brouillon", "Dossier non finalisé"], ["Bloquer la soumission", "Pièces obligatoires manquantes"]],
    source: "Chapitre 5 — Constitution et soumission du dossier",
  },
  {
    code: "UC-15", slug: "traitement_financement_banque", title: "Traiter une demande de financement",
    system: "Décision bancaire sur un financement",
    actors: ["Administrateur Banque"],
    includes: ["S'authentifier", "Consulter les demandes du tenant", "Ouvrir le dossier\net les documents", "Vérifier la complétude\net les informations", "Accepter ou rejeter la demande", "Enregistrer la décision\net mettre à jour le statut", "Notifier le Client"],
    extensions: [["Réserver le stock et informer\nle Concessionnaire", "Demande acceptée et produit concessionnaire"], ["Enregistrer et notifier\nle motif du rejet", "Demande rejetée"]],
    external: [{ label: "Service d'e-mail", connects: ["u6", "x0", "x1"] }],
    source: "Chapitre 5 — Traitement de la demande par la banque",
  },
  {
    code: "UC-16", slug: "assistant_ia_saas", title: "Interroger l'assistant IA du SaaS",
    system: "Assistant IA Text-to-SQL sécurisé",
    actors: ["Administrateur SaaS"],
    includes: ["S'authentifier", "Formuler une question\nen langage naturel", "Construire le schéma des données autorisées", "Transmettre le schéma\net la question à Gemini", "Générer une proposition de requête SQL", "Valider la requête de manière déterministe", "Exécuter la requête en lecture seule", "Reformuler et afficher la réponse"],
    extensions: [["Refuser la requête", "Requête non autorisée, non conforme ou hors périmètre"], ["Interrompre l'exécution", "Temps maximal dépassé"]],
    external: [{ label: "Gemini", connects: ["u3", "u4", "u7"] }],
    source: "Chapitre 5 — Assistant IA pour le pilotage du SaaS",
  },
  {
    code: "UC-17", slug: "chatbot_public", title: "Utiliser le chatbot public",
    system: "Chatbot d'une marketplace bancaire",
    actors: ["Internaute", "Client"],
    includes: ["Identifier la marketplace\net le store", "Vérifier l'activation du module Chatbot", "Normaliser le message", "Détecter une intention métier", "Rechercher uniquement\nles données publiques", "Répondre ou orienter vers\nles produits, le comparateur ou le simulateur"],
    extensions: [["Rendre le chatbot indisponible", "Module Chatbot désactivé"], ["Refuser la demande", "Donnée privée ou intention non autorisée"], ["Demander une reformulation", "Intention non reconnue"]],
    source: "Chapitre 5 — Chatbot public des marketplaces",
  },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
const slugFile = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
const center = (n) => [n.x + n.w / 2, n.y + n.h / 2];

function ellipsePoint(u, toward) {
  const [cx, cy] = center(u), dx = toward[0] - cx, dy = toward[1] - cy, rx = u.w / 2, ry = u.h / 2;
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}

function arcPoint(u, side, fraction) {
  const cy = u.y + u.h / 2, ry = u.h / 2, rx = u.w / 2, y = u.y + fraction * u.h;
  const ny = (y - cy) / ry, offset = rx * Math.sqrt(Math.max(0, 1 - ny * ny));
  return [u.x + rx + (side === "right" ? offset : -offset), y];
}

const polyline = (points) => points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const mxPoints = (points) => points.length ? `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : "";

function buildModel(def) {
  const includeGap = def.includes.length > 1 ? Math.min(170, 1065 / (def.includes.length - 1)) : 0;
  const actors = def.actors.map((label, i) => ({ id: `a${i}`, label, x: 35, y: 220 + i * (800 / Math.max(1, def.actors.length - 1)), w: 150, h: 135 }));
  const main = { id: "main", label: def.title, x: 470, y: 620, w: 560, h: 140, main: true };
  const includes = def.includes.map((label, i) => ({ id: `u${i}`, label, x: 1230, y: 155 + i * includeGap, w: 650, h: 105, auth: label === "S'authentifier" }));
  const n = def.extensions.length;
  const extXs = n === 1 ? [610] : n === 2 ? [360, 1150] : [320, 925, 1530];
  const extWs = n === 1 ? 820 : n === 2 ? 700 : 560;
  const extensions = def.extensions.map(([label, condition], i) => ({ id: `x${i}`, label, condition, x: extXs[i], y: 1370, w: extWs, h: 135, extension: true }));
  const nodes = new Map([main, ...actors, ...includes, ...extensions].map((n) => [n.id, n]));
  const external = (def.external || []).map((e, i) => ({ ...e, id: `e${i}`, x: 2210, y: 300 + i * 620, w: 150, h: 135, stereotype: "système externe" }));
  external.forEach((e) => nodes.set(e.id, e));
  return { actors, main, includes, extensions, external, nodes };
}

function nodeHtml(n) {
  const label = esc(n.label).replace(/\n/g, "&lt;br&gt;");
  return n.condition ? `${label}&lt;br&gt;&lt;span style=&quot;font-size:10px;font-style:italic;color:#666666&quot;&gt;[${esc(n.condition)}]&lt;/span&gt;` : label;
}

function diagramFragment(def) {
  const m = buildModel(def), cells = [];
  cells.push(`<mxCell id="system" value="Système Matchia — ${esc(def.system)}" style="swimlane;html=1;startSize=42;horizontal=1;rounded=0;collapsible=0;container=0;strokeColor=#4f5b5b;strokeWidth=1.6;fillColor=#ffffff;fontFamily=Arial;fontSize=17;fontStyle=1;align=left;spacingLeft=14;" vertex="1" parent="1"><mxGeometry x="300" y="60" width="1840" height="1580" as="geometry"/></mxCell>`);
  for (const a of [...m.actors, ...m.external]) {
    const sub = a.stereotype ? `&lt;br&gt;&lt;span style=&quot;font-size:10px;color:#666666&quot;&gt;«${a.stereotype}»&lt;/span&gt;` : "";
    cells.push(`<mxCell id="${a.id}" value="${esc(a.label).replace(/\n/g, "&lt;br&gt;")}${sub}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#555555;fillColor=#ffffff;fontFamily=Arial;fontSize=14;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" as="geometry"/></mxCell>`);
  }
  for (const u of [m.main, ...m.includes, ...m.extensions]) {
    const fill = u.main || u.auth ? "#dbe9ff" : u.extension ? "#fff2cc" : "#d7f4ef";
    const stroke = u.main || u.auth ? "#7da3d6" : u.extension ? "#c79a2b" : "#5d7774";
    cells.push(`<mxCell id="${u.id}" value="${nodeHtml(u)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.45;fontFamily=Arial;fontSize=14;align=center;verticalAlign=middle;spacing=7;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }
  m.actors.forEach((a, i) => {
    const entryY = 0.14 + i * (0.72 / Math.max(1, m.actors.length - 1));
    cells.push(`<mxCell id="assoc${i}" style="edgeStyle=none;rounded=0;html=1;endArrow=none;strokeColor=#555555;strokeWidth=1.2;exitX=1;exitY=0.5;entryX=0;entryY=${entryY.toFixed(3)};" edge="1" parent="1" source="${a.id}" target="main"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  m.includes.forEach((u, i) => {
    const exitY = 0.08 + i * (0.84 / Math.max(1, m.includes.length - 1));
    cells.push(`<mxCell id="inc${i}" value="«include»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=classic;endFill=1;strokeColor=#14a9b5;strokeWidth=1.35;fontColor=#39747a;fontFamily=Arial;fontSize=11;labelBackgroundColor=#ffffff;exitX=1;exitY=${exitY.toFixed(3)};entryX=0;entryY=0.5;" edge="1" parent="1" source="main" target="${u.id}"><mxGeometry x="-0.16" y="-9" relative="1" as="geometry"/></mxCell>`);
  });
  m.extensions.forEach((u, i) => {
    const targetX = m.extensions.length === 1 ? 0.55 : 0.28 + i * (0.50 / Math.max(1, m.extensions.length - 1));
    const route = i === m.extensions.length - 1 && u.x > 1200 ? [[1110, 1325], [1080, 1325], [1080, 860], [980, 860]] : [];
    const edgeStyle = route.length ? "orthogonalEdgeStyle" : "none";
    cells.push(`<mxCell id="ext${i}" value="«extend»" style="edgeStyle=${edgeStyle};rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=open;endFill=0;strokeColor=#c28b18;strokeWidth=1.35;fontColor=#8a6515;fontFamily=Arial;fontSize=11;labelBackgroundColor=#ffffff;exitX=0.5;exitY=0;entryX=${targetX.toFixed(3)};entryY=1;" edge="1" parent="1" source="${u.id}" target="main"><mxGeometry x="-0.18" y="-9" relative="1" as="geometry">${mxPoints(route)}</mxGeometry></mxCell>`);
  });
  m.external.forEach((a, ai) => {
    const laneY = 112 + ai * 22;
    const outerX = 2160 + ai * 18;
    const innerX = 760 + ai * 60;
    cells.push(`<mxCell id="external${ai}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor=#555555;strokeWidth=1.15;exitX=0;exitY=0.5;entryX=${(0.50 + ai * 0.10).toFixed(3)};entryY=0;" edge="1" parent="1" source="${a.id}" target="main"><mxGeometry relative="1" as="geometry">${mxPoints([[outerX, a.y + 66], [outerX, laneY], [innerX, laneY], [innerX, 555]])}</mxGeometry></mxCell>`);
  });
  cells.push(`<mxCell id="legend" value="Association : trait plein&#xa;«include» : sous-fonction obligatoire&#xa;«extend» : comportement conditionnel" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontFamily=Arial;fontSize=11;fontColor=#666666;" vertex="1" parent="1"><mxGeometry x="1510" y="1530" width="560" height="75" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="caption" value="${esc(def.code)} — ${esc(def.title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=16;fontStyle=2;fontColor=#444444;" vertex="1" parent="1"><mxGeometry x="560" y="1680" width="1280" height="34" as="geometry"/></mxCell>`);
  const model = `<mxGraphModel dx="${W}" dy="${H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<diagram id="${def.code.toLowerCase()}-${def.slug}" name="${esc(def.code + " " + def.title).slice(0, 70)}">${model}</diagram>`;
}

function actorSvg(a) {
  const cx = a.x + 75, top = a.y + 8, labelY = a.y + 112;
  const lines = a.label.split("\n");
  const labels = lines.map((line, i) => `<tspan x="${cx}" y="${labelY + i * 17}">${esc(line)}</tspan>`).join("");
  return `<g><circle cx="${cx}" cy="${top + 15}" r="14" fill="#fff" stroke="#555" stroke-width="1.4"/><path d="M${cx},${top + 29}L${cx},${top + 67}M${cx - 25},${top + 43}L${cx + 25},${top + 43}M${cx},${top + 67}L${cx - 22},${top + 94}M${cx},${top + 67}L${cx + 22},${top + 94}" fill="none" stroke="#555" stroke-width="1.4"/><text x="${cx}" y="${labelY}" text-anchor="middle" class="actor">${labels}</text>${a.stereotype ? `<text x="${cx}" y="${labelY + lines.length * 17}" text-anchor="middle" class="stereotype">«${a.stereotype}»</text>` : ""}</g>`;
}

function usecaseSvg(u) {
  const [cx, cy] = center(u), lines = u.label.split("\n"), condition = u.condition ? [`[${u.condition}]`] : [];
  const all = [...lines, ...condition], startY = cy - ((all.length - 1) * 19) / 2;
  const text = all.map((line, i) => `<tspan x="${cx}" y="${startY + i * 19}"${i >= lines.length ? ' class="condition"' : ""}>${esc(line)}</tspan>`).join("");
  const fill = u.main || u.auth ? "#dbe9ff" : u.extension ? "#fff2cc" : "#d7f4ef";
  const stroke = u.main || u.auth ? "#7da3d6" : u.extension ? "#c79a2b" : "#5d7774";
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.45"/><text x="${cx}" y="${startY}" text-anchor="middle" class="usecase">${text}</text></g>`;
}

function labelSvg(a, b, ratio, value, type) {
  const x = a[0] + (b[0] - a[0]) * ratio, y = a[1] + (b[1] - a[1]) * ratio - 8;
  return `<rect x="${x - 43}" y="${y - 13}" width="86" height="18" rx="3" fill="#fff" opacity=".95"/><text x="${x}" y="${y}" text-anchor="middle" class="${type}-label">${value}</text>`;
}

function svgXml(def) {
  const m = buildModel(def), edges = [];
  m.actors.forEach((a, i) => {
    const start = [a.x + 145, a.y + 66], end = arcPoint(m.main, "left", 0.14 + i * (0.72 / Math.max(1, m.actors.length - 1)));
    edges.push(`<path d="${polyline([start, end])}" class="association"/>`);
  });
  m.includes.forEach((u, i) => {
    const start = arcPoint(m.main, "right", 0.08 + i * (0.84 / Math.max(1, m.includes.length - 1))), end = ellipsePoint(u, start);
    edges.push(`<path d="${polyline([start, end])}" class="include" marker-end="url(#tealArrow)"/>${labelSvg(start, end, 0.43, "«include»", "include")}`);
  });
  m.extensions.forEach((u, i) => {
    const target = ellipsePoint(m.main, center(u));
    const route = i === m.extensions.length - 1 && u.x > 1200 ? [[1110, 1325], [1080, 1325], [1080, 860], [980, 860]] : [];
    const start = ellipsePoint(u, route.length ? route[0] : center(m.main));
    const points = [start, ...route, route.length ? ellipsePoint(m.main, route[route.length - 1]) : target];
    const la = route.length ? route[1] : start, lb = route.length ? route[2] : target;
    edges.push(`<path d="${polyline(points)}" class="extend" marker-end="url(#amberArrow)"/>${labelSvg(la, lb, 0.46, "«extend»", "extend")}`);
  });
  m.external.forEach((a, ai) => {
    const laneY = 112 + ai * 22, outerX = 2160 + ai * 18, innerX = 760 + ai * 60;
    const route = [[outerX, a.y + 66], [outerX, laneY], [innerX, laneY], [innerX, 555]];
    const start = [a.x + 5, a.y + 66], end = ellipsePoint(m.main, route[route.length - 1]);
    edges.push(`<path d="${polyline([start, ...route, end])}" class="association"/>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"><defs><marker id="tealArrow" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto"><path d="M0,0L10,5.5L0,11z" fill="#14a9b5"/></marker><marker id="amberArrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto"><path d="M1,1L11,6L1,11" fill="none" stroke="#c28b18" stroke-width="1.6"/></marker><style>.title{font:bold 17px Arial;fill:#263333}.actor{font:14px Arial;fill:#333}.stereotype,.condition{font:italic 10px Arial;fill:#666}.usecase{font:14px Arial;fill:#222;dominant-baseline:middle}.association{fill:none;stroke:#555;stroke-width:1.2}.include{fill:none;stroke:#14a9b5;stroke-width:1.35;stroke-dasharray:7 6}.extend{fill:none;stroke:#c28b18;stroke-width:1.35;stroke-dasharray:7 6}.include-label{font:11px Arial;fill:#39747a}.extend-label{font:11px Arial;fill:#8a6515}.legend{font:11px Arial;fill:#666}.caption{font:italic 16px Arial;fill:#444}</style></defs><rect width="${W}" height="${H}" fill="#fff"/><rect x="300" y="60" width="1840" height="1580" fill="#fff" stroke="#4f5b5b" stroke-width="1.6"/><line x1="300" y1="102" x2="2140" y2="102" stroke="#4f5b5b" stroke-width="1.2"/><text x="320" y="88" class="title">Système Matchia — ${esc(def.system)}</text>${edges.join("")}${[...m.actors, ...m.external].map(actorSvg).join("")}${[m.main, ...m.includes, ...m.extensions].map(usecaseSvg).join("")}<g class="legend"><text x="1510" y="1545">Association : trait plein</text><text x="1510" y="1570">«include» : sous-fonction obligatoire</text><text x="1510" y="1595">«extend» : comportement conditionnel</text></g><text x="1200" y="1710" text-anchor="middle" class="caption">${esc(def.code)} — ${esc(def.title)}</text></svg>`;
}

async function main() {
  const fragments = [];
  const index = ["# Diagrammes de cas d'utilisation détaillés de Matchia", "", "Les intitulés sont optimisés à partir des besoins fonctionnels, du backlog et des chapitres de réalisation du rapport.", "", "| Code | Cas d'utilisation | Acteurs | Source fonctionnelle |", "|---|---|---|---|"];
  for (const def of cases) {
    const folder = path.join(OUT, `${def.code}_${slugFile(def.slug)}`);
    fs.mkdirSync(folder, { recursive: true });
    const base = `${def.code}_${slugFile(def.title)}`;
    const fragment = diagramFragment(def);
    fragments.push(fragment);
    fs.writeFileSync(path.join(folder, `${base}.drawio`), `<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">${fragment}</mxfile>`, "utf8");
    const svg = svgXml(def);
    fs.writeFileSync(path.join(folder, `${base}.svg`), svg, "utf8");
    await sharp(Buffer.from(svg), { density: 160 }).png().toFile(path.join(folder, `${base}.png`));
    index.push(`| ${def.code} | ${def.title} | ${def.actors.join(", ")} | ${def.source} |`);
  }
  fs.writeFileSync(path.join(OUT, "Diagrammes_usecase_detailles_Matchia.drawio"), `<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">${fragments.join("")}</mxfile>`, "utf8");
  fs.writeFileSync(path.join(OUT, "Index_diagrammes_usecase_detailles.md"), index.join("\n"), "utf8");
  console.log(JSON.stringify({ output: OUT, count: cases.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
