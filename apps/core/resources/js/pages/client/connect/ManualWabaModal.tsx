import { router } from '@inertiajs/react';
import { Eye, EyeOff, Key } from 'lucide-react';
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

interface ManualWabaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        phone_number?: string;
        verified_name?: string;
        waba_id?: string;
        phone_number_id?: string;
    };
}

export function ManualWabaModal({ open, onOpenChange, initialData }: ManualWabaModalProps) {
    const [phoneNumber, setPhoneNumber] = React.useState(initialData?.phone_number || '');
    const [verifiedName, setVerifiedName] = React.useState(initialData?.verified_name || '');
    const [wabaId, setWabaId] = React.useState(initialData?.waba_id || '');
    const [phoneNumberId, setPhoneNumberId] = React.useState(initialData?.phone_number_id || '');
    const [systemUserToken, setSystemUserToken] = React.useState('');
    const [showToken, setShowToken] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setPhoneNumber(initialData.phone_number || '');
                setVerifiedName(initialData.verified_name || '');
                setWabaId(initialData.waba_id || '');
                setPhoneNumberId(initialData.phone_number_id || '');
            }
            setErrors({});
        }
    }, [open, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!wabaId.trim()) {
            newErrors.waba_id = 'WhatsApp Business Account ID (WABA ID) is required.';
        }
        if (!phoneNumberId.trim()) {
            newErrors.phone_number_id = 'Phone Number ID is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        setErrors({});

        router.post(
            '/dashboard/connect/manual-link/whatsapp',
            {
                display_phone_number: phoneNumber.trim(),
                verified_name: verifiedName.trim(),
                waba_id: wabaId.trim(),
                phone_number_id: phoneNumberId.trim(),
                system_user_token: systemUserToken.trim(),
            },
            {
                onSuccess: () => {
                    toast.success('WhatsApp Business Account linked and verified successfully!');
                    onOpenChange(false);
                    setSystemUserToken('');
                },
                onError: (errs) => {
                    setErrors(errs as Record<string, string>);
                    toast.error('Failed to link WhatsApp account. Please check your credentials.');
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg border-border/80 bg-card text-card-foreground">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Manual WABA Linkup
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Bind Meta WhatsApp Cloud API credentials directly to your workspace.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="display_phone_number" className="text-xs font-semibold text-foreground">
                                    Display Phone Number
                                </Label>
                                <Input
                                    id="display_phone_number"
                                    placeholder="e.g. +1 555 123 4567"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="font-mono text-xs bg-muted/30"
                                />
                                {errors.phone_number && (
                                    <p className="text-[11px] text-rose-500">{errors.phone_number}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="verified_name" className="text-xs font-semibold text-foreground">
                                    Verified Business Name
                                </Label>
                                <Input
                                    id="verified_name"
                                    placeholder="e.g. Acme Corp"
                                    value={verifiedName}
                                    onChange={(e) => setVerifiedName(e.target.value)}
                                    className="text-xs bg-muted/30"
                                />
                                {errors.verified_name && (
                                    <p className="text-[11px] text-rose-500">{errors.verified_name}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="waba_id" className="text-xs font-semibold text-foreground">
                                WhatsApp Business Account ID (WABA ID) <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="waba_id"
                                required
                                placeholder="e.g. 1092837465019"
                                value={wabaId}
                                onChange={(e) => setWabaId(e.target.value)}
                                className="font-mono text-xs bg-muted/30"
                            />
                            {errors.waba_id && (
                                <p className="text-[11px] text-rose-500">{errors.waba_id}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone_number_id" className="text-xs font-semibold text-foreground">
                                Phone Number ID <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="phone_number_id"
                                required
                                placeholder="e.g. 5647382910842"
                                value={phoneNumberId}
                                onChange={(e) => setPhoneNumberId(e.target.value)}
                                className="font-mono text-xs bg-muted/30"
                            />
                            {errors.phone_number_id && (
                                <p className="text-[11px] text-rose-500">{errors.phone_number_id}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="system_user_token" className="text-xs font-semibold text-foreground">
                                    Permanent System User Access Token
                                </Label>
                                <span className="text-[10px] text-muted-foreground">Meta Graph API v21.0</span>
                            </div>
                            <div className="relative">
                                <Input
                                    id="system_user_token"
                                    type={showToken ? 'text' : 'password'}
                                    placeholder="EAAG..."
                                    value={systemUserToken}
                                    onChange={(e) => setSystemUserToken(e.target.value)}
                                    className="font-mono text-xs bg-muted/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Stored securely in PostgreSQL. Required for background automation and message dispatch.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={submitting}
                            className="bg-[#027A48] hover:bg-[#026838] text-white text-xs font-medium"
                        >
                            {submitting ? 'Verifying & Linking...' : 'Link WhatsApp WABA'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
