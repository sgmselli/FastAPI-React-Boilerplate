import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { act, renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { TOO_MANY_REQUESTS_MESSAGE } from '../../utils/apiErrors'
import { ForgotPassword, REQUEST_COOLDOWN_SECONDS } from './ForgotPassword'

const REQUEST_URL = `${API}/auth/password-reset/request`

beforeEach(() => {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
})

async function submitEmail(email = 'test@example.com') {
  await userEvent.type(screen.getByLabelText('Email address input'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link button' }))
}

describe('ForgotPassword', () => {
  it('renders the form', () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    expect(screen.getByRole('heading', { name: 'Forgot password' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email address input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reset link button' })).toBeInTheDocument()
  })

  it('sets the page title', () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    expect(document.title).toBe('Forgot password')
  })

  it('updates the input as the user types', async () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await userEvent.type(screen.getByLabelText('Email address input'), 'test@example.com')

    expect(screen.getByLabelText('Email address input')).toHaveValue('test@example.com')
  })

  it('submits the email to the request endpoint', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(REQUEST_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'sent' }, { status: 202 })
      }),
    )
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail()

    await waitFor(() => expect(body).toEqual({ email: 'test@example.com' }))
  })

  it('replaces the form with a confirmation on success', async () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail()

    await waitFor(() =>
      expect(screen.queryByLabelText('Email address input')).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/we've sent a/i)).toBeInTheDocument()
  })

  it('shows the same confirmation for an unregistered email', async () => {
    // The page must not reveal whether the address has an account - the API
    // deliberately returns the same 202 either way.
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail('ghost@example.com')

    await waitFor(() => expect(screen.getByText(/if an account exists/i)).toBeInTheDocument())
    expect(screen.getByText('ghost@example.com')).toBeInTheDocument()
  })

  it('tells the user the link is short lived', async () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail()

    await waitFor(() => expect(screen.getByText(/15 minutes/i)).toBeInTheDocument())
  })

  it('returns to the form when trying another email address', async () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })
    await submitEmail()
    await waitFor(() =>
      expect(screen.queryByLabelText('Email address input')).not.toBeInTheDocument(),
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Try another email address button' }),
    )

    expect(screen.getByLabelText('Email address input')).toBeInTheDocument()
  })

  it('shows the API error and keeps the form when the request fails', async () => {
    server.use(
      http.post(REQUEST_URL, () =>
        HttpResponse.json({ detail: 'Too many requests.' }, { status: 429 }),
      ),
    )
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail()

    await waitFor(() => expect(screen.getByText('Too many requests.')).toBeInTheDocument())
    expect(screen.getByLabelText('Email address input')).toBeInTheDocument()
  })

  it('falls back to a generic error when the API gives no detail', async () => {
    server.use(http.post(REQUEST_URL, () => new HttpResponse(null, { status: 500 })))
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    await submitEmail()

    await waitFor(() =>
      expect(screen.getByText('Failed to send reset link.')).toBeInTheDocument(),
    )
  })

  it('links back to sign in', () => {
    renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  describe('requesting another link', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function waitOutCooldown() {
      // One second at a time - each tick re-renders and schedules the next
      for (let second = 0; second < REQUEST_COOLDOWN_SECONDS; second++) {
        await act(async () => {
          vi.advanceTimersByTime(1000)
        })
      }
    }

    async function submitWithTimers(user: ReturnType<typeof userEvent.setup>, email = 'test@example.com') {
      await user.type(screen.getByLabelText('Email address input'), email)
      await user.click(screen.getByRole('button', { name: 'Send reset link button' }))
      await screen.findByText(/if an account exists/i)
    }

    it('holds off on sending another link until the cooldown has passed', async () => {
      // The backend ignores requests for the same account inside its cooldown
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })
      await submitWithTimers(user)

      expect(screen.queryByLabelText('Send another link button')).not.toBeInTheDocument()
      expect(
        screen.getByText(`request another link in ${REQUEST_COOLDOWN_SECONDS}s`),
      ).toBeInTheDocument()

      await waitOutCooldown()

      expect(await screen.findByLabelText('Send another link button')).toBeInTheDocument()
    })

    it('sends the same email again and restarts the cooldown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const bodies: Record<string, unknown>[] = []
      server.use(
        http.post(REQUEST_URL, async ({ request }) => {
          bodies.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json({ message: 'sent' }, { status: 202 })
        }),
      )
      renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })
      await submitWithTimers(user)
      await waitOutCooldown()

      await user.click(await screen.findByLabelText('Send another link button'))

      await waitFor(() => expect(bodies).toHaveLength(2))
      expect(bodies[1]).toEqual({ email: 'test@example.com' })
      expect(
        await screen.findByText(`request another link in ${REQUEST_COOLDOWN_SECONDS}s`),
      ).toBeInTheDocument()
    })

    it('shows an error when sending another link fails', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })
      await submitWithTimers(user)
      await waitOutCooldown()
      server.use(http.post(REQUEST_URL, () => new HttpResponse(null, { status: 429 })))

      await user.click(await screen.findByLabelText('Send another link button'))

      expect(await screen.findByText(TOO_MANY_REQUESTS_MESSAGE)).toBeInTheDocument()
    })

    it('blocks the same email on the form during the cooldown but not a different one', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderWithProviders(<ForgotPassword />, { route: '/forgot-password' })
      await submitWithTimers(user)

      await user.click(screen.getByRole('button', { name: 'Try another email address button' }))

      expect(screen.getByRole('button', { name: 'Send reset link button' })).toBeDisabled()
      expect(
        screen.getByText(/you can request another link for this email in/i),
      ).toBeInTheDocument()

      await user.clear(screen.getByLabelText('Email address input'))
      await user.type(screen.getByLabelText('Email address input'), 'other@example.com')

      expect(screen.getByRole('button', { name: 'Send reset link button' })).toBeEnabled()
      expect(
        screen.queryByText(/you can request another link for this email in/i),
      ).not.toBeInTheDocument()
    })
  })
})
