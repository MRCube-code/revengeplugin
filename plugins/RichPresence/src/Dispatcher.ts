/**
 * Dispatcher.ts
 *
 * Builds and dispatches LOCAL_ACTIVITY_UPDATE payloads.
 *
 * ─── BUTTON BUG ROOT CAUSE ANALYSIS ────────────────────────────────────────
 *
 * The original sendRequest() called cloneAndFilter() BEFORE processing buttons.
 * cloneAndFilter uses a JSON.stringify replacer that calls isValid() on every
 * value. isValid() returns false for empty strings ("").
 *
 * Trace with a typical button {label: "Click", url: ""}:
 *   1. cloneAndFilter encounters the button object.
 *   2. It iterates keys: label → "Click" (valid), url → "" (INVALID → removed).
 *   3. Output: { label: "Click" }  — url is gone.
 *   4. activity.buttons.filter(x => x && x.label) → passes (label exists).
 *   5. metadata.button_urls = activity.buttons.map(x => x.url) → [undefined].
 *   6. Discord's gateway receives button_urls: [undefined] and silently drops
 *      the button because undefined is not a valid URL string.
 *
 * Additionally, the original filter only checked x.label — not x.url — so a
 * button with a label but a missing/empty URL always passed through and produced
 * a broken payload.
 *
 * SECONDARY BUG — socketId mismatch:
 *   sendRequest(null)     → socketId: "RPC@Reveg"
 *   sendRequest(activity) → socketId: "RichPresence@Vendetta"
 *
 * Discord tracks activities per socketId. Clearing with a different socketId
 * targets a different activity slot, so the presence was never actually removed
 * on plugin unload. It only disappeared when Discord reconnected to the gateway.
 *
 * FIX:
 *   • SOCKET_ID constant used for BOTH set and clear.
 *   • Buttons are filtered by BOTH label AND url being non-empty valid strings.
 *   • The entire payload is built explicitly — no cloneAndFilter stripping.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { FluxDispatcher } from "@vendetta/metro/common";
import { logger } from "@vendetta";
import { ActivityProfile } from "./Types";
import { resolveAssets } from "./Assets";
import { SOCKET_ID, PLUGIN_PID } from "./Constants";

const RE_URL = /^https?:\/\//i;

// Tracks the plugin-load timestamp for default "start" when no timestamp is set
let pluginStartTime = Date.now();

export function resetStartTime(): void {
    pluginStartTime = Date.now();
}

export function clearActivity(debug = false): void {
    const payload = {
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: null,
        pid: PLUGIN_PID,
        socketId: SOCKET_ID,       // ← same socketId as sendActivity()
    };
    if (debug) logger.log("[RichPresence:Dispatcher] clear payload:", JSON.stringify(payload, null, 2));
    FluxDispatcher.dispatch(payload);
}

export async function sendActivity(profile: ActivityProfile, debug = false): Promise<void> {
    if (debug) {
        logger.log("[RichPresence:Dispatcher] raw profile:", JSON.stringify(profile, null, 2));
    }

    // ── Core required fields ────────────────────────────────────────────────
    const activity: Record<string, unknown> = {
        name:           profile.name?.trim() ?? "Unknown",
        application_id: profile.application_id?.trim() ?? "",
        type:           profile.type  ?? 0,
        flags:          profile.flags ?? 0,
    };

    // ── Optional text fields ────────────────────────────────────────────────
    if (profile.details?.trim())  activity.details  = profile.details.trim();
    if (profile.state?.trim())    activity.state    = profile.state.trim();
    if (profile.instance != null) activity.instance = profile.instance;

    // ── Timestamps ──────────────────────────────────────────────────────────
    if (profile.timestamps?._enabled) {
        const ts: Record<string, number> = {};
        const start = profile.timestamps.start;
        const end   = profile.timestamps.end;

        ts.start = (typeof start === "number" && start > 0) ? start : pluginStartTime;
        if (typeof end === "number" && end > 0 && end > ts.start) {
            ts.end = end;
        }
        activity.timestamps = ts;
    }

    // ── Assets ──────────────────────────────────────────────────────────────
    const largeImg = profile.assets?.large_image?.trim();
    const smallImg = profile.assets?.small_image?.trim();

    if (largeImg || smallImg || profile.assets?.large_text?.trim() || profile.assets?.small_text?.trim()) {
        const resolved = await resolveAssets(
            profile.application_id,
            largeImg || undefined,
            smallImg || undefined,
            debug
        );

        const assets: Record<string, string> = {};
        if (resolved.large_image)                  assets.large_image = resolved.large_image;
        if (profile.assets?.large_text?.trim())    assets.large_text  = profile.assets.large_text.trim();
        if (resolved.small_image)                  assets.small_image = resolved.small_image;
        if (profile.assets?.small_text?.trim())    assets.small_text  = profile.assets.small_text.trim();
        if (Object.keys(assets).length)            activity.assets    = assets;
    }

    // ── Party ───────────────────────────────────────────────────────────────
    if (profile.party) {
        const party: Record<string, unknown> = {};
        if (profile.party.id?.trim()) party.id = profile.party.id.trim();
        if (profile.party.size != null && profile.party.max != null) {
            party.size = [profile.party.size, profile.party.max];
        }
        if (Object.keys(party).length) activity.party = party;
    }

    // ── Secrets ─────────────────────────────────────────────────────────────
    if (profile.secrets) {
        const secrets: Record<string, string> = {};
        if (profile.secrets.join?.trim())     secrets.join     = profile.secrets.join.trim();
        if (profile.secrets.spectate?.trim()) secrets.spectate = profile.secrets.spectate.trim();
        if (profile.secrets.match?.trim())    secrets.match    = profile.secrets.match.trim();
        if (Object.keys(secrets).length)      activity.secrets = secrets;
    }

    // ── Buttons ─────────────────────────────────────────────────────────────
    // Discord RPC button format (LOCAL_ACTIVITY_UPDATE):
    //   activity.buttons   = ["Label One", "Label Two"]   ← plain string labels
    //   activity.metadata  = { button_urls: ["https://...", "https://..."] }
    //
    // A button is only included when BOTH label AND url are non-empty valid strings.
    // Anything less produces undefined in button_urls, which Discord silently drops.
    const validButtons = (profile.buttons ?? []).filter(
        (btn): btn is { label: string; url: string } =>
            btn != null &&
            typeof btn.label === "string" && btn.label.trim().length > 0 &&
            typeof btn.url   === "string" && btn.url.trim().length   > 0 &&
            RE_URL.test(btn.url.trim())
    );

    if (validButtons.length > 0) {
        const labels = validButtons.map(b => b.label.trim());
        const urls   = validButtons.map(b => b.url.trim());
        activity.buttons  = labels;
        activity.metadata = { button_urls: urls };

        if (debug) {
            logger.log("[RichPresence:Dispatcher] button payload:", { labels, urls });
        }
    }

    const payload = {
        type:     "LOCAL_ACTIVITY_UPDATE",
        activity,
        pid:      PLUGIN_PID,
        socketId: SOCKET_ID,
    };

    if (debug) {
        logger.log("[RichPresence:Dispatcher] gateway payload:", JSON.stringify(payload, null, 2));
    }

    FluxDispatcher.dispatch(payload);
    logger.log("[RichPresence:Dispatcher] dispatched:", profile.name);
}
