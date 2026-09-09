import * as React from 'react';
import Inbox from '@/pages/Chat/Inbox';

export default function ClientInboxIndex(props: any) {
    const transformedThreads =
        props.threads ||
        (props.chats
            ? props.chats.map((c: any) => ({
                  id: String(c.id),
                  channel_type: c.channel_type || 'whatsapp',
                  status: 'open',
                  bot_active: Boolean(c.is_ai_active),
                  last_message_at: c.last_message_at,
                  last_message_preview: c.last_message_preview || 'Active chat',
                  unread_count: c.unread_count || 0,
                  session_remaining: c.session_remaining ?? 86400,
                  is_session_open: Boolean(c.is_session_open ?? true),
                  session_formatted:
                      c.is_session_open ?? true
                          ? `${Math.floor((c.session_remaining || 86400) / 3600)}h left`
                          : 'Expired',
                  contact: {
                      id: String(c.id),
                      name: c.customer_name || c.customer_phone,
                      phone_number: c.customer_phone,
                      phone: c.customer_phone,
                  },
              }))
            : []);

    return (
        <Inbox
            threads={transformedThreads}
            initialThreadId={props.initialThreadId || (transformedThreads[0]?.id ?? null)}
            initialThread={props.initialThread}
            openCount={props.openCount || transformedThreads.length}
        />
    );
}

ClientInboxIndex.layout = Inbox.layout;
