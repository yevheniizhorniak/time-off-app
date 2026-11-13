# Time Off App

Ionic React application for requesting and reviewing time off. You can quickly check deployed versions of an [app](https://time-off-app-kappa.vercel.app/) and [storybook](https://time-off-app-storybook.vercel.app/).

Mobile apk for an Android can be built using GH Action.

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

## Android debug build

See [Android build instructions](docs/android-build.md) to get a debug APK from
GitHub Actions or build and install it locally.
