import { Head, Link, router } from '@inertiajs/react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import * as React from 'react';
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
import { StatusBadge } from '@/components/ui/status-badge';

interface CampaignLog {
    id: string | number;
    name: string;
    status: string;
    message_type: string;
    message_label: string;
    phone_number: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    read_count: number;
    progress: number;
    scheduled_at: string | null;
    scheduled_timezone: string | null;
    created_at: string;
}

interface PaginatedCampaigns {
    data: CampaignLog[];
    current_page: number;
    last_page: number;
    total: number;
}

interface CampaignsIndexProps {
    campaigns: PaginatedCampaigns;
}

export default function CampaignsIndex({ campaigns }: CampaignsIndexProps) {
    const [campaignToDelete, setCampaignToDelete] =
        React.useState<CampaignLog | null>(null);

    const confirmDelete = () => {
        if (!campaignToDelete) {
            return;
        }

        router.delete(`/dashboard/campaigns/${String(campaignToDelete.id)}`, {
            preserveScroll: true,
            onSuccess: () => setCampaignToDelete(null),
        });
    };

    const columns: Column<CampaignLog>[] = [
        {
            header: 'Campaign Name',
            accessorKey: 'name',
            className: 'font-semibold',
            cell: (row) => (
                <div className="flex flex-col text-left">
                    <span className="font-semibold text-foreground">
                        {row.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                        Channel: {row.phone_number}
                    </span>
                </div>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: 'Message',
            accessorKey: 'message_label',
            cell: (row) => (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                        {row.message_label}
                    </span>
                    <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                        {row.message_type}
                    </span>
                </div>
            ),
        },
        {
            header: 'Recipients',
            accessorKey: 'total_recipients',
            className: 'text-center font-mono',
            cell: (row) => (
                <span className="block text-center">
                    {row.total_recipients}
                </span>
            ),
        },
        {
            header: 'Progress',
            cell: (row) => (
                <div className="w-[140px] space-y-1.5 text-left">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{row.progress}%</span>
                        <span>
                            {row.sent_count}/{row.total_recipients}
                        </span>
                    </div>
                    <Progress
                        value={row.sent_count}
                        max={row.total_recipients}
                    />
                </div>
            ),
        },
        {
            header: 'Schedule',
            accessorKey: 'scheduled_at',
            className: 'font-mono text-xs text-muted-foreground',
            cell: (row) =>
                row.scheduled_at ? (
                    <div className="flex flex-col">
                        <span>{row.scheduled_at}</span>
                        <span className="text-[10px]">
                            {row.scheduled_timezone}
                        </span>
                    </div>
                ) : (
                    '--'
                ),
        },
        {
            header: 'Created',
            accessorKey: 'created_at',
            className: 'font-mono text-xs text-muted-foreground',
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (row) => (
                <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" asChild>
                        <Link
                            href={`/dashboard/campaigns/${row.id}`}
                            className="inline-flex items-center gap-1"
                        >
                            <Eye className="h-4 w-4" />
                            <span>Trace</span>
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-rose-600 hover:bg-rose-500/5 hover:text-rose-700"
                        onClick={() => setCampaignToDelete(row)}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Campaigns" />
            <div className="flex flex-col gap-6 text-left">
                {/* Heading */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Outbound Campaigns
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Dispatch bulk template or direct messages to
                            selected customer lists.
                        </p>
                    </div>

                    <Button
                        className="gap-2 self-start bg-emerald-600 text-white hover:bg-emerald-700 sm:self-auto"
                        asChild
                    >
                        <Link href="/dashboard/campaigns/create">
                            <Plus className="h-4 w-4" />
                            <span>Create Campaign</span>
                        </Link>
                    </Button>
                </div>

                {/* Campaigns List */}
                <DataTable
                    columns={columns}
                    data={campaigns.data}
                    searchKey="name"
                    searchPlaceholder="Filter campaigns by name..."
                    pagination={{
                        currentPage: campaigns.current_page,
                        lastPage: campaigns.last_page,
                        total: campaigns.total,
                        onPageChange: (page) => {
                            router.get(
                                '/dashboard/campaigns',
                                { page },
                                { preserveState: true },
                            );
                        },
                    }}
                    emptyMessage="No campaigns launched yet. Click 'Create Campaign' to start broadcasting."
                />

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={!!campaignToDelete}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCampaignToDelete(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Campaign</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete campaign &quot;
                                {campaignToDelete?.name}&quot;? This action
                                cannot be undone and will permanently remove all
                                recipient delivery logs.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCampaignToDelete(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="bg-rose-600 text-white hover:bg-rose-700"
                                onClick={confirmDelete}
                            >
                                Delete Campaign
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

CampaignsIndex.layout = (page: any) => page;

