import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { ResetPassword } from './ResetPassword'

const VALIDATE_URL = `${API}/auth/password-reset/validate`
const CONFIRM_URL = `${API}/auth/password-reset/confirm`

const NEW_PASSWORD = 'N3w!Password'

/**
 * The page reads the token from the real window location rather than from the
 * router, because the reset link puts it in the fragment - so these tests have
 * to drive window.history directly.
 */
function visitWithToken(token: string | null) {
  const url = token ? `/password-reset#token=${token}` : '/password-reset'
  window.history.replaceState(null, '', url)
}

beforeEach(() => {
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
  visitWithToken('raw-token')
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

async function renderForm() {
  renderWithProviders(<ResetPassword />, { route: '/password-reset' })
  await screen.findByRole('heading', { name: 'Reset password' })
}

async function submitPasswords(password = NEW_PASSWORD, confirmPassword = NEW_PASSWORD) {
  await userEvent.type(screen.getByLabelText('New password input'), password)
  await userEvent.type(screen.getByLabelText('Confirm new password input'), confirmPassword)
  await userEvent.click(screen.getByRole('button', { name: 'Reset password button' }))
}

describe('ResetPassword token handling', () => {
  it('sends the token from the fragment for validation', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(VALIDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ valid: true })
      }),
    )

    await renderForm()

    expect(body).toEqual({ token: 'raw-token' })
  })

  it('wipes the token from the address bar', async () => {
    // Leaving it there would put the token in browser history, in screenshots,
    // and in whatever analytics reads document.location.
    await renderForm()

    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain('raw-token')
  })

  it('shows the expired state when the token is no longer usable', async () => {
    server.use(http.post(VALIDATE_URL, () => HttpResponse.json({ valid: false })))

    renderWithProviders(<ResetPassword />, { route: '/password-reset' })

    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument()
    expect(screen.queryByLabelText('New password input')).not.toBeInTheDocument()
  })

  it('shows the expired state when there is no token in the link', async () => {
    let validateCalled = false
    server.use(
      http.post(VALIDATE_URL, () => {
        validateCalled = true
        return HttpResponse.json({ valid: true })
      }),
    )
    visitWithToken(null)

    renderWithProviders(<ResetPassword />, { route: '/password-reset' })

    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument()
    expect(validateCalled).toBe(false)
  })

  it('shows the expired state when validation errors', async () => {
    server.use(http.post(VALIDATE_URL, () => new HttpResponse(null, { status: 500 })))

    renderWithProviders(<ResetPassword />, { route: '/password-reset' })

    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument()
  })

  it('offers a way to request a new link when expired', async () => {
    server.use(http.post(VALIDATE_URL, () => HttpResponse.json({ valid: false })))

    renderWithProviders(<ResetPassword />, { route: '/password-reset' })

    await screen.findByRole('heading', { name: 'Link expired' })
    expect(
      screen.getByRole('link', { name: 'Request a new reset link button' }),
    ).toHaveAttribute('href', '/forgot-password')
  })
})

describe('ResetPassword form', () => {
  it('renders both password inputs once the token checks out', async () => {
    await renderForm()

    expect(screen.getByLabelText('New password input')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password input')).toBeInTheDocument()
  })

  it('sets the page title', async () => {
    await renderForm()

    expect(document.title).toBe('Reset password')
  })

  it('toggles password visibility', async () => {
    await renderForm()
    const input = screen.getByLabelText('New password input')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getAllByRole('button', { hidden: true })[0])

    expect(input).toHaveAttribute('type', 'text')
  })

  it('submits the token alongside the new password', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(CONFIRM_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'Your password has been reset.' })
      }),
    )
    await renderForm()

    await submitPasswords()

    await waitFor(() =>
      expect(body).toEqual({
        token: 'raw-token',
        password: NEW_PASSWORD,
        confirm_password: NEW_PASSWORD,
      }),
    )
  })

  it('replaces the form with a confirmation on success', async () => {
    await renderForm()

    await submitPasswords()

    expect(
      await screen.findByRole('heading', { name: 'Password reset' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('New password input')).not.toBeInTheDocument()
    expect(screen.getByText('Your password has been reset.')).toBeInTheDocument()
  })

  it('links to sign in after a successful reset', async () => {
    await renderForm()

    await submitPasswords()

    await screen.findByRole('heading', { name: 'Password reset' })
    expect(screen.getByRole('link', { name: 'Sign in button' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('shows the API error above the form when the token died mid-flow', async () => {
    // Validation passed on load, so the only way to learn the token has since
    // expired or been used is this 400.
    server.use(
      http.post(CONFIRM_URL, () =>
        HttpResponse.json(
          { detail: 'This password reset link is invalid or has expired.' },
          { status: 400 },
        ),
      ),
    )
    await renderForm()

    await submitPasswords()

    await waitFor(() =>
      expect(
        screen.getByText('This password reset link is invalid or has expired.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByLabelText('New password input')).toBeInTheDocument()
  })

  it('shows validation errors against the field that failed', async () => {
    server.use(
      http.post(CONFIRM_URL, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'password'],
                msg: 'Password must contain at least one number',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    )
    await renderForm()

    await submitPasswords('Weak!Password')

    await waitFor(() =>
      expect(
        screen.getByText('Password must contain at least one number'),
      ).toBeInTheDocument(),
    )
  })

  it('shows a mismatch error against the confirmation field', async () => {
    server.use(
      http.post(CONFIRM_URL, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'confirm_password'], msg: 'Passwords do not match' },
            ],
          },
          { status: 422 },
        ),
      ),
    )
    await renderForm()

    await submitPasswords(NEW_PASSWORD, 'Different1!')

    await waitFor(() =>
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument(),
    )
  })

  it('falls back to a generic error when the API gives no detail', async () => {
    server.use(http.post(CONFIRM_URL, () => new HttpResponse(null, { status: 500 })))
    await renderForm()

    await submitPasswords()

    await waitFor(() =>
      expect(screen.getByText('Failed to reset password.')).toBeInTheDocument(),
    )
  })
})
