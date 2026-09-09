"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 1500;
const H = 2380;
const MARGIN = 70;
const BODY_TOP = 115;
const BODY_BOTTOM = 2330;
const OUT = path.join(__dirname, "diagrammes_activite_matchia");
fs.mkdirSync(OUT, { recursive: true });

const diagrams = [
  {
    code: "AD-01", slug: "authentification", title: "Authentification et détermination du contexte d'accès",
    lanes: ["Utilisateur", "Système Matchia"],
    nodes: [
      ["start", "initial", 0, 190, ""],
      ["credentials", "action", 0, 285, "Saisir l'adresse e-mail\net le mot de passe"],
      ["submit", "action", 0, 405, "Soumettre le formulaire\nde connexion"],
      ["verify", "action", 1, 535, "Vérifier les identifiants"],
      ["valid", "decision", 1, 660, "Identifiants\nvalides ?"],
      ["error", "action", 0, 660, "Afficher l'erreur et permettre\nune nouvelle saisie"],
      ["account", "action", 1, 805, "Vérifier l'état du compte"],
      ["active", "decision", 1, 925, "Compte\nactif ?"],
      ["role", "action", 1, 1060, "Charger le rôle et contrôler\nles autorisations"],
      ["tenantNeeded", "decision", 1, 1190, "Contexte de\ntenant requis ?"],
      ["tenant", "action", 1, 1320, "Déterminer la banque ou\nla marketplace de rattachement"],
      ["tenantAllowed", "decision", 1, 1450, "Tenant\nautorisé ?"],
      ["deny", "action", 0, 1480, "Refuser l'accès"],
      ["fail", "final", 0, 1620, ""],
      ["session", "action", 1, 1650, "Créer la session authentifiée\navec le contexte d'accès"],
      ["redirect", "action", 0, 1820, "Rediriger vers l'espace\ncorrespondant au rôle"],
      ["success", "final", 0, 1970, ""],
    ],
    edges: [
      ["start", "credentials"], ["credentials", "submit"], ["submit", "verify"], ["verify", "valid"],
      ["valid", "account", "[Oui]"],
      ["valid", "error", "[Non]"],
      ["error", "credentials", "", [[105, 660], [105, 285]]],
      ["account", "active"], ["active", "role", "[Oui]"],
      ["active", "deny", "[Non]", [[735, 925], [735, 1420], [460, 1420]]],
      ["role", "tenantNeeded"],
      ["tenantNeeded", "tenant", "[Oui]"],
      ["tenantNeeded", "session", "[Non]", [[1390, 1190], [1390, 1650]]],
      ["tenant", "tenantAllowed"],
      ["tenantAllowed", "session", "[Oui]"],
      ["tenantAllowed", "deny", "[Non]"],
      ["deny", "fail"], ["session", "redirect"], ["redirect", "success"],
    ],
  },
  {
    code: "AD-02", slug: "creation_demande_marketplace", title: "Création et soumission d'une demande de marketplace bancaire",
    lanes: ["Internaute", "Système Matchia", "Service d'e-mail"],
    nodes: [
      ["start", "initial", 0, 185, ""],
      ["open", "action", 0, 270, "Accéder au formulaire public"],
      ["bank", "action", 0, 385, "Renseigner les informations\nde la banque"],
      ["validateBank", "decision", 1, 505, "Données\ncomplètes ?"],
      ["correctBank", "action", 0, 505, "Corriger les informations"],
      ["admin", "action", 0, 650, "Renseigner le futur\nAdministrateur Banque"],
      ["sendCode", "action", 2, 770, "Envoyer le code\nde vérification"],
      ["enterCode", "action", 0, 890, "Saisir le code reçu"],
      ["checkCode", "decision", 1, 1010, "Code\nvalide ?"],
      ["resend", "action", 2, 1125, "Signaler l'erreur ou\nrenvoyer un code"],
      ["branding", "action", 0, 1150, "Configurer le slug et\nl'identité visuelle"],
      ["services", "action", 0, 1280, "Sélectionner les stores,\nmodules et l'offre"],
      ["summary", "action", 1, 1410, "Construire et afficher\nle récapitulatif"],
      ["confirm", "decision", 0, 1535, "Confirmer la\ndemande ?"],
      ["modify", "action", 0, 1660, "Modifier la configuration"],
      ["submit", "action", 0, 1785, "Soumettre la demande"],
      ["save", "action", 1, 1910, "Enregistrer la demande\net notifier le Back-office SaaS"],
      ["mail", "action", 2, 2035, "Envoyer la confirmation\nau demandeur"],
      ["end", "final", 0, 2180, ""],
    ],
    edges: [
      ["start", "open"], ["open", "bank"], ["bank", "validateBank"],
      ["validateBank", "admin", "[Oui]"], ["validateBank", "correctBank", "[Non]"],
      ["correctBank", "bank", "", [[105, 505], [105, 385]]],
      ["admin", "sendCode"], ["sendCode", "enterCode"], ["enterCode", "checkCode"],
      ["checkCode", "branding", "[Oui]"], ["checkCode", "resend", "[Non]"],
      ["resend", "enterCode", "", [[1410, 1125], [1410, 890], [450, 890]]],
      ["branding", "services"], ["services", "summary"], ["summary", "confirm"],
      ["confirm", "submit", "[Oui]"], ["confirm", "modify", "[Non]"],
      ["modify", "branding", "", [[105, 1660], [105, 1150]]],
      ["submit", "save"], ["save", "mail"], ["mail", "end"],
    ],
  },
  {
    code: "AD-03", slug: "traitement_demande_marketplace", title: "Traitement d'une demande de marketplace",
    lanes: ["Administrateur SaaS", "Système Matchia", "Service d'e-mail"],
    nodes: [
      ["start", "initial", 0, 190, ""],
      ["auth", "action", 0, 285, "S'authentifier"],
      ["list", "action", 0, 405, "Consulter les demandes"],
      ["select", "action", 0, 525, "Sélectionner une demande"],
      ["pending", "decision", 1, 650, "Statut en\nattente ?"],
      ["statusError", "action", 0, 650, "Afficher que la demande\nne peut plus être traitée"],
      ["statusEnd", "final", 0, 790, ""],
      ["detail", "action", 1, 790, "Afficher les informations,\nles documents et la configuration"],
      ["review", "action", 0, 930, "Vérifier la complétude\net la conformité"],
      ["admissible", "decision", 0, 1060, "Demande\nadmissible ?"],
      ["reason", "action", 0, 1200, "Saisir le motif de rejet"],
      ["reject", "action", 1, 1660, "Enregistrer la décision\nREJETÉE"],
      ["rejectMail", "action", 2, 1780, "Notifier le rejet\net son motif"],
      ["rejectEnd", "final", 0, 1910, ""],
      ["approved", "action", 1, 1200, "Enregistrer la décision\nAPPROUVÉE"],
      ["payment", "action", 1, 1330, "Générer le lien\nde paiement"],
      ["paymentMail", "action", 2, 1460, "Envoyer les instructions\nde paiement"],
      ["approvedEnd", "final", 0, 1580, ""],
    ],
    edges: [
      ["start", "auth"], ["auth", "list"], ["list", "select"], ["select", "pending"],
      ["pending", "detail", "[Oui]"], ["pending", "statusError", "[Non]"],
      ["statusError", "statusEnd"],
      ["detail", "review"], ["review", "admissible"],
      ["admissible", "approved", "[Oui]"], ["admissible", "reason", "[Non]"],
      ["reason", "reject", "", [[105, 1200], [105, 1660], [540, 1660]]],
      ["reject", "rejectMail"], ["rejectMail", "rejectEnd"],
      ["approved", "payment"], ["payment", "paymentMail"], ["paymentMail", "approvedEnd"],
    ],
  },
  {
    code: "AD-04", slug: "parcours_concessionnaire", title: "Parcours métier du Concessionnaire",
    lanes: ["Concessionnaire", "Système Matchia", "Administrateur SaaS", "Administrateur Banque"],
    nodes: [
      ["start", "initial", 0, 175, ""],
      ["register", "action", 0, 255, "Déposer la demande\nd'inscription"],
      ["complete", "decision", 1, 355, "Dossier\ncomplet ?"],
      ["correct", "action", 0, 355, "Compléter le dossier"],
      ["review", "action", 2, 475, "Examiner le dossier"],
      ["approve", "decision", 2, 585, "Dossier\napprouvé ?"],
      ["reject", "action", 1, 705, "Enregistrer le rejet\net notifier le demandeur"],
      ["fail", "final", 0, 820, ""],
      ["account", "action", 1, 820, "Créer le compte et envoyer\nles identifiants"],
      ["catalog", "action", 0, 930, "S'authentifier et gérer\nle catalogue et le stock"],
      ["partner", "action", 0, 1040, "Initier une demande\nde partenariat"],
      ["bankReview", "action", 3, 1150, "Examiner la demande\nde partenariat"],
      ["partnerOk", "decision", 3, 1260, "Partenariat\naccepté ?"],
      ["partnerReject", "action", 1, 1370, "Notifier le rejet"],
      ["contract", "action", 3, 1370, "Préparer et envoyer\nle contrat"],
      ["acceptContract", "action", 0, 1480, "Accepter le contrat"],
      ["activate", "action", 1, 1590, "Activer le partenariat\net le contrat"],
      ["publishRequest", "action", 0, 1700, "Soumettre un produit\nà la publication"],
      ["validatePublish", "decision", 3, 1810, "Publication\nvalidée ?"],
      ["correctProduct", "action", 0, 1920, "Corriger le produit"],
      ["publish", "action", 1, 1920, "Publier le produit dans\nla marketplace autorisée"],
      ["follow", "action", 0, 2040, "Suivre les demandes\nde financement associées"],
      ["financeOk", "decision", 1, 2140, "Demande\nacceptée ?"],
      ["reserve", "action", 1, 2250, "Réserver le stock"],
      ["end", "final", 0, 2280, ""],
    ],
    edges: [
      ["start", "register"], ["register", "complete"], ["complete", "review", "[Oui]"],
      ["complete", "correct", "[Non]"], ["correct", "register", "", [[105, 355], [105, 255]]],
      ["review", "approve"], ["approve", "account", "[Oui]"], ["approve", "reject", "[Non]"],
      ["reject", "fail"], ["account", "catalog"], ["catalog", "partner"], ["partner", "bankReview"],
      ["bankReview", "partnerOk"], ["partnerOk", "contract", "[Oui]"], ["partnerOk", "partnerReject", "[Non]"],
      ["partnerReject", "partner", "", [[700, 1370], [700, 1040], [400, 1040]]],
      ["contract", "acceptContract"], ["acceptContract", "activate"], ["activate", "publishRequest"],
      ["publishRequest", "validatePublish"], ["validatePublish", "publish", "[Oui]"],
      ["validatePublish", "correctProduct", "[Non]"],
      ["correctProduct", "publishRequest", "", [[105, 1920], [105, 1700]]],
      ["publish", "follow"], ["follow", "financeOk"], ["financeOk", "reserve", "[Oui]"],
      ["financeOk", "end", "[Non]"], ["reserve", "end"],
    ],
  },
  {
    code: "AD-05", slug: "parcours_client", title: "Parcours Client et demande de financement",
    lanes: ["Internaute ou Client", "Système Matchia", "Service d'e-mail", "Administrateur Banque"],
    nodes: [
      ["start", "initial", 0, 175, ""],
      ["browse", "action", 0, 255, "Consulter les produits\nde la marketplace"],
      ["compare", "action", 0, 365, "Comparer ou simuler\nsi le module est actif"],
      ["continue", "decision", 1, 475, "Poursuivre vers\nun financement ?"],
      ["publicEnd", "final", 0, 585, ""],
      ["account", "decision", 1, 600, "Compte Client\nactif ?"],
      ["register", "action", 0, 720, "S'inscrire comme Client"],
      ["sendCode", "action", 2, 830, "Envoyer le code\nde vérification"],
      ["enterCode", "action", 0, 940, "Saisir le code reçu"],
      ["codeOk", "decision", 1, 1050, "Code\nvalide ?"],
      ["codeError", "action", 2, 1160, "Refuser ou renvoyer\nun nouveau code"],
      ["auth", "action", 0, 1170, "S'authentifier et sélectionner\nle produit ou la simulation"],
      ["draft", "action", 1, 1290, "Créer le dossier\nà l'état brouillon"],
      ["fill", "action", 0, 1410, "Renseigner les données et\ntéléverser les justificatifs"],
      ["complete", "decision", 1, 1530, "Pièces\ncomplètes ?"],
      ["saveDraft", "action", 0, 1640, "Conserver le brouillon\net compléter le dossier"],
      ["submit", "action", 0, 1760, "Soumettre la demande"],
      ["pending", "action", 1, 1870, "Passer le dossier\nau statut EN ATTENTE"],
      ["review", "action", 3, 1980, "Examiner le dossier"],
      ["decision", "decision", 3, 2085, "Demande\nacceptée ?"],
      ["accepted", "action", 1, 2190, "Enregistrer l'acceptation\net réserver le stock\nsi nécessaire"],
      ["rejected", "action", 3, 2190, "Saisir le motif et\nenregistrer le rejet"],
      ["notify", "action", 2, 2280, "Notifier la décision"],
      ["end", "final", 0, 2300, ""],
    ],
    edges: [
      ["start", "browse"], ["browse", "compare"], ["compare", "continue"],
      ["continue", "publicEnd", "[Non]"], ["continue", "account", "[Oui]"],
      ["account", "auth", "[Oui]"], ["account", "register", "[Non]"],
      ["register", "sendCode"], ["sendCode", "enterCode"], ["enterCode", "codeOk"],
      ["codeOk", "auth", "[Oui]"], ["codeOk", "codeError", "[Non]"],
      ["codeError", "enterCode", "", [[1410, 1160], [1410, 940], [400, 940]]],
      ["auth", "draft"], ["draft", "fill"], ["fill", "complete"],
      ["complete", "submit", "[Oui]"], ["complete", "saveDraft", "[Non]"],
      ["saveDraft", "fill", "", [[105, 1640], [105, 1410]]],
      ["submit", "pending"], ["pending", "review"], ["review", "decision"],
      ["decision", "accepted", "[Oui]"], ["decision", "rejected", "[Non]"],
      ["accepted", "notify"], ["rejected", "notify"], ["notify", "end"],
    ],
  },
];

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function materialize(def) {
  const laneW = (W - 2 * MARGIN) / def.lanes.length;
  const nodes = new Map();
  for (const raw of def.nodes) {
    const [id, type, lane, y, label, offset = 0] = raw;
    const x = MARGIN + laneW * (lane + 0.5) + offset;
    const w = type === "action" ? laneW - 52 : type === "decision" ? 116 : 34;
    const h = type === "action" ? 78 : type === "decision" ? 88 : 34;
    nodes.set(id, { id, type, lane, x, y, w, h, label });
  }
  return { laneW, nodes };
}

function boundary(node, toward) {
  const dx = toward[0] - node.x, dy = toward[1] - node.y;
  if (node.type === "decision") {
    const k = 1 / Math.max(Math.abs(dx) / (node.w / 2), Math.abs(dy) / (node.h / 2));
    return [node.x + dx * k, node.y + dy * k];
  }
  const rx = node.w / 2, ry = node.h / 2;
  const k = 1 / Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry);
  return [node.x + dx * k, node.y + dy * k];
}

function edgePoints(nodes, edge) {
  const source = nodes.get(edge[0]), target = nodes.get(edge[1]);
  const route = edge[3] || [];
  const first = route.length ? route[0] : [target.x, target.y];
  const last = route.length ? route[route.length - 1] : [source.x, source.y];
  return [boundary(source, first), ...route, boundary(target, last)];
}

function pointsAttr(points) { return points.map(([x, y]) => `${x},${y}`).join(" "); }

function textLines(label, x, y, className) {
  const lines = String(label).split("\n");
  const start = y - (lines.length - 1) * 15;
  return `<text x="${x}" y="${start}" text-anchor="middle" class="${className}">${lines.map((line, i) => `<tspan x="${x}" y="${start + i * 30}">${esc(line)}</tspan>`).join("")}</text>`;
}

function svgFor(def) {
  const { laneW, nodes } = materialize(def);
  const laneFont = def.lanes.length >= 4 ? 22 : 28;
  const actionFont = def.lanes.length >= 4 ? 22 : 26;
  const decisionFont = def.lanes.length >= 4 ? 19 : 22;
  const laneSvg = def.lanes.map((name, i) => {
    const x = MARGIN + i * laneW;
    return `<rect x="${x}" y="${BODY_TOP}" width="${laneW}" height="${BODY_BOTTOM - BODY_TOP}" fill="${i % 2 ? "#fbfdfe" : "#ffffff"}" stroke="#9aa9b4" stroke-width="1.4"/><rect x="${x}" y="${BODY_TOP}" width="${laneW}" height="64" fill="#dce6f1" stroke="#9aa9b4" stroke-width="1.4"/><text x="${x + laneW / 2}" y="${BODY_TOP + 40}" text-anchor="middle" class="lane">${esc(name)}</text>`;
  }).join("");
  const nodeSvg = [...nodes.values()].map((n) => {
    if (n.type === "initial") return `<circle cx="${n.x}" cy="${n.y}" r="14" fill="#263333"/>`;
    if (n.type === "final") return `<circle cx="${n.x}" cy="${n.y}" r="17" fill="#fff" stroke="#263333" stroke-width="4"/><circle cx="${n.x}" cy="${n.y}" r="9" fill="#263333"/>`;
    if (n.type === "decision") return `<polygon points="${n.x},${n.y - n.h / 2} ${n.x + n.w / 2},${n.y} ${n.x},${n.y + n.h / 2} ${n.x - n.w / 2},${n.y}" fill="#fff2cc" stroke="#b68a24" stroke-width="2"/>${textLines(n.label, n.x, n.y + 5, "decision")}`;
    const system = n.lane > 0;
    return `<rect x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="18" fill="${system ? "#d7f4ef" : "#dbe9ff"}" stroke="${system ? "#5d7774" : "#7da3d6"}" stroke-width="2"/>${textLines(n.label, n.x, n.y + 5, "action")}`;
  }).join("");
  const edgeSvg = def.edges.map((e, index) => {
    const pts = edgePoints(nodes, e);
    const label = e[2] || "";
    let labelSvg = "";
    if (label) {
      const a = pts[0], b = pts[1] || pts[pts.length - 1];
      const lx = a[0] + (b[0] - a[0]) * 0.52, ly = a[1] + (b[1] - a[1]) * 0.52 - 9;
      labelSvg = `<rect x="${lx - 34}" y="${ly - 17}" width="68" height="23" rx="5" fill="#fff"/><text x="${lx}" y="${ly}" text-anchor="middle" class="guard">${esc(label)}</text>`;
    }
    return `<polyline points="${pointsAttr(pts)}" class="flow" marker-end="url(#arrow)"/>${labelSvg}`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f5b5b"/></marker><style>.title{font:bold 34px Arial;fill:#fff}.lane{font:bold ${laneFont}px Arial;fill:#1f2933}.action{font:${actionFont}px Arial;fill:#1f2933}.decision{font:${decisionFont}px Arial;fill:#1f2933}.guard{font:bold 20px Arial;fill:#6b5315}.flow{fill:none;stroke:#4f5b5b;stroke-width:3;stroke-linejoin:round;stroke-linecap:round}</style></defs><rect width="${W}" height="${H}" fill="#fff"/><rect x="${MARGIN}" y="24" width="${W - 2 * MARGIN}" height="72" rx="8" fill="#1f4e78"/><text x="${W / 2}" y="70" text-anchor="middle" class="title">${esc(def.title)}</text>${laneSvg}${edgeSvg}${nodeSvg}</svg>`;
}

function drawioFragment(def) {
  const { laneW, nodes } = materialize(def);
  const cells = [];
  cells.push(`<mxCell id="frame-${def.code}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9aa9b4;" vertex="1" parent="1"><mxGeometry x="${MARGIN}" y="${BODY_TOP}" width="${W - 2 * MARGIN}" height="${BODY_BOTTOM - BODY_TOP}" as="geometry"/></mxCell>`);
  def.lanes.forEach((name, i) => {
    const x = MARGIN + i * laneW;
    cells.push(`<mxCell id="lane-${i}" value="${esc(name)}" style="swimlane;html=1;startSize=64;horizontal=1;rounded=0;collapsible=0;strokeColor=#9aa9b4;fillColor=#dce6f1;swimlaneFillColor=${i % 2 ? "#fbfdfe" : "#ffffff"};fontFamily=Arial;fontSize=18;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="${BODY_TOP}" width="${laneW}" height="${BODY_BOTTOM - BODY_TOP}" as="geometry"/></mxCell>`);
  });
  for (const n of nodes.values()) {
    let style;
    if (n.type === "initial") style = "ellipse;html=1;aspect=fixed;fillColor=#263333;strokeColor=#263333;";
    else if (n.type === "final") style = "ellipse;html=1;aspect=fixed;fillColor=#ffffff;strokeColor=#263333;strokeWidth=4;shape=endState;";
    else if (n.type === "decision") style = "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#b68a24;fontFamily=Arial;fontSize=15;";
    else style = `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=${n.lane > 0 ? "#d7f4ef" : "#dbe9ff"};strokeColor=${n.lane > 0 ? "#5d7774" : "#7da3d6"};fontFamily=Arial;fontSize=16;`;
    cells.push(`<mxCell id="${n.id}" value="${esc(n.label).replace(/\n/g, "&lt;br&gt;")}" style="${style}" vertex="1" parent="1"><mxGeometry x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`);
  }
  def.edges.forEach((e, i) => {
    const route = e[3] || [];
    const mxPts = route.length ? `<Array as="points">${route.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : "";
    cells.push(`<mxCell id="edge-${i}" value="${esc(e[2] || "")}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=classic;endFill=1;strokeColor=#4f5b5b;strokeWidth=2;fontFamily=Arial;fontSize=13;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${e[0]}" target="${e[1]}"><mxGeometry relative="1" as="geometry">${mxPts}</mxGeometry></mxCell>`);
  });
  return `<diagram id="${def.code}-${def.slug}" name="${esc(def.code + " " + def.title)}"><mxGraphModel dx="${W}" dy="${H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram>`;
}

async function main() {
  const fragments = [];
  for (const def of diagrams) {
    const svg = svgFor(def);
    const base = `${def.code}_${def.slug}`;
    fs.writeFileSync(path.join(OUT, `${base}.svg`), svg, "utf8");
    await sharp(Buffer.from(svg)).resize({ width: 3000 }).png().toFile(path.join(OUT, `${base}.png`));
    const fragment = drawioFragment(def);
    fragments.push(fragment);
    fs.writeFileSync(path.join(OUT, `${base}.drawio`), `<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">${fragment}</mxfile>`, "utf8");
  }
  fs.writeFileSync(path.join(OUT, "Diagrammes_activite_Matchia.drawio"), `<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">${fragments.join("")}</mxfile>`, "utf8");
  console.log(JSON.stringify({ output: OUT, count: diagrams.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
