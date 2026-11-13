# Mobile validation

Verified on November 13, 2026: lint, application build, Storybook build, 197 unit
tests, and all 84 browser tests passed on the development machine. CI workflows
have been updated but were not run remotely during implementation.

## Automated coverage

Run `corepack pnpm exec playwright install chromium webkit`, then
`corepack pnpm run test:e2e`.

The suite runs against Pixel 7 Chromium, desktop Chromium, and iPhone 13 WebKit.
The iPhone project exercises WebKit and Ionic's iOS mode; it is not a physical
iPhone or an Android WebView test.

Focused mobile checks cover 320x740 and 360x740 portrait layouts and a short
568x240 landscape viewport. They verify calendar overflow, date selection,
month navigation, dialog bounds, scrolling to actions, and focus restoration.
A 320x240 check exercises confirmation-dialog scrolling and cancellation.
Calendar days retain at least 52px height, with at least 44px width at the tested
360px and wider viewports. At 320px, narrower days preserve the seven-column grid.
Additional checks verify unrestricted zoom metadata and pointer-specific hover
feedback. Existing workflow tests cover login, submission, approval, rejection,
and cancellation in all three browser projects.

Ionic handles the header's top inset and toolbar side insets. Page content adds
side and bottom safe-area clearance; custom native dialogs account for all four
insets. Desktop WebKit screenshots were inspected at 320px and 360px portrait
widths and in short landscape, including the scrolled date-picker actions.

