import { useState, type ReactElement } from 'react';

import { ToaButton } from '../../../../components/button/Button';
import { formatDate } from '../../../../components/calendar/format-date';
import { ToaConfirmationDialog } from '../../../../components/confirmation-dialog/ConfirmationDialog';
import { ToaTextArea } from '../../../../components/text-area/TextArea';
import { useToast } from '../../../../components/toast/useToast';
import { dateKey } from '../../../../type-safety/date-key';
import { useSession } from '../../../auth/useSession';
import { useTimeOff } from '../../hooks/useTimeOff';
import { cancellationStartDate, leaveTypeLabel } from '../../time-off-domain';
import type { TimeOffRequest } from '../../types/time-off-request';

import './TimeOffRequestCard.scss';

type TimeOffRequestCardProps = {
  /** Time off request and review details to display. */
  timeOffRequest: TimeOffRequest;
};

export default function TimeOffRequestCard({ timeOffRequest }: TimeOffRequestCardProps): ReactElement {
  const { session } = useSession();
  const { reviewTimeOffRequest, cancelTimeOffRequest, busy, loading, loadError } = useTimeOff();
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirmingCancellation, setConfirmingCancellation] = useState(false);
  const canReview = session?.role === 'supervisor' && timeOffRequest.status === 'pending';
  const today = dateKey();
  const cancelledFromDate = cancellationStartDate(timeOffRequest, today);
  const canCancel =
    session?.role === 'employee' && session.employeeKey === timeOffRequest.employeeKey && cancelledFromDate !== null;

  async function cancel(): Promise<void> {
    setConfirmingCancellation(false);
    if (!canCancel || busy || loading || loadError) return;
    setError('');
    try {
      await cancelTimeOffRequest(timeOffRequest.id);
      showToast('Time off cancelled.');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function review(status: 'approved' | 'rejected'): Promise<void> {
    if (!canReview || busy || loading || loadError) return;
    setError('');
    try {
      await reviewTimeOffRequest(timeOffRequest.id, status, note);
      showToast(`Time off request ${status}.`);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <article
      aria-label={`${timeOffRequest.employeeName}, ${leaveTypeLabel(timeOffRequest.leaveType)}, ${formatDate(timeOffRequest.startDate)}`}
      className="time-off-request-card"
    >
      <div className="time-off-request-card__heading">
        <h3>{leaveTypeLabel(timeOffRequest.leaveType)}</h3>
        <span className={`time-off-request-status time-off-request-status--${timeOffRequest.status}`}>
          {timeOffRequest.status}
        </span>
      </div>
      {session?.role === 'supervisor' && (
        <p className="time-off-request-card__employee">{timeOffRequest.employeeName}</p>
      )}
      <p>
        <time dateTime={timeOffRequest.startDate}>{formatDate(timeOffRequest.startDate)}</time> –{' '}
        <time dateTime={timeOffRequest.endDate}>{formatDate(timeOffRequest.endDate)}</time>
      </p>
      {timeOffRequest.note && <p className="time-off-request-card__note">{timeOffRequest.note}</p>}
      <p className="time-off-request-card__metadata">
        Submitted {formatDate(dateKey(new Date(timeOffRequest.createdAt)))}
      </p>
      {timeOffRequest.reviewedAt && (
        <p className="time-off-request-card__metadata">
          Reviewed {formatDate(dateKey(new Date(timeOffRequest.reviewedAt)))}
        </p>
      )}
      {timeOffRequest.cancelledFromDate && timeOffRequest.cancelledAt && (
        <p className="time-off-request-card__metadata">
          Cancelled {formatDate(timeOffRequest.cancelledFromDate)} to {formatDate(timeOffRequest.endDate)} on{' '}
          {formatDate(dateKey(new Date(timeOffRequest.cancelledAt)))}
        </p>
      )}
      {timeOffRequest.reviewerNote && (
        <p className="time-off-request-card__note">
          <strong>Supervisor note</strong>
          <br />
          {timeOffRequest.reviewerNote}
        </p>
      )}
      {error && (
        <p role="alert" className="app-error">
          {error}
        </p>
      )}
      {canCancel && (
        <div className="app-actions">
          <ToaButton
            label="Cancel time off request"
            disabled={busy || loading || !!loadError}
            onClick={() => setConfirmingCancellation(true)}
          />
        </div>
      )}
      <ToaConfirmationDialog
        isOpen={confirmingCancellation && canCancel}
        title="Cancel time off?"
        message={`Cancel your time off from ${formatDate(cancelledFromDate ?? timeOffRequest.startDate)} to ${formatDate(timeOffRequest.endDate)}?${timeOffRequest.startDate <= today ? ' Cancellation starts tomorrow. Your leave through today is retained.' : ''}`}
        confirmLabel="Cancel time off"
        cancelLabel="Keep time off request"
        onCancel={() => setConfirmingCancellation(false)}
        onConfirm={() => void cancel()}
      />
      {canReview && (
        <div className="time-off-request-card__review">
          <ToaTextArea
            label="Decision note (optional)"
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            rows={2}
            disabled={busy}
          />
          <div className="app-actions">
            <ToaButton
              label="Approve"
              disabled={busy || loading || !!loadError}
              onClick={() => void review('approved')}
            />
            <ToaButton
              label="Reject"
              disabled={busy || loading || !!loadError}
              onClick={() => void review('rejected')}
            />
          </div>
        </div>
      )}
    </article>
  );
}
