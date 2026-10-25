# Changelog

All user-visible changes. The format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- A Reset button: `action` in server.js (widget API 1, dashboard 0.8.0) starts the change again
  from the next value; client.js sends `hd-widget-action` and is disabled while `busy`.

## [1.1.0] - 2026-10-25

### Added
- `npm run rename -- <id>`: gives the template your widget's id everywhere.

## [1.0.0] - 2026-10-24

### Added
- The `example-counter` widget: a number from a JSON API and its change since the last refresh.
