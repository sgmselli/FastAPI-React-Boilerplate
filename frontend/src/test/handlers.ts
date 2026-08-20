import { http, HttpResponse } from 'msw'

import type { UserResponse } from '../types/user'
import { API_URL as API } from './constants'

export const testUser: UserResponse = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
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

  http.post(`${API}/user/register`, () => HttpResponse.json(testUser, { status: 201 })),
]