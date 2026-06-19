import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/textarea';
import { useBankTenant } from '../../hooks/useBankTenant';
import { contentService } from '../../services/contentService';
import { marketplaceContentService } from '../../services/marketplaceContentService';
import type { ContentDto, ContentStatus, MarketplaceContentDto, MarketplaceStoreDetailDto } from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';
import { Image as ImageIcon, Loader2, Pencil, Plus, Sparkles, Store as StoreIcon, Trash2 } from 'lucide-react';

const STORE_COLORS = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#0f766e',
  '#ca8a04',
  '#db2777',
];

const statusLabel: Record<ContentStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
};

const getStoreColor = (storeId?: number | null) => {
  if (storeId == null || Number.isNaN(storeId)) {
    return STORE_COLORS[0];
  }
  return STORE_COLORS[Math.abs(storeId) % STORE_COLORS.length];
};

const truncate = (value: string, length = 150) =>
  value.length > length ? `${value.slice(0, length).trim()}...` : value;

type MarketplaceContentGroup = {
  store: MarketplaceStoreDetailDto | null;
  storeId: number | null;
  contents: BankContentItem[];
};

type BankContentItem = {
  id: number;
  source: 'standard' | 'marketplace';
  storeId?: number | null;
  storeName?: string | null;
  title: string;
  description: string;
  imageUrl?: string | null;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
};

const normalizeContentKey = (content: BankContentItem) =>
  [
    content.source,
    content.storeId ?? 'null',
    content.title.trim().toLowerCase(),
    content.description.trim().toLowerCase(),
    (content.imageUrl || '').trim().toLowerCase(),
    content.status,
  ].join('|');

const dedupeContents = (items: BankContentItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normalizeContentKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const initialForm = {
  storeId: '',
  title: '',
  description: '',
  status: 'active' as ContentStatus,
};

export function BankContentManagement() {
  const { marketplace, stores, isLoading: tenantLoading, error: tenantError, tenantSlug } = useBankTenant();
  const [contents, setContents] = useState<BankContentItem[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    let mounted = true;

    const loadContents = async () => {
      setIsLoadingContents(true);
      setError('');

      try {
        const slug = marketplace?.bankSlug || tenantSlug || '';
        if (!slug) {
          throw new Error('Marketplace introuvable.');
        }

        const [standardResponse, marketplaceResponse] = await Promise.all([
          contentService.getContentsByMarketplaceSlug(slug),
          marketplaceContentService.getContentsByMarketplaceSlug(slug),
        ]);

        if (!mounted) return;
        const standardContents = (standardResponse.data || []).map((content: ContentDto) => ({
          ...content,
          source: 'standard' as const,
        }));
        const marketplaceContents = (marketplaceResponse.data || []).map((content: MarketplaceContentDto) => ({
          ...content,
          source: 'marketplace' as const,
        }));

        setContents(dedupeContents([...standardContents, ...marketplaceContents]));
      } catch (loadError) {
        console.error('Failed to load contents:', loadError);
        if (mounted) {
          setError('Impossible de charger les contenus.');
        }
      } finally {
        if (mounted) {
          setIsLoadingContents(false);
        }
      }
    };

    void loadContents();

    return () => {
      mounted = false;
    };
  }, [marketplace?.bankSlug, tenantSlug]);

  const storeById = useMemo(() => {
    return stores.reduce<Record<number, (typeof stores)[number]>>((acc, store) => {
      const key = store.storeId ?? store.id;
      acc[key] = store;
      return acc;
    }, {});
  }, [stores]);

  const marketplaceContents = useMemo(
    () => contents.filter((content) => content.storeId == null || !storeById[content.storeId]),
    [contents, storeById],
  );

  const groupedContents = useMemo<MarketplaceContentGroup[]>(() => {
    const storeGroups: MarketplaceContentGroup[] = stores
      .map((store) => {
        const storeId = store.storeId ?? store.id;
        return {
          store,
          storeId,
          contents: contents.filter((content) => content.storeId === storeId),
        } as MarketplaceContentGroup;
      })
      .filter((entry) => entry.contents.length > 0 || stores.length === 0);

    if (marketplaceContents.length > 0) {
      storeGroups.unshift({
        store: null,
        storeId: null,
        contents: marketplaceContents,
      });
    }

    return storeGroups;
  }, [contents, marketplaceContents, stores]);

  const stats = useMemo(() => {
    const active = contents.filter((content) => content.status === 'active').length;
    const inactive = contents.filter((content) => content.status === 'inactive').length;

    return [
      { label: 'Contenus', value: contents.length, badge: 'tous les contenus', tone: 'primary' as const },
      { label: 'Actifs', value: active, badge: 'contenus publies', tone: 'success' as const },
      { label: 'Inactifs', value: inactive, badge: 'contenus masques', tone: 'warning' as const },
      { label: 'Stores', value: stores.length, badge: 'stores disponibles', tone: 'secondary' as const },
    ];
  }, [contents, stores.length]);

  const loading = tenantLoading || isLoadingContents;
  const visibleError = error || tenantError;

  const storeOptions = useMemo(() => (
    [
      { value: '', label: 'Marketplace uniquement' },
      ...stores.map((store) => ({
        value: String(store.storeId ?? store.id),
        label: `${store.name || `Store ${store.id}`} - ${(store.enabled === false || store.visible === false) ? 'Inactif' : 'Actif'}`,
      })),
    ]
  ), [stores]);

  const resetForm = () => {
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm(initialForm);
    setImageFile(null);
    setImagePreview('');
    setFormError('');
    setEditingContentId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (content: BankContentItem) => {
    if (content.source !== 'marketplace') {
      return;
    }
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingContentId(content.id);
    setForm({
      storeId: content.storeId ? String(content.storeId) : '',
      title: content.title,
      description: content.description,
      status: content.status,
    });
    setImageFile(null);
    setImagePreview(content.imageUrl ? getBackendAssetUrl(content.imageUrl) : '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    resetForm();
  };

  const handleImageChange = (file?: File | null) => {
    if (!file) return;

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submitContent = async () => {
    if (!form.title.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!form.description.trim()) {
      setFormError('La description est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        storeId: form.storeId ? Number(form.storeId) : null,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        marketplaceSlug: marketplace?.bankSlug || tenantSlug || '',
        image: imageFile,
      };

      const response = editingContentId
        ? await marketplaceContentService.updateContent(editingContentId, payload)
        : await marketplaceContentService.createContent(payload);
      const savedContent: BankContentItem = {
        ...response.data,
        source: 'marketplace',
      };

      setContents((prev) => {
        const next = editingContentId
          ? prev.map((item) => (item.id === editingContentId ? savedContent : item))
          : [savedContent, ...prev];
        return dedupeContents(next);
      });
      toast.success(editingContentId ? 'Contenu mis à jour avec succès.' : 'Nouveau contenu ajouté avec succès.');
      setIsModalOpen(false);
      resetForm();
    } catch (submitError) {
      console.error('Failed to create content:', submitError);
      setFormError(editingContentId ? 'La modification du contenu a échoué.' : 'La creation du contenu a echoue.');
      toast.error(editingContentId ? 'La modification du contenu a échoué.' : 'La creation du contenu a echoue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteContent = async (content: BankContentItem) => {
    if (content.source !== 'marketplace') {
      return;
    }
    const confirmed = window.confirm(`Supprimer le contenu "${content.title}" ?`);
    if (!confirmed) return;

    const slug = marketplace?.bankSlug || tenantSlug || '';
    if (!slug) {
      toast.error('Marketplace introuvable.');
      return;
    }

    setDeletingContentId(content.id);

    try {
      await marketplaceContentService.deleteContent(content.id, slug);
      setContents((prev) => prev.filter((item) => item.id !== content.id));
      toast.success('Contenu supprimé avec succès.');
    } catch (deleteError) {
      console.error('Failed to delete content:', deleteError);
      toast.error('La suppression du contenu a échoué.');
    } finally {
      setDeletingContentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Gestion du contenu</h1>
          
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Marketplace: <span className="font-medium text-foreground">{marketplace?.bankSlug || 'tenant'}</span>
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreateModal}
          >
            Nouveau contenu
          </Button>
        </div>
      </div>

      {visibleError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {visibleError}
        </div>
      )}

      <div className="bank-stats-grid">
        {stats.map((stat) => (
          <KpiCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={<Sparkles className="w-5 h-5" />}
            tone={stat.tone}
            badge={stat.badge}
          />
        ))}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Contenus par store</CardTitle>
          <CardDescription>Les contenus sont découpes par boutique, puis publies dans la marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des contenus...
            </div>
          ) : groupedContents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              Aucun contenu disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedContents.map(({ store, storeId, contents: storeContents }) => {
                const storeColor = getStoreColor(storeId);
                const storeLabel = store?.name || 'Marketplace';
                const storeDescription = store?.description || 'Contenus globaux de la marketplace.';

                return (
                  <section key={storeId ?? 'marketplace'} className="space-y-4 rounded-3xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                          style={{
                            borderColor: `${storeColor}33`,
                            backgroundColor: `${storeColor}10`,
                            color: storeColor,
                          }}
                        >
                          <StoreIcon className="h-4 w-4 shrink-0" style={{ color: storeColor }} />
                          <span className="truncate">{storeLabel}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {storeDescription}
                        </p>
                      </div>
                      <div className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        {storeContents.length} contenu{storeContents.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {storeContents.map((content) => {
                        const imageUrl = getBackendAssetUrl(content.imageUrl);
                        return (
                          <article
                            key={`${content.source}-${content.id}`}
                            className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
                          >
                            <div className="relative h-48 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-500">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={content.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-white/80">
                                  <ImageIcon className="h-12 w-12" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
                                <Badge variant={content.status === 'active' ? 'success' : 'warning'}>
                                  {statusLabel[content.status]}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col gap-4 p-5">
                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-slate-900">{content.title}</h3>
                                <p className="text-sm text-muted-foreground">{truncate(content.description)}</p>
                              </div>

                              <div
                                className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm backdrop-blur-sm"
                                style={{
                                  borderColor: `${storeColor}33`,
                                  backgroundColor: `${storeColor}12`,
                                  color: storeColor,
                                }}
                              >
                                <Sparkles className="h-4 w-4 shrink-0" />
                                <span className="truncate">{content.storeName || storeLabel}</span>
                              </div>

                              

                              {content.source === 'marketplace' ? (
                                <div className="mt-auto flex flex-col gap-3 sm:flex-row">
                                  <Button
                                    variant="outline"
                                    className="w-full"
                                    icon={<Pencil className="h-4 w-4" />}
                                    onClick={() => openEditModal(content)}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="danger"
                                    className="w-full"
                                    icon={deletingContentId === content.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    onClick={() => deleteContent(content)}
                                    disabled={deletingContentId === content.id}
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingContentId ? 'Modifier le contenu' : 'Nouveau contenu'}
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Ajout de contenu pour votre marketplace
            </div>
            <p className="mt-1 text-orange-800">
              Créez un contenu lié à un store précis et visible dans votre marketplace.
            </p>
          </div>

          {formError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Store"
              value={form.storeId}
              onChange={(event) => setForm((prev) => ({ ...prev, storeId: event.target.value }))}
              options={[
                { value: '', label: 'Selectionnez un store' },
                ...storeOptions,
              ]}
            />
            <Select
              label="Statut"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ContentStatus }))}
              options={[
                { value: 'active', label: 'Actif' },
                { value: 'inactive', label: 'Inactif' },
              ]}
            />
          </div>

          <Input
            label="Titre"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre du contenu"
          />

          <div className="space-y-2">
            <label className="block text-sm text-foreground">Description</label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Décrivez votre contenu..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              <label className="block text-sm text-foreground">Image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => handleImageChange(event.target.files?.[0] || null)}
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="text-sm font-medium">Aperçu</div>
              <div className="mt-3 h-40 overflow-hidden rounded-xl border border-border bg-slate-900">
                {imagePreview ? (
                  <img src={imagePreview} alt="Prévisualisation" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={submitContent}
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            >
              {isSubmitting ? 'Enregistrement...' : editingContentId ? 'Enregistrer les modifications' : 'Créer le contenu'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
