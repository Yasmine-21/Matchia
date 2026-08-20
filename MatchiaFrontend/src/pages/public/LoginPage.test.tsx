import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { authService } from '../../services/authService';

const app = { login: vi.fn(), setCurrentBank: vi.fn() };
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../../services/authService', () => ({ authService: { login: vi.fn(), getRedirectUrl: vi.fn(() => '/dashboard') } }));
vi.mock('../../services/bankService', () => ({ bankService: { getBankById: vi.fn() } }));
vi.mock('../../api/apiClient', () => ({ default: { get: vi.fn() } }));
vi.mock('../../utils/tenant', () => ({ getBackendAssetUrl: vi.fn(() => null), getTenantSlugFromLocation: vi.fn(() => null) }));

describe('LoginPage', () => {
  beforeEach(() => { vi.mocked(authService.login).mockReset(); app.login.mockReset(); app.setCurrentBank.mockReset(); });
  const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

  it('toggles password visibility and reports invalid credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue(null);
    const user = userEvent.setup(); renderPage();
    const password = screen.getByPlaceholderText('Mot de passe');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /afficher le mot de passe/i }));
    expect(password).toHaveAttribute('type', 'text');
    await user.type(screen.getByPlaceholderText(/identifiant/i), 'user@matchia.tn');
    await user.type(password, 'secret123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(await screen.findByText(/identifiants invalides/i)).toBeInTheDocument();
  });

  it('stores a successful user in the application context', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValue({ id: 1, email: 'user@matchia.tn' } as never);
    renderPage();
    await user.type(screen.getByPlaceholderText(/identifiant/i), 'user@matchia.tn');
    await user.type(screen.getByPlaceholderText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(app.login).toHaveBeenCalledWith(expect.objectContaining({ email: 'user@matchia.tn' }));
    expect(app.setCurrentBank).toHaveBeenCalledWith(null);
  });
});
