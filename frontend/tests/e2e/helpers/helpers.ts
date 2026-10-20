import { expect, type Page } from '@playwright/test';

export const TEST_PASSWORD = 'Str0ng!Pass';

/**
 * Under APP_ENV=TEST the backend issues this as every verification code
 * (otp_fixed_code in TestSettings), since e2e has no inbox to read it from.
 */
export const TEST_OTP_CODE = '000000';

/**
 * Unique per call so specs stay idempotent against a database that persists
 * between runs - no seed fixtures to maintain, and no cleanup step.
 */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

export async function registerUser(
  page: Page,
  { email, password = TEST_PASSWORD }: { email: string; password?: string },
) {
  await page.goto('/register');

  await page.getByRole('textbox', { name: /Register email input/i }).fill(email);
  await page.getByRole('textbox', { name: /Register password input/i }).fill(password);
  await page.getByRole('textbox', { name: /Confirm password input/i }).fill(password);
  await page.getByRole('checkbox', { name: /Agree to policies checkbox/i }).check();

  await page.getByRole('button', { name: /Create account button/i }).click();
}

/**
 * Registering lands on the verify email page - enter the code to activate
 * the account and sign in.
 */
export async function verifyEmail(page: Page, code = TEST_OTP_CODE) {
  await page.waitForURL('**/verify-email');

  await page.getByRole('textbox', { name: /Verification code input/i }).fill(code);
  await page.getByRole('button', { name: /Verify email button/i }).click();
}

/**
 * A new account lands on the optional complete profile page - fill in the
 * name and carry on, or skip it.
 */
export async function completeProfile(page: Page, name: string) {
  await page.waitForURL('**/complete-profile');

  await page.getByRole('textbox', { name: /Name input/i }).fill(name);
  await page.getByRole('button', { name: /Save profile button/i }).click();
}

export async function skipProfile(page: Page) {
  await page.waitForURL('**/complete-profile');

  await page.getByRole('button', { name: /Skip profile button/i }).click();
}

export async function loginUser(
  page: Page,
  { email, password = TEST_PASSWORD }: { email: string; password?: string },
) {
  await page.goto('/login');

  await page.getByRole('textbox', { name: /Email address input/i }).fill(email);
  await page.getByRole('textbox', { name: /Password input/i }).fill(password);

  await page.getByRole('button', { name: /Sign in button/i }).click();
}

export async function expectOnAccountPage(page: Page, name: string) {
  await page.waitForURL('**/account');
  await expect(page.getByRole('heading', { level: 1, name: `Welcome, ${name}` })).toBeVisible();
}