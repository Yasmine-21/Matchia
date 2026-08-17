import { type FormEvent, useState } from 'react';
import axios from 'axios';
import { FileSignature, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { dealerService, type PartnershipContract, type PartnershipContractPayload } from '../../services/dealerService';

const today = () => new Date().toISOString().slice(0, 10);
const nextYear = () => { const date = new Date(); date.setFullYear(date.getFullYear() + 1); return date.toISOString().slice(0, 10); };
const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.detail || error.response?.data?.message || 'Impossible de traiter le contrat.'
  : 'Impossible de traiter le contrat.';
const labels: Record<PartnershipContract['status'], string> = {
  DRAFT: 'Brouillon', PENDING_ACCEPTANCE: "En attente d'acceptation", ACTIVE: 'Actif',
  EXPIRED: 'Expire', TERMINATED: 'Resilie', CANCELLED: 'Refuse',
};
const badge = (status: PartnershipContract['status']) => status === 'ACTIVE' ? 'success'
  : status === 'DRAFT' || status === 'PENDING_ACCEPTANCE' ? 'warning'
    : status === 'CANCELLED' ? 'danger' : 'secondary';

export function BankContractsPanel({ contracts, onChanged }: { contracts: PartnershipContract[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<PartnershipContract | null>(null);
  const [terminating, setTerminating] = useState<PartnershipContract | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [busy, setBusy] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    const commissionApplicable = data.get('commissionApplicable') === 'on';
    const payload: PartnershipContractPayload = {
      startDate: String(data.get('startDate')),
      endDate: String(data.get('endDate')),
      commissionApplicable,
      commissionType: commissionApplicable ? String(data.get('commissionType')) as PartnershipContractPayload['commissionType'] : undefined,
      commissionValue: commissionApplicable ? Number(data.get('commissionValue')) : undefined,
      contractTerms: String(data.get('contractTerms') || ''),
      terminationConditions: String(data.get('terminationConditions') || ''),
    };
    setBusy('save');
    try {
      await dealerService.saveContract(editing.partnershipId, payload);
      toast.success('Contrat enregistre.'); setEditing(null); await onChanged();
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  const action = async (key: string, callback: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try { await callback(); toast.success(message); await onChanged(); }
    catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  if (!contracts.length) return <Card className="p-10 text-center text-muted-foreground">Aucun contrat de partenariat disponible.</Card>;
  return <>
    <div className="grid gap-5 xl:grid-cols-2">
      {contracts.map((contract) => (
        <Card key={contract.id} className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-xs font-semibold uppercase tracking-widest text-primary">{contract.contractNumber}</div>
              <h3 className="mt-2 text-xl font-semibold">{contract.dealerName}</h3><p className="text-sm text-muted-foreground">{contract.storeName}</p></div>
            <Badge variant={badge(contract.status)}>{labels[contract.status]}</Badge>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Info label="Modele" value="Gratuit - 0 TND" />
            <Info label="Commission" value={contract.commissionApplicable ? `${contract.commissionValue} ${contract.commissionType === 'PERCENTAGE' ? '%' : 'TND'}` : 'Aucune'} />
            <Info label="Debut" value={contract.startDate || '-'} />
            <Info label="Fin" value={contract.endDate || '-'} />
          </div>
          {contract.dealerAcceptedAt && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Accepte par le concessionnaire. Validation finale requise.</div>}
          {contract.rejectionReason && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Motif : {contract.rejectionReason}</div>}
          <div className="mt-auto flex flex-wrap gap-3 pt-5">
            {contract.status === 'DRAFT' && <Button variant="outline" icon={<FileSignature className="h-4 w-4" />} onClick={() => setEditing(contract)}>Configurer</Button>}
            {contract.status === 'DRAFT' && <Button icon={<Send className="h-4 w-4" />} loading={busy === `send-${contract.id}`} onClick={() => void action(`send-${contract.id}`, () => dealerService.sendContract(contract.id), 'Contrat envoye au concessionnaire.')}>Envoyer</Button>}
            {contract.status === 'PENDING_ACCEPTANCE' && contract.dealerAcceptedAt && <Button icon={<ShieldCheck className="h-4 w-4" />} loading={busy === `activate-${contract.id}`} onClick={() => void action(`activate-${contract.id}`, () => dealerService.activateContract(contract.id), 'Partenariat active.')}>Valider et activer</Button>}
            {contract.status === 'ACTIVE' && <Button variant="danger" onClick={() => { setTerminating(contract); setTerminationReason(''); }}>Resilier</Button>}
          </div>
        </Card>
      ))}
    </div>
    <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Configurer le contrat gratuit" size="lg">
      {editing && <ContractForm contract={editing} busy={busy === 'save'} onSubmit={save} onCancel={() => setEditing(null)} />}
    </Modal>
    <Modal isOpen={Boolean(terminating)} onClose={() => setTerminating(null)} title="Resilier le contrat" size="sm">
      <div className="space-y-4"><textarea value={terminationReason} onChange={(event) => setTerminationReason(event.target.value)} rows={4} placeholder="Motif de resiliation" className="w-full rounded-xl border border-input p-3" /><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setTerminating(null)}>Annuler</Button><Button variant="danger" loading={busy === 'terminate'} onClick={() => { if (!terminating || !terminationReason.trim()) return toast.error('Le motif est obligatoire.'); void action('terminate', () => dealerService.terminateContract(terminating.id, terminationReason.trim()), 'Contrat resilie.').then(() => setTerminating(null)); }}>Confirmer</Button></div></div>
    </Modal>
  </>;
}

function ContractForm({ contract, busy, onSubmit, onCancel }: { contract: PartnershipContract; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [commission, setCommission] = useState(contract.commissionApplicable);
  return <form onSubmit={onSubmit} className="space-y-5">
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><strong>Partenariat gratuit :</strong> aucun paiement, abonnement ou frais d'activation.</div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Date de debut"><input required type="date" name="startDate" defaultValue={contract.startDate || today()} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" /></Field><Field label="Date de fin"><input required type="date" name="endDate" defaultValue={contract.endDate || nextYear()} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" /></Field></div>
    <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-medium"><input type="checkbox" name="commissionApplicable" checked={commission} onChange={(event) => setCommission(event.target.checked)} /> Commission commerciale informative</label>
    {commission && <div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><select required name="commissionType" defaultValue={contract.commissionType || 'PERCENTAGE'} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring"><option value="PERCENTAGE">Pourcentage</option><option value="FIXED_AMOUNT">Montant fixe</option></select></Field><Field label="Valeur"><input required min="0" step="0.01" type="number" name="commissionValue" defaultValue={contract.commissionValue ?? ''} className="h-11 w-full rounded-lg border border-input bg-input-background px-3 outline-none focus:ring-2 focus:ring-ring" /></Field></div>}
    <Field label="Conditions du contrat"><textarea name="contractTerms" rows={5} defaultValue={contract.contractTerms} className="w-full rounded-lg border border-input bg-input-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></Field>
    <Field label="Conditions de resiliation"><textarea name="terminationConditions" rows={3} defaultValue={contract.terminationConditions} className="w-full rounded-lg border border-input bg-input-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></Field>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer</Button></div>
  </form>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-medium">{label}{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/40 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>; }
