import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { LogIn, UserPlus } from 'lucide-react'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { MobileMenu } from './MobileMenu'
import type { MobileMenuItem } from './MobileMenu'

const items: MobileMenuItem[] = [
  { label: 'Login', to: '/login', icon: LogIn },
  { label: 'Register', to: '/register', icon: UserPlus },
]

describe('MobileMenu', () => {
  it('renders a trigger button', () => {
    renderWithProviders(<MobileMenu items={items} />, { withAuth: false })

    expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument()
  })

  it('is closed by default', () => {
    renderWithProviders(<MobileMenu items={items} />, { withAuth: false })

    expect(screen.queryByRole('link', { name: /Login/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Register/ })).not.toBeInTheDocument()
  })

  it('opens on click, revealing the passed-in items', async () => {
    renderWithProviders(<MobileMenu items={items} />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))

    expect(screen.getByRole('link', { name: /Login/ })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /Register/ })).toHaveAttribute('href', '/register')
  })

  it('toggles closed when the trigger is clicked again', async () => {
    renderWithProviders(<MobileMenu items={items} />, { withAuth: false })
    const trigger = screen.getByRole('button', { name: /Open menu/i })

    await userEvent.click(trigger)
    expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.queryByRole('link', { name: /Login/ })).not.toBeInTheDocument()
  })

  it('closes when clicking outside the menu', async () => {
    renderWithProviders(
      <div>
        <MobileMenu items={items} />
        <button>Elsewhere</button>
      </div>,
      { withAuth: false },
    )

    await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))
    expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument()

    // The component listens on document mousedown and checks containment.
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(screen.queryByRole('link', { name: /Login/ })).not.toBeInTheDocument()
  })

  it('closes when a menu item is selected', async () => {
    renderWithProviders(<MobileMenu items={items} />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))
    await userEvent.click(screen.getByRole('link', { name: /Login/ }))

    expect(screen.queryByRole('link', { name: /Register/ })).not.toBeInTheDocument()
  })

  it('renders an empty list gracefully when given no items', async () => {
    renderWithProviders(<MobileMenu items={[]} />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Open menu/i }))

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
