import { CornerDownLeft, ExternalLink, FileText, Film, Image, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
    name: string;
    language?: string;
    category?: string;
    headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE';
    headerText?: string;
    /** Object URL for locally-selected image/video files */
    headerMediaUrl?: string | null;
    /** The media header format (IMAGE | VIDEO | DOCUMENT) — used when no file is uploaded yet */
    headerMediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    bodyText?: string;
    footerText?: string;
    buttons?: Array<{
        type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
        text: string;
        phone_number?: string;
        url?: string;
    }>;
    variables?: Record<string, string>;
    className?: string;
}

export function TemplatePreview({
    language,
    category,
    headerType = 'NONE',
    headerText = '',
    headerMediaUrl,
    headerMediaType,
    bodyText = '',
    footerText = '',
    buttons = [],
    variables = {},
    className,
}: TemplatePreviewProps) {
    // Helper to replace variables in text
    const replaceVariables = (text: string) => {
        if (!text) {
            return '';
        }

        let result = text;
        Object.entries(variables).forEach(([key, val]) => {
            result = result.replaceAll(`{{${key}}}`, val || `[${key}]`);
        });

        // For unfilled variables, highlight them
        return result.split(/(\{\{\d+\}\})/).map((part, index) => {
            if (part.startsWith('{{') && part.endsWith('}}')) {
                const varNum = part.slice(2, -2);
                const customVal = variables[varNum];

                return (
                    <span
                        key={index}
                        className="inline-block rounded border border-emerald-300/30 bg-emerald-100 px-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                        {customVal || `{{${varNum}}}`}
                    </span>
                );
            }

            return part;
        });
    };

    const isMediaHeader =
        headerType === 'IMAGE' ||
        headerType === 'VIDEO' ||
        headerType === 'DOCUMENT';

    const effectiveMediaType = headerMediaType ?? (isMediaHeader ? headerType : undefined);

    return (
        <div
            className={cn(
                'relative mx-auto flex w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-950',
                className,
            )}
        >
            {/* Header info */}
            <div className="absolute top-2 left-3 flex gap-2">
                {category && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-zinc-800">
                        {category}
                    </span>
                )}
                {language && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-zinc-800">
                        {language}
                    </span>
                )}
            </div>

            {/* Chat background simulation */}
            <div className="mt-4 flex w-full flex-col space-y-1.5 rounded-lg border border-[#e1d9cd] bg-[#efeae2] p-4 shadow-inner dark:border-zinc-900 dark:bg-[#0b141a]">
                {/* Chat Bubble */}
                <div className="relative max-w-[90%] self-start overflow-hidden rounded-lg rounded-tl-none border border-t-0 border-zinc-200/50 bg-white text-left text-foreground shadow-sm dark:border-zinc-800/20 dark:bg-[#1f2c34]">
                    {/* ── Media Header ── */}
                    {isMediaHeader && (
                        <>
                            {effectiveMediaType === 'IMAGE' && headerMediaUrl ? (
                                <img
                                    src={headerMediaUrl}
                                    alt="Header media"
                                    className="w-full object-cover"
                                    style={{ maxHeight: '160px' }}
                                />
                            ) : effectiveMediaType === 'IMAGE' ? (
                                /* Placeholder when no image uploaded yet */
                                <div className="flex h-28 w-full flex-col items-center justify-center gap-1.5 bg-zinc-200 dark:bg-zinc-800">
                                    <Image className="h-7 w-7 text-zinc-400" />
                                    <span className="text-[10px] text-zinc-400">
                                        Image preview
                                    </span>
                                </div>
                            ) : null}

                            {effectiveMediaType === 'VIDEO' && headerMediaUrl ? (
                                <div className="relative flex h-28 w-full items-center justify-center bg-zinc-900">
                                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                    <video
                                        src={headerMediaUrl}
                                        className="h-full w-full object-cover opacity-60"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                                            <Film className="h-5 w-5 text-zinc-800" />
                                        </div>
                                    </div>
                                </div>
                            ) : effectiveMediaType === 'VIDEO' ? (
                                <div className="flex h-28 w-full flex-col items-center justify-center gap-1.5 bg-zinc-200 dark:bg-zinc-800">
                                    <Film className="h-7 w-7 text-zinc-400" />
                                    <span className="text-[10px] text-zinc-400">
                                        Video preview
                                    </span>
                                </div>
                            ) : null}

                            {effectiveMediaType === 'DOCUMENT' && (
                                <div className="flex items-center gap-2.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800/50">
                                    <div className="flex h-9 w-9 items-center justify-center rounded bg-rose-100 dark:bg-rose-900/30">
                                        <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-semibold text-foreground">
                                            Document
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            PDF / DOC / DOCX
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Bubble Content ── */}
                    <div className="p-3">
                        {/* Text Header */}
                        {headerType === 'TEXT' && headerText && (
                            <div className="mb-1 text-sm font-bold text-foreground">
                                {replaceVariables(headerText)}
                            </div>
                        )}

                        {/* Body */}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                            {bodyText ? (
                                replaceVariables(bodyText)
                            ) : (
                                <span className="text-zinc-400 italic">
                                    Enter template body text...
                                </span>
                            )}
                        </div>

                        {/* Footer */}
                        {footerText && (
                            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {replaceVariables(footerText)}
                            </div>
                        )}

                        {/* Time Stamp */}
                        <div className="mt-1 text-right font-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                            {new Date().toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                </div>

                {/* Buttons (drawn as separate elements below/attached to the bubble, like standard WhatsApp Templates) */}
                {buttons && buttons.length > 0 && (
                    <div className="flex w-full max-w-[90%] flex-col gap-1 self-start">
                        {buttons.map((btn, index) => (
                            <div
                                key={index}
                                className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200/50 bg-white px-3 py-2 text-center text-xs font-semibold text-sky-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800/20 dark:bg-[#1f2c34] dark:text-sky-400 dark:hover:bg-zinc-800/50"
                            >
                                {btn.type === 'QUICK_REPLY' && (
                                    <CornerDownLeft className="mr-1.5 h-3 w-3 shrink-0" />
                                )}
                                {btn.type === 'PHONE_NUMBER' && (
                                    <Phone className="mr-1.5 h-3 w-3 shrink-0" />
                                )}
                                {btn.type === 'URL' && (
                                    <ExternalLink className="mr-1.5 h-3 w-3 shrink-0" />
                                )}
                                {btn.text || 'Button'}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
