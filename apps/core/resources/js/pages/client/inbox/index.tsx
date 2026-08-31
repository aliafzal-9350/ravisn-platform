import { Head, router } from '@inertiajs/react';
import {
    MessageSquare,
    Send,
    Smartphone,
    Search,
    Check,
    CheckCheck,
    Clock,
    ShieldAlert,
    Phone,
    Calendar,
    Info,
    X,
    BarChart3,
    Database,
    Bot,
    UserCheck,
    Play,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Account {
    id: string | number;
    phone_number: string;
    display_name: string | null;
}

interface Chat {
    id: string | number;
    customer_phone: string;
    customer_name: string | null;
    last_message_at: string | null;
    session_remaining?: number | null;
    is_session_open?: boolean;
    is_ai_active?: boolean;
}

interface Message {
    id: string | number;
    direction: 'inbound' | 'outbound';
    message_type: string;
    body: string;
    status: string;
    sent_at: string | null;
    created_at: string;
}

interface MessageTemplate {
    id: string | number;
    name: string;
    language: string;
    category: string;
    components: any[];
}

interface InboxProps {
    accounts: Account[];
    chats: Chat[];
    selectedAccountId: string | number | null;
    templates: MessageTemplate[];
    activeStrategy?: 'lead_qualifier' | 'faq_responder' | 'pure_manual';
}

// Live relative time formatter
function formatRelativeTime(dateStr: string | null) {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        return dateStr;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) {
        return 'Just now';
    }

    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) {
        return `${diffSecs}s ago`;
    }

    const diffMins = Math.floor(diffSecs / 60);

    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }

    const diffHours = Math.floor(diffMins / 60);

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays}d ago`;
}

function LiveTime({ date }: { date: string | null }) {
    const [timeStr, setTimeStr] = React.useState('');

    React.useEffect(() => {
        const update = () => setTimeStr(formatRelativeTime(date));
        update();
        const interval = setInterval(update, 10000); // update every 10 seconds

        return () => clearInterval(interval);
    }, [date]);

    return <>{timeStr}</>;
}

function formatSessionTime(seconds: number | null | undefined) {
    if (seconds === null || seconds === undefined) {
        return 'No active session';
    }

    if (seconds <= 0) {
        return 'Expired';
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    return `${hours}h ${mins}m left`;
}

function getTemplateVariables(template: any): string[] {
    if (!template) {
        return [];
    }

    let components = template.components;

    if (typeof components === 'string') {
        try {
            components = JSON.parse(components);
        } catch {
            return [];
        }
    }

    if (!components) {
        return [];
    }

    // Convert components to an array if it's an object (e.g. serialized PHP associative array)
    if (!Array.isArray(components)) {
        if (typeof components === 'object') {
            components = Object.values(components);
        } else {
            return [];
        }
    }

    const bodyComp = components.find(
        (c: any) =>
            c &&
            c.type &&
            typeof c.type === 'string' &&
            c.type.toUpperCase() === 'BODY',
    );

    if (!bodyComp || !bodyComp.text || typeof bodyComp.text !== 'string') {
        return [];
    }

    // Match any variable format like {{variable_name}} or {{1}}
    const matches = bodyComp.text.match(/\{\{\s*([^}]+)\s*\}\}/g);

    if (!matches) {
        return [];
    }

    // Clean brackets and return variable names
    return matches.map((m: string) =>
        m
            .replace(/\{\{\s*/, '')
            .replace(/\s*\}\}/, '')
            .trim(),
    );
}

export default function InboxIndex({
    accounts,
    chats,
    selectedAccountId,
    templates = [],
    activeStrategy = 'lead_qualifier',
}: InboxProps) {
    const [selectedChat, setSelectedChat] = React.useState<Chat | null>(null);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [newMessage, setNewMessage] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [chatFilter, setChatFilter] = React.useState<
        'all' | 'named' | 'active'
    >('all');
    const [sending, setSending] = React.useState(false);
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const [showDetailPanel, setShowDetailPanel] = React.useState(true);

    const [mode, setMode] = React.useState<'text' | 'template'>('text');
    const [selectedTemplateId, setSelectedTemplateId] = React.useState<
        string | number | ''
    >('');
    const [templateVars, setTemplateVars] = React.useState<string[]>([]);

    /* eslint-disable react-hooks/purity */
    const oneDayAgo = React.useMemo(
        () => new Date(Date.now() - 24 * 60 * 60 * 1000),
        [],
    );
    /* eslint-enable react-hooks/purity */

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        setMode(chat.is_session_open ? 'text' : 'template');
        setSelectedTemplateId('');
        setTemplateVars([]);
        setLoadingMessages(true);
    };

    const handleAccountChange = (accountId: string | number) => {
        setSelectedChat(null);
        setMessages([]);
        router.visit(`/dashboard/inbox?whatsapp_account_id=${String(accountId)}`, {
            preserveState: true,
            replace: true,
        });
    };

    const fetchMessages = React.useCallback(async (chatId: string | number) => {
        try {
            const res = await fetch(
                `/dashboard/inbox/chats/${String(chatId)}/messages`,
            );

            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        }
    }, []);

    // Load messages when selectedChat changes
    React.useEffect(() => {
        if (!selectedChat) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMessages(selectedChat.id).then(() => setLoadingMessages(false));

        // Poll for new messages every 5 seconds
        const interval = setInterval(() => {
            fetchMessages(selectedChat.id);
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedChat, fetchMessages]);

    const handleResumeAi = async () => {
        if (!selectedChat) {
return;
}

        try {
            const res = await fetch(
                `/dashboard/inbox/chats/${String(selectedChat.id)}/toggle-ai`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as any
                            )?.content || '',
                    },
                    body: JSON.stringify({ is_ai_active: true }),
                },
            );

            if (res.ok) {
                const data = await res.json();
                setSelectedChat((prev) =>
                    prev ? { ...prev, is_ai_active: data.is_ai_active } : null,
                );
                toast.success('AI Assistant resumed for this chat!');
            }
        } catch {
            toast.error('Failed to resume AI assistant.');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedChat || sending) {
            return;
        }

        if (mode === 'text' && !newMessage.trim()) {
            return;
        }

        if (mode === 'template' && !selectedTemplateId) {
            toast.error('Please select a template');

            return;
        }

        setSending(true);

        try {
            const payload =
                mode === 'text'
                    ? { type: 'text', body: newMessage }
                    : {
                          type: 'template',
                          template_id: String(selectedTemplateId),
                          variables: templateVars,
                      };

            const res = await fetch(
                `/dashboard/inbox/chats/${String(selectedChat.id)}/send`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as any
                            )?.content || '',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (res.ok) {
                const msg = await res.json();
                setMessages((prev) => [...prev, msg]);
                setNewMessage('');
                setTemplateVars([]);
                setSelectedTemplateId('');
                setSelectedChat((prev) =>
                    prev ? { ...prev, is_ai_active: false } : null,
                );
                toast.success('Message sent successfully! (AI Paused)');
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Failed to send message.');
            }
        } catch {
            toast.error('An error occurred. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const filteredChats = chats.filter((chat) => {
        const matchesSearch =
            (chat.customer_name || '')
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            chat.customer_phone.includes(searchQuery);

        if (!matchesSearch) {
            return false;
        }

        if (chatFilter === 'named') {
            return !!chat.customer_name;
        }

        if (chatFilter === 'active') {
            if (!chat.last_message_at) {
                return false;
            }

            const date = new Date(chat.last_message_at);

            if (isNaN(date.getTime())) {
                return true;
            }

            return date >= oneDayAgo;
        }

        return true;
    });

    const chatEndRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const renderMessageStatus = (status: string) => {
        const lower = status.toLowerCase();

        if (lower === 'read') {
            return (
                <CheckCheck className="h-3.5 w-3.5 font-bold text-sky-400" />
            );
        } else if (lower === 'delivered') {
            return <CheckCheck className="h-3.5 w-3.5 text-zinc-300" />;
        } else if (lower === 'sent') {
            return <Check className="h-3.5 w-3.5 text-zinc-300" />;
        } else if (lower === 'failed') {
            return <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />;
        }

        return <Clock className="h-3 w-3 text-zinc-400" />;
    };

    return (
        <>
            <Head title="WhatsApp Inbox" />
            <div className="flex h-[calc(100vh-6.5rem)] w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                {/* 1. Left Pane: Accounts & Conversations List */}
                <div className="flex w-80 shrink-0 flex-col border-r bg-slate-50/40 dark:bg-zinc-950/20">
                    {/* Account Switcher Header */}
                    <div className="flex flex-col gap-2 border-b p-4">
                        <label className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                            <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3 text-primary" />
                                <span>WhatsApp Sender</span>
                            </span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                                {chats.length} chats
                            </span>
                        </label>
                        <select
                            value={selectedAccountId}
                            onChange={(e) =>
                                handleAccountChange(Number(e.target.value))
                            }
                            className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.display_name || acc.phone_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Field */}
                    <div className="relative border-b p-3">
                        <Search className="absolute top-5.5 left-6 h-3.5 w-3.5 text-muted-foreground/70" />
                        <Input
                            placeholder="Search client conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 border-border/80 bg-background pl-9 text-xs focus:border-primary"
                        />
                    </div>

                    {/* Chat Filters */}
                    <div className="flex gap-1.5 border-b bg-slate-50/20 px-3 py-2 select-none dark:bg-zinc-950/5">
                        <button
                            onClick={() => setChatFilter('all')}
                            className={`flex-1 rounded-md px-2 py-1.5 text-center text-[10px] font-bold transition-all ${
                                chatFilter === 'all'
                                    ? 'border border-primary/20 bg-primary/10 text-primary'
                                    : 'border border-transparent text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setChatFilter('named')}
                            className={`flex-1 rounded-md px-2 py-1.5 text-center text-[10px] font-bold transition-all ${
                                chatFilter === 'named'
                                    ? 'border border-primary/20 bg-primary/10 text-primary'
                                    : 'border border-transparent text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                            }`}
                        >
                            Customers
                        </button>
                        <button
                            onClick={() => setChatFilter('active')}
                            className={`flex-1 rounded-md px-2 py-1.5 text-center text-[10px] font-bold transition-all ${
                                chatFilter === 'active'
                                    ? 'border border-primary/20 bg-primary/10 text-primary'
                                    : 'border border-transparent text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                            }`}
                        >
                            Active (24h)
                        </button>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 divide-y divide-border/30 overflow-y-auto">
                        {filteredChats.length > 0 ? (
                            filteredChats.map((chat) => {
                                const isSelected = selectedChat?.id === chat.id;
                                const initials = getInitials(
                                    chat.customer_name || 'Customer',
                                );

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`flex w-full items-start gap-3 border-l-4 p-4 text-left transition-all duration-200 ${
                                            isSelected
                                                ? 'border-l-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-l-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
                                        }`}
                                    >
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                isSelected
                                                    ? 'bg-primary text-white'
                                                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}
                                        >
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-baseline justify-between">
                                                <span className="truncate text-xs font-bold text-foreground">
                                                    {chat.customer_name ||
                                                        chat.customer_phone}
                                                </span>
                                                {chat.last_message_at && (
                                                    <span className="text-[9px] whitespace-nowrap text-muted-foreground">
                                                        <LiveTime
                                                            date={
                                                                chat.last_message_at
                                                            }
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                                                {chat.customer_phone}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="space-y-2 p-12 text-center text-xs text-muted-foreground">
                                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground opacity-30" />
                                <p className="font-semibold">
                                    No discussions found
                                </p>
                                <p className="mx-auto max-w-[200px] text-[10px] leading-relaxed text-muted-foreground/80">
                                    No active incoming messages or linked chats
                                    for this phone number.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Middle Pane: Live Chat Feed */}
                <div className="relative flex flex-1 flex-col border-r border-border/40 bg-background">
                    {selectedChat ? (
                        <>
                            {/* Chat Toolbar Header */}
                            <div className="flex items-center justify-between border-b bg-slate-50/30 p-4 dark:bg-zinc-950/10">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {getInitials(
                                            selectedChat.customer_name ||
                                                'Customer',
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">
                                            {selectedChat.customer_name ||
                                                selectedChat.customer_phone}
                                        </h4>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {selectedChat.customer_phone}
                                            </span>
                                            {selectedChat.is_session_open ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    <span>
                                                        {formatSessionTime(
                                                            selectedChat.session_remaining,
                                                        )}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                    <ShieldAlert className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                                    <span>Session Closed</span>
                                                </span>
                                            )}

                                            {/* STATUS BADGES IN CHAT HEADER */}
                                            {selectedChat.is_ai_active && activeStrategy === 'lead_qualifier' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                                                    <Bot className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                    <span>🤖 AI Active (Lead Qualifier)</span>
                                                </span>
                                            )}

                                            {selectedChat.is_ai_active && activeStrategy === 'faq_responder' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30 shadow-xs">
                                                    <Bot className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                                                    <span>🤖 AI Active (FAQ Only)</span>
                                                </span>
                                            )}

                                            {(!selectedChat.is_ai_active || activeStrategy === 'pure_manual') && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 shadow-xs">
                                                    <UserCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                    <span>👤 Human Control (AI Paused)</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-8 w-8 ${showDetailPanel ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                                        onClick={() =>
                                            setShowDetailPanel(!showDetailPanel)
                                        }
                                        title="Toggle Contact Info"
                                    >
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Live Message History */}
                            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/20 p-6 dark:bg-zinc-950/5">
                                {loadingMessages ? (
                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                        Loading chat transcripts...
                                    </div>
                                ) : messages.length > 0 ? (
                                    messages.map((msg) => {
                                        const isOutbound =
                                            msg.direction === 'outbound';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`relative max-w-[65%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                                                        isOutbound
                                                            ? 'rounded-tr-none bg-primary text-white'
                                                            : 'rounded-tl-none border border-border/20 bg-zinc-100 text-foreground dark:bg-zinc-800'
                                                    }`}
                                                >
                                                    <p className="font-sans whitespace-pre-wrap">
                                                        {msg.body}
                                                    </p>

                                                    {/* Time & Delivery Badge */}
                                                    <div className="mt-1.5 flex items-center justify-end gap-1 text-[8px] opacity-70">
                                                        <span>
                                                            {msg.sent_at
                                                                ? new Date(
                                                                      msg.sent_at,
                                                                  ).toLocaleTimeString(
                                                                      [],
                                                                      {
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      },
                                                                  )
                                                                : new Date(
                                                                      msg.created_at,
                                                                  ).toLocaleTimeString(
                                                                      [],
                                                                      {
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      },
                                                                  )}
                                                        </span>
                                                        {isOutbound &&
                                                            renderMessageStatus(
                                                                msg.status,
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center space-y-2 p-8 text-center text-xs text-muted-foreground">
                                        <MessageSquare className="h-8 w-8 text-primary opacity-30" />
                                        <p className="font-semibold text-foreground">
                                            Empty Chat Log
                                        </p>
                                        <p className="max-w-xs text-[10px] leading-relaxed">
                                            Send a template or text response
                                            below to reply to this customer
                                            within the standard 24-hour Meta
                                            service window.
                                        </p>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Outbound Messaging Form */}
                            <form
                                onSubmit={handleSendMessage}
                                className="flex flex-col gap-2 border-t bg-background p-4"
                            >
                                {/* AUTOMATIC HUMAN OVERRIDE (AUTO-PAUSE) BANNER */}
                                {(!selectedChat.is_ai_active || activeStrategy === 'pure_manual') && (
                                    <div className="mx-1 mb-2 flex items-center justify-between gap-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-3 dark:border-amber-900/60 dark:bg-amber-950/40 shadow-xs">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                            <UserCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <span>AI is currently paused for this chat.</span>
                                        </div>
                                        {activeStrategy !== 'pure_manual' && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleResumeAi}
                                                className="h-7 gap-1.5 border-amber-400 bg-amber-100/60 px-3 text-xs font-bold text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
                                            >
                                                <Play className="h-3 w-3 fill-current text-emerald-600 dark:text-emerald-400" />
                                                <span>Resume AI Assistant</span>
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Warning Alert if session is closed */}
                                {!selectedChat.is_session_open && (
                                    <div className="mx-1 mb-2 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <div className="flex-1 text-left text-[11px] leading-normal text-amber-800 dark:text-amber-300">
                                            <span className="font-bold">
                                                24-Hour Session Closed:
                                            </span>{' '}
                                            You can only reply with an approved
                                            Meta template message. Once the user
                                            replies, the 24-hour free-text
                                            window will reopen.
                                        </div>
                                    </div>
                                )}

                                {/* Mode selector buttons if session is open */}
                                {selectedChat.is_session_open && (
                                    <div className="mb-2 flex gap-2 border-b px-1 pb-2 select-none">
                                        <button
                                            type="button"
                                            onClick={() => setMode('text')}
                                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                                mode === 'text'
                                                    ? 'border border-primary/20 bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                            }`}
                                        >
                                            Text Message
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode('template')}
                                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                                mode === 'template'
                                                    ? 'border border-primary/20 bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                            }`}
                                        >
                                            Official Template
                                        </button>
                                    </div>
                                )}

                                {mode === 'text' ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) =>
                                                setNewMessage(e.target.value)
                                            }
                                            placeholder="Type your reply here..."
                                            className="flex-1 text-xs focus-visible:ring-primary"
                                            disabled={sending}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={
                                                !newMessage.trim() || sending
                                            }
                                            className="h-10 gap-1.5 bg-primary px-4 text-white shadow-sm hover:bg-primary/95"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                            <span className="text-xs">
                                                {sending
                                                    ? 'Sending...'
                                                    : 'Send'}
                                            </span>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 p-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="shrink-0 text-xs font-bold text-muted-foreground">
                                                Select Template:
                                            </span>
                                            <select
                                                value={selectedTemplateId ? String(selectedTemplateId) : ''}
                                                onChange={(e) => {
                                                    setSelectedTemplateId(
                                                        e.target.value || '',
                                                    );
                                                    setTemplateVars([]);
                                                }}
                                                className="flex-1 cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="">
                                                    -- Choose approved template
                                                    --
                                                </option>
                                                {templates.map((t) => (
                                                    <option
                                                        key={String(t.id)}
                                                        value={String(t.id)}
                                                    >
                                                        {t.name} ({t.language})
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    !selectedTemplateId ||
                                                    sending
                                                }
                                                className="h-9 gap-1.5 bg-primary px-4 text-white shadow-sm hover:bg-primary/95"
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                                <span className="text-xs">
                                                    {sending
                                                         ? 'Sending...'
                                                         : 'Send Template'}
                                                </span>
                                            </Button>
                                        </div>

                                        {selectedTemplateId && (
                                            <div className="flex flex-col gap-2.5 rounded-lg border bg-slate-50/50 p-3 dark:bg-zinc-950/20">
                                                <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                                                    Template Variables:
                                                </span>
                                                {(() => {
                                                    const selectedTemplate =
                                                        templates.find(
                                                            (t) =>
                                                                String(t.id) ===
                                                                String(selectedTemplateId),
                                                        );
                                                    const vars =
                                                        getTemplateVariables(
                                                            selectedTemplate,
                                                        );

                                                    if (vars.length === 0) {
                                                        return (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                No variables
                                                                required for
                                                                this template.
                                                            </span>
                                                        );
                                                    }

                                                    return vars.map(
                                                        (varName, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <span
                                                                    className="max-w-[120px] min-w-[70px] shrink-0 truncate font-mono text-[10px] font-bold text-muted-foreground"
                                                                    title={`{{${varName}}}`}
                                                                >
                                                                    {'{{'}
                                                                    {varName}
                                                                    {'}}'}
                                                                </span>
                                                                <Input
                                                                    placeholder={`Enter value for ${varName}...`}
                                                                    value={
                                                                        templateVars[
                                                                            idx
                                                                        ] || ''
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const val =
                                                                            e
                                                                                .target
                                                                                .value;
                                                                        setTemplateVars(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const copy =
                                                                                    [
                                                                                        ...prev,
                                                                                    ];
                                                                                copy[
                                                                                    idx
                                                                                ] =
                                                                                    val;

                                                                                return copy;
                                                                            },
                                                                        );
                                                                    }}
                                                                    className="h-8 flex-1 text-xs"
                                                                />
                                                            </div>
                                                        ),
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                                    <span>
                                        {mode === 'text'
                                            ? `Character count: ${newMessage.length}`
                                            : 'Template variables will be injected'}
                                    </span>
                                    <span className="font-medium text-primary">
                                        Standard message pricing applies
                                    </span>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-12 text-center">
                            <div className="rounded-full bg-primary/10 p-4 text-primary">
                                <MessageSquare className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                                WhatsApp Conversation Hub
                            </h3>
                            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                                Select a contact conversation from the sidebar
                                list to retrieve chat threads, deliver service
                                templates, or start messaging in real-time.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Right Pane: Customer Details Side Panel */}
                {selectedChat && showDetailPanel && (
                    <div className="relative flex w-80 shrink-0 flex-col bg-slate-50/20 p-6 transition-all duration-300 dark:bg-zinc-950/10">
                        <button
                            onClick={() => setShowDetailPanel(false)}
                            className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mt-4 flex flex-col items-center border-b border-border/40 pb-6 text-center">
                            <div className="relative">
                                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary shadow-inner">
                                    {getInitials(
                                        selectedChat.customer_name ||
                                            'Customer',
                                    )}
                                </div>
                                <span className="absolute right-1 bottom-2 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-background bg-emerald-500"></span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground">
                                {selectedChat.customer_name ||
                                    'WhatsApp Customer'}
                            </h4>
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                                Active Chat
                            </span>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto py-6 text-left">
                            <div>
                                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    Phone Number
                                </span>
                                <div className="mt-1 flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    <span>{selectedChat.customer_phone}</span>
                                </div>
                            </div>

                            {selectedChat.last_message_at && (
                                <div>
                                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Last Message Time
                                    </span>
                                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-foreground">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        <span>
                                            <LiveTime
                                                date={
                                                    selectedChat.last_message_at
                                                }
                                            />
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-border/30 pt-4">
                                <span className="block-title mb-2 block flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                    <span>Chat Performance</span>
                                </span>
                                <div className="space-y-2 rounded-lg border border-border/50 bg-background p-3 text-[10px] text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Transmitted Count:</span>
                                        <span className="font-semibold text-foreground">
                                            {messages.length} messages
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Inbound messages:</span>
                                        <span className="font-semibold text-foreground">
                                            {
                                                messages.filter(
                                                    (m) =>
                                                        m.direction ===
                                                        'inbound',
                                                ).length
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Outbound responses:</span>
                                        <span className="font-semibold text-foreground">
                                            {
                                                messages.filter(
                                                    (m) =>
                                                        m.direction ===
                                                        'outbound',
                                                ).length
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border/30 pt-4">
                                <span className="block-title mb-2 block flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    <Database className="h-3.5 w-3.5 text-primary" />
                                    <span>Meta Session Info</span>
                                </span>
                                <div className="space-y-2 rounded-lg border border-border/50 bg-background p-3 text-[10px] text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Channel:</span>
                                        <span className="font-semibold text-foreground">
                                            WhatsApp API
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Session window:</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            Open (24h)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

InboxIndex.layout = (page: any) => page;
