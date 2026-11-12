export const leaveTypes = [
  { value: 'paid-time-off', label: 'Paid Time Off' },
  { value: 'sick-day', label: 'Sick day' },
  { value: 'parental-leave', label: 'Parental Leave' },
] as const;

export type LeaveType = (typeof leaveTypes)[number]['value'];
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type Session = { role: 'employee'; name: string; employeeKey: string } | { role: 'supervisor' };

export type RequestDraft = {
  startDate: string;
  endDate: string;
  leaveType: string;
  note: string;
};

export type TimeOffRequest = Omit<RequestDraft, 'leaveType'> & {
  id: string;
  employeeName: string;
  employeeKey: string;
  leaveType: LeaveType;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
};

export type RequestErrors = Partial<Record<keyof RequestDraft, string>>;

export class RequestValidationError extends Error {
  constructor(public readonly errors: RequestErrors) {
    super('Check the highlighted fields.');
  }
}

export function employeeKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Local calendar date, independent of UTC offsets. */
export function dateKey(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
}

export function isLeaveType(value: unknown): value is LeaveType {
  return leaveTypes.some((type) => type.value === value);
}

export function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function leaveTypeLabel(type: LeaveType): string {
  return leaveTypes.find((option) => option.value === type)!.label;
}

export function requestsOnDate(requests: readonly TimeOffRequest[], date: string): TimeOffRequest[] {
  return requests.filter(
    (request) => request.status !== 'rejected' && request.startDate <= date && request.endDate >= date,
  );
}

export function validateRequest(
  draft: RequestDraft,
  key: string,
  requests: readonly TimeOffRequest[],
  today = dateKey(),
): RequestErrors {
  const errors: RequestErrors = {};
  if (!isDate(draft.startDate)) errors.startDate = 'Enter a valid start date.';
  else if (draft.startDate < today) errors.startDate = 'Start date must be today or later.';
  if (!isDate(draft.endDate)) errors.endDate = 'Enter a valid end date.';
  else if (draft.endDate < today) errors.endDate = 'End date must be today or later.';
  else if (!errors.startDate && draft.endDate < draft.startDate)
    errors.endDate = 'End date must be on or after the start date.';
  if (!isLeaveType(draft.leaveType)) errors.leaveType = 'Choose a time off type.';

  if (
    !errors.startDate &&
    !errors.endDate &&
    requests.some(
      (request) =>
        request.employeeKey === key &&
        request.status !== 'rejected' &&
        draft.startDate <= request.endDate &&
        draft.endDate >= request.startDate,
    )
  ) {
    errors.startDate = 'These dates overlap one of your pending or approved requests.';
  }
  return errors;
}

export function monthDays(month: Date): (string | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: count }, (_, index) =>
      dateKey(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)),
    ),
  ];
}
