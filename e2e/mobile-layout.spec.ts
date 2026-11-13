import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+01:00'));
  await page.addInitScript(() => {
    localStorage.setItem('time-off-app.time-off-requests', JSON.stringify({ version: 2, timeOffRequests: [] }));
  });
  await page.goto('/login');
});

async function openRequestForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log in as employee', exact: true }).click();
  await page.getByRole('link', { name: 'Request time off', exact: true }).click();
}

async function expectNoHorizontalOverflow(container: Locator): Promise<void> {
  expect(await container.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
}

async function expectDayTarget(day: Locator, width: number): Promise<void> {
  const bounds = await day.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(width >= 360 ? 44 : 24);
  expect(bounds!.height).toBeGreaterThanOrEqual(52);
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 360, height: 740 },
  { width: 568, height: 240 },
]) {
  test(`fits calendars and keeps date selection reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openRequestForm(page);
    for (const label of ['Start date', 'End date']) {
      const trigger = page.getByRole('button', { name: label, exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: `Choose ${label.toLowerCase()}`, exact: true });
      await expectNoHorizontalOverflow(dialog);
      const bounds = await dialog.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      await dialog.getByRole('button', { name: 'Next month' }).click();
      await expect(dialog.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: 'Previous month' }).click();
      const day = dialog.getByRole('button', { name: 'Nov 13, 2026', exact: true });
      await expectDayTarget(day, viewport.width);
      await day.click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    await page.getByLabel('Time off type').selectOption('paid-time-off');
    await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
    await expect(page.getByRole('article')).toContainText('pending');
    const personalCalendar = page.getByRole('region', { name: 'Your calendar' });
    await expectNoHorizontalOverflow(personalCalendar);
    await expectNoHorizontalOverflow(page.locator('main.time-off-app'));
    const personalDay = personalCalendar.getByRole('button', { name: 'Nov 13, 2026, 1 time off request', exact: true });
    await expectDayTarget(personalDay, viewport.width);
    await personalDay.click();
    await expect(personalDay).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Switch user', exact: true }).click();
    await page.getByRole('button', { name: 'Log in as a supervisor', exact: true }).click();
    const calendar = page.getByRole('region', { name: 'Team calendar' });
    await expectNoHorizontalOverflow(calendar);
    await expectNoHorizontalOverflow(page.locator('main.time-off-app'));
    const day = calendar.getByRole('button', { name: 'Nov 13, 2026, 1 time off request', exact: true });
    await expectDayTarget(day, viewport.width);
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
  });
}

test('scrolls short confirmation dialogs and date dialogs to their actions and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 240 });
  await openRequestForm(page);
  for (const label of ['Start date', 'End date']) {
    const trigger = page.getByRole('button', { name: label, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: `Choose ${label.toLowerCase()}`, exact: true });
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeInViewport();
    await cancel.click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByRole('button', { name: 'Nov 13, 2026', exact: true }).click();
  }
  await page.getByLabel('Time off type').selectOption('paid-time-off');
  await page.getByRole('button', { name: 'Submit time off request', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Cancel time off request', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Cancel time off?', exact: true });
  await expectNoHorizontalOverflow(dialog);
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const keep = dialog.getByRole('button', { name: 'Keep time off request', exact: true });
  await keep.scrollIntoViewIfNeeded();
  await expect(keep).toBeInViewport();
  await keep.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  const confirm = dialog.getByRole('button', { name: 'Cancel time off', exact: true });
  await confirm.scrollIntoViewIfNeeded();
  await expect(confirm).toBeInViewport();
  await confirm.click();
  await expect(page.getByRole('article')).toContainText('cancelled');
});
