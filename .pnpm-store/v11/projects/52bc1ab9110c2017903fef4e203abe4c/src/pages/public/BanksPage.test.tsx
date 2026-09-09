import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BanksPage } from './BanksPage';
import { bankService } from '../../services/bankService';

vi.mock('../../services/bankService', () => ({ bankService: { getAllBanks: vi.fn() } }));
vi.mock('../../api/apiClient', () => ({ default: { defaults: { baseURL: 'http://api.test' } } }));

describe('BanksPage', () => {
  beforeEach(() => vi.mocked(bankService.getAllBanks).mockReset());
  const renderPage = () => render(<MemoryRouter><BanksPage /></MemoryRouter>);

  it('renders only active banks and filters them by text', async () => {
    vi.mocked(bankService.getAllBanks).mockResolvedValue([
      { id: 1, name: 'Atlas Bank', description: 'Financement auto', country: 'Tunisie', establishedYear: 1980, slug: 'atlas', status: 'active' },
      { id: 2, name: 'Hidden Bank', description: 'Inactive', country: 'Tunisie', establishedYear: 1990, slug: 'hidden', status: 'inactive' },
    ] as never);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Atlas Bank')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Bank')).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/rechercher une banque/i), 'unknown');
    expect(screen.getByText(/aucune banque trouvée/i)).toBeInTheDocument();
  });

  it('switches to list presentation and reports empty service results', async () => {
    vi.mocked(bankService.getAllBanks).mockResolvedValue([] as never);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/aucune banque trouvée/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button')[1]);
  });
});
