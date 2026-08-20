import { test, expect } from '@playwright/test';

import { expectOnAccountPage, loginUser, registerUser, uniqueEmail, TEST_PASSWORD } from './helpers/helpers';

/**
 * Runs against the real stack (reverse proxy -> backend -> Postgres) started
 * by `docker compose up`. Nothing is mocked - see documentation/automated-testing.md.
 *
 * Each spec registers its own user with a unique email so runs stay isolated
 * without a seed or cleanup step.
 */

test('user can register and lands on their account page', async ({ page }) => {
  const email = uniqueEmail('register');

  await registerUser(page, { name: 'Register User', email });

  await expectOnAccountPage(page, 'Register User');
});

test('registered user can sign in', async ({ page }) => {
  const email = uniqueEmail('login');

  await registerUser(page, { name: 'Login User', email });
  await expectOnAccountPage(page, 'Login User');

  // Full round trip: sign out, then back in with the same credentials.
  await page.goto('/logout');
  await page.waitForURL('**/login');

  await loginUser(page, { email });

  await expectOnAccountPage(page, 'Login User');
});

test('signing in with the wrong password shows an error and stays on the login page', async ({ page }) => {
  const email = uniqueEmail('badpass');

  await registerUser(page, { name: 'Bad Pass User', email });
  await page.goto('/logout');
  await page.waitForURL('**/login');

  await loginUser(page, { email, password: 'WrongPassword1!' });

  await expect(page.getByText('Incorrect username or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('signing in with an unknown email gives the same error as a wrong password', async ({ page }) => {
  // Identical messaging matters - a different error would leak which emails
  // are registered.
  await loginUser(page, { email: uniqueEmail('nobody'), password: TEST_PASSWORD });

  await expect(page.getByText('Incorrect username or password.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('registering with an already-used email is rejected', async ({ page }) => {
  const email = uniqueEmail('duplicate');

  await registerUser(page, { name: 'First User', email });
  await expectOnAccountPage(page, 'First User');

  await page.goto('/logout');
  await page.waitForURL('**/login');

  await registerUser(page, { name: 'Second User', email });

  await expect(page.getByText(/already taken/i)).toBeVisible();
});

test('logging out clears the session', async ({ page }) => {
  const email = uniqueEmail('logout');

  await registerUser(page, { name: 'Logout User', email });
  await expectOnAccountPage(page, 'Logout User');

  await page.goto('/logout');
  await page.waitForURL('**/login');

  // The protected route must now bounce, proving the cookies really were cleared
  // server-side rather than just the client forgetting.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});