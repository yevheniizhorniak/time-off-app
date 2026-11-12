import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/button/Button';
import { useSession } from '../useSession';
import { useTimeOff } from '../useTimeOff';

import './TimeOffPage.scss';

type TimeOffPageProps = {
  /** Screen content within Ionic's scrolling container. */
  children: ReactNode;
  /** Optional heading displayed above the screen content. */
  title?: string;
};

export default function TimeOffPage({ children, title }: TimeOffPageProps): ReactElement {
  const { session, signOut } = useSession();
  const { storageError, reload, busy } = useTimeOff();
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
        <IonToolbar>
          <IonTitle>Time off</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="time-off-app">
          <header className="app-heading">
            <div>
              {title && <h1>{title}</h1>}
              {session && <p className="app-muted">{session.role === 'employee' ? session.name : 'Supervisor'}</p>}
            </div>
            {session && <Button label="Switch user" disabled={busy} onClick={switchUser} />}
          </header>
          {error && (
            <p className="app-error" role="alert">
              {error}
            </p>
          )}
          {storageError && (
            <div className="app-storage-error" role="alert">
              <p>{storageError}</p>
              <Button label="Retry loading requests" disabled={busy} onClick={reload} />
            </div>
          )}
          {children}
        </main>
      </IonContent>
    </IonPage>
  );
}
