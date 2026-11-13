import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { formatDate, type TimeOffRequest } from '../../time-off-domain';

import RequestCalendar from './RequestCalendar';

const request: TimeOffRequest = {
  id: 'alex',
  employeeName: 'Alex',
  employeeKey: 'alex',
  startDate: '2026-11-12',
  endDate: '2026-11-14',
  leaveType: 'paid-time-off',
  note: '',
  status: 'pending',
  createdAt: '2026-11-10T10:00:00Z',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

test('counts pending and approved requests inclusively and excludes rejected requests from details', () => {
  render(
    <RequestCalendar
      requests={[
        request,
        { ...request, id: 'bob', employeeName: 'Bob', employeeKey: 'bob', status: 'approved' },
        { ...request, id: 'rejected', employeeName: 'Rejected employee', status: 'rejected' },
      ]}
    />,
  );

  const calendar = screen.getByRole('region', { name: 'Team calendar' });
  const start = within(calendar).getByRole('button', { name: `${formatDate('2026-11-12')}, 2 requests` });
  expect(start).toHaveAttribute('aria-pressed', 'true');
  expect(within(start).getByText('2')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('list')).toHaveTextContent('Alex');
  expect(screen.getByRole('list')).toHaveTextContent('Bob');
  expect(screen.getByRole('list')).not.toHaveTextContent('Rejected employee');

  fireEvent.click(screen.getByRole('button', { name: `${formatDate('2026-11-14')}, 2 requests` }));
  expect(screen.getByRole('heading', { name: formatDate('2026-11-14') })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: `${formatDate('2026-11-15')}, 0 requests` }));
  expect(screen.getByText('No time off on this day.')).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

test('updates badges and selected-day details when requests change', () => {
  const { rerender } = render(<RequestCalendar requests={[request]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(`${formatDate('2026-11-12')}, 1 request`);

  rerender(<RequestCalendar requests={[{ ...request, status: 'rejected' }]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(`${formatDate('2026-11-12')}, 0 requests`);
  expect(screen.getByText('No time off on this day.')).toBeInTheDocument();
});

test('selects the first day of each newly displayed month', () => {
  render(<RequestCalendar requests={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(`${formatDate('2026-12-01')}, 0 requests`);
  expect(screen.getByRole('heading', { name: formatDate('2026-12-01') })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(`${formatDate('2026-11-01')}, 0 requests`);
});
