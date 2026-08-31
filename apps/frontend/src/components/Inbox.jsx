import { useEffect, useState } from "react";
import { api } from "../lib/api";

const TABS = [
  { key: "whatsapp", label: "Whatsapp" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
];

export default function Inbox() {
  const [tab, setTab] = useState("whatsapp");
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setMessages([]);
    api
      .listConversations(tab)
      .then((data) => {
        setConversations(data);
        setSelected(data.length > 0 ? data[0].id : null);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!selected) return;

    // Initial load
    api.listMessages(selected).then(setMessages);

    // Auto-poll every 3 seconds for live message updates
    const interval = setInterval(() => {
      api.listMessages(selected).then(setMessages).catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [selected]);

  const activeConvo = conversations.find((c) => c.id === selected);

  // Check if last message is inbound so typing indicator appears while generating output
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const isAgentThinking = lastMsg && lastMsg.direction === "inbound";

  return (
    <div className="flex flex-col h-screen">
      <div className="flex border-b border-line px-2 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm border-b-2 transition ${
              tab === t.key
                ? "border-ink text-ink font-medium"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 flex-shrink-0 border-r border-line overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-ink-muted">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">
              No conversations yet. Once this channel is connected and a customer
              messages you, it'll show up here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-line transition ${
                  selected === c.id ? "bg-accent-soft" : "hover:bg-bg"
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {c.contact_name || c.contact_external_id}
                </p>
                <p className="text-xs text-ink-muted truncate">{c.contact_external_id}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {activeConvo ? (
            <>
              <div className="px-5 py-3 border-b border-line flex-shrink-0 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {activeConvo.contact_name || activeConvo.contact_external_id}
                  </p>
                  <p className="text-xs text-ink-muted">{activeConvo.contact_external_id}</p>
                </div>
                {isAgentThinking && (
                  <div className="flex items-center gap-1.5 text-xs text-accent font-medium bg-accent-soft/40 px-2.5 py-1 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    AI Agent is typing…
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-md px-3.5 py-2 rounded-xl text-sm ${
                      m.direction === "outbound" ? "ml-auto bg-accent text-white" : "bg-bg"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
                {isAgentThinking && (
                  <div className="ml-auto max-w-md px-4 py-2.5 rounded-xl text-sm bg-accent/20 text-accent flex items-center gap-1.5 italic">
                    <span className="text-xs font-medium">AI Agent typing</span>
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
