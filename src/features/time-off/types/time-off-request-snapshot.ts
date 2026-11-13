import type { TimeOffRequest } from './time-off-request';

export type TimeOffRequestSnapshot = {
  timeOffRequests: TimeOffRequest[];
  storageError: string | null;
};
