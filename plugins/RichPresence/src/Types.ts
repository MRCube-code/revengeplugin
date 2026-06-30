export enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5,
}

export interface ButtonEntry {
    label?: string;
    url?: string;
}

// Storage-side timestamp (includes the _enabled meta flag, stripped before dispatch)
export interface TimestampConfig {
    _enabled: boolean;
    start?: number;
    end?: number;
}

export interface AssetConfig {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export interface PartyConfig {
    id?: string;
    size?: number;
    max?: number;
}

export interface SecretsConfig {
    join?: string;
    spectate?: string;
    match?: string;
}

// Full profile as stored in plugin storage
export interface ActivityProfile {
    name: string;
    application_id: string;
    type: ActivityType;
    details?: string;
    state?: string;
    assets?: AssetConfig;
    timestamps?: TimestampConfig;
    party?: PartyConfig;
    secrets?: SecretsConfig;
    // Two button slots; always kept as a 2-element array in storage
    buttons?: [ButtonEntry, ButtonEntry];
    instance?: boolean;
    flags?: number;
}

export interface StorageSchema {
    _version: number;
    selected: string;
    selections: Record<string, ActivityProfile>;
    debugMode: boolean;
}

export interface ValidationError {
    field: string;
    message: string;
}
