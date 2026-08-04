import '../../styles/JoinPage.css';
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Car,
  Check,
  CheckCircle,
  FileText,
  Globe2,
  GraduationCap,
  HeartPulse,
  Image as ImageIcon,
  Landmark,
  Loader2,
  Mail,
  Palette,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  Store as StoreIcon,
  Upload,
  UserRound,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
import { storeService } from '../../services/storeService';
import { moduleService } from '../../services/moduleService';
import { requestService } from '../../services/requestService';
import { ModuleAssignment, StoreDto } from '../../types/apiTypes';
import { toast } from 'sonner';

const STORE_BASE_PRICE = 120;
const MODULE_BASE_PRICE = 35;
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TUNISIAN_PHONE_PATTERN = /^\d{8}$/;

const hsvToHex = (hue: number, saturation: number, value: number) => {
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = value - chroma;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] :
    hue < 120 ? [x, chroma, 0] :
    hue < 180 ? [0, chroma, x] :
    hue < 240 ? [0, x, chroma] :
    hue < 300 ? [x, 0, chroma] :
    [chroma, 0, x];

  return [r, g, b]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .replace(/^/, '#');
};

const formatTnd = (amount: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount);

const getStorePrice = (store: StoreDto) => store.price ?? STORE_BASE_PRICE;
const getModulePrice = (assignment: ModuleAssignment) => assignment.price ?? assignment.module.price ?? MODULE_BASE_PRICE;

const getStoreContextIcon = (store: StoreDto) => {
  const context = `${store.name || ''} ${store.description || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/\bmobile\b|\bsmartphone\b|\btelephone\b|\btelecom\b/.test(context)) {
    return Smartphone;
  }

  if (/medical|sante|soin|health/.test(context)) {
    return HeartPulse;
  }

  if (/vehicule|vehicle|automobile|voiture|moto|auto\b|car\b/.test(context)) {
    return Car;
  }

  if (/education|etude|ecole|universit|formation|school/.test(context)) {
    return GraduationCap;
  }

  if (/immobilier|logement|maison|habitat|construction|terrain/.test(context)) {
    return Building2;
  }

  return StoreIcon;
};

export function JoinPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [modulesByStore, setModulesByStore] = useState<Record<number, ModuleAssignment[]>>({});
  const [selectedStoreForModules, setSelectedStoreForModules] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    bankEmail: '',
    bankPhone: '',
    country: 'Tunisie',
    website: '',
    bankDescription: '',
    establishmentYear: '',
    logo: null as File | null,
    contactName: '',
    email: '',
    phone: '',
    contactImage: null as File | null,
    marketplaceSlug: '',
    marketplaceDescription: '',
    primaryColor: '#F97316',
    secondaryColor: '#2563EB',
    banniere: null as File | null,
    selectedStores: [] as number[],
    selectedModulesByStore: {} as Record<number, number[]>,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [contactImagePreviewUrl, setContactImagePreviewUrl] = useState('');
  const [bannierePreviewUrl, setBannierePreviewUrl] = useState('');
  const [colorPickers, setColorPickers] = useState({
    primaryColor: { hue: 24, saturation: 0.91, value: 0.97 },
    secondaryColor: { hue: 221, saturation: 0.83, value: 0.92 },
  });

  const totalSteps = 4;
  const steps = [
    'Informations bancaires',
    'Coordonnees',
    'Boutiques & Modules',
    'Finalisation',
  ];

  useEffect(() => {
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      setCatalogError('');
      try {
        const response = await storeService.getStoresByStatus('active');
        setStores(response.data);
      } catch (error) {
        console.error('Failed to load stores:', error);
        setCatalogError("Impossible de charger les boutiques pour le moment.");
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    return () => {
      [logoPreviewUrl, contactImagePreviewUrl, bannierePreviewUrl].forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [logoPreviewUrl, contactImagePreviewUrl, bannierePreviewUrl]);

  const loadModulesForStore = async (storeId: number) => {
    if (modulesByStore[storeId]) return;

    try {
      const response = await moduleService.getActiveStoreModulesWithConfig(storeId);
      setModulesByStore((prev) => ({
        ...prev,
        [storeId]: response.data.filter((assignment) => assignment.module.status === 'active'),
      }));
    } catch (error) {
      console.error(`Failed to load modules for store ${storeId}:`, error);
      setModulesByStore((prev) => ({ ...prev, [storeId]: [] }));
    }
  };

  const selectedStores = useMemo(
    () => stores.filter((store) => formData.selectedStores.includes(store.id)),
    [stores, formData.selectedStores],
  );

  const selectedModuleIds = useMemo(
    () => Object.values(formData.selectedModulesByStore).flat(),
    [formData.selectedModulesByStore],
  );

  const totalAmount = useMemo(() => {
    const storesTotal = selectedStores.reduce((sum, store) => sum + getStorePrice(store), 0);
    const modulesTotal = selectedStores.reduce((sum, store) => {
      const selectedForStore = formData.selectedModulesByStore[store.id] || [];
      const storeModules = modulesByStore[store.id] || [];
      return sum + storeModules
        .filter((assignment) => selectedForStore.includes(assignment.module.id))
        .reduce((moduleSum, assignment) => moduleSum + getModulePrice(assignment), 0);
    }, 0);

    return storesTotal + modulesTotal;
  }, [selectedStores, modulesByStore, formData.selectedModulesByStore]);

  const selectedStoreDetails = useMemo(() => (
    selectedStores.map((store) => {
      const selectedForStore = formData.selectedModulesByStore[store.id] || [];
      const selectedAssignments = (modulesByStore[store.id] || [])
        .filter((assignment) => selectedForStore.includes(assignment.module.id));

      return {
        storeId: store.id,
        storeName: store.name,
        storeDescription: store.description,
        storePrice: getStorePrice(store),
        modules: selectedAssignments.map((assignment) => ({
          moduleId: assignment.module.id,
          moduleName: assignment.module.label || assignment.module.name,
          moduleDescription: assignment.module.description || '',
          modulePrice: getModulePrice(assignment),
          parameters: assignment.parameters?.length ? JSON.stringify(assignment.parameters) : null,
        })),
      };
    })
  ), [selectedStores, modulesByStore, formData.selectedModulesByStore]);

  const marketplaceStyle: CSSProperties & Record<string, string> = {
    '--marketplace-primary': formData.primaryColor,
    '--marketplace-secondary': formData.secondaryColor,
  };

  const updateMarketplaceSlug = (value: string) => {
    const normalized = value.toLowerCase().replace(/\s+/g, '-');
    setFormData((prev) => ({ ...prev, marketplaceSlug: normalized }));
    setFormErrors((prev) => ({ ...prev, marketplaceSlug: '' }));
  };

  const updateColor = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    const normalized = value.toUpperCase();
    setFormData((prev) => ({ ...prev, [field]: normalized }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const updatePaletteColor = (
    field: 'primaryColor' | 'secondaryColor',
    nextPicker: { hue: number; saturation: number; value: number },
  ) => {
    setColorPickers((prev) => ({ ...prev, [field]: nextPicker }));
    updateColor(field, hsvToHex(nextPicker.hue, nextPicker.saturation, nextPicker.value));
  };

  const selectPalettePoint = (
    field: 'primaryColor' | 'secondaryColor',
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const current = colorPickers[field];

    updatePaletteColor(field, {
      ...current,
      saturation: x / rect.width,
      value: 1 - y / rect.height,
    });
  };

  const getBankInfoErrors = () => {
    const errors: Record<string, string> = {};
    const bankName = formData.bankName.trim();
    const bankEmail = formData.bankEmail.trim();
    const bankPhone = formData.bankPhone.trim();
    const bankDescription = formData.bankDescription.trim();
    const currentYear = new Date().getFullYear();
    const year = formData.establishmentYear ? Number(formData.establishmentYear) : null;

    if (!bankName) {
      errors.bankName = 'Le nom de la banque est obligatoire.';
    }
    if (!bankEmail) {
      errors.bankEmail = "L'email de la banque est obligatoire.";
    } else if (!EMAIL_PATTERN.test(bankEmail)) {
      errors.bankEmail = "L'email de la banque doit etre valide.";
    }
    if (!bankPhone) {
      errors.bankPhone = 'Le téléphone de la banque est obligatoire.';
    } else if (!TUNISIAN_PHONE_PATTERN.test(bankPhone)) {
      errors.bankPhone = 'Saisissez exactement 8 chiffres apres +216.';
    }
    if (formData.establishmentYear.trim() && (!/^\d{4}$/.test(formData.establishmentYear) || year === null || Number.isNaN(year) || year <= 1900 || year > currentYear)) {
      errors.establishmentYear = `Saisissez une annee de 4 chiffres, superieure a 1900 et inferieure ou egale a ${currentYear}.`;
    }
    if (!formData.logo) {
      errors.logo = 'Le logo de la banque est obligatoire.';
    }
    if (bankDescription.length > 1000) {
      errors.bankDescription = 'La description ne doit pas depasser 1000 caracteres.';
    }

    return errors;
  };

  const getContactInfoErrors = () => {
    const errors: Record<string, string> = {};

    if (!formData.contactName.trim()) {
      errors.contactName = 'Le nom du contact principal est obligatoire.';
    }
    if (!formData.email.trim()) {
      errors.email = "L'adresse e-mail du contact est obligatoire.";
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      errors.email = "L'adresse e-mail du contact doit etre valide.";
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Le numero de telephone est obligatoire.';
    } else if (!TUNISIAN_PHONE_PATTERN.test(formData.phone.trim())) {
      errors.phone = 'Saisissez exactement 8 chiffres apres +216.';
    }
    if (!formData.contactImage) {
      errors.contactImage = "L'image du contact principal est obligatoire.";
    }

    return errors;
  };

  const getMarketplaceErrors = () => {
    const errors: Record<string, string> = {};
    const slug = formData.marketplaceSlug.trim();
    const marketplaceDescription = formData.marketplaceDescription.trim();

    if (!slug) {
      errors.marketplaceSlug = 'Le slug marketplace est obligatoire.';
    } else if (!SLUG_PATTERN.test(slug)) {
      errors.marketplaceSlug = 'Utilisez uniquement des minuscules, chiffres et tirets.';
    }

    if (!marketplaceDescription) {
      errors.marketplaceDescription = 'La description marketplace est obligatoire.';
    } else if (marketplaceDescription.length > 500) {
      errors.marketplaceDescription = 'La description ne doit pas depasser 500 caracteres.';
    }

    if (!formData.primaryColor || !HEX_COLOR_PATTERN.test(formData.primaryColor)) {
      errors.primaryColor = 'Choisissez une couleur primaire valide.';
    }

    if (!formData.secondaryColor || !HEX_COLOR_PATTERN.test(formData.secondaryColor)) {
      errors.secondaryColor = 'Choisissez une couleur secondaire valide.';
    }

    if (!formData.banniere) {
      errors.banniere = 'La banniere marketplace est obligatoire.';
    }

    return errors;
  };

  const getSelectionErrors = () => {
    const errors: Record<string, string> = {};

    if (formData.selectedStores.length === 0) {
      errors.selectedStores = 'Veuillez selectionner au moins un store.';
    }

    formData.selectedStores.forEach((storeId) => {
      const availableModules = modulesByStore[storeId] || [];
      if (availableModules.length === 0) {
        return;
      }

      const selectedForStore = formData.selectedModulesByStore[storeId] || [];
      if (selectedForStore.length === 0) {
        const store = stores.find((item) => item.id === storeId);
        errors[`modules-${storeId}`] = `Veuillez selectionner au moins un module pour ${store?.name || 'ce store'}.`;
      }
    });

    return errors;
  };

  const getAllErrors = () => ({
    ...getBankInfoErrors(),
    ...getContactInfoErrors(),
    ...getMarketplaceErrors(),
    ...getSelectionErrors(),
  });

  const getFirstInvalidStep = (errors: Record<string, string>) => {
    const bankFields = ['bankName', 'bankEmail', 'bankPhone', 'website', 'bankDescription', 'establishmentYear', 'logo'];
    const contactFields = ['contactName', 'email', 'phone', 'contactImage'];
    const marketplaceFields = ['marketplaceSlug', 'marketplaceDescription', 'primaryColor', 'secondaryColor', 'banniere'];

    if (bankFields.some((field) => errors[field])) return 1;
    if (contactFields.some((field) => errors[field])) return 2;
    if (marketplaceFields.some((field) => errors[field]) || Object.keys(errors).some((key) => key.startsWith('modules-') || key === 'selectedStores')) return 3;
    return 4;
  };

  const validateBankInfo = () => {
    const errors = getBankInfoErrors();
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateContactInfo = () => {
    const errors = getContactInfoErrors();
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToNextStep = () => {
    if (step === 1 && !validateBankInfo()) return;
    if (step === 2 && !validateContactInfo()) return;
    if (step === 3) {
      const errors = { ...getMarketplaceErrors(), ...getSelectionErrors() };
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    setStep(step + 1);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo ne doit pas depasser 2 Mo.');
      return;
    }

    setFormData((prev) => ({ ...prev, logo: file }));
    setLogoPreviewUrl(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, logo: '' }));
  };

  const handleBanniereChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La banniere ne doit pas depasser 5 Mo.');
      return;
    }

    setFormData((prev) => ({ ...prev, banniere: file }));
    setBannierePreviewUrl(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, banniere: '' }));
  };

  const handleContactImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image du contact ne doit pas depasser 2 Mo.");
      return;
    }

    setFormData((prev) => ({ ...prev, contactImage: file }));
    setContactImagePreviewUrl(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, contactImage: '' }));
  };

  const toggleStore = async (storeId: number) => {
    const isSelected = formData.selectedStores.includes(storeId);

    setFormData((prev) => {
      const nextStores = isSelected
        ? prev.selectedStores.filter((id) => id !== storeId)
        : [...prev.selectedStores, storeId];
      const nextModules = { ...prev.selectedModulesByStore };

      if (isSelected) {
        delete nextModules[storeId];
      }

      return {
        ...prev,
        selectedStores: nextStores,
        selectedModulesByStore: nextModules,
      };
    });

    setFormErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors.selectedStores;
      delete nextErrors[`modules-${storeId}`];
      return nextErrors;
    });

    if (!isSelected) {
      setSelectedStoreForModules(storeId);
      await loadModulesForStore(storeId);
    } else if (selectedStoreForModules === storeId) {
      setSelectedStoreForModules(null);
    }
  };

  const toggleModule = (storeId: number, moduleId: number) => {
    setFormData((prev) => {
      const selectedForStore = prev.selectedModulesByStore[storeId] || [];
      const nextForStore = selectedForStore.includes(moduleId)
        ? selectedForStore.filter((id) => id !== moduleId)
        : [...selectedForStore, moduleId];

      return {
        ...prev,
        selectedModulesByStore: {
          ...prev.selectedModulesByStore,
          [storeId]: nextForStore,
        },
      };
    });

    setFormErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors[`modules-${storeId}`];
      return nextErrors;
    });
  };

  const handleSubmit = async () => {
    const errors = getAllErrors();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStep(getFirstInvalidStep(errors));
      return;
    }

    setIsSubmitting(true);
    try {
      await requestService.createRequest({
        bankName: formData.bankName,
        bankEmail: formData.bankEmail,
        bankPhone: `+216${formData.bankPhone}`,
        country: formData.country,
        website: formData.website,
        description: formData.bankDescription.trim(),
        bankDescription: formData.bankDescription.trim(),
        establishmentYear: formData.establishmentYear ? Number(formData.establishmentYear) : undefined,
        logo: formData.logo,
        contactName: formData.contactName,
        contactEmail: formData.email,
        contactPhone: `+216${formData.phone}`,
        contactImage: formData.contactImage,
        marketplaceSlug: formData.marketplaceSlug.trim(),
        marketplaceDescription: formData.marketplaceDescription.trim(),
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        banniere: formData.banniere,
        storeIds: formData.selectedStores,
        moduleIds: Array.from(new Set(selectedModuleIds)),
        selectedStores: selectedStoreDetails,
        totalAmount,
        totalMonthlyPrice: totalAmount,
      });
      toast.success("Votre demande a ete envoyee avec succes. Elle sera examinee dans un delai maximum de 2 jours.");
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit SaaS request:', error);
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      alert(message || "Impossible de soumettre la demande. Verifiez les champs et reessayez.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="join-success-container">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="join-success-wrapper">
          <div className="join-success-icon-wrapper">
            <CheckCircle className="join-success-icon" />
          </div>
          <h1 className="join-title">Demande soumise avec succes !</h1>
          <p className="join-success-desc">
            Votre demande a ete envoyee avec succes. Elle sera examinee dans un delai maximum de 2 jours.
          </p>
          <Button onClick={() => window.location.href = '/'}>Retour a l'accueil</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="join-container">
      <div className="join-wrapper">
        <div className="join-header">
          <h1 className="join-title">Rejoindre Matchia</h1>
          <p className="join-subtitle">
            {step === 4
              ? 'Verifiez les informations avant de soumettre votre demande.'
              : 'Lancez votre marketplace bancaire en quelques etapes simples'}
          </p>
        </div>

        <div className="join-stepper-container">
          <div className="join-stepper-wrapper">
            <div className="join-stepper-line" />
            <div className="join-stepper-progress" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
            {steps.map((stepName, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < step;
              const isCurrent = stepNumber === step;

              return (
                <div key={stepNumber} className="join-stepper-item">
                  <div className={`join-stepper-circle ${isCompleted ? 'join-stepper-completed' : isCurrent ? 'join-stepper-current' : 'join-stepper-pending'}`}>
                    {isCompleted ? <Check className="join-stepper-icon" /> : stepNumber}
                  </div>
                  <div className={`join-stepper-text ${isCurrent ? 'join-stepper-text-current' : 'join-stepper-text-pending'}`}>
                    {stepName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Informations bancaires</CardTitle>
                <CardDescription>Parlez-nous de votre institution</CardDescription>
              </CardHeader>
              <CardContent className="join-form-spacing">
                <div>
                  <label className="join-label" htmlFor="bank-name">Nom de la banque <span className="join-required">*</span></label>
                  <Input id="bank-name" required placeholder="Entrez le nom de votre banque" value={formData.bankName} onChange={(e) => {
                    setFormData((prev) => ({ ...prev, bankName: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, bankName: '' }));
                  }} />
                  {formErrors.bankName && <p className="join-error-text">{formErrors.bankName}</p>}
                </div>
                <div className="join-form-grid">
                  <div>
                    <label className="join-label" htmlFor="bank-email">Email de la banque <span className="join-required">*</span></label>
                    <Input id="bank-email" required type="email" placeholder="contact@banque.tn" value={formData.bankEmail} onChange={(e) => {
                      setFormData((prev) => ({ ...prev, bankEmail: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, bankEmail: '' }));
                    }} />
                    {formErrors.bankEmail && <p className="join-error-text">{formErrors.bankEmail}</p>}
                  </div>
                  <div>
                    <label className="join-label" htmlFor="bank-phone">Telephone de la banque <span className="join-required">*</span></label>
                    <Input
                      id="bank-phone"
                      required
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={8}
                      pattern="[0-9]{8}"
                      placeholder="70 345 678"
                      icon={<span className="join-phone-prefix">+216</span>}
                      className="!pl-[4.5rem]"
                      value={formData.bankPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setFormData((prev) => ({ ...prev, bankPhone: digits }));
                        setFormErrors((prev) => ({ ...prev, bankPhone: '' }));
                      }}
                    />
                    {formErrors.bankPhone && <p className="join-error-text">{formErrors.bankPhone}</p>}
                  </div>
                </div>
                <div>
                  <label className="join-label" htmlFor="bank-website">URL du site web</label>
                  <Input
                    id="bank-website"
                    type="url"
                    placeholder="https://www.exemple.com"
                    value={formData.website}
                    error={formErrors.website}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, website: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, website: '' }));
                    }}
                  />
                </div>
                <div className="join-form-grid">
                  <div>
                    <label className="join-label" htmlFor="bank-description">Description de la banque</label>
                    <textarea
                      id="bank-description"
                      className="join-textarea"
                      maxLength={1000}
                      placeholder="Decrivez brievement votre institution"
                      value={formData.bankDescription}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, bankDescription: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, bankDescription: '' }));
                      }}
                    />
                    <div className="join-field-footer">
                      <span>{formData.bankDescription.length}/1000</span>
                      {formErrors.bankDescription && <span className="join-error-text">{formErrors.bankDescription}</span>}
                    </div>
                  </div>
                  <div>
                    <label className="join-label" htmlFor="establishment-year">Annee d'etablissement</label>
                    <Input
                      id="establishment-year"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      placeholder="Ex: 1984"
                      value={formData.establishmentYear}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setFormData((prev) => ({ ...prev, establishmentYear: digits }));
                        setFormErrors((prev) => ({ ...prev, establishmentYear: '' }));
                      }}
                    />
                    {formErrors.establishmentYear && <p className="join-error-text">{formErrors.establishmentYear}</p>}
                  </div>
                </div>
                <div>
                  <label className="join-label" htmlFor="bank-logo">Logo de la banque <span className="join-required">*</span></label>
                  <label className="join-upload-area block" htmlFor="bank-logo">
                    <input id="bank-logo" type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" required onChange={handleLogoChange} />
                    {formData.logo ? (
                      <div className="join-upload-content">
                        <div className="join-upload-preview">
                          {logoPreviewUrl ? (
                            <img src={logoPreviewUrl} alt="Apercu du logo de la banque" className="join-upload-preview-image" />
                          ) : (
                            <CheckCircle className="join-upload-success-icon" />
                          )}
                        </div>
                        <p className="join-upload-filename">{formData.logo.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="join-upload-icon" />
                        <p className="join-upload-title">Cliquez pour telecharger un logo</p>
                        <p className="join-upload-hint">PNG, JPG ou SVG (max. 2 Mo)</p>
                      </>
                    )}
                  </label>
                  {formErrors.logo && <p className="join-error-text">{formErrors.logo}</p>}
                  {formData.logo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, logo: null }));
                        setLogoPreviewUrl('');
                        setFormErrors((prev) => ({ ...prev, logo: '' }));
                      }}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Coordonnees</CardTitle>
                <CardDescription>Contact principal pour votre compte</CardDescription>
              </CardHeader>
              <CardContent className="join-form-spacing">
                <div>
                  <label className="join-label" htmlFor="contact-name">Nom complet <span className="join-required">*</span></label>
                  <Input
                    id="contact-name"
                    placeholder="Jihed ben sallah"
                    value={formData.contactName}
                    required
                    error={formErrors.contactName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, contactName: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, contactName: '' }));
                    }}
                  />
                </div>
                <div>
                  <label className="join-label" htmlFor="contact-email">Adresse e-mail <span className="join-required">*</span></label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="jihed.bensallah@exemple.com"
                    value={formData.email}
                    required
                    error={formErrors.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </div>
                <div>
                  <label className="join-label" htmlFor="contact-phone">Numero de telephone <span className="join-required">*</span></label>
                  <Input
                    id="contact-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="97 345 678"
                    icon={<span className="join-phone-prefix">+216</span>}
                    className="!pl-[4.5rem]"
                    value={formData.phone}
                    error={formErrors.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setFormData((prev) => ({ ...prev, phone: digits }));
                      setFormErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                  />
                </div>
                <div>
                  <label className="join-label" htmlFor="contact-image">Image du contact principal <span className="join-required">*</span></label>
                  <label className="join-upload-area block" htmlFor="contact-image">
                    <input id="contact-image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" required onChange={handleContactImageChange} />
                    {formData.contactImage ? (
                      <div className="join-upload-content">
                        <div className="join-upload-preview">
                          {contactImagePreviewUrl ? (
                            <img src={contactImagePreviewUrl} alt="Apercu de l'image du contact" className="join-upload-preview-image" />
                          ) : (
                            <CheckCircle className="join-upload-success-icon" />
                          )}
                        </div>
                        <p className="join-upload-filename">{formData.contactImage.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="join-upload-icon" />
                        <p className="join-upload-title">Cliquez pour telecharger l'image du contact</p>
                        <p className="join-upload-hint">PNG, JPG, WEBP ou SVG (max. 2 Mo)</p>
                      </>
                    )}
                  </label>
                  {formErrors.contactImage && <p className="join-error-text">{formErrors.contactImage}</p>}
                  {formData.contactImage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, contactImage: null }));
                        setContactImagePreviewUrl('');
                        setFormErrors((prev) => ({ ...prev, contactImage: '' }));
                      }}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="join-step-spacing join-step-three">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration marketplace</CardTitle>
                  <CardDescription>Definissez l'identifiant et l'identite visuelle de votre marketplace</CardDescription>
                </CardHeader>
                <CardContent className="join-step-spacing">
                  <div className="join-form-grid">
                    <div>
                      <label className="join-label" htmlFor="marketplace-slug">Slug marketplace <span className="join-required">*</span></label>
                      <Input
                        id="marketplace-slug"
                        placeholder="matchia-bank"
                        value={formData.marketplaceSlug}
                        required
                        onChange={(e) => updateMarketplaceSlug(e.target.value)}
                      />
                      <p className="join-upload-hint mt-2">Minuscules, chiffres et tirets uniquement.</p>
                      {formErrors.marketplaceSlug && <p className="join-error-text">{formErrors.marketplaceSlug}</p>}
                    </div>
                    <div>
                      <label className="join-label" htmlFor="marketplace-description">Description marketplace <span className="join-required">*</span></label>
                      <textarea
                        id="marketplace-description"
                        className="join-textarea"
                        maxLength={500}
                        placeholder="Decrivez l'experience proposee aux clients de votre banque"
                        value={formData.marketplaceDescription}
                        required
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, marketplaceDescription: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, marketplaceDescription: '' }));
                        }}
                      />
                      <div className="join-field-footer">
                        <span>{formData.marketplaceDescription.length}/500</span>
                        {formErrors.marketplaceDescription && <span className="join-error-text">{formErrors.marketplaceDescription}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="join-color-grid">
                  <div>
                    <label className="join-label">Primary color <span className="join-required">*</span></label>
                    <div className="join-custom-color-picker">
                        <button
                          type="button"
                          className="join-color-area"
                          aria-label="Palette primary color"
                          style={{ '--picker-hue': colorPickers.primaryColor.hue } as CSSProperties}
                          onClick={(e) => selectPalettePoint('primaryColor', e)}
                        >
                          <span
                            className="join-color-area-marker"
                            style={{
                              left: `${colorPickers.primaryColor.saturation * 100}%`,
                              top: `${(1 - colorPickers.primaryColor.value) * 100}%`,
                            }}
                          />
                        </button>
                        <div className="join-color-controls">
                          <span className="join-color-current" style={{ backgroundColor: formData.primaryColor }} />
                          <input
                            className="join-hue-slider"
                            type="range"
                            min="0"
                            max="360"
                            value={colorPickers.primaryColor.hue}
                            style={{ '--picker-hue': colorPickers.primaryColor.hue } as CSSProperties}
                            aria-label="Teinte primary color"
                            onChange={(e) => updatePaletteColor('primaryColor', {
                              ...colorPickers.primaryColor,
                              hue: Number(e.target.value),
                            })}
                          />
                        </div>
                      </div>
                      {formErrors.primaryColor && <p className="join-error-text">{formErrors.primaryColor}</p>}
                    </div>

                    <div>
                      <label className="join-label">Secondary color <span className="join-required">*</span></label>
                      <div className="join-custom-color-picker">
                        <button
                          type="button"
                          className="join-color-area"
                          aria-label="Palette secondary color"
                          style={{ '--picker-hue': colorPickers.secondaryColor.hue } as CSSProperties}
                          onClick={(e) => selectPalettePoint('secondaryColor', e)}
                        >
                          <span
                            className="join-color-area-marker"
                            style={{
                              left: `${colorPickers.secondaryColor.saturation * 100}%`,
                              top: `${(1 - colorPickers.secondaryColor.value) * 100}%`,
                            }}
                          />
                        </button>
                        <div className="join-color-controls">
                          <span className="join-color-current" style={{ backgroundColor: formData.secondaryColor }} />
                          <input
                            className="join-hue-slider"
                            type="range"
                            min="0"
                            max="360"
                            value={colorPickers.secondaryColor.hue}
                            style={{ '--picker-hue': colorPickers.secondaryColor.hue } as CSSProperties}
                            aria-label="Teinte secondary color"
                            onChange={(e) => updatePaletteColor('secondaryColor', {
                              ...colorPickers.secondaryColor,
                              hue: Number(e.target.value),
                            })}
                          />
                        </div>
                      </div>
                      {formErrors.secondaryColor && <p className="join-error-text">{formErrors.secondaryColor}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="join-label" htmlFor="marketplace-banniere">Banniere marketplace <span className="join-required">*</span></label>
                    <label className="join-upload-area block" htmlFor="marketplace-banniere">
                      <input id="marketplace-banniere" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" required onChange={handleBanniereChange} />
                      {formData.banniere ? (
                        <div className="join-upload-content">
                          <div className="join-upload-preview">
                            {bannierePreviewUrl ? (
                              <img src={bannierePreviewUrl} alt="Apercu de la banniere marketplace" className="join-upload-preview-image" />
                            ) : (
                              <CheckCircle className="join-upload-success-icon" />
                            )}
                          </div>
                          <p className="join-upload-filename">{formData.banniere.name}</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="join-upload-icon" />
                          <p className="join-upload-title">Cliquez pour telecharger une banniere</p>
                          <p className="join-upload-hint">PNG, JPG, WEBP ou SVG (max. 5 Mo)</p>
                      </>
                    )}
                  </label>
                  {formErrors.banniere && <p className="join-error-text">{formErrors.banniere}</p>}
                  {formData.banniere && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, banniere: null }));
                        setBannierePreviewUrl('');
                        setFormErrors((prev) => ({ ...prev, banniere: '' }));
                      }}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selectionner les boutiques <span className="join-required">*</span></CardTitle>
                  <CardDescription>Choisissez les stores actifs et leurs modules associes</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCatalog ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Chargement du catalogue...
                    </div>
                  ) : catalogError ? (
                    <p className="text-sm text-destructive">{catalogError}</p>
                  ) : (
                    <div className="join-form-grid">
                      {stores.map((store) => {
                        const isSelected = formData.selectedStores.includes(store.id);
                        const StoreContextIcon = getStoreContextIcon(store);
                        return (
                          <button key={store.id} type="button" onClick={() => toggleStore(store.id)} className={`join-selection-card text-left ${isSelected ? 'join-selection-card-active' : ''}`} style={marketplaceStyle}>
                            <div className="join-selection-content">
                              <div className={`join-selection-icon-wrapper ${isSelected ? 'join-selection-icon-wrapper-active' : ''}`}>
                                <StoreContextIcon className="join-selection-icon" />
                              </div>
                              <div>
                                <div className="join-selection-title-row">
                                  <h4 className="join-selection-title">{store.name}</h4>
                                  {isSelected && <span className="join-selected-badge">Selectionne</span>}
                                </div>
                                <p className="join-upload-hint">{store.description || 'Store bancaire'}</p>
                                <p className="join-price-line">{formatTnd(getStorePrice(store))} / mois</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formErrors.selectedStores && <p className="join-error-text">{formErrors.selectedStores}</p>}
                </CardContent>
              </Card>

              {selectedStores.map((store) => {
                const storeModules = modulesByStore[store.id] || [];
                const selectedForStore = formData.selectedModulesByStore[store.id] || [];
                const storeModuleError = formErrors[`modules-${store.id}`];

                return (
                  <Card key={store.id}>
                    <CardHeader>
                      <CardTitle>Modules pour {store.name} <span className="join-required">*</span></CardTitle>
                      <CardDescription>Seuls les modules actifs lies a ce store sont affiches</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!modulesByStore[store.id] ? (
                        <div className="flex items-center py-6 text-muted-foreground">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Chargement des modules...
                        </div>
                      ) : storeModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun module actif associe.</p>
                      ) : (
                        <div className="join-form-grid">
                          {storeModules.map((assignment) => {
                            const isSelected = selectedForStore.includes(assignment.module.id);
                            return (
                              <button key={assignment.id} type="button" onClick={() => toggleModule(store.id, assignment.module.id)} className={`join-module-card text-left ${isSelected ? 'join-module-card-active' : ''}`} style={marketplaceStyle}>
                                <div className="join-success-item">
                                  <div className={`join-module-icon-wrapper ${isSelected ? 'join-module-icon-wrapper-active' : ''}`}>
                                    {isSelected ? <Check className="join-stepper-icon" /> : <Wrench className="join-stepper-icon" />}
                                  </div>
                                  <div>
                                    <div className="join-selection-title-row">
                                      <h4 className="font-semibold mb-1">{assignment.module.label || assignment.module.name}</h4>
                                      {isSelected && <span className="join-selected-badge">Selectionne</span>}
                                    </div>
                                    <p className="join-upload-hint">{assignment.module.description || 'Module configurable'}</p>
                                    <p className="join-price-line">{formatTnd(getModulePrice(assignment))} / mois</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {storeModuleError && <p className="join-error-text">{storeModuleError}</p>}
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardContent className="join-total-row">
                  <span>Total estime</span>
                  <strong>{formatTnd(totalAmount)} / mois</strong>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="join-finalization-grid">
              <div className="join-finalization-main">
                <Card className="join-final-card !p-0">
                  <div className="join-final-card-header">
                    <div className="join-final-card-heading"><Landmark className="join-final-heading-icon" /><h3>Informations bancaires</h3></div>
                    <button type="button" className="join-final-edit-button" onClick={() => setStep(1)}><Pencil /> Modifier</button>
                  </div>
                  <div className="join-final-card-body">
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row">
                        <div className="join-final-detail-icon">{logoPreviewUrl ? <img src={logoPreviewUrl} alt="Logo de la banque" /> : <Landmark />}</div>
                        <div><span>Banque</span><strong>{formData.bankName || '-'}</strong></div>
                      </div>
                      <div className="join-final-detail-row"><Mail /><div><span>Email banque</span><strong>{formData.bankEmail || '-'}</strong></div></div>
                      <div className="join-final-detail-row"><Phone /><div><span>Telephone banque</span><strong>{formData.bankPhone ? `+216 ${formData.bankPhone}` : '-'}</strong></div></div>
                      <div className="join-final-detail-row"><Globe2 /><div><span>Site web</span><strong>{formData.website || '-'}</strong></div></div>
                    </div>
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row"><CalendarDays /><div><span>Annee</span><strong>{formData.establishmentYear || '-'}</strong></div></div>
                      <div className="join-final-detail-row join-final-detail-row-top"><FileText /><div><span>Description</span><strong>{formData.bankDescription || '-'}</strong></div></div>
                    </div>
                  </div>
                  <div className="join-final-complete"><CheckCircle /> Complete</div>
                </Card>

                <Card className="join-final-card !p-0">
                  <div className="join-final-card-header">
                    <div className="join-final-card-heading"><UserRound className="join-final-heading-icon" /><h3>Coordonnees</h3></div>
                    <button type="button" className="join-final-edit-button" onClick={() => setStep(2)}><Pencil /> Modifier</button>
                  </div>
                  <div className="join-final-card-body">
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row"><UserRound /><div><span>Nom</span><strong>{formData.contactName || '-'}</strong></div></div>
                      <div className="join-final-detail-row"><Mail /><div><span>Email</span><strong>{formData.email || '-'}</strong></div></div>
                      <div className="join-final-detail-row"><Phone /><div><span>Telephone</span><strong>{formData.phone ? `+216 ${formData.phone}` : '-'}</strong></div></div>
                    </div>
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row">
                        <div className="join-final-detail-icon join-final-file-preview">{contactImagePreviewUrl ? <img src={contactImagePreviewUrl} alt="Contact principal" /> : <ImageIcon />}</div>
                        <div><span>Image</span><strong>{formData.contactImage?.name || '-'}</strong></div>
                      </div>
                    </div>
                  </div>
                  <div className="join-final-complete"><CheckCircle /> Complete</div>
                </Card>

                <Card className="join-final-card !p-0">
                  <div className="join-final-card-header">
                    <div className="join-final-card-heading"><StoreIcon className="join-final-heading-icon" /><h3>Marketplace</h3></div>
                    <button type="button" className="join-final-edit-button" onClick={() => setStep(3)}><Pencil /> Modifier</button>
                  </div>
                  <div className="join-final-card-body">
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row"><StoreIcon /><div><span>Slug</span><strong>{formData.marketplaceSlug || '-'}</strong></div></div>
                      <div className="join-final-detail-row"><Palette /><div><span>Primary color</span><strong className="join-final-color-value"><i style={{ backgroundColor: formData.primaryColor }} />{formData.primaryColor}</strong></div></div>
                      <div className="join-final-detail-row"><Palette /><div><span>Secondary color</span><strong className="join-final-color-value"><i style={{ backgroundColor: formData.secondaryColor }} />{formData.secondaryColor}</strong></div></div>
                    </div>
                    <div className="join-final-detail-column">
                      <div className="join-final-detail-row">
                        <div className="join-final-detail-icon join-final-file-preview">{bannierePreviewUrl ? <img src={bannierePreviewUrl} alt="Banniere marketplace" /> : <ImageIcon />}</div>
                        <div><span>Banniere</span><strong>{formData.banniere?.name || '-'}</strong></div>
                      </div>
                      <div className="join-final-detail-row join-final-detail-row-top"><FileText /><div><span>Description</span><strong>{formData.marketplaceDescription || '-'}</strong></div></div>
                    </div>
                  </div>
                  <div className="join-final-complete"><CheckCircle /> Complete</div>
                </Card>
              </div>

              <Card className="join-final-config-card !p-0">
                <div className="join-final-config-header"><h3>Configuration selectionnee</h3><span><ShieldCheck /></span></div>

                <div className="join-final-config-section">
                  <h4>Boutiques selectionnees</h4>
                  <div className="join-final-config-list">
                    {selectedStores.length === 0 ? <p className="join-final-empty">Aucune boutique selectionnee.</p> : selectedStores.map((store) => {
                      const StoreContextIcon = getStoreContextIcon(store);
                      return (
                        <div key={store.id} className="join-final-config-item">
                          <span className="join-final-config-icon"><StoreContextIcon /></span>
                          <div className="join-final-config-copy"><strong>{store.name}</strong><small>{store.description || 'Store bancaire'}</small></div>
                          <b>{formatTnd(getStorePrice(store))}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="join-final-config-section">
                  <h4>Modules selectionnes</h4>
                  <div className="join-final-config-list">
                    {selectedStoreDetails.flatMap((store) => store.modules).length === 0 ? <p className="join-final-empty">Aucun module choisi.</p> : selectedStoreDetails.flatMap((store) => store.modules.map((module) => (
                      <div key={`${store.storeId}-${module.moduleId}`} className="join-final-config-item">
                        <span className="join-final-config-icon join-final-module-icon"><Wrench /></span>
                        <div className="join-final-config-copy"><strong>{module.moduleName}</strong><small>{module.moduleDescription || `Module de ${store.storeName}`}</small></div>
                        <b>{formatTnd(module.modulePrice)}</b>
                      </div>
                    )))}
                  </div>
                </div>

                <div className="join-final-config-section join-final-costs">
                  <h4>Recapitulatif des couts</h4>
                  {selectedStoreDetails.map((store) => (
                    <div key={`cost-store-${store.storeId}`}>
                      <div className="join-final-cost-row"><span>{store.storeName}</span><strong>{formatTnd(store.storePrice)}</strong></div>
                      {store.modules.map((module) => (
                        <div key={`cost-module-${store.storeId}-${module.moduleId}`} className="join-final-cost-row join-final-cost-module"><span>{module.moduleName}</span><strong>{formatTnd(module.modulePrice)}</strong></div>
                      ))}
                    </div>
                  ))}
                  <div className="join-final-total-row"><span>Total mensuel</span><strong>{formatTnd(totalAmount)}</strong></div>
                  
                </div>
              </Card>
            </div>
          )}
        </motion.div>

        <div className="join-actions">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1} className="!border-secondary !text-secondary hover:!bg-secondary/10 font-medium px-6">
            Precedent
          </Button>

          

          {step < totalSteps ? (
            <Button onClick={goToNextStep} className="!bg-primary hover:!bg-primary-hover !text-primary-foreground font-medium px-6">
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="!bg-primary hover:!bg-primary-hover !text-primary-foreground font-medium px-6">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Soumettre
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
