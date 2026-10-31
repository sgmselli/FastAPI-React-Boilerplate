import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ErrorFallback } from './ErrorFallback'

describe('ErrorFallback', () => {
  it('tells the user something went wrong', () => {
    render(<ErrorFallback />)

    expect(screen.getByText('Sorry, something went wrong.')).toBeInTheDocument()
  })

  it('reloads the page from the button', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<ErrorFallback />)

    fireEvent.click(screen.getByRole('button', { name: /reload page/i }))

    expect(reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
