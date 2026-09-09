"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 1500;
const H = 2380;
const OUT = path.join(__dirname, "diagrammes_activite_modele");
fs.mkdirSync(OUT, { recursive: true });

const C = 510;
const R = 1160;
const AW = 700;
const RW = 600;
const AH = 84;
const DW = 410;
const DH = 120;

const n = (id, type, x, y, label, w, h) => ({
  id,
  type,
  x,
  y,
  label,
  w: w || (type === "decision" ? DW : (type === "start" || type === "final") ? 68 : AW),
  h: h || (type === "decision" ? DH : (type === "start" || type === "final") ? 68 : AH),
});
const e = (from, to, label = "", points = []) => ({ from, to, label, points });

const diagrams = [
  {
    code: "AD-01", slug: "authentification", title: "Authentification et détermination du contexte d'accès",
    nodes: [
      n("start", "start", C, 75, "Début"),
      n("open", "action", C, 175, "Accéder au formulaire de connexion"),
      n("credentials", "action", C, 300, "Saisir l'adresse e-mail et le mot de passe"),
      n("verify", "action", C, 425, "Vérifier les identifiants"),
      n("valid", "decision", C, 555, "Identifiants\nvalides ?"),
      n("credentialError", "correction", R, 555, "Afficher l'erreur et corriger les identifiants", RW),
      n("account", "action", C, 700, "Vérifier l'état du compte"),
      n("active", "decision", C, 830, "Compte\nactif ?"),
      n("inactive", "correction", R, 830, "Refuser l'accès au compte inactif", RW),
      n("inactiveEnd", "final", R, 960, "Fin"),
      n("role", "action", C, 970, "Charger le rôle et contrôler les autorisations"),
      n("tenantNeeded", "decision", C, 1100, "Contexte bancaire\nrequis ?"),
      n("tenant", "action", C, 1240, "Déterminer la banque ou la marketplace de rattachement"),
      n("tenantAllowed", "decision", C, 1370, "Tenant\nautorisé ?"),
      n("tenantDenied", "correction", R, 1370, "Refuser l'accès hors du périmètre autorisé", RW),
      n("tenantEnd", "final", R, 1500, "Fin"),
      n("session", "action", C, 1520, "Créer la session authentifiée avec le contexte d'accès"),
      n("redirect", "action", C, 1650, "Rediriger vers l'espace correspondant au rôle"),
      n("end", "final", C, 1790, "Fin"),
    ],
    edges: [
      e("start", "open"), e("open", "credentials"), e("credentials", "verify"), e("verify", "valid"),
      e("valid", "account", "Oui"), e("valid", "credentialError", "Non"),
      e("credentialError", "credentials", "", [[1420, 555], [1420, 300]]),
      e("account", "active"), e("active", "role", "Oui"), e("active", "inactive", "Non"), e("inactive", "inactiveEnd"),
      e("role", "tenantNeeded"), e("tenantNeeded", "tenant", "Oui"),
      e("tenantNeeded", "session", "Non", [[850, 1100], [850, 1520]]),
      e("tenant", "tenantAllowed"), e("tenantAllowed", "session", "Oui"), e("tenantAllowed", "tenantDenied", "Non"),
      e("tenantDenied", "tenantEnd"), e("session", "redirect"), e("redirect", "end"),
    ],
  },
  {
    code: "AD-02", slug: "creation_demande_marketplace", title: "Création d'une demande de marketplace bancaire",
    nodes: [
      n("start", "start", C, 60, "Début"),
      n("open", "action", C, 150, "Accéder au formulaire de demande"),
      n("bank", "action", C, 265, "Saisir les informations de la banque"),
      n("bankValid", "decision", C, 380, "Informations\nvalides ?"),
      n("bankCorrection", "correction", R, 380, "Corriger les informations de la banque", RW),
      n("admin", "action", C, 510, "Saisir les informations du futur administrateur"),
      n("adminValid", "decision", C, 625, "Informations\nvalides ?"),
      n("adminCorrection", "correction", R, 625, "Corriger les informations de l'administrateur", RW),
      n("code", "action", C, 755, "Envoyer et saisir le code de vérification e-mail"),
      n("emailValid", "decision", C, 870, "E-mail\nvérifié ?"),
      n("emailCorrection", "correction", R, 870, "Renvoyer le code ou corriger l'adresse e-mail", RW),
      n("branding", "action", C, 1000, "Configurer l'identité de la marketplace"),
      n("selection", "action", C, 1120, "Sélectionner les stores, les modules et l'offre"),
      n("selectionValid", "decision", C, 1235, "Sélections\nvalides ?"),
      n("selectionCorrection", "correction", R, 1235, "Modifier les stores, les modules ou l'offre", RW),
      n("summary", "action", C, 1365, "Afficher le récapitulatif de la demande"),
      n("confirm", "decision", C, 1480, "Demande\nconfirmée ?"),
      n("configurationCorrection", "correction", R, 1480, "Modifier la configuration", RW),
      n("submit", "action", C, 1610, "Soumettre et enregistrer la demande"),
      n("notify", "action", C, 1730, "Notifier le Back-office SaaS et le demandeur"),
      n("end", "final", C, 1870, "Fin"),
    ],
    edges: [
      e("start", "open"), e("open", "bank"), e("bank", "bankValid"),
      e("bankValid", "admin", "Oui"), e("bankValid", "bankCorrection", "Non"),
      e("bankCorrection", "bank", "", [[1420, 380], [1420, 265]]),
      e("admin", "adminValid"), e("adminValid", "code", "Oui"), e("adminValid", "adminCorrection", "Non"),
      e("adminCorrection", "admin", "", [[1420, 625], [1420, 510]]),
      e("code", "emailValid"), e("emailValid", "branding", "Oui"), e("emailValid", "emailCorrection", "Non"),
      e("emailCorrection", "code", "", [[1420, 870], [1420, 755]]),
      e("branding", "selection"), e("selection", "selectionValid"),
      e("selectionValid", "summary", "Oui"), e("selectionValid", "selectionCorrection", "Non"),
      e("selectionCorrection", "selection", "", [[1420, 1235], [1420, 1120]]),
      e("summary", "confirm"), e("confirm", "submit", "Oui"), e("confirm", "configurationCorrection", "Non"),
      e("configurationCorrection", "branding", "", [[1450, 1480], [1450, 1000]]),
      e("submit", "notify"), e("notify", "end"),
    ],
  },
  {
    code: "AD-03", slug: "traitement_demande_marketplace", title: "Traitement d'une demande de marketplace et paiement Stripe",
    nodes: [
      n("start", "start", C, 55, "Début"),
      n("auth", "action", C, 145, "S'authentifier en tant qu'Administrateur SaaS"),
      n("select", "action", C, 255, "Consulter et sélectionner une demande"),
      n("pending", "decision", C, 365, "Demande en\nattente ?"),
      n("statusError", "correction", R, 365, "Signaler que la demande ne peut plus être traitée", RW),
      n("statusEnd", "final", R, 485, "Fin"),
      n("review", "action", C, 495, "Vérifier les informations, les documents et la configuration"),
      n("admissible", "decision", C, 610, "Demande\nadmissible ?"),
      n("reject", "correction", R, 610, "Saisir le motif, rejeter et notifier la banque", RW),
      n("rejectEnd", "final", R, 735, "Fin"),
      n("approve", "action", C, 740, "Approuver la demande"),
      n("checkout", "action", C, 855, "Créer une session de paiement sécurisée Stripe"),
      n("sendLink", "action", C, 970, "Envoyer le lien et les instructions de paiement"),
      n("pay", "action", C, 1085, "Le futur Administrateur Banque effectue le paiement sur Stripe"),
      n("paid", "decision", C, 1200, "Paiement Stripe\nconfirmé ?"),
      n("paymentError", "correction", R, 1200, "Signaler l'échec ou l'expiration et proposer un nouvel essai", RW),
      n("webhook", "action", C, 1330, "Recevoir et vérifier le webhook Stripe"),
      n("activate", "action", C, 1450, "Activer la banque, la marketplace et l'abonnement"),
      n("account", "action", C, 1570, "Activer le compte Administrateur Banque"),
      n("credentials", "action", C, 1690, "Envoyer les identifiants d'accès au Back-office Banque"),
      n("end", "final", C, 1830, "Fin"),
    ],
    edges: [
      e("start", "auth"), e("auth", "select"), e("select", "pending"),
      e("pending", "review", "Oui"), e("pending", "statusError", "Non"), e("statusError", "statusEnd"),
      e("review", "admissible"), e("admissible", "approve", "Oui"), e("admissible", "reject", "Non"), e("reject", "rejectEnd"),
      e("approve", "checkout"), e("checkout", "sendLink"), e("sendLink", "pay"), e("pay", "paid"),
      e("paid", "webhook", "Oui"), e("paid", "paymentError", "Non"),
      e("paymentError", "checkout", "", [[1450, 1200], [1450, 855]]),
      e("webhook", "activate"), e("activate", "account"), e("account", "credentials"), e("credentials", "end"),
    ],
  },
  {
    code: "AD-04", slug: "parcours_concessionnaire", title: "Parcours métier du Concessionnaire",
    nodes: [
      n("start", "start", C, 55, "Début"),
      n("register", "action", C, 145, "Déposer la demande d'inscription Concessionnaire"),
      n("complete", "decision", C, 260, "Dossier\ncomplet ?"),
      n("correct", "correction", R, 260, "Compléter ou corriger le dossier", RW),
      n("review", "action", C, 390, "L'Administrateur SaaS examine la demande"),
      n("approved", "decision", C, 505, "Demande\napprouvée ?"),
      n("reject", "correction", R, 505, "Enregistrer le motif et notifier le rejet", RW),
      n("rejectEnd", "final", R, 625, "Fin"),
      n("account", "action", C, 635, "Créer le compte et envoyer les identifiants"),
      n("catalog", "action", C, 750, "S'authentifier et gérer le catalogue et le stock"),
      n("partnership", "action", C, 865, "Soumettre une demande de partenariat à une banque"),
      n("partnershipOk", "decision", C, 980, "Partenariat\naccepté ?"),
      n("partnershipReject", "correction", R, 980, "Notifier le rejet et permettre une nouvelle demande", RW),
      n("contract", "action", C, 1110, "Accepter le contrat et activer le partenariat"),
      n("product", "action", C, 1225, "Soumettre un produit à la publication"),
      n("publicationOk", "decision", C, 1340, "Publication\nvalidée ?"),
      n("productCorrection", "correction", R, 1340, "Corriger les informations du produit", RW),
      n("publish", "action", C, 1470, "Publier le produit dans la marketplace autorisée"),
      n("follow", "action", C, 1585, "Suivre les demandes de financement associées"),
      n("financeOk", "decision", C, 1700, "Financement\naccepté ?"),
      n("noReservation", "correction", R, 1700, "Clôturer le suivi sans réservation de stock", RW),
      n("reserve", "action", C, 1830, "Réserver le stock du produit concerné"),
      n("end", "final", C, 1970, "Fin"),
      n("sideEnd", "final", R, 1830, "Fin"),
    ],
    edges: [
      e("start", "register"), e("register", "complete"), e("complete", "review", "Oui"), e("complete", "correct", "Non"),
      e("correct", "register", "", [[1420, 260], [1420, 145]]),
      e("review", "approved"), e("approved", "account", "Oui"), e("approved", "reject", "Non"), e("reject", "rejectEnd"),
      e("account", "catalog"), e("catalog", "partnership"), e("partnership", "partnershipOk"),
      e("partnershipOk", "contract", "Oui"), e("partnershipOk", "partnershipReject", "Non"),
      e("partnershipReject", "partnership", "", [[1450, 980], [1450, 865]]),
      e("contract", "product"), e("product", "publicationOk"), e("publicationOk", "publish", "Oui"),
      e("publicationOk", "productCorrection", "Non"), e("productCorrection", "product", "", [[1450, 1340], [1450, 1225]]),
      e("publish", "follow"), e("follow", "financeOk"), e("financeOk", "reserve", "Oui"),
      e("financeOk", "noReservation", "Non"), e("noReservation", "sideEnd"), e("reserve", "end"),
    ],
  },
  {
    code: "AD-05", slug: "parcours_client", title: "Parcours Client et demande de financement",
    nodes: [
      n("start", "start", C, 55, "Début"),
      n("browse", "action", C, 145, "Consulter les produits de la marketplace"),
      n("compare", "action", C, 255, "Comparer les offres et effectuer une simulation"),
      n("continue", "decision", C, 365, "Poursuivre vers\nun financement ?"),
      n("publicEnd", "final", R, 365, "Fin"),
      n("account", "decision", C, 495, "Compte Client\nactif ?"),
      n("register", "action", C, 625, "S'inscrire comme Client"),
      n("code", "action", C, 740, "Envoyer et saisir le code de vérification e-mail"),
      n("verified", "decision", C, 855, "E-mail\nvérifié ?"),
      n("codeCorrection", "correction", R, 855, "Renvoyer le code ou corriger l'adresse e-mail", RW),
      n("auth", "action", C, 985, "S'authentifier et sélectionner le produit ou la simulation"),
      n("draft", "action", C, 1100, "Créer le dossier de financement à l'état brouillon"),
      n("fill", "action", C, 1215, "Renseigner les données et téléverser les justificatifs"),
      n("complete", "decision", C, 1330, "Dossier\ncomplet ?"),
      n("fileCorrection", "correction", R, 1330, "Compléter ou corriger le dossier", RW),
      n("submit", "action", C, 1460, "Soumettre la demande de financement"),
      n("review", "action", C, 1575, "L'Administrateur Banque examine la demande"),
      n("accepted", "decision", C, 1690, "Demande\nacceptée ?"),
      n("reject", "correction", R, 1690, "Saisir le motif et enregistrer le rejet", RW),
      n("accept", "action", C, 1820, "Enregistrer l'acceptation et réserver le stock si nécessaire"),
      n("notify", "action", C, 1935, "Notifier le Client de la décision"),
      n("end", "final", C, 2070, "Fin"),
      n("rejectNotify", "action", R, 1820, "Notifier le Client du rejet", RW),
      n("rejectEnd", "final", R, 1940, "Fin"),
    ],
    edges: [
      e("start", "browse"), e("browse", "compare"), e("compare", "continue"),
      e("continue", "account", "Oui"), e("continue", "publicEnd", "Non"),
      e("account", "auth", "Oui", [[800, 495], [800, 985]]), e("account", "register", "Non"),
      e("register", "code"), e("code", "verified"), e("verified", "auth", "Oui"),
      e("verified", "codeCorrection", "Non"), e("codeCorrection", "code", "", [[1420, 855], [1420, 740]]),
      e("auth", "draft"), e("draft", "fill"), e("fill", "complete"), e("complete", "submit", "Oui"),
      e("complete", "fileCorrection", "Non"), e("fileCorrection", "fill", "", [[1420, 1330], [1420, 1215]]),
      e("submit", "review"), e("review", "accepted"), e("accepted", "accept", "Oui"), e("accepted", "reject", "Non"),
      e("accept", "notify"), e("notify", "end"), e("reject", "rejectNotify"), e("rejectNotify", "rejectEnd"),
    ],
  },
];

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapLabel(label, maxChars) {
  const wrapped = [];
  for (const explicitLine of String(label).split("\n")) {
    const words = explicitLine.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && candidate.length > maxChars) {
        wrapped.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) wrapped.push(line);
  }
  return wrapped;
}

function lines(label, x, y, className, maxChars) {
  const parts = wrapLabel(label, maxChars);
  const gap = className === "decision" ? 29 : 28;
  const start = y - (parts.length - 1) * gap / 2;
  return `<text x="${x}" y="${start}" text-anchor="middle" class="${className}">${parts.map((part, i) => `<tspan x="${x}" y="${start + i * gap}">${esc(part)}</tspan>`).join("")}</text>`;
}

function boundary(node, toward) {
  const dx = toward[0] - node.x;
  const dy = toward[1] - node.y;
  if (node.type === "decision") {
    const scale = 1 / Math.max(Math.abs(dx) / (node.w / 2), Math.abs(dy) / (node.h / 2));
    return [node.x + dx * scale, node.y + dy * scale];
  }
  if (node.type === "start" || node.type === "final") {
    const radius = node.type === "start" ? 34 : 27;
    const length = Math.max(1, Math.hypot(dx, dy));
    return [node.x + (dx / length) * radius, node.y + (dy / length) * radius];
  }
  const scale = 1 / Math.max(Math.abs(dx) / (node.w / 2), Math.abs(dy) / (node.h / 2));
  return [node.x + dx * scale, node.y + dy * scale];
}

function edgePoints(nodes, edge) {
  const source = nodes.get(edge.from);
  const target = nodes.get(edge.to);
  const first = edge.points.length ? edge.points[0] : [target.x, target.y];
  const last = edge.points.length ? edge.points[edge.points.length - 1] : [source.x, source.y];
  return [boundary(source, first), ...edge.points, boundary(target, last)];
}

function canvasHeight(def) {
  const nodeBottoms = def.nodes.map((node) => node.y + Math.max(node.h / 2, 45));
  const routeYs = def.edges.flatMap((edge) => edge.points.map((point) => point[1]));
  return Math.min(H, Math.ceil(Math.max(...nodeBottoms, ...routeYs) + 110));
}

function svgFor(def) {
  const viewH = canvasHeight(def);
  const nodes = new Map(def.nodes.map((node) => [node.id, node]));
  const edgeSvg = def.edges.map((edge) => {
    const points = edgePoints(nodes, edge);
    let label = "";
    if (edge.label) {
      const a = points[0];
      const b = points[1] || points[points.length - 1];
      const x = a[0] + (b[0] - a[0]) * 0.55;
      const y = a[1] + (b[1] - a[1]) * 0.55 - 10;
      label = `<rect x="${x - 34}" y="${y - 21}" width="68" height="26" rx="5" fill="#ffffff"/><text x="${x}" y="${y}" text-anchor="middle" class="guard">${esc(edge.label)}</text>`;
    }
    return `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" class="flow" marker-end="url(#arrow)"/>${label}`;
  }).join("");

  const nodeSvg = def.nodes.map((node) => {
    if (node.type === "start") {
      return `<circle cx="${node.x}" cy="${node.y}" r="34" fill="#e8f3ec" stroke="#17365d" stroke-width="4"/>` +
        `<text x="${node.x + 58}" y="${node.y + 10}" class="terminal-label">Début</text>`;
    }
    if (node.type === "final") {
      return `<circle cx="${node.x}" cy="${node.y}" r="27" fill="#ffffff" stroke="#17365d" stroke-width="4"/><circle cx="${node.x}" cy="${node.y}" r="15" fill="#17365d"/>` +
        `<text x="${node.x + 48}" y="${node.y + 10}" class="terminal-label">Fin</text>`;
    }
    if (node.type === "decision") {
      return `<polygon points="${node.x},${node.y - node.h / 2} ${node.x + node.w / 2},${node.y} ${node.x},${node.y + node.h / 2} ${node.x - node.w / 2},${node.y}" fill="#fff2cc" stroke="#2f75b5" stroke-width="4"/>${lines(node.label, node.x, node.y + 8, "decision", 20)}`;
    }
    const fill = node.type === "correction" ? "#fde9e7" : "#f2f6fb";
    const maxChars = Math.max(26, Math.floor(node.w / 16.5));
    return `<rect x="${node.x - node.w / 2}" y="${node.y - node.h / 2}" width="${node.w}" height="${node.h}" rx="22" fill="${fill}" stroke="#2f75b5" stroke-width="4"/>${lines(node.label, node.x, node.y + 9, "action", maxChars)}`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${viewH}" viewBox="0 0 ${W} ${viewH}"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#2f75b5"/></marker><style>.action{font:bold 29px Arial;fill:#17365d}.decision{font:bold 27px Arial;fill:#17365d}.guard{font:bold 24px Arial;fill:#52697f}.terminal-label{font:bold 30px Arial;fill:#17365d}.flow{fill:none;stroke:#2f75b5;stroke-width:4;stroke-linejoin:round;stroke-linecap:round}</style></defs><rect width="${W}" height="${viewH}" fill="#ffffff"/>${edgeSvg}${nodeSvg}</svg>`;
}

function drawioFragment(def) {
  const viewH = canvasHeight(def);
  const cells = [];
  for (const node of def.nodes) {
    let style;
    if (node.type === "start") style = "ellipse;html=1;aspect=fixed;fillColor=#e8f3ec;strokeColor=#17365d;strokeWidth=3;fontFamily=Arial;fontSize=18;fontStyle=1;";
    else if (node.type === "final") style = "ellipse;html=1;aspect=fixed;shape=endState;fillColor=#ffffff;strokeColor=#17365d;strokeWidth=3;fontFamily=Arial;fontSize=18;fontStyle=1;";
    else if (node.type === "decision") style = "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#2f75b5;strokeWidth=3;fontFamily=Arial;fontSize=18;fontStyle=1;fontColor=#17365d;";
    else style = `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=${node.type === "correction" ? "#fde9e7" : "#f2f6fb"};strokeColor=#2f75b5;strokeWidth=3;fontFamily=Arial;fontSize=18;fontStyle=1;fontColor=#17365d;`;
    const value = node.type === "start" ? "Début" : node.type === "final" ? "Fin" : node.label;
    cells.push(`<mxCell id="${node.id}" value="${esc(value).replace(/\n/g, "&lt;br&gt;")}" style="${style}" vertex="1" parent="1"><mxGeometry x="${node.x - node.w / 2}" y="${node.y - node.h / 2}" width="${node.w}" height="${node.h}" as="geometry"/></mxCell>`);
  }
  def.edges.forEach((edge, index) => {
    const route = edge.points.length ? `<Array as="points">${edge.points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : "";
    cells.push(`<mxCell id="edge-${index}" value="${esc(edge.label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=classic;endFill=1;strokeColor=#2f75b5;strokeWidth=3;fontFamily=Arial;fontSize=16;fontStyle=1;fontColor=#52697f;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${edge.from}" target="${edge.to}"><mxGeometry relative="1" as="geometry">${route}</mxGeometry></mxCell>`);
  });
  return `<diagram id="${def.code}-${def.slug}" name="${esc(def.code + " " + def.title)}"><mxGraphModel dx="${W}" dy="${viewH}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${viewH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram>`;
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
  fs.writeFileSync(path.join(OUT, "Diagrammes_activite_Matchia_modele.drawio"), `<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">${fragments.join("")}</mxfile>`, "utf8");
  console.log(JSON.stringify({ output: OUT, count: diagrams.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
