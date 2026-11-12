import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route } from 'react-router-dom';

import ToastProvider from './components/toast/ToastProvider';
import SessionProvider from './features/time-off/SessionProvider';
import TimeOffProvider from './features/time-off/TimeOffProvider';
import { createRequestRepository, createSessionRepository } from './features/time-off/storage';
import { useSession } from './features/time-off/useSession';
import Login from './pages/Login/Login';
import NewRequest from './pages/TimeOffRequests/NewRequest';
import TimeOffRequests from './pages/TimeOffRequests/TimeOffRequests';

// TODO: I should remove some of these
/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import '@fontsource-variable/inter';
import './theme/variables.scss';

setupIonicReact();

const repository = createRequestRepository(() => window.localStorage);
const sessionRepository = createSessionRepository(() => window.sessionStorage);

function ApplicationRoutes(): React.JSX.Element {
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

const App: React.FC = () => (
  <IonApp>
    <ToastProvider>
      <SessionProvider repository={sessionRepository}>
        <TimeOffProvider repository={repository}>
          <IonReactRouter>
            <ApplicationRoutes />
          </IonReactRouter>
        </TimeOffProvider>
      </SessionProvider>
    </ToastProvider>
  </IonApp>
);

export default App;
