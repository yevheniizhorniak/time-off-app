import { leaveTypes, type LeaveType } from './types/leave-type';

export function leaveTypeLabel(type: LeaveType): string {
  return leaveTypes.find((option) => option.value === type)!.label;
}
