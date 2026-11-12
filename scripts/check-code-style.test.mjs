import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkCodeStyle } from './check-code-style.mjs';

const inspect = (contents, file = 'src/Example.tsx', companions = {}) =>
  checkCodeStyle(new Map([[file, contents], ...Object.entries(companions)]));

test('reports separate function, arrow, and class components with source locations', () => {
  const diagnostics = inspect(`import { Component } from 'react';
function First() { return <div />; }
const Second = () => <span />;
class Third extends Component { render() { return <p />; } }`);
  assert.equal(diagnostics.length, 2);
  assert.match(diagnostics[0].message, /Move Second.*First/);
  assert.equal(diagnostics[0].line, 3);
  assert.match(diagnostics[1].message, /Move Third/);
  assert.equal(diagnostics[1].line, 4);
  assert.ok(diagnostics.every(({ file, column }) => file === 'src/Example.tsx' && column > 0));
});

test('counts nested helpers, but allows non-component helpers, types, and constants', () => {
  assert.match(
    inspect(`function Outer() {
    function Inner() { return <span />; }
    return <Inner />;
  }`)[0].message,
    /Move Inner/,
  );
  assert.deepEqual(
    inspect(`type Props = { value: string };
    const LIMIT = 3;
    function format(value: string) { return value.trim(); }
    export default function Example({value}: Props) { return <p>{format(value)}</p>; }`),
    [],
  );
});

test('does not count render callbacks or component references as implementations', () => {
  assert.deepEqual(
    inspect(`import { memo } from 'react';
    const Example = () => <section>{[1, 2].map(value => <p key={value}>{value}</p>)}</section>;
    const Cached = memo(Example);`),
    [],
  );
  assert.deepEqual(
    inspect(`function Example() {
    return <section>{[1, 2].map(function Item(value) { return <p>{value}</p>; })}</section>;
  }`),
    [],
  );
  assert.deepEqual(
    inspect(`export default function Example() {
    const renderItem = (value: string) => <p>{value}</p>;
    return <List renderItem={renderItem} />;
  }`),
    [],
  );
});

test('recognizes typed components returning null and components used in JSX', () => {
  assert.equal(
    inspect(`const Empty: React.FC = () => null;
    function Example() { return <Empty />; }`).length,
    1,
  );
  assert.equal(
    inspect(`function Empty() { return null; }
    function Example() { return <Empty />; }`).length,
    1,
  );
});

test('recognizes memo and forwardRef, including aliases, without double counting named functions', () => {
  for (const contents of [
    `import { memo, forwardRef } from 'react';
     const First = memo(function First() { return <div />; });
     const Second = forwardRef((props, ref) => <div ref={ref} />);`,
    `import { memo as cache, forwardRef as withRef } from 'react';
     const First = cache(() => <div />);
     const Second = cache(withRef(function Render(props, ref) { return <span ref={ref} />; }));`,
    `import * as React from 'react';
     const First = React.memo(() => <div />);
     const Second = React.forwardRef(() => <span />);`,
  ]) {
    const diagnostics = inspect(contents);
    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0].message, /Move Second.*First/);
  }
  assert.deepEqual(
    inspect(`import React from 'react';
    export default React.memo(function Example() { return <div />; });`),
    [],
  );
  assert.equal(
    inspect(`import { memo, forwardRef } from 'react';
    const First = memo(() => null);
    const Second = forwardRef(() => null);`).length,
    1,
  );
});

test('recognizes anonymous default components and React class aliases', () => {
  assert.equal(
    inspect(`const Helper = () => <div />;
    export default () => <Helper />;`).length,
    1,
  );
  assert.equal(
    inspect(`import { PureComponent as Base } from 'react';
    class First extends Base { render() { return null; } }
    export default class extends Base { render() { return null; } }`).length,
    1,
  );
});

test('allows multiple components in tests and stories', () => {
  const contents = 'function First() { return <div />; } const Second = () => <p />;';
  for (const suffix of ['test', 'spec', 'stories']) {
    assert.deepEqual(inspect(contents, `src/Example.${suffix}.tsx`), []);
  }
});

test('requires a dedicated folder for same-stem tests, stories, styles, and documentation', () => {
  for (const suffix of ['test.tsx', 'stories.tsx', 'scss', 'md', 'docs.mdx']) {
    const diagnostics = inspect('export default () => <div />;', 'src/components/Example.tsx', {
      [`src/components/Example.${suffix}`]: '',
    });
    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0].message, /dedicated Example/);
  }
});

test('accepts PascalCase and kebab-case folders and checks Windows paths', () => {
  for (const folder of ['RequestCard', 'request-card']) {
    assert.deepEqual(
      inspect('export default () => <div />;', `src/components/${folder}/RequestCard.tsx`, {
        [`src/components/${folder}/RequestCard.scss`]: '',
      }),
      [],
    );
  }
  assert.equal(
    inspect('export default () => <div />;', 'src\\components\\Example.tsx', {
      'src\\components\\Example.test.tsx': '',
    }).length,
    1,
  );
});

test('does not require component folders for standalone components or non-component modules', () => {
  assert.deepEqual(inspect('export default () => <div />;'), []);
  assert.deepEqual(
    inspect('export const count = 1;', 'src/request-domain.ts', {
      'src/request-domain.test.ts': '',
    }),
    [],
  );
});

test('limits the App companion exception to the starter location and test', () => {
  const app = 'export default () => <div />;';
  assert.deepEqual(inspect(app, 'src/App.tsx', { 'src/App.test.tsx': '' }), []);
  assert.equal(inspect(app, 'src/pages/App.tsx', { 'src/pages/App.test.tsx': '' }).length, 1);
  assert.match(inspect(app, 'src/App.tsx', { 'src/App.scss': '' })[0].message, /only App.test.tsx/);
  assert.equal(inspect(app + '\nfunction Extra() { return <p />; }', 'src/App.tsx').length, 1);
});

test('rejects generic source filenames while preserving descriptive and framework filenames', () => {
  for (const filename of ['utils.ts', 'helpers.tsx', 'helpers.test.ts']) {
    assert.equal(inspect('export const value = 1;', `src/${filename}`).length, 1);
  }
  for (const filename of ['browser-storage-repositories.ts', 'route.ts', 'page.tsx']) {
    assert.deepEqual(inspect('export const value = 1;', `src/${filename}`), []);
  }
  assert.deepEqual(inspect('export const value = 1;', 'scripts/helpers.ts'), []);
});

test('CLI succeeds for compliant source and fails with actionable diagnostics for violations', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'time-off-code-style-'));
  const script = fileURLToPath(new URL('./check-code-style.mjs', import.meta.url));
  try {
    mkdirSync(path.join(directory, 'src'));
    writeFileSync(path.join(directory, 'src', 'Example.tsx'), 'export default () => <div />;');
    assert.match(execFileSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' }), /passed/);
    writeFileSync(path.join(directory, 'src', 'Example.scss'), '');
    assert.throws(
      () =>
        execFileSync(process.execPath, [script], {
          cwd: directory,
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      (error) => error.status === 1 && /src\/Example.tsx:1:1:.*dedicated Example/.test(error.stderr),
    );
  } finally {
    // The exact mkdtemp-created directory is the only recursive deletion target.
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('time-off-code-style-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
