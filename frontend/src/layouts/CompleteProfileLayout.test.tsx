import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { testUser } from '../test/handlers'
import { renderWithProviders, screen, waitFor, within } from '../test/renderWithProviders'
import { CompleteProfileLayout } from './CompleteProfileLayout'

function renderLayout() {
  renderWithProviders(
    <Routes>
      <Route element={<CompleteProfileLayout />}>
        <Route path="*" element={<p>Page content</p>} />
      </Route>
    </Routes>,
    { route: '/complete-profile' },
  )
}

const navbar = () => screen.getByRole('navigation', { name: 'Main' })

describe('CompleteProfileLayout', () => {
  it('renders the matched page inside the main content area', () => {
    renderLayout()

    expect(screen.getByRole('main')).toContainElement(screen.getByText('Page content'))
  })

  it('shows only the logo in the navbar', () => {
    renderLayout()

    expect(within(navbar()).getByRole('img')).toBeInTheDocument()
    expect(within(navbar()).queryByRole('link')).not.toBeInTheDocument()
    expect(within(navbar()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not show the user in the navbar once the session has loaded', async () => {
    renderLayout()

    // The footer swaps to its signed-in links once the user is fetched
    await screen.findByRole('link', { name: 'Documentation' })
    await waitFor(() => expect(navbar()).not.toHaveTextContent(testUser.display_name))
  })

  it('renders the footer', () => {
    renderLayout()

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
