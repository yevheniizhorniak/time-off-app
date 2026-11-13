import type { TimeOffRequestDraft } from './time-off-request-draft';
import type { TimeOffRequestSnapshot } from './time-off-request-snapshot';

export type TimeOffState = TimeOffRequestSnapshot & {
  busy: boolean;
  reload: () => void;
  submitTimeOffRequest: (draft: TimeOffRequestDraft) => Promise<void>;
  reviewTimeOffRequest: (id: string, status: 'approved' | 'rejected', note: string) => Promise<void>;
  cancelTimeOffRequest: (id: string) => Promise<void>;
};
