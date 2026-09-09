/**
 * Real-Time WebSocket & Laravel Echo Helper for RAVISN CRM
 */

export interface RealtimeMessage {
    id: string;
    thread_id: string;
    contact_id?: string;
    direction: 'inbound' | 'outbound';
    channel_type?: string;
    content: string;
    is_ai_generated?: boolean;
    ai_model?: string;
    detected_intent?: string;
    latency_ms?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    status?: string;
    created_at: string;
}

export interface RealtimeThreadUpdate {
    id: string;
    contact_id?: string;
    channel_type?: string;
    status?: string;
    bot_active: boolean;
    last_message_at?: string;
}

export function subscribeToThreadUpdates(
    threadId: string,
    onMessageCreated: (msg: RealtimeMessage) => void,
    onThreadUpdated: (thread: RealtimeThreadUpdate) => void
) {
    if (typeof window === 'undefined') return () => {};

    // Check if Laravel Echo is available on window
    const echo = (window as any).Echo;
    if (echo) {
        const channel = echo.private(`chat.thread.${threadId}`);
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

        return () => {
            echo.leave(`chat.thread.${threadId}`);
        };
    }

    return () => {};
}
