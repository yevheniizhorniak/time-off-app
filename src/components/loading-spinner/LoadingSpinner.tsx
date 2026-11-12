import type { ReactElement } from 'react';

import './LoadingSpinner.scss';

export type LoadingSpinnerProps = {
  /** Accessible loading message. Defaults to `Loading`; ignored when decorative. */
  label?: string;
  /** Hides the spinner from assistive technology when surrounding content conveys loading. Defaults to `false`. */
  decorative?: boolean;
};

export default function LoadingSpinner({ label = 'Loading', decorative = false }: LoadingSpinnerProps): ReactElement {
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
