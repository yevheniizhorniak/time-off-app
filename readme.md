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

## Android debug build

The Android app is named **Time Off App**, with package ID `com.example.timeoff`.
It bundles the web application and does not need a running Vite server.

Install Android Studio 2025.2.1 or newer, JDK 21, and these SDK packages through
Android Studio's SDK Manager: Android SDK Platform 36, Build-Tools 36.0.0, and
Platform-Tools. An emulator or device running Android 7 (API 24) or newer is
needed only to run the app. Accept the SDK licenses when prompted.

Point `JAVA_HOME` to a JDK 21 installation and `ANDROID_HOME` to your Android SDK.
These PowerShell settings apply only to the current terminal; replace the JDK
path with your installation path:

```powershell
$env:JAVA_HOME = 'C:\path\to\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

On Linux or macOS, set the equivalent environment variables in your shell:

```sh
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/Android/sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Build an installable APK from the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run build:android
```

The command builds the web application, synchronizes Capacitor, and runs the
checked-in Gradle wrapper's `assembleDebug` task. The first build downloads Gradle
and Android dependencies. The APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk` and uses standard debug signing.
Local builds do not run tests automatically; run `corepack pnpm run test` first
when checking changes.

With a device connected using USB debugging or an emulator running, install it:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Launch **Time Off App** from the device's app launcher. Requests are stored in the
app's local WebView storage, separately from your desktop browser. Uninstalling
the app clears that data.

Use `corepack pnpm run android:sync` to rebuild and synchronize web changes without
compiling an APK. Use `corepack pnpm run android:open` to open the native project
in Android Studio; select JDK 21 as its Gradle JDK. Keep native source and Gradle
wrapper files under version control. Copied web assets, build output, and local
SDK settings are generated and ignored.

### Manual GitHub Actions build

On GitHub, open **Actions → Android debug APK → Run workflow**, choose a branch,
and start the run. The workflow runs only on demand. It installs dependencies and
Playwright Chromium, then requires lint, every unit test, and all three browser
test projects to pass before building the APK. A failure stops the build and APK
upload; Playwright failure reports are uploaded when available.

Download the **time-off-app-android-debug** artifact from the successful run's
summary and extract `app-debug.apk`. Artifacts are retained for 14 days. No signing
secrets are needed; this is a test build, not a Play Store release. Different
machines or hosted runners may use different debug signing keys. If Android
rejects an update because of a signature mismatch, uninstall the previous build
before installing the new one (this clears its stored requests).

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
