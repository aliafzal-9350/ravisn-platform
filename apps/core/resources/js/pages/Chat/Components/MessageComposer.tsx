import * as React from 'react';
import { FileText, Paperclip, Zap } from 'lucide-react';

interface MessageComposerProps {
    customerName: string;
    onSendMessage: (content: string, isInternalNote: boolean) => Promise<boolean>;
    disabled?: boolean;
}

export function MessageComposer({
    customerName,
    onSendMessage,
    disabled = false,
}: MessageComposerProps) {
    const [mode, setMode] = React.useState<'reply' | 'note'>('reply');
    const [text, setText] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            const success = await onSendMessage(text.trim(), mode === 'note');
            if (success) {
                setText('');
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            }
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    };

    return (
        <div className="p-3 lg:p-4 bg-background border-t border-[#E2E8F0] dark:border-[#1E293B]">
            {/* Outer Composer Card */}
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#131B2E] shadow-xs overflow-hidden transition-all focus-within:border-[#027A48]/50 dark:focus-within:border-emerald-500/50">
                {/* Mode Tabs */}
                <div className="flex items-center gap-4 px-3.5 pt-2 border-b border-[#E2E8F0]/60 dark:border-[#1E293B]/60">
                    <button
                        type="button"
                        onClick={() => setMode('reply')}
                        className={`pb-1.5 text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                            mode === 'reply'
                                ? 'text-[#027A48] dark:text-emerald-400 border-b-2 border-[#027A48] dark:border-emerald-400'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Reply to Customer
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
                        Internal Staff Note
                    </button>
                </div>

                {/* Textarea */}
                <div className="p-2.5">
                    <textarea
                        ref={textareaRef}
                        rows={2}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={disabled || sending}
                        placeholder={
                            mode === 'reply'
                                ? `Type message to ${customerName}...`
                                : `Write private internal note about ${customerName}...`
                        }
                        className="w-full resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
                    />
                </div>

                {/* Bottom Action Toolbar */}
                <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2 border-t border-[#E2E8F0]/40 dark:border-[#1E293B]/40">
                    {/* Left Action Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                        >
                            <Paperclip className="h-3 w-3 text-slate-500" />
                            <span>Attach</span>
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                        >
                            <FileText className="h-3 w-3 text-slate-500" />
                            <span>Templates</span>
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                        >
                            <Zap className="h-3 w-3 text-slate-500" />
                            <span>Quick Reply</span>
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
                            disabled={!text.trim() || disabled || sending}
                            className={`inline-flex items-center justify-center text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                mode === 'note'
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-[#027A48] hover:bg-[#026838] active:bg-[#015828]'
                            }`}
                        >
                            {sending ? 'Sending...' : mode === 'note' ? 'Save Note' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
