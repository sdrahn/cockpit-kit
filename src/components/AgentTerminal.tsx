/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Content } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { Form } from "@patternfly/react-core/dist/esm/components/Form/index.js";

import cockpit from 'cockpit';

import { DirectoryPicker } from './DirectoryPicker';
import { KitTerminal } from './KitTerminal';

const _ = cockpit.gettext;

// Leftover gap below the terminal to clear the page section's own bottom
// padding.
const BOTTOM_MARGIN_PX = 16;
const MIN_HEIGHT_PX = 300;

// How much vertical space is actually available depends on the exact
// rendered height of the masthead/tabs/page chrome above this element,
// which isn't something CSS alone can reliably account for. Measure it
// directly instead: how far this element's top is from the bottom of the
// viewport, re-measured on resize and whenever the content above it
// (e.g. a directory picker error) changes height.
function useFillHeight<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [height, setHeight] = useState<number | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el)
            return;

        const update = () => {
            const top = el.getBoundingClientRect().top;
            setHeight(Math.max(window.innerHeight - top - BOTTOM_MARGIN_PX, MIN_HEIGHT_PX));
        };

        update();
        window.addEventListener('resize', update);
        const observer = new ResizeObserver(update);
        if (el.parentElement)
            observer.observe(el.parentElement);

        return () => {
            window.removeEventListener('resize', update);
            observer.disconnect();
        };
    }, []);

    return { ref, height };
}

interface AgentTerminalProps {
    homeDirectory: string;
}

export const AgentTerminal = ({ homeDirectory }: AgentTerminalProps) => {
    const [directory, setDirectory] = useState(homeDirectory);
    const { ref, height } = useFillHeight<HTMLDivElement>();

    return (
        <div ref={ref} className="kit-terminal-page" style={height ? { blockSize: `${height}px` } : undefined}>
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
