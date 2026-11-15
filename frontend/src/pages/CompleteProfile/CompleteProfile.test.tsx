import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import AuthorizedRoute from '../../components/ProtectedRoutes/AuthorizedRoute'
import { useAuth } from '../../contexts/auth'
import { API_URL as API } from '../../test/constants'
import { TEST_PICTURE_URL, withProfileName } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { CompleteProfile } from './CompleteProfile'

const mockNavigate = vi.fn()
let mockLocationState: unknown = null

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ ...actual.useLocation(), state: mockLocationState }),
  }
})

const UPDATE_URL = `${API}/profile/current`

const saveButton = () => screen.getByRole('button', { name: 'Save profile button' })
const firstNameInput = () => screen.getByLabelText('First name input')
const lastNameInput = () => screen.getByLabelText('Last name input')

/** Stands in for the navbar - anything else reading the session's user. */
function SessionUserName() {
  const { user } = useAuth()
  return <span data-testid="session-user-name">{user ? user.display_name : 'none'}</span>
}

async function renderCompleteProfile() {
  // Behind AuthorizedRoute as in App.tsx, so the input is seeded once the session has loaded
  renderWithProviders(
    <>
      <SessionUserName />
      <Routes>
        <Route element={<AuthorizedRoute />}>
          <Route path="/complete-profile" element={<CompleteProfile />} />
        </Route>
      </Routes>
    </>,
    { route: '/complete-profile' },
  )
  await screen.findByRole('heading', { level: 1, name: 'Complete your profile' })
}

beforeEach(() => {
  mockNavigate.mockClear()
  mockLocationState = { returnTo: '/settings' }
  server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null, null))))
})

describe('CompleteProfile', () => {
  it('uploads a profile picture without leaving the page or saving the name', async () => {
    let nameSaved = false
    server.use(
      http.patch(UPDATE_URL, () => {
        nameSaved = true
        return HttpResponse.json(withProfileName('New', 'Name'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.upload(
      screen.getByLabelText('Profile picture input'),
      new File(['image-bytes'], 'me.png', { type: 'image/png' }),
    )

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute('src', TEST_PICTURE_URL),
    )
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(nameSaved).toBe(false)
  })

  it('starts with an empty name for a new account', async () => {
    await renderCompleteProfile()

    expect(firstNameInput()).toHaveValue('')
    expect(lastNameInput()).toHaveValue('')
  })

  it('prefills the name Google suggested, without having saved it', async () => {
    mockLocationState = { returnTo: '/settings', suggestedFirstName: 'Google', suggestedLastName: 'User' }

    await renderCompleteProfile()

    expect(firstNameInput()).toHaveValue('Google')
    expect(lastNameInput()).toHaveValue('User')
    // Not saved yet, so the suggestion can be saved without editing it
    expect(saveButton()).toBeEnabled()
  })

  it('saves the suggested name as-is', async () => {
    mockLocationState = { returnTo: '/settings', suggestedFirstName: 'Google', suggestedLastName: 'User' }
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('Google', 'User'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.click(saveButton())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true }))
    expect(body).toEqual({ first_name: 'Google', last_name: 'User' })
  })

  it('disables Save until a name is entered', async () => {
    await renderCompleteProfile()

    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveClass('opacity-50')

    await userEvent.type(firstNameInput(), 'New')
    expect(saveButton()).toBeEnabled()
    expect(saveButton()).not.toHaveClass('opacity-50')

    await userEvent.clear(firstNameInput())
    expect(saveButton()).toBeDisabled()
  })

  it('treats whitespace alone as no change', async () => {
    await renderCompleteProfile()

    await userEvent.type(firstNameInput(), '   ')
    await userEvent.type(lastNameInput(), '   ')

    expect(saveButton()).toBeDisabled()
  })

  it('saves the name, updates the session user, then continues to returnTo', async () => {
    mockLocationState = { returnTo: '/privacy-policy' }
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('New', 'Name'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.type(firstNameInput(), 'New')
    await userEvent.type(lastNameInput(), 'Name')
    await userEvent.click(saveButton())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy', { replace: true }))
    expect(body).toEqual({ first_name: 'New', last_name: 'Name' })
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('New Name')
  })

  it('can be skipped without saving anything', async () => {
    let called = false
    server.use(
      http.patch(UPDATE_URL, () => {
        called = true
        return HttpResponse.json(withProfileName('New', 'Name'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Skip profile button' }))

    expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true })
    expect(called).toBe(false)
  })

  it('defaults to /docs/getting-started when arriving without a returnTo', async () => {
    mockLocationState = null

    await renderCompleteProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Skip profile button' }))

    expect(mockNavigate).toHaveBeenCalledWith('/docs/getting-started', { replace: true })
  })

  it('shows a validation error and stays on the page', async () => {
    server.use(
      http.patch(UPDATE_URL, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'first_name'],
                msg: 'Name can only contain letters, numbers, spaces, underscores, and hyphens',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    await renderCompleteProfile()
    await userEvent.type(firstNameInput(), 'Bad@Name')
    await userEvent.type(lastNameInput(), 'User')
    await userEvent.click(saveButton())

    expect(
      await screen.findByText('Name can only contain letters, numbers, spaces, underscores, and hyphens'),
    ).toBeInTheDocument()
    expect(firstNameInput()).toHaveClass('input-error')
    expect(lastNameInput()).not.toHaveClass('input-error')
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('test@example.com')
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(http.patch(UPDATE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderCompleteProfile()
    await userEvent.type(firstNameInput(), 'New')
    await userEvent.type(lastNameInput(), 'Name')
    await userEvent.click(saveButton())

    expect(await screen.findByText('Failed to save your profile.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
