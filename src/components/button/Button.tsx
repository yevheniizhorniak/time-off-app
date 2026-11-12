import type { ComponentProps, ReactElement } from 'react';

import LoadingSpinner from '../loading-spinner/LoadingSpinner';

import './Button.scss';

export type ToaButtonProps = Omit<ComponentProps<'button'>, 'children' | 'className'> & {
  /** Text shown on the button, including while loading. */
  label: string;
  /** Shows a spinner, disables the button, and marks it busy. Defaults to `false`. */
  loading?: boolean;
};

export default function ToaButton({ disabled, label, loading = false, ...buttonProps }: ToaButtonProps): ReactElement {
  return (
    <button
      aria-busy={loading || buttonProps['aria-busy']}
      className="toa-button"
      disabled={disabled || loading}
      {...buttonProps}
    >
      {label}
      {loading && (
        <span className="toa-button__spinner-container">
          <LoadingSpinner decorative />
        </span>
      )}
    </button>
  );
}

// TODO: Check css classes preferred format
// TODO: Add ripple effect
