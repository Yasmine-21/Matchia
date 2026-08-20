import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DealersPage } from './DealersPage';
import { publicDealerService } from '../../services/publicDealerService';

vi.mock('../../services/publicDealerService', () => ({ publicDealerService: { getActiveDealers: vi.fn() } }));
vi.mock('../../api/apiClient', () => ({ default: { defaults: { baseURL: 'http://api.test' } } }));

describe('DealersPage', () => {
  beforeEach(() => vi.mocked(publicDealerService.getActiveDealers).mockReset());
  const renderPage = () => render(<MemoryRouter><DealersPage /></MemoryRouter>);

  it('renders active dealers and filters on store details', async () => {
    vi.mocked(publicDealerService.getActiveDealers).mockResolvedValue([
      { companyName: 'Auto Plus', storeName: 'Tunis Cars', storeDescription: 'Véhicules neufs', email: 'hello@auto.tn', phone: '123', address: 'Tunis', website: 'https://auto.tn' },
    ] as never);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Auto Plus')).toBeInTheDocument();
    expect(screen.getByText('hello@auto.tn')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/rechercher un concessionnaire/i), 'unknown');
    expect(screen.getByText(/aucun concessionnaire trouvé/i)).toBeInTheDocument();
  });
});
