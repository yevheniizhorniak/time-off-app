import type { RequestDraft } from './request-draft';

export type RequestErrors = Partial<Record<keyof RequestDraft, string>>;

export class RequestValidationError extends Error {
  constructor(public readonly errors: RequestErrors) {
    super('Check the highlighted fields.');
  }
}

export class RequestDecisionError extends Error {
  constructor() {
    super('This request has already been reviewed or is no longer available. Refresh the requests and try again.');
    this.name = 'RequestDecisionError';
  }
}

export class RequestCancellationError extends Error {
  constructor() {
    super('This request can no longer be cancelled. Refresh the requests and try again.');
    this.name = 'RequestCancellationError';
  }
}
