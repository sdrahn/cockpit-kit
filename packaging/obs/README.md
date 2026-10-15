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
bundle inside the source tarball and just installs it.

That tarball is built by [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
(via `make dist`, the same target the Fedora package uses) and attached to
the matching GitHub Release whenever a version tag (`X.Y.Z`, no `v` prefix)
is pushed. The [`_service`](_service) file here fetches that exact release
asset with the `download_url` source service. Since OBS build workers have
no network access, that service can't run automatically server-side —
`mode="manual"` means it only runs when the packager explicitly invokes
`osc service manualrun` (or `runall`), which does have network access, and
the downloaded tarball then gets committed as a normal source file.

## 1. Point `_service` and the spec at a release

Pick the version to package (it must already have a tarball attached to
its GitHub Release — check that `.github/workflows/release.yml` has run for
that tag, or trigger it manually via `workflow_dispatch` for an older one),
then bump both of these to match it:

- the version in the `path` param of [`_service`](_service)
- `Version:` in [`cockpit-kit.spec`](cockpit-kit.spec)

## 2. Create or update the OBS package

```bash
osc checkout <your-namespace>/cockpit-kit   # or: osc mkpac cockpit-kit
cd <your-namespace>/cockpit-kit

cp /path/to/cockpit-kit/packaging/obs/cockpit-kit.spec .
cp /path/to/cockpit-kit/packaging/obs/cockpit-kit.changes .
cp /path/to/cockpit-kit/packaging/obs/_service .

# Downloads the tarball named in _service (needs network: run this on
# your own machine, not a build worker) and records it in _servicedata.
osc service manualrun

# Add a dated entry (or use `osc vc` to open an editor for one)
osc vc cockpit-kit.changes

osc addremove
osc commit -m "Update to 0.1.8"
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
- `osc service manualrun` writes `_servicedata` recording what it fetched;
  commit that alongside the downloaded tarball. Add a `verify_file`
  service afterwards (with the tarball's sha256) if you want OBS to
  re-verify the download on every `manualrun`/`localrun`.
- To cut a new release: push a plain `X.Y.Z` tag (`git tag 0.1.8 && git
  push origin 0.1.8`). That alone triggers the GitHub Actions workflow,
  which builds the tarball and creates (or updates) the matching GitHub
  Release for it — no need to draft the release by hand first.
