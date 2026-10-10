import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '../test/renderWithProviders'
import { useToast } from './toast'

function ToastTrigger({ message = 'Saved!' }: { message?: string }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(message)}>show</button>
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider', () => {
  it('renders nothing until a toast is shown', () => {
    renderWithProviders(<ToastTrigger />, { withAuth: false })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the message as a success toast', () => {
    renderWithProviders(<ToastTrigger />, { withAuth: false })

    act(() => screen.getByRole('button', { name: 'show' }).click())

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Saved!')
    expect(toast).toHaveClass('alert-success')
  })

  it('stacks toasts shown in quick succession', () => {
    renderWithProviders(<ToastTrigger />, { withAuth: false })
    const trigger = screen.getByRole('button', { name: 'show' })

    act(() => trigger.click())
    act(() => trigger.click())

    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('dismisses a toast on its own after a few seconds', () => {
    vi.useFakeTimers()
    renderWithProviders(<ToastTrigger />, { withAuth: false })

    act(() => screen.getByRole('button', { name: 'show' }).click())
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3999))
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
