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
  mockLocationState = { returnTo: '/account' }
  server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null))))
})

describe('CompleteProfile', () => {
  it('uploads a profile picture without leaving the page or saving the name', async () => {
    let nameSaved = false
    server.use(
      http.patch(UPDATE_URL, () => {
        nameSaved = true
        return HttpResponse.json(withProfileName('New Name'))
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

    expect(screen.getByLabelText('Name input')).toHaveValue('')
  })

  it('prefills the name Google suggested, without having saved it', async () => {
    mockLocationState = { returnTo: '/account', suggestedName: 'Google User' }

    await renderCompleteProfile()

    expect(screen.getByLabelText('Name input')).toHaveValue('Google User')
    // Not saved yet, so the suggestion can be saved without editing it
    expect(saveButton()).toBeEnabled()
  })

  it('saves the suggested name as-is', async () => {
    mockLocationState = { returnTo: '/account', suggestedName: 'Google User' }
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('Google User'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.click(saveButton())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true }))
    expect(body).toEqual({ name: 'Google User' })
  })

  it('disables Save until a name is entered', async () => {
    await renderCompleteProfile()

    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveClass('opacity-50')

    await userEvent.type(screen.getByLabelText('Name input'), 'New Name')
    expect(saveButton()).toBeEnabled()
    expect(saveButton()).not.toHaveClass('opacity-50')

    await userEvent.clear(screen.getByLabelText('Name input'))
    expect(saveButton()).toBeDisabled()
  })

  it('treats whitespace alone as no change', async () => {
    await renderCompleteProfile()

    await userEvent.type(screen.getByLabelText('Name input'), '   ')

    expect(saveButton()).toBeDisabled()
  })

  it('saves the name, updates the session user, then continues to returnTo', async () => {
    mockLocationState = { returnTo: '/privacy-policy' }
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('New Name'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.type(screen.getByLabelText('Name input'), 'New Name')
    await userEvent.click(saveButton())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy', { replace: true }))
    expect(body).toEqual({ name: 'New Name' })
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('New Name')
  })

  it('can be skipped without saving anything', async () => {
    let called = false
    server.use(
      http.patch(UPDATE_URL, () => {
        called = true
        return HttpResponse.json(withProfileName('New Name'))
      }),
    )

    await renderCompleteProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Skip profile button' }))

    expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true })
    expect(called).toBe(false)
  })

  it('defaults to /account when arriving without a returnTo', async () => {
    mockLocationState = null

    await renderCompleteProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Skip profile button' }))

    expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('shows a validation error and stays on the page', async () => {
    server.use(
      http.patch(UPDATE_URL, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'name'],
                msg: 'Name can only contain letters, numbers, spaces, underscores, and hyphens',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    await renderCompleteProfile()
    await userEvent.type(screen.getByLabelText('Name input'), 'Bad@Name')
    await userEvent.click(saveButton())

    expect(
      await screen.findByText('Name can only contain letters, numbers, spaces, underscores, and hyphens'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Name input')).toHaveClass('input-error')
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('test@example.com')
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(http.patch(UPDATE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderCompleteProfile()
    await userEvent.type(screen.getByLabelText('Name input'), 'New Name')
    await userEvent.click(saveButton())

    expect(await screen.findByText('Failed to save your profile.')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
