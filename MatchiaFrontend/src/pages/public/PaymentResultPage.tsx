import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle } from 'lucide-react';

interface PaymentResultPageProps {
  status: 'success' | 'cancel';
}

export function PaymentResultPage({ status }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');
  const isSuccess = status === 'success';
  const Icon = isSuccess ? CheckCircle : XCircle;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          {isSuccess ? 'Payment completed successfully' : 'Payment cancelled'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isSuccess
            ? 'Payment completed successfully. Your request is now being activated.'
            : 'Payment cancelled. You can try again.'}
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
