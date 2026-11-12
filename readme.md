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

## Using the app

Enter a name and choose **Log in as employee**. Submit a date range, choose Paid Time Off, Sick day, or Parental Leave, and optionally add notes. Your list shows current/upcoming requests and past requests with their statuses and supervisor notes.

Use **Switch user**, then **Log in as a supervisor** to review the shared team list. Pending requests can be approved or rejected with an optional decision note. The Monday-first monthly calendar shows daily counts for pending and approved requests. Select a date to see the employees taking time off.

Employee names are trimmed and matched case-insensitively. Returning as `Alex`, `alex`, or ` Alex ` opens the same employee's requests. Different employees can request overlapping dates. Each employee's pending and approved periods block overlapping submissions, including shared start/end dates. Rejected periods can be requested again. Both endpoints are included, today is allowed, and past or reversed dates are rejected.

## Persistence and architecture

The app starts with empty data. Requests are stored locally in this browser under `time-off-app.requests`, using a versioned format. The active simulated login is kept in session storage under `time-off-app.session`, so it survives refresh within the tab. Switching users keeps submitted requests available. This demonstration uses name-based identities and a shared supervisor role. Anyone using the browser can choose either role.

Shared request types, validation, workflow components, and React state live in `src/features/time-off/`. Reusable UI controls live in `src/components/`, routed screens in `src/pages/`, and adapter/provider composition in `src/App.tsx`. The request repository validates stored data, saves before updating the UI, and refreshes other tabs through storage events. Web Locks serialize concurrent changes across tabs where the browser supports them.

When saving fails, the form keeps its input and offers another submission attempt. Invalid saved requests are preserved and reported. Restore valid data or clear the `time-off-app.requests` entry through browser developer tools, then choose **Retry loading requests**. Clearing that entry deletes this browser's request history. Browser storage access must be available for saving requests and restoring sessions.

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
