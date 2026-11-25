import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GOOGLE_LOGIN_URL, GoogleAuthButton } from './GoogleAuthButton'

const button = () => screen.getByRole('button', { name: 'Sign in with Google button' })

describe('GoogleAuthButton', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // jsdom can't navigate, so capture where the button sends the browser
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('shows the Google logo and label', () => {
    render(<GoogleAuthButton label="Sign in with Google" />)

    expect(button()).toHaveTextContent('Sign in with Google')
    expect(button()).toBeEnabled()
  })

  it('redirects to Google and shows a spinner while it does', async () => {
    const { container } = render(<GoogleAuthButton label="Sign in with Google" />)

    await userEvent.click(button())

    expect(window.location.href).toBe(GOOGLE_LOGIN_URL)
    expect(button()).toBeDisabled()
    expect(button()).not.toHaveTextContent('Sign in with Google')
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('resets when the page is restored with the back button', async () => {
    render(<GoogleAuthButton label="Sign in with Google" />)
    await userEvent.click(button())

    const pageShow = new Event('pageshow') as PageTransitionEvent
    Object.defineProperty(pageShow, 'persisted', { value: true })
    act(() => {
      fireEvent(window, pageShow)
    })

    expect(button()).toBeEnabled()
    expect(button()).toHaveTextContent('Sign in with Google')
  })

  it('can be disabled by the page', () => {
    render(<GoogleAuthButton label="Sign in with Google" disabled />)

    expect(button()).toBeDisabled()
  })
})
