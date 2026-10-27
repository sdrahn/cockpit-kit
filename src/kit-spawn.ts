/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { OPEN_URL_OSC, OPEN_URL_TAG } from "./terminal-open-url";

/*
 * Kit opens web pages by running "xdg-open <url>", which on the Cockpit host
 * either fails (no desktop session) or opens a browser nobody is looking at.
 * This launcher puts a stand-in xdg-open first on Kit's PATH (and in
 * $BROWSER) that writes the URL to the terminal as a private OSC sequence,
 * which terminal-open-url.ts picks up. When there's no terminal to write to,
 * it falls back to the real xdg-open.
 *
 * The stand-in lives in $XDG_RUNTIME_DIR (or ~/.cache) and is rewritten on
 * every launch, so it always matches this version of the page. If that
 * fails, Kit still starts, just without it.
 */
const LAUNCHER = String.raw`
dir=$XDG_RUNTIME_DIR
[ -n "$dir" ] || dir=$HOME/.cache
dir=$dir/cockpit-kit/bin

install_xdg_open() {
    mkdir -p "$dir" &&
    cat > "$dir/.xdg-open.$$" <<'SHIM' &&
#!/bin/sh
# Written by Cockpit's Kit page: hands URLs to the browser running Cockpit.
url=$(printf '%s' "$1" | tr -d '\000-\037\177')
if [ -n "$url" ] && { printf '\033]${OPEN_URL_OSC};${OPEN_URL_TAG};%s\007' "$url" > /dev/tty; } 2>/dev/null; then
    exit 0
fi
[ -n "$COCKPIT_KIT_PATH" ] && PATH=$COCKPIT_KIT_PATH exec xdg-open "$@"
exit 1
SHIM
    chmod 755 "$dir/.xdg-open.$$" &&
    mv -f "$dir/.xdg-open.$$" "$dir/xdg-open"
}

if install_xdg_open 2>/dev/null; then
    export COCKPIT_KIT_PATH="$PATH"
    export PATH="$dir:$PATH" BROWSER="$dir/xdg-open"
fi
exec kit "$@"
`;

/** The argv to spawn "kit <args>" with the xdg-open stand-in. */
export function kitSpawnArgv(args: string[]): string[] {
    return ["/bin/sh", "-c", LAUNCHER, "kit", ...args];
}
