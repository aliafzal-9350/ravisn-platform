import * as React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { AppShell } from '@/components/app-shell';
import { ClientSidebar } from '@/components/client-sidebar';
import { subscribeToThreadUpdates } from '@/echo';
import type { ContactDetails, ThreadItem } from './Components/ConversationList';
import { ConversationList } from './Components/ConversationList';
import type { ThreadMessage } from './Components/MessageThread';
import { MessageThread } from './Components/MessageThread';
import { CustomerDetailsPanel } from './Components/CustomerDetailsPanel';

interface InboxProps {
    threads: ThreadItem[];
    initialThreadId?: string | null;
    initialThread?: {
        thread: ThreadItem;
        contact: ContactDetails | null;
        messages: ThreadMessage[];
    } | null;
    openCount?: number;
}

export default function Inbox({
    threads: initialThreads = [],
    initialThreadId = null,
    initialThread = null,
    openCount = 0,
}: InboxProps) {
    const pageProps = usePage().props as any;
    const currentUserName = pageProps?.auth?.user?.name || 'Staff Member';

    const [threadList, setThreadList] = React.useState<ThreadItem[]>(initialThreads);
    const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
        initialThreadId || (initialThreads[0]?.id ?? null)
    );
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

    // Subscribe to real-time Reverb WebSocket updates for active thread
    React.useEffect(() => {
        if (!selectedThreadId) return;

        const unsubscribe = subscribeToThreadUpdates(
            selectedThreadId,
            (newMsg) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) return prev;
                    const createdDate = new Date(newMsg.created_at);
                    return [
                        ...prev,
                        {
                            id: newMsg.id,
                            thread_id: newMsg.thread_id,
                            direction: newMsg.direction,
                            message_type: 'text',
                            content: newMsg.content,
                            status: newMsg.status || 'delivered',
                            is_ai_generated: newMsg.is_ai_generated,
                            created_at: newMsg.created_at,
                            formatted_time: createdDate.toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                            }),
                            date_group: 'TODAY',
                        },
                    ];
                });

                // Update last message in thread list
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === selectedThreadId
                            ? {
                                  ...t,
                                  last_message_at: newMsg.created_at,
                                  last_message_preview: newMsg.content,
                              }
                            : t
                    )
                );
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
            }
        );

        return () => unsubscribe();
    }, [selectedThreadId]);

    // Send Outbound Message handler
    const handleSendMessage = async (content: string, isInternalNote: boolean): Promise<boolean> => {
        if (!selectedThreadId) return false;

        if (isInternalNote) {
            // Update internal notes on contact
            if (activeContact?.id) {
                try {
                    const currentNotes = activeContact.internal_notes || '';
                    const updatedNotes = currentNotes
                        ? `${currentNotes}\n• ${content}`
                        : `• ${content}`;

                    const res = await fetch(`/api/v1/contacts/${activeContact.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                        body: JSON.stringify({ internal_notes: updatedNotes }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.contact) {
                            handleContactUpdated(data.contact);
                        }
                        return true;
                    }
                } catch {
                    return false;
                }
            }
            return false;
        }

        // Outbound customer message to /api/v1/inbox/threads/{id}/messages
        try {
            const res = await fetch(`/api/v1/inbox/threads/${selectedThreadId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.message) {
                    setMessages((prev) => [...prev, data.message]);
                }
                // Update thread list preview
                setThreadList((prev) =>
                    prev.map((t) =>
                        t.id === selectedThreadId
                            ? {
                                  ...t,
                                  last_message_at: new Date().toISOString(),
                                  last_message_preview: content,
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
