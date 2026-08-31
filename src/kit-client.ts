/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Small helper around cockpit.spawn() for running the "kit" binary
 * (https://github.com/mark3labs/kit) and reading back its plain-text
 * output. Kit's read-only subcommands (auth status, models, extensions
 * list/validate, --version) don't need a real terminal, so they are run
 * as one-shot spawns here; anything that can prompt interactively (auth
 * login, install, github install) is run in a real pty via KitTerminal
 * instead.
 */

import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const KIT_BIN = "kit";

export interface KitResult {
    ok: boolean;
    output: string;
    error: string;
}

/**
 * True when the failure means the "kit" binary itself could not be
 * found/executed, as opposed to kit running and exiting with an error.
 */
export function isNotInstalled(exc: unknown): boolean {
    const problem = (exc as { problem?: string } | undefined)?.problem;
    return problem === "not-found" || problem === "access-denied";
}

/**
 * Run "kit <args>" to completion and capture stdout/stderr as plain text.
 * Never throws: failures (including "kit" not being installed) come back
 * as { ok: false, error }.
 */
export async function runKit(
    args: string[],
    options: Omit<cockpit.SpawnOptions, 'binary'> = {}
): Promise<KitResult> {
    try {
        const output = await cockpit.spawn([KIT_BIN, ...args], { err: "message", ...options, binary: false });
        return { ok: true, output, error: "" };
    } catch (exc) {
        const err = exc as { message?: string; problem?: string };
        const error = isNotInstalled(exc)
            ? _("The \"kit\" command was not found.")
            : (err.message || String(exc));
        return { ok: false, output: "", error };
    }
}
