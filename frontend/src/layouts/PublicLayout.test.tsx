import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import { API_URL as API } from '../test/constants'
import { testUser, withProfileName } from '../test/handlers'
import { server } from '../test/setup'
import { renderWithProviders, screen, within } from '../test/renderWithProviders'
import { PublicLayout } from './PublicLayout'

function signedOut() {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
}

const navbar = () => within(screen.getByRole('navigation', { name: 'Main' }))

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
})

describe('PublicLayout navbar', () => {
  it('renders the site title', () => {
    renderLayout()

    expect(screen.getByRole('heading', { name: /FASTAPI \+ REACT BOILERPLATE/i })).toBeInTheDocument()
  })

  it('shows no auth-dependent content while the session is being resolved', () => {
    renderLayout()

    expect(navbar().queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open menu/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: testUser.display_name })).not.toBeInTheDocument()
  })

  describe('when signed out', () => {
    it('renders FAQ and About us links', async () => {
      signedOut()
      renderLayout()

      await navbar().findByRole('link', { name: 'Log in' })
      expect(navbar().getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
      expect(navbar().getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/about-us')
    })

    it('renders Log in and Sign up links, and a mobile menu trigger', async () => {
      signedOut()
      renderLayout()

      expect(await navbar().findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
      expect(navbar().getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
      expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument()
    })

    it('does not render the account menu', async () => {
      signedOut()
      renderLayout()

      await navbar().findByRole('link', { name: 'Log in' })
      expect(screen.queryByRole('button', { name: testUser.display_name })).not.toBeInTheDocument()
    })

    it('reveals a second set of page and auth links via the mobile menu', async () => {
      signedOut()
      renderLayout()

      await navbar().findByRole('link', { name: 'Log in' })
      await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))

      expect(navbar().getAllByRole('link', { name: 'FAQ' })).toHaveLength(2)
      expect(navbar().getAllByRole('link', { name: 'About us' })).toHaveLength(2)
      expect(navbar().getAllByRole('link', { name: 'Log in' })).toHaveLength(2)
      expect(navbar().getAllByRole('link', { name: 'Sign up' })).toHaveLength(2)
    })
  })

  describe('when signed in', () => {
    it('renders the account menu with the user\'s name', async () => {
      renderLayout()

      expect(await screen.findByRole('button', { name: new RegExp(testUser.display_name) })).toBeInTheDocument()
    })

    it('falls back to the email when the profile has no name', async () => {
      server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null, null))))
      renderLayout()

      expect(await screen.findByRole('button', { name: /test@example\.com/ })).toBeInTheDocument()
    })

    it('does not render Log in/Sign up links', async () => {
      renderLayout()

      await screen.findByRole('button', { name: new RegExp(testUser.display_name) })
      expect(navbar().queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
      expect(navbar().queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument()
    })

    it('offers only the page links in the mobile menu', async () => {
      renderLayout()

      await screen.findByRole('button', { name: new RegExp(testUser.display_name) })
      await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))

      expect(navbar().getAllByRole('link', { name: 'FAQ' })).toHaveLength(2)
      expect(navbar().queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    })
  })
})
