import { employeeKey, isDate, isLeaveType, type Session, type TimeOffRequest } from './time-off-domain';

export interface RequestRepository {
  load(): TimeOffRequest[];
  /** Reads the latest data and persists a complete change before resolving. */
  update(change: (requests: TimeOffRequest[]) => TimeOffRequest[]): Promise<TimeOffRequest[]>;
  subscribe(onChange: () => void): () => void;
}

export interface SessionRepository {
  load(): Session | null;
  save(session: Session | null): void;
}

const requestKey = 'time-off-app.requests';
const sessionKey = 'time-off-app.session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isRequest(value: unknown): value is TimeOffRequest {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.employeeName === 'string' &&
    value.employeeName.trim().length > 0 &&
    value.employeeKey === employeeKey(value.employeeName) &&
    isDate(value.startDate) &&
    isDate(value.endDate) &&
    value.startDate <= value.endDate &&
    isLeaveType(value.leaveType) &&
    typeof value.note === 'string' &&
    isTimestamp(value.createdAt) &&
    (value.reviewerNote === undefined || typeof value.reviewerNote === 'string') &&
    ((value.status === 'pending' && value.reviewedAt === undefined) ||
      ((value.status === 'approved' || value.status === 'rejected') && isTimestamp(value.reviewedAt)))
  );
}

export function createRequestRepository(getStorage: () => Storage): RequestRepository {
  function load(): TimeOffRequest[] {
    const raw = getStorage().getItem(requestKey);
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (
      !isRecord(data) ||
      data.version !== 1 ||
      !Array.isArray(data.requests) ||
      !data.requests.every(isRequest) ||
      new Set(data.requests.map((request) => request.id)).size !== data.requests.length
    ) {
      throw new Error('Saved requests have an unsupported format.');
    }
    return data.requests;
  }

  return {
    load,
    async update(change) {
      function commit(): TimeOffRequest[] {
        const requests = change(load());
        getStorage().setItem(requestKey, JSON.stringify({ version: 1, requests }));
        return requests;
      }
      // Serialize read/modify/write across tabs in browsers supporting Web Locks.
      if (navigator.locks) return navigator.locks.request(requestKey, commit);
      return commit();
    },
    subscribe(onChange) {
      function handleStorage(event: StorageEvent): void {
        if (event.key === requestKey || event.key === null) onChange();
      }
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    },
  };
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
