import { beforeEach, describe, expect, it, vi } from 'vitest'

import { http, HttpResponse } from 'msw'

import { API_URL as API } from '../../test/constants'
import { withProfileName } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, waitFor } from '../../test/renderWithProviders'
import { AuthCallback } from './AuthCallback'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  mockNavigate.mockClear()
  sessionStorage.clear()
})

describe('AuthCallback', () => {
  it('redirects to the stored returnTo path', async () => {
    sessionStorage.setItem('returnTo', '/account')

    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true }),
    )
  })

  it('defaults to /account when nothing was stored', async () => {
    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true }),
    )
  })

  it('honours a returnTo other than the default', async () => {
    sessionStorage.setItem('returnTo', '/privacy-policy')

    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy', { replace: true }),
    )
  })

  it('clears returnTo so a later login does not reuse it', async () => {
    sessionStorage.setItem('returnTo', '/account')

    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    await waitFor(() => expect(sessionStorage.getItem('returnTo')).toBeNull())
  })

  it('replaces rather than pushes, keeping the callback out of history', async () => {
    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), { replace: true }),
    )
  })

  describe('when the profile is not completed', () => {
    beforeEach(() => {
      server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null))))
    })

    it('offers the complete profile page first, carrying on to returnTo afterwards', async () => {
      sessionStorage.setItem('returnTo', '/privacy-policy')

      renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/complete-profile', {
          replace: true,
          state: { returnTo: '/privacy-policy', suggestedName: null },
        }),
      )
      expect(mockNavigate).not.toHaveBeenCalledWith('/privacy-policy', expect.anything())
    })

    it('passes on the name Google suggested in the fragment', async () => {
      renderWithProviders(<AuthCallback />, { route: '/auth/callback#name=Jane%20O%27Brien' })

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/complete-profile', {
          replace: true,
          state: { returnTo: '/account', suggestedName: "Jane O'Brien" },
        }),
      )
    })

    it('defaults the onward destination to /account', async () => {
      renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/complete-profile', {
          replace: true,
          state: { returnTo: '/account', suggestedName: null },
        }),
      )
    })
  })

  it('waits for the session to load before redirecting', async () => {
    // Before the user is fetched there's no way to know if the profile is complete
    renderWithProviders(<AuthCallback />, { route: '/auth/callback' })

    expect(mockNavigate).not.toHaveBeenCalled()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})
