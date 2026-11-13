import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { formatDate } from '../../time-off-domain';
import type { TimeOffRequest } from '../../types/time-off-request';

import TimeOffRequestCalendar from './TimeOffRequestCalendar';

const timeOffRequest: TimeOffRequest = {
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

test('counts pending and approved time off requests on working days and excludes rejected time off requests from details', () => {
  render(
    <TimeOffRequestCalendar
      timeOffRequests={[
        timeOffRequest,
        { ...timeOffRequest, id: 'bob', employeeName: 'Bob', employeeKey: 'bob', status: 'approved' },
        { ...timeOffRequest, id: 'rejected', employeeName: 'Rejected employee', status: 'rejected' },
      ]}
    />,
  );

  const calendar = screen.getByRole('region', { name: 'Team calendar' });
  const start = within(calendar).getByRole('button', { name: `${formatDate('2026-11-12')}, 2 time off requests` });
  expect(start).toHaveAttribute('aria-pressed', 'true');
  expect(within(start).getByText('2')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('list')).toHaveTextContent('Alex');
  expect(screen.getByRole('list')).toHaveTextContent('Bob');
  expect(screen.getByRole('list')).not.toHaveTextContent('Rejected employee');

  fireEvent.click(screen.getByRole('button', { name: `${formatDate('2026-11-13')}, 2 time off requests` }));
  expect(screen.getByRole('heading', { name: formatDate('2026-11-13') })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  const emptyDay = screen.getByRole('button', { name: `${formatDate('2026-11-15')}, 0 time off requests` });
  expect(emptyDay).toBeDisabled();
  fireEvent.click(emptyDay);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-13')}, 2 time off requests`,
  );
  expect(screen.getByRole('heading', { name: formatDate('2026-11-13') })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('updates badges and selected-day details when time off requests change', () => {
  const { rerender } = render(<TimeOffRequestCalendar timeOffRequests={[timeOffRequest]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-12')}, 1 time off request`,
  );

  rerender(<TimeOffRequestCalendar timeOffRequests={[{ ...timeOffRequest, status: 'rejected' }]} />);
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: `${formatDate('2026-11-12')}, 0 time off requests` })).toBeDisabled();
  expect(screen.getByText('No time off this month.')).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();

  rerender(<TimeOffRequestCalendar timeOffRequests={[{ ...timeOffRequest, status: 'approved' }]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-12')}, 1 time off request`,
  );
  expect(screen.getByRole('list')).toHaveTextContent('approved');
});

test('selects the first available date on month changes and clears selection in empty months', () => {
  render(
    <TimeOffRequestCalendar
      timeOffRequests={[
        timeOffRequest,
        { ...timeOffRequest, id: 'earlier', startDate: '2026-11-02', endDate: '2026-11-02' },
        { ...timeOffRequest, id: 'december', startDate: '2026-12-24', endDate: '2026-12-28' },
      ]}
    />,
  );
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-12')}, 1 time off request`,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-12-28')}, 1 time off request`,
  );
  expect(screen.getByRole('heading', { name: formatDate('2026-12-28') })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('heading', { name: 'January 2027' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  expect(screen.getByText('No time off this month.')).toBeInTheDocument();
  const days = screen.getByRole('group', { name: 'Choose a calendar date' });
  expect(
    within(days)
      .getAllByRole('button')
      .every((day) => day.hasAttribute('disabled')),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-12-28')}, 1 time off request`,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-02')}, 1 time off request`,
  );
});

test('initially selects the first available date when today is empty', () => {
  render(
    <TimeOffRequestCalendar
      timeOffRequests={[
        { ...timeOffRequest, id: 'later', startDate: '2026-11-20', endDate: '2026-11-20' },
        { ...timeOffRequest, startDate: '2026-11-02', endDate: '2026-11-02' },
      ]}
    />,
  );
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-02')}, 1 time off request`,
  );
});

test('retains an available selection and falls back when its final time off request is rejected', () => {
  const later = { ...timeOffRequest, id: 'later', startDate: '2026-11-20', endDate: '2026-11-20' };
  const { rerender } = render(<TimeOffRequestCalendar timeOffRequests={[timeOffRequest, later]} />);
  fireEvent.click(screen.getByRole('button', { name: `${formatDate('2026-11-20')}, 1 time off request` }));
  rerender(<TimeOffRequestCalendar timeOffRequests={[{ ...timeOffRequest, status: 'approved' }, later]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-20')}, 1 time off request`,
  );

  rerender(<TimeOffRequestCalendar timeOffRequests={[timeOffRequest, { ...later, status: 'rejected' }]} />);
  expect(screen.getByRole('button', { name: `${formatDate('2026-11-20')}, 0 time off requests` })).toBeDisabled();
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-12')}, 1 time off request`,
  );
  expect(screen.getByRole('heading', { name: formatDate('2026-11-12') })).toBeInTheDocument();

  rerender(<TimeOffRequestCalendar timeOffRequests={[timeOffRequest, later]} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-12')}, 1 time off request`,
  );
});

test.each(['pending', 'approved'] as const)(
  'disables weekends and holidays inside %s time off request ranges',
  (status) => {
    render(<TimeOffRequestCalendar timeOffRequests={[{ ...timeOffRequest, endDate: '2026-11-18', status }]} />);
    for (const date of ['2026-11-14', '2026-11-15', '2026-11-17']) {
      const day = screen.getByRole('button', { name: `${formatDate(date)}, 0 time off requests` });
      expect(day).toBeDisabled();
      expect(day).toHaveTextContent(String(Number(date.slice(-2))));
      expect(within(day).queryByText('1')).not.toBeInTheDocument();
      fireEvent.click(day);
      expect(day).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('heading', { name: formatDate('2026-11-12') })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: `${formatDate('2026-11-18')}, 1 time off request` }));
    expect(screen.getByRole('heading', { name: formatDate('2026-11-18') })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent('Alex');
  },
);

test('falls back to a working day when today is a holiday covered by saved time off requests', () => {
  vi.setSystemTime(new Date(2026, 10, 17, 12));
  render(
    <TimeOffRequestCalendar
      timeOffRequests={[{ ...timeOffRequest, startDate: '2026-11-13', endDate: '2026-11-18' }]}
    />,
  );
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
    `${formatDate('2026-11-13')}, 1 time off request`,
  );
});

test('shows an empty month when saved time off requests only cover weekends and public holidays', () => {
  render(
    <TimeOffRequestCalendar
      timeOffRequests={[
        { ...timeOffRequest, startDate: '2026-11-14', endDate: '2026-11-15' },
        { ...timeOffRequest, id: 'holiday', startDate: '2026-11-17', endDate: '2026-11-17', status: 'approved' },
      ]}
    />,
  );
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.getByText('No time off this month.')).toBeInTheDocument();
  const days = screen.getByRole('group', { name: 'Choose a calendar date' });
  expect(
    within(days)
      .getAllByRole('button')
      .every((day) => day.hasAttribute('disabled')),
  ).toBe(true);
});
