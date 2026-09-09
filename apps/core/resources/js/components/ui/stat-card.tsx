import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    value: string | number;
    description?: string;
    icon?: LucideIcon;
    trend?: {
        value: string | number;
        type: 'up' | 'down';
    };
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className,
    ...props
}: StatCardProps) {
    return (
        <Card className={cn('relative min-h-32 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md', className)} {...props}>
            <CardContent className="p-7">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-base font-medium text-muted-foreground">{title}</p>
                    {Icon && (
                        <div className="flex text-primary/45">
                            <Icon className="h-12 w-12" strokeWidth={1.7} />
                        </div>
                    )}
                </div>
                <div className="mt-5">
                    <h3 className="text-4xl font-bold tracking-normal text-primary">{value}</h3>
                    {(description || trend) && (
                        <div className="flex items-center gap-2 mt-2">
                            {trend && (
                                <span
                                    className={cn(
                                        'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded',
                                        trend.type === 'up'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    )}
                                >
                                    {trend.type === 'up' ? (
                                        <TrendingUp className="mr-1 h-3 w-3" />
                                    ) : (
                                        <TrendingDown className="mr-1 h-3 w-3" />
                                    )}
                                    {trend.value}
                                </span>
                            )}
                            {description && (
                                <p className="text-sm text-muted-foreground">{description}</p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
