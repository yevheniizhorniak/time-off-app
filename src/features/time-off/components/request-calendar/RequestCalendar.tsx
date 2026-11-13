import { useId, useState, type ReactElement } from 'react';

import Calendar from '../../../../components/calendar/Calendar';
import { dateKey, formatDate, leaveTypeLabel, requestsOnDate, type TimeOffRequest } from '../../time-off-domain';

import './RequestCalendar.scss';

type RequestCalendarProps = {
  /** Requests used to highlight pending and approved leave across the team. */
  requests: readonly TimeOffRequest[];
};

export default function RequestCalendar({ requests }: RequestCalendarProps): ReactElement {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selected, setSelected] = useState(dateKey());
  const headingId = useId();
  const selectedRequests = requestsOnDate(requests, selected);

  function changeMonth(next: Date): void {
    setMonth(next);
    setSelected(dateKey(next));
  }

  return (
    <section className="request-calendar app-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>Team calendar</h2>
      <p className="app-muted">Daily counts include pending and approved requests.</p>
      <Calendar
        month={month}
        selectedDate={selected}
        onMonthChange={changeMonth}
        onDateChange={setSelected}
        getDayAriaLabel={(date) => {
          const count = requestsOnDate(requests, date).length;
          return `${formatDate(date)}, ${count} ${count === 1 ? 'request' : 'requests'}`;
        }}
        renderDayContent={(date) => {
          const count = requestsOnDate(requests, date).length;
          return count > 0 ? (
            <span className="request-calendar__count" aria-hidden="true">
              {count}
            </span>
          ) : null;
        }}
      />
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
