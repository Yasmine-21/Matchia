"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "diagramme_usecase_global_matchia");
fs.mkdirSync(outDir, { recursive: true });

const W = 2400;
const H = 2760;

const actors = [
  { id: "a_saas", label: "Administrateur SaaS", x: 45, y: 430 },
  { id: "a_bank", label: "Administrateur Banque", x: 45, y: 920 },
  { id: "a_dealer", label: "Concessionnaire", x: 45, y: 1500 },
  { id: "a_visitor", label: "Internaute", x: 45, y: 1920 },
  { id: "a_client", label: "Client", x: 45, y: 2190 },
];

const externalActors = [
  { id: "a_email", label: "Service d'e-mail", stereotype: "système externe", x: 2200, y: 75 },
  { id: "a_stripe", label: "Stripe", stereotype: "système externe", x: 2200, y: 235 },
  { id: "a_gemini", label: "Gemini", stereotype: "système externe", x: 2200, y: 650 },
];

const usecases = [
  { id: "u_request", label: "Soumettre une demande de marketplace\npour une banque", x: 520, y: 70 },
  { id: "u_payment", label: "Payer et activer la marketplace et les services", x: 520, y: 175 },
  { id: "u_email", label: "Vérifier l'e-mail et envoyer les notifications", x: 1500, y: 80, support: true },

  { id: "u_saas_pilot", label: "Piloter le SaaS : tableau de bord, profil,\nnotifications, audit, logs et assistant IA", x: 520, y: 340 },
  { id: "u_saas_requests", label: "Traiter les adhésions des banques\net les comptes concessionnaires", x: 520, y: 455 },
  { id: "u_saas_ecosystem", label: "Gérer les banques, marketplaces,\ncontenus et paramètres généraux", x: 520, y: 570 },
  { id: "u_saas_catalog", label: "Gérer stores, modules, associations,\noffres, abonnements et paiements", x: 520, y: 685 },

  { id: "u_bank_home", label: "Piloter l'espace Banque : tableau de bord,\nprofil, utilisateurs et notifications", x: 520, y: 840 },
  { id: "u_bank_config", label: "Personnaliser les contenus, stores,\nmodules, produits et simulateur", x: 520, y: 955 },
  { id: "u_bank_services", label: "Gérer les abonnements, renouvellements\net services souscrits", x: 520, y: 1070 },
  { id: "u_bank_partners", label: "Gérer concessionnaires, partenariats,\ncontrats et publications", x: 520, y: 1185 },
  { id: "u_bank_financing", label: "Traiter les demandes de financement\net les documents associés", x: 520, y: 1300 },

  { id: "u_dealer_register", label: "Déposer une demande d'inscription\ncomme Concessionnaire", x: 520, y: 1455 },
  { id: "u_dealer_home", label: "Gérer le profil, le tableau de bord\net les notifications", x: 520, y: 1565 },
  { id: "u_dealer_products", label: "Gérer les produits, les stocks\net les publications multi-banque", x: 520, y: 1675 },
  { id: "u_dealer_partners", label: "Gérer demandes, invitations,\npartenariats et contrats", x: 520, y: 1785 },
  { id: "u_dealer_financing", label: "Suivre les dossiers de financement\nassociés aux produits", x: 520, y: 1895 },

  { id: "u_client_register", label: "S'inscrire comme Client", x: 520, y: 2050 },
  { id: "u_client_financing", label: "Créer, documenter et suivre\nune demande de financement", x: 520, y: 2160 },

  { id: "u_public_browse", label: "Consulter la marketplace", x: 520, y: 2305 },
  { id: "u_public_compare", label: "Comparer et simuler", x: 520, y: 2415 },

  { id: "u_auth", label: "S'authentifier", x: 1500, y: 1236, w: 340, h: 180, auth: true },
].map((u) => ({ w: 580, h: 82, ...u }));

const associations = [
  ["a_saas", "u_saas_pilot"], ["a_saas", "u_saas_requests"], ["a_saas", "u_saas_ecosystem"], ["a_saas", "u_saas_catalog"],
  ["a_bank", "u_bank_home"], ["a_bank", "u_bank_config"], ["a_bank", "u_bank_services"], ["a_bank", "u_bank_partners"], ["a_bank", "u_bank_financing"],
  ["a_dealer", "u_dealer_home"], ["a_dealer", "u_dealer_products"], ["a_dealer", "u_dealer_partners"], ["a_dealer", "u_dealer_financing"],
  ["a_visitor", "u_public_browse"], ["a_visitor", "u_public_compare"], ["a_visitor", "u_client_register"], ["a_visitor", "u_dealer_register"], ["a_visitor", "u_request"], ["a_visitor", "u_payment"],
  ["a_client", "u_client_financing"], ["a_client", "u_public_browse"], ["a_client", "u_public_compare"],
  ["a_email", "u_email"], ["a_stripe", "u_payment"], ["a_gemini", "u_saas_pilot"],
];

const authIncludes = [
  "u_saas_pilot", "u_saas_requests", "u_saas_ecosystem", "u_saas_catalog",
  "u_bank_home", "u_bank_config", "u_bank_services", "u_bank_partners", "u_bank_financing",
  "u_dealer_home", "u_dealer_products", "u_dealer_partners", "u_dealer_financing",
  "u_client_financing",
];

const otherIncludes = [
  ["u_request", "u_email"],
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const byId = new Map([...actors, ...externalActors, ...usecases].map((n) => [n.id, n]));

function center(n) { return [n.x + n.w / 2, n.y + n.h / 2]; }

function ellipsePoint(u, toward) {
  const [cx, cy] = center(u);
  const dx = toward[0] - cx, dy = toward[1] - cy;
  const rx = u.w / 2, ry = u.h / 2;
  const k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return [cx + dx * k, cy + dy * k];
}

function actorAnchor(a) { return a.x > W / 2 ? [a.x + 5, a.y + 66] : [a.x + 145, a.y + 66]; }
function polyline(points) { return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "); }
function mxPoints(points) { return points?.length ? `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : ""; }

const associationRoutes = {
  "a_visitor:u_request": [[12, 1986], [12, 111], [500, 111]],
  "a_visitor:u_payment": [[52, 1986], [52, 216], [500, 216]],
};

function edgeLabelPoint(a, b, ratio = 0.58) {
  return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio - 8];
}

function drawioXml() {
  const cells = [];
  for (const a of [...actors, ...externalActors]) {
    const sub = a.stereotype ? `&lt;div&gt;&lt;span style=&quot;font-size:11px;color:#666666&quot;&gt;«${esc(a.stereotype)}»&lt;/span&gt;&lt;/div&gt;` : "";
    const value = `&lt;div&gt;${esc(a.label)}&lt;/div&gt;${sub}`;
    cells.push(`<mxCell id="${a.id}" value="${value}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#555555;fillColor=#ffffff;fontFamily=Arial;fontSize=14;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="150" height="135" as="geometry"/></mxCell>`);
  }
  for (const u of usecases) {
    const fill = u.auth ? "#dbe9ff" : "#d7f4ef";
    const stroke = u.auth ? "#7da3d6" : "#5d7774";
    const value = esc(u.label).replace(/\n/g, "&lt;br&gt;");
    cells.push(`<mxCell id="${u.id}" value="${value}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.35;fontFamily=Arial;fontSize=14;align=center;verticalAlign=middle;spacing=5;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }
  let i = 1;
  for (const [from, to] of associations) {
    const route = associationRoutes[`${from}:${to}`] || [];
    const edgeStyle = route.length ? "orthogonalEdgeStyle" : "none";
    cells.push(`<mxCell id="a_${i++}" style="edgeStyle=${edgeStyle};rounded=0;html=1;endArrow=none;strokeColor=#555555;strokeWidth=1.15;" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry">${mxPoints(route)}</mxGeometry></mxCell>`);
  }
  for (const [index, from] of authIncludes.entries()) {
    const entryY = (0.10 + (0.80 * index) / (authIncludes.length - 1)).toFixed(3);
    cells.push(`<mxCell id="i_${i++}" value="«include»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=5 4;endArrow=classic;endFill=1;strokeColor=#14a9b5;strokeWidth=1.25;fontColor=#39747a;fontFamily=Arial;fontSize=11;labelBackgroundColor=#ffffff;entryX=0;entryY=${entryY};entryDx=0;entryDy=0;" edge="1" parent="1" source="${from}" target="u_auth"><mxGeometry x="-0.62" y="-9" relative="1" as="geometry"><mxPoint x="0" y="0" as="offset"/></mxGeometry></mxCell>`);
  }
  for (const [from, to] of otherIncludes) {
    cells.push(`<mxCell id="i_${i++}" value="«include»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=5 4;endArrow=classic;endFill=1;strokeColor=#14a9b5;strokeWidth=1.25;fontColor=#39747a;fontFamily=Arial;fontSize=11;labelBackgroundColor=#ffffff;" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  cells.push(`<mxCell id="caption" value="Figure : Diagramme global des cas d'utilisation de Matchia" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=16;fontStyle=0;fontColor=#444444;" vertex="1" parent="1"><mxGeometry x="690" y="2685" width="1020" height="32" as="geometry"/></mxCell>`);
  const model = `<mxGraphModel dx="${W}" dy="${H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<mxfile host="app.diagrams.net" modified="2026-09-04T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="matchia-resume-optimise" name="Global résumé optimisé">${model}</diagram></mxfile>`;
}

function actorSvg(a) {
  const cx = a.x + 75, top = a.y + 8, labelY = a.y + 112;
  return `<g><circle cx="${cx}" cy="${top + 15}" r="14" fill="#fff" stroke="#555" stroke-width="1.4"/><path d="M${cx},${top + 29} L${cx},${top + 67} M${cx - 25},${top + 43} L${cx + 25},${top + 43} M${cx},${top + 67} L${cx - 22},${top + 94} M${cx},${top + 67} L${cx + 22},${top + 94}" fill="none" stroke="#555" stroke-width="1.4"/><text x="${cx}" y="${labelY}" text-anchor="middle" class="actor">${esc(a.label)}</text>${a.stereotype ? `<text x="${cx}" y="${labelY + 18}" text-anchor="middle" class="stereotype">«${esc(a.stereotype)}»</text>` : ""}</g>`;
}

function usecaseSvg(u) {
  const [cx, cy] = center(u);
  const lines = u.label.split("\n");
  const startY = cy - (lines.length - 1) * 9;
  const tspans = lines.map((line, i) => `<tspan x="${cx}" y="${startY + i * 19}">${esc(line)}</tspan>`).join("");
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${u.auth ? "#dbe9ff" : "#d7f4ef"}" stroke="${u.auth ? "#7da3d6" : "#5d7774"}" stroke-width="1.35"/><text x="${cx}" y="${startY}" text-anchor="middle" class="usecase">${tspans}</text></g>`;
}

function svgXml() {
  const edges = [];
  for (const [fromId, toId] of associations) {
    const from = byId.get(fromId), to = byId.get(toId);
    const route = associationRoutes[`${fromId}:${toId}`] || [];
    const start = route.length ? [from.x + 75, from.y + 66] : actorAnchor(from);
    const end = ellipsePoint(to, route.length ? route[route.length - 1] : start);
    edges.push(`<path d="${polyline([start, ...route, end])}" class="association"/>`);
  }
  const renderInclude = (fromId, toId, ratio = 0.58, authIndex = -1) => {
    const from = byId.get(fromId), to = byId.get(toId);
    let b;
    if (toId === "u_auth" && authIndex >= 0) {
      const fraction = 0.10 + (0.80 * authIndex) / (authIncludes.length - 1);
      const cy = to.y + to.h / 2;
      const ry = to.h / 2;
      const rx = to.w / 2;
      const targetY = to.y + fraction * to.h;
      const normalizedY = (targetY - cy) / ry;
      const targetX = to.x + rx - rx * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
      b = [targetX, targetY];
    } else {
      b = ellipsePoint(to, center(from));
    }
    const a = ellipsePoint(from, b);
    const [lx, ly] = edgeLabelPoint(a, b, ratio);
    return `<path d="${polyline([a, b])}" class="include" marker-end="url(#tealArrow)"/><rect x="${lx - 39}" y="${ly - 13}" width="78" height="18" rx="3" fill="#fff" opacity="0.94"/><text x="${lx}" y="${ly}" text-anchor="middle" class="include-label">«include»</text>`;
  };
  authIncludes.forEach((from, idx) => edges.push(renderInclude(from, "u_auth", 0.18 + (idx % 2) * 0.025, idx)));
  otherIncludes.forEach(([from, to], idx) => edges.push(renderInclude(from, to, 0.56 + idx * 0.05)));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Diagramme global résumé des cas d'utilisation de Matchia</title>
  <desc id="desc">Fonctionnalités synthétisées, acteurs à gauche, authentification à droite et systèmes externes à l'extrême droite.</desc>
  <defs>
    <marker id="tealArrow" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,5.5 L0,11 z" fill="#14a9b5"/></marker>
    <style>
      .actor{font:14px Arial,sans-serif;fill:#333}.stereotype{font:italic 11px Arial,sans-serif;fill:#666}
      .usecase{font:14px Arial,sans-serif;fill:#222;dominant-baseline:middle}
      .association{fill:none;stroke:#555;stroke-width:1.15}.include{fill:none;stroke:#14a9b5;stroke-width:1.2;stroke-dasharray:6 5}
      .include-label{font:11px Arial,sans-serif;fill:#39747a}.caption{font:16px Arial,sans-serif;fill:#444}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  ${edges.join("\n  ")}
  ${[...actors, ...externalActors].map(actorSvg).join("\n  ")}
  ${usecases.map(usecaseSvg).join("\n  ")}
  <text x="1200" y="2710" text-anchor="middle" class="caption">Figure : Diagramme global des cas d'utilisation de Matchia</text>
</svg>`;
}

async function main() {
  const base = "Diagramme_cas_utilisation_global_Matchia_resume_optimise";
  const drawioPath = path.join(outDir, `${base}.drawio`);
  const svgPath = path.join(outDir, `${base}.svg`);
  const pngPath = path.join(outDir, `${base}.png`);
  fs.writeFileSync(drawioPath, drawioXml(), "utf8");
  const svg = svgXml();
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 180 }).png().toFile(pngPath);
  console.log(JSON.stringify({ drawioPath, svgPath, pngPath }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
