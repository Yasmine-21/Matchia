import { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { dealerService, type PartnershipContract } from '../../services/dealerService';

type Side = 'bank' | 'dealer';
const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.detail || 'Impossible de charger le document.' : 'Impossible de charger le document.';

export function ContractPreviewModal({ contract, side, onClose }: { contract: PartnershipContract | null; side: Side; onClose: () => void }) {
  const [html, setHtml] = useState(''); const [loading, setLoading] = useState(false); const [downloading, setDownloading] = useState(false);
  useEffect(() => { if (!contract) { setHtml(''); return; } let active = true; setLoading(true); const call = side === 'bank' ? dealerService.bankContractPreview(contract.id) : dealerService.dealerContractPreview(contract.id); call.then(({ data }) => { if (active) setHtml(data.html); }).catch((error) => toast.error(errorMessage(error))).finally(() => active && setLoading(false)); return () => { active = false; }; }, [contract, side]);
  const download = async () => { if (!contract) return; setDownloading(true); try { const response = await (side === 'bank' ? dealerService.downloadBankContract(contract.id) : dealerService.downloadDealerContract(contract.id)); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `Partnership_Contract_${contract.contractNumber}.pdf`; link.click(); URL.revokeObjectURL(url); } catch (error) { toast.error(errorMessage(error)); } finally { setDownloading(false); } };
  return <Modal isOpen={Boolean(contract)} onClose={onClose} title={contract ? `Contrat ${contract.contractNumber} · V${contract.versionNumber}` : 'Contrat'} size="xl"><div className="space-y-4"><div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"><span className="flex items-center gap-2 text-primary"><FileText className="h-4 w-4" />Aperçu du document contractuel</span><Button size="sm" icon={<Download className="h-4 w-4" />} loading={downloading} onClick={() => void download()}>Télécharger PDF</Button></div>{loading ? <div className="flex min-h-96 items-center justify-center text-muted-foreground">Génération de l'aperçu…</div> : <iframe title="Aperçu du contrat" sandbox="" srcDoc={html} className="h-[70vh] w-full rounded-xl border border-border bg-white" />}</div></Modal>;
}
