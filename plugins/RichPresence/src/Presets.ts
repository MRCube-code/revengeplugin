import { ActivityProfile, ActivityType } from "./Types";
import { DEFAULT_APP_ID } from "./Constants";

// Presets are NEVER stored in selections directly.
// Selecting one creates a copy in storage.selections via duplicateProfile().
export const BUILT_IN_PRESETS: Record<string, { label: string; profile: ActivityProfile }> = {
    gtavi: {
        label: "GTA VI",
        profile: {
            name: "Grand Theft Auto VI",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.PLAYING,
            details: "Roaming Vice City",
            state: "Story Mode",
            timestamps: { _enabled: true, start: 0 }, // 0 = replaced with Date.now() on load
            assets: {
                large_image: "gtavi",
                large_text: "Grand Theft Auto VI",
                small_image: "rockstar",
                small_text: "Rockstar Games",
            },
            buttons: [
                { label: "Rockstar Games", url: "https://www.rockstargames.com" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },

    minecraft: {
        label: "Minecraft",
        profile: {
            name: "Minecraft",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.PLAYING,
            details: "Survival Mode",
            state: "Building a base",
            timestamps: { _enabled: true, start: 0 },
            assets: {
                large_image: "minecraft",
                large_text: "Minecraft",
                small_image: "creeper",
                small_text: "Creeper, aw man",
            },
            buttons: [
                { label: "Minecraft.net", url: "https://www.minecraft.net" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },

    spotify: {
        label: "Spotify",
        profile: {
            name: "Spotify",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.LISTENING,
            details: "Unknown Artist",
            state: "Unknown Album",
            timestamps: { _enabled: true, start: 0 },
            assets: {
                large_image: "spotify",
                large_text: "Listening on Spotify",
            },
            buttons: [
                { label: "Listen on Spotify", url: "https://open.spotify.com" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },

    vscode: {
        label: "Visual Studio Code",
        profile: {
            name: "Visual Studio Code",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.PLAYING,
            details: "Editing a file",
            state: "Workspace",
            timestamps: { _enabled: true, start: 0 },
            assets: {
                large_image: "vscode",
                large_text: "Visual Studio Code",
            },
            buttons: [
                { label: "Download VS Code", url: "https://code.visualstudio.com" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },

    chrome: {
        label: "Google Chrome",
        profile: {
            name: "Google Chrome",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.PLAYING,
            details: "Browsing the web",
            state: "",
            timestamps: { _enabled: true, start: 0 },
            assets: {
                large_image: "chrome",
                large_text: "Google Chrome",
            },
            buttons: [
                { label: "Download Chrome", url: "https://www.google.com/chrome" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },

    discord: {
        label: "Discord",
        profile: {
            name: "Discord",
            application_id: DEFAULT_APP_ID,
            type: ActivityType.PLAYING,
            details: "Talking with friends",
            state: "In a voice channel",
            timestamps: { _enabled: true, start: 0 },
            assets: {
                large_image: "discord",
                large_text: "Discord",
            },
            buttons: [
                { label: "Join Discord", url: "https://discord.com" },
                { label: "", url: "" },
            ],
            flags: 0,
        },
    },
};
