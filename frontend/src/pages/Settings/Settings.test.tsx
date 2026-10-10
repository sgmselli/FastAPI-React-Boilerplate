import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import AuthorizedRoute from '../../components/ProtectedRoutes/AuthorizedRoute'
import { useAuth } from '../../contexts/auth'
import { API_URL as API } from '../../test/constants'
import { testUser } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { Settings } from './Settings'

const UPDATE_URL = `${API}/user/current`

/** Stands in for the navbar - anything else reading the session's user. */
function SessionUserName() {
  const { user } = useAuth()
  return <span data-testid="session-user-name">{user ? user.name : 'none'}</span>
}

async function renderSettings() {
  // Rendered behind AuthorizedRoute as in App.tsx - the profile form seeds its
  // input from the user once, so it relies on the guard holding it back until
  // the session has loaded.
  renderWithProviders(
    <>
      <SessionUserName />
      <Routes>
        <Route element={<AuthorizedRoute />}>
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>,
    { route: '/settings' },
  )
  await waitFor(() => expect(screen.getByLabelText('Name input')).toHaveValue(testUser.name))
}

async function replaceName(name: string) {
  const input = screen.getByLabelText('Name input')
  await userEvent.clear(input)
  if (name) await userEvent.type(input, name)
}

const saveButton = () => screen.getByRole('button', { name: 'Save profile button' })

describe('Settings page', () => {
  it('renders the Settings heading and the Profile section', async () => {
    await renderSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument()
  })

  it('sets the page title', async () => {
    await renderSettings()

    expect(document.title).toBe('Settings')
  })
})

describe('Profile settings', () => {
  it('prefills the name from the current user', async () => {
    await renderSettings()

    expect(screen.getByLabelText('Name input')).toHaveValue(testUser.name)
  })

  it('shows the current email in a disabled input', async () => {
    await renderSettings()

    const email = screen.getByLabelText('Email input')
    expect(email).toHaveValue(testUser.email)
    expect(email).toBeDisabled()
  })

  it('does not send the email when saving', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...testUser, name: 'New Name' })
      }),
    )

    await renderSettings()
    await replaceName('New Name')
    await userEvent.click(saveButton())

    await screen.findByRole('status')
    expect(body).not.toHaveProperty('email')
  })

  it('disables Save until the name changes', async () => {
    await renderSettings()

    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveClass('opacity-50')

    await replaceName('New Name')
    expect(saveButton()).toBeEnabled()
    expect(saveButton()).not.toHaveClass('opacity-50')

    await replaceName(testUser.name)
    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveClass('opacity-50')
  })

  it('sends the new name and shows a success toast', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.patch(UPDATE_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...testUser, name: 'New Name' })
      }),
    )

    await renderSettings()
    await replaceName('New Name')
    await userEvent.click(saveButton())

    expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been updated.')
    expect(body).toEqual({ name: 'New Name' })
    expect(screen.getByLabelText('Name input')).toHaveValue('New Name')
    expect(saveButton()).toBeDisabled()
  })

  it('updates the session user so the rest of the app shows the new name', async () => {
    await renderSettings()
    expect(screen.getByTestId('session-user-name')).toHaveTextContent(testUser.name)

    await replaceName('New Name')
    await userEvent.click(saveButton())

    await screen.findByRole('status')
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('New Name')
  })

  it('leaves the session user unchanged when the update fails', async () => {
    server.use(http.patch(UPDATE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderSettings()
    await replaceName('New Name')
    await userEvent.click(saveButton())

    await screen.findByText('Failed to update profile.')
    expect(screen.getByTestId('session-user-name')).toHaveTextContent(testUser.name)
  })

  it('shows the name the API saved, not the raw input', async () => {
    // The backend strips surrounding whitespace - the input should reflect that.
    await renderSettings()
    await replaceName('  Spaced Name  ')
    await userEvent.click(saveButton())

    await screen.findByRole('status')
    expect(screen.getByLabelText('Name input')).toHaveValue('Spaced Name')
  })

  it('shows field validation errors above the form and highlights the field', async () => {
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

    await renderSettings()
    await replaceName('Bad@Name')
    await userEvent.click(saveButton())

    const message = await screen.findByText(
      'Name can only contain letters, numbers, spaces, underscores, and hyphens',
    )
    const input = screen.getByLabelText('Name input')

    // Shown once, above the form - not repeated under the field
    expect(screen.getAllByText(message.textContent!)).toHaveLength(1)
    expect(message.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(input).toHaveClass('input-error')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('clears the error and highlight on a successful retry', async () => {
    server.use(
      http.patch(
        UPDATE_URL,
        () =>
          HttpResponse.json(
            { detail: [{ loc: ['body', 'name'], msg: 'Name is invalid' }] },
            { status: 422 },
          ),
        { once: true },
      ),
    )

    await renderSettings()
    await replaceName('Bad@Name')
    await userEvent.click(saveButton())
    await screen.findByText('Name is invalid')

    await replaceName('Good Name')
    await userEvent.click(saveButton())

    await screen.findByRole('status')
    expect(screen.queryByText('Name is invalid')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name input')).not.toHaveClass('input-error')
  })

  it('shows a string error detail from the API', async () => {
    server.use(
      http.patch(UPDATE_URL, () =>
        HttpResponse.json({ detail: 'Something went wrong.' }, { status: 400 }),
      ),
    )

    await renderSettings()
    await replaceName('New Name')
    await userEvent.click(saveButton())

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('falls back to a generic error when the API gives no detail', async () => {
    server.use(http.patch(UPDATE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderSettings()
    await replaceName('New Name')
    await userEvent.click(saveButton())

    expect(await screen.findByText('Failed to update profile.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
