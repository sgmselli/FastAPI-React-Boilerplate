import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import { TEST_PICTURE_URL, withProfileName, withProfilePicture } from '../test/handlers'
import { deleteProfilePicture, updateCurrentUserProfile, uploadProfilePicture } from './userProfile'

describe('updateCurrentUserProfile', () => {
  it('sends a PATCH to the profile endpoint with only the name', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.patch(`${API}/profile/current`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(withProfileName('New Name'))
      }),
    )

    await updateCurrentUserProfile({ name: 'New Name' })

    expect(body).toEqual({ name: 'New Name' })
  })

  it('returns the updated user', async () => {
    const user = await updateCurrentUserProfile({ name: 'New Name' })
    expect(user).toEqual(withProfileName('New Name'))
  })

  it('rejects when the API returns a validation error', async () => {
    server.use(
      http.patch(`${API}/profile/current`, () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'name'], msg: 'Name is invalid' }] },
          { status: 422 },
        ),
      ),
    )

    await expect(updateCurrentUserProfile({ name: 'Bad@Name' })).rejects.toThrow()
  })
})

describe('uploadProfilePicture', () => {
  it('sends a multipart PUT with the file under "file"', async () => {
    let contentType: string | null = null
    let body = ''

    server.use(
      http.put(`${API}/profile/current/picture`, async ({ request }) => {
        contentType = request.headers.get('content-type')
        body = await request.text()
        return HttpResponse.json(withProfilePicture(TEST_PICTURE_URL))
      }),
    )

    await uploadProfilePicture(new File(['image-bytes'], 'me.png', { type: 'image/png' }))

    // Read as text rather than request.formData(): jsdom's File loses its name and
    // bytes crossing into MSW's request, so the parts can't be parsed back out
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
    expect(body).toContain('name="file"')
    expect(body).toContain('Content-Type: image/png')
  })

  it('returns the updated user', async () => {
    const user = await uploadProfilePicture(new File(['image-bytes'], 'me.png', { type: 'image/png' }))
    expect(user.profile.profile_picture_url).toBe(TEST_PICTURE_URL)
  })

  it('rejects when the API rejects the image', async () => {
    server.use(
      http.put(`${API}/profile/current/picture`, () =>
        HttpResponse.json({ detail: 'The uploaded file is not a valid image.' }, { status: 422 }),
      ),
    )

    await expect(uploadProfilePicture(new File(['x'], 'me.png', { type: 'image/png' }))).rejects.toThrow()
  })
})

describe('deleteProfilePicture', () => {
  it('sends a DELETE and returns the updated user', async () => {
    let called = false
    server.use(
      http.delete(`${API}/profile/current/picture`, () => {
        called = true
        return HttpResponse.json(withProfilePicture(null))
      }),
    )

    const user = await deleteProfilePicture()

    expect(called).toBe(true)
    expect(user.profile.profile_picture_url).toBeNull()
  })
})
