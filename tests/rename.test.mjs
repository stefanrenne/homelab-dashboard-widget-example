// The rename script, on a copy of this repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renameWidget } from '../scripts/rename.mjs';

test('rename: a new id everywhere, the changelog and the script left alone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-rename-'));
  try {
    fs.cpSync('.', dir, { recursive: true, filter: (src) => !/node_modules|\.git(\/|$)/.test(src) });
    const changed = renameWidget(dir, 'my-nas', 'My NAS');
    for (const f of ['widget.yaml', 'client.js', 'package.json', 'README.md']) assert.ok(changed.includes(f), f);
    const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(read('widget.yaml'), /^id: my-nas/m);
    assert.match(read('widget.yaml'), /^name: My NAS/m);
    assert.match(read('client.js'), /customElements\.define\('hd-my-nas', MyNas\)/);
    assert.equal(JSON.parse(read('package.json')).name, 'hd-widget-my-nas');
    assert.ok(!/example-counter/.test(read('widget.yaml') + read('client.js') + read('README.md')));
    assert.match(read('CHANGELOG.md'), /example-counter/, 'history stays');
    assert.throws(() => renameWidget(dir, 'My NAS'), /not a widget id/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
