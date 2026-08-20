import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi, describe, expect, it, beforeEach } from 'vitest';
import { authService } from '../../services/authService';
import { ForgotPasswordPage } from './ForgotPasswordPage';

vi.mock('../../services/authService', () => ({ authService: { forgotPassword: vi.fn() } }));

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.mocked(authService.forgotPassword).mockReset());

  it('requires an email before the form can be submitted', () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/adresse e-mail/i)).toBeRequired();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('submits the email and shows the success state', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await user.type(screen.getByPlaceholderText(/adresse e-mail/i), 'user@matchia.tn');
    await user.click(screen.getByRole('button', { name: /initialiser/i }));
    expect(await screen.findByText(/e-mail de r.initialisation/i)).toBeInTheDocument();
    expect(authService.forgotPassword).toHaveBeenCalledWith('user@matchia.tn');
  });
});
