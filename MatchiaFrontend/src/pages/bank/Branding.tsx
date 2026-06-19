import '../../styles/BankBranding.css';
import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, FileImage, Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { bankTenantService } from '../../services/bankTenantService';
import { useBankTenant } from '../../hooks/useBankTenant';
import { getBackendAssetUrl } from '../../utils/tenant';

interface BrandingDraft {
  primary_color: string;
  secondary_color: string;
  homepage_title: string;
  welcome_text: string;
  footer_text: string;
  logo_image_url: string;
  banner_image_url: string;
}

interface HslColor {
  hue: number;
  saturation: number;
  lightness: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rgbToHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue]
    .map((component) => clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsl = (red: number, green: number, blue: number): HslColor => {
  const normalizedRed = red / 255;
  const normalizedGreen = green / 255;
  const normalizedBlue = blue / 255;
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === normalizedRed) {
      hue = ((normalizedGreen - normalizedBlue) / delta) % 6;
    } else if (max === normalizedGreen) {
      hue = (normalizedBlue - normalizedRed) / delta + 2;
    } else {
      hue = (normalizedRed - normalizedGreen) / delta + 4;
    }
    hue *= 60;
  }

  if (hue < 0) {
    hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    hue,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSection = (clamp(hue, 0, 360) / 60) % 6;
  const x = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const matchLightness = normalizedLightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = x;
  } else if (hueSection < 2) {
    red = x;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = x;
  } else if (hueSection < 4) {
    green = x;
    blue = chroma;
  } else if (hueSection < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    red: (red + matchLightness) * 255,
    green: (green + matchLightness) * 255,
    blue: (blue + matchLightness) * 255,
  };
};

const isCssColor = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 && typeof CSS !== 'undefined' && CSS.supports('color', trimmed);
};

const parseCssColorToRgb = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || typeof document === 'undefined' || !document.body) {
    return null;
  }

  const probe = document.createElement('span');
  probe.style.color = trimmed;

  if (!probe.style.color) {
    return null;
  }

  probe.style.position = 'fixed';
  probe.style.left = '-9999px';
  probe.style.top = '-9999px';
  probe.style.opacity = '0';
  document.body.appendChild(probe);

  const computedColor = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return null;
  }

  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
  };
};

const toDraft = (branding: {
  primary_color: string;
  secondary_color: string;
  homepage_title: string;
  welcome_text: string;
  footer_text: string;
  logo_image_url: string;
  banner_image_url: string;
} | null | undefined): BrandingDraft => ({
  primary_color: branding?.primary_color || '#2563eb',
  secondary_color: branding?.secondary_color || '#f97316',
  homepage_title: branding?.homepage_title || '',
  welcome_text: branding?.welcome_text || '',
  footer_text: branding?.footer_text || '',
  logo_image_url: branding?.logo_image_url || '',
  banner_image_url: branding?.banner_image_url || '',
});

const fileToPreviewUrl = (file: File | null) => {
  if (!file) return '';
  return URL.createObjectURL(file);
};

interface ColorPickerPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText: string;
  error?: string;
}

function ColorPickerPanel({ label, value, onChange, helperText, error }: ColorPickerPanelProps) {
  const [model, setModel] = useState<HslColor>({ hue: 210, saturation: 100, lightness: 50 });

  useEffect(() => {
    const rgb = parseCssColorToRgb(value);
    if (!rgb) {
      return;
    }

    setModel(rgbToHsl(rgb.red, rgb.green, rgb.blue));
  }, [value]);

  const emitModel = (nextModel: HslColor) => {
    const rgb = hslToRgb(nextModel.hue, nextModel.saturation, nextModel.lightness);
    onChange(rgbToHex(rgb.red, rgb.green, rgb.blue));
  };

  const handleSquareInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.type === 'pointermove' && event.buttons !== 1) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const saturation = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const lightness = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    const nextModel = {
      ...model,
      saturation,
      lightness,
    };

    setModel(nextModel);
    emitModel(nextModel);
  };

  const handleHueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextModel = {
      ...model,
      hue: Number(event.target.value),
    };

    setModel(nextModel);
    emitModel(nextModel);
  };

  const squareColor = `hsl(${Math.round(model.hue)} 100% 50%)`;
  const cursorLeft = `${clamp(model.saturation, 0, 100)}%`;
  const cursorTop = `${100 - clamp(model.lightness, 0, 100)}%`;
  const fallbackRgb = hslToRgb(model.hue, model.saturation, model.lightness);
  const selectedColor = isCssColor(value)
    ? value
    : rgbToHex(fallbackRgb.red, fallbackRgb.green, fallbackRgb.blue);

  return (
    <div className="branding-picker-card">
      <div className="branding-picker-header">
        <div>
          <div className="branding-picker-label">{label}</div>
          <div className="branding-picker-value">{value}</div>
        </div>
        <span className="branding-picker-preview" style={{ backgroundColor: selectedColor }} aria-hidden="true" />
      </div>

      <div
        className="branding-picker-canvas"
        style={{
          backgroundColor: squareColor,
          backgroundImage: 'linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0))',
        }}
        onPointerDown={handleSquareInteraction}
        onPointerMove={handleSquareInteraction}
      >
        <span
          className="branding-picker-cursor"
          style={{
            left: cursorLeft,
            top: cursorTop,
          }}
          aria-hidden="true"
        />
      </div>

      <div className="branding-picker-hue-row">
        <span className="branding-picker-hue-dot" style={{ backgroundColor: squareColor }} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={360}
          value={model.hue}
          onChange={handleHueChange}
          className="branding-picker-hue-slider"
          aria-label={`${label} - teinte`}
        />
      </div>

      <Input
        label="Valeur CSS"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex: #2563eb, rgb(37 99 235), rebeccapurple"
        error={error}
      />
      <p className="branding-picker-help">{helperText}</p>
    </div>
  );
}

export function BankBranding() {
  const { branding, marketplace, isLoading, error, refresh } = useBankTenant();
  const [draft, setDraft] = useState<BrandingDraft>(toDraft(null));
  const [baselineDraft, setBaselineDraft] = useState<BrandingDraft>(toDraft(null));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = toDraft(branding);
    setDraft(next);
    setBaselineDraft(next);
    setLogoFile(null);
    setBannerFile(null);
    setFormError('');
  }, [branding]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl('');
      return;
    }

    const preview = fileToPreviewUrl(logoFile);
    setLogoPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [logoFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl('');
      return;
    }

    const preview = fileToPreviewUrl(bannerFile);
    setBannerPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [bannerFile]);

  const updateField = (field: keyof BrandingDraft, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFormError('');
    setFormSuccess('');
  };

  const validateForm = () => {
    if (!marketplace?.id) {
      return "Impossible d'identifier la marketplace courante.";
    }

    if (!draft.primary_color.trim()) {
      return 'La couleur primaire est obligatoire.';
    }

    if (!draft.secondary_color.trim()) {
      return 'La couleur secondaire est obligatoire.';
    }

    if (!isCssColor(draft.primary_color)) {
      return 'La couleur primaire doit être une valeur CSS valide.';
    }

    if (!isCssColor(draft.secondary_color)) {
      return 'La couleur secondaire doit être une valeur CSS valide.';
    }

    return '';
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Le logo ne doit pas dépasser 5 Mo.');
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    setFormError('');
    setFormSuccess('');
  };

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('La bannière ne doit pas dépasser 5 Mo.');
      event.target.value = '';
      return;
    }

    setBannerFile(file);
    setFormError('');
    setFormSuccess('');
  };

  const handleReset = () => {
    setDraft(baselineDraft);
    setLogoFile(null);
    setBannerFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
    setFormError('');
    setFormSuccess('');
  };

  const handlePreviewScroll = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenMarketplace = () => {
    window.open(`${window.location.origin}/`, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!marketplace?.id) {
      setFormError("Impossible d'identifier la marketplace courante.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      setFormSuccess('');

      let logoImageUrl = draft.logo_image_url;
      let bannerImageUrl = draft.banner_image_url;

      if (logoFile) {
        logoImageUrl = await bankTenantService.uploadMarketplaceLogo(logoFile);
      }

      if (bannerFile) {
        bannerImageUrl = await bankTenantService.uploadMarketplaceBanner(bannerFile);
      }

      await bankTenantService.updateMarketplaceBranding(marketplace.id, {
        primaryColor: draft.primary_color.trim(),
        secondaryColor: draft.secondary_color.trim(),
        homepageTitle: draft.homepage_title.trim(),
        welcomeText: draft.welcome_text.trim(),
        footerText: draft.footer_text.trim(),
        logoImageUrl,
        bannerImageUrl,
        banniereUrl: bannerImageUrl,
      });

      const refreshedLogo = logoImageUrl || draft.logo_image_url;
      const refreshedBanner = bannerImageUrl || draft.banner_image_url;

      setDraft((previous) => ({
        ...previous,
        logo_image_url: refreshedLogo,
        banner_image_url: refreshedBanner,
      }));
      setBaselineDraft((previous) => ({
        ...previous,
        primary_color: draft.primary_color.trim(),
        secondary_color: draft.secondary_color.trim(),
        homepage_title: draft.homepage_title.trim(),
        welcome_text: draft.welcome_text.trim(),
        footer_text: draft.footer_text.trim(),
        logo_image_url: refreshedLogo,
        banner_image_url: refreshedBanner,
      }));
      setLogoFile(null);
      setBannerFile(null);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
      setFormSuccess('Le branding de la marketplace a été enregistré avec succès.');
      refresh();
    } catch (saveError) {
      console.error('Failed to save branding:', saveError);
      setFormError("Impossible d'enregistrer le branding. Vérifiez les données saisies.");
    } finally {
      setIsSaving(false);
    }
  };

  const logoSrc = logoPreviewUrl || getBackendAssetUrl(draft.logo_image_url || branding?.logo_image_url || marketplace?.bankLogoUrl);
  const bannerSrc = bannerPreviewUrl || getBackendAssetUrl(draft.banner_image_url || branding?.banner_image_url || marketplace?.banniereUrl || marketplace?.bannerImageUrl);
  const primaryColorValid = isCssColor(draft.primary_color);
  const secondaryColorValid = isCssColor(draft.secondary_color);

  if (isLoading) {
    return (
      <div className="branding-container">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement du branding...
        </div>
      </div>
    );
  }

  return (
    <div className="branding-container">
      <div className="branding-header">
        <div>
          <h1 className="branding-title">Personnalisation du branding</h1>
          <p className="branding-subtitle">
            {marketplace?.bankName ? `Configurez l'apparence de ${marketplace.bankName}` : "Configurez l'apparence de votre marketplace"}
          </p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {formError && <p className="mb-4 text-sm text-destructive">{formError}</p>}
      {formSuccess && <p className="mb-4 text-sm text-success">{formSuccess}</p>}

      <div className="branding-main-grid">
        <div className="branding-content-col">
          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>Utilisez la palette visuelle pour choisir n'importe quelle couleur.</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <div className="branding-color-grid">
                <ColorPickerPanel
                  label="Couleur principale"
                  value={draft.primary_color}
                  onChange={(nextValue) => updateField('primary_color', nextValue)}
                  helperText="Clique dans le carré pour régler saturation et luminosité, puis ajuste la teinte avec le curseur."
                  error={!primaryColorValid ? 'Valeur CSS invalide' : undefined}
                />
                <ColorPickerPanel
                  label="Couleur secondaire"
                  value={draft.secondary_color}
                  onChange={(nextValue) => updateField('secondary_color', nextValue)}
                  helperText="Cette couleur sert aux dégradés, badges et éléments secondaires."
                  error={!secondaryColorValid ? 'Valeur CSS invalide' : undefined}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Logo et bannière de la marketplace courante.</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <div>
                <label className="branding-label">Logo de la marketplace</label>
                <div className="branding-upload-area">
                  {logoSrc ? (
                    <img src={logoSrc} alt="Logo de la marketplace" className="branding-upload-preview" />
                  ) : (
                    <FileImage className="branding-upload-icon" />
                  )}
                  <p className="branding-upload-title">Logo actuel de la marketplace</p>
                  <p className="branding-upload-hint">PNG, JPG ou SVG. Maximum 5 Mo.</p>
                  <div className="branding-upload-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Choisir un logo
                    </Button>
                    {logoFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLogoFile(null);
                          if (logoInputRef.current) {
                            logoInputRef.current.value = '';
                          }
                        }}
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                  <p className="branding-file-name">{logoFile?.name || 'Aucun nouveau fichier sélectionné'}</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>

              <div>
                <label className="branding-label">Bannière de la page d'accueil</label>
                <div className="branding-upload-area">
                  {bannerSrc ? (
                    <img src={bannerSrc} alt="Bannière de la marketplace" className="branding-upload-banner-preview" />
                  ) : (
                    <Upload className="branding-upload-icon" />
                  )}
                  <p className="branding-upload-title">Bannière personnalisée</p>
                  <p className="branding-upload-hint">Image affichée sur la page d’accueil publique.</p>
                  <div className="branding-upload-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      Choisir une bannière
                    </Button>
                    {bannerFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBannerFile(null);
                          if (bannerInputRef.current) {
                            bannerInputRef.current.value = '';
                          }
                        }}
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                  <p className="branding-file-name">{bannerFile?.name || 'Aucun nouveau fichier sélectionné'}</p>
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenu visible</CardTitle>
              <CardDescription>Modifiez le titre, le message d'accueil et le pied de page.</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <Input
                label="Titre de la page d'accueil"
                value={draft.homepage_title}
                onChange={(event) => updateField('homepage_title', event.target.value)}
                placeholder="Bienvenue sur notre marketplace"
              />
              <div>
                <label className="branding-label">Message de bienvenue</label>
                <textarea
                  className="branding-textarea"
                  rows={4}
                  value={draft.welcome_text}
                  onChange={(event) => updateField('welcome_text', event.target.value)}
                  placeholder="Présentez ici les offres et les avantages de votre marketplace."
                />
              </div>
              <Input
                label="Texte du pied de page"
                value={draft.footer_text}
                onChange={(event) => updateField('footer_text', event.target.value)}
                placeholder="© 2026 Votre banque. Tous droits réservés."
              />
            </CardContent>
          </Card>
        </div>

        <div className="branding-sidebar-col">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu en temps réel</CardTitle>
              <CardDescription>Le rendu public utilise le logo, les couleurs et les textes configurés ici.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="branding-preview-card" ref={previewRef}>
                <div
                  className="branding-preview-banner"
                  style={bannerSrc
                    ? { backgroundImage: `url(${bannerSrc})` }
                    : {
                        background: `linear-gradient(135deg, ${primaryColorValid ? draft.primary_color : '#2563eb'}, ${secondaryColorValid ? draft.secondary_color : '#f97316'})`,
                      }}
                />
                <div className="branding-preview-content">
                  <div className="branding-preview-header">
                    {logoSrc ? (
                      <img src={logoSrc} alt="Logo" className="branding-preview-logo" />
                    ) : (
                      <div className="branding-preview-logo bg-muted" />
                    )}
                    <div style={primaryColorValid ? { color: draft.primary_color } : undefined} className="branding-preview-bank-name">
                      {marketplace?.bankName || 'Marketplace'}
                    </div>
                  </div>
                  <h3 className="branding-preview-title" style={primaryColorValid ? { color: draft.primary_color } : undefined}>
                    {draft.homepage_title || 'Bienvenue sur la marketplace'}
                  </h3>
                  <p className="branding-preview-desc">
                    {draft.welcome_text || 'Aperçu du message de bienvenue.'}
                  </p>
                  <button
                    className="branding-preview-btn"
                    style={primaryColorValid ? { backgroundColor: draft.primary_color } : undefined}
                    type="button"
                  >
                    Découvrir
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="branding-sidebar-actions">
              <Button className="branding-full-width" icon={<Save className="w-4 h-4" />} onClick={handleSave} loading={isSaving} type="button">
                Enregistrer les modifications
              </Button>
              <Button className="branding-full-width" variant="outline" icon={<Eye className="w-4 h-4" />} onClick={handlePreviewScroll} type="button">
                Voir l'aperçu
              </Button>
              <Button className="branding-full-width" variant="ghost" icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset} type="button">
                Réinitialiser
              </Button>
              <Button className="branding-full-width" variant="secondary" onClick={handleOpenMarketplace} type="button">
                Ouvrir la marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
