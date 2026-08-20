import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import usePageTitle from './usePageTitle'

describe('usePageTitle', () => {
  it('sets the document title', () => {
    renderHook(() => usePageTitle('Sign in'))

    expect(document.title).toBe('Sign in')
  })

  it('leaves the title untouched when passed null', () => {
    document.title = 'Existing title'

    renderHook(() => usePageTitle(null))

    expect(document.title).toBe('Existing title')
  })

  it('leaves the title untouched when passed undefined', () => {
    document.title = 'Existing title'

    renderHook(() => usePageTitle(undefined))

    expect(document.title).toBe('Existing title')
  })

  it('leaves the title untouched when passed an empty string', () => {
    document.title = 'Existing title'

    renderHook(() => usePageTitle(''))

    expect(document.title).toBe('Existing title')
  })

  it('updates the title when the value changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'First' },
    })

    expect(document.title).toBe('First')

    rerender({ title: 'Second' })

    expect(document.title).toBe('Second')
  })
})