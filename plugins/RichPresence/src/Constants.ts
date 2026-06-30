import { ActivityType } from "./Types";

export const STORAGE_VERSION = 1;

// Must be identical between sendActivity() and clearActivity().
// The original bug used "RPC@Reveg" for clear and "RichPresence@Vendetta" for set —
// mismatched socketIds open separate activity slots so the clear never actually clears.
export const SOCKET_ID = "RichPresence@Kettu";

export const PLUGIN_PID = 1608;
export const DEFAULT_APP_ID = "1054951789318909972";

// Display label that appears before the activity name (e.g. "Playing Discord")
export const ACTIVITY_TYPE_VERB: Record<number, string> = {
    [ActivityType.PLAYING]: "Playing",
    [ActivityType.STREAMING]: "Streaming",
    [ActivityType.LISTENING]: "Listening to",
    [ActivityType.WATCHING]: "Watching",
    [ActivityType.COMPETING]: "Competing in",
};

export const ACTIVITY_TYPE_OPTIONS: { label: string; value: ActivityType }[] = [
    { label: "Playing",    value: ActivityType.PLAYING },
    { label: "Streaming",  value: ActivityType.STREAMING },
    { label: "Listening",  value: ActivityType.LISTENING },
    { label: "Watching",   value: ActivityType.WATCHING },
    { label: "Competing",  value: ActivityType.COMPETING },
];
