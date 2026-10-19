import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { API_URL as API } from '../test/constants'
import { server } from '../test/setup'
import { withProfileName } from '../test/handlers'
import { updateCurrentUserProfile } from './userProfile'

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
