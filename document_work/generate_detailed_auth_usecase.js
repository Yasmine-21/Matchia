"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "diagramme_usecase_authentification_matchia");
fs.mkdirSync(outDir, { recursive: true });

const W = 2300;
const H = 1650;

const actors = [
  { id: "a_saas", label: "Administrateur SaaS", x: 35, y: 190 },
  { id: "a_bank", label: "Administrateur Banque", x: 35, y: 450 },
  { id: "a_dealer", label: "Concessionnaire", x: 35, y: 710 },
  { id: "a_client", label: "Client", x: 35, y: 970 },
];

const usecases = [
  { id: "u_auth", label: "S'authentifier", x: 520, y: 485, w: 560, h: 140, auth: true },

  { id: "u_credentials", label: "Saisir l'adresse e-mail\net le mot de passe", x: 1270, y: 145, w: 610, h: 105 },
  { id: "u_verify", label: "Vérifier les identifiants", x: 1270, y: 305, w: 610, h: 105 },
  { id: "u_account", label: "Vérifier l'état du compte", x: 1270, y: 465, w: 610, h: 105 },
  { id: "u_role", label: "Charger le rôle et contrôler\nles autorisations", x: 1270, y: 625, w: 610, h: 105 },
  { id: "u_session", label: "Créer une session authentifiée", x: 1270, y: 785, w: 610, h: 105 },
  { id: "u_redirect", label: "Rediriger vers l'espace\ncorrespondant au rôle", x: 1270, y: 945, w: 610, h: 105 },

  {
    id: "u_tenant",
    label: "Déterminer le contexte du tenant",
    condition: "[Utilisateur rattaché à une banque ou à une marketplace]",
    x: 330,
    y: 1110,
    w: 580,
    h: 135,
    extension: true,
  },
  {
    id: "u_refusal",
    label: "Refuser l'authentification\net afficher un message d'erreur",
    condition: "[Identifiants incorrects, compte inactif\nou accès hors périmètre]",
    x: 930,
    y: 1110,
    w: 600,
    h: 145,
    extension: true,
  },
  {
    id: "u_renew",
    label: "Renouveler la session\nou se reconnecter",
    condition: "[Session ou jeton d'authentification expiré]",
    x: 1550,
    y: 1110,
    w: 570,
    h: 135,
    extension: true,
  },
];

const includes = ["u_credentials", "u_verify", "u_account", "u_role", "u_session", "u_redirect"];
const extensions = ["u_tenant", "u_refusal", "u_renew"];
const byId = new Map([...actors, ...usecases].map((n) => [n.id, n]));

const esc = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&apos;");

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

function pointOnLeftArc(u, fraction) {
  const cy = u.y + u.h / 2;
  const ry = u.h / 2;
  const rx = u.w / 2;
  const y = u.y + fraction * u.h;
  const normalizedY = (y - cy) / ry;
  const x = u.x + rx - rx * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
  return [x, y];
}

function pointOnRightArc(u, fraction) {
  const cy = u.y + u.h / 2;
  const ry = u.h / 2;
  const rx = u.w / 2;
  const y = u.y + fraction * u.h;
  const normalizedY = (y - cy) / ry;
  const x = u.x + rx + rx * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
  return [x, y];
}

function actorAnchor(a) { return [a.x + 145, a.y + 66]; }
function polyline(points) { return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "); }
function mxPoints(points) { return `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>`; }

function usecaseHtml(u) {
  const main = esc(u.label).replace(/\n/g, "&lt;br&gt;");
  if (!u.condition) return main;
  const condition = esc(u.condition).replace(/\n/g, "&lt;br&gt;");
  return `${main}&lt;br&gt;&lt;span style=&quot;font-size:11px;font-style:italic;color:#5f6666&quot;&gt;${condition}&lt;/span&gt;`;
}

function drawioXml() {
  const cells = [];
  cells.push(`<mxCell id="system" value="Système Matchia — Authentification et contexte d'accès" style="swimlane;html=1;startSize=42;horizontal=1;rounded=0;collapsible=0;container=0;strokeColor=#4f5b5b;strokeWidth=1.6;fillColor=#ffffff;fontFamily=Arial;fontSize=17;fontStyle=1;align=left;spacingLeft=14;" vertex="1" parent="1"><mxGeometry x="300" y="60" width="1900" height="1450" as="geometry"/></mxCell>`);

  for (const a of actors) {
    cells.push(`<mxCell id="${a.id}" value="${esc(a.label)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeColor=#555555;fillColor=#ffffff;fontFamily=Arial;fontSize=14;align=center;" vertex="1" parent="1"><mxGeometry x="${a.x}" y="${a.y}" width="150" height="135" as="geometry"/></mxCell>`);
  }

  for (const u of usecases) {
    const fill = u.auth ? "#dbe9ff" : u.extension ? "#fff2cc" : "#d7f4ef";
    const stroke = u.auth ? "#7da3d6" : u.extension ? "#c79a2b" : "#5d7774";
    cells.push(`<mxCell id="${u.id}" value="${usecaseHtml(u)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.45;fontFamily=Arial;fontSize=14;align=center;verticalAlign=middle;spacing=7;" vertex="1" parent="1"><mxGeometry x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" as="geometry"/></mxCell>`);
  }

  actors.forEach((a, index) => {
    const entryY = (0.16 + index * 0.225).toFixed(3);
    cells.push(`<mxCell id="assoc_${index}" style="edgeStyle=none;rounded=0;html=1;endArrow=none;strokeColor=#555555;strokeWidth=1.25;exitX=1;exitY=0.5;entryX=0;entryY=${entryY};entryDx=0;entryDy=0;" edge="1" parent="1" source="${a.id}" target="u_auth"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });

  includes.forEach((target, index) => {
    const exitY = (0.10 + index * 0.16).toFixed(3);
    cells.push(`<mxCell id="include_${index}" value="«include»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=classic;endFill=1;strokeColor=#14a9b5;strokeWidth=1.35;fontColor=#39747a;fontFamily=Arial;fontSize=12;labelBackgroundColor=#ffffff;exitX=1;exitY=${exitY};exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="u_auth" target="${target}"><mxGeometry x="-0.12" y="-10" relative="1" as="geometry"><mxPoint x="0" y="0" as="offset"/></mxGeometry></mxCell>`);
  });

  cells.push(`<mxCell id="extend_tenant" value="«extend»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=open;endFill=0;strokeColor=#c28b18;strokeWidth=1.35;fontColor=#8a6515;fontFamily=Arial;fontSize=12;labelBackgroundColor=#ffffff;exitX=0.55;exitY=0;entryX=0.32;entryY=1;" edge="1" parent="1" source="u_tenant" target="u_auth"><mxGeometry x="-0.15" y="-10" relative="1" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="extend_refusal" value="«extend»" style="edgeStyle=none;rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=open;endFill=0;strokeColor=#c28b18;strokeWidth=1.35;fontColor=#8a6515;fontFamily=Arial;fontSize=12;labelBackgroundColor=#ffffff;exitX=0.1;exitY=0.1;entryX=0.62;entryY=1;" edge="1" parent="1" source="u_refusal" target="u_auth"><mxGeometry x="-0.16" y="-10" relative="1" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="extend_renew" value="«extend»" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;dashPattern=6 5;endArrow=open;endFill=0;strokeColor=#c28b18;strokeWidth=1.35;fontColor=#8a6515;fontFamily=Arial;fontSize=12;labelBackgroundColor=#ffffff;exitX=0;exitY=0.25;entryX=0.82;entryY=1;" edge="1" parent="1" source="u_renew" target="u_auth"><mxGeometry x="-0.26" y="-10" relative="1" as="geometry">${mxPoints([[1250, 1080], [1080, 1080], [1080, 710], [980, 710]])}</mxGeometry></mxCell>`);

  cells.push(`<mxCell id="legend" value="Association : trait plein&#xa;«include» : sous-fonction obligatoire&#xa;«extend» : comportement conditionnel" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontFamily=Arial;fontSize=11;fontColor=#666666;" vertex="1" parent="1"><mxGeometry x="1530" y="1370" width="560" height="80" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="caption" value="Figure 3.5 — Diagramme de cas d’utilisation détaillé de l’authentification" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=16;fontStyle=2;fontColor=#444444;" vertex="1" parent="1"><mxGeometry x="550" y="1570" width="1200" height="35" as="geometry"/></mxCell>`);

  const model = `<mxGraphModel dx="${W}" dy="${H}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
  return `<mxfile host="app.diagrams.net" modified="2026-09-05T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="matchia-auth-detail" name="Authentification détaillée">${model}</diagram></mxfile>`;
}

function actorSvg(a) {
  const cx = a.x + 75;
  const top = a.y + 8;
  const labelY = a.y + 112;
  return `<g><circle cx="${cx}" cy="${top + 15}" r="14" fill="#fff" stroke="#555" stroke-width="1.4"/><path d="M${cx},${top + 29} L${cx},${top + 67} M${cx - 25},${top + 43} L${cx + 25},${top + 43} M${cx},${top + 67} L${cx - 22},${top + 94} M${cx},${top + 67} L${cx + 22},${top + 94}" fill="none" stroke="#555" stroke-width="1.4"/><text x="${cx}" y="${labelY}" text-anchor="middle" class="actor">${esc(a.label)}</text></g>`;
}

function usecaseSvg(u) {
  const [cx, cy] = center(u);
  const lines = u.label.split("\n");
  const conditionLines = u.condition ? u.condition.split("\n") : [];
  const lineGap = 20;
  const totalLines = lines.length + conditionLines.length;
  const startY = cy - ((totalLines - 1) * lineGap) / 2;
  const main = lines.map((line, i) => `<tspan x="${cx}" y="${startY + i * lineGap}">${esc(line)}</tspan>`).join("");
  const condition = conditionLines.map((line, i) => `<tspan x="${cx}" y="${startY + (lines.length + i) * lineGap}" class="condition">${esc(line)}</tspan>`).join("");
  const fill = u.auth ? "#dbe9ff" : u.extension ? "#fff2cc" : "#d7f4ef";
  const stroke = u.auth ? "#7da3d6" : u.extension ? "#c79a2b" : "#5d7774";
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="${u.w / 2}" ry="${u.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.45"/><text x="${cx}" y="${startY}" text-anchor="middle" class="usecase">${main}${condition}</text></g>`;
}

function labelAt(a, b, ratio, textValue, cssClass, width = 92) {
  const x = a[0] + (b[0] - a[0]) * ratio;
  const y = a[1] + (b[1] - a[1]) * ratio - 8;
  return `<rect x="${x - width / 2}" y="${y - 14}" width="${width}" height="20" rx="3" fill="#fff" opacity="0.95"/><text x="${x}" y="${y}" text-anchor="middle" class="${cssClass}">${textValue}</text>`;
}

function svgXml() {
  const auth = byId.get("u_auth");
  const edges = [];

  actors.forEach((a, index) => {
    const end = pointOnLeftArc(auth, 0.16 + index * 0.225);
    edges.push(`<path d="${polyline([actorAnchor(a), end])}" class="association"/>`);
  });

  includes.forEach((targetId, index) => {
    const target = byId.get(targetId);
    const start = pointOnRightArc(auth, 0.10 + index * 0.16);
    const end = ellipsePoint(target, start);
    edges.push(`<path d="${polyline([start, end])}" class="include" marker-end="url(#tealArrow)"/>${labelAt(start, end, 0.44, "«include»", "include-label")}`);
  });

  const tenant = byId.get("u_tenant");
  const refusal = byId.get("u_refusal");
  const renew = byId.get("u_renew");
  const tenantStart = ellipsePoint(tenant, center(auth));
  const tenantEnd = ellipsePoint(auth, center(tenant));
  const refusalStart = ellipsePoint(refusal, center(auth));
  const refusalEnd = ellipsePoint(auth, center(refusal));
  const renewRoute = [[1250, 1080], [1080, 1080], [1080, 710], [980, 710]];
  const renewStart = ellipsePoint(renew, renewRoute[0]);
  const renewEnd = ellipsePoint(auth, renewRoute[renewRoute.length - 1]);
  edges.push(`<path d="${polyline([tenantStart, tenantEnd])}" class="extend" marker-end="url(#amberArrow)"/>${labelAt(tenantStart, tenantEnd, 0.46, "«extend»", "extend-label")}`);
  edges.push(`<path d="${polyline([refusalStart, refusalEnd])}" class="extend" marker-end="url(#amberArrow)"/>${labelAt(refusalStart, refusalEnd, 0.48, "«extend»", "extend-label")}`);
  edges.push(`<path d="${polyline([renewStart, ...renewRoute, renewEnd])}" class="extend" marker-end="url(#amberArrow)"/>${labelAt(renewRoute[1], renewRoute[2], 0.45, "«extend»", "extend-label")}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Diagramme détaillé du cas d'utilisation S'authentifier</title>
  <desc id="desc">Quatre rôles utilisateurs à gauche, fonctions obligatoires incluses à droite et comportements conditionnels sous le cas principal.</desc>
  <defs>
    <marker id="tealArrow" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,5.5 L0,11 z" fill="#14a9b5"/></marker>
    <marker id="amberArrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#c28b18" stroke-width="1.6"/></marker>
    <style>
      .boundary-title{font:bold 17px Arial,sans-serif;fill:#263333}.actor{font:14px Arial,sans-serif;fill:#333}
      .usecase{font:14px Arial,sans-serif;fill:#222;dominant-baseline:middle}.condition{font:italic 11px Arial,sans-serif;fill:#5f6666}
      .association{fill:none;stroke:#555;stroke-width:1.25}.include{fill:none;stroke:#14a9b5;stroke-width:1.35;stroke-dasharray:7 6}
      .extend{fill:none;stroke:#c28b18;stroke-width:1.35;stroke-dasharray:7 6}.include-label{font:12px Arial,sans-serif;fill:#39747a}
      .extend-label{font:12px Arial,sans-serif;fill:#8a6515}.legend{font:11px Arial,sans-serif;fill:#666}.caption{font:italic 16px Arial,sans-serif;fill:#444}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  <rect x="300" y="60" width="1900" height="1450" fill="#fff" stroke="#4f5b5b" stroke-width="1.6"/>
  <line x1="300" y1="102" x2="2200" y2="102" stroke="#4f5b5b" stroke-width="1.2"/>
  <text x="320" y="88" class="boundary-title">Système Matchia — Authentification et contexte d'accès</text>
  ${edges.join("\n  ")}
  ${actors.map(actorSvg).join("\n  ")}
  ${usecases.map(usecaseSvg).join("\n  ")}
  <g class="legend">
    <text x="1540" y="1380">Association : trait plein</text>
    <text x="1540" y="1405">«include» : sous-fonction obligatoire</text>
    <text x="1540" y="1430">«extend» : comportement conditionnel</text>
  </g>
  <text x="1150" y="1600" text-anchor="middle" class="caption">Figure 3.5 — Diagramme de cas d’utilisation détaillé de l’authentification</text>
</svg>`;
}

async function main() {
  const base = "Diagramme_cas_utilisation_detaille_Authentification_Matchia";
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
