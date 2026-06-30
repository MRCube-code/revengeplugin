import { logger } from "@vendetta";
import { initStorage, getCurrentProfile, getStore } from "./Storage";
import { sendActivity, clearActivity, resetStartTime } from "./Dispatcher";
import Settings from "./Settings";

// initStorage runs at module evaluation time so the Settings component
// never sees an uninitialised store, regardless of mount order.
initStorage();

export default {
    onLoad() {
        resetStartTime();
        const profile = getCurrentProfile();
        sendActivity(profile, getStore().debugMode).catch(e => {
            logger.error("[RichPresence] onLoad dispatch failed:", e);
        });
    },

    onUnload() {
        // SOCKET_ID is the same as in sendActivity — this actually clears it.
        // The original used a different socketId ("RPC@Reveg") which opened a
        // separate slot and left the activity visible until gateway reconnect.
        clearActivity(getStore().debugMode);
    },

    settings: Settings,
};
