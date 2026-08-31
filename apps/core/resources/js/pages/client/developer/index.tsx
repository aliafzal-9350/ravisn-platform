import { Head, router, useForm } from '@inertiajs/react';
import {
    Terminal,
    Key,
    Webhook,
    BookOpen,
    Plus,
    Trash2,
    Copy,
    Check,
    Code,
    Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKey {
    id: string | number;
    name: string;
    last_used_at: string | null;
    created_at: string;
}

interface WebhookConfig {
    id: string | number;
    url: string;
    secret_token: string;
    is_active: boolean;
    created_at: string;
}

interface DeveloperIndexProps {
    apiKeys: ApiKey[];
    webhooks: WebhookConfig[];
    plainApiKey: string | null;
}

export default function DeveloperIndex({
    apiKeys,
    webhooks,
    plainApiKey,
}: DeveloperIndexProps) {
    const [activeTab, setActiveTab] = React.useState<
        'keys' | 'webhook' | 'docs'
    >('keys');
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [isAddWebhookOpen, setIsAddWebhookOpen] = React.useState(false);
    const [copiedToken, setCopiedToken] = React.useState(false);
    const [copiedWebhookSecretId, setCopiedWebhookSecretId] = React.useState<
        string | number | null
    >(null);
    const [copiedDocCode, setCopiedDocCode] = React.useState<string | null>(
        null,
    );

    // API Key form
    const keyForm = useForm({
        name: '',
    });

    // Webhook form
    const webhookForm = useForm({
        url: '',
    });

    const handleCreateKey = (e: React.FormEvent) => {
        e.preventDefault();
        keyForm.post('/dashboard/developer/keys', {
            onSuccess: () => {
                setIsCreateOpen(false);
                keyForm.reset();
                toast.success(
                    'API Key generated successfully! Please copy it now.',
                );
            },
        });
    };

    const handleRevokeKey = (keyId: string | number, name: string) => {
        if (
            confirm(
                `Are you sure you want to revoke API Key "${name}"? External integrations using this key will immediately fail.`,
            )
        ) {
            router.delete(`/dashboard/developer/keys/${String(keyId)}`, {
                onSuccess: () => {
                    toast.success('API key revoked successfully.');
                },
            });
        }
    };

    const handleAddWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        webhookForm.post('/dashboard/developer/webhooks', {
            onSuccess: () => {
                setIsAddWebhookOpen(false);
                webhookForm.reset();
                toast.success('Webhook registered successfully!');
            },
        });
    };

    const handleDeleteWebhook = (id: string | number, url: string) => {
        if (confirm(`Are you sure you want to delete webhook to "${url}"?`)) {
            router.delete(`/dashboard/developer/webhooks/${String(id)}`, {
                onSuccess: () => {
                    toast.success('Webhook deleted successfully.');
                },
            });
        }
    };

    const handleToggleWebhook = (id: string | number) => {
        router.put(
            `/dashboard/developer/webhooks/${String(id)}/toggle`,
            {},
            {
                onSuccess: () => {
                    toast.success('Webhook status updated!');
                },
            },
        );
    };

    const copyToClipboard = (text: string, type: 'token' | string | number) => {
        navigator.clipboard.writeText(text);

        if (type === 'token') {
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        } else if (typeof type === 'number') {
            setCopiedWebhookSecretId(type);
            setTimeout(() => setCopiedWebhookSecretId(null), 2000);
        } else {
            setCopiedDocCode(type);
            setTimeout(() => setCopiedDocCode(null), 2000);
        }

        toast.success('Copied to clipboard!');
    };

    const hostUrl = window.location.origin;

    // Code examples
    const curlSendText = `curl -X POST "${hostUrl}/api/v1/messages/send-text" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "phone_number_id": "985357101336442",
    "to": "+12125550198",
    "body": "Hello, this is a test text message sent via RAVISN API!"
  }'`;

    const curlSendTemplate = `curl -X POST "${hostUrl}/api/v1/messages/send-template" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "phone_number_id": "985357101336442",
    "to": "+12125550198",
    "template_name": "verify_otp_usecase",
    "language": "en",
    "variables": ["123456", "RAVISN"]
  }'`;

    return (
        <>
            <Head title="Developer Panel & API" />

            <div className="mx-auto flex max-w-6xl flex-col gap-6 text-left">
                {/* Heading */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Terminal className="h-6 w-6 text-emerald-600" />
                            <span>Developer Console & API</span>
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Generate API tokens, integrate external webhooks,
                            and read developer documentations to automate
                            WhatsApp workflows.
                        </p>
                    </div>

                    <div className="flex gap-2 self-start sm:self-auto">
                        <Button
                            onClick={() => setActiveTab('docs')}
                            variant="outline"
                            className="gap-1.5"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>API References</span>
                        </Button>
                    </div>
                </div>

                {/* Sub Tab Navigation */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab('keys')}
                        className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition-all ${
                            activeTab === 'keys'
                                ? 'border-emerald-600 font-bold text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Key className="h-4 w-4" />
                        <span>API Keys</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('webhook')}
                        className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition-all ${
                            activeTab === 'webhook'
                                ? 'border-emerald-600 font-bold text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Webhook className="h-4 w-4" />
                        <span>Outgoing Webhook</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-semibold transition-all ${
                            activeTab === 'docs'
                                ? 'border-emerald-600 font-bold text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Code className="h-4 w-4" />
                        <span>API Documentation</span>
                    </button>
                </div>

                {/* Plain API Key Banner (Shown only once after creation) */}
                {plainApiKey && (
                    <Card className="animate-pulse-once border-emerald-500/30 bg-emerald-500/5 shadow-sm dark:bg-emerald-950/20">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="animate-spin-slow h-5 w-5 text-emerald-600" />
                                <CardTitle className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                                    Copy Your New API Key
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                                For security, we will show this key only once.
                                If you close this page, you cannot recover it
                                and will have to generate a new key.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-white p-3 dark:bg-zinc-900">
                                <span className="flex-1 truncate font-mono text-sm font-semibold break-all text-emerald-800 select-all dark:text-emerald-400">
                                    {plainApiKey}
                                </span>
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() =>
                                        copyToClipboard(plainApiKey, 'token')
                                    }
                                >
                                    {copiedToken ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            <span>Copy Key</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* API KEYS TAB */}
                {activeTab === 'keys' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">
                                    Active API Credentials
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Use these secure API keys to integrate
                                    RAVISN with platforms like Zapier, CRM
                                    systems, or custom backends.
                                </p>
                            </div>
                            <Button
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                <span>Generate Key</span>
                            </Button>
                        </div>

                        <div className="rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-zinc-50 font-semibold text-zinc-500 dark:bg-zinc-900">
                                            <th className="p-3">Key Name</th>
                                            <th className="p-3">Token Mask</th>
                                            <th className="p-3">Last Used</th>
                                            <th className="p-3">Created</th>
                                            <th className="p-3 text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {apiKeys.map((key) => (
                                            <tr
                                                key={key.id}
                                                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10"
                                            >
                                                <td className="p-3 font-semibold text-foreground">
                                                    {key.name}
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted-foreground select-none">
                                                    zm_live_••••••••••••••••••••
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted-foreground">
                                                    {key.last_used_at ||
                                                        'Never used'}
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted-foreground">
                                                    {key.created_at}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                                        onClick={() =>
                                                            handleRevokeKey(
                                                                key.id,
                                                                key.name,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="ml-1 hidden sm:inline">
                                                            Revoke
                                                        </span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {apiKeys.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="p-12 text-center text-sm text-muted-foreground italic"
                                                >
                                                    No API Keys generated yet.
                                                    Click "Generate Key" to
                                                    create credentials.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* OUTGOING WEBHOOK TAB */}
                {activeTab === 'webhook' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">
                                    Outgoing Webhook Forwarder
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Forward WhatsApp inbound messages received
                                    on your WhatsApp number directly to multiple
                                    servers/endpoints in real-time.
                                </p>
                            </div>
                            <Button
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => setIsAddWebhookOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Webhook</span>
                            </Button>
                        </div>

                        <div className="rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-zinc-50 font-semibold text-zinc-500 dark:bg-zinc-900">
                                            <th className="p-3">Webhook URL</th>
                                            <th className="p-3">
                                                Secret Signature Token
                                            </th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Created At</th>
                                            <th className="p-3 text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {webhooks.map((wh) => (
                                            <tr
                                                key={wh.id}
                                                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10"
                                            >
                                                <td
                                                    className="max-w-[280px] truncate p-3 font-medium text-foreground"
                                                    title={wh.url}
                                                >
                                                    {wh.url}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex max-w-[280px] items-center gap-1.5">
                                                        <Input
                                                            value={
                                                                wh.secret_token
                                                            }
                                                            readOnly
                                                            type="password"
                                                            className="h-8 bg-zinc-50 font-mono text-xs select-all dark:bg-zinc-800"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 shrink-0 p-0 text-zinc-500 hover:text-foreground"
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    wh.secret_token,
                                                                    wh.id,
                                                                )
                                                            }
                                                        >
                                                            {copiedWebhookSecretId ===
                                                            wh.id ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`webhook-status-${wh.id}`}
                                                            checked={
                                                                wh.is_active
                                                            }
                                                            onCheckedChange={() =>
                                                                handleToggleWebhook(
                                                                    wh.id,
                                                                )
                                                            }
                                                        />
                                                        <label
                                                            htmlFor={`webhook-status-${wh.id}`}
                                                            className="cursor-pointer text-xs font-medium"
                                                        >
                                                            {wh.is_active
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted-foreground">
                                                    {wh.created_at}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                                        onClick={() =>
                                                            handleDeleteWebhook(
                                                                wh.id,
                                                                wh.url,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="ml-1 hidden sm:inline">
                                                            Delete
                                                        </span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {webhooks.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="p-12 text-center text-sm text-muted-foreground italic"
                                                >
                                                    No webhook endpoints
                                                    registered yet. Click "Add
                                                    Webhook" to register.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {webhooks.length > 0 && (
                            <div className="space-y-1 rounded-lg border bg-zinc-50 p-3.5 text-left text-xs text-muted-foreground dark:bg-zinc-900">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    Webhook Signature Verification
                                </span>
                                <p className="leading-relaxed">
                                    Each webhook payload is signed using its
                                    respective secret token. The signature is
                                    sent in the header{' '}
                                    <code>X-Hub-Signature-256</code> computed as{' '}
                                    <code>
                                        sha256=hmac_sha256(secret, payload)
                                    </code>
                                    . Verify this on your server to guarantee
                                    the payload integrity and authenticity.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* API DOCS TAB */}
                {activeTab === 'docs' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold">
                                Interactive API Documentation
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Automate broadcasts and free-text message
                                responses directly from your backend code.
                            </p>
                        </div>

                        {/* Request Headers Card */}
                        <Card className="bg-zinc-50 dark:bg-zinc-900/50">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold">
                                    Global Authorization Headers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5 text-left font-mono text-xs">
                                <div className="flex items-center justify-between rounded border bg-background p-2">
                                    <span>
                                        Authorization: Bearer
                                        &lt;YOUR_API_KEY&gt;
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded border bg-background p-2">
                                    <span>Content-Type: application/json</span>
                                </div>
                                <div className="flex items-center justify-between rounded border bg-background p-2">
                                    <span>Accept: application/json</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* API Endpoint: Send Text */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-sky-500 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                    POST
                                </span>
                                <h4 className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    /api/v1/messages/send-text
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    — Send free-text session responses.
                                </span>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {/* Parameters */}
                                <div className="space-y-3 rounded-lg border bg-card p-4">
                                    <span className="block text-xs font-bold tracking-wider text-zinc-400 uppercase">
                                        JSON Payload Fields
                                    </span>
                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>phone_number_id</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Meta identifier)
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>to</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Recipient phone number)
                                            </span>
                                        </div>
                                        <div className="flex justify-between pb-0.5">
                                            <span>
                                                <code>body</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Text message content)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Code Tab */}
                                <div className="flex flex-col rounded-lg border bg-zinc-950 text-zinc-300">
                                    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                                        <span className="font-mono text-xs font-semibold text-zinc-500">
                                            cURL Request
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                            onClick={() =>
                                                copyToClipboard(
                                                    curlSendText,
                                                    'curl-text',
                                                )
                                            }
                                        >
                                            {copiedDocCode === 'curl-text' ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </Button>
                                    </div>
                                    <pre className="overflow-x-auto p-4 text-left font-mono text-xs leading-relaxed text-emerald-400">
                                        {curlSendText}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* API Endpoint: Send Template */}
                        <div className="space-y-3 border-t pt-6">
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-sky-500 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                    POST
                                </span>
                                <h4 className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    /api/v1/messages/send-template
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    — Broadcast pre-approved WhatsApp templates.
                                </span>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {/* Parameters */}
                                <div className="space-y-3 rounded-lg border bg-card p-4">
                                    <span className="block text-xs font-bold tracking-wider text-zinc-400 uppercase">
                                        JSON Payload Fields
                                    </span>
                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>phone_number_id</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Meta identifier)
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>to</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Recipient phone number)
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>template_name</code>{' '}
                                                <span className="font-bold text-rose-500">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (Approved template key
                                                name)
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1.5">
                                            <span>
                                                <code>language</code>
                                            </span>
                                            <span className="text-muted-foreground">
                                                string (e.g. <code>ar_EG</code>,
                                                default: <code>en</code>)
                                            </span>
                                        </div>
                                        <div className="flex justify-between pb-0.5">
                                            <span>
                                                <code>variables</code>
                                            </span>
                                            <span className="text-muted-foreground">
                                                array of strings (Parameters for
                                                body)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Code Tab */}
                                <div className="flex flex-col rounded-lg border bg-zinc-950 text-zinc-300">
                                    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                                        <span className="font-mono text-xs font-semibold text-zinc-500">
                                            cURL Request
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                            onClick={() =>
                                                copyToClipboard(
                                                    curlSendTemplate,
                                                    'curl-template',
                                                )
                                            }
                                        >
                                            {copiedDocCode ===
                                            'curl-template' ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </Button>
                                    </div>
                                    <pre className="overflow-x-auto p-4 text-left font-mono text-xs leading-relaxed text-emerald-400">
                                        {curlSendTemplate}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate API Key Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Generate Developer API Key</DialogTitle>
                        <DialogDescription>
                            Name your token list for identification (e.g.,
                            Zapier CRM integration).
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateKey}
                        className="space-y-4 py-2 text-left"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="key-name">API Key Name *</Label>
                            <Input
                                id="key-name"
                                required
                                value={keyForm.data.name}
                                onChange={(e) =>
                                    keyForm.setData('name', e.target.value)
                                }
                                placeholder="e.g. ERP Automation, Zapier live"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={keyForm.processing}
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {keyForm.processing
                                    ? 'Generating...'
                                    : 'Generate Token'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Outgoing Webhook Dialog */}
            <Dialog open={isAddWebhookOpen} onOpenChange={setIsAddWebhookOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Add Outgoing Webhook</DialogTitle>
                        <DialogDescription>
                            Register a new server endpoint to receive real-time
                            incoming WhatsApp message payloads.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleAddWebhook}
                        className="space-y-4 py-2 text-left"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="webhook-url-input">
                                Endpoint URL *
                            </Label>
                            <Input
                                id="webhook-url-input"
                                type="url"
                                required
                                value={webhookForm.data.url}
                                onChange={(e) =>
                                    webhookForm.setData('url', e.target.value)
                                }
                                placeholder="https://yourdomain.com/webhooks/whatsapp"
                            />
                            <span className="text-[10px] text-muted-foreground">
                                Must be a valid HTTP/HTTPS URL. RAVISN sends
                                real-time POST payloads to this URL.
                            </span>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddWebhookOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={webhookForm.processing}
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {webhookForm.processing
                                    ? 'Registering...'
                                    : 'Register Webhook'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

DeveloperIndex.layout = (page: any) => page;
