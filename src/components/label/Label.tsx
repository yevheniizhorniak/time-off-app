import type { ComponentProps, ReactElement, ReactNode } from 'react';

import './Label.scss';

export type LabelProps = Omit<ComponentProps<'label'>, 'children'> & {
  /** Visible, accessible label. */
  children: ReactNode;
  /** Decorative marker. Set the control's `required` separately. Defaults to `false`. */
  required?: boolean;
};

/** Associates label content with a control through `htmlFor`. */
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
