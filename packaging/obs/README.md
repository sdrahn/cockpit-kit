# Building on the openSUSE Build Service

This directory holds a self-contained spec file for building `cockpit-kit`
on [build.opensuse.org](https://build.opensuse.org/), targeting current
SUSE and openSUSE distributions:

- openSUSE Tumbleweed
- openSUSE Leap (15.6, 16.0)
- SUSE Linux Enterprise 15 (SP6/SP7) and 16

It's deliberately separate from `packaging/cockpit-kit.spec.in`, which is
templated by this project's own `Makefile` for Fedora/RHEL and, on Fedora
>= 42, rebuilds the JavaScript bundle from system `nodejs-*` packages during
`%build`. openSUSE doesn't yet package all the npm libraries this UI bundles
(PatternFly, xterm.js, ...) as system modules, and OBS build workers have no
network access during `%build` anyway, so `packaging/obs/cockpit-kit.spec`
takes the simpler, always-correct route: it ships the already-built `dist/`
bundle inside the source tarball and just installs it. No `_service` file
fetches or builds anything on the OBS side — the tarball is built locally
and uploaded like any other source file.

## 1. Build the source tarball

From the repository root, with Node.js and npm available:

```bash
make dist VERSION=0.1.0
```

This runs the same `dist` target used for the Fedora package: it installs
npm dependencies, builds `dist/` in production mode, and produces
`cockpit-kit-0.1.0.tar.xz` containing the project sources plus the built
`dist/`. Keep `VERSION` in sync with `Version:` in `cockpit-kit.spec` (and
with a `git tag` for that release, if you're tagging releases).

## 2. Create or update the OBS package

```bash
osc checkout <your-namespace>/cockpit-kit   # or: osc mkpac cockpit-kit
cd <your-namespace>/cockpit-kit

cp /path/to/cockpit-kit/packaging/obs/cockpit-kit.spec .
cp /path/to/cockpit-kit/packaging/obs/cockpit-kit.changes .
cp /path/to/cockpit-kit/cockpit-kit-0.1.0.tar.xz .

# Add a dated entry (or use `osc vc` to open an editor for one)
osc vc cockpit-kit.changes

osc addremove
osc commit -m "Update to 0.1.0"
```

## 3. Test-build locally before committing

```bash
osc build openSUSE_Tumbleweed x86_64 cockpit-kit.spec
osc build openSUSE_Leap_16.0 x86_64 cockpit-kit.spec
osc build SLE_15_SP7 x86_64 cockpit-kit.spec
```

(add/adjust repositories with `osc repairwc` / your project's `_meta` as
needed — a fresh `osc mkpac` won't have any repositories configured until
you add some, typically by inheriting from a project like
`systemsmanagement:cockpit` or `openSUSE:Factory`).

## Notes

- `appstream-util validate-relax` (from the `appstream-glib` package) is
  used in `%check` to validate `org.cockpit_project.kit.metainfo.xml`,
  matching the `%check` step in the Fedora spec.
- `Requires: cockpit-bridge` and `Recommends: kit` mirror the Fedora spec;
  `kit` (https://github.com/mark3labs/kit) isn't packaged for openSUSE/SLE
  yet either, so it stays a soft recommendation rather than a hard
  dependency — without it on `PATH`, the page shows install instructions.
- If openSUSE gains the nodejs-\* packages needed to rebuild the bundle
  from source (matching how some other Cockpit UI modules build on
  Tumbleweed), the `%prep`/`%build` sections here can be extended the same
  way `packaging/cockpit-kit.spec.in` does for Fedora >= 42, guarded by
  `%if 0%{?suse_version}` instead.
