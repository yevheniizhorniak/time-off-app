export const leaveTypes = [
  { value: 'paid-time-off', label: 'Paid Time Off' },
  { value: 'sick-day', label: 'Sick day' },
  { value: 'parental-leave', label: 'Parental Leave' },
] as const;

export type LeaveType = (typeof leaveTypes)[number]['value'];

export function isLeaveType(value: unknown): value is LeaveType {
  return leaveTypes.some((type) => type.value === value);
}
