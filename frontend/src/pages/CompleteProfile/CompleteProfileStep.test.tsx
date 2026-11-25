import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { CompleteProfileRedirect, CompleteProfileStep } from './CompleteProfileStep'
import type { CompleteProfileState, CompleteProfileStepProps } from './steps'

// Two stand-in steps, so the flow itself is tested apart from any real step
vi.mock('./steps', () => {
  const step = (label: string) => ({ actionLabel, onContinue }: CompleteProfileStepProps) => (
    <button onClick={onContinue}>{`${label}: ${actionLabel}`}</button>
  )
  return {
    completeProfileSteps: [
      { slug: 'first', title: 'First step', subtitle: 'The first subtitle', content: step('First') },
      { slug: 'second', title: 'Second step', subtitle: 'The second subtitle', content: step('Second') },
    ],
    completeProfilePath: (slug: string) => `/complete-profile/${slug}`,
    firstCompleteProfilePath: '/complete-profile/first',
  }
})

function Destination() {
  const { pathname } = useLocation()
  return <p>Arrived at {pathname}</p>
}

/** Arrives the way AuthCallback and CompletedProfileRoute do, with router state. */
function renderFlow({ state, path = '/complete-profile' }: { state?: CompleteProfileState; path?: string } = {}) {
  renderWithProviders(
    <Routes>
      <Route path="/start" element={<Navigate to={path} state={state} />} />
      <Route path="/complete-profile" element={<CompleteProfileRedirect />} />
      <Route path="/complete-profile/:slug" element={<CompleteProfileStep />} />
      <Route path="*" element={<Destination />} />
    </Routes>,
    { route: '/start' },
  )
}

describe('CompleteProfileStep', () => {
  it('starts on the first step from the bare /complete-profile route', async () => {
    renderFlow()

    expect(await screen.findByRole('heading', { level: 1, name: 'First step' })).toBeInTheDocument()
    expect(screen.getByText('The first subtitle')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(document.title).toBe('First step')
  })

  it('labels the button Next until the final step, then Complete', async () => {
    renderFlow()

    await userEvent.click(await screen.findByRole('button', { name: 'First: Next' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Second step' })).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Second: Complete' })).toBeInTheDocument()
  })

  it('finishes at returnTo, carried across the steps', async () => {
    renderFlow({ state: { returnTo: '/privacy-policy' } })

    await userEvent.click(await screen.findByRole('button', { name: 'First: Next' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Second: Complete' }))

    expect(await screen.findByText('Arrived at /privacy-policy')).toBeInTheDocument()
  })

  it('defaults to /docs/getting-started when arriving without a returnTo', async () => {
    renderFlow({ path: '/complete-profile/second' })

    await userEvent.click(await screen.findByRole('button', { name: 'Second: Complete' }))

    expect(await screen.findByText('Arrived at /docs/getting-started')).toBeInTheDocument()
  })

  it('cannot be skipped', async () => {
    renderFlow()

    await screen.findByRole('heading', { level: 1, name: 'First step' })
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
  })

  it('shows not found for an unknown step', async () => {
    renderFlow({ path: '/complete-profile/unknown' })

    expect(await screen.findByText(/couldn't find what you were looking for/i)).toBeInTheDocument()
  })
})
