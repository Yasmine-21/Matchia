import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi, describe, expect, it, beforeEach } from 'vitest';
import { authService } from '../../services/authService';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../../services/authService', () => ({ authService: { resetPassword: vi.fn() } }));

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.mocked(authService.resetPassword).mockReset());

  it('disables reset without the URL token', () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /initialiser/i })).toBeDisabled();
  });

  it('reports mismatched passwords before requesting the API', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/reset?token=secure-token']}><ResetPasswordPage /></MemoryRouter>);
    await user.type(screen.getByPlaceholderText('Nouveau mot de passe'), 'password1');
    await user.type(screen.getByPlaceholderText('Confirmer le mot de passe'), 'password2');
    await user.click(screen.getByRole('button', { name: /initialiser/i }));
    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password with the token and displays success', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/reset?token=secure-token']}><ResetPasswordPage /></MemoryRouter>);
    await user.type(screen.getByPlaceholderText('Nouveau mot de passe'), 'password1');
    await user.type(screen.getByPlaceholderText('Confirmer le mot de passe'), 'password1');
    await user.click(screen.getByRole('button', { name: /initialiser/i }));
    expect(await screen.findByText(/r.initialis.*succ/i)).toBeInTheDocument();
    expect(authService.resetPassword).toHaveBeenCalledWith('secure-token', 'password1', 'password1');
  });
});
