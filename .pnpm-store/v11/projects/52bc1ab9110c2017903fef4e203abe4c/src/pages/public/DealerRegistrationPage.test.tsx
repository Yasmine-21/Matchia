import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DealerRegistrationPage } from './DealerRegistrationPage';
import { dealerService } from '../../services/dealerService';
import { storeService } from '../../services/storeService';

vi.mock('../../services/dealerService', () => ({ dealerService: { register: vi.fn() } }));
vi.mock('../../services/storeService', () => ({ storeService: { getStoresByStatus: vi.fn() } }));

describe('DealerRegistrationPage', () => {
  beforeEach(() => {
    vi.mocked(storeService.getStoresByStatus).mockResolvedValue({ data: [{ id: 2, name: 'Auto' }] } as never);
    vi.mocked(dealerService.register).mockReset();
  });

  it('loads stores and requires a logo and supporting document', async () => {
    const { container } = render(<DealerRegistrationPage />);
    expect(await screen.findByRole('option', { name: 'Auto' })).toBeInTheDocument();
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText(/logo et au moins un document/i)).toBeInTheDocument();
  });

  it('rejects an unsupported contact photo before submission', async () => {
    const { container } = render(<DealerRegistrationPage />);
    await screen.findByRole('option', { name: 'Auto' });
    const fileInputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0]!, { target: { files: [new File(['text'], 'contact.gif', { type: 'image/gif' })] } });
    expect(screen.getByText(/format PNG, JPG ou JPEG/i)).toBeInTheDocument();
  });

  it('submits a complete application and shows confirmation', async () => {
    const user = userEvent.setup();
    const { container } = render(<DealerRegistrationPage />);
    await screen.findByRole('option', { name: 'Auto' });
    await user.type(container.querySelector('input[name="companyName"]')!, 'Auto Plus');
    await user.type(container.querySelector('input[name="registrationNumber"]')!, 'REG-1');
    await user.type(container.querySelector('input[name="address"]')!, 'Tunis');
    await user.type(container.querySelector('input[name="website"]')!, 'https://auto.tn');
    await user.type(container.querySelector('input[name="contactPerson"]')!, 'Ali');
    await user.type(container.querySelector('input[name="phone"]')!, '123');
    await user.type(container.querySelector('input[name="email"]')!, 'ali@auto.tn');
    await user.selectOptions(container.querySelector('select[name="storeId"]')!, '2');
    const fileInputs = container.querySelectorAll('input[type="file"]');
    await user.upload(fileInputs[1] as HTMLInputElement, new File(['logo'], 'logo.png', { type: 'image/png' }));
    await user.upload(fileInputs[2] as HTMLInputElement, new File(['proof'], 'proof.pdf', { type: 'application/pdf' }));
    vi.mocked(dealerService.register).mockResolvedValue({} as never);

    await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));
    expect(await screen.findByRole('heading', { name: /demande envoyee/i })).toBeInTheDocument();
    expect(dealerService.register).toHaveBeenCalledWith(expect.objectContaining({ companyName: 'Auto Plus', storeId: 2 }), expect.any(File), expect.any(Array), undefined);
  });
});
