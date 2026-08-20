import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { Login } from './Login'

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
  await userEvent.type(screen.getByLabelText('Email address input'), 'test@example.com')
  await userEvent.type(screen.getByLabelText('Password input'), 'Str0ng!Pass')
}

describe('Login', () => {
  it('renders the sign in form', () => {
    renderWithProviders(<Login />, { route: '/login' })

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email address input')).toBeInTheDocument()
    expect(screen.getByLabelText('Password input')).toBeInTheDocument()
  })

  it('sets the page title', () => {
    renderWithProviders(<Login />, { route: '/login' })

    expect(document.title).toBe('Sign in')
  })

  it('updates the inputs as the user types', async () => {
    renderWithProviders(<Login />, { route: '/login' })

    await fillForm()

    expect(screen.getByLabelText('Email address input')).toHaveValue('test@example.com')
    expect(screen.getByLabelText('Password input')).toHaveValue('Str0ng!Pass')
  })

  it('submits the credentials and navigates on success', async () => {
    let submitted = ''
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        submitted = await request.text()
        return HttpResponse.json({ id: 1, name: 'Test User', email: 'test@example.com' })
      }),
    )

    renderWithProviders(<Login />, { route: '/login' })
    await fillForm()

    await userEvent.click(screen.getByLabelText('Sign in button'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/auth/callback'))

    const parsed = new URLSearchParams(submitted)
    expect(parsed.get('username')).toBe('test@example.com')
    expect(parsed.get('password')).toBe('Str0ng!Pass')
  })

  it("surfaces the server's detail message on failure", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ detail: 'Incorrect username or password.' }, { status: 401 }),
      ),
    )

    renderWithProviders(<Login />, { route: '/login' })
    await fillForm()

    await userEvent.click(screen.getByLabelText('Sign in button'))

    expect(await screen.findByText('Incorrect username or password.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(
      http.post(`${API}/auth/login`, () => new HttpResponse(null, { status: 500 })),
    )

    renderWithProviders(<Login />, { route: '/login' })
    await fillForm()

    await userEvent.click(screen.getByLabelText('Sign in button'))

    expect(await screen.findByText('Failed to sign in.')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    renderWithProviders(<Login />, { route: '/login' })

    const passwordInput = screen.getByLabelText('Password input')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // The toggle is the only unlabelled button in the form.
    const toggle = screen.getAllByRole('button').find((b) => !b.getAttribute('aria-label'))
    await userEvent.click(toggle!)

    expect(passwordInput).toHaveAttribute('type', 'text')

    await userEvent.click(toggle!)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('links to the register page', () => {
    renderWithProviders(<Login />, { route: '/login' })

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
  })
})