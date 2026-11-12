import { useId, type ChangeEventHandler, type ComponentProps, type ReactElement } from 'react';

import Label from '../label/Label';

import './TextArea.scss';

/** Controlled native multiline text area with a visible label and optional validation feedback. */
export type TextAreaProps = Pick<
  ComponentProps<'textarea'>,
  'id' | 'name' | 'placeholder' | 'disabled' | 'required' | 'readOnly' | 'autoComplete' | 'minLength' | 'maxLength'
> & {
  /** Visible label and accessible name for the text area. */
  label: string;
  /** Current text; the parent owns and updates this value. */
  value: string;
  /** Native change handler; update `value` using `event.currentTarget.value`. */
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  /** Validation message displayed below and associated with the invalid control. */
  error?: string;
  /** Number of visible text rows. Defaults to `4`. */
  rows?: number;
};

export default function TextArea({
  id,
  label,
  value,
  onChange,
  error,
  rows = 4,
  ...textareaProps
}: TextAreaProps): ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = `${controlId}-error`;

  return (
    <div className="toa-text-area">
      <Label htmlFor={controlId} required={textareaProps.required}>
        {label}
      </Label>
      <textarea
        {...textareaProps}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="toa-text-area__textarea"
        id={controlId}
        onChange={onChange}
        rows={rows}
        value={value}
      />
      {error && (
        <p className="toa-text-area__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
