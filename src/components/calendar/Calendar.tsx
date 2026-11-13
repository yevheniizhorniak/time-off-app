import type { ReactElement, ReactNode } from 'react';

import { dateKey } from '../../type-safety/date-key';
import { ToaButton } from '../button/Button';

import { formatDate } from './format-date';
import { monthDays } from './month-days';

import './Calendar.scss';

export type ToaCalendarProps = {
  /** Only the local year and month are used. */
  month: Date;
  /** Selected YYYY-MM-DD local date. May be outside `month`. */
  selectedDate: string;
  /** Emits the adjacent month's first day at local noon, preserving selection. */
  onMonthChange: (month: Date) => void;
  /** Emits the selected YYYY-MM-DD local date. The parent updates selection. */
  onDateChange: (date: string) => void;
  /** Disables matching local dates. All dates are enabled by default. */
  isDateDisabled?: (date: string) => boolean;
  /** Non-interactive day annotations. Describe them in `getDayAriaLabel`. */
  renderDayContent?: (date: string) => ReactNode;
  /**
   * Accessible day label, localized by default.
   * @default formatDate
   */
  getDayAriaLabel?: (date: string) => string;
};

/** Controlled, Monday-first calendar using local dates. */
export function ToaCalendar({
  month,
  selectedDate,
  onMonthChange,
  onDateChange,
  isDateDisabled,
  renderDayContent,
  getDayAriaLabel = formatDate,
}: ToaCalendarProps): ReactElement {
  const today = dateKey();

  function moveMonth(offset: number): void {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + offset, 1, 12));
  }

  return (
    <div className="toa-calendar">
      <div className="toa-calendar__navigation">
        <ToaButton label="Previous" aria-label="Previous month" onClick={() => moveMonth(-1)} />
        <h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <ToaButton label="Next" aria-label="Next month" onClick={() => moveMonth(1)} />
      </div>
      <div className="toa-calendar__grid" role="group" aria-label="Choose a calendar date">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span className="toa-calendar__weekday" key={day}>
            {day}
          </span>
        ))}
        {monthDays(month).map((date, index) =>
          date ? (
            <button
              type="button"
              className="toa-calendar__day"
              key={date}
              disabled={isDateDisabled?.(date)}
              aria-label={getDayAriaLabel(date)}
              aria-pressed={date === selectedDate}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onDateChange(date)}
            >
              <span className="toa-calendar__day-content">
                <span>{Number(date.slice(-2))}</span>
                {renderDayContent?.(date)}
              </span>
            </button>
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </div>
    </div>
  );
}
