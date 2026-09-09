/**
 * A module can be active without being a page.  Keep this classification in
 * one place so functional modules never leak into any navigation component.
 */
export type ModuleIdentity = {
  name?: string | null;
  label?: string | null;
  category?: string | null;
};

const normalize = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const moduleKeys = (module: ModuleIdentity) =>
  [module.name, module.label, module.category].map(normalize).filter(Boolean);

export const isBannerModule = (module: ModuleIdentity) =>
  moduleKeys(module).some((key) => key === 'banner' || key === 'banniere' || key.includes('banner'));

export const isChatbotModule = (module: ModuleIdentity) =>
  moduleKeys(module).some((key) => key === 'chatbot' || key.includes('chatbot') || key === 'bot');

export const isFunctionalModule = (module: ModuleIdentity) =>
  isBannerModule(module) || isChatbotModule(module);

export const isNavigableModule = (module: ModuleIdentity) => !isFunctionalModule(module);
