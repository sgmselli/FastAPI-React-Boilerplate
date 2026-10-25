import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { DEFAULT_AVATAR_SRC } from '../Avatar/Avatar'
import { UserMenu } from './UserMenu'

describe('UserMenu', () => {
  it('shows the profile picture on the trigger', () => {
    const url = 'https://bucket.test/picture.webp?signed'
    renderWithProviders(<UserMenu name="Test User" pictureUrl={url} />, { withAuth: false })

    const trigger = screen.getByRole('button', { name: /Test User/ })
    expect(trigger.querySelector('img')).toHaveAttribute('src', url)
  })

  it('shows the default image on the trigger without a picture', () => {
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })

    const trigger = screen.getByRole('button', { name: /Test User/ })
    expect(trigger.querySelector('img')).toHaveAttribute('src', DEFAULT_AVATAR_SRC)
  })

  it("renders the user's name on the trigger", () => {
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })

    expect(screen.getByRole('button', { name: /Test User/ })).toBeInTheDocument()
  })

  it('is closed by default', () => {
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })

    expect(screen.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })

  it('opens on click, revealing the menu items', async () => {
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))

    expect(screen.getByRole('link', { name: /Account/ })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: /Logout/ })).toHaveAttribute('href', '/logout')
  })

  it('toggles closed when the trigger is clicked again', async () => {
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })
    const trigger = screen.getByRole('button', { name: /Test User/ })

    await userEvent.click(trigger)
    expect(screen.getByRole('link', { name: /Account/ })).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
  })

  it('closes when clicking outside the menu', async () => {
    renderWithProviders(
      <div>
        <UserMenu name="Test User" pictureUrl={null} />
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
    renderWithProviders(<UserMenu name="Test User" pictureUrl={null} />, { withAuth: false })

    await userEvent.click(screen.getByRole('button', { name: /Test User/ }))
    await userEvent.click(screen.getByRole('link', { name: /Account/ }))

    expect(screen.queryByRole('link', { name: /Logout/ })).not.toBeInTheDocument()
  })
})