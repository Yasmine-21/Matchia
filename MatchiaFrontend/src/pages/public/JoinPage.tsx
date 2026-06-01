import '../../styles/JoinPage.css';
import { useEffect, useMemo, useState } from 'react';
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

const STORE_BASE_PRICE = 120;
const MODULE_BASE_PRICE = 35;

const formatTnd = (amount: number) =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(amount);

const getStorePrice = (store: StoreDto) => store.price ?? STORE_BASE_PRICE;
const getModulePrice = (assignment: ModuleAssignment) => assignment.module.price ?? MODULE_BASE_PRICE;

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
    logo: null as File | null,
    contactName: '',
    email: '',
    phone: '',
    selectedStores: [] as number[],
    selectedModulesByStore: {} as Record<number, number[]>,
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

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo ne doit pas depasser 2 Mo.');
      event.target.value = '';
      return;
    }

    setFormData((prev) => ({ ...prev, logo: file }));
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
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await requestService.createRequest({
        bankName: formData.bankName,
        bankEmail: formData.bankEmail,
        country: formData.country,
        website: formData.website,
        logo: formData.logo,
        contactName: formData.contactName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        storeIds: formData.selectedStores,
        moduleIds: Array.from(new Set(selectedModuleIds)),
        totalAmount,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit SaaS request:', error);
      alert("Impossible de soumettre la demande. Verifiez les champs et reessayez.");
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
            Merci pour votre demande. Notre equipe l'examinera et vous contactera dans les 48 heures.
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
                <Input label="Nom de la banque" placeholder="Entrez le nom de votre banque" value={formData.bankName} onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))} />
                <Input label="Email de la banque" type="email" placeholder="contact@banque.tn" value={formData.bankEmail} onChange={(e) => setFormData((prev) => ({ ...prev, bankEmail: e.target.value }))} />
                <div className="join-form-grid">
                  <Select
                    label="Pays"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    options={[
                      { value: 'Tunisie', label: 'Tunisie' },
                      { value: 'Maroc', label: 'Maroc' },
                      { value: 'Algerie', label: 'Algerie' },
                      { value: 'France', label: 'France' },
                      { value: 'Emirats Arabes Unis', label: 'Emirats Arabes Unis' },
                    ]}
                  />
                  <Input label="URL du site web" type="url" placeholder="https://www.exemple.com" value={formData.website} onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))} />
                </div>
                <div>
                  <label className="join-label" htmlFor="bank-logo">Logo de la banque</label>
                  <label className="join-upload-area block" htmlFor="bank-logo">
                    <input id="bank-logo" type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" onChange={handleLogoChange} />
                    {formData.logo ? (
                      <div className="join-upload-content">
                        <div className="join-upload-preview">
                          <CheckCircle className="join-upload-success-icon" />
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
                  {formData.logo && (
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => setFormData((prev) => ({ ...prev, logo: null }))}>
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
                <Input label="Nom complet" placeholder="Jean Dupont" value={formData.contactName} onChange={(e) => setFormData((prev) => ({ ...prev, contactName: e.target.value }))} />
                <Input label="Adresse e-mail" type="email" placeholder="jean.dupont@exemple.com" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
                <Input label="Numero de telephone" type="tel" placeholder="+216 55 123 456" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="join-step-spacing">
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
                          <button key={store.id} type="button" onClick={() => toggleStore(store.id)} className={`join-selection-card text-left ${isSelected ? 'join-selection-card-active' : ''}`}>
                            <div className="join-selection-content">
                              <div className={`join-selection-icon-wrapper ${isSelected ? 'join-selection-icon-wrapper-active' : ''}`}>
                                {isSelected ? <CheckCircle className="join-selection-icon" /> : <StoreIcon className="join-selection-icon" />}
                              </div>
                              <div>
                                <h4 className="join-selection-title">{store.name}</h4>
                                <p className="join-upload-hint">{store.description || 'Store bancaire'}</p>
                                <p className="join-price-line">{formatTnd(getStorePrice(store))} / mois</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedStores.map((store) => {
                const storeModules = modulesByStore[store.id] || [];
                const selectedForStore = formData.selectedModulesByStore[store.id] || [];

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
                              <button key={assignment.id} type="button" onClick={() => toggleModule(store.id, assignment.module.id)} className={`join-module-card text-left ${isSelected ? 'join-module-card-active' : ''}`}>
                                <div className="join-success-item">
                                  <div className={`join-module-icon-wrapper ${isSelected ? 'join-module-icon-wrapper-active' : ''}`}>
                                    {isSelected ? <Check className="join-stepper-icon" /> : <Wrench className="join-stepper-icon" />}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-1">{assignment.module.label || assignment.module.name}</h4>
                                    <p className="join-upload-hint">{assignment.module.description || 'Module configurable'}</p>
                                    <p className="join-price-line">{formatTnd(getModulePrice(assignment))} / mois</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                    </div>
                  </div>
                  <div>
                    <h3 className="join-review-title">Coordonnees</h3>
                    <div className="join-review-list">
                      <div className="join-review-item"><span className="join-review-label">Nom :</span><span className="join-upload-filename">{formData.contactName || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">E-mail :</span><span className="join-upload-filename">{formData.email || '-'}</span></div>
                      <div className="join-review-item"><span className="join-review-label">Telephone :</span><span className="join-upload-filename">{formData.phone || '-'}</span></div>
                    </div>
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
            <Button onClick={() => setStep(step + 1)} className="!bg-primary hover:!bg-primary-hover !text-primary-foreground font-medium px-6">
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
