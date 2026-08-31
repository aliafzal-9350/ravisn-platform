import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Megaphone,
    Calendar,
    MessageSquare,
    FileText,
    Image as ImageIcon,
    UploadCloud,
    Link as LinkIcon,
    X,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { TemplatePreview } from '@/components/template-preview';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface WabaAccount {
    id: string | number;
    phone_number: string;
    display_name: string | null;
}

interface TemplateComponent {
    type: string;
    format?: string;
    text?: string;
    buttons?: any[];
}

interface MessageTemplate {
    id: string | number;
    name: string;
    language: string;
    category: string;
    status?: string;
    whatsapp_account_id: string | number;
    components: TemplateComponent[];
}

interface Group {
    id: string | number;
    name: string;
    contacts_count: number;
}

interface CampaignCreateProps {
    accounts: WabaAccount[];
    templates: MessageTemplate[];
    groups: Group[];
    timezones: string[];
    defaultTimezone: string;
}

interface ParsedRecipient {
    phone_number: string;
    variables: string[] | null;
}

export default function CampaignCreate({
    accounts,
    templates,
    groups,
    timezones,
    defaultTimezone,
}: CampaignCreateProps) {
    const [selectedAccId, setSelectedAccId] = React.useState(
        accounts.length > 0 ? String(accounts[0].id) : '',
    );
    const [selectedTempId, setSelectedTempId] = React.useState('');
    const [messageType, setMessageType] = React.useState<'template' | 'direct'>(
        'template',
    );
    const [targetType, setTargetType] = React.useState<'file' | 'group'>(
        'file',
    );
    const [recipients, setRecipients] = React.useState<ParsedRecipient[]>([]);
    const [parsing, setParsing] = React.useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(
        null,
    );
    const [imageInputMode, setImageInputMode] = React.useState<'upload' | 'url'>(
        'upload',
    );

    const browserTimezone = React.useMemo(() => {
        return (
            Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimezone
        );
    }, [defaultTimezone]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        whatsapp_account_id: '',
        message_type: 'template',
        message_template_id: '',
        direct_message_body: '',
        header_image: null as File | null,
        header_media_url: '',
        scheduled_at: '',
        scheduled_timezone: timezones.includes(browserTimezone)
            ? browserTimezone
            : defaultTimezone,
        contact_group_id: '',
        recipients: [] as any[],
    });

    // Filter templates to only show the ones created for the selected phone number
    const filteredTemplates = React.useMemo(() => {
        if (!selectedAccId) {
            return [];
        }

        return templates.filter(
            (t) =>
                String(t.whatsapp_account_id) === String(selectedAccId) &&
                (!t.status || String(t.status).toUpperCase() === 'APPROVED'),
        );
    }, [templates, selectedAccId]);

    // Update form state when selected ids change
    React.useEffect(() => {
        setData('whatsapp_account_id', selectedAccId);
    }, [selectedAccId, setData]);

    React.useEffect(() => {
        setData('message_template_id', selectedTempId);
        setData('header_image', null);
        setData('header_media_url', '');
        setImagePreviewUrl(null);
    }, [selectedTempId, setData]);

    React.useEffect(() => {
        setData('message_type', messageType);

        if (messageType === 'direct') {
            setTimeout(() => setSelectedTempId(''), 0);
            setData('message_template_id', '');
            setData('header_image', null);
            setData('header_media_url', '');
            setImagePreviewUrl(null);
        } else {
            setData('direct_message_body', '');
        }
    }, [messageType, setData]);

    React.useEffect(() => {
        if (targetType === 'file') {
            setData('contact_group_id', '');
            setTimeout(() => setRecipients([]), 0);
        } else {
            setData('recipients', []);
            setTimeout(() => setRecipients([]), 0);
        }
    }, [targetType, setData]);

    const handleGroupSelect = (val: string) => {
        setData('contact_group_id', val);
        const selectedGroup = groups.find((g) => String(g.id) === val);

        if (selectedGroup) {
            // Set dummy preview recipient mapping name as first parameter
            setRecipients([
                { phone_number: '+1234567890', variables: ['[Contact Name]'] },
            ]);
        } else {
            setRecipients([]);
        }
    };

    const activeTemplate = React.useMemo(() => {
        return templates.find((t) => String(t.id) === selectedTempId);
    }, [templates, selectedTempId]);

    // Detect expected variable count from active template body
    const expectedBodyVarCount = React.useMemo(() => {
        if (!activeTemplate || messageType !== 'template') {
            return 0;
        }

        const bodyComp = activeTemplate.components?.find(
            (c) => c.type.toUpperCase() === 'BODY',
        );
        if (!bodyComp?.text) {
            return 0;
        }

        const matches = bodyComp.text.match(/\{\{([^}]+)\}\}/g);
        return matches ? matches.length : 0;
    }, [activeTemplate, messageType]);

    // Sanitize recipient variable list to strictly match template placeholder count
    const sanitizeRecipients = React.useCallback(
        (list: ParsedRecipient[], varCount: number) => {
            return list.map((r) => {
                if (varCount === 0 || !r.variables || r.variables.length === 0) {
                    return {
                        phone_number: r.phone_number,
                        variables: null,
                    };
                }

                return {
                    phone_number: r.phone_number,
                    variables: r.variables.slice(0, varCount),
                };
            });
        },
        [],
    );

    // Sync recipients when active template or expected body variable count changes
    React.useEffect(() => {
        if (targetType === 'file' && recipients.length > 0) {
            const sanitized = sanitizeRecipients(recipients, expectedBodyVarCount);
            setRecipients(sanitized);
            setData('recipients', sanitized);
        }
    }, [expectedBodyVarCount]);

    // Detect if the active template has an IMAGE header
    const hasImageHeader = React.useMemo(() => {
        if (messageType !== 'template' || !activeTemplate) {
            return false;
        }

        return activeTemplate.components.some(
            (c) =>
                c.type.toUpperCase() === 'HEADER' &&
                (c.format?.toUpperCase() === 'IMAGE' ||
                    c.format?.toUpperCase() === 'MEDIA'),
        );
    }, [activeTemplate, messageType]);

    // Handle header image file upload
    const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('header_image', file);
        if (file) {
            const preview = URL.createObjectURL(file);
            setImagePreviewUrl(preview);
        } else {
            setImagePreviewUrl(data.header_media_url || null);
        }
    };

    const handleRemoveImage = () => {
        setData('header_image', null);
        setData('header_media_url', '');
        setImagePreviewUrl(null);
    };

    // Handle recipient CSV file upload
    const handleFileSelect = async (file: File | null) => {
        if (!file) {
            setRecipients([]);
            setData('recipients', []);

            return;
        }

        setParsing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Get CSRF Token from cookie
            const response = await fetch(
                '/dashboard/campaigns/upload-recipients',
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        // Laravel checks this automatically if session/cookies exist
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Failed to parse file.');
            }

            const resData = await response.json();
            const rawRecipients: ParsedRecipient[] = resData.recipients || [];
            const sanitized = sanitizeRecipients(rawRecipients, expectedBodyVarCount);
            setRecipients(sanitized);
            setData('recipients', sanitized);
            toast.success(`Successfully parsed ${resData.count} recipients!`);
        } catch (e: any) {
            toast.error(e.message || 'Failed to parse recipient file.');
            setRecipients([]);
            setData('recipients', []);
        } finally {
            setParsing(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (targetType === 'file' && recipients.length === 0) {
            toast.error(
                'Please upload a valid CSV list containing recipient phone numbers.',
            );

            return;
        }

        if (targetType === 'group' && !data.contact_group_id) {
            toast.error('Please select a contact group.');

            return;
        }

        if (messageType === 'template' && !data.message_template_id) {
            toast.error('Please select an approved template.');

            return;
        }

        if (
            messageType === 'template' &&
            hasImageHeader &&
            !data.header_image &&
            !data.header_media_url?.trim()
        ) {
            toast.error(
                'This template requires a header image. Please upload an image or provide a URL.',
            );

            return;
        }

        if (messageType === 'direct' && !data.direct_message_body.trim()) {
            toast.error('Please write the direct message body.');

            return;
        }

        post('/dashboard/campaigns', {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Campaign launched / scheduled successfully!');
            },
        });
    };

    // Render preview variable values from the first recipient in list
    const firstRecipientVars = React.useMemo(() => {
        if (recipients.length === 0 || !recipients[0].variables) {
            return {};
        }

        const vars: Record<string, string> = {};
        recipients[0].variables.forEach((val, idx) => {
            vars[String(idx + 1)] = val;
        });

        return vars;
    }, [recipients]);

    // Extract template specs for visual mockup preview
    const templateSpecs = React.useMemo(() => {
        if (!activeTemplate) {
            return null;
        }

        const headerComponent = activeTemplate.components.find(
            (c) => c.type.toUpperCase() === 'HEADER',
        );
        const bodyComponent = activeTemplate.components.find(
            (c) => c.type.toUpperCase() === 'BODY',
        );
        const footerComponent = activeTemplate.components.find(
            (c) => c.type.toUpperCase() === 'FOOTER',
        );
        const buttonsComponent = activeTemplate.components.find(
            (c) => c.type.toUpperCase() === 'BUTTONS',
        );

        let headerType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE' = 'NONE';
        if (headerComponent) {
            const fmt = (headerComponent.format || 'TEXT').toUpperCase();
            if (['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt)) {
                headerType = fmt as any;
            }
        }

        return {
            headerType,
            headerText: headerComponent?.text || '',
            bodyText: bodyComponent?.text || '',
            footerText: footerComponent?.text || '',
            buttons: buttonsComponent?.buttons || [],
        };
    }, [activeTemplate]);

    return (
        <>
            <Head title="Create Campaign" />
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

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Launch Campaign
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Broadcast a WhatsApp template or direct session message
                        to a list of users.
                    </p>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-5">
                    {/* Setup Form */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-emerald-600" />
                                <CardTitle>Campaign Configuration</CardTitle>
                            </div>
                            <CardDescription>
                                Select details, import your contact list, and
                                manage scheduling.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleFormSubmit}
                                className="space-y-6"
                            >
                                {/* Basic Name & Outbound */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="name">Campaign Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Eid Mubarak Greetings"
                                        required
                                    />
                                    {errors.name && (
                                        <span className="text-xs text-rose-500">
                                            {errors.name}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Message Type
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            Direct messages must be policy-safe.
                                        </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMessageType('template')
                                            }
                                            className={`flex min-h-20 items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                                                messageType === 'template'
                                                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100'
                                                    : 'bg-background hover:bg-muted/50'
                                            }`}
                                        >
                                            <FileText className="mt-0.5 h-5 w-5 shrink-0" />
                                            <span className="space-y-1">
                                                <span className="block text-sm font-semibold">
                                                    Approved Template
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    Best for outbound marketing
                                                    or messages outside the
                                                    WhatsApp session window.
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMessageType('direct')
                                            }
                                            className={`flex min-h-20 items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                                                messageType === 'direct'
                                                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100'
                                                    : 'bg-background hover:bg-muted/50'
                                            }`}
                                        >
                                            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0" />
                                            <span className="space-y-1">
                                                <span className="block text-sm font-semibold">
                                                    Direct Message
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    Plain text campaign for
                                                    opted-in/session-safe
                                                    recipients.
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                    {errors.message_type && (
                                        <span className="text-xs text-rose-500">
                                            {errors.message_type}
                                        </span>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="whatsapp_account_id">
                                            Outbound Number Channel
                                        </Label>
                                        <Select
                                            value={selectedAccId}
                                            onValueChange={(val) => {
                                                setSelectedAccId(val);
                                                setSelectedTempId(''); // reset template
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Number" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map((acc) => (
                                                    <SelectItem
                                                        key={acc.id}
                                                        value={String(acc.id)}
                                                    >
                                                        {acc.display_name
                                                            ? `${acc.display_name} (${acc.phone_number})`
                                                            : acc.phone_number}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.whatsapp_account_id && (
                                            <span className="text-xs text-rose-500">
                                                {errors.whatsapp_account_id}
                                            </span>
                                        )}
                                    </div>

                                    {messageType === 'template' ? (
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="message_template_id">
                                                Message Template (Approved Only)
                                            </Label>
                                            <Select
                                                value={selectedTempId}
                                                onValueChange={
                                                    setSelectedTempId
                                                }
                                                disabled={
                                                    filteredTemplates.length ===
                                                    0
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={
                                                            filteredTemplates.length >
                                                            0
                                                                ? 'Select Template'
                                                                : 'No templates for this number'
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredTemplates.map(
                                                        (temp) => (
                                                            <SelectItem
                                                                key={temp.id}
                                                                value={String(
                                                                    temp.id,
                                                                )}
                                                            >
                                                                {temp.name} (
                                                                {temp.language})
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {errors.message_template_id && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.message_template_id}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="direct_message_body">
                                                Direct Message Body
                                            </Label>
                                            <Textarea
                                                id="direct_message_body"
                                                value={data.direct_message_body}
                                                onChange={(e) =>
                                                    setData(
                                                        'direct_message_body',
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={4096}
                                                placeholder="Write a clear, consent-safe direct message..."
                                                className="min-h-28 resize-y"
                                            />
                                            <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
                                                <span>
                                                    Use only for opted-in or
                                                    active-session contacts.
                                                </span>
                                                <span>
                                                    {
                                                        data.direct_message_body
                                                            .length
                                                    }
                                                    /4096
                                                </span>
                                            </div>
                                            {errors.direct_message_body && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.direct_message_body}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Template Header Image Section */}
                                    {messageType === 'template' && hasImageHeader && (
                                        <div className="col-span-full rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/40 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/10">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-foreground">
                                                            Campaign Header Image{' '}
                                                            <span className="text-rose-500">
                                                                *
                                                            </span>
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            This template requires a header image. Upload a file or provide an image URL.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex rounded-lg border bg-background p-0.5 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setImageInputMode(
                                                                'upload',
                                                            )
                                                        }
                                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                                            imageInputMode ===
                                                            'upload'
                                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        File Upload
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setImageInputMode(
                                                                'url',
                                                            )
                                                        }
                                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                                            imageInputMode ===
                                                            'url'
                                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        Image URL
                                                    </button>
                                                </div>
                                            </div>

                                            {imageInputMode === 'upload' ? (
                                                <div className="space-y-2">
                                                    {imagePreviewUrl &&
                                                    data.header_image ? (
                                                        <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <img
                                                                    src={
                                                                        imagePreviewUrl
                                                                    }
                                                                    alt="Header preview"
                                                                    className="h-12 w-12 rounded-md border object-cover"
                                                                />
                                                                <div className="truncate">
                                                                    <p className="truncate text-xs font-semibold">
                                                                        {
                                                                            data
                                                                                .header_image
                                                                                .name
                                                                        }
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {(
                                                                            data
                                                                                .header_image
                                                                                .size /
                                                                            (1024 *
                                                                                1024)
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        MB
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={
                                                                    handleRemoveImage
                                                                }
                                                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-background/50 p-4 text-center transition-colors hover:bg-background">
                                                            <UploadCloud className="h-6 w-6 text-muted-foreground" />
                                                            <span className="text-xs font-semibold text-foreground">
                                                                Click to upload header image
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                JPG, PNG, WebP up to 5MB
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                                className="hidden"
                                                                onChange={
                                                                    handleImageFileSelect
                                                                }
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <LinkIcon className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            type="url"
                                                            placeholder="https://example.com/images/banner.jpg"
                                                            value={
                                                                data.header_media_url
                                                            }
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target
                                                                        .value;
                                                                setData(
                                                                    'header_media_url',
                                                                    val,
                                                                );
                                                                setData(
                                                                    'header_image',
                                                                    null,
                                                                );
                                                                setImagePreviewUrl(
                                                                    val || null,
                                                                );
                                                            }}
                                                            className="pl-9 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {errors.header_image && (
                                                <span className="mt-1 block text-xs text-rose-500">
                                                    {errors.header_image}
                                                </span>
                                            )}
                                            {errors.header_media_url && (
                                                <span className="mt-1 block text-xs text-rose-500">
                                                    {errors.header_media_url}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Target Type and Recipients */}
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Target Recipients
                                        </h3>
                                    </div>

                                    {/* Target Tabs */}
                                    <div className="flex w-full gap-2 rounded-lg border bg-zinc-50 p-1 sm:w-fit dark:bg-zinc-900">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTargetType('file')
                                            }
                                            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:flex-initial ${
                                                targetType === 'file'
                                                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                                                    : 'text-muted-foreground hover:text-zinc-900 dark:hover:text-white'
                                            }`}
                                        >
                                            CSV File Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTargetType('group')
                                            }
                                            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:flex-initial ${
                                                targetType === 'group'
                                                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                                                    : 'text-muted-foreground hover:text-zinc-900 dark:hover:text-white'
                                            }`}
                                        >
                                            Target Contact Group
                                        </button>
                                    </div>

                                    {targetType === 'file' ? (
                                        <div className="space-y-3">
                                            <FileUpload
                                                onFileSelect={handleFileSelect}
                                            />
                                            {recipients.length > 0 && (
                                                <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/20">
                                                    <span>
                                                        Contacts loaded:{' '}
                                                        <strong className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                                                            {recipients.length}
                                                        </strong>
                                                    </span>
                                                    <span className="font-medium text-muted-foreground">
                                                        Variables:{' '}
                                                        {recipients[0].variables
                                                            ?.length || 0}{' '}
                                                        columns
                                                    </span>
                                                </div>
                                            )}
                                            {errors.recipients && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.recipients}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="contact_group_id">
                                                Select Contact Group
                                            </Label>
                                            <Select
                                                value={data.contact_group_id}
                                                onValueChange={
                                                    handleGroupSelect
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={
                                                            groups.length > 0
                                                                ? 'Select a Group'
                                                                : 'No groups created yet'
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {groups.map((group) => (
                                                        <SelectItem
                                                            key={group.id}
                                                            value={String(
                                                                group.id,
                                                            )}
                                                        >
                                                            {group.name} (
                                                            {
                                                                group.contacts_count
                                                            }{' '}
                                                            contacts)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.contact_group_id && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.contact_group_id}
                                                </span>
                                            )}
                                            {errors.recipients && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.recipients}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Scheduling */}
                                <div className="space-y-4 border-t pt-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Schedule Broadcast
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            Leave the date empty to keep it
                                            manual.
                                        </span>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="scheduled_at">
                                                Dispatch Date & Time
                                            </Label>
                                            <div className="relative">
                                                <Calendar className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="scheduled_at"
                                                    type="datetime-local"
                                                    value={data.scheduled_at}
                                                    onChange={(e) =>
                                                        setData(
                                                            'scheduled_at',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="pl-9"
                                                />
                                            </div>
                                            {errors.scheduled_at && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.scheduled_at}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="scheduled_timezone">
                                                Time Zone
                                            </Label>
                                            <Select
                                                value={data.scheduled_timezone}
                                                onValueChange={(value) =>
                                                    setData(
                                                        'scheduled_timezone',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="scheduled_timezone">
                                                    <SelectValue placeholder="Select timezone" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-72">
                                                    {timezones.map(
                                                        (timezone) => (
                                                            <SelectItem
                                                                key={timezone}
                                                                value={timezone}
                                                            >
                                                                {timezone}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {errors.scheduled_timezone && (
                                                <span className="text-xs text-rose-500">
                                                    {errors.scheduled_timezone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-4">
                                    <Button variant="outline" asChild>
                                        <Link href="/dashboard/campaigns">
                                            Cancel
                                        </Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing ||
                                            parsing ||
                                            (targetType === 'file'
                                                ? recipients.length === 0
                                                : !data.contact_group_id) ||
                                            (messageType === 'template'
                                                ? !data.message_template_id
                                                : !data.direct_message_body.trim())
                                        }
                                    >
                                        {data.scheduled_at
                                            ? 'Schedule Campaign'
                                            : 'Create Campaign'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Preview Sticky Bubble */}
                    <div className="lg:sticky lg:top-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recipient Message Mockup</CardTitle>
                                <CardDescription>
                                    Shows the exact message variables
                                    dynamically mapped to the first recipient in
                                    your CSV.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center p-4">
                                {messageType === 'direct' ? (
                                    <div className="w-full max-w-sm rounded-lg border bg-[#efeae2] p-4 shadow-sm">
                                        <div className="ml-auto max-w-[86%] rounded-lg bg-[#d9fdd3] px-3 py-2 text-sm shadow-sm">
                                            <p className="break-words whitespace-pre-wrap text-zinc-900">
                                                {data.direct_message_body ||
                                                    'Write a direct message to preview it here.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : templateSpecs ? (
                                    <TemplatePreview
                                        name={
                                            activeTemplate?.name ||
                                            'campaign_mockup'
                                        }
                                        category={activeTemplate?.category}
                                        language={activeTemplate?.language}
                                        headerType={templateSpecs.headerType}
                                        headerText={templateSpecs.headerText}
                                        headerMediaUrl={
                                            imagePreviewUrl ||
                                            data.header_media_url ||
                                            null
                                        }
                                        headerMediaType={
                                            templateSpecs.headerType === 'IMAGE'
                                                ? 'IMAGE'
                                                : undefined
                                        }
                                        bodyText={templateSpecs.bodyText}
                                        footerText={templateSpecs.footerText}
                                        buttons={templateSpecs.buttons}
                                        variables={firstRecipientVars}
                                    />
                                ) : (
                                    <div className="py-24 text-center text-xs text-muted-foreground italic">
                                        Select a template to view the message
                                        preview.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

CampaignCreate.layout = (page: any) => page;
