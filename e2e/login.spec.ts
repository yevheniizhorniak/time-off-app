import { expect, test } from '@playwright/test';

test('returns focus to the name field after an empty login so typing can continue', async ({ page }) => {
  await page.goto('/login');
  const name = page.getByRole('textbox', { name: 'Employee name' });

  await expect(name).not.toHaveAttribute('aria-invalid');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();

  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('Enter your name.');
  await expect(name).toBeFocused();

  // Continue typing without clicking the input again.
  await page.keyboard.type('Alex');
  await expect(name).toHaveValue('Alex');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeVisible();
});
