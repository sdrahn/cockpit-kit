/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import { ClipboardAddon, type IClipboardProvider } from "@xterm/addon-clipboard";
import type { Terminal } from "@xterm/xterm";

// Write-only: the add-on's default provider answers an OSC 52 read request
// ("ESC ] 52 ; c ; ?") with the browser clipboard's contents, letting any
// program in the terminal read the user's clipboard.
const writeOnlyProvider: IClipboardProvider = {
    readText: () => "",
    writeText: async (selection, text) => {
        if (selection !== "c" || !text)
            return;
        try {
            // Undefined outside a secure context (plain http to a remote host).
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.warn("kit: could not copy the terminal selection to the clipboard:", err);
        }
    },
};

const enabled = new WeakSet<Terminal>();

/*
 * kit's TUI turns on mouse tracking and does its own text selection: a mouse
 * drag goes to kit rather than selecting text in xterm.js, and on release kit
 * copies the selection with an OSC 52 escape sequence, which xterm.js ignores
 * unless this add-on is loaded. With it, that copy lands in the browser
 * clipboard.
 *
 * Shift+drag (Option+drag on macOS) still bypasses the mouse tracking for a
 * native xterm.js selection that Ctrl+Insert or the context menu can copy.
 */
export function enableTerminalClipboard(term: Terminal) {
    if (enabled.has(term))
        return;
    enabled.add(term);
    term.loadAddon(new ClipboardAddon(undefined, writeOnlyProvider));
    term.options.macOptionClickForcesSelection = true;
}
