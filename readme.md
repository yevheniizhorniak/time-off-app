# Time Off App

Ionic React application for requesting and reviewing time off.

## Requirements

- Node.js 24
- Corepack (`corepack --version`)

## Run locally

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run dev
```

Open the local URL printed by Vite.

# Assumptions

## Requirements

- There are many employees and one superviser. Complex hierarchy is omitted to not overcomplicate it, but there is only one supervisor.
- Employee names are trimmed and matched case-insensitively. Returning as `Alex`, `alex`, or `Alex` opens the same employee's time off requests.
- Rejected periods can be requested again.

## Implementation

- UI Kit is used only in this app. There is no need to publish it as a separate package
- UI Kit will be used only in React, no web components needed
- App should support both mobile and website expirience
- To not inflate the scope spacing is not defined by token, but by arbitrary numbers

Ionic supplies routing, page structure, scrolling, and mobile integration through Capacitor. The app-specific React component library uses native HTML controls for explicit controlled APIs, semantic browser behavior, and styling through `--toa-*` design tokens. It is kept within this application rather than published as a separate package.

## Android debug build

See [Android build instructions](docs/android-build.md) to get a debug APK from
GitHub Actions or build and install it locally.

## Using the app

Enter a name and choose **Log in as employee**. Submit a date range, choose Paid Time Off, Sick day, or Parental Leave, and optionally add notes. Your list shows current/upcoming time off requests and past time off requests with their statuses and supervisor notes.

Use **Switch user**, then **Log in as a supervisor** to review the shared team list. Pending time off requests can be approved or rejected with an optional decision note. The Monday-first monthly calendar shows daily counts for pending and approved time off requests. Select a date to see the employees taking time off.

Different employees can request overlapping dates. Each employee's pending and approved periods block overlapping submissions, including shared start/end dates. Both endpoints are included, today is allowed, and past or reversed dates are rejected.

### Calendar policy

Calendars start on Monday. Start and end dates must be weekdays outside the configured Czech public holidays. Ranges may span weekends and holidays; these days are excluded from the team calendar's daily counts. Holidays remain on their actual dates without substitute weekdays. Organization-specific closures can be added in `src/features/time-off/holidays/additional-time-off-holidays.ts`.

Date-only values use `YYYY-MM-DD` in the device's local timezone, including the meaning of “today” and cancellation starting tomorrow. Audit timestamps are ISO instants, displayed using the device's local date. There is no organization-wide timezone setting, so users in different timezones can have different local dates for the same instant.

## Persistence and architecture

The list lives at `/time-off-requests`, with the employee form at `/time-off-requests/new`.

The app starts with empty data. Time off requests are stored locally in this browser under `time-off-app.time-off-requests` as `{ version: 2, timeOffRequests }`. Only this storage key and format are supported; invalid data is reported rather than replaced.

The active simulated login is kept in session storage under `time-off-app.session`, so it survives refresh within the tab. Switching users keeps submitted time off requests available. This demonstration uses name-based identities and a shared supervisor role. Anyone using the browser can choose either role.

Time off request validation and transitions live in `time-off-domain.ts`, independently of React and the component library. Shared date-key handling lives in `src/type-safety/`; date formatting and month layout stay with calendar presentation code. The domain accepts a narrow employee identity rather than an authentication session.

The time-off feature owns `time-off-request-repository.ts` and its `browser-time-off-request-repository.ts` adapter. The contract provides asynchronous `load`, `submit`, `review`, and `cancel` operations. Commands validate against current data and return the complete persisted collection for the current unpaginated app. Invalid submissions and stale reviews or cancellations reject with typed domain errors; other save failures retain their original cause. Collection-update callbacks stay private to the browser adapter, which creates IDs and timestamps inside each transaction.

Providers and hooks depend on feature-owned repository contracts. Session types and persistence live in `src/features/auth/`. Workflow components and React state live in `src/features/time-off/`. Reusable UI controls live in `src/components/`, with toast components, delivery, and hooks together in the `toast` folder. Routed screens live in `src/pages/`, with form coordination in the colocated `useNewTimeOffRequestForm.ts` hook. Adapter/provider composition lives in `src/App.tsx`.

The store loads after mounting and serializes reads and commands. Loading and saving have separate states, failed refreshes retain the last snapshot, and results from an unmounted or replaced repository lifecycle are ignored. The browser adapter validates stored data and saves before updating the UI. Storage events refresh other tabs. Web Locks serialize cross-tab changes where supported; the fallback has no cross-tab atomicity guarantee and concurrent writes may overwrite each other.

Persistence remains browser-local. The asynchronous command contract supports a future remote adapter, but a real backend must generate authoritative IDs and timestamps and enforce authentication, authorization, business validation, and concurrency control. The browser's role checks and supplied employee identity are a login simulation, not a security boundary. Session persistence remains synchronous browser session storage.

When saving fails, the form keeps its input and offers another submission attempt. Invalid saved time off requests are preserved and reported. Restore valid data or clear the active storage entry through browser developer tools, then choose **Retry loading time off requests**. To delete all of this browser's time off request history, clear `time-off-app.time-off-requests`. Browser storage access must be available for saving time off requests and restoring sessions.

## Storybook

```sh
corepack pnpm run storybook
```

Open http://localhost:6006 to explore the reusable controls, including date-field bounds, validation feedback, disabled/loading buttons, dialogs, and toasts. To create a static Storybook build, run `corepack pnpm run build-storybook`.

## Checks

```sh
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run build-storybook
corepack pnpm run test:unit
corepack pnpm exec playwright install chromium
corepack pnpm run test:e2e
```

Unit tests cover reusable controls, date rules, overlaps, calendar boundaries, and storage behavior. Playwright covers the employee/supervisor journey, employee isolation, reload persistence, validation, save failures, corrupt-data recovery, route guards, and keyboard login. It runs Chromium with Android, desktop, and iPhone emulation, exercising Ionic's Material Design and iOS modes. Layout checks include light and dark themes. Install Chromium once using the command above.

The lint command runs ESLint, TypeScript checks for the end-to-end tests, and Prettier formatting checks. The build command runs lint first and stops if it fails. The `test:unit` command runs Vitest with coverage thresholds. Pull requests automatically run the application build, unit coverage tests, every configured Playwright project, and the Storybook build. Superseded checks are cancelled and browser failure reports are uploaded. The checks can also be started manually; making them required for merging is a repository branch-protection setting. Android APK generation remains a separate manual workflow. Repository organization and component conventions are documented in AGENTS.md.
