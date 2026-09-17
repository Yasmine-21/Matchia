import { useEffect, useRef, useState } from 'react';
import { FileImage, ImagePlus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { resolveApiUrl } from '../../api/apiClient';
import { BANNER_RECOMMENDED_DIMENSIONS } from '../../config/banner';
import { bankTenantService } from '../../services/bankTenantService';
import type { MarketplaceStoreBannerImageDto } from '../../types/apiTypes';

type Props = { marketplaceStoreId: number; storeName?: string | null; disabled?: boolean; onSaved?: () => void };

export function StoreBannerManager({ marketplaceStoreId, storeName, disabled = false, onSaved }: Props) {
  const [images, setImages] = useState<MarketplaceStoreBannerImageDto[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const response = await bankTenantService.getStoreBanners(marketplaceStoreId);
    setImages(response.bannerImages || []);
  };

  useEffect(() => {
    setSlot(null); setFile(null); setPreview('');
    void load().catch(() => setImages([]));
  }, [marketplaceStoreId]);

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const choose = (targetSlot: number, selected?: File) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image.'); return; }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setSlot(targetSlot); setFile(selected); setPreview(URL.createObjectURL(selected));
  };

  const save = async () => {
    if (!file || slot === null) return;
    setSaving(true);
    try {
      const existing = images[slot];
      const response = existing?.id
        ? await bankTenantService.replaceStoreBannerImage(marketplaceStoreId, existing.id, file)
        : existing
          ? await bankTenantService.uploadStoreBanner(marketplaceStoreId, file).then(() => bankTenantService.getStoreBanners(marketplaceStoreId))
          : await bankTenantService.addStoreBanner(marketplaceStoreId, file);
      setImages(response.bannerImages || []); setSlot(null); setFile(null); setPreview(''); onSaved?.();
      toast.success('Bannière enregistrée.');
    } catch { toast.error('Impossible d’enregistrer la bannière.'); }
    finally { setSaving(false); }
  };

  const remove = async (targetSlot: number) => {
    const image = images[targetSlot]; if (!image) return;
    setSaving(true);
    try {
      if (image.id) await bankTenantService.deleteStoreBannerImage(marketplaceStoreId, image.id);
      else await bankTenantService.deleteLegacyStoreBanner(marketplaceStoreId);
      await load(); onSaved?.(); toast.success('Bannière supprimée.');
    } catch { toast.error('Impossible de supprimer la bannière.'); }
    finally { setSaving(false); }
  };

  return (
    <section className="mt-4 w-full min-w-0 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex flex-col gap-3 border-b border-primary/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileImage className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-foreground">Bannières du store {storeName || ''}</h4>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Ajoutez jusqu’à trois images. Elles défileront automatiquement sur la marketplace.
            </p>
          </div>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {images.length}/3 image{images.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            if (slot !== null) choose(slot, event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />

        <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const image = images[index];
            const isPending = slot === index && Boolean(preview);
            const source = isPending ? preview : resolveApiUrl(image?.imageUrl);

            return (
              <article
                key={index}
                className={`min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm transition-colors ${
                  isPending ? 'border-primary ring-2 ring-primary/15' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                  <span className="text-sm font-semibold text-foreground">Image {index + 1}</span>
                  <span className={`text-xs ${isPending ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                    {isPending ? 'Aperçu sélectionné' : image ? `Position ${index + 1}` : 'Emplacement libre'}
                  </span>
                </div>

                <div className="relative flex aspect-[16/7] min-h-32 w-full items-center justify-center overflow-hidden bg-muted/60">
                  {source ? (
                    <img
                      src={source}
                      alt={`Bannière ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                      <ImagePlus className="h-7 w-7" />
                      <span>Aucune image</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border p-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-0 flex-1"
                    disabled={disabled || (!image && images.length >= 3)}
                    icon={<Upload className="h-4 w-4 shrink-0" />}
                    onClick={() => {
                      setSlot(index);
                      inputRef.current?.click();
                    }}
                  >
                    {image ? 'Remplacer' : 'Ajouter'}
                  </Button>
                  {image && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={disabled || saving}
                      onClick={() => void remove(index)}
                      aria-label={`Supprimer l’image ${index + 1}`}
                      title={`Supprimer l’image ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground" title={file?.name}>
              {file?.name || 'Aucune nouvelle image sélectionnée'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, WEBP ou GIF · dimensions recommandées : {BANNER_RECOMMENDED_DIMENSIONS}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 sm:min-w-56"
            loading={saving}
            disabled={disabled || !file || slot === null}
            onClick={() => void save()}
          >
            Enregistrer l’image
          </Button>
        </div>
      </div>
    </section>
  );
}
