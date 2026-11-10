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

## Storybook

```sh
corepack pnpm run storybook
```

Open http://localhost:6006 to view the starter component story. To create a static Storybook build, run `corepack pnpm run build-storybook`.

## Checks

```sh
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run build-storybook
corepack pnpm run test:unit
corepack pnpm exec playwright install chromium
corepack pnpm run test:e2e
```
