import type { ReactElement } from 'react';

import './LoadingSpinner.scss';

export type ToaLoadingSpinnerProps = {
  /** Accessible message, ignored when decorative. Defaults to `Loading`. */
  label?: string;
  /** Hides redundant loading announcements. Defaults to `false`. */
  decorative?: boolean;
};

/** Animated loading indicator announced with `role="status"`. */
export function ToaLoadingSpinner({ label = 'Loading', decorative = false }: ToaLoadingSpinnerProps): ReactElement {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className="toa-loading-spinner"
      role={decorative ? undefined : 'status'}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle className="toa-loading-spinner__track" cx="12" cy="12" r="9" />
        <circle className="toa-loading-spinner__arc" cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}
