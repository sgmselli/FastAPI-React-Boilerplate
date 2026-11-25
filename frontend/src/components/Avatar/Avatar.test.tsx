import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows the initials on the brand colour', () => {
    const { container } = render(<Avatar initials="JD" />)

    const avatar = container.querySelector('svg')
    expect(avatar).toHaveTextContent('JD')
    expect(avatar).toHaveClass('fastapi-color-bg')
  })

  it('is hidden from assistive technology, as the name is always shown beside it', () => {
    const { container } = render(<Avatar initials="JD" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
