import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'

import { API_URL as API } from '../../test/constants'
import { withProfileName } from '../../test/handlers'
import { server } from '../../test/setup'
import { useAuth } from '../../contexts/auth'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { CompleteProfileBanner } from './CompleteProfileBanner'

const BANNER_TEXT = /Please complete your profile/i

function profileNotCompleted() {
  server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null))))
}

function signedOut() {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
}

/** Shows where the banner's link sent the user, and what it carried. */
function CompleteProfileDestination() {
  const location = useLocation()
  return <h1>Complete profile page from {(location.state as { returnTo: string }).returnTo}</h1>
}

/** Renders once the session user has loaded, so "hidden" assertions aren't vacuous. */
function SessionLoaded() {
  const { user } = useAuth()
  return user ? <span>Session loaded</span> : null
}

describe('CompleteProfileBanner', () => {
  it('shows when the signed in user has not completed their profile', async () => {
    profileNotCompleted()
    renderWithProviders(<CompleteProfileBanner />)

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Complete profile' })).toHaveAttribute('href', '/complete-profile')
  })

  it('links to the complete profile page, returning to the current page afterwards', async () => {
    profileNotCompleted()
    renderWithProviders(
      <>
        <CompleteProfileBanner />
        <Routes>
          <Route path="/settings" element={<h1>Settings page</h1>} />
          <Route path="/complete-profile" element={<CompleteProfileDestination />} />
        </Routes>
      </>,
      { route: '/settings' },
    )

    await userEvent.click(await screen.findByRole('link', { name: 'Complete profile' }))

    expect(screen.getByRole('heading', { name: 'Complete profile page from /settings' })).toBeInTheDocument()
  })

  it('is hidden once the profile is completed', async () => {
    // The default handler returns a user with a name
    renderWithProviders(<><CompleteProfileBanner /><SessionLoaded /></>)

    await screen.findByText('Session loaded')
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  it('is hidden when signed out', async () => {
    signedOut()
    renderWithProviders(<CompleteProfileBanner />)

    await waitFor(() => expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument())
  })

  it('is hidden on the complete profile page itself', async () => {
    profileNotCompleted()
    renderWithProviders(<><CompleteProfileBanner /><SessionLoaded /></>, { route: '/complete-profile' })

    await screen.findByText('Session loaded')
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })
})
