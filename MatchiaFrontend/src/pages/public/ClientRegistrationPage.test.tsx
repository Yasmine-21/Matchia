import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRegistrationPage } from './ClientRegistrationPage';
import apiClient from '../../api/apiClient';
import { financingRequestService } from '../../services/financingRequestService';

const navigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../../api/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() }, resolveApiUrl: vi.fn(() => null) }));
vi.mock('../../services/financingRequestService', () => ({ financingRequestService: { register: vi.fn() } }));
vi.mock('../../utils/tenant', () => ({ getTenantSlugFromLocation: vi.fn(() => 'atlas') }));

describe('ClientRegistrationPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { bankName: 'Atlas', primaryColor: '#123456' } } as never);
    vi.mocked(financingRequestService.register).mockReset();
  });
  const renderPage = () => render(<MemoryRouter><ClientRegistrationPage /></MemoryRouter>);

  it('validates required data and password confirmation', async () => {
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter><ClientRegistrationPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));
    expect(await screen.findByText(/nom complet est obligatoire/i)).toBeInTheDocument();
    const passwords = container.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await user.type(passwords[0]!, 'secret123');
    await user.type(passwords[1]!, 'different');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));
    expect(await screen.findByText(/mots de passe ne correspondent pas/i)).toBeInTheDocument();
  });

  it('toggles passwords and registers a valid client on the marketplace', async () => {
    const user = userEvent.setup();
    vi.mocked(financingRequestService.register).mockResolvedValue({} as never);
    renderPage();
    await user.type(screen.getByLabelText('Nom complet'), 'Amina Test');
    await user.type(screen.getByLabelText('E-mail'), 'amina@example.com');
    await user.type(screen.getByLabelText(/téléphone/i), '12345678');
    await user.type(screen.getByLabelText(/date de naissance/i), '1990-01-01');
    await user.type(screen.getByLabelText('Adresse'), 'Tunis');
    const password = screen.getByLabelText('Mot de passe');
    await user.type(password, 'secret123');
    await user.type(screen.getByLabelText(/confirmation du mot de passe/i), 'secret123');
    await user.click(screen.getAllByRole('button', { name: /afficher le mot de passe/i })[0]!);
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /créer mon compte/i }));

    expect(financingRequestService.register).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Amina Test', bankSlug: 'atlas' }));
    expect(navigate).toHaveBeenCalledWith('/connexion', { replace: true, state: undefined });
  });
});
