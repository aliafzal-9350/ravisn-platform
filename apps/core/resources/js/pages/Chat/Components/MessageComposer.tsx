import * as React from 'react';
import {
    Command,
    CornerDownLeft,
    FileText,
    Lock,
    MessageSquare,
    Paperclip,
    Search,
    Send,
    Sparkles,
    StickyNote,
    X,
    Zap,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface MetaTemplateItem {
    id: string;
    name: string;
    language?: string;
    category?: string;
    status?: string;
    components?: any;
}

export interface CannedReplyItem {
    shortcut: string;
    title: string;
    category: string;
    body: string;
}

export const PREAPPROVED_CANNED_REPLIES: CannedReplyItem[] = [
    {
        shortcut: 'greet',
        title: 'Welcome & Greeting',
        category: 'General',
        body: 'Hello! Thank you for contacting us. How can I assist you today?',
    },
    {
        shortcut: 'pricing',
        title: 'Pricing & Enterprise Plans',
        category: 'Sales',
        body: 'Our platform includes 24/7 autonomous multi-agent reasoning, pgvector RAG, and official Meta WhatsApp Cloud API integration. Would you like a detailed breakdown of our enterprise tiers?',
    },
    {
        shortcut: 'demo',
        title: 'Live Product Demo Invitation',
        category: 'Sales',
        body: "I'd be glad to show you a live interactive demo of our omnichannel capabilities. Are you available for a 15-minute Google Meet walkthrough this week?",
    },
    {
        shortcut: 'hours',
        title: 'Support Hours & SLA',
        category: 'Support',
        body: 'Our human support team is online Monday to Friday from 9:00 AM to 6:00 PM EST. For urgent matters, our autonomous AI dispatch runs 24/7/365.',
    },
    {
        shortcut: 'handover',
        title: 'Senior Specialist Escalation',
        category: 'Support',
        body: 'I am escalating your ticket to our senior technical specialist. Please hold on for a moment while they review your account history.',
    },
    {
        shortcut: 'followup',
        title: 'Courtesy Follow-up',
        category: 'General',
        body: 'Just following up on our previous conversation. Please let us know if everything is running smoothly or if you have any questions!',
    },
];

interface MessageComposerProps {
    customerName: string;
    onSendMessage: (content: string, isInternalNote: boolean) => Promise<boolean>;
    disabled?: boolean;
    isWindowExpired?: boolean;
    templates?: MetaTemplateItem[];
    onSendTemplate?: (templateId: string, templateName: string, variables?: Record<string, string>) => Promise<boolean>;
}

export function MessageComposer({
    customerName,
    onSendMessage,
    disabled = false,
    isWindowExpired = false,
    templates = [],
    onSendTemplate,
}: MessageComposerProps) {
    const [mode, setMode] = React.useState<'reply' | 'note'>('reply');
    const [text, setText] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = React.useState(false);
    const [templateSearch, setTemplateSearch] = React.useState('');
    const [selectedTemplate, setSelectedTemplate] = React.useState<MetaTemplateItem | null>(null);
    const [templateSending, setTemplateSending] = React.useState(false);

    // Slash command (/) popover state
    const [showCannedPopover, setShowCannedPopover] = React.useState(false);
    const [cannedQuery, setCannedQuery] = React.useState('');
    const [selectedCannedIndex, setSelectedCannedIndex] = React.useState(0);

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const cannedPopoverRef = React.useRef<HTMLDivElement>(null);

    const isTextLocked = isWindowExpired && mode === 'reply';

    // Filter canned replies based on query after slash
    const filteredCanned = React.useMemo(() => {
        if (!cannedQuery) return PREAPPROVED_CANNED_REPLIES;
        const q = cannedQuery.toLowerCase();
        return PREAPPROVED_CANNED_REPLIES.filter(
            (c) =>
                c.shortcut.toLowerCase().includes(q) ||
                c.title.toLowerCase().includes(q) ||
                c.body.toLowerCase().includes(q)
        );
    }, [cannedQuery]);

    // Insert selected canned reply into textarea
    const insertCannedReply = (reply: CannedReplyItem) => {
        const textarea = textareaRef.current;
        const currentText = text;
        const cursorPosition = textarea ? textarea.selectionStart : currentText.length;

        // Find where the slash starts before cursor
        const textBeforeCursor = currentText.slice(0, cursorPosition);
        const slashIndex = textBeforeCursor.lastIndexOf('/');

        let newText: string;
        if (slashIndex !== -1) {
            newText = currentText.slice(0, slashIndex) + reply.body + currentText.slice(cursorPosition);
        } else {
            newText = reply.body;
        }

        setText(newText);
        setShowCannedPopover(false);
        setCannedQuery('');

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
            }
        }, 50);
    };

    const handleSend = async () => {
        if (!text.trim() || sending || isTextLocked) return;
        setSending(true);
        try {
            const success = await onSendMessage(text.trim(), mode === 'note');
            if (success) {
                setText('');
                setShowCannedPopover(false);
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            }
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // If slash command popover is active, intercept arrow keys and Enter
        if (showCannedPopover && filteredCanned.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCannedIndex((prev) => (prev + 1) % filteredCanned.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCannedIndex((prev) => (prev - 1 + filteredCanned.length) % filteredCanned.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertCannedReply(filteredCanned[selectedCannedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowCannedPopover(false);
                return;
            }
        }

        // Standard Enter to send
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;

        // Check for slash command at cursor position
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const slashMatch = textBeforeCursor.match(/\/([a-zA-Z0-9_-]*)$/);

        if (slashMatch && !isTextLocked) {
            setShowCannedPopover(true);
            setCannedQuery(slashMatch[1]);
            setSelectedCannedIndex(0);
        } else {
            setShowCannedPopover(false);
            setCannedQuery('');
        }
    };

    const filteredTemplates = React.useMemo(() => {
        if (!templateSearch.trim()) return templates;
        const q = templateSearch.toLowerCase();
        return templates.filter((t) =>
            t.name.toLowerCase().includes(q) ||
            (t.category && t.category.toLowerCase().includes(q))
        );
    }, [templates, templateSearch]);

    const handleDispatchTemplate = async (template: MetaTemplateItem) => {
        if (!onSendTemplate || templateSending) return;
        setTemplateSending(true);
        try {
            const success = await onSendTemplate(template.id, template.name);
            if (success) {
                setShowTemplatesModal(false);
                setSelectedTemplate(null);
            }
        } finally {
            setTemplateSending(false);
        }
    };

    return (
        <>
            <div className="p-3 lg:p-4 bg-background border-t border-[#E2E8F0] dark:border-[#1E293B] relative">
                {/* 24-Hour Meta Window Expired Banner */}
                {isWindowExpired && mode === 'reply' && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in duration-200">
                        <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                                <Lock className="h-4 w-4" />
                            </div>
                            <div className="leading-relaxed">
                                <p className="font-semibold text-amber-950 dark:text-amber-100">
                                    Meta 24-Hour Messaging Window Closed (Error 131047)
                                </p>
                                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                    Meta restricts standard free-form text outside 24h. You must send a pre-approved template to re-engage {customerName}.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTemplatesModal(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Select Template</span>
                        </button>
                    </div>
                )}

                {/* Floating Slash Command (/) Canned Replies Popover */}
                {showCannedPopover && (
                    <div
                        ref={cannedPopoverRef}
                        className="absolute left-4 right-4 bottom-[calc(100%-8px)] mb-2 max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                <span>Canned Responses</span>
                                {cannedQuery && (
                                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                        /{cannedQuery}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>↑↓ Navigate</span>
                                <span>•</span>
                                <span>↵ Select</span>
                                <span>•</span>
                                <span>Esc Close</span>
                            </span>
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                            {filteredCanned.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No canned replies matching "/{cannedQuery}".
                                </div>
                            ) : (
                                filteredCanned.map((reply, idx) => {
                                    const isSelected = idx === selectedCannedIndex;
                                    return (
                                        <button
                                            key={reply.shortcut}
                                            type="button"
                                            onClick={() => insertCannedReply(reply)}
                                            onMouseEnter={() => setSelectedCannedIndex(idx)}
                                            className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer flex items-start gap-2.5 ${
                                                isSelected
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-foreground'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-muted-foreground'
                                            }`}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                                                        isSelected
                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    /{reply.shortcut}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-foreground truncate">
                                                        {reply.title}
                                                    </p>
                                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                                                        {reply.category}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                    {reply.body}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Outer Composer Card */}
                <div
                    className={`rounded-xl border shadow-xs overflow-hidden transition-all ${
                        mode === 'note'
                            ? 'border-amber-400/80 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/20 focus-within:border-amber-500'
                            : isTextLocked
                            ? 'border-amber-300 dark:border-amber-800/60 bg-slate-50/50 dark:bg-[#0E1524]'
                            : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#131B2E] focus-within:border-[#027A48]/50 dark:focus-within:border-emerald-500/50'
                    }`}
                >
                    {/* Mode Tabs / Toggles */}
                    <div className="flex items-center justify-between px-3.5 pt-2 border-b border-[#E2E8F0]/60 dark:border-[#1E293B]/60">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setMode('reply')}
                                className={`pb-1.5 text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                                    mode === 'reply'
                                        ? isWindowExpired
                                            ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                                            : 'text-[#027A48] dark:text-emerald-400 border-b-2 border-[#027A48] dark:border-emerald-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>Reply to Customer</span>
                                    {isWindowExpired && <Lock className="h-3 w-3 text-amber-500 ml-0.5" />}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('note')}
                                className={`pb-1.5 text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                                    mode === 'note'
                                        ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Internal Staff Note</span>
                                </span>
                            </button>
                        </div>

                        {mode === 'note' && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 pb-1">
                                <Lock className="h-3 w-3" />
                                <span>Visible to team only · Never sent to customer</span>
                            </span>
                        )}
                    </div>

                    {/* Textarea */}
                    <div className="p-2.5 relative">
                        {isTextLocked && (
                            <div className="absolute inset-0 bg-slate-100/60 dark:bg-slate-900/60 backdrop-blur-[1px] rounded-b-xl z-10 flex items-center justify-center p-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplatesModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>24h Window Closed · Open Templates Selector</span>
                                </button>
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            rows={2}
                            value={text}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            disabled={disabled || sending || isTextLocked}
                            placeholder={
                                isTextLocked
                                    ? `Direct text message is locked outside the 24-hour service window.`
                                    : mode === 'reply'
                                    ? `Type message to ${customerName}... (Type / for quick replies)`
                                    : `Write private internal note about ${customerName} (staff only)...`
                            }
                            className={`w-full resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed ${
                                isTextLocked ? 'opacity-30 cursor-not-allowed select-none' : ''
                            }`}
                        />
                    </div>

                    {/* Bottom Action Toolbar */}
                    <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2 border-t border-[#E2E8F0]/40 dark:border-[#1E293B]/40">
                        {/* Left Action Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            <button
                                type="button"
                                disabled={isTextLocked}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Paperclip className="h-3 w-3 text-slate-500" />
                                <span>Attach</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowTemplatesModal(true)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                                    isWindowExpired
                                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <FileText className={`h-3 w-3 ${isWindowExpired ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`} />
                                <span>Templates {templates.length > 0 && `(${templates.length})`}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowCannedPopover(!showCannedPopover);
                                    setCannedQuery('');
                                    if (textareaRef.current) textareaRef.current.focus();
                                }}
                                disabled={isTextLocked}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title="Open canned responses (or press /)"
                            >
                                <Zap className="h-3 w-3 text-amber-500" />
                                <span>/ Canned</span>
                            </button>

                            {/* Internal Note Toggle Pill */}
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'note' ? 'reply' : 'note')}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                                    mode === 'note'
                                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                <span>Internal Note</span>
                            </button>
                        </div>

                        {/* Right Send Button */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden md:inline text-[10px] text-muted-foreground/70">
                                ↵ Send
                            </span>
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!text.trim() || disabled || sending || isTextLocked}
                                className={`inline-flex items-center justify-center gap-1.5 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                    mode === 'note'
                                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                        : 'bg-[#027A48] hover:bg-[#026838] active:bg-[#015828]'
                                }`}
                            >
                                {sending ? (
                                    <span>Sending...</span>
                                ) : mode === 'note' ? (
                                    <>
                                        <Lock className="h-3 w-3" />
                                        <span>Save Note</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3 w-3" />
                                        <span>Send</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meta Templates Selector Dialog */}
            <Dialog open={showTemplatesModal} onOpenChange={setShowTemplatesModal}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-border">
                    <DialogHeader className="p-5 pb-3 border-b border-border">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#027A48]" />
                            <span>Select Approved Meta WhatsApp Template</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Required to message {customerName} outside the 24-hour customer window under Meta Graph API v21.0 rules.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search bar */}
                    <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                placeholder="Search templates by name, category..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-background border border-border focus:outline-none focus:border-[#027A48]"
                            />
                        </div>
                    </div>

                    {/* Templates List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredTemplates.length === 0 ? (
                            <div className="py-12 text-center text-xs text-muted-foreground">
                                {templateSearch ? 'No templates match your search.' : 'No approved templates found for this account.'}
                            </div>
                        ) : (
                            filteredTemplates.map((tpl) => {
                                const isSelected = selectedTemplate?.id === tpl.id;
                                return (
                                    <div
                                        key={tpl.id}
                                        onClick={() => setSelectedTemplate(tpl)}
                                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'border-[#027A48] bg-emerald-50/30 dark:bg-emerald-950/20'
                                                : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-background'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {tpl.name}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                                {tpl.category || 'MARKETING'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
                        <button
                            type="button"
                            onClick={() => setShowTemplatesModal(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!selectedTemplate || templateSending}
                            onClick={() => selectedTemplate && handleDispatchTemplate(selectedTemplate)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#027A48] hover:bg-[#026838] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                        >
                            {templateSending ? 'Sending Template...' : 'Send Template to Customer'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
