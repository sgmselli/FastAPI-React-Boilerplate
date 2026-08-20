import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})