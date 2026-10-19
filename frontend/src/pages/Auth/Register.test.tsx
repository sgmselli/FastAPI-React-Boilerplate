import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { withProfileName } from '../../test/handlers'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { Register } from './Register'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  mockNavigate.mockClear()
  server.use(
    http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
    http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
  )
})

async function fillForm() {
  await userEvent.type(screen.getByLabelText('Register email input'), 'test@example.com')
  await userEvent.type(screen.getByLabelText('Register password input'), 'Str0ng!Pass')
  await userEvent.type(screen.getByLabelText('Confirm password input'), 'Str0ng!Pass')
  await userEvent.click(screen.getByLabelText('Agree to policies checkbox'))
}

describe('Register', () => {
  it('renders the registration form', () => {
    renderWithProviders(<Register />, { route: '/register' })

    expect(screen.queryByLabelText('Name input')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Register email input')).toBeInTheDocument()
    expect(screen.getByLabelText('Register password input')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password input')).toBeInTheDocument()
  })

  it('starts with the policies checkbox unticked and Create account disabled', () => {
    renderWithProviders(<Register />, { route: '/register' })

    expect(screen.getByLabelText('Agree to policies checkbox')).not.toBeChecked()
    expect(screen.getByLabelText('Create account button')).toBeDisabled()
    expect(screen.getByLabelText('Create account button')).toHaveClass('opacity-50')
  })

  it('leaves Google sign up available without the checkbox', () => {
    // Google's own consent screen shows the privacy policy and terms links
    renderWithProviders(<Register />, { route: '/register' })

    expect(screen.getByLabelText('Agree to policies checkbox')).not.toBeChecked()
    expect(screen.getByLabelText('Sign up with Google button')).toBeEnabled()
  })

  it('enables Create account once the policies are agreed to', async () => {
    renderWithProviders(<Register />, { route: '/register' })

    await userEvent.click(screen.getByLabelText('Agree to policies checkbox'))

    expect(screen.getByLabelText('Create account button')).toBeEnabled()
    expect(screen.getByLabelText('Create account button')).not.toHaveClass('opacity-50')

    await userEvent.click(screen.getByLabelText('Agree to policies checkbox'))

    expect(screen.getByLabelText('Create account button')).toBeDisabled()
  })

  it('does not register when the policies have not been agreed to', async () => {
    let called = false
    server.use(
      http.post(`${API}/user/register`, () => {
        called = true
        return HttpResponse.json(withProfileName(null), { status: 201 })
      }),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await userEvent.type(screen.getByLabelText('Register email input'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Register password input'), 'Str0ng!Pass')
    await userEvent.type(screen.getByLabelText('Confirm password input'), 'Str0ng!Pass')
    await userEvent.click(screen.getByLabelText('Create account button'))

    expect(called).toBe(false)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('links to both policies in a new tab so the form is not lost', () => {
    renderWithProviders(<Register />, { route: '/register' })

    const privacy = screen.getByRole('link', { name: 'Privacy Policy' })
    const terms = screen.getByRole('link', { name: 'Terms and Conditions' })

    expect(privacy).toHaveAttribute('href', '/privacy-policy')
    expect(privacy).toHaveAttribute('target', '_blank')
    expect(terms).toHaveAttribute('href', '/terms-and-conditions')
    expect(terms).toHaveAttribute('target', '_blank')
  })

  it('registers, logs the user in, then navigates', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${API}/user/register`, () => {
        calls.push('register')
        return HttpResponse.json(withProfileName(null), { status: 201 })
      }),
      http.post(`${API}/auth/login`, () => {
        calls.push('login')
        return HttpResponse.json(withProfileName(null))
      }),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()

    await userEvent.click(screen.getByLabelText('Create account button'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/auth/callback'))
    // Registration doesn't set cookies, so the page logs in immediately after
    // to establish a session - order matters.
    expect(calls).toEqual(['register', 'login'])
  })

  it('sends confirm_password in the snake_case the API expects', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post(`${API}/user/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName(null), { status: 201 })
      }),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    await waitFor(() => expect(body).toHaveProperty('confirm_password', 'Str0ng!Pass'))
  })

  it('registers with only an email and password', async () => {
    // The name is collected afterwards on the optional complete profile page.
    let body: Record<string, unknown> = {}
    server.use(
      http.post(`${API}/user/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName(null), { status: 201 })
      }),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    await waitFor(() =>
      expect(body).toEqual({
        email: 'test@example.com',
        password: 'Str0ng!Pass',
        confirm_password: 'Str0ng!Pass',
      }),
    )
  })

  it('shows a string detail as a form-level error', async () => {
    server.use(
      http.post(`${API}/user/register`, () =>
        HttpResponse.json({ detail: 'test@example.com is already taken.' }, { status: 409 }),
      ),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    expect(await screen.findByText('test@example.com is already taken.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('maps a 422 validation array onto the individual fields', async () => {
    // FastAPI returns detail as an array of {loc, msg} - the page pulls
    // loc[1] as the field name.
    server.use(
      http.post(`${API}/user/register`, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'password'], msg: 'Password must contain at least one number' },
              { loc: ['body', 'email'], msg: 'value is not a valid email address' },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    expect(
      await screen.findByText('Password must contain at least one number'),
    ).toBeInTheDocument()
    expect(screen.getByText('value is not a valid email address')).toBeInTheDocument()
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(
      http.post(`${API}/user/register`, () => new HttpResponse(null, { status: 500 })),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    expect(await screen.findByText('Failed to create account.')).toBeInTheDocument()
  })

  it('links to the login page', () => {
    renderWithProviders(<Register />, { route: '/register' })

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })
})