import { useRef, useState, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../components/toast/useToast';
import { useSession } from '../../features/auth/useSession';
import { useTimeOff } from '../../features/time-off/hooks/useTimeOff';
import { employeeHasTimeOffOnDate, validateTimeOffRequest } from '../../features/time-off/time-off-domain';
import type { TimeOffRequestDraft } from '../../features/time-off/types/time-off-request-draft';
import {
  TimeOffRequestValidationError,
  type TimeOffRequestErrors,
} from '../../features/time-off/types/time-off-request-errors';

type NewTimeOffRequestForm = {
  formRef: RefObject<HTMLFormElement | null>;
  draft: TimeOffRequestDraft;
  setDraft: Dispatch<SetStateAction<TimeOffRequestDraft>>;
  errors: TimeOffRequestErrors;
  error: string;
  busy: boolean;
  loading: boolean;
  loadError: string | null;
  getDateUnavailableReason: (date: string) => string | undefined;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/** Validates and saves time off requests, reports failures, and navigates on success. */
export function useNewTimeOffRequestForm(): NewTimeOffRequestForm {
  const { session } = useSession();
  const { submitTimeOffRequest, timeOffRequests, busy, loading, loadError } = useTimeOff();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<TimeOffRequestDraft>({ startDate: '', endDate: '', leaveType: '', note: '' });
  const [errors, setErrors] = useState<TimeOffRequestErrors>({});
  const [error, setError] = useState('');

  function getDateUnavailableReason(date: string): string | undefined {
    return session?.role === 'employee' && employeeHasTimeOffOnDate(timeOffRequests, session.employeeKey, date)
      ? 'already covered by your pending or approved time off'
      : undefined;
  }

  function showValidation(next: TimeOffRequestErrors): void {
    setErrors(next);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (session?.role !== 'employee' || busy || loading || loadError) return;
    const nextErrors = validateTimeOffRequest(draft, session.employeeKey, timeOffRequests);
    if (Object.keys(nextErrors).length > 0) {
      showValidation(nextErrors);
      return;
    }
    setErrors({});
    try {
      await submitTimeOffRequest(draft);
      showToast('Time off request submitted.');
      navigate('/time-off-requests', { replace: true });
    } catch (failure) {
      if (failure instanceof TimeOffRequestValidationError) showValidation(failure.errors);
      else setError((failure as Error).message);
    }
  }

  return { formRef, draft, setDraft, errors, error, busy, loading, loadError, getDateUnavailableReason, submit };
}
