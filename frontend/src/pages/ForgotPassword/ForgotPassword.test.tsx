import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { ForgotPassword } from './ForgotPassword'

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
})
