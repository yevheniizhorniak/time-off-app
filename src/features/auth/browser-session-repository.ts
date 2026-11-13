import { employeeKey } from './session-domain';
import type { SessionRepository } from './session-repository';

const sessionKey = 'time-off-app.session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createSessionRepository(getStorage: () => Storage): SessionRepository {
  return {
    load() {
      const raw = getStorage().getItem(sessionKey);
      if (raw === null) return null;
      const session: unknown = JSON.parse(raw);
      if (isRecord(session) && session.role === 'supervisor') return { role: 'supervisor' };
      if (
        isRecord(session) &&
        session.role === 'employee' &&
        typeof session.name === 'string' &&
        session.name.trim() &&
        session.employeeKey === employeeKey(session.name)
      ) {
        return { role: 'employee', name: session.name.trim(), employeeKey: session.employeeKey };
      }
      throw new Error('Saved session is invalid.');
    },
    save(session) {
      if (session) getStorage().setItem(sessionKey, JSON.stringify(session));
      else getStorage().removeItem(sessionKey);
    },
  };
}
