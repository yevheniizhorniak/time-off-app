import { useId, useState, type ReactElement } from 'react';

import Button from '../../components/button/Button';

import { dateKey, formatDate, leaveTypeLabel, monthDays, requestsOnDate, type TimeOffRequest } from './timeOff';

type RequestCalendarProps = {
  /** Requests used to highlight pending and approved leave across the team. */
  requests: readonly TimeOffRequest[];
};

export default function RequestCalendar({ requests }: RequestCalendarProps): ReactElement {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selected, setSelected] = useState(dateKey());
  const headingId = useId();
  const selectedRequests = requestsOnDate(requests, selected);

  function moveMonth(offset: number): void {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next);
    setSelected(dateKey(next));
  }

  return (
    <section className="request-calendar app-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>Team calendar</h2>
      <div className="request-calendar__navigation">
        <Button label="Previous" aria-label="Previous month" onClick={() => moveMonth(-1)} />
        <h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <Button label="Next" aria-label="Next month" onClick={() => moveMonth(1)} />
      </div>
      <p className="app-muted">Daily counts include pending and approved requests.</p>
      <div className="request-calendar__grid" role="group" aria-label="Choose a calendar date">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span className="request-calendar__weekday" key={day}>
            {day}
          </span>
        ))}
        {monthDays(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const count = requestsOnDate(requests, date).length;
          return (
            <button
              type="button"
              className="request-calendar__day"
              key={date}
              aria-label={`${formatDate(date)}, ${count} ${count === 1 ? 'request' : 'requests'}`}
              aria-pressed={date === selected}
              aria-current={date === dateKey() ? 'date' : undefined}
              onClick={() => setSelected(date)}
            >
              <span>{Number(date.slice(-2))}</span>
              {count > 0 && (
                <span className="request-calendar__count" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="request-calendar__details" aria-live="polite">
        <h3>{formatDate(selected)}</h3>
        {selectedRequests.length === 0 ? (
          <p className="app-muted">No time off on this day.</p>
        ) : (
          <ul>
            {selectedRequests.map((request) => (
              <li key={request.id}>
                <strong>{request.employeeName}</strong> · {leaveTypeLabel(request.leaveType)} · {request.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
