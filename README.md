# Cockpit Kit

A [Cockpit](https://cockpit-project.org/) module that brings
[Kit](https://github.com/mark3labs/kit) — the extensible AI coding agent CLI
— into the Cockpit web UI.

It adds a "Kit" page to Cockpit with:

- **Overview** — whether Kit is installed, its version, and an at-a-glance
  authentication status.
- **Terminal** — the real, interactive Kit TUI running in a browser
  terminal (a Cockpit pty channel + xterm.js), scoped to a working
  directory you pick.
- **Models** — browse Kit's local models.dev database and refresh it.
- **Extensions** — list/validate discovered extensions, scaffold an example,
  and install extensions from a git repository (in an embedded terminal,
  since installs can prompt interactively).
- **Authentication** — `kit auth status`, plus OAuth login (in an embedded
  terminal, since login flows print a URL and may prompt) and logout for
  Anthropic, OpenAI and GitHub Copilot.
- **GitHub integration** — scaffold the `.github/workflows/kit.yml`
  `/kit`-comment workflow for a repository.
- **Configuration** — view and edit the user's `~/.kit.yml`.

Everything runs as the logged-in Cockpit user (their `kit` binary, their
`~/.kit.yml`, their stored credentials) — this module has no server
component of its own and does not require administrator/root access.

## Requirements

- Cockpit >= 137.
- The [`kit`](https://github.com/mark3labs/kit) binary on the `PATH` of the
  user Cockpit is logged in as. If it's missing, the page shows install
  instructions instead of the usual tabs.

## Building

```bash
make        # fetches pkg/lib from cockpit-project/cockpit and builds dist/
```

## Installing

```bash
make devel-install    # symlink dist/ into ~/.local/share/cockpit/kit
# or
sudo make install PREFIX=/usr
```

Reload Cockpit in the browser afterwards; "Kit" appears in the tools menu.

## Development

```bash
npm install
npm run watch    # rebuild on save
```

`npm run eslint` / `npm run stylelint` lint the source; `npx tsc --noEmit`
type-checks it.

## Packaging

`make rpm` / `make srpm` build an RPM using `packaging/cockpit-kit.spec.in`,
following the same pattern as
[cockpit-project/starter-kit](https://github.com/cockpit-project/starter-kit).

## Design notes

Kit is a terminal-first tool (an interactive Bubble Tea TUI, plus a
non-interactive `--json` mode, and an ACP/ daemon server — no HTTP API), so
this module is a hybrid: read-only status is fetched with plain
`cockpit.spawn()` calls (`kit auth status`, `kit models`, `kit extensions
list`, ...), while anything that starts a live process or can prompt
interactively (the main session, `kit auth login`, `kit install`) runs the
real `kit` binary in a genuine pty via a Cockpit `stream` channel, rendered
with the same `Terminal` component Cockpit's own Terminal page uses. That
way every Kit feature — themes, sessions, extensions, subagents, OAuth
flows — works exactly as it does in a real terminal, without this module
having to reimplement any of it.
