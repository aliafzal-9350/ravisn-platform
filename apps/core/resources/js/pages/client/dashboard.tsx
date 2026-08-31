import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCheck,
    Megaphone,
    MessageSquare,
    Send,
    Smartphone,
    ArrowUpRight,
    Zap,
    ArrowRight,
} from 'lucide-react';
import type { ApiUsage } from '@/components/api-usage-widget';
import { ApiUsageWidget } from '@/components/api-usage-widget';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';

interface Stats {
    activeNumbers: number;
    totalCampaigns: number;
    totalMessagesSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalReceived: number;
}

interface RecentCampaign {
    id: string | number;
    name: string;
    status: string;
    message_label: string;
    sent_count: number;
    delivered_count: number;
    total_recipients: number;
    progress: number;
    created_at: string;
}

interface WeeklyActivityDay {
    day: string;
    date: string;
    sent: number;
    delivered: number;
}

interface DeliveryStatus {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    sent: number;
    deliveryRate: number;
    unresolvedRate: number;
}

interface ClientDashboardProps {
    stats: Stats;
    recentCampaigns: RecentCampaign[];
    weeklyActivity: WeeklyActivityDay[];
    deliveryStatus: DeliveryStatus;
    apiUsage?: ApiUsage;
}

export default function ClientDashboard({
    stats,
    recentCampaigns,
    weeklyActivity,
    deliveryStatus,
    apiUsage,
}: ClientDashboardProps) {
    const totalDelivered = stats.totalDelivered;
    const totalSent = stats.totalMessagesSent;
    const totalFailed = stats.totalFailed;
    const totalReceived = stats.totalReceived;

    const deliveryRate = deliveryStatus.deliveryRate;
    const unresolvedMessages =
        deliveryStatus.failed + deliveryStatus.pending + deliveryStatus.sent;
    const weeklyData = weeklyActivity;
    const hasWeeklyTraffic = weeklyData.some(
        (day) => day.sent > 0 || day.delivered > 0,
    );
    const maxVal = Math.max(
        ...weeklyData.map((d) => d.sent),
        ...weeklyData.map((d) => d.delivered),
        10,
    );
    const chartHeight = 150;
    const chartWidth = 500;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 25;

    const getX = (index: number) => {
        const step =
            (chartWidth - paddingLeft - paddingRight) / (weeklyData.length - 1);

        return paddingLeft + index * step;
    };

    const getY = (value: number) => {
        const ratio = value / maxVal;

        return (
            chartHeight -
            paddingBottom -
            ratio * (chartHeight - paddingTop - paddingBottom)
        );
    };

    // Build Sent line path
    let sentPath = '';
    let sentAreaPath = '';

    if (weeklyData.length > 0) {
        sentPath = `M ${getX(0)} ${getY(weeklyData[0].sent)}`;
        weeklyData.forEach((d, idx) => {
            if (idx > 0) {
                sentPath += ` L ${getX(idx)} ${getY(d.sent)}`;
            }
        });
        sentAreaPath = `${sentPath} L ${getX(weeklyData.length - 1)} ${chartHeight - paddingBottom} L ${getX(0)} ${chartHeight - paddingBottom} Z`;
    }

    // Build Delivered line path
    let deliveredPath = '';
    let deliveredAreaPath = '';

    if (weeklyData.length > 0) {
        deliveredPath = `M ${getX(0)} ${getY(weeklyData[0].delivered)}`;
        weeklyData.forEach((d, idx) => {
            if (idx > 0) {
                deliveredPath += ` L ${getX(idx)} ${getY(d.delivered)}`;
            }
        });
        deliveredAreaPath = `${deliveredPath} L ${getX(weeklyData.length - 1)} ${chartHeight - paddingBottom} L ${getX(0)} ${chartHeight - paddingBottom} Z`;
    }

    return (
        <>
            <Head title="Client Dashboard" />
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-1 py-2 text-left">
                {/* Performance & Limit Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* WhatsApp Channels Status */}
                    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-emerald-500/5 transition-all duration-300 group-hover:scale-110"></div>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                WhatsApp Channels
                            </span>
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                                <Smartphone className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {stats.activeNumbers} Connected
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Active
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Configured outbound sender phone channels
                        </p>
                        <div className="mt-5">
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
                                asChild
                            >
                                <Link href="/dashboard/whatsapp-accounts">
                                    <span>Manage Numbers</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Campaign Overview Widget */}
                    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-primary/5 transition-all duration-300 group-hover:scale-110"></div>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                Campaign Overview
                            </span>
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Megaphone className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold tracking-tight text-primary">
                                {stats.totalCampaigns} Launched
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                Total
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Dispatched and running bulk campaigns
                        </p>
                        <div className="mt-5">
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800"
                                asChild
                            >
                                <Link href="/dashboard/campaigns">
                                    <span>View Campaigns</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* WhatsApp API Usage Widget */}
                <ApiUsageWidget apiUsage={apiUsage} />

                {/* Statistics Highlights */}
                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Zap className="h-5 w-5 text-teal-500" />
                        <span>Delivery Metrics</span>
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Sent"
                            value={totalSent}
                            description="All outbound messages"
                            icon={Send}
                        />
                        <StatCard
                            title="Total Delivered"
                            value={totalDelivered}
                            description="Confirmed delivery receipts"
                            icon={CheckCheck}
                            className="border-l-4 border-l-teal-500"
                        />
                        <StatCard
                            title="Total Received"
                            value={totalReceived}
                            description="Inbound customer messages"
                            icon={MessageSquare}
                            className="border-l-4 border-l-sky-500"
                        />
                        <StatCard
                            title="Failed"
                            value={totalFailed}
                            description="Rejected message attempts"
                            icon={AlertTriangle}
                            className="border-l-4 border-l-amber-500"
                        />
                    </div>
                </div>

                {/* Performance Analytics Section */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Weekly Activity Trend (Line/Area Chart) */}
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold">
                                Weekly Activity Trend
                            </CardTitle>
                            <CardDescription>
                                Visual trend of outbound and delivered messages
                                over the last 7 days.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mt-2 h-[200px] w-full">
                                <svg
                                    viewBox="0 0 500 150"
                                    className="h-full w-full overflow-visible"
                                >
                                    <defs>
                                        <linearGradient
                                            id="teal-grad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#00a88f"
                                                stopOpacity="0.25"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#00a88f"
                                                stopOpacity="0.0"
                                            />
                                        </linearGradient>
                                        <linearGradient
                                            id="sky-grad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#38bdf8"
                                                stopOpacity="0.25"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#38bdf8"
                                                stopOpacity="0.0"
                                            />
                                        </linearGradient>
                                    </defs>
                                    {/* Grid Lines */}
                                    <line
                                        x1="40"
                                        y1="15"
                                        x2="480"
                                        y2="15"
                                        stroke="currentColor"
                                        className="text-zinc-100 dark:text-zinc-800/40"
                                        strokeWidth="1"
                                        strokeDasharray="4 4"
                                    />
                                    <line
                                        x1="40"
                                        y1="65"
                                        x2="480"
                                        y2="65"
                                        stroke="currentColor"
                                        className="text-zinc-100 dark:text-zinc-800/40"
                                        strokeWidth="1"
                                        strokeDasharray="4 4"
                                    />
                                    <line
                                        x1="40"
                                        y1="115"
                                        x2="480"
                                        y2="115"
                                        stroke="currentColor"
                                        className="text-zinc-100 dark:text-zinc-800/40"
                                        strokeWidth="1"
                                        strokeDasharray="4 4"
                                    />
                                    <line
                                        x1="40"
                                        y1="125"
                                        x2="480"
                                        y2="125"
                                        stroke="currentColor"
                                        className="text-zinc-200 dark:text-zinc-800"
                                        strokeWidth="1.5"
                                    />

                                    {/* Y Axis Labels */}
                                    <text
                                        x="10"
                                        y="20"
                                        className="fill-muted-foreground font-mono text-[10px] font-semibold"
                                    >
                                        {maxVal.toLocaleString()}
                                    </text>
                                    <text
                                        x="10"
                                        y="70"
                                        className="fill-muted-foreground font-mono text-[10px] font-semibold"
                                    >
                                        {Math.round(
                                            maxVal / 2,
                                        ).toLocaleString()}
                                    </text>
                                    <text
                                        x="10"
                                        y="120"
                                        className="fill-muted-foreground font-mono text-[10px] font-semibold"
                                    >
                                        0
                                    </text>

                                    {/* X Axis Labels */}
                                    {weeklyData.map((d, index) => (
                                        <text
                                            key={index}
                                            x={getX(index)}
                                            y="142"
                                            textAnchor="middle"
                                            className="fill-muted-foreground text-[10px] font-semibold"
                                        >
                                            {d.day}
                                        </text>
                                    ))}

                                    {/* Areas */}
                                    {hasWeeklyTraffic && (
                                        <>
                                            <path
                                                d={sentAreaPath}
                                                fill="url(#teal-grad)"
                                            />
                                            <path
                                                d={deliveredAreaPath}
                                                fill="url(#sky-grad)"
                                            />
                                        </>
                                    )}

                                    {/* Lines */}
                                    {hasWeeklyTraffic ? (
                                        <>
                                            <path
                                                d={sentPath}
                                                fill="none"
                                                stroke="#00a88f"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d={deliveredPath}
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </>
                                    ) : (
                                        <text
                                            x="250"
                                            y="70"
                                            textAnchor="middle"
                                            className="fill-muted-foreground text-xs italic"
                                        >
                                            No traffic logs found
                                        </text>
                                    )}

                                    {/* Markers */}
                                    {hasWeeklyTraffic &&
                                        weeklyData.map((d, index) => (
                                            <g key={index}>
                                                <circle
                                                    cx={getX(index)}
                                                    cy={getY(d.sent)}
                                                    r="3.5"
                                                    fill="#00a88f"
                                                    stroke="white"
                                                    strokeWidth="1"
                                                    className="shadow-sm"
                                                />
                                                <circle
                                                    cx={getX(index)}
                                                    cy={getY(d.delivered)}
                                                    r="3.5"
                                                    fill="#38bdf8"
                                                    stroke="white"
                                                    strokeWidth="1"
                                                    className="shadow-sm"
                                                />
                                            </g>
                                        ))}
                                </svg>
                            </div>
                            {/* Legend */}
                            <div className="mt-3 flex justify-center gap-4 text-[11px] font-semibold">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#00a88f]"></span>
                                    <span className="text-foreground">
                                        Sent Messages
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]"></span>
                                    <span className="text-foreground">
                                        Delivered Messages
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delivery Success Ratio (Doughnut Chart) */}
                    <Card className="md:col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold">
                                Delivery Status
                            </CardTitle>
                            <CardDescription>
                                Breakdown of campaign message delivery rates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center pt-2">
                            <div className="relative flex h-[130px] w-[130px] items-center justify-center">
                                <svg
                                    viewBox="0 0 120 120"
                                    className="h-full w-full -rotate-90"
                                >
                                    {/* Gray background track */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        className="text-zinc-100 dark:text-zinc-800"
                                        strokeWidth="14"
                                    />
                                    {/* Success/Delivered ring */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="45"
                                        fill="none"
                                        stroke="#00a88f"
                                        strokeWidth="14"
                                        strokeDasharray="282.74"
                                        strokeDashoffset={
                                            deliveryStatus.total > 0
                                                ? 282.74 -
                                                  (deliveryRate / 100) * 282.74
                                                : 282.74
                                        }
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-2xl font-black text-foreground">
                                        {deliveryRate}%
                                    </span>
                                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Success
                                    </span>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="mt-4 w-full space-y-2 text-xs font-semibold">
                                <div className="flex items-center justify-between border-b border-border/40 py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-[#00a88f]"></span>
                                        <span className="font-medium text-muted-foreground">
                                            Delivered
                                        </span>
                                    </div>
                                    <span className="font-mono">
                                        {deliveryStatus.delivered.toLocaleString()}{' '}
                                        ({deliveryRate}%)
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-b border-border/40 py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                        <span className="font-medium text-muted-foreground">
                                            Failed / Pending / Sent
                                        </span>
                                    </div>
                                    <span className="font-mono">
                                        {unresolvedMessages.toLocaleString()} (
                                        {deliveryStatus.unresolvedRate}%)
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Campaigns */}
                    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-bold tracking-tight">
                                    Recent Campaigns
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Monitor the live progress of bulk actions
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-primary hover:text-primary/80"
                                asChild
                            >
                                <Link href="/dashboard/campaigns">
                                    View All
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-2 flex flex-col gap-4">
                            {recentCampaigns.length > 0 ? (
                                recentCampaigns.map((camp) => (
                                    <div
                                        key={camp.id}
                                        className="rounded-lg border border-border/40 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-4">
                                            <div className="text-left">
                                                <Link
                                                    href={`/dashboard/campaigns/${camp.id}`}
                                                    className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary hover:underline"
                                                >
                                                    {camp.name}
                                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-55" />
                                                </Link>
                                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                    Template:{' '}
                                                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-primary">
                                                        {camp.message_label}
                                                    </code>
                                                </span>
                                            </div>
                                            <StatusBadge status={camp.status} />
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-1.5 text-left">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>
                                                    Sent {camp.sent_count} /{' '}
                                                    {camp.total_recipients} (
                                                    {camp.progress}%)
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {camp.delivered_count}{' '}
                                                    Delivered
                                                </span>
                                            </div>
                                            <Progress
                                                value={camp.sent_count}
                                                max={camp.total_recipients}
                                                className="h-1.5 bg-slate-100 dark:bg-slate-800"
                                            />
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[10px] text-muted-foreground">
                                            <span>
                                                System Launch ID: #{camp.id}
                                            </span>
                                            <span>
                                                Started {camp.created_at}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/20 p-6 py-12 dark:bg-slate-900/10">
                                    <Megaphone className="mb-2 h-10 w-10 text-muted-foreground/60" />
                                    <p className="text-sm font-medium text-foreground">
                                        No campaigns launched yet
                                    </p>
                                    <p className="mb-4 text-xs text-muted-foreground">
                                        Start broadcasting your message
                                        templates now
                                    </p>
                                    <Button
                                        size="sm"
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        asChild
                                    >
                                        <Link href="/dashboard/campaigns/create">
                                            Create Campaign
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Start Guide */}
                    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-1">
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-bold tracking-tight">
                                Onboarding Guide
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Get ready to message in three steps
                            </p>
                        </div>

                        <div className="mt-2 space-y-5 text-left">
                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                    1
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold">
                                        Link WhatsApp Business
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Navigate to{' '}
                                        <Link
                                            href="/dashboard/whatsapp-accounts"
                                            className="font-medium text-primary hover:underline"
                                        >
                                            Numbers
                                        </Link>{' '}
                                        to configure, link, and authorize your
                                        profile.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                    2
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold">
                                        Message Templates
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Build a WhatsApp-compliant{' '}
                                        <Link
                                            href="/dashboard/templates"
                                            className="font-medium text-primary hover:underline"
                                        >
                                            Template
                                        </Link>{' '}
                                        and submit it to Meta's system.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                    3
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold">
                                        Broadcast & Monitor
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Go to{' '}
                                        <Link
                                            href="/dashboard/campaigns"
                                            className="font-medium text-primary hover:underline"
                                        >
                                            Campaigns
                                        </Link>
                                        , import contacts, pick a template, and
                                        broadcast.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

ClientDashboard.layout = (page: any) => page;
