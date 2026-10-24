// Tests the widget the way the dashboard calls it: server.js gets a ctx (widget API 1) and
// returns blocks. A small HTTP server stands in for the real API, so no dashboard is needed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import YAML from 'yaml';
import widget from '../server.js';

const manifest = YAML.parse(fs.readFileSync('widget.yaml', 'utf8'));
const i18n = JSON.parse(fs.readFileSync('i18n.json', 'utf8'));
const LANGS = ['en', 'nl', 'fr', 'de', 'es'];

let api;
let answer = { status: 200, body: { count: 42 } };
const requests = [];
before(async () => {
  api = http.createServer((req, res) => {
    requests.push({ url: req.url, authorization: req.headers.authorization });
    res.writeHead(answer.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(answer.body));
  });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
});
after(() => api.close());

/** A ctx like the dashboard's: options with defaults, a fetch that resolves against options.url. */
function ctx(options = {}, cache = new Map()) {
  const defaults = Object.fromEntries(Object.entries(manifest.options).filter(([, d]) => 'default' in d).map(([k, d]) => [k, d.default]));
  const all = { ...defaults, url: `http://127.0.0.1:${api.address().port}/api/`, ...options };
  return {
    apiVersion: 1,
    instanceId: 'test',
    options: all,
    cache,
    signal: new AbortController().signal,
    log: { info() {}, warn() {}, error() {} },
    fetch: (url, init) => fetch(new URL(url, all.url), init),
  };
}

test('the manifest is complete and secrets are marked', () => {
  assert.match(manifest.id, /^[a-z][a-z0-9-]*$/);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.apiVersion, 1);
  for (const [name, def] of Object.entries(manifest.options)) {
    if (/key|password|token/i.test(name)) assert.equal(def.secret, true, `${name} must be secret`);
  }
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.version, manifest.version, 'package.json and widget.yaml carry the same version');
});

test('i18n.json has every key in every language', () => {
  const keys = Object.keys(i18n.en).sort();
  for (const lang of LANGS) assert.deepEqual(Object.keys(i18n[lang] ?? {}).sort(), keys, lang);
});

test('server.js imports only node: built-ins', () => {
  const src = fs.readFileSync('server.js', 'utf8');
  for (const [, spec] of src.matchAll(/^import .* from '([^']+)'/gm)) assert.match(spec, /^node:/, spec);
});

test('returns the value, then the change since the last refresh', async () => {
  answer = { status: 200, body: { count: 42 } };
  const cache = new Map();
  const first = await widget.fetch(ctx({ key: 'secret-key' }, cache));
  assert.deepEqual(first.blocks.map((b) => [b.key, b.value]), [['value', 42], ['change', null]]);
  assert.deepEqual(requests.at(-1), { url: '/api/stats.json', authorization: 'Bearer secret-key' });

  answer = { status: 200, body: { count: 45 } };
  const second = await widget.fetch(ctx({ key: 'secret-key' }, cache));
  assert.equal(second.blocks[1].value, 3);
  for (const b of second.blocks) assert.ok(b.label in i18n.en, `label ${b.label} has a translation`);
});

test('reads another field when asked', async () => {
  answer = { status: 200, body: { users: 7 } };
  const out = await widget.fetch(ctx({ field: 'users' }));
  assert.equal(out.blocks[0].value, 7);
});

test('a failing API becomes a short error without the key', async () => {
  answer = { status: 401, body: {} };
  await assert.rejects(widget.fetch(ctx({ key: 'secret-key' })), (err) => /answered 401/.test(err.message) && !err.message.includes('secret-key'));
  answer = { status: 200, body: { other: 1 } };
  await assert.rejects(widget.fetch(ctx()), /no number in field "count"/);
});
