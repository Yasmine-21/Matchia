import type { Bank, BankBranding, Store, Module, User, Request, BankWithStores } from '../types';

export const stores: Store[] = [
  { id: '1', name: 'vehicle', label: 'Véhicule', icon: 'Car', status: 'active', usage_count: 245, created_at: '2024-01-15' },
  { id: '2', name: 'mobile', label: 'Mobile', icon: 'Smartphone', status: 'active', usage_count: 189, created_at: '2024-01-15' },
  { id: '3', name: 'medical', label: 'Médical', icon: 'Heart', status: 'active', usage_count: 156, created_at: '2024-01-15' },
  { id: '4', name: 'real-estate', label: 'Immobilier', icon: 'Home', status: 'active', usage_count: 312, created_at: '2024-01-15' },
];

export const modules: Module[] = [
  { id: '1', name: 'simulator', label: 'Simulateur', status: 'active', usage_count: 542, created_at: '2024-01-15' },
  { id: '2', name: 'comparator', label: 'Comparateur', status: 'active', usage_count: 428, created_at: '2024-01-15' },
  { id: '3', name: 'blog', label: 'Blog', status: 'active', usage_count: 298, created_at: '2024-01-15' },
  { id: '4', name: 'ads', label: 'Publicités', status: 'active', usage_count: 376, created_at: '2024-01-15' },
  { id: '5', name: 'bot', label: 'Matchia Bot', status: 'active', usage_count: 612, created_at: '2024-01-15' },
];

export const banks: Bank[] = [
  {
    id: '1',
    name: 'Banque Zitouna',
    slug: 'zitouna',
    logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
    country: 'Tunisie',
    description: 'Premier établissement bancaire islamique en Tunisie, offrant des solutions de financement conformes à la Charia.',
    website_url: 'https://www.banquezitouna.com',
    established_year: 2010,
    status: 'active',
    
  
    created_at: '2024-01-15',
    
  },
  {
    id: '2',
    name: 'BH Bank',
    slug: 'bh',
    logo_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop',
    country: 'Tunisie',
    description: 'Banque d\'affaires et de financement spécialisée dans l\'accompagnement des entreprises et des particuliers.',
    website_url: 'https://www.bhbank.com.tn',
    established_year: 2005,
    status: 'active',
   
    created_at: '2024-02-20',
   
  },
  {
    id: '3',
    name: 'Wifak Bank',
    slug: 'wifak',
    logo_url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=200&h=200&fit=crop',
    country: 'Tunisie',
    description: 'Banque participative proposant des solutions de financement innovantes et éthiques.',
    website_url: 'https://www.wifakbank.com.tn',
    established_year: 2017,
    status: 'active',
    
    created_at: '2024-03-10',
    
  },
];

export const bankBrandings: BankBranding[] = [
  {
    id: '1',
    bank_id: '1',
    primary_color: '#0066a1',
    secondary_color: '#00a651',
    homepage_title: 'Bienvenue sur votre marketplace de financement',
    welcome_text: 'Découvrez nos solutions de financement conformes à vos valeurs et adaptées à vos besoins.',
    banner_image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop',
    footer_text: '© 2026 Banque Zitouna. Tous droits réservés. Établissement agréé par la BCT.',
    logo_image_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
    created_at: '2024-01-15',
    updated_at: '2026-04-15',
  },
  {
    id: '2',
    bank_id: '2',
    primary_color: '#c41e3a',
    secondary_color: '#1a1a1a',
    homepage_title: 'Vos projets, nos solutions',
    welcome_text: 'BH Bank vous accompagne dans tous vos projets avec des offres de financement sur mesure.',
    banner_image_url: 'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=1200&h=400&fit=crop',
    footer_text: '© 2026 BH Bank. Institution financière réglementée.',
    logo_image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop',
    created_at: '2024-02-20',
    updated_at: '2026-04-10',
  },
];

export const users: User[] = [
  // SUPER_ADMIN (SaaS Platform)
  { id: '1', name: 'Mariem Trabelsi', email: 'admin@matchia.com', role: 'SUPER_ADMIN', status: 'active', created_at: '2024-01-01', updated_at: '2026-04-15' },
  
  // Banque Zitouna Admins
  { id: '2', name: 'Ahmed Ben Ali', email: 'ahmed.benali@zitouna.com', role: 'ADMIN', bank_id: '1', status: 'active', created_at: '2024-01-15', updated_at: '2026-04-15' },
  { id: '3', name: 'Leila Mansour', email: 'leila.mansour@zitouna.com', role: 'ADMIN', bank_id: '1', status: 'active', created_at: '2024-01-20', updated_at: '2026-04-10' },
  { id: '4', name: 'Mohamed Souissi', email: 'mohamed.souissi@zitouna.com', role: 'MANAGER', bank_id: '1', status: 'active', created_at: '2024-02-01', updated_at: '2026-04-12' },
  
  // BH Bank Admins
  { id: '5', name: 'Fatma Gharbi', email: 'fatma.gharbi@bhbank.com.tn', role: 'ADMIN', bank_id: '2', status: 'active', created_at: '2024-02-20', updated_at: '2026-04-15' },
  { id: '6', name: 'Riadh Kacem', email: 'riadh.kacem@bhbank.com.tn', role: 'MANAGER', bank_id: '2', status: 'active', created_at: '2024-02-25', updated_at: '2026-04-14' },
  { id: '7', name: 'Nadia Ben Hamad', email: 'nadia.benhamad@bhbank.com.tn', role: 'MANAGER', bank_id: '2', status: 'inactive', created_at: '2024-03-01', updated_at: '2026-03-20' },
  
  // Wifak Bank Admins
  { id: '8', name: 'Sami Bouassida', email: 'sami.bouassida@wifakbank.com.tn', role: 'ADMIN', bank_id: '3', status: 'active', created_at: '2024-03-10', updated_at: '2026-04-13' },
  { id: '9', name: 'Hana Khatri', email: 'hana.khatri@wifakbank.com.tn', role: 'MANAGER', bank_id: '3', status: 'active', created_at: '2024-03-15', updated_at: '2026-04-15' },
];

export const requests: Request[] = [
  {
    id: '1',
    request_type: 'join',
    status: 'pending',
    priority: 'high',
    created_by: '4',
    created_at: '2026-04-18',
    notes: 'Nouvelle banque souhaitant rejoindre Matchia',
  },
  {
    id: '2',
    request_type: 'store',
    bank_id: '1',
    store_id: '4',
    status: 'approved',
    priority: 'medium',
    created_by: '2',
    approved_by: '1',
    created_at: '2026-04-10',
    notes: 'Demande d\'activation du store Immobilier',
  },
];

export const getBankWithStores = (bankId: string): BankWithStores | undefined => {
  const bank = banks.find(b => b.id === bankId);
  const branding = bankBrandings.find(b => b.bank_id === bankId);

  if (!bank) return undefined;

  const bankStores = bankId === '1'
    ? [
        { ...stores[0], modules: [modules[0], modules[1], modules[2], modules[4]] },
        { ...stores[1], modules: [modules[0], modules[1], modules[4]] },
        { ...stores[2], modules: [modules[0], modules[2], modules[4]] },
      ]
    : [
        { ...stores[0], modules: [modules[0], modules[1], modules[3], modules[4]] },
        { ...stores[3], modules: [modules[0], modules[1], modules[2], modules[4]] },
      ];

  return {
    ...bank,
    stores: bankStores,
    branding: branding || bankBrandings[0],
  };
};

export const currentUser: User = users[0];
