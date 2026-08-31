/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Runs a read-only "kit" subcommand (no interactive prompts expected) and
 * renders its raw text output. Used for status/listing commands like
 * "kit auth status", "kit models", "kit extensions list".
 */

import React, { useEffect, useState } from 'react';
import { Bullseye } from "@patternfly/react-core/dist/esm/layouts/Bullseye/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { InlineNotification } from "cockpit-components-inline-notification";
import cockpit from 'cockpit';

import { runKit } from '../kit-client';

const _ = cockpit.gettext;

interface CommandOutputProps {
    args: string[];
    /** Change this value to force a re-run (e.g. a "Refresh" button). */
    refreshToken?: number | string;
}

export const CommandOutput = ({ args, refreshToken }: CommandOutputProps) => {
    const [state, setState] = useState<{ loading: boolean, output: string, error: string }>(
        { loading: true, output: "", error: "" });

    useEffect(() => {
        let cancelled = false;
        setState(prev => ({ ...prev, loading: true }));
        runKit(args).then(result => {
            if (cancelled)
                return;
            setState({ loading: false, output: result.output, error: result.ok ? "" : result.error });
        });
        return () => { cancelled = true };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [args.join(' '), refreshToken]);

    if (state.loading) {
        return (
            <Bullseye>
                <Spinner size="lg" aria-label={_("Running kit...")} />
            </Bullseye>
        );
    }

    if (state.error) {
        return <InlineNotification type="danger" text={_("Command failed")} detail={state.error} />;
    }

    return <pre className="kit-command-output">{state.output || _("(no output)")}</pre>;
};
