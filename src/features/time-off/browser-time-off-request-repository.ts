import { dateKey } from '../../type-safety/date-key';
import { isRecord } from '../../type-safety/is-record';

import { cancelTimeOffRequest, createTimeOffRequest, reviewTimeOffRequest } from './time-off-domain';
import { isTimeOffRequest, type TimeOffRequest } from './types/time-off-request';
import type { TimeOffRequestRepository } from './types/time-off-request-repository';

const timeOffRequestKey = 'time-off-app.time-off-requests';

export function createTimeOffRequestRepository(
  getStorage: () => Storage,
  createInitialData: () => TimeOffRequest[] = () => [],
): TimeOffRequestRepository {
  function read(): TimeOffRequest[] | null {
    const raw = getStorage().getItem(timeOffRequestKey);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 2) {
      throw new Error('Saved time off requests have an unsupported format.');
    }
    const timeOffRequests = data.timeOffRequests;
    if (
      !Array.isArray(timeOffRequests) ||
      !timeOffRequests.every(isTimeOffRequest) ||
      new Set(timeOffRequests.map((timeOffRequest) => timeOffRequest.id)).size !== timeOffRequests.length
    ) {
      throw new Error('Saved time off requests have an unsupported format.');
    }
    return timeOffRequests;
  }

  async function update(change?: (current: TimeOffRequest[]) => TimeOffRequest[]): Promise<TimeOffRequest[]> {
    function commit(): TimeOffRequest[] {
      const saved = read();
      if (!change && saved !== null) return saved;
      const current = saved ?? createInitialData();
      const timeOffRequests = change ? change(current) : current;
      getStorage().setItem(timeOffRequestKey, JSON.stringify({ version: 2, timeOffRequests }));
      return timeOffRequests;
    }
    // Serialize read/modify/write across tabs in browsers supporting Web Locks.
    if (navigator.locks) return navigator.locks.request(timeOffRequestKey, commit);
    return commit();
  }

  return {
    async load() {
      return read() ?? update();
    },
    submit(draft, employee) {
      return update((current) => {
        const now = new Date();
        return [
          ...current,
          createTimeOffRequest(draft, employee, current, {
            id: crypto.randomUUID(),
            createdAt: now.toISOString(),
            today: dateKey(now),
          }),
        ];
      });
    },
    review(id, status, note) {
      return update((current) => reviewTimeOffRequest(current, id, status, note, new Date().toISOString()));
    },
    cancel(id, employeeKey) {
      return update((current) => {
        const now = new Date();
        return cancelTimeOffRequest(current, id, employeeKey, { today: dateKey(now), cancelledAt: now.toISOString() });
      });
    },
    subscribe(onChange) {
      function handleStorage(event: StorageEvent): void {
        if (event.key === timeOffRequestKey || event.key === null) onChange();
      }
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    },
  };
}
