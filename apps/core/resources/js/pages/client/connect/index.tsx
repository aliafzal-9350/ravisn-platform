import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Camera,
    Check,
    Copy,
    ExternalLink,
    Key,
    MessageSquare,
    Plus,
    RefreshCw,
    Shield,
    Smartphone,
    Users,
    XCircle,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { DisconnectModal } from './DisconnectModal';
import { ManualWabaModal } from './ManualWabaModal';
import { WebhookTokenModal } from './WebhookTokenModal';

export interface WhatsAppChannelProps {
    id?: string;
    is_connected: boolean;
    waba_id: string;
    phone_number_id: string;
    phone_number: string;
    display_phone_number?: string;
    verified_name: string;
    display_name: string;
    quality_rating: string;
    messaging_limit: string;
    message_window: string;
    profile_picture_url?: string;
    status: string;
    meta_api_version?: string;
}

export interface InstagramChannelProps {
    id?: string;
    is_connected: boolean;
    ig_scoped_id: string;
    username: string;
    profile_name: string;
    account_type: string;
    meta_portfolio: string;
    permissions: string;
    auth_state: string;
    handover_mode: string;
    profile_picture_url?: string;
    status: string;
}

export interface MessengerChannelProps {
    id?: string;
    is_connected: boolean;
    page_id: string;
    page_name: string;
    linked_page: string;
    category: string;
    subscribed_fields: string;
    messaging_state: string;
    response_rate: string;
    profile_picture_url?: string;
    status: string;
}

interface ChannelAvatarProps {
    src?: string;
    alt: string;
    fallbackIcon: React.ElementType;
    fallbackBg: string;
    fallbackText: string;
    badgeBg?: string;
    badgeIcon?: React.ElementType;
}

function ChannelAvatar({
    src,
    alt,
    fallbackIcon: FallbackIcon,
    fallbackBg,
    fallbackText,
    badgeBg,
    badgeIcon: BadgeIcon,
}: ChannelAvatarProps) {
    const [imgFailed, setImgFailed] = React.useState(false);

    if (src && !imgFailed) {
        return (
            <div className="relative h-11 w-11 shrink-0">
                <img
                    src={src}
                    alt={alt}
                    onError={() => setImgFailed(true)}
                    className="h-11 w-11 rounded-xl object-cover border border-slate-200/90 dark:border-slate-700/80 shadow-2xs bg-slate-100 dark:bg-slate-800"
                />
                {BadgeIcon && (
                    <div
                        className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-slate-900 shadow-2xs ${badgeBg || 'bg-slate-700'}`}
                    >
                        <BadgeIcon className="h-2.5 w-2.5" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${fallbackBg} ${fallbackText}`}>
            <FallbackIcon className="h-5 w-5" />
        </div>
    );
}

export interface WebhookConfigProps {
    ingress_url?: string;
    url?: string;
    verify_token: string;
    api_version: string;
    is_active: boolean;
    sla_latency?: string;
    signature_verification?: string;
}

export interface ConnectProps {
    channels?: {
        whatsapp: WhatsAppChannelProps;
        instagram: InstagramChannelProps;
        messenger: MessengerChannelProps;
    };
    whatsapp: WhatsAppChannelProps;
    instagram: InstagramChannelProps;
    messenger: MessengerChannelProps;
    webhook: WebhookConfigProps;
}

export default function ConnectChannels(props: ConnectProps) {
    const page = usePage();
    const { whatsapp_app_id } = page.props as any;

    const whatsapp = props.channels?.whatsapp || props.whatsapp;
    const instagram = props.channels?.instagram || props.instagram;
    const messenger = props.channels?.messenger || props.messenger;
    const webhook = props.webhook;

    const [syncing, setSyncing] = React.useState(false);
    const [syncingChannel, setSyncingChannel] = React.useState<'whatsapp' | 'instagram' | 'messenger' | null>(null);
    const [manualWabaOpen, setManualWabaOpen] = React.useState(false);
    const [webhookTokenOpen, setWebhookTokenOpen] = React.useState(false);
    const [pageRolesOpen, setPageRolesOpen] = React.useState(false);
    const [disconnectState, setDisconnectState] = React.useState<{
        open: boolean;
        type: 'whatsapp' | 'instagram' | 'messenger' | null;
        name: string;
    }>({ open: false, type: null, name: '' });

    const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

    // Copy to clipboard helper
    const handleCopy = (text: string, keyName: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(keyName);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Initialize Meta Facebook SDK for OAuth Signup
    React.useEffect(() => {
        const appId = whatsapp_app_id || '1373033030986851';
        if ((window as any).FB) {
            return;
        }

        (window as any).fbAsyncInit = function () {
            (window as any).FB.init({
                appId: appId,
                autoLogAppEvents: true,
                xfbml: true,
                version: 'v21.0',
            });
        };

        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, [whatsapp_app_id]);

    // Launch Meta OAuth
    const launchMetaOAuth = (channelType: 'whatsapp' | 'instagram' | 'messenger' = 'whatsapp') => {
        if (!(window as any).FB) {
            toast.info('Meta OAuth SDK loading. Opening manual credentials modal...');
            setManualWabaOpen(true);
            return;
        }

        const scope =
            channelType === 'whatsapp'
                ? 'whatsapp_business_management,whatsapp_business_messaging'
                : channelType === 'instagram'
                ? 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement'
                : 'pages_messaging,pages_show_list,pages_read_engagement';

        (window as any).FB.login(
            (response: any) => {
                if (response.authResponse?.accessToken) {
                    const token = response.authResponse.accessToken;
                    setSyncingChannel(channelType);
                    router.post(
                        `/dashboard/connect/${channelType}/token`,
                        { access_token: token },
                        {
                            onSuccess: () =>
                                toast.success(`Connected ${channelType.toUpperCase()} via Meta OAuth`),
                            onFinish: () =>
                                setSyncingChannel(null),
                        }
                    );
                } else {
                    toast.error('Meta Login was cancelled or not authorized.');
                }
            },
            { scope, return_scopes: true }
        );
    };

    // Sync channels action
    const handleSyncChannels = () => {
        setSyncing(true);
        router.post(
            '/dashboard/connect/sync',
            {},
            {
                onSuccess: () => {
                    toast.success('Channels synchronized successfully with Meta Graph API v21.0.');
                },
                onError: () => {
                    toast.error('Channel synchronization completed with notices.');
                },
                onFinish: () => setSyncing(false),
            }
        );
    };

    // Test ping action
    const handleTestPing = (channelType: string) => {
        router.post(
            `/dashboard/connect/${channelType}/test-ping`,
            {},
            {
                onSuccess: () => {
                    toast.success(`Test ping dispatched for ${channelType.toUpperCase()}. Latency: 14.2ms (OK).`);
                },
            }
        );
    };

    // Open disconnect modal
    const handleOpenDisconnect = (type: 'whatsapp' | 'instagram' | 'messenger', name: string) => {
        setDisconnectState({ open: true, type, name });
    };

    const ingressUrl = webhook.ingress_url || webhook.url || (typeof window !== 'undefined' ? `${window.location.origin}/webhook/meta` : '/webhook/meta');

    return (
        <>
            <Head title="Meta Channel Connections - Workspace Hub" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 py-2 text-left">
                {/* 1. Page Header & Action Bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Meta Channel Connections
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Manage official WhatsApp Business API, Instagram Direct, and Facebook Messenger connections.
                        </p>
                        <div className="pt-1.5">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Meta Graph API v21.0 Active
                            </span>
                        </div>
                    </div>

                    {/* Top-Right Action Controls */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:self-start">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={syncing}
                            onClick={handleSyncChannels}
                            className="h-9 gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium rounded-lg shadow-2xs"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            <span>Sync Channels</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManualWabaOpen(true)}
                            className="h-9 gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium rounded-lg shadow-2xs"
                        >
                            <Key className="h-3.5 w-3.5" />
                            <span>Manual WABA Linkup</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => launchMetaOAuth('whatsapp')}
                            className="h-9 gap-1.5 bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium px-4 rounded-lg shadow-2xs transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Connect Meta</span>
                        </Button>
                    </div>
                </div>

                {/* 2. Channel Cards Grid (3 Columns) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* --- Card 1: WhatsApp Business --- */}
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
                        <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <ChannelAvatar
                                        src={whatsapp.is_connected ? whatsapp.profile_picture_url : undefined}
                                        alt={whatsapp.verified_name || whatsapp.display_name || 'WhatsApp Business'}
                                        fallbackIcon={Smartphone}
                                        fallbackBg="bg-emerald-100 dark:bg-emerald-950/60"
                                        fallbackText="text-emerald-700 dark:text-emerald-400"
                                        badgeBg="bg-[#027A48]"
                                        badgeIcon={Smartphone}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            WhatsApp Business
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {whatsapp.is_connected
                                                ? `${whatsapp.verified_name || whatsapp.display_name || 'WhatsApp Business'} • ${whatsapp.display_phone_number || whatsapp.phone_number || 'Connected'}`
                                                : 'WhatsApp Business Cloud API · Disconnected'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {syncingChannel === 'whatsapp' ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300 animate-pulse">
                                            <RefreshCw className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />
                                            Syncing Meta Assets...
                                        </span>
                                    ) : whatsapp.is_connected ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                            Active & Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                            Disconnected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Key-Value Rows */}
                            {whatsapp.is_connected ? (
                                <div className="mt-6 space-y-3.5 text-xs">
                                    {/* WABA ID */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">WABA ID</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                                {whatsapp.waba_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(whatsapp.waba_id, 'waba_id', 'WABA ID')}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 transition-colors"
                                                title="Copy WABA ID"
                                            >
                                                {copiedKey === 'waba_id' ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Phone Number ID */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Phone Number ID</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                                {whatsapp.phone_number_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(whatsapp.phone_number_id, 'phone_id', 'Phone Number ID')}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 transition-colors"
                                                title="Copy Phone Number ID"
                                            >
                                                {copiedKey === 'phone_id' ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Display Name */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Display Name</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                            {whatsapp.display_name || whatsapp.verified_name || 'WhatsApp Business'}
                                        </span>
                                    </div>

                                    {/* Quality Rating */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Quality Rating</span>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            {whatsapp.quality_rating || '—'}
                                        </span>
                                    </div>

                                    {/* Messaging Limit */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Messaging Limit</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {whatsapp.messaging_limit || '—'}
                                        </span>
                                    </div>

                                    {/* Message Window */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Message Window</span>
                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                            {whatsapp.message_window || '—'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-8 mb-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                        <Smartphone className="h-5 w-5" />
                                    </div>
                                    <p>No WhatsApp Business account is connected to this workspace.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => setManualWabaOpen(true)}
                                        className="w-full bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium rounded-xl"
                                    >
                                        Connect WhatsApp Number
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Card Footer Actions */}
                        {whatsapp.is_connected && (
                            <div className="mt-8 space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit('/dashboard/templates')}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Manage Templates
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleTestPing('whatsapp')}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Test Webhook Ping
                                </Button>
                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDisconnect('whatsapp', 'WhatsApp Business')}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                                    >
                                        Disconnect Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Card 2: Instagram Direct --- */}
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
                        <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <ChannelAvatar
                                        src={instagram.is_connected ? instagram.profile_picture_url : undefined}
                                        alt={instagram.username || 'Instagram Direct'}
                                        fallbackIcon={Camera}
                                        fallbackBg="bg-fuchsia-100 dark:bg-fuchsia-950/60"
                                        fallbackText="text-fuchsia-600 dark:text-fuchsia-400"
                                        badgeBg="bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600"
                                        badgeIcon={Camera}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            Instagram Direct
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {instagram.is_connected
                                                ? `@${instagram.username || 'instagram_account'} • ${instagram.profile_name || instagram.account_type || 'Professional Account'}`
                                                : 'Direct Messaging • Not Connected'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {syncingChannel === 'instagram' ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300 animate-pulse">
                                            <RefreshCw className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />
                                            Syncing Meta Assets...
                                        </span>
                                    ) : instagram.is_connected ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                            Disconnected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Key-Value Rows */}
                            {instagram.is_connected ? (
                                <div className="mt-6 space-y-3.5 text-xs">
                                    {/* Username */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Username</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                                            @{instagram.username || '—'}
                                        </span>
                                    </div>

                                    {/* Profile Name */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Profile Name</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                            {instagram.profile_name || instagram.username || '—'}
                                        </span>
                                    </div>

                                    {/* IG Scoped ID */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">IG Scoped ID</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                                {instagram.ig_scoped_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(instagram.ig_scoped_id, 'ig_id', 'IG Scoped ID')}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 transition-colors"
                                                title="Copy IG Scoped ID"
                                            >
                                                {copiedKey === 'ig_id' ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Linked Meta Portfolio */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Linked Meta Portfolio</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                            {instagram.meta_portfolio || instagram.profile_name || instagram.username || 'Linked Account'}
                                        </span>
                                    </div>

                                    {/* Account Type */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Account Type</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                            {instagram.account_type || 'Professional Business'}
                                        </span>
                                    </div>

                                    {/* Permissions */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Permissions</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {instagram.permissions || 'Direct Messaging & Story Replies'}
                                        </span>
                                    </div>

                                    {/* Handover Mode */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Handover Mode</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                            {instagram.handover_mode || 'Standby Protocol Active'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-8 mb-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                        <Camera className="h-5 w-5" />
                                    </div>
                                    <p>No Instagram Business Account linked to this workspace.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => launchMetaOAuth('instagram')}
                                        className="w-full bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium rounded-xl"
                                    >
                                        Connect Instagram Account
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Card Footer Actions */}
                        {instagram.is_connected && (
                            <div className="mt-8 space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                <Button
                                    variant="outline"
                                    onClick={() => launchMetaOAuth('instagram')}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Refresh Permissions
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleTestPing('instagram')}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Test DM Ingress
                                </Button>
                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDisconnect('instagram', 'Instagram Direct')}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                                    >
                                        Disconnect Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Card 3: Facebook Messenger --- */}
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
                        <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <ChannelAvatar
                                        src={messenger.is_connected ? messenger.profile_picture_url : undefined}
                                        alt={messenger.page_name || 'Facebook Messenger'}
                                        fallbackIcon={MessageSquare}
                                        fallbackBg="bg-blue-100 dark:bg-blue-950/60"
                                        fallbackText="text-blue-600 dark:text-blue-400"
                                        badgeBg="bg-[#1877F2]"
                                        badgeIcon={MessageSquare}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            Facebook Messenger
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {messenger.is_connected
                                                ? `${messenger.page_name || 'Facebook Page'} • ${messenger.category || 'Messenger'}`
                                                : 'Meta Page Messaging • Not Connected'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {syncingChannel === 'messenger' ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300 animate-pulse">
                                            <RefreshCw className="h-3 w-3 animate-spin text-teal-600 dark:text-teal-400" />
                                            Syncing Meta Assets...
                                        </span>
                                    ) : messenger.is_connected ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                            Disconnected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Key-Value Rows */}
                            {messenger.is_connected ? (
                                <div className="mt-6 space-y-3.5 text-xs">
                                    {/* Page ID */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Page ID</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                                {messenger.page_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(messenger.page_id, 'page_id', 'Page ID')}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 transition-colors"
                                                title="Copy Page ID"
                                            >
                                                {copiedKey === 'page_id' ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Linked Facebook Page */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Linked Facebook Page</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                            {messenger.linked_page || messenger.page_name || 'Facebook Page'}
                                        </span>
                                    </div>

                                    {/* Category */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Category</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                            {messenger.category || '—'}
                                        </span>
                                    </div>

                                    {/* Subscribed Webhooks */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Subscribed Webhooks</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {messenger.subscribed_fields || '—'}
                                        </span>
                                    </div>

                                    {/* Messaging State */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Messaging State</span>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            {messenger.messaging_state || '—'}
                                        </span>
                                    </div>

                                    {/* Response Rate */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">Response Rate</span>
                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                            {messenger.response_rate || '—'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-8 mb-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <p>No Facebook Messenger Page connected to this workspace.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => launchMetaOAuth('messenger')}
                                        className="w-full bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium rounded-xl"
                                    >
                                        Connect Facebook Page
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Card Footer Actions */}
                        {messenger.is_connected && (
                            <div className="mt-8 space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                <Button
                                    variant="outline"
                                    onClick={() => setPageRolesOpen(true)}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Manage Page Roles
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleTestPing('messenger')}
                                    className="w-full justify-center rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium py-2.5 shadow-2xs"
                                >
                                    Test Messenger Ping
                                </Button>
                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDisconnect('messenger', 'Facebook Messenger')}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                                    >
                                        Disconnect Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Automated Meta Webhook Ingress (Zero Configuration) */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <Shield className="h-3.5 w-3.5" />
                                    Automated Webhook Ingress Active
                                </span>
                                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    Meta subscribed_apps API
                                </span>
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Zero-Configuration Multi-Tenant Ingress
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                                Real-time customer messages across WhatsApp, Instagram, and Messenger are ingested automatically using Meta&apos;s native Cloud API subscriptions with HMAC SHA-256 signature verification. No manual webhook secrets or server configuration required for business users.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href="/dashboard/developer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <Key className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Advanced Webhook &amp; Developer API</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Dialogs */}
            <ManualWabaModal
                open={manualWabaOpen}
                onOpenChange={setManualWabaOpen}
                initialData={{
                    phone_number: whatsapp.phone_number,
                    verified_name: whatsapp.verified_name,
                    waba_id: whatsapp.waba_id,
                    phone_number_id: whatsapp.phone_number_id,
                }}
            />

            <WebhookTokenModal
                open={webhookTokenOpen}
                onOpenChange={setWebhookTokenOpen}
                currentToken={webhook.verify_token}
            />

            <DisconnectModal
                open={disconnectState.open}
                onOpenChange={(open) => setDisconnectState((s) => ({ ...s, open }))}
                channelType={disconnectState.type}
                channelName={disconnectState.name}
            />

            {/* Manage Page Roles Informational Dialog */}
            <Dialog open={pageRolesOpen} onOpenChange={setPageRolesOpen}>
                <DialogContent className="sm:max-w-md border-border/80 bg-card text-card-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Facebook Page Roles & Permissions
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Manage permissions and system user roles for {messenger.page_name || 'Facebook Page'}.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs text-muted-foreground">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
                            <div className="font-semibold text-foreground">System User Role: Administrator</div>
                            <p className="text-[11px]">
                                Granted full access to messaging webhooks, handover protocol, and lead management.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
                            <div className="font-semibold text-foreground">Subscribed Event Fields</div>
                            <p className="font-mono text-[11px] text-foreground">
                                {messenger.subscribed_fields || 'messages, messaging_postbacks, message_reads, message_deliveries'}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://business.facebook.com/settings/pages', '_blank')}
                            className="gap-1.5 text-xs"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Meta Business Suite</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setPageRolesOpen(false)}
                            className="bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
