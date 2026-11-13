# Time Off App

Ionic React application for requesting and reviewing time off.

## Requirements

- Node.js 24
- Corepack (`corepack --version`) runs the pnpm version pinned in `package.json`, keeping local development and CI consistent.

## Run locally

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run dev
```

### Storybook

```sh
corepack pnpm run storybook
```

Open the local URL printed by Vite.

## Assumptions

### Product rules

- There are multiple employees and one shared supervisor role. The supervisor sees all requests.
- Login is a simulation. Employee names are trimmed and matched case-insensitively, so `Alex`, `alex`, and `Alex` identify the same employee.
- This app offers Paid Time Off, Sick day, and Parental Leave, with the same validation and approval rules for each.
- Requests cover whole days, including both endpoints. Today is allowed. past dates and reversed ranges are rejected.
- Start and end dates must be weekdays outside Czech public holidays. A range may span weekends and holidays, but those days do not count in the team calendar. Holidays use their actual dates without substitute weekdays.
- An employee's pending and approved requests cannot overlap, including shared endpoints. Different employees may request the same dates. Rejected or cancelled dates can be requested again.
- New requests start as pending. The supervisor can approve or reject a pending request once, with an optional note. Decisions cannot be revised, and submitted requests cannot be edited.
- Cancellation extends the assignment: employees can cancel the future portion of their own pending or approved requests without supervisor approval. Cancellation starts no earlier than tomorrow and preserves today's and past leave history.
- Employee lists use the original end date to distinguish past requests from current/upcoming requests, regardless of status. The supervisor's calendar is an additional view of pending and approved leave on working days.
- Calendar dates and the meaning of today follow the device's local timezone. There is no organization-wide timezone setting.

### Implementation choices

- Browser-local storage is used, as permitted by the assignment. Requests are shared between simulated users in the same browser storage, with no backend or synchronization between devices. The active login lasts for the browser tab's session.
- First launch seeds example requests for `testusr`, the prefilled employee name, so past, upcoming, and reviewed states can be explored immediately. Existing saved data is retained.
- The component library is React-only and maintained inside this app. Publishing a separate package or providing web components is outside the scope.
- The mobile-first layout also supports desktop browsers. Colors and other shared design values use `--toa-*` tokens. spacing uses local numeric values rather than a spacing-token scale.

## Using the app

The employee-name field defaults to `testusr` whenever the login page opens. It has some pre-created data for past requests.

See [Calendar policy](docs/calendar-policy.md) for calendar, holiday, and timezone rules.

## Persistence and architecture

The list lives at `/time-off-requests`, with the employee form at `/time-off-requests/new`.

On first launch, the app creates three demonstration requests for `testusr`: past approved Paid Time Off, past rejected Sick day, and upcoming pending Paid Time Off. Dates are relative to the device's local date at initialization and exclude weekends and configured Czech holidays. Supervisors see these examples immediately. other employees start with empty personal lists.

Time off requests are stored locally in this browser under `time-off-app.time-off-requests` as `{ version: 2, timeOffRequests }`. Examples are created only when this storage key is absent. Existing data, including empty collections, is preserved without backfilling examples. Reloads preserve demo dates and review decisions. To restore the examples, clear this key using browser developer tools and reload. this removes all existing request history in this browser. Only this storage key and format are supported. invalid data is reported rather than replaced.

The active simulated login is kept in session storage under `time-off-app.session`, so it survives refresh within the tab. Switching users keeps submitted time off requests available. This demonstration uses name-based identities and a shared supervisor role. Anyone using the browser can choose either role.

Time off request validation and transitions live in `time-off-domain.ts`, independently of React and the component library. Shared date-key handling lives in `src/type-safety/`. date formatting and month layout stay with calendar presentation code. The domain accepts a narrow employee identity rather than an authentication session.

The time-off feature owns `time-off-request-repository.ts` and its `browser-time-off-request-repository.ts` adapter. The contract provides asynchronous `load`, `submit`, `review`, and `cancel` operations. Commands validate against current data and return the complete persisted collection for the current unpaginated app. Invalid submissions and stale reviews or cancellations reject with typed domain errors. other save failures retain their original cause. Collection-update callbacks stay private to the browser adapter, which creates IDs and timestamps inside each transaction.

Providers and hooks depend on feature-owned repository contracts. Session types and persistence live in `src/features/auth/`. Workflow components and React state live in `src/features/time-off/`. Reusable UI controls live in `src/components/`, with toast components, delivery, and hooks together in the `toast` folder. Routed screens live in `src/pages/`, with form coordination in the colocated `useNewTimeOffRequestForm.ts` hook. Adapter/provider composition lives in `src/App.tsx`.

The store loads after mounting and serializes reads and commands. Loading and saving have separate states, failed refreshes retain the last snapshot, and results from an unmounted or replaced repository lifecycle are ignored. The browser adapter validates stored data and saves before updating the UI. Storage events refresh other tabs. Web Locks serialize cross-tab changes where supported. the fallback has no cross-tab atomicity guarantee and concurrent writes may overwrite each other.

Persistence remains browser-local. The asynchronous command contract supports a future remote adapter, but a real backend must generate authoritative IDs and timestamps and enforce authentication, authorization, business validation, and concurrency control. The browser's role checks and supplied employee identity are a login simulation, not a security boundary. Session persistence remains synchronous browser session storage.

When saving fails, the form keeps its input and offers another submission attempt. Invalid saved time off requests are preserved and reported. Restore valid data or clear the active storage entry through browser developer tools, then choose **Retry loading time off requests**. To delete all of this browser's time off request history, clear `time-off-app.time-off-requests`. Browser storage access must be available for saving time off requests and restoring sessions.

## Android debug build

See [Android build instructions](docs/android-build.md) to get a debug APK from
GitHub Actions or build and install it locally.
