import { MessageSquare, Search } from 'lucide-react';
import * as React from 'react';

export interface ContactDetails {
    id: string;
    name: string;
    full_name?: string;
    phone_number?: string;
    phone?: string;
    email?: string | null;
    company_name?: string | null;
    industry?: string | null;
    lead_stage?: string | null;
    internal_notes?: string | null;
    notes?: string | null;
    updated_at?: string | null;
}

export interface ThreadItem {
    id: string;
    channel_type: 'whatsapp' | 'instagram' | 'messenger';
    status: 'open' | 'unassigned' | 'resolved' | 'human_takeover';
    bot_active: boolean;
    last_message_at: string | null;
    last_message_preview: string;
    unread_count?: number;
    session_remaining: number;
    is_session_open: boolean;
    session_formatted: string;
    session_countdown?: string;
    contact?: ContactDetails | null;
}

interface ConversationListProps {
    threads: ThreadItem[];
    selectedThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    openCount?: number;
}

export function ConversationList({
    threads,
    selectedThreadId,
    onSelectThread,
    openCount = 0,
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [channelFilter, setChannelFilter] = React.useState<
        'all' | 'whatsapp' | 'instagram' | 'messenger'
    >('all');
    const [statusTab, setStatusTab] = React.useState<
        'open' | 'unassigned' | 'resolved'
    >('open');

    const filteredThreads = React.useMemo(() => {
        return threads.filter((thread) => {
            // Channel filter
            if (
                channelFilter !== 'all' &&
                thread.channel_type !== channelFilter
            ) {
                return false;
            }

            // Status filter
            if (statusTab === 'resolved' && thread.status !== 'resolved') {
                return false;
            }

            if (statusTab === 'unassigned' && thread.status !== 'unassigned') {
                return false;
            }

            if (statusTab === 'open' && thread.status === 'resolved') {
                return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const contactName = (
                    thread.contact?.name ||
                    thread.contact?.full_name ||
                    ''
                ).toLowerCase();
                const phone = (
                    thread.contact?.phone_number ||
                    thread.contact?.phone ||
                    ''
                ).toLowerCase();
                const preview = (
                    thread.last_message_preview || ''
                ).toLowerCase();

                return (
                    contactName.includes(query) ||
                    phone.includes(query) ||
                    preview.includes(query)
                );
            }

            return true;
        });
    }, [threads, channelFilter, statusTab, searchQuery]);

    const getInitials = (name?: string) => {
        if (!name) {
            return 'CU';
        }

        const parts = name.trim().split(/\s+/);

        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }

        return name.slice(0, 2).toUpperCase();
    };

    const formatDisplayTime = (isoString?: string | null) => {
        if (!isoString) {
            return '';
        }

        const d = new Date(isoString);

        if (isNaN(d.getTime())) {
            return '';
        }

        const now = new Date();
        const diffDays = Math.floor(
            (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 0) {
            return d.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
            });
        }

        if (diffDays === 1) {
            return 'Yesterday';
        }

        return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
    };

    const getChannelBadgeColor = (channelType: string) => {
        switch (channelType) {
            case 'whatsapp':
                return {
                    dot: 'bg-[#16A34A]',
                    pill: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30',
                    label: 'WhatsApp',
                };
            case 'messenger':
                return {
                    dot: 'bg-[#2563EB]',
                    pill: 'border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30',
                    label: 'Messenger',
                };
            case 'instagram':
                return {
                    dot: 'bg-[#C026D3]',
                    pill: 'border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/30',
                    label: 'Instagram',
                };
            default:
                return {
                    dot: 'bg-emerald-600',
                    pill: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30',
                    label: 'WhatsApp',
                };
        }
    };

    return (
        <aside className="flex h-full w-[300px] max-w-[310px] min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-[#E2E8F0] bg-[#FFFFFF] select-none dark:border-[#1E293B] dark:bg-[#131B2E]">
            {/* Header & Count */}
            <div className="flex items-center justify-between p-3.5 pb-2.5">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight text-foreground">
                        Inbox
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {openCount} Open
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 pb-2.5">
                <div className="relative">
                    <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
                    <input
                        type="text"
                        placeholder="Search messages, contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50/60 py-1.5 pr-2.5 pl-8 text-xs text-foreground transition-all placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-[#1E293B] dark:bg-[#0B0F17]/50"
                    />
                </div>
            </div>

            {/* Channel Filter Pills */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5">
                {(
                    [
                        { id: 'all', label: 'All' },
                        { id: 'whatsapp', label: 'WhatsApp' },
                        { id: 'instagram', label: 'Instagram' },
                        { id: 'messenger', label: 'Messenger' },
                    ] as const
                ).map((c) => {
                    const isActive = channelFilter === c.id;

                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setChannelFilter(c.id)}
                            className={`shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            {c.label}
                        </button>
                    );
                })}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-4 overflow-x-hidden border-b border-[#E2E8F0] px-3 dark:border-[#1E293B]">
                {(
                    [
                        { id: 'open', label: 'Open' },
                        { id: 'unassigned', label: 'Unassigned' },
                        { id: 'resolved', label: 'Resolved' },
                    ] as const
                ).map((tab) => {
                    const isActive = statusTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusTab(tab.id)}
                            className={`relative cursor-pointer pb-2 text-xs font-medium transition-all ${
                                isActive
                                    ? 'border-b-2 border-emerald-500 font-semibold text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Thread List Items */}
            <div className="flex-1 divide-y divide-[#E2E8F0]/50 overflow-y-auto dark:divide-[#1E293B]/50">
                {filteredThreads.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center p-8 text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                            <MessageSquare className="h-5 w-5 stroke-[1.5]" />
                        </div>
                        <p className="text-xs font-medium text-foreground">
                            No conversations
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {searchQuery ||
                            channelFilter !== 'all' ||
                            statusTab !== 'open'
                                ? 'Try clearing filters'
                                : 'Waiting for inbound messages'}
                        </p>
                    </div>
                ) : (
                    filteredThreads.map((thread) => {
                        const isSelected = thread.id === selectedThreadId;
                        const contactName =
                            thread.contact?.name ||
                            thread.contact?.full_name ||
                            'Customer';
                        const initials = getInitials(contactName);
                        const displayTime = formatDisplayTime(
                            thread.last_message_at,
                        );
                        const channelMeta = getChannelBadgeColor(
                            thread.channel_type,
                        );

                        return (
                            <div
                                key={thread.id}
                                onClick={() => onSelectThread(thread.id)}
                                className={`cursor-pointer border-l-3 p-3.5 transition-all ${
                                    isSelected
                                        ? 'border-y border-y-[#99F6E4]/70 border-l-[#16A34A] bg-[#F0FDFA] dark:border-y-teal-800/50 dark:bg-teal-950/30'
                                        : 'border-l-transparent bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar circle with channel dot */}
                                    <div className="relative mt-0.5 shrink-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/80 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                            {initials}
                                        </div>
                                        <span
                                            className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white dark:border-[#131B2E] ${channelMeta.dot}`}
                                        />
                                    </div>

                                    {/* Thread details */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <h3 className="truncate text-xs font-semibold text-foreground">
                                                {contactName}
                                            </h3>
                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                                {displayTime}
                                            </span>
                                        </div>

                                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                            {thread.last_message_preview}
                                        </p>

                                        {/* Micro-pills row */}
                                        <div className="mt-2 flex min-w-0 items-center gap-1.5">
                                            {/* Channel outline pill */}
                                            <span
                                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelMeta.pill}`}
                                            >
                                                {channelMeta.label}
                                            </span>

                                            {/* Session timer pill */}
                                            <span
                                                className="max-w-[110px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                title={thread.session_formatted}
                                            >
                                                {thread.session_formatted}
                                            </span>

                                            {/* Human Escalation Badge */}
                                            {(!thread.bot_active ||
                                                thread.status ===
                                                    'human_takeover') && (
                                                <span
                                                    className="flex shrink-0 items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400"
                                                    title="Human Escalation Active: Bot auto-replies paused"
                                                >
                                                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
                                                    Human Escalation
                                                </span>
                                            )}

                                            {/* Unread count badge */}
                                            {Boolean(
                                                thread.unread_count &&
                                                thread.unread_count > 0,
                                            ) && (
                                                <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                                                    {thread.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}
