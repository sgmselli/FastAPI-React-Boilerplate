import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { parseApiError } from './apiErrors'

const FALLBACK = 'Something failed.'

function apiError(data: unknown, status = 400): AxiosError {
  const response = {
    data,
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('parseApiError', () => {
  it('returns a string detail as the message', () => {
    const result = parseApiError(apiError({ detail: 'Email is already taken.' }, 409), FALLBACK)

    expect(result).toEqual({ message: 'Email is already taken.', fieldErrors: {} })
  })

  it('maps validation errors to their fields and leaves the message null', () => {
    const result = parseApiError<'name' | 'password'>(
      apiError(
        {
          detail: [
            { loc: ['body', 'name'], msg: 'Name is invalid' },
            { loc: ['body', 'password'], msg: 'Password is too weak' },
          ],
        },
        422,
      ),
      FALLBACK,
    )

    expect(result).toEqual({
      message: null,
      fieldErrors: { name: 'Name is invalid', password: 'Password is too weak' },
    })
  })

  it('falls back when the response has no detail', () => {
    const result = parseApiError(apiError(null, 500), FALLBACK)

    expect(result).toEqual({ message: FALLBACK, fieldErrors: {} })
  })

  it('falls back for errors that did not come from a request', () => {
    const result = parseApiError(new Error('boom'), FALLBACK)

    expect(result).toEqual({ message: FALLBACK, fieldErrors: {} })
  })
})
