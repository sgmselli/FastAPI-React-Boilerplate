import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { DocsStep } from './DocsStep'

vi.mock('./steps', () => ({
  docsSteps: [
    { slug: 'first', title: 'First step', subtitle: 'The first subtitle', content: () => <p>First content</p> },
    { slug: 'second', title: 'Second step', subtitle: 'The second subtitle', content: () => <p>Second content</p> },
    { slug: 'third', title: 'Third step', subtitle: 'The third subtitle', content: () => <p>Third content</p> },
  ],
  docsPath: (slug: string) => `/docs/${slug}`,
}))

function renderStep(slug: string) {
  renderWithProviders(
    <Routes>
      <Route path="/docs/:slug" element={<DocsStep />} />
    </Routes>,
    { route: `/docs/${slug}` },
  )
}

describe('DocsStep', () => {
  it('renders the step title, subtitle and content', () => {
    renderStep('second')

    expect(screen.getByRole('heading', { level: 1, name: 'Second step' })).toBeInTheDocument()
    expect(screen.getByText('The second subtitle')).toBeInTheDocument()
    expect(screen.getByText('Second content')).toBeInTheDocument()
  })

  it('sets the page title to the step title', () => {
    renderStep('second')

    expect(document.title).toBe('Second step')
  })

  it('links to the previous and next steps', () => {
    renderStep('second')

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/docs/first')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/docs/third')
  })

  it('has no previous link on the first step', () => {
    renderStep('first')

    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/docs/second')
  })

  it('has no next link on the last step', () => {
    renderStep('third')

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/docs/second')
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows the not found content for an unknown step', () => {
    renderStep('missing')

    expect(screen.getByText(/couldn't find what you were looking for/i)).toBeInTheDocument()
  })
})
