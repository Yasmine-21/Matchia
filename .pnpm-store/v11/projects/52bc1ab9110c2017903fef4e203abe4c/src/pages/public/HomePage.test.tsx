import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the complete public platform presentation', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /lancez votre marketplace bancaire/i })).toBeInTheDocument();
    expect(screen.getByText('Marketplace bancaire personnalisable')).toBeInTheDocument();
    expect(screen.getByText('Store mobile')).toBeInTheDocument();
    expect(screen.getAllByText('Comparateur').length).toBeGreaterThan(0);
    expect(screen.getByText(/demande d'adhésion/i)).toBeInTheDocument();
    expect(screen.getByText(/sécurité et qualité bancaire/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rejoindre matchia/i).length).toBeGreaterThan(0);
  });
});
