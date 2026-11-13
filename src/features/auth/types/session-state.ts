import type { Session } from './session';

export type SessionState = {
  session: Session | null;
  sessionError: string | null;
  signIn: (session: Session) => void;
  signOut: () => void;
};
