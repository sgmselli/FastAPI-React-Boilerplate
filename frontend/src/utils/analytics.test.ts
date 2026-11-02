import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initAnalytics } from './analytics'

const gtagScripts = () => document.head.querySelectorAll('script[src*="googletagmanager.com"]')

describe('initAnalytics', () => {
  beforeEach(() => {
    window.dataLayer = []
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    gtagScripts().forEach((script) => script.remove())
  })

  it('does nothing without a measurement ID', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')

    initAnalytics()

    expect(gtagScripts()).toHaveLength(0)
    expect(window.dataLayer).toEqual([])
  })

  it('loads the tag and configures it with the measurement ID', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')

    initAnalytics()

    expect(gtagScripts()).toHaveLength(1)
    expect(gtagScripts()[0]).toHaveAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=G-TEST123')
    const config = window.dataLayer.map((entry) => Array.from(entry as IArguments))
    expect(config).toContainEqual(['config', 'G-TEST123'])
  })
})
