import * as React from 'react';
import {
    Check,
    CheckCheck,
    ChevronDown,
    Download,
    Eye,
    FileText,
    Lock,
    Mic,
    Pause,
    Play,
    Volume2,
    X,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ThreadMessage } from './MessageThread';

// Turns 'general_inquiry' into 'General inquiry' for display.
function formatIntentLabel(intent: string): string {
    const spaced = intent.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface MessageBubbleProps {
    message: ThreadMessage;
}

// Pre-defined waveform bar heights for realistic voice note visualization
const WAVEFORM_HEIGHTS = [
    8, 16, 24, 12, 18, 28, 20, 14, 26, 30, 22, 10, 18, 24, 16, 22, 28, 14, 10, 18, 26, 32, 20, 14, 18, 22, 12, 8,
];

export function MessageBubble({ message }: MessageBubbleProps) {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackProgress, setPlaybackProgress] = React.useState(0);
    const [currentTime, setCurrentTime] = React.useState('0:00');
    const [duration, setDuration] = React.useState('0:00');
    const [showEmbedPdf, setShowEmbedPdf] = React.useState(false);
    const [showLightbox, setShowLightbox] = React.useState(false);
    const [showReasoning, setShowReasoning] = React.useState(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const isInbound = message.direction === 'inbound';
    const isNote = message.message_type === 'note';
    const isAudio = message.message_type === 'audio' || message.message_type === 'voice';
    const isImage =
        message.message_type === 'image' ||
        Boolean(message.media_url && /\.(jpe?g|png|webp|gif)$/i.test(message.media_url));
    const isPdf =
        message.message_type === 'document' ||
        message.media_mime_type === 'application/pdf' ||
        Boolean(message.media_url && /\.pdf$/i.test(message.media_url));

    const timeString =
        message.formatted_time ||
        (message.created_at
            ? new Date(message.created_at).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
              })
            : '');

    // Format seconds to mm:ss
    const formatTime = (secs: number) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Toggle voice note playback
    const togglePlay = () => {
        // No audio yet (still being copied from WhatsApp): nothing to play.
        if (!audioRef.current) {
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handleAudioTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            setCurrentTime(formatTime(current));
            if (dur && !isNaN(dur)) {
                setDuration(formatTime(dur));
                setPlaybackProgress((current / dur) * 100);
            }
        }
    };

    const handleAudioLoadedMetadata = () => {
        if (audioRef.current && audioRef.current.duration) {
            setDuration(formatTime(audioRef.current.duration));
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        setCurrentTime('0:00');
    };

    // WhatsApp-Style Read Receipt Status Icon
    const renderStatusTicks = () => {
        if (isInbound || isNote) return null;

        const status = message.status?.toLowerCase() || 'sent';

        switch (status) {
            case 'read':
                // Double blue ticks (WhatsApp #3B82F6)
                return (
                    <span title="Read" className="inline-flex items-center text-[#3B82F6] transition-colors">
                        <CheckCheck className="h-3.5 w-3.5 stroke-[2.2]" />
                    </span>
                );
            case 'delivered':
                // Double grey ticks
                return (
                    <span title="Delivered" className="inline-flex items-center text-slate-400 dark:text-slate-500 transition-colors">
                        <CheckCheck className="h-3.5 w-3.5 stroke-[2]" />
                    </span>
                );
            case 'sent':
            default:
                // Single grey tick
                return (
                    <span title="Sent to Meta" className="inline-flex items-center text-slate-400 dark:text-slate-500 transition-colors">
                        <Check className="h-3.5 w-3.5 stroke-[2]" />
                    </span>
                );
        }
    };

    const transcriptText = message.whisper_transcript || (isAudio ? message.content : null);

    return (
        <div
            className={`flex flex-col w-full ${
                isNote
                    ? 'items-center my-3'
                    : isInbound
                    ? 'items-start'
                    : 'items-end'
            }`}
        >
            {/* 1. Internal Staff Note Card */}
            {isNote ? (
                <div className="w-full max-w-lg rounded-2xl p-4 bg-amber-50/95 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 text-amber-950 dark:text-amber-100 shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/70 dark:border-amber-800/50">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Internal Staff Note</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                            Staff Only · Not Sent to Customer
                        </span>
                    </div>

                    <p className="text-xs leading-relaxed whitespace-pre-line break-words text-amber-950 dark:text-amber-100">
                        {message.content}
                    </p>

                    <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-amber-700/80 dark:text-amber-400/80">
                        <span>{timeString}</span>
                    </div>
                </div>
            ) : (
                /* 2. Standard Chat Bubble (Inbound or Outbound) */
                <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 shadow-xs text-xs leading-relaxed border transition-all ${
                        isInbound
                            ? 'rounded-tl-sm bg-[#FFFFFF] dark:bg-[#131B2E] border-[#E2E8F0] dark:border-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC]'
                            : 'rounded-tr-sm bg-[#F0FDFA] dark:bg-teal-950/40 border-[#99F6E4] dark:border-teal-800/80 text-[#0F172A] dark:text-[#F8FAFC]'
                    }`}
                >
                    {!message.media_url && (isImage || isPdf || isAudio) && (
                        <p className="mb-2 text-[11px] italic text-muted-foreground">
                            {isAudio ? 'Voice note is being fetched…' : 'Attachment is being fetched…'}
                        </p>
                    )}

                    {/* A. Image Payload */}
                    {isImage && message.media_url && (
                        <div className="mb-2.5 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 group relative">
                            <img
                                src={message.media_url}
                                alt="Shared image attachment"
                                className="w-full max-h-72 object-cover transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer"
                                onClick={() => setShowLightbox(true)}
                                loading="lazy"
                            />
                            <button
                                type="button"
                                onClick={() => setShowLightbox(true)}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-xs cursor-pointer"
                                title="Enlarge image"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    {/* B. PDF / Document Payload */}
                    {isPdf && message.media_url && (
                        <div className="mb-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {message.content || 'Document Attachment.pdf'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            PDF Document · Ready to View
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmbedPdf(!showEmbedPdf)}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                                        title={showEmbedPdf ? 'Hide preview' : 'Quick preview'}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <a
                                        href={message.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                                        title="Download PDF"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Inline Embed Preview */}
                            {showEmbedPdf && (
                                <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-64 w-full animate-in fade-in duration-200">
                                    <embed
                                        src={message.media_url}
                                        type="application/pdf"
                                        className="w-full h-full"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* C. Voice Note / Audio Waveform Player */}
                    {isAudio && (
                        <div className="mb-2">
                            {message.media_url && (
                                <audio
                                    ref={audioRef}
                                    src={message.media_url}
                                    onTimeUpdate={handleAudioTimeUpdate}
                                    onLoadedMetadata={handleAudioLoadedMetadata}
                                    onEnded={handleAudioEnded}
                                    preload="metadata"
                                    className="hidden"
                                />
                            )}

                            {/* Custom Waveform Component */}
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    disabled={!message.media_url}
                                    aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-xs cursor-pointer shrink-0 ${
                                        isPlaying
                                            ? 'bg-emerald-700 dark:bg-emerald-600'
                                            : 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700'
                                    }`}
                                    title={isPlaying ? 'Pause' : 'Play voice note'}
                                >
                                    {isPlaying ? (
                                        <Pause className="h-4 w-4 fill-current" />
                                    ) : (
                                        <Play className="h-4 w-4 fill-current ml-0.5" />
                                    )}
                                </button>

                                {/* Waveform Visualizer Bars */}
                                <div className="flex-1 flex items-center gap-0.5 sm:gap-1 h-8 overflow-hidden">
                                    {WAVEFORM_HEIGHTS.map((height, idx) => {
                                        const barProgress = (idx / WAVEFORM_HEIGHTS.length) * 100;
                                        const isPlayed = barProgress <= playbackProgress;

                                        return (
                                            <div
                                                key={idx}
                                                style={{ height: `${height}px` }}
                                                className={`w-1 rounded-full transition-colors duration-150 ${
                                                    isPlayed
                                                        ? 'bg-emerald-600 dark:bg-emerald-400'
                                                        : 'bg-slate-300 dark:bg-slate-700'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Audio Duration Counter */}
                                <span className="text-[11px] font-mono text-muted-foreground shrink-0 select-none">
                                    {isPlaying ? currentTime : duration !== '0:00' ? duration : '--:--'}
                                </span>
                            </div>

                            {/* Groq Whisper ASR Transcript Container */}
                            {transcriptText && (
                                <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-950 dark:text-emerald-100 shadow-xs animate-in fade-in duration-200">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                                        <Mic className="h-3 w-3 stroke-[2.2]" />
                                        <span>Transcribed by Whisper ASR</span>
                                    </div>
                                    <p className="text-xs leading-relaxed italic text-foreground/90 break-words">
                                        "{transcriptText}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* D. Standard Text Body (for non-audio or text with image caption) */}
                    {!isAudio && message.content && (
                        <p className="break-words whitespace-pre-line leading-relaxed">
                            {message.content}
                        </p>
                    )}

                    {/* E. Collapsible AI Reasoning Trace — matched intent, model latency,
                        and the specific RAG chunk cited for this response. */}
                    {message.is_ai_generated && (message.detected_intent || message.telemetry) && (
                        <Collapsible open={showReasoning} onOpenChange={setShowReasoning} className="mt-2">
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                                >
                                    <span>AI Reasoning</span>
                                    <ChevronDown
                                        className={`h-3 w-3 shrink-0 transition-transform duration-200 ${showReasoning ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 text-[11px] leading-relaxed text-foreground/80 space-y-1 animate-in fade-in duration-150">
                                {message.detected_intent && (
                                    <p>
                                        <span className="font-medium text-foreground/60">Intent:</span>{' '}
                                        {formatIntentLabel(message.detected_intent)}
                                    </p>
                                )}
                                {(message.ai_model || message.latency_ms != null) && (
                                    <p>
                                        <span className="font-medium text-foreground/60">Model:</span>{' '}
                                        {message.ai_model || 'Unknown'}
                                        {message.latency_ms != null ? ` · ${message.latency_ms}ms` : ''}
                                    </p>
                                )}
                                {message.confidence_score != null && (
                                    <p>
                                        <span className="font-medium text-foreground/60">Confidence:</span>{' '}
                                        {Math.round(message.confidence_score * 100)}%
                                    </p>
                                )}
                                {message.telemetry?.crag_quality && (
                                    <p>
                                        <span className="font-medium text-foreground/60">Knowledge match:</span>{' '}
                                        {message.telemetry.crag_quality}
                                    </p>
                                )}
                                {message.telemetry?.guardrail_triggered && (
                                    <p className="text-amber-700 dark:text-amber-400">
                                        Guardrail triggered on this response.
                                    </p>
                                )}
                                {message.rag_chunk && (
                                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
                                        <p className="font-medium text-foreground/60">
                                            Cited: {message.rag_chunk.title || message.rag_chunk.source || 'Knowledge base entry'}
                                        </p>
                                        {message.rag_chunk.snippet && (
                                            <p className="mt-0.5 italic text-foreground/70 break-words">
                                                "{message.rag_chunk.snippet}"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Footer: Timestamp & WhatsApp Status Checkmarks */}
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-muted-foreground select-none">
                        <span>{timeString}</span>
                        {renderStatusTicks()}
                    </div>
                </div>
            )}

            {/* Lightbox Modal for Image Preview */}
            {showLightbox && message.media_url && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        type="button"
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                        title="Close preview"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={message.media_url}
                        alt="Enlarged attachment"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
