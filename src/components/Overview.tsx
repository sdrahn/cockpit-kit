/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Gallery } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import cockpit from 'cockpit';

import { CommandOutput } from './CommandOutput';

const _ = cockpit.gettext;

interface OverviewProps {
    version: string;
    onNavigate: (tab: string) => void;
}

export const Overview = ({ version, onNavigate }: OverviewProps) => {
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
                        <CommandOutput args={["auth", "status"]} />
                        <Button variant="link" isInline onClick={() => onNavigate('auth')}>
                            {_("Manage authentication")}
                        </Button>
                    </CardBody>
                </Card>
            </Gallery>
        </>
    );
};
