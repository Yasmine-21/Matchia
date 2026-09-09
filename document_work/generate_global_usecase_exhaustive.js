"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 5000;
const H = 3300;
const outDir = path.join(__dirname, "diagramme_usecase_global_matchia_exhaustif");
fs.mkdirSync(outDir, { recursive: true });

const sectionDefs = [
  {
    id: "saas", title: "Cas d'utilisation de l'Administrateur SaaS", actor: "Administrateur SaaS",
    y: 100, h: 850, startY: 170, step: 150,
    items: [
      ["access", "Accéder au Back-office SaaS"],
      ["profile", "Gérer son profil"],
      ["dashboard", "Consulter le tableau de bord global"],
      ["bank_requests", "Consulter et traiter les demandes\nd'adhésion des banques"],
      ["decision", "Approuver ou rejeter une demande"],
      ["assign_backoffice", "Affecter un espace Back-office Banque"],
      ["banks", "Gérer les banques enregistrées"],
      ["settings", "Configurer la plateforme"],
      ["marketplaces", "Gérer les marketplaces des banques"],
      ["stores", "Gérer les stores disponibles"],
      ["modules", "Gérer les modules proposés"],
      ["store_modules", "Associer les modules aux stores"],
      ["offers", "Gérer les offres et les abonnements"],
      ["dealer_requests", "Traiter les demandes de création\nde comptes concessionnaires"],
      ["notifications", "Consulter les notifications"],
      ["ai", "Interroger l'assistant intelligent"],
      ["audit", "Consulter les logs et l'historique d'audit"],
    ],
  },
  {
    id: "bank", title: "Cas d'utilisation de l'Administrateur Banque", actor: "Administrateur Banque",
    y: 990, h: 720, startY: 1065, step: 150,
    items: [
      ["access", "Accéder au Back-office Banque"],
      ["profile", "Gérer son profil"],
      ["dashboard", "Consulter le tableau de bord de la banque"],
      ["users", "Gérer les clients et les utilisateurs"],
      ["stores", "Gérer les stores associés et activés"],
      ["customization", "Personnaliser la marketplace"],
      ["modules", "Gérer et configurer les modules\nde chaque store"],
      ["products", "Gérer les produits proposés"],
      ["content", "Gérer les contenus de la marketplace"],
      ["subscriptions", "Gérer les abonnements et les services souscrits"],
      ["dealers", "Gérer les concessionnaires partenaires"],
      ["financing", "Traiter les demandes de financement\net consulter les documents associés"],
      ["notifications", "Consulter et gérer les notifications"],
    ],
  },
  {
    id: "dealer", title: "Cas d'utilisation du Concessionnaire", actor: "Concessionnaire",
    y: 1750, h: 500, startY: 1825, step: 145,
    items: [
      ["register", "S'inscrire et attendre la validation"],
      ["access", "Accéder à son espace après validation"],
      ["profile", "Gérer son profil"],
      ["dashboard", "Consulter son tableau de bord"],
      ["products", "Gérer ses produits et leurs stocks"],
      ["publications", "Gérer ses publications auprès des banques"],
      ["partnership_requests", "Gérer les demandes de partenariat\net les invitations reçues"],
      ["partnerships", "Gérer les partenariats et consulter\nles contrats associés"],
      ["notifications", "Recevoir les notifications liées à son activité"],
    ],
  },
  {
    id: "client", title: "Cas d'utilisation du Client", actor: "Client",
    y: 2290, h: 500, startY: 2365, step: 145,
    items: [
      ["register", "S'inscrire et activer son compte"],
      ["access", "Accéder à son espace client"],
      ["profile", "Gérer son profil"],
      ["products", "Consulter les produits et leurs détails"],
      ["compare", "Comparer les produits disponibles"],
      ["simulation", "Effectuer une simulation de financement"],
      ["submit", "Créer et soumettre une demande de financement"],
      ["documents", "Gérer les documents associés à la demande"],
      ["tracking", "Consulter et suivre l'état de ses demandes"],
      ["notifications", "Recevoir les notifications de traitement"],
    ],
  },
  {
    id: "visitor", title: "Cas d'utilisation de l'Internaute", actor: "Internaute",
    y: 2830, h: 360, startY: 2905, step: 145,
    items: [
      ["marketplaces", "Accéder aux marketplaces bancaires publiques"],
      ["stores", "Consulter les stores disponibles"],
      ["products", "Parcourir les produits proposés"],
      ["details", "Consulter les informations détaillées d'un produit"],
      ["compare", "Comparer les produits si le module est actif"],
      ["simulation", "Utiliser le simulateur s'il est disponible"],
      ["conversion", "S'inscrire ou s'authentifier pour\ndéposer une demande de financement"],
    ],
  },
];

const groups = sectionDefs.map((s) => ({ id: `group_${s.id}`, label: s.title, x: 370, y: s.y, w: s.id === "saas" ? 3100 : 4280, h: s.h }));
const actors = sectionDefs.map((s) => ({ id: `actor_${s.id}`, label: s.actor, x: 65, y: Math.round(s.y + s.h / 2 - 70) }));

const usecases = [];
const columns = [500, 1240, 1980, 2720];
for (const s of sectionDefs) {
  s.items.forEach(([suffix, label], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    usecases.push({ id: `uc_${s.id}_${suffix}`, label, x: columns[col], y: s.startY + row * s.step, w: 620, h: 72, section: s.id, col, row });
  });
}

const sharedGroup = { id: "group_shared", label: "Fonctions partagées et services intégrés", x: 3500, y: 100, w: 1150, h: 850 };
const sharedUsecases = [
  { id: "uc_auth", label: "S'authentifier", x: 3740, y: 180, w: 670, h: 86, auth: true },
  { id: "uc_verify_email", label: "Vérifier l'adresse e-mail", x: 3740, y: 340, w: 670, h: 78 },
  { id: "uc_send_notifications", label: "Envoyer les notifications", x: 3740, y: 500, w: 670, h: 78 },
  { id: "uc_payment", label: "Effectuer un paiement sécurisé", x: 3740, y: 660, w: 670, h: 78 },
  { id: "uc_gemini", label: "Générer une réponse avec Gemini", x: 3740, y: 820, w: 670, h: 78 },
];
usecases.push(...sharedUsecases);

const externalActors = [
  { id: "actor_email", label: "Service d'e-mail", stereotype: "système externe", x: 4775, y: 400 },
  { id: "actor_stripe", label: "Stripe", stereotype: "système externe", x: 4775, y: 640 },
  { id: "actor_gemini", label: "Gemini", stereotype: "système externe", x: 4775, y: 800 },
];

const associations = [];
for (const s of sectionDefs) {
  const actor = actors.find((a) => a.id === `actor_${s.id}`);
  for (const [suffix] of s.items) {
    const u = usecases.find((node) => node.id === `uc_${s.id}_${suffix}`);
    const actorY = actor.y + 67;
    const laneY = u.y - 13 - u.col * 9;
    associations.push({ from: actor.id, to: u.id, points: [[335, actorY], [335, laneY], [u.x + u.w / 2, laneY]] });
  }
}
associations.push(
  { from: "actor_email", to: "uc_verify_email" },
  { from: "actor_email", to: "uc_send_notifications" },
  { from: "actor_stripe", to: "uc_payment" },
  { from: "actor_gemini", to: "uc_gemini" },
);

const relationships = [];
function addSharedRelation(fromId, toId, type, corridorX, laneOffset = 28) {
  const from = usecases.find((u) => u.id === fromId);
  const to = usecases.find((u) => u.id === toId);
  const routeY = from.y - laneOffset;
  relationships.push({
    from: fromId, to: toId, type,
    points: [[from.x + from.w / 2, routeY], [corridorX, routeY], [corridorX, to.y + to.h / 2], [to.x - 55, to.y + to.h / 2]],
    label: [Math.min(from.x + from.w - 35, corridorX - 70), routeY - 7],
  });
}
addSharedRelation("uc_saas_access", "uc_auth", "include", 3400, 24);
addSharedRelation("uc_bank_access", "uc_auth", "include", 3420, 24);
addSharedRelation("uc_dealer_access", "uc_auth", "include", 3440, 34);
addSharedRelation("uc_client_access", "uc_auth", "include", 3460, 34);
addSharedRelation("uc_visitor_conversion", "uc_auth", "include", 3480, 34);
addSharedRelation("uc_client_register", "uc_verify_email", "include", 3500, 24);
addSharedRelation("uc_bank_subscriptions", "uc_payment", "include", 3520, 34);
addSharedRelation("uc_saas_ai", "uc_gemini", "include", 3540, 42);
addSharedRelation("uc_saas_notifications", "uc_send_notifications", "include", 3560, 32);
addSharedRelation("uc_bank_notifications", "uc_send_notifications", "include", 3580, 42);
addSharedRelation("uc_dealer_notifications", "uc_send_notifications", "include", 3600, 42);
addSharedRelation("uc_client_notifications", "uc_send_notifications", "include", 3620, 42);

relationships.push(
  { from: "uc_client_submit", to: "uc_client_documents", type: "include", points: [], label: [2660, 2540] },
  { from: "uc_visitor_compare", to: "uc_visitor_products", type: "extend", points: [[810, 3028], [2290, 3028], [2290, 2990]], label: [1550, 3016] },
  { from: "uc_visitor_simulation", to: "uc_visitor_products", type: "extend", points: [[1550, 3012], [2320, 3012], [2320, 2990]], label: [1940, 3000] },
);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const allNodes = [...actors, ...externalActors, ...usecases];
const byId = new Map(allNodes.map((n) => [n.id, n]));

function mxPoints(points) {
  if (!points?.length) return "";
  return `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>`;
}

function makeDrawio() {
  let seq = 1;
  const cells = [];
  cells.push(`<mxCell id="system_boundary" value="Plateforme SaaS Matchia" style="swimlane;html=1;rounded=0;startSize=44;horizontal=1;fillColor=#ffffff;swimlaneFillColor=#ffffff;strokeColor=#8f8f8f;strokeWidth=1.6;fontFamily=Arial;fontSize=21;fontStyle=1;align=left;spacingLeft=16;" vertex="1" parent="1"><mxGeometry x="300" y="30" width="4400" height="3210" as="geometry"/></mxCell>`);
  for (const g of [...groups, sharedGroup]) {
    cells.push(`<mxCell id="${g.id}" value="${esc(g.label)}" style="swimlane;html=1;rounded=1;arcSize=8;startSize=42;horizontal=1;fillColor=#fffaf2;swimlaneFillColor=#fffdf9;strokeColor=#dfc79e;strokeWidth=1.2;fontFamily=Arial;fontSize=17;fontStyle=1;align=left;spacingLeft=14;" vertex="1" parent="1"><mxGeometry x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" as="geometry"/></mxCell>`);
  }
  for (const a of [...actors, ...externalActors]) {
    const html = `<div><b><i>${esc(a.label)}</i></b></div>${a.stereotype ? `<div><span style="font-size:11px;color:#666666">«${esc(a.stereotype)}»</span></div>` : ""}`;
    cells.push(`<mxCell id="${a.id}" value="${esc(html)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#777777;fillColor=#ffffff;fontFamily=Arial;fontSize=15;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="185" height="145" as="geometry"/></mxCell>`);
  }
  for (const u of usecases) {
    cells.push(`<mxCell id="${u.id}" value="${esc(u.label).replace(/\n/g, "&lt;br&gt;")}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${u.auth ? "#ffcc80" : "#ffd79b"};strokeColor=#d5aa6d;strokeWidth=1.35;fontFamily=Arial;fontSize=16;fontStyle=3;align=center;verticalAlign=middle;spacing=5;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }
  for (const a of associations) {
    cells.push(`<mxCell id="e${seq++}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor=#9a9a9a;strokeWidth=1;" edge="1" parent="1" source="${a.from}" target="${a.to}"><mxGeometry relative="1" as="geometry">${mxPoints(a.points || [])}</mxGeometry></mxCell>`);
  }
  for (const r of relationships) {
    cells.push(`<mxCell id="e${seq++}" value="${esc(`«${r.type}»`)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;strokeColor=#777777;strokeWidth=1.2;fontFamily=Arial;fontSize=13;fontStyle=2;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${r.from}" target="${r.to}"><mxGeometry relative="1" as="geometry">${mxPoints(r.points)}</mxGeometry></mxCell>`);
  }
  const model = `<mxGraphModel dx="5000" dy="3300" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="5000" pageHeight="3300" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<mxfile host="app.diagrams.net" modified="2026-09-04T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="matchia-exhaustive" name="Diagramme global exhaustif">${model}</diagram></mxfile>`;
}

function center(n) { return [n.x + n.w / 2, n.y + n.h / 2]; }
function ellipsePoint(u, toward) {
  const [cx, cy] = center(u);
  const dx = toward[0] - cx, dy = toward[1] - cy;
  const rx = u.w / 2, ry = u.h / 2;
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}
function actorAnchor(a, target) {
  const isRight = a.x > 2800;
  return [isRight ? a.x + 8 : a.x + 177, a.y + 67];
}
function pathD(points) { return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "); }
function relationPoints(r) {
  const from = byId.get(r.from), to = byId.get(r.to);
  const first = r.points?.[0] || center(to);
  const last = r.points?.[r.points.length - 1] || center(from);
  return [ellipsePoint(from, first), ...(r.points || []), ellipsePoint(to, last)];
}
function actorSvg(a) {
  const cx = a.x + 92, top = a.y + 4, gray = "#777";
  return `<g><circle cx="${cx}" cy="${top + 16}" r="15" fill="#fff" stroke="${gray}" stroke-width="1.5"/><path d="M${cx},${top + 31} L${cx},${top + 72} M${cx - 28},${top + 46} L${cx + 28},${top + 46} M${cx},${top + 72} L${cx - 24},${top + 101} M${cx},${top + 72} L${cx + 24},${top + 101}" fill="none" stroke="${gray}" stroke-width="1.5"/><text x="${cx}" y="${top + 124}" text-anchor="middle" class="actor-label">${esc(a.label)}</text>${a.stereotype ? `<text x="${cx}" y="${top + 143}" text-anchor="middle" class="stereotype">«${esc(a.stereotype)}»</text>` : ""}</g>`;
}
function usecaseSvg(u) {
  const [cx, cy] = center(u);
  const lines = u.label.split("\n");
  const startY = cy - (lines.length - 1) * 10;
  const spans = lines.map((line, i) => `<tspan x="${cx}" y="${startY + i * 21}">${esc(line)}</tspan>`).join("");
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${u.auth ? "#ffcc80" : "#ffd79b"}" stroke="#d5aa6d" stroke-width="1.4"/><text x="${cx}" y="${startY}" text-anchor="middle" class="uc-label">${spans}</text></g>`;
}
function groupSvg(g) {
  return `<g><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="8" fill="#fffdf9" stroke="#dfc79e" stroke-width="1.2"/><rect x="${g.x}" y="${g.y}" width="${g.w}" height="42" rx="8" fill="#fff7e9" stroke="#dfc79e" stroke-width="1.2"/><rect x="${g.x}" y="${g.y + 34}" width="${g.w}" height="8" fill="#fff7e9"/><text x="${g.x + 16}" y="${g.y + 28}" class="group-title">${esc(g.label)}</text></g>`;
}
function makeSvg() {
  const edges = [];
  for (const a of associations) {
    const from = byId.get(a.from), to = byId.get(a.to);
    const start = actorAnchor(from, to);
    const guides = a.points || [];
    const end = ellipsePoint(to, guides.length ? guides[guides.length - 1] : start);
    edges.push(`<path d="${pathD([start, ...guides, end])}" class="association"/>`);
  }
  for (const r of relationships) {
    const pts = relationPoints(r);
    const [lx, ly] = r.label;
    edges.push(`<path d="${pathD(pts)}" class="relationship" marker-end="url(#openArrow)"/><rect x="${lx - 47}" y="${ly - 14}" width="94" height="20" rx="3" fill="#fff" opacity="0.95"/><text x="${lx}" y="${ly + 1}" text-anchor="middle" class="relationship-label">«${r.type}»</text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Diagramme global exhaustif des cas d'utilisation de Matchia</title>
  <desc id="desc">Toutes les fonctionnalités de la section besoins fonctionnels, regroupées par acteur, avec authentification et systèmes externes.</desc>
  <defs>
    <marker id="openArrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#777" stroke-width="1.2"/></marker>
    <style>
      .system-title{font:700 22px Arial,sans-serif;fill:#333}
      .group-title{font:700 18px Arial,sans-serif;fill:#4a4034}
      .actor-label{font:italic 700 16px Arial,sans-serif;fill:#333}
      .stereotype{font:italic 12px Arial,sans-serif;fill:#666}
      .uc-label{font:italic 700 16px Arial,sans-serif;fill:#222;dominant-baseline:middle}
      .association{fill:none;stroke:#b0b0b0;stroke-width:0.8}
      .relationship{fill:none;stroke:#777;stroke-width:1.2;stroke-dasharray:7 5}
      .relationship-label{font:italic 13px Arial,sans-serif;fill:#555}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="300" y="30" width="4400" height="3210" fill="#fff" stroke="#8f8f8f" stroke-width="1.6"/>
  <rect x="300" y="30" width="4400" height="44" fill="#faf7f2" stroke="#8f8f8f" stroke-width="1.6"/>
  <text x="318" y="59" class="system-title">Plateforme SaaS Matchia</text>
  ${[...groups, sharedGroup].map(groupSvg).join("\n  ")}
  ${edges.join("\n  ")}
  ${[...actors, ...externalActors].map(actorSvg).join("\n  ")}
  ${usecases.map(usecaseSvg).join("\n  ")}
</svg>`;
}

async function main() {
  const drawioPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia_exhaustif.drawio");
  const svgPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia_exhaustif.svg");
  const pngPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia_exhaustif.png");
  fs.writeFileSync(drawioPath, makeDrawio(), "utf8");
  const svg = makeSvg();
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 100 }).png().toFile(pngPath);
  console.log(JSON.stringify({ drawioPath, svgPath, pngPath, usecases: usecases.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
