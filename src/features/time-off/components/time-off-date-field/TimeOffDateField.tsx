import { useId, useRef, useState, type MouseEvent, type ReactElement } from 'react';

import Button from '../../../../components/button/Button';
import Calendar from '../../../../components/calendar/Calendar';
import Label from '../../../../components/label/Label';
import { dateKey, formatDate, isDate } from '../../../../dates/calendar-dates';
import { isWeekend, timeOffHolidayName, timeOffHolidaysForYear } from '../../time-off-holidays';

import './TimeOffDateField.scss';

type TimeOffDateFieldProps = {
  /** Visible label and accessible trigger name. */
  label: string;
  /** Parent-controlled local YYYY-MM-DD date, or an empty string. */
  value: string;
  /** Receives an available local date when selected. */
  onChange: (date: string) => void;
  /** Earliest allowed local date. Past dates are always disabled. */
  min: string;
  /** Associated validation message, also marking the trigger invalid. */
  error?: string;
  /** Disables the trigger. Defaults to false. */
  disabled?: boolean;
  /** Displays the required indicator and description. Defaults to false. */
  required?: boolean;
};

export default function TimeOffDateField({
  label,
  value,
  onChange,
  min,
  error,
  disabled = false,
  required = false,
}: TimeOffDateFieldProps): ReactElement {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${min}T12:00:00`));
  const minimum = min > dateKey() ? min : dateKey();
  const holidays = timeOffHolidaysForYear(month.getFullYear()).filter(
    (holiday) => holiday.date.slice(0, 7) === dateKey(month).slice(0, 7),
  );

  function isUnavailable(date: string): boolean {
    return disabled || date < minimum || isWeekend(date) || !!timeOffHolidayName(date);
  }

  function openCalendar(): void {
    setMonth(new Date(`${isDate(value) ? value : minimum}T12:00:00`));
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeCalendar(): void {
    dialogRef.current?.close();
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectDate(date: string): void {
    if (isUnavailable(date)) return;
    onChange(date);
    closeCalendar();
  }

  function dismissBackdrop(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      closeCalendar();
    }
  }

  return (
    <div className="time-off-date-field">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <button
        type="button"
        id={id}
        className="time-off-date-field__trigger"
        ref={triggerRef}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-value ${id}-hint${error ? ` ${id}-error` : ''}`}
        onClick={openCalendar}
      >
        <span id={`${id}-value`}>{isDate(value) ? formatDate(value) : 'Choose a date'}</span>
      </button>
      <p className="time-off-date-field__hint" id={`${id}-hint`}>
        {required && 'Required. '}Weekends and public holidays are unavailable.
      </p>
      {error && (
        <p className="time-off-date-field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
      <dialog
        id={`${id}-dialog`}
        className="time-off-date-field__dialog"
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-legend`}
        onCancel={(event) => {
          event.preventDefault();
          closeCalendar();
        }}
        onClick={dismissBackdrop}
      >
        <h2 id={`${id}-title`}>Choose {label.toLowerCase()}</h2>
        <Calendar
          month={month}
          selectedDate={value}
          onMonthChange={setMonth}
          onDateChange={selectDate}
          isDateDisabled={isUnavailable}
          getDayAriaLabel={(date) => {
            const holiday = timeOffHolidayName(date);
            const reason = holiday ? `, public holiday: ${holiday}` : isWeekend(date) ? ', weekend' : '';
            return `${formatDate(date)}${reason}`;
          }}
          renderDayContent={(date) =>
            timeOffHolidayName(date) ? (
              <span className="time-off-date-field__holiday-marker" aria-hidden="true" />
            ) : null
          }
        />
        <p className="time-off-date-field__legend" id={`${id}-legend`}>
          <span className="time-off-date-field__holiday-marker" aria-hidden="true" /> Public holiday
        </p>
        {holidays.length > 0 && (
          <ul className="time-off-date-field__holidays" aria-label="Public holidays this month">
            {holidays.map((holiday) => (
              <li key={`${holiday.date}-${holiday.name}`}>
                {formatDate(holiday.date)} — {holiday.name}
              </li>
            ))}
          </ul>
        )}
        <div className="time-off-date-field__actions">
          <Button label="Cancel" onClick={closeCalendar} />
        </div>
      </dialog>
    </div>
  );
}
