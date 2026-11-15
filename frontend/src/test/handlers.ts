import { http, HttpResponse } from 'msw'

import type { UserResponse } from '../types/user'
import { API_URL as API } from './constants'

/**
 * The test user with a different profile name - mirrors the backend, where
 * display_name falls back to the email when no name is set.
 */
export function withProfileName(first_name: string | null, last_name: string | null): UserResponse {
  return {
    id: 1,
    email: 'test@example.com',
    display_name: [first_name, last_name].filter(Boolean).join(' ') || 'test@example.com',
    profile: {
      first_name,
      last_name,
      is_profile_completed: first_name !== null && last_name !== null,
      profile_picture_url: null,
    },
  }
}

export const testUser: UserResponse = withProfileName('Test', 'User')

export const TEST_PICTURE_URL = 'https://bucket.test/profile-pictures/1/picture.webp?signed'

/** The test user with a profile picture - `null` for the default image. */
export function withProfilePicture(url: string | null): UserResponse {
  return { ...testUser, profile: { ...testUser.profile, profile_picture_url: url } }
}

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
    const body = (await request.json()) as { first_name: string; last_name: string }
    return HttpResponse.json(withProfileName(body.first_name.trim(), body.last_name.trim()))
  }),

  http.put(`${API}/profile/current/picture`, () => HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))),

  http.delete(`${API}/profile/current/picture`, () => HttpResponse.json(withProfilePicture(null))),

  http.delete(`${API}/user/current`,() => new HttpResponse(null, { status: 204 })),

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