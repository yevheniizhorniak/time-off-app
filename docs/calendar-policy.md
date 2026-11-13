# Calendar policy

Calendars start on Monday. Start and end dates must be weekdays outside the configured Czech public holidays. Ranges may span weekends and holidays; these days are excluded from the team calendar's daily counts. Holidays remain on their actual dates without substitute weekdays. Organization-specific closures can be added in `src/features/time-off/holidays/additional-time-off-holidays.ts`.

Date-only values use `YYYY-MM-DD` in the device's local timezone, including the meaning of “today” and cancellation starting tomorrow. Audit timestamps are ISO instants, displayed using the device's local date. There is no organization-wide timezone setting, so users in different timezones can have different local dates for the same instant.
