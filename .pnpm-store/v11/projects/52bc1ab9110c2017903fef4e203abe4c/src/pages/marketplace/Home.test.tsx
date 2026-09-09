import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MarketplaceHome } from './Home';

describe('MarketplaceHome', () => {
  it('renders branded offers and links every configured store', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Outlet context={{
            bankData: { name: 'Banque', stores: [
              { id: '1', label: 'Mobile', description: 'Téléphones' },
              { id: '2', name: 'Medical' },
              { id: '3', name: 'Auto', slug: 'auto-credit' },
              { id: '4', name: 'Education' },
            ] },
            branding: { primary_color: '#123456', secondary_color: '#abcdef', homepage_title: 'Bienvenue', welcome_text: 'Financer vos projets' },
          }} />}>
            <Route path="/" element={<MarketplaceHome />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /explorer/i })).toHaveLength(4);
    expect(screen.getByText(/accompagnement/i)).toBeInTheDocument();
  });
});
