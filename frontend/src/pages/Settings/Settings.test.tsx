import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import AuthorizedRoute from '../../components/ProtectedRoutes/AuthorizedRoute'
import { useAuth } from '../../contexts/auth'
import { API_URL as API } from '../../test/constants'
import { testUser } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor, within } from '../../test/renderWithProviders'
import { Settings } from './Settings'

const UPDATE_URL = `${API}/user/current`
const RESET_REQUEST_URL = `${API}/auth/password-reset/request`

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
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/login" element={<h1>Login page</h1>} />
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
  it('renders the Settings heading and each section', async () => {
    await renderSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Change Password' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Delete account' })).toBeInTheDocument()
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

describe('Password settings', () => {
  const changePasswordButton = () =>
    screen.getByRole('button', { name: 'Send me a link button' })

  it('emails a reset link to the signed in user', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(RESET_REQUEST_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'sent' }, { status: 202 })
      }),
    )

    await renderSettings()
    await userEvent.click(changePasswordButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      "We've emailed you a link to change your password.",
    )
    expect(body).toEqual({ email: testUser.email })
  })

  it('disables the button as soon as it is clicked and keeps it disabled once sent', async () => {
    let release: () => void = () => {}
    server.use(
      http.post(RESET_REQUEST_URL, async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ message: 'sent' }, { status: 202 })
      }),
    )

    await renderSettings()
    expect(changePasswordButton()).toBeEnabled()
    expect(changePasswordButton()).toHaveTextContent('Send me a link')

    await userEvent.click(changePasswordButton())

    await waitFor(() => expect(changePasswordButton()).toBeDisabled())
    expect(changePasswordButton()).toHaveClass('opacity-50')
    expect(changePasswordButton()).toHaveTextContent('Send me a link')

    release()
    await screen.findByRole('status')
    expect(changePasswordButton()).toBeDisabled()
    expect(changePasswordButton()).toHaveClass('opacity-50')
  })

  it('re-enables the button if sending fails so they can try again', async () => {
    server.use(http.post(RESET_REQUEST_URL, () => new HttpResponse(null, { status: 500 })))

    await renderSettings()
    await userEvent.click(changePasswordButton())

    await screen.findByText('Failed to send the email.')
    expect(changePasswordButton()).toBeEnabled()
    expect(changePasswordButton()).not.toHaveClass('opacity-50')
  })

  it('shows a string error detail above the section without a toast', async () => {
    server.use(
      http.post(RESET_REQUEST_URL, () =>
        HttpResponse.json({ detail: 'Something went wrong.' }, { status: 400 }),
      ),
    )

    await renderSettings()
    await userEvent.click(changePasswordButton())

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('falls back to a generic error when the API gives no detail', async () => {
    server.use(http.post(RESET_REQUEST_URL, () => new HttpResponse(null, { status: 500 })))

    await renderSettings()
    await userEvent.click(changePasswordButton())

    expect(await screen.findByText('Failed to send the email.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Delete account settings', () => {
  const DELETE_URL = `${API}/user/current`

  const openDialog = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Delete account button' }))
    return screen.getByRole('dialog', { name: 'Delete your account?' })
  }
  const confirmInput = () => screen.getByLabelText('Delete confirmation input')
  const confirmButton = () => screen.getByRole('button', { name: 'Confirm delete account button' })

  it('does not show the confirmation dialog until the button is clicked', async () => {
    await renderSettings()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await openDialog()
    expect(confirmInput()).toHaveFocus()
  })

  it('keeps the confirm button disabled until DELETE is typed exactly', async () => {
    await renderSettings()
    await openDialog()

    expect(confirmButton()).toBeDisabled()
    expect(confirmButton()).toHaveClass('opacity-50')

    await userEvent.type(confirmInput(), 'delete')
    expect(confirmButton()).toBeDisabled()

    await userEvent.clear(confirmInput())
    await userEvent.type(confirmInput(), 'DELETE')
    expect(confirmButton()).toBeEnabled()
    expect(confirmButton()).not.toHaveClass('opacity-50')
  })

  it('closes on Cancel, Escape and a backdrop click without deleting', async () => {
    let called = false
    server.use(
      http.delete(DELETE_URL, () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await renderSettings()

    await openDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel delete account button' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await openDialog()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const dialog = await openDialog()
    await userEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(called).toBe(false)
  })

  it('clears what was typed when the dialog is reopened', async () => {
    await renderSettings()
    await openDialog()
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel delete account button' }))

    await openDialog()

    expect(confirmInput()).toHaveValue('')
    expect(confirmButton()).toBeDisabled()
  })

  it('deletes the account, signs out and lands on the home page with a toast', async () => {
    let called = false
    server.use(
      http.delete(DELETE_URL, () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await renderSettings()
    await openDialog()
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(confirmButton())

    // Home, not /login - the protected route must be left before the user is cleared
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Login page' })).not.toBeInTheDocument()
    expect(called).toBe(true)
    expect(screen.getByTestId('session-user-name')).toHaveTextContent('none')
    expect(screen.getByRole('status')).toHaveTextContent('Your account has been deleted.')
  })

  it('submits with Enter once confirmed', async () => {
    await renderSettings()
    await openDialog()
    await userEvent.type(confirmInput(), 'DELETE{Enter}')

    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument()
  })

  it('disables the dialog while deleting', async () => {
    let release: () => void = () => {}
    server.use(
      http.delete(DELETE_URL, async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await renderSettings()
    await openDialog()
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(confirmButton())

    await waitFor(() => expect(confirmButton()).toBeDisabled())
    expect(confirmInput()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel delete account button' })).toBeDisabled()

    // Escape is ignored mid-request
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    release()
    await screen.findByRole('heading', { name: 'Home page' })
  })

  it('shows the error in the dialog and keeps the user signed in when deleting fails', async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderSettings()
    await openDialog()
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(confirmButton())

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Failed to delete your account.')).toBeInTheDocument()
    expect(confirmButton()).toBeEnabled()
    expect(screen.getByTestId('session-user-name')).toHaveTextContent(testUser.name)
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
