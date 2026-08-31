/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Runs a "kit" command in a real pty (via a Cockpit "stream" channel) and
 * renders it with the same Terminal widget Cockpit's own Terminal page
 * uses. Used both for the main interactive "kit" TUI, and for one-off
 * subcommands that need a real terminal (auth login, install, ...).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { NumberInput } from "@patternfly/react-core/dist/esm/components/NumberInput/index.js";
import { Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { EmptyStatePanel } from "cockpit-components-empty-state";
import { Terminal, TerminalTheme } from "cockpit-components-terminal.jsx";
import cockpit from 'cockpit';

import "./KitTerminal.scss";

const _ = cockpit.gettext;

interface KitTerminalProps {
    /** Arguments passed after "kit", e.g. [] for the interactive TUI, or ["auth", "login", "anthropic"]. */
    args: string[];
    /** Working directory to spawn "kit" in. */
    directory?: string;
    /** Bump this to force the terminal to restart with a fresh process. */
    resetKey?: number | string;
    parentId: string;
}

export const KitTerminal = ({ args, directory, resetKey, parentId }: KitTerminalProps) => {
    const [pid, setPid] = useState<number | null>(null);
    const [theme, setTheme] = useState<TerminalTheme>(() => (localStorage.getItem('kit:terminal-theme') as TerminalTheme) || "black-theme");
    const [size, setSize] = useState(() => parseInt(localStorage.getItem('kit:terminal-font-size') || "") || 16);
    const [channel, setChannel] = useState<cockpit.Channel<string> | null>(null);
    const terminalRef = useRef<InstanceType<typeof Terminal>>(null);

    const webglAvailable = useRef(!!document.createElement("canvas").getContext("webgl2")).current;

    const createChannel = () => {
        const ch = cockpit.channel({
            payload: "stream",
            spawn: ["kit", ...args],
            environ: ["TERM=xterm-256color"],
            directory,
            pty: true,
        });
        ch.addEventListener("ready", (_ev, msg) => setPid((msg as unknown as { pid: number }).pid));
        ch.addEventListener("close", () => setPid(null));
        return ch;
    };

    useEffect(() => {
        setChannel(createChannel());
        return () => setChannel(prev => { prev?.close(); return null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [args.join(' '), directory, resetKey]);

    const onThemeChanged = (_ev: React.FormEvent<HTMLSelectElement>, value: string) => {
        setTheme(value as TerminalTheme);
        localStorage.setItem('kit:terminal-theme', value);
    };

    const onPlus = () => setSize(prev => {
        localStorage.setItem('kit:terminal-font-size', String(prev + 1));
        return prev + 1;
    });
    const onMinus = () => setSize(prev => {
        localStorage.setItem('kit:terminal-font-size', String(prev - 1));
        return prev - 1;
    });

    const onRestartClick = () => {
        setChannel(prev => { prev?.close(); return createChannel() });
    };

    if (!webglAvailable)
        return <EmptyStatePanel title={_("Terminal not available")} paragraph={_("This browser does not support WebGL2.")} />;

    return (
        <div className="kit-terminal-group">
            <Toolbar id={`${parentId}-toolbar`}>
                <ToolbarContent>
                    <ToolbarGroup>
                        <ToolbarItem variant="label" id={`${parentId}-size-select`}>{_("Font size")}</ToolbarItem>
                        <ToolbarItem>
                            <NumberInput
                                className="font-size"
                                value={size}
                                min={6}
                                max={40}
                                onMinus={onMinus}
                                onPlus={onPlus}
                                inputAriaLabel={_("Font size")}
                                minusBtnAriaLabel={_("Decrease by one")}
                                plusBtnAriaLabel={_("Increase by one")}
                                widthChars={2}
                            />
                        </ToolbarItem>
                    </ToolbarGroup>
                    <ToolbarGroup>
                        <ToolbarItem variant="label" id={`${parentId}-theme-select`}>{_("Appearance")}</ToolbarItem>
                        <ToolbarItem>
                            <FormSelect onChange={onThemeChanged} aria-labelledby={`${parentId}-theme-select`} value={theme}>
                                <FormSelectOption value='black-theme' label={_("Black")} />
                                <FormSelectOption value='dark-theme' label={_("Dark")} />
                                <FormSelectOption value='light-theme' label={_("Light")} />
                                <FormSelectOption value='white-theme' label={_("White")} />
                            </FormSelect>
                        </ToolbarItem>
                    </ToolbarGroup>
                    <ToolbarItem>
                        <Button variant="secondary" onClick={onRestartClick}>
                            {pid ? _("Restart") : _("Start")}
                        </Button>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>
            <div className={"kit-terminal-body " + theme} id={parentId}>
                {channel
                    ? (
                        <Terminal
                            ref={terminalRef}
                            channel={channel}
                            theme={theme}
                            fontSize={size}
                            parentId={parentId}
                        />
                    )
                    : <span>{_("Loading...")}</span>}
            </div>
        </div>
    );
};
