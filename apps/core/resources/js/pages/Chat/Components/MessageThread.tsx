import { Bot, PanelRight } from 'lucide-react';
import * as React from 'react';
import type { ContactDetails, ThreadItem } from './ConversationList';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';

export interface ThreadMessage {
    id: string;
    thread_id?: string;
    direction: 'inbound' | 'outbound';
    message_type?: string;
    content: string;
    media_url?: string | null;
    media_mime_type?: string | null;
    whisper_transcript?: string | null;
    status?: string;
    is_ai_generated?: boolean;
    ai_model?: string | null;
    detected_intent?: string | null;
    latency_ms?: number | null;
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
    created_at: string;
    formatted_time?: string;
    date_group?: string;
}

interface MessageThreadProps {
    thread: ThreadItem | null;
    contact: ContactDetails | null;
    messages: ThreadMessage[];
    onSendMessage: (
        content: string,
        isInternalNote: boolean,
    ) => Promise<boolean>;
    loading?: boolean;
    showCustomerDetails?: boolean;
    onToggleCustomerDetails?: () => void;
    onToggleBot?: () => void;
    templates?: any[];
    onSendTemplate?: (
        templateId: string,
        templateName: string,
        variables?: Record<string, string>,
    ) => Promise<boolean>;
}

export function MessageThread({
    thread,
    contact,
    messages,
    onSendMessage,
    loading = false,
    showCustomerDetails = true,
    onToggleCustomerDetails,
    onToggleBot,
    templates = [],
    onSendTemplate,
}: MessageThreadProps) {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [secondsRemaining, setSecondsRemaining] = React.useState<number>(
        thread?.session_remaining ?? 0,
    );

    // Synchronize seconds remaining when thread changes
    React.useEffect(() => {
        if (thread) {
            setSecondsRemaining(thread.session_remaining ?? 0);
        }
    }, [thread?.id, thread?.session_remaining]);

    // Live countdown timer ticking every second
    React.useEffect(() => {
        if (secondsRemaining <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsRemaining]);

    const formatCountdown = (totalSeconds: number) => {
        if (totalSeconds <= 0) {
            return '00:00:00';
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Auto-scroll to bottom on message updates
    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop =
                scrollContainerRef.current.scrollHeight;
        }
    }, [messages, loading]);

    if (!thread) {
        return (
            <section className="flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-[#FAFCFD] p-8 text-center select-none dark:bg-[#0B0F17]">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/60 bg-emerald-50 text-emerald-600 shadow-xs dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Bot className="h-7 w-7 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                    Omnichannel Autonomous Inbox
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    Select a conversation on the left to start messaging, or
                    wait for incoming WhatsApp, Instagram, or Messenger
                    messages.
                </p>
            </section>
        );
    }

    const customerName = contact?.name || contact?.full_name || 'Customer';
    const initials = customerName
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    const phone = contact?.phone_number || contact?.phone || '';
    const company = contact?.company_name || '';
    const subtitle = [phone, company].filter(Boolean).join(' • ');

    const isSessionActive = secondsRemaining > 0;
    const sessionTimerText = isSessionActive
        ? `SESSION ACTIVE • ${formatCountdown(secondsRemaining)}`
        : 'SESSION EXPIRED';

    const getChannelPill = (channelType: string) => {
        switch (channelType) {
            case 'whatsapp':
                return {
                    pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                    dot: 'bg-[#16A34A]',
                    label: 'WhatsApp',
                };
            case 'messenger':
                return {
                    pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                    dot: 'bg-[#2563EB]',
                    label: 'Messenger',
                };
            case 'instagram':
                return {
                    pill: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800',
                    dot: 'bg-[#C026D3]',
                    label: 'Instagram',
                };
            default:
                return {
                    pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                    dot: 'bg-[#16A34A]',
                    label: 'WhatsApp',
                };
        }
    };

    const channelMeta = getChannelPill(thread.channel_type);

    return (
        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#131B2E]">
            {/* Top Conversation Header Bar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 lg:px-6 dark:border-[#1E293B] dark:bg-[#131B2E]">
                {/* Left: Contact Info */}
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-sm font-bold text-foreground">
                                {customerName}
                            </h2>
                            <span
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelMeta.pill}`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${channelMeta.dot}`}
                                />
                                {channelMeta.label}
                            </span>
                        </div>
                        {subtitle && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Clean Session Window Indicator & Panel Toggle */}
                <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        {isSessionActive && (
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                        )}
                        <span className="hidden sm:inline">
                            {sessionTimerText}
                        </span>
                        <span className="sm:hidden">
                            {formatCountdown(secondsRemaining)}
                        </span>
                    </div>

                    {onToggleCustomerDetails && (
                        <button
                            type="button"
                            onClick={onToggleCustomerDetails}
                            className={`cursor-pointer rounded-lg border p-1.5 transition-all ${
                                showCustomerDetails
                                    ? 'border-slate-300 bg-slate-100 text-foreground dark:border-slate-700 dark:bg-slate-800'
                                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800'
                            }`}
                            title={
                                showCustomerDetails
                                    ? 'Hide Customer Details'
                                    : 'Show Customer Details'
                            }
                        >
                            <PanelRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Human Escalation Alert Banner */}
            {(!thread.bot_active || thread.status === 'human_takeover') && (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                        </span>
                        <span className="shrink-0 font-bold text-rose-900 dark:text-rose-200">
                            Human Escalation:
                        </span>
                        <span className="truncate text-rose-700 dark:text-rose-300/90">
                            Customer sentiment or request triggered agent
                            takeover. Bot auto-replies are paused.
                        </span>
                    </div>
                    {onToggleBot && (
                        <button
                            type="button"
                            onClick={onToggleBot}
                            className="shrink-0 cursor-pointer rounded-md border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-800 shadow-xs transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-200 dark:hover:bg-rose-800/80"
                        >
                            Resume AI Bot
                        </button>
                    )}
                </div>
            )}

            {/* Message Stream */}
            <div
                ref={scrollContainerRef}
                className="flex-1 space-y-4 overflow-y-auto bg-[#F4F7F9]/30 p-6 dark:bg-[#0B0F17]/30"
            >
                {/* Centered Date Divider */}
                <div className="my-2 flex justify-center">
                    <span className="rounded-full bg-slate-200/80 px-3 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400">
                        {messages.length > 0 &&
                        messages[messages.length - 1].created_at
                            ? new Date(
                                  messages[messages.length - 1].created_at,
                              ).toDateString() === new Date().toDateString()
                                ? 'Today'
                                : new Date(
                                      messages[messages.length - 1].created_at,
                                  ).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                  })
                            : 'Today'}
                    </span>
                </div>

                {loading ? (
                    <div className="animate-pulse py-8 text-center text-xs text-muted-foreground">
                        Loading message history...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                        No messages yet in this conversation.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))
                )}
            </div>

            {/* Bottom Message Composer */}
            <MessageComposer
                customerName={customerName}
                onSendMessage={onSendMessage}
                disabled={loading}
                isWindowExpired={Boolean(
                    thread &&
                    (!thread.is_session_open || secondsRemaining <= 0),
                )}
                templates={templates}
                onSendTemplate={onSendTemplate}
            />
        </section>
    );
}
