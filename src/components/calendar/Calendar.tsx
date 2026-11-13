import type { ReactElement, ReactNode } from 'react';

import { dateKey, formatDate, monthDays } from '../../dates/calendar-dates';
import Button from '../button/Button';

import './Calendar.scss';

/** A controlled, Monday-first calendar for selecting a single local date. */
export type CalendarProps = {
  /** Displayed month; only the local year and month are used. */
  month: Date;
  /** Selected local date in YYYY-MM-DD form; may be outside the displayed month. */
  selectedDate: string;
  /** Receives the adjacent month's first day at local noon. Does not change selection. */
  onMonthChange: (month: Date) => void;
  /** Receives the clicked local date in YYYY-MM-DD form. The parent updates selection. */
  onDateChange: (date: string) => void;
  /** Optional non-interactive content below each day number. Include its meaning in getDayAriaLabel. */
  renderDayContent?: (date: string) => ReactNode;
  /** Accessible name for each day button. Defaults to the formatted local date. */
  getDayAriaLabel?: (date: string) => string;
};

export default function Calendar({
  month,
  selectedDate,
  onMonthChange,
  onDateChange,
  renderDayContent,
  getDayAriaLabel = formatDate,
}: CalendarProps): ReactElement {
  const today = dateKey();

  function moveMonth(offset: number): void {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + offset, 1, 12));
  }

  return (
    <div className="toa-calendar">
      <div className="toa-calendar__navigation">
        <Button label="Previous" aria-label="Previous month" onClick={() => moveMonth(-1)} />
        <h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <Button label="Next" aria-label="Next month" onClick={() => moveMonth(1)} />
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
              aria-label={getDayAriaLabel(date)}
              aria-pressed={date === selectedDate}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onDateChange(date)}
            >
              <span>{Number(date.slice(-2))}</span>
              {renderDayContent?.(date)}
            </button>
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </div>
    </div>
  );
}
