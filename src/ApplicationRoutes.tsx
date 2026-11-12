import { IonRouterOutlet } from '@ionic/react';
import { Navigate, Route } from 'react-router-dom';

import { useSession } from './features/time-off/useSession';
import Login from './pages/Login/Login';
import NewRequest from './pages/NewRequest/NewRequest';
import TimeOffRequests from './pages/TimeOffRequests/TimeOffRequests';

export default function ApplicationRoutes(): React.JSX.Element {
  const { session } = useSession();
  return (
    <IonRouterOutlet
      key={session?.role === 'employee' ? `employee-${session.employeeKey}` : (session?.role ?? 'login')}
    >
      <Route path="/login" element={<Login />} />
      {session
        ? [
            <Route
              key="requests"
              path="/requests"
              element={<TimeOffRequests key={session.role === 'employee' ? session.employeeKey : 'supervisor'} />}
            />,
            <Route
              key="new-request"
              path="/requests/new"
              element={
                session.role === 'employee' ? (
                  <NewRequest key={session.employeeKey} />
                ) : (
                  <Navigate to="/requests" replace />
                )
              }
            />,
          ]
        : []}
      <Route path="*" element={<Navigate to={session ? '/requests' : '/login'} replace />} />
    </IonRouterOutlet>
  );
}
