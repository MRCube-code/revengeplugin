import { React, ReactNative, stylesheet } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { logger } from "@vendetta";

import {
    getStore,
    getCurrentProfile,
    createProfile,
    duplicateProfile,
    deleteProfile,
    importProfile,
    exportProfile,
} from "./Storage";
import { sendActivity, clearActivity } from "./Dispatcher";
import { validateProfile, errorsForField } from "./Validators";
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_VERB } from "./Constants";
import { BUILT_IN_PRESETS } from "./Presets";
import { ActivityProfile } from "./Types";
import { formatElapsed, formatRemaining, safeNum } from "./Utils";

const { useState, useEffect, useCallback } = React;
const { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } = ReactNative;
const { FormSection, FormRow, FormSwitchRow, FormInput, FormText, FormDivider } = Forms;

// ─── Theming ─────────────────────────────────────────────────────────────────

const S = stylesheet.createThemedStyleSheet({
    // Discord blurple palette
    card: {
        backgroundColor: "#1e1f22",
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    cardHeader: {
        fontSize: 11,
        fontWeight: "700",
        color: "#b5bac1",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom: 10,
    },
    cardName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 2,
    },
    cardText: {
        fontSize: 14,
        color: "#b5bac1",
        marginBottom: 1,
    },
    cardTimestamp: {
        fontSize: 12,
        color: "#80848e",
        marginTop: 6,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 10,
    },
    previewButton: {
        flex: 1,
        backgroundColor: "#2b2d31",
        borderRadius: 4,
        paddingVertical: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#3f4248",
    },
    previewButtonText: {
        color: "#dcddde",
        fontSize: 13,
        fontWeight: "600",
    },
    // Chip row for activity type picker
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "#2b2d31",
        borderWidth: 1,
        borderColor: "#3f4248",
    },
    chipActive: {
        backgroundColor: "#5865f2",
        borderColor: "#5865f2",
    },
    chipText: {
        fontSize: 13,
        color: "#b5bac1",
        fontWeight: "600",
    },
    chipTextActive: {
        color: "#fff",
    },
    // Action buttons
    actionRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    btnPrimary: {
        flex: 1,
        backgroundColor: "#5865f2",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    btnSecondary: {
        flex: 1,
        backgroundColor: "#2b2d31",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#3f4248",
    },
    btnDanger: {
        flex: 1,
        backgroundColor: "#da373c",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    btnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    // Error text
    errorText: {
        color: "#f23f43",
        fontSize: 12,
        paddingHorizontal: 16,
        paddingBottom: 6,
    },
    sectionPad: {
        height: 24,
    },
    // Profile list item
    profileItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#3f4248",
    },
    profileItemActive: {
        backgroundColor: "#5865f220",
    },
    profileDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#3f4248",
        marginRight: 10,
    },
    profileDotActive: {
        backgroundColor: "#23a559",
    },
    profileName: {
        flex: 1,
        color: "#dcddde",
        fontSize: 15,
    },
    profileNameActive: {
        color: "#fff",
        fontWeight: "600",
    },
});

// ─── Live Preview Card ────────────────────────────────────────────────────────

function PreviewCard({ profile }: { profile: ActivityProfile }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const verb = ACTIVITY_TYPE_VERB[profile.type] ?? "Playing";
    const hasStart = profile.timestamps?._enabled && profile.timestamps?.start;
    const hasEnd   = profile.timestamps?._enabled && profile.timestamps?.end;

    const btn1 = profile.buttons?.[0];
    const btn2 = profile.buttons?.[1];
    const showBtn1 = btn1?.label?.trim() && btn1?.url?.trim();
    const showBtn2 = btn2?.label?.trim() && btn2?.url?.trim();

    return (
        <View style={S.card}>
            <Text style={S.cardHeader}>{verb}</Text>
            <Text style={S.cardName}>{profile.name?.trim() || "Activity Name"}</Text>
            {!!profile.details?.trim() && (
                <Text style={S.cardText}>{profile.details.trim()}</Text>
            )}
            {!!profile.state?.trim() && (
                <Text style={S.cardText}>{profile.state.trim()}</Text>
            )}
            {(hasStart || hasEnd) && (
                <Text style={S.cardTimestamp}>
                    {hasEnd && profile.timestamps!.end! > Date.now()
                        ? formatRemaining(profile.timestamps!.end!)
                        : hasStart
                        ? formatElapsed(profile.timestamps!.start!)
                        : ""}
                </Text>
            )}
            {(showBtn1 || showBtn2) && (
                <View style={S.buttonRow}>
                    {showBtn1 && (
                        <View style={S.previewButton}>
                            <Text style={S.previewButtonText}>{btn1!.label!.trim()}</Text>
                        </View>
                    )}
                    {showBtn2 && (
                        <View style={S.previewButton}>
                            <Text style={S.previewButtonText}>{btn2!.label!.trim()}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ─── Field error hint ─────────────────────────────────────────────────────────

function Err({ msg }: { msg: string | null }) {
    if (!msg) return null;
    return <Text style={S.errorText}>⚠ {msg}</Text>;
}

// ─── Main Settings component ──────────────────────────────────────────────────

export default function Settings() {
    const store = useProxy(storage as any);

    // Guard — Storage.initStorage() runs in index.ts before Settings mounts,
    // but if somehow the storage is in a bad state, recover.
    if (!store.selections?.[store.selected]) {
        store.selected   = Object.keys(store.selections ?? {})[0] ?? "default";
        store.selections ??= {};
        store.selections[store.selected] ??= {
            name: "Discord", application_id: "1054951789318909972",
            type: 0, flags: 0,
            timestamps: { _enabled: false, start: Date.now() },
            assets: {}, buttons: [{ label: "", url: "" }, { label: "", url: "" }],
        };
    }

    const profile = useProxy(store.selections[store.selected]) as ActivityProfile;

    const [showPresets,  setShowPresets]  = useState(false);
    const [showImport,   setShowImport]   = useState(false);
    const [importJson,   setImportJson]   = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    const errors = validateProfile(profile);

    const triggerUpdate = useCallback(async () => {
        try {
            await sendActivity(getCurrentProfile(), store.debugMode);
            showToast("✅ Presence updated");
        } catch (e) {
            logger.error("[RichPresence] Update failed:", e);
            showToast("❌ Failed to update presence");
        }
    }, [store.debugMode]);

    const triggerClear = useCallback(() => {
        clearActivity(store.debugMode);
        showToast("🔕 Presence cleared");
    }, [store.debugMode]);

    // ── Profile management helpers ───────────────────────────────────────────
    const handleNewProfile = () => {
        Alert.prompt("New Profile", "Enter a name:", (name) => {
            if (!name?.trim()) return;
            const id = createProfile(name.trim());
            store.selected = id;
            showToast(`✅ Created "${name.trim()}"`);
        });
    };

    const handleDuplicate = () => {
        Alert.prompt("Duplicate Profile", "Name for the copy:", (name) => {
            if (!name?.trim()) return;
            const id = duplicateProfile(store.selected, name.trim());
            store.selected = id;
            showToast(`✅ Duplicated to "${name.trim()}"`);
        }, "plain-text", `${profile.name} (Copy)`);
    };

    const handleDelete = () => {
        const profileNames = Object.keys(store.selections);
        if (profileNames.length <= 1) {
            showToast("❌ Cannot delete the last profile");
            return;
        }
        Alert.alert(
            "Delete Profile",
            `Delete "${profile.name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: () => {
                        deleteProfile(store.selected);
                        showToast("🗑 Profile deleted");
                    },
                },
            ]
        );
    };

    const handleExport = () => {
        try {
            const json = exportProfile(store.selected);
            ReactNative.Clipboard.setString(json);
            showToast("📋 Profile JSON copied to clipboard");
        } catch (e) {
            showToast("❌ Export failed");
        }
    };

    const handleImport = () => {
        try {
            const id = importProfile(importJson.trim());
            store.selected = id;
            setImportJson("");
            setShowImport(false);
            showToast("✅ Profile imported");
        } catch (e: any) {
            showToast(`❌ ${e?.message ?? "Import failed"}`);
        }
    };

    const handleLoadPreset = (key: string) => {
        const preset = BUILT_IN_PRESETS[key];
        if (!preset) return;
        const copy = JSON.parse(JSON.stringify(preset.profile)) as ActivityProfile;
        // Replace placeholder 0 timestamps with current time
        if (copy.timestamps?._enabled && copy.timestamps?.start === 0) {
            copy.timestamps.start = Date.now();
        }
        const id = `preset_${key}_${Date.now()}`;
        store.selections[id] = copy;
        store.selected = id;
        setShowPresets(false);
        showToast(`✅ Loaded "${preset.label}"`);
    };

    const profileKeys = Object.keys(store.selections ?? {});

    return (
        <ScrollView style={{ flex: 1 }}>

            {/* ── Live Preview ── */}
            <PreviewCard profile={profile} />

            {/* ── Action buttons ── */}
            <View style={S.actionRow}>
                <TouchableOpacity style={S.btnPrimary} onPress={triggerUpdate}>
                    <Text style={S.btnText}>Update Presence</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnSecondary} onPress={triggerClear}>
                    <Text style={S.btnText}>Clear</Text>
                </TouchableOpacity>
            </View>

            {/* ── Profile Management ── */}
            <FormSection title="Profiles">
                {profileKeys.map(key => (
                    <TouchableOpacity
                        key={key}
                        style={[S.profileItem, store.selected === key && S.profileItemActive]}
                        onPress={() => (store.selected = key)}
                    >
                        <View style={[S.profileDot, store.selected === key && S.profileDotActive]} />
                        <Text style={[S.profileName, store.selected === key && S.profileNameActive]}>
                            {store.selections[key]?.name ?? key}
                        </Text>
                        {store.selected === key && (
                            <Text style={{ color: "#23a559", fontSize: 12, marginLeft: 8 }}>active</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </FormSection>

            <View style={S.actionRow}>
                <TouchableOpacity style={S.btnSecondary} onPress={handleNewProfile}>
                    <Text style={S.btnText}>+ New</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnSecondary} onPress={handleDuplicate}>
                    <Text style={S.btnText}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnSecondary} onPress={() => setShowPresets(v => !v)}>
                    <Text style={S.btnText}>Presets</Text>
                </TouchableOpacity>
            </View>

            <View style={S.actionRow}>
                <TouchableOpacity style={S.btnSecondary} onPress={handleExport}>
                    <Text style={S.btnText}>Export JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnSecondary} onPress={() => setShowImport(v => !v)}>
                    <Text style={S.btnText}>Import JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.btnDanger} onPress={handleDelete}>
                    <Text style={S.btnText}>Delete</Text>
                </TouchableOpacity>
            </View>

            {showPresets && (
                <FormSection title="Load Preset (creates a copy)">
                    {Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => (
                        <FormRow
                            key={key}
                            label={preset.label}
                            trailing={FormRow.Arrow}
                            onPress={() => handleLoadPreset(key)}
                        />
                    ))}
                </FormSection>
            )}

            {showImport && (
                <FormSection title="Import JSON">
                    <FormInput
                        title="Paste profile JSON"
                        placeholder='{ "name": "...", "application_id": "..." }'
                        value={importJson}
                        onChange={setImportJson}
                    />
                    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                        <TouchableOpacity
                            style={[S.btnPrimary, { marginTop: 4 }]}
                            onPress={handleImport}
                        >
                            <Text style={S.btnText}>Load Profile</Text>
                        </TouchableOpacity>
                    </View>
                </FormSection>
            )}

            {/* ── Basic ── */}
            <FormSection title="Activity">
                <FormInput
                    title="Application Name"
                    placeholder="Discord"
                    value={profile.name ?? ""}
                    onChange={(v: string) => (profile.name = v)}
                />
                <Err msg={errorsForField(errors, "name")} />

                <FormInput
                    title="Application ID"
                    placeholder="1054951789318909972"
                    value={profile.application_id ?? ""}
                    onChange={(v: string) => (profile.application_id = v.replace(/\D/g, ""))}
                    keyboardType="numeric"
                />
                <Err msg={errorsForField(errors, "application_id")} />

                <FormInput
                    title="Details"
                    placeholder="What are you doing?"
                    value={profile.details ?? ""}
                    onChange={(v: string) => (profile.details = v)}
                />
                <Err msg={errorsForField(errors, "details")} />

                <FormInput
                    title="State"
                    placeholder="Sub-detail line"
                    value={profile.state ?? ""}
                    onChange={(v: string) => (profile.state = v)}
                />
                <Err msg={errorsForField(errors, "state")} />
            </FormSection>

            {/* ── Activity Type ── */}
            <FormSection title="Activity Type">
                <View style={S.chipRow}>
                    {ACTIVITY_TYPE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[S.chip, profile.type === opt.value && S.chipActive]}
                            onPress={() => (profile.type = opt.value)}
                        >
                            <Text style={[S.chipText, profile.type === opt.value && S.chipTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </FormSection>

            {/* ── Images ── */}
            <FormSection title="Images">
                <FormInput
                    title="Large Image"
                    placeholder="Asset key or URL"
                    value={profile.assets?.large_image ?? ""}
                    onChange={(v: string) => {
                        profile.assets ??= {};
                        profile.assets.large_image = v;
                    }}
                />
                <FormInput
                    title="Large Hover Text"
                    placeholder="Text shown on hover"
                    value={profile.assets?.large_text ?? ""}
                    onChange={(v: string) => {
                        profile.assets ??= {};
                        profile.assets.large_text = v;
                    }}
                />
                <Err msg={errorsForField(errors, "large_text")} />

                <FormInput
                    title="Small Image"
                    placeholder="Asset key or URL"
                    value={profile.assets?.small_image ?? ""}
                    onChange={(v: string) => {
                        profile.assets ??= {};
                        profile.assets.small_image = v;
                    }}
                />
                <FormInput
                    title="Small Hover Text"
                    placeholder="Text shown on hover"
                    value={profile.assets?.small_text ?? ""}
                    onChange={(v: string) => {
                        profile.assets ??= {};
                        profile.assets.small_text = v;
                    }}
                />
                <Err msg={errorsForField(errors, "small_text")} />
            </FormSection>

            {/* ── Timestamps ── */}
            <FormSection title="Timestamps">
                <FormSwitchRow
                    label="Enable timestamps"
                    value={!!profile.timestamps?._enabled}
                    onValueChange={(v: boolean) => {
                        profile.timestamps ??= { _enabled: false };
                        profile.timestamps._enabled = v;
                    }}
                />
                {!!profile.timestamps?._enabled && (
                    <>
                        <FormInput
                            title="Start (Unix ms)"
                            placeholder="e.g. 1700000000000"
                            value={String(profile.timestamps?.start ?? "")}
                            onChange={(v: string) => {
                                const n = safeNum(v);
                                profile.timestamps!.start = n;
                            }}
                            keyboardType="numeric"
                        />
                        <FormInput
                            title="End (Unix ms, optional)"
                            placeholder="Leave blank for elapsed counter"
                            value={String(profile.timestamps?.end ?? "")}
                            onChange={(v: string) => {
                                const n = safeNum(v);
                                profile.timestamps!.end = n;
                            }}
                            keyboardType="numeric"
                        />
                        <Err msg={errorsForField(errors, "timestamps")} />
                        <FormRow
                            label="Set start to right now"
                            trailing={FormRow.Arrow}
                            onPress={() => {
                                profile.timestamps!.start = Date.now();
                                showToast("⏱ Start timestamp set to now");
                            }}
                        />
                    </>
                )}
            </FormSection>

            {/* ── Buttons ── */}
            <FormSection title="Buttons (max 2)">
                <FormText style={{ paddingHorizontal: 16, paddingBottom: 8, color: "#b5bac1", fontSize: 13 }}>
                    Both label and URL are required for a button to appear. URLs must start with http:// or https://
                </FormText>

                <FormInput
                    title="Button 1 — Label"
                    placeholder="Click here"
                    value={profile.buttons?.[0]?.label ?? ""}
                    onChange={(v: string) => {
                        profile.buttons ??= [{ label: "", url: "" }, { label: "", url: "" }];
                        profile.buttons[0] ??= { label: "", url: "" };
                        profile.buttons[0].label = v;
                    }}
                />
                <FormInput
                    title="Button 1 — URL"
                    placeholder="https://example.com"
                    value={profile.buttons?.[0]?.url ?? ""}
                    onChange={(v: string) => {
                        profile.buttons ??= [{ label: "", url: "" }, { label: "", url: "" }];
                        profile.buttons[0] ??= { label: "", url: "" };
                        profile.buttons[0].url = v;
                    }}
                />
                <Err msg={errorsForField(errors, "button1_label")} />
                <Err msg={errorsForField(errors, "button1_url")} />

                <FormDivider />

                <FormInput
                    title="Button 2 — Label"
                    placeholder="Another link"
                    value={profile.buttons?.[1]?.label ?? ""}
                    onChange={(v: string) => {
                        profile.buttons ??= [{ label: "", url: "" }, { label: "", url: "" }];
                        profile.buttons[1] ??= { label: "", url: "" };
                        profile.buttons[1].label = v;
                    }}
                />
                <FormInput
                    title="Button 2 — URL"
                    placeholder="https://example.com"
                    value={profile.buttons?.[1]?.url ?? ""}
                    onChange={(v: string) => {
                        profile.buttons ??= [{ label: "", url: "" }, { label: "", url: "" }];
                        profile.buttons[1] ??= { label: "", url: "" };
                        profile.buttons[1].url = v;
                    }}
                />
                <Err msg={errorsForField(errors, "button2_label")} />
                <Err msg={errorsForField(errors, "button2_url")} />
            </FormSection>

            {/* ── Advanced ── */}
            <FormSection title="Advanced">
                <FormRow
                    label={showAdvanced ? "Hide advanced fields" : "Show Party, Secrets, Instance"}
                    trailing={FormRow.Arrow}
                    onPress={() => setShowAdvanced(v => !v)}
                />
            </FormSection>

            {showAdvanced && (
                <>
                    <FormSection title="Party">
                        <FormInput
                            title="Party ID"
                            placeholder="Unique party identifier"
                            value={profile.party?.id ?? ""}
                            onChange={(v: string) => {
                                profile.party ??= {};
                                profile.party.id = v;
                            }}
                        />
                        <FormInput
                            title="Party Size"
                            placeholder="e.g. 2"
                            value={String(profile.party?.size ?? "")}
                            onChange={(v: string) => {
                                profile.party ??= {};
                                profile.party.size = safeNum(v);
                            }}
                            keyboardType="numeric"
                        />
                        <FormInput
                            title="Party Max"
                            placeholder="e.g. 5"
                            value={String(profile.party?.max ?? "")}
                            onChange={(v: string) => {
                                profile.party ??= {};
                                profile.party.max = safeNum(v);
                            }}
                            keyboardType="numeric"
                        />
                        <Err msg={errorsForField(errors, "party")} />
                    </FormSection>

                    <FormSection title="Secrets">
                        <FormText style={{ paddingHorizontal: 16, paddingBottom: 8, color: "#b5bac1", fontSize: 13 }}>
                            Used for join/spectate invite flows. Requires Discord API integration to function.
                        </FormText>
                        <FormInput
                            title="Join Secret"
                            placeholder="secret_join_token"
                            value={profile.secrets?.join ?? ""}
                            onChange={(v: string) => {
                                profile.secrets ??= {};
                                profile.secrets.join = v;
                            }}
                        />
                        <FormInput
                            title="Spectate Secret"
                            placeholder="secret_spectate_token"
                            value={profile.secrets?.spectate ?? ""}
                            onChange={(v: string) => {
                                profile.secrets ??= {};
                                profile.secrets.spectate = v;
                            }}
                        />
                        <FormInput
                            title="Match Secret"
                            placeholder="secret_match_token"
                            value={profile.secrets?.match ?? ""}
                            onChange={(v: string) => {
                                profile.secrets ??= {};
                                profile.secrets.match = v;
                            }}
                        />
                    </FormSection>

                    <FormSection title="Misc">
                        <FormInput
                            title="Flags"
                            placeholder="0"
                            value={String(profile.flags ?? 0)}
                            onChange={(v: string) => {
                                profile.flags = safeNum(v) ?? 0;
                            }}
                            keyboardType="numeric"
                            helpText="Activity flags bitmask (0 = default)"
                        />
                        <FormSwitchRow
                            label="Instance"
                            subLabel="Mark this as an instanced game session"
                            value={!!profile.instance}
                            onValueChange={(v: boolean) => (profile.instance = v)}
                        />
                    </FormSection>
                </>
            )}

            {/* ── Debug / Options ── */}
            <FormSection title="Options">
                <FormSwitchRow
                    label="Debug Mode"
                    subLabel="Logs the full gateway payload and button data to the console"
                    value={!!store.debugMode}
                    onValueChange={(v: boolean) => (store.debugMode = v)}
                />
            </FormSection>

            {/* Bottom padding */}
            <View style={S.sectionPad} />
        </ScrollView>
    );
}
