import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen, within } from '../../test/renderWithProviders'
import { SidebarLayout } from './SidebarLayout'

describe('SidebarLayout', () => {
  it('renders its children', () => {
    renderWithProviders(<SidebarLayout><p>Page content</p></SidebarLayout>)

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('links to the documentation, settings and logout', () => {
    renderWithProviders(<SidebarLayout><p>Page content</p></SidebarLayout>)

    expect(screen.getByRole('link', { name: 'Getting started' })).toHaveAttribute('href', '/getting-started')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute('href', '/logout')
  })

  it('marks the current page as active', () => {
    renderWithProviders(<SidebarLayout><p>Page content</p></SidebarLayout>, { route: '/getting-started' })

    expect(screen.getByRole('link', { name: 'Getting started' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current')
  })

  it('opens and closes the mobile menu', async () => {
    renderWithProviders(<SidebarLayout><p>Page content</p></SidebarLayout>)

    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(1)
  })

  it('closes the mobile menu when a link is chosen', async () => {
    renderWithProviders(<SidebarLayout><p>Page content</p></SidebarLayout>)

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByRole('button', { name: 'Close menu' }).parentElement!
    await userEvent.click(within(drawer).getByRole('link', { name: 'Settings' }))

    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
  })
})
