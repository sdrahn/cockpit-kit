/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Shared "kit auth status" provider list/parsing, used by both the
 * Overview and Authentication tabs.
 */

import cockpit from 'cockpit';

const _ = cockpit.gettext;

export interface AuthProvider {
    id: string;
    name: string;
    // The exact prefix "kit auth status" prints for this provider (e.g.
    // "OpenAI: ..."), which differs from the friendlier display "name".
    statusLabel: string;
}

export const AUTH_PROVIDERS: AuthProvider[] = [
    { id: "anthropic", name: "Anthropic Claude", statusLabel: "Anthropic Claude" },
    { id: "openai", name: "OpenAI (ChatGPT/Codex)", statusLabel: "OpenAI" },
    { id: "copilot", name: "GitHub Copilot", statusLabel: "GitHub Copilot" },
];

export type AuthState = "authenticated" | "needs-attention" | "not-authenticated" | "unknown";

export interface ProviderStatus {
    state: AuthState;
    text: string;
    detail: string;
}

// Parses lines like "Anthropic Claude: ✓ Authenticated (OAuth, stored ...)"
// or "OpenAI: ✗ Not authenticated" out of "kit auth status" output.
export function parseProviderStatus(output: string, statusLabel: string): ProviderStatus | null {
    const re = new RegExp(`^${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (.+)$`, 'm');
    const m = re.exec(output);
    if (!m)
        return null;

    const line = m[1].trim();
    if (line.startsWith('✓'))
        return { state: "authenticated", text: _("Authenticated"), detail: line.replace(/^✓\s*Authenticated\s*/, '') };
    if (line.startsWith('⚠'))
        return { state: "needs-attention", text: _("Needs attention"), detail: line.replace(/^⚠️?\s*/, '') };
    if (line.startsWith('✗'))
        return { state: "not-authenticated", text: _("Not authenticated"), detail: '' };
    return { state: "unknown", text: _("Unknown"), detail: line };
}
