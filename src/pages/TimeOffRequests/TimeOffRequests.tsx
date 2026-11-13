import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useSession } from '../../features/auth/useSession';
import TimeOffPageLayout from '../../features/time-off/components/time-off-page-layout/TimeOffPageLayout';
import TimeOffRequestCalendar from '../../features/time-off/components/time-off-request-calendar/TimeOffRequestCalendar';
import TimeOffRequestCard from '../../features/time-off/components/time-off-request-card/TimeOffRequestCard';
import { useTimeOff } from '../../features/time-off/hooks/useTimeOff';
import { dateKey } from '../../type-safety/date-key';

import './TimeOffRequests.scss';

export default function TimeOffRequests(): ReactElement {
  const { session } = useSession();
  const { timeOffRequests, loadError, hasLoaded } = useTimeOff();
  const isEmployee = session?.role === 'employee';
  const visible = timeOffRequests.filter(
    (timeOffRequest) => !isEmployee || timeOffRequest.employeeKey === session.employeeKey,
  );
  const today = dateKey();
  const groups = isEmployee
    ? [
        {
          title: 'Upcoming and current',
          items: visible
            .filter((timeOffRequest) => timeOffRequest.endDate >= today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate)),
        },
        {
          title: 'Past time off requests',
          items: visible
            .filter((timeOffRequest) => timeOffRequest.endDate < today)
            .sort((a, b) => b.startDate.localeCompare(a.startDate)),
        },
      ]
    : [
        {
          title: 'Pending time off requests',
          items: visible
            .filter((timeOffRequest) => timeOffRequest.status === 'pending')
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        },
        {
          title: 'Reviewed and cancelled time off requests',
          items: visible
            .filter((timeOffRequest) => timeOffRequest.status !== 'pending')
            .sort((a, b) =>
              (b.cancelledAt ?? b.reviewedAt ?? b.createdAt).localeCompare(
                a.cancelledAt ?? a.reviewedAt ?? a.createdAt,
              ),
            ),
        },
      ];

  return (
    <TimeOffPageLayout title={isEmployee ? 'Your time off requests' : 'Team time off requests'}>
      {isEmployee && (
        <div className="app-actions app-section-action">
          <Link className="app-link-button" to="/time-off-requests/new">
            Request time off
          </Link>
        </div>
      )}
      {loadError && (
        <p className="app-muted">Time off request information may be unavailable until data can be loaded.</p>
      )}
      <div className="app-requests-layout">
        <div>
          {groups.map((group) => (
            <section className="time-off-request-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.length === 0 ? (
                hasLoaded || loadError ? (
                  <p className="app-empty">
                    {loadError ? 'Unable to load time off requests.' : 'No time off requests yet.'}
                  </p>
                ) : null
              ) : (
                <div className="time-off-request-list">
                  {group.items.map((timeOffRequest) => (
                    <TimeOffRequestCard timeOffRequest={timeOffRequest} key={timeOffRequest.id} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
        {hasLoaded && (
          <TimeOffRequestCalendar timeOffRequests={visible} title={isEmployee ? 'Your calendar' : 'Team calendar'} />
        )}
      </div>
    </TimeOffPageLayout>
  );
}
