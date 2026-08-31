/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
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

const PROVIDERS: { id: string, name: string }[] = [
    { id: "anthropic", name: "Anthropic Claude" },
    { id: "openai", name: "OpenAI (ChatGPT/Codex)" },
    { id: "copilot", name: "GitHub Copilot" },
];

export const Auth = () => {
    const [refreshToken, setRefreshToken] = useState(0);
    const [loginProvider, setLoginProvider] = useState<string | null>(null);
    const [busyProvider, setBusyProvider] = useState('');
    const [logoutResult, setLogoutResult] = useState<{ provider: string, ok: boolean, text: string } | null>(null);

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
            {PROVIDERS.map(p => (
                <Split key={p.id} hasGutter className="kit-auth-provider-row">
                    <SplitItem isFilled>{p.name}</SplitItem>
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
            ))}

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
