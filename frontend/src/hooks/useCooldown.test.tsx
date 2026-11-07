import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useCooldown from './useCooldown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function tick(seconds: number) {
  // One second at a time - each tick re-renders and schedules the next
  for (let second = 0; second < seconds; second++) {
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
  }
}

describe('useCooldown', () => {
  it('starts inactive by default', () => {
    const { result } = renderHook(() => useCooldown(60))

    expect(result.current.secondsLeft).toBe(0)
  })

  it('starts counting straight away when startActive is set', async () => {
    const { result } = renderHook(() => useCooldown(60, true))

    expect(result.current.secondsLeft).toBe(60)

    await tick(1)

    expect(result.current.secondsLeft).toBe(59)
  })

  it('counts down to zero and stops', async () => {
    const { result } = renderHook(() => useCooldown(3))

    act(() => result.current.start())
    await tick(5)

    expect(result.current.secondsLeft).toBe(0)
  })

  it('restarts from the full duration', async () => {
    const { result } = renderHook(() => useCooldown(10, true))
    await tick(4)

    act(() => result.current.start())

    expect(result.current.secondsLeft).toBe(10)
  })
})
