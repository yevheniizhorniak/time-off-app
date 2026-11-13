import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { formatDate } from '../../../../components/calendar/format-date';

import TimeOffDateField from './TimeOffDateField';

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 12));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('disables past dates, weekends and named holidays, then returns focus after a valid selection', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <TimeOffDateField label="Start date" value="" min="2026-11-01" required onChange={onChange} />,
  );
  const trigger = screen.getByRole('button', { name: 'Start date' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Choose start date' });
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: formatDate('2026-11-11') })).toBeDisabled();
  for (const date of ['2026-11-14', '2026-11-15']) {
    const weekend = within(dialog).getByRole('button', { name: `${formatDate(date)}, weekend` });
    expect(weekend).toBeDisabled();
    fireEvent.click(weekend);
  }
  const holiday = within(dialog).getByRole('button', { name: /public holiday: Freedom and Democracy Day/ });
  expect(holiday).toBeDisabled();
  fireEvent.click(holiday);
  expect(onChange).not.toHaveBeenCalled();
  expect(within(dialog).getByRole('list', { name: 'Public holidays this month' })).toHaveTextContent(
    'Freedom and Democracy Day',
  );
  fireEvent.click(within(dialog).getByRole('button', { name: formatDate('2026-11-18') }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-11-18');
  expect(dialog).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();
  rerender(<TimeOffDateField label="Start date" value="2026-11-18" min="2026-11-01" onChange={onChange} />);
  expect(trigger).toHaveTextContent(formatDate('2026-11-18'));
});

test('enforces the minimum end date and opens on the selected month on every visit', () => {
  render(<TimeOffDateField label="End date" value="2026-12-23" min="2026-11-18" onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'End date' }));
  expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: formatDate('2026-12-23') })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { name: formatDate('2026-11-16') })).toBeDisabled();
  expect(screen.getByRole('button', { name: formatDate('2026-11-18') })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'End date' }));
  expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('heading', { name: 'January 2027' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /public holiday: New Year's Day/ })).toBeDisabled();
});

test('Cancel, Escape and backdrop dismissal preserve the value and restore trigger focus', () => {
  const onChange = vi.fn();
  render(<TimeOffDateField label="Start date" value="2026-11-13" min="2026-11-12" onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Start date' });
  trigger.focus();
  fireEvent.click(trigger);
  const cancelButton = screen.getByRole('button', { name: 'Cancel' });
  expect(cancelButton).toHaveClass('toa-button', 'toa-button--secondary');
  fireEvent.click(cancelButton);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog');
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 300,
    top: 100,
    bottom: 400,
  } as DOMRect);
  fireEvent.click(dialog, { clientX: 200, clientY: 200 });
  expect(dialog).toHaveAttribute('open');
  fireEvent.click(dialog, { clientX: 50, clientY: 200 });
  expect(dialog).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
  expect(trigger).toHaveTextContent(formatDate('2026-11-13'));
});

test('associates validation errors and disables the trigger while busy', () => {
  const { rerender } = render(
    <TimeOffDateField
      label="Start date"
      value=""
      min="2026-11-12"
      error="Enter a valid start date."
      onChange={vi.fn()}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'Start date' });
  expect(trigger).toHaveAttribute('aria-invalid', 'true');
  expect(trigger).toHaveAccessibleDescription(/Enter a valid start date\./);
  rerender(<TimeOffDateField label="Start date" value="" min="2026-11-12" disabled onChange={vi.fn()} />);
  expect(trigger).toBeDisabled();
  fireEvent.click(trigger);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('explains additional unavailable dates and updates availability while open', () => {
  const onChange = vi.fn();
  const props = { label: 'Start date', value: '', min: '2026-11-12', onChange };
  const { rerender } = render(<TimeOffDateField {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start date' }));
  expect(screen.getByRole('button', { name: formatDate('2026-11-13') })).toBeEnabled();
  rerender(
    <TimeOffDateField
      {...props}
      getDateUnavailableReason={(date) => (date === '2026-11-13' ? 'already requested' : undefined)}
    />,
  );
  const booked = screen.getByRole('button', { name: `${formatDate('2026-11-13')}, already requested` });
  expect(booked).toBeDisabled();
  expect(booked.querySelector('.time-off-date-field__request-marker')).toBeInTheDocument();
  expect(screen.getByText('Pending or approved time off')).toBeVisible();
  fireEvent.click(booked);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  rerender(<TimeOffDateField {...props} />);
  expect(
    screen
      .getByRole('button', { name: formatDate('2026-11-13') })
      .querySelector('.time-off-date-field__request-marker'),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: formatDate('2026-11-13') }));
  expect(onChange).toHaveBeenCalledWith('2026-11-13');
});
