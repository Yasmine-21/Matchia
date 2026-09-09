"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "diagramme_usecase_global_matchia");
fs.mkdirSync(outDir, { recursive: true });

const W = 3600;
const H = 2920;
const boundary = { x: 300, y: 35, w: 2900, h: 2810 };

const actors = [
  { id: "a_requester", label: "Demandeur banque", x: 35, y: 140 },
  { id: "a_saas", label: "Administrateur SaaS", x: 35, y: 600 },
  { id: "a_bank", label: "Administrateur Banque", x: 35, y: 1100 },
  { id: "a_dealer", label: "Concessionnaire", x: 35, y: 1570 },
  { id: "a_client", label: "Client", x: 35, y: 2040 },
  { id: "a_visitor", label: "Internaute", x: 35, y: 2420 },
];

const externalActors = [
  { id: "a_email", label: "Service d'e-mail", stereotype: "système externe", x: 3370, y: 70 },
  { id: "a_stripe", label: "Stripe", stereotype: "système externe", x: 3370, y: 170 },
  { id: "a_gemini", label: "Gemini", stereotype: "système externe", x: 3370, y: 710 },
];

const lanes = [
  { y: 80, h: 320, title: "Onboarding de la banque", sprint: "S2–S4" },
  { y: 420, h: 500, title: "Administration SaaS", sprint: "S1–S4 · S6 · S10" },
  { y: 940, h: 500, title: "Administration de la banque", sprint: "S1 · S4–S5 · S7–S9" },
  { y: 1460, h: 430, title: "Espace concessionnaire", sprint: "S1 · S6–S9" },
  { y: 1910, h: 430, title: "Espace client", sprint: "S1 · S5 · S9" },
  { y: 2360, h: 300, title: "Marketplace publique", sprint: "S5 · S10" },
];

const roots = [
  { id: "r_request", label: "Demander la création\nd'une marketplace bancaire", sprint: "S2–S4", x: 400, y: 170, w: 430, h: 96 },
  { id: "r_saas", label: "Accéder au Back-office SaaS", sprint: "S1", x: 400, y: 620, w: 430, h: 96, secure: true },
  { id: "r_bank", label: "Accéder au Back-office Banque", sprint: "S1", x: 400, y: 1130, w: 430, h: 96, secure: true },
  { id: "r_dealer_register", label: "S'inscrire comme concessionnaire", sprint: "S6", x: 400, y: 1490, w: 430, h: 90 },
  { id: "r_dealer", label: "Accéder à l'espace concessionnaire", sprint: "S1", x: 400, y: 1660, w: 430, h: 96, secure: true },
  { id: "r_client_register", label: "S'inscrire et activer\nson compte client", sprint: "S9", x: 400, y: 1940, w: 430, h: 90 },
  { id: "r_client", label: "Accéder à l'espace client", sprint: "S1", x: 400, y: 2110, w: 430, h: 96, secure: true },
  { id: "r_public", label: "Utiliser la marketplace publique", sprint: "S5–S10", x: 400, y: 2450, w: 430, h: 96 },
];

const children = [
  // Demande de marketplace bancaire — S2 à S4
  { id: "u_req_identity", parent: "r_request", label: "Renseigner la banque et le futur\nAdministrateur Banque, puis vérifier l'e-mail", sprint: "S2", x: 1050, y: 105 },
  { id: "u_req_config", parent: "r_request", label: "Configurer le slug, l'identité visuelle,\nles stores, les modules et l'offre", sprint: "S2", x: 1050, y: 210 },
  { id: "u_req_submit", parent: "r_request", label: "Vérifier le récapitulatif, soumettre la demande\net recevoir les notifications de traitement", sprint: "S2–S4", x: 1050, y: 315 },
  { id: "u_req_pay", parent: "r_request", label: "Payer et activer la banque, la marketplace,\nl'abonnement et le compte administrateur", sprint: "S4", x: 1850, y: 210 },

  // Administrateur SaaS
  { id: "u_saas_dashboard", parent: "r_saas", label: "Consulter le tableau de bord global\net les notifications", sprint: "S3", x: 1050, y: 520 },
  { id: "u_saas_bank_requests", parent: "r_saas", label: "Consulter et traiter les demandes d'adhésion :\napprouver, rejeter et affecter le Back-office", sprint: "S2–S4", x: 1050, y: 600 },
  { id: "u_saas_banks", parent: "r_saas", label: "Gérer les banques, les marketplaces,\nleurs contenus et la configuration générale", sprint: "S3", x: 1050, y: 680 },
  { id: "u_saas_catalog", parent: "r_saas", label: "Gérer les stores, les modules\net les associations store-module", sprint: "S3", x: 1050, y: 760 },
  { id: "u_saas_offers", parent: "r_saas", label: "Gérer les offres, les abonnements,\nles paiements et l'activation des services", sprint: "S3–S4", x: 1050, y: 840 },
  { id: "u_saas_dealers", parent: "r_saas", label: "Traiter les demandes d'inscription\net gérer les comptes concessionnaires", sprint: "S6", x: 1050, y: 920 },
  { id: "u_saas_ai", parent: "r_saas", label: "Interroger les informations autorisées\navec l'assistant IA sécurisé", sprint: "S10", x: 1050, y: 1000 },
  { id: "u_saas_audit", parent: "r_saas", label: "Consulter les logs et l'historique d'audit\npour assurer la traçabilité", sprint: "S3", x: 1050, y: 1080 },

  // Administrateur Banque
  { id: "u_bank_dashboard", parent: "r_bank", label: "Consulter le tableau de bord\net gérer les notifications", sprint: "S5", x: 1050, y: 1260 },
  { id: "u_bank_users", parent: "r_bank", label: "Gérer les clients et les utilisateurs\nde la marketplace", sprint: "S5", x: 1050, y: 1340 },
  { id: "u_bank_modules", parent: "r_bank", label: "Gérer les stores, les modules activés\net les paramètres du simulateur", sprint: "S5", x: 1050, y: 1420 },
  { id: "u_bank_brand", parent: "r_bank", label: "Personnaliser la marketplace et gérer\nles contenus ainsi que les produits", sprint: "S5–S8", x: 1050, y: 1500 },
  { id: "u_bank_subscription", parent: "r_bank", label: "Gérer l'abonnement, son renouvellement\net l'ajout de services", sprint: "S4–S5", x: 1050, y: 1580 },
  { id: "u_bank_partners", parent: "r_bank", label: "Gérer les concessionnaires, partenariats,\ncontrats et validations de publications", sprint: "S7–S8", x: 1050, y: 1660 },
  { id: "u_bank_financing", parent: "r_bank", label: "Consulter et traiter les demandes de financement\net les documents associés", sprint: "S9", x: 1050, y: 1740 },

  // Concessionnaire
  { id: "u_dealer_register", parent: "r_dealer_register", label: "Renseigner les informations, choisir le store,\ndéposer les justificatifs et attendre la validation", sprint: "S6", x: 1050, y: 1900 },
  { id: "u_dealer_home", parent: "r_dealer", label: "Gérer son profil, consulter le tableau de bord\net recevoir les notifications", sprint: "S1 · S6", x: 1050, y: 1990 },
  { id: "u_dealer_products", parent: "r_dealer", label: "Gérer les produits et leurs stocks\ndans un catalogue centralisé", sprint: "S8", x: 1050, y: 2070 },
  { id: "u_dealer_publications", parent: "r_dealer", label: "Gérer les publications de produits\nauprès des banques partenaires", sprint: "S8", x: 1050, y: 2150 },
  { id: "u_dealer_partners", parent: "r_dealer", label: "Gérer demandes, invitations, partenariats\net contrats avec les banques", sprint: "S7", x: 1050, y: 2230 },
  { id: "u_dealer_financing", parent: "r_dealer", label: "Suivre les demandes de financement\nassociées à ses produits", sprint: "S8–S9", x: 1050, y: 2310 },

  // Client
  { id: "u_client_register", parent: "r_client_register", label: "Créer le compte, vérifier l'adresse e-mail\net l'activer dans le tenant de la banque", sprint: "S9", x: 1050, y: 2440 },
  { id: "u_client_profile", parent: "r_client", label: "Gérer son profil et recevoir\nles notifications", sprint: "S1 · S9", x: 1050, y: 2530 },
  { id: "u_client_browse", parent: "r_client", label: "Consulter les produits\net leurs informations détaillées", sprint: "S5 · S9", x: 1050, y: 2610 },
  { id: "u_client_compare", parent: "r_client", label: "Comparer les produits et effectuer\nune simulation de financement", sprint: "S5 · S9", x: 1050, y: 2690 },
  { id: "u_client_submit", parent: "r_client", label: "Créer, compléter et soumettre\nune demande de financement", sprint: "S9", x: 1050, y: 2770 },
  { id: "u_client_docs", parent: "r_client", label: "Gérer les documents justificatifs\net suivre l'état des demandes", sprint: "S9", x: 1050, y: 2850 },

  // Internaute
  { id: "u_public_browse", parent: "r_public", label: "Accéder aux marketplaces et aux stores,\npuis consulter les produits et leurs détails", sprint: "S5", x: 1050, y: 2980 },
  { id: "u_public_compare", parent: "r_public", label: "Comparer plusieurs produits\nsi le module est actif", sprint: "S5", x: 1050, y: 3060 },
  { id: "u_public_simulate", parent: "r_public", label: "Utiliser le simulateur de financement\nsi le module est disponible", sprint: "S5", x: 1050, y: 3140 },
  { id: "u_public_chatbot", parent: "r_public", label: "Utiliser le chatbot public\norienté par les règles métier", sprint: "S10", x: 1050, y: 3220 },
];

const childPositions = {
  u_req_config: [1050, 100], u_req_submit: [1050, 200], u_req_identity: [1850, 100], u_req_pay: [1850, 200],
  u_saas_dashboard: [1050, 470], u_saas_bank_requests: [1050, 560], u_saas_banks: [1050, 650], u_saas_catalog: [1050, 740],
  u_saas_offers: [1850, 470], u_saas_dealers: [1850, 560], u_saas_audit: [1850, 650], u_saas_ai: [1850, 740],
  u_bank_dashboard: [1050, 990], u_bank_users: [1050, 1080], u_bank_modules: [1050, 1170], u_bank_brand: [1050, 1260],
  u_bank_subscription: [1850, 990], u_bank_partners: [1850, 1080], u_bank_financing: [1850, 1170],
  u_dealer_register: [1050, 1490], u_dealer_home: [1050, 1590], u_dealer_products: [1050, 1680], u_dealer_publications: [1050, 1770],
  u_dealer_partners: [1850, 1590], u_dealer_financing: [1850, 1680],
  u_client_register: [1050, 1940], u_client_profile: [1050, 2040], u_client_browse: [1050, 2130], u_client_compare: [1050, 2220],
  u_client_submit: [1850, 2040], u_client_docs: [1850, 2130],
  u_public_browse: [1050, 2400], u_public_compare: [1050, 2490], u_public_simulate: [1850, 2400], u_public_chatbot: [1850, 2490],
};
for (const u of children) [u.x, u.y] = childPositions[u.id];

const AUTH = { id: "u_auth", label: "S'authentifier et gérer son profil", sprint: "S1", x: 2700, y: 1515, w: 420, h: 96, auth: true };
const usecases = [...roots, ...children.map((u) => ({ ...u, w: u.w || 650, h: u.h || 72 })), AUTH];

const associations = [
  { from: "a_requester", to: "r_request" },
  { from: "a_saas", to: "r_saas" },
  { from: "a_bank", to: "r_bank" },
  { from: "a_dealer", to: "r_dealer_register" },
  { from: "a_dealer", to: "r_dealer" },
  { from: "a_client", to: "r_client_register" },
  { from: "a_client", to: "r_client" },
  { from: "a_visitor", to: "r_public" },
  { from: "a_email", to: "u_req_identity" },
  { from: "a_stripe", to: "u_req_pay" },
  { from: "a_gemini", to: "u_saas_ai" },
];

const includeEdges = children.map((u) => ({ from: u.parent, to: u.id, type: "include" }));
includeEdges.push(
  { from: "r_saas", to: "u_auth", type: "include", authPathY: 440, corridorX: 2540 },
  { from: "r_bank", to: "u_auth", type: "include", authPathY: 960, corridorX: 2580 },
  { from: "r_dealer", to: "u_auth", type: "include", authPathY: 1480, corridorX: 2620 },
  { from: "r_client", to: "u_auth", type: "include", authPathY: 1930, corridorX: 2660 },
);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const allNodes = [...actors, ...externalActors, ...usecases];
const byId = new Map(allNodes.map((n) => [n.id, n]));

function center(n) { return [n.x + n.w / 2, n.y + n.h / 2]; }

function ellipsePoint(u, toward) {
  const [cx, cy] = center(u);
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  const rx = u.w / 2;
  const ry = u.h / 2;
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}

function actorAnchor(a) {
  return a.x > W / 2 ? [a.x + 5, a.y + 66] : [a.x + 145, a.y + 66];
}

function pointsForInclude(edge) {
  const from = byId.get(edge.from);
  const to = byId.get(edge.to);
  if (edge.to === "u_auth") {
    const corridorX = edge.corridorX;
    const guides = [[900, edge.authPathY], [corridorX, edge.authPathY], [corridorX, center(to)[1]]];
    return [ellipsePoint(from, guides[0]), ...guides, ellipsePoint(to, guides[guides.length - 1])];
  }
  const parent = from;
  const child = to;
  const isSecondColumn = child.x > 1500;
  const corridorX = isSecondColumn ? 1790 : 930;
  const lane = lanes.find((l) => child.y >= l.y && child.y < l.y + l.h);
  const guides = isSecondColumn
    ? [[900, center(parent)[1]], [900, lane.y + 12], [corridorX, lane.y + 12], [corridorX, center(child)[1]]]
    : [[corridorX, center(parent)[1]], [corridorX, center(child)[1]]];
  return [ellipsePoint(parent, guides[0]), ...guides, ellipsePoint(child, guides[guides.length - 1])];
}

function polyline(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

function mxPoints(points) {
  if (!points?.length) return "";
  return `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>`;
}

function htmlLabel(u) {
  const lines = esc(u.label).replace(/\n/g, "&lt;br&gt;");
  return `&lt;div&gt;&lt;b&gt;&lt;font color=&quot;#0b2d63&quot;&gt;[${esc(u.sprint)}]&lt;/font&gt;&lt;/b&gt;&lt;br&gt;&lt;b&gt;&lt;i&gt;${lines}&lt;/i&gt;&lt;/b&gt;&lt;/div&gt;`;
}

function drawioXml() {
  const cells = [];
  cells.push(`<mxCell id="boundary" value="Plateforme SaaS Matchia — Diagramme global complet avec correspondance des sprints" style="swimlane;html=1;rounded=0;startSize=42;horizontal=1;fillColor=#ffffff;swimlaneFillColor=#ffffff;strokeColor=#9e9e9e;strokeWidth=1.5;fontFamily=Arial;fontSize=19;fontStyle=1;align=left;spacingLeft=14;" vertex="1" parent="1"><mxGeometry x="${boundary.x}" y="${boundary.y}" width="${boundary.w}" height="${boundary.h}" as="geometry"/></mxCell>`);

  lanes.forEach((lane, i) => {
    cells.push(`<mxCell id="lane_${i}" value="${esc(lane.title)}  [${esc(lane.sprint)}]" style="text;html=1;strokeColor=none;fillColor=none;align=right;verticalAlign=top;fontFamily=Arial;fontSize=14;fontStyle=1;fontColor=#6b7280;" vertex="1" parent="1"><mxGeometry x="2700" y="${lane.y + 8}" width="450" height="28" as="geometry"/></mxCell>`);
    if (i > 0) cells.push(`<mxCell id="sep_${i}" style="edgeStyle=none;html=1;endArrow=none;dashed=1;dashPattern=4 4;strokeColor=#d7d7d7;strokeWidth=1;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="320" y="${lane.y - 10}" as="sourcePoint"/><mxPoint x="3180" y="${lane.y - 10}" as="targetPoint"/></mxGeometry></mxCell>`);
  });

  for (const a of [...actors, ...externalActors]) {
    const extra = a.stereotype ? `&lt;div&gt;&lt;span style=&quot;font-size:11px;color:#666666&quot;&gt;«${esc(a.stereotype)}»&lt;/span&gt;&lt;/div&gt;` : "";
    const value = `&lt;div&gt;&lt;b&gt;&lt;i&gt;${esc(a.label)}&lt;/i&gt;&lt;/b&gt;&lt;/div&gt;${extra}`;
    cells.push(`<mxCell id="${a.id}" value="${value}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#777777;fillColor=#ffffff;fontFamily=Arial;fontSize=14;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="150" height="135" as="geometry"/></mxCell>`);
  }

  for (const u of usecases) {
    const isRoot = u.id.startsWith("r_");
    const fill = u.auth ? "#ffbf66" : isRoot ? "#ffca7a" : "#ffdca6";
    const strokeWidth = isRoot || u.auth ? 1.8 : 1.25;
    const fontSize = isRoot || u.auth ? 15 : 13;
    cells.push(`<mxCell id="${u.id}" value="${htmlLabel(u)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#d5a65f;strokeWidth=${strokeWidth};fontFamily=Arial;fontSize=${fontSize};align=center;verticalAlign=middle;spacing=5;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }

  let edgeId = 1;
  for (const a of associations) {
    cells.push(`<mxCell id="assoc_${edgeId++}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor=#888888;strokeWidth=1.25;" edge="1" parent="1" source="${a.from}" target="${a.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  for (const e of includeEdges) {
    const pts = pointsForInclude(e).slice(1, -1);
    cells.push(`<mxCell id="rel_${edgeId++}" value="«include»" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;strokeColor=#777777;strokeWidth=1.15;fontFamily=Arial;fontSize=11;fontStyle=2;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry">${mxPoints(pts)}</mxGeometry></mxCell>`);
  }

  const legend = [
    "S1 Sécurité, rôles et multi-tenant", "S2 Demande de marketplace", "S3 Back-office SaaS", "S4 Paiement et activation", "S5 Back-office Banque et espace public",
    "S6 Onboarding concessionnaire", "S7 Partenariats et contrats", "S8 Produits, publications et suivi", "S9 Parcours client et financement", "S10 Assistants conversationnels",
  ];
  legend.forEach((t, i) => {
    const row = i < 5 ? 0 : 1;
    const col = i % 5;
    cells.push(`<mxCell id="legend_${i}" value="${esc(t)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff8ec;strokeColor=#e5c58f;fontFamily=Arial;fontSize=12;fontStyle=1;align=center;verticalAlign=middle;" vertex="1" parent="1"><mxGeometry x="${390 + col * 550}" y="${2700 + row * 58}" width="510" height="44" as="geometry"/></mxCell>`);
  });

  const model = `<mxGraphModel dx="${W}" dy="${H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<mxfile host="app.diagrams.net" modified="2026-09-04T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="matchia-complete-sprints" name="Global complet avec sprints">${model}</diagram></mxfile>`;
}

function actorSvg(a) {
  const cx = a.x + 75;
  const top = a.y + 8;
  const labelY = a.y + 112;
  return `<g><circle cx="${cx}" cy="${top + 15}" r="14" fill="#fff" stroke="#777" stroke-width="1.5"/><path d="M${cx},${top + 29} L${cx},${top + 67} M${cx - 25},${top + 43} L${cx + 25},${top + 43} M${cx},${top + 67} L${cx - 22},${top + 94} M${cx},${top + 67} L${cx + 22},${top + 94}" fill="none" stroke="#777" stroke-width="1.5"/><text x="${cx}" y="${labelY}" text-anchor="middle" class="actor-label">${esc(a.label)}</text>${a.stereotype ? `<text x="${cx}" y="${labelY + 19}" text-anchor="middle" class="stereotype">«${esc(a.stereotype)}»</text>` : ""}</g>`;
}

function usecaseSvg(u) {
  const [cx, cy] = center(u);
  const isRoot = u.id.startsWith("r_");
  const fill = u.auth ? "#ffbf66" : isRoot ? "#ffca7a" : "#ffdca6";
  const lines = u.label.split("\n");
  const lineGap = isRoot || u.auth ? 18 : 16;
  const sprintY = cy - ((lines.length * lineGap) / 2) - 3;
  const labelStart = sprintY + 21;
  const tspans = lines.map((line, i) => `<tspan x="${cx}" y="${labelStart + i * lineGap}">${esc(line)}</tspan>`).join("");
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${fill}" stroke="#d5a65f" stroke-width="${isRoot || u.auth ? 1.8 : 1.25}"/><text x="${cx}" y="${sprintY}" text-anchor="middle" class="sprint-tag">[${esc(u.sprint)}]</text><text x="${cx}" y="${labelStart}" text-anchor="middle" class="${isRoot || u.auth ? "uc-root" : "uc-child"}">${tspans}</text></g>`;
}

function svgXml() {
  const edges = [];
  for (const a of associations) {
    const from = byId.get(a.from), to = byId.get(a.to);
    const start = actorAnchor(from);
    const end = ellipsePoint(to, start);
    edges.push(`<path d="${polyline([start, end])}" class="association"/>`);
  }
  for (const e of includeEdges) {
    const pts = pointsForInclude(e);
    const end = pts[pts.length - 1];
    const labelX = e.to === "u_auth" ? 2260 : end[0] - 50;
    const labelY = e.to === "u_auth" ? e.authPathY - 8 : end[1] - 10;
    edges.push(`<path d="${polyline(pts)}" class="relationship" marker-end="url(#openArrow)"/><rect x="${labelX - 38}" y="${labelY - 13}" width="82" height="18" rx="3" fill="#fff" opacity="0.94"/><text x="${labelX}" y="${labelY}" text-anchor="middle" class="rel-label">«include»</text>`);
  }

  const legend = [
    "S1  Sécurité, rôles et multi-tenant", "S2  Demande de marketplace", "S3  Back-office SaaS", "S4  Paiement et activation", "S5  Back-office Banque et espace public",
    "S6  Onboarding concessionnaire", "S7  Partenariats et contrats", "S8  Produits, publications et suivi", "S9  Parcours client et financement", "S10  Assistants conversationnels",
  ];
  const legendSvg = legend.map((t, i) => {
    const row = i < 5 ? 0 : 1, col = i % 5;
    const x = 390 + col * 550, y = 2700 + row * 58;
    return `<rect x="${x}" y="${y}" width="510" height="44" rx="12" fill="#fff8ec" stroke="#e5c58f"/><text x="${x + 255}" y="${y + 28}" text-anchor="middle" class="legend">${esc(t)}</text>`;
  }).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Diagramme global complet des cas d'utilisation de Matchia avec correspondance des sprints</title>
  <desc id="desc">Toutes les fonctionnalités des besoins fonctionnels sont regroupées par acteur et rattachées aux sprints S1 à S10.</desc>
  <defs>
    <marker id="openArrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#777" stroke-width="1.2"/></marker>
    <style>
      .title{font:700 20px Arial,sans-serif;fill:#333}.lane{font:700 14px Arial,sans-serif;fill:#6b7280}
      .actor-label{font:italic 700 15px Arial,sans-serif;fill:#333}.stereotype{font:italic 12px Arial,sans-serif;fill:#666}
      .sprint-tag{font:700 12px Arial,sans-serif;fill:#0b2d63}.uc-root{font:italic 700 14px Arial,sans-serif;fill:#222}.uc-child{font:italic 700 12.5px Arial,sans-serif;fill:#222}
      .association{fill:none;stroke:#888;stroke-width:1.3}.relationship{fill:none;stroke:#777;stroke-width:1.15;stroke-dasharray:7 5}.rel-label{font:italic 11px Arial,sans-serif;fill:#555}.legend{font:700 12px Arial,sans-serif;fill:#374151}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="${boundary.x}" y="${boundary.y}" width="${boundary.w}" height="${boundary.h}" fill="#fff" stroke="#9e9e9e" stroke-width="1.5"/>
  <rect x="${boundary.x}" y="${boundary.y}" width="${boundary.w}" height="42" fill="#faf7f2" stroke="#9e9e9e" stroke-width="1.5"/>
  <text x="${boundary.x + 18}" y="${boundary.y + 28}" class="title">Plateforme SaaS Matchia — Diagramme global complet avec correspondance des sprints</text>
  ${lanes.map((l, i) => `${i ? `<line x1="320" y1="${l.y - 10}" x2="3180" y2="${l.y - 10}" stroke="#d7d7d7" stroke-dasharray="5 5"/>` : ""}<text x="3150" y="${l.y + 24}" text-anchor="end" class="lane">${esc(l.title)}  [${esc(l.sprint)}]</text>`).join("\n  ")}
  ${edges.join("\n  ")}
  ${[...actors, ...externalActors].map(actorSvg).join("\n  ")}
  ${usecases.map(usecaseSvg).join("\n  ")}
  ${legendSvg}
</svg>`;
}

async function main() {
  const base = "Diagramme_cas_utilisation_global_Matchia_complet_sprints";
  const drawioPath = path.join(outDir, `${base}.drawio`);
  const svgPath = path.join(outDir, `${base}.svg`);
  const pngPath = path.join(outDir, `${base}.png`);
  fs.writeFileSync(drawioPath, drawioXml(), "utf8");
  const svg = svgXml();
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 150 }).png().toFile(pngPath);
  console.log(JSON.stringify({ drawioPath, svgPath, pngPath }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
