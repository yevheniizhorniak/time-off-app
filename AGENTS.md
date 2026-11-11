# Project instructions

## Folder organization

- Keep application code in `src/`. Use the repository root for project configuration and entry documents; follow framework and tooling requirements for files that need specific locations.
- Start with the Ionic React starter structure: routed screens in `src/pages/`, reusable UI in `src/components/`, and application composition in `src/App.tsx`. Keep page-specific code near its page, and create additional folders only when actual code needs them.
- Introduce `src/features/<feature>/` when grouping a distinct business capability makes related components, hooks, types, and data access easier to find and change together. Feature folders are optional; do not create them for every screen or role, or duplicate time-off request logic between employee and supervisor views.
- Keep reusable UI components independent of employee or supervisor workflows. Share domain logic in a clearly named module used by both views; reuse alone does not make domain logic part of the UI component library.
- Preserve the starter's entry points and keep routing and providers in `src/App.tsx` until extracting them improves clarity. Keep shared theme files in `src/theme/` and component-specific styling beside its component.
- Place tests, stories, and page- or feature-specific assets near the code they support when tooling permits; use dedicated folders for application-wide assets or tests spanning multiple features. Distinguish source assets from files that must be served unchanged from a public directory.
- Use descriptive, consistent folder names that express purpose; avoid catch-all folders such as `misc` or an unstructured `utils`. Keep nesting shallow unless an additional level clarifies ownership.
- When moving files, update affected imports, asset references, and tooling configuration. Limit reorganization to the task at hand unless a wider change is needed for correctness.

## SOLID principles

- Follow SOLID principles in proportion to the problem; avoid speculative abstractions.
- Single responsibility: keep business policy, persistence, transport adapters, and UI rendering separate when they have different reasons to change. Extract complex UI lifecycle and state coordination into hooks.
- Open/closed: use small composition points for demonstrated variation instead of expanding conditionals throughout consumers.
- Liskov substitution: implementations and test doubles must preserve their contracts, including failure behavior and invariants.
- Interface segregation: define narrow contracts around consumer needs; avoid exposing infrastructure APIs to business logic or UI.
- Dependency inversion: business logic should depend on small contracts, with concrete database, framework, and network adapters wired at the application boundary.
