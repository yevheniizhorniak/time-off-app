import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+01:00'));
  await page.addInitScript(() => {
    if (localStorage.getItem('time-off-app.time-off-requests') === null) {
      localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests: [] }));
    }
  });
  await page.goto('/');
});

async function loginEmployee(page: Page, name = 'Alex'): Promise<void> {
  await page.getByLabel('Employee name').fill(name);
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeVisible();
}

async function selectTimeOffRequestDate(page: Page, label: string, date: string): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Choose ${label.toLowerCase()}` });
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  await dialog.getByRole('button', { name: formatted, exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
}

async function fillTimeOffRequest(page: Page, start = '2026-11-13', end = '2026-11-16'): Promise<void> {
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeHidden();
  await selectTimeOffRequestDate(page, 'Start date', start);
  await selectTimeOffRequestDate(page, 'End date', end);
  await page.getByLabel('Time off type').selectOption('paid-time-off');
}

async function switchUser(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Switch user', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Switch user', exact: true }).click();
  await expect(page.getByLabel('Employee name')).toBeVisible();
}

for (const path of ['/login', '/time-off-requests', '/time-off-requests/new', '/', '/unknown']) {
  test(`only shows login when visiting ${path} without a session`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Employee name')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your time off requests|Team time off requests/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start date', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Switch user', exact: true })).toHaveCount(0);
  });
}

test('preserves role guards and browser history for time off request URLs', async ({ page }) => {
  await loginEmployee(page);
  await page.goto('/time-off-requests/new');
  await expect(page).toHaveURL(/\/time-off-requests\/new$/);
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/time-off-requests\/new$/);
  await page.goto('/time-off-requests');
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/time-off-requests\/new$/);
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await page.goto('/requests/new');
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await switchUser(page);
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  for (const path of ['/time-off-requests', '/time-off-requests/new']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/time-off-requests$/);
    await expect(page.getByRole('heading', { name: 'Team time off requests', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start date', exact: true })).toHaveCount(0);
  }
});

test('restores access to protected pages on refresh and blocks browser Back after sign-out', async ({ page }) => {
  await loginEmployee(page);
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page).toHaveURL(/\/time-off-requests\/new$/);
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/time-off-requests\/new$/);
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeVisible();

  await switchUser(page);
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Employee name')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Your time off requests|Team time off requests/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toHaveCount(0);
});

test('submits time off requests, reviews both outcomes, restores sessions and isolates employees', async ({ page }) => {
  await loginEmployee(page);
  await fillTimeOffRequest(page);
  await page.getByLabel('Notes (optional)').fill('Family trip');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('pending');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your time off requests' })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Family trip');
  const personalCalendar = page.getByRole('region', { name: 'Your calendar' });
  await expect(
    personalCalendar.getByRole('button', { name: 'Nov 13, 2026, 1 time off request', exact: true }),
  ).toBeEnabled();
  await expect(personalCalendar.getByRole('list')).toContainText('Alex');

  await switchUser(page);
  await loginEmployee(page, 'Bob');
  await expect(page.getByRole('article')).toHaveCount(0);
  await fillTimeOffRequest(page);
  await page.getByLabel('Notes (optional)').fill('Appointment');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    personalCalendar.getByRole('button', { name: 'Nov 13, 2026, 1 time off request', exact: true }),
  ).toBeEnabled();
  await expect(personalCalendar.getByRole('list')).toContainText('Bob');
  await expect(personalCalendar.getByRole('list')).not.toContainText('Alex');
  await switchUser(page);

  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  const calendar = page.getByRole('region', { name: 'Team calendar' });
  await expect(calendar.getByRole('button', { pressed: true })).toHaveAccessibleName(
    'Nov 13, 2026, 2 time off requests',
  );
  await expect(calendar.getByRole('button', { name: 'Nov 12, 2026, 0 time off requests', exact: true })).toBeDisabled();
  await expect(calendar.getByRole('button', { name: 'Nov 14, 2026, 0 time off requests', exact: true })).toBeDisabled();
  await calendar.getByRole('button', { name: 'Nov 16, 2026, 2 time off requests', exact: true }).click();
  await expect(calendar.getByRole('button', { pressed: true })).toHaveAccessibleName(
    'Nov 16, 2026, 2 time off requests',
  );
  await calendar.getByRole('button', { name: 'Nov 13, 2026, 2 time off requests', exact: true }).click();
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
  await fillTimeOffRequest(page);
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
});

test('validates dates and disables booked dates while allowing a one-day time off request today', async ({ page }) => {
  await page.getByLabel('Employee name').fill('   ');
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await expect(page.getByText('Enter your name.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Employee name')).toBeFocused();
  await loginEmployee(page);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeFocused();
  await expect(page.getByLabel('Time off type')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Start date', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Nov 11, 2026', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await selectTimeOffRequestDate(page, 'End date', '2026-11-12');
  await selectTimeOffRequestDate(page, 'Start date', '2026-11-13');
  await page.getByLabel('Time off type').selectOption('sick-day');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByText('End date must be on or after the start date.')).toBeVisible();
  await selectTimeOffRequestDate(page, 'Start date', '2026-11-12');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Sick day');
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  for (const label of ['Start date', 'End date']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /Nov 12, 2026, already covered/ }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
  }
});

for (const status of ['pending', 'approved']) {
  test(`skips ${status} leave inside a new range and preserves exclusions after cancellation`, async ({ page }) => {
    await loginEmployee(page);
    await fillTimeOffRequest(page);
    await page.getByLabel('Notes (optional)').fill('Original leave');
    await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
    await expect(page.getByRole('article')).toContainText('Original leave');
    if (status === 'approved') {
      await switchUser(page);
      await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
      await page.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(page.getByRole('article')).toContainText('approved');
      await switchUser(page);
      await loginEmployee(page);
    }
    const employeeCalendar = page.getByRole('region', { name: 'Your calendar' });
    await employeeCalendar.getByRole('button', { name: 'Nov 16, 2026, 1 time off request', exact: true }).click();
    await expect(employeeCalendar.getByRole('heading', { name: 'Nov 16, 2026', exact: true })).toBeVisible();
    await expect(employeeCalendar.getByRole('list')).toContainText('Alex');
    await expect(employeeCalendar.getByRole('list')).toContainText(status);
    await fillTimeOffRequest(page, '2026-11-12', '2026-11-18');
    await page.getByLabel('Notes (optional)').fill('Spanning leave');
    await page.getByRole('button', { name: 'End date', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('Pending or approved time off', { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('button', { name: /Nov 13, 2026, already covered/ })
        .locator('.time-off-date-field__request-marker'),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /Nov 13, 2026, already covered/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /Nov 16, 2026, already covered/ }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
    const spanning = page.getByRole('article').filter({ hasText: 'Spanning leave' });
    await expect(spanning).toContainText('Excluded dates (already requested): Nov 13, 2026, Nov 16, 2026');
    await page.reload();
    await expect(spanning).toContainText('Excluded dates (already requested)');
    await page
      .getByRole('article')
      .filter({ hasText: 'Original leave' })
      .getByRole('button', { name: 'Cancel time off request', exact: true })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel time off', exact: true }).click();
    await expect(page.getByRole('article').filter({ hasText: 'Original leave' })).toContainText('cancelled');
    await switchUser(page);
    await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
    await expect(spanning).toContainText('Excluded dates (already requested)');
    await spanning.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(spanning).toContainText('approved');
    const calendar = page.getByRole('region', { name: 'Team calendar' });
    await expect(
      calendar.getByRole('button', { name: 'Nov 13, 2026, 0 time off requests', exact: true }),
    ).toBeDisabled();
    await expect(
      calendar.getByRole('button', { name: 'Nov 16, 2026, 0 time off requests', exact: true }),
    ).toBeDisabled();
    await expect(calendar.getByRole('button', { name: 'Nov 18, 2026, 1 time off request', exact: true })).toBeEnabled();
  });
}

test('preserves form input on failed saves and supports retry', async ({ page }) => {
  await loginEmployee(page);
  await fillTimeOffRequest(page);
  await page.getByLabel('Notes (optional)').fill('Keep this note');
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'true';
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'time-off-app.time-off-requests' && document.documentElement.dataset.failSave === 'true') {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your changes could not be saved');
  await expect(page.getByLabel('Notes (optional)')).toHaveValue('Keep this note');
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toHaveText('Nov 13, 2026');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('time-off-app.time-off-requests')!))).toEqual({
    version: 2,
    timeOffRequests: [],
  });
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'false';
  });
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Keep this note');
});

test('disables weekends and Czech holidays in calendar dialogs and allows ranges across them', async ({
  page,
}, testInfo) => {
  await loginEmployee(page);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeHidden();
  const start = page.getByRole('button', { name: 'Start date', exact: true });
  await start.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Choose start date' });
  await expect(dialog).toBeVisible();
  for (const day of [14, 15]) {
    await expect(dialog.getByRole('button', { name: `Nov ${day}, 2026, weekend`, exact: true })).toBeDisabled();
  }
  const holiday = dialog.getByRole('button', { name: /Nov 17, 2026, public holiday: Freedom and Democracy Day/ });
  await expect(holiday).toBeDisabled();
  await expect(holiday.locator('.time-off-date-field__holiday-marker')).toBeVisible();
  await expect(dialog.getByRole('list', { name: 'Public holidays this month' })).toContainText(
    'Freedom and Democracy Day',
  );
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('date-picker-light.png'), fullPage: true });
  const lightBackground = await holiday.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  const formPage = page.locator('.ion-page:has(> ion-content)').filter({
    has: page.getByRole('heading', { name: 'Request time off', exact: true }),
  });
  await formPage.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await start.click();
  await expect(holiday).toBeVisible();
  await expect
    .poll(() => holiday.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(lightBackground);
  await page.screenshot({ path: testInfo.outputPath('date-picker-dark.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Next month' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Dec 24, 2026, public holiday: Christmas Eve', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Next month' }).click();
  await expect(dialog.getByRole('heading', { name: 'January 2027' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Jan 1, 2027, public holiday: New Year's Day/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(start).toBeFocused();
  await expect(start).toHaveText('Choose a date');
  await selectTimeOffRequestDate(page, 'Start date', '2026-11-13');
  await page.getByRole('button', { name: 'End date', exact: true }).click();
  const endDialog = page.getByRole('dialog', { name: 'Choose end date' });
  await expect(endDialog.getByRole('button', { name: 'Nov 12, 2026', exact: true })).toBeDisabled();
  await endDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await selectTimeOffRequestDate(page, 'End date', '2026-11-18');
  await page.getByLabel('Time off type').selectOption('paid-time-off');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('pending');
  await switchUser(page);
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  const calendar = page.getByRole('region', { name: 'Team calendar' });
  for (const status of ['pending', 'approved']) {
    for (const day of [14, 15, 17]) {
      const excluded = calendar.getByRole('button', { name: `Nov ${day}, 2026, 0 time off requests`, exact: true });
      await expect(excluded).toBeDisabled();
      await expect(excluded.locator('.time-off-request-calendar__count')).toHaveCount(0);
    }
    for (const day of [13, 16, 18]) {
      await calendar.getByRole('button', { name: `Nov ${day}, 2026, 1 time off request`, exact: true }).click();
      await expect(calendar.getByRole('heading', { name: `Nov ${day}, 2026`, exact: true })).toBeVisible();
      await expect(calendar.getByRole('list')).toContainText(`Alex · Paid Time Off · ${status}`);
    }
    if (status === 'pending') {
      await page.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(page.getByRole('article')).toContainText('approved');
    }
  }
});

test('reports corrupt saved data, protects it from overwrite and reloads after repair', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('time-off-app.time-off-requests', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Time off requests could not be loaded');
  await loginEmployee(page);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your time off requests', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start date', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'End date', exact: true })).toBeDisabled();
  await page.getByLabel('Time off type').selectOption('paid-time-off');
  await page.getByLabel('Notes (optional)').fill('Retained after retry');
  await expect(page.getByRole('button', { name: 'Submit time off request', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('time-off-app.time-off-requests'))).toBe('{broken');
  await page.evaluate(() => localStorage.removeItem('time-off-app.time-off-requests'));
  await page.getByRole('button', { name: 'Retry loading time off requests' }).click();
  await expect(page.getByRole('button', { name: 'Submit time off request', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Notes (optional)')).toHaveValue('Retained after retry');
  await selectTimeOffRequestDate(page, 'Start date', '2026-11-13');
  await selectTimeOffRequestDate(page, 'End date', '2026-11-16');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('guards routes, navigates calendar across years and fits the viewport', async ({ page }, testInfo) => {
  await page.goto('/time-off-requests/new');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  await page.goto('/time-off-requests/new');
  await expect(page).toHaveURL(/\/time-off-requests$/);
  await expect(page.locator('html')).toHaveAttribute('mode', testInfo.project.name === 'Mobile Safari' ? 'ios' : 'md');
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('heading', { name: 'January 2027', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  const calendar = page.getByRole('region', { name: 'Team calendar' });
  await expect(calendar.getByRole('button', { name: 'Dec 31, 2026, 0 time off requests', exact: true })).toBeDisabled();
  await expect(calendar.getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(calendar.getByText('No time off this month.')).toBeVisible();
  expect(await page.locator('main.time-off-app').evaluate((main) => main.scrollWidth <= main.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.getByRole('heading', { name: 'Team time off requests' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('supervisor-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await page.screenshot({ path: testInfo.outputPath('supervisor-light.png'), fullPage: true });
});

test('supports keyboard login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Employee name').clear();
  await page.getByLabel('Employee name').focus();
  await page.keyboard.type('Keyboard user');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Log in as employee', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your time off requests' })).toBeVisible();
});

for (const status of ['pending', 'approved']) {
  test(`confirms cancellation of future ${status} leave and retains its history`, async ({ page }) => {
    await loginEmployee(page);
    await fillTimeOffRequest(page);
    await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
    if (status === 'approved') {
      await switchUser(page);
      await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
      await page.getByLabel('Decision note (optional)').fill('Enjoy your break');
      await page.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(page.getByRole('article')).toContainText('approved');
      await switchUser(page);
      await loginEmployee(page);
    }
    const cancel = page.getByRole('button', { name: 'Cancel time off request', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Cancel time off?', exact: true });
    await expect(cancel).toBeEnabled();
    const original = await page.evaluate(() => localStorage.getItem('time-off-app.time-off-requests'));
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toContainText('Nov 13, 2026 to Nov 16, 2026');
    await dialog.getByRole('button', { name: 'Keep time off request', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(cancel).toBeFocused();
    await cancel.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(cancel).toBeFocused();
    await cancel.click();
    await page.mouse.click(1, 1);
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('time-off-app.time-off-requests'))).toBe(original);

    await cancel.click();
    await dialog.getByRole('button', { name: 'Cancel time off', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('article')).toContainText('cancelled');
    await expect(page.getByRole('article')).toContainText('Cancelled Nov 13, 2026 to Nov 16, 2026 on Nov 12, 2026');
    await expect(cancel).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('article')).toContainText('cancelled');
    if (status === 'approved') await expect(page.getByRole('article')).toContainText('Enjoy your break');

    await switchUser(page);
    await loginEmployee(page, 'Bob');
    await expect(page.getByRole('article')).toHaveCount(0);
    await switchUser(page);
    await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reviewed and cancelled time off requests' })).toBeVisible();
    await expect(page.getByRole('article')).toContainText('cancelled');
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancel time off request', exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Team calendar' })).toContainText('No time off this month.');

    await switchUser(page);
    await loginEmployee(page);
    await fillTimeOffRequest(page);
    await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(2);
  });
}

test('partial cancellation retains today and allows a new time off request for the released dates', async ({
  page,
}) => {
  await loginEmployee(page);
  await fillTimeOffRequest(page, '2026-11-12', '2026-11-16');
  await page.getByLabel('Notes (optional)').fill('Original leave');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel time off request', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel time off?', exact: true });
  await expect(dialog).toContainText('Nov 13, 2026 to Nov 16, 2026');
  await expect(dialog).toContainText('Cancellation starts tomorrow.');
  await dialog.getByRole('button', { name: 'Cancel time off', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Cancelled Nov 13, 2026 to Nov 16, 2026');
  await expect(page.getByRole('article').locator('.time-off-request-status')).toHaveText('pending');
  await expect(page.getByRole('button', { name: 'Cancel time off request', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('article')).toContainText('Cancelled Nov 13, 2026 to Nov 16, 2026');

  await switchUser(page);
  await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
  const calendar = page.getByRole('region', { name: 'Team calendar' });
  await expect(calendar.getByRole('button', { name: 'Nov 12, 2026, 1 time off request', exact: true })).toBeEnabled();
  await expect(calendar.getByRole('button', { name: 'Nov 13, 2026, 0 time off requests', exact: true })).toBeDisabled();
  await expect(calendar.getByRole('button', { name: 'Nov 16, 2026, 0 time off requests', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('article').locator('.time-off-request-status')).toHaveText('approved');
  await expect(page.getByRole('article')).toContainText('Cancelled Nov 13, 2026 to Nov 16, 2026');

  await switchUser(page);
  await loginEmployee(page);
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
  await page.getByRole('button', { name: 'Start date', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Nov 12, 2026, already covered/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await selectTimeOffRequestDate(page, 'Start date', '2026-11-13');
  await selectTimeOffRequestDate(page, 'End date', '2026-11-16');
  await page.getByLabel('Time off type').selectOption('paid-time-off');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
});

test('failed cancellation preserves the time off request and allows confirmation and save to be retried', async ({
  page,
}) => {
  await loginEmployee(page);
  await fillTimeOffRequest(page);
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  const cancel = page.getByRole('button', { name: 'Cancel time off request', exact: true });
  await expect(cancel).toBeEnabled();
  const original = await page.evaluate(() => localStorage.getItem('time-off-app.time-off-requests'));
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'true';
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'time-off-app.time-off-requests' && document.documentElement.dataset.failSave === 'true') {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      original.call(this, key, value);
    };
  });
  const dialog = page.getByRole('dialog', { name: 'Cancel time off?', exact: true });
  await cancel.click();
  await dialog.getByRole('button', { name: 'Cancel time off', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('alert')).toContainText('Your changes could not be saved');
  await expect(page.getByRole('article').locator('.time-off-request-status')).toHaveText('pending');
  await expect(cancel).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('time-off-app.time-off-requests'))).toBe(original);
  await page.evaluate(() => {
    document.documentElement.dataset.failSave = 'false';
  });
  await cancel.click();
  await dialog.getByRole('button', { name: 'Cancel time off', exact: true }).click();
  await expect(page.getByRole('article').locator('.time-off-request-status')).toHaveText('cancelled');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
