import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'

import { API_URL as API } from '../../test/constants'
import { withProfileName } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen } from '../../test/renderWithProviders'
import AuthorizedRoute from './AuthorizedRoute'
import CompletedProfileRoute from './CompletedProfileRoute'

function CompleteProfilePage() {
  const state = useLocation().state as { returnTo?: string } | null
  return <p>Complete profile page, returning to {state?.returnTo}</p>
}

function renderRoute(route = '/settings') {
  renderWithProviders(
    <Routes>
      <Route element={<AuthorizedRoute />}>
        <Route element={<CompletedProfileRoute />}>
          <Route path="/settings" element={<p>Settings page</p>} />
        </Route>
        <Route path="/complete-profile/name" element={<CompleteProfilePage />} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('CompletedProfileRoute', () => {
  it('renders the page once the profile is complete', async () => {
    renderRoute()

    expect(await screen.findByText('Settings page')).toBeInTheDocument()
  })

  it('sends a user with an incomplete profile to complete it, then back to where they were going', async () => {
    server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null, null))))
    renderRoute('/settings')

    expect(await screen.findByText('Complete profile page, returning to /settings')).toBeInTheDocument()
    expect(screen.queryByText('Settings page')).not.toBeInTheDocument()
  })
})
