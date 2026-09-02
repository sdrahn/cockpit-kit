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
    // Tab content mounts on first visit and then stays mounted (so e.g. a
    // running Terminal session survives switching tabs), matching what
    // Tabs' own mountOnEnter/unmountOnExit=false did before tab content
    // moved out of <Tabs> and into its own PageSection (see below).
    const [visitedTabs, setVisitedTabs] = useState(() => new Set(['overview']));
    useEffect(() => {
        setVisitedTabs(prev => prev.has(activeTab) ? prev : new Set(prev).add(activeTab));
    }, [activeTab]);

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

    const tabs: { id: string, title: string, render: () => React.ReactNode }[] = [
        { id: "overview", title: _("Overview"), render: () => <Overview version={check.version} onNavigate={setActiveTab} /> },
        { id: "terminal", title: _("Terminal"), render: () => <AgentTerminal homeDirectory={homeDirectory} /> },
        { id: "models", title: _("Models"), render: () => <Models /> },
        { id: "extensions", title: _("Extensions"), render: () => <Extensions homeDirectory={homeDirectory} /> },
        { id: "auth", title: _("Authentication"), render: () => <Auth /> },
        { id: "github", title: _("GitHub integration"), render: () => <GitHubIntegration homeDirectory={homeDirectory} /> },
        { id: "config", title: _("Configuration"), render: () => <Config homeDirectory={homeDirectory} /> },
    ];

    return (
        <Page className='pf-m-no-sidebar'>
            <PageSection type="tabs" hasBodyWrapper={false}>
                <Tabs activeKey={activeTab} onSelect={(_ev, key) => setActiveTab(String(key))}>
                    {tabs.map(t => <Tab key={t.id} eventKey={t.id} title={<TabTitleText>{t.title}</TabTitleText>} />)}
                </Tabs>
            </PageSection>
            <PageSection hasBodyWrapper={false} isFilled className="kit-content-section">
                {tabs.map(t => (visitedTabs.has(t.id) &&
                    <div key={t.id} hidden={activeTab !== t.id} className="kit-tab-panel">
                        {t.render()}
                    </div>))}
            </PageSection>
        </Page>
    );
};
