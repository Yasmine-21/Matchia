import fs from 'fs';
import path from 'path';

const servicesPath = 'd:\\PFE M2\\Platforme SaaS\\MatchiaFrontend\\src\\services';
const utilsPath = 'd:\\PFE M2\\Platforme SaaS\\MatchiaFrontend\\src\\utils';

const services = [
  'authService',
  'bankService',
  'userService',
  'dealerService',
  'storeService',
  'moduleService',
  'productService',
  'paymentService',
  'subscriptionService',
  'notificationService',
  'contentService',
  'requestService',
  'financingRequestService',
  'bankTenantService',
  'certificateService',
  'chatbotService',
  'marketplaceContentService',
  'auditService',
  'aiAssistantService',
  'productParameterService',
  'publicDealerService',
  'sessionStorage'
];

const utils = [
  'comparison',
  'moduleVisibility',
  'tenant'
];

services.forEach(service => {
  const filePath = path.join(servicesPath, `${service}.test.ts`);
  const content = `import { describe, it, expect, vi } from 'vitest';
import { ${service} } from './${service}';
import apiClient from '../api/apiClient';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('${service}', () => {
  it('should be defined', () => {
    expect(${service}).toBeDefined();
  });
});
`;
  fs.writeFileSync(filePath, content);
});

utils.forEach(util => {
  const filePath = path.join(utilsPath, `${util}.test.ts`);
  const content = `import { describe, it, expect } from 'vitest';
import * as ${util} from './${util}';

describe('${util}', () => {
  it('should be defined', () => {
    expect(${util}).toBeDefined();
  });
});
`;
  if(!fs.existsSync(utilsPath)) {
      fs.mkdirSync(utilsPath, {recursive: true});
  }
  fs.writeFileSync(filePath, content);
});

console.log('Test files created.');
