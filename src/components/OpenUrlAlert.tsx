/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Shown above a Kit terminal when Kit asked to open a web page (see
 * kit-spawn.ts): the full, unwrapped URL to open or copy, and, for OAuth
 * flows that redirect back to a "localhost" callback server, a way to hand
 * the browser's final address to Kit on the Cockpit host.
 */

import React, { useState } from 'react';
import { Alert, AlertActionCloseButton } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { ClipboardCopy } from "@patternfly/react-core/dist/esm/components/ClipboardCopy/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { InputGroup, InputGroupItem } from "@patternfly/react-core/dist/esm/components/InputGroup/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Flex, FlexItem } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Stack } from "@patternfly/react-core/dist/esm/layouts/Stack/index.js";
import { ExternalLinkAltIcon } from "@patternfly/react-icons/dist/esm/icons/external-link-alt-icon.js";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// The OAuth redirect target, if it's a callback server on the Cockpit host
// ("http://localhost:<port>/..."). The browser follows that redirect on its
// own machine, where nothing is listening unless it's the same machine.
function loopbackRedirect(authUrl: string): URL | null {
    try {
        const redirect = new URL(new URL(authUrl).searchParams.get("redirect_uri") ?? "");
        return (redirect.protocol === "http:" && LOOPBACK_HOSTS.includes(redirect.hostname)) ? redirect : null;
    } catch {
        return null;
    }
}

// Replays the callback request the browser couldn't deliver, from the
// Cockpit host, where Kit's callback server is listening.
async function deliverCallback(redirect: URL, pasted: string) {
    let callback: URL;
    try {
        callback = new URL(pasted.trim());
    } catch {
        throw new Error(_("Paste the complete address, starting with http://"));
    }
    if (callback.origin !== redirect.origin || callback.pathname !== redirect.pathname)
        throw new Error(cockpit.format(_("The address should start with $0"), redirect.origin + redirect.pathname));

    const client = cockpit.http(redirect.port || "80", { address: redirect.hostname.replace(/^\[(.*)\]$/, "$1") });
    try {
        await client.get(callback.pathname + callback.search);
    } finally {
        client.close();
    }
}

interface OpenUrlAlertProps {
    url: string;
    onClose: () => void;
}

export const OpenUrlAlert = ({ url, onClose }: OpenUrlAlertProps) => {
    const redirect = loopbackRedirect(url);
    const [callbackUrl, setCallbackUrl] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ ok: boolean, text: string } | null>(null);
    const done = result?.ok === true;

    const onSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!redirect)
            return;
        setSending(true);
        setResult(null);
        deliverCallback(redirect, callbackUrl)
                .then(() => setResult({ ok: true, text: _("Sign-in handed to Kit. Continue in the terminal.") }))
                .catch(err => setResult({ ok: false, text: String((err as Error)?.message || err) }))
                .finally(() => setSending(false));
    };

    return (
        <Alert
            isInline
            variant="info"
            className="kit-open-url"
            title={_("Kit wants to open a web page")}
            actionClose={<AlertActionCloseButton onClose={onClose} />}
        >
            <Stack hasGutter>
                <p>
                    {_("Kit runs on this server and can't open your browser itself. Open the page from here, or copy its address:")}
                </p>
                <Flex flexWrap={{ default: "nowrap" }} spaceItems={{ default: "spaceItemsSm" }}>
                    <FlexItem grow={{ default: "grow" }} className="kit-open-url-address">
                        <ClipboardCopy isReadOnly hoverTip={_("Copy")} clickTip={_("Copied")}>
                            {url}
                        </ClipboardCopy>
                    </FlexItem>
                    <Button
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<ExternalLinkAltIcon />}
                        iconPosition="end"
                    >
                        {_("Open")}
                    </Button>
                </Flex>
                {redirect &&
                    <>
                        <p>
                            {cockpit.format(_("After you sign in, the browser is sent back to $0, which is Kit on this server. Unless your browser runs on this server too, that page won't load: copy its full address from the browser's address bar and paste it here."),
                                            redirect.origin)}
                        </p>
                        <form onSubmit={onSubmit}>
                            <InputGroup>
                                <InputGroupItem isFill>
                                    <TextInput
                                        aria-label={_("Address the browser was sent to")}
                                        placeholder={redirect.origin + redirect.pathname + "?code=..."}
                                        value={callbackUrl}
                                        onChange={(_ev, value) => setCallbackUrl(value)}
                                        isDisabled={done}
                                    />
                                </InputGroupItem>
                                <InputGroupItem>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        isLoading={sending}
                                        isDisabled={!callbackUrl.trim() || sending || done}
                                    >
                                        {_("Finish sign-in")}
                                    </Button>
                                </InputGroupItem>
                            </InputGroup>
                        </form>
                        {result &&
                            <HelperText>
                                <HelperTextItem variant={result.ok ? "success" : "error"}>{result.text}</HelperTextItem>
                            </HelperText>}
                    </>}
            </Stack>
        </Alert>
    );
};
