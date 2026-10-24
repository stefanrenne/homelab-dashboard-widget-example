#!/usr/bin/env node
// Gives this template your widget's id:  npm run rename -- <id> [--name "Display name"]
// Renames example-counter, ExampleCounter and "Example counter" in the widget, its README, its
// tests and package.json. CHANGELOG.md and this script are left alone. The dashboard's
// `npm run new-widget` does the same for a copy of examples/widget-template.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID = /^[a-z0-9][a-z0-9-]{0,62}$/; // as the dashboard's loader
const SKIP = new Set(['node_modules', '.git', 'scripts', 'CHANGELOG.md', 'package-lock.json']);

/** Renames the template's widget in every text file under `dir`. */
export function renameWidget(dir, id, name = id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())) {
  if (!ID.test(id)) throw new Error(`"${id}" is not a widget id: lowercase letters, digits and dashes`);
  const pascal = id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('').replace(/^(\d)/, 'W$1');
  const changed = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(js|mjs|json|ya?ml|md)$/.test(e.name)) continue;
      const before = fs.readFileSync(p, 'utf8');
      const after = before.replaceAll('example-counter', id).replaceAll('ExampleCounter', pascal).replaceAll('Example counter', name);
      if (after !== before) {
        fs.writeFileSync(p, after);
        changed.push(path.relative(dir, p));
      }
    }
  };
  walk(dir);
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { name: { type: 'string' } } });
  if (!positionals[0]) {
    console.error('usage: npm run rename -- <id> [--name "Display name"]');
    process.exit(2);
  }
  try {
    const changed = renameWidget(ROOT, positionals[0], values.name);
    console.log(`renamed in ${changed.join(', ')}. Next: options in widget.yaml, fetch() in server.js, repository in package.json.`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
