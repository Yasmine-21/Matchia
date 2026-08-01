import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useOutletContext, useParams, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Image as ImageIcon,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
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

const resolveFeeSettlementMode = (parameters: ModuleParameter[], typeKey?: string) => {
  const text = resolveParameterText(
    parameters,
    ['filefeemode', 'fraisdossiermode', 'feepaymentmode', 'feesmode', 'feessettlement', 'fraissepares', 'fraisseparees'],
    typeKey
  );

  const normalized = normalizeLookupKey(text);
  if (!normalized) {
    return 'separate';
  }

  if (
    ['financed', 'finance', 'capitalise', 'capitalized', 'included', 'integrated', 'rolledin'].some((alias) =>
      normalized.includes(alias)
    )
  ) {
    return 'financed';
  }

  if (['separate', 'separately', 'distinct', 'cash', 'upfront', 'paidseparately'].some((alias) => normalized.includes(alias))) {
    return 'separate';
  }

  return 'separate';
};

export function SimulatorModule() {
  const { storeSlug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bankData, branding, marketplace } = useOutletContext<any>();

  const [products, setProducts] = useState<SimulatorProductItem[]>([]);
  const [, setProductsLoading] = useState(true);
  const [, setProductsError] = useState(false);
  const [moduleAssignments, setModuleAssignments] = useState<ModuleAssignment[]>([]);
  const [, setModuleLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [acquisitionPrice, setAcquisitionPrice] = useState<number>(0);
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
              : 'Règles de financement générales configurées par la banque.',
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

  const derivedProductPrice = Math.max(normalizeNumber(selectedProduct?.price) ?? normalizeNumber(acquisitionPrice) ?? 0, 0);
  const minimumContributionAmount = selectedTypeConfig ? (derivedProductPrice * selectedTypeConfig.minContributionRate) / 100 : 0;
  const sanitizedContribution = Math.max(contributionAmount, 0);
  const requestedFinancingAmount = Math.max(derivedProductPrice - sanitizedContribution, 0);
  const dossierFeesAmount = requestedFinancingAmount * 0.02;
  const feesSettlementMode = resolveFeeSettlementMode(simulatorParameters, selectedTypeConfig?.key);
  const feesPaidSeparately = feesSettlementMode !== 'financed';
  const financedAmount = requestedFinancingAmount + (feesPaidSeparately ? 0 : dossierFeesAmount);
  const numberOfMonths = Math.max(durationMonths, 1);
  const monthlyRate = selectedTypeConfig ? selectedTypeConfig.annualRate / 12 / 100 : 0;
  const monthlyInstallment =
    financedAmount <= 0
      ? 0
      : monthlyRate <= 0
        ? financedAmount / numberOfMonths
        : financedAmount * monthlyRate / (1 - (1 + monthlyRate) ** (-numberOfMonths));
  const totalMonthlyPayments = monthlyInstallment * numberOfMonths;
  const totalAmountDue = totalMonthlyPayments + (feesPaidSeparately ? dossierFeesAmount : 0);
  const interestCost = Math.max(totalMonthlyPayments - financedAmount, 0);
  const grossIncomeAccepted = grossIncome > 0;
  const contributionAccepted = sanitizedContribution >= minimumContributionAmount;
  const financingAccepted =
    selectedTypeConfig?.maxFinancingAmount == null || requestedFinancingAmount <= selectedTypeConfig.maxFinancingAmount;
  const durationAccepted =
    selectedTypeConfig == null
      ? true
      : durationMonths >= selectedTypeConfig.minDurationMonths && durationMonths <= selectedTypeConfig.maxDurationMonths;
  const simulationAccepted = contributionAccepted && financingAccepted && durationAccepted && grossIncomeAccepted;
  const validationMessages = [
    !grossIncomeAccepted ? 'Le revenu net mensuel doit être supérieur à 0.' : null,
    !contributionAccepted
      ? `L'apport personnel minimum requis est de ${formatTnd(minimumContributionAmount)} (${selectedTypeConfig?.minContributionRate.toFixed(0)}%).`
      : null,
    !financingAccepted && selectedTypeConfig?.maxFinancingAmount != null
      ? `Le montant financé dépasse le plafond autorisé de ${formatTnd(selectedTypeConfig.maxFinancingAmount)}.`
      : null,
    !durationAccepted && selectedTypeConfig
      ? `La durée doit être comprise entre ${selectedTypeConfig.minDurationMonths} et ${selectedTypeConfig.maxDurationMonths} mois.`
      : null,
  ].filter((message): message is string => Boolean(message));

  const configuredAnnualRate = selectedTypeConfig?.annualRate ?? 0;
  const estimatedMonthlyPayment = monthlyInstallment;
  const financedCapital = financedAmount;
  const totalToRepay = totalMonthlyPayments;

  const productOptions = useMemo(
    () => products.map((product) => ({ value: String(product.id), label: product.name })),
    [products]
  );

  const productCharacteristics = useMemo(() => {
    const seen = new Set<string>();

    return (selectedProduct?.parameterValues || [])
      .map((parameter) => ({
        label: parameter.parameterName || `Paramètre ${parameter.parameterDefinitionId}`,
        value: String(parameter.value ?? '').trim(),
      }))
      .filter((item) => item.value !== '')
      .filter((item) => {
        const signature = `${item.label}:${item.value}`.toLowerCase();
        if (seen.has(signature)) {
          return false;
        }
        seen.add(signature);
        return true;
      })
      .slice(0, 6);
  }, [selectedProduct?.parameterValues]);

  const resetToPreset = () => {
    if (!selectedTypeConfig) return;

    const productPrice = normalizeNumber(selectedProduct?.price) ?? 0;
    setAcquisitionPrice(productPrice);
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
  const storeBannerUrl = branding.banner_image_url || getBackendAssetUrl(store?.banniereUrl || store?.banniere_url);
  const storeHeroOverlay = `linear-gradient(135deg, ${branding.primary_color}CC 0%, ${branding.secondary_color}C6 100%)`;

  return (
    <div className="min-h-screen bg-background">
      <section
        className="relative h-96 flex items-center bg-cover bg-center px-4 py-12 text-white sm:px-6 lg:px-8"
        style={
          storeBannerUrl
            ? {
                backgroundImage: `url(${storeBannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        <div className="absolute inset-0" style={{ background: storeHeroOverlay }} />
        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center">
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3 text-sm text-white/75">
                <Link to={`/store/${encodeURIComponent(storeSlug || '')}`} className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour au store
                </Link>
                <span className="text-white/25">/</span>
                <span>Simulateur</span>
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
                {canSimulate ? 'Simulateur actif' : 'Simulateur non disponible'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {moduleError && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              La configuration du simulateur n'a pas pu être chargée. Les valeurs par défaut sont utilisées.
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-3">
            <Card className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                  <Calculator className="h-4 w-4" />
                  Informations du produit
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900">
                  {displaySelectedProduct?.name || 'Aucun produit sélectionné'}
                </CardTitle>
                <CardDescription className="text-base leading-7">
                  L'image, le prix et les caractéristiques principales du produit sélectionné sont affichés ici.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {productOptions.length > 1 && (
                  <Select
                    label="Produit à simuler"
                    value={selectedProductId ? String(selectedProductId) : ''}
                    onChange={(event) => {
                      const value = normalizeNumber(event.target.value);
                      if (value !== null) {
                        setSelectedProductId(value);
                      }
                    }}
                    options={productOptions}
                  />
                )}

                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
                  {simulatorImage ? (
                    <img
                      src={simulatorImage}
                      alt={displaySelectedProduct?.name || 'Produit'}
                      className="h-[280px] w-full object-contain bg-white p-4"
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-400">
                      <ImageIcon className="h-14 w-14" />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Nom du produit</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">{displaySelectedProduct?.name || '-'}</div>
                  </div>
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                    {formatTnd(derivedProductPrice)}
                  </div>
                </div>

                <p className="text-sm leading-7 text-slate-600">
                  {displaySelectedProduct?.description || 'Aucune description disponible pour ce produit.'}
                </p>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Caractéristiques principales
                  </div>
                  {productCharacteristics.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {productCharacteristics.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Aucune caractéristique disponible pour ce produit.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                  <SlidersHorizontal className="h-4 w-4" />
                  Données saisies par le client
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Paramètres de simulation</CardTitle>
                <CardDescription className="text-base leading-7">
                  Les résultats se mettent à jour automatiquement à chaque modification.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Prix d'acquisition</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(derivedProductPrice)}</div>
                  <div className="mt-1 text-sm text-slate-500">Récupéré automatiquement depuis le produit.</div>
                </div>

                {presets.length > 0 && (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Type de simulation
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {presets.map((preset) => {
                        const isActive = preset.id === selectedTypeConfig?.id;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedPresetId(preset.id)}
                            className={`group relative flex h-full min-h-[260px] flex-col rounded-[1.35rem] border p-4 text-left transition-all duration-200 ${
                              isActive
                                ? 'border-primary bg-white shadow-[0_14px_30px_rgba(37,99,235,0.12)] ring-1 ring-primary/30'
                                : 'border-slate-200 bg-white hover:border-primary/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                            }`}
                          >
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <div
                                  className={`text-xl font-semibold tracking-tight ${
                                    isActive ? 'text-primary' : 'text-slate-900'
                                  }`}
                                >
                                  {preset.label}
                                </div>
                                <div className="mt-2 text-sm leading-6 text-slate-500">{preset.summary}</div>
                              </div>
                              {isActive && (
                                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                  Actif
                                </span>
                              )}
                            </div>

                            <div className="mt-auto space-y-2">
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                Apport min. {preset.minContributionRate.toFixed(0)}%
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                Taux {preset.annualRate.toFixed(1)}%
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                Durée {preset.minDurationMonths} - {preset.maxDurationMonths} mois
                              </div>
                              {preset.maxFinancingAmount != null && (
                                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                  Plafond {formatTnd(preset.maxFinancingAmount)}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Apport personnel"
                    type="number"
                    min={0}
                    step="0.01"
                    value={contributionAmount}
                    onChange={(event) => setContributionAmount(Number(event.target.value || 0))}
                  />
                  <Input
                    label="Revenu net mensuel"
                    type="number"
                    min={0}
                    step="0.01"
                    value={grossIncome}
                    onChange={(event) => setGrossIncome(Number(event.target.value || 0))}
                  />
                  <Input
                    label="Autres mensualités en cours"
                    type="number"
                    min={0}
                    step="0.01"
                    value={otherMonthlyPayments}
                    onChange={(event) => setOtherMonthlyPayments(Number(event.target.value || 0))}
                  />
                  <Input
                    label="Durée de remboursement"
                    type="number"
                    min={selectedTypeConfig?.minDurationMonths || 1}
                    max={selectedTypeConfig?.maxDurationMonths || undefined}
                    step={1}
                    value={durationMonths}
                    onChange={(event) => {
                      const nextValue = Math.max(Number(event.target.value || 1), 1);
                      setDurationMonths(
                        selectedTypeConfig
                          ? Math.min(Math.max(nextValue, selectedTypeConfig.minDurationMonths), selectedTypeConfig.maxDurationMonths)
                          : nextValue
                      );
                    }}
                  />
                </div>

                {validationMessages.length > 0 && (
                  <div className="space-y-2 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
                    {validationMessages.map((message) => (
                      <div key={message} className="flex items-start gap-2 text-sm leading-6">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{message}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="min-w-[180px] text-white"
                    icon={<Calculator className="h-4 w-4" />}
                    onClick={() => {
                      const target = document.getElementById('simulation-result');
                      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    style={{ backgroundColor: branding.primary_color }}
                    disabled={!displaySelectedProduct}
                  >
                    Voir les résultats
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[180px] border-slate-300"
                    icon={<RotateCcw className="h-4 w-4" />}
                    onClick={resetToPreset}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card id="simulation-result" className="border-slate-200 shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                  <TrendingUp className="h-4 w-4" />
                  Résultats de la simulation
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Résumé financier</CardTitle>
                <CardDescription className="text-base leading-7">
                  Les résultats sont recalculés immédiatement à chaque modification des champs.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div
                  className={`rounded-[1.75rem] border p-5 ${
                    simulationAccepted ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-500">Statut d'éligibilité</div>
                      <div className={`mt-2 text-2xl font-bold ${simulationAccepted ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {simulationAccepted ? 'Éligible' : 'Non éligible'}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {simulationAccepted
                          ? 'La simulation respecte les règles configurées par la banque.'
                          : validationMessages[0] || 'Les valeurs saisies ne permettent pas encore de valider la simulation.'}
                      </div>
                    </div>
                    <Badge className={`${simulationAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {simulationAccepted ? 'Conforme' : 'À corriger'}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-primary/20 bg-primary/5 p-5">
                  <div className="text-sm font-medium text-slate-500">Mensualité estimée</div>
                  <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
                    {formatTnd(estimatedMonthlyPayment)}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Calculée sur {durationMonths} mois avec un taux annuel de {configuredAnnualRate.toFixed(2)}%.
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Montant financé</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(financedCapital)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Intérêts</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(interestCost)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Frais de dossier</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(dossierFeesAmount)}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {feesPaidSeparately ? 'Payés séparément' : 'Intégrés au capital'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Total des mensualités</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(totalToRepay)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Montant total dû</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(totalAmountDue)}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {feesPaidSeparately ? 'Inclut les frais payés à part.' : 'Les frais sont déjà inclus dans le capital.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

function storesReady(stores?: MarketplaceStoreDetail[] | null) {
  return Array.isArray(stores);
}
