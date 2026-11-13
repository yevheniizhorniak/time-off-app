import type { TimeOffRequest } from './time-off-request';
import type { TimeOffRequestSnapshot } from './time-off-request-snapshot';

export type TimeOffRequestStore = TimeOffRequestSnapshot & {
  busy: boolean;
  reload: () => void;
  persist: (change: (current: TimeOffRequest[]) => TimeOffRequest[]) => Promise<void>;
};
