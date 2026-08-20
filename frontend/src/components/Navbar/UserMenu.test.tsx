import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { UserMenu } from './UserMenu'

describe('UserMenu', () => {
  it("renders the user's name on the trigger", () => {
    renderWithProviders(<UserMenu name="Test User" />, { withAuth: false })

    expect(screen.getByRole('button', { name: /Test User/ })).toBeInTheDocument()
  })

  it('is closed by default', () => {
    renderWithProviders(<UserMenu name="Test User" />, { withAuth: false })

    expect(screen.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })

  it('opens on click, revealing the menu items', async () => {
    renderWithProviders(<UserMenu name="Test User" />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))

    expect(screen.getByRole('link', { name: /Account/ })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('link', { name: /Logout/ })).toHaveAttribute('href', '/logout')
  })

  it('toggles closed when the trigger is clicked again', async () => {
    renderWithProviders(<UserMenu name="Test User" />, { withAuth: false })
    const trigger = screen.getByRole('button', { name: /Test User/ })

    await userEvent.click(trigger)
    expect(screen.getByRole('link', { name: /Account/ })).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
  })

  it('closes when clicking outside the menu', async () => {
    renderWithProviders(
      <div>
        <UserMenu name="Test User" />
        <button>Elsewhere</button>
      </div>,
      { withAuth: false },
    )

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))
    expect(screen.getByRole('link', { name: /Account/ })).toBeInTheDocument()

    // The component listens on document mousedown and checks containment.
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(screen.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
  })

  it('closes when a menu item is selected', async () => {
    renderWithProviders(<UserMenu name="Test User" />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))
    await userEvent.click(screen.getByRole('link', { name: /Account/ }))

    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })
})