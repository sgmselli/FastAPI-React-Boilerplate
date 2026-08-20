import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../test/constants'
import { testUser } from '../test/handlers'
import { server } from '../test/setup'
import { renderWithProviders, screen, waitFor } from '../test/renderWithProviders'
import { useAuth } from './auth'

/**
 * Exposes the context through the DOM so tests assert on what a consumer
 * actually sees, rather than reaching into the provider's internals.
 */
function AuthConsumer() {
  const { user, loadingUser, login, logout, isAuthenticated } = useAuth()

  return (
    <div>
      <span data-testid="loading">{String(loadingUser)}</span>
      <span data-testid="authenticated">{String(isAuthenticated())}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button
        onClick={() =>
          login({ email: 'test@example.com', password: 'Str0ng!Pass' }).catch(() => {})
        }
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  describe('on mount', () => {
    it('loads the current user when a session exists', async () => {
      renderWithProviders(<AuthConsumer />)

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

      expect(screen.getByTestId('user')).toHaveTextContent(testUser.email)
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    it('leaves the user null when no session exists', async () => {
      server.use(
        http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
      )

      renderWithProviders(<AuthConsumer />)

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

      expect(screen.getByTestId('user')).toHaveTextContent('none')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })

    it('starts in a loading state', () => {
      renderWithProviders(<AuthConsumer />)

      // Synchronous assertion before the fetch resolves.
      expect(screen.getByTestId('loading')).toHaveTextContent('true')
    })

    it('reports unauthenticated while still loading, even once a user resolves', async () => {
      renderWithProviders(<AuthConsumer />)

      // isAuthenticated() is `!!user && !loadingUser` - the loading guard stops
      // protected routes flashing a redirect before the session is known.
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')

      await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))
    })
  })

  describe('login', () => {
    it('sets the user on success', async () => {
      server.use(
        http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
      )

      renderWithProviders(<AuthConsumer />)
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
      expect(screen.getByTestId('user')).toHaveTextContent('none')

      await userEvent.click(screen.getByRole('button', { name: 'login' }))

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(testUser.email))
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    it('leaves the user unset when the credentials are rejected', async () => {
      server.use(
        http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json({ detail: 'Incorrect username or password.' }, { status: 401 }),
        ),
      )

      renderWithProviders(<AuthConsumer />)
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

      await userEvent.click(screen.getByRole('button', { name: 'login' }))

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
    })
  })

  describe('logout', () => {
    it('clears the user', async () => {
      renderWithProviders(<AuthConsumer />)
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(testUser.email))

      await userEvent.click(screen.getByRole('button', { name: 'logout' }))

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })

    it('calls the logout endpoint so the server clears its cookies', async () => {
      let called = false
      server.use(
        http.post(`${API}/auth/logout`, () => {
          called = true
          return HttpResponse.json({})
        }),
      )

      renderWithProviders(<AuthConsumer />)
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(testUser.email))

      await userEvent.click(screen.getByRole('button', { name: 'logout' }))

      await waitFor(() => expect(called).toBe(true))
    })
  })
})