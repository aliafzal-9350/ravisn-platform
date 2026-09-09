import { router } from '@inertiajs/react';
import { Eye, EyeOff, KeyRound, RefreshCw, Shield } from 'lucide-react';
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

interface WebhookTokenModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentToken: string;
}

export function WebhookTokenModal({ open, onOpenChange, currentToken }: WebhookTokenModalProps) {
    const [token, setToken] = React.useState(currentToken);
    const [showToken, setShowToken] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setToken(currentToken);
        }
    }, [open, currentToken]);

    const generateRandomToken = () => {
        const randomString = 'meta_verify_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setToken(randomString);
        setShowToken(true);
        toast.info('Generated new random secret token');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim() || token.trim().length < 8) {
            toast.error('Verify token must be at least 8 characters long.');
            return;
        }

        setSubmitting(true);
        router.post(
            '/dashboard/connect/webhook-token',
            {
                verify_token: token.trim(),
            },
            {
                onSuccess: () => {
                    toast.success('Webhook verify token updated successfully.');
                    onOpenChange(false);
                },
                onError: () => {
                    toast.error('Failed to update webhook verify token.');
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-border/80 bg-card text-card-foreground">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    Update Webhook Verify Token
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Set the secret token used by Meta to verify your webhook callback URL.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1.5">
                            <Label htmlFor="verify_token" className="text-xs font-semibold text-foreground">
                                Verify Token Secret
                            </Label>
                            <div className="relative">
                                <Input
                                    id="verify_token"
                                    type={showToken ? 'text' : 'password'}
                                    required
                                    placeholder="Enter verify token secret..."
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
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
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
                            <div className="text-[11px] text-muted-foreground">
                                Need a secure randomized token?
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generateRandomToken}
                                className="h-7 gap-1.5 text-[11px]"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Generate
                            </Button>
                        </div>

                        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <Shield className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                            <span>
                                Make sure to enter the exact same verify token in your Meta App Dashboard under <strong>Webhooks &gt; WhatsApp / Instagram / Messenger</strong>.
                            </span>
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
                            {submitting ? 'Updating...' : 'Save Verify Token'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
