/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useEffect, useState } from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import {
    Modal, ModalBody, ModalFooter, ModalHeader
} from '@patternfly/react-core/dist/esm/components/Modal/index.js';
import { Split, SplitItem } from "@patternfly/react-core/dist/esm/layouts/Split/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

import { CommandOutput } from './CommandOutput';
import { KitTerminal } from './KitTerminal';
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

// "statusLabel" is the exact prefix "kit auth status" prints for that
// provider (e.g. "OpenAI: ..."), which differs from the friendlier
// display "name" used elsewhere on this page.
const PROVIDERS: { id: string, name: string, statusLabel: string }[] = [
    { id: "anthropic", name: "Anthropic Claude", statusLabel: "Anthropic Claude" },
    { id: "openai", name: "OpenAI (ChatGPT/Codex)", statusLabel: "OpenAI" },
    { id: "copilot", name: "GitHub Copilot", statusLabel: "GitHub Copilot" },
];

interface ProviderStatus {
    color: "green" | "orange" | "red" | "grey";
    text: string;
    detail: string;
}

// Parses lines like "Anthropic Claude: ✓ Authenticated (OAuth, stored ...)"
// or "OpenAI: ✗ Not authenticated" out of "kit auth status" output.
function parseProviderStatus(output: string, statusLabel: string): ProviderStatus | null {
    const re = new RegExp(`^${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (.+)$`, 'm');
    const m = re.exec(output);
    if (!m)
        return null;

    const line = m[1].trim();
    if (line.startsWith('✓'))
        return { color: "green", text: _("Authenticated"), detail: line.replace(/^✓\s*Authenticated\s*/, '') };
    if (line.startsWith('⚠'))
        return { color: "orange", text: _("Needs attention"), detail: line.replace(/^⚠️?\s*/, '') };
    if (line.startsWith('✗'))
        return { color: "grey", text: _("Not authenticated"), detail: '' };
    return { color: "red", text: _("Unknown"), detail: line };
}

export const Auth = () => {
    const [refreshToken, setRefreshToken] = useState(0);
    const [loginProvider, setLoginProvider] = useState<string | null>(null);
    const [busyProvider, setBusyProvider] = useState('');
    const [logoutResult, setLogoutResult] = useState<{ provider: string, ok: boolean, text: string } | null>(null);
    const [statusOutput, setStatusOutput] = useState('');

    useEffect(() => {
        runKit(["auth", "status"]).then(result => setStatusOutput(result.ok ? result.output : ''));
    }, [refreshToken]);

    const onLogout = (provider: string) => {
        setBusyProvider(provider);
        setLogoutResult(null);
        runKit(["auth", "logout", provider]).then(result => {
            setBusyProvider('');
            setLogoutResult({ provider, ok: result.ok, text: result.ok ? result.output : result.error });
            setRefreshToken(prev => prev + 1);
        });
    };

    return (
        <>
            <Content component="p">
                {_("Kit authenticates to LLM providers either via OAuth (stored credentials take precedence) or via provider API keys set as environment variables, e.g. ANTHROPIC_API_KEY or OPENAI_API_KEY, for the user Cockpit is logged in as.")}
            </Content>

            <CommandOutput args={["auth", "status"]} refreshToken={refreshToken} />

            <Content component="h3">{_("OAuth login")}</Content>
            {PROVIDERS.map(p => {
                const status = parseProviderStatus(statusOutput, p.statusLabel);
                return (
                    <Split key={p.id} hasGutter className="kit-auth-provider-row">
                        <SplitItem>{p.name}</SplitItem>
                        <SplitItem isFilled>
                            {status &&
                                <>
                                    <Label color={status.color} isCompact>{status.text}</Label>
                                    {status.detail && <span className="pf-v6-u-color-200 pf-v6-u-ml-sm">{status.detail}</span>}
                                </>}
                        </SplitItem>
                        <SplitItem>
                            <Button variant="secondary" onClick={() => setLoginProvider(p.id)}>
                                {_("Log in")}
                            </Button>
                        </SplitItem>
                        <SplitItem>
                            <Button
variant="secondary" isDanger
                                    isLoading={busyProvider === p.id} isDisabled={!!busyProvider}
                                    onClick={() => onLogout(p.id)}
                            >
                                {_("Log out")}
                            </Button>
                        </SplitItem>
                    </Split>
                );
            })}

            {logoutResult &&
                <InlineNotification
type={logoutResult.ok ? "success" : "danger"}
                                     text={logoutResult.ok ? _("Logged out") : _("Log out failed")}
                                     detail={logoutResult.text}
                                     onDismiss={() => setLogoutResult(null)}
                />}

            <Modal isOpen={!!loginProvider} variant="large" onClose={() => setLoginProvider(null)}>
                <ModalHeader title={cockpit.format(_("Log in to $0"), loginProvider)} />
                <ModalBody>
                    <Content component="p">
                        {_("Kit will print a URL to open in a browser to complete the OAuth flow. Follow the instructions below.")}
                    </Content>
                    {loginProvider &&
                        <KitTerminal
parentId="kit-auth-login-terminal"
                                     args={["auth", "login", loginProvider]}
                        />}
                </ModalBody>
                <ModalFooter>
                    <Button variant="link" onClick={() => { setLoginProvider(null); setRefreshToken(prev => prev + 1) }}>
                        {_("Close")}
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};
