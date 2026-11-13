import { isSession } from './types/session';
import type { SessionRepository } from './types/session-repository';

const sessionKey = 'time-off-app.session';

export function createSessionRepository(getStorage: () => Storage): SessionRepository {
  return {
    load() {
      const raw = getStorage().getItem(sessionKey);
      if (raw === null) return null;
      const session: unknown = JSON.parse(raw);
      if (!isSession(session)) throw new Error('Saved session is invalid.');
      if (session.role === 'supervisor') return { role: 'supervisor' };
      return { role: 'employee', name: session.name.trim(), employeeKey: session.employeeKey };
    },
    save(session) {
      if (session) getStorage().setItem(sessionKey, JSON.stringify(session));
      else getStorage().removeItem(sessionKey);
    },
  };
}
