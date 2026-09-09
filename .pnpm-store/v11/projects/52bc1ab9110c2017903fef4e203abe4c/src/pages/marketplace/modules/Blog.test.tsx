import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BlogModule } from './Blog';

describe('BlogModule', () => {
  it('renders every article with the marketplace branding context', () => {
    render(
      <MemoryRouter initialEntries={['/blog']}>
        <Routes>
          <Route element={<Outlet context={{ branding: { primary_color: '#2563EB' } }} />}>
            <Route path="/blog" element={<BlogModule />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /blog & conseils/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByText(/financement automobile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voir plus/i })).toBeInTheDocument();
  });
});
