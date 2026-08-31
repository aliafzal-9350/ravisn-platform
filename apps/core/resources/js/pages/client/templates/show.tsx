import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, FileText } from 'lucide-react';
import * as React from 'react';
import { TemplatePreview } from '@/components/template-preview';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

interface MessageTemplate {
    id: string | number;
    name: string;
    language: string;
    category: string;
    status: string;
    components: any[];
    rejection_reason: string | null;
    phone_number: string;
    created_at: string;
}

interface TemplateShowProps {
    template: MessageTemplate;
}

export default function TemplateShow({ template }: TemplateShowProps) {
    // Extract component values for the Preview component
    const headerComponent = template.components.find(
        (c) => c.type === 'HEADER',
    );
    const bodyComponent = template.components.find((c) => c.type === 'BODY');
    const footerComponent = template.components.find(
        (c) => c.type === 'FOOTER',
    );
    const buttonsComponent = template.components.find(
        (c) => c.type === 'BUTTONS',
    );

    const headerFormatRaw = headerComponent?.format ?? 'NONE';
    const validHeaderTypes = ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE'] as const;
    const headerType = validHeaderTypes.includes(headerFormatRaw)
        ? (headerFormatRaw as (typeof validHeaderTypes)[number])
        : 'NONE';
    const headerText = headerComponent?.text || '';
    const bodyText = bodyComponent?.text || '';
    const footerText = footerComponent?.text || '';
    const buttons = buttonsComponent?.buttons || [];
    const isMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType);

    return (
        <>
            <Head title={`Template - ${template.name}`} />
            <div className="flex flex-col gap-6 text-left">
                {/* Back Link */}
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link
                            href="/dashboard/templates"
                            className="inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Templates</span>
                        </Link>
                    </Button>
                </div>

                {/* Profile Title */}
                <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {template.name}
                            </h1>
                            <StatusBadge status={template.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Category:{' '}
                            <span className="font-semibold text-foreground uppercase">
                                {template.category}
                            </span>{' '}
                            | Language:{' '}
                            <span className="font-semibold text-foreground uppercase">
                                {template.language}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-5">
                    {/* Specifications Card */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                <CardTitle>Template Specifications</CardTitle>
                            </div>
                            <CardDescription>
                                Raw properties and details submitted to Meta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 border-b pb-3">
                                <div>
                                    <span className="text-xs text-muted-foreground">
                                        Registered Number Channel
                                    </span>
                                    <p className="mt-0.5 text-sm font-semibold">
                                        {template.phone_number}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">
                                        Submitted Date
                                    </span>
                                    <p className="mt-0.5 text-sm font-semibold">
                                        {template.created_at}
                                    </p>
                                </div>
                            </div>

                            {template.rejection_reason && (
                                <div className="rounded-lg border border-rose-200 bg-rose-500/5 p-4 text-rose-800 dark:border-rose-950 dark:bg-rose-950/20 dark:text-rose-400">
                                    <h4 className="mb-1 text-sm font-semibold">
                                        Rejection Reason
                                    </h4>
                                    <p className="font-mono text-xs">
                                        {template.rejection_reason}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4 pt-2">
                                {headerText && (
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                                            Header
                                        </span>
                                        <p className="rounded border bg-muted/20 p-3 text-sm">
                                            {headerText}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                                        Message Body
                                    </span>
                                    <p className="rounded border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                                        {bodyText}
                                    </p>
                                </div>

                                {footerText && (
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                                            Footer
                                        </span>
                                        <p className="rounded border bg-muted/20 p-3 text-sm text-zinc-500">
                                            {footerText}
                                        </p>
                                    </div>
                                )}

                                {buttons.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                                            Configured Buttons
                                        </span>
                                        <div className="space-y-2">
                                            {buttons.map(
                                                (btn: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between rounded border bg-muted/10 p-3 text-xs"
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-foreground">
                                                                {btn.text}
                                                            </span>
                                                            <span className="mt-0.5 block text-[10px] text-muted-foreground uppercase">
                                                                {btn.type}
                                                            </span>
                                                        </div>
                                                        {btn.url && (
                                                            <code className="rounded bg-muted px-2 py-1 font-mono text-[10px] select-all">
                                                                {btn.url}
                                                            </code>
                                                        )}
                                                        {btn.phone_number && (
                                                            <code className="rounded bg-muted px-2 py-1 font-mono text-[10px] select-all">
                                                                {
                                                                    btn.phone_number
                                                                }
                                                            </code>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Bubble */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visual Chat Preview</CardTitle>
                                <CardDescription>
                                    Displays bubble layout matching WhatsApp's
                                    recipient view.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center p-4">
                                <TemplatePreview
                                    name={template.name}
                                    category={template.category}
                                    language={template.language}
                                    headerType={headerType}
                                    headerText={headerText}
                                    headerMediaType={
                                        isMediaHeader
                                            ? (headerType as 'IMAGE' | 'VIDEO' | 'DOCUMENT')
                                            : undefined
                                    }
                                    bodyText={bodyText}
                                    footerText={footerText}
                                    buttons={buttons}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

TemplateShow.layout = (page: any) => page;
