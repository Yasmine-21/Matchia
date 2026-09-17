const fs = require('fs');
const path = require('path');

const {
  entities,
  enums,
  relations,
  domain,
  entityDomain,
  classConstraints,
  frontUsage,
} = require('./generate_class_diagram_matchia.js');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'deliverables', 'diagramme_classes_plantuml');
const OUT_FILE = path.join(OUT_DIR, 'Matchia_diagramme_classes_detaille.puml');

const EXPECTED = { entities: 39, enums: 27, relations: 75 };

const views = [
  {
    id: 'Matchia_01_Global_Detaille',
    title: 'MATCHIA — Diagramme de classes global détaillé',
    caption: 'Modèle métier JPA, cardinalités UML, contraintes et références logiques',
    entityNames: Object.keys(entities).sort(),
    groupByDomain: true,
    includeAllEnums: true,
  },
  {
    id: 'Matchia_02_Noyau_SaaS_Abonnement',
    title: 'MATCHIA — Noyau SaaS, demandes, abonnement et paiement',
    caption: 'Adhésion banque, sélection des services, souscription et paiements',
    entityNames: [
      'Bank', 'User', 'Marketplace', 'Request', 'RequestStoreSelection',
      'RequestModuleSelection', 'Store', 'Module', 'Subscription', 'Payment',
      'Notification', 'AuditLog',
    ],
  },
  {
    id: 'Matchia_03_Catalogue_Marketplace',
    title: 'MATCHIA — Catalogue, stores, modules et marketplace',
    caption: 'Catalogue central, affectations et personnalisation des marketplaces',
    entityNames: [
      'Bank', 'Marketplace', 'MarketplaceStore', 'MarketplaceStoreBanner',
      'MarketplaceStoreModule', 'Store', 'Module', 'ModuleStore',
      'ModuleStoreParameter', 'Content', 'ContentVisibility', 'MarketplaceContent',
      'Product', 'ProductParameterDefinition', 'ProductParameterValue',
    ],
  },
  {
    id: 'Matchia_04_Dealer_Contrats',
    title: 'MATCHIA — Concessionnaires, partenariats et contrats',
    caption: 'Inscription dealer, catalogue, contractualisation et publication produit',
    entityNames: [
      'DealerAccountRequest', 'User', 'Dealer', 'Store', 'Bank', 'Marketplace',
      'DealerBankPartnership', 'PartnershipContract', 'DealerProduct',
      'DealerProductParameterValue', 'DealerProductDocument',
      'DealerProductCatalogImage', 'ProductParameterDefinition',
      'ProductPublicationRequest',
    ],
  },
  {
    id: 'Matchia_05_Financement_Client',
    title: 'MATCHIA — Financement client',
    caption: 'Simulation, dépôt, pièces justificatives et traitement bancaire',
    entityNames: [
      'User', 'Bank', 'Store', 'Product', 'DealerProduct', 'FinancingRequest',
      'FinancingRequestDocument', 'RequiredFinancingDocument', 'Notification',
    ],
  },
  {
    id: 'Matchia_06_Securite_Audit',
    title: 'MATCHIA — Sécurité, notifications et audit',
    caption: 'Sessions, vérifications, réinitialisation, notifications et traçabilité',
    entityNames: [
      'User', 'Bank', 'Dealer', 'Marketplace', 'Request', 'RefreshToken',
      'PasswordResetToken', 'JoinEmailVerification',
      'ClientRegistrationVerification', 'Notification', 'AuditLog',
    ],
  },
  {
    id: 'Matchia_07_Enumerations',
    title: 'MATCHIA — Énumérations métier',
    caption: 'Valeurs exactes utilisées par les entités JPA',
    entityNames: [],
    includeAllEnums: true,
    enumsOnly: true,
  },
];

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function normalizeType(type) {
  return String(type)
    .replace(/java\.lang\./g, '')
    .replace(/java\.time\./g, '')
    .replace(/java\.math\./g, '')
    .replace(/java\.util\./g, '');
}

function stereotypeForField(field) {
  if (field.marker === 'PK') return ' <<PK>>';
  if (field.marker === 'FK') return ' <<FK>>';
  if (field.marker === 'REL') return ' <<REL>>';
  if (field.marker === 'ENUM') return ' <<ENUM>>';
  return '';
}

function renderField(field) {
  const multiplicity = field.multiplicity ? ` ${field.multiplicity}` : '';
  const tags = field.tags?.length ? ` {${field.tags.join(', ')}}` : '';
  return `  - ${field.name} : ${normalizeType(field.type)}${multiplicity}${tags}${stereotypeForField(field)}`;
}

function renderEntity(entityName) {
  const entity = entities[entityName];
  if (!entity) throw new Error(`Entité inconnue dans une vue PlantUML : ${entityName}`);

  const lines = [];
  lines.push(`' Interfaces/front : ${frontUsage[entityName] || 'usage interne'}`);
  lines.push(`class ${entityName} <<entity>> {`);
  entity.fields.forEach((field) => lines.push(renderField(field)));

  if (entity.operations?.length) {
    lines.push('  .. Opérations métier ..');
    entity.operations.forEach((operation) => lines.push(`  ${operation}`));
  }

  if (classConstraints[entityName]?.length) {
    lines.push('  .. Contraintes ..');
    classConstraints[entityName].forEach((constraint) => {
      lines.push(`  {field} {${escapeText(constraint)}}`);
    });
  }

  lines.push('}');
  return lines.join('\n');
}

function renderEnum(enumName) {
  const values = enums[enumName];
  if (!values) throw new Error(`Énumération inconnue : ${enumName}`);
  return [
    `enum ${enumName} <<enumeration>> {`,
    ...values.map((value) => `  ${escapeText(value)}`),
    '}',
  ].join('\n');
}

function enumsUsedBy(entityNames) {
  const enumNames = new Set(Object.keys(enums));
  const used = new Set();
  entityNames.forEach((entityName) => {
    entities[entityName].fields.forEach((field) => {
      const tokens = normalizeType(field.type).match(/[A-Za-z_]\w*/g) || [];
      tokens.filter((token) => enumNames.has(token)).forEach((token) => used.add(token));
    });
  });
  return [...used].sort();
}

function renderEnumDependencies(entityNames, enumNames) {
  const visibleEnums = new Set(enumNames);
  const dependencies = new Set();

  entityNames.forEach((entityName) => {
    entities[entityName].fields.forEach((field) => {
      const tokens = normalizeType(field.type).match(/[A-Za-z_]\w*/g) || [];
      tokens.filter((token) => visibleEnums.has(token)).forEach((enumName) => {
        dependencies.add(`${entityName} ..> ${enumName} : utilise`);
      });
    });
  });

  return [...dependencies].sort().join('\n');
}

function renderRelation(relation) {
  const left = `${relation.from} "${escapeText(relation.a)}"`;
  const right = `"${escapeText(relation.b)}" ${relation.to}`;
  const label = escapeText(relation.label);

  if (relation.kind === 'composition') {
    return `${left} *-- ${right} : ${label}`;
  }
  if (relation.kind === 'soft') {
    return `${left} ..> ${right} : ${label} <<référence logique>>`;
  }
  return `${left} -- ${right} : ${label}`;
}

function commonHeader(view) {
  return [
    `@startuml ${view.id}`,
    `title ${escapeText(view.title)}`,
    `caption ${escapeText(view.caption)}`,
    '',
    "' Palette bleu clair à fort contraste, adaptée à l'impression et à l'écran.",
    'skinparam backgroundColor #FFFFFF',
    'skinparam shadowing false',
    'skinparam linetype ortho',
    'skinparam packageStyle rectangle',
    'skinparam roundcorner 6',
    'skinparam dpi 150',
    'skinparam defaultFontName Arial',
    'skinparam defaultFontColor #172B4D',
    'skinparam ArrowColor #2F75B5',
    'skinparam ArrowFontColor #172B4D',
    'skinparam ArrowThickness 1.5',
    'skinparam ClassBackgroundColor #EAF4FF',
    'skinparam ClassBorderColor #2F75B5',
    'skinparam ClassFontColor #172B4D',
    'skinparam ClassHeaderBackgroundColor #CFE8FF',
    'skinparam ClassAttributeFontColor #172B4D',
    'skinparam ClassStereotypeFontColor #1F4E79',
    'skinparam EnumBackgroundColor #F3F0FF',
    'skinparam EnumBorderColor #7A6FB0',
    'skinparam EnumFontColor #2D2857',
    'skinparam PackageBackgroundColor #F8FBFF',
    'skinparam PackageBorderColor #6B93B8',
    'skinparam PackageFontColor #1F4E79',
    'skinparam NoteBackgroundColor #FFF9DB',
    'skinparam NoteBorderColor #C9A227',
    'hide circle',
    'hide empty methods',
    'left to right direction',
    '',
    'legend left',
    '  |= Symbole |= Signification |',
    '  | <<PK>> | Clé primaire |',
    '  | <<FK>> | Relation vers une entité |',
    '  | <<REL>> | Collection d’entités |',
    '  | <<ENUM>> | Attribut énuméré |',
    '  | *-- | Composition / cycle de vie dépendant |',
    '  | -- | Association structurelle |',
    '  | ..> | Référence logique sans contrainte FK |',
    'endlegend',
    '',
  ].join('\n');
}

function renderGroupedEntities(entityNames) {
  const byDomain = new Map();
  entityNames.forEach((entityName) => {
    const domainKey = entityDomain[entityName] || 'core';
    if (!byDomain.has(domainKey)) byDomain.set(domainKey, []);
    byDomain.get(domainKey).push(entityName);
  });

  return Object.keys(domain).filter((key) => byDomain.has(key)).map((key) => {
    const meta = domain[key];
    const body = byDomain.get(key).sort().map(renderEntity).join('\n\n');
    return `package "${escapeText(meta.label)}" as package_${key} ${meta.fill} {\n${body}\n}`;
  }).join('\n\n');
}

function renderView(view) {
  const entityNames = [...view.entityNames];
  const entitySet = new Set(entityNames);
  const enumNames = view.includeAllEnums ? Object.keys(enums).sort() : enumsUsedBy(entityNames);
  const visibleRelations = relations.filter((relation) =>
    entitySet.has(relation.from) && entitySet.has(relation.to));

  const parts = [commonHeader(view)];

  if (!view.enumsOnly) {
    parts.push(view.groupByDomain
      ? renderGroupedEntities(entityNames)
      : entityNames.map(renderEntity).join('\n\n'));
  }

  if (enumNames.length) {
    parts.push(`package "Énumérations métier" as package_enums #F8F6FF {\n${enumNames.map(renderEnum).join('\n\n')}\n}`);
  }

  if (!view.enumsOnly && visibleRelations.length) {
    parts.push("' Associations métier et multiplicités UML");
    parts.push(visibleRelations.map(renderRelation).join('\n'));
  }

  if (!view.enumsOnly && enumNames.length) {
    const enumDependencies = renderEnumDependencies(entityNames, enumNames);
    if (enumDependencies) {
      parts.push("' Dépendances de typage vers les énumérations");
      parts.push(enumDependencies);
    }
  }

  parts.push('@enduml');
  return parts.filter(Boolean).join('\n\n');
}

function validateModel() {
  const counts = {
    entities: Object.keys(entities).length,
    enums: Object.keys(enums).length,
    relations: relations.length,
  };

  Object.entries(EXPECTED).forEach(([key, expected]) => {
    if (counts[key] !== expected) {
      throw new Error(`Validation échouée : ${key}=${counts[key]}, attendu=${expected}`);
    }
  });

  relations.forEach((relation, index) => {
    if (!entities[relation.from] || !entities[relation.to]) {
      throw new Error(`Relation #${index + 1} invalide : ${relation.from} -> ${relation.to}`);
    }
    if (!relation.a || !relation.b || !relation.label) {
      throw new Error(`Relation #${index + 1} incomplète`);
    }
  });

  views.forEach((view) => {
    view.entityNames.forEach((entityName) => {
      if (!entities[entityName]) {
        throw new Error(`Vue ${view.id} : entité absente du backend (${entityName})`);
      }
    });
  });

  return counts;
}

const counts = validateModel();
const generatedAt = new Date().toISOString();
const preamble = [
  "' ============================================================================",
  "' MATCHIA — DIAGRAMMES DE CLASSES UML DÉTAILLÉS",
  "' Généré depuis les entités et énumérations JPA du backend.",
  `' Date de génération : ${generatedAt}`,
  `' Contenu vérifié : ${counts.entities} entités, ${counts.enums} énumérations, ${counts.relations} relations.`,
  "' Le fichier comporte 7 blocs @startuml indépendants et entièrement éditables.",
  "' ============================================================================",
  '',
].join('\n');

const plantUml = preamble + views.map(renderView).join('\n\n\n');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, plantUml, 'utf8');

const readme = [
  'MATCHIA — DIAGRAMME DE CLASSES PLANTUML',
  '',
  'Fichier principal : Matchia_diagramme_classes_detaille.puml',
  '',
  'Le script contient 7 diagrammes indépendants :',
  '1. Vue globale détaillée',
  '2. Noyau SaaS et abonnement',
  '3. Catalogue et marketplace',
  '4. Dealer, partenariats et contrats',
  '5. Financement client',
  '6. Sécurité et audit',
  '7. Énumérations métier',
  '',
  `Inventaire : ${counts.entities} entités, ${counts.enums} énumérations et ${counts.relations} relations métier.`,
  '',
  'Le fichier est du texte UTF-8 : il est directement éditable dans PlantUML, IntelliJ,',
  'VS Code avec une extension PlantUML, ou tout éditeur compatible.',
  '',
  'La première vue est exhaustive. Les autres vues réutilisent exactement le même',
  'modèle, mais filtré par sous-domaine afin de faciliter la lecture et la présentation.',
].join('\n');

fs.writeFileSync(path.join(OUT_DIR, 'LISEZ-MOI.txt'), readme, 'utf8');

console.log(JSON.stringify({
  output: OUT_FILE,
  diagrams: views.length,
  ...counts,
}, null, 2));
