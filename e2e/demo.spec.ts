import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+01:00'));
  await page.goto('/login');
});

test('demonstrates past requests, supervisor review, persistence and employee isolation', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Employee name' });
  await expect(name).toHaveValue('testusr');
  await expect(page).toHaveURL(/\/login$/);
  await name.clear();
  await expect(name).toHaveAttribute('placeholder', 'enter testusr for prepopulated data');
  await name.fill('testusr');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();

  const past = page.locator('section.time-off-request-group').filter({
    has: page.getByRole('heading', { name: 'Past time off requests', exact: true }),
  });
  const upcoming = page.locator('section.time-off-request-group').filter({
    has: page.getByRole('heading', { name: 'Upcoming and current', exact: true }),
  });
  await expect(past.getByRole('article')).toHaveCount(2);
  await expect(past).toContainText('approved');
  await expect(past).toContainText('rejected');
  await expect(upcoming.getByRole('article')).toHaveCount(1);
  await expect(upcoming).toContainText('pending');

  await page.getByRole('button', { name: 'Switch user', exact: true }).click();
  await expect(name).toHaveValue('testusr');
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByLabel('Decision note (optional)').fill('Approved demo day');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Approved demo day' })).toContainText('approved');
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').filter({ hasText: 'Approved demo day' })).toContainText('approved');

  await page.getByRole('button', { name: 'Switch user', exact: true }).click();
  await name.fill('Alex');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch user', exact: true }).click();
  await expect(name).toHaveValue('testusr');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(upcoming).toContainText('Approved demo day');
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('makes demo data available to supervisors before any employee login', async ({ page }) => {
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').filter({ hasText: 'testusr' })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
});
