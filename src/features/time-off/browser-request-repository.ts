import { isRecord } from '../../type-safety/is-record';

import type { RequestRepository } from './types/request-repository';
import { isTimeOffRequest, type TimeOffRequest } from './types/time-off-request';

const requestKey = 'time-off-app.requests';

export function createRequestRepository(getStorage: () => Storage): RequestRepository {
  function load(): TimeOffRequest[] {
    const raw = getStorage().getItem(requestKey);
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (
      !isRecord(data) ||
      data.version !== 1 ||
      !Array.isArray(data.requests) ||
      !data.requests.every(isTimeOffRequest) ||
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
