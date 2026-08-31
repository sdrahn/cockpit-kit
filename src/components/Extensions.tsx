/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useState } from 'react';
import { ActionGroup, Form, FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import {
    Modal, ModalBody, ModalFooter, ModalHeader
} from '@patternfly/react-core/dist/esm/components/Modal/index.js';
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

import { CommandOutput } from './CommandOutput';
import { DirectoryPicker } from './DirectoryPicker';
import { KitTerminal } from './KitTerminal';
import { runKit } from '../kit-client';

const _ = cockpit.gettext;

interface ExtensionsProps {
    homeDirectory: string;
}

export const Extensions = ({ homeDirectory }: ExtensionsProps) => {
    const [directory, setDirectory] = useState(homeDirectory);
    const [refreshToken, setRefreshToken] = useState(0);

    const [gitUrl, setGitUrl] = useState('');
    const [local, setLocal] = useState(false);
    const [installOpen, setInstallOpen] = useState(false);

    const [busyAction, setBusyAction] = useState('');
    const [actionResult, setActionResult] = useState<{ ok: boolean, text: string } | null>(null);

    const runAction = (label: string, args: string[]) => {
        setBusyAction(label);
        setActionResult(null);
        runKit(args, { directory }).then(result => {
            setBusyAction('');
            setActionResult({ ok: result.ok, text: result.ok ? result.output : result.error });
            setRefreshToken(prev => prev + 1);
        });
    };

    return (
        <>
            <Content component="p">
                {_("Extensions are Go source files that add custom tools, slash commands, widgets and more to Kit. They are discovered relative to the working directory below, as well as from the user and system extension directories.")}
            </Content>

            <Form isHorizontal onSubmit={ev => ev.preventDefault()}>
                <DirectoryPicker id="kit-extensions-directory" directory={directory} onChange={setDirectory} />
                <ActionGroup>
                    <Button variant="secondary" onClick={() => setRefreshToken(prev => prev + 1)}>
                        {_("Refresh list")}
                    </Button>
                    <Button
variant="secondary"
                            isLoading={busyAction === 'validate'} isDisabled={!!busyAction}
                            onClick={() => runAction('validate', ["extensions", "validate"])}
                    >
                        {_("Validate")}
                    </Button>
                    <Button
variant="secondary"
                            isLoading={busyAction === 'init'} isDisabled={!!busyAction}
                            onClick={() => runAction('init', ["extensions", "init"])}
                    >
                        {_("Generate example extension")}
                    </Button>
                </ActionGroup>
            </Form>

            {actionResult &&
                <InlineNotification
type={actionResult.ok ? "success" : "danger"}
                                     text={actionResult.ok ? _("Command succeeded") : _("Command failed")}
                                     detail={actionResult.text}
                                     onDismiss={() => setActionResult(null)}
                />}

            <CommandOutput args={["extensions", "list"]} refreshToken={refreshToken} />

            <Content component="h3">{_("Install from a git repository")}</Content>
            <Form isHorizontal onSubmit={ev => { ev.preventDefault(); setInstallOpen(true) }}>
                <FormGroup label={_("Repository")} fieldId="kit-extensions-giturl">
                    <TextInput
id="kit-extensions-giturl"
                               placeholder="github.com/user/my-extension"
                               value={gitUrl}
                               onChange={(_ev, value) => setGitUrl(value)}
                    />
                </FormGroup>
                <Checkbox
id="kit-extensions-local"
                          label={_("Install to the project-local .kit/git/ directory instead of the user's global directory")}
                          isChecked={local}
                          onChange={(_ev, checked) => setLocal(checked)}
                />
                <ActionGroup>
                    <Button variant="primary" type="submit" isDisabled={!gitUrl.trim()}>
                        {_("Install")}
                    </Button>
                </ActionGroup>
            </Form>

            <Modal isOpen={installOpen} variant="large" onClose={() => setInstallOpen(false)}>
                <ModalHeader title={cockpit.format(_("Installing $0"), gitUrl)} />
                <ModalBody>
                    <Content component="p">
                        {_("If the repository contains more than one extension you will be asked which ones to install.")}
                    </Content>
                    {installOpen &&
                        <KitTerminal
parentId="kit-extensions-install-terminal"
                                     directory={directory}
                                     args={["install", ...(local ? ["-l"] : []), gitUrl.trim()]}
                        />}
                </ModalBody>
                <ModalFooter>
                    <Button variant="link" onClick={() => { setInstallOpen(false); setRefreshToken(prev => prev + 1) }}>
                        {_("Close")}
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};
