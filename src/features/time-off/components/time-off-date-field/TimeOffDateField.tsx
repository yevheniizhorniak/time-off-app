import { useId, useState, type MouseEvent, type ReactElement } from 'react';

import { ToaButton } from '../../../../components/button/Button';
import { ToaCalendar } from '../../../../components/calendar/Calendar';
import { formatDate } from '../../../../components/calendar/format-date';
import { ToaDialog } from '../../../../components/dialog/Dialog';
import { ToaLabel } from '../../../../components/label/Label';
import { dateKey } from '../../../../type-safety/date-key';
import { isDate } from '../../../../type-safety/is-date';
import { isWeekend } from '../../holidays/is-weekend';
import { timeOffHolidayName } from '../../holidays/time-off-holiday-name';
import { timeOffHolidaysForYear } from '../../holidays/time-off-holidays-for-year';

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
  /** Additional unavailable dates and their accessible explanations. */
  getDateUnavailableReason?: (date: string) => string | undefined;
};

export default function TimeOffDateField({
  label,
  value,
  onChange,
  min,
  error,
  disabled = false,
  required = false,
  getDateUnavailableReason,
}: TimeOffDateFieldProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${min}T12:00:00`));
  const minimum = min > dateKey() ? min : dateKey();
  const holidays = timeOffHolidaysForYear(month.getFullYear()).filter(
    (holiday) => holiday.date.slice(0, 7) === dateKey(month).slice(0, 7),
  );

  function isUnavailable(date: string): boolean {
    return (
      disabled || date < minimum || isWeekend(date) || !!timeOffHolidayName(date) || !!getDateUnavailableReason?.(date)
    );
  }

  function openCalendar(event: MouseEvent<HTMLButtonElement>): void {
    // Safari does not focus buttons on click; the dialog needs its return target.
    event.currentTarget.focus();
    setMonth(new Date(`${isDate(value) ? value : minimum}T12:00:00`));
    setOpen(true);
  }

  function closeCalendar(): void {
    setOpen(false);
  }

  function selectDate(date: string): void {
    if (isUnavailable(date)) return;
    onChange(date);
    closeCalendar();
  }

  return (
    <div className="time-off-date-field">
      <ToaLabel htmlFor={id} required={required} text={label} />
      <button
        type="button"
        id={id}
        className="time-off-date-field__trigger"
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
        {getDateUnavailableReason && ' Dates already requested are unavailable and skipped inside a new range.'}
      </p>
      {error && (
        <p className="time-off-date-field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
      <ToaDialog
        id={`${id}-dialog`}
        className="time-off-date-field__dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-legend`}
        isOpen={open}
        onDismiss={closeCalendar}
      >
        <h2 id={`${id}-title`}>Choose {label.toLowerCase()}</h2>
        <ToaCalendar
          month={month}
          selectedDate={value}
          onMonthChange={setMonth}
          onDateChange={selectDate}
          isDateDisabled={isUnavailable}
          getDayAriaLabel={(date) => {
            const holiday = timeOffHolidayName(date);
            const reason = holiday ? `, public holiday: ${holiday}` : isWeekend(date) ? ', weekend' : '';
            const unavailableReason = getDateUnavailableReason?.(date);
            return `${formatDate(date)}${reason}${unavailableReason ? `, ${unavailableReason}` : ''}`;
          }}
          renderDayContent={(date) => (
            <>
              {timeOffHolidayName(date) && <span className="time-off-date-field__holiday-marker" aria-hidden="true" />}
              {getDateUnavailableReason?.(date) && (
                <span className="time-off-date-field__request-marker" aria-hidden="true" />
              )}
            </>
          )}
        />
        <p className="time-off-date-field__legend" id={`${id}-legend`}>
          <span className="time-off-date-field__legend-item">
            <span className="time-off-date-field__holiday-marker" aria-hidden="true" /> Public holiday
          </span>
          {getDateUnavailableReason && (
            <span className="time-off-date-field__legend-item">
              <span className="time-off-date-field__request-marker" aria-hidden="true" /> Pending or approved time off
            </span>
          )}
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
          <ToaButton emphasis="secondary" label="Cancel" onClick={closeCalendar} />
        </div>
      </ToaDialog>
    </div>
  );
}
