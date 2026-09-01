/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useEffect, useState } from 'react';
import { ActionGroup, Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import cockpit from 'cockpit';

import { CommandOutput } from './CommandOutput';
import { InlineNotification } from "cockpit-components-inline-notification";
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

// Top-level tree entries look like "├── anthropic" / "└── ollama" (child
// model lines are indented under a "│   " or "    " prefix, so they don't
// match this anchored at the start of the line).
function parseProviderIds(output: string): string[] {
    const ids = [];
    for (const line of output.split('\n')) {
        const m = /^[├└]── (\S+)/.exec(line);
        if (m)
            ids.push(m[1]);
    }
    return ids;
}

export const Models = () => {
    const [provider, setProvider] = useState('');
    const [providers, setProviders] = useState<string[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [refreshToken, setRefreshToken] = useState(0);
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    // kit models <provider> requires an exact, known provider ID (it
    // errors out otherwise), so the dropdown is only ever populated with
    // real IDs instead of letting people type an arbitrary filter.
    useEffect(() => {
        runKit(["models", ...(showAll ? ["--all"] : [])]).then(result => {
            setProviders(result.ok ? parseProviderIds(result.output) : []);
            setProvider('');
        });
    }, [showAll, refreshToken]);

    const args = ["models", ...(provider ? [provider] : []), ...(showAll ? ["--all"] : [])];

    const onUpdate = () => {
        setUpdating(true);
        setUpdateError('');
        runKit(["update-models"]).then(result => {
            setUpdating(false);
            if (!result.ok)
                setUpdateError(result.error);
            else
                setRefreshToken(prev => prev + 1);
        });
    };

    return (
        <>
            <Content component="p">
                {_("Models known to Kit, from its local copy of the models.dev database.")}
            </Content>

            <Form isHorizontal onSubmit={ev => ev.preventDefault()}>
                <Flex alignItems={{ default: 'alignItemsFlexEnd' }}>
                    <FlexItem>
                        <FormGroup label={_("Provider")} fieldId="kit-models-provider">
                            <FormSelect
id="kit-models-provider"
                                        value={provider}
                                        onChange={(_ev, value) => setProvider(value)}
                            >
                                <FormSelectOption value="" label={_("All providers")} />
                                {providers.map(id => <FormSelectOption key={id} value={id} label={id} />)}
                            </FormSelect>
                        </FormGroup>
                    </FlexItem>
                    <FlexItem>
                        <Checkbox
id="kit-models-all"
                                  label={_("Show all providers, not just LLM-compatible ones")}
                                  isChecked={showAll}
                                  onChange={(_ev, checked) => setShowAll(checked)}
                        />
                    </FlexItem>
                </Flex>
                <ActionGroup>
                    <Button variant="secondary" onClick={() => setRefreshToken(prev => prev + 1)}>
                        {_("Refresh")}
                    </Button>
                    <Button variant="secondary" isLoading={updating} isDisabled={updating} onClick={onUpdate}>
                        {_("Update model database")}
                    </Button>
                </ActionGroup>
            </Form>

            {updateError && <InlineNotification type="danger" text={_("Updating the model database failed")} detail={updateError} onDismiss={() => setUpdateError('')} />}

            <CommandOutput args={args} refreshToken={refreshToken} />
        </>
    );
};
