import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/textarea';
import { contentService } from '../../services/contentService';
import { storeService } from '../../services/storeService';
import type { ContentDto, ContentStatus, StoreDto } from '../../types/apiTypes';
import { getBackendAssetUrl } from '../../utils/tenant';
import { Plus, Image as ImageIcon, Loader2, RefreshCcw, Sparkles, Store as StoreIcon, Pencil, Trash2 } from 'lucide-react';

const statusLabel: Record<ContentStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
};

const statusVariant: Record<ContentStatus, 'success' | 'warning'> = {
  active: 'success',
  inactive: 'warning',
};

const STORE_COLORS = [
  '#f97316',
  '#2563eb',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#0f766e',
  '#ca8a04',
  '#db2777',
];

const getStoreColor = (storeId?: number | null) => {
  if (storeId == null || Number.isNaN(storeId)) {
    return STORE_COLORS[0];
  }
  return STORE_COLORS[Math.abs(storeId) % STORE_COLORS.length];
};

const shorten = (value: string, length = 140) => (
  value.length > length ? `${value.slice(0, length).trim()}...` : value
);

const initialForm = {
  storeId: '',
  title: '',
  description: '',
  status: 'active' as ContentStatus,
};

export function ContentManagement() {
  const [contents, setContents] = useState<ContentDto[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingContentId, setDeletingContentId] = useState<number | null>(null);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
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

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [contentsResponse, storesResponse] = await Promise.all([
          contentService.getAllContents(),
          storeService.getAllStores(),
        ]);

        if (!mounted) return;
        setContents(contentsResponse.data || []);
        setStores(storesResponse.data || []);
      } catch (loadError) {
        console.error('Failed to load content management data:', loadError);
        if (mounted) {
          setError('Impossible de charger les contenus ou les stores.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = contents.filter((content) => content.status === 'active').length;
    const inactive = contents.filter((content) => content.status === 'inactive').length;
    return [
      { label: 'Contenus', value: contents.length, helper: 'tous les contenus' },
      { label: 'Actifs', value: active, helper: 'contenus visibles' },
      { label: 'Inactifs', value: inactive, helper: 'contenus masquÃ©s' },
      { label: 'Stores', value: stores.length, helper: 'stores disponibles' },
    ];
  }, [contents, stores.length]);

  const storeOptions = useMemo(() => (
    stores.map((store) => ({
      value: String(store.id),
      label: `${store.name} - ${store.status === 'active' ? 'Actif' : 'Inactif'}`,
    }))
  ), [stores]);

  const resetForm = () => {
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingContentId(null);
    setForm(initialForm);
    setImageFile(null);
    setImagePreview('');
    setFormError('');
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (content: ContentDto) => {
    resetForm();
    setEditingContentId(content.id);
    setForm({
      storeId: String(content.storeId),
      title: content.title,
      description: content.description,
      status: content.status,
    });
    setImagePreview(content.imageUrl ? getBackendAssetUrl(content.imageUrl) : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    closeAndResetModal();
  };

  const handleImageChange = (file?: File | null) => {
    if (!file) {
      return;
    }

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submitContent = async () => {
    if (!form.storeId) {
      setFormError('Le store est obligatoire.');
      return;
    }
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
        storeId: Number(form.storeId),
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        image: imageFile,
      };

      const response = editingContentId
        ? await contentService.updateContent(editingContentId, payload)
        : await contentService.createContent(payload);

      setContents((prev) => (
        editingContentId
          ? prev.map((content) => (content.id === editingContentId ? response.data : content))
          : [response.data, ...prev]
      ));
      closeAndResetModal();
      toast.success(editingContentId ? 'Contenu modifiÃ© avec succÃ¨s.' : 'Contenu crÃ©Ã© avec succÃ¨s.');
    } catch (submitError) {
      console.error('Failed to create content:', submitError);
      setFormError(editingContentId ? 'La modification du contenu a echoue.' : 'La creation du contenu a echoue.');
      toast.error(editingContentId ? 'La modification du contenu a echoue.' : 'La creation du contenu a echoue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteContent = async (content: ContentDto) => {
    const confirmed = window.confirm(`Supprimer le contenu "${content.title}" ?`);
    if (!confirmed) {
      return;
    }

    setDeletingContentId(content.id);
    try {
      await contentService.deleteContent(content.id);
      setContents((prev) => prev.filter((item) => item.id !== content.id));
      toast.success('Contenu supprimé avec succès.');
    } catch (deleteError) {
      console.error('Failed to delete content:', deleteError);
      toast.error('La suppression du contenu a échoué.');
    } finally {
      setDeletingContentId(null);
    }
  };

  const modalTitle = editingContentId ? 'Modifier le contenu' : 'Nouveau contenu';
  const submitLabel = editingContentId ? 'Enregistrer les modifications' : 'CrÃ©er le contenu';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion de contenu</h1>
          <p className="text-muted-foreground">
            CrÃ©ez et suivez les contenus liÃ©s Ã  chaque store de la marketplace.
          </p>
        </div>

        <Button
          className="bg-orange-500 hover:bg-orange-600"
          icon={<Plus className="h-4 w-4" />}
          onClick={openModal}
        >
          Nouveau contenu
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="space-y-1">
              <CardDescription>{stat.label}</CardDescription>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.helper}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Liste des contenus</CardTitle>
          <CardDescription>Tous les contenus crÃ©Ã©s pour vos stores</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des contenus...
            </div>
          ) : contents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              Aucun contenu disponible pour le moment.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {contents.map((content) => {
                const imageUrl = getBackendAssetUrl(content.imageUrl);
                const storeColor = getStoreColor(content.storeId);
                return (
                  <article
                    key={content.id}
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
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <Badge variant={statusVariant[content.status]}>
                          {statusLabel[content.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-slate-900">{content.title}</h3>
                            <div
                              className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
                              style={{
                                borderColor: `${storeColor}33`,
                                backgroundColor: `${storeColor}12`,
                                color: storeColor,
                              }}
                            >
                              <StoreIcon className="h-4 w-4 shrink-0" style={{ color: storeColor }} />
                              <span className="truncate">{content.storeName || 'Store inconnu'}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{shorten(content.description)}</p>
                      </div>

                      <div className="flex items-center justify-end text-xs text-muted-foreground">
                        <span>{content.status === 'active' ? 'Visible' : 'MasquÃ©'}</span>
                      </div>

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
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Contenu liÃ© Ã  un store
            </div>
            <p className="mt-1 text-orange-800">
              SÃ©lectionnez un store existant puis renseignez le titre, la description, l'image et le statut du contenu.
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
                { value: '', label: 'SÃ©lectionnez un store' },
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
              placeholder="DÃ©crivez le contenu..."
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
              <div className="text-sm font-medium">AperÃ§u</div>
              <div className="mt-3 h-40 overflow-hidden rounded-xl border border-border bg-slate-900">
                {imagePreview ? (
                  <img src={imagePreview} alt="PrÃ©visualisation" className="h-full w-full object-cover" />
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
              icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
