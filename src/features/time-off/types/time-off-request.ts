import { trimLowerCase } from '../../../trim-lower-case';
import { isDate } from '../../../type-safety/is-date';
import { isRecord } from '../../../type-safety/is-record';
import { isTimestamp } from '../../../type-safety/is-timestamp';
import { isWeekend } from '../holidays/is-weekend';
import { timeOffHolidayName } from '../holidays/time-off-holiday-name';

import { isLeaveType, type LeaveType } from './leave-type';
import type { TimeOffRequestDraft } from './time-off-request-draft';

export type TimeOffRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type TimeOffRequest = Omit<TimeOffRequestDraft, 'leaveType'> & {
  id: string;
  employeeName: string;
  employeeKey: string;
  leaveType: LeaveType;
  status: TimeOffRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
  cancelledFromDate?: string;
  cancelledAt?: string;
  /** Working dates permanently skipped because another request covered them at submission. */
  excludedDates?: string[];
};

function hasValidExcludedDates(dates: unknown, startDate: string, endDate: string): boolean {
  return (
    dates === undefined ||
    (Array.isArray(dates) &&
      dates.every((date: unknown, index: number) => {
        const previous: unknown = dates[index - 1];
        return (
          isDate(date) &&
          date > startDate &&
          date < endDate &&
          !isWeekend(date) &&
          !timeOffHolidayName(date) &&
          (index === 0 || (typeof previous === 'string' && previous < date))
        );
      }))
  );
}

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

export function isTimeOffRequest(value: unknown): value is TimeOffRequest {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.employeeName === 'string' &&
    value.employeeName.trim().length > 0 &&
    value.employeeKey === trimLowerCase(value.employeeName) &&
    isDate(value.startDate) &&
    isDate(value.endDate) &&
    value.startDate <= value.endDate &&
    isLeaveType(value.leaveType) &&
    typeof value.note === 'string' &&
    isTimestamp(value.createdAt) &&
    hasValidCancellation(value, value.startDate, value.endDate) &&
    hasValidExcludedDates(value.excludedDates, value.startDate, value.endDate) &&
    (value.reviewerNote === undefined || typeof value.reviewerNote === 'string') &&
    ((value.status === 'pending' && value.reviewedAt === undefined) ||
      ((value.status === 'approved' || value.status === 'rejected') && isTimestamp(value.reviewedAt)) ||
      (value.status === 'cancelled' && (value.reviewedAt === undefined || isTimestamp(value.reviewedAt))))
  );
}
