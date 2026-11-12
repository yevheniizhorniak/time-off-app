import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+01:00'));
  await page.goto('/');
});

async function loginEmployee(page: Page, name = 'Alex'): Promise<void> {
  await page.getByLabel('Employee name').fill(name);
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your requests', exact: true })).toBeVisible();
}

async function fillRequest(page: Page, start = '2026-11-13', end = '2026-11-15'): Promise<void> {
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your requests', exact: true })).toBeHidden();
  await page.getByLabel('Start date').fill(start);
  await page.getByLabel('End date').fill(end);
  await page.getByLabel('Time off type').selectOption('paid-time-off');
}

async function switchUser(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Switch user', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Switch user', exact: true }).click();
  await expect(page.getByLabel('Employee name')).toBeVisible();
}

for (const path of ['/login', '/requests', '/requests/new', '/home', '/', '/unknown']) {
  test(`only shows login when visiting ${path} without a session`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Employee name')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your requests|Team requests/ })).toHaveCount(0);
    await expect(page.getByLabel('Start date')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Switch user', exact: true })).toHaveCount(0);
  });
}

test('restores access to protected pages on refresh and blocks browser Back after sign-out', async ({ page }) => {
  await loginEmployee(page);
  await expect(page).toHaveURL(/\/requests$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/requests$/);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page).toHaveURL(/\/requests\/new$/);
  await expect(page.getByLabel('Start date')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/requests\/new$/);
  await expect(page.getByLabel('Start date')).toBeVisible();

  await switchUser(page);
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Employee name')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Your requests|Team requests/ })).toHaveCount(0);
  await expect(page.getByLabel('Start date')).toHaveCount(0);
});

test('submits requests, reviews both outcomes, restores sessions and isolates employees', async ({ page }) => {
  await loginEmployee(page);
  await fillRequest(page);
  await page.getByLabel('Notes (optional)').fill('Family trip');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('pending');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Family trip');

  await switchUser(page);
  await loginEmployee(page, 'Bob');
  await expect(page.getByRole('article')).toHaveCount(0);
  await fillRequest(page);
  await page.getByLabel('Notes (optional)').fill('Appointment');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await switchUser(page);

  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Nov 13, 2026, 2 requests', exact: true }).click();
  const calendar = page.getByRole('region', { name: 'Team calendar' });
  await expect(calendar.getByRole('list')).toContainText('Alex');
  await expect(calendar.getByRole('list')).toContainText('Bob');

  const alex = page.getByRole('article').filter({ hasText: 'Family trip' });
  await alex.getByLabel('Decision note (optional)').fill('Enjoy your break');
  await alex.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(alex).toContainText('approved');
  const bob = page.getByRole('article').filter({ hasText: 'Appointment' });
  await bob.getByLabel('Decision note (optional)').fill('Please choose another week');
  await bob.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(bob).toContainText('rejected');
  await expect(calendar.getByRole('list')).not.toContainText('Bob');

  await switchUser(page);
  await loginEmployee(page, '  aLeX  ');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('approved');
  await expect(page.getByRole('article')).toContainText('Enjoy your break');
  await expect(page.getByRole('article')).not.toContainText('Appointment');
  await switchUser(page);
  await loginEmployee(page, 'Bob');
  await expect(page.getByRole('article')).toContainText('Please choose another week');
  await fillRequest(page);
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
});

test('validates dates and inclusive overlaps while allowing a one-day request today', async ({ page }) => {
  await page.getByLabel('Employee name').fill('   ');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(page.getByText('Enter your name.', { exact: true })).toBeVisible();
  await loginEmployee(page);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByLabel('Start date')).toBeFocused();
  await expect(page.getByLabel('Time off type')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Start date').fill('2026-11-11');
  await page.getByLabel('End date').fill('2026-11-11');
  await page.getByLabel('Time off type').selectOption('sick-day');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByText('Start date must be today or later.')).toBeVisible();
  await page.getByLabel('Start date').fill('2026-11-13');
  await page.getByLabel('End date').fill('2026-11-12');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByText('End date must be on or after the start date.')).toBeVisible();
  await page.getByLabel('Start date').fill('2026-11-12');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Sick day');
  await fillRequest(page, '2026-11-12', '2026-11-13');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByText('These dates overlap one of your pending or approved requests.')).toBeVisible();
  await expect(page.getByLabel('Start date')).toHaveValue('2026-11-12');
});

test('preserves form input on failed saves and supports retry', async ({ page }) => {
  await loginEmployee(page);
  await fillRequest(page);
  await page.getByLabel('Notes (optional)').fill('Keep this note');
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'true';
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'time-off-app.requests' && document.documentElement.dataset.failSave === 'true') {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your changes could not be saved');
  await expect(page.getByLabel('Notes (optional)')).toHaveValue('Keep this note');
  await expect(page.getByLabel('Start date')).toHaveValue('2026-11-13');
  expect(await page.evaluate(() => localStorage.getItem('time-off-app.requests'))).toBeNull();
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'false';
  });
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Keep this note');
});

test('reports corrupt saved data, protects it from overwrite and reloads after repair', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('time-off-app.requests', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Saved requests could not be read');
  await loginEmployee(page);
  await fillRequest(page);
  await expect(page.getByRole('button', { name: 'Submit request', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('time-off-app.requests'))).toBe('{broken');
  await page.evaluate(() => localStorage.removeItem('time-off-app.requests'));
  await page.getByRole('button', { name: 'Retry loading requests' }).click();
  await expect(page.getByRole('button', { name: 'Submit request', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('guards routes, navigates calendar across years and fits the viewport', async ({ page }, testInfo) => {
  await page.goto('/requests/new');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await page.goto('/requests/new');
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.locator('html')).toHaveAttribute('mode', testInfo.project.name === 'iOS Chrome' ? 'ios' : 'md');
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('heading', { name: 'January 2027', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dec 31, 2026, 0 requests', exact: true }).click();
  await expect(page.getByText('No time off on this day.')).toBeVisible();
  expect(await page.locator('main.time-off-app').evaluate((main) => main.scrollWidth <= main.clientWidth)).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.getByRole('heading', { name: 'Team requests' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('supervisor-dark.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.screenshot({ path: testInfo.outputPath('supervisor-light.png'), fullPage: true });
});

test('supports keyboard login and the legacy home entry point', async ({ page }) => {
  await page.goto('/home');
  await page.getByLabel('Employee name').focus();
  await page.keyboard.type('Keyboard user');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Log in as employee', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
  await page.goto('/home');
  await expect(page).toHaveURL(/\/requests$/);
});
