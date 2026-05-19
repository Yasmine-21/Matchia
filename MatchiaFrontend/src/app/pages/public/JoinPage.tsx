import '../../../styles/JoinPage.css';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckCircle, Upload, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { stores, modules } from '../../data/mockData';

export function JoinPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    country: 'Tunisie',
    website: '',
    logo: null as File | null,
    contactName: '',
    email: '',
    phone: '',
    selectedStores: [] as string[],
    selectedModules: [] as string[],
  });

  const [selectedStoreForModules, setSelectedStoreForModules] = useState<string | null>(null);

  const totalSteps = 4;
  const steps = [
    'Informations bancaires',
    'Coordonnées',
    'Boutiques & Modules',
    'Finalisation'
  ];

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const toggleStore = (storeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStores: prev.selectedStores.includes(storeId)
        ? prev.selectedStores.filter(id => id !== storeId)
        : [...prev.selectedStores, storeId]
    }));
    if (!formData.selectedStores.includes(storeId)) {
      setSelectedStoreForModules(storeId);
    }
  };

  const toggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter(id => id !== moduleId)
        : [...prev.selectedModules, moduleId]
    }));
  };

  if (submitted) {
    return (
      <div className="join-success-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="join-success-wrapper"
        >
          <div className="join-success-icon-wrapper">
            <CheckCircle className="join-success-icon" />
          </div>
          <h1 className="join-title">Demande soumise avec succès !</h1>
          <p className="join-success-desc">
            Merci pour votre demande. Notre équipe l'examinera et vous contactera dans les 48 heures.
          </p>
          <Card className="join-success-card">
            <CardHeader>
              <CardTitle>Prochaines étapes</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="join-success-list">
                <li className="join-success-item">
                  <div className="join-success-step">
                    1
                  </div>
                  <span>Examen de la demande par notre équipe (1-2 jours ouvrables)</span>
                </li>
                <li className="join-success-item">
                  <div className="join-success-step">
                    2
                  </div>
                  <span>Appel de découverte pour comprendre vos besoins spécifiques</span>
                </li>
                <li className="join-success-item">
                  <div className="join-success-step">
                    3
                  </div>
                  <span>Configuration et personnalisation de l'environnement</span>
                </li>
                <li className="join-success-item">
                  <div className="join-success-step">
                    4
                  </div>
                  <span>Formation de l'équipe et lancement de la marketplace</span>
                </li>
              </ol>
            </CardContent>
          </Card>
          <Button onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
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
            Lancez votre marketplace bancaire en quelques étapes simples
          </p>
        </div>

        {/* Horizontal Stepper */}
        <div className="join-stepper-container">
          <div className="join-stepper-wrapper">
            {/* Progress line */}
            <div className="join-stepper-line" />
            <div
              className="join-stepper-progress"
              style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
            />

            {/* Step indicators */}
            {steps.map((stepName, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < step;
              const isCurrent = stepNumber === step;

              return (
                <div key={stepNumber} className="join-stepper-item">
                  <div
                    className={`join-stepper-circle ${isCompleted ? 'join-stepper-completed' : isCurrent ? 'join-stepper-current' : 'join-stepper-pending'}`}
                  >
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

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Informations bancaires</CardTitle>
                <CardDescription>Parlez-nous de votre institution</CardDescription>
              </CardHeader>
              <CardContent className="join-form-spacing">
                <Input
                  label="Nom de la banque"
                  placeholder="Entrez le nom de votre banque"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                />
                <div className="join-form-grid">
                  <Select
                    label="Pays"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    options={[
                      { value: 'Tunisie', label: 'Tunisie' },
                      { value: 'Maroc', label: 'Maroc' },
                      { value: 'Algérie', label: 'Algérie' },
                      { value: 'France', label: 'France' },
                      { value: 'Émirats Arabes Unis', label: 'Émirats Arabes Unis' }
                    ]}
                  />
                  <Input
                    label="URL du site web"
                    type="url"
                    placeholder="https://www.exemple.com"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="join-label">Logo de la banque</label>
                  <div className="join-upload-area">
                    {formData.logo ? (
                      <div className="join-upload-content">
                        <div className="join-upload-preview">
                          <CheckCircle className="join-upload-success-icon" />
                        </div>
                        <p className="join-upload-filename">{formData.logo.name}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFormData(prev => ({ ...prev, logo: null }))}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="join-upload-icon" />
                        <p className="join-upload-title">Cliquez pour télécharger un logo</p>
                        <p className="join-upload-hint">PNG, JPG ou SVG (max. 2 Mo)</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
                <CardDescription>Contact principal pour votre compte</CardDescription>
              </CardHeader>
              <CardContent className="join-form-spacing">
                <Input
                  label="Nom complet"
                  placeholder="Jean Dupont"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                />
                <Input
                  label="Adresse e-mail"
                  type="email"
                  placeholder="jean.dupont@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label="Numéro de téléphone"
                  type="tel"
                  placeholder="+216 55 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="join-step-spacing">
              <Card>
                <CardHeader>
                  <CardTitle>Sélectionner les boutiques</CardTitle>
                  <CardDescription>Choisissez les catégories de financement que vous souhaitez proposer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="join-form-grid">
                    {stores.map((store) => {
                      const isSelected = formData.selectedStores.includes(store.id);
                      return (
                        <div
                          key={store.id}
                          onClick={() => toggleStore(store.id)}
                          className={`join-selection-card ${isSelected ? 'join-selection-card-active' : ''}`}
                        >
                          <div className="join-selection-content">
                            <div
                              className={`join-selection-icon-wrapper ${isSelected ? 'join-selection-icon-wrapper-active' : ''}`}
                            >
                              {isSelected ? (
                                <CheckCircle className="join-selection-icon" />
                              ) : (
                                <span className="text-2xl">📦</span>
                              )}
                            </div>
                            <div>
                              <h4 className="join-selection-title">{store.label}</h4>
                              <p className="join-upload-hint">
                                Solutions de financement
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {formData.selectedStores.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sélectionner les modules</CardTitle>
                    <CardDescription>
                      Choisissez les outils que vous souhaitez pour {selectedStoreForModules ? stores.find(s => s.id === selectedStoreForModules)?.label : 'vos boutiques'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="join-form-grid">
                      {modules.map((module) => {
                        const isSelected = formData.selectedModules.includes(module.id);
                        return (
                          <div
                            key={module.id}
                            onClick={() => toggleModule(module.id)}
                            className={`join-module-card ${isSelected ? 'join-module-card-active' : ''}`}
                          >
                            <div className="join-success-item">
                              <div
                                className={`join-module-icon-wrapper ${isSelected ? 'join-module-icon-wrapper-active' : ''}`}
                              >
                                {isSelected ? (
                                  <Check className="join-stepper-icon" />
                                ) : (
                                  <span className="text-lg">🔧</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-1">{module.label}</h4>
                                <p className="join-upload-hint">
                                  {module.name === 'simulator' && 'Calculer les mensualités de prêt'}
                                  {module.name === 'comparator' && 'Comparer les produits'}
                                  {module.name === 'blog' && 'Contenu éducatif'}
                                  {module.name === 'ads' && 'Campagnes promotionnelles'}
                                  {module.name === 'bot' && 'Assistance propulsée par l\'IA'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Vérifiez votre demande</CardTitle>
                <CardDescription>Veuillez vérifier toutes les informations avant de soumettre</CardDescription>
              </CardHeader>
              <CardContent className="join-step-spacing">
                <div className="join-review-grid">
                  <div>
                    <h3 className="join-review-title">Informations bancaires</h3>
                    <div className="join-review-list">
                      <div className="join-review-item">
                        <span className="join-review-label">Nom de la banque :</span>
                        <span className="join-upload-filename">{formData.bankName || '-'}</span>
                      </div>
                      <div className="join-review-item">
                        <span className="join-review-label">Pays :</span>
                        <span className="join-upload-filename">{formData.country}</span>
                      </div>
                      <div className="join-review-item">
                        <span className="join-review-label">Site web :</span>
                        <span className="join-upload-filename">{formData.website || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="join-review-title">Coordonnées</h3>
                    <div className="join-review-list">
                      <div className="join-review-item">
                        <span className="join-review-label">Nom :</span>
                        <span className="join-upload-filename">{formData.contactName || '-'}</span>
                      </div>
                      <div className="join-review-item">
                        <span className="join-review-label">E-mail :</span>
                        <span className="join-upload-filename">{formData.email || '-'}</span>
                      </div>
                      <div className="join-review-item">
                        <span className="join-review-label">Téléphone :</span>
                        <span className="join-upload-filename">{formData.phone || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="join-review-title">Configuration sélectionnée</h3>
                  <div className="join-form-grid">
                    <div className="join-summary-box">
                      <div className="join-summary-label">Boutiques</div>
                      <div className="join-summary-value">{formData.selectedStores.length}</div>
                      <div className="join-selection-tags">
                        {formData.selectedStores.map(id => stores.find(s => s.id === id)?.label).join(', ') || 'Aucune'}
                      </div>
                    </div>
                    <div className="join-summary-box">
                      <div className="join-summary-label">Modules</div>
                      <div className="join-summary-value">{formData.selectedModules.length}</div>
                      <div className="join-selection-tags">
                        {formData.selectedModules.map(id => modules.find(m => m.id === id)?.label).join(', ') || 'Aucun'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        
       {/* Navigation Buttons */}
        <div className="join-actions flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            // Précédent : on force la bordure et le texte en orange (#F97316)
            className="!border-secondary !text-secondary hover:!bg-secondary/10 font-medium px-6"
          >
            Précédent
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              // Suivant : on force le fond en bleu de Tailwind (blue-600)
              className="!bg-primary hover:!bg-primary-hover !text-primary-foreground font-medium px-6"
            >
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              // Soumettre : également en bleu
              className="!bg-primary hover:!bg-primary-hover !text-primary-foreground font-medium px-6"
            >
              Soumettre <CheckCircle className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}