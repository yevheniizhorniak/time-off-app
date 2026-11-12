# Requirements assumptions

- When user opens the app it shows login screen with 2 buttons in the center: "Log in as employee" (require a name) "Log in as a supervisor"
- There are many employees and one superviser. Complex hierarchy is omitted to not overcomplicate it, but there is only one supervisor.

# Architectural assumptions

- UI Kit is used only in this app. There is no need to publish it as a separate package
- UI Kit will be used only in React, no web components needed
- App should support both mobile and website expirience

# Employee expirience

## Page with list of past and upcoming requests

Ideally a calendar with highlighted dates. Initialy make it a list. Think about caching the result.

- you shouldn't be able to request a date which already has time off on it. you request periods as an entity, not separate date.

There should be a button to request a time off.

On click on this button there should be a view with fields with types:

- start date (date) calendar
- end date (date) calendar (add validation that dates are not in the past and are in chronological order)
- time off type (Paid Time Off, Sick day, Parental Leave)
- note (optional)

# Supervisor expirience

List of pending requests, calendar to see overlapping requests from different people.
