import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { UserMenu } from './UserMenu'

describe('UserMenu', () => {
  it('shows the initials on the trigger', () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })

    const trigger = screen.getByRole('button', { name: /Test User/ })
    expect(trigger.querySelector('svg')).toHaveTextContent('TU')
  })

  it("renders the user's name on the trigger", () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })

    expect(screen.getByRole('button', { name: /Test User/ })).toBeInTheDocument()
  })

  it('is closed by default', () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })

    expect(screen.queryByRole('link', { name: /Documentation/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })

  it('opens on click, revealing the menu items', async () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))

    expect(screen.getByRole('link', { name: /Documentation/ })).toHaveAttribute('href', '/docs')
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: /Logout/ })).toHaveAttribute('href', '/logout')
  })

  it('toggles closed when the trigger is clicked again', async () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })
    const trigger = screen.getByRole('button', { name: /Test User/ })

    await userEvent.click(trigger)
    expect(screen.getByRole('link', { name: /Documentation/ })).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.queryByRole('link', { name: /Documentation/ })).not.toBeInTheDocument()
  })

  it('closes when clicking outside the menu', async () => {
    renderWithProviders(
      <div>
        <UserMenu name="Test User" initials="TU" />
        <button>Elsewhere</button>
      </div>,
      { withAuth: false },
    )

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))
    expect(screen.getByRole('link', { name: /Documentation/ })).toBeInTheDocument()

    // The component listens on document mousedown and checks containment.
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(screen.queryByRole('link', { name: /Documentation/ })).not.toBeInTheDocument()
  })

  it('closes when a menu item is selected', async () => {
    renderWithProviders(<UserMenu name="Test User" initials="TU" />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))
    await userEvent.click(screen.getByRole('link', { name: /Documentation/ }))

    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })
})