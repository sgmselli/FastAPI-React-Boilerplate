import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { useAuth } from '../../contexts/auth'
import { API_URL as API } from '../../test/constants'
import { TEST_PICTURE_URL, withProfilePicture } from '../../test/handlers'
import { server } from '../../test/setup'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { DEFAULT_AVATAR_SRC } from '../Avatar/Avatar'
import { MAX_PICTURE_BYTES, ProfilePictureInput } from './ProfilePictureInput'

const PICTURE_URL = `${API}/profile/current/picture`

/** Stands in for the navbar - anything else reading the session's user. */
function SessionPictureUrl() {
  const { user } = useAuth()
  return <span data-testid="session-picture-url">{user?.profile.profile_picture_url ?? 'none'}</span>
}

async function renderInput(props: React.ComponentProps<typeof ProfilePictureInput> = {}) {
  renderWithProviders(
    <>
      <SessionPictureUrl />
      <ProfilePictureInput {...props} />
    </>,
  )
  // The session user loads asynchronously; the upload button appears with it
  await screen.findByRole('button', { name: 'Upload profile picture button' })
}

const picture = () => screen.getByRole('img', { name: 'Profile picture' })
const fileInput = () => screen.getByLabelText('Profile picture input')
const png = () => new File(['image-bytes'], 'me.png', { type: 'image/png' })

describe('ProfilePictureInput', () => {
  it('shows the default image and an upload button without a picture', async () => {
    await renderInput()

    expect(picture()).toHaveAttribute('src', DEFAULT_AVATAR_SRC)
    expect(screen.getByRole('button', { name: 'Upload profile picture button' })).toHaveTextContent('Upload photo')
    expect(screen.queryByRole('button', { name: 'Remove profile picture button' })).not.toBeInTheDocument()
  })

  it('shows the current picture with change and remove options', async () => {
    server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))))

    await renderInput()

    await waitFor(() => expect(picture()).toHaveAttribute('src', TEST_PICTURE_URL))
    expect(screen.getByRole('button', { name: 'Upload profile picture button' })).toHaveTextContent('Change photo')
    expect(screen.getByRole('button', { name: 'Remove profile picture button' })).toBeInTheDocument()
  })

  it('only offers the allowed image types in the file picker', async () => {
    await renderInput()

    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })

  it('uploads the chosen file and updates the session user', async () => {
    const onUploaded = vi.fn()
    let called = false
    server.use(
      http.put(PICTURE_URL, () => {
        called = true
        return HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))
      }),
    )

    await renderInput({ onUploaded })
    await userEvent.upload(fileInput(), png())

    await waitFor(() => expect(picture()).toHaveAttribute('src', TEST_PICTURE_URL))
    expect(called).toBe(true)
    expect(screen.getByTestId('session-picture-url')).toHaveTextContent(TEST_PICTURE_URL)
    expect(onUploaded).toHaveBeenCalledOnce()
  })

  it('rejects a disallowed type without uploading', async () => {
    let called = false
    server.use(
      http.put(PICTURE_URL, () => {
        called = true
        return HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))
      }),
    )

    await renderInput()
    // Bypasses the accept filter, as a user can by choosing "All files"
    await userEvent.setup({ applyAccept: false }).upload(fileInput(), new File(['gif'], 'me.gif', { type: 'image/gif' }))

    expect(await screen.findByText('Image must be a JPEG, PNG or WebP.')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('rejects a file over 5MB without uploading', async () => {
    let called = false
    server.use(
      http.put(PICTURE_URL, () => {
        called = true
        return HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))
      }),
    )
    const big = png()
    Object.defineProperty(big, 'size', { value: MAX_PICTURE_BYTES + 1 })

    await renderInput()
    await userEvent.upload(fileInput(), big)

    expect(await screen.findByText('Image must be 5MB or smaller.')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it("shows the server's message when the upload is rejected", async () => {
    const onUploaded = vi.fn()
    server.use(
      http.put(PICTURE_URL, () =>
        HttpResponse.json({ detail: 'The uploaded file is not a valid image.' }, { status: 422 }),
      ),
    )

    await renderInput({ onUploaded })
    await userEvent.upload(fileInput(), png())

    expect(await screen.findByText('The uploaded file is not a valid image.')).toBeInTheDocument()
    expect(picture()).toHaveAttribute('src', DEFAULT_AVATAR_SRC)
    expect(onUploaded).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server sends no detail', async () => {
    server.use(http.put(PICTURE_URL, () => new HttpResponse(null, { status: 500 })))

    await renderInput()
    await userEvent.upload(fileInput(), png())

    expect(await screen.findByText('Failed to upload your profile picture.')).toBeInTheDocument()
  })

  it('removes the picture and updates the session user', async () => {
    const onRemoved = vi.fn()
    server.use(http.get(`${API}/user/current`, () => HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))))

    await renderInput({ onRemoved })
    await userEvent.click(await screen.findByRole('button', { name: 'Remove profile picture button' }))

    await waitFor(() => expect(picture()).toHaveAttribute('src', DEFAULT_AVATAR_SRC))
    expect(screen.getByTestId('session-picture-url')).toHaveTextContent('none')
    expect(screen.queryByRole('button', { name: 'Remove profile picture button' })).not.toBeInTheDocument()
    expect(onRemoved).toHaveBeenCalledOnce()
  })

  it('shows an error when removing fails', async () => {
    server.use(
      http.get(`${API}/user/current`, () => HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))),
      http.delete(PICTURE_URL, () => new HttpResponse(null, { status: 500 })),
    )

    await renderInput()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove profile picture button' }))

    expect(await screen.findByText('Failed to remove your profile picture.')).toBeInTheDocument()
    expect(picture()).toHaveAttribute('src', TEST_PICTURE_URL)
  })
})
