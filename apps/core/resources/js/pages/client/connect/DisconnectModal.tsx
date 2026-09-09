import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
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

interface DisconnectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    channelType: 'whatsapp' | 'instagram' | 'messenger' | null;
    channelName: string;
}

export function DisconnectModal({ open, onOpenChange, channelType, channelName }: DisconnectModalProps) {
    const [submitting, setSubmitting] = React.useState(false);

    const handleDisconnect = () => {
        if (!channelType) return;
        setSubmitting(true);

        router.delete(`/dashboard/connect/${channelType}`, {
            onSuccess: () => {
                toast.success(`${channelName} disconnected successfully.`);
                onOpenChange(false);
            },
            onError: () => {
                toast.error(`Failed to disconnect ${channelName}.`);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-border/80 bg-card text-card-foreground">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Disconnect {channelName}?
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Are you sure you want to disconnect this channel from your workspace?
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2 text-xs text-muted-foreground">
                    <p>
                        Disconnecting will halt all automated inbound message ingestion, bot responses, and outbound broadcasts for this channel until it is re-linked.
                    </p>
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
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={submitting}
                        onClick={handleDisconnect}
                        className="text-xs font-medium"
                    >
                        {submitting ? 'Disconnecting...' : 'Yes, Disconnect Channel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
