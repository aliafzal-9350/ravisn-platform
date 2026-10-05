import { Head } from '@inertiajs/react';
import {
    Activity,
    Bot,
    CheckCircle2,
    Clock,
    Cpu,
    Database,
    Flame,
    Layers,
    PlaySquare,
    RotateCcw,
    Send,
    Shield,
    TrendingUp,
    User,
    Zap,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MessageItem {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    provider?: string;
}

interface SimulatorTelemetry {
    intent: string | null;
    provider_route: string | null;
    telemetry: {
        inference_ms: number | null;
        total_ms: number | null;
        prompt_tokens: number | null;
        completion_tokens: number | null;
    };
    lead_score: { score: number | null; category: string | null } | null;
}

/** Shown wherever the AI engine has not reported a value yet. */
const NONE = '—';

const GREETING = 'Send a message to test how your AI agent answers customers, using your knowledge base and Prompt Tuning settings.';

interface SimulatorProps {
    initialConfig: {
        channel: string;
        rag_enabled: boolean;
    };
    samplePrompts: string[];
}

export default function SimulatorIndex({ initialConfig, samplePrompts = [] }: SimulatorProps) {
    const [selectedChannel, setSelectedChannel] = React.useState<'whatsapp' | 'instagram' | 'messenger'>('whatsapp');
    const [messages, setMessages] = React.useState<MessageItem[]>([
        {
            id: '1',
            role: 'assistant',
            content: GREETING,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ]);
    const [inputText, setInputText] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [lastTelemetry, setLastTelemetry] = React.useState<SimulatorTelemetry | null>(null);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (customText?: string) => {
        const textToSend = (customText || inputText).trim();
        if (!textToSend || isLoading) return;

        const userMsg: MessageItem = {
            id: String(Date.now()),
            role: 'user',
            content: textToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const res = await fetch('/dashboard/simulator/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    message: textToSend,
                    channel: selectedChannel,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const botMsg: MessageItem = {
                    id: String(Date.now() + 1),
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    provider: data.provider_route ?? undefined,
                };
                setMessages((prev) => [...prev, botMsg]);
                setLastTelemetry(data);
            } else {
                const error = await res.json().catch(() => null);
                toast.error(error?.message ?? 'The AI engine could not answer this message.');
            }
        } catch {
            toast.error('Failed to communicate with simulator service.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([
            {
                id: '1',
                role: 'assistant',
                content: GREETING,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
        ]);
        setLastTelemetry(null);
        toast.info('Conversation history reset.');
    };

    return (
        <>
            <Head title="AI Simulator & Playground - RAVISN" />

            <div className="mx-auto flex max-w-7xl flex-col gap-5 px-1 py-1 text-left">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                            <PlaySquare className="h-4 w-4" />
                            <span>Autonomous Agent Sandbox</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                            AI Reasoning Simulator
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Test multi-turn customer dialogues, intent classification, and real-time AI responses before live customer deployment.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="gap-1.5 text-xs border-border shadow-xs"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset Dialogue</span>
                        </Button>
                    </div>
                </div>

                {/* Main 2-Column Sandbox Layout */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column: Interactive Chat Stream (7 cols) */}
                    <div className="flex flex-col gap-3 lg:col-span-7">
                        <Card className="flex flex-col h-[580px] border-border/80 bg-card overflow-hidden shadow-xs">
                            {/* Simulator Chat Header */}
                            <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                        <Bot className="size-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-foreground flex items-center gap-2">
                                            <span>Interactive Customer Stream</span>
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/40 text-[9px] px-1.5 py-0">
                                                Live Sandbox
                                            </Badge>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Channel: <span className="font-semibold uppercase">{selectedChannel}</span> &bull; Failover Route: <span className="font-mono">Groq → Gemini → xAI → OpenAI</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Channel Selector */}
                                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                                    {(['whatsapp', 'instagram', 'messenger'] as const).map((ch) => (
                                        <button
                                            key={ch}
                                            onClick={() => setSelectedChannel(ch)}
                                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize transition-all ${
                                                selectedChannel === ch
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {ch}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 text-xs bg-background/50">
                                {messages.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col max-w-[85%] ${
                                                isUser ? 'self-end items-end' : 'self-start items-start'
                                            }`}
                                        >
                                            <div
                                                className={`rounded-2xl px-4 py-2.5 leading-relaxed text-xs ${
                                                    isUser
                                                        ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                                                        : 'bg-card text-foreground border border-border/80 rounded-bl-none shadow-xs'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-muted-foreground">
                                                <span>{msg.timestamp}</span>
                                                {msg.provider && (
                                                    <>
                                                        <span>&bull;</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{msg.provider}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {isLoading && (
                                    <div className="self-start flex items-center gap-2 rounded-2xl bg-card border border-border/80 px-4 py-2 text-xs text-muted-foreground">
                                        <div className="flex gap-1">
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                        <span>AI reasoning and retrieving knowledge...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Sample Chips */}
                            <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex flex-col gap-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">Quick Test Inquiries:</span>
                                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                    {samplePrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(prompt)}
                                            disabled={isLoading}
                                            className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-colors"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Composer Input */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="p-3 border-t border-border bg-card flex items-center gap-2"
                            >
                                <Input
                                    placeholder="Type customer message to test AI reasoning..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    disabled={isLoading}
                                    className="text-xs bg-background border-border"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isLoading || !inputText.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-4"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </Card>
                    </div>

                    {/* Right Column: Clean Telemetry & Insights (5 cols) */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        {/* 1. Classification & Route */}
                        <Card className="border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                        <Zap className="h-4 w-4" />
                                        <span>Intent & Route Selection</span>
                                    </div>
                                </div>
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Inferred Intent Classification
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-3 text-xs">
                                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
                                    <span className="text-muted-foreground font-medium">Detected Intent</span>
                                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold text-foreground border-border">
                                        {lastTelemetry?.intent?.replace('_', ' ') ?? NONE}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
                                    <span className="text-muted-foreground font-medium">Active AI Provider</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                                        {lastTelemetry?.provider_route ?? NONE}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Latency & Token Telemetry */}
                        <Card className="border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                                    <Activity className="h-4 w-4" />
                                    <span>Latency & Tokens Breakdown</span>
                                </div>
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Performance Telemetry
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="grid grid-cols-2 gap-2.5 text-xs">
                                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Turnaround</span>
                                    <span className="text-lg font-black text-foreground mt-0.5">
                                        {lastTelemetry?.telemetry?.total_ms != null ? `${lastTelemetry.telemetry.total_ms} ms` : NONE}
                                    </span>
                                </div>

                                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tokens (In / Out)</span>
                                    <span className="text-lg font-black text-foreground mt-0.5">
                                        {lastTelemetry?.telemetry?.prompt_tokens ?? NONE} / {lastTelemetry?.telemetry?.completion_tokens ?? NONE}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Lead Score Impact */}
                        <Card className="border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>Lead Qualification</span>
                                </div>
                                <CardTitle className="text-sm font-bold text-foreground">
                                    Lead Score Dynamics
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground font-medium">Lead Score</span>
                                    <span className="font-bold text-foreground">
                                        {lastTelemetry?.lead_score?.score != null ? `${lastTelemetry.lead_score.score} / 100` : NONE}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground font-medium">Classification</span>
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                        {lastTelemetry?.lead_score?.category ?? NONE}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
