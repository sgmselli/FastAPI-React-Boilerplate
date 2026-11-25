import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Navigate, Route, Routes } from 'react-router-dom'

import AuthorizedRoute from '../../../components/ProtectedRoutes/AuthorizedRoute'
import { useAuth } from '../../../contexts/auth'
import { API_URL as API } from '../../../test/constants'
import { withProfileName } from '../../../test/handlers'
import { server } from '../../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import type { CompleteProfileState } from '../steps'
import { NameStep } from './NameStep'

const UPDATE_URL = `${API}/profile/current`

const firstNameInput = () => screen.getByLabelText('First name input')
const lastNameInput = () => screen.getByLabelText('Last name input')
const completeButton = () => screen.getByRole('button', { name: 'Complete button' })

/** Stands in for the navbar - anything else reading the session's user. */
function SessionUserName() {
  const { user } = useAuth()
  return <span data-testid="session-user-name">{user ? user.display_name : 'none'}</span>
}

const onContinue = vi.fn()

// Behind AuthorizedRoute as in App.tsx, so the inputs are seeded once the session has loaded
async function renderStep(state?: CompleteProfileState) {
  renderWithProviders(
    <>
      <SessionUserName />
      <Routes>
        <Route path="/start" element={<Navigate to="/complete-profile/name" state={state} />} />
        <Route element={<AuthorizedRoute />}>
          <Route path="/complete-profile/name" element={<NameStep actionLabel="Complete" onContinue={onContinue} />} />
        </Route>
      </Routes>
    </>,
    { route: '/start' },
  )
  await screen.findByLabelText('First name input')
}

beforeEach(() => {
  onContinue.mockClear()
  server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName(null, null))))
})

describe('NameStep', () => {
  it('starts empty for a new account', async () => {
    await renderStep()

    expect(firstNameInput()).toHaveValue('')
    expect(lastNameInput()).toHaveValue('')
  })

  it('prefills the name Google suggested', async () => {
    await renderStep({ suggestedFirstName: 'Google', suggestedLastName: 'User' })

    expect(firstNameInput()).toHaveValue('Google')
    expect(lastNameInput()).toHaveValue('User')
    expect(completeButton()).toBeEnabled()
  })

  it('disables the button until both names are entered', async () => {
    await renderStep()

    await userEvent.type(firstNameInput(), 'New')
    expect(completeButton()).toBeDisabled()
    expect(completeButton()).toHaveClass('opacity-50')

    await userEvent.type(lastNameInput(), '   ')
    expect(completeButton()).toBeDisabled()

    await userEvent.type(lastNameInput(), 'Name')
    expect(completeButton()).toBeEnabled()
    expect(completeButton()).not.toHaveClass('opacity-50')
  })

  it('saves the name, updates the session user, then continues', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('New', 'Name'))
      }),
    )

    await renderStep()
    await userEvent.type(firstNameInput(), 'New')
    await userEvent.type(lastNameInput(), 'Name')
    await userEvent.click(completeButton())

    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce())
    expect(body).toEqual({ first_name: 'New', last_name: 'Name' })
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('New Name')
  })

  it('continues without saving when the name is already saved', async () => {
    let called = false
    server.use(
      http.get(`${API}/user/current`, () => HttpResponse.json(withProfileName('Saved', 'Name'))),
      http.patch(UPDATE_URL, () => {
        called = true
        return HttpResponse.json(withProfileName('Saved', 'Name'))
      }),
    )

    await renderStep()
    await waitFor(() => expect(firstNameInput()).toHaveValue('Saved'))
    await userEvent.click(completeButton())

    expect(onContinue).toHaveBeenCalledOnce()
    expect(called).toBe(false)
  })

  it('shows a validation error and does not continue', async () => {
    server.use(
      http.patch(UPDATE_URL, () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'first_name'], msg: 'First name can only contain letters' }] },
          { status: 422 },
        ),
      ),
    )

    await renderStep()
    await userEvent.type(firstNameInput(), 'Bad@Name')
    await userEvent.type(lastNameInput(), 'User')
    await userEvent.click(completeButton())

    expect(await screen.findByText('First name can only contain letters')).toBeInTheDocument()
    expect(firstNameInput()).toHaveClass('input-error')
    expect(lastNameInput()).not.toHaveClass('input-error')
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(http.patch(UPDATE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderStep()
    await userEvent.type(firstNameInput(), 'New')
    await userEvent.type(lastNameInput(), 'Name')
    await userEvent.click(completeButton())

    expect(await screen.findByText('Failed to save your name.')).toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
  })
})
