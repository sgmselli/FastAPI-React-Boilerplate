import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import { testUser } from '../test/handlers'
import { api, apiAuth } from './index'

/**
 * apiAuth carries a response interceptor that transparently refreshes an
 * expired access token and replays the original request. These tests drive
 * it through MSW so the real axios instance and interceptor chain run - the
 * logic here is invisible to any test that mocks the api module instead.
 */
describe('apiAuth refresh interceptor', () => {
  it('refreshes and retries once when a request 401s', async () => {
    let currentCalls = 0
    let refreshCalls = 0

    server.use(
      http.get(`${API}/user/current`, () => {
        currentCalls += 1
        // First attempt fails as though the access token expired; the retry
        // after a successful refresh succeeds.
        if (currentCalls === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json(testUser)
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    const response = await apiAuth.get('/user/current')

    expect(refreshCalls).toBe(1)
    expect(currentCalls).toBe(2)
    expect(response.data).toEqual(testUser)
  })

  it('rejects without looping when the refresh call itself 401s', async () => {
    let refreshCalls = 0

    server.use(
      http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1
        return new HttpResponse(null, { status: 401 })
      }),
    )

    await expect(apiAuth.get('/user/current')).rejects.toThrow()

    // The early return for /auth/refresh URLs is what stops a failed refresh
    // from triggering another refresh, and so on.
    expect(refreshCalls).toBe(1)
  })

  it('does not retry a second time if the replayed request also 401s', async () => {
    let currentCalls = 0
    let refreshCalls = 0

    server.use(
      http.get(`${API}/user/current`, () => {
        currentCalls += 1
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    await expect(apiAuth.get('/user/current')).rejects.toThrow()

    // _retry guards the replay: original + one retry, one refresh.
    expect(currentCalls).toBe(2)
    expect(refreshCalls).toBe(1)
  })

  it('passes non-401 errors straight through without refreshing', async () => {
    let refreshCalls = 0

    server.use(
      http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 500 })),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    await expect(apiAuth.get('/user/current')).rejects.toThrow()

    expect(refreshCalls).toBe(0)
  })

  it('leaves successful responses untouched', async () => {
    const response = await apiAuth.get('/user/current')
    expect(response.status).toBe(200)
    expect(response.data).toEqual(testUser)
  })
})

describe('api instance', () => {
  it('does not refresh on 401 - only apiAuth carries the interceptor', async () => {
    let refreshCalls = 0

    server.use(
      http.get(`${API}/user/current`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({})
      }),
    )

    await expect(api.get('/user/current')).rejects.toThrow()

    expect(refreshCalls).toBe(0)
  })
})

describe('shared axios config', () => {
  it('sends credentials so httpOnly auth cookies are included', () => {
    // The backend stores access/refresh tokens as httpOnly cookies, so every
    // request has to opt in to sending them cross-origin.
    expect(api.defaults.withCredentials).toBe(true)
    expect(apiAuth.defaults.withCredentials).toBe(true)
  })

  it('targets the versioned API prefix', () => {
    expect(api.defaults.baseURL).toBe(API)
    expect(apiAuth.defaults.baseURL).toBe(API)
  })
})