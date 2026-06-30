import { ActivityProfile, ButtonEntry, ValidationError } from "./Types";

const RE_APP_ID = /^\d{17,20}$/;
const RE_URL    = /^https?:\/\/.+/i;

export function validateAppId(id?: string): string | null {
    if (!id?.trim()) return "Application ID is required.";
    if (!RE_APP_ID.test(id.trim())) return "Must be a 17–20 digit snowflake.";
    return null;
}

export function validateName(name?: string): string | null {
    if (!name?.trim()) return "Name is required.";
    if (name.trim().length > 128) return "Max 128 characters.";
    return null;
}

export function validateUrl(url?: string): string | null {
    if (!url?.trim()) return "URL is required.";
    if (!RE_URL.test(url.trim())) return "Must start with http:// or https://";
    if (url.length > 512) return "Max 512 characters.";
    return null;
}

export function validateTimestamps(start?: number, end?: number): string | null {
    if (start !== undefined && (isNaN(start) || start <= 0)) return "Start must be a positive Unix ms value.";
    if (end !== undefined && (isNaN(end) || end <= 0)) return "End must be a positive Unix ms value.";
    if (start !== undefined && end !== undefined && end <= start) return "End must be after start.";
    return null;
}

export function validateButton(btn: ButtonEntry | undefined, index: number): ValidationError[] {
    if (!btn) return [];
    const errors: ValidationError[] = [];
    const hasLabel = typeof btn.label === "string" && btn.label.trim().length > 0;
    const hasUrl   = typeof btn.url   === "string" && btn.url.trim().length > 0;

    if (hasLabel && btn.label!.trim().length > 32) {
        errors.push({ field: `button${index}_label`, message: `Button ${index} label: max 32 characters.` });
    }
    if (hasLabel && !hasUrl) {
        errors.push({ field: `button${index}_url`, message: `Button ${index} has a label but no URL.` });
    }
    if (hasUrl && !hasLabel) {
        errors.push({ field: `button${index}_label`, message: `Button ${index} has a URL but no label.` });
    }
    if (hasUrl) {
        const urlErr = validateUrl(btn.url);
        if (urlErr) errors.push({ field: `button${index}_url`, message: `Button ${index} URL: ${urlErr}` });
    }
    return errors;
}

export function validateParty(size?: number, max?: number): string | null {
    if (size !== undefined && (isNaN(size) || size < 1)) return "Size must be ≥ 1.";
    if (max  !== undefined && (isNaN(max)  || max  < 1)) return "Max must be ≥ 1.";
    if (size !== undefined && max !== undefined && size > max) return "Size cannot exceed max.";
    return null;
}

// Returns all validation errors for the entire profile. Empty array = valid.
export function validateProfile(p: ActivityProfile): ValidationError[] {
    const errors: ValidationError[] = [];
    const push = (field: string, msg: string | null) => { if (msg) errors.push({ field, message: msg }); };

    push("name",           validateName(p.name));
    push("application_id", validateAppId(p.application_id));

    if (p.details && p.details.trim().length > 128) push("details", "Max 128 characters.");
    if (p.state   && p.state.trim().length   > 128) push("state",   "Max 128 characters.");

    if (p.timestamps?._enabled) {
        push("timestamps", validateTimestamps(p.timestamps.start, p.timestamps.end));
    }

    if (p.assets?.large_text && p.assets.large_text.length > 128) push("large_text", "Max 128 characters.");
    if (p.assets?.small_text && p.assets.small_text.length > 128) push("small_text", "Max 128 characters.");

    if (p.buttons) {
        errors.push(...validateButton(p.buttons[0], 1));
        errors.push(...validateButton(p.buttons[1], 2));
    }

    if (p.party) {
        push("party", validateParty(p.party.size, p.party.max));
    }

    return errors;
}

export function errorsForField(errors: ValidationError[], field: string): string | null {
    return errors.find(e => e.field === field)?.message ?? null;
}
