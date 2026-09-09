"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "diagramme_usecase_global_matchia");
fs.mkdirSync(outDir, { recursive: true });

const W = 2300;
const H = 1500;

const actors = [
  { id: "actor_bank_requester", label: "Demandeur banque", x: 70, y: 70 },
  { id: "actor_saas", label: "Administrateur SaaS", x: 70, y: 285 },
  { id: "actor_bank_admin", label: "Administrateur Banque", x: 70, y: 560 },
  { id: "actor_dealer", label: "Concessionnaire", x: 70, y: 825 },
  { id: "actor_client", label: "Client", x: 70, y: 1055 },
  { id: "actor_visitor", label: "Internaute", x: 70, y: 1300 },
];

const externalActors = [
  { id: "actor_email", label: "Service d'e-mail", stereotype: "système externe", x: 2100, y: 80 },
  { id: "actor_gemini", label: "Gemini", stereotype: "système externe", x: 2100, y: 350 },
  { id: "actor_stripe", label: "Stripe", stereotype: "système externe", x: 2100, y: 610 },
];

const usecases = [
  { id: "uc_request", label: "Soumettre une demande\nde marketplace bancaire", x: 430, y: 90, w: 430, h: 88 },
  { id: "uc_email", label: "Vérifier l'adresse e-mail\net envoyer les notifications", x: 1500, y: 90, w: 365, h: 88 },

  { id: "uc_saas", label: "Administrer la plateforme SaaS\nbanques, offres, catalogues, demandes et audit", x: 430, y: 300, w: 430, h: 94 },
  { id: "uc_ai", label: "Interroger l'assistant IA\nde pilotage", x: 1500, y: 320, w: 365, h: 88 },

  { id: "uc_subscription", label: "Souscrire ou renouveler\ndes services", x: 430, y: 500, w: 430, h: 94 },
  { id: "uc_payment", label: "Effectuer un paiement\nsécurisé", x: 1500, y: 560, w: 365, h: 88 },

  { id: "uc_bank", label: "Administrer la marketplace bancaire\ncontenus, modules, clients et financements", x: 430, y: 700, w: 430, h: 94 },

  { id: "uc_auth", label: "S'authentifier", x: 1010, y: 750, w: 320, h: 92, auth: true },

  { id: "uc_dealer_register", label: "Demander l'inscription et\nl'activation du compte concessionnaire", x: 430, y: 840, w: 430, h: 88 },
  { id: "uc_dealer", label: "Gérer l'activité concessionnaire\nproduits, stocks, partenariats et publications", x: 430, y: 955, w: 430, h: 94 },

  { id: "uc_client_register", label: "S'inscrire et activer\nson compte client", x: 430, y: 1070, w: 430, h: 88 },
  { id: "uc_financing", label: "Constituer et suivre une demande\nde financement et ses documents", x: 430, y: 1175, w: 430, h: 94 },

  { id: "uc_public", label: "Explorer la marketplace publique\nstores, produits et détails", x: 430, y: 1330, w: 430, h: 94 },
  { id: "uc_public_tools", label: "Comparer, simuler et utiliser\nle chatbot public", x: 1500, y: 1305, w: 365, h: 88 },
];

const associations = [
  { from: "actor_bank_requester", to: "uc_request" },
  { from: "actor_saas", to: "uc_saas" },
  { from: "actor_bank_admin", to: "uc_bank" },
  { from: "actor_bank_admin", to: "uc_subscription" },
  { from: "actor_dealer", to: "uc_dealer_register" },
  { from: "actor_dealer", to: "uc_dealer" },
  { from: "actor_client", to: "uc_client_register" },
  { from: "actor_client", to: "uc_financing" },
  { from: "actor_visitor", to: "uc_public" },
  { from: "actor_email", to: "uc_email" },
  { from: "actor_gemini", to: "uc_ai" },
  { from: "actor_stripe", to: "uc_payment" },
];

const relationships = [
  { from: "uc_request", to: "uc_email", type: "include", points: [[880, 115], [1430, 115]] },
  { from: "uc_dealer_register", to: "uc_email", type: "include", points: [[1415, 884], [1415, 134]], label: [1415, 760] },
  { from: "uc_client_register", to: "uc_email", type: "include", points: [[1440, 1114], [1440, 134]], label: [1440, 1025] },
  { from: "uc_subscription", to: "uc_payment", type: "include", points: [[900, 540], [1430, 540], [1430, 590]] },
  { from: "uc_ai", to: "uc_saas", type: "extend", points: [[1450, 350], [930, 350]] },
  { from: "uc_public_tools", to: "uc_public", type: "extend", points: [[1450, 1340], [930, 1340]] },
  { from: "uc_saas", to: "uc_auth", type: "include", points: [[900, 350], [945, 350], [945, 770]], label: [945, 560] },
  { from: "uc_bank", to: "uc_auth", type: "include", points: [], label: [934, 755] },
  { from: "uc_dealer", to: "uc_auth", type: "include", points: [[900, 1002], [965, 1002], [965, 825]], label: [965, 920] },
  { from: "uc_financing", to: "uc_auth", type: "include", points: [[900, 1222], [945, 1222], [945, 835]], label: [945, 1070] },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const byId = new Map([...actors, ...externalActors, ...usecases].map((n) => [n.id, n]));

function mxPointList(points) {
  if (!points || points.length === 0) return "";
  return `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>`;
}

function makeDrawio() {
  let id = 2;
  const cells = [];
  cells.push(`<mxCell id="boundary" value="Plateforme SaaS Matchia" style="swimlane;html=1;rounded=0;startSize=38;horizontal=1;fillColor=#ffffff;swimlaneFillColor=#ffffff;strokeColor=#9e9e9e;strokeWidth=1.5;fontFamily=Arial;fontSize=18;fontStyle=1;align=left;spacingLeft=14;" vertex="1" parent="1"><mxGeometry x="320" y="35" width="1610" height="1410" as="geometry"/></mxCell>`);

  for (const a of [...actors, ...externalActors]) {
    const extra = a.stereotype ? `<div><span style="font-size:11px;color:#666666">«${esc(a.stereotype)}»</span></div>` : "";
    const value = `<div><b><i>${esc(a.label)}</i></b></div>${extra}`;
    cells.push(`<mxCell id="${a.id}" value="${esc(value)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#777777;fillColor=#ffffff;fontFamily=Arial;fontSize=14;fontStyle=0;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="150" height="135" as="geometry"/></mxCell>`);
  }

  for (const u of usecases) {
    const fill = u.auth ? "#ffcc80" : "#ffd79b";
    cells.push(`<mxCell id="${u.id}" value="${esc(u.label).replace(/\n/g, "&lt;br&gt;")}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#d5aa6d;strokeWidth=1.4;fontFamily=Arial;fontSize=15;fontStyle=3;align=center;verticalAlign=middle;spacing=6;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }

  for (const a of associations) {
    cells.push(`<mxCell id="e${id++}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#8a8a8a;strokeWidth=1.25;" edge="1" parent="1" source="${a.from}" target="${a.to}"><mxGeometry relative="1" as="geometry">${mxPointList(a.points || [])}</mxGeometry></mxCell>`);
  }
  for (const r of relationships) {
    const value = r.type === "include" ? "«include»" : "«extend»";
    cells.push(`<mxCell id="e${id++}" value="${esc(value)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;strokeColor=#777777;strokeWidth=1.25;fontFamily=Arial;fontSize=13;fontStyle=2;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${r.from}" target="${r.to}"><mxGeometry relative="1" as="geometry">${mxPointList(r.points)}</mxGeometry></mxCell>`);
  }

  const model = `<mxGraphModel dx="2300" dy="1500" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2300" pageHeight="1500" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<mxfile host="app.diagrams.net" modified="2026-09-04T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="matchia-global-usecase" name="Diagramme global">${model}</diagram></mxfile>`;
}

function lineWrap(text) {
  return text.split("\n");
}

function ucCenter(u) {
  return [u.x + u.w / 2, u.y + u.h / 2];
}

function actorAnchor(a, target) {
  const external = a.x > W / 2;
  const targetCenter = ucCenter(target);
  return external ? [a.x + 5, a.y + 66] : [a.x + 145, a.y + 66];
}

function ellipseBoundaryPoint(u, toward) {
  const [cx, cy] = ucCenter(u);
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  const rx = u.w / 2;
  const ry = u.h / 2;
  const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * scale, cy + dy * scale];
}

function polylinePath(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

function relationPoints(r) {
  const from = byId.get(r.from);
  const to = byId.get(r.to);
  const fromC = ucCenter(from);
  const toC = ucCenter(to);
  const firstGuide = r.points.length ? r.points[0] : toC;
  const lastGuide = r.points.length ? r.points[r.points.length - 1] : fromC;
  const start = ellipseBoundaryPoint(from, firstGuide);
  const end = ellipseBoundaryPoint(to, lastGuide);
  return [start, ...r.points, end];
}

function labelPoint(points) {
  if (points.length === 2) return [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2 - 10];
  let best = [points[0], points[1]];
  let bestLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > bestLen) { bestLen = len; best = [a, b]; }
  }
  return [(best[0][0] + best[1][0]) / 2, (best[0][1] + best[1][1]) / 2 - 9];
}

function actorSvg(a) {
  const cx = a.x + 75;
  const top = a.y + 8;
  const gray = "#777777";
  const labelY = a.y + 112;
  return `<g aria-label="${esc(a.label)}"><circle cx="${cx}" cy="${top + 15}" r="14" fill="#fff" stroke="${gray}" stroke-width="1.5"/><path d="M${cx},${top + 29} L${cx},${top + 67} M${cx - 25},${top + 43} L${cx + 25},${top + 43} M${cx},${top + 67} L${cx - 22},${top + 94} M${cx},${top + 67} L${cx + 22},${top + 94}" fill="none" stroke="${gray}" stroke-width="1.5"/><text x="${cx}" y="${labelY}" text-anchor="middle" class="actor-label">${esc(a.label)}</text>${a.stereotype ? `<text x="${cx}" y="${labelY + 19}" text-anchor="middle" class="stereotype">«${esc(a.stereotype)}»</text>` : ""}</g>`;
}

function usecaseSvg(u) {
  const cx = u.x + u.w / 2;
  const cy = u.y + u.h / 2;
  const lines = lineWrap(u.label);
  const startY = cy - ((lines.length - 1) * 10);
  const text = lines.map((line, i) => `<tspan x="${cx}" y="${startY + i * 22}">${esc(line)}</tspan>`).join("");
  return `<g aria-label="${esc(u.label.replace(/\n/g, " "))}"><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${u.auth ? "#ffcc80" : "#ffd79b"}" stroke="#d5aa6d" stroke-width="1.5"/><text x="${cx}" y="${startY}" text-anchor="middle" class="uc-label">${text}</text></g>`;
}

function makeSvg() {
  const edgeParts = [];
  for (const a of associations) {
    const fromId = a.from;
    const toId = a.to;
    const from = byId.get(fromId);
    const to = byId.get(toId);
    let start, end;
    if (fromId.startsWith("actor_")) {
      start = actorAnchor(from, to);
      end = ellipseBoundaryPoint(to, start);
    } else {
      start = ucCenter(from);
      end = ucCenter(to);
    }
    const guides = a.points || [];
    if (guides.length) {
      const last = guides[guides.length - 1];
      end = ellipseBoundaryPoint(to, last);
    }
    edgeParts.push(`<path d="${polylinePath([start, ...guides, end])}" class="association"/>`);
  }
  for (const r of relationships) {
    const points = relationPoints(r);
    const [lx, ly] = r.label || labelPoint(points);
    edgeParts.push(`<path d="${polylinePath(points)}" class="relationship" marker-end="url(#openArrow)"/><rect x="${lx - 42}" y="${ly - 14}" width="84" height="20" rx="3" fill="#fff" opacity="0.94"/><text x="${lx}" y="${ly + 1}" text-anchor="middle" class="relationship-label">«${r.type}»</text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Diagramme global des cas d'utilisation de la plateforme Matchia</title>
  <desc id="desc">Acteurs métier à gauche, système Matchia au centre, authentification à droite et services externes à l'extrême droite.</desc>
  <defs>
    <marker id="openArrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#777" stroke-width="1.2"/></marker>
    <style>
      .boundary-title{font:700 20px Arial,sans-serif;fill:#333}
      .actor-label{font:italic 700 15px Arial,sans-serif;fill:#333}
      .stereotype{font:italic 12px Arial,sans-serif;fill:#666}
      .uc-label{font:italic 700 15px Arial,sans-serif;fill:#222;dominant-baseline:middle}
      .association{fill:none;stroke:#8a8a8a;stroke-width:1.35}
      .relationship{fill:none;stroke:#777;stroke-width:1.3;stroke-dasharray:7 5}
      .relationship-label{font:italic 13px Arial,sans-serif;fill:#555}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="320" y="35" width="1610" height="1410" fill="#fff" stroke="#9e9e9e" stroke-width="1.5"/>
  <rect x="320" y="35" width="1610" height="38" fill="#faf7f2" stroke="#9e9e9e" stroke-width="1.5"/>
  <text x="338" y="61" class="boundary-title">Plateforme SaaS Matchia</text>
  ${edgeParts.join("\n  ")}
  ${[...actors, ...externalActors].map(actorSvg).join("\n  ")}
  ${usecases.map(usecaseSvg).join("\n  ")}
</svg>`;
}

async function main() {
  const drawioPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia.drawio");
  const svgPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia.svg");
  const pngPath = path.join(outDir, "Diagramme_cas_utilisation_global_Matchia.png");
  fs.writeFileSync(drawioPath, makeDrawio(), "utf8");
  const svg = makeSvg();
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 180 }).png().toFile(pngPath);
  console.log(JSON.stringify({ drawioPath, svgPath, pngPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
