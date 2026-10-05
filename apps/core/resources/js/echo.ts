/**
 * Real-Time WebSocket & Laravel Echo Helper for RAVISN CRM
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

/**
 * Instantiate the Laravel Echo client against the Reverb broadcaster and
 * assign it to `window.Echo`, so the helpers below (which all read
 * `(window as any).Echo`) start receiving real events instead of silently
 * no-op'ing. Safe to call once at app bootstrap; guarded for SSR.
 */
export function initializeEcho(): void {
    if (typeof window === 'undefined' || window.Echo) {
        return;
    }

    const csrfToken =
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content || '';

    window.Pusher = Pusher;
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': csrfToken,
            },
        },
    });
}

export interface RealtimeMessage {
    id: string;
    thread_id: string;
    contact_id?: string;
    direction: 'inbound' | 'outbound';
    channel_type?: string;
    message_type?: string;
    content: string;
    media_url?: string | null;
    media_mime_type?: string | null;
    whisper_transcript?: string | null;
    is_ai_generated?: boolean;
    ai_model?: string;
    detected_intent?: string;
    latency_ms?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    confidence_score?: number | null;
    telemetry?: Record<string, any> | null;
    rag_chunk?: {
        id?: string;
        title?: string;
        snippet?: string;
        content?: string;
        score?: number;
        source?: string;
    } | null;
    status?: string;
    created_at: string;
    tenant_id?: string;
}

export interface RealtimeThreadUpdate {
    id: string;
    contact_id?: string;
    channel_type?: string;
    status?: string;
    bot_active: boolean;
    last_message_at?: string;
}

export interface RealtimeStatusUpdate {
    message_id: string;
    thread_id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed' | string;
    tenant_id?: string;
}

/**
 * Elegant dual-tone harmonic notification chime using Web Audio API.
 * Synthesized purely in browser — zero external asset dependencies, zero network requests.
 */
export function playNotificationChime(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const AudioCtx =
            window.AudioContext || (window as any).webkitAudioContext;

        if (!AudioCtx) {
            return;
        }

        const ctx = new AudioCtx();

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Harmonious bell frequencies (F#6 + C#7)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(739.99, now);
        osc1.frequency.exponentialRampToValueAtTime(1479.98, now + 0.15);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, now + 0.08);

        // Soft bell envelope with smooth decay
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.65);
        osc2.stop(now + 0.65);

        setTimeout(() => {
            try {
                ctx.close();
            } catch {}
        }, 800);
    } catch (e) {
        console.warn('Notification chime audio context error:', e);
    }
}

/**
 * Request notification permissions from user on first user interaction.
 */
export function requestNotificationPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }
}

/**
 * Trigger native HTML5 desktop push notification when tab is unfocused.
 */
export function triggerDesktopNotification(
    title: string,
    body: string,
    onClick?: () => void,
): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission !== 'granted') {
        return;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            silent: true, // We play our custom Web Audio chime
        });

        notification.onclick = () => {
            window.focus();
            notification.close();

            if (onClick) {
                onClick();
            }
        };

        // Auto close after 5 seconds
        setTimeout(() => {
            try {
                notification.close();
            } catch {}
        }, 5000);
    } catch (e) {
        console.warn('Failed to display HTML5 notification:', e);
    }
}

export interface RealtimeMediaReady {
    message_id: string;
    media_url: string;
    media_mime_type: string | null;
}

/**
 * Subscribe to specific thread updates (active conversation stream).
 */
export function subscribeToThreadUpdates(
    threadId: string,
    onMessageCreated: (msg: RealtimeMessage) => void,
    onThreadUpdated: (thread: RealtimeThreadUpdate) => void,
    onStatusUpdated?: (status: RealtimeStatusUpdate) => void,
    onMediaReady?: (media: RealtimeMediaReady) => void,
) {
    if (typeof window === 'undefined' || !threadId) {
        return () => {};
    }

    const echo = (window as any).Echo;

    if (echo) {
        const channel = echo.private(`chat.thread.${threadId}`);
        // A customer's image / voice note / document finished copying to storage.
        channel.listen('.MessageMediaReady', (data: any) => {
            if (onMediaReady && data?.message_id) {
                onMediaReady({
                    message_id: data.message_id,
                    media_url: data.media_url,
                    media_mime_type: data.media_mime_type ?? null,
                });
            }
        });
        channel.listen('.MessageCreated', (data: any) => {
            if (data.message) {
                onMessageCreated(data.message);
            }
        });
        channel.listen('.ThreadUpdated', (data: any) => {
            if (data.thread) {
                onThreadUpdated(data.thread);
            }
        });
        channel.listen('.MessageStatusUpdated', (data: any) => {
            if (onStatusUpdated && data) {
                onStatusUpdated({
                    message_id: data.message_id,
                    thread_id: data.thread_id,
                    status: data.status,
                    tenant_id: data.tenant_id,
                });
            }
        });

        return () => {
            echo.leave(`chat.thread.${threadId}`);
        };
    }

    return () => {};
}

/**
 * Subscribe to tenant-wide inbox channel (private-tenant.{id}.inbox).
 * Updates all threads, badges, and alerts when new inbound messages arrive.
 */
export function subscribeToTenantInbox(
    tenantId: string,
    onMessageCreated: (msg: RealtimeMessage) => void,
    onThreadUpdated?: (thread: RealtimeThreadUpdate) => void,
    onStatusUpdated?: (status: RealtimeStatusUpdate) => void,
) {
    if (typeof window === 'undefined' || !tenantId) {
        return () => {};
    }

    const echo = (window as any).Echo;

    if (echo) {
        const channel = echo.private(`tenant.${tenantId}.inbox`);
        channel.listen('.MessageCreated', (data: any) => {
            if (data.message) {
                onMessageCreated(data.message);
            }
        });
        channel.listen('.ThreadUpdated', (data: any) => {
            if (onThreadUpdated && data.thread) {
                onThreadUpdated(data.thread);
            }
        });
        channel.listen('.MessageStatusUpdated', (data: any) => {
            if (onStatusUpdated && data) {
                onStatusUpdated({
                    message_id: data.message_id,
                    thread_id: data.thread_id,
                    status: data.status,
                    tenant_id: data.tenant_id,
                });
            }
        });

        return () => {
            echo.leave(`tenant.${tenantId}.inbox`);
        };
    }

    return () => {};
}
