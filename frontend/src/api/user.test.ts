import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import { testUser } from '../test/handlers'
import { getCurrentUser, loginUser, logoutUser, registerUser } from './user'

describe('registerUser', () => {
  it('maps confirmPassword to the snake_case confirm_password the API expects', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`${API}/user/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(testUser, { status: 201 })
      }),
    )

    await registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      confirmPassword: 'Str0ng!Pass',
    })

    expect(body).toEqual({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      confirm_password: 'Str0ng!Pass',
    })
    expect(body).not.toHaveProperty('confirmPassword')
  })

  it('returns the created user', async () => {
    const user = await registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      confirmPassword: 'Str0ng!Pass',
    })

    expect(user).toEqual(testUser)
  })

  it('rejects when the API returns an error', async () => {
    server.use(
      http.post(`${API}/user/register`, () =>
        HttpResponse.json({ detail: 'test@example.com is already taken.' }, { status: 409 }),
      ),
    )

    await expect(
      registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass',
      }),
    ).rejects.toThrow()
  })
})

describe('loginUser', () => {
  it('posts url-encoded form data using username, not email', async () => {
    // FastAPI's OAuth2PasswordRequestForm reads `username`/`password` from a
    // form body - sending JSON, or an `email` key, would 422.
    let contentType: string | null = null
    let raw = ''

    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        contentType = request.headers.get('content-type')
        raw = await request.text()
        return HttpResponse.json(testUser)
      }),
    )

    await loginUser({ email: 'test@example.com', password: 'Str0ng!Pass' })

    expect(contentType).toContain('application/x-www-form-urlencoded')

    const parsed = new URLSearchParams(raw)
    expect(parsed.get('username')).toBe('test@example.com')
    expect(parsed.get('password')).toBe('Str0ng!Pass')
    expect(parsed.get('email')).toBeNull()
  })

  it('returns the authenticated user', async () => {
    const user = await loginUser({ email: 'test@example.com', password: 'Str0ng!Pass' })
    expect(user).toEqual(testUser)
  })

  it('rejects on invalid credentials', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ detail: 'Incorrect username or password.' }, { status: 401 }),
      ),
    )

    await expect(
      loginUser({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow()
  })
})

describe('logoutUser', () => {
  it('posts to the logout endpoint', async () => {
    let called = false

    server.use(
      http.post(`${API}/auth/logout`, () => {
        called = true
        return HttpResponse.json({})
      }),
    )

    await logoutUser()

    expect(called).toBe(true)
  })
})

describe('getCurrentUser', () => {
  it('returns the current user', async () => {
    const user = await getCurrentUser()
    expect(user).toEqual(testUser)
  })
})