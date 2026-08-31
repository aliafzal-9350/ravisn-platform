import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    FileText,
    Film,
    Image,
    Plus,
    Trash2,
    UploadCloud,
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
    waba_id: string;
}

const WHATSAPP_LANGUAGES = [
    { code: 'af', name: 'Afrikaans (af)' },
    { code: 'sq', name: 'Albanian (sq)' },
    { code: 'ar', name: 'Arabic (ar)' },
    { code: 'az', name: 'Azerbaijani (az)' },
    { code: 'bn', name: 'Bengali (bn)' },
    { code: 'bg', name: 'Bulgarian (bg)' },
    { code: 'ca', name: 'Catalan (ca)' },
    { code: 'zh_CN', name: 'Chinese (Simplified) (zh_CN)' },
    { code: 'zh_HK', name: 'Chinese (Hong Kong) (zh_HK)' },
    { code: 'zh_TW', name: 'Chinese (Traditional) (zh_TW)' },
    { code: 'hr', name: 'Croatian (hr)' },
    { code: 'cs', name: 'Czech (cs)' },
    { code: 'da', name: 'Danish (da)' },
    { code: 'nl', name: 'Dutch (nl)' },
    { code: 'en', name: 'English (en)' },
    { code: 'en_GB', name: 'English (UK) (en_GB)' },
    { code: 'en_US', name: 'English (US) (en_US)' },
    { code: 'et', name: 'Estonian (et)' },
    { code: 'fil', name: 'Filipino (fil)' },
    { code: 'fi', name: 'Finnish (fi)' },
    { code: 'fr', name: 'French (fr)' },
    { code: 'ka', name: 'Georgian (ka)' },
    { code: 'de', name: 'German (de)' },
    { code: 'el', name: 'Greek (el)' },
    { code: 'gu', name: 'Gujarati (gu)' },
    { code: 'he', name: 'Hebrew (he)' },
    { code: 'hi', name: 'Hindi (hi)' },
    { code: 'hu', name: 'Hungarian (hu)' },
    { code: 'id', name: 'Indonesian (id)' },
    { code: 'ga', name: 'Irish (ga)' },
    { code: 'it', name: 'Italian (it)' },
    { code: 'ja', name: 'Japanese (ja)' },
    { code: 'kn', name: 'Kannada (kn)' },
    { code: 'kk', name: 'Kazakh (kk)' },
    { code: 'ko', name: 'Korean (ko)' },
    { code: 'lv', name: 'Latvian (lv)' },
    { code: 'lt', name: 'Lithuanian (lt)' },
    { code: 'mk', name: 'Macedonian (mk)' },
    { code: 'ms', name: 'Malay (ms)' },
    { code: 'ml', name: 'Malayalam (ml)' },
    { code: 'mr', name: 'Marathi (mr)' },
    { code: 'nb', name: 'Norwegian (nb)' },
    { code: 'fa', name: 'Persian (fa)' },
    { code: 'pl', name: 'Polish (pl)' },
    { code: 'pt_BR', name: 'Portuguese (Brazil) (pt_BR)' },
    { code: 'pt_PT', name: 'Portuguese (Portugal) (pt_PT)' },
    { code: 'pa', name: 'Punjabi (pa)' },
    { code: 'ro', name: 'Romanian (ro)' },
    { code: 'ru', name: 'Russian (ru)' },
    { code: 'sr', name: 'Serbian (sr)' },
    { code: 'sk', name: 'Slovak (sk)' },
    { code: 'sl', name: 'Slovenian (sl)' },
    { code: 'es', name: 'Spanish (es)' },
    { code: 'es_AR', name: 'Spanish (Argentina) (es_AR)' },
    { code: 'es_ES', name: 'Spanish (Spain) (es_ES)' },
    { code: 'es_MX', name: 'Spanish (Mexico) (es_MX)' },
    { code: 'sw', name: 'Swahili (sw)' },
    { code: 'sv', name: 'Swedish (sv)' },
    { code: 'ta', name: 'Tamil (ta)' },
    { code: 'te', name: 'Telugu (te)' },
    { code: 'th', name: 'Thai (th)' },
    { code: 'tr', name: 'Turkish (tr)' },
    { code: 'uk', name: 'Ukrainian (uk)' },
    { code: 'ur', name: 'Urdu (ur)' },
    { code: 'uz', name: 'Uzbek (uz)' },
    { code: 'vi', name: 'Vietnamese (vi)' },
    { code: 'zu', name: 'Zulu (zu)' },
];

interface TemplateCreateProps {
    accounts: WabaAccount[];
}

interface ButtonItem {
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
    text: string;
    phone_number?: string;
    url?: string;
}

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

const MEDIA_ACCEPT: Record<string, string> = {
    IMAGE: 'image/jpeg,image/png,image/gif,image/webp',
    VIDEO: 'video/mp4,video/3gpp',
    DOCUMENT: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const MEDIA_HINT: Record<string, string> = {
    IMAGE: 'JPG, PNG, GIF, WEBP — max 5 MB',
    VIDEO: 'MP4, 3GPP — max 16 MB',
    DOCUMENT: 'PDF, DOC, DOCX — max 100 MB',
};

export default function TemplateCreate({ accounts }: TemplateCreateProps) {
    const [headerType, setHeaderType] = React.useState<HeaderType>('NONE');
    const [headerText, setHeaderText] = React.useState('');
    const [headerMediaFile, setHeaderMediaFile] = React.useState<File | null>(null);
    const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [bodyText, setBodyText] = React.useState('');
    const [footerText, setFooterText] = React.useState('');
    const [buttons, setButtons] = React.useState<ButtonItem[]>([]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        whatsapp_account_id: accounts.length > 0 ? String(accounts[0].id) : '',
        name: '',
        language: 'en',
        category: 'MARKETING',
        components: [] as any[],
        header_type: 'NONE' as HeaderType,
        header_media: null as File | null,
    });

    // Revoke object URL on unmount / file change to avoid memory leaks
    React.useEffect(() => {
        return () => {
            if (headerMediaPreviewUrl) {
                URL.revokeObjectURL(headerMediaPreviewUrl);
            }
        };
    }, [headerMediaPreviewUrl]);

    const handleFileSelect = (file: File) => {
        if (headerMediaPreviewUrl) {
            URL.revokeObjectURL(headerMediaPreviewUrl);
        }

        setHeaderMediaFile(file);
        setData('header_media', file);

        if (headerType === 'IMAGE') {
            setHeaderMediaPreviewUrl(URL.createObjectURL(file));
        } else if (headerType === 'VIDEO') {
            setHeaderMediaPreviewUrl(URL.createObjectURL(file));
        } else {
            setHeaderMediaPreviewUrl(null);
        }
    };

    const handleDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];

        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDropzoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDropzoneDragLeave = () => {
        setIsDragging(false);
    };

    const handleClearMedia = () => {
        if (headerMediaPreviewUrl) {
            URL.revokeObjectURL(headerMediaPreviewUrl);
        }

        setHeaderMediaFile(null);
        setHeaderMediaPreviewUrl(null);
        setData('header_media', null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleHeaderTypeChange = (val: HeaderType) => {
        setHeaderType(val);
        setData('header_type', val);
        handleClearMedia();

        if (val !== 'TEXT') {
            setHeaderText('');
        }
    };

    const handleAddButton = () => {
        if (buttons.length >= 10) {
            toast.error('WhatsApp templates support a maximum of 10 buttons.');

            return;
        }

        setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
    };

    const handleRemoveButton = (index: number) => {
        setButtons(buttons.filter((_, idx) => idx !== index));
    };

    const handleButtonChange = (
        index: number,
        key: keyof ButtonItem,
        val: string,
    ) => {
        const updated = [...buttons];
        updated[index] = { ...updated[index], [key]: val };
        setButtons(updated);
    };

    const [submittingWithComponents, setSubmittingWithComponents] =
        React.useState<any[] | null>(null);

    React.useEffect(() => {
        if (submittingWithComponents !== null) {
            setData('components', submittingWithComponents);
        }
    }, [submittingWithComponents, setData]);

    React.useEffect(() => {
        if (
            submittingWithComponents !== null &&
            data.components === submittingWithComponents
        ) {
            post('/dashboard/templates', {
                forceFormData: true,
                onSuccess: () => {
                    toast.success('Template submitted successfully to Meta!');
                    setSubmittingWithComponents(null);
                },
                onError: (err) => {
                    setSubmittingWithComponents(null);

                    if (err.name) {
                        toast.error(err.name);
                    }

                    if (err.components) {
                        toast.error(
                            'Failed to validate template component structures.',
                        );
                    }

                    if (err.header_media) {
                        toast.error(err.header_media);
                    }
                },
            });
        }
    }, [data.components, submittingWithComponents, post]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate template name
        const snakeCaseRegex = /^[a-z0-9_]+$/;

        if (!snakeCaseRegex.test(data.name)) {
            toast.error(
                'Template name must be lower_case_with_underscores (lowercase letters, numbers, and underscores only).',
            );

            return;
        }

        // Validate media is provided for media header types
        const isMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType);

        if (isMediaHeader && !headerMediaFile) {
            toast.error(`Please upload a ${headerType.toLowerCase()} file for the header.`);

            return;
        }

        // Build Meta Components Array
        const componentsArray: any[] = [];

        if (headerType === 'TEXT' && headerText.trim()) {
            componentsArray.push({
                type: 'HEADER',
                format: 'TEXT',
                text: headerText.trim(),
            });
        } else if (isMediaHeader) {
            componentsArray.push({
                type: 'HEADER',
                format: headerType,
            });
        }

        if (!bodyText.trim()) {
            toast.error('Template body content is required.');

            return;
        }

        componentsArray.push({
            type: 'BODY',
            text: bodyText.trim(),
        });

        if (footerText.trim()) {
            componentsArray.push({
                type: 'FOOTER',
                text: footerText.trim(),
            });
        }

        if (buttons.length > 0) {
            // Check button validation
            const hasEmptyText = buttons.some((btn) => !btn.text.trim());

            if (hasEmptyText) {
                toast.error('Please specify button text for all buttons.');

                return;
            }

            const formattedButtons = buttons.map((btn) => {
                const b: any = {
                    type: btn.type,
                    text: btn.text.trim(),
                };

                if (btn.type === 'PHONE_NUMBER') {
                    b.phone_number = btn.phone_number?.trim();
                } else if (btn.type === 'URL') {
                    b.url = btn.url?.trim();
                }

                return b;
            });

            componentsArray.push({
                type: 'BUTTONS',
                buttons: formattedButtons,
            });
        }

        // Put components in form data and trigger async submit
        setSubmittingWithComponents(componentsArray);
    };

    const isMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType);

    return (
        <>
            <Head title="Create Template" />
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

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Create WhatsApp Template
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Draft a pre-approved WhatsApp message template. All
                        templates are submitted to Meta for validation.
                    </p>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-5">
                    {/* Form Input Card */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                <CardTitle>Template Builder</CardTitle>
                            </div>
                            <CardDescription>
                                Construct header, message body, variables, and
                                action buttons.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleFormSubmit}
                                className="space-y-6"
                            >
                                {/* Basic Meta Details */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="whatsapp_account_id">
                                            Outbound Number
                                        </Label>
                                        <Select
                                            value={data.whatsapp_account_id}
                                            onValueChange={(val) =>
                                                setData(
                                                    'whatsapp_account_id',
                                                    val,
                                                )
                                            }
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

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="category">
                                            Category
                                        </Label>
                                        <Select
                                            value={data.category}
                                            onValueChange={(val) =>
                                                setData('category', val)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MARKETING">
                                                    Marketing (Promotion, Alert)
                                                </SelectItem>
                                                <SelectItem value="UTILITY">
                                                    Utility (OTP, Receipt,
                                                    Update)
                                                </SelectItem>
                                                <SelectItem value="AUTHENTICATION">
                                                    Authentication (Secured
                                                    Login Code)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="name">
                                            Template Name
                                            (lower_case_with_underscores)
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) =>
                                                setData(
                                                    'name',
                                                    e.target.value
                                                        .toLowerCase()
                                                        .replace(/\s+/g, '_'),
                                                )
                                            }
                                            placeholder="e.g. order_confirmation"
                                            required
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                            Only letters, numbers, and
                                            underscores are allowed.
                                        </span>
                                        {errors.name && (
                                            <span className="text-xs text-rose-500">
                                                {errors.name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="language">
                                            Language
                                        </Label>
                                        <Select
                                            value={data.language}
                                            onValueChange={(val) =>
                                                setData('language', val)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Language" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[250px] overflow-y-auto">
                                                {WHATSAPP_LANGUAGES.map(
                                                    (lang) => (
                                                        <SelectItem
                                                            key={lang.code}
                                                            value={lang.code}
                                                        >
                                                            {lang.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Header section */}
                                <div className="space-y-3 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Header (Optional)
                                        </h3>
                                        <Select
                                            value={headerType}
                                            onValueChange={(val: any) =>
                                                handleHeaderTypeChange(val)
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                                <SelectValue placeholder="Header type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">
                                                    None
                                                </SelectItem>
                                                <SelectItem value="TEXT">
                                                    Text
                                                </SelectItem>
                                                <SelectItem value="IMAGE">
                                                    Image
                                                </SelectItem>
                                                <SelectItem value="VIDEO">
                                                    Video
                                                </SelectItem>
                                                <SelectItem value="DOCUMENT">
                                                    Document
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {headerType === 'TEXT' && (
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="header_text">
                                                Header Text
                                            </Label>
                                            <Input
                                                id="header_text"
                                                value={headerText}
                                                onChange={(e) =>
                                                    setHeaderText(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Order Dispatch Update"
                                                maxLength={60}
                                            />
                                            <span className="text-right text-[10px] text-muted-foreground">
                                                {headerText.length}/60
                                                characters. Supports one
                                                variable (e.g. `{'{{1}}'}`)
                                                .
                                            </span>
                                        </div>
                                    )}

                                    {/* Media dropzone */}
                                    {isMediaHeader && (
                                        <div className="flex flex-col gap-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                id="header_media_input"
                                                accept={MEDIA_ACCEPT[headerType]}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files?.[0];

                                                    if (file) {
                                                        handleFileSelect(file);
                                                    }
                                                }}
                                            />

                                            {!headerMediaFile ? (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`Upload ${headerType.toLowerCase()} file`}
                                                    className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                                                        isDragging
                                                            ? 'border-emerald-500 bg-emerald-500/10'
                                                            : 'border-zinc-600 bg-zinc-900/50 hover:border-emerald-600 hover:bg-emerald-950/20 dark:border-zinc-700 dark:bg-zinc-900/40'
                                                    }`}
                                                    onDrop={handleDropzoneDrop}
                                                    onDragOver={
                                                        handleDropzoneDragOver
                                                    }
                                                    onDragLeave={
                                                        handleDropzoneDragLeave
                                                    }
                                                    onClick={() =>
                                                        fileInputRef.current?.click()
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === 'Enter' ||
                                                            e.key === ' '
                                                        ) {
                                                            fileInputRef.current?.click();
                                                        }
                                                    }}
                                                >
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 dark:bg-zinc-800">
                                                        {headerType ===
                                                        'IMAGE' ? (
                                                            <Image className="h-5 w-5 text-emerald-400" />
                                                        ) : headerType ===
                                                          'VIDEO' ? (
                                                            <Film className="h-5 w-5 text-emerald-400" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-emerald-400" />
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium text-foreground">
                                                            <span className="text-emerald-500">
                                                                Click to upload
                                                            </span>{' '}
                                                            or drag & drop
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                                            {
                                                                MEDIA_HINT[
                                                                    headerType
                                                                ]
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative flex items-center gap-3 rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-3">
                                                    {/* Preview thumbnail */}
                                                    {headerType === 'IMAGE' &&
                                                        headerMediaPreviewUrl && (
                                                            <img
                                                                src={
                                                                    headerMediaPreviewUrl
                                                                }
                                                                alt="Preview"
                                                                className="h-14 w-14 rounded object-cover"
                                                            />
                                                        )}
                                                    {headerType === 'VIDEO' && (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-800">
                                                            <Film className="h-6 w-6 text-emerald-400" />
                                                        </div>
                                                    )}
                                                    {headerType ===
                                                        'DOCUMENT' && (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-800">
                                                            <FileText className="h-6 w-6 text-emerald-400" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {
                                                                headerMediaFile.name
                                                            }
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {(
                                                                headerMediaFile.size /
                                                                1024 /
                                                                1024
                                                            ).toFixed(2)}{' '}
                                                            MB
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-500"
                                                        onClick={
                                                            handleClearMedia
                                                        }
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Body Section */}
                                <div className="space-y-3 border-t pt-4">
                                    <h3 className="text-sm font-semibold">
                                        Message Body (Required)
                                    </h3>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="body_text">
                                            Body Text
                                        </Label>
                                        <Textarea
                                            id="body_text"
                                            rows={4}
                                            value={bodyText}
                                            onChange={(e) =>
                                                setBodyText(e.target.value)
                                            }
                                            placeholder="Hello {{1}}, your order #{{2}} is successfully dispatched!"
                                            maxLength={1024}
                                            required
                                        />
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                            <span>
                                                Use curly brackets double
                                                parameters like `{'{{1}}'}` or `
                                                {'{{2}}'}` for custom values.
                                            </span>
                                            <span>
                                                {bodyText.length}/1024
                                                characters
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer section */}
                                <div className="space-y-3 border-t pt-4">
                                    <h3 className="text-sm font-semibold">
                                        Footer (Optional)
                                    </h3>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="footer_text">
                                            Footer Text
                                        </Label>
                                        <Input
                                            id="footer_text"
                                            value={footerText}
                                            onChange={(e) =>
                                                setFooterText(e.target.value)
                                            }
                                            placeholder="e.g. Reply STOP to opt-out"
                                            maxLength={60}
                                        />
                                        <span className="text-right text-[10px] text-muted-foreground">
                                            {footerText.length}/60 characters.
                                            Text appears in grey at bottom.
                                        </span>
                                    </div>
                                </div>

                                {/* Buttons section */}
                                <div className="space-y-3 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Buttons (Optional)
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddButton}
                                            className="h-8 gap-1 text-xs"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>Add Button</span>
                                        </Button>
                                    </div>

                                    {buttons.length > 0 && (
                                        <div className="space-y-3">
                                            {buttons.map((btn, index) => (
                                                <div
                                                    key={index}
                                                    className="relative flex flex-col gap-3 rounded-lg border bg-muted/20 p-3"
                                                >
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-rose-600"
                                                        onClick={() =>
                                                            handleRemoveButton(
                                                                index,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>

                                                    <div className="grid gap-3 md:grid-cols-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label>Type</Label>
                                                            <Select
                                                                value={btn.type}
                                                                onValueChange={(
                                                                    val: any,
                                                                ) =>
                                                                    handleButtonChange(
                                                                        index,
                                                                        'type',
                                                                        val,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="QUICK_REPLY">
                                                                        Quick
                                                                        Reply
                                                                    </SelectItem>
                                                                    <SelectItem value="PHONE_NUMBER">
                                                                        Call
                                                                        Number
                                                                    </SelectItem>
                                                                    <SelectItem value="URL">
                                                                        Visit
                                                                        URL
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 md:col-span-2">
                                                            <Label>
                                                                Button Label
                                                                Text
                                                            </Label>
                                                            <Input
                                                                value={btn.text}
                                                                onChange={(e) =>
                                                                    handleButtonChange(
                                                                        index,
                                                                        'text',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="e.g. Call Support"
                                                                className="h-8 text-xs"
                                                                maxLength={25}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    {btn.type ===
                                                        'PHONE_NUMBER' && (
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label>
                                                                Phone Number
                                                                (E.164 format)
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    btn.phone_number ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    handleButtonChange(
                                                                        index,
                                                                        'phone_number',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="e.g. +966500000000"
                                                                className="h-8 font-mono text-xs"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    {btn.type === 'URL' && (
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label>
                                                                Destination URL
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    btn.url ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    handleButtonChange(
                                                                        index,
                                                                        'url',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="e.g. https://yourwebsite.com/orders"
                                                                className="h-8 font-mono text-xs"
                                                                required
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-4">
                                    <Button variant="outline" asChild>
                                        <Link href="/dashboard/templates">
                                            Cancel
                                        </Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        Submit to Meta
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Preview Bubble Sticky Column */}
                    <div className="lg:sticky lg:top-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>WhatsApp Live Preview</CardTitle>
                                <CardDescription>
                                    Real-time visual display of how the template
                                    renders on mobile devices.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center p-4">
                                <TemplatePreview
                                    name={data.name || 'template_preview'}
                                    category={data.category}
                                    language={data.language}
                                    headerType={headerType}
                                    headerText={headerText}
                                    headerMediaUrl={headerMediaPreviewUrl}
                                    headerMediaType={
                                        isMediaHeader ? headerType : undefined
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

TemplateCreate.layout = (page: any) => page;
