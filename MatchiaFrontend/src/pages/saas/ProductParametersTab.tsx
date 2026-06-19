import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { KpiCard } from '../../components/ui/KpiCard';
import { Loader2, Plus, Pencil, RefreshCcw, Sparkles, Store, Trash2 } from 'lucide-react';
import { storeService } from '../../services/storeService';
import { productParameterService } from '../../services/productParameterService';
import type { ProductParameterDefinitionDto, StoreDto } from '../../types/apiTypes';

type ProductParameterFormState = {
  storeId: string;
  name: string;
};

const initialForm: ProductParameterFormState = {
  storeId: '',
  name: '',
};

const getStoreLabel = (store: StoreDto) =>
  `${store.name} ${store.status ? `(${store.status === 'active' ? 'Actif' : 'Inactif'})` : ''}`.trim();

export function ProductParametersTab() {
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [definitions, setDefinitions] = useState<ProductParameterDefinitionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductParameterFormState>(initialForm);
  const [formError, setFormError] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const storesResponse = await storeService.getAllStores();
      const storeList = storesResponse.data || [];
      setStores(storeList);

      const responses = await Promise.all(
        storeList.map(async (store) => {
          try {
            const response = await productParameterService.getByStore(store.id);
            return response.data || [];
          } catch (error) {
            console.error(`Failed to load product parameters for store ${store.id}:`, error);
            return [] as ProductParameterDefinitionDto[];
          }
        }),
      );

      setDefinitions(responses.flat());
    } catch (error) {
      console.error('Failed to load product parameter definitions:', error);
      toast.error('Impossible de charger les parametres produits.');
      setDefinitions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const storeById = useMemo(() => {
    return stores.reduce<Record<number, StoreDto>>((acc, store) => {
      acc[store.id] = store;
      return acc;
    }, {});
  }, [stores]);

  const groupedDefinitions = useMemo(() => {
    return stores
      .map((store) => ({
        store,
        items: definitions.filter((definition) => definition.storeId === store.id),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [definitions, stores]);

  const stats = useMemo(() => {
    const configuredStores = new Set(definitions.map((definition) => definition.storeId)).size;
    const activeStores = stores.filter((store) => store.status === 'active').length;

    return [
      { label: 'Parametres', value: definitions.length, description: 'definitions disponibles' },
      { label: 'Stores configures', value: configuredStores, description: 'stores avec au moins un parametre' },
      { label: 'Stores actifs', value: activeStores, description: 'stores disponibles' },
      { label: 'Stores sans parametres', value: Math.max(stores.length - configuredStores, 0), description: 'a configurer' },
    ];
  }, [definitions, stores]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (definition: ProductParameterDefinitionDto) => {
    setEditingId(definition.id);
    setForm({
      storeId: String(definition.storeId),
      name: definition.name,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    setForm(initialForm);
    setEditingId(null);
    setFormError('');
  };

  const submit = async () => {
    if (!form.storeId) {
      setFormError('Le store est obligatoire.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Le nom du parametre est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        storeId: Number(form.storeId),
        name: form.name.trim(),
      };

      if (editingId) {
        await productParameterService.update(editingId, payload);
        toast.success('Parametre mis a jour avec succes.');
      } else {
        await productParameterService.create(payload);
        toast.success('Parametre ajoute avec succes.');
      }

      await loadData();
      closeModal();
    } catch (error) {
      console.error('Failed to save product parameter:', error);
      setFormError("Impossible d'enregistrer le parametre.");
      toast.error("Impossible d'enregistrer le parametre.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDefinition = async (definition: ProductParameterDefinitionDto) => {
    const confirmed = window.confirm(`Supprimer le parametre "${definition.name}" ?`);
    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(definition.id);
    try {
      await productParameterService.delete(definition.id);
      toast.success('Parametre supprime avec succes.');
      await loadData();
    } catch (error) {
      console.error('Failed to delete product parameter:', error);
      toast.error('La suppression du parametre a echoue.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parametres produits</h1>
          <p className="text-muted-foreground">
            Definissez, store par store, la structure des parametres produits qui sera reprise dans le back office banque.
          </p>
        </div>

        <Button
          className="bg-orange-500 hover:bg-orange-600"
          icon={<Plus className="h-4 w-4" />}
          onClick={openCreateModal}
        >
          Add Parameter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <KpiCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={<Sparkles className="h-5 w-5" />}
            tone="primary"
            badge={stat.description}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Liste des parametres</CardTitle>
            <CardDescription>Chaque parametre est rattache a un store precis.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Chargement des parametres...
              </div>
            ) : definitions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                Aucun parametre produit n&apos;est encore defini.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Store</th>
                      <th className="px-4 py-3 text-left font-semibold">Parametre</th>
                      <th className="px-4 py-3 text-left font-semibold">Statut store</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {definitions
                      .slice()
                      .sort((a, b) => a.storeName?.localeCompare(b.storeName || '') || a.name.localeCompare(b.name))
                      .map((definition) => {
                        const store = storeById[definition.storeId];
                        return (
                          <tr key={definition.id} className="hover:bg-muted/30">
                            <td className="px-4 py-4 align-top">
                              <div className="font-medium text-foreground">{definition.storeName || store?.name || `Store ${definition.storeId}`}</div>
                              <div className="text-xs text-muted-foreground">ID #{definition.storeId}</div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                <Sparkles className="h-4 w-4" />
                                {definition.name}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge variant={store?.status === 'active' ? 'success' : 'warning'}>
                                {store?.status === 'active' ? 'Actif' : 'Inactif'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={<Pencil className="h-4 w-4" />}
                                  onClick={() => openEditModal(definition)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  icon={deleteLoadingId === definition.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  onClick={() => deleteDefinition(definition)}
                                  disabled={deleteLoadingId === definition.id}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Parametres par store</CardTitle>
            <CardDescription>Une vue rapide pour verifier les structures configurees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedDefinitions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Ajoutez le premier parametre pour voir la structure par store.
              </div>
            ) : (
              groupedDefinitions.map(({ store, items }) => (
                <div key={store.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-orange-500" />
                        <h3 className="truncate font-semibold">{getStoreLabel(store)}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{items.length} parametre(s) defini(s)</p>
                    </div>
                    <Badge variant={store.status === 'active' ? 'success' : 'warning'}>
                      {store.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-sm text-foreground shadow-sm"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier le parametre' : 'Add Parameter'}
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Parametre lie a un store
            </div>
            <p className="mt-1 text-orange-800">
              Le store definit la structure, et ce nom de parametre sera disponible dans le back office banque lors de la creation d&apos;un produit.
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
                ...stores.map((store) => ({ value: String(store.id), label: getStoreLabel(store) })),
              ]}
              disabled={editingId != null}
            />
            <Input
              label="Nom du parametre"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ex: Taux, Duree, Montant..."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={submit}
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            >
              {editingId ? 'Enregistrer les modifications' : 'Ajouter le parametre'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
