import { DollarSign, Megaphone, MessageSquare, Send, ShieldCheck, Wrench } from 'lucide-react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CategoryUsage {
    count: number;
    cost: string;
}

export interface ApiUsage {
    categories: {
        marketing: CategoryUsage;
        authentication: CategoryUsage;
        utility: CategoryUsage;
        service: CategoryUsage;
    };
    total_sent: number;
    total_cost: string;
}

interface ApiUsageWidgetProps {
    apiUsage?: ApiUsage;
}

export function ApiUsageWidget({ apiUsage }: ApiUsageWidgetProps) {
    const data = apiUsage ?? {
        categories: {
            marketing: { count: 0, cost: '0.00' },
            authentication: { count: 0, cost: '0.00' },
            utility: { count: 0, cost: '0.00' },
            service: { count: 0, cost: '0.00' },
        },
        total_sent: 0,
        total_cost: '0.00',
    };

    const categories = [
        {
            key: 'marketing',
            label: 'Marketing',
            count: data.categories?.marketing?.count ?? 0,
            cost: data.categories?.marketing?.cost ?? '0.00',
            icon: Megaphone,
            color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
        },
        {
            key: 'authentication',
            label: 'Auth',
            count: data.categories?.authentication?.count ?? 0,
            cost: data.categories?.authentication?.cost ?? '0.00',
            icon: ShieldCheck,
            color: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
        },
        {
            key: 'utility',
            label: 'Utility',
            count: data.categories?.utility?.count ?? 0,
            cost: data.categories?.utility?.cost ?? '0.00',
            icon: Wrench,
            color: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20',
        },
        {
            key: 'service',
            label: 'Service',
            count: data.categories?.service?.count ?? 0,
            cost: data.categories?.service?.cost ?? '0.00',
            icon: MessageSquare,
            color: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
        },
    ];

    return (
        <Card className="overflow-hidden border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                    <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        &lt;/&gt;
                    </span>
                    <span>WhatsApp API Usage (USD)</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-12">
                    {/* Left Section: Message Delivery Stats */}
                    <div className="md:col-span-7 lg:col-span-8">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Category Breakdown
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {categories.map((cat) => (
                                <div
                                    key={cat.key}
                                    className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {cat.label}
                                        </span>
                                        <div className={`rounded-md p-1.5 ${cat.color}`}>
                                            <cat.icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-bold tracking-tight text-foreground">
                                            {cat.count.toLocaleString()}
                                        </span>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            (${cat.cost})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Section: Total Aggregation Block */}
                    <div className="flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-transparent md:col-span-5 lg:col-span-4">
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    Summary
                                </span>
                                <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Total Sent
                                    </span>
                                    <div className="text-3xl font-extrabold tracking-tight text-foreground">
                                        {(data.total_sent ?? 0).toLocaleString()}
                                    </div>
                                </div>

                                <div className="border-t border-emerald-500/20 pt-3">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Total Cost
                                    </span>
                                    <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                                        ${data.total_cost ?? '0.00'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Send className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Meta US Conversation Rates</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
