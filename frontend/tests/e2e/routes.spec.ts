import { test, expect } from '@playwright/test';

import { expectOnAccountPage, registerUser, uniqueEmail } from './helpers/helpers';

test('unauthenticated visit to a protected route redirects to login', async ({ page }) => {
  await page.goto('/account');

  await expect(page).toHaveURL(/\/login/);
});

test('authenticated user visiting login is redirected away', async ({ page }) => {
  const email = uniqueEmail('unauthguard');

  await registerUser(page, { name: 'Guard User', email });
  await expectOnAccountPage(page, 'Guard User');

  // UnauthorisedRoute sends signed-in users to /auth/callback, which forwards
  // on to their intended destination.
  await page.goto('/login');

  await expect(page).not.toHaveURL(/\/login/);
});

test('landing page is reachable without signing in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
});

test('unknown routes render the not found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByText(/Sorry, we couldn't find what you were looking for/i),
  ).toBeVisible();
});

test('public policy pages are reachable without signing in', async ({ page }) => {
  await page.goto('/privacy-policy');
  await expect(page).toHaveURL(/privacy-policy/);

  await page.goto('/terms-and-conditions');
  await expect(page).toHaveURL(/terms-and-conditions/);
});