import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { AlertCircle, CheckCircle, CreditCard, Lock, ShieldCheck, XCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

interface PaymentIntentResponse {
  clientSecret?: string;
  paymentId: number;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
}

interface PaymentConfigResponse {
  publishableKey?: string;
}

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

const stripeCardElementStyle = {
  base: {
    color: '#0f172a',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '16px',
    '::placeholder': {
      color: '#94a3b8',
    },
  },
  invalid: {
    color: '#dc2626',
  },
};

interface EmbeddedPaymentFormProps {
  amount: number;
  bankName: string;
  clientSecret: string;
  currency: string;
  paymentId: number;
  requestId: string;
}

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const formatAmount = (amount: number, currency: string) => {
  if (currency.toLowerCase() === 'tnd') {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(amount)} DT`;
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

function AcceptedCardBrands({ cardBrand }: { cardBrand: CardBrand }) {
  const visaActive = cardBrand === 'visa';
  const mastercardActive = cardBrand === 'mastercard';
  const amexActive = cardBrand === 'amex';
  const discoverActive = cardBrand === 'discover';

  const baseChip =
    'flex h-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 shadow-sm transition-colors';
  const activeChip = 'border-slate-300 bg-slate-50 ring-1 ring-slate-200';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`${baseChip} min-w-[36px] text-[10px] font-extrabold leading-none text-[#1a1f71] ${visaActive ? activeChip : ''}`}>
        VISA
      </span>
      <span className={`${baseChip} min-w-[36px] px-1.5 ${mastercardActive ? activeChip : ''}`}>
        <span className="flex items-center">
          <span className="h-4 w-4 rounded-full bg-[#eb001b]" />
          <span className="-ml-2 h-4 w-4 rounded-full bg-[#f79e1b]" />
        </span>
      </span>
      <span
        className={`${baseChip} min-w-[84px] text-[9px] font-bold leading-none text-[#016fd0] ${
          amexActive ? activeChip : ''
        }`}
      >
        AMERICAN EXPRESS
      </span>
      <span
        className={`${baseChip} min-w-[54px] text-[10px] font-bold leading-none text-[#ff6000] ${
          discoverActive ? activeChip : ''
        }`}
      >
        DISCOVER
      </span>
    </div>
  );
}

function EmbeddedPaymentForm({
  amount,
  bankName,
  clientSecret,
  currency,
  paymentId,
  requestId,
}: EmbeddedPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cardBrand, setCardBrand] = useState<CardBrand>('unknown');
  const [fieldErrors, setFieldErrors] = useState({
    cardNumber: '',
    expirationDate: '',
    cvc: '',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      setError('Stripe est encore en cours de chargement.');
      return;
    }

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setError('Le formulaire carte est indisponible.');
      return;
    }

    try {
      setIsPaying(true);
      setError('');
      setSuccessMessage('');

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: bankName,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || 'Le paiement a ete refuse. Verifiez votre carte.');
        return;
      }

      if (result.paymentIntent?.status !== 'succeeded') {
        setError('Le paiement est en attente de confirmation. Veuillez reessayer dans un instant.');
        return;
      }

      // Stripe is confirmed in the browser, then the backend verifies the PaymentIntent server-side.
      const confirmation = await apiClient.post<PaymentIntentResponse>(`/api/payments/${paymentId}/confirm`, {
        paymentIntentId: result.paymentIntent.id,
      });

      if (confirmation.data.status !== 'paid') {
        setError("Le paiement a ete transmis a Stripe, mais son statut n'est pas encore paye.");
        return;
      }

      setSuccessMessage('Payment completed successfully. Your request is now being activated.');
    } catch (paymentError) {
      console.error('Embedded Stripe payment failed:', paymentError);
      setError('Impossible de finaliser le paiement. Veuillez reessayer.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CreditCard className="h-4 w-4 text-orange-500" />
            Carte bancaire
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Lock className="h-3.5 w-3.5" />
            Securise
          </div>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-500">Card number</span>
            <div
              className={`flex min-h-[48px] items-center gap-3 rounded-md border bg-white px-3 py-2.5 transition-colors focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200 ${
                fieldErrors.cardNumber ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <CardNumberElement
                  options={{
                    disableLink: true,
                    showIcon: false,
                    placeholder: '4242 4242 4242 4242',
                    style: stripeCardElementStyle,
                  }}
                  onChange={(event) => {
                    setCardBrand(normalizeCardBrand(event.brand));
                    setFieldErrors((current) => ({
                      ...current,
                      cardNumber: event.error?.message || '',
                    }));
                  }}
                />
              </div>
              <div className="shrink-0">
                <AcceptedCardBrands cardBrand={cardBrand} />
              </div>
            </div>
            {fieldErrors.cardNumber && <p className="text-xs font-medium text-red-600">{fieldErrors.cardNumber}</p>}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Expiration Date (MM/YY)</span>
              <div
                className={`rounded-lg border bg-slate-50 px-4 py-3 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 ${
                  fieldErrors.expirationDate ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <CardExpiryElement
                  options={{
                    placeholder: 'MM/YY',
                    style: stripeCardElementStyle,
                  }}
                  onChange={(event) => {
                    setFieldErrors((current) => ({
                      ...current,
                      expirationDate: event.error?.message || '',
                    }));
                  }}
                />
              </div>
              {fieldErrors.expirationDate && (
                <p className="text-xs font-medium text-red-600">{fieldErrors.expirationDate}</p>
              )}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">CVC</span>
              <div
                className={`rounded-lg border bg-slate-50 px-4 py-3 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 ${
                  fieldErrors.cvc ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <CardCvcElement
                  options={{
                    placeholder: '123',
                    style: stripeCardElementStyle,
                  }}
                  onChange={(event) => {
                    setFieldErrors((current) => ({
                      ...current,
                      cvc: event.error?.message || '',
                    }));
                  }}
                />
              </div>
              {fieldErrors.cvc && <p className="text-xs font-medium text-red-600">{fieldErrors.cvc}</p>}
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Test: 4242 4242 4242 4242, date future, CVC 123.
        </p>
      </div>

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isPaying || Boolean(successMessage)}
        loading={isPaying}
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        {isPaying ? 'Paiement en cours...' : `Payer ${formatAmount(amount, currency)}`}
      </Button>

      <Link
        to={`/payment-cancel?request_id=${encodeURIComponent(requestId)}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <XCircle className="h-4 w-4" />
        Annuler
      </Link>
    </form>
  );
}

function normalizeCardBrand(brand: string): CardBrand {
  switch (brand) {
    case 'visa':
    case 'mastercard':
    case 'amex':
      return brand;
    default:
      return 'unknown';
  }
}

export function PaymentDemoPage() {
  const [searchParams] = useSearchParams();
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(
    stripePublishableKey ? loadStripe(stripePublishableKey) : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const hasCreatedIntent = useRef(false);

  const bankName = searchParams.get('bank') || 'Marketplace Matchia';
  const currency = (searchParams.get('currency') || 'tnd').toLowerCase();
  const planName = searchParams.get('plan') || 'Abonnement Matchia';
  const amount = useMemo(() => {
    const parsed = Number(searchParams.get('amount') || '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }, [searchParams]);

  useEffect(() => {
    const createIntent = async () => {
      if (hasCreatedIntent.current) return;
      hasCreatedIntent.current = true;
      if (!amount || amount <= 0) {
        setError('Montant invalide.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        let publishableKey = stripePublishableKey;
        if (!publishableKey) {
          const configResponse = await apiClient.get<PaymentConfigResponse>('/api/payments/config');
          publishableKey = configResponse.data.publishableKey;
        }

        if (!publishableKey) {
          throw new Error('Stripe publishable key is missing.');
        }

        setStripePromise(loadStripe(publishableKey));

        const response = await apiClient.post<PaymentIntentResponse>('/api/payments/create-payment-intent', {
          requestId: Number(searchParams.get('request_id') || '27'),
          bankName,
          amount,
          currency,
        });

        if (!response.data?.clientSecret || !response.data.paymentId || !response.data.paymentIntentId) {
          throw new Error('Stripe did not return a valid PaymentIntent.');
        }

        setPaymentIntent(response.data);
      } catch (intentError) {
        console.error('PaymentIntent creation failed:', intentError);
        setError("Impossible de preparer le paiement Stripe. Verifiez stripe.public.key, stripe.secret.key, la devise et le backend.");
      } finally {
        setIsLoading(false);
      }
    };

    createIntent();
  }, [amount, bankName, currency, searchParams]);

  const displayedAmount = paymentIntent?.amount ?? amount;
  const displayedCurrency = 'tnd';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <CreditCard className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-950">Paiement Matchia - TND</CardTitle>
            <p className="text-sm text-slate-500">Paiement integre et securise par Stripe, affiche en dinar tunisien.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Plan</span>
                <span className="text-right font-semibold text-slate-950">{planName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Banque</span>
                <span className="text-right font-semibold text-slate-950">{bankName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                <span className="text-sm text-slate-500">Total a payer</span>
                <span className="text-2xl font-bold text-orange-600">
                  {formatAmount(displayedAmount, displayedCurrency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-950">Coordonnees de paiement</CardTitle>
            <p className="text-sm text-slate-500">Saisissez les informations de carte dans le formulaire securise Stripe.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                Preparation du paiement...
              </div>
            ) : error ? (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : stripePromise && paymentIntent?.clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.clientSecret }}>
                <EmbeddedPaymentForm
                  amount={paymentIntent.amount}
                  bankName={bankName}
                  clientSecret={paymentIntent.clientSecret}
                  currency={displayedCurrency}
                  paymentId={paymentIntent.paymentId}
                  requestId={searchParams.get('request_id') || '27'}
                />
              </Elements>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
