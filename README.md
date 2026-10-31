# homelab-dashboard widget example

A complete, working third-party widget for
[homelab-dashboard](https://github.com/stefanrenne/homelab-dashboard), set up the way a
widget repository should be: manifest, server and client code, translations, tests that run
without the dashboard, and CI that turns a version tag into a release.

Use it as the starting point for your own widget: press **Use this template** on GitHub (or
copy the files), then follow [Make it your own](#make-it-your-own).

## Try it

```yaml
# settings.yaml of the dashboard
plugins:
  - source: git+https://github.com/stefanrenne/homelab-dashboard-widget-example#latest

# services.yaml
- Apps:
    - My app:
        href: http://app.lan
        widget:
          type: example-counter
          url: http://app.lan/api/        # the widget reads <url>stats.json
          key: "{{HD_VAR_APP_KEY}}"       # optional, sent as a Bearer token
          field: count                    # the number to show (default: count)
        filter: widget.full == false      # optional: hide the card until the number reaches max
```

`#latest` installs the newest release tag and the dashboard locks it in
`plugins/plugins.lock.yaml`; `POST /api/plugins/sync?update=1` moves it to a newer release.
Pin a release with `#v1.0.0` instead.

## Files

| File | Required | What |
|---|---|---|
| `widget.yaml` | yes | Manifest: id, version, apiVersion, refresh, options schema, public attributes |
| `server.js` | no | Fetches the data on the server; may use secret options |
| `client.js` | no | Custom rendering as a Web Component `hd-<id>`; without it the dashboard renders `blocks` |
| `i18n.json` | no | Labels per language (`en`, `nl`, `fr`, `de`, `es`) |
| `assets/` | no | Static files for `client.js`, served at `/widgets/<id>/assets/` |
| `tests/` | | `node:test` against a fake API, through the same `ctx` the dashboard passes |
| `scripts/rename.mjs` | | `npm run rename -- <id>`: gives the template your widget's id |
| `.github/workflows/ci.yml` | | Tests on every push; a release for a tag `vX.Y.Z` (or a run by hand on `main`) |
| `.github/dependabot.yml` | | Weekly grouped update PRs for the CI actions and the test tools |
| `.github/workflows/dependabot-automerge.yml` | | Merges a Dependabot PR once CI passed on it |

## Make it your own

1. Pick a unique id (lowercase, it becomes `type:` in `services.yaml`) and run
   `npm run rename -- <id> --name "Display name"`: it renames `example-counter` in
   `widget.yaml`, `client.js` (`hd-<id>`), `package.json`, this README and the tests. Two widgets
   with the same id cannot both be installed: the dashboard keeps the first.
2. Set `name`, `description` and the `options`. Mark every key, token or password
   `secret: true`: secret options reach `server.js` only, never the browser.
3. Write `server.js`. Import only `node:` built-ins; the dashboard loads the file as it is,
   without `npm install`. Throw a short error on failure (`the API answered 401`): it shows on the
   card, and "answered 401/403/404" gets advice for the user.
4. Return `blocks` whose labels are keys in `i18n.json`, with a translation in every language.
   Delete `client.js` if the standard blocks are enough.
5. Optionally publish `attributes`: public values (boolean, number, string or null) declared under
   `attributes:` in `widget.yaml` and returned as `attributes` from `fetch`, so users can
   [hide a service's card](https://stefanrenne.github.io/homelab-dashboard/configuration/services.html#filtering-services)
   with `filter:` (`filter: widget.full == false`). The dashboard keeps only declared names of
   the declared type; never put a secret in one.
6. Update `package.json` (name, repository) and this README.

## Develop

```yaml
# settings.yaml of a local dashboard (npm run dev in the dashboard repo)
plugins:
  - path: ~/git/my-widget
```

A widget of your own wins over one with the same id from the dashboard's default collection.
The dashboard watches its config folder, not your widget: after a change to the widget, save a
config file or `curl -X POST -H 'X-Requested-With: homelab-dashboard' localhost:3000/api/plugins/sync`,
and the changed files load again.

```bash
npm install && npm test
```

## Release

1. Bump `version` in `widget.yaml` and `package.json` (a test checks they match).
2. Move the `## [Unreleased]` notes in `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`.
3. Commit, then `git tag -a vx.y.z -m vx.y.z` and `git push --follow-tags`. Or push `main` and
   run the CI workflow by hand on `main` (**Actions > CI > Run workflow**): it releases
   `widget.yaml`'s version and creates the tag, and does nothing for a version that is out.

CI checks that the tag matches `widget.yaml` and creates the GitHub release. Users on `#latest`
get it on their next plugin update. To publish on npm as well: `npm publish`, and users install
it with `source: npm:<name>@x.y.z`.

## Dependabot

Dependabot opens one PR a week per ecosystem, and `dependabot-automerge.yml` merges it when CI
passes. GitHub's own token may not merge a change to a workflow file, which the github-actions
updates are. For those, add a fine-grained token as the repository secret `AUTOMERGE_TOKEN`
(this repository only; Contents, Pull requests and Workflows: read and write). Without it those
PRs wait for a manual merge.

## Reference

- [Writing a widget](https://github.com/stefanrenne/homelab-dashboard/blob/main/docs/widgets/authoring.md)
- [Widget API reference](https://github.com/stefanrenne/homelab-dashboard/blob/main/docs/widgets/api-reference.md)
- [Security model](https://github.com/stefanrenne/homelab-dashboard/blob/main/docs/widgets/security.md)
- [homelab-dashboard-widgets](https://github.com/stefanrenne/homelab-dashboard-widgets): twelve
  real widgets (Radarr, Sonarr, Unraid, ...) in one collection.
