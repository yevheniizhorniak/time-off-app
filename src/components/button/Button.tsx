import type { ComponentProps, ReactElement } from 'react';

import LoadingSpinner from '../loading-spinner/LoadingSpinner';

import './Button.scss';

export type ToaButtonProps = Omit<ComponentProps<'button'>, 'children' | 'className'> & {
  /** Remains visible while loading. */
  label: string;
  /** Shows a spinner, disables activation, and sets `aria-busy`. Defaults to `false`. */
  loading?: boolean;
};

/** Native button. Defaults to `type="button"`. */
export default function ToaButton({
  disabled,
  label,
  loading = false,
  type = 'button',
  ...buttonProps
}: ToaButtonProps): ReactElement {
  return (
    <button
      aria-busy={loading || buttonProps['aria-busy']}
      className="toa-button"
      disabled={disabled || loading}
      type={type}
      {...buttonProps}
    >
      {label}
      {loading && (
        <span className="toa-button__spinner">
          <LoadingSpinner decorative />
        </span>
      )}
    </button>
  );
}

// TODO: Check css classes preferred format
// TODO: Add ripple effect
