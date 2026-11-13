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

## Code

- UI Kit is used only in this app. There is no need to publish it as a separate package
- UI Kit will be used only in React, no web components needed
- App should support both mobile and website expirience

## Android debug build

See [Android build instructions](docs/android-build.md) to get a debug APK from
GitHub Actions or build and install it locally.

## Using the app

Enter a name and choose **Log in as employee**. Submit a date range, choose Paid Time Off, Sick day, or Parental Leave, and optionally add notes. Your list shows current/upcoming time off requests and past time off requests with their statuses and supervisor notes.

Use **Switch user**, then **Log in as a supervisor** to review the shared team list. Pending time off requests can be approved or rejected with an optional decision note. The Monday-first monthly calendar shows daily counts for pending and approved time off requests. Select a date to see the employees taking time off.

Different employees can request overlapping dates. Each employee's pending and approved periods block overlapping submissions, including shared start/end dates. Both endpoints are included, today is allowed, and past or reversed dates are rejected.

## Persistence and architecture

The list lives at `/time-off-requests`, with the employee form at `/time-off-requests/new`.

The app starts with empty data. Time off requests are stored locally in this browser under `time-off-app.time-off-requests` as `{ version: 2, timeOffRequests }`. Only this storage key and format are supported; invalid data is reported rather than replaced.

The active simulated login is kept in session storage under `time-off-app.session`, so it survives refresh within the tab. Switching users keeps submitted time off requests available. This demonstration uses name-based identities and a shared supervisor role. Anyone using the browser can choose either role.

Shared time off request types and validation live in `time-off-domain.ts`. The time-off feature owns `time-off-request-repository.ts` and its `browser-time-off-request-repository.ts` adapter. Session types, `session-repository.ts`, and `browser-session-repository.ts` live in `src/features/auth/`. Providers and hooks depend on feature-owned repository contracts. Workflow components and React state live in `src/features/time-off/`. Reusable UI controls live in `src/components/`, with toast components, delivery, and hooks together in the `toast` folder. Routed screens live in `src/pages/`, with time-off-request-form coordination in the colocated `useNewTimeOffRequestForm.ts` hook. Adapter/provider composition lives in `src/App.tsx`. The time off request repository validates stored data, saves before updating the UI, and refreshes other tabs through storage events. Web Locks serialize concurrent changes across tabs where the browser supports them.

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

The lint command runs ESLint, TypeScript checks for the end-to-end tests, and Prettier formatting checks. The `test:unit` command runs Vitest. The Android workflow runs both commands. Repository organization and component conventions are documented in AGENTS.md.
