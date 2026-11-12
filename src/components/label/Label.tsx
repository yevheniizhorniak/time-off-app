import type { ComponentProps, ReactElement, ReactNode } from 'react';

import './Label.scss';

export type LabelProps = Omit<ComponentProps<'label'>, 'children'> & {
  /** Visible content naming the associated form control. */
  children: ReactNode;
  /** Shows a decorative required marker. Defaults to `false`. Set `required` on the associated control separately. */
  required?: boolean;
};

export default function Label({ children, className = '', required = false, ...labelProps }: LabelProps): ReactElement {
  return (
    <label {...labelProps} className={`toa-label ${className}`.trim()}>
      {children}
      {required && (
        <span aria-hidden="true" className="toa-label__required">
          {' *'}
        </span>
      )}
    </label>
  );
}
