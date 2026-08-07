import { FormEvent, useEffect, useState } from 'react';
import { Building2, FileCheck2, Upload, UsersRound } from 'lucide-react';
import axios from 'axios';
import { dealerService } from '../../services/dealerService';
import { storeService } from '../../services/storeService';
import type { StoreDto } from '../../types/apiTypes';

const fieldClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export function DealerRegistrationPage() {
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { storeService.getStoresByStatus('active').then(({ data }) => setStores(data)); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    if (!logo || documents.length === 0) { setError('Le logo et au moins un document justificatif sont obligatoires.'); return; }
    setLoading(true);
    try {
      await dealerService.register({
        companyName: form.get('companyName'), registrationNumber: form.get('registrationNumber'),
        address: form.get('address'), contactPerson: form.get('contactPerson'), email: form.get('email'),
        phone: form.get('phone'), storeId: Number(form.get('storeId')),
      }, logo, documents);
      setSuccess(true);
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(message || 'Impossible d\'envoyer la demande. Verifiez les informations saisies.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <main className="min-h-screen bg-slate-50 px-4 py-20">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-emerald-200 bg-white p-10 text-center shadow-xl">
        <FileCheck2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Demande envoyee</h1>
        <p className="mt-3 text-slate-600">Votre demande concessionnaire est en attente de validation par l'equipe Matchia.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),radial-gradient(circle_at_bottom_right,#ffedd5,transparent_30%),#f8fafc] px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center"><span className="text-sm font-bold uppercase tracking-[.25em] text-orange-500">Ecosysteme partenaires</span><h1 className="mt-3 text-4xl font-bold text-slate-950">Devenir concessionnaire Matchia</h1><p className="mt-3 text-slate-600">Proposez vos produits aux marketplaces bancaires partenaires.</p></div>
        <form onSubmit={submit} className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl lg:grid-cols-[.34fr_.66fr]">
          <aside className="bg-slate-950 p-8 text-white">
            <UsersRound className="h-12 w-12 text-orange-400" />
            <h2 className="mt-6 text-2xl font-bold">Votre espace professionnel</h2>
            <p className="mt-4 leading-7 text-slate-300">Une demande unique vous donne acces aux partenariats multi-banques, a votre catalogue et au suivi des publications.</p>
            <div className="mt-10 space-y-4 text-sm text-slate-300"><p>1. Validation du dossier par Matchia</p><p>2. Creation securisee du compte</p><p>3. Demandes de partenariat aux banques</p><p>4. Publication apres accord bancaire</p></div>
          </aside>
          <section className="p-7 sm:p-10">
            {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Raison sociale *<input name="companyName" required className={fieldClass} /></label>
              <label className="text-sm font-semibold text-slate-700">Numero d'immatriculation *<input name="registrationNumber" required className={fieldClass} /></label>
              <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Adresse *<input name="address" required className={fieldClass} /></label>
              <label className="text-sm font-semibold text-slate-700">Personne de contact *<input name="contactPerson" required className={fieldClass} /></label>
              <label className="text-sm font-semibold text-slate-700">Telephone *<input name="phone" required className={fieldClass} /></label>
              <label className="text-sm font-semibold text-slate-700">E-mail *<input name="email" type="email" required className={fieldClass} /></label>
              <label className="text-sm font-semibold text-slate-700">Categorie / store *<select name="storeId" required className={fieldClass}><option value="">Selectionner</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Logo *<span className={`${fieldClass} flex cursor-pointer items-center gap-3`}><Building2 className="h-5 w-5 text-blue-600" />{logo?.name || 'Choisir le logo'}<input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></span></label>
              <label className="text-sm font-semibold text-slate-700">Documents justificatifs *<span className={`${fieldClass} flex cursor-pointer items-center gap-3`}><Upload className="h-5 w-5 text-orange-500" />{documents.length ? `${documents.length} fichier(s)` : 'Ajouter les documents'}<input type="file" multiple className="hidden" onChange={(e) => setDocuments(Array.from(e.target.files || []))} /></span></label>
            </div>
            <button disabled={loading} className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 px-5 py-3.5 font-bold text-white shadow-lg disabled:opacity-60">{loading ? 'Envoi en cours...' : 'Envoyer la demande'}</button>
          </section>
        </form>
      </div>
    </main>
  );
}
