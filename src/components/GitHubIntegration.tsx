/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { ActionGroup, Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

import { DirectoryPicker } from './DirectoryPicker';
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

interface GitHubIntegrationProps {
    homeDirectory: string;
}

export const GitHubIntegration = ({ homeDirectory }: GitHubIntegrationProps) => {
    const [directory, setDirectory] = useState(homeDirectory);
    const [model, setModel] = useState('');
    const [force, setForce] = useState(false);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ ok: boolean, text: string } | null>(null);

    const onInstall = () => {
        const args = ["github", "install"];
        if (model.trim())
            args.push("--model", model.trim());
        if (force)
            args.push("--force");
        // Always skip the interactive "store secret via the gh CLI?" offer: it
        // would block a non-interactive spawn waiting for a y/n answer.
        args.push("--no-secret");

        setBusy(true);
        setResult(null);
        runKit(args, { directory }).then(res => {
            setBusy(false);
            setResult({ ok: res.ok, text: res.ok ? res.output : res.error });
        });
    };

    return (
        <>
            <Content component="p">
                {_("Scaffolds a GitHub Actions workflow (.github/workflows/kit.yml) that runs Kit as a collaborator/reviewer whenever someone comments \"/kit ...\" on an issue or pull request in the repository below.")}
            </Content>

            <Form isHorizontal onSubmit={ev => { ev.preventDefault(); onInstall() }}>
                <DirectoryPicker id="kit-github-directory" label={_("Git repository")} directory={directory} onChange={setDirectory} />
                <FormGroup label={_("Model")} fieldId="kit-github-model">
                    <TextInput
id="kit-github-model"
                               placeholder={_("provider/model, e.g. anthropic/claude-sonnet-4-5-20250929")}
                               value={model}
                               onChange={(_ev, value) => setModel(value)}
                    />
                </FormGroup>
                <Checkbox
id="kit-github-force"
                          label={_("Overwrite an existing workflow file")}
                          isChecked={force}
                          onChange={(_ev, checked) => setForce(checked)}
                />
                <Checkbox
id="kit-github-nosecret"
                          label={_("Skip offering to set the provider secret via the gh CLI")}
                          isChecked
                          isDisabled
                          onChange={() => {}}
                />
                <ActionGroup>
                    <Button variant="primary" type="submit" isLoading={busy} isDisabled={busy}>
                        {_("Scaffold GitHub workflow")}
                    </Button>
                </ActionGroup>
            </Form>

            <Content component="p" className="pf-v6-u-color-200">
                {_("Setting a provider secret is always skipped here since it needs an interactive gh CLI prompt; add it as a repository secret yourself (e.g. ANTHROPIC_API_KEY) after this runs.")}
            </Content>

            {result &&
                <InlineNotification
type={result.ok ? "success" : "danger"}
                                     text={result.ok ? _("Workflow scaffolded") : _("Command failed")}
                                     detail={result.text}
                                     onDismiss={() => setResult(null)}
                />}
        </>
    );
};
