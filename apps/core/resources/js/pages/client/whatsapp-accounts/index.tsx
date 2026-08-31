import { Head, useForm, usePage, router } from '@inertiajs/react';
import { Smartphone, Plus, Copy, Trash2, BookOpen } from 'lucide-react';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';

interface WhatsappAccount {
    id: string | number;
    phone_number: string;
    display_name: string | null;
    status: string;
    quality_rating: string;
    messaging_limit_tier: string;
    phone_number_id: string;
    waba_id: string;
    app_id: string | null;
    app_secret: string | null;
    access_token: string | null;
    verified_at: string | null;
    created_at: string;
}

interface AccountsIndexProps {
    accounts: WhatsappAccount[];
    webhook_url: string;
}

export default function AccountsIndex({
    accounts,
    webhook_url,
}: AccountsIndexProps) {
    const { whatsapp_app_id, whatsapp_config_id } = usePage().props as any;

    const [isLinkOpen, setIsLinkOpen] = React.useState(false);
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [editingAccount, setEditingAccount] =
        React.useState<WhatsappAccount | null>(null);
    const [activeTab, setActiveTab] = React.useState<'facebook' | 'manual'>(
        'facebook',
    );
    const [guideStep, setGuideStep] = React.useState(1);

    React.useEffect(() => {
        if (!whatsapp_app_id) {
            return;
        }

        // FB SDK is loaded globally from app.blade.php.
        // Re-assign fbAsyncInit here as a safety fallback in case the SDK
        // fires after React mounts (e.g. on a slow connection).
        if (!(window as any).FB) {
            (window as any).fbAsyncInit = function () {
                (window as any).FB.init({
                    appId: whatsapp_app_id,
                    cookie: true,
                    xfbml: true,
                    version: 'v21.0',
                });
            };
        }
    }, [whatsapp_app_id]);

    const handleFacebookLogin = () => {
        if (!(window as any).FB) {
            toast.error('Facebook SDK not loaded yet. Please refresh.');

            return;
        }

        (window as any).FB.login(
            (response: any) => {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    router.post(
                        '/dashboard/whatsapp-accounts/embedded-signup',
                        {
                            code: code,
                        },
                        {
                            onSuccess: () => {
                                setIsLinkOpen(false);
                                toast.success(
                                    'Successfully linked accounts from Facebook!',
                                );
                            },
                        },
                    );
                } else {
                    toast.error(
                        'User cancelled login or did not fully authorize.',
                    );
                }
            },
            {
                config_id: whatsapp_config_id,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
            setup: {},
            sessionInfoVersion: 3,
            featureType: 'whatsapp_business_app_onboarding',
        },
            },
        );
    };

    // Link Number Form
    const linkForm = useForm({
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        app_id: '',
        app_secret: '',
    });

    // Edit Number Form
    const editForm = useForm({
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        app_id: '',
        app_secret: '',
    });

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        linkForm.post('/dashboard/whatsapp-accounts/request-code', {
            onSuccess: () => {
                setIsLinkOpen(false);
                linkForm.reset();
                toast.success(
                    'WhatsApp number linked and activated successfully!',
                );
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingAccount) {
            return;
        }

        editForm.put(`/dashboard/whatsapp-accounts/${String(editingAccount.id)}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingAccount(null);
                editForm.reset();
                toast.success('WhatsApp credentials updated successfully!');
            },
        });
    };

    const handleDelete = (id: string | number) => {
        if (
            confirm(
                'Are you sure you want to delete this WhatsApp number? This cannot be undone.',
            )
        ) {
            router.delete(`/dashboard/whatsapp-accounts/${String(id)}`, {
                onSuccess: () => {
                    toast.success('WhatsApp number deleted successfully.');
                },
            });
        }
    };

    const columns: Column<WhatsappAccount>[] = [
        {
            header: 'Display Name',
            accessorKey: 'display_name',
            cell: (row) => (
                <div className="flex items-center gap-2 text-left">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                        <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="font-semibold text-foreground">
                            {row.display_name || (
                                <span className="text-zinc-400 italic">
                                    Not set
                                </span>
                            )}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                            {row.phone_number}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: 'Quality Rating',
            accessorKey: 'quality_rating',
            cell: (row) => (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.quality_rating === 'GREEN'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : row.quality_rating === 'YELLOW'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                >
                    {row.quality_rating}
                </span>
            ),
        },
        {
            header: 'Messaging Limit',
            accessorKey: 'messaging_limit_tier',
            cell: (row) => {
                const tier = row.messaging_limit_tier || 'TIER_250';
                const formatted = tier
                    .toUpperCase()
                    .replace('TIER_', '')
                    .replace('K', 'k/day')
                    .replace('UNLIMITED', 'Unlimited');

                return (
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {formatted}
                    </span>
                );
            },
        },
        {
            header: 'Phone Number ID',
            accessorKey: 'phone_number_id',
            cell: (row) => {
                const handleCopy = () => {
                    navigator.clipboard.writeText(row.phone_number_id);
                    toast.success('Phone Number ID copied to clipboard!');
                };

                return (
                    <div className="flex w-fit items-center gap-1.5 rounded border border-border/40 bg-slate-50 px-2 py-1 font-mono text-xs text-muted-foreground dark:bg-slate-900/50">
                        <span>{row.phone_number_id}</span>
                        <button
                            onClick={handleCopy}
                            className="rounded p-1 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Copy ID"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </button>
                    </div>
                );
            },
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (row) => (
                <div className="flex justify-end gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        onClick={() => {
                            setEditingAccount(row);
                            editForm.setData({
                                phone_number_id: row.phone_number_id || '',
                                waba_id: row.waba_id || '',
                                access_token: '', // default empty for safety
                                app_id: row.app_id || '',
                                app_secret: '', // default empty for safety
                            });
                            setIsEditOpen(true);
                        }}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                        onClick={() => handleDelete(row.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="WhatsApp Numbers" />
            <div className="flex flex-col gap-6 text-left">
                {/* Heading */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            WhatsApp Business Numbers
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Link, register, and verify phone numbers associated
                            with your WhatsApp Business Account (WABA).
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                        {/* Unified Connect Dialog */}
                        <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                                    <Plus className="h-4 w-4" />
                                    <span>Connect WhatsApp Number</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent
                                className={
                                    activeTab === 'manual'
                                        ? 'sm:max-w-[920px]'
                                        : 'sm:max-w-[480px]'
                                }
                            >
                                <DialogHeader>
                                    <DialogTitle>
                                        Connect WhatsApp Account
                                    </DialogTitle>
                                    <DialogDescription>
                                        Choose your preferred method to link and
                                        verify your WhatsApp Business number.
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Tabs Navigation */}
                                <div className="my-4 flex border-b border-zinc-200 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('facebook')}
                                        className={`flex-1 border-b-2 pb-2.5 text-xs font-semibold transition-colors ${
                                            activeTab === 'facebook'
                                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Connect via Facebook
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('manual')}
                                        className={`flex-1 border-b-2 pb-2.5 text-xs font-semibold transition-colors ${
                                            activeTab === 'manual'
                                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Manual Setup
                                    </button>
                                </div>

                                {/* Facebook Connection Tab */}
                                {activeTab === 'facebook' && (
                                    <div className="space-y-6 py-2">
                                        <div className="text-xs leading-relaxed text-muted-foreground">
                                            Log in with your Facebook account to
                                            automatically discover, import, and
                                            sync your WhatsApp Business Accounts
                                            (WABA) and phone numbers.
                                        </div>

                                        <div className="flex justify-center py-2">
                                            <Button
                                                onClick={handleFacebookLogin}
                                                className="w-full gap-2 bg-[#1877f2] py-5 text-white hover:bg-[#166fe5]"
                                            >
                                                <svg
                                                    className="h-4 w-4 fill-white"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                                <span>Link via Facebook</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Manual Setup Tab */}
                                {activeTab === 'manual' && (
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Left Column: Stepper Setup Guide Card */}
                                        <div className="flex flex-col justify-between gap-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                                            <div className="space-y-4">
                                                {/* Step Progress Bar and Header */}
                                                <div className="space-y-2.5">
                                                    <div className="flex gap-1.5">
                                                        {[1, 2, 3].map(
                                                            (step) => (
                                                                <div
                                                                    key={step}
                                                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                                        step <=
                                                                        guideStep
                                                                            ? 'bg-emerald-500'
                                                                            : 'dark:bg-zinc-850 bg-zinc-200'
                                                                    }`}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2 dark:border-zinc-800">
                                                        <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                                            <BookOpen className="h-3.5 w-3.5" />
                                                            <span>
                                                                Step {guideStep}{' '}
                                                                of 3
                                                            </span>
                                                        </h3>
                                                        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                                            {guideStep === 1
                                                                ? 'Meta App Setup'
                                                                : guideStep ===
                                                                    2
                                                                  ? 'Copy API Credentials'
                                                                  : 'Webhook Configuration'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Step 1 Content */}
                                                {guideStep === 1 && (
                                                    <div className="space-y-4 text-left">
                                                        <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">
                                                            Create a Meta
                                                            Developer
                                                            Application
                                                        </h4>
                                                        <ol className="space-y-3 text-[11px] text-muted-foreground">
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    1
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    Navigate to
                                                                    the{' '}
                                                                    <a
                                                                        href="https://developers.facebook.com/"
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="font-semibold text-emerald-600 hover:underline"
                                                                    >
                                                                        Meta for
                                                                        Developers
                                                                        Portal
                                                                    </a>{' '}
                                                                    and sign in
                                                                    with your
                                                                    Facebook
                                                                    account.
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    2
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    Click the{' '}
                                                                    <strong>
                                                                        Create
                                                                        App
                                                                    </strong>{' '}
                                                                    button in
                                                                    the
                                                                    top-right
                                                                    section of
                                                                    your app
                                                                    console.
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-655 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    3
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    Select{' '}
                                                                    <strong>
                                                                        Business
                                                                    </strong>{' '}
                                                                    as the
                                                                    application
                                                                    type, type
                                                                    your App
                                                                    name/email,
                                                                    and submit.
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    4
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    Locate the{' '}
                                                                    <strong>
                                                                        WhatsApp
                                                                    </strong>{' '}
                                                                    product card
                                                                    in the
                                                                    catalog and
                                                                    click{' '}
                                                                    <strong>
                                                                        Set Up
                                                                    </strong>
                                                                    .
                                                                </span>
                                                            </li>
                                                        </ol>
                                                    </div>
                                                )}

                                                {/* Step 2 Content */}
                                                {guideStep === 2 && (
                                                    <div className="space-y-4 text-left">
                                                        <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">
                                                            Retrieve API
                                                            Identifiers & Tokens
                                                        </h4>
                                                        <ol className="space-y-3 text-[11px] text-muted-foreground">
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    1
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    {
                                                                        'Go to the left sidebar menu, expand WhatsApp and click API Setup.'
                                                                    }
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    2
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    {
                                                                        'Copy both the Phone Number ID and WhatsApp Business Account ID (WABA ID) and paste them on the right.'
                                                                    }
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    3
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    <strong>
                                                                        Access
                                                                        Tokens:
                                                                    </strong>
                                                                    <ul className="mt-1 list-inside list-disc space-y-1 pl-2">
                                                                        <li>
                                                                            {
                                                                                'Temporary (24 Hours): Copy the temporary token directly from the API Setup page.'
                                                                            }
                                                                        </li>
                                                                        <li>
                                                                            {
                                                                                'Permanent: Head to Business Settings > System Users. Generate a token for a system user with whatsapp_business_messaging and whatsapp_business_management scopes.'
                                                                            }
                                                                        </li>
                                                                    </ul>
                                                                </span>
                                                            </li>
                                                        </ol>
                                                    </div>
                                                )}

                                                {/* Step 3 Content */}
                                                {guideStep === 3 && (
                                                    <div className="space-y-4 text-left">
                                                        <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">
                                                            Configure Real-time
                                                            Webhooks
                                                        </h4>
                                                        <ol className="space-y-3 text-[11px] text-muted-foreground">
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-655 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    1
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    {
                                                                        'Expand WhatsApp from the sidebar and select Configuration.'
                                                                    }
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    2
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    {
                                                                        'Click Edit under Webhooks. Paste the Callback URL shown on the right, input the Verify Token (e.g. ravisn), and save.'
                                                                    }
                                                                </span>
                                                            </li>
                                                            <li className="flex gap-2.5">
                                                                <span className="text-emerald-650 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    3
                                                                </span>
                                                                <span className="leading-relaxed">
                                                                    {
                                                                        "Click Manage next to Webhook Fields, then click Subscribe next to the 'messages' row to receive incoming chats and delivery receipts."
                                                                    }
                                                                </span>
                                                            </li>
                                                        </ol>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2 flex justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={guideStep === 1}
                                                    onClick={() =>
                                                        setGuideStep(
                                                            guideStep - 1,
                                                        )
                                                    }
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={guideStep === 3}
                                                    onClick={() =>
                                                        setGuideStep(
                                                            guideStep + 1,
                                                        )
                                                    }
                                                    className="dark:text-emerald-450 border-emerald-600/20 text-emerald-600 hover:bg-emerald-500/10"
                                                >
                                                    Next Step
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Right Column: Credentials Form Card */}
                                        <form
                                            onSubmit={handleLinkSubmit}
                                            className="flex flex-col justify-between gap-5 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/20"
                                        >
                                            <div className="space-y-4">
                                                {/* Webhook URL Section */}
                                                <div className="space-y-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 text-left">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                                            Your webhook URL
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                                                            Connected
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={webhook_url}
                                                            readOnly
                                                            className="h-auto flex-1 bg-background py-1.5 font-mono text-[11px] text-muted-foreground select-all"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-auto border-emerald-600/20 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    webhook_url,
                                                                );
                                                                toast.success(
                                                                    'Webhook URL copied to clipboard!',
                                                                );
                                                            }}
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Meta Credentials Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-1.5 text-left">
                                                        <Label
                                                            htmlFor="phone_number_id"
                                                            className="text-xs"
                                                        >
                                                            Phone Number ID
                                                        </Label>
                                                        <Input
                                                            id="phone_number_id"
                                                            value={
                                                                linkForm.data
                                                                    .phone_number_id
                                                            }
                                                            onChange={(e) =>
                                                                linkForm.setData(
                                                                    'phone_number_id',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="XXXXXXXX"
                                                            required
                                                        />
                                                        {linkForm.errors
                                                            .phone_number_id && (
                                                            <span className="text-xs text-rose-500">
                                                                {
                                                                    linkForm
                                                                        .errors
                                                                        .phone_number_id
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 text-left">
                                                        <Label
                                                            htmlFor="waba_id"
                                                            className="text-xs"
                                                        >
                                                            WhatsApp Business
                                                            Account ID (WABA)
                                                        </Label>
                                                        <Input
                                                            id="waba_id"
                                                            value={
                                                                linkForm.data
                                                                    .waba_id
                                                            }
                                                            onChange={(e) =>
                                                                linkForm.setData(
                                                                    'waba_id',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="XXXXXXXX"
                                                            required
                                                        />
                                                        {linkForm.errors
                                                            .waba_id && (
                                                            <span className="text-xs text-rose-500">
                                                                {
                                                                    linkForm
                                                                        .errors
                                                                        .waba_id
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-1.5 text-left">
                                                        <Label
                                                            htmlFor="app_id"
                                                            className="text-xs"
                                                        >
                                                            App ID
                                                        </Label>
                                                        <Input
                                                            id="app_id"
                                                            value={
                                                                linkForm.data
                                                                    .app_id
                                                            }
                                                            onChange={(e) =>
                                                                linkForm.setData(
                                                                    'app_id',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="XXXXXXXX"
                                                        />
                                                        {linkForm.errors
                                                            .app_id && (
                                                            <span className="text-xs text-rose-500">
                                                                {
                                                                    linkForm
                                                                        .errors
                                                                        .app_id
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 text-left">
                                                        <Label
                                                            htmlFor="access_token"
                                                            className="text-xs"
                                                        >
                                                            Access Token
                                                        </Label>
                                                        <Input
                                                            id="access_token"
                                                            type="password"
                                                            value={
                                                                linkForm.data
                                                                    .access_token
                                                            }
                                                            onChange={(e) =>
                                                                linkForm.setData(
                                                                    'access_token',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Leave empty to keep unchanged"
                                                        />
                                                        {linkForm.errors
                                                            .access_token && (
                                                            <span className="text-xs text-rose-500">
                                                                {
                                                                    linkForm
                                                                        .errors
                                                                        .access_token
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div></div>
                                                    <div className="flex flex-col gap-1.5 text-left">
                                                        <Label
                                                            htmlFor="app_secret"
                                                            className="text-xs"
                                                        >
                                                            App Secret
                                                        </Label>
                                                        <Input
                                                            id="app_secret"
                                                            type="password"
                                                            value={
                                                                linkForm.data
                                                                    .app_secret
                                                            }
                                                            onChange={(e) =>
                                                                linkForm.setData(
                                                                    'app_secret',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Leave empty to keep unchanged"
                                                        />
                                                        {linkForm.errors
                                                            .app_secret && (
                                                            <span className="text-xs text-rose-500">
                                                                {
                                                                    linkForm
                                                                        .errors
                                                                        .app_secret
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <DialogFooter className="mt-auto border-t pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setIsLinkOpen(false)
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        linkForm.processing
                                                    }
                                                    size="sm"
                                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    Link Account
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Edit Account Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>
                                Edit WhatsApp Account Credentials
                            </DialogTitle>
                            <DialogDescription>
                                Update credentials for display name "
                                {editingAccount?.display_name}" (
                                {editingAccount?.phone_number}).
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleEditSubmit}
                            className="space-y-4 py-2"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5 text-left">
                                    <Label
                                        htmlFor="edit_phone_number_id"
                                        className="text-xs"
                                    >
                                        Phone Number ID
                                    </Label>
                                    <Input
                                        id="edit_phone_number_id"
                                        value={editForm.data.phone_number_id}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'phone_number_id',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="XXXXXXXX"
                                        required
                                    />
                                    {editForm.errors.phone_number_id && (
                                        <span className="text-xs text-rose-500">
                                            {editForm.errors.phone_number_id}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5 text-left">
                                    <Label
                                        htmlFor="edit_waba_id"
                                        className="text-xs"
                                    >
                                        WhatsApp Business Account ID (WABA)
                                    </Label>
                                    <Input
                                        id="edit_waba_id"
                                        value={editForm.data.waba_id}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'waba_id',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="XXXXXXXX"
                                        required
                                    />
                                    {editForm.errors.waba_id && (
                                        <span className="text-xs text-rose-500">
                                            {editForm.errors.waba_id}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5 text-left">
                                    <Label
                                        htmlFor="edit_app_id"
                                        className="text-xs"
                                    >
                                        App ID
                                    </Label>
                                    <Input
                                        id="edit_app_id"
                                        value={editForm.data.app_id}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'app_id',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="XXXXXXXX"
                                    />
                                    {editForm.errors.app_id && (
                                        <span className="text-xs text-rose-500">
                                            {editForm.errors.app_id}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5 text-left">
                                    <Label
                                        htmlFor="edit_access_token"
                                        className="text-xs"
                                    >
                                        Access Token
                                    </Label>
                                    <Input
                                        id="edit_access_token"
                                        type="password"
                                        value={editForm.data.access_token}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'access_token',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Leave blank to keep current"
                                    />
                                    {editForm.errors.access_token && (
                                        <span className="text-xs text-rose-500">
                                            {editForm.errors.access_token}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div></div>
                                <div className="flex flex-col gap-1.5 text-left">
                                    <Label
                                        htmlFor="edit_app_secret"
                                        className="text-xs"
                                    >
                                        App Secret
                                    </Label>
                                    <Input
                                        id="edit_app_secret"
                                        type="password"
                                        value={editForm.data.app_secret}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'app_secret',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Leave blank to keep current"
                                    />
                                    {editForm.errors.app_secret && (
                                        <span className="text-xs text-rose-500">
                                            {editForm.errors.app_secret}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="border-t pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    size="sm"
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    Update Credentials
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Table of active/pending numbers */}
                <DataTable
                    columns={columns}
                    data={accounts}
                    emptyMessage="No WhatsApp numbers linked yet. Click 'Link WhatsApp Number' to begin onboarding."
                />
            </div>
        </>
    );
}

AccountsIndex.layout = (page: any) => page;
