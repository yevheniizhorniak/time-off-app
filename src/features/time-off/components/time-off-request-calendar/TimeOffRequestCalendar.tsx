import { useId, useState, type ReactElement } from 'react';

import { ToaCalendar } from '../../../../components/calendar/Calendar';
import { formatDate } from '../../../../components/calendar/format-date';
import { monthDays } from '../../../../components/calendar/month-days';
import { dateKey } from '../../../../type-safety/date-key';
import { leaveTypeLabel, timeOffRequestsOnDate } from '../../time-off-domain';
import type { TimeOffRequest } from '../../types/time-off-request';

import './TimeOffRequestCalendar.scss';

type TimeOffRequestCalendarProps = {
  /** Time off requests used to highlight pending and approved leave across the team. */
  timeOffRequests: readonly TimeOffRequest[];
};

export default function TimeOffRequestCalendar({ timeOffRequests }: TimeOffRequestCalendarProps): ReactElement {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [selected, setSelected] = useState(dateKey());
  const headingId = useId();
  const availableDates = monthDays(month).filter(
    (date): date is string => date !== null && timeOffRequestsOnDate(timeOffRequests, date).length > 0,
  );
  const selectedDate = availableDates.includes(selected) ? selected : (availableDates[0] ?? '');
  const selectedTimeOffRequests = timeOffRequestsOnDate(timeOffRequests, selectedDate);

  // Retain the fallback selection when later time off request updates make the old date available again.
  if (selected !== selectedDate) setSelected(selectedDate);

  function changeMonth(next: Date): void {
    setMonth(next);
    setSelected('');
  }

  return (
    <section className="time-off-request-calendar app-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>Team calendar</h2>
      <p className="app-muted">Daily counts include pending and approved time off requests.</p>
      <ToaCalendar
        month={month}
        selectedDate={selectedDate}
        onMonthChange={changeMonth}
        onDateChange={setSelected}
        isDateDisabled={(date) => timeOffRequestsOnDate(timeOffRequests, date).length === 0}
        getDayAriaLabel={(date) => {
          const count = timeOffRequestsOnDate(timeOffRequests, date).length;
          return `${formatDate(date)}, ${count} ${count === 1 ? 'time off request' : 'time off requests'}`;
        }}
        renderDayContent={(date) => {
          const count = timeOffRequestsOnDate(timeOffRequests, date).length;
          return count > 0 ? (
            <span className="time-off-request-calendar__count" aria-hidden="true">
              {count}
            </span>
          ) : null;
        }}
      />
      <div className="time-off-request-calendar__details" aria-live="polite">
        {selectedDate && <h3>{formatDate(selectedDate)}</h3>}
        {selectedDate === '' ? (
          <p className="app-muted">No time off this month.</p>
        ) : (
          <ul>
            {selectedTimeOffRequests.map((timeOffRequest) => (
              <li key={timeOffRequest.id}>
                <strong>{timeOffRequest.employeeName}</strong> · {leaveTypeLabel(timeOffRequest.leaveType)} ·{' '}
                {timeOffRequest.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
