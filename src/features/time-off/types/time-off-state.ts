import type { TimeOffRequest } from './time-off-request';
import type { TimeOffRequestDraft } from './time-off-request-draft';

export type TimeOffState = {
  timeOffRequests: TimeOffRequest[];
  storageError: string | null;
  busy: boolean;
  reload: () => void;
  submitTimeOffRequest: (draft: TimeOffRequestDraft) => Promise<void>;
  reviewTimeOffRequest: (id: string, status: 'approved' | 'rejected', note: string) => Promise<void>;
  cancelTimeOffRequest: (id: string) => Promise<void>;
};
