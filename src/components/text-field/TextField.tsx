import { useId, type ChangeEventHandler, type ComponentProps, type ReactElement } from 'react';

import Label from '../label/Label';

import './TextField.scss';

/** Controlled native single-line text field with a visible label and optional validation feedback. */
export type TextFieldProps = Pick<
  ComponentProps<'input'>,
  | 'id'
  | 'name'
  | 'placeholder'
  | 'disabled'
  | 'required'
  | 'readOnly'
  | 'autoComplete'
  | 'minLength'
  | 'maxLength'
  | 'inputMode'
  | 'pattern'
> & {
  /** Visible label and accessible name for the input. */
  label: string;
  /** Current text; the parent owns and updates this value. */
  value: string;
  /** Native change handler; update `value` using `event.currentTarget.value`. */
  onChange: ChangeEventHandler<HTMLInputElement>;
  /** Validation message displayed below and associated with the invalid control. */
  error?: string;
  /** Native text input type. Defaults to `text`. */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
};

export default function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  ...inputProps
}: TextFieldProps): ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = `${controlId}-error`;

  return (
    <div className="toa-text-field">
      <Label htmlFor={controlId} required={inputProps.required}>
        {label}
      </Label>
      <input
        {...inputProps}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="toa-text-field__input"
        id={controlId}
        onChange={onChange}
        type={type}
        value={value}
      />
      {error && (
        <p className="toa-text-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
