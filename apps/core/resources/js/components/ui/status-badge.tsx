import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Play,
    Pause,
    Loader2,
    Eye,
    Send,
} from 'lucide-react';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
    const s = status ? status.toLowerCase() : '';

    let label = status;
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let icon: React.ReactNode = null;
    let customStyles = '';

    switch (s) {
        // Active, Approved, Completed, Delivered, Read
        case 'active':
        case 'approved':
        case 'completed':
            label = s === 'active' ? 'Active' : s === 'approved' ? 'Approved' : 'Completed';
            customStyles = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
            icon = <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-75 duration-300" />;
            break;
        case 'read':
            label = 'Read';
            customStyles = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
            icon = (
                <div className="mr-1 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
            );
            break;
        case 'delivered':
            label = 'Delivered';
            customStyles = 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30';
            icon = <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />;
            break;

        // Pending, Scheduled, Draft
        case 'pending':
        case 'scheduled':
        case 'draft':
            label = s === 'pending' ? 'Pending' : s === 'scheduled' ? 'Scheduled' : 'Draft';
            customStyles = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
            icon = <Clock className="mr-1 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
            break;

        // Processing
        case 'processing':
            label = 'Processing';
            customStyles = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 animate-pulse';
            icon = <Loader2 className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />;
            break;

        // Suspended, Inactive, Paused
        case 'suspended':
        case 'inactive':
        case 'paused':
            label = s === 'suspended' ? 'Suspended' : s === 'inactive' ? 'Inactive' : 'Paused';
            customStyles = 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30';
            icon = <Pause className="mr-1 h-3.5 w-3.5 text-zinc-500" />;
            break;

        // Banned, Rejected, Failed
        case 'banned':
        case 'rejected':
        case 'failed':
            label = s === 'banned' ? 'Banned' : s === 'rejected' ? 'Rejected' : 'Failed';
            customStyles = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
            icon = <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
            break;

        // Sent
        case 'sent':
            label = 'Sent';
            customStyles = 'bg-primary/15 text-primary border-primary/30';
            icon = <Send className="mr-1 h-3.5 w-3.5 text-primary" />;
            break;

        default:
            label = status;
            customStyles = 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30';
    }

    return (
        <Badge
            variant={variant}
            className={cn('inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border transition-all duration-300', customStyles, className)}
            {...props}
        >
            {icon}
            {label}
        </Badge>
    );
}
