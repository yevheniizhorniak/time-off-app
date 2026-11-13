# Android debug build

**Time Off App** (`com.example.timeoff`) bundles the web app; no Vite server is
needed. Debug APKs are for testing, not Play Store releases, and need no signing
secrets.

## Build on GitHub

1. Open **Actions → Android debug APK → Run workflow**, choose a branch, and start
   the run. This workflow runs only on demand.
2. Download **time-off-app-android-debug** from the successful run's summary and
   extract `app-debug.apk`. Artifacts expire after 14 days.

The workflow installs dependencies and Playwright Chromium, then runs lint,
all unit tests, and the Mobile Chrome and Desktop Chrome browser test projects
before building. A failure stops
the build and APK upload; available Playwright failure reports are uploaded.

## Build locally

### Setup

- Node.js 24 and Corepack.
- Android Studio 2025.2.1 or newer and JDK 21.
- In Android Studio's SDK Manager, install **Android SDK Platform 36**,
  **Build-Tools 36.0.0**, and **Platform-Tools**. Accept the SDK licenses when prompted.

Set the paths for your installation in the terminal used for the build. These
settings apply only to the current terminal.

Windows PowerShell:

```powershell
$env:JAVA_HOME = 'C:\path\to\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

Linux or macOS:

```sh
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/Android/sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

### Build

Run from the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run build:android
```

This builds the web app, synchronizes Capacitor, and runs the checked-in Gradle
wrapper's `assembleDebug` task. The first build downloads Gradle and Android
dependencies. Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Local builds do not run tests automatically. When checking changes, run
`corepack pnpm run test` first; see the [README checks](../readme.md#checks) for setup.

## Install and run

Use a device with USB debugging enabled or a running emulator, on Android 7
(API 24) or newer. A device or emulator is needed only to run the app.

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

For a downloaded APK, use its path instead. Launch **Time Off App** from the app
launcher. Requests stay in the app's local WebView storage, separate from your
desktop browser. Uninstalling clears them.

Builds from different machines or GitHub runners may have different debug signing
keys. If an update fails with a signature mismatch, uninstall the old app, then
install the new APK. **This deletes stored requests.**

## Development commands

- `corepack pnpm run android:sync`: rebuild and synchronize web changes without
  compiling an APK.
- `corepack pnpm run android:open`: open the native project in Android Studio;
  select JDK 21 as the Gradle JDK.

Keep native source and Gradle wrapper files in Git. Copied web assets, build
output, and local SDK settings are generated and ignored.
