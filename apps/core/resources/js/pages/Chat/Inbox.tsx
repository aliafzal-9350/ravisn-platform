import * as React from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { ClientSidebar } from '@/components/client-sidebar';
import { jsonHeaders } from '@/lib/csrf';
import {
    subscribeToThreadUpdates,
    subscribeToTenantInbox,
    playNotificationChime,
    triggerDesktopNotification,
    requestNotificationPermission,
    type RealtimeMessage,
    type RealtimeStatusUpdate,
    type RealtimeMediaReady,
} from '@/echo';
import type { ContactDetails, ThreadItem } from './Components/ConversationList';
import { ConversationList } from './Components/ConversationList';
import type { ThreadMessage } from './Components/MessageThread';
import { MessageThread } from './Components/MessageThread';
import { CustomerDetailsPanel } from './Components/CustomerDetailsPanel';

/** Maps a realtime broadcast payload to the shape the thread view renders. */
function toThreadMessage(msg: RealtimeMessage): ThreadMessage {
    return {
        id: msg.id,
        thread_id: msg.thread_id,
        direction: msg.direction,
        message_type: msg.message_type || 'text',
        content: msg.content,
        media_url: msg.media_url,
        media_mime_type: msg.media_mime_type,
        whisper_transcript: msg.whisper_transcript,
        status: msg.status || 'delivered',
        is_ai_generated: msg.is_ai_generated,
        ai_model: msg.ai_model,
        detected_intent: msg.detected_intent,
        latency_ms: msg.latency_ms,
        confidence_score: msg.confidence_score,
        telemetry: msg.telemetry,
        rag_chunk: msg.rag_chunk,
        created_at: msg.created_at,
        formatted_time: new Date(msg.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        }),
        date_group: 'TODAY',
    };
}

interface InboxProps {
    threads: ThreadItem[];
    initialThreadId?: string | null;
    initialThread?: {
        thread: ThreadItem;
        contact: ContactDetails | null;
        messages: ThreadMessage[];
    } | null;
    openCount?: number;
    templates?: any[];
}

export default function Inbox({
    threads: initialThreads = [],
    initialThreadId = null,
    initialThread = null,
    openCount = 0,
    templates = [],
}: InboxProps) {
    const pageProps = usePage().props as any;
    const currentUserName = pageProps?.auth?.user?.name || 'Staff Member';

    const [threadList, setThreadList] = React.useState<ThreadItem[]>(initialThreads);
    const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
        initialThreadId || (initialThreads[0]?.id ?? null)
    );
    const [templateList, setTemplateList] = React.useState<any[]>(templates);

    // Fetch approved templates if not supplied by backend
    React.useEffect(() => {
        if (templates && templates.length > 0) {
            setTemplateList(templates);
            return;
        }
        fetch('/dashboard/templates?json=1', {
            headers: { credentials: 'same-origin', Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data?.templates && Array.isArray(data.templates)) {
                    setTemplateList(data.templates);
                } else if (Array.isArray(data)) {
                    setTemplateList(data);
                }
            })
            .catch(() => {});
    }, [templates]);
    const [messages, setMessages] = React.useState<ThreadMessage[]>(
        initialThread?.messages || []
    );
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const [showCustomerDetails, setShowCustomerDetails] = React.useState(true);

    // Keep threadList in sync if initialThreads prop changes from Inertia
    React.useEffect(() => {
        setThreadList(initialThreads);
        if (!selectedThreadId && initialThreads.length > 0) {
            setSelectedThreadId(initialThreads[0].id);
        }
    }, [initialThreads]);

    // Single source of truth for active thread
    const activeThread = React.useMemo(() => {
        if (!selectedThreadId) return threadList[0] || null;
        return threadList.find((t) => t.id === selectedThreadId) || threadList[0] || null;
    }, [threadList, selectedThreadId]);

    // Active contact is ALWAYS tied directly to activeThread (prevents state divergence)
    const activeContact = React.useMemo(() => {
        return activeThread?.contact ?? null;
    }, [activeThread]);

    // Fetch messages & thread details when selectedThreadId changes
    const fetchThreadData = React.useCallback(async (threadId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/v1/inbox/threads/${threadId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
                // Update contact and session state directly in the threadList
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === threadId
                            ? {
                                  ...t,
                                  contact: data.contact ?? t.contact,
                                  session_remaining: data.thread?.session_remaining ?? t.session_remaining,
                                  session_formatted: data.thread?.session_formatted ?? t.session_formatted,
                                  is_session_open: data.thread?.is_session_open ?? t.is_session_open,
                              }
                            : t
                    )
                );
            }
        } catch (err) {
            console.error('Failed to fetch thread messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Load thread data when selection changes
    React.useEffect(() => {
        if (selectedThreadId) {
            // Skip initial fetch if backend already passed messages for this exact thread
            if (initialThread && initialThread.thread.id === selectedThreadId && messages.length > 0) {
                return;
            }
            fetchThreadData(selectedThreadId);
        } else {
            setMessages([]);
        }
    }, [selectedThreadId, fetchThreadData]);

    // Request desktop notification permission on first user interaction
    React.useEffect(() => {
        const handleUserGesture = () => {
            requestNotificationPermission();
            window.removeEventListener('click', handleUserGesture);
        };
        window.addEventListener('click', handleUserGesture);
        return () => window.removeEventListener('click', handleUserGesture);
    }, []);

    // Latest state for the long-lived realtime handlers below, so the channel
    // subscriptions are not torn down and re-joined on every incoming message.
    const selectedThreadIdRef = React.useRef(selectedThreadId);
    const threadListRef = React.useRef(threadList);
    const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        selectedThreadIdRef.current = selectedThreadId;
    }, [selectedThreadId]);

    React.useEffect(() => {
        threadListRef.current = threadList;
    }, [threadList]);

    // A conversation we have not loaded yet (a brand-new customer) is picked up
    // with a debounced partial reload of the thread list.
    const scheduleThreadListRefresh = React.useCallback(() => {
        if (refreshTimerRef.current) {
            return;
        }

        refreshTimerRef.current = setTimeout(() => {
            refreshTimerRef.current = null;
            router.reload({ only: ['threads', 'openCount'] });
        }, 600);
    }, []);

    React.useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    // 1. Tenant-wide inbox channel (private-tenant.{id}.inbox): alerts, unread
    //    counts, previews and escalation badges for every conversation.
    const tenantId = pageProps?.auth?.user?.tenant_id;

    React.useEffect(() => {
        if (!tenantId) {
            return;
        }

        const unsubscribe = subscribeToTenantInbox(
            String(tenantId),
            (newMsg: RealtimeMessage) => {
                const activeId = selectedThreadIdRef.current;
                const tabHidden = typeof document !== 'undefined' && document.hidden;

                if (newMsg.direction === 'inbound') {
                    // Stay quiet only while an agent is looking at this very conversation.
                    if (tabHidden || newMsg.thread_id !== activeId) {
                        playNotificationChime();
                    }

                    if (tabHidden) {
                        const contactName =
                            threadListRef.current.find((t) => t.id === newMsg.thread_id)?.contact?.name || 'Customer';
                        triggerDesktopNotification(
                            `New message from ${contactName}`,
                            newMsg.content || 'Sent a media attachment',
                            () => setSelectedThreadId(newMsg.thread_id)
                        );
                    }
                }

                if (!threadListRef.current.some((t) => t.id === newMsg.thread_id)) {
                    scheduleThreadListRefresh();

                    return;
                }

                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === newMsg.thread_id
                            ? {
                                  ...t,
                                  last_message_at: newMsg.created_at,
                                  last_message_preview:
                                      newMsg.content || (newMsg.message_type ? `[${newMsg.message_type}]` : 'New message'),
                                  unread_count:
                                      newMsg.thread_id !== selectedThreadIdRef.current && newMsg.direction === 'inbound'
                                          ? (t.unread_count || 0) + 1
                                          : t.unread_count,
                              }
                            : t
                    )
                );
            },
            (threadUpdate) => {
                if (threadUpdate.bot_active === false || threadUpdate.status === 'human_takeover') {
                    playNotificationChime();
                    toast.error('Human escalation: AI auto-replies are paused for a conversation that needs an agent.', {
                        duration: 7000,
                    });
                }

                if (!threadListRef.current.some((t) => t.id === threadUpdate.id)) {
                    scheduleThreadListRefresh();

                    return;
                }

                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === threadUpdate.id
                            ? {
                                  ...t,
                                  bot_active: threadUpdate.bot_active,
                                  status: (threadUpdate.status ||
                                      (threadUpdate.bot_active === false ? 'human_takeover' : t.status)) as ThreadItem['status'],
                                  last_message_at: threadUpdate.last_message_at || t.last_message_at,
                              }
                            : t
                    )
                );
            }
        );

        return () => unsubscribe();
    }, [tenantId, scheduleThreadListRefresh]);

    // 2. Active thread channel (chat.thread.{id}): appends messages and live status ticks.
    React.useEffect(() => {
        if (!selectedThreadId) {
            return;
        }

        const unsubscribe = subscribeToThreadUpdates(
            selectedThreadId,
            (newMsg: RealtimeMessage) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) {
                        return prev;
                    }

                    return [...prev, toThreadMessage(newMsg)];
                });
            },
            (threadUpdate) => {
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === threadUpdate.id
                            ? {
                                  ...t,
                                  bot_active: threadUpdate.bot_active,
                                  last_message_at: threadUpdate.last_message_at || t.last_message_at,
                              }
                            : t
                    )
                );
            },
            (statusUpdate: RealtimeStatusUpdate) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === statusUpdate.message_id ? { ...m, status: statusUpdate.status } : m
                    )
                );
            },
            (media: RealtimeMediaReady) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === media.message_id
                            ? { ...m, media_url: media.media_url, media_mime_type: media.media_mime_type ?? m.media_mime_type }
                            : m
                    )
                );
            }
        );

        return () => unsubscribe();
    }, [selectedThreadId]);

    // Send Outbound Message / Internal Staff Note handler
    const handleSendMessage = async (content: string, isInternalNote: boolean): Promise<boolean> => {
        if (!selectedThreadId) return false;

        try {
            const res = await fetch(`/api/v1/inbox/threads/${selectedThreadId}/messages`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    content,
                    type: isInternalNote ? 'note' : 'text',
                    message_type: isInternalNote ? 'note' : 'text',
                    is_note: isInternalNote,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.message) {
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === data.message.id)) return prev;
                        return [...prev, data.message];
                    });
                }

                // If note, also optionally update contact's internal notes CRM field
                if (isInternalNote && activeContact?.id) {
                    const currentNotes = activeContact.internal_notes || '';
                    const updatedNotes = currentNotes
                        ? `${currentNotes}\n• ${content}`
                        : `• ${content}`;

                    fetch(`/api/v1/contacts/${activeContact.id}`, {
                        method: 'PUT',
                        headers: jsonHeaders(),
                        body: JSON.stringify({ internal_notes: updatedNotes }),
                    })
                        .then((r) => r.json())
                        .then((cData) => {
                            if (cData.contact) handleContactUpdated(cData.contact);
                        })
                        .catch(() => {});
                }

                // Update thread list preview
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === selectedThreadId
                            ? {
                                  ...t,
                                  last_message_at: new Date().toISOString(),
                                  last_message_preview: isInternalNote ? `[Note] ${content}` : content,
                              }
                            : t
                    )
                );
                return true;
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        }
        return false;
    };

    // Send Approved Meta Template handler
    const handleSendTemplate = async (templateId: string, templateName: string, variables?: Record<string, string>) => {
        if (!selectedThreadId) return false;
        try {
            const res = await fetch(`/api/v1/inbox/threads/${selectedThreadId}/messages`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    template_id: templateId,
                    template_name: templateName,
                    variables: variables || [],
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.message) {
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === data.message.id)) return prev;
                        return [...prev, data.message];
                    });
                }
                fetchThreadData(selectedThreadId);
                return true;
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('Template send failed:', errData);
            }
        } catch (err) {
            console.error('Failed to send template:', err);
        }
        return false;
    };

    // Update Contact Details handler
    const handleContactUpdated = (updated: ContactDetails) => {
        setThreadList((prev) =>
            prev.map((t) =>
                t.contact?.id === updated.id
                    ? {
                          ...t,
                          contact: {
                              ...t.contact,
                              ...updated,
                          },
                      }
                    : t
            )
        );
    };

    const handleToggleBot = async () => {
        if (!selectedThreadId) return;
        try {
            const res = await fetch(`/api/v1/threads/${selectedThreadId}/toggle-bot`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({ bot_active: true }),
            });
            if (res.ok) {
                toast.success('AI Bot resumed for this conversation.');
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === selectedThreadId
                            ? { ...t, bot_active: true, status: 'open' }
                            : t
                    )
                );
            }
        } catch {
            toast.error('Failed to resume AI Bot.');
        }
    };

    const calculatedOpenCount = threadList.filter(
        (t) => t.status === 'open' || !t.status
    ).length;

    return (
        <>
            <Head title="Omnichannel Inbox - RAVISN Platform" />

            <div className="flex h-screen w-full overflow-hidden bg-[#F4F7F9] dark:bg-[#0B0F17]">
                {/* 3-Column Split Layout */}
                <div className="flex flex-1 h-full w-full min-w-0 overflow-hidden">
                    {/* Column 1: Conversations List (300px Compact Width) */}
                    <ConversationList
                        threads={threadList}
                        selectedThreadId={activeThread?.id ?? null}
                        onSelectThread={(id) => setSelectedThreadId(id)}
                        openCount={calculatedOpenCount || openCount}
                    />

                    {/* Column 2: Active Chat Stream (Flexible Hero Column) */}
                    <MessageThread
                        thread={activeThread}
                        contact={activeContact}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        loading={loadingMessages}
                        showCustomerDetails={showCustomerDetails}
                        onToggleCustomerDetails={() => setShowCustomerDetails(!showCustomerDetails)}
                        onToggleBot={handleToggleBot}
                        templates={templateList}
                        onSendTemplate={handleSendTemplate}
                    />

                    {/* Column 3: Customer Details & Notes CRM Panel (Collapsible 320px-350px Width) */}
                    {showCustomerDetails && (
                        <CustomerDetailsPanel
                            contact={activeContact}
                            userName={currentUserName}
                            onContactUpdated={handleContactUpdated}
                            onClose={() => setShowCustomerDetails(false)}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

Inbox.layout = (page: React.ReactNode) => (
    <AppShell variant="sidebar">
        <ClientSidebar />
        <main className="flex-1 h-screen overflow-hidden flex flex-col bg-[#F4F7F9] dark:bg-[#0B0F17]">
            {page}
        </main>
    </AppShell>
);
