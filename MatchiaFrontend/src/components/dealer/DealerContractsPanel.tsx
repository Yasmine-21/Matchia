import { useState } from 'react';
import axios from 'axios';
import { CheckCircle2, FileSignature, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { dealerService, type PartnershipContract } from '../../services/dealerService';

const labels: Record<PartnershipContract['status'], string> = { DRAFT: 'Brouillon', PENDING_ACCEPTANCE: "A valider", ACTIVE: 'Actif', EXPIRED: 'Expire', TERMINATED: 'Resilie', CANCELLED: 'Refuse' };
const formatCommission = (contract: PartnershipContract) => contract.commissionApplicable ? `${contract.commissionValue} ${contract.commissionType === 'PERCENTAGE' ? '%' : 'TND'}` : 'Aucune';
const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.detail || error.response?.data?.message || 'Action impossible.' : 'Action impossible.';

export function DealerContractsPanel({ contracts, onChanged }: { contracts: PartnershipContract[]; onChanged: () => Promise<void> }) {
  const [selected, setSelected] = useState<PartnershipContract | null>(null);
  const [rejecting, setRejecting] = useState<PartnershipContract | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const accept = async (contract: PartnershipContract) => { setBusy(`accept-${contract.id}`); try { await dealerService.acceptContract(contract.id); toast.success('Contrat accepte. La validation finale de la banque est attendue.'); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); } };
  const reject = async () => { if (!rejecting || !reason.trim()) return toast.error('Le motif est obligatoire.'); setBusy('reject'); try { await dealerService.rejectContract(rejecting.id, reason.trim()); toast.success('Contrat refuse.'); setRejecting(null); setReason(''); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); } };
  if (!contracts.length) return <Card className="p-10 text-center text-muted-foreground">Aucun contrat disponible.</Card>;
  return <>
    <div className="grid gap-5 xl:grid-cols-2">{contracts.map((contract) => <Card key={contract.id} className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-widest text-primary">{contract.contractNumber}</div><h3 className="mt-2 text-xl font-semibold">{contract.bankName}</h3><p className="text-sm text-muted-foreground">{contract.storeName}</p></div><Badge variant={contract.status === 'ACTIVE' ? 'success' : contract.status === 'CANCELLED' ? 'danger' : 'warning'}>{labels[contract.status]}</Badge></div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Info label="Partenariat" value="Gratuit - 0 TND" /><Info label="Commission" value={formatCommission(contract)} /><Info label="Debut" value={contract.startDate} /><Info label="Fin" value={contract.endDate} /></div>
      <div className="mt-auto flex gap-3 pt-5"><Button variant="outline" icon={<FileSignature className="h-4 w-4" />} onClick={() => setSelected(contract)}>Consulter</Button>{contract.status === 'PENDING_ACCEPTANCE' && !contract.dealerAcceptedAt && <><Button icon={<CheckCircle2 className="h-4 w-4" />} loading={busy === `accept-${contract.id}`} onClick={() => void accept(contract)}>Accepter</Button><Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setRejecting(contract)}>Refuser</Button></>}</div>
    </Card>)}</div>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Details du contrat" size="lg">{selected && <div className="space-y-5"><Info label="Conditions" value={selected.contractTerms} /><Info label="Resiliation" value={selected.terminationConditions} /><Info label="Commission" value={formatCommission(selected)} /></div>}</Modal>
    <Modal isOpen={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Refuser le contrat" size="sm"><div className="space-y-4"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Motif du refus" className="w-full rounded-xl border border-input p-3" /><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setRejecting(null)}>Annuler</Button><Button variant="danger" loading={busy === 'reject'} onClick={() => void reject()}>Confirmer</Button></div></div></Modal>
  </>;
}
function Info({ label, value }: { label: string; value?: string }) { return <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 whitespace-pre-line font-medium leading-6">{value || '-'}</div></div>; }
