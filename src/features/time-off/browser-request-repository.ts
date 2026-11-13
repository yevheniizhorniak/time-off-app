import { isRecord } from '../../type-safety/is-record';
import { isTimestamp } from '../../type-safety/is-timestamp';
import { employeeKey } from '../auth/session-domain';

import type { RequestRepository } from './request-repository';
import { isDate, isLeaveType, type TimeOffRequest } from './time-off-domain';

const requestKey = 'time-off-app.requests';

function hasValidCancellation(value: Record<string, unknown>, startDate: string, endDate: string): boolean {
  if (value.cancelledFromDate === undefined && value.cancelledAt === undefined) {
    return value.status !== 'cancelled';
  }
  return (
    isDate(value.cancelledFromDate) &&
    isTimestamp(value.cancelledAt) &&
    value.cancelledFromDate >= startDate &&
    value.cancelledFromDate <= endDate &&
    (value.status === 'cancelled' ? value.cancelledFromDate === startDate : value.cancelledFromDate > startDate)
  );
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
    hasValidCancellation(value, value.startDate, value.endDate) &&
    (value.reviewerNote === undefined || typeof value.reviewerNote === 'string') &&
    ((value.status === 'pending' && value.reviewedAt === undefined) ||
      ((value.status === 'approved' || value.status === 'rejected') && isTimestamp(value.reviewedAt)) ||
      (value.status === 'cancelled' && (value.reviewedAt === undefined || isTimestamp(value.reviewedAt))))
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
