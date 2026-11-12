import { useState, type ReactElement } from 'react';

import Button from '../../components/button/Button';
import TextArea from '../../components/text-area/TextArea';
import { useToast } from '../../components/toast/useToast';

import { dateKey, formatDate, leaveTypeLabel, type TimeOffRequest } from './timeOff';
import { useSession } from './useSession';
import { useTimeOff } from './useTimeOff';

type RequestCardProps = {
  /** Request and review details to display. */
  request: TimeOffRequest;
};

export default function RequestCard({ request }: RequestCardProps): ReactElement {
  const { session } = useSession();
  const { reviewRequest, busy, storageError } = useTimeOff();
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const canReview = session?.role === 'supervisor' && request.status === 'pending';

  async function review(status: 'approved' | 'rejected'): Promise<void> {
    setError('');
    try {
      await reviewRequest(request.id, status, note);
      showToast(`Request ${status}.`);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <article
      aria-label={`${request.employeeName}, ${leaveTypeLabel(request.leaveType)}, ${formatDate(request.startDate)}`}
      className="request-card"
    >
      <div className="request-card__heading">
        <h3>{leaveTypeLabel(request.leaveType)}</h3>
        <span className={`request-status request-status--${request.status}`}>{request.status}</span>
      </div>
      {session?.role === 'supervisor' && <p className="request-card__employee">{request.employeeName}</p>}
      <p>
        <time dateTime={request.startDate}>{formatDate(request.startDate)}</time> –{' '}
        <time dateTime={request.endDate}>{formatDate(request.endDate)}</time>
      </p>
      {request.note && <p className="request-card__note">{request.note}</p>}
      <p className="request-card__metadata">Submitted {formatDate(dateKey(new Date(request.createdAt)))}</p>
      {request.reviewedAt && (
        <p className="request-card__metadata">Reviewed {formatDate(dateKey(new Date(request.reviewedAt)))}</p>
      )}
      {request.reviewerNote && (
        <p className="request-card__note">
          <strong>Supervisor note</strong>
          <br />
          {request.reviewerNote}
        </p>
      )}
      {canReview && (
        <div className="request-card__review">
          <TextArea
            label="Decision note (optional)"
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            rows={2}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="app-error">
              {error}
            </p>
          )}
          <div className="app-actions">
            <Button label="Approve" disabled={busy || !!storageError} onClick={() => void review('approved')} />
            <Button label="Reject" disabled={busy || !!storageError} onClick={() => void review('rejected')} />
          </div>
        </div>
      )}
    </article>
  );
}
