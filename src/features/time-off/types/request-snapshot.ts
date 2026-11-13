import type { TimeOffRequest } from './time-off-request';

export type RequestSnapshot = {
  requests: TimeOffRequest[];
  storageError: string | null;
};
