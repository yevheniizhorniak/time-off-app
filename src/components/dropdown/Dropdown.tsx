import { useId, type ChangeEventHandler, type ComponentProps, type ReactElement } from 'react';

import './Dropdown.scss';

export type DropdownOption = {
  /** Must be unique and nonempty. An empty string is reserved for the placeholder. */
  value: string;
  /** Visible option text. */
  label: string;
  /** Prevents selecting this option. Defaults to `false`. */
  disabled?: boolean;
};

export type DropdownProps = Pick<ComponentProps<'select'>, 'id' | 'name' | 'disabled' | 'required'> & {
  /** Visible label and accessible name. */
  label: string;
  /** Selected option value. An empty string shows the placeholder. */
  value: string;
  /** Options in display order. */
  options: readonly DropdownOption[];
  /** Update `value` from `event.currentTarget.value`. */
  onChange: ChangeEventHandler<HTMLSelectElement>;
  /** Disabled prompt for an empty value. Defaults to `Select an option`. */
  placeholder?: string;
  /** Marks the control invalid and associates this validation message. */
  error?: string;
};

/** Controlled single-select field. Generates a control ID when `id` is omitted. */
export default function Dropdown({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  ...selectProps
}: DropdownProps): ReactElement {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="toa-dropdown">
      <label className="toa-dropdown__label" htmlFor={selectId}>
        {label}
        {selectProps.required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        {...selectProps}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="toa-dropdown__select"
        id={selectId}
        onChange={onChange}
        value={value}
      >
        <option disabled value="">
          {placeholder}
        </option>
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="toa-dropdown__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
