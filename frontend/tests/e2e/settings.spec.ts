import { test, expect } from '@playwright/test';

import { completeProfile, expectOnAccountPage, loginUser, registerUser, uniqueEmail, verifyEmail } from './helpers/helpers';

test('user can delete their account from settings', async ({ page }) => {
  const email = uniqueEmail('delete');

  await registerUser(page, { email });
  await verifyEmail(page);
  await completeProfile(page, 'Delete User');
  await expectOnAccountPage(page, 'Delete User');

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete account button' }).click();

  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  const confirmButton = dialog.getByRole('button', { name: 'Confirm delete account button' });

  // The confirmation has to match exactly before it can be submitted
  await expect(confirmButton).toBeDisabled();
  await dialog.getByLabel('Delete confirmation input').fill('DELETE');
  await confirmButton.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();

  // Signed out - the cookies were cleared, so protected routes bounce
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);

  // And the account is really gone, not just signed out
  await loginUser(page, { email });
  await expect(page.getByText('Incorrect username or password.')).toBeVisible();
});
