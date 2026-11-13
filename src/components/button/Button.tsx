import type { ComponentProps, ReactElement } from 'react';

import { ToaLoadingSpinner } from '../loading-spinner/LoadingSpinner';

import './Button.scss';

export type ToaButtonProps = Omit<ComponentProps<'button'>, 'children' | 'className'> & {
  /** Remains visible while loading. */
  label: string;
  /** Visual emphasis. Defaults to `primary`; `secondary` uses an outlined style. */
  emphasis?: 'primary' | 'secondary';
  /** Shows a spinner, disables activation, and sets `aria-busy`. Defaults to `false`. */
  loading?: boolean;
};

export function ToaButton({
  disabled,
  emphasis = 'primary',
  label,
  loading = false,
  type = 'button',
  ...buttonProps
}: ToaButtonProps): ReactElement {
  return (
    <button
      aria-busy={loading || buttonProps['aria-busy']}
      className={`toa-button toa-button--${emphasis}`}
      disabled={disabled || loading}
      type={type}
      {...buttonProps}
    >
      <span className="toa-button__content">
        {label}
        {loading && (
          <span className="toa-button__spinner">
            <ToaLoadingSpinner decorative />
          </span>
        )}
      </span>
    </button>
  );
}

// TODO: Check css classes preferred format
// TODO: Add ripple effect
