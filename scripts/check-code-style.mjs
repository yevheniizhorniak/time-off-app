import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourceExtension = /\.[cm]?[jt]sx?$/;
const supportingSource = /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/;
const companionExtension = /\.(?:[cm]?[jt]sx?|css|scss|sass|less|md|mdx)$/;
const normalizeName = (name) => name.replaceAll('-', '').toLowerCase();

function unwrap(expression) {
  while (
    expression &&
    (ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isNonNullExpression(expression))
  ) {
    expression = expression.expression;
  }
  return expression;
}

function componentDefinitions(source) {
  const wrappers = new Set();
  const baseClasses = new Set();
  const namespaces = new Set();
  const jsxNames = new Set();
  const definitions = [];

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== 'react') continue;
    const clause = statement.importClause;
    if (clause?.name) namespaces.add(clause.name.text);
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        const imported = (binding.propertyName ?? binding.name).text;
        if (['memo', 'forwardRef'].includes(imported)) wrappers.add(binding.name.text);
        if (['Component', 'PureComponent'].includes(imported)) baseClasses.add(binding.name.text);
      }
    }
  }

  function reactMember(expression, members, imports) {
    return (
      (ts.isIdentifier(expression) && imports.has(expression.text)) ||
      (ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        namespaces.has(expression.expression.text) &&
        members.includes(expression.name.text))
    );
  }

  function isReactWrapper(expression) {
    expression = unwrap(expression);
    return (
      expression &&
      ts.isCallExpression(expression) &&
      reactMember(expression.expression, ['memo', 'forwardRef'], wrappers)
    );
  }

  function implementation(expression) {
    expression = unwrap(expression);
    if (!expression) return undefined;
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return expression;
    if (isReactWrapper(expression)) {
      return implementation(expression.arguments[0]);
    }
    return undefined;
  }

  function collectJsxNames(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName)) jsxNames.add(node.tagName.text);
    }
    ts.forEachChild(node, collectJsxNames);
  }
  collectJsxNames(source);

  function rendersJsx(node) {
    if (!node) return false;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
    // Nested helpers and render callbacks are independent of their enclosing function.
    if (ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) return false;
    return Boolean(ts.forEachChild(node, rendersJsx));
  }

  function isComponent(name, fn, declaredType) {
    const type = declaredType?.getText(source) ?? fn.type?.getText(source) ?? '';
    return (
      jsxNames.has(name) ||
      /\b(?:ReactElement|ReactNode|Element|FC|FunctionComponent|ComponentType)\b/.test(type) ||
      rendersJsx(fn.body)
    );
  }

  function add(name, node) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    definitions.push({ name, line: line + 1, column: character + 1 });
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text)) {
      const fn = implementation(node.initializer);
      if (fn && (isReactWrapper(node.initializer) || isComponent(node.name.text, fn, node.type))) {
        add(node.name.text, node);
      }
    } else if (ts.isExportAssignment(node)) {
      const fn = implementation(node.expression);
      if (fn && (isReactWrapper(node.expression) || isComponent(fn.name?.text ?? 'default', fn))) {
        add(fn.name?.text ?? 'default', node);
      }
    } else if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text;
      const isDefault = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
      if ((name && /^[A-Z]/.test(name)) || isDefault) {
        if (isComponent(name ?? 'default', node)) add(name ?? 'default', node);
      }
    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const isComponentClass = node.heritageClauses?.some(
        (clause) =>
          clause.token === ts.SyntaxKind.ExtendsKeyword &&
          clause.types.some((type) => reactMember(type.expression, ['Component', 'PureComponent'], baseClasses)),
      );
      if (isComponentClass) add(node.name?.text ?? 'default', node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return definitions;
}

/** Inspect a map of repository-relative filenames to contents without changing files. */
export function checkCodeStyle(sources) {
  const files = new Map([...sources].map(([file, contents]) => [file.replaceAll('\\', '/'), contents]));
  const diagnostics = [];
  const report = (file, line, column, message) => diagnostics.push({ file, line, column, message });

  for (const [file, contents] of files) {
    if (!file.startsWith('src/') || !sourceExtension.test(file) || file.endsWith('.d.ts')) continue;
    const filename = path.posix.basename(file);
    if (/^(?:utils|helpers)(?:\.|$)/i.test(filename)) {
      report(file, 1, 1, 'Use a filename describing its responsibility instead of utils or helpers.');
    }
    if (supportingSource.test(file)) continue;
    const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true);
    const components = componentDefinitions(source);
    for (const component of components.slice(1)) {
      report(
        file,
        component.line,
        component.column,
        `Move ${component.name} to its own implementation file; this file also defines ${components[0].name}.`,
      );
    }
    if (!components.length) continue;

    const stem = filename.replace(sourceExtension, '');
    const directory = path.posix.dirname(file);
    const companions = [...files.keys()].filter(
      (candidate) =>
        candidate !== file &&
        path.posix.dirname(candidate) === directory &&
        path.posix.basename(candidate).startsWith(stem + '.') &&
        companionExtension.test(candidate),
    );
    if (file === 'src/App.tsx') {
      // Only the starter App test is exempt; additional associated files still require review.
      const unexpected = companions.filter((candidate) => candidate !== 'src/App.test.tsx');
      if (unexpected.length) report(file, 1, 1, 'The App entrypoint exception covers only App.test.tsx.');
    } else if (companions.length && normalizeName(path.posix.basename(directory)) !== normalizeName(stem)) {
      report(
        file,
        1,
        1,
        `Keep ${filename} and its associated files (${companions.map((p) => path.posix.basename(p)).join(', ')}) in a dedicated ${stem} or kebab-case equivalent folder.`,
      );
    }
  }
  return diagnostics;
}

async function readSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return readSources(filename);
      if (!companionExtension.test(filename)) return [];
      return [[path.relative(process.cwd(), filename), await readFile(filename, 'utf8')]];
    }),
  );
  return groups.flat();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const diagnostics = checkCodeStyle(new Map(await readSources(path.resolve('src'))));
  for (const { file, line, column, message } of diagnostics) {
    console.error(`${file}:${line}:${column}: ${message}`);
  }
  if (diagnostics.length) process.exitCode = 1;
  else console.log('Code style checks passed.');
}
