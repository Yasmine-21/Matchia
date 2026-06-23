import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/textarea';
import { KpiCard } from '../../components/ui/KpiCard';
import { useBankTenant } from '../../hooks/useBankTenant';
import { useApp } from '../../context/AppContext';
import { productParameterService } from '../../services/productParameterService';
import { productService } from '../../services/productService';
import { getBackendAssetUrl } from '../../utils/tenant';
import type {
  MarketplaceStoreDetailDto,
  ProductDto,
  ProductParameterDefinitionDto,
  ProductParameterValuePayload,
  ProductPayload,
} from '../../types/apiTypes';
import { Eye, Image as ImageIcon, Loader2, Package, Pencil, Plus, RefreshCcw, Sparkles, Tags } from 'lucide-react';

type ProductFormState = {
  storeId: string;
  name: string;
  description: string;
  price: string;
};

const initialForm: ProductFormState = {
  storeId: '',
  name: '',
  description: '',
  price: '',
};

const getStoreId = (store: MarketplaceStoreDetailDto) => store.storeId ?? store.id;
const getStoreLabel = (store: MarketplaceStoreDetailDto) => store.name || `Store ${getStoreId(store)}`;
const getProductImageUrl = (url?: string | null) => getBackendAssetUrl(url);
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

const revokeBlobUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export function BankProducts() {
  const { currentBank } = useApp();
  const { marketplace, stores, isLoading: isTenantLoading, error: tenantError } = useBankTenant();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<'all' | string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [formError, setFormError] = useState('');
  const [parameterDefinitions, setParameterDefinitions] = useState<ProductParameterDefinitionDto[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<number, string>>({});
  const [parameterLoading, setParameterLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const bankId = marketplace?.bankId ?? currentBank?.id ?? null;

  const loadProducts = async () => {
    if (!bankId) {
      return;
    }

    setIsLoadingProducts(true);
    setError('');
    try {
      const response = await productService.getByBank(bankId);
      setProducts(response.data || []);
    } catch (loadError) {
      console.error('Failed to load products:', loadError);
      setError('Impossible de charger la liste des produits.');
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!bankId) {
      setIsLoadingProducts(false);
      return;
    }

    void loadProducts();
  }, [bankId]);

  useEffect(() => {
    return () => revokeBlobUrl(imagePreview);
  }, [imagePreview]);

  const storeMap = useMemo(() => {
    return stores.reduce<Record<number, MarketplaceStoreDetailDto>>((acc, store) => {
      acc[getStoreId(store)] = store;
      return acc;
    }, {});
  }, [stores]);

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) || null,
    [editingProductId, products],
  );

  const availableProducts = useMemo(() => {
    if (selectedStoreFilter === 'all') {
      return products;
    }

    const storeId = Number(selectedStoreFilter);
    return products.filter((product) => product.storeId === storeId);
  }, [products, selectedStoreFilter]);

  const stats = useMemo(() => {
    const configuredStores = new Set(products.map((product) => product.storeId)).size;
    const productsWithParameters = products.filter((product) => product.parameterValues?.length > 0).length;

    return [
      { label: 'Produits', value: products.length, description: 'enregistres' },
      { label: 'Stores utilises', value: configuredStores, description: 'avec au moins un produit' },
      { label: 'Produits parametres', value: productsWithParameters, description: 'avec valeurs saisies' },
      { label: 'Stores disponibles', value: stores.length, description: 'dans le back office' },
    ];
  }, [products, stores.length]);

  const resetImage = () => {
    revokeBlobUrl(imagePreview);
    setImageFile(null);
    setImagePreview('');
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormError('');
    setEditingProductId(null);
    setParameterDefinitions([]);
    setParameterValues({});
    resetImage();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductDto) => {
    revokeBlobUrl(imagePreview);
    setEditingProductId(product.id);
    setForm({
      storeId: String(product.storeId),
      name: product.name,
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
    });
    setFormError('');
    setParameterDefinitions([]);
    setParameterValues({});
    setImageFile(null);
    setImagePreview(getProductImageUrl(product.imageUrl) || '');
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openDetailsModal = (product: ProductDto) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    resetForm();
  };

  const closeDetailsModal = () => {
    setIsDetailsOpen(false);
    setSelectedProduct(null);
  };

  const handleImageChange = (file?: File | null) => {
    if (!file) {
      setImageFile(null);
      revokeBlobUrl(imagePreview);
      setImagePreview(editingProduct?.imageUrl ? getProductImageUrl(editingProduct.imageUrl) || '' : '');
      return;
    }

    revokeBlobUrl(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!isModalOpen || !form.storeId) {
      setParameterDefinitions([]);
      setParameterValues({});
      setParameterLoading(false);
      return;
    }

    let mounted = true;

    const loadDefinitions = async () => {
      setParameterLoading(true);
      try {
        const response = await productParameterService.getByStore(Number(form.storeId));
        if (!mounted) {
          return;
        }

        const definitions = response.data || [];
        const existingValues = new Map(
          (editingProduct?.storeId === Number(form.storeId) ? editingProduct?.parameterValues || [] : []).map((value) => [
            value.parameterDefinitionId,
            value.value || '',
          ]),
        );

        setParameterDefinitions(definitions);
        setParameterValues(
          definitions.reduce<Record<number, string>>((acc, definition) => {
            acc[definition.id] = existingValues.get(definition.id) || '';
            return acc;
          }, {}),
        );
      } catch (loadError) {
        console.error('Failed to load product parameter definitions:', loadError);
        if (mounted) {
          setParameterDefinitions([]);
          setParameterValues({});
          toast.error('Impossible de charger les parametres du store selectionne.');
        }
      } finally {
        if (mounted) {
          setParameterLoading(false);
        }
      }
    };

    void loadDefinitions();

    return () => {
      mounted = false;
    };
  }, [editingProduct, form.storeId, isModalOpen]);

  const submit = async () => {
    if (!bankId) {
      setFormError("Impossible d'identifier la banque courante.");
      return;
    }
    if (!form.storeId) {
      setFormError('Veuillez selectionner un store.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Le nom du produit est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const parameterPayload: ProductParameterValuePayload[] = parameterDefinitions.map((definition) => ({
        parameterDefinitionId: definition.id,
        value: parameterValues[definition.id] ?? '',
      }));

      const payload: ProductPayload = {
        bankId,
        storeId: Number(form.storeId),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price.trim() ? form.price.trim() : null,
        image: imageFile,
        parameterValues: parameterPayload,
      };

      if (editingProductId) {
        await productService.update(editingProductId, payload);
        toast.success('Produit mis a jour avec succes.');
      } else {
        await productService.create(payload);
        toast.success('Produit cree avec succes.');
      }

      await loadProducts();
      closeModal();
    } catch (submitError) {
      console.error('Failed to save product:', submitError);
      setFormError('Impossible de sauvegarder le produit.');
      toast.error('Impossible de sauvegarder le produit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStore = form.storeId ? storeMap[Number(form.storeId)] : null;
  const selectedDetailsStore = selectedProduct ? storeMap[selectedProduct.storeId] : null;
  const selectedDetailsImage = selectedProduct?.imageUrl ? getProductImageUrl(selectedProduct.imageUrl) : '';

  const productList = useMemo(() => {
    return availableProducts.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [availableProducts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Management</h1>
          <p className="text-muted-foreground">
            Creez des produits pour vos stores, associez leurs parametres et donnez leur une presentation plus claire avec une image dediee.
          </p>
        </div>

        <Button
          className="bg-orange-500 hover:bg-orange-600"
          icon={<Plus className="h-4 w-4" />}
          onClick={openCreateModal}
          disabled={isTenantLoading || !bankId}
        >
          Add Product
        </Button>
      </div>

      {(error || tenantError) && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || tenantError}
        </div>
      )}

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

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Liste des produits</CardTitle>
            <CardDescription>
              Filtrez les produits par store si vous souhaitez naviguer rapidement entre les catalogues.
            </CardDescription>
          </div>
          <div className="w-full lg:w-80">
            <Select
              label="Filtre par store"
              value={selectedStoreFilter}
              onChange={(event) => setSelectedStoreFilter(event.target.value)}
              options={[
                { value: 'all', label: 'Tous les stores' },
                ...stores.map((store) => ({
                  value: String(getStoreId(store)),
                  label: getStoreLabel(store),
                })),
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isTenantLoading || isLoadingProducts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des produits...
            </div>
          ) : productList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              Aucun produit n&apos;est encore disponible pour ce back office.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {productList.map((product) => {
                const store = storeMap[product.storeId];
                const isStoreActive = store ? store.enabled !== false && store.visible !== false : true;
                const productImage = getProductImageUrl(product.imageUrl);

                return (
                  <article
                    key={product.id}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 p-3">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.name}
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-500 text-white/80">
                          <ImageIcon className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.3em] text-white/65">Produit</div>
                            <h3 className="mt-2 truncate text-xl font-semibold text-white">{product.name}</h3>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-white/10 text-white">
                            {store?.name || product.storeName || `Store ${product.storeId}`}
                          </Badge>
                          <Badge variant={isStoreActive ? 'success' : 'warning'} className="backdrop-blur-sm">
                            {isStoreActive ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge variant="secondary" className="bg-white/10 text-white">
                            {formatTnd(product.price)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {product.description || 'Aucune description fournie pour ce produit.'}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Tags className="h-4 w-4 text-orange-500" />
                          Caractéristiques
                        </div>
                        {product.parameterValues?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {product.parameterValues.map((parameter) => (
                              <span
                                key={parameter.id}
                                className="inline-flex items-center rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-foreground"
                              >
                                <span className="font-semibold">
                                  {parameter.parameterName || `Parametre ${parameter.parameterDefinitionId}`}
                                </span>
                                <span className="mx-2 text-muted-foreground">:</span>
                                <span className="truncate">{parameter.value || '-'}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                            Aucun parametre configure pour ce produit.
                          </div>
                        )}
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          icon={<Eye className="h-4 w-4" />}
                          onClick={() => openDetailsModal(product)}
                        >
                          Details
                        </Button>
                        <Button
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => openEditModal(product)}
                        >
                          Modifier
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
        title={editingProductId ? 'Modifier le produit' : 'Add Product'}
        size="xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Creation d&apos;un produit bancaire
            </div>
            <p className="mt-1 text-orange-800">
              Commencez par choisir un store. Ses parametres configures apparaissent automatiquement afin de saisir les valeurs du produit.
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
                ...stores.map((store) => ({
                  value: String(getStoreId(store)),
                  label: getStoreLabel(store),
                })),
              ]}
            />

            <Input
              label="Nom du produit"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ex: Credit Auto Premium"
            />
          </div>

          <Input
            label="Prix"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="Ex: 2500"
          />

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-2">
              <label className="block text-sm text-foreground">Image du produit</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => handleImageChange(event.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Ajoutez une image pour rendre la fiche produit plus lisible. Si vous ne choisissez pas de nouvelle image lors de la modification, l&apos;image actuelle est conservee.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-semibold text-foreground">Apercu</div>
              <div className="mt-3 h-40 overflow-hidden rounded-2xl border border-border bg-slate-950">
                {imagePreview ? (
                  <img src={imagePreview} alt="Apercu du produit" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-foreground">Description</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description du produit..."
            />
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Parametres du store</div>
                <div className="text-xs text-muted-foreground">
                  {selectedStore
                    ? `Store selectionne: ${getStoreLabel(selectedStore)}`
                    : 'Choisissez un store pour afficher ses parametres.'}
                </div>
              </div>
              {parameterLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {!form.storeId ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                Selectionnez un store pour charger les parametres.
              </div>
            ) : parameterDefinitions.length === 0 && !parameterLoading ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                Aucun parametre defini pour ce store. Le produit peut etre enregistre sans valeur additionnelle.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {parameterDefinitions.map((definition) => (
                  <Input
                    key={definition.id}
                    label={definition.name}
                    value={parameterValues[definition.id] ?? ''}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [definition.id]: event.target.value,
                      }))
                    }
                    placeholder={`Valeur pour ${definition.name}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={submit}
              disabled={isSubmitting || parameterLoading}
              icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            >
              {isSubmitting ? 'Enregistrement...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailsOpen}
        onClose={closeDetailsModal}
        title={selectedProduct ? selectedProduct.name : 'Details du produit'}
        size="xl"
      >
        {selectedProduct && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-3xl border border-border bg-slate-100">
                {selectedDetailsImage ? (
                    <img
                      src={selectedDetailsImage}
                      alt={selectedProduct.name}
                      className="h-72 w-full object-contain bg-gradient-to-br from-slate-100 via-white to-slate-200 p-3"
                    />
                ) : (
                  <div className="flex h-72 w-full items-center justify-center text-white/70">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedProduct.bankName || 'Banque'}</Badge>
                    <Badge
                      variant={
                        selectedDetailsStore
                          ? selectedDetailsStore.enabled !== false && selectedDetailsStore.visible !== false
                            ? 'success'
                            : 'warning'
                          : 'secondary'
                      }
                    >
                      {selectedDetailsStore
                        ? selectedDetailsStore.enabled !== false && selectedDetailsStore.visible !== false
                          ? 'Actif'
                          : 'Inactif'
                        : 'Store'}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold">{selectedProduct.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedProduct.description || 'Aucune description fournie pour ce produit.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Store</div>
                    <div className="mt-2 font-semibold">
                      {selectedDetailsStore?.name || selectedProduct.storeName || 'Store'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 sm:col-span-2">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Prix</div>
                    <div className="mt-2 font-semibold">{formatTnd(selectedProduct.price)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Tags className="h-4 w-4 text-orange-500" />
                Valeurs des caracteristiques
              </div>
              {selectedProduct.parameterValues?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedProduct.parameterValues.map((parameter) => (
                    <div key={parameter.id} className="rounded-xl border border-border bg-white px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        {parameter.parameterName || `Parametre ${parameter.parameterDefinitionId}`}
                      </div>
                      <div className="mt-2 font-medium text-foreground">{parameter.value || '-'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucun parametre configure pour ce produit.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={closeDetailsModal}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
