import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { ToaButton } from '../../../../components/button/Button';
import { ToaThemeButton } from '../../../../components/theme-button/ThemeButton';
import { useSession } from '../../../auth/useSession';
import { useTimeOff } from '../../hooks/useTimeOff';

import './TimeOffPageLayout.scss';

type TimeOffPageLayoutProps = {
  /** Screen content within Ionic's scrolling container. */
  children: ReactNode;
  /** Optional heading displayed above the screen content. */
  title?: string;
};

export default function TimeOffPageLayout({ children, title }: TimeOffPageLayoutProps): ReactElement {
  const { session, signOut } = useSession();
  const { loadError, reload, busy, loading } = useTimeOff();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  function switchUser(): void {
    try {
      signOut();
      navigate('/login', { replace: true });
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="time-off-toolbar">
          <IonTitle>Time off</IonTitle>
          <div slot="end" className="time-off-toolbar__theme">
            <ToaThemeButton />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="time-off-app">
          <header className="app-heading">
            <div>
              {title && <h1>{title}</h1>}
              {session && <p className="app-muted">{session.role === 'employee' ? session.name : 'Supervisor'}</p>}
            </div>
            {session && <ToaButton label="Switch user" disabled={busy} onClick={switchUser} />}
          </header>
          {error && (
            <p className="app-error" role="alert">
              {error}
            </p>
          )}
          {loadError && (
            <div className="app-storage-error" role="alert">
              <p>{loadError}</p>
              <ToaButton label="Retry loading time off requests" disabled={busy || loading} onClick={reload} />
            </div>
          )}
          {loading && (
            <p role="status" className="app-muted">
              Loading time off requests…
            </p>
          )}
          {children}
        </main>
      </IonContent>
    </IonPage>
  );
}
