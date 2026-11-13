import type { TimeOffRequest } from './time-off-request';

export type TimeOffRequestSnapshot = {
  timeOffRequests: TimeOffRequest[];
  loadError: string | null;
  loading: boolean;
  hasLoaded: boolean;
};
