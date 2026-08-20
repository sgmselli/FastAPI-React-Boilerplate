import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider } from '../contexts/auth'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entries. Use to render a component at a given route. */
  route?: string
  /**
   * Set false to skip AuthProvider - for tests that provide their own auth
   * context value, or that are asserting on AuthProvider itself.
   */
  withAuth?: boolean
}

/**
 * Renders with the providers nearly every component here needs.
 *
 * MemoryRouter rather than BrowserRouter: no jsdom history mutation between
 * tests, and `route` sets the starting location directly.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', withAuth = true, ...options }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        {withAuth ? <AuthProvider>{children}</AuthProvider> : children}
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-exported so tests import screen/waitFor/etc from one place. The
// react-refresh rule targets Fast Refresh boundaries in app code, which
// doesn't apply to a test-only helper.
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'