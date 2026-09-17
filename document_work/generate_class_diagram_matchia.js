const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTITY_DIR = path.join(ROOT, 'MatchiaBackend', 'src', 'main', 'java', 'org', 'matchia', 'matchiabackend', 'entity');
const ENUM_DIR = path.join(ENTITY_DIR, 'enums');
const OUT_DIR = path.join(ROOT, 'deliverables', 'diagramme_classes_drawio_editable');
const OUT_FILE = path.join(OUT_DIR, 'Matchia_diagramme_classes_detaille_editable.drawio');
const CORE_OUT_FILE = path.join(OUT_DIR, 'Matchia_diagramme_classes_SAAS_Abonnement_corrige.drawio');
const CATALOG_OUT_FILE = path.join(OUT_DIR, 'Matchia_diagramme_classes_Catalogue_Marketplace_corrige.drawio');
const DEALER_OUT_FILE = path.join(OUT_DIR, 'Matchia_diagramme_classes_Concessionnaires_Contrats_Publication_corrige.drawio');

const domain = {
  core:     { label: 'Noyau SaaS, tenant et abonnement', fill: '#EAF3FB', stroke: '#2F75B5' },
  catalog:  { label: 'Catalogue, stores et marketplace', fill: '#E2F0D9', stroke: '#548235' },
  dealer:   { label: 'Concessionnaires et partenariats', fill: '#FCE4D6', stroke: '#C55A11' },
  finance:  { label: 'Financement client', fill: '#E4DFEC', stroke: '#7030A0' },
  security: { label: 'Sécurité, notifications et audit', fill: '#FFF2CC', stroke: '#BF9000' },
};

const entityDomain = {
  Bank: 'core', User: 'core', Request: 'core', RequestStoreSelection: 'core', RequestModuleSelection: 'core',
  Subscription: 'core', Payment: 'core',
  Store: 'catalog', Module: 'catalog', ModuleStore: 'catalog', ModuleStoreParameter: 'catalog',
  Marketplace: 'catalog', MarketplaceStore: 'catalog', MarketplaceStoreBanner: 'catalog', MarketplaceStoreModule: 'catalog',
  Content: 'catalog', ContentVisibility: 'catalog', MarketplaceContent: 'catalog',
  Product: 'catalog', ProductParameterDefinition: 'catalog', ProductParameterValue: 'catalog',
  Dealer: 'dealer', DealerAccountRequest: 'dealer', DealerBankPartnership: 'dealer', PartnershipContract: 'dealer',
  DealerProduct: 'dealer', DealerProductCatalogImage: 'dealer', DealerProductDocument: 'dealer',
  DealerProductParameterValue: 'dealer', ProductPublicationRequest: 'dealer',
  FinancingRequest: 'finance', FinancingRequestDocument: 'finance', RequiredFinancingDocument: 'finance',
  RefreshToken: 'security', PasswordResetToken: 'security', JoinEmailVerification: 'security',
  ClientRegistrationVerification: 'security', Notification: 'security', AuditLog: 'security',
};

const frontUsage = {
  Bank: 'SaaS, banque, public', User: 'auth, SaaS, banque, client', Request: 'adhésion, demandes, renouvellement',
  RequestStoreSelection: 'récapitulatif de demande', RequestModuleSelection: 'récapitulatif de demande',
  Subscription: 'offres et abonnement', Payment: 'paiement et revenus', Marketplace: 'branding et portail public',
  MarketplaceStore: 'matrice et stores assignés', MarketplaceStoreBanner: 'carrousel du store',
  MarketplaceStoreModule: 'modules visibles', Store: 'catalogue et navigation', Module: 'catalogue fonctionnel',
  ModuleStore: 'affectation store/module', ModuleStoreParameter: 'paramétrage des modules', Content: 'contenus SaaS',
  ContentVisibility: 'visibilité par marketplace', MarketplaceContent: 'contenus propres à une banque',
  Product: 'produits banque historiques', ProductParameterDefinition: 'schéma de produit',
  ProductParameterValue: 'valeurs produit', Dealer: 'annuaire et espace concessionnaire',
  DealerAccountRequest: 'inscription concessionnaire', DealerBankPartnership: 'partenariats banque/dealer',
  PartnershipContract: 'contrats et prévisualisation PDF', DealerProduct: 'catalogue concessionnaire',
  DealerProductCatalogImage: 'galerie produit', DealerProductDocument: 'documents produit',
  DealerProductParameterValue: 'caractéristiques produit', ProductPublicationRequest: 'validation de publication',
  FinancingRequest: 'simulateur et dossiers client', FinancingRequestDocument: 'pièces du dossier',
  RequiredFinancingDocument: 'pièces exigées', RefreshToken: 'session persistante',
  PasswordResetToken: 'mot de passe oublié', JoinEmailVerification: 'vérification adhésion banque',
  ClientRegistrationVerification: 'vérification inscription client', Notification: 'panneaux de notifications',
  AuditLog: 'audit SaaS et export',
};

const explicitOperations = {
  Marketplace: ['+ getBannerImageUrl(): String', '+ setBannerImageUrl(url: String): void'],
  RefreshToken: ['+ isActive(): boolean'],
  PasswordResetToken: ['+ isUsable(): boolean'],
};

const classConstraints = {
  Dealer: ['unique(registrationNumber)', 'unique(email)'],
  Subscription: ['unique(request)'],
  MarketplaceStore: ['unique(marketplace, store)'],
  MarketplaceStoreModule: ['unique(marketplaceStore, module)'],
  ContentVisibility: ['unique(marketplace, content)'],
  ProductParameterDefinition: ['unique(store, name)'],
  ProductParameterValue: ['unique(product, parameterDefinition)'],
  DealerBankPartnership: ['unique(dealer, bank, store)'],
  PartnershipContract: ['unique(partnership, versionNumber)', 'unique(contractNumber)'],
  DealerProductParameterValue: ['unique(product, parameterDefinition)'],
  ProductPublicationRequest: ['unique(product, bank, store)'],
  FinancingRequestDocument: ['unique(financingRequest, documentType)', 'unique(storedFilename)'],
  RequiredFinancingDocument: ['unique(bank, store, documentType)'],
  RefreshToken: ['unique(tokenHash)', 'unique(tokenId)'],
  PasswordResetToken: ['unique(tokenHash)'],
  JoinEmailVerification: ['unique(verificationTokenHash)'],
};

// Invariants imposés par les services métier même lorsque l'annotation JPA
// historique n'indique pas encore explicitement nullable=false/optional=false.
const fieldMultiplicityOverrides = {
  'Marketplace.bank': '[1]',
  'MarketplaceStore.marketplace': '[1]',
  'MarketplaceStore.store': '[1]',
  'MarketplaceStoreModule.marketplaceStore': '[1]',
  'MarketplaceStoreModule.module': '[1]',
  'ModuleStore.store': '[1]',
  'ModuleStore.module': '[1]',
  'ModuleStoreParameter.moduleStore': '[1]',
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function parseEntities() {
  const names = fs.readdirSync(ENTITY_DIR).filter((f) => f.endsWith('.java')).map((f) => path.basename(f, '.java'));
  const entityNames = new Set(names);
  const entities = {};
  for (const file of fs.readdirSync(ENTITY_DIR).filter((f) => f.endsWith('.java')).sort()) {
    const source = fs.readFileSync(path.join(ENTITY_DIR, file), 'utf8');
    const classMatch = source.match(/public\s+class\s+(\w+)/);
    if (!classMatch) continue;
    const name = classMatch[1];
    const fields = [];
    const fieldRx = /private\s+([A-Za-z0-9_.$<>?,\s]+?)\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/g;
    let match;
    while ((match = fieldRx.exec(source))) {
      const type = match[1].replace(/\s+/g, ' ').trim().replace(/^java\.util\./, '');
      const field = match[2];
      if (type.includes(' return ') || type.includes(' class ')) continue;
      const before = source.slice(0, match.index);
      const annotationStart = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}')) + 1;
      const annotations = before.slice(annotationStart);
      let marker = '';
      if (field === 'id') marker = 'PK';
      else {
        const related = [...entityNames].some((entity) => type === entity || type.includes(`<${entity}>`));
        if (related) marker = type.includes('List<') ? 'REL' : 'FK';
        else if (type.endsWith('Enum') || type === 'NotificationRecipientScope') marker = 'ENUM';
      }
      const related = [...entityNames].some((entity) => type === entity || type.includes(`<${entity}>`));
      const collection = /(?:List|Set|Collection)</.test(type);
      const required = /nullable\s*=\s*false|optional\s*=\s*false/.test(annotations) || /^(?:boolean|int|long|double)$/.test(type);
      const inferredMultiplicity = collection ? '[0..*]' : related ? (required ? '[1]' : '[0..1]') : '';
      const multiplicity = fieldMultiplicityOverrides[`${name}.${field}`] || inferredMultiplicity;
      const tags = [];
      if (field === 'id') tags.push('id');
      if (/@GeneratedValue/.test(annotations)) tags.push('generated');
      if (/@Version/.test(annotations)) tags.push('version');
      if (/unique\s*=\s*true/.test(annotations)) tags.push('unique');
      if (required && !related) tags.push('required');
      if (/@CreationTimestamp/.test(annotations)) tags.push('created');
      if (/@UpdateTimestamp/.test(annotations)) tags.push('updated');
      fields.push({ name: field, type, marker, multiplicity, tags });
    }
    entities[name] = { name, fields, operations: explicitOperations[name] || [], domain: entityDomain[name] || 'core' };
  }
  return entities;
}

function parseEnums() {
  const enums = {};
  for (const file of fs.readdirSync(ENUM_DIR).filter((f) => f.endsWith('.java')).sort()) {
    const source = fs.readFileSync(path.join(ENUM_DIR, file), 'utf8');
    const match = source.match(/public\s+enum\s+(\w+)\s*\{([\s\S]*?)\}/);
    if (!match) continue;
    const body = match[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const values = body.split(',').map((v) => v.replace(/;.*/, '').trim()).filter(Boolean);
    enums[match[1]] = values;
  }
  return enums;
}

const entities = parseEntities();
const enums = parseEnums();

const relations = [
  // Noyau multi-tenant, demandes, abonnement et paiement.
  { from: 'Bank', to: 'Marketplace', a: '1', b: '0..1', label: 'possède', kind: 'composition' },
  { from: 'Bank', to: 'User', a: '0..1', b: '0..*', label: 'utilisateurs' },
  { from: 'Dealer', to: 'User', a: '0..1', b: '0..*', label: 'comptes dealer' },
  { from: 'Bank', to: 'Request', a: '0..1', b: '0..*', label: 'demandes' },
  { from: 'Request', to: 'RequestStoreSelection', a: '1', b: '0..*', label: 'snapshot stores', kind: 'composition' },
  { from: 'RequestStoreSelection', to: 'RequestModuleSelection', a: '1', b: '0..*', label: 'snapshot modules', kind: 'composition' },
  { from: 'Request', to: 'Store', a: '0..*', b: '0..*', label: 'sélection active (request_store)' },
  { from: 'Request', to: 'Module', a: '0..*', b: '0..*', label: 'sélection agrégée (request_module)' },
  { from: 'RequestStoreSelection', to: 'Store', a: '0..*', b: '0..1', label: 'storeId', kind: 'soft' },
  { from: 'RequestModuleSelection', to: 'Module', a: '0..*', b: '0..1', label: 'moduleId', kind: 'soft' },
  { from: 'Request', to: 'Request', a: '0..1', b: '0..*', label: 'originale / renouvellements', kind: 'self' },
  { from: 'Request', to: 'Subscription', a: '1', b: '0..1', label: 'crée abonnement' },
  { from: 'Subscription', to: 'Request', a: '0..1', b: '0..*', label: 'demandes de renouvellement', variant: 'renewalRequests' },
  { from: 'Marketplace', to: 'Subscription', a: '1', b: '0..*', label: 'abonnements' },
  { from: 'Request', to: 'Payment', a: '1', b: '0..*', label: 'paiements' },
  { from: 'Subscription', to: 'Payment', a: '0..1', b: '0..*', label: 'historique' },
  { from: 'Request', to: 'Payment', a: '0..1', b: '0..*', label: 'autorise renouvellement', variant: 'renewal' },
  { from: 'Payment', to: 'Payment', a: '0..1', b: '0..*', label: 'paiement renouvelé', kind: 'self' },

  // Catalogue central, affectations et personnalisation marketplace.
  { from: 'Marketplace', to: 'MarketplaceStore', a: '1', b: '0..*', label: 'stores affectés', kind: 'composition' },
  { from: 'Store', to: 'MarketplaceStore', a: '1', b: '0..*', label: 'affectations' },
  { from: 'MarketplaceStore', to: 'MarketplaceStoreBanner', a: '1', b: '0..*', label: 'carrousel', kind: 'composition' },
  { from: 'MarketplaceStore', to: 'MarketplaceStoreModule', a: '1', b: '0..*', label: 'modules visibles', kind: 'composition' },
  { from: 'Module', to: 'MarketplaceStoreModule', a: '1', b: '0..*', label: 'affectations' },
  { from: 'Store', to: 'ModuleStore', a: '1', b: '0..*', label: 'configuration modules' },
  { from: 'Module', to: 'ModuleStore', a: '1', b: '0..*', label: 'configuration stores' },
  { from: 'ModuleStore', to: 'ModuleStoreParameter', a: '1', b: '0..*', label: 'paramètres', kind: 'composition' },
  { from: 'Store', to: 'Content', a: '1', b: '0..*', label: 'contenus catalogue', kind: 'composition' },
  { from: 'Marketplace', to: 'ContentVisibility', a: '1', b: '0..*', label: 'règles de visibilité' },
  { from: 'Content', to: 'ContentVisibility', a: '1', b: '0..*', label: 'visibilités' },
  { from: 'Marketplace', to: 'MarketplaceContent', a: '1', b: '0..*', label: 'contenus personnalisés', kind: 'composition' },
  { from: 'Store', to: 'MarketplaceContent', a: '0..1', b: '0..*', label: 'cible store' },
  { from: 'Bank', to: 'Product', a: '1', b: '0..*', label: 'produits banque' },
  { from: 'Store', to: 'Product', a: '1', b: '0..*', label: 'type de produit' },
  { from: 'Product', to: 'ProductParameterValue', a: '1', b: '0..*', label: 'valeurs', kind: 'composition' },
  { from: 'Store', to: 'ProductParameterDefinition', a: '1', b: '0..*', label: 'définit le schéma' },
  { from: 'ProductParameterDefinition', to: 'ProductParameterValue', a: '1', b: '0..*', label: 'instancie' },

  // Concessionnaires, catalogue dealer, partenariat et publication.
  { from: 'Store', to: 'Dealer', a: '1', b: '0..*', label: 'spécialité' },
  { from: 'Store', to: 'DealerAccountRequest', a: '1', b: '0..*', label: 'inscriptions' },
  { from: 'Dealer', to: 'DealerBankPartnership', a: '1', b: '0..*', label: 'partenariats' },
  { from: 'Bank', to: 'DealerBankPartnership', a: '1', b: '0..*', label: 'partenariats' },
  { from: 'Store', to: 'DealerBankPartnership', a: '1', b: '0..*', label: 'périmètre' },
  { from: 'DealerBankPartnership', to: 'PartnershipContract', a: '1', b: '0..*', label: 'versions contrat', kind: 'composition' },
  { from: 'Dealer', to: 'PartnershipContract', a: '1', b: '0..*', label: 'contractant' },
  { from: 'Bank', to: 'PartnershipContract', a: '1', b: '0..*', label: 'contractant' },
  { from: 'Store', to: 'PartnershipContract', a: '1', b: '0..*', label: 'objet du contrat' },
  { from: 'Dealer', to: 'DealerProduct', a: '1', b: '0..*', label: 'catalogue' },
  { from: 'Store', to: 'DealerProduct', a: '1', b: '0..*', label: 'catégorie' },
  { from: 'DealerProduct', to: 'DealerProductParameterValue', a: '1', b: '0..*', label: 'caractéristiques', kind: 'composition' },
  { from: 'ProductParameterDefinition', to: 'DealerProductParameterValue', a: '1', b: '0..*', label: 'définition' },
  { from: 'DealerProduct', to: 'DealerProductDocument', a: '1', b: '0..*', label: 'documents', kind: 'composition' },
  { from: 'DealerProduct', to: 'DealerProductCatalogImage', a: '1', b: '0..*', label: 'galerie', kind: 'composition' },
  { from: 'DealerProduct', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'demandes publication' },
  { from: 'Dealer', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'soumet' },
  { from: 'DealerBankPartnership', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'autorise' },
  { from: 'Bank', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'valide' },
  { from: 'Marketplace', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'publie dans' },
  { from: 'Store', to: 'ProductPublicationRequest', a: '1', b: '0..*', label: 'store cible' },

  // Financement client.
  { from: 'User', to: 'FinancingRequest', a: '1', b: '0..*', label: 'client' },
  { from: 'Bank', to: 'FinancingRequest', a: '1', b: '0..*', label: 'traite' },
  { from: 'Store', to: 'FinancingRequest', a: '1', b: '0..*', label: 'type financement' },
  { from: 'Product', to: 'FinancingRequest', a: '0..1', b: '0..*', label: 'produit banque' },
  { from: 'DealerProduct', to: 'FinancingRequest', a: '0..1', b: '0..*', label: 'produit dealer' },
  { from: 'User', to: 'FinancingRequest', a: '0..1', b: '0..*', label: 'processedBy', variant: 'processor' },
  { from: 'FinancingRequest', to: 'FinancingRequestDocument', a: '1', b: '0..*', label: 'pièces jointes', kind: 'composition' },
  { from: 'Bank', to: 'RequiredFinancingDocument', a: '1', b: '0..*', label: 'exigences' },
  { from: 'Store', to: 'RequiredFinancingDocument', a: '1', b: '0..*', label: 'exigences' },

  // Sécurité et références logiques (pas de contrainte FK JPA).
  { from: 'User', to: 'RefreshToken', a: '1', b: '0..*', label: 'sessions', kind: 'composition' },
  { from: 'User', to: 'PasswordResetToken', a: '1', b: '0..*', label: 'réinitialisations', kind: 'composition' },
  { from: 'Bank', to: 'ClientRegistrationVerification', a: '1', b: '0..*', label: 'inscriptions clients' },
  { from: 'Notification', to: 'Request', a: '0..*', b: '0..1', label: 'relatedRequestId', kind: 'soft' },
  { from: 'Notification', to: 'User', a: '0..*', b: '0..1', label: 'recipientId [USER]', kind: 'soft' },
  { from: 'Notification', to: 'Bank', a: '0..*', b: '0..1', label: 'recipientId [BANK]', kind: 'soft' },
  { from: 'AuditLog', to: 'User', a: '0..*', b: '0..1', label: 'actorId / affectedUserId', kind: 'soft' },
  { from: 'AuditLog', to: 'Bank', a: '0..*', b: '0..1', label: 'bankId', kind: 'soft' },
  { from: 'AuditLog', to: 'Marketplace', a: '0..*', b: '0..1', label: 'marketplaceId', kind: 'soft' },
];

let nextId = 2;
const id = (prefix = 'c') => `${prefix}${nextId++}`;

function geometry(x, y, w, h, relative = false) {
  return `<mxGeometry${relative ? ' relative="1"' : ` x="${x}" y="${y}" width="${w}" height="${h}"`} as="geometry"/>`;
}

function textCell(value, x, y, w, h, style = '') {
  const cellId = id('t');
  return `<mxCell id="${cellId}" value="${esc(value)}" style="text;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;fontFamily=Arial;${style}" vertex="1" parent="1">${geometry(x, y, w, h)}</mxCell>`;
}

function titleCells(title, subtitle, pageWidth) {
  return [
    textCell(title, 45, 18, pageWidth - 90, 38, 'fontSize=24;fontStyle=1;fontColor=#1F4E79;align=center;'),
    textCell(subtitle, 80, 58, pageWidth - 160, 42, 'fontSize=12;fontColor=#334155;align=center;'),
  ].join('');
}

function classValue(entity, compact = false) {
  if (compact) return `<b>${esc(entity.name)}</b>`;
  const attributes = entity.fields.map((f) => {
    const multiplicity = f.multiplicity ? ` ${f.multiplicity}` : '';
    const constraints = f.tags.length ? ` {${f.tags.join(', ')}}` : '';
    return `− ${esc(f.name)} : ${esc(f.type)}${esc(multiplicity)}${esc(constraints)}`;
  }).join('<br>');
  const operations = entity.operations.length ? `<hr>${entity.operations.map(esc).join('<br>')}` : '';
  const constraints = classConstraints[entity.name]?.length
    ? `<hr><div style="font-size:9px;text-align:left"><b>{contraintes}</b><br>${classConstraints[entity.name].map(esc).join('<br>')}</div>`
    : '';
  return `<div style="text-align:center"><span style="font-size:10px">«entity»</span><br><b>${esc(entity.name)}</b></div><hr><div style="text-align:left">${attributes}${operations}${constraints}</div>`;
}

function classCell(entityName, pos, compact = false, key = '') {
  const entity = entities[entityName];
  if (!entity) throw new Error(`Entité inconnue: ${entityName}`);
  const rowCount = compact ? 0 : entity.fields.length + entity.operations.length + (entity.operations.length ? 1 : 0) + (classConstraints[entity.name]?.length || 0) + (classConstraints[entity.name] ? 1 : 0);
  const h = pos.h || (compact ? 48 : Math.max(125, 68 + rowCount * 15));
  const w = pos.w || (compact ? 210 : 330);
  const cellId = `entity-${entityName}${key ? `-${key}` : ''}`;
  const centralStyle = pos.central
    ? 'fillColor=#D9ECFF;gradientColor=#B7D8F5;strokeColor=#1F4E79;strokeWidth=2.6;shadow=1;'
    : 'fillColor=#FFFFFF;gradientColor=#DCEEFF;strokeColor=#2F75B5;strokeWidth=1.8;shadow=0;';
  return {
    id: cellId,
    xml: `<mxCell id="${cellId}" value="${esc(classValue(entity, compact))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=9;fontFamily=Arial;fontSize=${compact ? 12 : 11};fontColor=#172B4D;${centralStyle}gradientDirection=south;" vertex="1" parent="1">${geometry(pos.x, pos.y, w, h)}</mxCell>`,
    h, w,
  };
}

function edgeCell(rel, suffix = '', ports = '') {
  const edgeId = id('e');
  const isSoft = rel.kind === 'soft';
  const isComposition = rel.kind === 'composition';
  const color = isSoft ? '#7F7F7F' : '#2F75B5';
  const variantPorts = ports || (rel.variant ? 'exitX=1;exitY=0.82;exitDx=0;exitDy=0;entryX=0;entryY=0.82;entryDx=0;entryDy=0' : '');
  const style = [
    'edgeStyle=orthogonalEdgeStyle', 'rounded=1', 'orthogonalLoop=1', 'jettySize=auto', 'html=1',
    `strokeColor=${color}`, `strokeWidth=${isSoft ? 1.5 : 2}`,
    isSoft ? 'dashed=1;dashPattern=6 4' : '',
    isComposition ? 'startArrow=diamond;startFill=1;startSize=14' : 'startArrow=none',
    'endArrow=none', variantPorts, 'fontFamily=Arial', 'fontSize=10', 'fontColor=#334155', 'labelBackgroundColor=#FFFFFF',
  ].filter(Boolean).join(';') + ';';
  const source = `entity-${rel.from}${suffix}`;
  const target = `entity-${rel.to}${suffix}`;
  const label = rel.kind === 'soft' ? `${rel.label} «référence logique»` : rel.label;
  return `<mxCell id="${edgeId}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>` +
    `<mxCell id="${id('l')}" value="${esc(rel.a)}" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontFamily=Arial;fontSize=10;fontStyle=1;labelBackgroundColor=#FFFFFF;" vertex="1" connectable="0" parent="${edgeId}"><mxGeometry x="-0.86" y="0" relative="1" as="geometry"><mxPoint x="0" y="-11" as="offset"/></mxGeometry></mxCell>` +
    `<mxCell id="${id('l')}" value="${esc(rel.b)}" style="edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontFamily=Arial;fontSize=10;fontStyle=1;labelBackgroundColor=#FFFFFF;" vertex="1" connectable="0" parent="${edgeId}"><mxGeometry x="0.86" y="0" relative="1" as="geometry"><mxPoint x="0" y="-11" as="offset"/></mxGeometry></mxCell>`;
}

function sectionContainer(label, x, y, w, h, fill, stroke, strong = false) {
  return `<mxCell id="${id('zone')}" value="${esc(label)}" style="swimlane;html=1;rounded=1;startSize=${strong ? 42 : 36};horizontal=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${strong ? 2.4 : 1.7};fontFamily=Arial;fontSize=${strong ? 14 : 13};fontStyle=1;fontColor=#1F4E79;opacity=${strong ? 34 : 25};dashed=${strong ? 0 : 1};dashPattern=8 5;" vertex="1" parent="1">${geometry(x, y, w, h)}</mxCell>`;
}

function globalRelationPorts(globalRelations, boxes) {
  const endpoints = [];
  const portByEndpoint = new Map();

  function center(box) {
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }

  function facingSide(source, target) {
    const a = center(source), b = center(target);
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
  }

  globalRelations.forEach((rel, relationIndex) => {
    if (rel.from === rel.to) {
      portByEndpoint.set(`${relationIndex}:from`, { side: 'right', fraction: 0.25 });
      portByEndpoint.set(`${relationIndex}:to`, { side: 'right', fraction: 0.75 });
      return;
    }
    const fromBox = boxes[rel.from], toBox = boxes[rel.to];
    const fromSide = facingSide(fromBox, toBox);
    const toSide = facingSide(toBox, fromBox);
    endpoints.push({ relationIndex, end: 'from', node: rel.from, side: fromSide, other: center(toBox) });
    endpoints.push({ relationIndex, end: 'to', node: rel.to, side: toSide, other: center(fromBox) });
  });

  const groups = new Map();
  endpoints.forEach((endpoint) => {
    const key = `${endpoint.node}:${endpoint.side}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(endpoint);
  });

  groups.forEach((group) => {
    group.sort((a, b) => {
      const horizontalSide = a.side === 'top' || a.side === 'bottom';
      return horizontalSide ? a.other.x - b.other.x : a.other.y - b.other.y;
    });
    group.forEach((endpoint, index) => {
      const fraction = 0.12 + ((index + 1) * 0.76) / (group.length + 1);
      portByEndpoint.set(`${endpoint.relationIndex}:${endpoint.end}`, {
        side: endpoint.side,
        fraction: Number(fraction.toFixed(3)),
      });
    });
  });

  function coordinates(port, prefix) {
    const fixed = `${prefix}Dx=0;${prefix}Dy=0;${prefix}Perimeter=0`;
    if (port.side === 'top') return `${prefix}X=${port.fraction};${prefix}Y=0;${fixed}`;
    if (port.side === 'bottom') return `${prefix}X=${port.fraction};${prefix}Y=1;${fixed}`;
    if (port.side === 'left') return `${prefix}X=0;${prefix}Y=${port.fraction};${fixed}`;
    return `${prefix}X=1;${prefix}Y=${port.fraction};${fixed}`;
  }

  return globalRelations.map((_, relationIndex) => {
    const from = portByEndpoint.get(`${relationIndex}:from`);
    const to = portByEndpoint.get(`${relationIndex}:to`);
    return `${coordinates(from, 'exit')};${coordinates(to, 'entry')}`;
  });
}

function legend(x, y) {
  const items = [
    ['Association JPA', 'strokeColor=#44546A;strokeWidth=2;'],
    ['Composition / cycle de vie', 'strokeColor=#44546A;strokeWidth=2;startArrow=diamond;startFill=1;'],
    ['Référence logique sans FK', 'strokeColor=#7F7F7F;strokeWidth=1.5;dashed=1;dashPattern=6 4;'],
  ];
  let xml = textCell('Légende — PK clé primaire · FK relation vers une entité · REL collection · ENUM type énuméré', x, y, 1060, 28, 'fontSize=11;fontStyle=1;fontColor=#334155;');
  items.forEach(([label, edgeStyle], index) => {
    const yy = y + 38 + index * 30;
    const lineId = id('legend');
    xml += `<mxCell id="${lineId}" value="" style="${edgeStyle}endArrow=none;html=1;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x + 10}" y="${yy + 10}" as="sourcePoint"/><mxPoint x="${x + 120}" y="${yy + 10}" as="targetPoint"/></mxGeometry></mxCell>`;
    xml += textCell(label, x + 135, yy - 4, 270, 24, 'fontSize=10;fontColor=#334155;');
  });
  return xml;
}

function graphModel(cells, width, height) {
  return `<mxGraphModel dx="1800" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel>`;
}

function detailPage(pageId, name, title, subtitle, width, height, placements, relationFilter) {
  nextId = 2;
  let cells = titleCells(title, subtitle, width);
  const names = Object.keys(placements);
  const boxes = {};
  for (const entityName of names) {
    const rendered = classCell(entityName, placements[entityName]);
    boxes[entityName] = { ...placements[entityName], w: rendered.w, h: rendered.h };
    cells += rendered.xml;
  }
  const eligible = relations.filter((rel) => names.includes(rel.from) && names.includes(rel.to));
  const selected = relationFilter ? eligible.filter(relationFilter) : eligible;
  const relationPorts = globalRelationPorts(selected, boxes);
  selected.forEach((rel, index) => { cells += edgeCell(rel, '', relationPorts[index]); });
  cells += legend(50, height - 145);
  cells += textCell('Chaque classe et chaque connecteur reste modifiable dans draw.io / diagrams.net. Les cardinalités proviennent des mappings JPA; les traits pointillés indiquent des identifiants stockés sans association JPA.', 660, height - 96, width - 720, 54, 'fontSize=10;fontColor=#50657A;align=right;');
  return `<diagram id="${pageId}" name="${esc(name)}">${graphModel(cells, width, height)}</diagram>`;
}

function globalDetailedPage() {
  nextId = 2;
  const width = 6100, height = 4650;
  let cells = titleCells(
    'Matchia — Diagramme de classes UML global détaillé',
    'Organisation centrée sur les tables pivots. Les entités fortement connectées sont au milieu; leurs tables dépendantes sont réparties autour par domaine.',
    width,
  );

  // Les zones sont créées avant les classes afin de rester en arrière-plan.
  cells += sectionContainer('A — Demandes, abonnement et paiement', 40, 125, 1545, 960, '#EAF3FB', '#2F75B5');
  cells += sectionContainer('B — Catalogue et personnalisation marketplace', 1600, 125, 3050, 960, '#E2F0D9', '#548235');
  cells += sectionContainer('C — Dealer, partenariats et contrats', 4660, 125, 1390, 3260, '#FCE4D6', '#C55A11');
  cells += sectionContainer('D — Sécurité, notifications et audit', 40, 2130, 1480, 2190, '#FFF2CC', '#BF9000');
  cells += sectionContainer('E — Financement et pièces exigées', 2040, 3540, 2050, 760, '#E4DFEC', '#7030A0');
  cells += sectionContainer('Noyau relationnel — tables pivots', 1580, 1110, 3020, 2370, '#DCEEFF', '#1F4E79', true);

  const placements = {
    // Satellites du cycle de demande.
    RequestStoreSelection:{x:90,y:240,w:340},
    RequestModuleSelection:{x:475,y:240,w:340},
    Subscription:{x:860,y:240,w:340},
    Payment:{x:1245,y:240,w:340},

    // Satellites catalogue / marketplace.
    Module:{x:1650,y:240,w:340},
    ModuleStore:{x:2030,y:240,w:340},
    ModuleStoreParameter:{x:2410,y:240,w:340},
    MarketplaceStore:{x:2790,y:240,w:340},
    MarketplaceStoreBanner:{x:3170,y:240,w:340},
    MarketplaceStoreModule:{x:3550,y:240,w:340},
    Content:{x:3930,y:240,w:340},
    ContentVisibility:{x:1650,y:660,w:340},
    MarketplaceContent:{x:2030,y:660,w:340},
    ProductParameterDefinition:{x:3930,y:660,w:340},
    ProductParameterValue:{x:4310,y:660,w:340},

    // Noyau central : tables à forte connectivité.
    Request:{x:1640,y:1260,w:440,central:true},
    Bank:{x:2250,y:1160,w:370,central:true},
    Marketplace:{x:2780,y:1160,w:380,central:true},
    Store:{x:2780,y:1760,w:380,central:true},
    Product:{x:3370,y:1450,w:360,central:true},
    Dealer:{x:3610,y:1810,w:370,central:true},
    ProductPublicationRequest:{x:4150,y:1190,w:400,central:true},
    User:{x:1740,y:2370,w:370,central:true},
    DealerProduct:{x:3610,y:2460,w:380,central:true},
    FinancingRequest:{x:2650,y:2860,w:450,central:true},

    // Satellites dealer / contractualisation.
    DealerAccountRequest:{x:4710,y:260,w:370},
    DealerBankPartnership:{x:4710,y:650,w:370},
    PartnershipContract:{x:4710,y:1030,w:390},
    DealerProductParameterValue:{x:4710,y:1640,w:370},
    DealerProductDocument:{x:4710,y:2020,w:370},
    DealerProductCatalogImage:{x:4710,y:2380,w:370},

    // Satellites financement.
    FinancingRequestDocument:{x:2150,y:3680,w:390},
    RequiredFinancingDocument:{x:2850,y:3680,w:390},

    // Satellites sécurité et traçabilité.
    RefreshToken:{x:90,y:2260,w:370},
    PasswordResetToken:{x:510,y:2260,w:370},
    ClientRegistrationVerification:{x:930,y:2260,w:390},
    JoinEmailVerification:{x:90,y:2860,w:370},
    Notification:{x:510,y:3260,w:370},
    AuditLog:{x:930,y:3260,w:390},
  };

  const boxes = {};
  Object.entries(placements).forEach(([entityName, pos]) => {
    const rendered = classCell(entityName, pos);
    boxes[entityName] = { ...pos, w: rendered.w, h: rendered.h };
    cells += rendered.xml;
  });

  const relationPorts = globalRelationPorts(relations, boxes);
  relations.forEach((rel, index) => { cells += edgeCell(rel, '', relationPorts[index]); });

  cells += legend(70, 4410);
  cells += textCell('Lecture : les classes bleu soutenu constituent le noyau relationnel. Les classes périphériques sont placées près de leur table propriétaire. Les losanges indiquent les compositions; les traits pointillés représentent les références logiques sans clé étrangère.', 680, 4420, width - 750, 66, 'fontSize=11;fontColor=#334155;align=right;');
  return `<diagram id="global-uml" name="01 - Diagramme global UML">${graphModel(cells, width, height)}</diagram>`;
}

function overviewPage() {
  nextId = 2;
  const width = 2800, height = 1800;
  let cells = titleCells('Matchia — Vue globale du modèle métier exploité', 'Lecture croisée: entités JPA du backend, contrôleurs REST, services TypeScript et pages des interfaces SaaS, banque, concessionnaire, client et marketplace.', width);

  const ui = [
    ['Portail public / Auth', 'JoinPage · Login · inscriptions · paiement', 60],
    ['Administration SaaS', 'banques · stores/modules · demandes · audit', 505],
    ['Administration banque', 'branding · produits · dealers · financement', 950],
    ['Espace concessionnaire', 'produits · stock · partenariats · contrats', 1395],
    ['Espace client', 'profil · simulateur · dossiers · notifications', 1840],
    ['Marketplace publique', 'stores · modules · contenu · produits publiés', 2285],
  ];
  ui.forEach(([label, sub, x]) => {
    cells += `<mxCell id="${id('ui')}" value="${esc(`<b>${label}</b><br><span style=\"font-size:10px\">${sub}</span>`)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#F8FAFC;strokeColor=#94A3B8;strokeWidth=1.5;fontFamily=Arial;fontSize=12;" vertex="1" parent="1">${geometry(x, 120, 390, 72)}</mxCell>`;
  });

  const groups = [
    ['core', 60, 300, 760, 830], ['catalog', 860, 300, 820, 830], ['dealer', 1720, 300, 1020, 830],
    ['finance', 380, 1190, 1050, 420], ['security', 1480, 1190, 1260, 420],
  ];
  groups.forEach(([key, x, y, w, h]) => {
    const meta = domain[key];
    cells += `<mxCell id="${id('g')}" value="${esc(meta.label)}" style="swimlane;html=1;rounded=1;startSize=34;horizontal=1;fillColor=${meta.fill};strokeColor=${meta.stroke};strokeWidth=2;fontFamily=Arial;fontSize=13;fontStyle=1;opacity=45;" vertex="1" parent="1">${geometry(x, y, w, h)}</mxCell>`;
  });

  const compactPlacements = {
    Bank:[100,370], User:[345,370], Request:[590,370], Marketplace:[100,465], Subscription:[345,465], Payment:[590,465],
    RequestStoreSelection:[100,560], RequestModuleSelection:[345,560],
    Store:[900,370], Module:[1145,370], ModuleStore:[1390,370], MarketplaceStore:[900,465], MarketplaceStoreModule:[1145,465], MarketplaceStoreBanner:[1390,465],
    Content:[900,560], ContentVisibility:[1145,560], MarketplaceContent:[1390,560], Product:[900,655], ProductParameterDefinition:[1145,655], ProductParameterValue:[1390,655],
    Dealer:[1760,370], DealerAccountRequest:[2005,370], DealerBankPartnership:[2250,370], PartnershipContract:[2495,370], DealerProduct:[1760,465],
    DealerProductParameterValue:[2005,465], DealerProductDocument:[2250,465], DealerProductCatalogImage:[2495,465], ProductPublicationRequest:[2130,560],
    FinancingRequest:[440,1280], FinancingRequestDocument:[685,1280], RequiredFinancingDocument:[930,1280],
    RefreshToken:[1530,1280], PasswordResetToken:[1775,1280], JoinEmailVerification:[2020,1280], ClientRegistrationVerification:[2265,1280], Notification:[1530,1375], AuditLog:[1775,1375],
  };
  Object.entries(compactPlacements).forEach(([entityName, [x,y]]) => { cells += classCell(entityName, { x, y }, true).xml; });

  const highlights = [
    ['Bank','Marketplace','1 — 0..1'], ['Marketplace','MarketplaceStore','1 — *'], ['Store','MarketplaceStore','1 — *'],
    ['Dealer','DealerBankPartnership','1 — *'], ['Bank','DealerBankPartnership','1 — *'], ['Dealer','DealerProduct','1 — *'],
    ['User','FinancingRequest','1 — *'], ['Bank','FinancingRequest','1 — *'], ['Request','Subscription','1 — 0..1'], ['Subscription','Payment','1 — *'],
  ];
  highlights.forEach(([from,to,label]) => {
    const eid = id('ov');
    cells += `<mxCell id="${eid}" value="${esc(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#64748B;strokeWidth=1.5;endArrow=none;fontSize=9;fontColor=#475569;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="entity-${from}" target="entity-${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  });

  cells += textCell(`${Object.keys(entities).length} entités persistées · ${Object.keys(enums).length} énumérations · 5 sous-domaines · relations JPA et références logiques distinguées`, 60, 1650, width - 120, 44, 'fontSize=14;fontStyle=1;fontColor=#1F4E79;align=center;');
  return `<diagram id="overview" name="02 - Vue globale &amp; front">${graphModel(cells, width, height)}</diagram>`;
}

function enumPage() {
  nextId = 2;
  const width = 2800, height = 1900;
  let cells = titleCells('Énumérations métier et états', 'Valeurs exactes lues depuis le backend. Les attributs ENUM des pages détaillées référencent ces types.', width);
  const enumNames = Object.keys(enums);
  const cols = 5;
  const boxW = 500, gapX = 45, startX = 55, startY = 130, rowH = 300;
  enumNames.forEach((name, index) => {
    const col = index % cols, row = Math.floor(index / cols);
    const x = startX + col * (boxW + gapX), y = startY + row * rowH;
    const values = enums[name].map(esc).join('<br>');
    const usedBy = Object.values(entities).filter((entity) => entity.fields.some((f) => f.type === name)).map((entity) => entity.name).join(', ') || 'référence applicative';
    const h = Math.max(120, 62 + enums[name].length * 17 + 34);
    const value = `<div style="text-align:center"><span style="font-size:10px">«enumeration»</span><br><b>${esc(name)}</b></div><hr><div style="text-align:left">${values}</div><hr><div style="font-size:9px;text-align:left"><b>Utilisé par:</b> ${esc(usedBy)}</div>`;
    cells += `<mxCell id="enum-${name}" value="${esc(value)}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=9;fontFamily=Arial;fontSize=11;fillColor=#F8FAFC;strokeColor=#64748B;strokeWidth=1.5;" vertex="1" parent="1">${geometry(x,y,boxW,h)}</mxCell>`;
  });
  return `<diagram id="enums" name="08 - Énumérations">${graphModel(cells, width, height)}</diagram>`;
}

const pages = [];
pages.push(globalDetailedPage());
pages.push(overviewPage());

pages.push(detailPage('core-subscription','03 - SaaS & abonnement','Noyau SaaS, demandes, abonnement et paiement','Modèle vérifié dans le backend et le frontend: sélection active Store/Module, snapshot tarifaire par store, abonnement, paiement, notifications et audit.',3400,2300,{
  User:{x:60,y:680,w:350}, Bank:{x:500,y:610,w:360}, Marketplace:{x:500,y:1120,w:360},
  Request:{x:1080,y:650,w:440,central:true},
  Store:{x:1790,y:170,w:350}, Module:{x:2250,y:170,w:350},
  RequestStoreSelection:{x:1790,y:650,w:360}, RequestModuleSelection:{x:2250,y:650,w:370},
  Subscription:{x:1110,y:1430,w:400}, Payment:{x:1740,y:1510,w:390},
  Notification:{x:60,y:1260,w:350}, AuditLog:{x:60,y:1620,w:370},
}, (r) => !['Dealer','FinancingRequest','ClientRegistrationVerification'].includes(r.from) && !['Dealer','FinancingRequest','ClientRegistrationVerification'].includes(r.to)));

pages.push(detailPage('catalog-marketplace','04 - Catalogue & marketplace','Catalogue, stores, modules et personnalisation marketplace','Modèle vérifié dans le backend et le frontend: catalogue global, affectations par marketplace, configuration des modules, contenus et produits bancaires.',3500,2500,{
  Bank:{x:70,y:650,w:370},
  Marketplace:{x:590,y:650,w:390,central:true},
  MarketplaceStore:{x:1120,y:650,w:390,central:true},
  Store:{x:1650,y:650,w:390,central:true},
  Module:{x:2190,y:650,w:370,central:true},

  MarketplaceStoreBanner:{x:1090,y:160,w:390},
  MarketplaceStoreModule:{x:1590,y:160,w:400},
  ModuleStore:{x:2110,y:160,w:390},
  ModuleStoreParameter:{x:2620,y:160,w:400},

  Content:{x:590,y:1250,w:380},
  ContentVisibility:{x:70,y:1570,w:400},
  MarketplaceContent:{x:1090,y:1450,w:400},

  Product:{x:1650,y:1280,w:390},
  ProductParameterDefinition:{x:2190,y:1280,w:410},
  ProductParameterValue:{x:1900,y:1780,w:410},
}, (r) => !['Request','Dealer','FinancingRequest','ProductPublicationRequest'].includes(r.from) && !['Request','Dealer','FinancingRequest','ProductPublicationRequest'].includes(r.to)));

pages.push(detailPage('dealer-partnership','05 - Dealer & contrats','Concessionnaires, partenariats, contrats et publication produit','Modèle vérifié dans le backend et le frontend: inscription, compte dealer, catalogue, partenariat, versions contractuelles et validation de publication.',3600,2700,{
  DealerAccountRequest:{x:930,y:140,w:390},
  User:{x:50,y:620,w:360},
  Dealer:{x:500,y:620,w:370,central:true},
  Store:{x:1010,y:620,w:370,central:true},
  Bank:{x:1520,y:620,w:370,central:true},
  Marketplace:{x:2030,y:620,w:390},

  DealerProduct:{x:500,y:1280,w:390,central:true},
  DealerBankPartnership:{x:1080,y:1200,w:400,central:true},
  PartnershipContract:{x:1600,y:1190,w:420},
  ProductPublicationRequest:{x:2240,y:1260,w:420,central:true},

  ProductParameterDefinition:{x:50,y:1900,w:400},
  DealerProductParameterValue:{x:500,y:1960,w:410},
  DealerProductDocument:{x:1030,y:2070,w:400},
  DealerProductCatalogImage:{x:1550,y:2070,w:410},
}, (r) => !['FinancingRequest','RefreshToken','PasswordResetToken','Notification','AuditLog'].includes(r.from) && !['FinancingRequest','RefreshToken','PasswordResetToken','Notification','AuditLog'].includes(r.to)));

pages.push(detailPage('client-financing','06 - Financement client','Client, simulation et traitement d’une demande de financement','Interfaces couvertes: Simulator, ClientRegistration, ClientArea, FinancingManagement et DealerFinancingRequests. Deux sources de produit sont possibles: Product ou DealerProduct.',3000,1900,{
  User:{x:50,y:140}, Bank:{x:430,y:140}, Store:{x:810,y:140}, Product:{x:1190,y:140}, DealerProduct:{x:1580,y:140},
  FinancingRequest:{x:1010,y:690,w:430}, FinancingRequestDocument:{x:1510,y:880}, RequiredFinancingDocument:{x:520,y:900}, Notification:{x:2000,y:900},
}, (r) => ['FinancingRequest','FinancingRequestDocument','RequiredFinancingDocument','Notification'].includes(r.from) || ['FinancingRequest','FinancingRequestDocument','RequiredFinancingDocument','Notification'].includes(r.to)));

pages.push(detailPage('security-audit','07 - Sécurité & audit','Authentification, vérifications, notifications et traçabilité','Interfaces couvertes: Login, Forgot/ResetPassword, JoinPage, ClientRegistration, SessionLoader, NotificationsPanel, AuditLogs et assistant SaaS.',3100,2000,{
  User:{x:1090,y:150}, Bank:{x:710,y:150}, Dealer:{x:1470,y:150}, Marketplace:{x:1850,y:150}, Request:{x:2230,y:130,w:390},
  RefreshToken:{x:1090,y:580}, PasswordResetToken:{x:1470,y:580}, JoinEmailVerification:{x:30,y:620}, ClientRegistrationVerification:{x:400,y:620},
  Notification:{x:1850,y:720}, AuditLog:{x:2330,y:900,w:360},
}, (r) => ['RefreshToken','PasswordResetToken','JoinEmailVerification','ClientRegistrationVerification','Notification','AuditLog'].includes(r.from) || ['RefreshToken','PasswordResetToken','JoinEmailVerification','ClientRegistrationVerification','Notification','AuditLog'].includes(r.to)));

pages.push(enumPage());

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-11T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${pages.join('')}</mxfile>\n`;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, xml, 'utf8');

const corePage = pages.find((page) => page.includes('id="core-subscription"'));
if (!corePage) throw new Error('La page SaaS & abonnement est introuvable.');
const coreXml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-14T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${corePage}</mxfile>\n`;
fs.writeFileSync(CORE_OUT_FILE, coreXml, 'utf8');

const catalogPage = pages.find((page) => page.includes('id="catalog-marketplace"'));
if (!catalogPage) throw new Error('La page Catalogue & marketplace est introuvable.');
const catalogXml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-14T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${catalogPage}</mxfile>\n`;
fs.writeFileSync(CATALOG_OUT_FILE, catalogXml, 'utf8');

const dealerPage = pages.find((page) => page.includes('id="dealer-partnership"'));
if (!dealerPage) throw new Error('La page Dealer & contrats est introuvable.');
const dealerXml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-14T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" compressed="false">${dealerPage}</mxfile>\n`;
fs.writeFileSync(DEALER_OUT_FILE, dealerXml, 'utf8');

const readme = `MATCHIA — DIAGRAMME DE CLASSES DÉTAILLÉ ET ÉDITABLE\n\n` +
  `Fichier principal : Matchia_diagramme_classes_detaille_editable.drawio\n\n` +
  `Contenu :\n` +
  `1. Diagramme de classes UML global détaillé\n` +
  `2. Vue globale et correspondance avec les interfaces front\n` +
  `3. Noyau SaaS, demandes, abonnement et paiement\n` +
  `4. Catalogue, stores, modules et marketplace\n` +
  `5. Concessionnaires, partenariats, contrats et publication\n` +
  `6. Financement client\n` +
  `7. Sécurité, vérifications, notifications et audit\n` +
  `8. Énumérations et valeurs exactes\n\n` +
  `Sources analysées : entités et enums JPA du backend, mappings de contrôleurs, services API et pages TypeScript/React du frontend.\n` +
  `Tous les objets, textes, cardinalités et connecteurs sont éditables dans draw.io / diagrams.net.\n`;
fs.writeFileSync(path.join(OUT_DIR, 'LISEZ-MOI.txt'), readme, 'utf8');

console.log(JSON.stringify({ output: OUT_FILE, coreOutput: CORE_OUT_FILE, catalogOutput: CATALOG_OUT_FILE, dealerOutput: DEALER_OUT_FILE, pages: pages.length, entities: Object.keys(entities).length, enums: Object.keys(enums).length, relations: relations.length }, null, 2));

module.exports = {
  entities,
  enums,
  relations,
  domain,
  entityDomain,
  classConstraints,
  frontUsage,
  explicitOperations,
};
