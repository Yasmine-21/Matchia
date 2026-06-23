import '../../styles/JoinPage.css';
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckCircle, Upload, ArrowRight, Check, Loader2, Store as StoreIcon, Wrench } from 'lucide-react';
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
    const website = formData.website.trim();
    const bankDescription = formData.bankDescription.trim();
    const currentYear = new Date().getFullYear();
    const year = formData.establishmentYear ? Number(formData.establishmentYear) : null;

    if (!bankName) {
      errors.bankName = 'Le nom de la banque est obligatoire.';
    }
    if (!bankEmail) {
      errors.bankEmail = "L'email de la banque est obligatoire.";
    }
    if (!website) {
      errors.website = "L'URL du site web est obligatoire.";
    }
    if (!bankDescription) {
      errors.bankDescription = 'La description de la banque est obligatoire.';
    }
    if (!formData.establishmentYear.trim()) {
      errors.establishmentYear = "L'annee d'etablissement est obligatoire.";
    } else if (year === null || Number.isNaN(year) || year < 1800 || year > currentYear) {
      errors.establishmentYear = `L'annee doit etre entre 1800 et ${currentYear}.`;
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
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Le numero de telephone est obligatoire.';
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
    const bankFields = ['bankName', 'bankEmail', 'country', 'website', 'bankDescription', 'establishmentYear', 'logo'];
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
        country: formData.country,
        website: formData.website,
        description: formData.bankDescription.trim(),
        bankDescription: formData.bankDescription.trim(),
        establishmentYear: formData.establishmentYear ? Number(formData.establishmentYear) : undefined,
        logo: formData.logo,
        contactName: formData.contactName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
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
          <p className="join-subtitle">Lancez votre marketplace bancaire en quelques etapes simples</p>
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
                  <Input label="Nom de la banque" placeholder="Entrez le nom de votre banque" value={formData.bankName} onChange={(e) => {
                    setFormData((prev) => ({ ...prev, bankName: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, bankName: '' }));
                  }} />
                  {formErrors.bankName && <p className="join-error-text">{formErrors.bankName}</p>}
                </div>
                <div>
                  <Input label="Email de la banque" type="email" placeholder="contact@banque.tn" value={formData.bankEmail} onChange={(e) => {
                    setFormData((prev) => ({ ...prev, bankEmail: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, bankEmail: '' }));
                  }} />
                  {formErrors.bankEmail && <p className="join-error-text">{formErrors.bankEmail}</p>}
                </div>
                <div className="join-form-grid">
                  <Select
                    label="Pays"
                    value={formData.country}
                    required
                    error={formErrors.country}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, country: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, country: '' }));
                    }}
                    options={[
                      { value: 'Tunisie', label: 'Tunisie' },
                      { value: 'Maroc', label: 'Maroc' },
                      { value: 'Algerie', label: 'Algerie' },
                      { value: 'France', label: 'France' },
                      { value: 'Emirats Arabes Unis', label: 'Emirats Arabes Unis' },
                    ]}
                  />
                  <Input
                    label="URL du site web"
                    type="url"
                    placeholder="https://www.exemple.com"
                    value={formData.website}
                    required
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
                      required
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
                    <Input
                      label="Annee d'etablissement"
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="Ex: 1984"
                      value={formData.establishmentYear}
                      required
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, establishmentYear: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, establishmentYear: '' }));
                      }}
                    />
                    {formErrors.establishmentYear && <p className="join-error-text">{formErrors.establishmentYear}</p>}
                  </div>
                </div>
                <div>
                  <label className="join-label" htmlFor="bank-logo">Logo de la banque</label>
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
                <Input
                  label="Nom complet"
                  placeholder="Jean Dupont"
                  value={formData.contactName}
                  required
                  error={formErrors.contactName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, contactName: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, contactName: '' }));
                  }}
                />
                <Input
                  label="Adresse e-mail"
                  type="email"
                  placeholder="jean.dupont@exemple.com"
                  value={formData.email}
                  required
                  error={formErrors.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, email: '' }));
                  }}
                />
                <Input
                  label="Numero de telephone"
                  type="tel"
                  placeholder="+216 55 123 456"
                  value={formData.phone}
                  required
                  error={formErrors.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                />
                <div>
                  <label className="join-label" htmlFor="contact-image">Image du contact principal</label>
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
            <div className="join-step-spacing">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration marketplace</CardTitle>
                  <CardDescription>Definissez l'identifiant et l'identite visuelle de votre marketplace</CardDescription>
                </CardHeader>
                <CardContent className="join-step-spacing">
                  <div className="join-form-grid">
                    <div>
                      <Input
                        label="Slug marketplace"
                        placeholder="matchia-bank"
                        value={formData.marketplaceSlug}
                        required
                        onChange={(e) => updateMarketplaceSlug(e.target.value)}
                      />
                      <p className="join-upload-hint mt-2">Minuscules, chiffres et tirets uniquement.</p>
                      {formErrors.marketplaceSlug && <p className="join-error-text">{formErrors.marketplaceSlug}</p>}
                    </div>
                    <div>
                      <label className="join-label" htmlFor="marketplace-description">Description marketplace</label>
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
                    <label className="join-label">Primary color</label>
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
                      <label className="join-label">Secondary color</label>
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
                    <label className="join-label" htmlFor="marketplace-banniere">Banniere marketplace</label>
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
                  <CardTitle>Selectionner les boutiques</CardTitle>
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
                        return (
                          <button key={store.id} type="button" onClick={() => toggleStore(store.id)} className={`join-selection-card text-left ${isSelected ? 'join-selection-card-active' : ''}`} style={marketplaceStyle}>
                            <div className="join-selection-content">
                              <div className={`join-selection-icon-wrapper ${isSelected ? 'join-selection-icon-wrapper-active' : ''}`}>
                                {isSelected ? <CheckCircle className="join-selection-icon" /> : <StoreIcon className="join-selection-icon" />}
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
                      <CardTitle>Modules pour {store.name}</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle>Verifiez votre demande</CardTitle>
                <CardDescription>Veuillez verifier les informations avant de soumettre</CardDescription>
              </CardHeader>
              <CardContent className="join-step-spacing">
                <div className="join-review-grid">
                  <div>
                    <h3 className="join-review-title">Informations bancaires</h3>
                    <div className="join-review-list">
                      <div className="join-review-item"><span className="join-review-label">Banque :</span><span className="join-upload-filename">{formData.bankName || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Email banque :</span><span className="join-upload-filename">{formData.bankEmail || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Pays :</span><span className="join-upload-filename">{formData.country}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Site web :</span><span className="join-upload-filename">{formData.website || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Annee :</span><span className="join-upload-filename">{formData.establishmentYear || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Description :</span><span className="join-upload-filename">{formData.bankDescription || '-'}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="join-review-title">Coordonnees</h3>
                    <div className="join-review-list">
                      <div className="join-review-item"><span className="join-review-label">Nom :</span><span className="join-upload-filename">{formData.contactName || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">E-mail :</span><span className="join-upload-filename">{formData.email || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Telephone :</span><span className="join-upload-filename">{formData.phone || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Image :</span><span className="join-upload-filename">{formData.contactImage?.name || '-'}</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="join-review-title">Marketplace</h3>
                  <div className="join-review-list">
                    <div className="join-review-item"><span className="join-review-label">Slug :</span><span className="join-upload-filename">{formData.marketplaceSlug || '-'}</span></div>
                    <div className="join-review-item"><span className="join-review-label">Primary color :</span><span className="join-color-review"><span style={{ backgroundColor: formData.primaryColor }} />{formData.primaryColor}</span></div>
                    <div className="join-review-item"><span className="join-review-label">Secondary color :</span><span className="join-color-review"><span style={{ backgroundColor: formData.secondaryColor }} />{formData.secondaryColor}</span></div>
                    <div className="join-review-item"><span className="join-review-label">Banniere :</span><span className="join-upload-filename">{formData.banniere?.name || '-'}</span></div>
                    <div className="join-review-item"><span className="join-review-label">Description :</span><span className="join-upload-filename">{formData.marketplaceDescription || '-'}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="join-review-title">Configuration selectionnee</h3>
                  <div className="join-recap-list">
                    {selectedStores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune boutique selectionnee.</p>
                    ) : selectedStores.map((store) => {
                      const selectedForStore = formData.selectedModulesByStore[store.id] || [];
                      const selectedAssignments = (modulesByStore[store.id] || []).filter((assignment) => selectedForStore.includes(assignment.module.id));
                      return (
                        <div key={store.id} className="join-recap-item">
                          <div className="join-recap-header">
                            <strong>{store.name}</strong>
                            <span>{formatTnd(getStorePrice(store))}</span>
                          </div>
                          <p className="join-upload-hint">{store.description || 'Store bancaire'}</p>
                          <div className="join-recap-modules">
                            {selectedAssignments.length === 0 ? (
                              <span>Aucun module choisi</span>
                            ) : selectedAssignments.map((assignment) => (
                              <div key={assignment.id} className="join-recap-module">
                                <span>{assignment.module.label || assignment.module.name}</span>
                                <span>{formatTnd(getModulePrice(assignment))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="join-total-row">
                  <span>Total mensuel</span>
                  <strong>{formatTnd(totalAmount)}</strong>
                </div>
              </CardContent>
            </Card>
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
