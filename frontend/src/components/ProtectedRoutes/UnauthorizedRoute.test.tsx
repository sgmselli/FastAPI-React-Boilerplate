import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import UnauthorisedRoute from './UnauthorizedRoute'

function signedOut() {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
}

function renderGuardedRoutes() {
  return renderWithProviders(
    <Routes>
      <Route element={<UnauthorisedRoute />}>
        <Route path="/login" element={<h1>Login page</h1>} />
      </Route>
      <Route path="/auth/callback" element={<h1>Callback page</h1>} />
    </Routes>,
    { route: '/login' },
  )
}

describe('UnauthorisedRoute', () => {
  it('renders a loading state while the session is being resolved', () => {
    renderGuardedRoutes()

    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
    expect(screen.queryByText('Callback page')).not.toBeInTheDocument()
  })

  it('renders the route when there is no user', async () => {
    signedOut()

    renderGuardedRoutes()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('redirects an authenticated user away to /auth/callback', async () => {
    renderGuardedRoutes()

    expect(await screen.findByText('Callback page')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('does not flash the login form before the session resolves', async () => {
    renderGuardedRoutes()

    expect(screen.queryByText('Login page')).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Callback page')).toBeInTheDocument())
  })
})