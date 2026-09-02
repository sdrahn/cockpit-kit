/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useEffect, useState } from 'react';
import { Bullseye } from "@patternfly/react-core/dist/esm/layouts/Bullseye/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Gallery } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

import { AUTH_PROVIDERS, AuthState, parseProviderStatus } from '../auth-status';
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

// A simplified 3-color traffic light for the at-a-glance overview; the
// Authentication tab has the full breakdown and details.
const TRAFFIC_LIGHT: Record<AuthState, "green" | "orange" | "red"> = {
    authenticated: "green",
    "needs-attention": "orange",
    "not-authenticated": "red",
    unknown: "red",
};

interface OverviewProps {
    version: string;
    onNavigate: (tab: string) => void;
}

export const Overview = ({ version, onNavigate }: OverviewProps) => {
    const [statusOutput, setStatusOutput] = useState<string | null>(null);
    const [statusError, setStatusError] = useState('');

    useEffect(() => {
        runKit(["auth", "status"]).then(result => {
            setStatusOutput(result.ok ? result.output : null);
            setStatusError(result.ok ? '' : result.error);
        });
    }, []);

    return (
        <>
            <Content component="p">
                {_("Kit is an extensible AI coding agent CLI with multi-provider LLM support, a built-in tool set, and an extension system.")}
                {" "}
                <Label isCompact>{version}</Label>
            </Content>

            <Gallery hasGutter minWidths={{ default: '20rem' }}>
                <Card>
                    <CardTitle>{_("Get started")}</CardTitle>
                    <CardBody>
                        <Content component="p">
                            {_("Open an interactive Kit session in your browser, exactly as you'd run it in a terminal.")}
                        </Content>
                        <Button variant="primary" onClick={() => onNavigate('terminal')}>
                            {_("Open terminal")}
                        </Button>
                    </CardBody>
                </Card>

                <Card>
                    <CardTitle>{_("Authentication")}</CardTitle>
                    <CardBody>
                        {statusError &&
                            <InlineNotification type="danger" text={_("Command failed")} detail={statusError} />}
                        {statusOutput === null && !statusError &&
                            <Bullseye><Spinner size="md" aria-label={_("Checking authentication status...")} /></Bullseye>}
                        {statusOutput !== null &&
                            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }} className="pf-v6-u-mb-md">
                                {AUTH_PROVIDERS.map(p => {
                                    const status = parseProviderStatus(statusOutput, p.statusLabel);
                                    return (
                                        <Flex key={p.id} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                                            <FlexItem>{p.name}</FlexItem>
                                            <FlexItem>
                                                <Label isCompact color={status ? TRAFFIC_LIGHT[status.state] : "grey"}>
                                                    {status ? status.text : _("Unknown")}
                                                </Label>
                                            </FlexItem>
                                        </Flex>
                                    );
                                })}
                            </Flex>}
                        <Button variant="link" isInline onClick={() => onNavigate('auth')}>
                            {_("Manage authentication")}
                        </Button>
                    </CardBody>
                </Card>
            </Gallery>
        </>
    );
};
