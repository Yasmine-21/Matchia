import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PaymentDemoPage } from './PaymentDemoPage';
import apiClient from '../../api/apiClient';

vi.mock('../../api/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('PaymentDemoPage', () => {
  it('shows order information and rejects an invalid amount before calling the backend', async () => {
    render(<MemoryRouter initialEntries={['/payment-demo?bank=Atlas&plan=Premium&amount=0&currency=tnd']}><PaymentDemoPage /></MemoryRouter>);

    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Atlas')).toBeInTheDocument();
    expect(await screen.findByText(/montant invalide/i)).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
