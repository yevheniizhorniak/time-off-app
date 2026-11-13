import { expect, test } from '@playwright/test';

for (const osTheme of ['light', 'dark'] as const) {
  test(`overrides the ${osTheme} OS theme and preserves the selection across screens and reloads`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: osTheme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('color-scheme', osTheme);

    const theme = osTheme === 'light' ? 'dark' : 'light';
    const button = page.getByRole('button', { name: `Switch to ${theme} theme` });
    await button.focus();
    await button.press('Enter');
    await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
    await expect(page.getByLabel('Employee name')).toHaveCSS('color-scheme', theme);
    await expect(page.getByLabel('Employee name')).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(23, 36, 59)',
    );

    await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
    await expect(page.getByText('Enter your name.', { exact: true })).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(243, 94, 105)' : 'rgb(173, 0, 13)',
    );
    await page.getByLabel('Employee name').fill('Alex');
    await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
    await page.getByRole('link', { name: 'Request time off', exact: true }).click();
    await expect(page.getByLabel('Time off type')).toHaveCSS('color-scheme', theme);
    await expect(page.getByLabel('Notes (optional)')).toHaveCSS('color-scheme', theme);

    await page.reload();
    await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
    await page.getByRole('button', { name: 'Switch user', exact: true }).click();
    await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team requests', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Switch to ${osTheme} theme` })).toBeVisible();

    await page.setViewportSize({ width: 320, height: 740 });
    const toggle = page.getByRole('button', { name: `Switch to ${osTheme} theme` });
    await expect(toggle).toBeInViewport();
    const titleRight = await page
      .locator('ion-title:visible')
      .evaluate((element) => element.getBoundingClientRect().right);
    const toggleLeft = await toggle.evaluate((element) => element.getBoundingClientRect().left);
    expect(titleRight).toBeLessThanOrEqual(toggleLeft);
    await toggle.focus();
    await toggle.press('Space');
    await expect(page.locator('html')).toHaveCSS('color-scheme', osTheme);
    await page.reload();
    await expect(page.locator('html')).toHaveCSS('color-scheme', osTheme);
  });
}
