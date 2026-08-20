import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import AuthorizedRoute from './AuthorizedRoute'

function signedOut() {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
}

/**
 * Renders the guard inside a route tree so a redirect is observable as the
 * login page rendering, rather than by inspecting router internals.
 */
function renderGuardedRoutes() {
  return renderWithProviders(
    <Routes>
      <Route element={<AuthorizedRoute />}>
        <Route path="/account" element={<h1>Account page</h1>} />
      </Route>
      <Route path="/login" element={<h1>Login page</h1>} />
    </Routes>,
    { route: '/account' },
  )
}

describe('AuthorizedRoute', () => {
  it('renders a loading state while the session is being resolved', () => {
    renderGuardedRoutes()

    expect(screen.queryByText('Account page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('renders the protected route once a user is loaded', async () => {
    renderGuardedRoutes()

    expect(await screen.findByText('Account page')).toBeInTheDocument()
  })

  it('redirects to /login when there is no user', async () => {
    signedOut()

    renderGuardedRoutes()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Account page')).not.toBeInTheDocument()
  })

  it('does not flash a redirect before the session resolves', async () => {
    // The loadingUser guard matters here: without it an authenticated user
    // would be bounced to /login on every refresh.
    renderGuardedRoutes()

    expect(screen.queryByText('Login page')).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Account page')).toBeInTheDocument())
  })
})