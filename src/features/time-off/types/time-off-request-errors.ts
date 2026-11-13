import type { TimeOffRequestDraft } from './time-off-request-draft';

export type TimeOffRequestErrors = Partial<Record<keyof TimeOffRequestDraft, string>>;

export class TimeOffRequestValidationError extends Error {
  constructor(public readonly errors: TimeOffRequestErrors) {
    super('Check the highlighted fields.');
  }
}

export class TimeOffRequestDecisionError extends Error {
  constructor() {
    super(
      'This time off request has already been reviewed or is no longer available. Refresh the time off requests and try again.',
    );
    this.name = 'TimeOffRequestDecisionError';
  }
}

export class TimeOffRequestCancellationError extends Error {
  constructor() {
    super('This time off request can no longer be cancelled. Refresh the time off requests and try again.');
    this.name = 'TimeOffRequestCancellationError';
  }
}
