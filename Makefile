# extract name from package.json
PACKAGE_NAME := $(shell awk '/"name":/ {gsub(/[",]/, "", $$2); print $$2}' package.json)
RPM_NAME := cockpit-$(PACKAGE_NAME)
VERSION := $(shell T=$$(git describe 2>/dev/null) || T=1; echo $$T | tr '-' '.')
TARFILE=$(RPM_NAME)-$(VERSION).tar.xz
NODE_CACHE=$(RPM_NAME)-node-$(VERSION).tar.xz
SPEC=$(RPM_NAME).spec
PREFIX ?= /usr/local
APPSTREAMFILE=org.cockpit_project.$(subst -,_,$(PACKAGE_NAME)).metainfo.xml
# stamp file to check for node_modules/
NODE_MODULES_TEST=package-lock.json
# build.js ran in non-watch mode
DIST_TEST=runtime-npm-modules.txt
# one example file in pkg/lib to check if it was already checked out
COCKPIT_REPO_STAMP=pkg/lib/cockpit-po-plugin.js
# common arguments for tar, mostly to make the generated tarballs reproducible
TAR_ARGS = --sort=name --mtime "@$(shell git show --no-patch --format='%at')" --mode=go=rX,u+rw,a-s --numeric-owner --owner=0 --group=0

all: $(DIST_TEST)

# checkout common files from Cockpit repository required to build this project;
# this has no API stability guarantee, so check out a stable tag when you start
# a new project, use the latest release, and update it from time to time
COCKPIT_REPO_FILES = \
	pkg/lib \
	tools/node-modules \
	$(NULL)

COCKPIT_REPO_URL = https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT = eceba97aae742fc4c7de86d6da6f8fdf422d642d # 367

$(COCKPIT_REPO_FILES): $(COCKPIT_REPO_STAMP)
COCKPIT_REPO_TREE = '$(strip $(COCKPIT_REPO_COMMIT))^{tree}'
$(COCKPIT_REPO_STAMP): Makefile
	@git rev-list --quiet --objects $(COCKPIT_REPO_TREE) -- 2>/dev/null || \
	    git fetch --no-tags --no-write-fetch-head --depth=1 $(COCKPIT_REPO_URL) $(COCKPIT_REPO_COMMIT)
	git archive $(COCKPIT_REPO_TREE) -- $(COCKPIT_REPO_FILES) | tar x

#
# Build/Install/dist
#

$(SPEC): packaging/$(SPEC).in $(DIST_TEST)
	provides=$$(awk '{print "Provides: bundled(npm(" $$1 ")) = " $$2}' runtime-npm-modules.txt); \
	awk -v p="$$provides" '{gsub(/%{VERSION}/, "$(VERSION)"); gsub(/%{NPM_PROVIDES}/, p)}1' $< > $@

$(DIST_TEST): $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP) $(shell find src/ -type f) package.json build.js
	NODE_ENV=$(NODE_ENV) ./build.js

watch: $(NODE_MODULES_TEST) $(COCKPIT_REPO_STAMP)
	NODE_ENV=$(NODE_ENV) ./build.js --watch

clean:
	rm -rf dist/
	rm -f $(SPEC)
	rm -f metafile.json runtime-npm-modules.txt

install: $(DIST_TEST)
	mkdir -p $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)$(PREFIX)/share/cockpit/$(PACKAGE_NAME)
	mkdir -p $(DESTDIR)$(PREFIX)/share/metainfo/
	cp $(APPSTREAMFILE) $(DESTDIR)$(PREFIX)/share/metainfo/$(APPSTREAMFILE)

# this requires a built source tree and avoids having to install anything system-wide
devel-install: $(DIST_TEST)
	mkdir -p ~/.local/share/cockpit
	ln -s `pwd`/dist ~/.local/share/cockpit/$(PACKAGE_NAME)

# assumes that there was symlink set up using the above devel-install target,
# and removes it
devel-uninstall:
	rm -f ~/.local/share/cockpit/$(PACKAGE_NAME)

print-version:
	@echo "$(VERSION)"

dist: $(TARFILE)
	@ls -1 $(TARFILE)

# when building a distribution tarball, call bundler with a 'production' environment
# we don't ship node_modules for license and compactness reasons; we ship a
# pre-built dist/ (so it's not necessary) and ship package-lock.json (so that
# node_modules/ can be reconstructed if necessary)
$(TARFILE): export NODE_ENV=production
$(TARFILE): $(DIST_TEST) $(SPEC)
	tar --xz $(TAR_ARGS) -cf $(TARFILE) --transform 's,^,$(RPM_NAME)/,' \
		--exclude packaging/$(SPEC).in --exclude node_modules \
		$$(git ls-files) $(COCKPIT_REPO_FILES) $(NODE_MODULES_TEST) $(DIST_TEST) \
		$(SPEC) dist/

$(NODE_CACHE): $(NODE_MODULES_TEST)
	tools/node-modules runtime-tar $(NODE_CACHE)

node-cache: $(NODE_CACHE)

# convenience target for developers
srpm: $(TARFILE) $(NODE_CACHE) $(SPEC)
	rpmbuild -bs \
	  --define "_sourcedir `pwd`" \
	  --define "_srcrpmdir `pwd`" \
	  $(SPEC)

# convenience target for developers
rpm: $(TARFILE) $(NODE_CACHE) $(SPEC)
	mkdir -p "`pwd`/output"
	mkdir -p "`pwd`/rpmbuild"
	rpmbuild -bb \
	  --define "_sourcedir `pwd`" \
	  --define "_specdir `pwd`" \
	  --define "_builddir `pwd`/rpmbuild" \
	  --define "_srcrpmdir `pwd`" \
	  --define "_rpmdir `pwd`/output" \
	  --define "_buildrootdir `pwd`/build" \
	  $(SPEC)
	find `pwd`/output -name '*.rpm' -printf '%f\n' -exec mv {} . \;
	rm -r "`pwd`/rpmbuild"
	rm -r "`pwd`/output" "`pwd`/build"

$(NODE_MODULES_TEST): package.json
	# if it exists already, npm install won't update it; force that so that we always get up-to-date packages
	rm -f package-lock.json
	# unset NODE_ENV, skips devDependencies otherwise; this often hangs, so try a few times
	for _ in `seq 3`; do timeout 10m env -u NODE_ENV npm install --ignore-scripts && exit 0; done; exit 1
	env -u NODE_ENV npm prune

.PHONY: all clean install devel-install devel-uninstall print-version dist node-cache rpm
