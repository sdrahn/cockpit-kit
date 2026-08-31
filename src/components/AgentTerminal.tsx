/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Form } from "@patternfly/react-core/dist/esm/components/Form/index.js";

import cockpit from 'cockpit';

import { DirectoryPicker } from './DirectoryPicker';
import { KitTerminal } from './KitTerminal';

const _ = cockpit.gettext;

interface AgentTerminalProps {
    homeDirectory: string;
}

export const AgentTerminal = ({ homeDirectory }: AgentTerminalProps) => {
    const [directory, setDirectory] = useState(homeDirectory);

    return (
        <div className="kit-terminal-page">
            <Form isHorizontal onSubmit={ev => ev.preventDefault()}>
                <DirectoryPicker id="kit-terminal-directory" directory={directory} onChange={setDirectory} />
            </Form>
            <Content component="p" className="pf-v6-u-color-200">
                {_("Kit sessions are tied to their working directory. Changing it above restarts Kit there.")}
            </Content>
            <KitTerminal parentId="kit-terminal" directory={directory} args={[]} />
        </div>
    );
};
