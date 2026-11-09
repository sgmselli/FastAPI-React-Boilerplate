import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { API_URL as API } from '../test/constants'
import { withProfileName } from '../test/handlers'
import { server } from '../test/setup'
import { renderWithProviders, screen } from '../test/renderWithProviders'
import { PublicLayout } from './PublicLayout'

function renderLayout({ fullWidth = false } = {}) {
  renderWithProviders(
    <Routes>
      <Route element={<PublicLayout fullWidth={fullWidth} />}>
        <Route path="*" element={<p>Page content</p>} />
      </Route>
    </Routes>,
    { route: '/faq' },
  )
}

describe('PublicLayout', () => {
  it('renders the matched page inside the main content area', () => {
    renderLayout()

    expect(screen.getByRole('main')).toContainElement(screen.getByText('Page content'))
  })

  it('renders the navbar and footer around the page', () => {
    renderLayout()

    expect(screen.getByRole('heading', { name: /FASTAPI \+ REACT BOILERPLATE/i })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('constrains the page width by default', () => {
    renderLayout()

    expect(screen.getByRole('main')).toHaveClass('max-w-[1200px]')
  })

  it('lets the page span the full width when fullWidth is set', () => {
    renderLayout({ fullWidth: true })

    expect(screen.getByRole('main')).toHaveClass('w-full')
    expect(screen.getByRole('main')).not.toHaveClass('max-w-[1200px]')
  })

  it('shows the complete profile banner to users who have not completed their profile', async () => {
    server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null))))
    renderLayout()

    expect(await screen.findByText(/Please complete your profile/i)).toBeInTheDocument()
  })
})
