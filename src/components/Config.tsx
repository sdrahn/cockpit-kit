/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useEffect, useState } from 'react';
import { ActionGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { CodeBlock, CodeBlockCode } from "@patternfly/react-core/dist/esm/components/CodeBlock/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const EXAMPLE_CONFIG = `model: anthropic/claude-sonnet-latest
max-tokens: 4096
temperature: 0.7
stream: true
thinking-level: off       # off, none, minimal, low, medium, high
no-core-tools: false      # set to true to disable all built-in core tools

# Skills — all keys are optional
no-skills: false          # set to true to disable all skill loading

# Named agents
no-agents: false          # set to true to disable named agent discovery
`;

interface ConfigProps {
    homeDirectory: string;
}

export const Config = ({ homeDirectory }: ConfigProps) => {
    const path = homeDirectory + "/.kit.yml";

    const [content, setContent] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const file = cockpit.file(path);
        file.read()
                .then(data => {
                    setContent(data ?? '');
                    setLoaded(true);
                })
                .catch(exc => {
                    setError((exc as Error).message || String(exc));
                    setLoaded(true);
                });
        return file.close;
    }, [path]);

    const onSave = () => {
        setSaving(true);
        setError('');
        setSaved(false);
        const file = cockpit.file(path);
        file.replace(content)
                .then(() => {
                    setSaving(false);
                    setDirty(false);
                    setSaved(true);
                })
                .catch(exc => {
                    setSaving(false);
                    setError((exc as Error).message || String(exc));
                })
                .finally(() => file.close());
    };

    return (
        <>
            <Content component="p">
                {cockpit.format(_("Kit's per-user configuration file, $0. Command-line flags and KIT_-prefixed environment variables still take precedence over this file."), path)}
            </Content>

            {error && <InlineNotification type="danger" text={_("Error")} detail={error} onDismiss={() => setError('')} />}
            {saved && <InlineNotification type="success" text={_("Saved")} onDismiss={() => setSaved(false)} />}

            {loaded &&
                <>
                    <TextArea
id="kit-config-editor"
                              aria-label={_(".kit.yml contents")}
                              resizeOrientation="vertical"
                              rows={20}
                              className="kit-config-editor"
                              value={content}
                              onChange={(_ev, value) => { setContent(value); setDirty(true) }}
                    />
                    <ActionGroup>
                        <Button variant="primary" isLoading={saving} isDisabled={saving || !dirty} onClick={onSave}>
                            {_("Save")}
                        </Button>
                        {!content &&
                            <Button variant="secondary" onClick={() => { setContent(EXAMPLE_CONFIG); setDirty(true) }}>
                                {_("Fill in example configuration")}
                            </Button>}
                    </ActionGroup>
                </>}

            <Content component="h3">{_("Environment variables")}</Content>
            <Content component="p">
                {_("Provider API keys and other settings can also be set as environment variables for the Cockpit user, instead of in the file above:")}
            </Content>
            <CodeBlock>
                <CodeBlockCode>
                    {'export ANTHROPIC_API_KEY="sk-..."\nexport OPENAI_API_KEY="sk-..."\nexport KIT_MODEL="openai/gpt-4o"'}
                </CodeBlockCode>
            </CodeBlock>
        </>
    );
};
