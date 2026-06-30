import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calculator,
  Image as ImageIcon,
  Info,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { moduleService } from '../../../services/moduleService';
import { productService } from '../../../services/productService';
import type { ModuleAssignment, ModuleParameter, ProductDto } from '../../../types/apiTypes';

interface MarketplaceModuleDetail {
  id: number;
  moduleId?: number | null;
  name?: string | null;
  label?: string | null;
  category?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
}

interface MarketplaceStoreDetail {
  id: number | string;
  storeId?: number | null;
  name?: string | null;
  label?: string | null;
  slug?: string | null;
  description?: string | null;
  banniere_url?: string | null;
  banniereUrl?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
  modules?: MarketplaceModuleDetail[];
}

interface SimulatorProductItem {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  storeId: number;
  storeName?: string | null;
  parameterValues: ProductDto['parameterValues'];
  createdAt?: string;
}

interface SimulatorPreset {
  id: string;
  key: string;
  label: string;
  minContributionRate: number;
  annualRate: number;
  maxFinancingAmount: number | null;
  fileFeePercentage: number;
  studyFeePercentage: number;
  fileFeeAmount: number;
  studyFeeAmount: number;
  debtRatioLimit: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  defaultDurationMonths: number;
  summary: string;
}

const normalizeSlug = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeKey = (value?: string | null) => normalizeSlug(value).replace(/^module-/, '');

const normalizeLookupKey = (value?: string | null) => normalizeKey(value).replace(/-/g, '');

const normalizeNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(String(value).replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

const formatTnd = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return '-';
  }

  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const getProductSortValue = (createdAt?: string) => {
  if (!createdAt) return 0;
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const toFieldLabel = (parameter: ModuleParameter) => parameter.name || parameter.code || `Paramètre ${parameter.id}`;

const isSimulatorModule = (module: MarketplaceModuleDetail) => {
  const keys = [module.name, module.label, module.category]
    .map((value) => normalizeLookupKey(value))
    .filter(Boolean);

  return keys.some((key) => key.includes('simulat'));
};

const isVehicleStore = (storeSlug?: string | null) => normalizeLookupKey(storeSlug).includes('vehic');

const getParameterLookupKeys = (parameter: ModuleParameter) =>
  [parameter.name, parameter.code]
    .map((value) => normalizeLookupKey(value))
    .filter(Boolean);

const getParameterTextValue = (parameter: ModuleParameter) => {
  if (parameter.value === undefined || parameter.value === null || `${parameter.value}`.trim() === '') {
    return null;
  }

  return String(parameter.value).trim();
};

const parseTypeKeyFromText = (value?: string | null) => {
  if (!value) return '';
  return normalizeLookupKey(value);
};

const formatTypeLabel = (typeKey: string) => {
  const normalized = normalizeSlug(typeKey)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Type';
  }

  return normalized
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/\bcv\b/gi, 'CV')
    .replace(/\bplus\b/gi, '+')
    .replace(/\bstandard\b/gi, 'Standard')
    .replace(/\bcomfort\b/gi, 'Comfort');
};

const extractTypeSuffix = (lookupKey: string, aliases: string[]) => {
  for (const alias of aliases) {
    const index = lookupKey.indexOf(alias);
    if (index < 0) continue;

    const remainder = lookupKey.slice(index + alias.length).replace(/^[-_]+/, '');
    if (remainder) {
      return remainder;
    }
  }

  return '';
};

const collectTypedKeys = (parameters: ModuleParameter[]) => {
  const aliases = [
    'minimumcontributionrate',
    'minimumcontribution',
    'contributionmin',
    'minimumduration',
    'maximumduration',
    'annualinterestrate',
    'interestrate',
    'filefeepercentage',
    'studyfeepercentage',
    'maxfinancingamount',
    'maximumfinancingamount',
    'maxdebtratio',
    'simulatortype',
    'vehiclefiscalpower',
    'producttype',
  ];

  const typeKeys = new Set<string>();

  parameters.forEach((parameter) => {
    const lookupKeys = getParameterLookupKeys(parameter);
    lookupKeys.forEach((lookupKey) => {
      const alias = aliases.find((candidate) => lookupKey.includes(candidate));
      if (!alias) {
        return;
      }

      const typeSuffix = extractTypeSuffix(lookupKey, [alias]);
      if (typeSuffix) {
        typeKeys.add(typeSuffix);
      }
    });

    const typeField = lookupKeys.some((lookupKey) =>
      ['simulatortype', 'vehiclefiscalpower', 'producttype'].some((alias) => lookupKey.includes(alias))
    );

    if (typeField) {
      if (parameter.value !== undefined && parameter.value !== null) {
        const valueKey = normalizeLookupKey(String(parameter.value));
        if (valueKey) {
          typeKeys.add(valueKey);
        }
      }

      (parameter.options || []).forEach((option) => {
        const optionKey = normalizeLookupKey(option);
        if (optionKey) {
          typeKeys.add(optionKey);
        }
      });
    }
  });

  return Array.from(typeKeys);
};

const resolveParameterText = (parameters: ModuleParameter[], aliases: string[], typeKey?: string) => {
  const normalizedTypeKey = normalizeLookupKey(typeKey);

  const matches = (parameter: ModuleParameter, requireType: boolean) => {
    const lookupKeys = getParameterLookupKeys(parameter);
    const aliasMatch = lookupKeys.some((lookupKey) => aliases.some((alias) => lookupKey.includes(alias)));
    if (!aliasMatch) {
      return false;
    }

    if (!requireType || !normalizedTypeKey) {
      return true;
    }

    return lookupKeys.some((lookupKey) => lookupKey.includes(normalizedTypeKey));
  };

  const typedMatch = parameters.find((parameter) => matches(parameter, true));
  if (typedMatch) {
    const value = getParameterTextValue(typedMatch);
    if (value !== null) return value;
  }

  const genericMatch = parameters.find((parameter) => matches(parameter, false));
  if (genericMatch) {
    const value = getParameterTextValue(genericMatch);
    if (value !== null) return value;
  }

  return null;
};

const resolveParameterNumber = (parameters: ModuleParameter[], aliases: string[], typeKey: string | undefined, fallback: number | null) => {
  const textValue = resolveParameterText(parameters, aliases, typeKey);
  if (textValue === null) {
    return fallback;
  }

  const parsed = normalizeNumber(textValue);
  return parsed ?? fallback;
};

const formatParameterDisplayValue = (parameter: ModuleParameter) => {
  if (parameter.value === null || parameter.value === undefined || `${parameter.value}`.trim() === '') {
    if (parameter.options?.length) {
      return parameter.options.join(' / ');
    }
    return '-';
  }

  if (parameter.type === 'boolean') {
    if (typeof parameter.value === 'boolean') {
      return parameter.value ? 'Oui' : 'Non';
    }
    return ['true', '1', 'yes', 'oui', 'on'].includes(String(parameter.value).toLowerCase()) ? 'Oui' : 'Non';
  }

  return String(parameter.value);
};

const buildFallbackSimulatorTypes = (isVehicle: boolean) =>
  isVehicle
    ? [
        { key: '4cv', label: '4 CV' },
        { key: '5cv', label: '5 CV+' },
      ]
    : [
        { key: 'standard', label: 'Standard' },
        { key: 'comfort', label: 'Comfort' },
      ];

const financingTypeOptions = [
  { value: 'Crédit classique', label: 'Crédit classique' },
  { value: 'Crédit-bail', label: 'Crédit-bail' },
  { value: 'Murabaha', label: 'Murabaha' },
  { value: 'Sans apport', label: 'Sans apport' },
];

export function SimulatorModule() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bankData, branding, marketplace } = useOutletContext<any>();

  const [products, setProducts] = useState<SimulatorProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [moduleAssignments, setModuleAssignments] = useState<ModuleAssignment[]>([]);
  const [moduleLoading, setModuleLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [acquisitionPrice, setAcquisitionPrice] = useState<number>(0);
  const [financingType, setFinancingType] = useState<string>('Crédit classique');
  const [contributionAmount, setContributionAmount] = useState<number>(0);
  const [grossIncome, setGrossIncome] = useState<number>(0);
  const [otherMonthlyPayments, setOtherMonthlyPayments] = useState<number>(0);
  const [durationMonths, setDurationMonths] = useState<number>(48);

  const store = useMemo(() => {
    const targetSlug = normalizeKey(storeSlug);
    return (bankData?.stores || []).find((candidate: MarketplaceStoreDetail) => {
      return [candidate.name, candidate.label, candidate.slug, candidate.storeId, candidate.id]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => normalizeKey(String(value)) === targetSlug);
    }) as MarketplaceStoreDetail | undefined;
  }, [bankData?.stores, storeSlug]);

  const marketplaceBankId = useMemo(() => {
    const rawBankId = marketplace?.bankId ?? bankData?.id ?? null;
    const numericBankId = Number(rawBankId);
    return Number.isNaN(numericBankId) ? null : numericBankId;
  }, [bankData?.id, marketplace?.bankId]);

  const currentStoreId = useMemo(() => {
    if (!store) return null;
    const numericId = Number(store.storeId ?? store.id);
    return Number.isNaN(numericId) ? null : numericId;
  }, [store]);

  const storeLabel = store?.label || store?.name || `Store ${store?.storeId || store?.id || ''}`;
  const modules = (store?.modules || []).filter((module) => module.enabled !== false && module.visible !== false);
  const canSimulate = modules.some(isSimulatorModule);
  const simulatorAssignment = useMemo(
    () => moduleAssignments.find((assignment) => isSimulatorModule(assignment.module)),
    [moduleAssignments]
  );
  const simulatorParameters = simulatorAssignment?.parameters || [];
  const isVehicle = isVehicleStore(storeSlug);
  const simulatorTypeKeys = useMemo(() => {
    const detected = collectTypedKeys(simulatorParameters);
    if (detected.length > 0) {
      return detected;
    }

    return buildFallbackSimulatorTypes(isVehicle).map((preset) => preset.key);
  }, [isVehicle, simulatorParameters]);

  const initialProductId = useMemo(() => {
    const queryProductId = normalizeNumber(searchParams.get('productId'));
    const stateProductId = normalizeNumber((location.state as { productId?: number | string } | null)?.productId ?? null);
    return queryProductId ?? stateProductId;
  }, [location.state, searchParams]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || products[0] || null,
    [products, selectedProductId]
  );

  const productTypeHint = useMemo(() => {
    const fields = selectedProduct?.parameterValues || [];
    for (const field of fields) {
      const lookupKey = normalizeLookupKey(field.parameterName || '');
      const valueKey = normalizeLookupKey(field.value || '');
      const combined = `${lookupKey} ${valueKey}`.trim();

      if (
        combined.includes('fiscalpower') ||
        combined.includes('vehiclepower') ||
        combined.includes('producttype') ||
        combined.includes('simulatortype')
      ) {
        const candidate = parseTypeKeyFromText(field.value || field.parameterName || '');
        if (candidate) {
          return candidate;
        }
      }
    }
    return '';
  }, [selectedProduct?.parameterValues]);

  const presets = useMemo<SimulatorPreset[]>(() => {
    const fallbackPresets = buildFallbackSimulatorTypes(isVehicle);
    const sourceTypes = simulatorTypeKeys.length > 0 ? simulatorTypeKeys : fallbackPresets.map((item) => item.key);

    return sourceTypes.map((typeKey, index) => {
      const label =
        fallbackPresets.find((preset) => preset.key === typeKey)?.label ||
        formatTypeLabel(typeKey);

      const summaryType = label;
      const minContributionRate = resolveParameterNumber(
        simulatorParameters,
        ['minimumcontributionrate', 'minimumcontribution', 'contributionmin', 'apportmin'],
        typeKey,
        isVehicle ? (typeKey.includes('5cv') ? 40 : 20) : index === 0 ? 15 : 25
      ) ?? 0;
      const maxFinancingAmount = resolveParameterNumber(
        simulatorParameters,
        ['maxfinancingamount', 'maximumfinancingamount', 'plafondfinancement', 'financingceiling'],
        typeKey,
        null
      );
      const annualInterestRate = resolveParameterNumber(
        simulatorParameters,
        ['annualinterestrate', 'interestrate', 'tauxinteret', 'taux'],
        typeKey,
        isVehicle ? (typeKey.includes('5cv') ? 8.4 : 7.2) : index === 0 ? 8.9 : 7.9
      ) ?? 0;
      const fileFeePercentage = resolveParameterNumber(
        simulatorParameters,
        ['filefeepercentage', 'filefeepercentage', 'fraisdossierpourcentage', 'fraisdossier'],
        typeKey,
        isVehicle ? 1.5 : 1.0
      ) ?? 0;
      const studyFeePercentage = resolveParameterNumber(
        simulatorParameters,
        ['studyfeepercentage', 'studyfeepercentage', 'fraisetudepourcentage', 'fraisetude'],
        typeKey,
        0
      ) ?? 0;
      const fileFeeAmount = resolveParameterNumber(
        simulatorParameters,
        ['filefeeamount', 'filefeesamount', 'fraisdossiermontant'],
        typeKey,
        isVehicle ? (typeKey.includes('5cv') ? 320 : 250) : index === 0 ? 200 : 260
      ) ?? 0;
      const studyFeeAmount = resolveParameterNumber(
        simulatorParameters,
        ['studyfeeamount', 'studyfeesamount', 'fraisetudemontant'],
        typeKey,
        isVehicle ? (typeKey.includes('5cv') ? 180 : 120) : index === 0 ? 100 : 140
      ) ?? 0;
      const debtRatioLimit = resolveParameterNumber(
        simulatorParameters,
        ['maxdebtratio', 'ratiosendettement', 'debtloadlimit'],
        typeKey,
        isVehicle ? 35 : index === 0 ? 40 : 35
      ) ?? 35;
      const minDurationMonths = Math.max(
        resolveParameterNumber(
          simulatorParameters,
          ['mindurationmonths', 'minimumdurationmonths', 'minimumduration', 'dureeminimum'],
          typeKey,
          isVehicle ? 12 : 6
        ) ?? 1,
        1
      );
      const maxDurationMonths = Math.max(
        resolveParameterNumber(
          simulatorParameters,
          ['maxdurationmonths', 'maximumdurationmonths', 'maximumduration', 'dureemaximum'],
          typeKey,
          isVehicle ? (typeKey.includes('5cv') ? 72 : 60) : 60
        ) ?? 12,
        minDurationMonths
      );

      return {
        id: typeKey,
        key: typeKey,
        label,
        minContributionRate,
        maxFinancingAmount,
        annualRate: annualInterestRate,
        fileFeePercentage,
        studyFeePercentage,
        fileFeeAmount,
        studyFeeAmount,
        debtRatioLimit,
        minDurationMonths,
        maxDurationMonths,
        defaultDurationMonths: Math.min(Math.max(isVehicle ? 60 : 48, minDurationMonths), maxDurationMonths),
        summary:
          summaryType === '4 CV'
            ? 'Apport minimum plus souple et durée standard.'
            : summaryType === '5 CV+'
              ? 'Apport plus élevé, taux ajusté et plafond plus strict.'
              : 'Regles de financement generales configurees par la banque.',
      };
    });
  }, [isVehicle, simulatorParameters, simulatorTypeKeys]);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || presets[0],
    [presets, selectedPresetId]
  );

  const activeSimulationType = selectedPreset || presets[0] || null;

  useEffect(() => {
    if (!storesReady(bankData?.stores) || currentStoreId == null) {
      return;
    }

    let cancelled = false;

    const loadModules = async () => {
      setModuleLoading(true);
      setModuleError(false);

      try {
        const response = await moduleService.getActiveStoreModulesWithConfig(currentStoreId);
        if (!cancelled) {
          setModuleAssignments(response.data || []);
        }
      } catch (error) {
        console.error('Failed to load simulator configuration:', error);
        if (!cancelled) {
          setModuleAssignments([]);
          setModuleError(true);
        }
      } finally {
        if (!cancelled) {
          setModuleLoading(false);
        }
      }
    };

    void loadModules();

    return () => {
      cancelled = true;
    };
  }, [bankData?.stores, currentStoreId]);

  useEffect(() => {
    if (!marketplaceBankId || currentStoreId == null) {
      setProducts([]);
      setProductsLoading(false);
      setProductsError(false);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(false);

      try {
        const response = await productService.getByBank(marketplaceBankId);
        const storeProducts = (response.data || [])
          .filter((product) => product.storeId === currentStoreId)
          .map((product): SimulatorProductItem => ({
            id: product.id,
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            price: product.price,
            storeId: product.storeId,
            storeName: product.storeName,
            parameterValues: product.parameterValues || [],
            createdAt: product.createdAt,
          }))
          .sort((left, right) => getProductSortValue(right.createdAt) - getProductSortValue(left.createdAt));

        if (!cancelled) {
          setProducts(storeProducts);
        }
      } catch (error) {
        console.error('Failed to load simulator products:', error);
        if (!cancelled) {
          setProducts([]);
          setProductsError(true);
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentStoreId, marketplaceBankId]);

  useEffect(() => {
    if (selectedProductId === null && initialProductId !== null) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId, selectedProductId]);

  useEffect(() => {
    const defaultPrice = normalizeNumber(selectedProduct?.price) ?? 0;
    setAcquisitionPrice(defaultPrice);
  }, [selectedProduct?.id, selectedProduct?.price]);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    if (selectedProductId === null || !products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(initialProductId ?? products[0].id);
    }
  }, [initialProductId, products, selectedProductId]);

  useEffect(() => {
    if (selectedProductId !== null) {
      setSearchParams({ productId: String(selectedProductId) }, { replace: true });
    }
  }, [selectedProductId, setSearchParams]);

  useEffect(() => {
    if (!activeSimulationType) {
      return;
    }
    const productPrice = normalizeNumber(acquisitionPrice) ?? 0;
    setContributionAmount((current) => (current > 0 ? current : Math.max((productPrice * activeSimulationType.minContributionRate) / 100, 0)));
    setGrossIncome((current) => (current > 0 ? current : Math.max(productPrice * 2.2, 1500)));
    setOtherMonthlyPayments((current) => (current >= 0 ? current : 0));
    setDurationMonths((current) =>
      current > 0 ? Math.min(Math.max(current, activeSimulationType.minDurationMonths), activeSimulationType.maxDurationMonths) : activeSimulationType.defaultDurationMonths
    );
  }, [acquisitionPrice, activeSimulationType]);

  useEffect(() => {
    if (!selectedPresetId && presets.length > 0) {
      const hinted = presets.find((preset) => preset.key === productTypeHint);
      setSelectedPresetId(hinted?.id || presets[0].id);
      return;
    }

    if (selectedPresetId && !presets.some((preset) => preset.id === selectedPresetId)) {
      const hinted = presets.find((preset) => preset.key === productTypeHint);
      setSelectedPresetId(hinted?.id || presets[0]?.id || '');
    }
  }, [presets, productTypeHint, selectedPresetId]);

  const selectedTypeConfig = activeSimulationType || presets[0] || null;

  const derivedProductPrice = Math.max(normalizeNumber(acquisitionPrice) ?? 0, 0);
  const minimumContributionAmount = selectedTypeConfig ? (derivedProductPrice * selectedTypeConfig.minContributionRate) / 100 : 0;
  const requestedFinancingAmount = Math.max(derivedProductPrice - Math.max(contributionAmount, 0), 0);
  const contributionRatio = derivedProductPrice > 0 ? (Math.max(contributionAmount, 0) / derivedProductPrice) * 100 : 0;
  const fileFeesByRate = selectedTypeConfig ? requestedFinancingAmount * (selectedTypeConfig.fileFeePercentage / 100) : 0;
  const studyFeesByRate = selectedTypeConfig ? requestedFinancingAmount * (selectedTypeConfig.studyFeePercentage / 100) : 0;
  const totalFees = fileFeesByRate + studyFeesByRate + (selectedTypeConfig?.fileFeeAmount || 0) + (selectedTypeConfig?.studyFeeAmount || 0);
  const totalFinancingAmount = requestedFinancingAmount;
  const numberOfMonths = Math.max(durationMonths, 1);
  const monthlyRate = selectedTypeConfig ? selectedTypeConfig.annualRate / 12 / 100 : 0;
  const monthlyInstallment =
    requestedFinancingAmount <= 0
      ? 0
      : monthlyRate <= 0
        ? requestedFinancingAmount / numberOfMonths
        : requestedFinancingAmount * monthlyRate / (1 - (1 + monthlyRate) ** (-numberOfMonths));
  const totalRepaymentAmount = monthlyInstallment * numberOfMonths;
  const remainingAmountToRepay = totalRepaymentAmount;
  const debtRatio = grossIncome > 0 ? ((monthlyInstallment + otherMonthlyPayments) / grossIncome) * 100 : 0;
  const monthlyDebtCapacity = grossIncome > 0 && selectedTypeConfig ? (grossIncome * selectedTypeConfig.debtRatioLimit) / 100 : 0;
  const grossIncomeAccepted = grossIncome > 0;
  const contributionAccepted = contributionAmount >= minimumContributionAmount;
  const financingAccepted =
    selectedTypeConfig?.maxFinancingAmount == null || requestedFinancingAmount <= selectedTypeConfig.maxFinancingAmount;
  const durationAccepted =
    selectedTypeConfig == null
      ? true
      : durationMonths >= selectedTypeConfig.minDurationMonths && durationMonths <= selectedTypeConfig.maxDurationMonths;
  const debtRatioAccepted = selectedTypeConfig ? grossIncomeAccepted && debtRatio <= selectedTypeConfig.debtRatioLimit : grossIncomeAccepted;
  const simulationAccepted = contributionAccepted && financingAccepted && durationAccepted && debtRatioAccepted;
  const validationMessages = [
    !grossIncomeAccepted ? 'Le revenu brut mensuel doit etre superieur a 0.' : null,
    !contributionAccepted
      ? `L'apport personnel minimum requis est de ${formatTnd(minimumContributionAmount)} (${selectedTypeConfig?.minContributionRate.toFixed(0)}%).`
      : null,
    !financingAccepted && selectedTypeConfig?.maxFinancingAmount != null
      ? `Le montant finance depasse le plafond autorise de ${formatTnd(selectedTypeConfig.maxFinancingAmount)}.`
      : null,
    !durationAccepted && selectedTypeConfig
      ? `La duree doit etre comprise entre ${selectedTypeConfig.minDurationMonths} et ${selectedTypeConfig.maxDurationMonths} mois.`
      : null,
    !debtRatioAccepted && selectedTypeConfig
      ? `Le taux d'endettement depasse la limite de ${selectedTypeConfig.debtRatioLimit.toFixed(0)}%.`
      : null,
  ].filter((message): message is string => Boolean(message));

  const annualRate = selectedTypeConfig?.annualRate ?? 0;
  const configuredAnnualRate = annualRate;
  const configuredMinContributionRate = selectedTypeConfig?.minContributionRate ?? 0;
  const sanitizedContribution = Math.max(contributionAmount, 0);
  const estimatedMonthlyPayment = monthlyInstallment;
  const financedCapital = requestedFinancingAmount;
  const interestCost = Math.max(totalRepaymentAmount - requestedFinancingAmount, 0);
  const totalToRepay = totalRepaymentAmount;
  const contributionTooLow = sanitizedContribution < minimumContributionAmount;
  const remainingMonthlyCapacity = Math.max(monthlyDebtCapacity - (monthlyInstallment + otherMonthlyPayments), 0);
  const fileFees = totalFees;
  const simulatorParameterSummary = simulatorParameters.map((parameter) => ({
    label: toFieldLabel(parameter),
    value: formatParameterDisplayValue(parameter),
    required: Boolean(parameter.required),
  }));

  const productOptions = useMemo(
    () => products.map((product) => ({ value: String(product.id), label: product.name })),
    [products]
  );

  const productParameterSummary = useMemo(() => {
    const parameters = selectedProduct?.parameterValues || [];
    return parameters.slice(0, 8).map((parameter) => ({
      label: parameter.parameterName || `Paramètre ${parameter.parameterDefinitionId}`,
      value: parameter.value || '-',
    }));
  }, [selectedProduct?.parameterValues]);

  const resetToPreset = () => {
    if (!selectedTypeConfig) return;

    const productPrice = normalizeNumber(selectedProduct?.price) ?? 0;
    setAcquisitionPrice(productPrice);
    setFinancingType('Crédit classique');
    setContributionAmount(Math.max((productPrice * selectedTypeConfig.minContributionRate) / 100, 0));
    setGrossIncome(Math.max(productPrice * 2.2, 1500));
    setOtherMonthlyPayments(0);
    setDurationMonths(selectedTypeConfig.defaultDurationMonths);
  };

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  const simulatorImage = getBackendAssetUrl(selectedProduct?.imageUrl);
  const displaySelectedProduct = selectedProduct || products[0] || null;

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary/90 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_28%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3 text-sm text-white/75">
                <Link to={`/store/${encodeURIComponent(storeSlug || '')}`} className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour au store
                </Link>
                <span className="text-white/25">/</span>
                <span>Simulator</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simulateur de financement</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">
                Estimez rapidement les mensualités du produit sélectionné en tenant compte des règles propres à ce store,
                du type de simulation et des paramètres configurés depuis le back-office banque.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <Badge variant="secondary" className="bg-white/15 text-white">
                {storeLabel}
              </Badge>
              <div className="text-sm text-white/75">
                {products.length} produit{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''}
              </div>
              <Badge variant="secondary" className="bg-white/15 text-white">
                {canSimulate ? 'Simulator actif' : 'Simulator non disponible'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <Card className="overflow-hidden border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
                <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                        <Calculator className="h-4 w-4" />
                        Produit sélectionné
                      </div>
                      <CardTitle className="text-2xl font-semibold text-slate-900">
                        {displaySelectedProduct?.name || 'Aucun produit sélectionné'}
                      </CardTitle>
                      <CardDescription className="mt-2 max-w-2xl text-base leading-7">
                        {displaySelectedProduct?.description || 'Selectionnez un produit pour afficher les details et lancer la simulation.'}
                      </CardDescription>
                    </div>

                    <div className="min-w-[240px]">
                      <Select
                        label="Choisir un produit"
                        value={selectedProductId ? String(selectedProductId) : ''}
                        onChange={(event) => {
                          const value = normalizeNumber(event.target.value);
                          if (value !== null) {
                            setSelectedProductId(value);
                          }
                        }}
                        options={productOptions.length ? productOptions : [{ value: '', label: 'Aucun produit' }]}
                        disabled={!productOptions.length}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.02fr_0.98fr]">
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
                    {simulatorImage ? (
                      <img
                        src={simulatorImage}
                        alt={displaySelectedProduct?.name || 'Produit'}
                        className="h-[340px] w-full object-contain bg-white p-4"
                      />
                    ) : (
                      <div className="flex h-[340px] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-400">
                        <ImageIcon className="h-14 w-14" />
                      </div>
                    )}

                    <div className="border-t border-slate-200 bg-white px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                          {displaySelectedProduct?.storeName || storeLabel}
                        </Badge>
                        <Badge variant="secondary" className="bg-red-50 text-red-700">
                          {formatTnd(displaySelectedProduct?.price)}
                        </Badge>
                      </div>

                      {productParameterSummary.length > 0 ? (
                        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Caracteristiques produit</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {productParameterSummary.map((row) => (
                              <div key={row.label} className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200">
                                <span className="font-medium text-slate-500">{row.label}</span>
                                <span className="mx-1 text-slate-300">•</span>
                                <span className="font-semibold text-slate-800">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                        Type de simulation
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {presets.map((preset) => {
                          const active = selectedPreset?.id === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setSelectedPresetId(preset.id)}
                              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                                active
                                  ? 'border-primary bg-primary/5 shadow-[0_10px_24px_rgba(37,99,235,0.12)]'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-base font-semibold text-slate-900">{preset.label}</div>
                                {active && <Badge className="bg-primary text-white">Actif</Badge>}
                              </div>
                              <div className="mt-2 text-sm leading-6 text-slate-600">{preset.summary}</div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                                  Apport min. {preset.minContributionRate}%
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                                  Taux {preset.annualRate}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Prix d'acquisition"
                        type="number"
                        min={0}
                        step="0.01"
                        value={acquisitionPrice}
                        onChange={(event) => setAcquisitionPrice(Number(event.target.value || 0))}
                      />
                      <Select
                        label="Type de financement"
                        value={financingType}
                        onChange={(event) => setFinancingType(event.target.value)}
                        options={financingTypeOptions}
                      />
                      <Input
                        label="Apport personnel"
                        type="number"
                        min={0}
                        step="0.01"
                        value={contributionAmount}
                        onChange={(event) => setContributionAmount(Number(event.target.value || 0))}
                      />
                      <Input
                        label="Revenu brut mensuel"
                        type="number"
                        min={0}
                        step="0.01"
                        value={grossIncome}
                        onChange={(event) => setGrossIncome(Number(event.target.value || 0))}
                      />
                      <Input
                        label="Autres mensualités"
                        type="number"
                        min={0}
                        step="0.01"
                        value={otherMonthlyPayments}
                        onChange={(event) => setOtherMonthlyPayments(Number(event.target.value || 0))}
                      />
                      <Input
                        label="Durée (mois)"
                        type="number"
                        min={selectedTypeConfig?.minDurationMonths || 1}
                        max={selectedTypeConfig?.maxDurationMonths || undefined}
                        step={1}
                        value={durationMonths}
                        onChange={(event) => setDurationMonths(Math.max(Number(event.target.value || 1), 1))}
                      />
                      <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          className="w-full text-white sm:flex-1"
                          icon={<Calculator className="h-4 w-4" />}
                          onClick={() => {
                            const target = document.getElementById('simulation-result');
                            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          style={{ backgroundColor: branding.primary_color }}
                          disabled={!displaySelectedProduct}
                        >
                          Simuler
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-slate-300 sm:flex-1"
                          icon={<RotateCcw className="h-4 w-4" />}
                          onClick={resetToPreset}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card id="simulation-result" className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                    <Wallet className="h-4 w-4" />
                    Paramètres du simulateur
                  </div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">
                    Configuration dynamique du store
                  </CardTitle>
                  <CardDescription className="text-base leading-7">
                    Les parametres ci-dessous proviennent de la configuration active du module Simulator pour ce store.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {productsLoading ? (
                    <div className="flex items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50 px-6 py-10 text-slate-500">
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Chargement des produits...
                    </div>
                  ) : productsError ? (
                    <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
                      Impossible de charger les produits disponibles pour ce store.
                    </div>
                  ) : moduleLoading ? (
                    <div className="flex items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50 px-6 py-10 text-slate-500">
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Chargement de la configuration...
                    </div>
                  ) : moduleError ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                      La configuration du simulateur n&apos;a pas pu etre chargee. Les valeurs par defaut sont utilisees.
                    </div>
                  ) : simulatorParameters.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Taux annuel</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-900">{annualRate.toFixed(2)}%</div>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Apport minimum</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-900">
                            {configuredMinContributionRate.toFixed(0)}%
                          </div>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Frais configurés</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(fileFees)}</div>
                          <div className="mt-1 text-sm text-slate-500">Frais de dossier + frais d&apos;etude</div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Parametre
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Valeur
                              </th>
                              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Type
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {simulatorParameterSummary.map((row, index) => (
                              <tr key={`${row.label}-${index}`} className="odd:bg-white even:bg-slate-50/70">
                                <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                                  {row.label}
                                  {row.required ? <span className="ml-1 text-red-500">*</span> : null}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                                  {row.value}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                                  {simulatorParameters[index]?.type || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">
                      Aucun parametre de configuration n&apos;est defini pour ce module. Le simulateur fonctionne avec les
                      valeurs par defaut.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                    <TrendingUp className="h-4 w-4" />
                    Resultats de la simulation
                  </div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">
                    Estimation mensuelle
                  </CardTitle>
                  <CardDescription className="text-base leading-7">
                    Les montants ci-dessous sont estimes a partir du produit et des regles du store selectionne.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-[1.75rem] border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-500">Mensualité estimée</div>
                        <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                          {formatTnd(estimatedMonthlyPayment)}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Basée sur {durationMonths} mois et un taux annuel de {configuredAnnualRate.toFixed(2)}%.
                        </div>
                      </div>
                      <Badge
                        className={`mt-1 ${
                          simulationAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {simulationAccepted ? 'Suffisant' : 'Insuffisant'}
                      </Badge>
                    </div>
                  </div>

                  {validationMessages.length > 0 ? (
                    <div className="space-y-2 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
                      {validationMessages.map((message) => (
                        <div key={message} className="flex items-start gap-2 text-sm leading-6">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{message}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Montant financé</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(totalFinancingAmount)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Frais dossier + étude</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(totalFees)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Taux d&apos;endettement</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{debtRatio.toFixed(1)}%</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Total à rembourser</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(totalToRepay)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Capital financé</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(financedCapital)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Coût du crédit</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(interestCost)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Reste à rembourser</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatTnd(remainingAmountToRepay)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Banknote className="h-4 w-4 text-primary" />
                      Synthese rapide
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Apport personnel</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{formatTnd(sanitizedContribution)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Part de l&apos;apport</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{contributionRatio.toFixed(1)}%</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Capacité mensuelle restante</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {formatTnd(remainingMonthlyCapacity)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Apport minimum requis</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {formatTnd(minimumContributionAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {contributionTooLow && (
                    <div className="flex items-start gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="text-sm leading-6">
                        L&apos;apport personnel est en dessous du minimum recommandé pour ce type de simulation. Le minimum
                        attendu est {configuredMinContributionRate.toFixed(0)}% du prix du produit.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                    <Info className="h-4 w-4" />
                    Configuration active
                  </div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">Paramètres utilisés pour le calcul</CardTitle>
                  <CardDescription className="text-base leading-7">
                    Les valeurs ci-dessous sont dérivées du module Simulator actif pour ce store, avec les valeurs saisies à
                    l&apos;ecran.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Store</div>
                      <div className="mt-2 font-semibold text-slate-900">{storeLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Produit</div>
                      <div className="mt-2 font-semibold text-slate-900">{displaySelectedProduct?.name || '-'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Prix d'acquisition</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatTnd(derivedProductPrice)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Type de simulation</div>
                      <div className="mt-2 font-semibold text-slate-900">{selectedPreset?.label || '-'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Type de financement</div>
                      <div className="mt-2 font-semibold text-slate-900">{financingType}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Durée</div>
                      <div className="mt-2 font-semibold text-slate-900">{durationMonths} mois</div>
                    </div>
                  </div>

                  {simulatorParameterSummary.length > 0 ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Paramètre
                            </th>
                            <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Valeur
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulatorParameterSummary.map((row) => (
                            <tr key={row.label} className="odd:bg-white even:bg-slate-50/70">
                              <td className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                                {row.label}
                                {row.required ? <span className="ml-1 text-red-500">*</span> : null}
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Aucune configuration détaillée n&apos;est disponible pour ce module.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      className="min-w-[180px] text-white"
                      icon={<Calculator className="h-4 w-4" />}
                      onClick={resetToPreset}
                      style={{ backgroundColor: branding.primary_color }}
                      disabled={!displaySelectedProduct}
                    >
                      Recalculer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[180px] border-slate-300"
                      onClick={() => navigate(`/store/${encodeURIComponent(storeSlug || '')}`)}
                    >
                      Retour au store
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function storesReady(stores?: MarketplaceStoreDetail[] | null) {
  return Array.isArray(stores);
}
