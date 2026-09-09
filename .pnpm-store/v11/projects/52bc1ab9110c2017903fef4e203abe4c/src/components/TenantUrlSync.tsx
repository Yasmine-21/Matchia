import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  getTenantSlugFromLocation,
  isLocalLvhEnvironment,
} from '../utils/tenant';

const TenantUrlSync = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Local :
    // test1234.lvh.me contient déjà le tenant
    if (isLocalLvhEnvironment()) {
      return;
    }

    const tenant = getTenantSlugFromLocation();

    if (!tenant) {
      return;
    }

    const params = new URLSearchParams(location.search);

    if (params.get('tenant') === tenant) {
      return;
    }

    params.set('tenant', tenant);

    navigate(
      {
        pathname: location.pathname,
        search: `?${params.toString()}`,
        hash: location.hash,
      },
      {
        replace: true,
      }
    );
  }, [
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  return null;
};

export default TenantUrlSync;