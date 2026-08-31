/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useEffect, useState } from 'react';
import { Bullseye } from "@patternfly/react-core/dist/esm/layouts/Bullseye/index.js";
import { Page, PageSection } from '@patternfly/react-core/dist/esm/components/Page/index.js';
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Tab, TabTitleText, Tabs } from "@patternfly/react-core/dist/esm/components/Tabs/index.js";
import { EmptyStatePanel } from "cockpit-components-empty-state";
import cockpit from 'cockpit';

import { AgentTerminal } from './components/AgentTerminal';
import { Auth } from './components/Auth';
import { Config } from './components/Config';
import { Extensions } from './components/Extensions';
import { GitHubIntegration } from './components/GitHubIntegration';
import { Models } from './components/Models';
import { Overview } from './components/Overview';
import { runKit } from './kit-client';

const _ = cockpit.gettext;

type CheckState =
    | { status: "checking" }
    | { status: "missing", detail: string }
    | { status: "ready", version: string };

export const Application = () => {
    const [check, setCheck] = useState<CheckState>({ status: "checking" });
    const [homeDirectory, setHomeDirectory] = useState('/');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        cockpit.user().then(user => setHomeDirectory(user.home || '/'));
    }, []);

    useEffect(() => {
        runKit(["--version"]).then(result => {
            if (result.ok)
                setCheck({ status: "ready", version: result.output.trim() });
            else
                setCheck({ status: "missing", detail: result.error });
        });
    }, []);

    if (check.status === "checking") {
        return (
            <Page className='pf-m-no-sidebar'>
                <Bullseye>
                    <Spinner size="xl" aria-label={_("Checking for kit...")} />
                </Bullseye>
            </Page>
        );
    }

    if (check.status === "missing") {
        return (
            <Page className='pf-m-no-sidebar'>
                <PageSection>
                    <EmptyStatePanel
                        title={_("Kit is not installed")}
                        paragraph={
                            <>
                                {check.detail}
                                <br />
                                {_("Install it with one of:")}
                                <br />
                                <code>npm install -g @mark3labs/kit</code>
                                <br />
                                <code>go install github.com/mark3labs/kit/cmd/kit@latest</code>
                                <br />
                                <code>zypper in kit</code>
                                <br />
                                {_("See the ")}
                                <a href="https://github.com/mark3labs/kit" target="_blank" rel="noopener noreferrer">
                                    {_("Kit project")}
                                </a>
                                {_(" for details.")}
                            </>
                        }
                        action={_("Check again")}
                        onAction={() => {
                            setCheck({ status: "checking" });
                            runKit(["--version"]).then(result => {
                                if (result.ok)
                                    setCheck({ status: "ready", version: result.output.trim() });
                                else
                                    setCheck({ status: "missing", detail: result.error });
                            });
                        }}
                    />
                </PageSection>
            </Page>
        );
    }

    return (
        <Page className='pf-m-no-sidebar'>
            <PageSection hasBodyWrapper={false}>
                <Tabs
activeKey={activeTab}
                      onSelect={(_ev, key) => setActiveTab(String(key))}
                      mountOnEnter unmountOnExit={false}
                >
                    <Tab eventKey="overview" title={<TabTitleText>{_("Overview")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <Overview version={check.version} onNavigate={setActiveTab} />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="terminal" title={<TabTitleText>{_("Terminal")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false} isFilled>
                            <AgentTerminal homeDirectory={homeDirectory} />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="models" title={<TabTitleText>{_("Models")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <Models />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="extensions" title={<TabTitleText>{_("Extensions")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <Extensions homeDirectory={homeDirectory} />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="auth" title={<TabTitleText>{_("Authentication")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <Auth />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="github" title={<TabTitleText>{_("GitHub integration")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <GitHubIntegration homeDirectory={homeDirectory} />
                        </PageSection>
                    </Tab>
                    <Tab eventKey="config" title={<TabTitleText>{_("Configuration")}</TabTitleText>}>
                        <PageSection hasBodyWrapper={false}>
                            <Config homeDirectory={homeDirectory} />
                        </PageSection>
                    </Tab>
                </Tabs>
            </PageSection>
        </Page>
    );
};
