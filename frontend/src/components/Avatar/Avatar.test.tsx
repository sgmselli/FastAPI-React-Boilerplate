import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar, DEFAULT_AVATAR_SRC } from './Avatar'

const PICTURE_URL = 'https://bucket.test/picture.webp?signed'

describe('Avatar', () => {
  it('shows the profile picture when there is one', () => {
    render(<Avatar src={PICTURE_URL} alt="Profile picture" />)

    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute('src', PICTURE_URL)
  })

  it('shows the default image without a picture', () => {
    render(<Avatar src={null} alt="Profile picture" />)

    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute('src', DEFAULT_AVATAR_SRC)
  })

  it('falls back to the default image when the picture fails to load', () => {
    render(<Avatar src={PICTURE_URL} alt="Profile picture" />)
    const img = screen.getByRole('img', { name: 'Profile picture' })

    fireEvent.error(img)

    expect(img).toHaveAttribute('src', DEFAULT_AVATAR_SRC)
  })

  it('tries again when given a fresh URL after a failure', () => {
    const { rerender } = render(<Avatar src={PICTURE_URL} alt="Profile picture" />)
    fireEvent.error(screen.getByRole('img', { name: 'Profile picture' }))

    rerender(<Avatar src={`${PICTURE_URL}&fresh`} alt="Profile picture" />)

    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute('src', `${PICTURE_URL}&fresh`)
  })

  it('is decorative by default', () => {
    render(<Avatar src={null} />)

    expect(screen.getByRole('presentation')).toHaveAttribute('alt', '')
  })
})
