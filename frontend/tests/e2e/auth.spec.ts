import { test, expect } from '@playwright/test';

import { completeProfile, expectOnAccountPage, loginUser, registerUser, skipProfile, TEST_PASSWORD, uniqueEmail, verifyEmail } from './helpers/helpers';

/**
 * Runs against the real stack (reverse proxy -> backend -> Postgres) started
 * by `docker compose up`. Nothing is mocked - see documentation/automated-testing.md.
 *
 * Each spec registers its own user with a unique email so runs stay isolated
 * without a seed or cleanup step.
 */

test('user can register and lands on their account page', async ({ page }) => {
  const email = uniqueEmail('register');

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'Register User');

  await expectOnAccountPage(page, 'Register User');
});

test('a new account must be verified before it can sign in', async ({ page }) => {
  const email = uniqueEmail('unverified');

  await registerUser(page, { email });
  await page.waitForURL('**/verify-email');
  await expect(page.getByText(email)).toBeVisible();

  // Signing in before entering the code brings them straight back to it
  await loginUser(page, { email });
  await page.waitForURL('**/verify-email');

  await verifyEmail(page);
  await completeProfile(page, 'Verified User');
  await expectOnAccountPage(page, 'Verified User');
});

test('a wrong verification code shows an error and does not sign in', async ({ page }) => {
  const email = uniqueEmail('wrongcode');

  await registerUser(page, { email });
  await verifyEmail(page, '123456');

  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email/);
});

test('skipping the profile step falls back to the email, and is offered again on next sign in', async ({ page }) => {
  const email = uniqueEmail('skip');

  await registerUser(page, { email });
  await verifyEmail(page);
  await skipProfile(page);

  await expectOnAccountPage(page, email);
  await expect(page.getByText('Please complete your profile.')).toBeVisible();

  await page.goto('/logout');
  await page.waitForURL('**/login');

  await loginUser(page, { email });

  // Still no name, so the optional step comes round again before the account page
  await completeProfile(page, 'Skip User');
  await expectOnAccountPage(page, 'Skip User');
  await expect(page.getByText('Please complete your profile.')).toBeHidden();
});

test('registered user can sign in', async ({ page }) => {
  const email = uniqueEmail('login');

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'Login User');
  await expectOnAccountPage(page, 'Login User');

  // Full round trip: sign out, then back in with the same credentials.
  await page.goto('/logout');
  await page.waitForURL('**/login');

  await loginUser(page, { email });

  await expectOnAccountPage(page, 'Login User');
});

test('signing in with the wrong password shows an error and stays on the login page', async ({ page }) => {
  const email = uniqueEmail('badpass');

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'Bad Pass User');
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

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'First User');
  await expectOnAccountPage(page, 'First User');

  await page.goto('/logout');
  await page.waitForURL('**/login');

  await registerUser(page, { email });

  await expect(page.getByText(/already taken/i)).toBeVisible();
});

test('logging out clears the session', async ({ page }) => {
  const email = uniqueEmail('logout');

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'Logout User');
  await expectOnAccountPage(page, 'Logout User');

  await page.goto('/logout');
  await page.waitForURL('**/login');

  // The protected route must now bounce, proving the cookies really were cleared
  // server-side rather than just the client forgetting.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);
});