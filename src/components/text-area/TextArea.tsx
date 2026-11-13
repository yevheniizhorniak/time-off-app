import { useId, type ChangeEventHandler, type ComponentProps, type ReactElement } from 'react';

import { ToaLabel } from '../label/Label';

import './TextArea.scss';

export type ToaTextAreaProps = Pick<
  ComponentProps<'textarea'>,
  'id' | 'name' | 'placeholder' | 'disabled' | 'required' | 'readOnly' | 'autoComplete' | 'minLength' | 'maxLength'
> & {
  /** Visible label and accessible name. */
  label: string;
  /** Parent-controlled text. */
  value: string;
  /** Update `value` from `event.currentTarget.value`. */
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  /** Marks the control invalid and associates this validation message. */
  error?: string;
  /** Number of visible text rows. Defaults to `4`. */
  rows?: number;
};

/** Controlled multiline input. Generates a control ID when `id` is omitted. */
export function ToaTextArea({
  id,
  label,
  value,
  onChange,
  error,
  rows = 4,
  ...textareaProps
}: ToaTextAreaProps): ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = `${controlId}-error`;

  return (
    <div className="toa-text-area">
      <ToaLabel htmlFor={controlId} required={textareaProps.required}>
        {label}
      </ToaLabel>
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
