import { Head, router } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Check,
    CheckCircle2,
    Code,
    Cpu,
    HelpCircle,
    Info,
    Layers,
    Play,
    PlaySquare,
    Save,
    Send,
    Shield,
    Sliders,
    Tag,
    Zap,
    RotateCcw,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Preset {
    id: string;
    name: string;
    description: string;
    tone: string;
    prompt: string;
}

interface Variable {
    key: string;
    description: string;
}

interface PromptTuningProps {
    config: {
        system_prompt: string;
        ai_tone: string;
        prohibited_topics: string;
        temperature: number;
        active_preset?: string;
    };
    presets: Preset[];
    variables: Variable[];
}

export default function PromptTuningIndex({ config, presets = [], variables = [] }: PromptTuningProps) {
    const [systemPrompt, setSystemPrompt] = React.useState(config.system_prompt || '');
    const [aiTone, setAiTone] = React.useState(config.ai_tone || 'professional_consultative');
    const [prohibitedTopics, setProhibitedTopics] = React.useState(config.prohibited_topics || '');
    const [temperature, setTemperature] = React.useState(config.temperature ?? 0.3);
    const [activePreset, setActivePreset] = React.useState(config.active_preset || 'sales_specialist');
    const [isSaving, setIsSaving] = React.useState(false);

    // Live embedded simulation state
    const [testQuery, setTestQuery] = React.useState('');
    const [simLoading, setSimLoading] = React.useState(false);
    const [simResponse, setSimResponse] = React.useState<any>(null);

    const promptTextareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleApplyPreset = (preset: Preset) => {
        setActivePreset(preset.id);
        setSystemPrompt(preset.prompt);
        setAiTone(preset.tone);
        toast.info(`Applied "${preset.name}" preset template`);
    };

    const handleInsertVariable = (variableKey: string) => {
        const textarea = promptTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = systemPrompt;

        const updated = currentVal.substring(0, start) + variableKey + currentVal.substring(end);
        setSystemPrompt(updated);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
        }, 0);

        toast.success(`Inserted ${variableKey}`);
    };

    const handleSaveDirectives = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.post('/dashboard/prompt-tuning', {
            system_prompt: systemPrompt,
            ai_tone: aiTone,
            prohibited_topics: prohibitedTopics,
            temperature: parseFloat(temperature.toString()),
            active_preset: activePreset,
        }, {
            onSuccess: () => toast.success('Prompt directives saved and synchronized across all LangGraph workers.'),
            onFinish: () => setIsSaving(false),
        });
    };

    const handleLiveSimulate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testQuery.trim() || simLoading) return;

        setSimLoading(true);
        try {
            const res = await fetch('/dashboard/simulator/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    message: testQuery,
                    channel: 'whatsapp',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setSimResponse(data);
                toast.success('Live AI prompt execution completed');
            } else {
                toast.error('Simulation execution failed.');
            }
        } catch {
            toast.error('Failed to run prompt simulation.');
        } finally {
            setSimLoading(false);
        }
    };

    return (
        <>
            <Head title="System Prompt Tuning & Live Tester" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-1 py-1 text-left">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                            <Sliders className="h-4 w-4" />
                            <span>Autonomous Agent Directives</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                            System Prompt & Persona Tuning
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Tune persona, tone guidelines, prohibited subjects, and test prompts live with real-time AI execution.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveDirectives}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                            <Save className="h-4 w-4" />
                            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left 7 Cols: Prompt Editor & Hyperparameters */}
                    <div className="flex flex-col gap-5 lg:col-span-7">
                        {/* Persona Presets */}
                        <Card className="border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-foreground">
                                    Quick-Apply Persona Presets
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    {presets.map((preset) => (
                                        <div
                                            key={preset.id}
                                            onClick={() => handleApplyPreset(preset)}
                                            className={`flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                                                activePreset === preset.id
                                                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                                    : 'border-border/80 bg-card hover:bg-muted/40'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground">{preset.name}</span>
                                                    {activePreset === preset.id && (
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[10px] text-muted-foreground leading-normal line-clamp-2">
                                                    {preset.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Master System Prompt */}
                        <Card className="border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xs font-bold text-foreground">
                                            System Instructions & Master Directives
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40 text-[10px]">
                                        Active in LangGraph
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-2.5">
                                {/* Variable Insertion Chips */}
                                <div>
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mb-1">
                                        <Code className="h-3 w-3" />
                                        <span>Click to insert dynamic variable:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {variables.map((v) => (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onClick={() => handleInsertVariable(v.key)}
                                                className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-colors"
                                                title={v.description}
                                            >
                                                <span>{v.key}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Textarea
                                    ref={promptTextareaRef}
                                    rows={10}
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="font-mono text-xs leading-relaxed bg-background/50 border-border"
                                    placeholder="Enter system prompt directives..."
                                />
                            </CardContent>
                        </Card>

                        {/* Hyperparameters & Prohibited Topics Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Card className="border-border/80 bg-card shadow-xs">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-foreground">Hyperparameters</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3 text-xs">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">Temperature</Label>
                                            <span className="font-mono text-xs font-bold text-emerald-600">{temperature}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            className="w-full accent-emerald-600"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs">Conversational Tone</Label>
                                        <select
                                            value={aiTone}
                                            onChange={(e) => setAiTone(e.target.value)}
                                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                        >
                                            <option value="professional_consultative">Professional & Consultative</option>
                                            <option value="persuasive_confident">Persuasive & Confident</option>
                                            <option value="empathetic_direct">Empathetic & Direct</option>
                                            <option value="friendly_efficient">Friendly & High-Efficiency</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/80 bg-card shadow-xs">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5 text-rose-500" />
                                        <CardTitle className="text-xs font-bold text-foreground">Prohibited Topics</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        rows={4}
                                        value={prohibitedTopics}
                                        onChange={(e) => setProhibitedTopics(e.target.value)}
                                        className="text-xs bg-background/50 border-border"
                                        placeholder="e.g. Competitor pricing, politics, personal opinions"
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right 5 Cols: EMBEDDED LIVE SIMULATOR TESTER */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        <Card className="flex flex-col h-full border-border/80 bg-card shadow-xs">
                            <CardHeader className="pb-3 border-b border-border/80">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                            <PlaySquare className="size-3.5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-bold text-foreground">
                                                Live Prompt Simulator
                                            </CardTitle>
                                            <CardDescription className="text-[10px]">
                                                Test responses against current prompt & RAG
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/40 text-[9px]">
                                        Real-time
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 text-xs">
                                {simResponse ? (
                                    <div className="flex flex-col gap-3">
                                        {/* User prompt bubble */}
                                        <div className="self-end rounded-2xl bg-emerald-600 px-3.5 py-2 text-white text-xs max-w-[90%]">
                                            {testQuery}
                                        </div>

                                        {/* AI response bubble */}
                                        <div className="self-start rounded-2xl bg-muted/60 border border-border/80 p-3 text-foreground text-xs leading-relaxed max-w-[95%]">
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 pb-1 border-b border-border/60">
                                                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                                    <Bot className="h-3 w-3" />
                                                    <span>{simResponse.provider_route}</span>
                                                </span>
                                                <span>{simResponse.telemetry?.total_ms ?? 180} ms</span>
                                            </div>
                                            <p>{simResponse.response}</p>
                                        </div>

                                        {/* Telemetry info card */}
                                        <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-[11px] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Intent:</span>
                                                <Badge className="bg-emerald-600 text-white font-mono text-[9px]">
                                                    {simResponse.intent}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Lead Score Impact:</span>
                                                <span className="font-bold text-foreground">
                                                    +{simResponse.lead_score_impact?.delta} (Score: {simResponse.lead_score_impact?.new_score})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                                        <Bot className="h-8 w-8 text-muted-foreground/40" />
                                        <span>Type a customer inquiry below to test this prompt in real time.</span>
                                    </div>
                                )}
                            </CardContent>

                            {/* Simulation Input */}
                            <form onSubmit={handleLiveSimulate} className="p-3 border-t border-border flex items-center gap-2 bg-muted/10">
                                <Input
                                    placeholder="Type customer message to test prompt..."
                                    value={testQuery}
                                    onChange={(e) => setTestQuery(e.target.value)}
                                    disabled={simLoading}
                                    className="text-xs border-border bg-background"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={simLoading || !testQuery.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
