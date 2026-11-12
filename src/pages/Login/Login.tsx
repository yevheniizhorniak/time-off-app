import { useState, type FormEvent, type ReactElement } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import Button from '../../components/button/Button';
import TextField from '../../components/text-field/TextField';
import { employeeKey, type Session } from '../../features/time-off/time-off-domain';
import TimeOffPage from '../../features/time-off/time-off-page/TimeOffPage';
import { useSession } from '../../features/time-off/useSession';

import './Login.scss';

export default function Login(): ReactElement {
  const { session, signIn, sessionError } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');

  if (session) return <Navigate to="/requests" replace />;

  function login(next: Session): void {
    setError('');
    try {
      signIn(next);
      navigate('/requests', { replace: true });
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  function employeeLogin(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Enter your name.');
      return;
    }
    setNameError('');
    login({ role: 'employee', name: name.trim(), employeeKey: employeeKey(name) });
  }

  return (
    <TimeOffPage>
      <section className="app-panel app-login">
        {sessionError && (
          <p className="app-error" role="alert">
            {sessionError}
          </p>
        )}
        {error && (
          <p className="app-error" role="alert">
            {error}
          </p>
        )}
        <form noValidate onSubmit={employeeLogin} className="app-form">
          <TextField
            label="Employee name"
            autoComplete="name"
            value={name}
            required
            error={nameError}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Button label="Log in as employee" type="submit" />
        </form>
        <div className="app-login__supervisor">
          <Button label="Log in as a supervisor" onClick={() => login({ role: 'supervisor' })} />
        </div>
      </section>
    </TimeOffPage>
  );
}
