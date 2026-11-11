---
name: ionic-react-components
description: Implement or update functional React components and screens in an existing Ionic React app, using native HTML elements by default.
---

# Ionic React components

Build the requested UI in the application's existing structure. Before editing, check its Ionic and React versions, router, theme, nearby components, scripts, and project instructions. Keep the user's requested scope; do not add a design system or restructure the app to implement one component.

## Implementation decisions

- Write React function components with hooks where needed. Use native HTML elements for controls and content by default. Choose an Ionic UI component only when a concrete interaction or framework requirement makes it a better fit; check the installed types or matching [Ionic component docs](https://ionicframework.com/docs/components) when its API is uncertain.
- Make requested interactions work: connect controls to state, callbacks, or navigation; handle relevant disabled, loading, and error states. Do not leave visual-only controls or placeholder handlers in a finished component.
- Keep `IonPage` where the app's Ionic router requires it for routed screens. Use native HTML within screens, and add `IonContent` only when its scrolling or Ionic integration is needed. Keep embedded components free of page wrappers. Follow the existing router and route registration point. See [Ionic React navigation](https://ionicframework.com/docs/react/navigation).
- Give reusable components typed, narrow props and explicit callbacks. Document each explicitly declared public prop with a brief JSDoc comment, including defaults or accessibility behavior when relevant; do not repeat documentation for inherited HTML or Ionic props. Keep workflow rules and data access outside presentational components. Extract a hook when component state or lifecycle coordination becomes hard to follow.
- Use standard React events for native HTML controls. If an Ionic control is justified, handle its documented `detail` type and account for nullable values; its events may differ from native input events. See the relevant component API, such as [ion-input](https://ionicframework.com/docs/api/input).
- Provide visible labels, accessible names, keyboard-usable actions, and useful error feedback for forms. Check focus and disabled states for interactive elements.
- Style native elements with the app's theme tokens. For interactive elements, define applicable hover, active, focus-visible, and disabled states inside the component's parent SCSS class (for example, `&:hover` and `&:active`). When using an Ionic component, use its supported CSS custom properties or shadow parts. Keep component styles beside the component when the project permits, and check narrow screens and both platform modes when styling is affected. See [Ionic theming](https://ionicframework.com/docs/theming/basics).

## Verification

Run the project's relevant formatting, typecheck, lint, and build commands. Exercise the changed interaction and screen navigation when possible. Add or update a focused test only when it covers meaningful behavior or a regression risk. Report what changed and any verification that could not be completed.
