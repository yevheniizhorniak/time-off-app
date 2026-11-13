import { useRef, useState, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../components/toast/useToast';
import { useSession } from '../../features/auth/useSession';
import { useTimeOff } from '../../features/time-off/hooks/useTimeOff';
import { validateRequest } from '../../features/time-off/time-off-domain';
import { RequestValidationError, type RequestErrors } from '../../features/time-off/types/errors';
import type { RequestDraft } from '../../features/time-off/types/request-draft';

type NewRequestForm = {
  formRef: RefObject<HTMLFormElement | null>;
  draft: RequestDraft;
  setDraft: Dispatch<SetStateAction<RequestDraft>>;
  errors: RequestErrors;
  error: string;
  busy: boolean;
  storageError: string | null;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/** Validates and saves requests, reports failures, and navigates on success. */
export function useNewRequestForm(): NewRequestForm {
  const { session } = useSession();
  const { submitRequest, requests, busy, storageError } = useTimeOff();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<RequestDraft>({ startDate: '', endDate: '', leaveType: '', note: '' });
  const [errors, setErrors] = useState<RequestErrors>({});
  const [error, setError] = useState('');

  function showValidation(next: RequestErrors): void {
    setErrors(next);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (session?.role !== 'employee') return;
    const nextErrors = validateRequest(draft, session.employeeKey, requests);
    if (Object.keys(nextErrors).length > 0) {
      showValidation(nextErrors);
      return;
    }
    setErrors({});
    try {
      await submitRequest(draft);
      showToast('Time off request submitted.');
      navigate('/requests', { replace: true });
    } catch (failure) {
      if (failure instanceof RequestValidationError) showValidation(failure.errors);
      else setError((failure as Error).message);
    }
  }

  return { formRef, draft, setDraft, errors, error, busy, storageError, submit };
}
