import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, Globe2, ImagePlus, RotateCcw, Save, Settings, Store, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  DEALER_BRANDING_UPDATED_EVENT,
  dealerService,
  type DealerSettingsPayload,
  type DealerView,
} from '../../services/dealerService';
import { storeService } from '../../services/storeService';
import type { StoreDto } from '../../types/apiTypes';
import { resolveApiUrl } from '../../api/apiClient';

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const WEBSITE_PATTERN = /^https?:\/\/[^\s]+$/i;

interface SettingsForm {
  companyName: string;
  registrationNumber: string;
  storeId: string;
  website: string;
}

const EMPTY_FORM: SettingsForm = {
  companyName: '',
  registrationNumber: '',
  storeId: '',
  website: '',
};

const formFromDealer = (dealer: DealerView): SettingsForm => ({
  companyName: dealer.companyName ?? '',
  registrationNumber: dealer.registrationNumber ?? '',
  storeId: String(dealer.storeId ?? ''),
  website: dealer.website ?? '',
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: string; error?: string } | undefined;
  return data?.message || data?.error || fallback;
};

export function DealerSettingsPage() {
  const [dealer, setDealer] = useState<DealerView | null>(null);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([dealerService.me(), storeService.getStoresByStatus('active')])
      .then(([dealerResponse, storesResponse]) => {
        if (!active) return;
        setDealer(dealerResponse.data);
        setForm(formFromDealer(dealerResponse.data));
        setStores(storesResponse.data);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Impossible de charger les paramètres.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!logo) {
      setLogoPreview(null);
      return;
    }
    const preview = URL.createObjectURL(logo);
    setLogoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [logo]);

  const displayedLogo = logoPreview
    || (!removeLogo && dealer?.logoUrl ? resolveApiUrl(dealer.logoUrl) : null);

  const updateField = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      toast.error('Le logo doit être au format PNG, JPG, JPEG ou WEBP.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Le logo ne doit pas dépasser 5 Mo.');
      return;
    }
    setLogo(file);
    setRemoveLogo(false);
  };

  const resetForm = () => {
    if (!dealer) return;
    setForm(formFromDealer(dealer));
    setLogo(null);
    setRemoveLogo(false);
  };

  const validate = () => {
    if (!form.companyName.trim()) return 'Le nom du concessionnaire est obligatoire.';
    if (!form.registrationNumber.trim()) return "Le numéro d'immatriculation est obligatoire.";
    if (!form.storeId) return 'La catégorie du concessionnaire est obligatoire.';
    if (!form.website.trim()) return 'Le site web est obligatoire.';
    if (!WEBSITE_PATTERN.test(form.website.trim())) return 'Veuillez saisir une URL valide.';
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: DealerSettingsPayload = {
      companyName: form.companyName.trim(),
      registrationNumber: form.registrationNumber.trim(),
      storeId: Number(form.storeId),
      website: form.website.trim(),
      removeLogo,
    };

    setSaving(true);
    try {
      const response = await dealerService.updateSettings(payload, logo ?? undefined);
      setDealer(response.data);
      setForm(formFromDealer(response.data));
      setLogo(null);
      setRemoveLogo(false);
      window.dispatchEvent(new Event(DEALER_BRANDING_UPDATED_EVENT));
      toast.success('Les paramètres ont été mis à jour avec succès.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de mettre à jour les paramètres.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[1600px] space-y-6 pb-10">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        </div>
        <p className="text-muted-foreground">Gérez les informations générales et l'identité visuelle de votre concession.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Informations du concessionnaire</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ces informations identifient votre établissement sur Matchia.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Nom du concessionnaire <span className="text-destructive">*</span></span>
            <input
              value={form.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              maxLength={255}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Numéro d'immatriculation / registre de commerce <span className="text-destructive">*</span></span>
            <input
              value={form.registrationNumber}
              onChange={(event) => updateField('registrationNumber', event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              maxLength={255}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium"><Store className="h-4 w-4 text-muted-foreground" /> Catégorie du concessionnaire <span className="text-destructive">*</span></span>
            <select
              value={form.storeId}
              onChange={(event) => updateField('storeId', event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium"><Globe2 className="h-4 w-4 text-muted-foreground" /> Site web <span className="text-destructive">*</span></span>
            <input
              type="url"
              value={form.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://www.mon-concessionnaire.com"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              maxLength={500}
              required
            />
          </label>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <ImagePlus className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Identité visuelle</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ce logo est utilisé dans votre tableau de bord et votre navigation.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="flex h-36 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 p-4">
            {displayedLogo ? (
              <img src={displayedLogo} alt="Logo du concessionnaire" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImagePlus className="mx-auto mb-2 h-8 w-8" />
                <span className="text-sm">Aucun logo</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">Logo du concessionnaire</p>
            <p className="mt-1 text-sm text-muted-foreground">PNG, JPG, JPEG ou WEBP. Taille maximale : 5 Mo.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition hover:bg-primary-hover">
                <Upload className="h-4 w-4" />
                {displayedLogo ? 'Remplacer le logo' : 'Ajouter un logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              </label>
              {displayedLogo && (
                <Button
                  type="button"
                  variant="outline"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => { setLogo(null); setRemoveLogo(true); }}
                >
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button type="button" variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={resetForm} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" icon={<Save className="h-4 w-4" />} loading={saving}>
          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}
