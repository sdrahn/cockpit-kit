/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import type { IDisposable, Terminal } from "@xterm/xterm";

// Private OSC sequence the xdg-open stand-in from kit-spawn.ts writes to the
// terminal: "ESC ] 7771 ; cockpit-kit-open-url ; <url> BEL". It has no
// visible effect, so it can't disturb Kit's TUI.
export const OPEN_URL_OSC = 7771;
export const OPEN_URL_TAG = "cockpit-kit-open-url";

// Only offer web pages: anything in the terminal can print this sequence, so
// never hand e.g. a javascript: or file: URL to the page.
function webUrl(text: string): string | null {
    const trimmed = text.trim();
    try {
        const url = new URL(trimmed);
        return (url.protocol === "https:" || url.protocol === "http:") ? trimmed : null;
    } catch {
        return null;
    }
}

/*
 * Kit runs on the Cockpit host, not where the browser is, so its attempts to
 * open a web page (OAuth sign-in, mostly) can't reach the user. Calls onOpen
 * with each URL Kit asked to open instead, for the page to offer as a link.
 */
export function listenForOpenUrl(term: Terminal, onOpen: (url: string) => void): IDisposable {
    return term.parser.registerOscHandler(OPEN_URL_OSC, data => {
        const sep = data.indexOf(";");
        if (sep < 0 || data.slice(0, sep) !== OPEN_URL_TAG)
            return false;
        const url = webUrl(data.slice(sep + 1));
        if (url)
            onOpen(url);
        return true;
    });
}
