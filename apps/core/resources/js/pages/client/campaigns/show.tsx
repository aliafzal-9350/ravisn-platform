import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Pause,
    Play,
    RefreshCw,
    Send,
    MessageSquare,
    Trash2,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';

interface CampaignDetail {
    id: string | number;
    name: string;
    status: string;
    message_type: string;
    message_label: string;
    direct_message_body: string | null;
    phone_number: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    read_count: number;
    total_cost: string;
    progress: number;
    scheduled_at: string | null;
    scheduled_timezone: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

interface RecipientRow {
    id: string | number;
    phone_number: string;
    status: string;
    error_message: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
}

interface PaginatedRecipients {
    data: RecipientRow[];
    current_page: number;
    last_page: number;
    total: number;
}

interface CampaignShowProps {
    campaign: CampaignDetail;
    recipients: PaginatedRecipients;
}

export default function CampaignShow({
    campaign,
    recipients,
}: CampaignShowProps) {
    const [actioning, setActioning] = React.useState(false);
    const [refreshing, setRefreshing] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        router.reload({
            onSuccess: () => {
                setRefreshing(false);
                toast.success('Campaign statistics updated.');
            },
            onFinish: () => setRefreshing(false),
        });
    };

    const handleStart = () => {
        setActioning(true);
        router.post(
            `/dashboard/campaigns/${campaign.id}/start`,
            {},
            {
                onSuccess: () => {
                    setActioning(false);
                    toast.success('Campaign processing started!');
                },
                onFinish: () => setActioning(false),
            },
        );
    };

    const handlePause = () => {
        setActioning(true);
        router.post(
            `/dashboard/campaigns/${campaign.id}/pause`,
            {},
            {
                onSuccess: () => {
                    setActioning(false);
                    toast.success('Campaign paused.');
                },
                onFinish: () => setActioning(false),
            },
        );
    };

    const confirmDelete = () => {
        setDeleting(true);
        router.delete(`/dashboard/campaigns/${String(campaign.id)}`, {
            onSuccess: () => setShowDeleteDialog(false),
            onFinish: () => setDeleting(false),
        });
    };

    const columns: Column<RecipientRow>[] = [
        {
            header: 'Phone Number',
            accessorKey: 'phone_number',
            className: 'font-mono text-sm font-semibold',
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: 'Details / Errors',
            accessorKey: 'error_message',
            cell: (row) => (
                <span className="text-xs font-medium text-rose-500">
                    {row.error_message || '--'}
                </span>
            ),
        },
        {
            header: 'Sent',
            accessorKey: 'sent_at',
            className: 'font-mono text-xs text-muted-foreground',
            cell: (row) => row.sent_at || '--',
        },
        {
            header: 'Delivered',
            accessorKey: 'delivered_at',
            className: 'font-mono text-xs text-muted-foreground',
            cell: (row) => row.delivered_at || '--',
        },
        {
            header: 'Read',
            accessorKey: 'read_at',
            className: 'font-mono text-xs text-muted-foreground',
            cell: (row) => row.read_at || '--',
        },
    ];

    return (
        <>
            <Head title={`Campaign - ${campaign.name}`} />
            <div className="flex flex-col gap-6 text-left">
                {/* Back Link */}
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link
                            href="/dashboard/campaigns"
                            className="inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Campaigns</span>
                        </Link>
                    </Button>
                </div>

                {/* Profile Title with Actions */}
                <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {campaign.name}
                            </h1>
                            <StatusBadge status={campaign.status} />
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Outbound:{' '}
                            <span className="font-semibold text-foreground">
                                {campaign.phone_number}
                            </span>{' '}
                            | Message:{' '}
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                {campaign.message_label}
                            </code>
                        </p>
                        {campaign.scheduled_at && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Scheduled for{' '}
                                <span className="font-semibold text-foreground">
                                    {campaign.scheduled_at}
                                </span>
                                {campaign.scheduled_timezone && (
                                    <span>
                                        {' '}
                                        ({campaign.scheduled_timezone})
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                            />
                            <span>Refresh</span>
                        </Button>

                        {/* Start action */}
                        {['draft', 'scheduled', 'paused'].includes(
                            campaign.status,
                        ) && (
                            <Button
                                onClick={handleStart}
                                disabled={actioning}
                                size="sm"
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <Play className="h-4 w-4 fill-white" />
                                <span>Start Campaign</span>
                            </Button>
                        )}

                        {/* Pause action */}
                        {campaign.status === 'processing' && (
                            <Button
                                onClick={handlePause}
                                disabled={actioning}
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                            >
                                <Pause className="h-4 w-4" />
                                <span>Pause Campaign</span>
                            </Button>
                        )}

                        {/* Delete action */}
                        <Button
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={actioning || deleting}
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:hover:bg-rose-950/20"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                        </Button>
                    </div>
                </div>

                {campaign.message_type === 'direct' &&
                    campaign.direct_message_body && (
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="mb-3 text-sm font-semibold">
                                Direct Message Body
                            </h3>
                            <p className="rounded-lg bg-muted p-3 text-sm break-words whitespace-pre-wrap text-foreground">
                                {campaign.direct_message_body}
                            </p>
                        </div>
                    )}

                {/* Main Progress Bar */}
                {['processing', 'completed', 'paused'].includes(
                    campaign.status,
                ) && (
                    <div className="space-y-3 rounded-xl border bg-card p-6">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-foreground">
                                Dispatch Progress
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-500">
                                {campaign.progress}% Completed
                            </span>
                        </div>
                        <Progress
                            value={campaign.sent_count}
                            max={campaign.total_recipients}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                                Sent {campaign.sent_count} of{' '}
                                {campaign.total_recipients} recipients
                            </span>
                            {campaign.completed_at && (
                                <span>
                                    Completed on: {campaign.completed_at}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats cards Grid */}
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        title="Sent"
                        value={campaign.sent_count}
                        description="Submitted to Meta WABA"
                        icon={Send}
                    />
                    <StatCard
                        title="Delivered"
                        value={campaign.delivered_count}
                        description="Delivered to user phone"
                        icon={CheckCircle}
                    />
                    <StatCard
                        title="Read"
                        value={campaign.read_count}
                        description="Recipients opened message"
                        icon={MessageSquare}
                        className="border-blue-500/20 bg-blue-500/5 text-blue-600"
                    />
                    <StatCard
                        title="Failed"
                        value={campaign.failed_count}
                        description="Delivery attempts failed"
                        icon={AlertCircle}
                        className={
                            campaign.failed_count > 0
                                ? 'border-rose-500/20 bg-rose-500/5 text-rose-600'
                                : ''
                        }
                    />
                </div>

                {/* Detailed logs */}
                <div className="mt-4 flex flex-col gap-4">
                    <h3 className="border-b pb-2 text-lg font-semibold">
                        Recipient Delivery Trace
                    </h3>
                    <DataTable
                        columns={columns}
                        data={recipients.data}
                        pagination={{
                            currentPage: recipients.current_page,
                            lastPage: recipients.last_page,
                            total: recipients.total,
                            onPageChange: (page) => {
                                router.get(
                                    `/dashboard/campaigns/${campaign.id}`,
                                    { page },
                                    { preserveState: true },
                                );
                            },
                        }}
                        emptyMessage="No recipients found in this campaign list."
                    />
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Campaign</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete campaign &quot;
                                {campaign.name}&quot;? This action cannot be
                                undone and will permanently remove all recipient
                                delivery logs.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                disabled={deleting}
                                onClick={() => setShowDeleteDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={deleting}
                                className="bg-rose-600 text-white hover:bg-rose-700"
                                onClick={confirmDelete}
                            >
                                {deleting ? 'Deleting...' : 'Delete Campaign'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CampaignShow.layout = (page: any) => page;

