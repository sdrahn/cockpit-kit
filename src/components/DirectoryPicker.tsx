/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React from 'react';
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FileAutoComplete } from "cockpit-components-file-autocomplete";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

interface DirectoryPickerProps {
    id: string;
    label?: string;
    directory: string;
    onChange: (directory: string) => void;
}

export const DirectoryPicker = ({ id, label, directory, onChange }: DirectoryPickerProps) => {
    return (
        <FormGroup label={label ?? _("Working directory")} fieldId={id}>
            <FileAutoComplete
id={id}
                               onlyDirectories
                               isOptionCreatable
                               placeholder={_("Path to a directory")}
                               value={directory}
                               onChange={value => onChange(value)}
            />
        </FormGroup>
    );
};
