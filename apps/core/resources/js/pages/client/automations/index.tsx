import { Head, Link, router } from '@inertiajs/react';
import {
    Edit2,
    Pause,
    Play,
    Plus,
    Trash2,
    Workflow,
    Bot,
    HelpCircle,
    UserCheck,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    create as createAutomation,
    destroy as destroyAutomation,
    edit as editAutomation,
    toggle as toggleAutomation,
} from '@/routes/client/automations';

import type { AutomationFlow } from './flow-builder';

interface AutomationsIndexProps {
    flows: AutomationFlow[];
    activeStrategy?: 'lead_qualifier' | 'faq_responder' | 'pure_manual';
}

export default function AutomationsIndex({
    flows,
    activeStrategy = 'lead_qualifier',
}: AutomationsIndexProps) {
    const [updatingStrategy, setUpdatingStrategy] = React.useState(false);

    const handleSelectStrategy = (
        strategy: 'lead_qualifier' | 'faq_responder' | 'pure_manual',
    ) => {
        if (strategy === activeStrategy || updatingStrategy) {
return;
}

        setUpdatingStrategy(true);
        router.put(
            '/dashboard/automations/strategy',
            { strategy },
            {
                onSuccess: () => {
                    toast.success('Active automation strategy updated!');
                },
                onFinish: () => {
                    setUpdatingStrategy(false);
                },
            },
        );
    };

    const handleToggleFlow = (id: string | number) => {
        router.put(
            toggleAutomation.url(id),
            {},
            {
                onSuccess: () =>
                    toast.success('Flow status updated successfully!'),
            },
        );
    };

    const handleDeleteFlow = (flow: AutomationFlow) => {
        if (
            confirm(`Are you sure you want to delete the flow "${flow.name}"?`)
        ) {
            router.delete(destroyAutomation.url(flow.id), {
                onSuccess: () => toast.success('Flow deleted successfully!'),
            });
        }
    };

    return (
        <>
            <Head title="Automation Flows & AI Strategy" />

            <div
                className="mx-auto flex max-w-7xl flex-col gap-8 px-1 py-2 text-left"
                dir="ltr"
            >
                {/* Header */}
                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
                            <Workflow className="h-4 w-4" />
                            <span>RAVISN Automation Control</span>
                        </div>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                            Master Strategy & Workflow Builder
                        </h1>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                            asChild
                            className="gap-2 bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/20"
                        >
                            <Link href={createAutomation.url()}>
                                <Plus className="h-4 w-4" />
                                <span>New Custom Flow</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* PART 1: UI AUTOMATION STRATEGY CONTROL (THE 3 CARDS) */}
                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-500" />
                                <h2 className="text-base font-bold text-foreground">
                                    AUTOMATION SECTION: ACTIVE STRATEGY
                                </h2>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Select the active master AI strategy injected into incoming WhatsApp webhooks.
                            </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                            Strategy Variable: <code className="font-mono text-emerald-600 dark:text-emerald-400">{activeStrategy}</code>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* CARD 1: LEAD QUALIFIER */}
                        <div
                            className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                                activeStrategy === 'lead_qualifier'
                                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md'
                                    : 'border-border bg-card hover:border-border/80'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-950/60">
                                        <Bot className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                                    </div>
                                    {activeStrategy === 'lead_qualifier' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>ACTIVE 🟢</span>
                                        </span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={updatingStrategy}
                                            onClick={() =>
                                                handleSelectStrategy('lead_qualifier')
                                            }
                                            className="h-8 text-xs font-semibold"
                                        >
                                            SELECT
                                        </Button>
                                    )}
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-foreground">
                                    CARD 1: LEAD QUALIFIER
                                </h3>
                                <p className="mt-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    [2-Turn Qualify & Handover]
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                    Qualifies incoming leads in 2 turns, captures business details, offers a free consultation, and triggers human handover upon confirmation.
                                </p>
                            </div>
                        </div>

                        {/* CARD 2: FAQ RESPONDER */}
                        <div
                            className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                                activeStrategy === 'faq_responder'
                                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md'
                                    : 'border-border bg-card hover:border-border/80'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="rounded-lg bg-sky-100 p-2.5 dark:bg-sky-950/60">
                                        <HelpCircle className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                                    </div>
                                    {activeStrategy === 'faq_responder' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>ACTIVE 🟢</span>
                                        </span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={updatingStrategy}
                                            onClick={() =>
                                                handleSelectStrategy('faq_responder')
                                            }
                                            className="h-8 text-xs font-semibold"
                                        >
                                            SELECT
                                        </Button>
                                    )}
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-foreground">
                                    CARD 2: FAQ RESPONDER
                                </h3>
                                <p className="mt-1 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                                    [Knowledge Base Only]
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                    Answers client questions strictly using RAVISN's embedded Knowledge Base. Zero sales push, zero lead capture, strict zero-pricing policy.
                                </p>
                            </div>
                        </div>

                        {/* CARD 3: PURE MANUAL MODE */}
                        <div
                            className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                                activeStrategy === 'pure_manual'
                                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md'
                                    : 'border-border bg-card hover:border-border/80'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950/60">
                                        <UserCheck className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                                    </div>
                                    {activeStrategy === 'pure_manual' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>ACTIVE 🟢</span>
                                        </span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={updatingStrategy}
                                            onClick={() =>
                                                handleSelectStrategy('pure_manual')
                                            }
                                            className="h-8 text-xs font-semibold"
                                        >
                                            SELECT
                                        </Button>
                                    )}
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-foreground">
                                    CARD 3: PURE MANUAL MODE
                                </h3>
                                <p className="mt-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                    [AI Completely Disabled]
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                    Completely bypasses AI generation for all incoming messages. All customer discussions are stored strictly for human staff in Live Chat.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Builder Flows Table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="text-sm font-bold text-foreground">
                            Visual Interactive Flows ({flows.length})
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="border-b bg-muted/40 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-right">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {flows.map((flow) => (
                                    <tr
                                        key={flow.id}
                                        className="bg-card transition hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-foreground">
                                                {flow.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    className="h-8 gap-1.5 px-2.5"
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleToggleFlow(flow.id)
                                                    }
                                                >
                                                    {flow.is_active ? (
                                                        <Pause className="h-3.5 w-3.5 text-amber-500" />
                                                    ) : (
                                                        <Play className="h-3.5 w-3.5 text-primary" />
                                                    )}
                                                    <span className="hidden sm:inline">
                                                        {flow.is_active
                                                            ? 'Pause'
                                                            : 'Activate'}
                                                    </span>
                                                </Button>
                                                <Button
                                                    asChild
                                                    className="h-8 gap-1.5 px-2.5"
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={editAutomation.url(
                                                            flow.id,
                                                        )}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">
                                                            Edit
                                                        </span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    className="h-8 px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleDeleteFlow(flow)
                                                    }
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {flows.length === 0 && (
                        <div className="border-t border-border bg-card p-14 text-center">
                            <Workflow className="mx-auto mb-4 h-12 w-12 text-primary opacity-80" />
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                No interactive flows created yet
                            </h2>
                            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted-foreground">
                                Create interactive keyword flows or visual graph workflows to complement your master AI strategy.
                            </p>
                            <Button
                                asChild
                                className="mt-6 gap-2 bg-primary text-white shadow-lg shadow-primary/15 hover:bg-primary/95"
                            >
                                <Link href={createAutomation.url()}>
                                    <Plus className="h-4 w-4" />
                                    <span>Create Flow</span>
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

AutomationsIndex.layout = (page: React.ReactNode) => page;
