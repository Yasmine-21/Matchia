import { useEffect, useRef, useState } from 'react';
import { FileImage, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { resolveApiUrl } from '../../api/apiClient';
import { BANNER_FRAME_CLASS, BANNER_IMAGE_CLASS, BANNER_RECOMMENDED_DIMENSIONS } from '../../config/banner';
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

  return <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileImage className="h-5 w-5" /></span><div><div className="font-semibold">Gestion des bannières</div><p className="text-sm text-muted-foreground">Jusqu’à trois images pour le store {storeName || ''}. Elles défilent automatiquement sur la marketplace.</p></div></div>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => { if (slot !== null) choose(slot, event.target.files?.[0]); event.currentTarget.value = ''; }} />
    <div className="grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((index) => { const image = images[index]; const source = slot === index && preview ? preview : resolveApiUrl(image?.imageUrl); return <div key={index} className="rounded-xl border border-border bg-background p-3"><div className="mb-2 flex justify-between text-sm font-semibold"><span>Image {index + 1}</span>{image && <span className="text-xs font-normal text-muted-foreground">Position {index + 1}</span>}</div><div className={`${BANNER_FRAME_CLASS} rounded-lg border border-border bg-muted`}>{source ? <img src={source} alt={`Bannière ${index + 1}`} className={BANNER_IMAGE_CLASS} /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Aucune image</span>}</div><div className="mt-3 flex gap-2"><Button type="button" size="sm" variant="outline" className="flex-1" disabled={disabled || (!image && images.length >= 3)} icon={<Upload className="h-4 w-4" />} onClick={() => { setSlot(index); inputRef.current?.click(); }}>{image ? 'Remplacer' : 'Ajouter'}</Button>{image && <Button type="button" size="sm" variant="outline" disabled={disabled || saving} onClick={() => void remove(index)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>}</div></div>; })}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" loading={saving} disabled={disabled || !file || slot === null} onClick={() => void save()}>Enregistrer l’image sélectionnée</Button><span className="text-xs text-muted-foreground">{file?.name || `PNG, JPG, WEBP ou GIF · recommandé : ${BANNER_RECOMMENDED_DIMENSIONS}`}</span></div>
  </div>;
}
