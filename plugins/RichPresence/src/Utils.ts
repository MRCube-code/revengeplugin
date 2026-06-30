export function formatElapsed(startMs: number): string {
    const s = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${pad(m)}:${pad(sec)} elapsed`;
    return `${m}:${pad(sec)} elapsed`;
}

export function formatRemaining(endMs: number): string {
    const s = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${pad(m)}:${pad(sec)} left`;
    return `${m}:${pad(sec)} left`;
}

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

export function safeNum(v: string): number | undefined {
    const n = Number(v.replace(/[^\d]/g, ""));
    return isNaN(n) || n === 0 ? undefined : n;
}

export function generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
