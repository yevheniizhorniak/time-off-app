import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import ApplicationRoutes from './ApplicationRoutes';
import { ToaToastProvider } from './components/toast/ToastProvider';
import { createSessionRepository } from './features/auth/browser-session-repository';
import SessionProvider from './features/auth/session-provider/SessionProvider';
import { createRequestRepository } from './features/time-off/browser-request-repository';
import TimeOffProvider from './features/time-off/time-off-provider/TimeOffProvider';

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

/** System dark mode. See https://ionicframework.com/docs/theming/dark-mode. */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import '@fontsource-variable/inter';
import './theme/variables.scss';

setupIonicReact();

const repository = createRequestRepository(() => window.localStorage);
const sessionRepository = createSessionRepository(() => window.sessionStorage);

const App: React.FC = () => (
  <IonApp>
    <ToaToastProvider>
      <SessionProvider repository={sessionRepository}>
        <TimeOffProvider repository={repository}>
          <IonReactRouter>
            <ApplicationRoutes />
          </IonReactRouter>
        </TimeOffProvider>
      </SessionProvider>
    </ToaToastProvider>
  </IonApp>
);

export default App;
