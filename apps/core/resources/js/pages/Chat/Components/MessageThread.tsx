import * as React from 'react';
import { Bot, CheckCheck, PanelRight } from 'lucide-react';
import type { ContactDetails, ThreadItem } from './ConversationList';
import { MessageComposer } from './MessageComposer';

export interface ThreadMessage {
    id: string;
    thread_id?: string;
    direction: 'inbound' | 'outbound';
    message_type?: string;
    content: string;
    status?: string;
    is_ai_generated?: boolean;
    created_at: string;
    formatted_time?: string;
    date_group?: string;
}

interface MessageThreadProps {
    thread: ThreadItem | null;
    contact: ContactDetails | null;
    messages: ThreadMessage[];
    onSendMessage: (content: string, isInternalNote: boolean) => Promise<boolean>;
    loading?: boolean;
    showCustomerDetails?: boolean;
    onToggleCustomerDetails?: () => void;
}

export function MessageThread({
    thread,
    contact,
    messages,
    onSendMessage,
    loading = false,
    showCustomerDetails = true,
    onToggleCustomerDetails,
}: MessageThreadProps) {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [secondsRemaining, setSecondsRemaining] = React.useState<number>(
        thread?.session_remaining ?? 0
    );

    // Synchronize seconds remaining when thread changes
    React.useEffect(() => {
        if (thread) {
            setSecondsRemaining(thread.session_remaining ?? 0);
        }
    }, [thread?.id, thread?.session_remaining]);

    // Live countdown timer ticking every second
    React.useEffect(() => {
        if (secondsRemaining <= 0) return;
        const timer = setInterval(() => {
            setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsRemaining]);

    const formatCountdown = (totalSeconds: number) => {
        if (totalSeconds <= 0) return '00:00:00';
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Auto-scroll to bottom on message updates
    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages, loading]);

    if (!thread) {
        return (
            <section className="flex-1 min-w-0 flex flex-col items-center justify-center h-full bg-[#FAFCFD] dark:bg-[#0B0F17] p-8 text-center select-none">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
                    <Bot className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                    Omnichannel Autonomous Inbox
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                    Select a conversation on the left to start messaging, or wait for incoming WhatsApp, Instagram, or Messenger messages.
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
        <section className="flex-1 min-w-0 flex flex-col h-full bg-[#FFFFFF] dark:bg-[#131B2E] overflow-hidden">
            {/* Top Conversation Header Bar */}
            <div className="px-4 lg:px-6 py-3 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#131B2E] shrink-0 gap-3">
                {/* Left: Contact Info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-foreground truncate">
                                {customerName}
                            </h2>
                            <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${channelMeta.pill}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${channelMeta.dot}`} />
                                {channelMeta.label}
                            </span>
                        </div>
                        {subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Clean Session Window Indicator & Panel Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 tracking-wider">
                        {isSessionActive && (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        )}
                        <span className="hidden sm:inline">{sessionTimerText}</span>
                        <span className="sm:hidden">{formatCountdown(secondsRemaining)}</span>
                    </div>

                    {onToggleCustomerDetails && (
                        <button
                            type="button"
                            onClick={onToggleCustomerDetails}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                showCustomerDetails
                                    ? 'bg-slate-100 dark:bg-slate-800 text-foreground border-slate-300 dark:border-slate-700'
                                    : 'bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={showCustomerDetails ? 'Hide Customer Details' : 'Show Customer Details'}
                        >
                            <PanelRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Message Stream */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F4F7F9]/30 dark:bg-[#0B0F17]/30"
            >
                {/* Centered Date Divider */}
                <div className="flex justify-center my-2">
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {messages.length > 0 && messages[messages.length - 1].created_at
                            ? new Date(messages[messages.length - 1].created_at).toDateString() === new Date().toDateString()
                                ? 'Today'
                                : new Date(messages[messages.length - 1].created_at).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                  })
                            : 'Today'}
                    </span>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                        Loading message history...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                        No messages yet in this conversation.
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isInbound = msg.direction === 'inbound';
                        const timeString =
                            msg.formatted_time ||
                            (msg.created_at
                                ? new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                  })
                                : '');

                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${
                                    isInbound ? 'items-start' : 'items-end'
                                }`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl p-4 shadow-xs text-xs leading-relaxed whitespace-pre-line border transition-all ${
                                        isInbound
                                            ? 'rounded-tl-sm bg-[#FFFFFF] dark:bg-[#131B2E] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]'
                                            : 'rounded-tr-sm bg-[#F0FDFA] dark:bg-teal-950/40 border-[#99F6E4] dark:border-teal-800/80 text-[#0F172A] dark:text-[#F8FAFC]'
                                    }`}
                                >
                                    <p className="break-words">{msg.content}</p>

                                    {/* Timestamp & Status checkmarks (no AI debug boxes) */}
                                    <div
                                        className={`flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground ${
                                            isInbound ? 'justify-end' : 'justify-end'
                                        }`}
                                    >
                                        <span>{timeString}</span>
                                        {!isInbound && (
                                            <CheckCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Message Composer */}
            <MessageComposer
                customerName={customerName}
                onSendMessage={onSendMessage}
                disabled={loading}
            />
        </section>
    );
}
