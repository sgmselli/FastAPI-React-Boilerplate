import { http, HttpResponse } from 'msw'

import type { UserResponse } from '../types/user'
import { API_URL as API } from './constants'

/**
 * The test user with a different profile name - mirrors the backend, where
 * display_name falls back to the email when no name is set.
 */
export function withProfileName(name: string | null): UserResponse {
  return {
    id: 1,
    email: 'test@example.com',
    display_name: name || 'test@example.com',
    profile: { name, is_profile_completed: name !== null },
  }
}

export const testUser: UserResponse = withProfileName('Test User')

/**
 * Default happy-path handlers. Individual tests override these per-case with
 * server.use(...) rather than editing this file - keeps the defaults meaning
 * "authenticated user, everything works".
 */
export const handlers = [
  http.get(`${API}/user/current`, () => HttpResponse.json(testUser)),

  http.post(`${API}/auth/login`, () => HttpResponse.json(testUser)),

  http.post(`${API}/auth/logout`, () => HttpResponse.json({})),

  http.post(`${API}/auth/refresh`, () => HttpResponse.json({})),

  http.patch(`${API}/profile/current`, async ({ request }) => {
    const body = (await request.json()) as { name: string }
    return HttpResponse.json(withProfileName(body.name.trim()))
  }),

  http.delete(`${API}/user/current`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API}/user/register`, () => HttpResponse.json(testUser, { status: 201 })),

  http.post(`${API}/auth/otp/verify`, () => HttpResponse.json(testUser)),

  http.post(`${API}/auth/otp/resend`, () =>
    HttpResponse.json(
      { message: "If that account still needs verifying, we've sent a new code." },
      { status: 202 },
    ),
  ),

  http.post(`${API}/auth/password-reset/request`, () =>
    HttpResponse.json(
      { message: "If an account exists for that email, we've sent a password reset link." },
      { status: 202 },
    ),
  ),

  http.post(`${API}/auth/password-reset/validate`, () => HttpResponse.json({ valid: true })),

  http.post(`${API}/auth/password-reset/confirm`, () =>
    HttpResponse.json({ message: 'Your password has been reset.' }),
  ),
]