import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';

interface PaymentResultPageProps {
  status: 'success' | 'cancel';
}

export function PaymentResultPage({ status }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');
  const sessionId = searchParams.get('session_id');
  const isSuccess = status === 'success';
  const [confirmationState, setConfirmationState] = useState<'idle' | 'loading' | 'confirmed' | 'failed'>(
    isSuccess && sessionId ? 'loading' : isSuccess ? 'confirmed' : 'idle',
  );
  const paymentConfirmed = isSuccess && confirmationState === 'confirmed';
  const Icon = paymentConfirmed ? CheckCircle : XCircle;

  useEffect(() => {
    if (!isSuccess || !sessionId) return;

    let active = true;
    apiClient.post(`/api/payments/checkout-session/${encodeURIComponent(sessionId)}/confirm`)
      .then((response) => {
        if (!active) return;
        setConfirmationState(response.data?.status?.toLowerCase() === 'paid' ? 'confirmed' : 'failed');
      })
      .catch((error) => {
        console.error('Stripe checkout confirmation failed:', error);
        if (active) setConfirmationState('failed');
      });

    return () => {
      active = false;
    };
  }, [isSuccess, sessionId]);

  const isVerifying = isSuccess && confirmationState === 'loading';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paymentConfirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          {isVerifying
            ? 'Verification du paiement'
            : paymentConfirmed
              ? 'Paiement confirme avec succes'
              : isSuccess
                ? 'Paiement non confirme'
                : 'Paiement annule'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isVerifying
            ? 'Nous verifions la transaction directement aupres de Stripe.'
            : paymentConfirmed
              ? 'Votre paiement est confirme. Votre demande est maintenant en cours d activation.'
              : isSuccess
                ? 'Stripe n a pas confirme ce paiement. Veuillez reessayer ou contacter le support.'
                : 'Le paiement a ete annule. Vous pouvez reessayer.'}
        </p>
        {requestId && (
          <p className="mt-2 text-xs text-slate-500">Demande #{requestId}</p>
        )}
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Retour a l'accueil
        </Link>
      </div>
    </main>
  );
}
