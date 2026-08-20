import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, expect, it, beforeEach } from 'vitest';
import apiClient from '../../api/apiClient';
import { PaymentResultPage } from './PaymentResultPage';

vi.mock('../../api/apiClient', () => ({ default: { post: vi.fn() } }));

describe('PaymentResultPage', () => {
  beforeEach(() => vi.mocked(apiClient.post).mockReset());

  it('shows cancelled payment without calling the confirmation endpoint', () => {
    render(<MemoryRouter initialEntries={['/payment-cancel?request_id=42']}><PaymentResultPage status="cancel" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /paiement annule/i })).toBeInTheDocument();
    expect(screen.getByText('Demande #42')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('confirms a successful checkout session', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { status: 'paid' } });
    render(<MemoryRouter initialEntries={['/payment-success?request_id=42&session_id=cs_test']}><PaymentResultPage status="success" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /verification du paiement/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: /paiement confirme/i })).toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledWith('/api/payments/checkout-session/cs_test/confirm');
  });
});
