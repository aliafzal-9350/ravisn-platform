import { Head, Link, router } from '@inertiajs/react';
import { Plus, RefreshCw, Trash2, Eye } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

interface MessageTemplate {
    id: string | number;
    name: string;
    language: string;
    category: string;
    status: string;
    phone_number: string;
    rejection_reason: string | null;
    created_at: string;
}

interface PaginatedTemplates {
    data: MessageTemplate[];
    current_page: number;
    last_page: number;
    total: number;
}

interface TemplatesIndexProps {
    templates: PaginatedTemplates;
}

export default function TemplatesIndex({ templates }: TemplatesIndexProps) {
    const [syncing, setSyncing] = React.useState(false);

    const handleSync = () => {
        setSyncing(true);
        router.post(
            '/dashboard/templates/sync',
            {},
            {
                onSuccess: () => {
                    setSyncing(false);
                    toast.success(
                        'Sync job dispatched. Check back in a few moments!',
                    );
                },
                onFinish: () => setSyncing(false),
            },
        );
    };

    const handleDelete = (templateId: string | number, name: string) => {
        if (
            confirm(
                `Are you sure you want to delete template "${name}" from Meta and RAVISN?`,
            )
        ) {
            router.delete(`/dashboard/templates/${String(templateId)}`, {
                onSuccess: () => {
                    toast.success('Template deleted successfully');
                },
            });
        }
    };

    const columns: Column<MessageTemplate>[] = [
        {
            header: 'Template Name',
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
            cell: (row) => (
                <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={row.status} />
                    {row.rejection_reason && (
                        <span
                            className="max-w-[150px] truncate text-[10px] font-medium text-rose-500"
                            title={row.rejection_reason}
                        >
                            Reason: {row.rejection_reason}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Language',
            accessorKey: 'language',
            className: 'uppercase text-center font-semibold text-xs',
            cell: (row) => (
                <span className="block text-center">{row.language}</span>
            ),
        },
        {
            header: 'Category',
            accessorKey: 'category',
            cell: (row) => (
                <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    {row.category}
                </span>
            ),
        },
        {
            header: 'Created At',
            accessorKey: 'created_at',
            className: 'font-mono text-xs text-muted-foreground',
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" asChild>
                        <Link
                            href={`/dashboard/templates/${row.id}`}
                            className="inline-flex items-center gap-1.5"
                        >
                            <Eye className="h-4 w-4" />
                            <span>Preview</span>
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-rose-600 hover:bg-rose-500/5 hover:text-rose-700"
                        onClick={() => handleDelete(row.id, row.name)}
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
            <Head title="Message Templates" />
            <div className="flex flex-col gap-6 text-left">
                {/* Heading */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Message Templates
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create structured template messages (text, headers,
                            footers, and quick buttons) approved by Meta.
                        </p>
                    </div>

                    <div className="flex gap-2 self-start sm:self-auto">
                        <Button
                            onClick={handleSync}
                            disabled={syncing}
                            variant="outline"
                            className="gap-1.5"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                            />
                            <span>Sync Statuses</span>
                        </Button>
                        <Button
                            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            asChild
                        >
                            <Link href="/dashboard/templates/create">
                                <Plus className="h-4 w-4" />
                                <span>Create Template</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Templates DataTable */}
                <DataTable
                    columns={columns}
                    data={templates.data}
                    searchKey="name"
                    searchPlaceholder="Filter templates by name..."
                    pagination={{
                        currentPage: templates.current_page,
                        lastPage: templates.last_page,
                        total: templates.total,
                        onPageChange: (page) => {
                            router.get(
                                '/dashboard/templates',
                                { page },
                                { preserveState: true },
                            );
                        },
                    }}
                    emptyMessage="No templates created yet. Click 'Create Template' to start designing."
                />
            </div>
        </>
    );
}

TemplatesIndex.layout = (page: any) => page;
