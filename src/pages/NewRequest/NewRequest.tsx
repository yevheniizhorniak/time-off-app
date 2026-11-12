import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/button/Button';
import Dropdown from '../../components/dropdown/Dropdown';
import TextArea from '../../components/text-area/TextArea';
import TextField from '../../components/text-field/TextField';
import { useToast } from '../../components/toast/useToast';
import {
  dateKey,
  leaveTypes,
  RequestValidationError,
  validateRequest,
  type RequestDraft,
  type RequestErrors,
} from '../../features/time-off/time-off-domain';
import TimeOffPage from '../../features/time-off/time-off-page/TimeOffPage';
import { useSession } from '../../features/time-off/useSession';
import { useTimeOff } from '../../features/time-off/useTimeOff';

import './NewRequest.scss';

export default function NewRequest(): ReactElement {
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

  return (
    <TimeOffPage title="Request time off">
      <section className="app-panel app-request-form">
        <form noValidate className="app-form" onSubmit={(event) => void submit(event)} ref={formRef}>
          <div className="app-date-fields">
            <TextField
              label="Start date"
              type="date"
              required
              min={dateKey()}
              value={draft.startDate}
              error={errors.startDate}
              disabled={busy}
              onChange={(event) => setDraft({ ...draft, startDate: event.currentTarget.value })}
            />
            <TextField
              label="End date"
              type="date"
              required
              min={draft.startDate || dateKey()}
              value={draft.endDate}
              error={errors.endDate}
              disabled={busy}
              onChange={(event) => setDraft({ ...draft, endDate: event.currentTarget.value })}
            />
          </div>
          <Dropdown
            label="Time off type"
            required
            options={leaveTypes}
            value={draft.leaveType}
            error={errors.leaveType}
            disabled={busy}
            onChange={(event) => setDraft({ ...draft, leaveType: event.currentTarget.value })}
          />
          <TextArea
            label="Notes (optional)"
            value={draft.note}
            disabled={busy}
            onChange={(event) => setDraft({ ...draft, note: event.currentTarget.value })}
          />
          {error && (
            <p className="app-error" role="alert">
              {error}
            </p>
          )}
          {Object.keys(errors).length > 0 && (
            <p className="app-error" role="alert">
              Check the highlighted fields.
            </p>
          )}
          <div className="app-actions">
            <Button label="Submit request" type="submit" loading={busy} disabled={!!storageError} />
            {!busy && (
              <Link className="app-text-link" to="/requests">
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>
    </TimeOffPage>
  );
}
