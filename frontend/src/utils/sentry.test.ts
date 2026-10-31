import * as Sentry from '@sentry/react'
import type { ErrorEvent } from '@sentry/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { initSentry, scrubBreadcrumb, scrubEvent } from './sentry'

vi.mock('@sentry/react', () => ({ init: vi.fn() }))

describe('initSentry', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(Sentry.init).mockClear()
  })

  it('does nothing without a DSN', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('initialises without personal data when a DSN is set', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@o0.ingest.de.sentry.io/0')

    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://public@o0.ingest.de.sentry.io/0',
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
    }))
  })
})

describe('scrubEvent', () => {
  it('removes the fragment from the page URL', () => {
    const event = { type: undefined, request: { url: 'https://site.test/password-reset#token=secret' } } as ErrorEvent

    expect(scrubEvent(event).request?.url).toBe('https://site.test/password-reset')
  })
})

describe('scrubBreadcrumb', () => {
  it('removes fragments from navigation breadcrumbs', () => {
    const breadcrumb = scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/auth/callback#name=Jane%20Doe', to: '/complete-profile' },
    })

    expect(breadcrumb.data).toEqual({ from: '/auth/callback', to: '/complete-profile' })
  })
})
