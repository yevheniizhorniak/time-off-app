import { IonRouterOutlet } from '@ionic/react';
import { Navigate, Route } from 'react-router-dom';

import { useSession } from './features/auth/useSession';
import Login from './pages/Login/Login';
import NewTimeOffRequest from './pages/NewTimeOffRequest/NewTimeOffRequest';
import TimeOffRequests from './pages/TimeOffRequests/TimeOffRequests';

export default function ApplicationRoutes(): React.JSX.Element {
  const { session } = useSession();
  return (
    <IonRouterOutlet
      key={session?.role === 'employee' ? `employee-${session.employeeKey}` : (session?.role ?? 'login')}
    >
      <Route path="/login" element={<Login />} />
      <Route path="/requests" element={<Navigate to={session ? '/time-off-requests' : '/login'} replace />} />
      <Route path="/requests/new" element={<Navigate to={session ? '/time-off-requests/new' : '/login'} replace />} />
      {session
        ? [
            <Route
              key="time-off-requests"
              path="/time-off-requests"
              element={<TimeOffRequests key={session.role === 'employee' ? session.employeeKey : 'supervisor'} />}
            />,
            <Route
              key="new-time-off-request"
              path="/time-off-requests/new"
              element={
                session.role === 'employee' ? (
                  <NewTimeOffRequest key={session.employeeKey} />
                ) : (
                  <Navigate to="/time-off-requests" replace />
                )
              }
            />,
          ]
        : []}
      <Route path="*" element={<Navigate to={session ? '/time-off-requests' : '/login'} replace />} />
    </IonRouterOutlet>
  );
}
