import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

import { ToaToastProvider } from '../../components/toast/ToastProvider';
import { createSessionRepository } from '../../features/auth/browser-session-repository';
import SessionProvider from '../../features/auth/session-provider/SessionProvider';
import type { Session } from '../../features/auth/types/session';
import TimeOffProvider from '../../features/time-off/time-off-provider/TimeOffProvider';
import type { TimeOffRequest } from '../../features/time-off/types/time-off-request';
import type { TimeOffRequestRepository } from '../../features/time-off/types/time-off-request-repository';
import ThemeProvider from '../../theme/theme-provider/ThemeProvider';

import TimeOffRequests from './TimeOffRequests';

const timeOffRequest: TimeOffRequest = {
  id: 'one',
  employeeKey: 'alex',
  employeeName: 'Alex',
  startDate: '2099-11-12',
  endDate: '2099-11-13',
  leaveType: 'sick-day',
  note: '',
  status: 'pending',
  createdAt: '2026-11-12T08:00:00Z',
};
const sessions: Session[] = [{ role: 'employee', name: 'Alex', employeeKey: 'alex' }, { role: 'supervisor' }];

beforeEach(() => {
  sessionStorage.clear();
});

function createRepository() {
  return {
    load: vi.fn<TimeOffRequestRepository['load']>().mockResolvedValue([]),
    submit: vi.fn<TimeOffRequestRepository['submit']>().mockResolvedValue([]),
    review: vi.fn<TimeOffRequestRepository['review']>().mockResolvedValue([]),
    cancel: vi.fn<TimeOffRequestRepository['cancel']>().mockResolvedValue([]),
    subscribe: vi.fn<TimeOffRequestRepository['subscribe']>(() => () => undefined),
  };
}

function renderRequests(session: Session, repository: TimeOffRequestRepository): void {
  const sessionRepository = createSessionRepository(() => sessionStorage);
  sessionRepository.save(session);
  render(
    <ThemeProvider>
      <ToaToastProvider>
        <SessionProvider repository={sessionRepository}>
          <TimeOffProvider repository={repository}>
            <MemoryRouter>
              <TimeOffRequests />
            </MemoryRouter>
          </TimeOffProvider>
        </SessionProvider>
      </ToaToastProvider>
    </ThemeProvider>,
  );
}

test.each(sessions)('hides premature empty states and the calendar while loading for $role', async (session) => {
  const repository = createRepository();
  const pending = Promise.withResolvers<TimeOffRequest[]>();
  repository.load.mockReturnValue(pending.promise);
  renderRequests(session, repository);
  expect(screen.getByRole('status')).toHaveTextContent('Loading time off requests');
  expect(screen.queryAllByText('No time off requests yet.')).toHaveLength(0);
  const title = session.role === 'employee' ? 'Your calendar' : 'Team calendar';
  expect(screen.queryByRole('region', { name: title })).not.toBeInTheDocument();
  await act(async () => pending.resolve([]));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getAllByText('No time off requests yet.')).toHaveLength(2);
  expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
});

test.each(sessions)(
  'keeps the calendar hidden after an initial failure and exposes retry for $role',
  async (session) => {
    const repository = createRepository();
    repository.load.mockRejectedValueOnce(new Error('Offline'));
    renderRequests(session, repository);
    const title = session.role === 'employee' ? 'Your calendar' : 'Team calendar';
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryAllByText('No time off requests yet.')).toHaveLength(0);
    expect(screen.queryByRole('region', { name: title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading time off requests' }));
    expect(await screen.findByRole('region', { name: title })).toBeInTheDocument();
  },
);

test.each(sessions)('filters calendar counts and details to the viewer for $role', async (session) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 12));
  try {
    const repository = createRepository();
    const alex = { ...timeOffRequest, startDate: '2026-11-12', endDate: '2026-11-13' };
    repository.load.mockResolvedValue([
      alex,
      { ...alex, id: 'bob', employeeKey: 'bob', employeeName: 'Bob', endDate: '2026-11-16' },
    ]);
    renderRequests(session, repository);
    const calendar = within(
      await screen.findByRole('region', { name: session.role === 'employee' ? 'Your calendar' : 'Team calendar' }),
    );
    const count = session.role === 'employee' ? '1 time off request' : '2 time off requests';
    expect(calendar.getByRole('button', { name: `Nov 12, 2026, ${count}` })).toBeEnabled();
    expect(calendar.getByRole('list')).toHaveTextContent('Alex');
    if (session.role === 'employee') {
      expect(calendar.getByRole('list')).not.toHaveTextContent('Bob');
      expect(calendar.getByRole('button', { name: 'Nov 16, 2026, 0 time off requests' })).toBeDisabled();
    } else {
      expect(calendar.getByRole('list')).toHaveTextContent('Bob');
    }
    fireEvent.click(calendar.getByRole('button', { name: `Nov 13, 2026, ${count}` }));
    expect(calendar.getByRole('heading', { name: 'Nov 13, 2026' })).toBeInTheDocument();
    expect(calendar.getByRole('list')).toHaveTextContent('Alex');
    expect(calendar.getByRole('list')).toHaveTextContent('pending');
    fireEvent.click(calendar.getByRole('button', { name: 'Next month' }));
    expect(calendar.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    expect(calendar.getByText('No time off this month.')).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test.each(sessions)(
  'preserves requests and disables mutations through refresh failure and retry for $role',
  async (session) => {
    const repository = createRepository();
    repository.load.mockResolvedValueOnce([timeOffRequest]);
    renderRequests(session, repository);
    await screen.findByRole('article');
    const actionName = session.role === 'employee' ? 'Cancel time off request' : 'Approve';
    expect(screen.getByRole('button', { name: actionName })).toBeEnabled();
    const refresh = Promise.withResolvers<TimeOffRequest[]>();
    repository.load.mockReturnValueOnce(refresh.promise).mockResolvedValue([timeOffRequest]);
    act(() => repository.subscribe.mock.calls[0][0]());
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: actionName })).toBeDisabled();
    if (session.role === 'supervisor') {
      expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
      expect(screen.getByRole('region', { name: 'Team calendar' })).toBeInTheDocument();
    }
    await act(async () => refresh.reject(new Error('Offline')));
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: actionName })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading time off requests' }));
    await waitFor(() => expect(screen.getByRole('button', { name: actionName })).toBeEnabled());
    expect(repository.cancel).not.toHaveBeenCalled();
    expect(repository.review).not.toHaveBeenCalled();
  },
);
