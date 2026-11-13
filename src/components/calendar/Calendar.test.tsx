import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { dateKey } from '../../type-safety/date-key';

import { ToaCalendar, type ToaCalendarProps } from './Calendar';
import { formatDate } from './format-date';

const props: ToaCalendarProps = {
  month: new Date(2026, 10, 1, 12),
  selectedDate: '2026-11-12',
  onMonthChange: vi.fn(),
  onDateChange: vi.fn(),
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('emits date selections and waits for the parent to update selection', () => {
  const onDateChange = vi.fn();
  const { rerender } = render(<ToaCalendar {...props} onDateChange={onDateChange} />);
  const nextDay = screen.getByRole('button', { name: formatDate('2026-11-13') });

  fireEvent.click(nextDay);

  expect(onDateChange).toHaveBeenCalledExactlyOnceWith('2026-11-13');
  expect(nextDay).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(formatDate('2026-11-12'));

  rerender(<ToaCalendar {...props} selectedDate="2026-11-13" onDateChange={onDateChange} />);
  expect(nextDay).toHaveAttribute('aria-pressed', 'true');
});

test('emits adjacent months at local noon across years without changing selection or mutating props', () => {
  const month = new Date(2026, 11, 31, 23, 45);
  const onMonthChange = vi.fn();
  const onDateChange = vi.fn();
  const { rerender } = render(
    <ToaCalendar {...props} month={month} onMonthChange={onMonthChange} onDateChange={onDateChange} />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  const january = onMonthChange.mock.calls[0][0] as Date;
  expect(dateKey(january)).toBe('2027-01-01');
  expect(january.getHours()).toBe(12);
  expect(january.getMinutes()).toBe(0);
  expect(month.getMonth()).toBe(11);
  expect(month.getDate()).toBe(31);
  expect(onDateChange).not.toHaveBeenCalled();
  expect(screen.getByRole('heading')).toHaveTextContent(
    month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  rerender(<ToaCalendar {...props} month={january} onMonthChange={onMonthChange} onDateChange={onDateChange} />);
  expect(screen.getByRole('heading')).toHaveTextContent(
    january.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2026, 11, 1, 12));
  expect(onDateChange).not.toHaveBeenCalled();
});

test('aligns the first day under its Monday-first weekday and includes every day in leap months', () => {
  const { rerender } = render(<ToaCalendar {...props} />);
  const grid = screen.getByRole('group', { name: 'Choose a calendar date' });
  expect(
    Array.from(grid.children)
      .slice(0, 7)
      .map((day) => day.textContent),
  ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  expect(
    Array.from(grid.children)
      .slice(7, 13)
      .every((cell) => cell.textContent === ''),
  ).toBe(true);
  expect(grid.children[13]).toHaveAccessibleName(formatDate('2026-11-01'));
  expect(within(grid).getAllByRole('button')).toHaveLength(30);

  rerender(<ToaCalendar {...props} month={new Date(2028, 1, 1, 12)} />);
  expect(within(grid).getAllByRole('button')).toHaveLength(29);
  expect(within(grid).getAllByRole('button').at(-1)).toHaveAccessibleName(formatDate('2028-02-29'));
});

test('marks today independently of the selected date and announces month updates', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 14, 0, 30));
  render(<ToaCalendar {...props} />);

  expect(screen.getByRole('button', { name: formatDate('2026-11-14') })).toHaveAttribute('aria-current', 'date');
  const selected = screen.getByRole('button', { pressed: true });
  expect(selected).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('heading')).toHaveAttribute('aria-live', 'polite');
});

test('renders optional day annotations with consumer-provided accessible names', () => {
  render(
    <ToaCalendar
      {...props}
      getDayAriaLabel={(date) => `${formatDate(date)}, ${date === '2026-11-15' ? 'event scheduled' : 'no events'}`}
      renderDayContent={(date) => (date === '2026-11-15' ? <span aria-hidden="true">★</span> : null)}
    />,
  );

  const annotated = screen.getByRole('button', { name: `${formatDate('2026-11-15')}, event scheduled` });
  expect(within(annotated).getByText('★')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getAllByText('★')).toHaveLength(1);
});

test('disables consumer-specified days while preserving annotations and enabling other days', () => {
  const onDateChange = vi.fn();
  render(
    <ToaCalendar
      {...props}
      onDateChange={onDateChange}
      isDateDisabled={(date) => date === '2026-11-17'}
      getDayAriaLabel={(date) => `${formatDate(date)}${date === '2026-11-17' ? ', public holiday' : ''}`}
      renderDayContent={(date) => (date === '2026-11-17' ? <span>Holiday</span> : null)}
    />,
  );
  const holiday = screen.getByRole('button', { name: `${formatDate('2026-11-17')}, public holiday` });
  expect(holiday).toBeDisabled();
  expect(within(holiday).getByText('Holiday')).toBeInTheDocument();
  fireEvent.click(holiday);
  expect(onDateChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: formatDate('2026-11-18') }));
  expect(onDateChange).toHaveBeenCalledExactlyOnceWith('2026-11-18');
});
