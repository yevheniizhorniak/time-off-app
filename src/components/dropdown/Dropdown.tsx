import { useId, type ChangeEventHandler, type ComponentProps, type ReactElement } from 'react';

import './Dropdown.scss';

/** A text option in a single-select dropdown. */
export type DropdownOption = {
  /** Unique, nonempty option value; the empty string is reserved for the placeholder. */
  value: string;
  /** Text displayed in the option list. */
  label: string;
  /** Prevents selecting this option. Defaults to `false`. */
  disabled?: boolean;
};

/** Controlled native single-select field with a visible label and optional validation feedback. */
export type DropdownProps = Pick<ComponentProps<'select'>, 'id' | 'name' | 'disabled' | 'required'> & {
  /** Visible label and accessible name for the select. */
  label: string;
  /** Selected option value, or an empty string to display the placeholder. */
  value: string;
  /** Available options, each with a unique, nonempty value. */
  options: readonly DropdownOption[];
  /** Native change handler; the parent updates `value` using `event.currentTarget.value`. */
  onChange: ChangeEventHandler<HTMLSelectElement>;
  /** Disabled prompt shown for an empty value. Defaults to `Select an option`. */
  placeholder?: string;
  /** Validation message displayed below and associated with the invalid select. */
  error?: string;
};

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
