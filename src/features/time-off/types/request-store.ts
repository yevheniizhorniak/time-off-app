import type { RequestSnapshot } from './request-snapshot';
import type { TimeOffRequest } from './time-off-request';

export type RequestStore = RequestSnapshot & {
  busy: boolean;
  reload: () => void;
  persist: (change: (current: TimeOffRequest[]) => TimeOffRequest[]) => Promise<void>;
};
