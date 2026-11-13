import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ToaButton } from '../../components/button/Button';
import { ToaTextField } from '../../components/text-field/TextField';
import type { Session } from '../../features/auth/types/session';
import { useSession } from '../../features/auth/useSession';
import TimeOffPageLayout from '../../features/time-off/components/time-off-page-layout/TimeOffPageLayout';
import { trimLowerCase } from '../../trim-lower-case';

import './Login.scss';

export default function Login(): ReactElement {
  const { session, signIn, sessionError } = useSession();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('testusr');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');

  if (session) return <Navigate to="/time-off-requests" replace />;

  function login(next: Session): void {
    setError('');
    try {
      signIn(next);
      navigate('/time-off-requests', { replace: true });
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  function employeeLogin(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Enter your name.');
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setNameError('');
    login({ role: 'employee', name: name.trim(), employeeKey: trimLowerCase(name) });
  }

  return (
    <TimeOffPageLayout>
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
        <form noValidate onSubmit={employeeLogin} className="app-form" ref={formRef}>
          <ToaTextField
            label="Employee name"
            placeholder="enter testusr for prepopulated data"
            autoComplete="name"
            value={name}
            required
            error={nameError}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <ToaButton label="Log in as employee" type="submit" />
        </form>
        <div className="app-login__supervisor">
          <ToaButton label="Log in as a supervisor" onClick={() => login({ role: 'supervisor' })} />
        </div>
      </section>
    </TimeOffPageLayout>
  );
}
