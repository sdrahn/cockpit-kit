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
import { AUTH_PROVIDERS, AuthState, parseProviderStatus } from '../auth-status';
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

const STATE_COLORS: Record<AuthState, "green" | "orange" | "grey" | "red"> = {
    authenticated: "green",
    "needs-attention": "orange",
    "not-authenticated": "grey",
    unknown: "red",
};

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
            {AUTH_PROVIDERS.map(p => {
                const status = parseProviderStatus(statusOutput, p.statusLabel);
                return (
                    <Split key={p.id} hasGutter className="kit-auth-provider-row">
                        <SplitItem>{p.name}</SplitItem>
                        <SplitItem isFilled>
                            {status &&
                                <>
                                    <Label color={STATE_COLORS[status.state]} isCompact>{status.text}</Label>
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
