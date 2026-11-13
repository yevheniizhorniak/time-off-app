import type { RequestDraft } from './request-draft';
import type { TimeOffRequest } from './time-off-request';

export type TimeOffState = {
  requests: TimeOffRequest[];
  storageError: string | null;
  busy: boolean;
  reload: () => void;
  submitRequest: (draft: RequestDraft) => Promise<void>;
  reviewRequest: (id: string, status: 'approved' | 'rejected', note: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
};
