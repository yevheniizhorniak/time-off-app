import { isRecord } from '../../type-safety/is-record';

import { isTimeOffRequest, type TimeOffRequest } from './types/time-off-request';
import type { TimeOffRequestRepository } from './types/time-off-request-repository';

const timeOffRequestKey = 'time-off-app.time-off-requests';

export function createTimeOffRequestRepository(getStorage: () => Storage): TimeOffRequestRepository {
  function load(): TimeOffRequest[] {
    const raw = getStorage().getItem(timeOffRequestKey);
    if (raw === null) return [];
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

  return {
    load,
    async update(change) {
      function commit(): TimeOffRequest[] {
        const timeOffRequests = change(load());
        getStorage().setItem(timeOffRequestKey, JSON.stringify({ version: 2, timeOffRequests }));
        return timeOffRequests;
      }
      // Serialize read/modify/write across tabs in browsers supporting Web Locks.
      if (navigator.locks) return navigator.locks.request(timeOffRequestKey, commit);
      return commit();
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
