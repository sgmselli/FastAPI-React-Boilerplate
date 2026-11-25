import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

import { Route, Routes } from 'react-router-dom'

import { renderWithProviders, screen, within } from '../test/renderWithProviders'
import { testUser } from '../test/handlers'
import { AppLayout } from './AppLayout'

function renderLayout(route = '/docs/getting-started') {
  renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="*" element={<p>Page content</p>} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('AppLayout', () => {
  it('renders the matched page', () => {
    renderLayout('/')

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('links to the documentation', () => {
    renderLayout('/')

    expect(screen.getByRole('link', { name: 'Getting started' })).toHaveAttribute('href', '/docs/getting-started')
  })

  it('keeps settings and logout behind the account menu', async () => {
    renderLayout('/')

    const accountButton = await screen.findByRole('button', { name: 'Account menu' })
    expect(accountButton).toHaveTextContent(testUser.display_name)
    expect(accountButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()

    await userEvent.click(accountButton)

    expect(accountButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute('href', '/logout')
  })

  it('closes the account menu on Escape or a click outside', async () => {
    renderLayout('/')

    const accountButton = await screen.findByRole('button', { name: 'Account menu' })
    await userEvent.click(accountButton)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()

    await userEvent.click(accountButton)
    await userEvent.click(screen.getByText('Page content'))
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('numbers the documentation steps in order', () => {
    renderLayout('/')

    expect(screen.getByRole('link', { name: 'Getting started' })).toHaveTextContent('1Getting started')
  })

  it('marks the current page as active', () => {
    renderLayout('/docs/getting-started')

    expect(screen.getByRole('link', { name: 'Getting started' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens and closes the mobile menu', async () => {
    renderLayout('/')

    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.getAllByRole('link', { name: 'Getting started' })).toHaveLength(1)
  })

  it('closes the mobile menu when a link is chosen', async () => {
    renderLayout('/')

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByRole('button', { name: 'Close menu' }).parentElement!
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Account menu' }))
    await userEvent.click(within(drawer).getByRole('link', { name: 'Settings' }))

    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
  })
})
