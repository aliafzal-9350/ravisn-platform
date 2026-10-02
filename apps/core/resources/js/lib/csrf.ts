/**
 * CSRF helpers for the JSON `fetch` calls that talk to the session-authenticated
 * /api/v1 routes (Inertia's own router attaches its token automatically; raw
 * `fetch` does not).
 */
export function csrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
}

export function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
        ...extra,
    };
}
