import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { testUser } from '../../test/handlers'
import { act, renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { RESEND_COOLDOWN_SECONDS, VerifyEmail } from './VerifyEmail'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const WITH_EMAIL = { pathname: '/verify-email', state: { email: 'test@example.com' } }

beforeEach(() => {
  mockNavigate.mockClear()
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
})

async function enterCode(code = '123456') {
  await userEvent.type(screen.getByLabelText('Verification code input'), code)
}

describe('VerifyEmail', () => {
  it('tells the user where the code was sent', () => {
    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Verification code input')).toBeInTheDocument()
  })

  it('sets the page title', () => {
    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

    expect(document.title).toBe('Verify your email')
  })

  it('points to sign in when opened without an email', () => {
    // A direct visit has no navigation state - signing in to an unverified
    // account sends a fresh code and comes back here with the email.
    renderWithProviders(<VerifyEmail />, { route: '/verify-email' })

    expect(screen.queryByLabelText('Verification code input')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login')
  })

  it('only accepts digits, up to six of them', async () => {
    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

    await enterCode('12a3-45678')

    expect(screen.getByLabelText('Verification code input')).toHaveValue('123456')
  })

  it('keeps Verify disabled until all six digits are entered', async () => {
    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

    expect(screen.getByLabelText('Verify email button')).toBeDisabled()

    await enterCode('12345')
    expect(screen.getByLabelText('Verify email button')).toBeDisabled()

    await enterCode('6')
    expect(screen.getByLabelText('Verify email button')).toBeEnabled()
  })

  it('verifies the code and navigates on success', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(`${API}/auth/otp/verify`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(testUser)
      }),
    )

    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })
    await enterCode()
    await userEvent.click(screen.getByLabelText('Verify email button'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/auth/callback'))
    expect(body).toEqual({ email: 'test@example.com', code: '123456' })
  })

  it("surfaces the server's detail message for a bad code", async () => {
    server.use(
      http.post(`${API}/auth/otp/verify`, () =>
        HttpResponse.json({ detail: 'This code is invalid or has expired.' }, { status: 400 }),
      ),
    )

    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })
    await enterCode()
    await userEvent.click(screen.getByLabelText('Verify email button'))

    expect(await screen.findByText('This code is invalid or has expired.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(
      http.post(`${API}/auth/otp/verify`, () => new HttpResponse(null, { status: 500 })),
    )

    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })
    await enterCode()
    await userEvent.click(screen.getByLabelText('Verify email button'))

    expect(await screen.findByText('Failed to verify your email.')).toBeInTheDocument()
  })

  it('links back to sign in', () => {
    renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  describe('resending', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function waitOutCooldown() {
      // One second at a time - each tick re-renders and schedules the next
      for (let second = 0; second < RESEND_COOLDOWN_SECONDS; second++) {
        await act(async () => {
          vi.advanceTimersByTime(1000)
        })
      }
    }

    it('holds off on resending until the cooldown has passed', async () => {
      // A code was sent just before the user arrived, and the backend ignores
      // resends inside its cooldown anyway.
      renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })

      expect(screen.queryByLabelText('Resend code button')).not.toBeInTheDocument()
      expect(screen.getByText(`request a new code in ${RESEND_COOLDOWN_SECONDS}s`)).toBeInTheDocument()

      await waitOutCooldown()

      expect(await screen.findByLabelText('Resend code button')).toBeInTheDocument()
    })

    it('sends a new code, shows the message and restarts the cooldown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      let body: Record<string, unknown> | undefined
      server.use(
        http.post(`${API}/auth/otp/resend`, async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            { message: "If that account still needs verifying, we've sent a new code." },
            { status: 202 },
          )
        }),
      )

      renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })
      await waitOutCooldown()
      await user.click(await screen.findByLabelText('Resend code button'))

      expect(
        await screen.findByText("If that account still needs verifying, we've sent a new code."),
      ).toBeInTheDocument()
      expect(body).toEqual({ email: 'test@example.com' })
      expect(screen.queryByLabelText('Resend code button')).not.toBeInTheDocument()
    })

    it('shows an error when the resend fails', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      server.use(
        http.post(`${API}/auth/otp/resend`, () => new HttpResponse(null, { status: 500 })),
      )

      renderWithProviders(<VerifyEmail />, { route: WITH_EMAIL })
      await waitOutCooldown()
      await user.click(await screen.findByLabelText('Resend code button'))

      expect(await screen.findByText('Failed to send a new code.')).toBeInTheDocument()
    })
  })
})
