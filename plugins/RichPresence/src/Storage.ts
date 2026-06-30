import { storage } from "@vendetta/plugin";
import { logger } from "@vendetta";
import { StorageSchema, ActivityProfile, ActivityType } from "./Types";
import { STORAGE_VERSION, DEFAULT_APP_ID } from "./Constants";

// Cast once — all consumers use getStore() to get the typed reference
const store = storage as unknown as StorageSchema;

function makeDefaultProfile(): ActivityProfile {
    return {
        name: "Discord",
        application_id: DEFAULT_APP_ID,
        type: ActivityType.PLAYING,
        details: "",
        state: "",
        timestamps: { _enabled: false, start: Date.now() },
        assets: {},
        buttons: [{ label: "", url: "" }, { label: "", url: "" }],
        flags: 0,
    };
}

function ensureProfileShape(p: ActivityProfile): void {
    // Backward compat: bring any old profile up to the current shape
    p.timestamps     ??= { _enabled: false, start: Date.now() };
    p.assets         ??= {};
    p.buttons        ??= [{ label: "", url: "" }, { label: "", url: "" }];
    p.flags          ??= 0;

    // Always keep exactly 2 button slots so Settings can index [0] / [1] safely
    while (p.buttons.length < 2) p.buttons.push({ label: "", url: "" });
    p.buttons[0]     ??= { label: "", url: "" };
    p.buttons[1]     ??= { label: "", url: "" };

    // Normalise nullish button fields
    p.buttons[0].label ??= "";
    p.buttons[0].url   ??= "";
    p.buttons[1].label ??= "";
    p.buttons[1].url   ??= "";
}

export function initStorage(): void {
    // v0 → v1: add _version, debugMode, normalise all profiles
    if (!store._version) {
        logger.log("[RichPresence] Migrating storage v0 → v1");

        store.selections ??= { default: makeDefaultProfile() };
        for (const key of Object.keys(store.selections)) {
            ensureProfileShape(store.selections[key]);
        }
        if (!store.selected || !store.selections[store.selected]) {
            store.selected = Object.keys(store.selections)[0] ?? "default";
            store.selections.default ??= makeDefaultProfile();
        }
        store.debugMode   = false;
        store._version    = STORAGE_VERSION;
        logger.log("[RichPresence] Migration done");
        return;
    }

    // Normal init — fill in anything missing
    store.selected    ??= "default";
    store.selections  ??= { default: makeDefaultProfile() };
    store.debugMode   ??= false;

    if (!store.selections[store.selected]) {
        logger.warn("[RichPresence] Selected profile missing; resetting");
        store.selected = Object.keys(store.selections)[0] ?? "default";
        store.selections.default ??= makeDefaultProfile();
    }

    for (const key of Object.keys(store.selections)) {
        ensureProfileShape(store.selections[key]);
    }
}

export function getStore(): StorageSchema {
    return store;
}

export function getCurrentProfile(): ActivityProfile {
    return store.selections[store.selected];
}

export function createProfile(name: string): string {
    const id = `profile_${Date.now()}`;
    store.selections[id] = { ...makeDefaultProfile(), name };
    return id;
}

export function duplicateProfile(sourceId: string, newName: string): string {
    const src = store.selections[sourceId];
    if (!src) throw new Error(`Profile "${sourceId}" not found`);
    const id = `profile_${Date.now()}`;
    store.selections[id] = JSON.parse(JSON.stringify(src));
    store.selections[id].name = newName;
    ensureProfileShape(store.selections[id]);
    return id;
}

export function deleteProfile(id: string): void {
    const keys = Object.keys(store.selections);
    if (keys.length <= 1) throw new Error("Cannot delete the last profile");
    delete store.selections[id];
    if (store.selected === id) {
        store.selected = Object.keys(store.selections)[0];
    }
}

export function importProfile(json: string): string {
    let data: Partial<ActivityProfile>;
    try {
        data = JSON.parse(json);
    } catch {
        throw new Error("Invalid JSON");
    }
    if (!data.name || !data.application_id) {
        throw new Error("Missing required fields: name, application_id");
    }
    const id = `imported_${Date.now()}`;
    store.selections[id] = {
        name:           data.name,
        application_id: data.application_id,
        type:           data.type           ?? ActivityType.PLAYING,
        details:        data.details,
        state:          data.state,
        timestamps:     data.timestamps     ?? { _enabled: false, start: Date.now() },
        assets:         data.assets         ?? {},
        buttons:        data.buttons        ?? [{ label: "", url: "" }, { label: "", url: "" }],
        party:          data.party,
        secrets:        data.secrets,
        instance:       data.instance,
        flags:          data.flags          ?? 0,
    };
    ensureProfileShape(store.selections[id]);
    return id;
}

export function exportProfile(id: string): string {
    const profile = store.selections[id];
    if (!profile) throw new Error(`Profile "${id}" not found`);
    // Strip internal metadata (_enabled, etc.) from the exported JSON
    return JSON.stringify(profile, (key, val) => {
        if (typeof key === "string" && key.startsWith("_")) return undefined;
        return val;
    }, 2);
}
