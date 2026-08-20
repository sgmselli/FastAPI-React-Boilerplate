import { expect, type Page } from '@playwright/test';

export const TEST_PASSWORD = 'Str0ng!Pass';

/**
 * Unique per call so specs stay idempotent against a database that persists
 * between runs - no seed fixtures to maintain, and no cleanup step.
 */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

export async function registerUser(
  page: Page,
  { name, email, password = TEST_PASSWORD }: { name: string; email: string; password?: string },
) {
  await page.goto('/register');

  await page.getByRole('textbox', { name: /Name input/i }).fill(name);
  await page.getByRole('textbox', { name: /Register email input/i }).fill(email);
  await page.getByRole('textbox', { name: /Register password input/i }).fill(password);
  await page.getByRole('textbox', { name: /Confirm password input/i }).fill(password);

  await page.getByRole('button', { name: /Create account button/i }).click();
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