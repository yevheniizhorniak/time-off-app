import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import RequestCalendar from '../../features/time-off/RequestCalendar';
import RequestCard from '../../features/time-off/RequestCard';
import TimeOffPage from '../../features/time-off/TimeOffPage';
import { dateKey } from '../../features/time-off/timeOff';
import { useTimeOff } from '../../features/time-off/useTimeOff';

export default function TimeOffRequests(): ReactElement {
  const { session, requests, storageError } = useTimeOff();
  const isEmployee = session?.role === 'employee';
  const visible = requests.filter((request) => !isEmployee || request.employeeKey === session.employeeKey);
  const today = dateKey();
  const groups = isEmployee
    ? [
        {
          title: 'Upcoming and current',
          items: visible
            .filter((request) => request.endDate >= today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate)),
        },
        {
          title: 'Past requests',
          items: visible
            .filter((request) => request.endDate < today)
            .sort((a, b) => b.startDate.localeCompare(a.startDate)),
        },
      ]
    : [
        {
          title: 'Pending requests',
          items: visible
            .filter((request) => request.status === 'pending')
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        },
        {
          title: 'Reviewed requests',
          items: visible
            .filter((request) => request.status !== 'pending')
            .sort((a, b) => b.reviewedAt!.localeCompare(a.reviewedAt!)),
        },
      ];

  return (
    <TimeOffPage title={isEmployee ? 'Your requests' : 'Team requests'}>
      {isEmployee && (
        <div className="app-actions app-section-action">
          <Link className="app-link-button" to="/requests/new">
            Request time off
          </Link>
        </div>
      )}
      {storageError && (
        <p className="app-muted">Request information may be unavailable until saved data can be loaded.</p>
      )}
      <div className={isEmployee ? '' : 'app-supervisor-layout'}>
        <div>
          {groups.map((group) => (
            <section className="request-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.length === 0 ? (
                <p className="app-empty">{storageError ? 'Unable to load requests.' : 'No requests yet.'}</p>
              ) : (
                <div className="request-list">
                  {group.items.map((request) => (
                    <RequestCard request={request} key={request.id} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
        {!isEmployee && <RequestCalendar requests={requests} />}
      </div>
    </TimeOffPage>
  );
}
