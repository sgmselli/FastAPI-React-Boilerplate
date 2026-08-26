import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { testUser } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { Navbar } from './Navbar'

function signedOut() {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
}

describe('Navbar', () => {
  it('renders the site title', () => {
    renderWithProviders(<Navbar />)

    expect(screen.getByRole('heading', { name: /FASTAPI \+ REACT BOILERPLATE/i })).toBeInTheDocument()
  })

  it('shows no auth-dependent content while the session is being resolved', () => {
    renderWithProviders(<Navbar />)

    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open menu/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: testUser.name })).not.toBeInTheDocument()
  })

  describe('when signed out', () => {
    it('renders Login and Register links, and a mobile menu trigger', async () => {
      signedOut()
      renderWithProviders(<Navbar />)

      expect(await screen.findByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
      expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register')
      expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument()
    })

    it('does not render the account menu', async () => {
      signedOut()
      renderWithProviders(<Navbar />)

      await screen.findByRole('link', { name: 'Login' })
      expect(screen.queryByRole('button', { name: testUser.name })).not.toBeInTheDocument()
    })

    it('reveals a second set of Login/Register links via the mobile menu', async () => {
      signedOut()
      renderWithProviders(<Navbar />)

      await screen.findByRole('link', { name: 'Login' })
      await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))

      expect(screen.getAllByRole('link', { name: 'Login' })).toHaveLength(2)
      expect(screen.getAllByRole('link', { name: 'Register' })).toHaveLength(2)
    })
  })

  describe('when signed in', () => {
    it('renders the account menu with the user\'s name', async () => {
      renderWithProviders(<Navbar />)

      expect(await screen.findByRole('button', { name: new RegExp(testUser.name) })).toBeInTheDocument()
    })

    it('does not render Login/Register links or the mobile menu trigger', async () => {
      renderWithProviders(<Navbar />)

      await screen.findByRole('button', { name: new RegExp(testUser.name) })
      expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Open menu/i })).not.toBeInTheDocument()
    })
  })
})
