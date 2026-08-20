import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { API_URL as API } from '../../test/constants'
import { server } from '../../test/setup'
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
  await userEvent.type(screen.getByLabelText('Name input'), 'Test User')
  await userEvent.type(screen.getByLabelText('Register email input'), 'test@example.com')
  await userEvent.type(screen.getByLabelText('Register password input'), 'Str0ng!Pass')
  await userEvent.type(screen.getByLabelText('Confirm password input'), 'Str0ng!Pass')
}

describe('Register', () => {
  it('renders the registration form', () => {
    renderWithProviders(<Register />, { route: '/register' })

    expect(screen.getByLabelText('Name input')).toBeInTheDocument()
    expect(screen.getByLabelText('Register email input')).toBeInTheDocument()
    expect(screen.getByLabelText('Register password input')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password input')).toBeInTheDocument()
  })

  it('registers, logs the user in, then navigates', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${API}/user/register`, () => {
        calls.push('register')
        return HttpResponse.json({ id: 1, name: 'Test User', email: 'test@example.com' }, { status: 201 })
      }),
      http.post(`${API}/auth/login`, () => {
        calls.push('login')
        return HttpResponse.json({ id: 1, name: 'Test User', email: 'test@example.com' })
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
        return HttpResponse.json({ id: 1, name: 'Test User', email: 'test@example.com' }, { status: 201 })
      }),
    )

    renderWithProviders(<Register />, { route: '/register' })
    await fillForm()
    await userEvent.click(screen.getByLabelText('Create account button'))

    await waitFor(() => expect(body).toHaveProperty('confirm_password', 'Str0ng!Pass'))
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
              { loc: ['body', 'name'], msg: 'Name can only contain letters' },
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
    expect(screen.getByText('Name can only contain letters')).toBeInTheDocument()
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