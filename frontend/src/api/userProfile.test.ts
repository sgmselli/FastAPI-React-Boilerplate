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
        return HttpResponse.json(withProfileName('New', 'Name'))
      }),
    )

    await updateCurrentUserProfile({ first_name: 'New', last_name: 'Name' })

    expect(body).toEqual({ first_name: 'New', last_name: 'Name' })
  })

  it('returns the updated user', async () => {
    const user = await updateCurrentUserProfile({ first_name: 'New', last_name: 'Name' })
    expect(user).toEqual(withProfileName('New', 'Name'))
  })

  it('rejects when the API returns a validation error', async () => {
    server.use(
      http.patch(`${API}/profile/current`, () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'first_name'], msg: 'Name is invalid' }] },
          { status: 422 },
        ),
      ),
    )

    await expect(updateCurrentUserProfile({ first_name: 'Bad@Name', last_name: 'User' })).rejects.toThrow()
  })
})
