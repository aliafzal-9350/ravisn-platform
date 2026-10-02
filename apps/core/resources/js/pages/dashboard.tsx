import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    Camera,
    CheckCheck,
    CheckCircle2,
    Clock,
    Code2,
    DollarSign,
    Inbox,
    Megaphone,
    MessageSquare,
    Plus,
    Send,
    Shield,
    Smartphone,
    TrendingUp,
    Users,
    Wrench,
    Zap,
} from 'lucide-react';
import ClientLayout from '@/layouts/client-layout';
import type { DashboardProps } from '@/types/dashboard';

/** Shown wherever there is no real data yet; never substitute an invented figure. */
const NONE = '—';
const formatCost = (cost: string | null | undefined) => (cost == null ? NONE : `$${cost}`);
const formatRate = (rate: number | null | undefined) => (rate == null ? NONE : `${rate}%`);

export default function Dashboard({
    overview,
    usage = {
        tracked: false,
        marketing: { count: null, cost: null },
        auth: { count: null, cost: null },
        utility: { count: null, cost: null },
        service: { count: null, cost: null },
        total_sent: 0,
        total_cost_usd: null,
    },
    telemetry,
    trends = [],
    recentCampaigns = [],
    liveQueue = [],
}: DashboardProps) {
    const [activeDayIdx, setActiveDayIdx] = useState<number | null>(null);

    // Compute weekly trend aggregates
    const totalOutboundWeek = trends.reduce((acc, d) => acc + (d.outbound_count || 0), 0);
    const totalInboundWeek = trends.reduce((acc, d) => acc + (d.inbound_count || 0), 0);

    const totalContactsCount = telemetry.total_contacts ?? 0;
    const activeThreadsCount = telemetry.open_threads ?? liveQueue.length;

    // Delivery Status donut calculations
    const deliveryRate = telemetry.delivery_rate;
    const failedRate = telemetry.total_sent > 0
        ? Math.max(0, Math.round(((telemetry.total_failed || 0) / telemetry.total_sent) * 100))
        : 0;

    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, deliveryRate ?? 0)) / 100) * circumference;

    // Chart dimensions & spline calculations
    const chartWidth = 700;
    const chartHeight = 190;
    const padLeft = 45;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 35;
    const graphWidth = chartWidth - padLeft - padRight;
    const graphHeight = chartHeight - padTop - padBottom;

    const maxChartVal = Math.max(
        ...trends.map((t) => Math.max(t.outbound_count || 0, t.inbound_count || 0)),
        6
    );

    const nPoints = trends.length || 1;
    const stepX = nPoints > 1 ? graphWidth / (nPoints - 1) : graphWidth;

    const outboundPoints = trends.map((d, i) => ({
        x: padLeft + i * stepX,
        y: padTop + graphHeight - ((d.outbound_count || 0) / maxChartVal) * graphHeight,
        val: d.outbound_count || 0,
        day: d.day || d.date,
        date: d.date,
    }));

    const inboundPoints = trends.map((d, i) => ({
        x: padLeft + i * stepX,
        y: padTop + graphHeight - ((d.inbound_count || 0) / maxChartVal) * graphHeight,
        val: d.inbound_count || 0,
        day: d.day || d.date,
        date: d.date,
    }));

    function getSplinePath(points: Array<{ x: number; y: number }>) {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpx1 = p0.x + (p1.x - p0.x) / 2;
            const cpy1 = p0.y;
            const cpx2 = p0.x + (p1.x - p0.x) / 2;
            const cpy2 = p1.y;
            path += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
        }
        return path;
    }

    const outboundLinePath = getSplinePath(outboundPoints);
    const outboundAreaPath = outboundPoints.length > 0
        ? `${outboundLinePath} L ${outboundPoints[outboundPoints.length - 1].x.toFixed(1)} ${padTop + graphHeight} L ${outboundPoints[0].x.toFixed(1)} ${padTop + graphHeight} Z`
        : '';

    const inboundLinePath = getSplinePath(inboundPoints);
    const inboundAreaPath = inboundPoints.length > 0
        ? `${inboundLinePath} L ${inboundPoints[inboundPoints.length - 1].x.toFixed(1)} ${padTop + graphHeight} L ${inboundPoints[0].x.toFixed(1)} ${padTop + graphHeight} Z`
        : '';

    return (
        <>
            <Head title="Dashboard - RAVISN Platform" />

            <div className="mx-auto max-w-7xl space-y-6 text-left antialiased">
                {/* ============================================================ */}
                {/* EXECUTIVE HEADER                                             */}
                {/* ============================================================ */}
                <header className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Overview of your connected channels, outreach campaigns, and customer conversations.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/dashboard/inbox"
                            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
                        >
                            <Inbox className="h-4 w-4 text-muted-foreground" />
                            <span>Open Inbox</span>
                            {activeThreadsCount > 0 && (
                                <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {activeThreadsCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/dashboard/campaigns/create"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Campaign</span>
                        </Link>
                    </div>
                </header>

                {/* ============================================================ */}
                {/* 4 DIRECT KEY METRIC CARDS                                    */}
                {/* ============================================================ */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card 1: Total Contacts */}
                    <Link
                        href="/dashboard/contacts"
                        className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all hover:border-emerald-500/30 hover:shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground">Total Contacts</span>
                                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                                    {totalContactsCount.toLocaleString()}
                                </h3>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            <span>Audience Directory</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>

                    {/* Card 2: Active Conversations */}
                    <Link
                        href="/dashboard/inbox"
                        className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all hover:border-blue-500/30 hover:shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground">Active Inquiries</span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                        {activeThreadsCount.toLocaleString()}
                                    </h3>
                                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                        Open Threads
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            <span>Omnichannel Inbox</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>

                    {/* Card 3: Outbound Messages Delivered */}
                    <Link
                        href="/dashboard/campaigns"
                        className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all hover:border-teal-500/30 hover:shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground">Messages Sent</span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                        {telemetry.total_sent.toLocaleString()}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {telemetry.delivery_rate == null ? 'No sends yet' : `${telemetry.delivery_rate}% Deliv`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <Send className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            <span>{telemetry.total_delivered.toLocaleString()} confirmed delivered</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>

                    {/* Card 4: Campaigns Overview */}
                    <Link
                        href="/dashboard/campaigns"
                        className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all hover:border-indigo-500/30 hover:shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground">Outreach Campaigns</span>
                                <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                                    {overview.campaigns_count}
                                </h3>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Megaphone className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            <span>Broadcast Outreach</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                </section>

                {/* ============================================================ */}
                {/* WHATSAPP API USAGE (USD) & DELIVERY STATUS                   */}
                {/* ============================================================ */}
                <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left: WhatsApp API Usage (USD) */}
                    <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                                <Code2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-base font-bold text-foreground">WhatsApp API Usage (USD)</h2>
                            </div>

                            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                                {/* 2x2 Category Breakdown */}
                                <div className="md:col-span-2 space-y-3">
                                    <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Category Breakdown
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {/* Marketing */}
                                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-foreground">Marketing</span>
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <Megaphone className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                            <div className="mt-2.5 flex items-baseline gap-1.5">
                                                <span className="text-xl font-bold text-foreground">
                                                    {usage.marketing?.count ?? NONE}
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    ({formatCost(usage.marketing?.cost)})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Auth */}
                                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-foreground">Auth</span>
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                    <Shield className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                            <div className="mt-2.5 flex items-baseline gap-1.5">
                                                <span className="text-xl font-bold text-foreground">
                                                    {usage.auth?.count ?? NONE}
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    ({formatCost(usage.auth?.cost)})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Utility */}
                                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-foreground">Utility</span>
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                    <Wrench className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                            <div className="mt-2.5 flex items-baseline gap-1.5">
                                                <span className="text-xl font-bold text-foreground">
                                                    {usage.utility?.count ?? NONE}
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    ({formatCost(usage.utility?.cost)})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Service */}
                                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-foreground">Service</span>
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    <MessageSquare className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                            <div className="mt-2.5 flex items-baseline gap-1.5">
                                                <span className="text-xl font-bold text-foreground">
                                                    {usage.service?.count ?? NONE}
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    ({formatCost(usage.service?.cost)})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Summary Card */}
                                <div className="md:col-span-1 flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold tracking-wider text-emerald-800 dark:text-emerald-300 uppercase">
                                                SUMMARY
                                            </span>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                                <DollarSign className="h-4 w-4" />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <span className="text-xs font-medium text-muted-foreground">Total Sent</span>
                                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                                {usage.total_sent ?? telemetry.total_sent ?? 0}
                                            </p>
                                        </div>

                                        <div className="mt-3">
                                            <span className="text-xs font-medium text-muted-foreground">Total Cost</span>
                                            <p className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                                {formatCost(usage.total_cost_usd)}
                                            </p>
                                            {!usage.tracked && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Spend appears once messages record their Meta pricing category.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/40">
                                        <a
                                            href="https://developers.facebook.com/docs/whatsapp/pricing"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
                                        >
                                            <Send className="h-3 w-3 rotate-45" />
                                            <span>Meta US Conversation Rates</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Delivery Status & Metrics */}
                    <div className="lg:col-span-1 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/20" />
                                    <h2 className="text-base font-bold text-foreground">Delivery Status</h2>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    {formatRate(deliveryRate)} Rate
                                </span>
                            </div>

                            {/* Donut Chart */}
                            <div className="my-5 flex items-center justify-center">
                                <div className="relative flex items-center justify-center">
                                    <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 120 120">
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r={radius}
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            className="text-muted/30"
                                            fill="transparent"
                                        />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r={radius}
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            strokeLinecap="round"
                                            className="text-emerald-600 dark:text-emerald-500 transition-all duration-500"
                                            fill="transparent"
                                        />
                                    </svg>

                                    <div className="absolute flex flex-col items-center justify-center text-center">
                                        <span className="text-2xl font-black tracking-tight text-foreground">
                                            {formatRate(deliveryRate)}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            SUCCESS
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Delivery Metrics (Consolidated, No Duplication) */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/40">
                                {/* Total Sent */}
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-muted-foreground">Total Sent</span>
                                        <Send className="h-3.5 w-3.5 text-teal-500" />
                                    </div>
                                    <p className="mt-1 text-lg font-bold text-foreground">
                                        {telemetry.total_sent.toLocaleString()}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Outbound sent</span>
                                </div>

                                {/* Total Delivered */}
                                <div className="rounded-xl border border-border/60 border-l-2 border-l-emerald-500 bg-muted/20 p-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-muted-foreground">Delivered</span>
                                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                                    </div>
                                    <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {telemetry.total_delivered.toLocaleString()}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Confirmed ({formatRate(deliveryRate)})</span>
                                </div>

                                {/* Total Received */}
                                <div className="rounded-xl border border-border/60 border-l-2 border-l-blue-500 bg-muted/20 p-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-muted-foreground">Received</span>
                                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                    </div>
                                    <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {telemetry.total_inbound.toLocaleString()}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Inbound replies</span>
                                </div>

                                {/* Failed */}
                                <div className="rounded-xl border border-border/60 border-l-2 border-l-amber-500 bg-muted/20 p-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-muted-foreground">Failed</span>
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    </div>
                                    <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                                        {telemetry.total_failed.toLocaleString()}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Rejected ({failedRate}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================================================ */}
                {/* 7-DAY MESSAGE ACTIVITY (INTERACTIVE DUAL-SPLINE AREA CHART) */}
                {/* ============================================================ */}
                <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center pb-4 border-b border-border/50">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-base font-bold text-foreground">7-Day Message Activity</h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Daily volume of outbound campaigns and inbound customer responses.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                                <span className="text-muted-foreground">Outbound ({totalOutboundWeek})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                                <span className="text-muted-foreground">Inbound ({totalInboundWeek})</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 relative">
                        <svg
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            className="w-full h-48 sm:h-56 overflow-visible"
                        >
                            <defs>
                                <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                </linearGradient>
                                <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                </linearGradient>
                            </defs>

                            {/* Horizontal grid lines & y-axis values */}
                            {[1, 0.5, 0].map((ratio) => {
                                const yPos = padTop + graphHeight * (1 - ratio);
                                const labelVal = Math.round(maxChartVal * ratio);
                                return (
                                    <g key={ratio}>
                                        <line
                                            x1={padLeft}
                                            y1={yPos}
                                            x2={chartWidth - padRight}
                                            y2={yPos}
                                            stroke="currentColor"
                                            strokeDasharray="4 4"
                                            className="text-border/60"
                                        />
                                        <text
                                            x={padLeft - 8}
                                            y={yPos + 3.5}
                                            textAnchor="end"
                                            className="fill-muted-foreground text-[10px] font-mono font-medium select-none"
                                        >
                                            {labelVal}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Area fills */}
                            {outboundAreaPath && (
                                <path d={outboundAreaPath} fill="url(#emeraldAreaGrad)" />
                            )}
                            {inboundAreaPath && (
                                <path d={inboundAreaPath} fill="url(#blueAreaGrad)" />
                            )}

                            {/* Smooth spline stroke lines */}
                            {outboundLinePath && (
                                <path
                                    d={outboundLinePath}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            {inboundLinePath && (
                                <path
                                    d={inboundLinePath}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {/* Data points & X-axis labels */}
                            {trends.map((dayData, idx) => {
                                const outPt = outboundPoints[idx];
                                const inPt = inboundPoints[idx];
                                const isHovered = activeDayIdx === idx;

                                return (
                                    <g
                                        key={dayData.date || idx}
                                        className="cursor-pointer"
                                        onMouseEnter={() => setActiveDayIdx(idx)}
                                        onMouseLeave={() => setActiveDayIdx(null)}
                                    >
                                        {/* Hover dashed vertical line */}
                                        {isHovered && outPt && (
                                            <line
                                                x1={outPt.x}
                                                y1={padTop}
                                                x2={outPt.x}
                                                y2={padTop + graphHeight}
                                                stroke="currentColor"
                                                strokeDasharray="3 3"
                                                className="text-muted-foreground/60"
                                            />
                                        )}

                                        {/* Inbound node */}
                                        {inPt && (
                                            <circle
                                                cx={inPt.x}
                                                cy={inPt.y}
                                                r={isHovered ? 5.5 : 3.5}
                                                fill="#3b82f6"
                                                stroke="white"
                                                strokeWidth={isHovered ? 2.5 : 1.5}
                                                className="transition-all duration-150"
                                            />
                                        )}

                                        {/* Outbound node */}
                                        {outPt && (
                                            <circle
                                                cx={outPt.x}
                                                cy={outPt.y}
                                                r={isHovered ? 6 : 4}
                                                fill="#10b981"
                                                stroke="white"
                                                strokeWidth={isHovered ? 2.5 : 1.5}
                                                className="transition-all duration-150"
                                            />
                                        )}

                                        {/* X-axis Day Text */}
                                        {outPt && (
                                            <text
                                                x={outPt.x}
                                                y={chartHeight - 8}
                                                textAnchor="middle"
                                                className={`text-[11px] font-semibold select-none transition-colors ${
                                                    isHovered ? 'fill-foreground font-bold' : 'fill-muted-foreground'
                                                }`}
                                            >
                                                {dayData.day || dayData.date?.slice(5)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Floating Tooltip */}
                        {activeDayIdx !== null && trends[activeDayIdx] && (
                            <div
                                className="pointer-events-none absolute top-2 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md px-3.5 py-2 text-xs shadow-lg transition-all z-20"
                                style={{
                                    left: `${Math.min(Math.max(outboundPoints[activeDayIdx].x - 65, 10), chartWidth - 145)}px`,
                                }}
                            >
                                <p className="font-bold text-foreground">
                                    {trends[activeDayIdx].day || trends[activeDayIdx].date}
                                </p>
                                <div className="mt-1 space-y-0.5 text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-muted-foreground">Outbound:</span>
                                        <span className="font-semibold text-foreground">
                                            {trends[activeDayIdx].outbound_count}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                        <span className="text-muted-foreground">Inbound:</span>
                                        <span className="font-semibold text-foreground">
                                            {trends[activeDayIdx].inbound_count}
                                        </span>
                                    </div>
                                    {trends[activeDayIdx].delivered_count !== undefined && (
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                                            <span className="text-muted-foreground">Delivered:</span>
                                            <span className="font-semibold text-foreground">
                                                {trends[activeDayIdx].delivered_count}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ============================================================ */}
                {/* CHANNEL CONNECTIVITY OVERVIEW                                */}
                {/* ============================================================ */}
                <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center pb-4 border-b border-border/50">
                        <div>
                            <h2 className="text-base font-bold text-foreground">Channel Integrations</h2>
                            <p className="text-xs text-muted-foreground">
                                Live status of your official Meta communication channels.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/connect"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                            <span>Manage All Connections</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* Channel 1: WhatsApp */}
                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-4 transition-all">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <Smartphone className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">WhatsApp Business</h3>
                                            <span className="text-[11px] text-muted-foreground">Cloud API</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                            overview.whatsapp.connected
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {overview.whatsapp.connected ? 'Active' : 'Not Connected'}
                                    </span>
                                </div>

                                <div className="mt-4 text-xs text-muted-foreground">
                                    {overview.whatsapp.connected && overview.whatsapp.display_number ? (
                                        <p className="font-mono text-foreground font-medium">
                                            {overview.whatsapp.display_number}
                                        </p>
                                    ) : (
                                        <p>Connect your verified Meta WhatsApp number to send templates and handle customer inquiries.</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border/40">
                                <Link
                                    href="/dashboard/connect"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    <span>{overview.whatsapp.connected ? 'Configure WhatsApp' : 'Connect WhatsApp'}</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>

                        {/* Channel 2: Instagram Direct */}
                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-4 transition-all">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                                            <Camera className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Instagram Direct</h3>
                                            <span className="text-[11px] text-muted-foreground">Direct Messaging</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                            overview.instagram.connected
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {overview.instagram.connected ? 'Active' : 'Not Connected'}
                                    </span>
                                </div>

                                <div className="mt-4 text-xs text-muted-foreground">
                                    {overview.instagram.connected && overview.instagram.username ? (
                                        <p className="font-mono text-foreground font-medium">
                                            {overview.instagram.username}
                                        </p>
                                    ) : (
                                        <p>Link your Instagram professional account to manage story mentions and incoming direct messages.</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border/40">
                                <Link
                                    href="/dashboard/connect"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    <span>{overview.instagram.connected ? 'Configure Instagram' : 'Connect Instagram'}</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>

                        {/* Channel 3: Facebook Messenger */}
                        <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-4 transition-all">
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            <MessageSquare className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Facebook Messenger</h3>
                                            <span className="text-[11px] text-muted-foreground">Page Inboxes</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                            overview.messenger.connected
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {overview.messenger.connected ? 'Active' : 'Not Connected'}
                                    </span>
                                </div>

                                <div className="mt-4 text-xs text-muted-foreground">
                                    {overview.messenger.connected && overview.messenger.page_name ? (
                                        <p className="font-medium text-foreground">
                                            {overview.messenger.page_name}
                                        </p>
                                    ) : (
                                        <p>Connect your business Facebook page to handle customer inquiries directly from Messenger.</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-border/40">
                                <Link
                                    href="/dashboard/connect"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    <span>{overview.messenger.connected ? 'Configure Messenger' : 'Connect Messenger'}</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================================================ */}
                {/* 2-COLUMN BOTTOM: RECENT INQUIRIES & RECENT CAMPAIGNS         */}
                {/* ============================================================ */}
                <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left: Recent Customer Inquiries */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-2xs">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Recent Inquiries</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Incoming customer conversations from all channels.
                                    </p>
                                </div>
                                <Link
                                    href="/dashboard/inbox"
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    View Inbox
                                </Link>
                            </div>

                            <div className="mt-4 space-y-3">
                                {liveQueue.length > 0 ? (
                                    liveQueue.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/dashboard/inbox?chat=${item.id}`}
                                            className="group flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/40 hover:border-border"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                                        item.channel === 'whatsapp'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : item.channel === 'instagram'
                                                            ? 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400'
                                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                    }`}
                                                >
                                                    {item.channel === 'whatsapp' ? (
                                                        <Smartphone className="h-4 w-4" />
                                                    ) : item.channel === 'instagram' ? (
                                                        <Camera className="h-4 w-4" />
                                                    ) : (
                                                        <MessageSquare className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-foreground truncate">
                                                            {item.contact.name}
                                                        </h4>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {item.contact.phone || item.contact.username || ''}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                                        {item.last_message || item.intent_tag || 'Customer conversation thread'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="ml-3 shrink-0 text-right">
                                                <span className="text-[11px] text-muted-foreground">
                                                    {item.updated_at}
                                                </span>
                                                <div className="mt-1 flex justify-end">
                                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                                        <Clock className="h-8 w-8 text-muted-foreground/60 mb-2" />
                                        <p className="text-xs font-semibold text-foreground">No active inquiries</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                            Incoming customer messages will appear here in real-time.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/40 text-center">
                            <Link
                                href="/dashboard/inbox"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-emerald-600 transition-colors"
                            >
                                <span>Go to Omnichannel Inbox</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Right: Recent Campaigns */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-2xs">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Recent Campaigns</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Status and delivery of your bulk outreach broadcasts.
                                    </p>
                                </div>
                                <Link
                                    href="/dashboard/campaigns"
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                >
                                    View All
                                </Link>
                            </div>

                            <div className="mt-4 space-y-3">
                                {recentCampaigns.length > 0 ? (
                                    recentCampaigns.map((camp) => {
                                        const progress = camp.target_count && camp.target_count > 0
                                            ? Math.round((camp.sent_count / camp.target_count) * 100)
                                            : 100;

                                        return (
                                            <div
                                                key={camp.id}
                                                className="rounded-xl border border-border/60 bg-muted/20 p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-foreground">
                                                            {camp.name}
                                                        </h4>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {camp.template_name || camp.name}
                                                        </span>
                                                    </div>
                                                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {camp.status || 'Completed'}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
                                                    <span>Sent {camp.sent_count} / {camp.target_count || camp.sent_count}</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {camp.delivered_count} Delivered
                                                    </span>
                                                </div>

                                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>

                                                <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span>ID: {camp.launch_id || `#${camp.id}`}</span>
                                                    <span>{camp.created_at}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                                        <Megaphone className="h-8 w-8 text-muted-foreground/60 mb-2" />
                                        <p className="text-xs font-semibold text-foreground">No campaigns launched yet</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                            Create and dispatch your first bulk outreach message to your contacts.
                                        </p>
                                        <Link
                                            href="/dashboard/campaigns/create"
                                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Create Campaign</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/40 text-center">
                            <Link
                                href="/dashboard/campaigns"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-emerald-600 transition-colors"
                            >
                                <span>Manage All Campaigns</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => <ClientLayout>{page}</ClientLayout>;
