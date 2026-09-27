import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import {
  confirmPasswordReset,
  requestPasswordReset,
  validatePasswordResetToken,
} from './forgotPassword'

describe('requestPasswordReset', () => {
  it('posts the email to the request endpoint', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`${API}/auth/password-reset/request`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'sent' }, { status: 202 })
      }),
    )

    await requestPasswordReset({ email: 'test@example.com' })

    expect(body).toEqual({ email: 'test@example.com' })
  })

  it('returns the generic message', async () => {
    const response = await requestPasswordReset({ email: 'test@example.com' })

    expect(response.message).toContain('If an account exists')
  })

  it('resolves identically for an unregistered email', async () => {
    // The API deliberately cannot tell us whether the account exists, so the
    // client must not try to infer it either.
    const known = await requestPasswordReset({ email: 'test@example.com' })
    const unknown = await requestPasswordReset({ email: 'ghost@example.com' })

    expect(known).toEqual(unknown)
  })

  it('rejects when the API errors', async () => {
    server.use(
      http.post(`${API}/auth/password-reset/request`, () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )

    await expect(requestPasswordReset({ email: 'test@example.com' })).rejects.toThrow()
  })
})

describe('validatePasswordResetToken', () => {
  it('posts the token in the body rather than the query string', async () => {
    // A token in a query string lands in proxy access logs - keeping it in the
    // body is the whole reason this is a POST.
    let body: Record<string, unknown> | undefined
    let url = ''

    server.use(
      http.post(`${API}/auth/password-reset/validate`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        url = request.url
        return HttpResponse.json({ valid: true })
      }),
    )

    await validatePasswordResetToken('raw-token')

    expect(body).toEqual({ token: 'raw-token' })
    expect(url).not.toContain('raw-token')
  })

  it('returns valid true for a usable token', async () => {
    const response = await validatePasswordResetToken('raw-token')

    expect(response.valid).toBe(true)
  })

  it('returns valid false without throwing for a dead token', async () => {
    server.use(
      http.post(`${API}/auth/password-reset/validate`, () =>
        HttpResponse.json({ valid: false }),
      ),
    )

    await expect(validatePasswordResetToken('dead-token')).resolves.toEqual({ valid: false })
  })
})

describe('confirmPasswordReset', () => {
  it('maps confirmPassword to the snake_case confirm_password the API expects', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`${API}/auth/password-reset/confirm`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'Your password has been reset.' })
      }),
    )

    await confirmPasswordReset({
      token: 'raw-token',
      password: 'N3w!Password',
      confirmPassword: 'N3w!Password',
    })

    expect(body).toEqual({
      token: 'raw-token',
      password: 'N3w!Password',
      confirm_password: 'N3w!Password',
    })
    expect(body).not.toHaveProperty('confirmPassword')
  })

  it('returns the success message', async () => {
    const response = await confirmPasswordReset({
      token: 'raw-token',
      password: 'N3w!Password',
      confirmPassword: 'N3w!Password',
    })

    expect(response.message).toBe('Your password has been reset.')
  })

  it('rejects when the token is expired or already used', async () => {
    server.use(
      http.post(`${API}/auth/password-reset/confirm`, () =>
        HttpResponse.json(
          { detail: 'This password reset link is invalid or has expired.' },
          { status: 400 },
        ),
      ),
    )

    await expect(
      confirmPasswordReset({
        token: 'dead-token',
        password: 'N3w!Password',
        confirmPassword: 'N3w!Password',
      }),
    ).rejects.toThrow()
  })
})
