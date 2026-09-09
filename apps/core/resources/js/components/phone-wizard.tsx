import { ChevronRight, Smartphone } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneWizardProps {
    onComplete: (data: {
        phone_number: string;
        display_name: string;
        phone_number_id: string;
        waba_id: string;
    }) => void;
    isLoading?: boolean;
}

export function PhoneWizard({
    onComplete,
    isLoading = false,
}: PhoneWizardProps) {
    const [step, setStep] = React.useState(1);
    const [phone, setPhone] = React.useState('');
    const [name, setName] = React.useState('');
    const [phoneId, setPhoneId] = React.useState('');
    const [wabaId, setWabaId] = React.useState('');

    const handleNext = () => {
        if (step === 1 && (!phone || !name)) {
            return;
        }

        if (step === 2 && (!phoneId || !wabaId)) {
            return;
        }

        if (step < 3) {
            setStep(step + 1);
        } else {
            onComplete({
                phone_number: phone,
                display_name: name,
                phone_number_id: phoneId,
                waba_id: wabaId,
            });
        }
    };

    return (
        <div className="flex w-full max-w-md flex-col gap-6 text-left">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b pb-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                step >= s
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                            }`}
                        >
                            {s}
                        </div>
                        <span
                            className={`text-xs ${step === s ? 'font-semibold' : 'text-muted-foreground'}`}
                        >
                            {s === 1
                                ? 'Details'
                                : s === 2
                                  ? 'Credentials'
                                  : 'Request'}
                        </span>
                        {s < 3 && (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Contents */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Friendly Display Name</Label>
                        <Input
                            placeholder="e.g. Sales Outbound"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>WhatsApp Phone Number</Label>
                        <Input
                            placeholder="e.g. +966500000000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Meta Phone Number ID</Label>
                        <Input
                            placeholder="e.g. 10948291039"
                            value={phoneId}
                            onChange={(e) => setPhoneId(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Meta WABA ID</Label>
                        <Input
                            placeholder="e.g. 9817293810294"
                            value={wabaId}
                            onChange={(e) => setWabaId(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed p-6 text-center">
                    <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                        <Smartphone className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold">Ready to Register</h3>
                    <p className="text-xs text-muted-foreground">
                        We will request a 6-digit SMS verification code to
                        verify ownership of {phone}.
                    </p>
                </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-2 flex items-center justify-between border-t pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={step === 1 || isLoading}
                    onClick={() => setStep(step - 1)}
                >
                    Back
                </Button>
                <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={
                        isLoading ||
                        (step === 1 && (!phone || !name)) ||
                        (step === 2 && (!phoneId || !wabaId))
                    }
                    onClick={handleNext}
                >
                    {step === 3
                        ? isLoading
                            ? 'Requesting...'
                            : 'Request Code'
                        : 'Next'}
                </Button>
            </div>
        </div>
    );
}
