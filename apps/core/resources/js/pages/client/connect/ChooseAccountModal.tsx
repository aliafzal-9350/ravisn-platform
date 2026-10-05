import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface AccountChoice {
    id: string;
    label: string;
}

interface ChooseAccountModalProps {
    open: boolean;
    message: string;
    choices: AccountChoice[];
    submitting: boolean;
    onChoose: (id: string) => void;
    onOpenChange: (open: boolean) => void;
}

/**
 * Shown when one Facebook login can reach several WhatsApp numbers, Pages or
 * Instagram accounts: the admin picks the one this workspace should use.
 */
export function ChooseAccountModal({ open, message, choices, submitting, onChoose, onOpenChange }: ChooseAccountModalProps) {
    const [selected, setSelected] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setSelected(choices[0]?.id ?? null);
        }
    }, [open, choices]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Choose an account</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>

                <div role="radiogroup" aria-label="Accounts" className="flex flex-col gap-2 py-2">
                    {choices.map((choice) => (
                        <label
                            key={choice.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                selected === choice.id ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:bg-muted/40'
                            }`}
                        >
                            <input
                                type="radio"
                                name="meta-account"
                                value={choice.id}
                                checked={selected === choice.id}
                                onChange={() => setSelected(choice.id)}
                                className="accent-emerald-600"
                            />
                            <span className="font-medium text-foreground">{choice.label}</span>
                            <span className="ml-auto font-mono text-xs text-muted-foreground">{choice.id}</span>
                        </label>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => selected && onChoose(selected)}
                        disabled={!selected || submitting}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        {submitting ? 'Connecting…' : 'Connect'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
