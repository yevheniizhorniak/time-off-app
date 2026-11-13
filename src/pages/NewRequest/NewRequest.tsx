import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import Button from '../../components/button/Button';
import Dropdown from '../../components/dropdown/Dropdown';
import TextArea from '../../components/text-area/TextArea';
import TimeOffDateField from '../../features/time-off/components/time-off-date-field/TimeOffDateField';
import TimeOffPageLayout from '../../features/time-off/components/time-off-page-layout/TimeOffPageLayout';
import { dateKey, leaveTypes } from '../../features/time-off/time-off-domain';

import { useNewRequestForm } from './useNewRequestForm';

import './NewRequest.scss';

export default function NewRequest(): ReactElement {
  const { formRef, draft, setDraft, errors, error, busy, storageError, submit } = useNewRequestForm();

  return (
    <TimeOffPageLayout title="Request time off">
      <section className="app-panel app-request-form">
        <form noValidate className="app-form" onSubmit={(event) => void submit(event)} ref={formRef}>
          <div className="app-date-fields">
            <TimeOffDateField
              label="Start date"
              required
              min={dateKey()}
              value={draft.startDate}
              error={errors.startDate}
              disabled={busy}
              onChange={(startDate) => setDraft({ ...draft, startDate })}
            />
            <TimeOffDateField
              label="End date"
              required
              min={draft.startDate || dateKey()}
              value={draft.endDate}
              error={errors.endDate}
              disabled={busy}
              onChange={(endDate) => setDraft({ ...draft, endDate })}
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
    </TimeOffPageLayout>
  );
}
