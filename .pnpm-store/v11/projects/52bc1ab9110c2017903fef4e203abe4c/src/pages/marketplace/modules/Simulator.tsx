import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
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
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { moduleService } from '../../../services/moduleService';
import { dealerService } from '../../../services/dealerService';
import { productService } from '../../../services/productService';
import type { ModuleAssignment, ModuleParameter, ProductDto } from '../../../types/apiTypes';
import { useApp } from '../../../context/AppContext';
import { isBannerModule } from '../../../utils/moduleVisibility';
import { resolveApiUrl } from '../../../api/apiClient';
import { BANNER_BACKGROUND_STYLE, BANNER_FRAME_CLASS } from '../../../config/banner';

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
  bannerImageUrl?: string | null;
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
  dealerProduct?: boolean;
  dealerProductId?: number;
}

interface FinancingConfiguration {
  minContributionRate: number;
  minContributionAmount: number | null;
  annualRate: number;
  maxFinancingAmount: number | null;
  processingFeePercentage: number | null;
  processingFeeAmount: number | null;
  feesSettlementMode: 'financed' | 'separate';
  minDurationMonths: number;
  maxDurationMonths: number;
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

const resolveParameterText = (parameters: ModuleParameter[], aliases: string[]) => {
  const matches = (parameter: ModuleParameter) => {
    const lookupKeys = getParameterLookupKeys(parameter);
    const aliasMatch = lookupKeys.some((lookupKey) => aliases.some((alias) => lookupKey.includes(alias)));
    return aliasMatch;
  };

  const genericMatch = parameters.find(matches);
  if (genericMatch) {
    const value = getParameterTextValue(genericMatch);
    if (value !== null) return value;
  }

  return null;
};

const resolveParameterNumber = (parameters: ModuleParameter[], aliases: string[]) => {
  const textValue = resolveParameterText(parameters, aliases);
  if (textValue === null) {
    return null;
  }

  const parsed = normalizeNumber(textValue);
  return parsed;
};

const resolveFeeSettlementMode = (parameters: ModuleParameter[]) => {
  const text = resolveParameterText(
    parameters,
    ['filefeemode', 'fraisdossiermode', 'feepaymentmode', 'feesmode', 'feessettlement', 'fraissepares', 'fraisseparees'],
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
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bankData, branding, marketplace } = useOutletContext<any>();

  const [products, setProducts] = useState<SimulatorProductItem[]>([]);
  const [, setProductsLoading] = useState(true);
  const [, setProductsError] = useState(false);
  const [moduleAssignments, setModuleAssignments] = useState<ModuleAssignment[]>([]);
  const [, setModuleLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [acquisitionPrice, setAcquisitionPrice] = useState<number>(0);
  const [contributionAmount, setContributionAmount] = useState<number>(0);
  const [grossIncome, setGrossIncome] = useState<number>(0);
  const [otherMonthlyPayments, setOtherMonthlyPayments] = useState<number>(0);
  const [durationMonths, setDurationMonths] = useState<number>(0);
  const [isFinancingAccessModalOpen, setIsFinancingAccessModalOpen] = useState(false);

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
  const marketplaceSlug = bankData?.slug || marketplace?.bankSlug || '';
  const modules = (store?.modules || []).filter((module) => module.enabled !== false && module.visible !== false);
  const isBannerActive = modules.some(isBannerModule);
  const canSimulate = modules.some(isSimulatorModule);
  const simulatorAssignment = useMemo(
    () => moduleAssignments.find((assignment) => isSimulatorModule(assignment.module)),
    [moduleAssignments]
  );
  const simulatorParameters = simulatorAssignment?.parameters || [];
  const financingConfiguration = useMemo<FinancingConfiguration | null>(() => {
    const minContributionRate = resolveParameterNumber(
      simulatorParameters,
      ['minimumcontributionrate', 'minimumcontributionpercentage', 'contributionminpercentage', 'apportminpourcentage']
    );
    const minContributionAmount = resolveParameterNumber(
      simulatorParameters,
      ['minimumcontributionamount', 'contributionminamount', 'apportminmontant', 'apportage', 'apportmin']
    );
    const annualRate = resolveParameterNumber(
      simulatorParameters,
      ['annualinterestrate', 'interestrate', 'tauxinteret', 'taux']
    );
    const minDurationMonths = resolveParameterNumber(
      simulatorParameters,
      ['mindurationmonths', 'minimumdurationmonths', 'minimumduration', 'dureeminimum', 'dureemin']
    );
    const maxDurationMonths = resolveParameterNumber(
      simulatorParameters,
      ['maxdurationmonths', 'maximumdurationmonths', 'maximumduration', 'dureemaximum', 'dureemax']
    );
    const processingFeeAmount = resolveParameterNumber(
      simulatorParameters,
      ['filefeeamount', 'filefeesamount', 'fraisdossiermontant', 'processingfeeamount']
    );
    const processingFeePercentage = resolveParameterNumber(
      simulatorParameters,
      ['filefeepercentage', 'fraisdossierpourcentage', 'fraisdedossierpourcentage', 'fraisdossier', 'fraisdedossier', 'fraisapplicationpourcentage', 'processingfeepercentage']
    );

    if (
      ((minContributionRate === null || minContributionRate < 0) && (minContributionAmount === null || minContributionAmount < 0)) ||
      annualRate === null || annualRate < 0 ||
      minDurationMonths === null || minDurationMonths < 1 ||
      maxDurationMonths === null || maxDurationMonths < minDurationMonths ||
      ((processingFeeAmount === null || processingFeeAmount < 0) && (processingFeePercentage === null || processingFeePercentage < 0))
    ) {
      return null;
    }

    return {
      minContributionRate: minContributionRate ?? 0,
      minContributionAmount: minContributionAmount !== null && minContributionAmount >= 0 ? minContributionAmount : null,
      annualRate,
      maxFinancingAmount: resolveParameterNumber(
        simulatorParameters,
        ['maxfinancingamount', 'maximumfinancingamount', 'plafondfinancement', 'financingceiling']
      ),
      processingFeeAmount: processingFeeAmount !== null && processingFeeAmount >= 0 ? processingFeeAmount : null,
      processingFeePercentage: processingFeePercentage !== null && processingFeePercentage >= 0 ? processingFeePercentage : null,
      feesSettlementMode: resolveFeeSettlementMode(simulatorParameters),
      minDurationMonths: Math.ceil(minDurationMonths),
      maxDurationMonths: Math.floor(maxDurationMonths),
    };
  }, [simulatorParameters]);

  const initialProductId = useMemo(() => {
    const queryProductId = normalizeNumber(searchParams.get('productId'));
    const stateProductId = normalizeNumber((location.state as { productId?: number | string } | null)?.productId ?? null);
    return queryProductId ?? stateProductId;
  }, [location.state, searchParams]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || products[0] || null,
    [products, selectedProductId]
  );


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
        const [bankResult, dealerResult] = await Promise.allSettled([
          productService.getByBank(marketplaceBankId),
          dealerService.marketplaceProducts(marketplaceSlug, currentStoreId),
        ]);
        const storeProducts = (bankResult.status === 'fulfilled' ? bankResult.value.data : [])
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
          }));
        const dealerProducts = (dealerResult.status === 'fulfilled' ? dealerResult.value.data : []).map((product): SimulatorProductItem => ({
          id: -product.id,
          dealerProductId: product.id,
          dealerProduct: true,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          storeId: product.storeId,
          storeName: product.storeName,
          parameterValues: (product.parameterValues || []).map((value) => ({ id: value.definitionId, parameterDefinitionId: value.definitionId, parameterName: value.name, value: value.value })),
          createdAt: product.createdAt,
        }));
        const allProducts = [...storeProducts, ...dealerProducts]
          .sort((left, right) => getProductSortValue(right.createdAt) - getProductSortValue(left.createdAt));

        if (!cancelled) {
          setProducts(allProducts);
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
  }, [currentStoreId, marketplaceBankId, marketplaceSlug]);

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
    if (!financingConfiguration) {
      return;
    }
    const productPrice = normalizeNumber(acquisitionPrice) ?? 0;
    const requiredContribution = financingConfiguration.minContributionAmount ?? Math.max((productPrice * financingConfiguration.minContributionRate) / 100, 0);
    setContributionAmount((current) => (current > 0 ? current : requiredContribution));
    setGrossIncome((current) => (current > 0 ? current : Math.max(productPrice * 2.2, 1500)));
    setOtherMonthlyPayments((current) => (current >= 0 ? current : 0));
    setDurationMonths((current) =>
      current > 0
        ? Math.min(Math.max(current, financingConfiguration.minDurationMonths), financingConfiguration.maxDurationMonths)
        : financingConfiguration.minDurationMonths
    );
  }, [acquisitionPrice, financingConfiguration]);

  const derivedProductPrice = Math.max(normalizeNumber(selectedProduct?.price) ?? normalizeNumber(acquisitionPrice) ?? 0, 0);
  const minimumContributionAmount = financingConfiguration
    ? financingConfiguration.minContributionAmount ?? (derivedProductPrice * financingConfiguration.minContributionRate) / 100
    : 0;
  const sanitizedContribution = Math.max(contributionAmount, 0);
  const requestedFinancingAmount = Math.max(derivedProductPrice - sanitizedContribution, 0);
  const dossierFeesAmount = financingConfiguration?.processingFeeAmount ??
    (financingConfiguration?.processingFeePercentage !== null && financingConfiguration?.processingFeePercentage !== undefined
      ? requestedFinancingAmount * financingConfiguration.processingFeePercentage / 100
      : 0);
  const feesSettlementMode = financingConfiguration?.feesSettlementMode || 'separate';
  const feesPaidSeparately = feesSettlementMode !== 'financed';
  const financedAmount = requestedFinancingAmount + (feesPaidSeparately ? 0 : dossierFeesAmount);
  const numberOfMonths = Math.max(durationMonths, 1);
  const monthlyRate = financingConfiguration ? financingConfiguration.annualRate / 12 / 100 : 0;
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
    financingConfiguration?.maxFinancingAmount == null || requestedFinancingAmount <= financingConfiguration.maxFinancingAmount;
  const durationAccepted =
    financingConfiguration !== null &&
    durationMonths >= financingConfiguration.minDurationMonths && durationMonths <= financingConfiguration.maxDurationMonths;
  const simulationAccepted = financingConfiguration !== null && contributionAccepted && financingAccepted && durationAccepted && grossIncomeAccepted;
  const validationMessages = [
    !financingConfiguration ? 'La configuration de financement de cette banque est indisponible. Veuillez contacter la banque.' : null,
    !grossIncomeAccepted ? 'Le revenu net mensuel doit être supérieur à 0.' : null,
    !contributionAccepted
      ? `L'apport personnel minimum requis est de ${formatTnd(minimumContributionAmount)}${financingConfiguration?.minContributionAmount === null ? ` (${financingConfiguration?.minContributionRate.toFixed(0)}%)` : ''}.`
      : null,
    !financingAccepted && financingConfiguration?.maxFinancingAmount != null
      ? `Le montant financé dépasse le plafond autorisé de ${formatTnd(financingConfiguration.maxFinancingAmount)}.`
      : null,
    !durationAccepted && financingConfiguration
      ? `La durée doit être comprise entre ${financingConfiguration.minDurationMonths} et ${financingConfiguration.maxDurationMonths} mois.`
      : null,
  ].filter((message): message is string => Boolean(message));

  const configuredAnnualRate = financingConfiguration?.annualRate ?? 0;
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

  const resetSimulation = () => {
    if (!financingConfiguration) return;

    const productPrice = normalizeNumber(selectedProduct?.price) ?? 0;
    setAcquisitionPrice(productPrice);
    setContributionAmount(financingConfiguration.minContributionAmount ?? Math.max((productPrice * financingConfiguration.minContributionRate) / 100, 0));
    setGrossIncome(Math.max(productPrice * 2.2, 1500));
    setOtherMonthlyPayments(0);
    setDurationMonths(financingConfiguration.minDurationMonths);
  };

  if (!store) {
    return <div className="p-6">Store non trouve</div>;
  }

  const simulatorImage = resolveApiUrl(selectedProduct?.imageUrl);
  const displaySelectedProduct = selectedProduct || products[0] || null;
  const customStoreBannerUrl = isBannerActive ? resolveApiUrl(store?.bannerImageUrl) : '';
  const storeBannerUrl = customStoreBannerUrl || (isBannerActive
    ? resolveApiUrl(store?.banniereUrl || store?.banniere_url)
    : '');
  const storeHeroOverlay = `linear-gradient(135deg, ${branding.primary_color}CC 0%, ${branding.secondary_color}C6 100%)`;

  const applyForFinancing = () => {
    if (!displaySelectedProduct || currentStoreId == null) return;
    const financingContext = {
      productId: displaySelectedProduct.id,
      dealerProductId: displaySelectedProduct.dealerProduct ? displaySelectedProduct.dealerProductId : undefined,
      productName: displaySelectedProduct.name,
      productImageUrl: displaySelectedProduct.imageUrl,
      storeId: currentStoreId,
      storeName: store?.label || store?.name,
      requestedAmount: financedCapital,
      monthlyPayment: estimatedMonthlyPayment,
      downPayment: sanitizedContribution,
      durationMonths,
      annualRate: configuredAnnualRate,
      simulationData: JSON.stringify({
        grossIncome,
        otherMonthlyPayments,
        contributionAmount: sanitizedContribution,
        requestedFinancingAmount,
        financedAmount,
        monthlyPayment: estimatedMonthlyPayment,
        fees: dossierFeesAmount,
        feesSettlementMode,
        totalAmountDue,
        bankConfiguration: financingConfiguration,
      }),
    };
    if (currentUser?.role === 'CLIENT') {
      navigate('/client/financing-requests/new', { state: financingContext });
      return;
    }
    if (currentUser) {
      setIsFinancingAccessModalOpen(true);
      return;
    }
    sessionStorage.setItem('matchia-financing-context', JSON.stringify(financingContext));
    navigate('/inscription', { state: { from: '/client/financing-requests/new' } });
  };

  return (
    <div className="min-h-screen bg-background">
      <section
        className={`relative ${BANNER_FRAME_CLASS} flex items-center px-4 py-12 text-white sm:px-6 lg:px-8`}
        style={
          storeBannerUrl
            ? BANNER_BACKGROUND_STYLE(storeBannerUrl)
            : { background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }
        }
      >
        {!customStoreBannerUrl && <div className="absolute inset-0" style={{ background: storeHeroOverlay }} />}
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
                Estimez rapidement les mensualités du produit sélectionné selon les paramètres configurés par la banque pour ce store.
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
              La configuration du simulateur n'a pas pu être chargée. Aucune simulation ne peut être effectuée sans les paramètres de la banque.
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

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Conditions de financement de la banque
                  </div>
                  {financingConfiguration ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">Apport minimum&nbsp;: <b>{financingConfiguration.minContributionAmount !== null ? formatTnd(financingConfiguration.minContributionAmount) : `${financingConfiguration.minContributionRate.toFixed(2)}%`}</b></div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">Taux annuel&nbsp;: <b>{financingConfiguration.annualRate.toFixed(2)}%</b></div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">Durée&nbsp;: <b>{financingConfiguration.minDurationMonths} à {financingConfiguration.maxDurationMonths} mois</b></div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">Frais de dossier&nbsp;: <b>{financingConfiguration.processingFeeAmount !== null ? formatTnd(financingConfiguration.processingFeeAmount) : `${financingConfiguration.processingFeePercentage?.toFixed(2)}%`}</b></div>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-amber-800">Les paramètres obligatoires (apport, taux, frais et durées) doivent être configurés par la banque avant toute simulation.</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Apport personnel"
                    type="number"
                    min={minimumContributionAmount}
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
                    min={financingConfiguration?.minDurationMonths || 1}
                    max={financingConfiguration?.maxDurationMonths || undefined}
                    step={1}
                    value={durationMonths}
                    onChange={(event) => {
                      const nextValue = Math.max(Number(event.target.value || 1), 1);
                      setDurationMonths(
                        financingConfiguration
                          ? Math.min(Math.max(nextValue, financingConfiguration.minDurationMonths), financingConfiguration.maxDurationMonths)
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
                    disabled={!displaySelectedProduct || !financingConfiguration}
                  >
                    Voir les résultats
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[180px] border-slate-300"
                    icon={<RotateCcw className="h-4 w-4" />}
                    onClick={resetSimulation}
                    disabled={!financingConfiguration}
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
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Prix du produit</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(derivedProductPrice)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Apport personnel</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(sanitizedContribution)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Montant financé</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{formatTnd(financedCapital)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Taux et durée</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{configuredAnnualRate.toFixed(2)}% · {durationMonths} mois</div>
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
                <div className="rounded-[1.5rem] border border-primary/20 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">Prêt à constituer votre dossier ?</div>
                      <div className="text-sm text-slate-600">Vos données de simulation seront reprises automatiquement.</div>
                    </div>
                    <Button type="button" disabled={!simulationAccepted || !displaySelectedProduct} onClick={applyForFinancing} style={{ backgroundColor: branding.primary_color }}>
                      Demander un financement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Modal
        isOpen={isFinancingAccessModalOpen}
        onClose={() => setIsFinancingAccessModalOpen(false)}
        title="Accès non autorisé"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Cette fonctionnalité est réservée aux comptes clients. Utilisez un compte client pour soumettre une demande de financement.
          </p>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setIsFinancingAccessModalOpen(false)}>Fermer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function storesReady(stores?: MarketplaceStoreDetail[] | null) {
  return Array.isArray(stores);
}
