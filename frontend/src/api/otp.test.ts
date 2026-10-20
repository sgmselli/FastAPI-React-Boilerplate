import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import { testUser } from '../test/handlers'
import { resendOtp, verifyOtp } from './otp'

describe('verifyOtp', () => {
  it('posts the email and code to the verify endpoint', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`${API}/auth/otp/verify`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(testUser)
      }),
    )

    await verifyOtp({ email: 'test@example.com', code: '123456' })

    expect(body).toEqual({ email: 'test@example.com', code: '123456' })
  })

  it('returns the now signed in user', async () => {
    const user = await verifyOtp({ email: 'test@example.com', code: '123456' })

    expect(user).toEqual(testUser)
  })

  it('rejects when the code is wrong or expired', async () => {
    server.use(
      http.post(`${API}/auth/otp/verify`, () =>
        HttpResponse.json({ detail: 'This code is invalid or has expired.' }, { status: 400 }),
      ),
    )

    await expect(verifyOtp({ email: 'test@example.com', code: '000000' })).rejects.toThrow()
  })
})

describe('resendOtp', () => {
  it('posts the email to the resend endpoint', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`${API}/auth/otp/resend`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'sent' }, { status: 202 })
      }),
    )

    await resendOtp({ email: 'test@example.com' })

    expect(body).toEqual({ email: 'test@example.com' })
  })

  it('returns the generic message', async () => {
    const response = await resendOtp({ email: 'test@example.com' })

    expect(response.message).toContain('still needs verifying')
  })
})
