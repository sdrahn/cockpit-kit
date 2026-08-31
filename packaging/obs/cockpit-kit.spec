#
# spec file for package cockpit-kit
#
# This file targets the openSUSE Build Service (build.opensuse.org) and is
# built against openSUSE Tumbleweed, openSUSE Leap, and SUSE Linux
# Enterprise (SLE) 15/16. See packaging/obs/README.md for how to build and
# submit it.
#

Name:           cockpit-kit
Version:        0.1.0
Release:        0
Summary:        Cockpit UI for the Kit AI coding agent
License:        LGPL-2.1-or-later
URL:            https://github.com/sdrahn/cockpit-kit

# Built locally with "make dist" (see packaging/obs/README.md), which
# bundles the already-built src/ (dist/) alongside the project sources.
# openSUSE's build workers have no network access during %build, and the
# JavaScript libraries this UI bundles (PatternFly, xterm.js, ...) are not
# all packaged as system nodejs modules yet, so unlike some other Cockpit
# UI modules this package ships a pre-built JavaScript bundle rather than
# rebuilding it from npm sources.
Source0:        %{name}-%{version}.tar.xz

BuildArch:      noarch

BuildRequires:  make
# openSUSE's appstream validator package is named "appstream-glib"
# (Fedora's equivalent is "libappstream-glib").
BuildRequires:  appstream-glib

Requires:       cockpit-bridge

# Kit itself (https://github.com/mark3labs/kit) is not packaged for
# openSUSE/SLE yet, so it is intentionally not a hard dependency: without
# the "kit" binary on the user's PATH, the page shows install instructions
# instead of the usual tabs.
Recommends:     kit

%description
Adds a page to Cockpit for the Kit AI coding agent (mark3labs/kit): an
embedded terminal for interactive Kit sessions, plus status, authentication,
model, extension, GitHub integration and configuration management.

%prep
%autosetup -n %{name}

%build
# Nothing to build: dist/ ships pre-built in the source tarball.

%install
%make_install PREFIX=/usr

# drop source maps, they are large and just for debugging
find %{buildroot}%{_datadir}/cockpit/ -name '*.map' -delete

%check
appstream-util validate-relax --nonet %{buildroot}%{_datadir}/metainfo/*

%files
%doc README.md
%license LICENSE dist/index.js.LEGAL.txt
%{_datadir}/cockpit/kit
%{_datadir}/metainfo/org.cockpit_project.kit.metainfo.xml

%changelog
