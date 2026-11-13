import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';

import { ToaToastProvider } from '../../components/toast/ToastProvider';
import { createSessionRepository } from '../../features/auth/browser-session-repository';
import SessionProvider from '../../features/auth/session-provider/SessionProvider';
import TimeOffProvider from '../../features/time-off/time-off-provider/TimeOffProvider';
import type { TimeOffRequest } from '../../features/time-off/types/time-off-request';
import type { TimeOffRequestRepository } from '../../features/time-off/types/time-off-request-repository';
import ThemeProvider from '../../theme/theme-provider/ThemeProvider';

import NewTimeOffRequest from './NewTimeOffRequest';

test('blocks submission while loading or after a read failure, and keeps draft input across retry', async () => {
  const pending = Promise.withResolvers<TimeOffRequest[]>();
  const repository = {
    load: vi.fn<TimeOffRequestRepository['load']>().mockReturnValueOnce(pending.promise).mockResolvedValue([]),
    submit: vi.fn<TimeOffRequestRepository['submit']>().mockResolvedValue([]),
    review: vi.fn<TimeOffRequestRepository['review']>().mockResolvedValue([]),
    cancel: vi.fn<TimeOffRequestRepository['cancel']>().mockResolvedValue([]),
    subscribe: vi.fn<TimeOffRequestRepository['subscribe']>(() => () => undefined),
  };
  const sessionRepository = createSessionRepository(() => sessionStorage);
  sessionRepository.save({ role: 'employee', name: 'Alex', employeeKey: 'alex' });
  render(
    <ThemeProvider>
      <ToaToastProvider>
        <SessionProvider repository={sessionRepository}>
          <TimeOffProvider repository={repository}>
            <MemoryRouter>
              <NewTimeOffRequest />
            </MemoryRouter>
          </TimeOffProvider>
        </SessionProvider>
      </ToaToastProvider>
    </ThemeProvider>,
  );
  const submit = screen.getByRole('button', { name: 'Submit time off request' });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Keep my draft' } });
  fireEvent.submit(submit.closest('form')!);
  expect(repository.submit).not.toHaveBeenCalled();
  expect(screen.queryByText('Check the highlighted fields.')).not.toBeInTheDocument();
  await act(async () => pending.reject(new Error('Offline')));
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(submit).toBeDisabled();
  fireEvent.submit(submit.closest('form')!);
  expect(repository.submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading time off requests' }));
  await waitFor(() => expect(submit).toBeEnabled());
  expect(screen.getByLabelText('Notes (optional)')).toHaveValue('Keep my draft');
});
