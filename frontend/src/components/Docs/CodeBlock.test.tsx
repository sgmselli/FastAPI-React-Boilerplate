import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('renders each line of the code with its label', () => {
    renderWithProviders(<CodeBlock code={'cd backend\ncp .example.env .env'} label="terminal" />, { withAuth: false })

    expect(screen.getByText('terminal')).toBeInTheDocument()
    expect(screen.getByText('cd backend')).toBeInTheDocument()
    expect(screen.getByText('cp .example.env .env')).toBeInTheDocument()
  })

  it('copies the code to the clipboard and confirms it', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    renderWithProviders(<CodeBlock code={'\ncd backend\n'} />, { withAuth: false })

    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(writeText).toHaveBeenCalledWith('cd backend')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
