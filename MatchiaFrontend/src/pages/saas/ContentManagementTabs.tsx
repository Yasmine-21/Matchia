import { Tabs } from '../../components/ui/Tabs';
import { ContentManagement as LegacyContentManagement } from './ContentManagement';
import { ProductParametersTab } from './ProductParametersTab';

export function ContentManagement() {
  return (
    <Tabs
      defaultTab="content"
      tabs={[
        {
          id: 'content',
          label: 'Contenus',
          content: <LegacyContentManagement />,
        },
        {
          id: 'product-parameters',
          label: 'Parametres produits',
          content: <ProductParametersTab />,
        },
      ]}
    />
  );
}
